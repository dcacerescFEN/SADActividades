import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

async function runStage(root) {
  const child = spawn(process.execPath, ['scripts/stage-spa.mjs'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const [code] = await once(child, 'close');
  return { code, stdout, stderr };
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'sad-actividades-stage-'));
  await mkdir(join(root, 'scripts'), { recursive: true });
  await cp(new URL('../scripts/stage-spa.mjs', import.meta.url), join(root, 'scripts/stage-spa.mjs'));
  return root;
}

test('staging replaces previously generated SPA output', async () => {
  const root = await createFixture();
  try {
    const source = join(root, 'src/Web/WebUI/dist/webui/browser');
    const destination = join(root, 'src/Web/WebApi/wwwroot');
    await mkdir(source, { recursive: true });
    await mkdir(destination, { recursive: true });
    await writeFile(join(source, 'index.html'), '<title>fresh</title>');
    await writeFile(join(source, 'main.js'), 'fresh');
    await writeFile(join(destination, 'obsolete.js'), 'stale');

    const result = await runStage(root);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, 'SPA staged into WebApi/wwwroot.\n');
    assert.equal(await readFile(join(destination, 'index.html'), 'utf8'), '<title>fresh</title>');
    assert.equal(await readFile(join(destination, 'main.js'), 'utf8'), 'fresh');
    await assert.rejects(readFile(join(destination, 'obsolete.js'), 'utf8'), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('staging rejects an invalid source without changing generated output', async () => {
  const root = await createFixture();
  try {
    const source = join(root, 'src/Web/WebUI/dist/webui/browser');
    const destination = join(root, 'src/Web/WebApi/wwwroot');
    await mkdir(source, { recursive: true });
    await mkdir(destination, { recursive: true });
    await writeFile(join(source, 'main.js'), 'incomplete');
    await writeFile(join(destination, 'existing.js'), 'preserved');

    const result = await runStage(root);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Build the Angular application before staging\./);
    assert.equal(await readFile(join(destination, 'existing.js'), 'utf8'), 'preserved');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
