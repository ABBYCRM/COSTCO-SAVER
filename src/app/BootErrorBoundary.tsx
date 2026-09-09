import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Without this, any uncaught error in a hook or
 * module-level call (e.g. missing Supabase env vars) makes the body render
 * an empty `<div id="root">` and the user sees the Ionic body background
 * — which is dark navy (#0B1220) and looks like a "blue screen".
 *
 * This boundary catches those errors and shows a real, dismissible card
 * so the user can see what went wrong instead of guessing.
 */
export class BootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface to the browser console; production builds would also push
    // to Sentry via the Sentry SDK.
    // eslint-disable-next-line no-console
    console.error('[BootErrorBoundary]', error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }
    const err = this.state.error;
    const isMissingSupabase =
      /Supabase env vars missing/i.test(err.message) ||
      /VITE_SUPABASE_URL/.test(err.message);

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          padding: '24px',
          background: '#0B1220',
          color: '#E5E7EB',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'stretch',
          maxWidth: '720px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: '22px', color: '#F97316' }}>
          COSTCO-SAVER failed to start
        </h1>
        {isMissingSupabase ? (
          <p style={{ lineHeight: 1.5 }}>
            The app&apos;s <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> environment variables are
            not set in this build. Without them, Supabase cannot be
            initialized, so the app stops here on purpose instead of
            silently loading with no data.
          </p>
        ) : (
          <p style={{ lineHeight: 1.5 }}>
            An unexpected error stopped the app from loading. The detail is
            below — if you were a real user, please send a screenshot to
            support.
          </p>
        )}
        <pre
          style={{
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: '8px',
            padding: '12px',
            overflow: 'auto',
            fontSize: '13px',
            color: '#FCA5A5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {err.name}: {err.message}
        </pre>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={this.reset}
            style={{
              background: '#F97316',
              color: '#0B1220',
              border: '0',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="https://github.com/ABBYCRM/COSTCO-SAVER#operations"
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
            }}
          >
            View operations docs
          </a>
        </div>
      </div>
    );
  }
}
