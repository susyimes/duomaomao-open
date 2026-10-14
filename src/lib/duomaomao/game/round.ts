import { characters, type CharacterId } from '../assets/characters.ts';
import type { GameWorld, Point2 } from '../assets/collision.ts';
import { buildNavigation, type Navigation } from './navigation.ts';
import { clearSegment, distance, groundHeight, isWalkable, movePlayer } from './physics.ts';
import type { LocalizedMessage } from '../i18n.ts';

export const ROUND_SECONDS = 180;
export const HIDER_COUNT = 5;
export const CATCH_DISTANCE = 1.35;
export const WALK_SPEED = 2.55;
export const RUN_SPEED = 4.15;
export type Phase = 'lobby' | 'countdown' | 'playing' | 'paused' | 'won' | 'lost';
export type Hider = { id: CharacterId; position: Point2; spot: string; found: boolean; foundAt: number };
export type RoundEvent = { type: 'start' | 'search' | 'found' | 'hint' | 'won' | 'lost'; id?: CharacterId };
export type Input = { x: number; z: number; run: boolean };
export type RoundState = {
	phase: Phase; previousPhase: 'countdown' | 'playing'; seed: number; playerId: CharacterId;
	player: Point2; facing: number; moving: boolean; sprinting: boolean; stamina: number; exhausted: boolean;
	remaining: number; elapsed: number; countdown: number; hiders: Hider[]; hints: number; hintCooldown: number;
	hint: { position: Point2; label: string; until: number } | null;
	toast: LocalizedMessage & { until: number } | null; catchCooldown: number; pauseReason: 'manual' | 'focus';
};

export const hidingSpots = [
	{ x: -6.4, z: -3.7, label: '杏桃小屋后面' },
	{ x: -5.5, z: -6.35, label: '风车花园的背面' },
	{ x: -0.6, z: -5.35, label: '大树屋后面的树荫' },
	{ x: 4.6, z: -6.0, label: '薄荷小屋后面' },
	{ x: 7.75, z: 2.9, label: '东边树篱的外侧' },
	{ x: 2.05, z: 3.85, label: '果子摊旁边的木箱' },
	{ x: 4.3, z: 5.05, label: '果子摊后面' },
	{ x: -6.9, z: 3.55, label: '池塘西边的岸上' },
	{ x: -4.6, z: 1.3, label: '木桥北边的池畔' },
	{ x: -6.8, z: 6.55, label: '西南角的小石堆' },
	{ x: 3.65, z: 7.1, label: '入口右边的树丛' },
	{ x: -1.3, z: 2.05, label: '广场长椅旁边' },
	{ x: 7.7, z: -2.4, label: '蓝顶小屋旁边' },
	{ x: 0.95, z: -7.7, label: '小镇北边的草地' },
	{ x: -8.65, z: 1.85, label: '西边围栏后的草地' },
	{ x: 5.6, z: 6.75, label: '东南角的花园' },
	{ x: -3.4, z: -5.85, label: '风车与树屋之间' },
	{ x: 2.05, z: -4.3, label: '树屋东边的灌木后面' }
] as const;

