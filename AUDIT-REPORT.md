# COSTCO-SAVER Audit Report

## Files reviewed: 89
## Lines reviewed: 7,581

Line-by-line review of every `src/**/*.{ts,tsx}` file (40 / 4,416 LOC), every `supabase/**/*.sql` file (12 / 1,173 LOC), every `tests/**/*.ts` file (17 / 1,191 LOC), plus `docs/`, `scripts/`, `admin-scaffold/`, and root config. Canonical spec `docs/COSTCO-SAVER-CANONICAL-SPEC.md` is a 7-section mirror: §§3–98 are omitted from the repo.

## Critical issues (must fix)
1. `dist/index.html` (live GH Pages) — built asset URLs are root-absolute (`/assets/index-R9ZiPiTu.js`). On https://abbycrm.github.io/COSTCO-SAVER/ the browser requests https://abbycrm.github.io/assets/… which 404s (project-path `/COSTCO-SAVER/assets/…` is 200). The live app cannot boot. Evidence: `curl -sI` root asset → HTTP 404; project-path asset → HTTP 200. Cause: `scripts/deploy-ghpages.sh:17` runs `npx vite build` with default `base: '/'` and `src/app/App.tsx:31` has no React Router `basename`.
2. `src/features/scanner/ScanPage.tsx:88-109` — `submitManualShelfObservation` never calls `submitShelfObservation`. It only classifies the price locally and sets `lastResult`. The Scan tab's "Submit observation" path is a fake write. Evidence: function body has no API/RPC call; `lastResult` is assembled from `classifyPriceCode` only.
3. `src/services/api/purchases.ts:39-51` — `createPurchase` INSERT omits required `user_id` (`purchases.user_id uuid NOT NULL`, RLS `WITH CHECK (auth.uid() = user_id)`). Every "Bought it" save fails at the database. Evidence: insert payload has no `user_id`; schema in `supabase/migrations/20260831000007_receipts_purchases.sql:71`.
4. `src/services/api/watches.ts:32-41` — `createWatch` INSERT omits required `user_id`. Watch creation fails the same way. Evidence: insert payload; schema `20260831000008_watches_adjustments_notifications.sql:6` + insert policy line 30.
5. `src/services/api/receipts.ts:62-74` — `createReceipt` INSERT omits required `user_id` and never writes `receipt_lines`. Evidence: insert payload; loop at lines 80–100 only inserts `purchases` (also missing `user_id`).
6. `src/app/layouts/AppShell.tsx:62-70` + `src/app/App.tsx:33-46` — two `IonRouterOutlet` elements share `id="main"`. `AppShell` re-declares a subset of routes (no `/search`, `/product/:id`, `/product/:id/buy`). `BottomTabs` (`AppShell.tsx:78`) is exported and unused. No `IonMenuButton` exists anywhere, so the side menu cannot be opened on a phone. Evidence: grep `IonMenuButton` → 0 hits; grep `BottomTabs` → definition only.
7. `src/features/home/HomePage.tsx:147` and `:168` — `location.assign('/search')` and `location.assign('/scan')` navigate to https://abbycrm.github.io/search (and `/scan`), leaving the GH Pages project. Evidence: absolute root paths, no `import.meta.env.BASE_URL`.
8. `supabase/migrations/20260831000011_views_functions_triggers.sql:45-48` — `freshness_for` is `IMMUTABLE` but calls `now()`. Postgres may cache a stale bucket for the same `last_verified_at`. Evidence: `LANGUAGE plpgsql IMMUTABLE` + `EXTRACT(EPOCH FROM (now() - last_verified_at))`.

