import { characters, type CharacterId } from '../assets/characters.ts';
import type { GameWorld, Point2 } from '../assets/collision.ts';
import { PlayerInput } from './input.ts';
import { SinglePlayerRound, ROUND_SECONDS, type Phase, type RoundState } from './round.ts';
import { createGameView } from './view.ts';

export type GameSnapshot = {
	ready: boolean; error: boolean; progress: number; phase: Phase; playerId: CharacterId;
	remaining: number; countdown: number; elapsed: number; stamina: number; exhausted: boolean;
	player: Point2; facing: number; cameraYaw: number; found: number; total: number;
	targets: { id: CharacterId; name: string; color: string; found: boolean }[];
	nearby: string | null; hints: number; hintCooldown: number; hint: RoundState['hint']; toast: string;
	muted: boolean; best: number | null; completions: number; world: GameWorld | null; pauseReason: 'manual' | 'focus';
	remainingPlaces: Point2[];
};

export const initialSnapshot: GameSnapshot = {
	ready: false, error: false, progress: 0, phase: 'lobby', playerId: 'fox', remaining: ROUND_SECONDS,
	countdown: 3, elapsed: 0, stamina: 100, exhausted: false, player: { x: 0, z: 8.2 }, facing: Math.PI,
	cameraYaw: 0, found: 0, total: 5, targets: [], nearby: null, hints: 3, hintCooldown: 0, hint: null,
	toast: '', muted: false, best: null, completions: 0, world: null, pauseReason: 'manual', remainingPlaces: []
};

type SavedProgress = { best: number | null; completions: number; muted: boolean };
const STORAGE_KEY = 'duomaomao.singleplayer.v1';

function readProgress(): SavedProgress {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
		return { best: Number.isFinite(saved.best) && saved.best > 0 && saved.best <= ROUND_SECONDS ? saved.best : null,
			completions: Number.isInteger(saved.completions) && saved.completions >= 0 ? saved.completions : 0, muted: saved.muted === true };
	} catch { return { best: null, completions: 0, muted: false }; }
}