function seededRandom(seed: number) {
	let value = seed >>> 0;
	return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function shuffle<T>(values: readonly T[], random: () => number) {
	const copy = [...values];
	for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
	return copy;
}

export class SinglePlayerRound {
	world: GameWorld;
	navigation: Navigation;
	state: RoundState;
	availableSpots: typeof hidingSpots[number][];
	private events: RoundEvent[] = [];
	private recoveryDelay = 0;

	constructor(world: GameWorld) {
		if (!isWalkable(world.spawn, world)) throw new Error('Player spawn is obstructed.');
		this.world = world;
		this.navigation = buildNavigation(world);
		this.availableSpots = hidingSpots.filter(point => isWalkable(point, world) && distance(point, world.spawn) > 3
			&& this.navigation.reachable.has(this.navigation.nearest(point)));
		if (this.availableSpots.length < HIDER_COUNT) throw new Error('Not enough reachable hiding places.');
		this.state = this.freshState('fox', 0);
	}

	private freshState(playerId: CharacterId, seed: number): RoundState {
		return { phase: 'lobby', previousPhase: 'playing', seed, playerId, player: { ...this.world.spawn }, facing: Math.PI,
			moving: false, sprinting: false, stamina: 100, exhausted: false, remaining: ROUND_SECONDS, elapsed: 0,
			countdown: 3, hiders: [], hints: 3, hintCooldown: 0, hint: null, toast: null, catchCooldown: 0, pauseReason: 'manual' };
	}

	selectPlayer(id: CharacterId) {
		if (this.state.phase === 'lobby' && characters.some(character => character.id === id)) this.state.playerId = id;
	}

	start(seed: number, playerId = this.state.playerId) {
		const random = seededRandom(seed);
		const spots: typeof hidingSpots[number][] = [];
		for (const point of shuffle(this.availableSpots, random)) {
			if (spots.every(other => distance(other, point) > 2.1)) spots.push(point);
			if (spots.length === HIDER_COUNT) break;
		}
		if (spots.length !== HIDER_COUNT) throw new Error('Hiding places are too crowded.');
		const friends = shuffle(characters.filter(character => character.id !== playerId), random).slice(0, HIDER_COUNT);
		this.state = this.freshState(playerId, seed);
		this.state.phase = 'countdown';
		this.state.hiders = friends.map((friend, index) => ({ id: friend.id, position: { x: spots[index].x, z: spots[index].z }, spot: spots[index].label, found: false, foundAt: -1 }));
		this.events = [];
		this.recoveryDelay = 0;
	}

	lobby() { const id = this.state.playerId; this.state = this.freshState(id, 0); this.events = []; }
	pause(reason: 'manual' | 'focus' = 'manual') {
		if (this.state.phase !== 'playing' && this.state.phase !== 'countdown') return;
		this.state.previousPhase = this.state.phase;
		this.state.phase = 'paused'; this.state.pauseReason = reason;
		this.state.moving = false; this.state.sprinting = false;
	}
	resume() { if (this.state.phase === 'paused') this.state.phase = this.state.previousPhase; }

	update(seconds: number, input: Input) {
		if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 1) return;
		const state = this.state;
		if (state.phase === 'countdown') {
			state.countdown = Math.max(0, state.countdown - seconds);
			if (state.countdown === 0) { state.phase = 'playing'; this.events.push({ type: 'start' }); }
			return;
		}
		if (state.phase !== 'playing') return;
		const dt = Math.min(seconds, state.remaining);
		state.elapsed += dt; state.remaining = Math.max(0, state.remaining - dt);
		state.hintCooldown = Math.max(0, state.hintCooldown - dt);
		state.catchCooldown = Math.max(0, state.catchCooldown - dt);
		if (state.hint && state.elapsed > state.hint.until) state.hint = null;
		if (state.toast && state.elapsed > state.toast.until) state.toast = null;
		const length = Math.hypot(input.x, input.z), validInput = Number.isFinite(length) && length > 0.01;
		if (state.stamina >= 25) state.exhausted = false;
		state.sprinting = validInput && input.run && !state.exhausted && state.stamina > 0;
		const speed = state.sprinting ? RUN_SPEED : WALK_SPEED;
		const before = state.player;
		if (validInput) state.player = movePlayer(state.player, { x: input.x / Math.max(1, length) * speed * dt, z: input.z / Math.max(1, length) * speed * dt }, this.world);
		state.moving = distance(before, state.player) > 0.001;
		if (state.moving) state.facing = Math.atan2(state.player.x - before.x, state.player.z - before.z);
		state.sprinting &&= state.moving;
		if (state.sprinting) { state.stamina = Math.max(0, state.stamina - dt * 24); this.recoveryDelay = 0.65; }
		else { this.recoveryDelay -= dt; if (this.recoveryDelay <= 0) state.stamina = Math.min(100, state.stamina + dt * 19); }
		if (state.stamina === 0) state.exhausted = true;
		if (state.remaining === 0) { state.phase = 'lost'; state.moving = false; state.sprinting = false; state.hint = null; this.events.push({ type: 'lost' }); }
	}

	isVisible(hider: Hider) { return !hider.found && distance(this.state.player, hider.position) <= 7.5 && clearSegment(this.state.player, hider.position, this.world); }
	catchable() {
		if (this.state.phase !== 'playing') return null;
		return this.state.hiders.filter(hider => this.isVisible(hider) && distance(this.state.player, hider.position) <= CATCH_DISTANCE
			&& Math.abs(groundHeight(this.state.player, this.world) - groundHeight(hider.position, this.world)) < 0.65)
			.sort((a, b) => distance(this.state.player, a.position) - distance(this.state.player, b.position))[0] ?? null;
	}

	catch() {
		if (this.state.phase !== 'playing' || this.state.catchCooldown > 0) return false;
		this.state.catchCooldown = 0.45;
		this.events.push({ type: 'search' });
		const target = this.catchable();
		if (!target) { this.message({ key: '再靠近一点，绕过遮挡物看看。' }); return false; }
		target.found = true; target.foundAt = this.state.elapsed;
		const name = characters.find(character => character.id === target.id)!.name;
		this.message({ key: 'foundToast', params: { name } });
		this.events.push({ type: 'found', id: target.id });
		if (this.state.hint && distance(this.state.hint.position, target.position) < 0.01) this.state.hint = null;
		if (this.state.hiders.every(hider => hider.found)) {
			this.state.phase = 'won'; this.state.moving = false; this.state.sprinting = false; this.state.hint = null;
			this.events.push({ type: 'won' });
		}
		return true;
	}

	hint() {
		if (this.state.phase !== 'playing' || this.state.hints === 0 || this.state.hintCooldown > 0) return false;
		const target = this.state.hiders.filter(hider => !hider.found).sort((a, b) => distance(this.state.player, a.position) - distance(this.state.player, b.position))[0];
		if (!target) return false;
		this.state.hints--; this.state.hintCooldown = 15;
		this.state.hint = { position: { ...target.position }, label: target.spot, until: this.state.elapsed + 7 };
		this.message({ key: 'hintToast', params: { spot: target.spot } }, 7);
		this.events.push({ type: 'hint' });
		return true;
	}

	private message(message: LocalizedMessage, duration = 3) { this.state.toast = { ...message, until: this.state.elapsed + duration }; }
	drainEvents() { const events = this.events; this.events = []; return events; }
}
