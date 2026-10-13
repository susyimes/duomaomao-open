import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { GameWorld, Point2, Solid } from '../assets/collision';
import { SinglePlayerRound, HIDER_COUNT, ROUND_SECONDS } from './round';
import { clearSegment, distance, groundHeight, inWater, isWalkable, movePlayer, PLAYER_RADIUS, walkableSegment } from './physics';
import { findPath } from './navigation';

const world = JSON.parse(readFileSync(new URL('../../../../public/assets/world.json', import.meta.url), 'utf8')) as GameWorld;
const round = new SinglePlayerRound(world);
const idle = { x: 0, z: 0, run: false };
const play = (seed = 260907) => { round.start(seed); for (let i = 0; i < 12; i++) round.update(0.25, idle); return round; };
const emptyWorld = (): GameWorld => ({ ...world, solids: [], pond: { x: 40, z: 40, radiusX: 1, radiusZ: 1 }, bridge: { ...world.bridge, x: 40, z: 40 } });
const fence: Solid = { id: 'test-fence', kind: 'box', x: 0, z: 0, yaw: 0, radius: 0, halfX: 4, halfZ: 0.08, height: 1 };

describe('real map and movement', () => {
	it('has a clear spawn and only reachable hiding places across varied seeds', () => {
		expect(isWalkable(world.spawn, world)).toBe(true);
		expect(round.availableSpots.length).toBeGreaterThanOrEqual(10);
		for (let seed = 0; seed < 100; seed++) {
			round.start(seed, 'rabbit');
			expect(round.state.hiders).toHaveLength(HIDER_COUNT);
			expect(new Set(round.state.hiders.map(target => target.id)).size).toBe(HIDER_COUNT);
			for (const target of round.state.hiders) {
				expect(target.id).not.toBe('rabbit');
				expect(isWalkable(target.position, world)).toBe(true);
				expect(round.navigation.reachable.has(round.navigation.nearest(target.position))).toBe(true);
			}
		}
	});
	it('replays a seed and changes hiding arrangements for another seed', () => {
		round.start(12); const first = structuredClone(round.state.hiders);
		round.start(12); expect(round.state.hiders).toEqual(first);
		round.start(13); expect(round.state.hiders).not.toEqual(first);
	});
	it('plans traversable routes through the actual level', () => {
		for (const spot of round.availableSpots) {
			const path = findPath(world.spawn, spot, world, round.navigation);
			expect(path.length).toBeGreaterThan(1);
			for (let i = 1; i < path.length; i++) expect(walkableSegment(path[i - 1], path[i], world)).toBe(true);
		}
	});
	it('stops fast movement at a thin fence and slides along it', () => {
		const testWorld = { ...emptyWorld(), solids: [fence] };
		const blocked = movePlayer({ x: 0, z: 3 }, { x: 0, z: -7 }, testWorld);
		expect(blocked.z).toBeGreaterThanOrEqual(fence.halfZ + PLAYER_RADIUS - 0.001);
		const slid = movePlayer({ x: 0, z: 2 }, { x: 2, z: -4 }, testWorld);
		expect(slid.x).toBeGreaterThan(1.8);
		expect(slid.z).toBeGreaterThan(0.34);
	});
	it('blocks the pond but allows crossing the rotated bridge at deck height', () => {
		const testWorld = { ...world, solids: [] };
		const blocked = movePlayer({ x: world.pond.x, z: world.pond.z + 3 }, { x: 0, z: -2.7 }, testWorld);
		expect(inWater(blocked, testWorld)).toBe(false);
		expect(blocked.z).toBeGreaterThan(world.pond.z + world.pond.radiusZ);
		const c = Math.cos(world.bridge.yaw), s = Math.sin(world.bridge.yaw);
		const start = { x: world.bridge.x - 3 * c, z: world.bridge.z + 3 * s };
		const crossed = movePlayer(start, { x: 6 * c, z: -6 * s }, testWorld);
		expect(distance(crossed, { x: world.bridge.x + 3 * c, z: world.bridge.z - 3 * s })).toBeLessThan(0.02);
		expect(groundHeight(world.bridge, world)).toBeGreaterThan(0.7);
	});
	it('keeps the avatar on the island and rejects invalid movement', () => {
		const testWorld = emptyWorld();
		const edge = movePlayer({ x: 0, z: 8 }, { x: 0, z: 8 }, testWorld);
		expect(Math.hypot(edge.x, edge.z)).toBeLessThanOrEqual(world.radius - PLAYER_RADIUS + 1e-6);
		expect(movePlayer(edge, { x: NaN, z: 1 }, testWorld)).toEqual(edge);
	});
	it('uses rotated footprints for line of sight', () => {
		const wall = { ...fence, yaw: Math.PI / 4 };
		expect(clearSegment({ x: -1, z: -1 }, { x: 1, z: 1 }, { ...emptyWorld(), solids: [wall] })).toBe(false);
		expect(clearSegment({ x: -5, z: -5 }, { x: -4, z: -4 }, { ...emptyWorld(), solids: [wall] })).toBe(true);
	});
});

