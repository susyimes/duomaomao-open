<script lang="ts">
	import { locale, t } from '$lib/duomaomao/i18n';
	import LanguageSelector from '$lib/duomaomao/LanguageSelector.svelte';
	import { resolve } from '$app/paths';
	import Icon from '$lib/duomaomao/Icon.svelte';
	import Thumbstick from '$lib/duomaomao/game/Thumbstick.svelte';
	import { characters } from '$lib/duomaomao/assets/characters';
	import { createGameRuntime, initialSnapshot, type GameRuntime, type GameSnapshot } from '$lib/duomaomao/game/runtime';

	let game = $state.raw<GameSnapshot>({ ...initialSnapshot });
	let generation = $state(0);
	const runtime: { current: GameRuntime | null } = { current: null };
	const active = $derived(['playing', 'countdown', 'paused'].includes(game.phase));
	const selected = $derived(characters.find(character => character.id === game.playerId) ?? characters[0]);
	const clock = (seconds: number) => `${Math.floor(Math.ceil(seconds) / 60).toString().padStart(2, '0')}:${(Math.ceil(seconds) % 60).toString().padStart(2, '0')}`;
	const mapSolids = $derived(game.world?.solids.filter(solid => /^(cottage|treehouse|windmill|market|hedge)/.test(solid.id)) ?? []);

	function mountGame(host: HTMLDivElement) {
		try {
			const controller = createGameRuntime(host, snapshot => { game = snapshot; });
			runtime.current = controller;
			return () => { controller.destroy(); runtime.current = null; };
		} catch (error) { console.error('WebGL game initialization failed', error); game = { ...initialSnapshot, error: true }; }
	}
	function retry() { game = { ...initialSnapshot }; generation++; }
	function focusPanel(panel: HTMLElement) {
		queueMicrotask(() => { if (panel.isConnected) panel.querySelector('button')?.focus(); });
		const trap = (event: KeyboardEvent) => {
			if (event.key !== 'Tab') return;
			const buttons = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)')];
			const first = buttons[0], last = buttons.at(-1);
			if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
			else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
		};
		panel.addEventListener('keydown', trap);
		return () => panel.removeEventListener('keydown', trap);
	}
</script>

<svelte:head><title>{$t("躲猫猫 · 风铃岛")}</title><meta name="description" content={$t("在风铃岛玩一局单人躲猫猫。三分钟，找到五位藏起来的小伙伴。")} /></svelte:head>

