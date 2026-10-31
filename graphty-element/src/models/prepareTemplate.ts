/**
 * @file Turn a loaded model into the template its nodes are instanced from
 * (design/rendering/node-models.md, sections 3.4, 3.5, 3.7 and 3.10).
 *
 * - Every part's transform is baked into its vertices, in its rest pose: a skinned or morphed
 *   part keeps its bind-pose vertices and loses its skeleton and morph targets, so an instance
 *   binds no bone or morph texture.
 * - The model is turned so the file's up axis points up, then by `modelTurn` about that axis.
 * - It is centered on its bounding box (or kept on the file's origin) and scaled so its largest
 *   extent is 1 ("contain"), or each extent is 1 ("stretch"). A node then scales its instance by
 *   the extent a built-in shape of the same size and size mode is drawn at.
 * - Parts are grouped by which vertex attributes they carry, their material and whether that
 *   material blends, and merged within each group, so draw calls grow with the groups and never
 *   with the nodes.
 * - Materials reflect the scene's environment, or the bundled neutral one when it has none, are
 *   compiled for instances with the instanced colour buffer, and frozen before any node draws them.
 *
 * Reached only through the model chunk (src/models/chunk.ts), so it costs the main entry nothing.
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo.js";
import type { Material } from "@babylonjs/core/Materials/material.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { ModelTemplate, TemplateOptions } from "./ModelCache";

/**
 * The rotation that turns the file's up axis to +Y, then turns the model about +Y. A turn of 0 faces
 * the model's front (+Z in a glTF file, after the loader's change of handedness) toward -Z, where
 * the element's default camera stands, so a model shows its front rather than its back.
 * @param up - The file's up axis.
 * @param turnDegrees - The turn about the up axis, in degrees.
 * @returns The matrix.
 */
function orientation(up: TemplateOptions["up"], turnDegrees: number): Matrix {
    const quarter = Math.PI / 2;
    const tilt: Record<TemplateOptions["up"], Matrix> = {
        y: Matrix.Identity(),
        "-y": Matrix.RotationX(Math.PI),
        z: Matrix.RotationX(-quarter),
        "-z": Matrix.RotationX(quarter),
        x: Matrix.RotationZ(quarter),
        "-x": Matrix.RotationZ(-quarter),
    };

    return tilt[up].multiply(Matrix.RotationY(Math.PI + (turnDegrees * Math.PI) / 180));
}

/**
 * Reverse the winding of every triangle, after a transform that mirrors.
 * @param indices - The indices, changed in place.
 */
function flipWinding(indices: number[] | Int32Array | Uint32Array | Uint16Array): void {
    for (let i = 0; i + 2 < indices.length; i += 3) {
        const second = indices[i + 1];
        indices[i + 1] = indices[i + 2];
        indices[i + 2] = second;
    }
}

/** One part of the model, baked. */
interface Part {
    readonly data: VertexData;
    readonly material: Material | null;
    readonly key: string;
}

/**
 * Bake every drawable part of the container into world-space vertex data, turned upright.
 * @param container - The loaded model.
 * @param turn - The orientation to bake in.
 * @returns The parts.
 */
function bakeParts(container: AssetContainer, turn: Matrix): Part[] {
    const parts: Part[] = [];
    for (const mesh of container.meshes) {
        if (!(mesh instanceof Mesh) || mesh.getTotalVertices() === 0 || mesh.getIndices() === null) {
            continue;
        }

        const data = VertexData.ExtractFromMesh(mesh, true, true);
        // The rest pose: skin weights and morph targets are not carried over.
        data.matricesIndices = null;
        data.matricesWeights = null;
        data.matricesIndicesExtra = null;
        data.matricesWeightsExtra = null;
        if (data.normals === null && data.positions !== null && data.indices !== null) {
            const normals: number[] = [];
            VertexData.ComputeNormals(data.positions, data.indices, normals);
            data.normals = normals;
        }

        const world = mesh.computeWorldMatrix(true).multiply(turn);
        data.transform(world);
        if (world.determinant() < 0 && data.indices !== null) {
            flipWinding(data.indices);
        }

        const { material } = mesh;
        const signature = [data.uvs, data.uvs2, data.colors, data.tangents].map((a) => (a ? 1 : 0)).join("");
        const blend = material?.needAlphaBlendingForMesh(mesh) === true ? "b" : "o";
        parts.push({ data, material, key: `${signature}|${material?.uniqueId ?? -1}|${blend}` });
    }

    return parts;
}

