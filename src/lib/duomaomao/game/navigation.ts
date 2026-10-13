import type { GameWorld, Point2 } from '../assets/collision.ts';
import { distance, isWalkable, walkableSegment } from './physics.ts';

export type Navigation = { points: Point2[]; edges: number[][]; reachable: Set<number>; nearest: (point: Point2) => number };

export function buildNavigation(world: GameWorld, step = 0.32): Navigation {
	const points: Point2[] = [], edges: number[][] = [], cells = new Map<string, number>();
	const extent = Math.ceil(world.radius / step);
	for (let x = -extent; x <= extent; x++) for (let z = -extent; z <= extent; z++) {
		const point = { x: x * step, z: z * step };
		if (!isWalkable(point, world)) continue;
		cells.set(`${x},${z}`, points.length);
		points.push(point);
		edges.push([]);
	}
	for (const [key, index] of cells) {
		const [x, z] = key.split(',').map(Number);
		for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			const other = cells.get(`${x + dx},${z + dz}`);
			if (other !== undefined && walkableSegment(points[index], points[other], world)) edges[index].push(other);
		}
	}
	const nearest = (point: Point2) => {
		let best = -1, bestDistance = Infinity;
		for (let i = 0; i < points.length; i++) {
			const d = distance(point, points[i]);
			if (d < bestDistance && walkableSegment(point, points[i], world)) { best = i; bestDistance = d; }
		}
		return best;
	};
	const origin = nearest(world.spawn), reachable = new Set<number>();
	if (origin >= 0) {
		const queue = [origin]; reachable.add(origin);
		for (let cursor = 0; cursor < queue.length; cursor++) for (const node of edges[queue[cursor]]) {
			if (!reachable.has(node)) { reachable.add(node); queue.push(node); }
		}
	}
	return { points, edges, reachable, nearest };
}

/** Used for reachability validation and for input-driven end-to-end route planning. */
export function findPath(from: Point2, to: Point2, world: GameWorld, nav: Navigation): Point2[] {
	if (walkableSegment(from, to, world)) return [{ ...from }, { ...to }];
	const start = nav.nearest(from), end = nav.nearest(to);
	if (start < 0 || end < 0) return [];
	const previous = new Map<number, number>([[start, -1]]), queue = [start];
	for (let cursor = 0; cursor < queue.length && !previous.has(end); cursor++) {
		for (const next of nav.edges[queue[cursor]]) if (!previous.has(next)) { previous.set(next, queue[cursor]); queue.push(next); }
	}
	if (!previous.has(end)) return [];
	const raw: Point2[] = [{ ...to }];
	for (let node = end; node >= 0; node = previous.get(node) ?? -1) raw.unshift(nav.points[node]);
	raw.unshift({ ...from });
	const result = [raw[0]];
	for (let cursor = 0; cursor < raw.length - 1;) {
		let next = raw.length - 1;
		while (next > cursor + 1 && !walkableSegment(raw[cursor], raw[next], world)) next--;
		result.push(raw[next]); cursor = next;
	}
	return result;
}
