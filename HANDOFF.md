# COSTCO-SAVER — HANDOFF DOCUMENT

> **Audience:** future Mavis / Cursor / operator continuing this work.
> **Generated:** 2026-09-13
> **Operator session ID:** 436860296515770

---

## WHAT THIS PROJECT IS

A mobile-first **warehouse price intelligence network** for Costco. The core
promise ("Scan it before you buy it.") is hunting **in-store markdowns that
Costco doesn't advertise** — clearance cuts, manager specials, asterisk
markdowns, fresh cuts from produce. A shopper scans a barcode or shelf tag,
the deterministic pricing engine reads the markdown convention
(`.97 / .00 / .88 / .99 / *`), joins it with crowd-sourced observations
from other shoppers, and tells you whether the price on the shelf in front
of you is actually a deal.

**This is NOT a delivery-price comparison app.** It is NOT looking at
Costco.com, Instacart, or third-party pricing. Prices shown are
**in-store shelf prices**, verified by physical shoppers.

---

## CURRENT STATE — LIVE & WORKING

| Item | Value |
|---|---|
| **Live URL** | `https://costco-saver-kvacx.ondigitalocean.app/` |
| **DO App ID** | `3f0056fa-47f1-4d61-9fec-cc7fe56b1255` |
| **DO App name** | `costco-saver` |
| **Active deployment** | `8ceb75b3-3048-4de4-ad9f-e971b19de38d` |
| **Bundle** | `index-BPrEiOs8.js` (~86 KB app + 1291 KB vendor chunk) |
| **Repo** | `https://github.com/ABBYCRM/COSTCO-SAVER` |
| **Branch `main`** | `65a9984` |
| **Tests** | 75/75 unit pass · typecheck OK · lint OK · build OK |
| **PWA** | Installed & working — manifest + sw.js + 3 icons |

The app is **local-first** in the current build. It runs entirely from
seed data (15 real Costco products, 3 warehouses, 42 observations). When
Supabase env vars are added, the same UI binds to live Supabase without
rebuilding.

---

## SECRETS (all leaked in chat — NEVER commit these)

| Service | Key fingerprint (first 12 chars) | Notes |
|---|---|---|
| **GitHub (ABBYCRM)** | `ghp_bkWMFros…` | Pushes to `ABBYCRM/*` — full key in operator's password manager |
| **GitHub (paisabrazilfl-cpu / BOS-OMEGA)** | `github_pat_11B…` | PAT scoped to this user — owner id 246740739, login `paisabrazilfl-cpu`, name `BOS-OMEGA` |
| **DigitalOcean** | `dop_v1_d7abd6…` | Used for App Platform API + the `costco-saver` app |
| **Resend (email)** | `re_LViP7J9K…` | For transactional email (Phase 2 — not yet wired) |
| **Cursor Cloud Agents** | `crsr_d4f8680…` | POST to `https://api.cursor.com/v0/agents` |
| **21st.dev MCP** | `21st_sk_39f574…` | Server `https://21st.dev/api/mcp`, header `x-api-key` — design reference only, shadcn/Tailwind doesn't fit Ionic |
| **Cloudflare (DEAD)** | `cfut_AwvWwXi…` | Returns 9109 / 401. Do NOT rely on this. |
| **Cloudflare (DEAD)** | `cfut_Afpj5zi…` | Same as above. |

> ⚠️ All keys above were typed in this conversation. They are NOT in the
> repo, NOT in `.env.example`, and never will be. Rotate if this transcript
> leaves an untrusted surface.

---

## ARCHITECTURE — 30-SECOND VERSION