export function createGameRuntime(host: HTMLDivElement, onSnapshot: (snapshot: GameSnapshot) => void) {
	let disposed = false, frame = 0, lastFrame = performance.now(), sincePublish = 0;
	let round: SinglePlayerRound | null = null, ready = false, error = false, progress = 0;
	let audio: HTMLAudioElement | null = null;
	const saved = readProgress();
	const view = createGameView(host, amount => { progress = amount; });
	const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { /* Playing does not require storage. */ } };
	const play = (name: string) => {
		if (saved.muted || disposed) return;
		audio?.pause(); audio = new Audio(`/assets/audio/${name}.wav`); audio.volume = 0.28;
		void audio.play().catch(() => { /* Browser audio policy must not interrupt gameplay. */ });
	};

	function publish() {
		if (disposed) return;
		const state = round?.state;
		const nearby = round?.catchable();
		onSnapshot({ ...initialSnapshot, ready, error, progress, muted: saved.muted, best: saved.best, completions: saved.completions,
			...(state ? { phase: state.phase, playerId: state.playerId, remaining: state.remaining, countdown: state.countdown,
				elapsed: state.elapsed, stamina: state.stamina, exhausted: state.exhausted, player: { ...state.player }, facing: state.facing,
				cameraYaw: input.yaw, found: state.hiders.filter(hider => hider.found).length, total: state.hiders.length || 5,
				targets: state.hiders.map(hider => { const definition = characters.find(character => character.id === hider.id)!;
					return { id: hider.id, name: definition.name, color: definition.color, found: hider.found }; }),
				nearby: nearby ? characters.find(character => character.id === nearby.id)!.name : null,
				hints: state.hints, hintCooldown: state.hintCooldown, hint: state.hint ? { ...state.hint, position: { ...state.hint.position } } : null,
				toast: state.toast?.text ?? '', world: round!.world, pauseReason: state.pauseReason,
				remainingPlaces: state.phase === 'lost' ? state.hiders.filter(hider => !hider.found).map(hider => ({ ...hider.position })) : [] } : {}) });
		host.dataset.phase = state?.phase ?? 'lobby'; host.dataset.ready = String(ready);
	}

	function flushEvents() {
		for (const event of round?.drainEvents() ?? []) {
			if (event.type === 'search') view.search();
			else if (event.type === 'found') play('found');
			else if (event.type === 'hint' || event.type === 'start') play('bell');
			else if (event.type === 'lost') { input.reset(); play('bell'); }
			else if (event.type === 'won') {
				input.reset(); play('win'); saved.completions++;
				const result = round!.state.elapsed;
				saved.best = saved.best === null ? result : Math.min(saved.best, result); save();
			}
		}
	}
	const catchFriend = () => { round?.catch(); flushEvents(); publish(); };
	const hint = () => { round?.hint(); flushEvents(); publish(); };
	const pause = () => { if (!round) return; input.reset(); round.state.phase === 'paused' ? round.resume() : round.pause(); publish(); };
	const mute = () => { saved.muted = !saved.muted; if (saved.muted) audio?.pause(); else play('tap'); save(); publish(); };
	const input = new PlayerInput(view.canvas, { active: () => round?.state.phase === 'playing', catch: catchFriend, hint, pause, mute,
		blur: () => { round?.pause('focus'); publish(); }, resetCamera: () => input.resetCamera() });

	const debugWindow = window as typeof window & { __duomaomaoDebug?: { read: () => RoundState | null } };
	const diagnostics = { read: () => round ? structuredClone(round.state) : null };
	// Read-only diagnostics; there are deliberately no teleport, timer, or win hooks.
	if (import.meta.env.DEV && new URLSearchParams(location.search).has('debug')) debugWindow.__duomaomaoDebug = diagnostics;

	void view.ready.then(world => {
		if (disposed || !world) return;
		round = new SinglePlayerRound(world); ready = true; publish();
	}).catch(reason => { if (!disposed) { console.error('Single-player game could not start', reason); error = true; publish(); } });

	const tick = () => {
		if (disposed) return;
		frame = requestAnimationFrame(tick);
		const now = performance.now(), realDelta = (now - lastFrame) / 1000; lastFrame = now;
		if (document.hidden) return;
		if (realDelta > 1) { input.reset(); round?.pause('focus'); }
		const dt = Math.min(realDelta, 0.1);
		if (round && realDelta <= 1) round.update(realDelta, round.state.phase === 'playing' ? input.read(realDelta) : { x: 0, z: 0, run: false });
		flushEvents(); view.render(round, input, dt);
		sincePublish += realDelta;
		if (sincePublish >= 0.075) { sincePublish = 0; publish(); }
	};
	tick(); publish();

	return {
		start() {
			if (!round || !ready) return;
			input.reset(); input.resetCamera();
			round.start(crypto.getRandomValues(new Uint32Array(1))[0]); play('ready'); publish();
			view.canvas.focus({ preventScroll: true });
		},
		selectPlayer(id: CharacterId) { round?.selectPlayer(id); play('tap'); publish(); },
		catchFriend, hint, pause, mute,
		resume() { input.reset(); round?.resume(); view.canvas.focus({ preventScroll: true }); publish(); },
		lobby() { input.reset(); round?.lobby(); audio?.pause(); publish(); },
		stick(x: number, y: number) { input.setStick(x, y); },
		resetCamera() { input.resetCamera(); },
		destroy() {
			disposed = true; cancelAnimationFrame(frame); input.destroy(); audio?.pause(); view.destroy();
			if (debugWindow.__duomaomaoDebug === diagnostics) delete debugWindow.__duomaomaoDebug;
		}
	};
}

export type GameRuntime = ReturnType<typeof createGameRuntime>;
