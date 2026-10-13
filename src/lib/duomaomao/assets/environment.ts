import { BufferGeometry, Float32BufferAttribute, Shape, ShapeGeometry } from 'three';
import type { Group } from 'three';
import { ball, beam, box, colors as c, cone, cylinder, dome, gable, group, material,
	mesh, random, ring } from './model-kit.ts';
import type { Point } from './model-kit.ts';

export function cottage(variant: 'coral' | 'mint' | 'blue' = 'coral') {
	const root = group(`cottage_${variant}`);
	const roof = variant === 'coral' ? c.coral : variant === 'mint' ? c.teal : c.blue;
	box(root, [2.45, 0.23, 2.3], c.rock, [0, 0.12, 0]);
	box(root, [2.2, 1.85, 2], variant === 'blue' ? '#e6c58a' : c.cream, [0, 1.1, 0]);
	for (const x of [-1.09, 1.09]) box(root, [0.12, 1.9, 2.04], c.woodLight, [x, 1.13, 0]);
	gable(root, 2.75, 1.05, 2.55, roof, [0, 2.03, 0]);
	beam(root, [0, 3.13, -1.34], [0, 3.13, 1.34], 0.075, c.woodDark);
	for (const z of [-1.28, 1.28]) {
		beam(root, [-1.4, 2.05, z], [0, 3.15, z], 0.07, c.woodLight);
		beam(root, [0, 3.15, z], [1.4, 2.05, z], 0.07, c.woodLight);
	}
	box(root, [0.52, 0.92, 0.5], c.cream, [0.68, 2.7, -0.48]);
	box(root, [0.66, 0.14, 0.62], c.coralDark, [0.68, 3.18, -0.48]);
	box(root, [0.67, 1.25, 0.12], c.wood, [-0.47, 0.85, 1.05]);
	box(root, [0.85, 0.13, 0.25], c.woodLight, [-0.47, 1.51, 1.06]);
	ball(root, 0.05, c.mustard, [-0.27, 0.87, 1.15]);
	box(root, [0.95, 0.13, 0.5], c.sand, [-0.47, 0.13, 1.3]);
	for (const x of [0.63]) windowFrame(root, x, 1.3, 1.025);
	const sideWindow = group('side_window', [1.12, 1.28, -0.05]);
	sideWindow.rotation.y = Math.PI / 2;
	windowFrame(sideWindow, 0, 0, 0);
	root.add(sideWindow);
	const attic = ring(root, 0.24, 0.055, c.cream, [0, 2.42, 1.29]);
	attic.name = 'attic_window';
	const pane = cylinder(root, 0.2, 0.2, 0.035, c.teal, [0, 2.42, 1.29]);
	pane.rotation.x = Math.PI / 2;
	box(root, [0.75, 0.18, 0.3], c.woodLight, [0.63, 0.88, 1.2]);
	for (let i = 0; i < 4; i++) {
		ball(root, 0.15, c.leafDark, [0.39 + i * 0.16, 1.02, 1.18]);
		ball(root, 0.07, i % 2 ? c.mustard : c.coral, [0.39 + i * 0.16, 1.15, 1.2]);
	}
	return root;
}

function windowFrame(root: Group, x: number, y: number, z: number) {
	box(root, [0.61, 0.66, 0.07], c.wood, [x, y, z]);
	box(root, [0.47, 0.52, 0.09], '#b7d5cf', [x, y, z + 0.025]);
	box(root, [0.055, 0.56, 0.12], c.cream, [x, y, z + 0.07]);
	box(root, [0.53, 0.055, 0.12], c.cream, [x, y, z + 0.07]);
}

