import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { zipSync, strToU8 } from 'three/addons/libs/fflate.module.js';
import { characters, createCharacter } from '../src/lib/duomaomao/assets/characters.ts';
import { createVillage, createCharacterLineup, landmarks, props } from '../src/lib/duomaomao/assets/catalog.ts';
import { mergeStatic } from '../src/lib/duomaomao/assets/model-kit.ts';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const output = join(projectRoot, 'public/assets');
for (const folder of ['models', 'audio']) mkdirSync(join(output, folder), { recursive: true });

// GLTFExporter's binary path only needs Blob -> ArrayBuffer in a Node process.
class BlobReader {
	result = null;
	onloadend = null;
	readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
	readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
}
globalThis.FileReader = BlobReader;

const entries = [];
function record(path, bytes, metadata) {
	const destination = join(output, path);
	mkdirSync(dirname(destination), { recursive: true });
	writeFileSync(destination, bytes);
	entries.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...metadata });
}

async function exportModel(id, label, root, animations = [], kind = 'prop') {
	root.updateMatrixWorld(true);
	const bounds = new Box3().setFromObject(root);
	if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)) throw new Error(`Invalid bounds in ${id}`);
	let triangles = 0, meshes = 0;
	root.traverse(object => {
		if (!(object instanceof Mesh)) return;
		meshes++;
		triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
		const positions = object.geometry.getAttribute('position');
		for (let i = 0; i < positions.array.length; i++) if (!Number.isFinite(positions.array[i])) throw new Error(`Non-finite geometry in ${id}`);
	});
	const bytes = await new GLTFExporter().parseAsync(root, { binary: true, animations, onlyVisible: true });
	record(`models/${id}.glb`, Buffer.from(bytes), { id, label, kind, triangles, meshes,
		bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new Vector3()).toArray() },
		animations: animations.map(clip => clip.name), source: 'authored-parametric-geometry' });
	console.log(`${id}: ${Math.round(triangles)} triangles, ${meshes} meshes, ${Math.round(bytes.byteLength / 1024)} KiB`);
}

for (const prop of props) await exportModel(prop.id, prop.name, mergeStatic(prop.create()));
for (const definition of characters) {
	const { root, animations } = createCharacter(definition);
	await exportModel(`player-${definition.id}`, `${definition.name} · ${definition.species}`, root, animations, 'character');
}
const village = createVillage();
await exportModel('village', '风铃岛完整场景', village, [], 'scene');
record('world.json', Buffer.from(JSON.stringify(village.userData.gameplay, null, 2) + '\n'), { id: 'world', label: '风铃岛碰撞与地面', kind: 'world', source: 'authored-gameplay-footprints' });
const lineup = createCharacterLineup();
await exportModel('friends', '八位小伙伴', lineup.root, lineup.animations, 'scene');

function makeChime(notes, duration) {
	const sampleRate = 24000;
	const frameCount = Math.ceil(duration * sampleRate);
	const data = Buffer.alloc(44 + frameCount * 2);
	data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
	data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
	data.writeUInt32LE(sampleRate, 24); data.writeUInt32LE(sampleRate * 2, 28);
	data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(frameCount * 2, 40);
	for (let i = 0; i < frameCount; i++) {
		const time = i / sampleRate;
		let sample = 0;
		for (const [frequency, start, sustain] of notes) {
			const t = time - start;
			if (t < 0 || t > sustain) continue;
			const envelope = Math.min(t / 0.008, 1) * Math.exp(-t * 7 / sustain) * Math.min((sustain - t) / 0.02, 1);
			sample += (Math.sin(Math.PI * 2 * frequency * t) + Math.sin(Math.PI * 2 * frequency * 2.002 * t) * 0.18) * envelope * 0.22;
		}
		data.writeInt16LE(Math.round(Math.tanh(sample) * 32760), 44 + i * 2);
	}
	return data;
}