/**
 * The box around every baked part.
 * @param parts - The parts.
 * @returns Its corners.
 */
function boundsOf(parts: readonly Part[]): { min: Vector3; max: Vector3 } {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const { data } of parts) {
        const positions = data.positions ?? [];
        for (let i = 0; i + 2 < positions.length; i += 3) {
            min.minimizeInPlaceFromFloats(positions[i], positions[i + 1], positions[i + 2]);
            max.maximizeInPlaceFromFloats(positions[i], positions[i + 1], positions[i + 2]);
        }
    }

    return { min, max };
}

/**
 * Point every PBR material at an environment, unless the scene has its own.
 * @param scene - The scene.
 * @param materials - The model's materials.
 * @param environment - The bundled neutral environment.
 */
async function light(
    scene: Scene,
    materials: Iterable<Material>,
    environment: () => PBRMaterial["reflectionTexture"],
): Promise<void> {
    if (scene.environmentTexture !== null) {
        return;
    }

    for (const material of materials) {
        if (material instanceof PBRMaterial && material.reflectionTexture === null) {
            material.reflectionTexture = environment();
        }
    }

    // Decoded before anything compiles against it, so no decode is left running into a scene
    // that has gone.
    const texture = environment();
    if (texture !== null && !texture.isReady()) {
        await new Promise<void>((resolve) => {
            BaseTexture.WhenAllReady([texture], resolve);
        });
    }
}

/** How the baked parts are moved into the unit box. */
interface Fit {
    readonly min: Vector3;
    readonly extent: Vector3;
    readonly center: Vector3;
    readonly scale: Vector3;
    readonly matrix: Matrix;
}

/**
 * Work out how to center the parts and scale them into the unit box.
 * @param parts - The baked parts.
 * @param options - The geometry options.
 * @returns The fit.
 */
function fitOf(parts: readonly Part[], options: TemplateOptions): Fit {
    const { min, max } = boundsOf(parts);
    const extent = max.subtract(min);
    const center = options.center === "bounds" ? min.add(max).scale(0.5) : Vector3.Zero();
    const largest = Math.max(extent.x, extent.y, extent.z, 1e-9);
    const scale =
        options.fit === "stretch"
            ? new Vector3(1 / Math.max(extent.x, 1e-9), 1 / Math.max(extent.y, 1e-9), 1 / Math.max(extent.z, 1e-9))
            : new Vector3(1 / largest, 1 / largest, 1 / largest);
    const matrix = Matrix.Translation(-center.x, -center.y, -center.z).multiply(
        Matrix.Scaling(scale.x, scale.y, scale.z),
    );
    return { min, extent, center, scale, matrix };
}

/**
 * Move every part into the unit box and group the parts by key.
 * @param parts - The baked parts, transformed in place.
 * @param fit - The fit matrix.
 * @returns The groups by key, the fitted bounding radius and the triangle count.
 */
function fitAndGroup(
    parts: readonly Part[],
    fit: Matrix,
): { groups: Map<string, Part[]>; radius: number; triangles: number } {
    let radius = 0;
    let triangles = 0;
    const groups = new Map<string, Part[]>();
    for (const part of parts) {
        part.data.transform(fit);
        const positions = part.data.positions ?? [];
        for (let i = 0; i + 2 < positions.length; i += 3) {
            radius = Math.max(radius, Math.hypot(positions[i], positions[i + 1], positions[i + 2]));
        }

        triangles += (part.data.indices?.length ?? 0) / 3;
        const list = groups.get(part.key) ?? [];
        list.push(part);
        groups.set(part.key, list);
    }

    return { groups, radius, triangles };
}

