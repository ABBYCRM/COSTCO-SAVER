## What

<!-- One-paragraph summary of the change. -->

## Why

<!-- Link to the spec section this implements, or the issue. -->

## Files changed

<!-- List paths; new files should be marked (new). -->

## Database

- [ ] No migration
- [ ] New migration `supabase/migrations/YYYYMMDDHHMMSS_name.sql`
- [ ] Migration name: ____________
- [ ] RLS impact: ____________

## Security

- [ ] No new private data path
- [ ] New private data path — RLS verified in `tests/security/`
- [ ] Cross-user isolation re-run in `tests/security/isolation.test.ts`

## Test evidence

- `npm run test:unit` → ___ passed
- `npm run test:integration` → ___ passed
- `npm run test:security` → ___ passed (or skipped with reason)
- `npm run test:e2e` → ___ passed
- `npm run no-stub-scan` → 0 forbidden markers
- `npm run build` → succeeded

## Remaining external blockers

<!-- None, or list with concrete "what is needed". -->
