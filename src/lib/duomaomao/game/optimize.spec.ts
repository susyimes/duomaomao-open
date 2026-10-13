import { readFileSync } from 'node:fs';
import { AnimationMixer, Box3, Mesh, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { characters } from '../assets/characters';
import { optimizeRigidParts } from './optimize';

const loader = new GLTFLoader();
async function load(id: string) {
	const bytes = readFileSync(new URL(`../../../../public/assets/models/${id}.glb`, import.meta.url));
	return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
function geometryStats(root: Object3D) {
	let meshes = 0, triangles = 0;
	root.traverse(object => {
		if (object instanceof Mesh) { meshes++; triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3; }
	});
	return { meshes, triangles };
}
function expectSameBounds(a: Object3D, b: Object3D) {
	const original = new Box3().setFromObject(a, true), optimized = new Box3().setFromObject(b, true);
	expect(original.min.distanceTo(optimized.min)).toBeLessThan(0.00001);
	expect(original.max.distanceTo(optimized.max)).toBeLessThan(0.00001);
}

describe('gameplay model batching', () => {
	it('reduces draw objects while preserving the actual village and all eight character shapes', async () => {
		for (const id of ['village', ...characters.map(character => `player-${character.id}`)]) {
			const original = await load(id), optimized = await load(id);
			const before = geometryStats(original.scene);
			optimizeRigidParts(optimized.scene, new Set(original.animations.flatMap(clip => clip.tracks.map(track => track.name.split('.')[0]))));
			const after = geometryStats(optimized.scene);
			expect(after.meshes).toBeLessThan(before.meshes / 2);
			expect(after.triangles).toBe(before.triangles);
			expectSameBounds(original.scene, optimized.scene);
		}
	});
	it('preserves the animated silhouettes and pivot transforms of every character action', async () => {
		for (const character of characters) {
			const original = await load(`player-${character.id}`), optimized = await load(`player-${character.id}`);
			const names = new Set(original.animations.flatMap(clip => clip.tracks.map(track => track.name.split('.')[0])));
			optimizeRigidParts(optimized.scene, names);
			for (const clip of original.animations) {
				const originalMixer = new AnimationMixer(original.scene), optimizedMixer = new AnimationMixer(optimized.scene);
				originalMixer.clipAction(clip).play(); optimizedMixer.clipAction(clip).play();
				for (const time of [0.17, 0.53, 0.95]) {
					originalMixer.setTime(time); optimizedMixer.setTime(time);
					expectSameBounds(original.scene, optimized.scene);
					for (const name of names) {
						expect(optimized.scene.getObjectByName(name)?.matrixWorld.elements).toEqual(original.scene.getObjectByName(name)?.matrixWorld.elements);
					}
				}
				originalMixer.stopAllAction(); optimizedMixer.stopAllAction();
				originalMixer.uncacheRoot(original.scene); optimizedMixer.uncacheRoot(optimized.scene);
			}
		}
	});
});
