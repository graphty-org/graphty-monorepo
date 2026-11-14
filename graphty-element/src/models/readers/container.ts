/**
 * @file Turn what graphty-element's own model readers produce into a Babylon.js asset container
 * that is not in the scene, so the template is made from it exactly as from a loaded glTF.
 *
 * Each part is a `Mesh` with a `StandardMaterial`: its diffuse color, its diffuse picture (named
 * under the load's guarded root, so the request guard serves it from the file set), or its
 * vertex colors, which the template keeps and the instanced color multiplies. Reached only
 * through the model chunk.
 */

import { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { Geometry } from "./geometry";

/** A part's look. */
export interface PartMaterial {
    readonly color?: readonly [number, number, number];
    /** A picture, as a URL under the load's guarded root. */
    readonly texture?: string;
    readonly alpha?: number;
}

/** One part to build. */
export interface Part {
    readonly name: string;
    readonly geometry: Geometry;
    readonly material?: number;
    readonly parent?: number;
    readonly position?: readonly number[];
    readonly rotation?: readonly number[];
    readonly rotationQuaternion?: readonly number[];
    readonly scaling?: readonly number[];
}

/**
 * Whether following a part's parents comes back to it.
 * @param parts - The parts.
 * @param start - The part.
 * @returns True on a cycle.
 */
function onCycle(parts: readonly Part[], start: number): boolean {
    let at = parts[start].parent;
    for (let steps = 0; at !== undefined && steps <= parts.length; steps++) {
        if (at === start) {
            return true;
        }
        at = parts[at]?.parent;
    }

    return at !== undefined;
}

/**
 * Build a container from parts and materials.
 * @param scene - The scene the container belongs to.
 * @param parts - The parts.
 * @param materials - Their materials (none: one plain white material).
 * @returns The container, not in the scene.
 */
export function buildContainer(
    scene: Scene,
    parts: readonly Part[],
    materials: readonly PartMaterial[] = [],
): AssetContainer {
    const container = new AssetContainer(scene);
    const made = (materials.length > 0 ? materials : [{}]).map((look, i) => {
        const material = new StandardMaterial(`graphty-model-material-${String(i)}`, scene);
        const [r, g, b] = look.color ?? [1, 1, 1];
        material.diffuseColor = new Color3(r, g, b);
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        if (look.alpha !== undefined && look.alpha < 1) {
            material.alpha = look.alpha;
        }
        if (look.texture !== undefined) {
            const texture = new Texture(look.texture, scene);
            material.diffuseTexture = texture;
            material.diffuseColor = Color3.White();
            container.textures.push(texture);
        }
        container.materials.push(material);
        return material;
    });

    const meshes = parts.map((part, i) => {
        const mesh = new Mesh(part.name || `graphty-model-part-${String(i)}`, scene);
        if (part.geometry.indices.length > 0) {
            const data = new VertexData();
            data.positions = part.geometry.positions;
            data.indices = part.geometry.indices;
            data.normals = part.geometry.normals ?? null;
            data.uvs = part.geometry.uvs ?? null;
            data.colors = part.geometry.colors ?? null;
            data.applyToMesh(mesh);
        }
        mesh.material = made[part.material ?? 0] ?? made[0];
        if (part.position !== undefined) {
            mesh.position = Vector3.FromArray(part.position);
        }
        if (part.rotation !== undefined) {
            mesh.rotation = Vector3.FromArray(part.rotation);
        }
        if (part.rotationQuaternion !== undefined) {
            mesh.rotationQuaternion = Quaternion.FromArray(part.rotationQuaternion);
        }
        if (part.scaling !== undefined) {
            mesh.scaling = Vector3.FromArray(part.scaling);
        }
        container.meshes.push(mesh);
        return mesh;
    });

    parts.forEach((part, i) => {
        if (part.parent !== undefined && meshes[part.parent] !== undefined && !onCycle(parts, i)) {
            meshes[i].parent = meshes[part.parent];
        }
    });

    container.removeAllFromScene();
    return container;
}