<main class="game-shell" class:in-round={active} class:english={$locale === 'en'} data-phase={game.phase} data-found={game.found}>
	{#key generation}<div class="play-scene" {@attach mountGame}></div>{/key}
	<div class="grain" aria-hidden="true"></div>
	<header class="game-header">
		<div class="wordmark"><span class="brand-paw"><Icon name="paw" size={24} /></span><div>{$t("躲猫猫")}<small>{$t("风铃岛 · 单人游戏")}</small></div></div>
		{#if active}<div class="clock-pill" class:urgent={game.remaining <= 30}><Icon name="clock" size={17} /><span role="timer" aria-live="off" aria-label={$t('remaining', { seconds: Math.ceil(game.remaining) })}>{clock(game.remaining)}</span></div>{/if}
		<div class="header-buttons"><LanguageSelector /><button class="round-button" onclick={() => runtime.current?.mute()} aria-label={game.muted ? $t("开启声音") : $t("关闭声音")} aria-pressed={!game.muted}><Icon name={game.muted ? 'muted' : 'sound'} /></button>{#if active}<button class="round-button" onclick={() => runtime.current?.pause()} aria-label={$t("暂停游戏")}><Icon name="pause" /></button>{:else if game.phase === 'lobby'}<a class="gallery-link" href={resolve('/gallery')}>{$t("素材图鉴")}<Icon name="arrow" size={15} /></a>{/if}</div>
	</header>

	{#if game.phase === 'lobby'}
		<section class="lobby-card" aria-label={$t("开始单人游戏")}>
			<div class="eyebrow"><span></span> {$t("WINDBELL ISLAND")}</div>
			<h1>{$t("藏好了吗？")}<br />{$t("我来找你啦。")}</h1>
			<p class="lobby-lede">{$t("穿过花园，绕到树屋后面。")}<br /><strong>{$t("3 分钟")}</strong>{$t("，找到")}<strong>{$t("5 位")}</strong>{$t("藏起来的小伙伴。")}</p>
			<div class="character-title"><span>{$t("今天，你是")}<strong>{$t(selected.name)}</strong></span><small>{$t(selected.species)}</small></div>
			<div class="character-picker" aria-label={$t("选择角色")}>{#each characters as character (character.id)}<button disabled={!game.ready} class:selected={game.playerId === character.id} aria-label={$t('select', { name: $t(character.name) })} aria-pressed={game.playerId === character.id} onclick={() => runtime.current?.selectPlayer(character.id)}><span style:--fur={character.color}><Icon name="paw" size={24} /></span><small>{$t(character.name)}</small></button>{/each}</div>
			{#if game.error}<div class="load-error" role="alert"><p>{$t("小镇暂时没有打开，请重试。")}</p><button class="primary-button" onclick={retry}>{$t("重新加载")}</button></div>
			{:else}<button class="primary-button start-button" disabled={!game.ready} onclick={() => runtime.current?.start()}>{#if game.ready}<Icon name="play" size={17} />{$t("开始寻找")}<span>{$t("单人")}</span>{:else}<Icon name="leaf" size={19} />{$t("小镇正在醒来…")}<span>{Math.round(game.progress * 100)}%</span>{/if}</button>{/if}
			<p class="lobby-footnote">{$t("每局藏身点不同 · 3 次风铃提示")}</p>
			{#if game.best !== null}<p class="best-record"><Icon name="star" size={13} />{$t("最快找到全部伙伴：")}{clock(game.best)}</p>{/if}
			<div class="quick-guide desktop-only"><div><kbd>W A S D</kbd><span>{$t("移动")}</span><kbd>Shift</kbd><span>{$t("奔跑")}</span></div><div><kbd>{$t("E / 空格")}</kbd><span>{$t("找到")}</span><kbd>H</kbd><span>{$t("风铃提示")}</span></div><p>{$t("拖动转镜头，滚轮缩放；Esc 暂停。")}</p></div>
			<p class="touch-guide touch-only">{$t("拖动左侧摇杆移动，外圈奔跑。")}<br />{$t("右侧滑动转镜头，靠近伙伴后点「找到」。")}</p>
		</section>
		<div class="lobby-caption"><Icon name="leaf" size={18} /><span>{$t("藏起来的，是小小的秘密。")}<br /><strong>{$t("找到的，是一起玩的好朋友。")}</strong></span></div>
	{:else if active}
		<section class="objective" aria-label={$t("寻找进度")}><div class="objective-title"><span>{$t("找到小伙伴")}</span><strong>{game.found}<small> / {game.total}</small></strong></div><div class="target-row">{#each game.targets as target (target.id)}<div class="target-badge" class:found={target.found} aria-label={$t('targetStatus', { name: $t(target.name), status: target.found ? "已找到" : "未找到" })}><span style:--fur={target.color}><Icon name={target.found ? 'check' : 'paw'} size={19} /></span><small>{$t(target.name)}</small></div>{/each}</div></section>
		<aside class="minimap" aria-label={$t("小镇地图")}><div class="map-title"><span>{$t("风铃岛")}</span><small>{$t("北 N")}</small></div><svg viewBox="-11.5 -11.5 23 23" aria-label={$t("地图上的你")}><circle r="10.6" fill="#dce6c9" stroke="#f8f2d7" stroke-width=".5" /><path d="M0 8 1 2 0 0-.5-2M-8-1 0 0 8-2M-6 3.5-1 4" stroke="#faf4df" stroke-width="1" fill="none" /><ellipse cx="-4.1" cy="3.5" rx="2.32" ry="1.63" fill="#91c9c3" />{#each mapSolids as solid (solid.id)}<g transform={`translate(${solid.x} ${solid.z}) rotate(${-solid.yaw * 180 / Math.PI})`}>{#if solid.kind === 'circle'}<circle r={solid.radius} fill="#9bb589" />{:else}<rect x={-solid.halfX} y={-solid.halfZ} width={solid.halfX * 2} height={solid.halfZ * 2} rx=".12" fill={solid.id.startsWith('cottage') ? '#cea889' : '#95ae82'} />{/if}</g>{/each}{#if game.hint}<circle cx={game.hint.position.x} cy={game.hint.position.z} r=".8" fill="#eabb51" opacity=".85" />{/if}<g transform={`translate(${game.player.x} ${game.player.z}) rotate(${180 - game.facing * 180 / Math.PI})`} data-player-x={game.player.x.toFixed(4)} data-player-z={game.player.z.toFixed(4)}><circle r=".65" fill="#fff7e2" /><path d="M0-.8-.5.55 0 .3 .5 .55Z" fill="#c47e59" /></g></svg></aside>
		{#if game.phase === 'playing'}
			<div class="stamina"><div><span>{game.exhausted ? $t("喘口气，再出发") : $t("奔跑体力")}</span><small class="desktop-only">{$t("按住 Shift")}</small></div><div class="stamina-track"><span style:width={`${game.stamina}%`} class:low={game.stamina < 25}></span></div></div>
			<div class="touch-controls touch-only"><Thumbstick onMove={(x, y) => runtime.current?.stick(x, y)} /></div>
			<div class="action-buttons"><button class="hint-button" disabled={game.hints === 0 || game.hintCooldown > 0} onclick={() => runtime.current?.hint()} aria-label={$t("风铃提示")}><Icon name="bell" size={22} /><span>{game.hintCooldown > 0 ? $t('seconds', { seconds: Math.ceil(game.hintCooldown) }) : $t('bells', { count: game.hints })}</span><kbd class="desktop-only">H</kbd></button><button class="catch-button" disabled={!game.nearby} onclick={() => runtime.current?.catchFriend()} aria-label={game.nearby ? $t('findFriend', { name: $t(game.nearby ?? '') }) : $t("靠近小伙伴后找到")}><Icon name="paw" size={25} /><span>{game.nearby ? $t('findFriend', { name: $t(game.nearby ?? '') }) : $t("靠近小伙伴")}</span><kbd class="desktop-only">E</kbd></button></div>
			<button class="camera-button" onclick={() => runtime.current?.resetCamera()} aria-label={$t("重置镜头")}><Icon name="compass" size={21} /></button>
			<p class="movement-guide desktop-only"><kbd>{$t("WASD / 方向键")}</kbd>{$t("移动")}<span>·</span>{$t("拖动转镜头")}<span>·</span> <kbd>Q / R</kbd>{$t("转向")}</p>
		{/if}
		{#if game.toast && game.phase === 'playing'}<div class="toast"><Icon name={game.hint ? 'bell' : 'paw'} size={18} />{$t(game.toast?.key ?? '', game.toast?.params)}</div>{/if}
	{/if}

	{#if game.phase === 'countdown'}<div class="countdown-overlay" aria-live="assertive"><span>{$t("大家都在藏好自己")}</span><strong>{Math.ceil(game.countdown)}</strong><p>{$t("准备好，出发寻找小伙伴！")}</p></div>{/if}
	{#if game.phase === 'paused'}
		<div class="modal-backdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="pause-title" tabindex="-1" {@attach focusPanel}><span class="modal-emblem"><Icon name="leaf" size={31} /></span><div class="eyebrow">{$t("TAKE A LITTLE BREAK")}</div><div class="dialog-language"><LanguageSelector /></div><h2 id="pause-title">{$t("小镇等你回来。")}</h2><p>{game.pauseReason === 'focus' ? $t("游戏已自动暂停，时间不会继续流逝。") : $t("歇一会儿，小伙伴们还在原来的地方。")}</p><div class="pause-guide desktop-only"><div><kbd>{$t("WASD / 方向键")}</kbd><span>{$t("移动")}</span></div><div><kbd>Shift</kbd><span>{$t("按住奔跑")}</span></div><div><kbd>{$t("E / 空格")}</kbd><span>{$t("靠近后找到伙伴")}</span></div><div><kbd>H</kbd><span>{$t("风铃提示")}</span></div><div><kbd>{$t("拖动 / Q、R")}</kbd><span>{$t("转动镜头")}</span></div><div><kbd>{$t("C / 滚轮")}</kbd><span>{$t("重置 / 缩放镜头")}</span></div></div><p class="touch-guide touch-only">{$t("左侧摇杆移动，外圈奔跑。")}<br />{$t("拖动场景转镜头，靠近伙伴后点「找到」。")}<br />{$t("风铃会指出一位伙伴藏身的地方。")}</p><button class="primary-button" onclick={() => runtime.current?.resume()}><Icon name="play" size={16} />{$t("继续寻找")}</button><div class="secondary-row"><button onclick={() => runtime.current?.start()}>{$t("重新开一局")}</button><button onclick={() => runtime.current?.lobby()}>{$t("回到小镇")}</button></div></div></div>
	{:else if game.phase === 'won' || game.phase === 'lost'}
		<div class="modal-backdrop result-backdrop"><div class="modal-card result-card" role="dialog" aria-modal="true" aria-labelledby="result-title" tabindex="-1" {@attach focusPanel}><span class="modal-emblem" class:success={game.phase === 'won'}><Icon name={game.phase === 'won' ? 'paw' : 'clock'} size={37} /></span><div class="eyebrow">{$t(game.phase === 'won' ? 'EVERYONE IS HERE' : 'THE BELL IS RINGING')}</div><div class="dialog-language"><LanguageSelector /></div><h2 id="result-title">{game.phase === 'won' ? $t("一个都没落下！") : $t("风铃响，时间到。")}</h2><p>{game.phase === 'won' ? $t("再来一局，看看这次谁藏得更好。") : $t('notFound', { count: game.total - game.found })}</p><div class="result-metrics"><div><strong>{game.found}<small>/{game.total}</small></strong><span>{$t("找到伙伴")}</span></div><div><strong>{clock(game.elapsed)}</strong><span>{$t("本局用时")}</span></div><div><strong>{3 - game.hints}<small>{$t("次")}</small></strong><span>{$t("风铃提示")}</span></div></div><div class="result-friends">{#each game.targets as target (target.id)}<span style:color={target.found ? target.color : '#b8bdaf'} title={$t('targetStatus', { name: $t(target.name), status: target.found ? "已找到" : "未找到" })}><Icon name={target.found ? 'paw' : 'leaf'} size={25} /></span>{/each}</div>{#if game.phase === 'won' && game.best !== null}<p class="result-best"><Icon name="star" size={14} />{$t("你的最快记录：")}{clock(game.best)}</p>{/if}<button class="primary-button" onclick={() => runtime.current?.start()}><Icon name="rotate" size={17} />{$t("再玩一局")}</button><button class="text-button" onclick={() => runtime.current?.lobby()}>{$t("回到小镇")}</button></div></div>
	{/if}
	<div class="sr-only" aria-live="polite">{$t(game.toast?.key ?? '', game.toast?.params)}</div>
</main>

<style>
	.game-shell { position: relative; height: 100dvh; min-height: 320px; overflow: hidden; color: #354d3c; background: radial-gradient(ellipse at 65% 40%, #e0e9d6, #f4f0e3 72%); font-size: 13px; }
	.play-scene { position: absolute; inset: 0; touch-action: none; }
	.play-scene :global(canvas) { display: block; width: 100%; height: 100%; outline: none; }
	.grain { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(#85947855 .45px, transparent .6px); background-size: 4px 4px; opacity: .12; }
	button, a { -webkit-tap-highlight-color: transparent; outline-offset: 4px; }
	button { cursor: pointer; font: inherit; }
	button:disabled { cursor: default; }
	button:focus-visible, a:focus-visible { outline: 2px solid #b98460; }
	.game-header { position: absolute; z-index: 4; top: 27px; left: 33px; right: 30px; display: flex; align-items: center; justify-content: space-between; pointer-events: none; }
	.game-header > * { pointer-events: auto; }
	.wordmark { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; letter-spacing: 2px; text-shadow: 0 1px 10px #fff8; }
	.brand-paw { width: 43px; height: 43px; display: grid; place-items: center; background: #c98d70; color: #fff5e1; border-radius: 16px 16px 16px 5px; transform: rotate(-6deg); }
	.wordmark small { display: block; font-size: 9px; font-weight: 400; letter-spacing: 1.5px; margin-top: 4px; color: #7b8874; }
	.header-buttons { display: flex; align-items: center; gap: 10px; }
	.round-button { border: 1px solid #fdfcf2b3; border-radius: 50%; width: 39px; height: 39px; display: grid; place-items: center; background: #f8f6e9cc; color: #5c7054; backdrop-filter: blur(6px); }
	.round-button:hover { background: #fffbee; }
	.gallery-link { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #7c8972; text-decoration: none; padding: 9px 12px; }
	.lobby-card { position: absolute; left: 7%; top: 19%; width: 340px; }
	.eyebrow { font-size: 8px; color: #899778; letter-spacing: 2.5px; display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
	.eyebrow > span { height: 1px; width: 25px; background: #9baa85; }
	h1 { font-family: 'STZhongsong', 'Songti SC', 'SimSun', Georgia, serif; font-size: clamp(38px, 3.7vw, 53px); letter-spacing: 2px; line-height: 1.45; margin: 0; font-weight: 700; }
	.lobby-lede { font-size: 12px; line-height: 2; color: #7d8874; margin: 20px 0 29px; }
	.lobby-lede strong { color: #60764f; font-weight: 600; }
	.character-title { display: flex; justify-content: space-between; max-width: 320px; align-items: baseline; color: #78866c; font-size: 11px; }
	.character-title strong { color: #4f6847; margin-left: 4px; }
	.character-title small { font-size: 9px; color: #98a08b; }
	.character-picker { display: flex; gap: 7px; margin: 14px 0 23px; }
	.character-picker button { padding: 0; border: 0; background: none; color: #839074; display: grid; justify-items: center; gap: 6px; }
	.character-picker button span { display: grid; place-items: center; color: var(--fur); width: 34px; height: 34px; background: #fcfaef; border: 2px solid transparent; border-radius: 50%; }
	.character-picker button.selected span { border-color: var(--fur); transform: translateY(-3px); }
	.character-picker button.selected { color: #415f39; }
	.character-picker small { font-size: 9px; }
	.primary-button { border: 0; color: #fff7e3; background: #6f8860; display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; border-radius: 9px; padding: 15px 20px; font-weight: 600; font-size: 14px; letter-spacing: 1px; box-shadow: 0 5px 15px #51674415; }
	.primary-button:hover { background: #5e794f; }
	.primary-button:disabled { background: #a8b597; }
	.start-button { max-width: 322px; }
	.start-button > span { margin-left: auto; font-size: 10px; font-weight: 400; opacity: .65; }
	.lobby-footnote { font-size: 9px; letter-spacing: 1px; color: #99a18e; margin: 11px 0 0; text-align: center; max-width: 322px; }
	.best-record { display: flex; gap: 6px; align-items: center; color: #9b9061; font-size: 10px; margin-top: 15px; }
	.quick-guide { font-size: 10px; color: #8b967f; margin-top: 25px; }
	.quick-guide > div { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
	.quick-guide > div > span { min-width: 49px; }
	kbd { font-family: inherit; font-size: 9px; letter-spacing: .5px; color: #829173; border: 1px solid #bfcbb15e; background: #fbfaee70; border-radius: 4px; padding: 3px 5px; font-weight: 400; }
	.quick-guide p { font-size: 9px; margin: 11px 0; letter-spacing: .5px; }
	.lobby-caption { position: absolute; right: 10%; bottom: 7%; color: #8b987e; font-size: 11px; display: flex; gap: 11px; align-items: center; line-height: 1.9; }
	.lobby-caption strong { font-weight: 400; color: #718566; }
	.load-error p { font-size: 12px; color: #a16b50; }
	.clock-pill { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 11px; padding: 11px 20px; border: 1px solid #fff9e9b3; background: #fff9e9db; backdrop-filter: blur(8px); border-radius: 30px; box-shadow: 0 4px 24px #4f6e4810; }
	.clock-pill span { font-variant-numeric: tabular-nums; font-size: 23px; font-weight: 650; letter-spacing: 1px; }
	.clock-pill.urgent { color: #b77850; background: #fff0dcd9; }
	.objective { position: absolute; left: 31px; top: 99px; width: 232px; padding: 16px 17px 14px; border: 1px solid #fffbedb3; background: #fbf9e9d9; border-radius: 15px; backdrop-filter: blur(8px); }
	.objective-title { display: flex; align-items: baseline; justify-content: space-between; font-size: 12px; color: #73836a; margin-bottom: 11px; }
	.objective-title strong { font-size: 20px; color: #4d6943; }
	.objective-title strong small { font-size: 11px; color: #98a48d; font-weight: 400; }
	.target-row { display: flex; justify-content: space-between; gap: 7px; }
	.target-badge { display: grid; gap: 5px; justify-items: center; }
	.target-badge > span { width: 29px; height: 29px; color: var(--fur); border: 1px dashed #b4c0a5; border-radius: 50%; display: grid; place-items: center; }
	.target-badge > small { color: #99a18b; font-size: 9px; }
	.target-badge.found > span { background: #cbdcb8; color: #526e42; border: 1px solid #cbdcb8; }
	.target-badge.found > small { color: #596f4a; }
	.minimap { position: absolute; right: 31px; top: 96px; width: 152px; padding: 11px; border: 1px solid #fff9e6bb; background: #fff9e5b8; backdrop-filter: blur(8px); border-radius: 17px; }
	.map-title { display: flex; justify-content: space-between; font-size: 10px; color: #7f8f70; margin: 0 3px 6px; }
	.map-title small { font-size: 8px; color: #9cab8c; }
	.minimap svg { display: block; width: 100%; }
	.stamina { position: absolute; left: 32px; bottom: 98px; width: 169px; }
	.stamina > div:first-child { display: flex; justify-content: space-between; color: #586d4e; font-size: 10px; margin-bottom: 7px; text-shadow: 0 1px 4px #fffe; }
	.stamina small { color: #89967a; font-size: 9px; }
	.stamina-track { height: 7px; background: #fdfae3b3; border: 1px solid #fffae580; border-radius: 6px; overflow: hidden; }
	.stamina-track > span { display: block; height: 100%; background: #81965e; border-radius: 6px; transition: width 80ms linear; }
	.stamina-track > span.low { background: #c89a58; }
	.action-buttons { position: absolute; right: 31px; bottom: 31px; display: flex; gap: 12px; align-items: center; }
	.catch-button, .hint-button { display: flex; align-items: center; justify-content: center; gap: 9px; border-radius: 30px; border: 1px solid #f9f6e6; height: 54px; padding: 0 19px; box-shadow: 0 4px 14px #3f5c3020; }
	.catch-button { color: #fff9e4; background: #6c8a58; min-width: 178px; font-weight: 600; }
	.catch-button kbd { color: #fff4d0; background: #fff1; border-color: #fff5; }
	.catch-button:disabled { color: #9ba58e; background: #f2f0dee0; box-shadow: none; font-weight: 400; }
	.catch-button:disabled kbd { color: #abb29d; border-color: #bdc4ac; }
	.hint-button { color: #8f7a43; background: #fcf4d7ed; font-size: 11px; }
	.hint-button:disabled { color: #a7ad98; background: #ecefdde0; box-shadow: none; }
	.camera-button { position: absolute; right: 40px; bottom: 104px; border: 1px solid #fff9e9bd; background: #fbf8e6b3; color: #718366; border-radius: 50%; width: 37px; height: 37px; display: grid; place-items: center; }
	.movement-guide { position: absolute; bottom: 35px; left: 32px; font-size: 10px; color: #627654; padding: 9px 12px; background: #fcf9e6cc; border-radius: 8px; margin: 0; }
	.movement-guide span { color: #a4b296; margin: 0 8px; }
	.toast { position: absolute; bottom: 122px; left: 50%; transform: translateX(-50%); background: #fff9e8e8; border: 1px solid #e7e5c6; border-radius: 24px; padding: 12px 21px; display: flex; align-items: center; gap: 9px; font-size: 12px; color: #7b8054; white-space: nowrap; box-shadow: 0 5px 23px #52613917; pointer-events: none; }
	.countdown-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; background: #e8efdc30; text-align: center; text-shadow: 0 2px 12px #fff9; }
	.countdown-overlay > span { color: #657c55; font-size: 13px; letter-spacing: 3px; }
	.countdown-overlay strong { font-family: Georgia, serif; font-weight: 400; font-size: 100px; color: #607c50; margin: 9px; }
	.countdown-overlay p { color: #7d8d6d; font-size: 12px; letter-spacing: 1px; }
	.modal-backdrop { position: absolute; z-index: 10; inset: 0; background: #33463438; backdrop-filter: blur(7px); display: grid; place-items: center; padding: 20px; }
	.modal-card { width: 364px; max-width: 100%; max-height: calc(100dvh - 40px); overflow-y: auto; padding: 31px; border-radius: 23px; background: #f8f5e9; text-align: center; box-shadow: 0 20px 90px #29442626; outline: none; }
	.modal-emblem { display: grid; place-items: center; width: 68px; height: 68px; border-radius: 50%; background: #e9ecdc; color: #87986d; margin: 0 auto 20px; }
	.modal-emblem.success { background: #eadab7; color: #b59151; }
	.modal-card .eyebrow { justify-content: center; margin-bottom: 12px; font-size: 7px; letter-spacing: 2px; }
	.modal-card h2 { font-family: 'STZhongsong', 'Songti SC', 'SimSun', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px; margin: 0 0 12px; }
	.modal-card > p { font-size: 11px; color: #90977e; line-height: 1.9; }
	.pause-guide { margin: 24px 0; text-align: left; }
	.pause-guide > div { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 10px; color: #869477; }
	.secondary-row { display: flex; justify-content: space-around; margin-top: 15px; }
	.secondary-row button, .text-button { color: #8c977e; background: none; border: 0; font-size: 10px; padding: 7px; }
	.result-card { width: 400px; }
	.result-metrics { display: flex; justify-content: space-around; padding: 23px 0; margin: 15px 0; border-top: 1px solid #e5e8d8; border-bottom: 1px solid #e5e8d8; }
	.result-metrics > div { display: grid; gap: 8px; }
	.result-metrics strong { font-size: 23px; font-weight: 500; color: #647b50; font-variant-numeric: tabular-nums; }
	.result-metrics small { font-size: 12px; color: #a1ad91; }
	.result-metrics span { font-size: 9px; color: #95a087; }
	.result-friends { display: flex; gap: 14px; justify-content: center; margin-bottom: 18px; }
	.result-card .result-best { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 10px; color: #9b8f62; margin-bottom: 22px; }
	.text-button { margin-top: 12px; }
	.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
	.touch-only { display: none; }
	@media (max-width: 1000px) and (min-width: 721px) { .lobby-card { left: 5%; width: 315px; top: 16%; } h1 { font-size: 39px; } .objective { width: 215px; } .minimap { width: 130px; } .movement-guide { font-size: 8px; } .action-buttons { gap: 6px; } .hint-button { padding: 0 13px; } .catch-button { min-width: 140px; } }
	@media (pointer: coarse) { .touch-only { display: block; } .desktop-only { display: none !important; } .touch-guide { font-size: 10px; color: #89987a; line-height: 1.9; margin: 20px 0 0; } .modal-card .touch-guide { margin-bottom: 24px; } .touch-controls { position: absolute; bottom: 23px; left: 24px; } .stamina { bottom: 178px; left: 28px; width: 110px; } .action-buttons { bottom: 34px; right: 27px; flex-direction: column; align-items: flex-end; gap: 13px; } .catch-button { width: 83px; height: 83px; min-width: 0; padding: 9px; border-radius: 50%; flex-direction: column; gap: 4px; font-size: 10px; } .hint-button { width: 64px; height: 56px; padding: 5px; border-radius: 20px; font-size: 9px; gap: 3px; flex-direction: column; margin-right: 9px; } .camera-button { right: 39px; bottom: 212px; } .toast { bottom: 265px; font-size: 10px; padding: 10px 13px; max-width: calc(100% - 35px); white-space: normal; text-align: center; } }
	@media (max-width: 720px) { .game-header { top: 18px; left: 19px; right: 18px; } .wordmark { font-size: 17px; gap: 8px; } .brand-paw { width: 35px; height: 35px; border-radius: 12px 12px 12px 4px; } .wordmark small { font-size: 7px; letter-spacing: 1px; } .round-button { width: 34px; height: 34px; } .header-buttons { gap: 6px; } .gallery-link { font-size: 10px; padding: 8px 3px; } .lobby-card { left: 18px; right: 18px; width: auto; top: auto; bottom: 18px; padding: 22px; background: #f7f5e9ed; border: 1px solid #fff8; border-radius: 23px; backdrop-filter: blur(9px); max-height: calc(100dvh - 105px); overflow-y: auto; } .lobby-card .eyebrow { margin-bottom: 12px; font-size: 7px; } h1 { font-size: 29px; line-height: 1.35; letter-spacing: 1px; } .lobby-lede { font-size: 11px; margin: 12px 0 18px; } .lobby-lede br { display: none; } .character-picker { justify-content: space-between; gap: 3px; margin: 13px 0 21px; } .character-picker button span { width: 29px; height: 29px; } .character-picker small { font-size: 8px; } .start-button { max-width: none; padding: 14px 17px; font-size: 13px; } .lobby-footnote { max-width: none; font-size: 8px; } .quick-guide { margin-top: 17px; } .lobby-caption { display: none; } .in-round .wordmark > div { display: none; } .clock-pill { gap: 7px; padding: 8px 13px; } .clock-pill span { font-size: 19px; } .objective { left: 17px; top: 73px; padding: 10px 11px; width: 200px; border-radius: 13px; } .objective-title { font-size: 10px; margin-bottom: 8px; } .objective-title strong { font-size: 15px; } .target-badge > span { width: 24px; height: 24px; } .target-badge > small { font-size: 8px; } .minimap { right: 17px; top: 73px; width: 108px; padding: 8px; border-radius: 13px; } .map-title { font-size: 8px; margin-bottom: 4px; } .map-title small { font-size: 7px; } .modal-card { padding: 26px; } .modal-card h2 { font-size: 25px; } .modal-emblem { width: 58px; height: 58px; margin-bottom: 16px; } .result-metrics strong { font-size: 21px; } }
	@media (max-height: 660px) { .lobby-card { top: 100px; bottom: 18px; max-height: calc(100dvh - 115px); overflow-y: auto; padding-right: 12px; } .lobby-card .eyebrow { margin-bottom: 10px; } h1 { font-size: 34px; } .lobby-lede { margin: 10px 0 15px; } .quick-guide { margin-top: 15px; } .character-picker { margin-bottom: 16px; } .objective { padding: 9px 12px; } .minimap { width: 100px; } }
	@media (max-width: 359px) { .objective { width: 178px; left: 12px; } .target-row { gap: 4px; } .minimap { width: 88px; right: 12px; } .character-picker button span { width: 25px; height: 25px; } .modal-card .touch-guide { margin-bottom: 22px; } }
	.dialog-language { margin: 0 0 14px; }
	.english h1 { font-size: clamp(32px, 3.1vw, 44px); letter-spacing: 0; }
	.english .wordmark { letter-spacing: 0; }
	.english .character-picker { gap: 3px; justify-content: space-between; }
	.english .character-picker small { font-size: 8px; }
	.english .target-row { gap: 3px; }
	.english .target-badge small { font-size: 8px; }
	.english .modal-card h2 { letter-spacing: 0; font-family: Georgia, serif; }
	.english .pause-guide > div { gap: 8px; }
	.english .pause-guide kbd { flex-shrink: 0; }
	.toast { max-width: calc(100% - 40px); white-space: normal; text-align: center; }
	@media (max-width: 720px) {
		.wordmark { letter-spacing: 0; }
		.wordmark small { max-width: 120px; letter-spacing: 0; }
		.english .wordmark { font-size: 14px; }
		.game-header :global(.language-selector) { position: absolute; right: 0; top: 43px; }
		.in-round .game-header :global(.language-selector) { top: -7px; right: 82px; }
		.in-round .clock-pill { left: 48px; transform: none; padding: 6px 9px; gap: 5px; }
		.in-round .clock-pill span { font-size: 16px; }
		.in-round .game-header { top: 22px; }
		.in-round .minimap { top: 85px; }
		.english h1 { font-size: 29px; }
		.english .stamina { width: 145px; }
		.english .movement-guide { max-width: calc(100% - 64px); }
	}
	@media (max-width: 380px) {
		.in-round .game-header :global(.language-selector) { top: 37px; right: 0; }
		.in-round .minimap { top: 97px; }
	}
	@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
</style>
