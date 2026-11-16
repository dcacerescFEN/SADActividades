import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

// Solo se utiliza loopback; no se accede a la base SAD, al servidor de autenticación ni a notificaciones.
test('standalone API identifies itself and exposes no unfinished activity API', { timeout: 30000 }, async () => {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const address = listener.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  const published = process.env['SMOKE_PUBLISHED'] === '1';
  const server = spawn('dotnet', [
    published ? 'WebApi.dll' : 'bin/Debug/net10.0/WebApi.dll', '--urls', baseUrl,
  ], {
    cwd: published ? '.artifacts/publish' : 'src/Web/WebApi',
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  let startupError;
  server.on('error', error => { startupError = error; });
  const exited = once(server, 'close');
  try {
    let response;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (startupError) throw startupError;
      assert.equal(server.exitCode, null, `API exited before readiness:\n${output}`);
      try {
        response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(500) });
        break;
      } catch {
        await delay(100);
      }
    }
    assert.ok(response, `API did not become ready:\n${output}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { application: 'SADActividades', status: 'ok' });
    const activities = await fetch(`${baseUrl}/api/activities`);
    assert.equal(activities.status, 404);
    assert.equal(await activities.text(), '');
    const encodedActivities = await fetch(`${baseUrl}/api%2Factivities`);
    assert.equal(encodedActivities.status, 404);
    assert.equal(await encodedActivities.text(), '');
    const rejected = await fetch(`${baseUrl}/api/activities`, { method: 'POST' });
    assert.equal(rejected.status, 404);
    assert.equal(await rejected.text(), '');
    if (process.env['SMOKE_SPA'] === '1') {
      const page = await fetch(`${baseUrl}/actividades`);
      assert.equal(page.status, 200);
      assert.match(page.headers.get('content-type') ?? '', /text\/html/);
      const html = await page.text();
      assert.match(html, /<title>SADActividades<\/title>/);
      const assetPath = html.match(/(?:src|href)="([^"]+\.(?:js|css))"/)?.[1];
      assert.ok(assetPath, 'Staged SPA index must reference a JavaScript or CSS asset.');
      const asset = await fetch(new URL(assetPath, `${baseUrl}/`));
      assert.equal(asset.status, 200);
      assert.doesNotMatch(asset.headers.get('content-type') ?? '', /text\/html/);
    }
  } finally {
    if (server.exitCode === null) server.kill();
    await exited;
  }
});
