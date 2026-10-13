import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { unzipSync } from 'three/addons/libs/fflate.module.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const assetRoot = resolve(root, 'public/assets');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = bytes => hash(Buffer.from(bytes).toString('utf8').replaceAll('\r\n', '\n'));
const manifest = JSON.parse(readFileSync(join(assetRoot, 'manifest.json'), 'utf8'));
assert.equal(manifest.legacyAssetsIncluded, false);
assert.equal(manifest.schemaVersion, 1);
const seen = new Set();
for (const [source, fingerprint] of Object.entries(manifest.sources)) {
	assert.equal(sourceHash(readFileSync(join(root, source))), fingerprint, `${source} changed; run pnpm assets:generate.`);
}
for (const entry of manifest.entries) {
	assert(!seen.has(entry.path), `Duplicate asset: ${entry.path}`);
	seen.add(entry.path);
	const path = resolve(assetRoot, entry.path);
	assert(path.startsWith(assetRoot + sep), `Asset path escapes pack: ${entry.path}`);
	const bytes = readFileSync(path);
	assert.equal(bytes.length, entry.bytes, `Size mismatch: ${entry.path}`);
	assert.equal(hash(bytes), entry.sha256, `Hash mismatch: ${entry.path}`);
	if (entry.path.endsWith('.glb')) {
		assert.equal(bytes.readUInt32LE(0), 0x46546c67, `Invalid GLB magic: ${entry.path}`);
		assert.equal(bytes.readUInt32LE(4), 2);
		assert.equal(bytes.readUInt32LE(8), bytes.length);
		assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
		const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8').trim());
		assert.equal(json.asset.version, '2.0');
		assert(!json.images?.length && json.buffers.every(buffer => !buffer.uri), 'GLBs must be self-contained geometry and palette materials.');
		assert(entry.bounds.size.every(value => Number.isFinite(value) && value > 0), `Invalid dimensions: ${entry.path}`);
		assert(entry.triangles > 0 && entry.meshes > 0);
		for (const accessor of json.accessors ?? []) {
			assert(accessor.count > 0);
			for (const value of [...(accessor.min ?? []), ...(accessor.max ?? [])]) assert(Number.isFinite(value));
		}
		if (entry.kind === 'character') {
			assert.deepEqual((json.animations ?? []).map(clip => clip.name), ['idle', 'walk', 'celebrate']);
			for (const clip of json.animations) for (const channel of clip.channels) assert(json.nodes[channel.target.node], 'Animation target is missing.');
		}
	} else if (entry.kind === 'audio') {
		assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
		assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
		assert.equal(bytes.readUInt32LE(24), entry.sampleRate);
		assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
	}
}

const zip = readFileSync(join(assetRoot, 'duomaomao-art-pack.zip'));
const archive = unzipSync(zip);
for (const path of Object.keys(archive)) assert(!/(^|\/)(reference|node_modules|static)(\/|$)|\.(drc|ktx2)$/i.test(path), `Legacy or dependency payload in archive: ${path}`);
for (const entry of manifest.entries) assert.equal(hash(archive[`public/assets/${entry.path}`]), entry.sha256, `Archive is stale: ${entry.path}`);
for (const [path, fingerprint] of Object.entries(manifest.sources)) assert.equal(sourceHash(archive[path]), fingerprint, `Archive source is stale: ${path}`);
assert.deepEqual(JSON.parse(Buffer.from(archive['public/assets/manifest.json']).toString('utf8')), manifest);
console.log(`Verified ${manifest.entries.filter(item => item.path.endsWith('.glb')).length} GLBs, ${manifest.entries.filter(item => item.kind === 'audio').length} sounds, original texture and icon. Archive: ${(zip.length / 1024 / 1024).toFixed(2)} MiB. Sources, hashes, animations, bounds and archive contents agree.`);
