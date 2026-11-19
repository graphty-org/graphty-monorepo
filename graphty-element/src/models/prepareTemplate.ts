/**
 * @file Turn a loaded model into the template its nodes are instanced from
 * (design/rendering/node-models.md, sections 3.4, 3.5, 3.7 and 3.10).
 *
 * - Every part's transform is baked into its vertices, in its rest pose: a skinned or morphed
 *   part keeps its bind-pose vertices and loses its skeleton and morph targets, so an instance
 *   binds no bone or morph texture. A part with GPU instances (`EXT_mesh_gpu_instancing`) is
 *   baked once per instance.
 * - The model is turned so the file's up axis points up, then by `modelTurn` about that axis.
 * - It is centered on its bounding box (or kept on the file's origin) and scaled so its largest
 *   extent is 1 ("contain"), or each extent is 1 ("stretch"). A node then scales its instance by
 *   the extent a built-in shape of the same size and size mode is drawn at.
 * - Parts are grouped by which vertex attributes they carry, their material and whether that
 *   material blends, and merged within each group, so draw calls grow with the groups and never
 *   with the nodes.
 * - Materials reflect the scene's environment, or the bundled neutral one when it has none, are
 *   compiled for instances with the instanced color buffer, and frozen before any node draws them.
 *
 * Reached only through the model chunk (src/models/chunk.ts), so it costs the main entry nothing.
 */

import "@babylonjs/core/Meshes/instancedMesh.js";
import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo.js";
import { Material } from "@babylonjs/core/Materials/material.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { type AnimatedPart, bakeAnimation, type TemplateAnimation } from "./animateTemplate";
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
interface Part extends AnimatedPart {
    readonly material: Material | null;
    readonly key: string;
}

/**
 * A mesh's vertices in its own space and rest pose, indexed and with normals.
 * @param mesh - The mesh.
 * @returns Its vertex data.
 */
function restPose(mesh: Mesh): VertexData {
    const data = ownVertices(mesh);
    // A skinned part is posed by its skeleton at rest, once, on the CPU: the bones carry the
    // file's turns (BrainStem's root turns it from Z up to Y up), which the bind-pose vertices
    // alone leave out. Then the skin goes, so an instance binds no bone texture.
    skinAtRest(mesh, data);
    // The rest pose: skin weights and morph targets are not carried over.
    data.matricesIndices = null;
    data.matricesWeights = null;
    data.matricesIndicesExtra = null;
    data.matricesWeightsExtra = null;
    return data;
}

/**
 * A mesh's vertices in its own space (bind space for a skin), indexed and with normals, its skin
 * weights kept.
 * @param mesh - The mesh.
 * @returns Its vertex data.
 */
function ownVertices(mesh: Mesh): VertexData {
    const data = VertexData.ExtractFromMesh(mesh, true, true);
    // A glTF primitive with no indices draws its vertices in order (the loader marks it
    // unindexed); the merged template is drawn indexed, so it gets those indices, or it
    // draws nothing.
    if (mesh.isUnIndexed || (data.indices?.length ?? 0) === 0) {
        data.indices = Array.from({ length: mesh.getTotalVertices() }, (_, i) => i);
    }

    if (data.normals === null && data.positions !== null && data.indices !== null) {
        const normals: number[] = [];
        VertexData.ComputeNormals(data.positions, data.indices, normals);
        data.normals = normals;
    }

    return data;
}

/**
 * Pose a skinned mesh's vertices by its skeleton's bones as they stand, as Babylon's CPU skinning
 * does (`Mesh.applySkeleton`), without touching the mesh's own buffers.
 * @param mesh - The mesh.
 * @param data - Its vertex data, changed in place.
 */
