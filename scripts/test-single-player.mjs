import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { buildNavigation, findPath } from '../src/lib/duomaomao/game/navigation.ts';
import { clearSegment, distance, groundHeight, isWalkable, walkableSegment } from '../src/lib/duomaomao/game/physics.ts';

const url = new URL(process.env.DUOMAOMAO_TEST_URL ?? 'http://127.0.0.1:5173/');
url.searchParams.set('debug', '');
const output = join(process.cwd(), '.git', 'codex-validation', 'single-player');
mkdirSync(output, { recursive: true });
const world = JSON.parse(readFileSync('public/assets/world.json', 'utf8'));
const navigation = buildNavigation(world);
const report = { url: url.href, inputMethod: 'Playwright keyboard; read-only state inspection', captures: [], errors: [], checkedPositions: 0 };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', error => report.errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
const read = () => page.evaluate(() => window.__duomaomaoDebug?.read());
const held = new Set();
async function keys(next) {
	for (const key of [...held]) if (!next.includes(key)) { await page.keyboard.up(key); held.delete(key); }
	for (const key of next) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
}
function densePath(path) {
	const result = [];
	for (let i = 1; i < path.length; i++) {
		const a = path[i - 1], b = path[i], count = Math.ceil(distance(a, b) / 0.22);
		for (let step = 1; step <= count; step++) result.push({ x: a.x + (b.x - a.x) * step / count, z: a.z + (b.z - a.z) * step / count });
	}
	return result;
}

try {
	await page.goto(url.href, { waitUntil: 'networkidle', timeout: 45000 });
	await page.locator('.play-scene[data-ready="true"]').waitFor({ timeout: 30000 });
	assert(await read(), 'Use a running Vite development server: production builds omit the read-only inspector.');
	await page.getByRole('button', { name: /开始寻找/ }).click();
	await page.locator('main[data-phase="playing"]').waitFor({ timeout: 12000 });
	let state = await read(); report.seed = state.seed;
	await page.keyboard.press('h');
	assert.equal((await read()).hints, 2);
	const started = Date.now();
	while ((state = await read()).phase === 'playing' && state.hiders.some(hider => !hider.found)) {
		await keys([]);
		const candidates = state.hiders.filter(hider => !hider.found).map(hider => {
			const path = findPath(state.player, hider.position, world, navigation);
			return { hider, path, length: path.slice(1).reduce((sum, point, index) => sum + distance(path[index], point), 0) };
		}).filter(candidate => candidate.path.length).sort((a, b) => a.length - b.length);
		assert(candidates.length, 'No route to remaining targets.');
		const { hider, path } = candidates[0];
		console.log(`Walking to ${hider.id}: ${path.length} corners, ${candidates[0].length.toFixed(1)} meters`);
		let captured = false;
		const waypoints = densePath(path);
		for (const [waypointIndex, waypoint] of waypoints.entries()) {
			const deadline = Date.now() + 5000;
			while (Date.now() < deadline) {
				state = await read();
				assert.equal(state.phase, 'playing', `Round unexpectedly ${state.phase}`);
				assert(isWalkable(state.player, world), 'Player entered a solid object or water.'); report.checkedPositions++;
				if (distance(state.player, hider.position) < 1.12 && clearSegment(state.player, hider.position, world)
					&& Math.abs(groundHeight(state.player, world) - groundHeight(hider.position, world)) < 0.6) {
					await keys([]); await page.keyboard.press('e');
					await page.waitForTimeout(60);
					captured = (await read()).hiders.find(target => target.id === hider.id).found;
					if (captured) break;
				}
				const dx = waypoint.x - state.player.x, dz = waypoint.z - state.player.z;
				if (Math.hypot(dx, dz) < 0.105) break;
				const ahead = waypoints[waypointIndex + 1];
				if (ahead && distance(state.player, ahead) < distance(state.player, waypoint) && walkableSegment(state.player, ahead, world)) break;
				const intent = [];
				if (Math.abs(dx) > 0.04) intent.push(dx > 0 ? 'd' : 'a');
				if (Math.abs(dz) > 0.04) intent.push(dz > 0 ? 's' : 'w');
				await keys(intent);
				await page.waitForTimeout(Math.max(15, Math.min(65, Math.hypot(dx, dz) / 2.55 * 600)));
			}
			if (captured) break;
			assert(Date.now() < deadline, `Stuck near ${JSON.stringify(waypoint)} at ${JSON.stringify((await read()).player)}`);
		}
		await keys([]);
		assert(captured, `Reached route end without finding ${hider.id}`);
		state = await read(); report.captures.push({ id: hider.id, elapsed: state.elapsed, position: { ...state.player } });
		console.log(`Found ${hider.id}: ${report.captures.length}/5 at ${state.elapsed.toFixed(1)} seconds`);
	}
	state = await read();
	assert.equal(state.phase, 'won'); assert.equal(report.captures.length, 5);
	await page.getByRole('dialog', { name: '一个都没落下！' }).waitFor();
	await page.screenshot({ path: join(output, 'won-desktop.png') });
	report.elapsed = state.elapsed; report.wallSeconds = (Date.now() - started) / 1000;
	report.saved = await page.evaluate(() => JSON.parse(localStorage.getItem('duomaomao.singleplayer.v1')));
	assert.equal(report.saved.completions, 1); assert(report.saved.best > 0);
	await page.getByRole('button', { name: '再玩一局' }).click();
	state = await read(); assert.equal(state.phase, 'countdown'); assert.equal(state.hints, 3); assert.equal(state.remaining, 180);
	assert(state.hiders.every(hider => !hider.found));
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: '回到小镇' }).click();
	assert.equal((await read()).phase, 'lobby');
	assert.deepEqual(report.errors, []);
	report.result = 'passed'; console.log(JSON.stringify(report, null, 2));
} catch (error) {
	report.result = 'failed'; report.failure = String(error); report.lastState = await read().catch(() => null);
	await keys([]).catch(() => {});
	await page.screenshot({ path: join(output, 'failure.png') }).catch(() => {});
	console.log(JSON.stringify(report, null, 2)); process.exitCode = 1;
} finally { writeFileSync(join(output, 'keyboard-round-report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
