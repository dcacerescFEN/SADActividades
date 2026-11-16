import { cp, mkdir, readdir, rm } from 'node:fs/promises';

const source = new URL('../src/Web/WebUI/dist/webui/browser/', import.meta.url);
const destination = new URL('../src/Web/WebApi/wwwroot/', import.meta.url);
const entries = await readdir(source);
if (!entries.includes('index.html')) throw new Error('Build the Angular application before staging.');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log('SPA staged into WebApi/wwwroot.');