const sounds = [
	{ id: 'tap', label: '木琴轻点', duration: 0.25, notes: [[880, 0, 0.21]] },
	{ id: 'ready', label: '准备出发', duration: 0.9, notes: [[523.25, 0, 0.5], [659.25, 0.13, 0.5], [783.99, 0.26, 0.6]] },
	{ id: 'found', label: '发现小伙伴', duration: 0.6, notes: [[1046.5, 0, 0.3], [783.99, 0.13, 0.4]] },
	{ id: 'win', label: '小小庆祝', duration: 1.6, notes: [[523.25, 0, 0.6], [659.25, 0.17, 0.6], [783.99, 0.34, 0.6], [1046.5, 0.51, 0.95]] },
	{ id: 'bell', label: '风铃', duration: 1.4, notes: [[1174.66, 0, 0.9], [1567.98, 0.22, 1.1]] }
];
for (const sound of sounds) record(`audio/${sound.id}.wav`, makeChime(sound.notes, sound.duration), {
	id: sound.id, label: sound.label, kind: 'audio', duration: sound.duration, source: 'original-additive-synthesis', sampleRate: 24000
});

const meadow = readFileSync(join(output, 'textures/meadow.png'));
record('textures/meadow.png', meadow, { id: 'meadow', label: '手绘草地', kind: 'texture',
	source: 'built-in-imagegen', width: meadow.readUInt32BE(16), height: meadow.readUInt32BE(20) });
record('icons/paw.svg', readFileSync(join(output, 'icons/paw.svg')), { id: 'paw', label: '爪印标志', kind: 'icon', source: 'authored-vector' });

const sourcePaths = ['scripts/generate-assets.mjs', 'src/lib/duomaomao/Icon.svelte', ...['model-kit', 'environment', 'characters', 'catalog', 'collision'].map(name => `src/lib/duomaomao/assets/${name}.ts`)];
const sources = Object.fromEntries(sourcePaths.map(path => [path, createHash('sha256').update(readFileSync(join(projectRoot, path), 'utf8').replaceAll('\r\n', '\n')).digest('hex')]));

const manifest = {
	schemaVersion: 1, name: 'Duomaomao · 风铃岛', version: '1.1.0', created: '2026-09-07',
	units: 'meters', upAxis: '+Y', characterForward: '+Z', seed: 260907,
	legacyAssetsIncluded: false, sourceHashNormalization: 'LF', sources, entries,
	landmarks, spawnPoints: [[0, 0, 5.8], [1, 0, 3], [-1, 0, 0.4], [1.5, 0, -0.3]],
	notes: ['Characters use named rigid hierarchies, not deforming skin rigs.', 'Grass texture is supplied separately and assigned by the runtime.', 'world.json supplies outdoor obstacle footprints and bridge ground data; game rules live in the application.']
};
writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const archive = {};
for (const entry of entries) archive[`public/assets/${entry.path}`] = readFileSync(join(output, entry.path));
for (const file of ['manifest.json', 'PROVENANCE.md', 'ASSET-LICENSE.txt']) archive[`public/assets/${file}`] = readFileSync(join(output, file));
for (const name of ['model-kit.ts', 'characters.ts', 'environment.ts', 'catalog.ts', 'collision.ts']) {
	const path = join(projectRoot, 'src/lib/duomaomao/assets', name);
	archive[relative(projectRoot, path).replaceAll('\\', '/')] = readFileSync(path);
}
archive['scripts/generate-assets.mjs'] = readFileSync(fileURLToPath(import.meta.url));
archive['src/lib/duomaomao/Icon.svelte'] = readFileSync(join(projectRoot, 'src/lib/duomaomao/Icon.svelte'));
archive['package.json'] = strToU8(JSON.stringify({ name: 'duomaomao-art-pack', private: true, type: 'module',
	scripts: { generate: 'node scripts/generate-assets.mjs' }, dependencies: { three: '0.184.0' } }, null, 2));
archive['README.md'] = strToU8('# 风铃岛原创素材包\n\n模型、贴图、音效位于 public/assets。GLB 可以导入 Blender 等支持 glTF 的工具。\n\n可编辑源码位于 src/lib/duomaomao/assets。使用 Node.js 24 或更新版本，运行 npm install 和 npm run generate 可重新生成模型、动画和音效。草地 PNG 保持为随包提供的图像；生成提示词见 PROVENANCE.md。\n\n角色动画：idle / walk / celebrate。采用刚性部件层级，未提供蒙皮变形骨架。地图尺寸单位为米。贴图需单独指定给 meadow_grass 材质。\n\n许可见 public/assets/ASSET-LICENSE.txt。这个包不包含上游 Messenger 的素材。\n');
writeFileSync(join(output, 'duomaomao-art-pack.zip'), zipSync(archive, { level: 6 }));
console.log(`Exported ${entries.filter(entry => entry.path.endsWith('.glb')).length} GLB files, ${sounds.length} sounds, 1 texture and the editable source archive.`);