function skinAtRest(mesh: Mesh, data: VertexData): void {
    const { skeleton } = mesh;
    const { positions, normals, matricesIndices: indices, matricesWeights: weights } = data;
    if (skeleton === null || positions === null || indices === null || weights === null) {
        return;
    }

    // prepare() skips a skeleton that is not dirty, which one fresh from a loader may not be.
    skeleton.bones[0]?.markAsDirty();
    skeleton.prepare(true);
    const bones = skeleton.getTransformMatrices(mesh);
    // Left undefined, not null, when the mesh has no extra influences.
    const extraIndices = data.matricesIndicesExtra ?? null;
    const extraWeights = data.matricesWeightsExtra ?? null;
    const skin = new Matrix();
    const scaled = new Matrix();
    const out = Vector3.Zero();
    const add = (bone: number, weight: number): void => {
        if (weight > 0) {
            Matrix.FromFloat32ArrayToRefScaled(bones, Math.floor(bone) * 16, weight, scaled);
            skin.addToSelf(scaled);
        }
    };
    const posed = Array.from(positions);
    const posedNormals = normals === null ? null : Array.from(normals);
    for (let v = 0; v * 3 < positions.length; v++) {
        skin.reset();
        for (let k = 0; k < 4; k++) {
            add(indices[v * 4 + k], weights[v * 4 + k]);
            if (extraIndices !== null && extraWeights !== null) {
                add(extraIndices[v * 4 + k], extraWeights[v * 4 + k]);
            }
        }

        Vector3.TransformCoordinatesFromFloatsToRef(posed[v * 3], posed[v * 3 + 1], posed[v * 3 + 2], skin, out);
        out.toArray(posed, v * 3);
        if (posedNormals !== null) {
            const [x, y, z] = [posedNormals[v * 3], posedNormals[v * 3 + 1], posedNormals[v * 3 + 2]];
            Vector3.TransformNormalFromFloatsToRef(x, y, z, skin, out);
            out.normalize().toArray(posedNormals, v * 3);
        }
    }

    data.positions = posed;
    data.normals = posedNormals;
}

/**
 * Move vertex data by a transform, keeping its triangles facing out when the transform mirrors.
 * @param data - The data, changed in place.
 * @param world - The transform.
 * @returns The data.
 */
function placeAt(data: VertexData, world: Matrix): VertexData {
    data.transform(world);
    if (world.determinant() < 0 && data.indices !== null) {
        flipWinding(data.indices);
    }

    return data;
}

/**
 * Bake every drawable part of the container into world-space vertex data, turned upright.
 * @param container - The loaded model.
 * @param turn - The orientation to bake in.
 * @param animated - Whether each part that can move keeps its own vertices and its mesh, to animate.
 * @returns The parts.
 */
