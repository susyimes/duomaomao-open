<script lang="ts">
	import { locale, setLocale } from './i18n';
</script>

<label class="language-selector">
	<span class="sr-only">Language / 语言</span>
	<select aria-label="Language / 语言" value={$locale} onchange={event => setLocale(event.currentTarget.value)}>
		<option value="en" lang="en">English</option>
		<option value="zh-CN" lang="zh-CN">简体中文</option>
	</select>
</label>

<style>
	.language-selector { display: inline-flex; align-items: center; }
	select { max-width: 105px; border: 1px solid #bbc8ad; border-radius: 8px; background: #faf8e9; color: #405c46; padding: 7px 3px; font: inherit; font-size: 11px; cursor: pointer; }
	select:focus-visible { outline: 2px solid #b98460; outline-offset: 3px; }
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
	@media (max-width: 400px) { select { width: 82px; font-size: 10px; } }
</style>
