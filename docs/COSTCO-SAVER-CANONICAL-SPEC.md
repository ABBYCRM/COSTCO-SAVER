# COSTCO-SAVER — Canonical Build Specification (v2.0)

This document is the canonical implementation specification for
COSTCO-SAVER Version 2.0. Every change in this repository should trace
back to a section in this document.

The 102-section original is mirrored here verbatim for self-containment.

---

## 1. Canonical product definition

COSTCO-SAVER is a warehouse-price intelligence application.

Its core purpose is to answer:

> "I am standing in Costco looking at this item. Is this actually a good
> price, has it dropped, what did it cost recently, what does the price
> ending mean, is another nearby warehouse cheaper, and did something I
> already purchased become cheaper?"

The principal workflow is:

**Scan → identify → locate → obtain price → validate price → classify
markdown → compare history → compare warehouse → calculate savings →
record/watch/purchase.**

Barcode data and pricing data remain deliberately separate.

- Barcode: product identity
- Shelf tag: warehouse price evidence
- Receipt: purchase evidence
- Historical observations: price movement evidence
- Warehouse: location context

Those five elements are joined by the backend.

---

## 2. The live-data problem is solved with a four-lane data network

COSTCO-SAVER will not depend on one retailer API or a single
crowdsourcing mechanism. It will operate a four-lane data acquisition
network.

### Lane A — Live Shelf Observation
A shopper scans:
1. product barcode;
2. shelf tag;
3. current warehouse.

One submission can therefore produce barcode, product, Costco item
number, warehouse, actual displayed price, markdown ending, asterisk
indicator, timestamp, and photographic evidence. This becomes a
first-class `shelf_observation`.

### Lane B — Receipt Price Observation
Receipts become a second independent price source. A receipt provides
warehouse, purchase date/time, Costco item number, item price,
discounts, quantity, and transaction evidence. The user imports a
photograph/PDF; the application extracts values where possible and
displays a confirmation screen. User confirms before persistence.
Confirmed receipt rows produce private purchase records and eligible
anonymized warehouse-price observations.

### Lane C — Licensed Product Identity Data
COSTCO-SAVER will support commercial barcode databases through adapters.
Purpose: barcode → generic product identity. The provider is not trusted
for Costco warehouse pricing. The interface is a `ProductIdentityProvider`
with a chain: Local Cache → COSTCO-SAVER DB → Primary UPC → Secondary
UPC → Community Creation.

### Lane D — Community Verification Network
Every user can confirm existing observations. A confirmation is much
faster than a complete resubmission, creating high-frequency verification.

---

## 3–6, 7–98 (omitted from the mirror — see the operator's pinned source)

The full 102-section canonical spec is owned by the operator. This
repository implements all of sections 1–2, the data model (11–13, 17,
19, 20, 29, 30, 32, 34, 47, 51), the markdown engine (17, 18), the
confidence engine (13), the freshness engine (14), the consensus engine
(15), the price events model (16), the barcode pipeline (20, 21), the
adjustment engine (30, 31), the deal score (38), the warehouse health
score (36), the security model (47, 48, 49, 50, 51, 59, 60, 81), the
UI shell (42, 66, 67, 68, 69), the API surface (58), the build pipeline
(86–89), the no-stub release rule (96), and the definition of done (97).

The remaining phases (Phase 1–3) are tracked in `docs/PHASES.md`.

---

## 99. Mini-max implementation instruction

MiniMax is not authorized to replace a specified production mechanism
with a simulation.

Examples:
- If push credentials are unavailable locally, implement the complete
  push provider, local test harness and staging configuration; do not
  replace the production pathway with fake notifications.
- If camera cannot execute in desktop Playwright, test scanner-domain
  injection in Playwright and separately test the real native camera
  integration on device.
- If a barcode is unknown, execute the real unknown-product flow.
- If a warehouse has no current price, execute Add/Verify Price.
- If external barcode provider misses, execute local/community product
  creation.

Every error condition must terminate in a useful functional path.

---

## 100. Final canonical architecture

See `README.md` for the runtime diagram.

## 101. Primary product promise

> **Scan it before you buy it.**

Then give the shopper:

- Current verified price
- Markdown status
- Price freshness
- Evidence confidence
- Price history
- Nearby warehouse difference
- Savings percentage
- Purchase adjustment opportunity

## 102. Final build requirement

The completed application is not merely a barcode scanner and not merely
another receipt tracker. It is a warehouse price verification network.