export function tree(kind: 'oak' | 'pine' | 'fruit' = 'oak') {
	const root = group(`tree_${kind}`);
	const height = kind === 'pine' ? 3.6 : 2.7;
	cylinder(root, 0.15, 0.23, height * 0.65, c.wood, [0, height * 0.325, 0], 7);
	if (kind === 'pine') {
		for (let i = 0; i < 3; i++) cone(root, 1.05 - i * 0.23, 1.55, [c.leafDark, c.leaf, c.leafLight][i], [0, 1.65 + i * 0.7, 0]);
	} else {
		beam(root, [0, 0.8, 0], [-0.6, 1.8, 0], 0.11, c.wood);
		beam(root, [0, 1.2, 0], [0.5, 2.2, -0.35], 0.1, c.wood);
		ball(root, 0.9, c.leaf, [-0.53, 2.03, 0.05], [1, 0.95, 1]);
		ball(root, 0.99, c.leafLight, [0.32, 2.5, 0], [1, 1.05, 0.92]);
		ball(root, 0.72, c.leafDark, [0.67, 1.98, -0.35]);
		if (kind === 'fruit') for (const p of [[-0.9, 2.2, 0.58], [0.5, 2.7, 0.75], [0.9, 2.02, 0.13], [0.18, 3.11, 0.2]] as Point[]) ball(root, 0.14, c.coral, p);
	}
	return root;
}

export function bush(tall = false) {
	const root = group(tall ? 'hedge' : 'bush');
	for (let i = 0; i < 3; i++) ball(root, tall ? 0.72 : 0.5, i % 2 ? c.leafLight : c.leaf,
		[(i - 1) * 0.6, tall ? 0.69 : 0.4, 0], [0.8, tall ? 1.13 : 0.9, 0.9]);
	return root;
}

export function treehouse() {
	const root = group('treehouse');
	cylinder(root, 0.45, 0.7, 4.3, c.wood, [0, 2.15, -0.35], 9);
	for (const [x, z] of [[-1.2, 0.25], [0.9, 0.4], [0.6, -1.1]]) beam(root, [0, 0.5, -0.35], [x, 0.08, z], 0.16, c.wood);
	beam(root, [0, 2.8, -0.3], [-1.45, 4.1, -0.3], 0.25, c.wood);
	beam(root, [0.1, 3.1, -0.3], [1.3, 4.5, -0.5], 0.22, c.wood);
	ball(root, 1.5, c.leaf, [-1.1, 4.7, -0.5], [1.13, 0.75, 1.05]);
	ball(root, 1.4, c.leafLight, [0.1, 5.45, -0.55], [1.2, 0.78, 1.1]);
	ball(root, 1.25, c.leafDark, [1.35, 4.9, -0.6], [1.1, 0.8, 0.95]);
	cylinder(root, 1.45, 1.45, 0.2, c.woodLight, [0, 2.05, 0.5], 14);
	box(root, [1.6, 1.4, 1.3], '#e4b18b', [0, 2.85, 0.65]);
	gable(root, 2.08, 0.72, 1.75, c.teal, [0, 3.56, 0.65]);
	windowFrame(root, 0, 3, 1.34);
	for (const x of [-0.9, 0.9]) {
		beam(root, [x, 0.12, 2.05], [x, 2.14, 1.15], 0.07, c.woodLight);
	}
	for (let i = 0; i < 8; i++) beam(root, [-0.9, 0.22 + i * 0.26, 2 - i * 0.115], [0.9, 0.22 + i * 0.26, 2 - i * 0.115], 0.055, c.woodLight);
	for (const x of [-1.2, 1.2]) {
		beam(root, [x, 2.1, 0.35], [x, 2.7, 0.35], 0.06, c.wood);
		beam(root, [x, 2.1, 1], [x, 2.7, 1], 0.06, c.wood);
		beam(root, [x, 2.65, 0.25], [x, 2.65, 1.12], 0.055, c.wood);
	}
	return root;
}