describe('single-player round rules', () => {
	it('locks movement and abilities during the countdown', () => {
		round.start(3); const before = { ...round.state.player };
		round.update(1, { x: 1, z: 0, run: true });
		expect(round.state.phase).toBe('countdown');
		expect(round.state.player).toEqual(before);
		expect(round.state.remaining).toBe(ROUND_SECONDS);
		expect(round.catch()).toBe(false); expect(round.hint()).toBe(false);
	});
	it('normalizes diagonal movement and spends sprint stamina only while moving', () => {
		const game = play(); game.state.player = { x: 0, z: 7.5 };
		const before = { ...game.state.player };
		game.update(0.1, { x: -1, z: -1, run: false });
		expect(distance(before, game.state.player)).toBeCloseTo(0.255, 3);
		const stamina = game.state.stamina;
		game.update(0.1, { x: 0, z: -1, run: true });
		expect(game.state.stamina).toBeLessThan(stamina);
		for (let i = 0; i < 20; i++) game.update(0.1, idle);
		expect(game.state.stamina).toBe(100);
	});
	it('cannot capture at a distance or through a wall', () => {
		play(); const originalWorld = round.world;
		round.world = { ...emptyWorld(), solids: [fence] };
		try {
			const target = round.state.hiders[0]; target.position = { x: 0, z: -0.5 };
			round.state.player = { x: 0, z: 0.5 };
			expect(round.catchable()).toBeNull(); expect(round.catch()).toBe(false);
			round.update(0.5, idle); round.state.player = { x: 0, z: -3 };
			expect(round.catch()).toBe(false);
			round.update(0.5, idle); round.state.player = { x: 0, z: -1 };
			expect(round.catch()).toBe(true); expect(target.found).toBe(true);
			round.update(0.5, idle); expect(round.catch()).toBe(false);
		} finally { round.world = originalWorld; }
	});
	it('limits hints, respects cooldown, and expires the marker', () => {
		play(); expect(round.hint()).toBe(true); expect(round.state.hints).toBe(2);
		expect(round.hint()).toBe(false);
		for (let i = 0; i < 16; i++) round.update(1, idle);
		expect(round.state.hint).toBeNull(); expect(round.hint()).toBe(true);
		for (let i = 0; i < 16; i++) round.update(1, idle);
		expect(round.hint()).toBe(true); expect(round.state.hints).toBe(0);
		for (let i = 0; i < 16; i++) round.update(1, idle);
		expect(round.hint()).toBe(false);
	});
	it('freezes movement, timer and abilities while paused, then resumes the prior phase', () => {
		play(); round.hint(); round.pause('focus');
		const before = structuredClone(round.state);
		for (let i = 0; i < 20; i++) round.update(1, { x: 1, z: 1, run: true });
		expect(round.state).toEqual(before); expect(round.catch()).toBe(false); expect(round.hint()).toBe(false);
		round.resume(); expect(round.state.phase).toBe('playing');
		round.start(3); round.update(1, idle); round.pause(); round.resume();
		expect(round.state.phase).toBe('countdown'); expect(round.state.countdown).toBe(2);
	});
	it('wins once the actual five targets are caught and stays finished', () => {
		play();
		for (const target of round.state.hiders) {
			round.state.player = { ...target.position }; round.update(0.5, idle);
			expect(round.catch()).toBe(true);
		}
		expect(round.state.phase).toBe('won'); expect(round.state.hiders.filter(target => target.found)).toHaveLength(HIDER_COUNT);
		const remaining = round.state.remaining; round.update(1, idle);
		expect(round.state.remaining).toBe(remaining); expect(round.catch()).toBe(false);
		expect(round.drainEvents().filter(event => event.type === 'won')).toHaveLength(1);
	});
	it('loses at the deadline and a new round resets every consumable', () => {
		play(); round.hint();
		for (let i = 0; i < ROUND_SECONDS; i++) round.update(1, idle);
		expect(round.state.phase).toBe('lost'); expect(round.state.remaining).toBe(0); expect(round.catch()).toBe(false);
		round.start(5); expect(round.state.phase).toBe('countdown'); expect(round.state.remaining).toBe(ROUND_SECONDS);
		expect(round.state.hints).toBe(3); expect(round.state.hint).toBeNull(); expect(round.state.hintCooldown).toBe(0);
		expect(round.state.player).toEqual(world.spawn); expect(round.state.hiders.every(target => !target.found)).toBe(true);
	});
});