/**
 * Merge each group into one hidden source mesh.
 * @param scene - The scene the template draws in.
 * @param name - A name for the template's meshes.
 * @param groups - The parts by group key.
 * @param flat - The material every group takes under `replace`, else null.
 * @param used - The materials the meshes draw with, written into.
 * @returns The meshes, one per group.
 */
function mergeGroups(
    scene: Scene,
    name: string,
    groups: ReadonlyMap<string, Part[]>,
    flat: PBRMaterial | null,
    used: Set<Material>,
): Mesh[] {
    const meshes: Mesh[] = [];
    for (const [key, list] of groups) {
        const [first, ...rest] = list;
        const vertices = list.reduce((sum, part) => sum + (part.data.positions?.length ?? 0) / 3, 0);
        const merged =
            rest.length === 0
                ? first.data
                : first.data.merge(
                      rest.map((p) => p.data),
                      vertices > 65535,
                  );
        const mesh = new Mesh(`${name}-${String(meshes.length)}`, scene);
        merged.applyToMesh(mesh);
        const material = flat ?? first.material;
        if (material !== null) {
            mesh.material = material;
            used.add(material);
        }

        mesh.isVisible = false;
        mesh.isPickable = false;
        mesh.metadata = { graphtyModelGroup: key };
        // The instanced colour is always there, white by default: tint is then one write per
        // instance, and no node's tint can change the template's shader.
        mesh.registerInstancedBuffer("color", 4);
        mesh.instancedBuffers.color = new Color4(1, 1, 1, 1);
        mesh.freezeWorldMatrix();
        meshes.push(mesh);
    }

    return meshes;
}

/**
 * Move the used materials and the container's textures into the scene, giving every material
 * `node.texture` when one is set.
 * @param scene - The scene.
 * @param used - The materials the template draws with.
 * @param textures - The container's textures.
 * @param image - `node.texture`, if any.
 */
function adoptMaterials(
    scene: Scene,
    used: ReadonlySet<Material>,
    textures: readonly BaseTexture[],
    image: BaseTexture | null | undefined,
): void {
    for (const material of used) {
        if (!scene.materials.includes(material)) {
            scene.addMaterial(material);
        }

        // `node.texture` replaces the base color texture; the node's tint still multiplies it.
        if (image !== undefined && image !== null) {
            applyImage(material, image);
        }
    }

    for (const texture of textures) {
        if (!scene.textures.includes(texture)) {
            scene.addTexture(texture);
        }
    }
}

/**
 * Make a picture a material's base color texture.
 * @param material - The material.
 * @param image - The picture.
 */
function applyImage(material: Material, image: BaseTexture): void {
    if (material instanceof PBRMaterial) {
        material.albedoTexture = image;
        material.albedoColor = Color3.White();
    } else if ("diffuseTexture" in material) {
        (material as { diffuseTexture: unknown }).diffuseTexture = image;
    }
}

/**
 * Give every mesh the whole model's bounding box, locked.
 * @param meshes - The template's meshes.
 * @param fit - The fit.
 * @returns The fitted extents.
 */
function lockBounds(meshes: readonly Mesh[], fit: Fit): ModelTemplate["size"] {
    const { extent, scale, center, min } = fit;
    const size = { x: extent.x * scale.x, y: extent.y * scale.y, z: extent.z * scale.z };
    const low = center.subtract(min).multiply(scale).scale(-1);
    const box = new BoundingInfo(low, low.add(new Vector3(size.x, size.y, size.z)));
    for (const mesh of meshes) {
        mesh.setBoundingInfo(box);
        mesh.doNotSyncBoundingInfo = true;
        mesh.getBoundingInfo().isLocked = true;
    }

    return size;
}

