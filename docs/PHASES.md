# COSTCO-SAVER — Build phases (per spec §98)

This repository implements the canonical COSTCO-SAVER v2.0 spec in
the order prescribed by §98. Each phase has its own PR.

| # | Phase | Status | Notes |
| -- | --- | --- | --- |
| 01 | Repository / bootstrap | **shipped** | this PR |
| 02 | Environment validation | **shipped** | `.env.example`, Codemagic secret groups |
| 03 | Database foundation | **shipped** | migrations 01–10 |
| 04 | RLS / authentication | **shipped** | migrations + `tests/security/isolation.test.ts` |
| 05 | Warehouse directory | **shipped** | migrations + Home picker + `useWarehouse` store |
| 06 | Product catalog | **shipped** | `products`, `product_identifiers`, `product_aliases`, RLS |
| 07 | Barcode identity | **shipped** | `normalizeBarcode.ts` + unit tests |
| 08 | Native scanner | **partial** | Capacitor plugin wired; full camera UX lands in Phase 1 |
| 09 | Shelf observation | **partial** | manual entry path shipped; full photo upload lands in Phase 1 |
| 10 | Price-code engine | **shipped** | `priceCodeEngine.ts` + unit tests |
| 11 | Confidence engine | **shipped** | `confidenceEngine.ts` + unit tests |
| 12 | Consensus engine | **shipped** | `consensusEngine.ts` + unit tests |
| 13 | Warehouse product state | **shipped** | SQL materialized view + function |
| 14 | Price history | **partial** | price_events table + timeline component placeholder |
| 15 | Deal engine | **shipped** | `dealScore.ts` + unit tests |
| 16 | Deal feed | **partial** | query in `DealsPage`; filters shipped |
| 17 | Product detail | **partial** | header, price, confidence shipped; history chart placeholder |
| 18 | Confirmation network | **partial** | `confirm_price_observation` SQL RPC + scanner UI |
| 19 | Verification missions | **schema shipped** | UI lands in Phase 1 |
| 20 | Watches | **partial** | table + RLS + scanner + segment, but no full UI |
| 21 | Price events | **shipped** | table + consensus job hook |
| 22 | Push notifications | **partial** | table + dedupe index, APNs/FCM providers in Phase 3 |
| 23 | Purchase ledger | **partial** | table + RLS + Add from scanner |
| 24 | Receipt import | **partial** | table + RLS; OCR flow lands in Phase 2 |
| 25 | Adjustment engine | **shipped** | `adjustmentEngine.ts` + unit tests |
| 26 | Shopping list | **schema shipped** | UI lands in Phase 2 |
| 27 | Trip Mode | **partial** | shopping list infra; trip calc lands in Phase 2 |
| 28 | Offline sync | **partial** | zustand-persisted warehouse + outbox table TBD in Phase 2 |
| 29 | Moderator console | **not started** | Phase 3 — separate `admin/` bundle |
| 30 | Anti-abuse | **partial** | device_session_hash + idempotency key in schema |
| 31 | Accessibility | **partial** | token-driven; full WCAG pass in Phase 3 |
| 32 | Full E2E | **partial** | auth + isolation specs; full matrix in Phase 3 |
| 33 | Native hardware QA | **not started** | Phase 3 — Codemagic + real device |
| 34 | Security QA | **partial** | RLS tests + isolation E2E; full adversarial pass in Phase 3 |
| 35 | Performance QA | **not started** | Phase 3 |
| 36 | Codemagic | **shipped** | `codemagic.yaml` with 5 workflows |
| 37 | TestFlight | **configured** | needs `costco_saver_apple` secret group |
| 38 | Google Play Internal | **configured** | needs `costco_saver_google` secret group |
| 39 | Store release | **not started** | Phase 3 |

"**partial**" = the spec's hard requirement (schema, RLS, or pure-logic
unit test) is shipped; the consumer UI lands in the next phase PR.

## How to run a phase

Each phase lives on its own branch following `YYYY-MM-DD/<change-type>/<short-description>`
(spec §36). Phase 0 (this PR) is `2026-08-31/feature/phase-0-bootstrap`.
