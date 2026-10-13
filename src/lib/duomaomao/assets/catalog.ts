import { CylinderGeometry } from 'three';
import { characters, createCharacter } from './characters.ts';
import { ball, box, colors as c, group, mergeStatic, mesh, random } from './model-kit.ts';
import type { Point } from './model-kit.ts';
import * as env from './environment.ts';
import { emptyGameWorld, placedSolids } from './collision.ts';

export const props = [
	{ id: 'treehouse', name: '树屋', category: '建筑', create: env.treehouse },
	{ id: 'cottage-coral', name: '杏桃小屋', category: '建筑', create: () => env.cottage('coral') },
	{ id: 'cottage-mint', name: '薄荷小屋', category: '建筑', create: () => env.cottage('mint') },
	{ id: 'cottage-blue', name: '蓝顶小屋', category: '建筑', create: () => env.cottage('blue') },
	{ id: 'windmill', name: '风车', category: '建筑', create: env.windmill },
	{ id: 'market', name: '果子摊', category: '建筑', create: env.market },
	{ id: 'bridge', name: '木桥', category: '小物', create: env.bridge },
	{ id: 'oak', name: '阔叶树', category: '植被', create: () => env.tree('oak') },
	{ id: 'pine', name: '松树', category: '植被', create: () => env.tree('pine') },
	{ id: 'fruit-tree', name: '果树', category: '植被', create: () => env.tree('fruit') },
	{ id: 'bush', name: '矮树丛', category: '植被', create: () => env.bush(false) },
	{ id: 'hedge', name: '高树篱', category: '植被', create: () => env.bush(true) },
	{ id: 'crate', name: '木箱', category: '小物', create: env.crate },
	{ id: 'barrel', name: '木桶', category: '小物', create: env.barrel },
	{ id: 'bench', name: '长椅', category: '小物', create: env.bench },
	{ id: 'fence', name: '木栅栏', category: '小物', create: env.fence },
	{ id: 'lamp', name: '小路灯', category: '小物', create: env.lamp },
	{ id: 'signpost', name: '路牌', category: '小物', create: env.signpost },
	{ id: 'flowers', name: '野花', category: '植被', create: env.flowers },
	{ id: 'mushrooms', name: '蘑菇', category: '植被', create: env.mushrooms },
	{ id: 'rocks', name: '岩石', category: '地形', create: env.rocks },
	{ id: 'pond', name: '睡莲池', category: '地形', create: env.pond },
	{ id: 'island', name: '草地岛', category: '地形', create: env.island }
] as const;

export const landmarks = [
	{ id: 'treehouse', name: '树屋广场', position: [-0.5, 1.9, -3.3] as Point, description: '顺着木梯，藏到树荫里。' },
	{ id: 'windmill', name: '风车花园', position: [-5.5, 1.8, -5] as Point, description: '风车慢慢转，花丛轻轻摇。' },
	{ id: 'pond', name: '池畔木桥', position: [-4.1, 0.8, 3.5] as Point, description: '经过小桥时，脚步要轻一点。' }
] as const;

