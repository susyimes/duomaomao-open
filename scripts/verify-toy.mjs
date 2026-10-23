import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3 } from 'three';

// Official Toy FAQ, checked 2026-10-24. Fail closed for unexpected file types.
const allowed = new Set('html htm css js json wasm data md csv tsv png jpg jpeg gif svg webp ico woff2 woff ttf eot mp3 wav ogg m4a mp4 webm atlas ani part nani unityweb'.split(' '));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function verifyToy(directory, root = process.cwd()) {
	const files = [];
	function walk(path, prefix = '') {
		for (const entry of readdirSync(path, { withFileTypes: true })) {
			if (entry.isDirectory()) walk(join(path, entry.name), prefix + entry.name + '/');
			else files.push(prefix + entry.name);
		}
	}
	walk(directory);
	assert(files.includes('index.html'), 'Toy needs root index.html');
	let total = 0;
	for (const file of files) {
		assert(allowed.has(extname(file).slice(1).toLowerCase()), `Toy filters ${file}`);
		const bytes = readFileSync(join(directory, file)); total += bytes.length;
		if (/\.(html|css|js)$/.test(file)) {
			const source = bytes.toString('utf8');
			assert(!/['"`]\/assets\//.test(source), `Absolute asset URL in ${file}`);
			assert(!/['"`]\/_(?:app|svelte)/.test(source), `Absolute runtime URL in ${file}`);
			assert(!/https?:\/\/[^\s'"`]*\.(?:js|css|glb|data|png|wav)(?:['"`?])/.test(source), `External dependency in ${file}`);
		}
	}
	assert(total < 50_000_000, 'Uncompressed Toy package exceeds 50,000,000 bytes');
	const original = JSON.parse(readFileSync(join(root, 'public/assets/manifest.json'), 'utf8'));
	const packaged = JSON.parse(readFileSync(join(directory, 'assets/manifest.json'), 'utf8'));
	const models = original.entries.filter(entry => entry.path.endsWith('.glb'));
	assert.equal(files.filter(path => path.endsWith('.data')).length, models.length);
	const loader = new GLTFLoader(); let clips = 0;
	for (const entry of models) {
		const path = entry.path.replace(/\.glb$/, '.data');
		const bytes = readFileSync(join(directory, 'assets', path));
		assert.equal(hash(bytes), entry.sha256, `Model changed: ${path}`);
		assert.equal(hash(bytes), hash(readFileSync(join(root, 'public/assets', entry.path))));
		assert(packaged.entries.some(item => item.path === path && item.sourcePath === entry.path && item.sha256 === entry.sha256));
		// Extension is deliberately irrelevant: GLTFLoader detects GLB magic in the buffer.
		const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
		const box = new Box3().setFromObject(gltf.scene);
		assert([...box.min, ...box.max].every(Number.isFinite), `Invalid bounds: ${path}`);
		clips += gltf.animations.length;
		if (entry.kind === 'character') assert.deepEqual(gltf.animations.map(clip => clip.name), ['idle', 'walk', 'celebrate']);
	}
	assert.equal(readFileSync(join(directory, 'assets/ASSET-LICENSE.md'), 'utf8'), readFileSync(join(root, 'public/assets/ASSET-LICENSE.txt'), 'utf8'));
	assert.equal(readFileSync(join(directory, 'assets/PROVENANCE.md'), 'utf8'), readFileSync(join(root, 'public/assets/PROVENANCE.md'), 'utf8'));
	console.log(`Toy contract: ${files.length} allowed files, ${total} bytes; ${models.length} byte-identical GLB payloads loaded as .data, ${clips} animation clips.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifyToy(resolve(process.argv[2] ?? '.toy-work/dist'));