function bakeParts(container: AssetContainer, turn: Matrix, animated: boolean): Part[] {
    const parts: Part[] = [];
    for (const mesh of container.meshes) {
        if (!(mesh instanceof Mesh) || mesh.getTotalVertices() === 0 || mesh.getIndices() === null) {
            continue;
        }

        const data = restPose(mesh);
        const { material } = mesh;
        const signature = [data.uvs, data.uvs2, data.colors, data.tangents].map((a) => (a ? 1 : 0)).join("");
        const blend = material?.needAlphaBlendingForMesh(mesh) === true ? "b" : "o";
        const key = `${signature}|${material?.uniqueId ?? -1}|${blend}`;
        const placed = mesh.computeWorldMatrix(true).multiply(turn);
        // A thin instance's matrix places it in the mesh's own space, before the mesh's world matrix.
        // ponytail: per-instance colors (`_COLOR_0`) are not carried over; bake them as vertex colors if a file needs them.
        const instances = mesh.thinInstanceGetWorldMatrices();
        // ponytail: a GPU-instanced part (EXT_mesh_gpu_instancing) is drawn still; give each copy a bone if a file animates one.
        const movable = animated && instances.length === 0 ? { mesh, local: ownVertices(mesh) } : {};
        for (const instance of instances.length === 0 ? [Matrix.Identity()] : instances) {
            const copy = instances.length > 1 ? data.clone() : data;
            parts.push({ vertices: placeAt(copy, instance.multiply(placed)), material, key, ...movable });
        }
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
    for (const { vertices: data } of parts) {
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
        part.vertices.transform(fit);
        const positions = part.vertices.positions ?? [];
        for (let i = 0; i + 2 < positions.length; i += 3) {
            radius = Math.max(radius, Math.hypot(positions[i], positions[i + 1], positions[i + 2]));
        }

        triangles += (part.vertices.indices?.length ?? 0) / 3;
        const list = groups.get(part.key) ?? [];
        list.push(part);
        groups.set(part.key, list);
    }

    return { groups, radius, triangles };
}

/**
 * Whether a material draws a picture as its base color.
 * @param material - The material.
 * @returns True when it does.
 */
function hasPicture(material: Material): boolean {
    if (material instanceof PBRMaterial) {
        return material.albedoTexture !== null;
    }

    return (
        "diffuseTexture" in material &&
        (material as { diffuseTexture?: unknown }).diffuseTexture !== null &&
        (material as { diffuseTexture?: unknown }).diffuseTexture !== undefined
    );
}

/** Babylon's glTF loader names the material it gives a primitive the file gives none. */
const GLTF_DEFAULT_MATERIAL = "__GLTFLoader._default";

/**
 * Whether a material states no color of its own: the glTF loader's stand-in for a primitive with
 * no material, or a material left at its defaults -- white, no picture or other map, no glow. A
 * glTF material with no `baseColorFactor` and an MTL with no `Kd` load as exactly that.
 * @param material - The material.
 * @returns True when the part should draw in the node's color.
 */
function statesNoColor(material: Material): boolean {
    if (material.name === GLTF_DEFAULT_MATERIAL) {
        return true;
    }

    const white = (c: Color3): boolean => c.r === 1 && c.g === 1 && c.b === 1;
    const dark = (c: Color3): boolean => c.r === 0 && c.g === 0 && c.b === 0;
    if (material.getActiveTextures().length > 0) {
        return false;
    }

    if (material instanceof PBRMaterial) {
        return white(material.albedoColor) && dark(material.emissiveColor);
    }

    if (material instanceof StandardMaterial) {
        return white(material.diffuseColor) && dark(material.emissiveColor);
    }

    return false;
}

/**
 * Whether a material is a plain shade of gray: no picture or other map, no glow, opaque, not
 * metallic, and a base color whose red, green and blue are equal (within one 8-bit step).
 * Exporters write such a material where the author gave the model none of their own (Blender's
 * default is 0.8 gray, metallic 0). A chrome or a see-through gray is a look, and is kept.
 * @param material - The material.
 * @returns True for a plain gray (or white or black) material.
 */
function plainGray(material: Material): boolean {
    if (material.alpha !== 1 || (material.transparencyMode ?? Material.MATERIAL_OPAQUE) !== Material.MATERIAL_OPAQUE) {
        return false;
    }

    let base: Color3;
    let glow: Color3;
    if (material instanceof PBRMaterial) {
        if (material.metallic !== 0) {
            return false;
        }

        base = material.albedoColor;
        glow = material.emissiveColor;
    } else if (material instanceof StandardMaterial) {
        base = material.diffuseColor;
        glow = material.emissiveColor;
    } else {
        return false;
    }

    const step = 1 / 255;
    const gray = Math.abs(base.r - base.g) <= step && Math.abs(base.g - base.b) <= step;
    return gray && glow.r + glow.g + glow.b === 0 && material.getActiveTextures().length === 0;
}

/**
 * Whether a model states no color of its own: every part has no material, one left at its
 * defaults, or a plain gray one. A model with one colored or pictured part keeps its grays (a car's
 * black tires stay black beside its red body); a model of grays alone is shaded, not colored, so it
 * draws in the node's color.
 * @param groups - The parts by group key.
 * @returns True when every part should draw in the node's color.
 */
function allPlainGray(groups: ReadonlyMap<string, Part[]>): boolean {
    for (const list of groups.values()) {
        for (const { material } of list) {
            if (material !== null && !statesNoColor(material) && !plainGray(material)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * The material a merged group draws with, and whether it takes the node's color whatever
 * `node.modelTint` says: a part the file gives no material (or one left at its defaults, see
 * `statesNoColor`), no picture and no vertex colors states no color of its own, and under "untextured" a part with no picture and no vertex colors
 * gives its color up too. Under "replace" every part draws in the flat material.
 * @param first - The group's first part.
 * @param colored - Whether the group carries vertex colors.
 * @param gray - Whether the whole model states no color of its own (`allPlainGray`) and no layer
 *   set `node.modelTint` to false.
 * @param options - The template options.
 * @param flat - The template's flat material, made on first use.
 * @returns The material, and whether the group follows the node's color.
 */
function lookOf(
    first: Part,
    colored: boolean,
    gray: boolean,
    options: TemplateOptions,
    flat: () => PBRMaterial,
): { material: Material; follows: boolean } {
    if (options.replace) {
        return { material: flat(), follows: true };
    }

    const { material } = first;
    if (colored) {
        // Vertex colors state the part's color; with no material they draw in the flat one.
        return { material: material ?? flat(), follows: false };
    }

    if (
        material === null ||
        gray ||
        statesNoColor(material) ||
        (options.untextured === true && !hasPicture(material))
    ) {
        return { material: flat(), follows: true };
    }

    return { material, follows: false };
}

/**
 * Merge each group into one hidden source mesh.
 * @param scene - The scene the template draws in.
 * @param name - A name for the template's meshes.
 * @param groups - The parts by group key.
 * @param options - The template options.
 * @param flat - The template's flat material, made on first use.
 * @param made - Where each material and mesh goes as it is made, and the groups that follow the
 *   node's color.
 */
function mergeGroups(
    scene: Scene,
    name: string,
    groups: ReadonlyMap<string, Part[]>,
    options: TemplateOptions,
    flat: () => PBRMaterial,
    made: Made,
): void {
    const { used, meshes, follows } = made;
    const gray = options.ownColors !== true && allPlainGray(groups);
    for (const [key, list] of groups) {
        const [first, ...rest] = list;
        const vertices = list.reduce((sum, part) => sum + (part.vertices.positions?.length ?? 0) / 3, 0);
        const merged =
            rest.length === 0
                ? first.vertices
                : first.vertices.merge(
                      rest.map((p) => p.vertices),
                      vertices > 65535,
                  );
        // "replace" paints one flat color: the file's vertex colors go with its materials.
        if (options.replace) {
            merged.colors = null;
        }

        const mesh = new Mesh(`${name}-${String(meshes.length)}`, scene);
        meshes.push(mesh);
        merged.applyToMesh(mesh);
        const colored = (merged.colors?.length ?? 0) > 0;
        const look = lookOf(first, colored, gray, options, flat);
        mesh.material = look.material;
        used.add(look.material);

        if (look.follows) {
            follows.add(mesh);
        }

        mesh.isVisible = false;
        mesh.isPickable = false;
        mesh.metadata = { graphtyModelGroup: key };
        // The instanced color is always there, white by default: tint is then one write per
        // instance, and no node's tint can change the template's shader. Babylon names it
        // "color", the same kind as per-vertex colors, so a group with vertex colors registers
        // Babylon's "instanceColor", which its shaders multiply into the vertex colors
        // (`tintBufferOf` in ModelCache.ts).
        const kind = colored ? "instanceColor" : "color";
        mesh.registerInstancedBuffer(kind, 4);
        mesh.instancedBuffers[kind] = new Color4(1, 1, 1, 1);
        // Registered before the materials compile and freeze, so the first selection mark
        // (src/meshes/NodeOutlineLayers.ts) changes no define of a frozen material.
        mesh.registerInstancedBuffer("instanceSelectionId", 1);
        mesh.instancedBuffers.instanceSelectionId = 0;
        mesh.freezeWorldMatrix();
    }
}

/**
 * Set what the node's style asks of every material the template draws with: `node.unlit`,
 * `node.wireframe` and `node.modelDoubleSided`.
 * @param used - The materials.
 * @param options - The template options.
 */
function restyle(used: ReadonlySet<Material>, options: TemplateOptions): void {
    for (const material of used) {
        if (options.wireframe === true) {
            material.wireframe = true;
        }

        if (options.doubleSided !== undefined && options.doubleSided !== "file") {
            material.backFaceCulling = !options.doubleSided;
            if (material instanceof PBRMaterial) {
                material.twoSidedLighting = options.doubleSided;
            }
        }

        if (options.unlit === true) {
            if (material instanceof PBRMaterial) {
                material.unlit = true;
            } else if (material instanceof StandardMaterial) {
                // As a built-in shape's unlit material: its own color and picture, no light.
                material.disableLighting = true;
                material.emissiveColor = material.diffuseColor;
                material.emissiveTexture = material.diffuseTexture;
            }
        }
    }
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
 * @param moving - The box an animated model moves through, which the node is picked and culled by.
 * @param moving.min - Its low corner.
 * @param moving.max - Its high corner.
 * @returns The fitted extents at rest.
 */
function lockBounds(
    meshes: readonly Mesh[],
    fit: Fit,
    moving?: { readonly min: Vector3; readonly max: Vector3 },
): ModelTemplate["size"] {
    const { extent, scale, center, min } = fit;
    const size = { x: extent.x * scale.x, y: extent.y * scale.y, z: extent.z * scale.z };
    const low = center.subtract(min).multiply(scale).scale(-1);
    const box =
        moving === undefined
            ? new BoundingInfo(low, low.add(new Vector3(size.x, size.y, size.z)))
            : new BoundingInfo(
                  Vector3.Minimize(low, moving.min),
                  Vector3.Maximize(low.add(new Vector3(size.x, size.y, size.z)), moving.max),
              );
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
    const made: Made = { used: new Set(), meshes: [], follows: new Set() };
    try {
        return await build(scene, container, name, options, environment, made);
    } catch (error) {
        // Free what was made so far, and the file's own meshes, materials and textures.
        made.animation?.dispose();
        disposeTemplate(made.meshes, made.used, container);
        disposeLeftovers(container, made.used);
        throw error;
    }
}

/** What {@link build} has made so far, for {@link prepareTemplate} to free if it throws. */
interface Made {
    readonly used: Set<Material>;
    readonly meshes: Mesh[];
    /** The groups that take the node's color whatever `node.modelTint` says. */
    readonly follows: Set<Mesh>;
    /** The baked clips, once made. */
    animation?: TemplateAnimation | null;
}

/**
 * Bake, fit, merge, light, compile and freeze the model into its template (see {@link prepareTemplate}).
 * @param scene - The scene the template draws in.
 * @param container - The loaded model.
 * @param name - A name for the template's meshes.
 * @param options - The geometry options.
 * @param environment - The bundled neutral environment, for a scene with none.
 * @param made - Where each material and mesh goes as it is made.
 * @returns The template.
 */
async function build(
    scene: Scene,
    container: AssetContainer,
    name: string,
    options: TemplateOptions,
    environment: () => PBRMaterial["reflectionTexture"],
    made: Made,
): Promise<ModelTemplate> {
    const turn = orientation(options.up, options.turn);
    const parts = bakeParts(container, turn, options.animated === true);
    if (parts.length === 0) {
        throw new Error("graphty-element: the model has no triangles to draw");
    }

    const fit = fitOf(parts, options);
    const grouped = fitAndGroup(parts, fit.matrix);
    const { groups, triangles } = grouped;
    let { radius } = grouped;
    const { used, meshes, follows } = made;
    const animation =
        options.animated === true ? bakeAnimation(scene, container, parts, turn.multiply(fit.matrix), name) : null;
    made.animation = animation;
    let flatMaterial: PBRMaterial | null = null;
    const flat = (): PBRMaterial => {
        if (flatMaterial === null) {
            flatMaterial = new PBRMaterial(`${name}-flat`, scene);
            used.add(flatMaterial);
            flatMaterial.albedoColor = Color3.White();
            flatMaterial.metallic = 0;
            flatMaterial.roughness = 1;
        }

        return flatMaterial;
    };

    mergeGroups(scene, name, groups, options, flat, made);
    animation?.attach(meshes);
    adoptMaterials(scene, used, container.textures, options.image);
    restyle(used, options);

    await light(scene, used, environment);
    await Promise.all(
        meshes.map(async (mesh) => {
            // Babylon multiplies "instanceColor" into vertex colors only while the mesh has an
            // instance when its material's defines are worked out, and a frozen material never
            // works them out again: a group with vertex colors keeps a hidden instance of its
            // own for its life, disposed with it.
            if (mesh.instancedBuffers.instanceColor !== undefined) {
                const standIn = mesh.createInstance(`${mesh.name}-tint`);
                standIn.isVisible = false;
                standIn.isPickable = false;
            }

            await mesh.material?.forceCompilationAsync(mesh, { useInstances: true });
        }),
    );
    // An animated template's materials stay unfrozen: the clock's uniform changes every frame.
    if (animation === null) {
        for (const material of used) {
            material.freeze();
        }
    }

    const transparent = meshes.some((mesh) => mesh.material?.needAlphaBlendingForMesh(mesh) === true);
    // Every group answers for the whole model's box: a node is picked by that box and never by
    // the model's triangles (section 3.8), and a group is culled only when the whole model is.
    const size = lockBounds(meshes, fit, animation?.bounds);
    if (animation !== null) {
        const { min, max } = animation.bounds;
        radius = Math.max(radius, min.length(), max.length());
    }

    disposeLeftovers(container, used);

    return {
        groups: meshes,
        follows,
        size,
        radius,
        triangles,
        materials: used.size,
        transparent,
        ...(animation === null ? {} : { animation }),
        dispose: () => {
            animation?.dispose();
            disposeTemplate(meshes, used, container);
        },
    };
}