## Medium issues (should fix)
1. `src/services/api/warehouses.ts:32-37` — `findNearbyWarehouses` voids `latitude`/`longitude`/`limit` and returns `listWarehouses()`. Nearby ranking is a no-op. Evidence: `void latitude; void longitude; void limit; return listWarehouses();`
2. `src/services/offline/sync.ts:30` / `:70` — `drainOutbox` and `queueObservationOffline` are never imported by the app. Offline observations are not queued or replayed. Evidence: workspace grep, definitions only.
3. `src/services/api/confirmations.ts:29` — `confirmObservation` always returns `consensusMatches: true` even when the SQL function does not increment the counter (price mismatch). Evidence: hardcoded `true` after RPC.
4. `src/features/deals/DealsPage.tsx:94-99` — filter union includes `'asterisk'` but there is no asterisk chip, and the default branch returns `true` (no-op). Deal cards are not links. Evidence: `return true` at line 98; no `history.push`.
5. `src/features/saved/SavedPage.tsx:197-202` — "Saved deals" is a hardcoded empty state; it never reads watches or deals. Evidence: static copy only, no data fetch in that branch.
6. `supabase/migrations/20260831000011_views_functions_triggers.sql:131-139` — `record_price_observation` last-write-wins: every new observation overwrites `consensus_price_cents`. It does not cluster, does not write `price_events`, and does not update `confidence_score` / `conflicting_report_count`. Evidence: `ON CONFLICT … DO UPDATE SET consensus_price_cents = EXCLUDED.consensus_price_cents`.
7. `src/domain/barcodes/normalizeBarcode.ts:94-121` — `expandUpcEtoUpcA` uses a non-GS1 mapping (`slice(1, 4)` drops the first digit; last=5/6/9 share an incorrect branch). No unit test covers UPC-E. Evidence: algorithm vs GS1/ZXing conversion table.
8. `src/services/api/search.ts:25` — user query is interpolated into a PostgREST `.or()` filter (`normalized_value.ilike.%${trimmed}%`). Commas / reserved filter tokens can break or widen the query. Evidence: string interpolation, no escape.
9. `supabase/migrations/20260831000003_warehouses.sql:66-67` — `retailers_select_public` policy is created but `ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY` is missing, so the policy never applies.
10. `src/features/home/HomePage.tsx:83-85` — each drop row hardcodes `markdown_class: null` and `freshness_class: 'RECENT'` instead of joining `warehouse_product_state`. Fields are unused in render but the mapping fabricates freshness.
11. `tests/e2e/auth.spec.ts:20` — looks for a button named `Create account`, but `AuthScreen` defaults to sign-in (`Sign in` submit + `Need an account? Create one` toggle). Evidence: `AuthScreen.tsx:16` `mode` default `'signin'`.
12. `src/services/api/watches.ts:32-40` — when `warehouseId` is set, `scope` stays at the default `any_warehouse`, so the watch is not warehouse-scoped.
13. `src/features/scanner/ScanPage.tsx` — successful barcode lookup never writes `scan_history` (table exists, spec §47).
14. `src/app/App.tsx` — no `IonReactRouter` `basename`, so even a correctly based GH Pages bundle would miss `/COSTCO-SAVER/home`.

## Minor issues / nitpicks
1. `src/domain/deals/dealScore.ts:113` — `void percentChange` silences an unused import instead of using or dropping it.
2. `src/domain/trip/tripCalculator.ts:107` — unused `cents` re-export.
3. `src/domain/adjustments/adjustmentEngine.ts:126` — unused `subCents` re-export.
4. `src/services/supabase/client.ts:56` — `supabaseUrl()` is unused.
5. `src/services/api/joins.ts:16` — `unwrap()` is unused.
6. `src/app/layouts/AppShell.tsx:78` — `BottomTabs` is unused.
7. `src/features/auth/AuthGate.tsx:52` — `IonLoading` message says "Signing you in..." while only checking an existing session.
8. `src/features/auth/DemoScreen.tsx:4-6` — placeholder props comment; demo copy promises an in-page barcode box that does not exist (AuthGate replaces the whole app).
9. `src/features/saved/SavedPage.tsx` — watch cards show "Watch" instead of the product name (names are never fetched).
10. `src/domain/pricing/priceCodeEngine.ts:114` — `ASTERISK_EXPLANATION` is unused in UI.
11. `src/features/account/AccountPage.tsx:47-48` — copy promises export/delete; no such actions.
12. Vite emits an empty `supabase` chunk (`dist/assets/supabase-l0sNRNKZ.js` is 47 bytes) because the client is small and inlined elsewhere.
13. Bundle marker strings for minified identifiers (`normalizeBarcode`, `isSupabaseConfigured`, …) are expected MISSes after minify; SQL-only names (`classify_markdown`, `freshness_for`, `deal_feed`) are not in the client bundle.
14. `src/features/auth/AuthGate.tsx:35` — `console.error` on session failure (allowed by eslint, noisy).
15. `src/features/scanner/ScanPage.tsx:47` — `console.warn` when the native scanner plugin is absent.

