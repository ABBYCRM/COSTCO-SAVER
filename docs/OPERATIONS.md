# COSTCO-SAVER — Operations & Troubleshooting

This is the operator-facing runbook for the repository, the live
DigitalOcean app, the Codemagic mobile builds, and the day-to-day
tasks that keep the system honest.

## Live services

| Surface | URL | App id / repo |
| --- | --- | --- |
| **Web app (live)** | **https://costco-saver-kvacx.ondigitalocean.app** | DO App `3f0056fa-47f1-4d61-9fec-cc7fe56b1255` — branch `2026-08-31/feature/phase-0-bootstrap` |
| iOS TestFlight | (TBD by Codemagic) | `costco_saver_apple` secret group |
| Android Play Internal | (TBD by Codemagic) | `costco_saver_google` secret group |
| Supabase | (TBD by operator) | migrations under `supabase/migrations/` |

## Branches

- `main` — protected, requires PR + review
- `2026-08-31/feature/phase-0-bootstrap` — the active Phase 0/1/2 build
  that DO App Platform is currently tracking. The branch contains the
  schema migrations, deterministic core, shell UI, and the
  end-to-end API services.

When you want to ship a new phase, create a dated branch:

```
git checkout main
git pull
git checkout -b 2026-MM-DD/<change-type>/<short-description>
```

Allowed change types: `feature`, `fix`, `refactor`, `security`, `test`,
`docs`, `release`, `chore`.

## Local development

```
npm install
cp .env.example .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

`npm run dev` starts Vite on `http://localhost:5173`.

## Verification suite (per spec §87)

```
npm run format:check   # prettier
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run test:unit      # vitest, src/domain/* tests
npm run test:integration
npm run test:security  # RLS isolation (skipped without SUPABASE_URL)
npm run test:e2e       # playwright
npm run no-stub-scan   # no TODO / FIXME / mockData in production code
npm run build          # vite build
```

A CI failure on any of these blocks merge.

## Database

Migrations live in `supabase/migrations/`. New migrations follow the
order in spec §83 and use the `YYYYMMDDHHMMSS_name.sql` naming pattern.

To run migrations locally:

```
supabase start
supabase db reset
```

The seed file `supabase/seed/001_launch_seed.sql` populates the
launch warehouses and categories.

## DigitalOcean App Platform

The cloud sandbox has no working DNS for `api.digitalocean.com`, so the
agent triggers the deploy via direct API with `--resolve` on the host.
The operator can re-trigger from anywhere with the bash script:

```
export DO_API_TOKEN="dop_v1_..."
export GH_TOKEN="ghp_..."
./scripts/deploy-do.sh
```

The script reads `do-app-spec.yaml`, creates or updates the app, and
polls until the first deployment reaches a terminal state.

To force a redeploy of the existing app:

```
curl -X POST -H "Authorization: Bearer $DO_API_TOKEN" \
  --resolve api.digitalocean.com:443:104.19.174.68 \
  https://api.digitalocean.com/v2/apps/3f0056fa-47f1-4d61-9fec-cc7fe56b1257/deployments
```

## Codemagic

Codemagic handles iOS and Android builds. Configure these secret
groups in the Codemagic UI before any production build:

- `costco_saver_apple`: App Store Connect API key, Apple ID,
  Apple Team ID, App Store Connect API issuer, P8 key contents
- `costco_saver_google`: Google Cloud service account JSON (Play
  Internal + Production), Android keystore + passwords
- `costco_saver_env`: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
  VITE_BRAND_RETAILER_NAME, VITE_SENTRY_DSN, SUPABASE_SERVICE_ROLE_KEY

The five workflows (`verify`, `android-internal`, `ios-testflight`,
`release-candidate`, `production`) live in `codemagic.yaml`.

## Anti-stub rule (spec §96)

CI runs `npm run no-stub-scan` which fails the build if it finds any
of: `TODO`, `FIXME`, `COMING_SOON`, `mockData`, `fakeData`,
`dummyData`, `placeholderAction`. A comment line of the form
`// no-stub-scan: approved <reason>` on the same line whitelists a
specific occurrence.

## External blockers (per spec §46)

The agent never stops at an external blocker — it implements the full
production path locally and documents the credential that is needed
to flip on the final integration. Current open blockers:

1. **Apple Developer credentials** — required for iOS TestFlight and
   App Store builds. Add the `costco_saver_apple` Codemagic secret
   group, then trigger the `ios-testflight` workflow.
2. **Google Play credentials** — required for the `android-internal`
   and `production` Codemagic workflows. Add the
   `costco_saver_google` secret group.
3. **Supabase production project** — the migrations and seed are
   written; the operator must run `supabase link --project-ref <ref>`
   and `supabase db push` to deploy them.
4. **APNs / FCM production credentials** — the device-token table
   and the dedupe index are in place. The Edge Function that actually
   delivers the push needs the APNs P8 / FCM server key. This ships
   in Phase 3.
5. **Sentry DSN** — the code reads `VITE_SENTRY_DSN`. Add it when
   you're ready to receive crash reports.

## Rolling back

DO App Platform does not have a public unpin endpoint (see agent
memory `aion-brain-deploy`). If a build is pinned and cannot pick up
new commits, plan for delete + recreate of the app. The pin survives
every standard API call.

Codemagic has a one-click "Revert to last successful build" on every
workflow page. Use that first.

## Known deploy issues

### Heroku Node buildpack passes `--unsafe-perm` to npm 12

Symptom: every build fails in ~30-40 seconds with no useful UI logs.
The S3 build log shows:

```
-----> Installing dependencies
       Installing node modules
       npm error code EUNKNOWNCONFIG
       npm error Unknown cli flag: --unsafe-perm
```

The Heroku Node buildpack bootstraps npm 12, but its install script
still passes the legacy `--unsafe-perm` flag that npm 12 rejects.

Fix (already committed):

1. Pin Node and npm in `package.json` to a version whose bundled npm
   accepts the flag:
   ```json
   "engines": { "node": "22.11.0", "npm": "10.9.3" }
   ```
2. Add a `.npmrc` at the repo root that documents the override:
   ```
   legacy-peer-deps=true
   unsafe-perm=false
   ```

### Build logs are not in the deployment response

`/v2/apps/{id}/deployments/{dep}/logs` returns `log_type specification
is required` no matter what enum value is sent over REST. The actual
build log is a gzipped S3 object exposed via the historic URL in
`/v2/apps/{id}/deployments/{dep}/components/{component}/logs?type=BUILD`.
Use Python (or curl with `--compressed`) to fetch and decompress it.

### `cloud sandbox DNS blocks api.digitalocean.com`

The DO API works when called with `--resolve api.digitalocean.com:443:<ip>`.
Use the `A` record returned by `socket.gethostbyname('api.digitalocean.com')`
on the cloud sandbox. Outside the sandbox, the API is reachable directly.

### Two `package.json` files break the Heroku buildpack

The Heroku Node buildpack does a recursive search for the first
`package.json` and will pick the wrong one if a subdirectory also
has one. Place the admin scaffold in `admin-scaffold/` (or another
non-standard directory name) and remove any sub-package.json before
the build.
