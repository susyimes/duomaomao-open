import type { Input } from './round.ts';

type Commands = { active: () => boolean; catch: () => void; hint: () => void; pause: () => void; blur: () => void; resetCamera: () => void; mute: () => void };
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyR']);

export class PlayerInput {
	yaw = 0;
	pitch = 0.86;
	distance = 11.8;
	private keys = new Set<string>();
	private stick = { x: 0, y: 0 };
	private pointer: { id: number; x: number; y: number } | null = null;
	private cleanups: (() => void)[] = [];

	constructor(canvas: HTMLCanvasElement, commands: Commands) {
		const keydown = (event: KeyboardEvent) => {
			if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
			if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) commands.pause(); return; }
			if (event.code === 'KeyM') { if (!event.repeat) commands.mute(); return; }
			if (!commands.active()) return;
			if (movementKeys.has(event.code)) { event.preventDefault(); this.keys.add(event.code); }
			if (['KeyE', 'Space', 'KeyH', 'KeyC'].includes(event.code)) {
				event.preventDefault();
				if (event.repeat) return;
				if (event.code === 'KeyE' || event.code === 'Space') commands.catch();
				else if (event.code === 'KeyH') commands.hint();
				else commands.resetCamera();
			}
		};
		const keyup = (event: KeyboardEvent) => { this.keys.delete(event.code); };
		const blur = () => { this.reset(); commands.blur(); };
		const visibility = () => { if (document.hidden) blur(); };
		const down = (event: PointerEvent) => {
			if (this.pointer || !commands.active()) return;
			this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
			canvas.setPointerCapture(event.pointerId);
		};
		const move = (event: PointerEvent) => {
			if (!this.pointer || this.pointer.id !== event.pointerId) return;
			this.yaw -= (event.clientX - this.pointer.x) * 0.007;
			this.pitch = Math.max(0.55, Math.min(1.1, this.pitch + (event.clientY - this.pointer.y) * 0.004));
			this.pointer.x = event.clientX; this.pointer.y = event.clientY;
		};
		const up = (event: PointerEvent) => { if (this.pointer?.id === event.pointerId) this.pointer = null; };
		const wheel = (event: WheelEvent) => {
			if (!commands.active()) return;
			event.preventDefault(); this.distance = Math.max(8, Math.min(16, this.distance + event.deltaY * 0.009));
		};
		const contextMenu = (event: MouseEvent) => event.preventDefault();
		window.addEventListener('keydown', keydown);
		window.addEventListener('keyup', keyup);
		window.addEventListener('blur', blur);
		document.addEventListener('visibilitychange', visibility);
		canvas.addEventListener('pointerdown', down);
		canvas.addEventListener('pointermove', move);
		canvas.addEventListener('pointerup', up);
		canvas.addEventListener('pointercancel', up);
		canvas.addEventListener('lostpointercapture', up);
		canvas.addEventListener('wheel', wheel, { passive: false });
		canvas.addEventListener('contextmenu', contextMenu);
		this.cleanups.push(() => {
			window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
			window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
			canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
			canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
			canvas.removeEventListener('lostpointercapture', up); canvas.removeEventListener('wheel', wheel);
			canvas.removeEventListener('contextmenu', contextMenu);
		});
	}

	setStick(x: number, y: number) { this.stick = { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 }; }
	read(dt: number): Input {
		const key = (code: string) => this.keys.has(code) ? 1 : 0;
		this.yaw += (key('KeyR') - key('KeyQ')) * dt * 1.5;
		const right = key('KeyD') + key('ArrowRight') - key('KeyA') - key('ArrowLeft') + this.stick.x;
		const forward = key('KeyW') + key('ArrowUp') - key('KeyS') - key('ArrowDown') - this.stick.y;
		return { x: right * Math.cos(this.yaw) - forward * Math.sin(this.yaw), z: -right * Math.sin(this.yaw) - forward * Math.cos(this.yaw),
			run: !!(key('ShiftLeft') || key('ShiftRight')) || Math.hypot(this.stick.x, this.stick.y) > 0.86 };
	}
	reset() { this.keys.clear(); this.stick = { x: 0, y: 0 }; this.pointer = null; }
	resetCamera() { this.yaw = 0; this.pitch = 0.86; this.distance = 11.8; }
	destroy() { this.reset(); for (const cleanup of this.cleanups) cleanup(); }
}
