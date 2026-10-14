import { readFileSync } from 'node:fs';
import { parse } from 'svelte/compiler';
import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { characters } from './assets/characters';
import { landmarks, props } from './assets/catalog';
import { SinglePlayerRound, hidingSpots } from './game/round';
import type { GameWorld } from './assets/collision';
import { detectLocale, dictionaries, locale, LOCALE_STORAGE_KEY, resolveLocale, setLocale, t, translate } from './i18n';

afterEach(() => { vi.unstubAllGlobals(); locale.set('en'); });

describe('language preference and storage', () => {
	it('uses the first supported browser language and falls back to navigator.language', () => {
		expect(detectLocale(['en-US', 'zh-CN'])).toBe('en');
		expect(detectLocale(['fr-FR', 'zh-CN', 'en-US'])).toBe('zh-CN');
		expect(detectLocale(['de-DE', 'en-GB', 'zh-CN'])).toBe('en');
		expect(detectLocale(['zh-TW', 'en-US'])).toBe('zh-CN');
		expect(detectLocale(['ZH-Hans'])).toBe('zh-CN');
		expect(detectLocale([], 'zh-HK')).toBe('zh-CN');
		expect(detectLocale(['fr-FR'])).toBe('en');
		expect(detectLocale()).toBe('en');
	});
	it('accepts only known persisted manual choices', () => {
		expect(resolveLocale('en', ['zh-CN'])).toBe('en');
		expect(resolveLocale('zh-CN', ['en-US'])).toBe('zh-CN');
		for (const invalid of ['fr', 'zh-TW', '', '{}', null, { locale: 'en' }]) {
			expect(resolveLocale(invalid, ['zh-CN'])).toBe('zh-CN');
		}
	});
	it('persists to a game-specific key without touching progress', () => {
		const setItem = vi.fn(); vi.stubGlobal('localStorage', { setItem });
		setLocale('zh-CN');
		expect(setItem).toHaveBeenCalledExactlyOnceWith(LOCALE_STORAGE_KEY, 'zh-CN');
		expect(LOCALE_STORAGE_KEY).toMatch(/^duomaomao\./);
		expect(get(locale)).toBe('zh-CN');
		setLocale('invalid'); expect(get(locale)).toBe('zh-CN');
	});
	it('keeps switching reactive when storage is blocked', () => {
		vi.stubGlobal('localStorage', { setItem: () => { throw new Error('blocked'); } });
		const observed: string[] = []; const unsubscribe = t.subscribe(tr => observed.push(tr('开始寻找')));
		setLocale('zh-CN'); setLocale('en'); unsubscribe();
		expect(observed).toEqual(['Start searching', '开始寻找', 'Start searching']);
	});
});

describe('player-facing coverage', () => {
	it('has complete dictionaries and matching interpolation parameters', () => {
		expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries['zh-CN']).sort());
		for (const [key, value] of Object.entries(dictionaries.en)) {
			expect(value.trim(), key).not.toBe('');
			expect(value, key).not.toMatch(/\p{Script=Han}/u);
			const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
			expect(params(value), key).toEqual(params(translate('zh-CN', key)));
		}
	});
	it('covers every displayed character, prop, landmark and hiding place', () => {
		const values = [
			...characters.flatMap(item => [item.name, item.species, item.trait]),
			...props.flatMap(item => [item.name, item.category]),
			...landmarks.map(item => item.name), ...hidingSpots.map(item => item.label)
		];
		for (const value of values) {
			expect(Object.hasOwn(dictionaries.en, value), value).toBe(true);
			expect(translate('en', value), value).not.toMatch(/\p{Script=Han}/u);
		}
	});
	it('contains no untranslated Chinese template text or static accessibility labels', () => {
		const files = ['../../routes/+page.svelte', '../../routes/gallery/+page.svelte', './game/Thumbstick.svelte'];
		const violations: string[] = [];
		const walk = (node: unknown, file: string) => {
			if (!node || typeof node !== 'object') return;
			if (Array.isArray(node)) { for (const value of node) walk(value, file); return; }
			const object = node as Record<string, unknown>;
			if (object.type === 'Text' && /\p{Script=Han}/u.test(String(object.data))) violations.push(`${file}: ${object.data}`);
			if (object.type === 'CallExpression') {
				const callee = object.callee as { name?: string };
				const arg = (object.arguments as { value?: unknown }[])[0];
				if (callee.name === '$t' && typeof arg?.value === 'string' && arg.value) {
					if (!Object.hasOwn(dictionaries.en, arg.value)) violations.push(`${file}: missing key ${arg.value}`);
				}
			}
			for (const [key, value] of Object.entries(object)) if (key !== 'parent') walk(value, file);
		};
		for (const file of files) {
			const ast = parse(readFileSync(new URL(file, import.meta.url), 'utf8'), { modern: true });
			walk(ast.fragment, file); // Script metadata is deliberately preserved and translated at render time.
		}
		expect(violations).toEqual([]);
	});
	it('translates live hints and catch results without changing the active round', () => {
		const world = JSON.parse(readFileSync(new URL('../../../public/assets/world.json', import.meta.url), 'utf8')) as GameWorld;
		const round = new SinglePlayerRound(world); round.start(420);
		for (let i = 0; i < 3; i++) round.update(1, { x: 0, z: 0, run: false });
		expect(round.hint()).toBe(true);
		const before = structuredClone(round.state);
		const hint = round.state.toast!;
		expect(translate('en', hint.key, hint.params)).toMatch(/^Ding! The sound comes from /);
		expect(translate('zh-CN', hint.key, hint.params)).toMatch(/^叮——声音来自/);
		setLocale('zh-CN'); setLocale('en');
		expect(round.state).toEqual(before);
		const target = round.state.hiders[0]; round.state.player = { ...target.position };
		expect(round.catch()).toBe(true);
		const caught = round.state.toast!;
		expect(translate('en', caught.key, caught.params)).toMatch(/^Found [A-Za-z]+!/);
		expect(translate('zh-CN', caught.key, caught.params)).toMatch(/^找到.+啦！/);
	});
});