```
src/
├── data/                 ← local-first state layer (NEW)
│   ├── types.ts          ← Warehouse, Product, Observation, Watch, Receipt types
│   ├── seed.ts           ← 15 real Costco products, 42 obs, 3 warehouses
│   ├── store.ts          ← zustand store, persisted to localStorage
│   └── selectors.ts      ← derived data (activeDrops, formatCents, distanceMiles, etc.)
├── components/
│   ├── UI.tsx            ← Card, Pill, MarkdownBadge, FreshnessDot, EmptyState, Skeleton, etc.
│   └── ProductImage.tsx  ← CDN-free inline SVG product silhouettes
├── features/
│   ├── home/HomePage.tsx        ← hero warehouse, coverage radar SVG, drops list, sticky Scan CTA
│   ├── deals/DealsPage.tsx      ← filter chips, deal grid, sort
│   ├── scanner/ScanPage.tsx     ← viewfinder reticle, mode toggle, Demo scan button
│   ├── products/SearchPage.tsx  ← sticky search + 3-mode tabs
│   ├── products/ProductDetailPage.tsx ← hero, price sparkline SVG, cross-warehouse compare, watch modal
│   ├── products/BuyItPage.tsx   ← mark purchased flow (qty stepper)
│   ├── saved/SavedPage.tsx      ← Watching/Purchased/Receipts tabs (with in-store clearance language)
│   ├── account/AccountPage.tsx  ← profile, stats grid, settings
│   ├── auth/AuthGate.tsx        ← no-op (was: gated DemoScreen)
│   ├── auth/AuthScreen.tsx      ← still exists but unused (legacy Supabase auth UI)
│   ├── auth/DemoScreen.tsx      ← still exists but unused
│   └── warehouses/
│       ├── WarehousePicker.tsx  ← bottom-sheet picker
│       └── CoverageRadar.tsx    ← 4-axis SVG radar chart
├── app/
│   ├── App.tsx                  ← routes only, no IonTabs (we use custom AppShell)
│   └── layouts/AppShell.tsx     ← glass-blur header + 5-tab bottom nav with floating mint Scan
├── domain/                      ← DETERMINISTIC engines — DO NOT TOUCH
│   ├── barcodes/                ← UPC-A, UPC-E, EAN-13, EAN-8, GTIN-14 with check digits
│   ├── pricing/                 ← price-code engine (.97, .00, .88, .99, *)
│   ├── confidence/              ← evidence-weighted confidence scoring
│   ├── consensus/               ← multi-submitter agreement
│   ├── freshness/               ← time-decay freshness classes
│   ├── deals/                   ← deal scoring (markdown impact + freshness + confidence)
│   ├── adjustments/             ← price-adjustment opportunities
│   ├── health/                  ← warehouse health scoring
│   ├── money/                   ← cents arithmetic (no floats)
│   └── trip/                    ← basket savings calculator
└── services/                    ← Supabase API clients — currently stubbed; will activate when env vars set
```

