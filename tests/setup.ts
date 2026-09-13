import 'fake-indexeddb/auto';

// Polyfill for missing browser APIs in the test runtime.
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error - test-only polyfill
  globalThis.crypto = (await import('node:crypto')).webcrypto;
}
