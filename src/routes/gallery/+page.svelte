<script lang="ts">
	import { locale, t } from '$lib/duomaomao/i18n';
	import LanguageSelector from '$lib/duomaomao/LanguageSelector.svelte';
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import Icon from '$lib/duomaomao/Icon.svelte';
	import { createPreview, type Pose, type PreviewController, type ViewMode } from '$lib/duomaomao/preview';
	import { characters, type CharacterId } from '$lib/duomaomao/assets/characters';
	import { landmarks, props } from '$lib/duomaomao/assets/catalog';

	let mode = $state<ViewMode>('island');
	let characterId = $state<CharacterId>('fox');
	let propId = $state<string>('treehouse');
	let pose = $state<Pose>('idle');
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let evening = $state(false);
	let rotating = $state(false);
	let soundOn = $state(false);
	let focusedPlace = $state('');
	const viewport: { current: PreviewController | null } = { current: null };
	const sound: { current: HTMLAudioElement | null } = { current: null };
	const friend = $derived(characters.find(item => item.id === characterId) ?? characters[0]);
	const prop = $derived(props.find(item => item.id === propId) ?? props[0]);
	const tabs: { id: ViewMode; label: string; number: string }[] = [
		{ id: 'island', label: '小镇全景', number: '01' }, { id: 'characters', label: '小伙伴', number: '02' }, { id: 'props', label: '藏身小物', number: '03' }
	];
	const poses: { id: Pose; label: string }[] = [{ id: 'idle', label: '待机' }, { id: 'walk', label: '走一走' }, { id: 'celebrate', label: '庆祝' }];

	function mountScene(host: HTMLDivElement) {
		try {
			const controller = createPreview(host, { onStatus: value => { status = value; } });
			viewport.current = controller;
			void controller.show({ mode: 'island' });
			return () => { controller.destroy(); viewport.current = null; };
		} catch (error) { console.error('Unable to start 3D preview', error); status = 'error'; }
	}

	function playSound(name = 'tap') {
		if (!soundOn) return;
		sound.current?.pause();
		const audio = new Audio(`/assets/audio/${name}.wav`);
		audio.volume = 0.3;
		sound.current = audio;
		void audio.play().catch(() => { soundOn = false; });
	}
	function showCurrent() { focusedPlace = ''; void viewport.current?.show({ mode, id: mode === 'characters' ? characterId : propId }); }
	function changeMode(next: ViewMode) { mode = next; playSound(); showCurrent(); }
	function chooseFriend(id: CharacterId) { characterId = id; playSound(); showCurrent(); }
	function chooseProp(id: string) { propId = id; playSound(); showCurrent(); }
	function changePose(next: Pose) { pose = next; viewport.current?.setPose(next); playSound(next === 'celebrate' ? 'win' : 'tap'); }
	function toggleEvening() { evening = !evening; viewport.current?.setEvening(evening); playSound(); }
	function toggleRotation() { rotating = !rotating; viewport.current?.setAutoRotate(rotating); }
	function toggleSound() { soundOn = !soundOn; if (soundOn) playSound('bell'); else sound.current?.pause(); }
	function resetView() { viewport.current?.reset(); focusedPlace = ''; }
	onDestroy(() => { sound.current?.pause(); });
</script>

<svelte:head>
	<title>{$t("躲猫猫 · 风铃岛")}</title>
	<meta name="description" content={$t("风铃岛原创美术预览。一个有树屋、花园、小集市和八位动物伙伴的温暖微缩小镇。")} />
</svelte:head>

