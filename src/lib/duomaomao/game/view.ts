import {
	ACESFilmicToneMapping, AnimationMixer, Color, DirectionalLight, Group, HemisphereLight, Mesh,
	MeshBasicMaterial, MeshStandardMaterial, PCFSoftShadowMap, PerspectiveCamera, RingGeometry,
	Scene, Sprite, SpriteMaterial, CanvasTexture, CircleGeometry, Box3, SRGBColorSpace, TextureLoader, Vector3, WebGLRenderer
} from 'three';
import type { AnimationAction, Object3D, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { characters, type CharacterId } from '../assets/characters.ts';
import type { GameWorld } from '../assets/collision.ts';
import { distance, groundHeight } from './physics.ts';
import type { SinglePlayerRound } from './round.ts';
import type { PlayerInput } from './input.ts';
import { disposeModel } from '../preview.ts';
import { optimizeRigidParts } from './optimize.ts';

type Actor = { root: Group; mixer: AnimationMixer; actions: Record<string, AnimationAction>; pose: string; label: Sprite; shadow: Mesh<CircleGeometry, MeshBasicMaterial>; footOffset: number };
export type GameView = ReturnType<typeof createGameView>;

export function createGameView(host: HTMLDivElement, progress: (amount: number) => void) {
	const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
	const context = renderer.getContext(), rendererInfo = context.getExtension('WEBGL_debug_renderer_info');
	const rendererName = rendererInfo ? String(context.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)) : '';
	const softwareRenderer = /swiftshader|llvmpipe|software/i.test(rendererName);
	renderer.setPixelRatio(softwareRenderer ? 0.65 : Math.min(window.devicePixelRatio, 1.5));
	host.dataset.renderer = softwareRenderer ? 'software' : 'hardware';
	renderer.outputColorSpace = SRGBColorSpace;
	renderer.toneMapping = ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.16;
	renderer.shadowMap.enabled = !softwareRenderer;
	renderer.shadowMap.type = PCFSoftShadowMap;
	renderer.domElement.setAttribute('aria-label', '风铃岛单人躲猫猫游戏场景');
	renderer.domElement.tabIndex = 0;
	host.appendChild(renderer.domElement);
	const scene = new Scene();
	const camera = new PerspectiveCamera(52, 1, 0.1, 180);
	camera.position.set(24, 24, 30);
	const sun = new DirectionalLight('#fff0d5', 3);
	sun.position.set(-10, 22, 14); sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 65 });
	sun.shadow.bias = -0.00015; sun.shadow.normalBias = 0.035;
	sun.shadow.autoUpdate = false;
	scene.add(sun, new HemisphereLight('#fff7e5', '#aeb69c', 2.6));
	const actors = new Map<CharacterId, Actor>();
	const textures = new Set<Texture>();
	const scenery = new Group(); scene.add(scenery);
	let disposed = false, failed = false, visualTime = 0, loaded = 0, mode = '', pulseUntil = 0;
	let grass: Texture | null = null;
	const loader = new GLTFLoader(), animated: Object3D[] = [];
	const lookAt = new Vector3(0, 0.5, 0);
	const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
	const tickLoaded = () => { loaded++; if (!disposed) progress(loaded / 11); };

	function label(text: string, color = '#405c46') {
		const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 80;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.roundRect(4, 4, 248, 70, 28); ctx.fill();
		ctx.fillStyle = color; ctx.font = '600 32px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.fillText(text, 128, 40);
		const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; textures.add(texture);
		const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
		sprite.scale.set(1.18, 0.37, 1); sprite.renderOrder = 10;
		return sprite;
	}

	function prepare(root: Object3D, castsShadow = true) {
		root.traverse(object => {
			if (!(object instanceof Mesh)) return;
			object.castShadow = castsShadow; object.receiveShadow = true;
			for (const surface of Array.isArray(object.material) ? object.material : [object.material]) {
				if (!(surface instanceof MeshStandardMaterial)) continue;
				surface.flatShading = true;
				if (surface.name === 'meadow_grass' && grass) { surface.map = grass; surface.color.set('#ffffff'); object.castShadow = false; }
				if (surface.name.includes('water')) { surface.roughness = 0.28; surface.metalness = 0.06; object.castShadow = false; }
				surface.needsUpdate = true;
			}
		});
	}

	const ready = (async () => {
		try {
			const worldRequest = fetch('/assets/world.json').then(response => { if (!response.ok) throw new Error('World data unavailable'); return response.json() as Promise<GameWorld>; }).then(world => { tickLoaded(); return world; });
			const textureRequest = new TextureLoader().loadAsync('/assets/textures/meadow.png').then(texture => {
				if (disposed || failed) { texture.dispose(); return; }
				texture.colorSpace = SRGBColorSpace; texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
				textures.add(texture); grass = texture; tickLoaded();
			});
			const villageRequest = loader.loadAsync('/assets/models/village.glb').then(gltf => {
				if (disposed || failed) { disposeModel(gltf.scene); return; }
				scenery.add(gltf.scene);
				gltf.scene.traverse(object => { if (object.userData.animated) { object.userData.baseY = object.position.y; animated.push(object); } });
				tickLoaded();
			});
			const actorRequests = characters.map(async definition => {
				const gltf = await loader.loadAsync(`/assets/models/player-${definition.id}.glb`);
				if (disposed || failed) { disposeModel(gltf.scene); return; }
				const root = gltf.scene;
				root.scale.setScalar(0.82); root.visible = false;
				const footOffset = new Box3().setFromObject(root).min.y;
				optimizeRigidParts(root, new Set(gltf.animations.flatMap(clip => clip.tracks.map(track => track.name.split('.')[0]))));
				prepare(root, false);
				const mixer = new AnimationMixer(root), actions = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
				const tag = label(definition.name);
				tag.position.y = 2.55; root.add(tag);
				const shadow = new Mesh(new CircleGeometry(0.37, 24), new MeshBasicMaterial({ color: '#56644a', opacity: 0.18, transparent: true, depthWrite: false }));
				shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 0.8, 1); shadow.visible = false; scene.add(shadow);
				actors.set(definition.id, { root, mixer, actions, pose: '', label: tag, shadow, footOffset });
				scene.add(root); tickLoaded();
			});
			const [world] = await Promise.all([worldRequest, textureRequest, villageRequest, ...actorRequests]);
			if (disposed) return null;
			if (world.version !== 1 || !Array.isArray(world.solids)) throw new Error('Unsupported world data');
			prepare(scenery);
			optimizeRigidParts(scenery);
			sun.shadow.needsUpdate = true;
			progress(1);
			return world;
		} catch (error) { failed = true; if (!disposed) throw error; return null; }
	})();

	const playerMarker = new Mesh(new RingGeometry(0.32, 0.42, 40), new MeshBasicMaterial({ color: '#fff5c4', transparent: true, opacity: 0.85, depthTest: false, depthWrite: false }));
	playerMarker.rotation.x = -Math.PI / 2; playerMarker.renderOrder = 8; scene.add(playerMarker);
	const hintMarker = new Mesh(new RingGeometry(0.7, 0.82, 48), new MeshBasicMaterial({ color: '#e6b551', transparent: true, opacity: 0.85, depthTest: false, depthWrite: false }));
	hintMarker.rotation.x = -Math.PI / 2; hintMarker.visible = false; scene.add(hintMarker);
	const hintLabel = label('叮——', '#967127'); hintLabel.visible = false; scene.add(hintLabel);
	const searchMarker = new Mesh(new RingGeometry(0.95, 1, 48), new MeshBasicMaterial({ color: '#fff3c5', transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
	searchMarker.rotation.x = -Math.PI / 2; scene.add(searchMarker);

	const resize = () => {
		const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
		renderer.setSize(width, height); camera.aspect = width / height;
		camera.updateProjectionMatrix(); mode = '';
	};
	const observer = new ResizeObserver(resize); observer.observe(host); resize();
	function pose(actor: Actor, name: string) {
		if (actor.pose === name) return;
		if (actor.pose) actor.actions[actor.pose]?.fadeOut(0.14);
		actor.actions[name]?.reset().fadeIn(0.14).play(); actor.pose = name;
	}

	function render(round: SinglePlayerRound | null, input: PlayerInput, dt: number) {
		if (disposed) return;
		const state = round?.state, phase = state?.phase ?? 'lobby', stopped = phase === 'paused';
		if (!stopped) visualTime += dt;
		const overview = ['lobby', 'won', 'lost'].includes(phase);
		const cameraMode = overview ? 'overview' : 'follow';
		if (cameraMode !== mode) {
			mode = cameraMode;
			if (overview) {
				if (camera.aspect > 1) camera.setViewOffset(host.clientWidth, host.clientHeight, -host.clientWidth * 0.12, 0, host.clientWidth, host.clientHeight);
				else camera.setViewOffset(host.clientWidth, host.clientHeight, 0, host.clientHeight * 0.21, host.clientWidth, host.clientHeight);
			} else camera.clearViewOffset();
		}
		if (state && round) {
			for (const [id, actor] of actors) {
				const isPlayer = id === state.playerId;
				const hider = state.hiders.find(friend => friend.id === id);
				if (isPlayer) {
					actor.root.visible = true;
					actor.root.position.set(state.player.x, groundHeight(state.player, round.world) - actor.footOffset, state.player.z);
					const angle = Math.atan2(Math.sin(state.facing - actor.root.rotation.y), Math.cos(state.facing - actor.root.rotation.y));
					actor.root.rotation.y += angle * (1 - Math.exp(-16 * dt));
					pose(actor, phase === 'won' ? 'celebrate' : state.moving ? 'walk' : 'idle');
					actor.mixer.timeScale = state.sprinting ? 1.55 : 1;
					actor.label.visible = !overview; actor.label.material.opacity = 0.85;
				} else if (hider && phase !== 'lobby' && phase !== 'countdown' && !(phase === 'paused' && state.previousPhase === 'countdown')) {
					const celebrating = hider.found && (state.elapsed - hider.foundAt < 1.1 || phase === 'won');
					actor.root.visible = celebrating || (phase === 'lost' && !hider.found) || round.isVisible(hider);
					actor.root.position.set(hider.position.x, groundHeight(hider.position, round.world) - actor.footOffset, hider.position.z);
					actor.root.rotation.y = Math.atan2(state.player.x - hider.position.x, state.player.z - hider.position.z);
					actor.label.visible = celebrating || phase === 'lost' || distance(state.player, hider.position) < 2.7;
					pose(actor, celebrating ? 'celebrate' : 'idle'); actor.mixer.timeScale = 1;
				} else actor.root.visible = false;
				actor.shadow.visible = actor.root.visible;
				actor.shadow.position.set(actor.root.position.x, actor.root.position.y + actor.footOffset + 0.008, actor.root.position.z);
				if (actor.root.visible && !stopped && !motionPreference.matches) actor.mixer.update(dt);
			}
			const playerY = groundHeight(state.player, round.world);
			playerMarker.position.set(state.player.x, playerY + 0.02, state.player.z);
			playerMarker.visible = !overview;
			if (state.hint) {
				hintMarker.visible = hintLabel.visible = true;
				hintMarker.position.set(state.hint.position.x, groundHeight(state.hint.position, round.world) + 0.06, state.hint.position.z);
				hintMarker.scale.setScalar(1 + Math.sin(visualTime * 5) * 0.12);
				hintLabel.position.copy(hintMarker.position).add(new Vector3(0, 2.8, 0));
			} else hintMarker.visible = hintLabel.visible = false;
			const pulse = Math.max(0, pulseUntil - visualTime);
			searchMarker.material.opacity = pulse * 0.9;
			searchMarker.scale.setScalar((1 - pulse / 0.55) * 1.35);
			searchMarker.position.copy(playerMarker.position);
			const desiredTarget = overview ? new Vector3(0, 0.4, 0) : new Vector3(state.player.x, playerY + 0.8, state.player.z);
			const zoom = input.distance + (camera.aspect < 0.8 ? 1.4 : 0);
			const offset = overview ? new Vector3(24, 26, 31).multiplyScalar(camera.aspect < 0.8 ? 1.12 : 0.9)
				: new Vector3(Math.sin(input.yaw) * Math.cos(input.pitch) * zoom, Math.sin(input.pitch) * zoom, Math.cos(input.yaw) * Math.cos(input.pitch) * zoom);
			const smoothing = 1 - Math.exp(-(overview ? 3 : 8) * dt);
			lookAt.lerp(desiredTarget, smoothing);
			camera.position.lerp(desiredTarget.clone().add(offset), smoothing);
		}
		camera.lookAt(lookAt);
		if (!stopped && !motionPreference.matches) for (const object of animated) {
			if (object.userData.animated === 'spin') object.rotation.z += dt * 0.3;
			else object.position.y = object.userData.baseY + Math.sin(visualTime * 0.45 + object.position.x) * 0.1;
		}
		renderer.render(scene, camera);
	}

	return { ready, canvas: renderer.domElement, render,
		search() { pulseUntil = visualTime + 0.55; },
		destroy() {
			disposed = true; observer.disconnect();
			for (const actor of actors.values()) { actor.mixer.stopAllAction(); actor.mixer.uncacheRoot(actor.root); actor.label.material.dispose(); actor.shadow.geometry.dispose(); actor.shadow.material.dispose(); disposeModel(actor.root); }
			disposeModel(scenery);
			for (const marker of [playerMarker, hintMarker, searchMarker]) { marker.geometry.dispose(); marker.material.dispose(); }
			hintLabel.material.dispose();
			for (const texture of textures) texture.dispose();
			sun.shadow.map?.dispose(); renderer.dispose(); scene.clear(); renderer.domElement.remove();
		}
	};
}
