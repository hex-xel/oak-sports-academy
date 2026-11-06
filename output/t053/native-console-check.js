// Run once in the React Native DevTools console while the synthetic account is signed in.
// Revokes only this current session; no credentials or tokens are printed.
(async () => {
  const modules = Array.from(__r.getModules().values());
  const client = modules.map(m => m.publicModule?.exports).find(e => e?.api && e?.createApiClient)?.api;
  if (!client) throw new Error('App API module unavailable; stop and report this message.');
  const started = performance.now();
  await client.session();
  const confirmationMs = Math.round(performance.now() - started);
  await client.logout();
  const results = await Promise.allSettled([client.session(), client.session(), client.session()]);
  console.log(JSON.stringify({confirmationMs, statuses: results.map(r => r.status === 'rejected' ? r.reason.status : 'unexpected-success')}));
})().catch(() => console.log('Native acceptance check failed; report the visible app state without credentials.'));
