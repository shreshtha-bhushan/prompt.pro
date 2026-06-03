'use client';

import { useEffect, useState } from 'react';

/**
 * Extension Auth Bridge (Client-Side)
 *
 * Flow:
 * 1. Extension opens this page
 * 2. Page calls /api/extension/token to get a JWT
 * 3. If not authenticated (401) → redirect to Auth0 login with returnTo back here
 * 4. If authenticated → redirect to dashboard with extensionToken in URL
 *    so the service worker picks it up
 */
export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'error'>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function linkExtension() {
      try {
        const res = await fetch('/api/extension/token');

        if (cancelled) return;

        if (res.status === 401) {
          // Not logged in — redirect to Auth0 login, then come back here
          setStatus('redirecting');
          window.location.href = '/auth/login?returnTo=/extension-auth';
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.token) {
          // Success! Redirect to dashboard with the extension token
          setStatus('redirecting');
          window.location.href = `/?extensionToken=${data.token}`;
        } else {
          throw new Error('No token received');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Extension Auth Error]:', message);
        setErrorMsg(message);
        setStatus('error');
      }
    }

    linkExtension();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center font-sans">
      <div className="text-center space-y-4 px-6 max-w-sm">
        {status === 'checking' && (
          <>
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">Checking authentication…</p>
          </>
        )}

        {status === 'redirecting' && (
          <>
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">Redirecting…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <span className="text-red-400 text-lg">✕</span>
            </div>
            <p className="text-sm text-zinc-400">Something went wrong</p>
            <p className="text-xs text-zinc-600">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-xs font-medium bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
