import { Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Merge palette-colored pieces inside each rigid node without changing animation pivots. */
export function optimizeRigidParts(root: Object3D, animatedNames = new Set<string>()) {
	const palette = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.88, flatShading: true });
	palette.name = 'gameplay_palette';
	const oldGeometry = new Set<BufferGeometry>(), oldMaterials = new Set<Material>();
	let used = false;
	const visit = (node: Object3D) => {
		for (const child of [...node.children]) visit(child);
		const parts = node.children.filter((object): object is Mesh<BufferGeometry, MeshStandardMaterial> => object instanceof Mesh
			&& object.material instanceof MeshStandardMaterial && !object.material.map && !object.material.transparent
			&& object.material.side === 0 && object.material.emissive.getHex() === 0
			&& !object.material.name.includes('water') && !animatedNames.has(object.name));
		if (parts.length < 2) return;
		const geometries = parts.map(part => {
			part.updateMatrix();
			const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
			geometry.applyMatrix4(part.matrix);
			for (const attribute of Object.keys(geometry.attributes)) if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute);
			if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
			const colors = new Float32Array(geometry.getAttribute('position').count * 3), color = part.material.color;
			for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b; }
			geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
			return geometry;
		});
		const merged = mergeGeometries(geometries, false);
		if (!merged) throw new Error(`Cannot optimize ${node.name}`);
		const result = new Mesh(merged, palette); result.name = `${node.name}_palette`;
		result.castShadow = parts.some(part => part.castShadow); result.receiveShadow = true;
		for (const part of parts) { oldGeometry.add(part.geometry); oldMaterials.add(part.material); node.remove(part); }
		for (const geometry of geometries) geometry.dispose();
		node.add(result); used = true;
	};
	visit(root);
	const retainedGeometry = new Set<BufferGeometry>(), retainedMaterials = new Set<Material>();
	root.traverse(object => {
		if (object instanceof Mesh) { retainedGeometry.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) retainedMaterials.add(material); }
	});
	for (const geometry of oldGeometry) if (!retainedGeometry.has(geometry)) geometry.dispose();
	for (const material of oldMaterials) if (!retainedMaterials.has(material)) material.dispose();
	if (!used) palette.dispose();
}
