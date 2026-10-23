import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';
import { unzipSync } from 'three/addons/libs/fflate.module.js';

// Serve the actual ZIP under a nested directory, without an SPA rewrite fallback.
const archive = unzipSync(readFileSync('dist-toy/duomaomao-toy.zip'));
const prefix = '/toy-fixture/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.data': 'application/octet-stream', '.md': 'text/plain' };
const server = createServer((request, response) => {
	const path = new URL(request.url, 'http://localhost').pathname;
	const name = path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length)) || 'index.html' : '';
	const bytes = archive[name];
	response.writeHead(bytes ? 200 : 404, { 'Content-Type': types[extname(name)] ?? 'application/octet-stream' });
	response.end(bytes ?? 'Not found');
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const errors = [], models = new Set(), audio = new Set();
const output = 'dist-toy/verification'; mkdirSync(output, { recursive: true });
try {
	for (const touch of [false, true]) {
		const context = await browser.newContext({ viewport: touch ? { width: 844, height: 390 } : { width: 1280, height: 800 }, hasTouch: touch, isMobile: touch });
		await context.addInitScript(() => localStorage.setItem('duomaomao.locale.v1', 'zh-CN'));
		const page = await context.newPage();
		page.on('pageerror', error => errors.push(String(error)));
		page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
		page.on('request', request => { if (!request.url().startsWith(origin + '/')) errors.push(`External request: ${request.url()}`); });
		page.on('response', response => {
			if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
			if (response.url().endsWith('.data') && response.ok()) models.add(response.url().split('/').at(-1));
			if (response.url().endsWith('.wav') && response.ok()) audio.add(response.url().split('/').at(-1));
		});
		await page.goto(`${origin}${prefix}`, { waitUntil: 'networkidle' });
		await page.locator('.play-scene[data-ready="true"]').waitFor({ timeout: 45000 });
		await page.getByLabel('Language / 语言').selectOption('en');
		assert.equal(await page.locator('html').getAttribute('lang'), 'en');
		await page.getByLabel('Language / 语言').selectOption('zh-CN');
		await page.screenshot({ path: join(output, touch ? 'lobby-touch.png' : 'lobby-desktop.png') });
		await page.locator('.start-button').click();
		await page.locator('main[data-phase="playing"]').waitFor({ timeout: 15000 });
		if (touch) {
			await page.locator('.touch-controls').waitFor({ state: 'visible' }); await page.locator('.hint-button').tap();
			for (const locale of ['en', 'zh-CN']) {
				await page.getByLabel('Language / 语言').selectOption(locale);
				const stamina = await page.locator('.stamina').boundingBox();
				for (const selector of ['.objective', '.touch-controls']) {
					const other = await page.locator(selector).boundingBox();
					assert(stamina.x + stamina.width <= other.x || other.x + other.width <= stamina.x || stamina.y + stamina.height <= other.y || other.y + other.height <= stamina.y, `${locale}: stamina ${JSON.stringify(stamina)} overlaps ${selector} ${JSON.stringify(other)}`);
				}
			}
		}
		else { await page.keyboard.press('h'); await page.keyboard.down('w'); await page.waitForTimeout(600); await page.keyboard.up('w'); }
		await page.screenshot({ path: join(output, touch ? 'playing-touch.png' : 'playing-desktop.png') });
		await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
		await page.locator('main[data-phase="paused"]').waitFor();
		await page.getByRole('button', { name: '回到小镇', exact: true }).click();
		await page.locator('.gallery-link').click();
		await page.waitForURL('**/#/gallery');
		await page.locator('[data-state="ready"]').waitFor({ timeout: 45000 });
		if (!touch) {
			await page.locator('.view-tabs button').nth(1).click();
			for (const button of await page.locator('.friend-picker button').all()) {
				await button.click(); await page.locator('[data-state="ready"]').waitFor();
				for (const pose of await page.locator('.pose-options button').all()) await pose.click();
			}
			await page.locator('.view-tabs button').nth(2).click();
			for (const button of await page.locator('.prop-picker button').all()) { await button.click(); await page.locator('[data-state="ready"]').waitFor(); }
			await page.screenshot({ path: join(output, 'gallery-desktop.png') });
		}
		await page.reload({ waitUntil: 'networkidle' });
		await page.locator('[data-state="ready"]').waitFor();
		await context.close();
	}
	assert.equal(models.size, 32, 'Browser must load all 32 models referenced by game/gallery; the spare friends lineup is parsed by toy:check');
	assert(audio.has('bell.wav'), 'User gesture must request bell audio');
	assert.deepEqual(errors, []);
	const report = { result: 'passed', models: [...models].sort(), audio: [...audio].sort(), checks: ['ZIP served beneath nested prefix', 'no external requests or HTTP errors', 'desktop start, movement, hint, pause, return', 'Chinese/English switch', 'gallery all characters and props, animation controls, hash reload', '844x390 touch viewport: start, hint and controls'], limitation: 'Desktop Chromium touch emulation; Bilibili App and physical phone not tested.' };
	writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