export function windmill() {
	const root = group('windmill');
	cylinder(root, 0.61, 0.96, 3.3, c.cream, [0, 1.65, 0], 12);
	cone(root, 0.95, 1.05, c.coral, [0, 3.65, 0]);
	box(root, [0.48, 0.88, 0.12], c.wood, [0, 0.52, 0.87]);
	const sails = group('windmill_sails', [0, 2.8, 0.87]);
	sails.userData.animated = 'spin';
	for (let i = 0; i < 4; i++) {
		const arm = group(`sail_${i}`);
		arm.rotation.z = i * Math.PI / 2 + 0.3;
		box(arm, [0.1, 2.02, 0.09], c.woodDark, [0, 0.98, 0]);
		box(arm, [0.52, 1.28, 0.06], c.cream, [0.2, 1.25, 0.02]);
		for (let j = 0; j < 4; j++) box(arm, [0.57, 0.045, 0.08], c.woodLight, [0.2, 0.7 + j * 0.35, 0.06]);
		sails.add(arm);
	}
	ball(sails, 0.2, c.mustard, [0, 0, 0.12]);
	root.add(sails);
	return root;
}

export function market() {
	const root = group('market_stall');
	for (const x of [-1.2, 1.2]) for (const z of [-0.65, 0.65]) cylinder(root, 0.06, 0.06, 2.35, c.wood, [x, 1.175, z], 7);
	box(root, [2.65, 0.14, 1.6], c.woodLight, [0, 0.95, 0]);
	box(root, [2.46, 0.6, 0.12], c.wood, [0, 0.6, 0.68]);
	for (let i = 0; i < 9; i++) {
		const x = -1.32 + i * 0.33;
		const strip = box(root, [0.332, 0.075, 2.1], i % 2 ? c.cream : c.coral, [x, 2.26, 0.02]);
		strip.rotation.x = 0.16;
		box(root, [0.33, 0.25, 0.08], i % 2 ? c.cream : c.coral, [x, 1.99, 1.05]);
	}
	for (let i = 0; i < 3; i++) {
		box(root, [0.65, 0.14, 0.78], c.woodDark, [-0.83 + i * 0.83, 1.05, 0]);
		for (let j = 0; j < 6; j++) ball(root, 0.13, [c.coral, c.mustard, c.leafLight][i], [-1.01 + i * 0.83 + (j % 2) * 0.28, 1.2, -0.25 + Math.floor(j / 2) * 0.25]);
	}
	return root;
}

export function crate() {
	const root = group('wooden_crate');
	box(root, [0.84, 0.8, 0.84], c.wood, [0, 0.4, 0]);
	for (const y of [0.12, 0.4, 0.68]) {
		for (const z of [-0.43, 0.43]) box(root, [0.89, 0.18, 0.05], c.woodLight, [0, y, z]);
		for (const x of [-0.43, 0.43]) box(root, [0.05, 0.18, 0.89], c.woodLight, [x, y, 0]);
	}
	for (const z of [-0.465, 0.465]) { const brace = box(root, [1.02, 0.07, 0.055], c.sand, [0, 0.4, z]); brace.rotation.z = 0.66; }
	return root;
}

export function barrel() {
	const root = group('barrel');
	cylinder(root, 0.4, 0.4, 0.85, c.woodLight, [0, 0.44, 0], 12);
	for (const y of [0.16, 0.71]) cylinder(root, 0.424, 0.424, 0.075, c.woodDark, [0, y, 0], 12);
	for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; beam(root, [Math.cos(a) * 0.401, 0.08, Math.sin(a) * 0.401], [Math.cos(a) * 0.401, 0.8, Math.sin(a) * 0.401], 0.014, c.wood); }
	return root;
}

export function bench() {
	const root = group('bench');
	for (const x of [-0.72, 0.72]) for (const z of [-0.22, 0.22]) box(root, [0.11, 0.52, 0.11], c.teal, [x, 0.26, z]);
	for (let i = 0; i < 3; i++) box(root, [1.9, 0.11, 0.17], c.woodLight, [0, 0.56, -0.2 + i * 0.2]);
	for (const x of [-0.72, 0.72]) box(root, [0.09, 0.57, 0.09], c.teal, [x, 0.9, -0.29]);
	for (const y of [0.88, 1.1]) box(root, [1.9, 0.15, 0.1], c.woodLight, [0, y, -0.29]);
	return root;
}

