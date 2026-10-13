import type { GameWorld, Point2, Solid } from '../assets/collision.ts';

export const PLAYER_RADIUS = 0.27;
export const distance = (a: Point2, b: Point2) => Math.hypot(a.x - b.x, a.z - b.z);
export const localPoint = (point: Point2, frame: Point2 & { yaw: number }): Point2 => {
	const dx = point.x - frame.x, dz = point.z - frame.z, c = Math.cos(frame.yaw), s = Math.sin(frame.yaw);
	return { x: dx * c - dz * s, z: dx * s + dz * c };
};
const toWorld = (point: Point2, frame: Point2 & { yaw: number }): Point2 => ({
	x: frame.x + point.x * Math.cos(frame.yaw) + point.z * Math.sin(frame.yaw),
	z: frame.z - point.x * Math.sin(frame.yaw) + point.z * Math.cos(frame.yaw)
});
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function overlaps(point: Point2, solid: Solid, radius = PLAYER_RADIUS) {
	if (solid.kind === 'circle') return distance(point, solid) < solid.radius + radius - 1e-6;
	const p = localPoint(point, solid);
	const dx = p.x - clamp(p.x, -solid.halfX, solid.halfX), dz = p.z - clamp(p.z, -solid.halfZ, solid.halfZ);
	return dx * dx + dz * dz < radius * radius - 1e-7;
}

export function onBridge(point: Point2, world: GameWorld, radius = PLAYER_RADIUS) {
	const p = localPoint(point, world.bridge);
	return Math.abs(p.x) <= world.bridge.halfLength + 0.1 && Math.abs(p.z) <= world.bridge.halfWidth - radius;
}

export function inWater(point: Point2, world: GameWorld, radius = PLAYER_RADIUS) {
	const x = (point.x - world.pond.x) / (world.pond.radiusX + radius);
	const z = (point.z - world.pond.z) / (world.pond.radiusZ + radius);
	return x * x + z * z < 1 && !onBridge(point, world, radius);
}

export function isWalkable(point: Point2, world: GameWorld, radius = PLAYER_RADIUS) {
	return Number.isFinite(point.x) && Number.isFinite(point.z) && Math.hypot(point.x, point.z) <= world.radius - radius + 1e-6
		&& !inWater(point, world, radius) && !world.solids.some(solid => overlaps(point, solid, radius));
}

function pushOut(point: Point2, solid: Solid, radius: number): Point2 {
	if (!overlaps(point, solid, radius)) return point;
	if (solid.kind === 'circle') {
		const dx = point.x - solid.x, dz = point.z - solid.z, length = Math.hypot(dx, dz);
		const r = solid.radius + radius + 0.0001;
		return length > 1e-8 ? { x: solid.x + dx / length * r, z: solid.z + dz / length * r } : { x: solid.x + r, z: solid.z };
	}
	const p = localPoint(point, solid), nearX = clamp(p.x, -solid.halfX, solid.halfX), nearZ = clamp(p.z, -solid.halfZ, solid.halfZ);
	const dx = p.x - nearX, dz = p.z - nearZ, length = Math.hypot(dx, dz);
	if (length > 1e-8) return toWorld({ x: nearX + dx / length * (radius + 0.0001), z: nearZ + dz / length * (radius + 0.0001) }, solid);
	const exitX = solid.halfX - Math.abs(p.x), exitZ = solid.halfZ - Math.abs(p.z);
	if (exitX < exitZ) p.x = (p.x < 0 ? -1 : 1) * (solid.halfX + radius + 0.0001);
	else p.z = (p.z < 0 ? -1 : 1) * (solid.halfZ + radius + 0.0001);
	return toWorld(p, solid);
}

function resolveStep(from: Point2, wanted: Point2, world: GameWorld, radius: number) {
	let point = wanted;
	for (let pass = 0; pass < 4; pass++) {
		for (const solid of world.solids) point = pushOut(point, solid, radius);
		const length = Math.hypot(point.x, point.z), limit = world.radius - radius;
		if (length > limit) point = { x: point.x / length * limit, z: point.z / length * limit };
	}
	return isWalkable(point, world, radius) ? point : from;
}

/** Short substeps stop high speeds and thin fences from tunnelling. */
export function movePlayer(from: Point2, delta: Point2, world: GameWorld, radius = PLAYER_RADIUS): Point2 {
	if (![delta.x, delta.z].every(Number.isFinite)) return { ...from };
	const length = Math.hypot(delta.x, delta.z), count = Math.max(1, Math.ceil(length / 0.07));
	if (count > 1000) return { ...from };
	let point = { ...from };
	for (let i = 0; i < count; i++) {
		const next = { x: point.x + delta.x / count, z: point.z + delta.z / count };
		let moved = resolveStep(point, next, world, radius);
		if (distance(moved, point) < 1e-8 && inWater(next, world, radius)) {
			const slideX = resolveStep(point, { x: next.x, z: point.z }, world, radius);
			const slideZ = resolveStep(point, { x: point.x, z: next.z }, world, radius);
			moved = distance(slideX, point) > distance(slideZ, point) ? slideX : slideZ;
		}
		point = moved;
	}
	return point;
}

export function groundHeight(point: Point2, world: GameWorld) {
	if (!onBridge(point, world, 0)) return 0.075;
	const x = Math.abs(localPoint(point, world.bridge).x);
	if (x > 2.57) return 0.075;
	return 0.17 + 0.57 * Math.max(0, 1 - (x / 2.475) ** 2);
}

export function clearSegment(from: Point2, to: Point2, world: GameWorld) {
	for (const solid of world.solids) {
		if (solid.kind === 'circle') {
			const dx = to.x - from.x, dz = to.z - from.z, length2 = dx * dx + dz * dz;
			const t = length2 > 0 ? clamp(((solid.x - from.x) * dx + (solid.z - from.z) * dz) / length2, 0, 1) : 0;
			if (Math.hypot(from.x + dx * t - solid.x, from.z + dz * t - solid.z) < solid.radius) return false;
		} else {
			const a = localPoint(from, solid), b = localPoint(to, solid);
			let enter = 0, exit = 1, misses = false;
			for (const [start, end, half] of [[a.x, b.x, solid.halfX], [a.z, b.z, solid.halfZ]]) {
				const d = end - start;
				if (Math.abs(d) < 1e-10) { if (Math.abs(start) > half) misses = true; }
				else { const t1 = (-half - start) / d, t2 = (half - start) / d; enter = Math.max(enter, Math.min(t1, t2)); exit = Math.min(exit, Math.max(t1, t2)); }
			}
			if (!misses && enter <= exit && exit >= 0 && enter <= 1) return false;
		}
	}
	return true;
}

export function walkableSegment(from: Point2, to: Point2, world: GameWorld) {
	const steps = Math.max(1, Math.ceil(distance(from, to) / 0.08));
	for (let i = 0; i <= steps; i++) if (!isWalkable({ x: from.x + (to.x - from.x) * i / steps, z: from.z + (to.z - from.z) * i / steps }, world)) return false;
	return true;
}