/**
 * Dispose what the template does not keep: the file's own meshes, skeletons, morph targets and
 * clips, and the materials no group draws with.
 * @param container - The loaded model.
 * @param used - The materials the template keeps.
 */
function disposeLeftovers(container: AssetContainer, used: ReadonlySet<Material>): void {
    for (const mesh of container.meshes) {
        mesh.dispose(false, false);
    }

    for (const transform of container.transformNodes) {
        transform.dispose();
    }

    for (const skeleton of container.skeletons) {
        skeleton.dispose();
    }

    for (const manager of container.morphTargetManagers) {
        manager.dispose();
    }

    for (const group of container.animationGroups) {
        group.dispose();
    }

    const unusedMaterials = container.materials.filter((material) => !used.has(material));
    for (const material of unusedMaterials) {
        material.dispose();
    }
}

/**
 * Dispose a template: its meshes, its materials and the container's textures.
 * @param meshes - The template's meshes.
 * @param used - The template's materials.
 * @param container - The loaded model the template was built from.
 */
function disposeTemplate(meshes: readonly Mesh[], used: ReadonlySet<Material>, container: AssetContainer): void {
    for (const mesh of meshes) {
        mesh.dispose(false, false);
    }

    for (const material of used) {
        material.unfreeze();
        // The neutral environment is the scene's, shared by every template.
        const reflection = material instanceof PBRMaterial ? material.reflectionTexture : null;
        if (material instanceof PBRMaterial && reflection !== null && !container.textures.includes(reflection)) {
            material.reflectionTexture = null;
        }

        material.dispose(true, false);
    }

    for (const texture of container.textures) {
        texture.dispose();
    }
}

/**
 * Build the template for one model and one set of geometry options.
 * @param scene - The scene the template draws in.
 * @param container - The loaded model; its meshes are disposed, its materials and textures move
 *   into the scene and belong to the template.
 * @param name - A name for the template's meshes.
 * @param options - The geometry options.
 * @param environment - The bundled neutral environment, for a scene with none.
 * @returns The template, compiled and frozen.
 */
export async function prepareTemplate(
    scene: Scene,
    container: AssetContainer,
    name: string,
    options: TemplateOptions,
    environment: () => PBRMaterial["reflectionTexture"],
): Promise<ModelTemplate> {
    const parts = bakeParts(container, orientation(options.up, options.turn));
    if (parts.length === 0) {
        throw new Error("graphty-element: the model has no triangles to draw");
    }

    const fit = fitOf(parts, options);
    const { groups, radius, triangles } = fitAndGroup(parts, fit.matrix);

    let flat: PBRMaterial | null = null;
    if (options.replace) {
        flat = new PBRMaterial(`${name}-replace`, scene);
        flat.albedoColor = Color3.White();
        flat.metallic = 0;
        flat.roughness = 1;
    }

    const used = new Set<Material>();
    const meshes = mergeGroups(scene, name, groups, flat, used);
    adoptMaterials(scene, used, container.textures, options.image);

    await light(scene, used, environment);
    await Promise.all(
        meshes.map(async (mesh) => {
            await mesh.material?.forceCompilationAsync(mesh, { useInstances: true });
        }),
    );
    for (const material of used) {
        material.freeze();
    }

    const transparent = meshes.some((mesh) => mesh.material?.needAlphaBlendingForMesh(mesh) === true);
    // Every group answers for the whole model's box: a node is picked by that box and never by
    // the model's triangles (section 3.8), and a group is culled only when the whole model is.
    const size = lockBounds(meshes, fit);

    disposeLeftovers(container, used);

    return {
        groups: meshes,
        size,
        radius,
        triangles,
        materials: used.size,
        transparent,
        dispose: () => {
            disposeTemplate(meshes, used, container);
        },
    };
}
