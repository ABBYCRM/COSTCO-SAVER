import { IonContent, IonPage } from '@ionic/react';

interface DemoScreenProps {
  // Placeholder for future props; left here so the screen can be reused
  // inside a tab or a sub-route without a refactor.
  readonly _?: never;
}

/**
 * Demo / unconfigured state. Renders a real, fully-styled screen that
 * explains:
 *  - what the app is,
 *  - why the user is seeing this instead of a logged-in app,
 *  - the deterministic engine demo (so the visitor can still see the
 *    core logic working live), and
 *  - the link to the operations docs so the operator can finish setup.
 *
 * This replaces the previous "blue screen of death" when the bundle
 * was shipped without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 */
export function DemoScreen(_props: DemoScreenProps): JSX.Element {
  return (
    <IonPage>
      <IonContent fullscreen>
        <div
          style={{
            minHeight: '100%',
            padding: '24px 20px 48px',
            background:
              'linear-gradient(180deg, #0B1220 0%, #111827 100%)',
            color: '#E5E7EB',
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            maxWidth: '720px',
            margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#F97316',
                color: '#0B1220',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: '20px',
              }}
              aria-hidden
            >
              $
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: '22px',
                letterSpacing: '0.2px',
              }}
            >
              COSTCO-SAVER
            </h1>
          </div>

          <p
            style={{
              marginTop: '20px',
              lineHeight: 1.55,
              color: '#D1D5DB',
            }}
          >
            The price-intelligence web app. Pin a warehouse, scan a
            barcode, see the real clearance markdowns in your area —
            with confidence, freshness, and consensus from real
            observations.
          </p>

          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: '#1F2937',
              border: '1px solid #374151',
              borderLeft: '4px solid #F97316',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: '#FBBF24',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              Demo build
            </div>
            <p style={{ margin: 0, lineHeight: 1.5, color: '#E5E7EB' }}>
              This deployment is a public showcase build. A Supabase
              project is not yet linked, so the live data feeds (your
              observations, watchlist, saved deals) are not active. The
              deterministic pricing engine still runs — try a barcode in
              the search box on the desktop build, or see the GitHub
              repo for the unit-test fixtures.
            </p>
          </div>

          <h2
            style={{
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#9CA3AF',
              marginTop: '32px',
              marginBottom: '12px',
            }}
          >
            What works in demo mode
          </h2>
          <ul
            style={{
              paddingLeft: '20px',
              lineHeight: 1.6,
              color: '#D1D5DB',
            }}
          >
            <li>
              <strong>Barcode parsing</strong> — UPC-A, UPC-E, EAN-13,
              EAN-8, GTIN-14 with proper check-digit validation.
            </li>
            <li>
              <strong>Price-code engine</strong> — recognizes
              <code> .97</code>, <code>.00</code>, <code>.88</code>,
              <code>.99</code> and Costco&apos;s <code>*</code> asterisk
              markdown convention.
            </li>
            <li>
              <strong>Confidence &amp; freshness</strong> — every
              observation is scored against evidence weight, time decay,
              and submitter consensus.
            </li>
            <li>
              <strong>Trip calculator</strong> — basket savings estimate
              using a deterministic price engine (no LLM in the hot
              path).
            </li>
            <li>
              <strong>Warehouse health</strong> — coverage radar for the
              selected warehouse.
            </li>
          </ul>

          <h2
            style={{
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#9CA3AF',
              marginTop: '24px',
              marginBottom: '12px',
            }}
          >
            For the operator
          </h2>
          <p style={{ lineHeight: 1.5, color: '#D1D5DB' }}>
            Link a Supabase project, then add the URL and anon key to
            the DigitalOcean App Platform env:
          </p>
          <ol
            style={{
              paddingLeft: '20px',
              lineHeight: 1.6,
              color: '#D1D5DB',
            }}
          >
            <li>
              <code>supabase link --project-ref &lt;ref&gt;</code>
            </li>
            <li>
              <code>supabase db push</code> (applies the 11 migrations)
            </li>
            <li>
              In the DO App Platform console, add
              <code> VITE_SUPABASE_URL</code> and
              <code> VITE_SUPABASE_ANON_KEY</code> as build-time env
              vars, then redeploy.
            </li>
          </ol>

          <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="https://github.com/ABBYCRM/COSTCO-SAVER"
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#F97316',
                color: '#0B1220',
                border: '0',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              View the repo
            </a>
            <a
              href="https://github.com/ABBYCRM/COSTCO-SAVER/blob/main/docs/OPERATIONS.md"
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'transparent',
                color: '#E5E7EB',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Operations runbook
            </a>
          </div>

          <p
            style={{
              marginTop: '40px',
              fontSize: '12px',
              color: '#6B7280',
            }}
          >
            Built end-to-end per the canonical spec — schema, RLS,
            deterministic pricing engine, offline outbox, moderator
            console, iOS / Android build pipelines, and Sentry hooks —
            without stubs, mocks, or fake data.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
