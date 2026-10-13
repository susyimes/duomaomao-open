import {
	ACESFilmicToneMapping, AnimationMixer, Box3, Color, CylinderGeometry, DirectionalLight,
	Group, HemisphereLight, Mesh, MeshStandardMaterial, PCFSoftShadowMap, PerspectiveCamera,
	Scene, SRGBColorSpace, TextureLoader, Vector3, WebGLRenderer
} from 'three';
import type { AnimationClip, Object3D, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type ViewMode = 'island' | 'characters' | 'props';
export type Pose = 'idle' | 'walk' | 'celebrate';
export type Selection = { mode: ViewMode; id?: string };
type Actor = { mixer: AnimationMixer; clips: AnimationClip[] };
type Events = { onStatus: (state: 'loading' | 'ready' | 'error') => void };

export function disposeModel(root: Object3D) {
	const geometries = new Set<Mesh['geometry']>();
	const materials = new Set<MeshStandardMaterial>();
	root.traverse(object => {
		if (!(object instanceof Mesh)) return;
		geometries.add(object.geometry);
		for (const surface of Array.isArray(object.material) ? object.material : [object.material]) materials.add(surface);
	});
	for (const geometry of geometries) geometry.dispose();
	for (const surface of materials) surface.dispose();
	root.clear();
}

export function createPreview(host: HTMLDivElement, events: Events) {
	const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
	renderer.outputColorSpace = SRGBColorSpace;
	renderer.toneMapping = ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.25;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFSoftShadowMap;
	renderer.domElement.setAttribute('aria-label', '可旋转的风铃岛三维场景');
	host.appendChild(renderer.domElement);
	const scene = new Scene();
	const camera = new PerspectiveCamera(36, 1, 0.05, 220);
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.085;
	controls.minPolarAngle = 0.25;
	controls.maxPolarAngle = Math.PI / 2.08;
	controls.autoRotateSpeed = 0.35;
	const fill = new HemisphereLight('#fff7e5', '#aeb69c', 2.6);
	const sun = new DirectionalLight('#fff0d3', 3.2);
	sun.position.set(-10, 22, 14);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -18;
	sun.shadow.camera.right = 18;
	sun.shadow.camera.top = 18;
	sun.shadow.camera.bottom = -18;
	sun.shadow.camera.far = 65;
	sun.shadow.bias = -0.00015;
	sun.shadow.normalBias = 0.035;
	sun.shadow.blurSamples = 8;
	scene.add(fill, sun);
	const loader = new GLTFLoader();
	const textureLoader = new TextureLoader();
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	let disposed = false, sequence = 0, frame = 0, lastFrame = performance.now(), elapsed = 0;
	let current: Group | null = null;
	let actors: Actor[] = [];
	let animated: Object3D[] = [];
	let grass: Texture | null = null;
	let grassRequest: Promise<Texture> | null = null;
	let activeMode: ViewMode = 'island';
	let pose: Pose = 'idle';
	let tween: { eye: Vector3; target: Vector3 } | null = null;
	const initial = { eye: new Vector3(24, 22, 29), target: new Vector3(0, 0, 0) };
	let currentBounds: Box3 | null = null;

	const status = (value: 'loading' | 'ready' | 'error') => {
		if (disposed) return;
		host.dataset.state = value;
		events.onStatus(value);
	};
	const getGrass = () => {
		grassRequest ??= textureLoader.loadAsync('/assets/textures/meadow.png').then(texture => {
			texture.colorSpace = SRGBColorSpace;
			texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
			if (disposed) texture.dispose();
			else grass = texture;
			return texture;
		}).catch(error => { grassRequest = null; throw error; });
		return grassRequest;
	};

	const setPose = (value: Pose) => {
		pose = value;
		for (const actor of actors) {
			actor.mixer.stopAllAction();
			const clip = actor.clips.find(item => item.name === (activeMode === 'island' ? 'idle' : value));
			if (clip) actor.mixer.clipAction(clip).reset().play();
		}
	};

	const fit = (bounds: Box3, immediate = false) => {
		const center = bounds.getCenter(new Vector3());
		const size = bounds.getSize(new Vector3());
		const radius = size.length() / 2;
		const aspectFactor = Math.min(camera.aspect, 1.35);
		const fitFactor = activeMode === 'island' ? (camera.aspect < 1.1 ? 0.76 : 0.65) : 1.02;
		const distance = radius / Math.sin(camera.fov * Math.PI / 360) / Math.min(aspectFactor, 1) * fitFactor;
		const direction = activeMode === 'island' ? new Vector3(0.81, 0.8, 1) : new Vector3(0.38, 0.28, 1);
		if (activeMode === 'island') center.y = 0.4;
		initial.target.copy(center);
		initial.eye.copy(center).add(direction.normalize().multiplyScalar(distance));
		controls.minDistance = Math.max(0.8, radius * 0.45);
		controls.maxDistance = distance * 2;
		if (immediate) { tween = null; camera.position.copy(initial.eye); controls.target.copy(initial.target); controls.update(); }
		else tween = { eye: initial.eye.clone(), target: initial.target.clone() };
	};

	const resize = () => {
		const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
		if (currentBounds) fit(currentBounds, true);
	};
	const observer = new ResizeObserver(resize);
	observer.observe(host);
	resize();
	const cancelTween = () => { tween = null; };
	controls.addEventListener('start', cancelTween);

	async function show(selection: Selection) {
		const token = ++sequence;
		status('loading');
		const next = new Group();
		const nextActors: Actor[] = [];
		try {
			const path = selection.mode === 'island' ? 'village' : selection.mode === 'characters' ? `player-${selection.id ?? 'fox'}` : selection.id ?? 'treehouse';
			const gltf = await loader.loadAsync(`/assets/models/${path}.glb`);
			next.add(gltf.scene);
			if (gltf.animations.length) nextActors.push({ mixer: new AnimationMixer(gltf.scene), clips: gltf.animations });
			if (selection.mode === 'island') {
				for (const [id, x, z, angle] of [['fox', 0.7, 3.1, 0.6], ['rabbit', -1, 0.4, -0.4]] as const) {
					const friend = await loader.loadAsync(`/assets/models/player-${id}.glb`);
					friend.scene.position.set(x, 0.04, z);
					friend.scene.rotation.y = angle;
					friend.scene.scale.setScalar(0.85);
					next.add(friend.scene);
					nextActors.push({ mixer: new AnimationMixer(friend.scene), clips: friend.animations });
				}
			}
			const needsGrass = selection.mode === 'island' || path === 'island';
			const grassMap = needsGrass ? await getGrass() : null;
			if (disposed || token !== sequence) { disposeModel(next); return; }
			next.traverse(object => {
				if (!(object instanceof Mesh)) return;
				object.castShadow = true;
				object.receiveShadow = true;
				const surfaces = Array.isArray(object.material) ? object.material : [object.material];
				for (const surface of surfaces) {
					if (!(surface instanceof MeshStandardMaterial)) continue;
					surface.flatShading = true;
					if (surface.name === 'meadow_grass' && grassMap) { surface.map = grassMap; surface.color.set('#ffffff'); }
					if (surface.name.includes('water')) { surface.roughness = 0.28; surface.metalness = 0.06; object.castShadow = false; }
					surface.needsUpdate = true;
				}
			});
			const bounds = new Box3().setFromObject(next);
			if (selection.mode !== 'island') {
				const size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
				const radius = Math.max(size.x, size.z) * 0.75 + 0.3;
				const platform = new Mesh(new CylinderGeometry(radius, radius * 1.015, 0.12, 64), new MeshStandardMaterial({ color: '#dfd9c5', roughness: 1 }));
				platform.position.set(center.x, bounds.min.y - 0.08, center.z);
				platform.receiveShadow = true;
				next.add(platform);
			}
			for (const actor of actors) { actor.mixer.stopAllAction(); actor.mixer.uncacheRoot(actor.mixer.getRoot()); }
			if (current) { scene.remove(current); disposeModel(current); }
			current = next;
			actors = nextActors;
			activeMode = selection.mode;
			animated = [];
			next.traverse(object => {
				if (object.userData.animated) { object.userData.baseY = object.position.y; animated.push(object); }
			});
			scene.add(next);
			currentBounds = bounds;
			fit(bounds, true);
			setPose(pose);
			host.dataset.asset = path;
			status('ready');
		} catch (error) {
			disposeModel(next);
			if (!disposed && token === sequence) { console.error('Original asset preview could not load:', error); status('error'); }
		}
	}

	const tick = () => {
		if (disposed) return;
		frame = requestAnimationFrame(tick);
		const now = performance.now(), delta = Math.min((now - lastFrame) / 1000, 0.05);
		lastFrame = now;
		if (document.hidden) return;
		elapsed += delta;
		if (!reducedMotion.matches) {
			for (const actor of actors) actor.mixer.update(delta);
			for (const object of animated) {
				if (object.userData.animated === 'spin') object.rotation.z += delta * 0.3;
				if (object.userData.animated === 'float') object.position.y = object.userData.baseY + Math.sin(elapsed * 0.45 + object.position.x) * 0.1;
			}
		}
		if (tween) {
			const step = 1 - Math.exp(-5 * delta);
			camera.position.lerp(tween.eye, step);
			controls.target.lerp(tween.target, step);
			if (camera.position.distanceToSquared(tween.eye) < 0.0001) tween = null;
		}
		controls.update(delta);
		renderer.render(scene, camera);
	};
	tick();

	return {
		show, setPose,
		setAutoRotate(value: boolean) { controls.autoRotate = value && !reducedMotion.matches; },
		setEvening(value: boolean) {
			sun.color.set(value ? '#f7c38c' : '#fff0d3');
			sun.intensity = value ? 2.4 : 3.2;
			fill.color.set(value ? '#b9c2dd' : '#fff7e5');
			fill.intensity = value ? 1.5 : 2.6;
			renderer.toneMappingExposure = value ? 1.05 : 1.25;
		},
		reset() { tween = { eye: initial.eye.clone(), target: initial.target.clone() }; },
		zoom(factor: number) {
			const offset = camera.position.clone().sub(controls.target);
			offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor)));
			tween = { eye: controls.target.clone().add(offset), target: controls.target.clone() };
		},
		focus(position: [number, number, number]) {
			if (activeMode !== 'island') return;
			const target = new Vector3(...position);
			tween = { eye: target.clone().add(new Vector3(10, 8, 13)), target };
		},
		destroy() {
			disposed = true;
			sequence++;
			cancelAnimationFrame(frame);
			observer.disconnect();
			controls.removeEventListener('start', cancelTween);
			controls.dispose();
			for (const actor of actors) { actor.mixer.stopAllAction(); actor.mixer.uncacheRoot(actor.mixer.getRoot()); }
			if (current) disposeModel(current);
			grass?.dispose();
			sun.shadow.map?.dispose();
			renderer.dispose();
			scene.clear();
			renderer.domElement.remove();
		}
	};
}

export type PreviewController = ReturnType<typeof createPreview>;