export function createVillage() {
	const root = group('windbell_village');
	const gameplay = emptyGameWorld();
	root.userData = { title: '风铃岛', assetSet: 'duomaomao-original-v1', seed: 260907, units: 'meters', groundY: 0, gameplay };
	root.add(env.island());
	const place = (object: ReturnType<typeof group>, x: number, z: number, rotation = 0, scale = 1, y = 0.03) => {
		object.position.set(x, y, z);
		object.rotation.y = rotation;
		object.scale.setScalar(scale);
		gameplay.solids.push(...placedSolids(object.name, x, z, rotation, scale, `${object.name}_${gameplay.solids.length}`));
		root.add(object);
		return object;
	};
	env.path(root, [[0, 8.8], [0.4, 5.9], [1, 2.5], [0, 0], [-0.5, -2.2]], 1.6);
	env.path(root, [[-8, -1], [-5.6, -0.5], [-2.9, 0.3], [0, 0], [3.2, -0.5], [6.3, -1.1], [8, -2]], 1.4);
	env.path(root, [[-1, 4.2], [-2.5, 3.5], [-6, 3.5], [-7.3, 1.1]], 1.1);
	env.path(root, [[2, 4.7], [4.4, 4.4], [5.2, 2]], 1.15);
	mesh(root, new CylinderGeometry(2.2, 2.2, 0.035, 48), c.path, [0, 0.04, 0], 'plaza');
	for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const paver = box(root, [0.4, 0.055, 0.25], c.cream, [Math.cos(a) * 1.8, 0.067, Math.sin(a) * 1.8]); paver.rotation.y = -a; }
	place(env.treehouse(), -0.5, -3.3);
	place(env.windmill(), -5.5, -5, 0.3, 0.91);
	place(env.cottage('coral'), -5.65, -1.8, 0.3);
	place(env.cottage('mint'), 4.55, -3.9, -0.55);
	place(env.cottage('blue'), 6.5, 0.2, -0.8, 0.86);
	place(env.market(), 4.3, 3.5, -0.34);
	place(env.pond(), -4.1, 3.5);
	place(env.bridge(), -4.1, 3.5, 0.1);
	place(env.bench(), -1.4, 1.1, 0.3);
	place(env.bench(), 2.4, -1.5, -1.2);
	place(env.signpost(), 0.9, 6.5, 0.3);
	for (const [x, z] of [[-2.5, -0.4], [2.4, 1.6], [5.4, 4.9], [-6.5, 4.9]]) place(env.lamp(), x, z);
	for (const [x, z, r] of [[-8, -1.7, 0.25], [-7.8, -4, 0.3], [6.3, -5.4, -0.4], [7.3, 3.6, -0.3], [4, 6.6, 0.1], [-3.1, 6.3, 0.3]]) place(env.fence(), x, z, r);
	for (const [x, z, r] of [[-8, 0.6, 0.8], [2.4, -6, -0.2], [7.8, 1.9, -0.2], [2.5, 6, 0.3]]) place(env.bush(true), x, z, r);
	place(env.crate(), 3, 3.7, 0.1);
	place(env.crate(), 2.6, 3.3, -0.1, 0.82, 0.84);
	place(env.crate(), -6.75, -0.3, 0.4, 0.8);
	place(env.barrel(), 5.9, 2.7, 0, 0.9);
	place(env.barrel(), -4.4, -1.05, 0, 0.78);
	const rng = random(260907);
	for (let i = 0; i < 16; i++) {
		const a = i / 16 * Math.PI * 2 + 0.1;
		const r = 8.6 + rng() * 0.7;
		// Leave the southern entrance and the pond's foreground open.
		if (Math.sin(a) > 0.55 && Math.cos(a) < 0.55) continue;
		place(env.tree(i % 3 === 0 ? 'pine' : i % 3 === 1 ? 'fruit' : 'oak'), Math.cos(a) * r, Math.sin(a) * r, rng() * 6, 0.65 + rng() * 0.23);
	}
	for (const [x, z] of [[-2.7, -4.2], [1.5, -3.3], [-6.7, 2], [3.2, -3], [5.8, 4.6], [-2, 6.5], [2.3, 7.3], [7.8, -2.7]]) {
		place(env.bush(), x, z, rng() * 4, 0.8);
		place(env.flowers(), x + 0.25, z + 0.5, rng() * 4, 1.05);
	}
	for (const [x, z] of [[-7.3, -5.9], [6.8, 6.3], [-7.4, 5.7], [2.8, -8.2], [-2.3, 8.5]]) place(env.rocks(), x, z, rng() * 4, 0.7 + rng() * 0.5);
	place(env.mushrooms(), -1.7, -2.1, 0.2);
	place(env.mushrooms(), -8.6, -1, 1);
	env.bunting(root, [-3.8, 2.4, -0.7], [2.7, 2.6, -1]);
	const cloudPositions: Point[] = [[-10.8, 4, -3.5], [7, 5, -9], [9.7, 2.3, 5.2]];
	for (const [index, position] of cloudPositions.entries()) {
		const cloud = group(`cloud_${index}`, position);
		cloud.userData.animated = 'float';
		for (const [x, y, radius] of [[-0.75, 0, 0.68], [0, 0.22, 0.88], [0.83, 0, 0.62]]) ball(cloud, radius, '#fff8e8', [x, y, 0], [1.3, 0.58, 0.8]);
		root.add(cloud);
	}
	return mergeStatic(root);
}

export function createCharacterLineup() {
	const root = group('woodland_friends');
	const clips = [];
	for (const [index, definition] of characters.entries()) {
		const entry = createCharacter(definition);
		entry.root.position.set((index % 4 - 1.5) * 2.05, 0, Math.floor(index / 4) * -2.65);
		root.add(entry.root);
		clips.push(...entry.animations.map(clip => { clip.name = `${definition.id}_${clip.name}`; return clip; }));
	}
	return { root, animations: clips };
}