export function fence() {
	const root = group('fence');
	for (const x of [-1.05, 1.05]) { box(root, [0.13, 0.95, 0.13], c.cream, [x, 0.48, 0]); cone(root, 0.115, 0.16, c.cream, [x, 1.01, 0]); }
	for (const y of [0.35, 0.73]) box(root, [2.15, 0.13, 0.09], c.cream, [0, y, 0]);
	return root;
}

export function lamp() {
	const root = group('garden_lamp');
	cylinder(root, 0.055, 0.085, 2, c.teal, [0, 1, 0], 8);
	cylinder(root, 0.18, 0.23, 0.14, c.teal, [0, 0.07, 0]);
	const glow = material('#ffdda3', 'lantern_glow');
	glow.emissive.set('#edb764');
	glow.emissiveIntensity = 0.35;
	const light = box(root, [0.33, 0.43, 0.33], '#ffdda3', [0, 2.05, 0]);
	light.material = glow;
	for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) box(root, [0.035, 0.46, 0.035], c.teal, [x, 2.05, z]);
	cone(root, 0.36, 0.27, c.teal, [0, 2.42, 0]);
	return root;
}

export function bridge() {
	const root = group('woodland_bridge');
	for (let i = 0; i < 23; i++) { const x = -2.475 + i * 0.225; box(root, [0.2, 0.12, 1.35], i % 2 ? c.woodLight : c.wood, [x, 0.08 + 0.57 * (1 - (x / 2.475) ** 2), 0]); }
	for (const z of [-0.68, 0.68]) {
		for (const x of [-2.4, -0.8, 0.8, 2.4]) cylinder(root, 0.065, 0.075, 0.9, c.woodDark, [x, 0.85, z], 8);
		for (let i = 0; i < 3; i++) beam(root, [-2.4 + i * 1.6, 1.23, z], [-0.8 + i * 1.6, 1.23, z], 0.05, c.woodLight);
	}
	return root;
}

export function flowers() {
	const root = group('flower_patch');
	const rng = random(81);
	for (let i = 0; i < 9; i++) {
		const x = (rng() - 0.5) * 1.45, z = (rng() - 0.5) * 0.85, y = 0.18 + rng() * 0.22;
		cylinder(root, 0.012, 0.016, y, c.leafDark, [x, y / 2, z], 5);
		for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; ball(root, 0.061, i % 3 === 0 ? c.coral : c.cream, [x + Math.cos(a) * 0.066, y, z + Math.sin(a) * 0.066], [1, 0.45, 1], 0); }
		ball(root, 0.034, c.mustard, [x, y + 0.02, z], [1, 0.55, 1], 0);
	}
	return root;
}

export function mushrooms() {
	const root = group('mushroom_patch');
	for (const [x, z, scale] of [[0, 0, 1], [0.43, 0.24, 0.68], [-0.25, 0.32, 0.48]]) {
		const shroom = group('mushroom', [x, 0, z]);
		shroom.scale.setScalar(scale);
		cylinder(shroom, 0.09, 0.14, 0.42, c.cream, [0, 0.21, 0], 7);
		dome(shroom, 0.36, c.coral, [0, 0.38, 0]);
		for (const p of [[0.15, 0.61, 0.12], [-0.13, 0.66, 0.04], [0, 0.7, -0.11]] as Point[]) ball(shroom, 0.045, c.cream, p, [1, 0.35, 1], 0);
		root.add(shroom);
	}
	return root;
}

export function signpost() {
	const root = group('signpost');
	cylinder(root, 0.065, 0.1, 1.55, c.wood, [0, 0.78, 0], 7);
	box(root, [1.05, 0.34, 0.14], c.mustard, [0, 1.28, 0]);
	const arrow = gable(root, 0.34, 0.27, 0.14, c.mustard, [0.52, 1.28, 0]);
	arrow.rotation.z = -Math.PI / 2;
	ball(root, 0.09, c.cream, [-0.08, 1.25, 0.087], [1.2, 1, 0.12]);
	for (const x of [-0.18, -0.04, 0.1]) ball(root, 0.045, c.cream, [x, 1.36, 0.087], [1, 1, 0.15]);
	return root;
}

