export type Point2 = { x: number; z: number };
export type Solid = Point2 & { id: string; kind: 'circle' | 'box'; radius: number; halfX: number; halfZ: number; yaw: number; height: number };
export type GameWorld = {
	version: 1;
	radius: number;
	spawn: Point2;
	solids: Solid[];
	pond: Point2 & { radiusX: number; radiusZ: number };
	bridge: Point2 & { halfLength: number; halfWidth: number; yaw: number };
};

export function emptyGameWorld(): GameWorld {
	return { version: 1, radius: 10.35, spawn: { x: 0, z: 8.2 }, solids: [],
		pond: { x: -4.1, z: 3.5, radiusX: 2.32, radiusZ: 1.63 },
		bridge: { x: -4.1, z: 3.5, halfLength: 2.6, halfWidth: 0.62, yaw: 0.1 } };
}

/** Gameplay footprints follow the same transform as each placed art object. */
export function placedSolids(name: string, x: number, z: number, yaw: number, scale: number, id: string): Solid[] {
	let kind: Solid['kind'] = 'box', a = 0, b = 0, height = 1;
	if (name.startsWith('cottage_')) { a = 1.22; b = 1.15; height = 3.2; }
	else if (name === 'treehouse') { kind = 'circle'; a = 1.46; height = 5.7; }
	else if (name === 'windmill') { kind = 'circle'; a = 0.94; height = 4.2; }
	else if (name === 'market_stall') { a = 1.28; b = 0.73; height = 2.5; }
	else if (name.startsWith('tree_')) { kind = 'circle'; a = 0.22; height = 2.5; }
	else if (name === 'hedge') { a = 1.12; b = 0.57; height = 1.55; }
	else if (name === 'bush') { a = 0.98; b = 0.43; height = 0.9; }
	else if (name === 'wooden_crate') { a = 0.46; b = 0.46; height = 0.85; }
	else if (name === 'barrel') { kind = 'circle'; a = 0.43; height = 0.9; }
	else if (name === 'bench') { a = 0.96; b = 0.33; height = 1.2; }
	else if (name === 'fence') { a = 1.11; b = 0.085; height = 1.08; }
	else if (name === 'garden_lamp') { kind = 'circle'; a = 0.15; height = 2.5; }
	else if (name === 'signpost') { a = 0.57; b = 0.12; height = 1.6; }
	else if (name === 'rock_cluster') { kind = 'circle'; a = 0.61; height = 0.7; }
	else return [];
	const result: Solid[] = [{ id, kind, x, z, yaw, radius: a * scale, halfX: a * scale, halfZ: b * scale, height: height * scale }];
	if (name === 'treehouse') result.push({ id: `${id}_stairs`, kind: 'box',
		x: x + Math.sin(yaw) * 1.73 * scale, z: z + Math.cos(yaw) * 1.73 * scale, yaw,
		radius: 0, halfX: 0.95 * scale, halfZ: 0.43 * scale, height: 2.2 * scale });
	return result;
}
