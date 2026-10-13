import {
	BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, ConeGeometry,
	CylinderGeometry, ExtrudeGeometry, Group, IcosahedronGeometry, Mesh,
	MeshStandardMaterial, Shape, SphereGeometry, TorusGeometry, Vector3
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Object3D } from 'three';

export const colors = {
	cream: '#fff2d6', sand: '#e7c994', path: '#f1ddb4', wood: '#936047', woodLight: '#be8960',
	woodDark: '#62473b', coral: '#df8269', coralDark: '#b95648', mustard: '#e3b451',
	mint: '#79af94', teal: '#4b8584', blue: '#91b4c5', leaf: '#8da970', leafLight: '#b0c58a',
	leafDark: '#577d5b', grass: '#a7bd83', water: '#82c6c5', rock: '#bca991', ink: '#393e3b'
} as const;

export type Point = [number, number, number];
const materials = new Map<string, MeshStandardMaterial>();

export function material(color: string, name = color): MeshStandardMaterial {
	const key = `${name}:${color}`;
	if (!materials.has(key)) {
		const result = new MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, flatShading: true });
		result.name = name;
		materials.set(key, result);
	}
	return materials.get(key)!;
}

export function group(name: string, position: Point = [0, 0, 0]): Group {
	const result = new Group();
	result.name = name;
	result.position.set(...position);
	return result;
}

export function mesh(parent: Object3D, geometry: BufferGeometry, color: string | MeshStandardMaterial,
	position: Point = [0, 0, 0], name = 'piece'): Mesh {
	const result = new Mesh(geometry, typeof color === 'string' ? material(color) : color);
	result.name = name;
	result.position.set(...position);
	result.castShadow = true;
	result.receiveShadow = true;
	parent.add(result);
	return result;
}

export function box(parent: Object3D, size: Point, color: string, position: Point = [0, 0, 0], name = 'board') {
	return mesh(parent, new BoxGeometry(...size), color, position, name);
}

export function ball(parent: Object3D, radius: number, color: string, position: Point = [0, 0, 0],
	scale: Point = [1, 1, 1], detail = 1, name = 'soft_shape') {
	const result = mesh(parent, new IcosahedronGeometry(radius, detail), color, position, name);
	result.scale.set(...scale);
	return result;
}

export function cylinder(parent: Object3D, top: number, bottom: number, height: number,
	color: string | MeshStandardMaterial, position: Point = [0, 0, 0], segments = 10, name = 'post') {
	return mesh(parent, new CylinderGeometry(top, bottom, height, segments), color, position, name);
}

export function cone(parent: Object3D, radius: number, height: number, color: string, position: Point) {
	return mesh(parent, new ConeGeometry(radius, height, 9), color, position);
}

export function capsule(parent: Object3D, radius: number, length: number, color: string,
	position: Point, name = 'capsule') {
	return mesh(parent, new CapsuleGeometry(radius, length, 4, 10), color, position, name);
}

export function ring(parent: Object3D, radius: number, thickness: number, color: string,
	position: Point, arc = Math.PI * 2) {
	return mesh(parent, new TorusGeometry(radius, thickness, 5, 32, arc), color, position);
}

export function beam(parent: Object3D, from: Point, to: Point, radius: number, color: string) {
	const start = new Vector3(...from);
	const end = new Vector3(...to);
	const direction = end.clone().sub(start);
	const result = cylinder(parent, radius, radius, direction.length(), color,
		start.add(end).multiplyScalar(0.5).toArray() as Point, 7);
	result.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
	return result;
}

export function gable(parent: Object3D, width: number, height: number, depth: number,
	color: string, position: Point) {
	const shape = new Shape();
	shape.moveTo(-width / 2, 0);
	shape.lineTo(0, height);
	shape.lineTo(width / 2, 0);
	shape.closePath();
	const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
	geometry.translate(0, 0, -depth / 2);
	return mesh(parent, geometry, color, position, 'gable_roof');
}

export function dome(parent: Object3D, radius: number, color: string, position: Point) {
	return mesh(parent, new SphereGeometry(radius, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), color, position);
}

export function random(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

/** Bake stationary pieces by material while preserving explicitly animated subtrees. */
export function mergeStatic(root: Group) {
	root.updateMatrixWorld(true);
	const buckets = new Map<MeshStandardMaterial, BufferGeometry[]>();
	const moving: Object3D[] = [];
	const visit = (object: Object3D) => {
		if (object.userData.animated) {
			object.matrixWorld.decompose(object.position, object.quaternion, object.scale);
			moving.push(object);
			return;
		}
		if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
			const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
			geometry.applyMatrix4(object.matrixWorld);
			if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
			if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2));
			const parts = buckets.get(object.material) ?? [];
			parts.push(geometry);
			buckets.set(object.material, parts);
		}
		for (const child of object.children) visit(child);
	};
	for (const child of root.children) visit(child);
	root.clear();
	for (const [surface, pieces] of buckets) {
		const combined = mergeGeometries(pieces, false);
		if (!combined) throw new Error(`Could not merge ${surface.name}`);
		mesh(root, combined, surface, [0, 0, 0], `surface_${surface.name}`);
		for (const piece of pieces) piece.dispose();
	}
	if (moving.length) root.add(...moving);
	return root;
}