## Stubs/fake code found: 6
- `src/features/scanner/ScanPage.tsx:103`: `setLastResult(\`Submitted: ${formatUSD(priceCents)} (${classification.classification})\`)` — no write
- `src/services/api/warehouses.ts:34-37`: `void latitude; void longitude; void limit; return listWarehouses();`
- `src/services/api/confirmations.ts:29`: `return { confirmationId: data as string, consensusMatches: true };`
- `src/features/home/HomePage.tsx:83-85`: `markdown_class: null, freshness_class: 'RECENT'`
- `src/features/saved/SavedPage.tsx:197-202`: hardcoded empty "Saved deals"
- `src/services/offline/sync.ts:67`: `throw new Error(\`outbox kind not yet wired: ${item.kind}\`)`

Anti-stub scan (`scripts/no-stub-scan.mjs`): 0 forbidden `TODO`/`FIXME`/`COMING_SOON`/`mockData` markers in `src/` / `tests/`. `console.log`: none. `throw new Error('not impl')`: none. `XXX`: none. `console.warn`: 1 (ScanPage, documented above). Word `any` hits are English prose / `notify_any_drop`, not TypeScript `any`.

## Spec gaps (features spec'd but not implemented): 22
- spec §3–98: the canonical spec file itself omits these sections (`docs/COSTCO-SAVER-CANONICAL-SPEC.md:79`) — should be the full 102-section source
- spec §2 Lane B: receipt photograph / OCR confirmation UI — should be at `src/features/account/` or a receipts feature; only `src/services/api/receipts.ts` exists
- spec §2 Lane C: `ProductIdentityProvider` chain (Local Cache → DB → licensed UPC → community create) — missing under `src/services/`
- spec §2 Lane A: photographic shelf evidence on the Scan form — `SubmitObservationInput.evidenceFile` is unused by ScanPage
- spec §7: verification missions UI — table in `20260831000009_moderation_audit_indexes.sql:45`; no feature module
- spec §8: launch seed claims ≥250 products / ≥100 identifiers / ≥30 observations per warehouse — `supabase/seed/001_launch_seed.sql` only inserts categories + 5 warehouses
- spec §11 / §15: SQL consensus job using `computeConsensus` — `record_price_observation` last-write-wins; TS engine is unused by the app
- spec §14: scheduled `refresh_state_freshness` — function exists, no cron / edge function
- spec §16: price event emission on observation — `price_events` table never written by the RPC
- spec §18: markdown explanation copy on product detail — `MARKDOWN_EXPLANATIONS` unused in UI
- spec §21: unknown-product community creation — products RLS is select-only (`20260831000004_categories_products_identifiers.sql:83`)
- spec §33–35: notification delivery / APNs / FCM — tables only
- spec §38 / §43: deal feed materialized view `deal_feed` is never queried (DealsPage hits `warehouse_product_state`)
- spec §42: 5-tab primary navigation — `BottomTabs` is dead; no visible tab bar
- spec §47: private scan history writes — table exists, no client insert
- spec §49: Apple / Google sign-in — AuthScreen is email/password only (Phase 2 per comment)
- spec §54: moderator resolve actions — `admin-scaffold` Resolve button is `disabled`
- spec §69 / account: export and delete account — copy only on AccountPage
- spec §74–76: Trip Mode UI — `tripCalculator.ts` is tested but no shopping-list / trip screen
- spec §46: offline outbox drain on reconnect — module unused
- spec §101: price history, nearby warehouse difference, savings % on product detail — ProductDetailPage has price + confidence + deal score only
- spec §96 / DemoScreen: demo build promises a live barcode box — DemoScreen is a static card

## Verification
- typecheck: PASS (log attached `/tmp/tsc.log`, EXIT=0)
- lint: PASS (log attached `/tmp/eslint.log`, EXIT=0)
- unit tests: 72 passed / 0 failed
- integration tests: 4 passed / 0 failed
- build: PASS (`dist/` ~1.8 MB JS + 45 kB CSS; `index.html` 780 B)
- bundle markers: 8 OK / 12 MISS

Bundle MISS detail: `isSupabaseConfigured`, `normalizeBarcode`, `priceCodeEngine`, `freshnessEngine`, `consensusEngine`, `dealScore`, `adjustmentEngine`, `warehouseHealth`, `tripCalculator` are minified identifiers (engines are imported and present). `classify_markdown`, `freshness_for`, `deal_feed` are SQL names not shipped in the client bundle. String-literal RPC names `record_price_observation` and `confirm_price_observation` are OK.