<main class:evening class:english={$locale === 'en'}>
	<div class="ambient-grain" aria-hidden="true"></div>
	<header class="masthead">
		<div class="wordmark"><span class="brand-mark"><Icon name="paw" size={24} /></span><span>{$t("躲猫猫")}<small>{$t("DUOMAOMAO")}</small></span></div>
		<div class="edition"><span></span>{$t("风铃岛 · 原创美术预览")}</div>
		<div class="header-tools"><LanguageSelector /><button class="text-control" onclick={toggleEvening} aria-pressed={evening}><Icon name={evening ? 'moon' : 'sun'} /><span>{evening ? $t("暮色") : $t("日光")}</span></button><button class="icon-button" onclick={toggleSound} aria-label={soundOn ? $t("关闭声音") : $t("开启声音")} aria-pressed={soundOn}><Icon name={soundOn ? 'sound' : 'muted'} /></button></div>
	</header>
	<aside class="story-panel">
		<div class="chapter"><span class="chapter-line"></span> {$t("A LITTLE PLACE TO HIDE")}</div>
		{#if mode === 'island'}<h1>{$t("藏进小镇，")}<br />{$t("等风找到你。")}</h1><p class="introduction">{$t("绕过树屋，穿过集市。")}<br />{$t("下一次躲猫猫，从这里开始。")}</p>
		{:else if mode === 'characters'}<h1>{$t("小小伙伴，")}<br />{$t("大大的秘密。")}</h1><p class="introduction">{$t("每个小家伙，都有自己的藏法。")}<br />{$t("来认识一下新朋友吧。")}</p>
		{:else}<h1>{$t("转个弯，")}<br />{$t("就是藏身处。")}</h1><p class="introduction">{$t("一棵树，一个木箱，一间小屋。")}<br />{$t("平凡的小物，也有秘密的一面。")}</p>{/if}
		<nav class="view-tabs" aria-label={$t("预览内容")}>{#each tabs as tab (tab.id)}<button class:active={mode === tab.id} aria-pressed={mode === tab.id} onclick={() => changeMode(tab.id)}><small>{tab.number}</small>{$t(tab.label)}<span><Icon name="arrow" size={17} /></span></button>{/each}</nav>
		{#if mode === 'island'}
			<div class="place-note"><Icon name="leaf" size={28} /><p>{$t("这里的每一个角落，")}<br />{$t("都在等一个藏起来的你。")}</p></div><div class="tiny-tags"><span>{$t("树屋")}</span><span>{$t("花园")}</span><span>{$t("小集市")}</span></div>
		{:else if mode === 'characters'}
			<div class="selection-caption"><span class="color-chip" style:background={friend.color}></span><div><h2>{$t(friend.name)}<small>{$t(friend.species)}</small></h2><p>{$t(friend.trait)}</p></div></div>
			<div class="pose-options" aria-label={$t("角色动作")}>{#each poses as item (item.id)}<button class:active={pose === item.id} aria-pressed={pose === item.id} onclick={() => changePose(item.id)}>{$t(item.label)}</button>{/each}</div>
		{:else}
			<div class="selection-caption"><span class="prop-number">{String(props.findIndex(item => item.id === propId) + 1).padStart(2, '0')}</span><div><h2>{$t(prop.name)}</h2><p>{$t(prop.category)} {$t("· 转动看看另一面")}</p></div></div>
			<div class="sound-samples"><span>{$t("听听小镇")}</span>{#each [{ id: 'bell', label: "风铃" }, { id: 'found', label: "发现" }, { id: 'ready', label: "出发" }] as sample (sample.id)}<button onclick={() => { soundOn = true; playSound(sample.id); }}>{$t(sample.label)}</button>{/each}</div>
		{/if}
	</aside>
	<div class="scene" {@attach mountScene}></div>
	{#if status !== 'ready'}<div class="scene-message" role="status" aria-live="polite">{#if status === 'loading'}<span class="loading-paw"><Icon name="paw" size={30} /></span><p>{$t("小镇正在醒来…")}</p>{:else}<p>{$t("暂时没能打开小镇。")}</p><button onclick={() => { if (viewport.current) showCurrent(); else window.location.reload(); }}>{$t("再试一次")}</button>{/if}</div>{/if}
	{#if mode !== 'props'}<div class="scene-label"><span class="location-dot"></span>{mode === 'island' ? $t("风铃岛") : $t('stage', { name: $t(friend.name) })}</div>{/if}
	<div class="view-tools" aria-label={$t("镜头控制")}><button class="icon-button" onclick={toggleRotation} class:selected={rotating} aria-label={rotating ? $t("停止自动旋转") : $t("自动旋转")} aria-pressed={rotating}><Icon name="rotate" /></button><span></span><button class="icon-button" onclick={() => viewport.current?.zoom(0.8)} aria-label={$t("放大")}><Icon name="plus" /></button><button class="icon-button" onclick={() => viewport.current?.zoom(1.25)} aria-label={$t("缩小")}><Icon name="minus" /></button><button class="icon-button" onclick={resetView} aria-label={$t("重置视角")}><Icon name="reset" /></button></div>
	<div class="bottom-tray">
		{#if mode === 'island'}<div class="landmarks" aria-label={$t("小镇地点")}>{#each landmarks as place, index (place.id)}<button class:active={focusedPlace === place.id} onclick={() => { focusedPlace = place.id; viewport.current?.focus(place.position); playSound(); }}><small>0{index + 1}</small><Icon name="pin" size={16} />{$t(place.name)}</button>{/each}</div>
		{:else if mode === 'characters'}<div class="friend-picker" aria-label={$t("选择小伙伴")}>{#each characters as item (item.id)}<button class:active={characterId === item.id} aria-pressed={characterId === item.id} onclick={() => chooseFriend(item.id)}><span style:--friend-color={item.color}><Icon name="paw" size={23} /></span>{$t(item.name)}</button>{/each}</div>
		{:else}<div class="prop-picker" aria-label={$t("选择场景小物")}>{#each props as item (item.id)}<button class:active={propId === item.id} aria-pressed={propId === item.id} onclick={() => chooseProp(item.id)}>{$t(item.name)}</button>{/each}</div>{/if}
		<p class="gesture-hint"><span class="mouse-shape"></span>{$t("拖动旋转")}<span>·</span>{$t("滚轮 / 双指缩放")}</p>
	</div>
	<footer><a class="footer-note" href={resolve('/')}>{$t("← 返回单人游戏")}</a><a href="/assets/duomaomao-art-pack.zip" download><Icon name="download" size={15} />{$t("下载原创素材包")}</a><span class="season">{$t("EARLY SUMMER, VOL. 01")}</span></footer>
</main>

<style>
	main { --ink: #33453d; --muted: #80877a; position: relative; width: 100%; height: 100dvh; min-height: 640px; overflow: hidden; color: var(--ink); background: radial-gradient(ellipse at 72% 52%, #e1e8d9, #eef0e4 34%, #f5f2e8 72%); transition: background 600ms; }
	main.evening { --ink: #424452; --muted: #85838b; background: radial-gradient(ellipse at 70% 47%, #c5c3cf, #e2d9d3 55%, #eee5da); }
	.ambient-grain { position: absolute; inset: 0; pointer-events: none; z-index: 1; opacity: .17; background-image: radial-gradient(#8d987d .55px, transparent .55px); background-size: 4px 4px; mix-blend-mode: multiply; }
	.masthead { position: absolute; top: 33px; left: 42px; right: 36px; display: flex; align-items: center; justify-content: space-between; z-index: 4; }
	.wordmark { display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 800; letter-spacing: 3px; }
	.brand-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 16px 16px 16px 5px; color: #fff7e8; background: #cc8d71; transform: rotate(-6deg); }
	.wordmark small { display: block; font-size: 8px; letter-spacing: 2.1px; font-weight: 600; margin-top: 2px; color: var(--muted); }
	.edition { display: flex; gap: 9px; align-items: center; position: absolute; left: 50%; transform: translateX(-50%); font-size: 11px; letter-spacing: 2px; color: #79836f; white-space: nowrap; }
	.edition > span, .location-dot { width: 5px; height: 5px; border-radius: 50%; background: #84956d; }
	.header-tools { display: flex; align-items: center; gap: 18px; }
	button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
	button, a { outline-offset: 5px; }
	button:focus-visible, a:focus-visible { outline: 2px solid #a87759; }
	.text-control { display: flex; align-items: center; gap: 7px; border: 0; background: none; color: var(--ink); font-size: 12px; }
	.icon-button { display: grid; place-items: center; padding: 0; width: 36px; height: 36px; border: 0; border-radius: 50%; background: transparent; color: var(--ink); }
	.icon-button:hover, .icon-button.selected { background: #d6decb; }
	.story-panel { position: absolute; left: 5.3%; top: 22%; width: 315px; z-index: 3; }
	.chapter { display: flex; align-items: center; gap: 10px; font-size: 8px; font-weight: 600; letter-spacing: 2px; color: #869378; margin-bottom: 26px; }
	.chapter-line { width: 23px; height: 1px; background: #98a483; }
	h1 { font-family: 'STZhongsong', 'Source Han Serif SC', 'Songti SC', 'SimSun', Georgia, serif; font-size: clamp(34px, 3.2vw, 49px); line-height: 1.48; font-weight: 700; letter-spacing: 2px; margin: 0; }
	.introduction { color: #7b8577; font-size: 12px; line-height: 2; margin: 20px 0 30px; letter-spacing: .5px; }
	.view-tabs { display: flex; flex-direction: column; max-width: 241px; gap: 4px; }
	.view-tabs button { border: 0; padding: 12px 13px; background: transparent; border-radius: 7px; display: flex; align-items: center; color: #798474; font-size: 13px; text-align: left; letter-spacing: 1px; }
	.view-tabs button > small { font-size: 9px; margin-right: 19px; letter-spacing: .5px; opacity: .65; }
	.view-tabs button > span { margin-left: auto; opacity: 0; }
	.view-tabs button.active { background: #dfe5d6; color: #40583e; font-weight: 600; }
	.view-tabs button.active > span { opacity: 1; }
	.view-tabs button:hover { background: #e8eade; }
	.place-note { display: flex; align-items: center; gap: 14px; color: #8a937c; margin-top: 35px; }
	.place-note p { font-size: 11px; line-height: 1.9; margin: 0; }
	.tiny-tags { display: flex; gap: 9px; margin-top: 17px; }
	.tiny-tags span { font-size: 9px; letter-spacing: 1px; border: 1px solid #d6decc; padding: 4px 9px; border-radius: 3px; color: #939b85; }
	.scene { position: absolute; inset: 80px 0 112px 24%; touch-action: none; }
	.scene :global(canvas) { display: block; width: 100%; height: 100%; }
	.scene-message { position: absolute; left: 61%; top: 45%; transform: translate(-50%, -50%); z-index: 2; padding: 22px 28px; border-radius: 16px; text-align: center; background: #f5f2e8e6; color: #667653; font-size: 13px; }
	.loading-paw { display: inline-flex; animation: breathe 1.6s ease-in-out infinite; }
	.scene-message button { border: 1px solid #a2ad95; border-radius: 5px; padding: 7px 13px; background: #e4eadb; color: #41563b; }
	.scene-label { position: absolute; top: 124px; right: 5%; display: flex; gap: 8px; align-items: center; color: #7f8a75; font-size: 11px; letter-spacing: 2px; z-index: 2; }
	.view-tools { position: absolute; right: 31px; top: 43%; display: flex; flex-direction: column; padding: 7px 5px; gap: 4px; border: 1px solid #d6ddcc8a; border-radius: 28px; background: #f8f7eead; backdrop-filter: blur(8px); z-index: 3; }
	.view-tools > span { height: 1px; width: 18px; background: #d9dfd1; margin: 2px auto; }
	.bottom-tray { position: absolute; left: 29%; right: 9%; bottom: 68px; z-index: 3; text-align: center; }
	.landmarks { display: flex; justify-content: center; gap: 10px; }
	.landmarks button { border: 1px solid #d9dfd1; background: #f6f6ece0; color: #76836e; border-radius: 6px; padding: 10px 14px; display: flex; gap: 7px; align-items: center; font-size: 11px; letter-spacing: .5px; }
	.landmarks button > small { color: #a4ac99; font-size: 8px; margin-right: 3px; }
	.landmarks button:hover, .landmarks button.active { border-color: #9caa89; background: #e3e8d8; }
	.gesture-hint { display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 9px; letter-spacing: 1px; color: #909a85; margin: 18px 0 0; }
	.gesture-hint > span:not(.mouse-shape) { color: #b8c0ac; margin: 0 2px; }
	.mouse-shape { width: 10px; height: 14px; border: 1px solid #a5ae99; border-radius: 5px; position: relative; }
	.mouse-shape::before { content: ''; position: absolute; width: 1px; height: 3px; top: 3px; left: 3.5px; background: #a5ae99; }
	.selection-caption { margin-top: 29px; display: flex; align-items: center; gap: 13px; }
	.selection-caption h2 { font-size: 17px; letter-spacing: 1px; margin: 0; font-weight: 600; }
	.selection-caption h2 small { color: #89937f; font-size: 10px; margin-left: 9px; font-weight: 400; }
	.selection-caption p { font-size: 10px; line-height: 1.8; color: #89937f; margin: 7px 0 0; }
	.color-chip { display: block; width: 33px; height: 42px; border-radius: 17px 17px 11px 11px; box-shadow: inset 0 -6px 0 #0000000a; flex-shrink: 0; }
	.pose-options { display: flex; gap: 7px; margin-top: 21px; }
	.pose-options button { background: none; border: 1px solid #d6ddca; border-radius: 5px; color: #859178; padding: 6px 11px; font-size: 10px; }
	.pose-options button.active { color: #536746; border-color: #9ba98a; background: #e5e9dc; }
	.friend-picker { display: flex; justify-content: center; gap: 13px; }
	.friend-picker button { display: grid; gap: 7px; justify-items: center; color: #839075; font-size: 10px; letter-spacing: 1px; background: none; border: 0; padding: 3px; }
	.friend-picker button > span { width: 43px; height: 43px; display: grid; place-items: center; border: 2px solid transparent; border-radius: 50%; color: var(--friend-color); background: #f8f7ec; box-shadow: 0 3px 6px #57653707; }
	.friend-picker button.active > span { border-color: var(--friend-color); transform: translateY(-4px); }
	.friend-picker button.active { color: #40583e; font-weight: 600; }
	.prop-number { font-family: Georgia, serif; font-size: 33px; font-style: italic; color: #a9b198; }
	.prop-picker { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-height: 95px; overflow-y: auto; scrollbar-width: thin; }
	.prop-picker button { color: #76836e; background: #f7f6ed; font-size: 10px; padding: 6px 10px; border: 1px solid #dce2d2; border-radius: 4px; }
	.prop-picker button.active { background: #dce5d0; border-color: #a4b291; color: #45613d; }
	.sound-samples { display: flex; gap: 7px; align-items: center; margin-top: 21px; font-size: 10px; color: #8d957f; }
	.sound-samples button { color: #6d7d5d; border: 0; border-bottom: 1px solid #c6d0b7; padding: 4px 2px; background: transparent; }
	footer { position: absolute; left: 42px; right: 36px; bottom: 23px; z-index: 3; display: flex; justify-content: space-between; align-items: center; gap: 12px; color: #959d8b; font-size: 9px; letter-spacing: 1px; }
	footer a { color: #818f72; text-decoration: none; display: flex; gap: 6px; align-items: center; }
	footer a:hover { color: #4f6944; }
	.season { font-size: 8px; letter-spacing: 1.5px; }
	@keyframes breathe { 50% { opacity: .45; transform: translateY(-4px); } }
	@media (min-width: 1600px) { .story-panel { left: 7%; width: 315px; } .view-tabs { max-width: 268px; } }
	@media (max-width: 1100px) { .story-panel { left: 4%; width: 247px; top: 21%; } h1 { font-size: 35px; } .scene { left: 25%; } .view-tabs { max-width: 215px; } .chapter { letter-spacing: 1.1px; } .view-tools { right: 16px; } .edition { display: none; } .landmarks { gap: 5px; } .landmarks button { padding: 9px; } .bottom-tray { left: 28%; right: 8%; } .friend-picker { gap: 6px; } .friend-picker button > span { width: 36px; height: 36px; } }
	@media (max-width: 720px) {
		main { min-height: 760px; } .masthead { top: 23px; left: 22px; right: 18px; } .wordmark { font-size: 19px; } .brand-mark { width: 38px; height: 38px; } .header-tools { gap: 10px; } .story-panel { left: 24px; right: 24px; top: 104px; width: auto; } .chapter { font-size: 7px; margin-bottom: 13px; } h1 { font-size: 28px; line-height: 1.35; letter-spacing: 1px; } h1 br { display: none; } .introduction { font-size: 10px; margin: 11px 0 18px; } .introduction br { display: none; } .view-tabs { flex-direction: row; max-width: none; gap: 7px; } .view-tabs button { font-size: 11px; padding: 8px 11px; border: 1px solid #dce2d0; } .view-tabs button > small { margin-right: 8px; font-size: 7px; } .view-tabs button > span { display: none; } .place-note, .tiny-tags { display: none; } .scene { inset: 248px 0 170px 0; } .scene-label { top: auto; bottom: 184px; right: 24px; font-size: 9px; } .scene-message { left: 50%; top: 50%; } .view-tools { top: 350px; right: 13px; gap: 0; padding: 4px; } .view-tools .icon-button { width: 28px; height: 32px; } .bottom-tray { left: 16px; right: 16px; bottom: 83px; } .landmarks button { padding: 9px 10px; font-size: 10px; } .landmarks button > small { display: none; } .gesture-hint { font-size: 8px; margin-top: 13px; } .selection-caption { position: absolute; top: 145px; left: 0; margin-top: 0; gap: 8px; z-index: 1; } .selection-caption h2 { font-size: 14px; } .selection-caption p { max-width: 120px; font-size: 9px; } .color-chip { width: 22px; height: 30px; } .pose-options { position: absolute; top: 210px; left: 0; margin: 0; flex-direction: column; gap: 5px; } .pose-options button { padding: 5px 9px; font-size: 9px; } .friend-picker { gap: 4px; justify-content: space-around; } .friend-picker button { padding: 0; font-size: 9px; } .friend-picker button > span { width: 34px; height: 34px; } .prop-picker { max-height: 96px; gap: 4px; } .prop-picker button { font-size: 9px; padding: 5px 7px; } .sound-samples { position: absolute; top: 216px; left: 0; margin: 0; flex-wrap: wrap; max-width: 85px; font-size: 9px; } .sound-samples > span { flex-basis: 100%; } footer { left: 22px; right: 22px; bottom: 19px; flex-wrap: wrap; font-size: 8px; letter-spacing: .5px; row-gap: 10px; } .footer-note { flex-basis: 100%; } footer .season { font-size: 7px; }
	}
	.english h1 { font-size: clamp(30px, 3.1vw, 42px); letter-spacing: 0; }
	.english .wordmark { letter-spacing: 0; }
	.english .friend-picker { gap: 7px; }
	.english .friend-picker button { letter-spacing: 0; }
	@media (max-width: 720px) {
		.english .wordmark { font-size: 15px; }
		.english h1 { font-size: 26px; }
		.header-tools :global(.language-selector) { position: absolute; top: 45px; right: 0; }
		.view-tabs { flex-wrap: wrap; }
		.english .view-tabs button { padding: 7px 8px; font-size: 10px; }
		.english .friend-picker { flex-wrap: wrap; gap: 6px; }
		.english .friend-picker button { font-size: 8px; }
		.english .friend-picker button > span { width: 29px; height: 29px; }
		.english .landmarks { flex-wrap: wrap; gap: 4px; }
		.english .landmarks button { font-size: 9px; padding: 7px; }
	}
	@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
</style>
