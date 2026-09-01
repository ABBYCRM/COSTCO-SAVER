import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pool, query, userTransaction, internalTransaction } from './db.mjs';
import {
  hashPassword,
  verifyPassword,
  issueSession,
  hashToken,
  signAccessToken,
} from './auth.mjs';
import {
  readJson,
  sendJson,
  sendError,
  requireUser,
  clientIp,
  parseUrl,
  uuid,
  cents,
} from './http.mjs';
import {
  classifyMarkdown,
  freshnessFor,
  initialConfidence,
  eventTypeFor,
  percentChange,
  potentialSavings,
} from './domain.mjs';

const PORT = Number(process.env.PORT || 8080);
const distDir = path.resolve('dist');

function requestId(req) {
  return String(req.headers['x-request-id'] || randomUUID());
}

function safeLimit(value, fallback = 50, max = 100) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requireString(value, name, min = 1, max = 500) {
  const s = String(value ?? '').trim();
  if (s.length < min || s.length > max) {
    throw Object.assign(new Error(`${name} is invalid`), { status: 400 });
  }
  return s;
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || null,
    role: row.role || 'shopper',
  };
}

async function authSignup(req, res, rid) {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const displayName = body.displayName ? requireString(body.displayName, 'displayName', 1, 100) : null;
  if (!validateEmail(email)) throw Object.assign(new Error('Valid email is required'), { status: 400 });
  const passwordHash = await hashPassword(password);

  const session = await internalTransaction(async (client) => {
    try {
      const inserted = await client.query(
        `INSERT INTO users(email, password_hash, display_name)
         VALUES ($1,$2,$3)
         RETURNING id,email,display_name,role`,
        [email, passwordHash, displayName],
      );
      return issueSession(client, inserted.rows[0], {
        userAgent: req.headers['user-agent'] || null,
        ipAddress: clientIp(req),
      });
    } catch (error) {
      if (error?.code === '23505') {
        throw Object.assign(new Error('An account with that email already exists'), { status: 409 });
      }
      throw error;
    }
  });
  sendJson(res, 201, session);
}

async function authLogin(req, res) {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const found = await query(
    `SELECT id,email,password_hash,display_name,role,disabled_at
     FROM users WHERE email=$1`,
    [email],
  );
  const user = found.rows[0];
  if (!user || user.disabled_at || !(await verifyPassword(password, user.password_hash))) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }
  const session = await internalTransaction((client) =>
    issueSession(client, user, {
      userAgent: req.headers['user-agent'] || null,
      ipAddress: clientIp(req),
    }),
  );
  sendJson(res, 200, session);
}

async function authRefresh(req, res) {
  const body = await readJson(req);
  const refreshToken = requireString(body.refreshToken, 'refreshToken', 20, 500);
  const tokenHash = hashToken(refreshToken);
  const session = await internalTransaction(async (client) => {
    const found = await client.query(
      `SELECT rt.id,rt.user_id,u.id,u.email,u.display_name,u.role,u.disabled_at
       FROM refresh_tokens rt
       JOIN users u ON u.id=rt.user_id
       WHERE rt.token_hash=$1 AND rt.revoked_at IS NULL AND rt.expires_at > now()
       FOR UPDATE`,
      [tokenHash],
    );
    const row = found.rows[0];
    if (!row || row.disabled_at) {
      throw Object.assign(new Error('Refresh token is invalid or expired'), { status: 401 });
    }
    await client.query('UPDATE refresh_tokens SET revoked_at=now() WHERE id=$1', [row.id]);
    return issueSession(client, row, {
      userAgent: req.headers['user-agent'] || null,
      ipAddress: clientIp(req),
    });
  });
  sendJson(res, 200, session);
}

async function authLogout(req, res) {
  const user = requireUser(req);
  const body = await readJson(req);
  if (body.refreshToken) {
    const tokenHash = hashToken(body.refreshToken);
    await userTransaction(user.sub, (client) =>
      client.query(
        'UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND token_hash=$2',
        [user.sub, tokenHash],
      ),
    );
  } else {
    await userTransaction(user.sub, (client) =>
      client.query('UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [
        user.sub,
      ]),
    );
  }
  sendJson(res, 200, { ok: true });
}

async function getMe(req, res) {
  const user = requireUser(req);
  const result = await query(
    'SELECT id,email,display_name,role,created_at FROM users WHERE id=$1 AND disabled_at IS NULL',
    [user.sub],
  );
  if (!result.rows[0]) throw Object.assign(new Error('Account not found'), { status: 404 });
  sendJson(res, 200, { user: publicUser(result.rows[0]) });
}

