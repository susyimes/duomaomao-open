import { AnimationClip, Euler, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import type { Group, KeyframeTrack } from 'three';
import { ball, beam, box, capsule, colors as c, cone, cylinder, group, ring } from './model-kit.ts';
import type { Point } from './model-kit.ts';

export const characters = [
	{ id: 'fox', name: '栗栗', species: '小狐狸', color: '#db976b', outfit: '#718f8b', trait: '尾巴藏好了，才算藏好了。' },
	{ id: 'rabbit', name: '跳跳', species: '小兔子', color: '#f3e4ce', outfit: '#cd8b85', trait: '躲进花丛，耳朵也要低一点。' },
	{ id: 'bear', name: '团团', species: '小熊', color: '#b99577', outfit: '#7e9b76', trait: '最喜欢树屋下的那片阴凉。' },
	{ id: 'frog', name: '芽芽', species: '小青蛙', color: '#9caf79', outfit: '#e1b161', trait: '池塘边有一个秘密位置。' },
	{ id: 'raccoon', name: '灰灰', species: '小浣熊', color: '#a6aaa0', outfit: '#c98d70', trait: '木箱之间，总能挤下一只。' },
	{ id: 'deer', name: '点点', species: '小鹿', color: '#cda479', outfit: '#85a2b4', trait: '知道小镇里每一条小路。' },
	{ id: 'sheep', name: '绵绵', species: '小羊', color: '#efe8d7', outfit: '#a79bb4', trait: '不动的时候，很像一朵云。' },
	{ id: 'bird', name: '啾啾', species: '小鸟', color: '#e6c67a', outfit: '#6d9d98', trait: '看见你了，就忍不住啾一声。' }
] as const;

export type CharacterId = typeof characters[number]['id'];
export type CharacterDefinition = typeof characters[number];

function rotationTrack(name: string, times: number[], angles: number[], axis: 'x' | 'z' = 'x') {
	const values = angles.flatMap(angle => new Quaternion().setFromEuler(new Euler(axis === 'x' ? angle : 0, 0, axis === 'z' ? angle : 0)).toArray());
	return new QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
}

export function createCharacter(definition: CharacterDefinition) {
	const { id, color, outfit } = definition;
	const root = group(`player_${id}`);
	root.userData = { assetId: id, displayName: definition.name, rig: 'rigid-hierarchy', forward: '+Z' };
	const body = group(`${id}_body`, [0, 0.68, 0]);
	const head = group(`${id}_head`, [0, 0.72, 0]);
	root.add(body);
	body.add(head);
	capsule(body, 0.28, 0.21, outfit, [0, 0.15, 0]);
	ball(body, 0.22, c.cream, [0, 0.1, 0.224], [0.78, 0.95, 0.22]);
	for (const y of [0.06, 0.2]) ball(body, 0.025, c.woodDark, [0, y, 0.288], [1, 1, 0.5], 0);
	const scarf = ring(body, 0.245, 0.055, c.mustard, [0, 0.4, 0]);
	scarf.rotation.x = Math.PI / 2;
	const scarfEnd = box(body, [0.12, 0.31, 0.055], c.mustard, [0.15, 0.25, 0.27]);
	scarfEnd.rotation.z = -0.16;
	ball(head, 0.405, color, [0, 0, 0], [1, 0.96, 0.94], 2);
	if (id === 'raccoon') for (const x of [-0.18, 0.18]) ball(head, 0.16, '#606963', [x, 0.055, 0.28], [1.2, 0.75, 0.3]);
	if (id !== 'frog' && id !== 'bird') {
		ball(head, 0.225, c.cream, [0, -0.11, 0.28], [1.14, 0.63, 0.6]);
		ball(head, 0.065, c.ink, [0, -0.06, 0.423], [1, 0.72, 0.8]);
	}
	for (const x of [-0.165, 0.165]) {
		const y = id === 'frog' ? 0.21 : 0.055;
		if (id === 'frog') ball(head, 0.17, color, [x * 1.3, y + 0.04, 0.19]);
		ball(head, 0.044, c.ink, [x, y, id === 'frog' ? 0.34 : 0.35], [0.8, 1.12, 0.5]);
		ball(head, 0.013, '#fffdf5', [x - 0.008, y + 0.014, id === 'frog' ? 0.363 : 0.373], [1, 1, 0.5], 1);
		ball(head, 0.065, '#dca093', [x * 1.5, -0.085, 0.29], [1, 0.48, 0.2]);
	}
	if (id === 'bird') {
		const beak = cone(head, 0.115, 0.21, c.coral, [0, -0.07, 0.4]);
		beak.rotation.x = Math.PI / 2;
		for (let i = 0; i < 3; i++) { const tuft = ball(head, 0.1, c.mustard, [(i - 1) * 0.085, 0.36 + (1 - Math.abs(i - 1)) * 0.065, 0], [0.48, 1.5, 0.6]); tuft.rotation.z = (i - 1) * -0.4; }
	} else if (id === 'frog') {
		const smile = ring(head, 0.095, 0.012, c.leafDark, [0, -0.12, 0.362], Math.PI);
		smile.rotation.z = Math.PI;
	} else if (id === 'rabbit') {
		for (const x of [-0.19, 0.19]) {
			const ear = group(`${id}_ear_${x < 0 ? 'left' : 'right'}`, [x, 0.32, 0]);
			ear.rotation.z = x * -0.7;
			capsule(ear, 0.112, 0.31, color, [0, 0.25, 0]);
			capsule(ear, 0.058, 0.25, '#dba9a1', [0, 0.26, 0.073]);
			head.add(ear);
		}
	} else if (id === 'fox') {
		for (const x of [-0.26, 0.26]) {
			const ear = cone(head, 0.17, 0.4, color, [x, 0.4, 0]);
			ear.rotation.z = -x * 0.55;
			cone(head, 0.09, 0.26, c.cream, [x, 0.4, 0.09]);
		}
		for (const x of [-0.27, 0.27]) ball(head, 0.15, c.cream, [x, -0.11, 0.2], [1.2, 0.75, 0.6], 0);
	} else if (id === 'deer') {
		for (const x of [-0.25, 0.25]) {
			const ear = ball(head, 0.17, color, [x * 1.55, 0.19, 0], [1.2, 0.5, 0.57]);
			ear.rotation.z = x * 1.2;
			beam(head, [x, 0.24, -0.04], [x * 1.1, 0.68, -0.05], 0.038, c.woodDark);
			beam(head, [x, 0.47, -0.04], [x * 1.85, 0.58, -0.02], 0.03, c.woodDark);
			beam(head, [x * 1.85, 0.58, -0.02], [x * 1.92, 0.74, -0.02], 0.025, c.woodDark);
		}
		for (const x of [-0.09, 0.09]) ball(head, 0.044, c.cream, [x, 0.25, 0.27], [0.6, 1, 0.4]);
	} else if (id === 'sheep') {
		for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ball(head, 0.155, c.cream, [Math.cos(a) * 0.31, 0.24, Math.sin(a) * 0.26]); }
		for (const x of [-0.42, 0.42]) { const horn = ring(head, 0.12, 0.055, c.woodLight, [x, 0.13, 0]); horn.rotation.y = Math.PI / 2; }
	} else {
		for (const x of [-0.285, 0.285]) {
			ball(head, 0.155, color, [x, 0.3, 0]);
			ball(head, 0.082, id === 'bear' ? '#8c6c58' : c.woodDark, [x, 0.31, 0.095], [1, 1, 0.4]);
		}
	}

	for (const side of [-1, 1]) {
		const arm = group(`${id}_${side < 0 ? 'left' : 'right'}_arm`, [side * 0.3, 0.34, 0]);
		capsule(arm, 0.087, 0.16, outfit, [side * 0.045, -0.13, 0]);
		ball(arm, 0.095, color, [side * 0.052, -0.28, 0], [0.85, 1, 0.95]);
		body.add(arm);
		const leg = group(`${id}_${side < 0 ? 'left' : 'right'}_leg`, [side * 0.15, 0.47, 0]);
		capsule(leg, 0.11, 0.18, color, [0, -0.16, 0]);
		ball(leg, 0.135, c.woodDark, [0, -0.34, 0.055], [0.95, 0.57, 1.28]);
		root.add(leg);
	}
	if (id === 'fox' || id === 'raccoon') {
		const tail = group(`${id}_tail`, [0, 0.68, -0.24]);
		tail.rotation.x = -0.7;
		if (id === 'fox') {
			ball(tail, 0.22, color, [0, 0.08, -0.34], [1, 1, 2.15]);
			ball(tail, 0.16, c.cream, [0, 0.08, -0.68], [1, 1, 1.2]);
		} else {
			for (let i = 0; i < 5; i++) { const band = cylinder(tail, 0.115 - i * 0.008, 0.125 - i * 0.008, 0.14, i % 2 ? c.woodDark : color, [0, 0, -0.1 - i * 0.13]); band.rotation.x = Math.PI / 2; }
		}
		root.add(tail);
	} else if (id === 'rabbit' || id === 'bear' || id === 'sheep' || id === 'deer') ball(root, 0.13, color, [0, 0.63, -0.31]);

	const idle = new AnimationClip('idle', 2.4, [
		new VectorKeyframeTrack(`${id}_body.position`, [0, 1.2, 2.4], [0, 0.68, 0, 0, 0.708, 0, 0, 0.68, 0]),
		rotationTrack(`${id}_head`, [0, 1.2, 2.4], [-0.025, 0.025, -0.025], 'z')
	]);
	const times = [0, 0.2, 0.4, 0.6, 0.8];
	const tracks: KeyframeTrack[] = [new VectorKeyframeTrack(`${id}_body.position`, times, times.flatMap((_, i) => [0, i % 2 ? 0.7 : 0.68, 0]))];
	for (const [side, sign] of [['left', 1], ['right', -1]] as const) {
		tracks.push(rotationTrack(`${id}_${side}_leg`, times, [0.5, 0, -0.5, 0, 0.5].map(a => a * sign)));
		tracks.push(rotationTrack(`${id}_${side}_arm`, times, [-0.5, 0, 0.5, 0, -0.5].map(a => a * sign)));
	}
	const walk = new AnimationClip('walk', 0.8, tracks);
	const celebrate = new AnimationClip('celebrate', 1.2, [
		new VectorKeyframeTrack(`${id}_body.position`, [0, 0.3, 0.6, 0.9, 1.2], [0, 0.68, 0, 0, 0.88, 0, 0, 0.68, 0, 0, 0.85, 0, 0, 0.68, 0]),
		rotationTrack(`${id}_left_arm`, [0, 0.3, 0.9, 1.2], [0, -2.3, -2.5, 0], 'z'),
		rotationTrack(`${id}_right_arm`, [0, 0.3, 0.9, 1.2], [0, 2.3, 2.5, 0], 'z')
	]);
	return { root, animations: [idle, walk, celebrate] };
}
