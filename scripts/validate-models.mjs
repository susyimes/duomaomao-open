import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { AnimationMixer, Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = fileURLToPath(new URL('../public/assets/', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const loader = new GLTFLoader();
let files = 0, clips = 0;
for (const entry of manifest.entries.filter(item => item.path.endsWith('.glb'))) {
	const bytes = readFileSync(join(root, entry.path));
	const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
	const gltf = await loader.parseAsync(data, '');
	assert(gltf.scene.children.length, `${entry.id}: scene is empty`);
	const bounds = new Box3().setFromObject(gltf.scene);
	assert(!bounds.isEmpty());
	assert([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite));
	for (const clip of gltf.animations) {
		assert(clip.duration > 0 && clip.tracks.length > 0, `${entry.id}: empty clip`);
		const before = [];
		gltf.scene.traverse(object => before.push([...object.position, ...object.quaternion, ...object.scale]));
		const mixer = new AnimationMixer(gltf.scene);
		mixer.clipAction(clip).play();
		mixer.update(0.17);
		const after = [];
		gltf.scene.traverse(object => after.push([...object.position, ...object.quaternion, ...object.scale]));
		assert.notDeepEqual(before, after, `${entry.id}/${clip.name}: animation does not move any loaded node`);
		mixer.stopAllAction();
		mixer.uncacheRoot(gltf.scene);
		clips++;
	}
	files++;
}
console.log(`Loaded ${files} exported GLBs with GLTFLoader; all dimensions are finite and all ${clips} exported clips move real nodes.`);