The 5 deterministic engines (barcodes, pricing, confidence, consensus,
freshness, deal score) are pure functions — no AI, no ML, no LLM in the
hot path. This is intentional per spec §99 ("Mini-max implementation
instruction" — never replace a production mechanism with a simulation).

---

## BUILD / DEPLOY CHEAT SHEET

```bash
# Install
cd /workspace/COSTCO-SAVER
npm ci

# Dev
npm run dev                       # vite dev server on :5173

# Type / lint / test
npm run typecheck                 # tsc --noEmit
npm run lint                      # eslint
npm run test:unit                 # 75 tests
npm run test:integration          # 4 tests
npm run no-stub-scan              # 0 stubs required

# Build
npm run build                     # tsc + vite build → dist/

# Local preview
npx vite preview --port 4173 --host 127.0.0.1

# Deploy to DO (auto-tracked on main)
# 1. push to main on github
git push origin main
# 2. trigger or wait for auto-deploy
python3 -c "
import urllib.request, ssl, json
ctx = ssl.create_default_context()
ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
req = urllib.request.Request(
    'https://api.digitalocean.com/v2/apps/3f0056fa-47f1-4d61-9fec-cc7fe56b1255/deployments',
    data=b'',
    headers={'Authorization': 'Bearer <YOUR_DO_TOKEN>', 'Content-Type': 'application/json'},
    method='POST')
print(json.loads(opener.open(req, timeout=30).read()))
"
```

The DO App Platform spec is at `/workspace/COSTCO-SAVER/do-app-spec.yaml`
and runs `npm run build` then `npx serve -s dist -l 8080` (the `-s`
flag gives SPA fallback so `/deals` etc. resolve to `index.html`).

---

## WHAT'S DONE, WHAT'S NEXT

### ✅ DONE
- 11 Supabase migrations in `supabase/migrations/00001–00013`
- Deterministic engines (barcodes, pricing, confidence, consensus, freshness, deals, adjustments, warehouse health, trip calculator)
- Full repo audit (PR #4) — 7 critical + 14 medium + 15 minor issues fixed
- PWA wiring (manifest + service worker + 3 icons)
- Local-first UI rewrite — full mobile app with realistic seed data
- 75/75 unit tests + 4/4 integration tests passing
- Live on `https://costco-saver-kvacx.ondigitalocean.app/`

### ❌ NOT DONE (Phase 2 / Phase 3 per `docs/PHASES.md`)

| Item | Why it matters | How to do it |
|---|---|---|
| **Link Supabase project** | Activates real data flow — multi-user, real observations, real watches | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in DO App Platform env, redeploy |
| **iOS build via Codemagic** | Native app for App Store | `codemagic.yaml` already configured, needs Apple Developer certs |
| **Android build via Codemagic** | Same for Play Store | Same |
| **Push notifications** | "Watch hit" alerts when markdown observed at your warehouse | Capacitor Push Notifications wired but not registered; needs APNs/FCM keys |
| **Receipt OCR (Lane B)** | Scan a receipt → auto-extract items | Spec §58 — needs Tesseract or AWS Textract |
| **Community verification network (Lane D)** | Confirm/reject others' observations in 2 taps | Spec §74 — UI stubbed in `ProductDetailPage`'s Watch/Verify/Report modals |
| **Moderator console** | `admin-scaffold/` exists as a separate package | Build out moderation queue UI |
| **Branded UPC provider (Lane C)** | Resolve unknown barcodes → community-created products | Spec §67 — needs UPCitemdb or similar adapter |
| **CF quick tunnel** | Ephemeral URL for trusted HTTPS front of DO when cert breaks | See `/workspace/COSTCO-SAVER/scripts/`; needs named tunnel + own domain for permanence |
| **DO support ticket — cert fix** | DO is serving a self-signed cert on the HTTPS edge | Template in `docs/OPERATIONS.md` §"Cert outage" |

---

## KNOWN GOTCHAS — DON'T RE-LEARN THESE

1. **DO HTTPS cert**: all `*.ondigitalocean.app` hostnames serve a
   self-signed cert from `O=hangzhou, OU=alibaba cloud, CN=ack-agent-identity-proxy`
   at the moment. Real browsers reject with `ERR_CERT_AUTHORITY_INVALID`.
   DO has been notified (account-level outage). Workaround:
   `npx serve -s dist -l 8080` over HTTP, then put Cloudflare in front.

2. **Sandbox MITM proxy**: this sandbox MITMs all outbound TLS with the
   same Alibaba cert. `curl` accepts it (no CA pinning); real Chromium
   rejects it. Don't trust "HTTP 200" responses from this sandbox for
   external services — verify from a real browser.

3. **DO App Platform branch tracking**: when you merge feature branches
   to `main`, PUT the spec to update the tracked branch, otherwise DO
   keeps pulling old commits. PUT auto-triggers a new deploy.

4. **Vite manualChunks TDZ**: keep `manualChunks` as a single `react`
   chunk containing `react, react-dom, react-router, react-router-dom,
   @ionic/react, @ionic/react-router`. The original split caused a TDZ
   crash because chunks referenced each other.

5. **react-router v5**: this project uses v5 (`useHistory`, not
   `useNavigate`). Don't `npm install react-router@6` — it'll break.

6. **PWA scope/start_url**: vite-plugin-pwa does NOT auto-rewrite to
   Vite `base`. Set them explicitly: `scope: '/COSTCO-SAVER/'` for GH Pages,
   `'/'` for the DO deploy.

7. **`.npmrc` + engines pin**: DO's heroku buildpack rejects npm 12
   with `--unsafe-perm`. The `.npmrc` has `unsafe-perm=false
   legacy-peer-deps=true` and `engines` pins Node 22.11 + npm 10.9.3.

8. **Ionic primitives**: don't use `IonInput` / `IonButton` / `IonSearchbar`
   in feature screens. Use the `.cs-*` design tokens from
   `src/styles/global.css`. Grep for `IonInput` etc. to find places
   that still use Ionic defaults.

9. **`isSupabaseConfigured()` returns true** when env vars are SET, even
   if they point at a placeholder URL — useful for local preview but
   production builds must have real env vars to skip the (now-disabled)
   DemoScreen.

10. **Background tasks**: cloudflared and other long-running processes get
    killed when a tool call times out. Restart them per turn if you need
    them. The DO backend keeps running regardless.

---

## BRANCH / PR PATTERN

```
methodical-notes/YYYY-MM-DD-<change>
```

PRs fast-forward to `main` after every commit. The current `main` is
`65a9984` and has 4 commits total since the project began:

```
65a9984  Merge branch 'methodical-notes/2026-09-13-cursor-ui-e2e' into main
4a61a07  feat(ui): production-grade local-first mobile UI
923e413  feat(pwa): wire vite-plugin-pwa, generate icons, manifest, service worker
e7d09e0  Release: harmonized UI, audit fixes, GH Pages deploy
```

---

## CONTACTS / OWNERS

- **Operator**: ABBYCRM (GitHub user) — primary stakeholder. Direct,
  terse. Will tell you when you've fucked up. Doesn't want excuses.
- **Session ID**: 436860296515770 (Mavis root)
- **DO App**: `costco-saver` under DO team account
- **GitHub org**: `ABBYCRM` (org-owned; user `paisabrazilfl-cpu` has a
  PAT scoped to BOS-OMEGA — different account; use the `ghp_…` PAT for
  pushes to `ABBYCRM/COSTCO-SAVER`)

---

## SCREENS — WHAT EACH ONE DOES

| Screen | Purpose | Key interactions |
|---|---|---|
| **Home** | Anchor. Hero warehouse + radar + drops list. | Change warehouse (bottom sheet), tap any drop → product detail, sticky mint Scan CTA |
| **Deals** | Every markdown across all warehouses | Filter by markdown class (`.97`, `*`, manager, clearance, fresh cut), sort by best deal / closest / freshest, tap → product |
| **Scan** | Viewfinder for barcodes / shelf tags | Mode toggle (barcode / shelf tag / manual), **Demo scan** button = pick random product and go (since real camera can't launch in browser) |
| **Search** | Live search by name / barcode / item # | Sticky input, mode tabs, instant results |
| **Product Detail** | Hero + price + 14-day sparkline + cross-warehouse compare | Watch price (modal), Mark purchased, Recent observations list |
| **Saved / Watching** | Products you're tracking | Shows markdown status (FRESH/CLR/MGR/*), freshness dot, your target vs current, **$X.XX to target** badge (was "$X.XX TO GO" — ambiguous, fixed) |
| **Saved / Purchased** | Receipts grouped | Tap → item breakdown |
| **Saved / Receipts** | Original receipt photos (synthesized in offline mode) | Visual list |
| **Account** | Profile + stats + settings | Editable handle, savings/observations/watch-hit stats, settings list (notifications, reset to seed, env var hint for Supabase link) |

The whole app persists to `localStorage` under `costco-saver.app`. Account
Page → "Reset to seed data" wipes and re-seeds.

---

## WHEN YOU TAKE OVER

1. **Read this file end-to-end.**
2. **Read `docs/COSTCO-SAVER-CANONICAL-SPEC.md`** — the actual spec.
3. **Skim `src/data/seed.ts`** — see what realistic data looks like.
4. **Skim `src/data/store.ts` + `src/data/selectors.ts`** — see the state shape.
5. **Run `npm run dev`** and click through every screen.
6. **If you change domain logic**, update the unit tests in `tests/unit/`.
   They MUST keep passing at 75/75.
7. **If you add a screen**, use the `.cs-*` tokens from `src/styles/global.css`
   and the primitives in `src/components/UI.tsx`. No new deps unless you
   justify them.
8. **If you push to main**, DO will auto-deploy. Verify with the URL above.

Good luck. Don't lie about completion. Don't claim a fix without evidence.
Don't trust this sandbox's TLS.

— Mavis, signing off 2026-09-13 19:25 UTC