export function rocks() {
	const root = group('rock_cluster');
	ball(root, 0.6, c.rock, [0, 0.31, 0], [1.2, 0.7, 0.9], 0);
	ball(root, 0.34, '#cbbca3', [0.53, 0.16, 0.2], [1, 0.72, 0.9], 0);
	ball(root, 0.24, '#aa9b85', [-0.4, 0.12, 0.26], [1, 0.72, 0.9], 0);
	return root;
}

export function island() {
	const root = group('meadow_island');
	cylinder(root, 10.65, 8.8, 1.75, c.rock, [0, -1.03, 0], 18);
	cylinder(root, 10.87, 10.65, 0.2, c.sand, [0, -0.15, 0], 64);
	const ground = cylinder(root, 10.65, 10.65, 0.1, material(c.grass, 'meadow_grass'), [0, -0.035, 0], 80, 'meadow');
	const uv = ground.geometry.getAttribute('uv');
	const position = ground.geometry.getAttribute('position');
	for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / 21.3 + 0.5, position.getZ(i) / 21.3 + 0.5);
	cylinder(root, 14.15, 13.6, 0.35, material(c.water, 'sea_water'), [0, -1.93, 0], 96);
	for (let i = 0; i < 12; i++) {
		const a = i / 12 * Math.PI * 2;
		const ripple = ring(root, 11.5 + (i % 3) * 0.72, 0.025, '#c6e4d8', [0, -1.73, 0], 0.14 + (i % 3) * 0.03);
		ripple.rotation.set(-Math.PI / 2, 0, a);
	}
	return root;
}

export function path(root: Group, points: [number, number][], width = 1.3) {
	const vertices: number[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		const [ax, az] = points[i], [bx, bz] = points[i + 1];
		const length = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / length * width / 2, nz = (bx - ax) / length * width / 2;
		vertices.push(ax + nx, 0.033, az + nz, bx + nx, 0.033, bz + nz, ax - nx, 0.033, az - nz,
			bx + nx, 0.033, bz + nz, bx - nx, 0.033, bz - nz, ax - nx, 0.033, az - nz);
		cylinder(root, width / 2, width / 2, 0.025, c.path, [ax, 0.027, az], 20);
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
	geometry.computeVertexNormals();
	mesh(root, geometry, c.path, [0, 0, 0], 'village_path');
}

export function pond() {
	const root = group('pond');
	const shape = new Shape();
	shape.absellipse(0, 0, 2.3, 1.6, 0, Math.PI * 2, false, 0);
	const water = mesh(root, new ShapeGeometry(shape, 40), material(c.water, 'pond_water'), [0, 0.05, 0]);
	water.rotation.x = -Math.PI / 2;
	for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; ball(root, 0.25, i % 2 ? c.sand : c.rock, [Math.cos(a) * 2.35, 0.1, Math.sin(a) * 1.65], [1.1, 0.65, 0.82], 0); }
	for (const [x, z] of [[-0.9, 0.6], [0.9, -0.75], [1.6, 0.3]]) {
		cylinder(root, 0.23, 0.23, 0.022, c.leafDark, [x, 0.075, z], 9);
		ball(root, 0.08, c.coral, [x, 0.13, z], [1, 0.8, 1], 0);
	}
	return root;
}

export function bunting(root: Group, from: Point, to: Point) {
	const count = 11;
	let previous = from;
	for (let i = 1; i <= count; i++) {
		const t = i / count;
		const current: Point = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * 0.5, from[2] + (to[2] - from[2]) * t];
		beam(root, previous, current, 0.018, c.woodDark);
		const flag = new BufferGeometry();
		flag.setAttribute('position', new Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.4, 0], 3));
		flag.computeVertexNormals();
		const surface = material([c.coral, c.mustard, c.teal, c.cream][i % 4], `flag_${i % 4}`);
		surface.side = 2;
		mesh(root, flag, surface, current, 'bunting_flag');
		previous = current;
	}
}
