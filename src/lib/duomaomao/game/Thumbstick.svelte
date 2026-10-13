<script lang="ts">
	let { onMove }: { onMove: (x: number, y: number) => void } = $props();
	let knob = $state({ x: 0, y: 0 });
	let held = $state(false);
	function attach(element: HTMLDivElement) {
		let pointer: number | null = null;
		const update = (event: PointerEvent) => {
			const bounds = element.getBoundingClientRect(), limit = bounds.width * 0.31;
			const x = event.clientX - bounds.left - bounds.width / 2, y = event.clientY - bounds.top - bounds.height / 2;
			const length = Math.hypot(x, y), scale = length > limit ? limit / length : 1;
			knob = { x: x * scale, y: y * scale }; onMove(knob.x / limit, knob.y / limit);
		};
		const down = (event: PointerEvent) => {
			if (pointer !== null) return;
			pointer = event.pointerId; held = true; element.setPointerCapture(pointer); event.preventDefault(); update(event);
		};
		const move = (event: PointerEvent) => { if (event.pointerId === pointer) { event.preventDefault(); update(event); } };
		const up = (event: PointerEvent) => { if (event.pointerId === pointer) { pointer = null; held = false; knob = { x: 0, y: 0 }; onMove(0, 0); } };
		element.addEventListener('pointerdown', down); element.addEventListener('pointermove', move);
		element.addEventListener('pointerup', up); element.addEventListener('pointercancel', up); element.addEventListener('lostpointercapture', up);
		return () => {
			element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move);
			element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up); element.removeEventListener('lostpointercapture', up);
			onMove(0, 0);
		};
	}
</script>

<div class="stick-wrap"><div class="stick" class:held role="group" aria-label="移动摇杆" {@attach attach}><span class="cross horizontal"></span><span class="cross vertical"></span><span class="knob" style:transform={`translate(${knob.x}px, ${knob.y}px)`}></span></div><span class="caption">移动 · 外圈奔跑</span></div>

<style>
	.stick-wrap { display: grid; justify-items: center; gap: 9px; user-select: none; }
	.stick { width: 116px; height: 116px; border: 1px solid #ffffffa6; background: #f6f3e344; border-radius: 50%; position: relative; touch-action: none; box-shadow: 0 4px 20px #3249360a; }
	.stick.held { background: #f6f3e375; }
	.knob { position: absolute; inset: 36px; background: #fff9e9de; border: 1px solid #d5dbc9; border-radius: 50%; box-shadow: 0 3px 10px #39563820; pointer-events: none; }
	.cross { position: absolute; background: #ffffff66; pointer-events: none; }
	.horizontal { width: 22px; height: 1px; left: 46px; top: 57px; }
	.vertical { height: 22px; width: 1px; top: 46px; left: 57px; }
	.caption { color: #566b52; font-size: 10px; letter-spacing: 1px; text-shadow: 0 1px #fff8; }
</style>
