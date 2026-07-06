import { useEffect, useState } from 'react';

const CHECK_INTERVAL_MS = 60_000;

/**
 * GitHub Pages forces `Cache-Control: max-age=600` on everything and gives no way to override
 * it, so a stale index.html (pointing at a previous build's hashed JS/CSS) can linger in a
 * visitor's browser for up to 10 minutes after a deploy. This polls a tiny build-id.json with a
 * cache-busting query param — which always bypasses that cache — to detect when a newer build
 * has actually gone live, and prompts a reload instead of leaving the visitor stuck on old code.
 */
export function VersionWatcher() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const url = `${import.meta.env.BASE_URL}build-id.json?_=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data: { buildId?: string } = await res.json();
        if (!cancelled && data.buildId && data.buildId !== __BUILD_ID__) {
          setUpdateAvailable(true);
        }
      } catch {
        // offline, or the request was blocked — just skip this check, try again next interval
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 12, right: 12, zIndex: 2000,
        background: 'var(--bg-1)', border: '1px solid var(--acc-exec)', padding: '8px 10px',
        display: 'flex', gap: 10, alignItems: 'center', fontSize: 12,
      }}
    >
      <span>A new version of EPRson is available.</span>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}
