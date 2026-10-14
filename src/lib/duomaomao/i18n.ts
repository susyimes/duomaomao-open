import { derived, writable } from 'svelte/store';
import { en, zh, type MessageKey } from './messages.ts';

export type Locale = 'zh-CN' | 'en';
export type MessageParams = Record<string, string | number>;
export type LocalizedMessage = { key: MessageKey; params?: MessageParams };
export const LOCALE_STORAGE_KEY = 'duomaomao.locale.v1';
export const dictionaries = { en, 'zh-CN': zh };

export function isLocale(value: unknown): value is Locale { return value === 'en' || value === 'zh-CN'; }
export function detectLocale(languages: readonly string[] = [], language = ''): Locale {
	const preferences = languages.length ? languages : [language];
	const preferred = preferences.find(value => /^(?:en|zh)(?:-|$)/i.test(value.trim())) ?? '';
	return /^zh(?:-|$)/i.test(preferred.trim()) ? 'zh-CN' : 'en';
}
export function resolveLocale(saved: unknown, languages: readonly string[], language = ''): Locale {
	return isLocale(saved) ? saved : detectLocale(languages, language);
}
export function translate(locale: Locale, key: string, params: MessageParams = {}): string {
	const dictionary: Record<string, string> = dictionaries[locale];
	const text = Object.hasOwn(dictionary, key) ? dictionary[key] : key;
	return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
		const value = params[name];
		return value === undefined ? placeholder : typeof value === 'string' ? translate(locale, value) : String(value);
	});
}

function initialLocale(): Locale {
	if (typeof navigator === 'undefined') return 'en';
	let saved: unknown;
	try { saved = localStorage.getItem(LOCALE_STORAGE_KEY); } catch { /* Storage is optional. */ }
	return resolveLocale(saved, navigator.languages, navigator.language);
}
export const locale = writable<Locale>(initialLocale());
export const t = derived(locale, current => (key: string, params?: MessageParams) => translate(current, key, params));
export function setLocale(value: string): void {
	if (!isLocale(value)) return;
	locale.set(value);
	try { localStorage.setItem(LOCALE_STORAGE_KEY, value); } catch { /* Storage is optional. */ }
}
