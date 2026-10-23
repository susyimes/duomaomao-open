import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { zipSync } from 'three/addons/libs/fflate.module.js';
import { verifyToy } from './verify-toy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const work = resolve(root, '.toy-work');
// Only this fixed, ignored workspace is replaced. Website sources stay untouched.
assert.equal(dirname(work), resolve(root));
assert.equal(work, join(resolve(root), '.toy-work'));
rmSync(work, { recursive: true, force: true });
mkdirSync(work);
for (const name of ['src', 'public', 'vite.config.ts', 'tsconfig.json', 'package.json']) cpSync(join(root, name), join(work, name), { recursive: true });
const version = createHash('sha256');
function fingerprint(path) {
	for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
		version.update(entry.name);
		if (entry.isDirectory()) fingerprint(join(path, entry.name));
		else version.update(readFileSync(join(path, entry.name)));
	}
}
fingerprint(join(work, 'src'));
for (const name of ['public/assets/manifest.json', 'vite.config.ts', 'package.json', 'pnpm-lock.yaml', 'scripts/build-toy.mjs']) version.update(readFileSync(join(root, name)));
const versionName = version.digest('hex').slice(0, 16);
function patch(path, before, after) {
	const file = join(work, path), source = readFileSync(file, 'utf8');
	assert.equal(source.split(before).length - 1, 1, `Toy compatibility anchor changed or duplicated: ${path}: ${before}`);
	writeFileSync(file, source.replaceAll(before, after));
}
patch('vite.config.ts', "@sveltejs/adapter-auto", '@sveltejs/adapter-static');
patch('vite.config.ts', 'export default defineConfig({', 'export default defineConfig({\n\tssr: { noExternal: ["cookie"] },');
patch('vite.config.ts', "files: { assets: 'public' },", `files: { assets: 'public' },\n\t\t\tversion: { name: '${versionName}' },\n\t\t\tpaths: { relative: true },\n\t\t\trouter: { type: 'hash' },`);
patch('vite.config.ts', 'adapter: adapter(),', "adapter: adapter({ pages: 'dist', assets: 'dist', fallback: 'index.html' }),");
patch('src/routes/+layout.ts', 'export const ssr = false;', '// Hash routing is intrinsically client rendered.');
patch('src/routes/+page.svelte', "href={resolve('/gallery')}", 'href="#/gallery"');
patch('src/routes/gallery/+page.svelte', "href={resolve('/')}", 'href="#/"');
for (const path of ['src/routes/+layout.svelte', 'src/routes/gallery/+page.svelte', 'src/lib/duomaomao/game/runtime.ts', 'src/lib/duomaomao/game/view.ts', 'src/lib/duomaomao/preview.ts']) {
	const file = join(work, path);
	const source = readFileSync(file, 'utf8');
	const expectedAssets = { 'src/routes/+layout.svelte': 1, 'src/routes/gallery/+page.svelte': 2, 'src/lib/duomaomao/game/runtime.ts': 1, 'src/lib/duomaomao/game/view.ts': 4, 'src/lib/duomaomao/preview.ts': 3 };
	assert.equal([...source.matchAll(/(['"`])\/assets\//g)].length, expectedAssets[path], `Asset anchors changed: ${path}`);
	assert.equal([...source.matchAll(/\.glb/g)].length, path.endsWith('/view.ts') || path.endsWith('/preview.ts') ? 2 : 0, `Model anchors changed: ${path}`);
	writeFileSync(file, source.replace(/(['"`])\/assets\//g, '$1./assets/').replaceAll('.glb', '.data'));
}
patch('src/routes/gallery/+page.svelte', 'href="./assets/duomaomao-art-pack.zip" download', 'href="./assets/ASSET-LICENSE.md" target="_blank" rel="noopener"');
patch('src/routes/gallery/+page.svelte', '$t("下载原创素材包")', '$locale === "en" ? "Asset license" : "素材授权"');
// Short landscape containers put the original stamina bar inside the target panel.
// Keep it beside the joystick in this edition, leaving website layout untouched.
patch('src/routes/+page.svelte', '</style>', `
\t@media (pointer: coarse) and (max-height: 480px) and (min-width: 600px) {
\t\t.game-shell .stamina { left: 224px; bottom: 35px; width: 130px; }
\t}
</style>`);
const assets = join(work, 'public/assets');
for (const name of readdirSync(join(assets, 'models'))) {
	assert(name.endsWith('.glb'), `Unexpected model: ${name}`);
	renameSync(join(assets, 'models', name), join(assets, 'models', name.replace(/\.glb$/, '.data')));
}
renameSync(join(assets, 'ASSET-LICENSE.txt'), join(assets, 'ASSET-LICENSE.md'));
rmSync(join(assets, 'duomaomao-art-pack.zip'));
// Preserve original source provenance and byte hashes while identifying packaged paths.
const manifest = JSON.parse(readFileSync(join(assets, 'manifest.json'), 'utf8'));
manifest.distribution = 'bilibili-toy';
for (const entry of manifest.entries) {
	entry.sourcePath = entry.path;
	entry.path = entry.path.replace(/\.glb$/, '.data');
}
writeFileSync(join(assets, 'manifest.json'), JSON.stringify(manifest, null, 2));
cpSync(join(root, 'LICENSE'), join(work, 'public/LICENSE.md'));
cpSync(join(root, 'LICENSE-project.txt'), join(work, 'public/LICENSE-project.md'));
cpSync(join(root, 'node_modules/three/LICENSE'), join(work, 'public/THREE-LICENSE.md'));
const vite = join(root, 'node_modules/vite/bin/vite.js');
const result = spawnSync(process.execPath, [vite, 'build'], { cwd: work, stdio: 'inherit' });
assert.equal(result.status, 0, 'Toy source build failed');
// Adapter-static fallback documents intentionally use absolute preload/import URLs.
// Only the root fallback HTML needs this final relocation for arbitrary Toy prefixes.
const entryFile = join(work, 'dist/index.html');
const entryHtml = readFileSync(entryFile, 'utf8');
assert(entryHtml.includes('"/_app/immutable/entry/start.'));
assert(entryHtml.includes('"/_app/immutable/entry/app.'));
writeFileSync(entryFile, entryHtml.replaceAll('"/_app/', '"./_app/'));
await verifyToy(join(work, 'dist'), root);
const entries = {};
function collect(directory, prefix = '') {
	for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
		const path = join(directory, entry.name), key = prefix + entry.name;
		if (entry.isDirectory()) collect(path, key + '/');
		else entries[key] = [readFileSync(path), { mtime: new Date('2020-01-01T00:00:00Z') }];
	}
}
collect(join(work, 'dist'));
mkdirSync(join(root, 'dist-toy'), { recursive: true });
const zip = zipSync(entries, { level: 9 });
assert(zip.length < 50_000_000, 'Toy ZIP exceeds 50,000,000 bytes');
writeFileSync(join(root, 'dist-toy/duomaomao-toy.zip'), zip);
console.log(`Toy ZIP: ${join(root, 'dist-toy/duomaomao-toy.zip')} (${zip.length} bytes)`);