async function listWarehouses(res, url) {
  const q = String(url.searchParams.get('q') || '').trim();
  const params = [];
  let where = 'WHERE active=true';
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (name ILIKE $1 OR city ILIKE $1 OR state ILIKE $1 OR postal_code ILIKE $1)`;
  }
  const result = await query(
    `SELECT id,retailer,retailer_warehouse_id,name,address_1,address_2,city,state,postal_code,country,
            latitude,longitude,timezone,verification_status,active
     FROM warehouses ${where}
     ORDER BY state,city,name
     LIMIT 250`,
    params,
  );
  sendJson(res, 200, { warehouses: result.rows });
}

async function warehouseHealth(res, warehouseId) {
  if (!uuid(warehouseId)) throw Object.assign(new Error('Invalid warehouse id'), { status: 400 });
  const result = await query(
    `WITH state_stats AS (
       SELECT count(*)::int AS active_observed_products,
              COALESCE(percentile_cont(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (now()-last_verified_at))/3600.0
              ),0)::float8 AS median_observation_age_hours
       FROM warehouse_product_state
       WHERE warehouse_id=$1 AND consensus_price_cents IS NOT NULL
     ),
     observation_stats AS (
       SELECT count(*) FILTER (WHERE observed_at >= now()-interval '7 days')::float8 / 7.0 AS daily_verification_volume_7d,
              count(DISTINCT submitter_user_id) FILTER (WHERE observed_at >= now()-interval '30 days')::int AS distinct_contributors_last_30d,
              CASE WHEN count(*) FILTER (WHERE observed_at >= now()-interval '30 days')=0 THEN 0
                ELSE count(*) FILTER (WHERE observed_at >= now()-interval '30 days' AND verification_status='flagged')::float8 /
                     count(*) FILTER (WHERE observed_at >= now()-interval '30 days') END AS conflict_ratio,
              CASE WHEN count(*) FILTER (WHERE observed_at >= now()-interval '30 days')=0 THEN 0
                ELSE count(*) FILTER (WHERE observed_at >= now()-interval '30 days' AND evidence_id IS NOT NULL)::float8 /
                     count(*) FILTER (WHERE observed_at >= now()-interval '30 days') END AS evidence_ratio
       FROM price_observations WHERE warehouse_id=$1
     )
     SELECT * FROM state_stats CROSS JOIN observation_stats`,
    [warehouseId],
  );
  sendJson(res, 200, { stats: result.rows[0] });
}

async function listPriceEvents(res, url) {
  const warehouseId = url.searchParams.get('warehouseId');
  if (!uuid(warehouseId)) throw Object.assign(new Error('warehouseId is required'), { status: 400 });
  const limit = safeLimit(url.searchParams.get('limit'), 20, 100);
  const type = url.searchParams.get('type');
  const params = [warehouseId];
  let filter = '';
  if (type) {
    params.push(type);
    filter = ' AND e.event_type=$2';
  }
  const result = await query(
    `SELECT e.*,p.canonical_name AS product_name,p.brand,w.name AS warehouse_name
     FROM price_events e
     JOIN products p ON p.id=e.product_id
     JOIN warehouses w ON w.id=e.warehouse_id
     WHERE e.warehouse_id=$1 ${filter}
     ORDER BY e.effective_at DESC
     LIMIT ${limit}`,
    params,
  );
  sendJson(res, 200, { events: result.rows });
}

async function searchProducts(res, url) {
  const q = String(url.searchParams.get('q') || '').trim();
  const limit = safeLimit(url.searchParams.get('limit'), 20, 50);
  if (!q) return sendJson(res, 200, { products: [] });

  const result = await query(
    `WITH identifier_hits AS (
       SELECT p.id,p.canonical_name,p.brand,p.size_value,p.size_unit,c.display_name AS category,
              pi.identifier_type,pi.normalized_value,0 AS rank
       FROM product_identifiers pi
       JOIN products p ON p.id=pi.product_id
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.status IN ('active','provisional') AND pi.normalized_value ILIKE $1
       LIMIT $2
     ),
     name_hits AS (
       SELECT p.id,p.canonical_name,p.brand,p.size_value,p.size_unit,c.display_name AS category,
              NULL::text AS identifier_type,NULL::citext AS normalized_value,
              CASE WHEN lower(p.canonical_name)=lower($3) THEN 1 ELSE 2 END AS rank
       FROM products p
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.status IN ('active','provisional')
         AND (p.canonical_name ILIKE $1 OR p.brand ILIKE $1 OR similarity(p.canonical_name,$3) > 0.2)
       ORDER BY similarity(p.canonical_name,$3) DESC
       LIMIT $2
     )
     SELECT DISTINCT ON (id) *
     FROM (SELECT * FROM identifier_hits UNION ALL SELECT * FROM name_hits) x
     ORDER BY id,rank
     LIMIT $2`,
    [`%${q}%`, limit, q],
  );
  sendJson(res, 200, { products: result.rows });
}

async function productByBarcode(res, barcode) {
  const value = requireString(decodeURIComponent(barcode), 'barcode', 4, 32);
  const result = await query(
    `SELECT p.id,p.canonical_name,p.brand,p.description,p.size_value,p.size_unit,p.image_url,p.status,
            pi.identifier_type,pi.normalized_value
     FROM product_identifiers pi
     JOIN products p ON p.id=pi.product_id
     WHERE pi.normalized_value=$1 AND p.status IN ('active','provisional')
     LIMIT 1`,
    [value],
  );
  if (!result.rows[0]) return sendJson(res, 404, { error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
  sendJson(res, 200, { product: result.rows[0] });
}

async function productDetail(res, productId, url) {
  if (!uuid(productId)) throw Object.assign(new Error('Invalid product id'), { status: 400 });
  const warehouseId = url.searchParams.get('warehouseId');
  const product = await query(
    `SELECT p.id,p.canonical_name,p.brand,p.description,p.size_value,p.size_unit,p.image_url,p.status,
            c.display_name AS category,
            COALESCE(json_agg(json_build_object('type',pi.identifier_type,'value',pi.normalized_value))
              FILTER (WHERE pi.id IS NOT NULL),'[]') AS identifiers
     FROM products p
     LEFT JOIN categories c ON c.id=p.category_id
     LEFT JOIN product_identifiers pi ON pi.product_id=p.id
     WHERE p.id=$1
     GROUP BY p.id,c.display_name`,
    [productId],
  );
  if (!product.rows[0]) throw Object.assign(new Error('Product not found'), { status: 404 });

  let state = null;
  if (warehouseId && uuid(warehouseId)) {
    const s = await query(
      `SELECT s.*,w.name AS warehouse_name
       FROM warehouse_product_state s JOIN warehouses w ON w.id=s.warehouse_id
       WHERE s.product_id=$1 AND s.warehouse_id=$2`,
      [productId, warehouseId],
    );
    state = s.rows[0] || null;
    if (state) state.freshness_class = freshnessFor(state.last_verified_at);
  }
  sendJson(res, 200, { product: product.rows[0], state });
}

async function productHistory(res, productId, url) {
  const warehouseId = url.searchParams.get('warehouseId');
  if (!uuid(productId) || !uuid(warehouseId)) throw Object.assign(new Error('Invalid product or warehouse'), { status: 400 });
  const result = await query(
    `SELECT id,price_cents,currency,observed_at,source_type,markdown_class,has_asterisk,verification_status
     FROM price_observations
     WHERE product_id=$1 AND warehouse_id=$2 AND verification_status <> 'rejected'
     ORDER BY observed_at ASC
     LIMIT 1000`,
    [productId, warehouseId],
  );
  sendJson(res, 200, { observations: result.rows });
}

async function productWarehouses(res, productId) {
  const result = await query(
    `SELECT s.product_id,s.warehouse_id,s.consensus_price_cents,s.currency,s.markdown_class,s.has_asterisk,
            s.last_verified_at,s.confidence_score,s.independent_confirmation_count,s.conflicting_report_count,
            w.name,w.city,w.state,w.latitude,w.longitude
     FROM warehouse_product_state s
     JOIN warehouses w ON w.id=s.warehouse_id
     WHERE s.product_id=$1 AND w.active=true
     ORDER BY s.consensus_price_cents ASC NULLS LAST,s.last_verified_at DESC`,
    [productId],
  );
  for (const row of result.rows) row.freshness_class = freshnessFor(row.last_verified_at);
  sendJson(res, 200, { warehouses: result.rows });
}

async function createProvisionalProduct(req, res) {
  const user = requireUser(req);
  const body = await readJson(req);
  const name = requireString(body.canonicalName, 'canonicalName', 2, 200);
  const brand = body.brand ? requireString(body.brand, 'brand', 1, 120) : null;
  const barcode = body.barcode ? requireString(body.barcode, 'barcode', 4, 32) : null;
  const barcodeType = body.barcodeType ? requireString(body.barcodeType, 'barcodeType', 3, 24) : null;
  const itemNumber = body.costcoItemNumber ? requireString(body.costcoItemNumber, 'costcoItemNumber', 3, 32) : null;

  const created = await internalTransaction(async (client) => {
    if (barcode) {
      const existing = await client.query(
        `SELECT p.id,p.canonical_name,p.brand FROM product_identifiers pi
         JOIN products p ON p.id=pi.product_id WHERE pi.normalized_value=$1 LIMIT 1`,
        [barcode],
      );
      if (existing.rows[0]) return existing.rows[0];
    }
    const p = await client.query(
      `INSERT INTO products(canonical_name,brand,status,created_by_user_id)
       VALUES($1,$2,'provisional',$3)
       RETURNING id,canonical_name,brand,status`,
      [name, brand, user.sub],
    );
    const productId = p.rows[0].id;
    if (barcode && barcodeType) {
      await client.query(
        `INSERT INTO product_identifiers(product_id,identifier_type,normalized_value,display_value,source,confidence)
         VALUES($1,$2,$3,$3,'community',70)
         ON CONFLICT(identifier_type,normalized_value) DO NOTHING`,
        [productId, barcodeType, barcode],
      );
    }
    if (itemNumber) {
      await client.query(
        `INSERT INTO product_identifiers(product_id,identifier_type,normalized_value,display_value,source,confidence)
         VALUES($1,'COSTCO_ITEM_NUMBER',$2,$2,'community',70)
         ON CONFLICT(identifier_type,normalized_value) DO NOTHING`,
        [productId, itemNumber],
      );
    }
    return p.rows[0];
  });
  sendJson(res, 201, { product: created });
}

async function processPriceEvent(client, { userId, productId, warehouseId, observationId, oldPrice, newPrice, observedAt, markdownClass, hasAsterisk, confidence }) {
  const eventType = eventTypeFor(oldPrice, newPrice);
  let event = null;
  if (eventType) {
    const inserted = await client.query(
      `INSERT INTO price_events(product_id,warehouse_id,observation_id,old_price_cents,new_price_cents,
          change_cents,change_percent,event_type,confidence,effective_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        productId,
        warehouseId,
        observationId,
        oldPrice,
        newPrice,
        oldPrice == null ? null : newPrice - oldPrice,
        percentChange(oldPrice, newPrice),
        eventType,
        confidence,
        observedAt,
      ],
    );
    event = inserted.rows[0];
  }

  const watches = await client.query(
    `SELECT w.*,u.email,p.canonical_name,wh.name AS warehouse_name
     FROM watches w
     JOIN users u ON u.id=w.user_id
     JOIN products p ON p.id=w.product_id
     LEFT JOIN warehouses wh ON wh.id=$2
     WHERE w.product_id=$1 AND w.enabled=true AND (w.warehouse_id IS NULL OR w.warehouse_id=$2)`,
    [productId, warehouseId],
  );
  for (const w of watches.rows) {
    const matched =
      (w.notify_any_drop && eventType === 'price_drop') ||
      (w.target_price_cents != null && newPrice <= Number(w.target_price_cents)) ||
      (w.notify_clearance && markdownClass === 'clearance') ||
      (w.notify_manager_markdown && markdownClass === 'manager_markdown') ||
      (w.notify_asterisk && hasAsterisk);
    if (!matched) continue;
    await client.query(
      `INSERT INTO notifications(user_id,product_id,warehouse_id,price_event_id,notification_type,title,body,deep_link)
       VALUES($1,$2,$3,$4,'watch_match',$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [
        w.user_id,
        productId,
        warehouseId,
        event?.id || null,
        `Price update: ${w.canonical_name}`,
        `${w.canonical_name} is now $${(newPrice / 100).toFixed(2)} at ${w.warehouse_name || 'your warehouse'}.`,
        `/product/${productId}`,
      ],
    );
  }

  if (eventType === 'price_drop') {
    const purchases = await client.query(
      `SELECT p.*,u.email,pr.canonical_name,w.name AS warehouse_name
       FROM purchases p
       JOIN users u ON u.id=p.user_id
       JOIN products pr ON pr.id=p.product_id
       JOIN warehouses w ON w.id=p.warehouse_id
       WHERE p.product_id=$1 AND p.warehouse_id=$2
         AND p.purchase_date >= $3::timestamptz - interval '30 days'
         AND p.purchase_date <= $3::timestamptz
         AND p.unit_price_cents > $4`,
      [productId, warehouseId, observedAt, newPrice],
    );
    for (const p of purchases.rows) {
      const savings = potentialSavings(Number(p.unit_price_cents), newPrice, Number(p.quantity));
      if (savings <= 0) continue;
      const windowEnd = new Date(new Date(p.purchase_date).getTime() + 30 * 86_400_000).toISOString();
      const candidate = await client.query(
        `INSERT INTO adjustment_candidates(user_id,purchase_id,price_event_id,purchase_price_cents,new_price_cents,
             quantity,potential_savings_cents,purchase_date,price_drop_date,window_end,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'opportunity')
         ON CONFLICT(purchase_id,price_event_id) DO UPDATE SET
           new_price_cents=EXCLUDED.new_price_cents,
           potential_savings_cents=EXCLUDED.potential_savings_cents,
           status=CASE WHEN adjustment_candidates.status IN ('claimed','denied','dismissed') THEN adjustment_candidates.status ELSE 'opportunity' END
         RETURNING id`,
        [p.user_id,p.id,event.id,p.unit_price_cents,newPrice,p.quantity,savings,p.purchase_date,observedAt,windowEnd],
      );
      await client.query(
        `INSERT INTO notifications(user_id,product_id,warehouse_id,price_event_id,adjustment_id,notification_type,title,body,deep_link)
         VALUES($1,$2,$3,$4,$5,'adjustment_opportunity',$6,$7,'/saved')
         ON CONFLICT DO NOTHING`,
        [
          p.user_id,
          productId,
          warehouseId,
          event.id,
          candidate.rows[0].id,
          'Potential price adjustment',
          `${p.canonical_name} dropped. Potential difference: $${(savings / 100).toFixed(2)}.`,
        ],
      );
    }
  }

  await client.query(
    `INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id,metadata)
     VALUES($1,'price_observation_recorded','price_observation',$2,$3::jsonb)`,
    [userId, observationId, JSON.stringify({ productId, warehouseId, oldPrice, newPrice, eventType })],
  );
  return event;
}

async function createObservation(req, res) {
  const user = requireUser(req);
  const body = await readJson(req);
  const productId = requireString(body.productId, 'productId', 36, 36);
  const warehouseId = requireString(body.warehouseId, 'warehouseId', 36, 36);
  if (!uuid(productId) || !uuid(warehouseId)) throw Object.assign(new Error('Invalid product or warehouse id'), { status: 400 });
  const priceCents = cents(body.priceCents);
  const sourceType = body.sourceType || 'manual_shelf_entry';
  const observedAt = body.observedAt ? new Date(body.observedAt) : new Date();
  if (Number.isNaN(observedAt.getTime()) || observedAt.getTime() > Date.now() + 300_000) {
    throw Object.assign(new Error('Invalid observation time'), { status: 400 });
  }
  const idempotencyKey = requireString(body.idempotencyKey || randomUUID(), 'idempotencyKey', 8, 200);
  const hasAsterisk = Boolean(body.hasAsterisk);
  const classification = classifyMarkdown(priceCents, hasAsterisk);
  const confidence = initialConfidence({
    hasEvidence: Boolean(body.evidenceId),
    sourceType,
  });

  const result = await internalTransaction(async (client) => {
    const duplicate = await client.query(
      'SELECT id,product_id,warehouse_id,price_cents FROM price_observations WHERE idempotency_key=$1',
      [idempotencyKey],
    );
    if (duplicate.rows[0]) return { observation: duplicate.rows[0], duplicate: true, event: null };

    const state = await client.query(
      `SELECT * FROM warehouse_product_state WHERE product_id=$1 AND warehouse_id=$2 FOR UPDATE`,
      [productId, warehouseId],
    );
    const previous = state.rows[0] || null;

    const obs = await client.query(
      `INSERT INTO price_observations(product_id,warehouse_id,price_cents,currency,observed_at,source_type,
          markdown_class,price_ending,has_asterisk,evidence_id,submitter_user_id,verification_status,idempotency_key)
       VALUES($1,$2,$3,'USD',$4,$5,$6,$7,$8,$9,$10,'verified',$11)
       RETURNING *`,
      [
        productId,
        warehouseId,
        priceCents,
        observedAt.toISOString(),
        sourceType,
        classification.classification,
        classification.ending,
        hasAsterisk,
        body.evidenceId || null,
        user.sub,
        idempotencyKey,
      ],
    );
    const observation = obs.rows[0];
    const evidenceIncrement = body.evidenceId ? 1 : 0;

    await client.query(
      `INSERT INTO warehouse_product_state(product_id,warehouse_id,consensus_price_cents,currency,markdown_class,has_asterisk,
          first_seen_at,last_verified_at,latest_observation_id,evidence_count,confidence_score,freshness_class,updated_at)
       VALUES($1,$2,$3,'USD',$4,$5,$6,$6,$7,$8,$9,$10,now())
       ON CONFLICT(product_id,warehouse_id) DO UPDATE SET
          consensus_price_cents=EXCLUDED.consensus_price_cents,
          markdown_class=EXCLUDED.markdown_class,
          has_asterisk=EXCLUDED.has_asterisk,
          last_verified_at=EXCLUDED.last_verified_at,
          latest_observation_id=EXCLUDED.latest_observation_id,
          evidence_count=warehouse_product_state.evidence_count + EXCLUDED.evidence_count,
          confidence_score=GREATEST(warehouse_product_state.confidence_score, EXCLUDED.confidence_score),
          freshness_class=EXCLUDED.freshness_class,
          updated_at=now()`,
      [
        productId,
        warehouseId,
        priceCents,
        classification.classification,
        hasAsterisk,
        observedAt.toISOString(),
        observation.id,
        evidenceIncrement,
        confidence,
        freshnessFor(observedAt),
      ],
    );

    const event = await processPriceEvent(client, {
      userId: user.sub,
      productId,
      warehouseId,
      observationId: observation.id,
      oldPrice: previous?.consensus_price_cents == null ? null : Number(previous.consensus_price_cents),
      newPrice: priceCents,
      observedAt: observedAt.toISOString(),
      markdownClass: classification.classification,
      hasAsterisk,
      confidence,
    });
    return { observation, duplicate: false, event };
  });
  sendJson(res, result.duplicate ? 200 : 201, result);
}

async function confirmObservation(req, res, observationId) {
  const user = requireUser(req);
  const body = await readJson(req);
  const confirmedPrice = cents(body.confirmedPriceCents);
  const result = await internalTransaction(async (client) => {
    const obs = await client.query(
      `SELECT o.*,s.consensus_price_cents
       FROM price_observations o
       LEFT JOIN warehouse_product_state s ON s.product_id=o.product_id AND s.warehouse_id=o.warehouse_id
       WHERE o.id=$1`,
      [observationId],
    );
    if (!obs.rows[0]) throw Object.assign(new Error('Observation not found'), { status: 404 });
    const row = obs.rows[0];
    const conflict = Number(row.consensus_price_cents) !== confirmedPrice;
    const confirmation = await client.query(
      `INSERT INTO observation_confirmations(observation_id,confirmer_user_id,confirmed_price_cents,conflict)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(observation_id,confirmer_user_id) DO UPDATE SET
         confirmed_price_cents=EXCLUDED.confirmed_price_cents,
         conflict=EXCLUDED.conflict
       RETURNING *`,
      [observationId, user.sub, confirmedPrice, conflict],
    );
    if (conflict) {
      await client.query(
        `UPDATE warehouse_product_state
         SET conflicting_report_count=conflicting_report_count+1,updated_at=now()
         WHERE product_id=$1 AND warehouse_id=$2`,
        [row.product_id, row.warehouse_id],
      );
    } else {
      await client.query(
        `UPDATE warehouse_product_state
         SET independent_confirmation_count=independent_confirmation_count+1,
             confidence_score=LEAST(100,confidence_score+8),
             last_verified_at=now(),freshness_class='LIVE',updated_at=now()
         WHERE product_id=$1 AND warehouse_id=$2`,
        [row.product_id, row.warehouse_id],
      );
    }
    return confirmation.rows[0];
  });
  sendJson(res, 200, { confirmation: result });
}

async function listDeals(res, url) {
  const warehouseId = url.searchParams.get('warehouseId');
  if (!uuid(warehouseId)) throw Object.assign(new Error('warehouseId is required'), { status: 400 });
  const filter = url.searchParams.get('filter') || 'all';
  const limit = safeLimit(url.searchParams.get('limit'), 50, 100);
  const params = [warehouseId];
  let extra = '';
  if (filter === 'clearance') extra = " AND s.markdown_class='clearance'";
  else if (filter === 'manager_markdown') extra = " AND s.markdown_class='manager_markdown'";
  else if (filter === 'asterisk') extra = ' AND s.has_asterisk=true';
  const result = await query(
    `SELECT s.*,p.canonical_name,p.brand,p.image_url
     FROM warehouse_product_state s
     JOIN products p ON p.id=s.product_id
     WHERE s.warehouse_id=$1 AND s.consensus_price_cents IS NOT NULL ${extra}
     ORDER BY s.confidence_score DESC,s.last_verified_at DESC
     LIMIT ${limit}`,
    params,
  );
  for (const row of result.rows) row.freshness_class = freshnessFor(row.last_verified_at);
  sendJson(res, 200, { deals: result.rows });
}

async function listWatches(req, res) {
  const user = requireUser(req);
  const rows = await userTransaction(user.sub, (client) =>
    client.query(
      `SELECT w.*,p.canonical_name,p.brand,wh.name AS warehouse_name
       FROM watches w
       JOIN products p ON p.id=w.product_id
       LEFT JOIN warehouses wh ON wh.id=w.warehouse_id
       WHERE w.user_id=$1 ORDER BY w.created_at DESC`,
      [user.sub],
    ),
  );
  sendJson(res, 200, { watches: rows.rows });
}

async function createWatch(req, res) {
  const user = requireUser(req);
  const body = await readJson(req);
  const productId = requireString(body.productId, 'productId', 36, 36);
  const warehouseId = body.warehouseId || null;
  if (!uuid(productId) || (warehouseId && !uuid(warehouseId))) throw Object.assign(new Error('Invalid watch target'), { status: 400 });
  const created = await userTransaction(user.sub, (client) =>
    client.query(
      `INSERT INTO watches(user_id,product_id,warehouse_id,target_price_cents,target_percent,notify_any_drop,
          notify_clearance,notify_manager_markdown,notify_asterisk,enabled)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING *`,
      [
        user.sub,
        productId,
        warehouseId,
        body.targetPriceCents == null ? null : cents(body.targetPriceCents),
        body.targetPercent == null ? null : Number(body.targetPercent),
        Boolean(body.notifyAnyDrop),
        Boolean(body.notifyClearance),
        Boolean(body.notifyManagerMarkdown),
        Boolean(body.notifyAsterisk),
      ],
    ),
  );
  sendJson(res, 201, { watch: created.rows[0] });
}

async function deleteWatch(req, res, id) {
  const user = requireUser(req);
  const result = await userTransaction(user.sub, (client) =>
    client.query('DELETE FROM watches WHERE id=$1 AND user_id=$2 RETURNING id', [id, user.sub]),
  );
  if (!result.rows[0]) throw Object.assign(new Error('Watch not found'), { status: 404 });
  sendJson(res, 200, { ok: true });
}

async function listPurchases(req, res) {
  const user = requireUser(req);
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      `SELECT p.*,pr.canonical_name,pr.brand,w.name AS warehouse_name
       FROM purchases p JOIN products pr ON pr.id=p.product_id JOIN warehouses w ON w.id=p.warehouse_id
       WHERE p.user_id=$1 ORDER BY p.purchase_date DESC`,
      [user.sub],
    ),
  );
  sendJson(res, 200, { purchases: result.rows });
}

async function createPurchase(req, res) {
  const user = requireUser(req);
  const body = await readJson(req);
  const productId = requireString(body.productId, 'productId', 36, 36);
  const warehouseId = requireString(body.warehouseId, 'warehouseId', 36, 36);
  const unitPrice = cents(body.unitPriceCents);
  const quantity = Number(body.quantity);
  if (!uuid(productId) || !uuid(warehouseId) || !Number.isFinite(quantity) || quantity <= 0) {
    throw Object.assign(new Error('Invalid purchase'), { status: 400 });
  }
  const purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : new Date();
  if (Number.isNaN(purchaseDate.getTime())) throw Object.assign(new Error('Invalid purchase date'), { status: 400 });
  const total = Math.round(unitPrice * quantity);
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      `INSERT INTO purchases(user_id,product_id,warehouse_id,purchase_date,unit_price_cents,quantity,
          discount_cents,total_cents,currency,source,receipt_id)
       VALUES($1,$2,$3,$4,$5,$6,0,$7,'USD',$8,$9)
       RETURNING *`,
      [user.sub, productId, warehouseId, purchaseDate.toISOString(), unitPrice, quantity, total, body.source || 'manual', body.receiptId || null],
    ),
  );
  sendJson(res, 201, { purchase: result.rows[0] });
}

async function deletePurchase(req, res, id) {
  const user = requireUser(req);
  const result = await userTransaction(user.sub, (client) =>
    client.query('DELETE FROM purchases WHERE id=$1 AND user_id=$2 RETURNING id', [id, user.sub]),
  );
  if (!result.rows[0]) throw Object.assign(new Error('Purchase not found'), { status: 404 });
  sendJson(res, 200, { ok: true });
}

async function listAdjustments(req, res) {
  const user = requireUser(req);
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      `SELECT a.*,p.product_id,p.warehouse_id,pr.canonical_name,w.name AS warehouse_name,
              GREATEST(0,CEIL(EXTRACT(EPOCH FROM (a.window_end-now()))/86400.0))::int AS days_remaining
       FROM adjustment_candidates a
       JOIN purchases p ON p.id=a.purchase_id
       JOIN products pr ON pr.id=p.product_id
       JOIN warehouses w ON w.id=p.warehouse_id
       WHERE a.user_id=$1
       ORDER BY a.window_end ASC`,
      [user.sub],
    ),
  );
  sendJson(res, 200, { adjustments: result.rows });
}

async function patchAdjustment(req, res, id) {
  const user = requireUser(req);
  const body = await readJson(req);
  const allowed = new Set(['tracking','opportunity','claimed','denied','expired','dismissed']);
  if (!allowed.has(body.status)) throw Object.assign(new Error('Invalid adjustment status'), { status: 400 });
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      'UPDATE adjustment_candidates SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [body.status, id, user.sub],
    ),
  );
  if (!result.rows[0]) throw Object.assign(new Error('Adjustment not found'), { status: 404 });
  sendJson(res, 200, { adjustment: result.rows[0] });
}

async function listNotifications(req, res) {
  const user = requireUser(req);
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
      [user.sub],
    ),
  );
  sendJson(res, 200, { notifications: result.rows });
}

async function markNotificationRead(req, res, id) {
  const user = requireUser(req);
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      'UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING *',
      [id, user.sub],
    ),
  );
  if (!result.rows[0]) throw Object.assign(new Error('Notification not found'), { status: 404 });
  sendJson(res, 200, { notification: result.rows[0] });
}

async function registerDevice(req, res) {
  const user = requireUser(req);
  const body = await readJson(req);
  const token = requireString(body.token, 'token', 8, 4096);
  const platform = requireString(body.platform, 'platform', 3, 16);
  if (!['ios','android','web'].includes(platform)) throw Object.assign(new Error('Invalid platform'), { status: 400 });
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      `INSERT INTO device_tokens(user_id,platform,token,app_version,last_seen_at)
       VALUES($1,$2,$3,$4,now())
       ON CONFLICT(platform,token) DO UPDATE SET user_id=EXCLUDED.user_id,app_version=EXCLUDED.app_version,last_seen_at=now(),revoked_at=NULL
       RETURNING id`,
      [user.sub, platform, token, body.appVersion || null],
    ),
  );
  sendJson(res, 201, { id: result.rows[0].id });
}

async function createReceipt(req, res) {
  const user = requireUser(req);
  const body = await readJson(req);
  const warehouseId = body.warehouseId || null;
  if (warehouseId && !uuid(warehouseId)) throw Object.assign(new Error('Invalid warehouse'), { status: 400 });
  const purchaseDate = new Date(body.purchaseDate || Date.now());
  if (Number.isNaN(purchaseDate.getTime())) throw Object.assign(new Error('Invalid purchase date'), { status: 400 });
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      `INSERT INTO receipts(user_id,warehouse_id,purchase_date,total_cents,currency,status)
       VALUES($1,$2,$3,$4,'USD','pending') RETURNING *`,
      [user.sub, warehouseId, purchaseDate.toISOString(), body.totalCents == null ? null : cents(body.totalCents)],
    ),
  );
  sendJson(res, 201, { receipt: result.rows[0] });
}

async function listReceipts(req, res) {
  const user = requireUser(req);
  const result = await userTransaction(user.sub, (client) =>
    client.query(
      'SELECT * FROM receipts WHERE user_id=$1 ORDER BY purchase_date DESC LIMIT 100',
      [user.sub],
    ),
  );
  sendJson(res, 200, { receipts: result.rows });
}

async function createReport(req, res) {
  const user = requireUser(req);
  const body = await readJson(req);
  const entityType = requireString(body.entityType, 'entityType', 2, 80);
  const reason = requireString(body.reason, 'reason', 2, 200);
  const result = await query(
    `INSERT INTO reports(user_id,entity_type,entity_id,reason,details)
     VALUES($1,$2,$3,$4,$5) RETURNING id,status,created_at`,
    [user.sub, entityType, body.entityId || null, reason, body.details || null],
  );
  sendJson(res, 201, { report: result.rows[0] });
}

async function exportMe(req, res) {
  const user = requireUser(req);
  const data = await internalTransaction(async (client) => {
    const userRow = await client.query('SELECT id,email,display_name,role,created_at FROM users WHERE id=$1', [user.sub]);
    const purchases = await client.query('SELECT * FROM purchases WHERE user_id=$1 ORDER BY purchase_date DESC', [user.sub]);
    const watches = await client.query('SELECT * FROM watches WHERE user_id=$1 ORDER BY created_at DESC', [user.sub]);
    const receipts = await client.query('SELECT * FROM receipts WHERE user_id=$1 ORDER BY purchase_date DESC', [user.sub]);
    const notifications = await client.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC', [user.sub]);
    return {
      exportedAt: new Date().toISOString(),
      user: userRow.rows[0] || null,
      purchases: purchases.rows,
      watches: watches.rows,
      receipts: receipts.rows,
      notifications: notifications.rows,
    };
  });
  sendJson(res, 200, data, {
    'content-disposition': 'attachment; filename="costco-saver-export.json"',
  });
}

async function deleteMe(req, res) {
  const user = requireUser(req);
  await internalTransaction(async (client) => {
    await client.query(
      `INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id,metadata)
       VALUES($1,'account_deleted','user',$1,'{}'::jsonb)`,
      [user.sub],
    );
    await client.query('DELETE FROM users WHERE id=$1', [user.sub]);
  });
  sendJson(res, 200, { deleted: true });
}

async function routeApi(req, res, url, rid) {
  const method = req.method || 'GET';
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/api/v1/health') {
    const db = await query('SELECT now() AS now');
    return sendJson(res, 200, { ok: true, database: true, now: db.rows[0].now });
  }
  if (method === 'POST' && pathname === '/api/v1/auth/signup') return authSignup(req, res, rid);
  if (method === 'POST' && pathname === '/api/v1/auth/login') return authLogin(req, res);
  if (method === 'POST' && pathname === '/api/v1/auth/refresh') return authRefresh(req, res);
  if (method === 'POST' && pathname === '/api/v1/auth/logout') return authLogout(req, res);
  if (method === 'GET' && pathname === '/api/v1/me') return getMe(req, res);
  if (method === 'GET' && pathname === '/api/v1/me/export') return exportMe(req, res);
  if (method === 'DELETE' && pathname === '/api/v1/me') return deleteMe(req, res);

  if (method === 'GET' && pathname === '/api/v1/warehouses') return listWarehouses(res, url);
  if (method === 'GET' && pathname === '/api/v1/price-events') return listPriceEvents(res, url);
  if (method === 'GET' && pathname === '/api/v1/products/search') return searchProducts(res, url);
  if (method === 'POST' && pathname === '/api/v1/products/provisional') return createProvisionalProduct(req, res);
  if (method === 'POST' && pathname === '/api/v1/observations') return createObservation(req, res);
  if (method === 'GET' && pathname === '/api/v1/deals') return listDeals(res, url);
  if (method === 'GET' && pathname === '/api/v1/watches') return listWatches(req, res);
  if (method === 'POST' && pathname === '/api/v1/watches') return createWatch(req, res);
  if (method === 'GET' && pathname === '/api/v1/purchases') return listPurchases(req, res);
  if (method === 'POST' && pathname === '/api/v1/purchases') return createPurchase(req, res);
  if (method === 'GET' && pathname === '/api/v1/adjustments') return listAdjustments(req, res);
  if (method === 'GET' && pathname === '/api/v1/notifications') return listNotifications(req, res);
  if (method === 'POST' && pathname === '/api/v1/device-tokens') return registerDevice(req, res);
  if (method === 'GET' && pathname === '/api/v1/receipts') return listReceipts(req, res);
  if (method === 'POST' && pathname === '/api/v1/receipts') return createReceipt(req, res);
  if (method === 'POST' && pathname === '/api/v1/reports') return createReport(req, res);

  let match = pathname.match(/^\/api\/v1\/products\/barcode\/(.+)$/);
  if (method === 'GET' && match) return productByBarcode(res, match[1]);
  match = pathname.match(/^\/api\/v1\/products\/([0-9a-f-]+)\/history$/i);
  if (method === 'GET' && match) return productHistory(res, match[1], url);
  match = pathname.match(/^\/api\/v1\/products\/([0-9a-f-]+)\/warehouses$/i);
  if (method === 'GET' && match) return productWarehouses(res, match[1]);
  match = pathname.match(/^\/api\/v1\/products\/([0-9a-f-]+)$/i);
  if (method === 'GET' && match) return productDetail(res, match[1], url);
  match = pathname.match(/^\/api\/v1\/observations\/([0-9a-f-]+)\/confirm$/i);
  if (method === 'POST' && match) return confirmObservation(req, res, match[1]);
  match = pathname.match(/^\/api\/v1\/watches\/([0-9a-f-]+)$/i);
  if (method === 'DELETE' && match) return deleteWatch(req, res, match[1]);
  match = pathname.match(/^\/api\/v1\/purchases\/([0-9a-f-]+)$/i);
  if (method === 'DELETE' && match) return deletePurchase(req, res, match[1]);
  match = pathname.match(/^\/api\/v1\/adjustments\/([0-9a-f-]+)$/i);
  if (method === 'PATCH' && match) return patchAdjustment(req, res, match[1]);
  match = pathname.match(/^\/api\/v1\/notifications\/([0-9a-f-]+)\/read$/i);
  if (method === 'PATCH' && match) return markNotificationRead(req, res, match[1]);

  sendError(res, 404, 'NOT_FOUND', 'API route not found', rid);
}

const mime = new Map([
  ['.html','text/html; charset=utf-8'],
  ['.js','text/javascript; charset=utf-8'],
  ['.css','text/css; charset=utf-8'],
  ['.svg','image/svg+xml'],
  ['.png','image/png'],
  ['.jpg','image/jpeg'],
  ['.jpeg','image/jpeg'],
  ['.webp','image/webp'],
  ['.json','application/json; charset=utf-8'],
  ['.woff2','font/woff2'],
]);

async function serveStatic(req, res, url) {
  const requested = decodeURIComponent(url.pathname);
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const candidate = path.resolve(distDir, relative);
  if (!candidate.startsWith(distDir + path.sep) && candidate !== path.join(distDir, 'index.html')) {
    return sendError(res, 400, 'BAD_PATH', 'Invalid path');
  }

  let filePath = candidate;
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(distDir, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': mime.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
    });
    if (req.method === 'HEAD') return res.end();
    res.end(body);
  } catch {
    sendError(res, 404, 'NOT_FOUND', 'File not found');
  }
}

const server = http.createServer(async (req, res) => {
  const rid = requestId(req);
  res.setHeader('x-request-id', rid);
  res.setHeader('permissions-policy', 'camera=(self), geolocation=(self)');
  try {
    const url = parseUrl(req);
    if (url.pathname.startsWith('/api/')) {
      await routeApi(req, res, url, rid);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    const status = Number(error?.status || 500);
    if (status >= 500) console.error('request failed', { requestId: rid, error });
    sendError(
      res,
      status,
      status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST',
      status >= 500 ? 'Unexpected server error' : String(error?.message || 'Request failed'),
      rid,
    );
  }
});

async function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`COSTCO-SAVER API listening on :${PORT}`);
});
