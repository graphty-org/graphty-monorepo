/**
 * @file The structure checks a glTF or GLB passes before Babylon.js ever sees it.
 *
 * Read from the JSON and the buffer lengths alone (design/rendering/node-models.md section 3.3):
 *
 * - the JSON has no `__proto__` key, no duplicate key, and is at most 64 levels deep;
 * - every index is in range, and the scene nodes form a tree at most 64 deep;
 * - every accessor's `count x element size` fits its buffer view, and every buffer view its
 *   buffer; the sum over all accessors, sparse ones included, is under the decoded-bytes limit;
 * - triangles are counted per use (a mesh used by three nodes counts three times);
 * - nodes, meshes, materials, textures, animations, morph targets and joints are capped;
 * - `EXT_mesh_gpu_instancing` is refused, and so are the compression extensions no decoder is
 *   bundled for;
 * - image sizes are read from their headers (in buffer views and `data:` URLs too).
 *
 * What comes out is the model's summary, built from the same JSON.
 */

import type { CodedFact } from "../shared";
import type { ModelLimits, ModelSummary } from "./AssetsApi";
import { cut, type Findings, findReference, refuse, resolveReference, textureBytesOf } from "./references";

/** The counts a glTF may hold, so a file cannot stall the main thread on shader or hierarchy work. */
export const GLTF_CAPS = Object.freeze({
    nodes: 10_000,
    meshes: 1_000,
    materials: 64,
    textures: 64,
    animations: 64,
    morphTargets: 64,
    joints: 256,
    depth: 64,
});

/** Required extensions the bundled loader reads (src/models/chunk.ts registers each). */
const READABLE_EXTENSIONS = new Set([
    "KHR_texture_transform",
    "KHR_mesh_quantization",
    "KHR_materials_unlit",
    "KHR_materials_pbrSpecularGlossiness",
    "KHR_materials_emissive_strength",
    "KHR_materials_clearcoat",
    "KHR_materials_ior",
    "KHR_materials_specular",
    "KHR_materials_sheen",
    "EXT_texture_webp",
]);

/** Compression extensions that need a decoder, and the package that will bring one. */
const DECODERS: ReadonlyMap<string, string> = new Map([
    ["KHR_draco_mesh_compression", "draco"],
    ["EXT_meshopt_compression", "meshopt"],
    ["KHR_texture_basisu", "@babylonjs/ktx2decoder"],
]);

/** Bytes per component, by glTF componentType. */
const COMPONENT_BYTES: Readonly<Record<number, number>> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

/** Components per element, by glTF accessor type. */
const TYPE_COMPONENTS: Readonly<Record<string, number>> = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
};

/** An open object or array while {@link checkJsonText} walks the text. */
interface JsonFrame {
    /** The keys an object has so far; undefined for an array. */
    readonly keys: Set<string> | undefined;
    /** Whether the next string is a key. */
    expectKey: boolean;
}

/**
 * Where a JSON string ends.
 * @param text - The JSON text.
 * @param start - The index of its opening quote.
 * @returns The index of its closing quote (or the text's length when unterminated).
 */
function stringEnd(text: string, start: number): number {
    let end = start + 1;
    while (end < text.length && text[end] !== '"') {
        end += text[end] === "\\" ? 2 : 1;
    }

    return end;
}

/**
 * Refuse a `__proto__` or duplicate key, when the string is a key.
 * @param text - The JSON text.
 * @param start - The index of the string's opening quote.
 * @param end - The index of its closing quote.
 * @param top - The innermost open object or array.
 */
function checkKey(text: string, start: number, end: number, top: JsonFrame | undefined): void {
    if (top?.keys === undefined || !top.expectKey) {
        return;
    }

    let key: string;
    try {
        key = JSON.parse(text.slice(start, end + 1)) as string;
    } catch {
        refuse("E_MODEL_STRUCTURE", { rule: "json" });
    }

    if (key === "__proto__" || top.keys.has(key)) {
        refuse("E_MODEL_STRUCTURE", { rule: "json", key: cut(key) });
    }

    top.keys.add(key);
    top.expectKey = false;
}

/**
 * Follow one structural character outside a string: open, close, or a comma.
 * @param c - The character.
 * @param stack - The open objects and arrays.
 */
function stepStructure(c: string, stack: JsonFrame[]): void {
    if (c === "{" || c === "[") {
        stack.push({ keys: c === "{" ? new Set() : undefined, expectKey: c === "{" });
        if (stack.length > GLTF_CAPS.depth) {
            refuse("E_MODEL_STRUCTURE", { rule: "depth" });
        }
    } else if (c === "}" || c === "]") {
        stack.pop();
    } else if (c === ",") {
        const top = stack.at(-1);
        if (top?.keys !== undefined) {
            top.expectKey = true;
        }
    }
}

/**
 * Refuse JSON text holding a `__proto__` key, a duplicate key, or more than 64 levels of nesting.
 * Syntax is left to `JSON.parse`, which runs after.
 * @param text - The JSON text.
 */
export function checkJsonText(text: string): void {
    const stack: JsonFrame[] = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] === '"') {
            const end = stringEnd(text, i);
            checkKey(text, i, end, stack.at(-1));
            i = end + 1;
        } else {
            stepStructure(text[i], stack);
            i++;
        }
    }
}

/**
 * Parse glTF JSON text after {@link checkJsonText}.
 * @param text - The text.
 * @returns The parsed object.
 */
export function parseGltfJson(text: string): Record<string, unknown> {
    checkJsonText(text);
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        refuse("E_MODEL_STRUCTURE", { rule: "json" });
    }

    if (!isObject(json)) {
        refuse("E_MODEL_STRUCTURE", { rule: "json" });
    }

    return json;
}

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A top-level array of objects, or an empty one when absent.
 * @param json - The glTF.
 * @param key - The array's name.
 * @returns Its entries.
 */
function list(json: Record<string, unknown>, key: string): Record<string, unknown>[] {
    const value = json[key];
    if (value === undefined) {
        return [];
    }

    if (!Array.isArray(value) || !value.every(isObject)) {
        refuse("E_MODEL_STRUCTURE", { rule: "json", key });
    }

    return value;
}

/**
 * Check an optional index into an array of a given length.
 * @param value - The index, or undefined.
 * @param length - The array's length.
 * @param where - What holds it, for the refusal.
 * @returns The index, or undefined when absent.
 */
function index(value: unknown, length: number, where: string): number | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value >= length) {
        refuse("E_MODEL_STRUCTURE", { rule: "index", where });
    }

    return value;
}

/**
 * Check a non-negative integer field.
 * @param value - The field.
 * @param where - What holds it.
 * @param fallback - The value when absent.
 * @returns The integer.
 */
function integer(value: unknown, where: string, fallback?: number): number {
    if (value === undefined && fallback !== undefined) {
        return fallback;
    }

    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
        refuse("E_MODEL_STRUCTURE", { rule: "accessor", where });
    }

    return value;
}

/**
 * Refuse a count over its cap.
 * @param item - What is counted.
 * @param found - How many.
 * @param limit - The cap.
 */
function cap(item: string, found: number, limit: number): void {
    if (found > limit) {
        refuse("E_MODEL_TOO_LARGE", { what: "count", item, found, limit });
    }
}

/**
 * The triangles a primitive draws.
 * @param mode - The glTF primitive mode.
 * @param count - Its index (or vertex) count.
 * @returns Triangles for triangle lists, strips and fans; 0 for points and lines.
 */
function trianglesOf(mode: unknown, count: number): number {
    if (mode === 4) {
        return Math.floor(count / 3);
    }

    return mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0;
}

/** What {@link checkGltf} reads. */
/**
 * Look up every file a glTF names -- buffers, then images -- before any structure check, so every
 * missing or ambiguous part is found at once (design 12.4).
 * @param json - The glTF.
 * @param path - Its path in the set.
 * @param files - The set.
 * @param findings - Where missing parts and substitutions go.
 */
export function findGltfParts(
    json: Record<string, unknown>,
    path: string,
    files: ReadonlyMap<string, Uint8Array>,
    findings: Findings,
): void {
    for (const [key, role] of [
        ["buffers", "geometry"],
        ["images", "texture"],
    ] as const) {
        const entries = Array.isArray(json[key]) ? (json[key] as unknown[]) : [];
        for (const entry of entries) {
            if (isObject(entry) && typeof entry.uri === "string") {
                findReference(entry.uri, path, files, role, findings);
            }
        }
    }
}

export interface GltfInput {
    /** The parsed JSON. */
    readonly json: Record<string, unknown>;
    /** A GLB's binary chunk. */
    readonly bin?: Uint8Array;
    /** The path of the glTF or GLB in the set, which references resolve against. */
    readonly path: string;
    /** The whole file set. */
    readonly files: ReadonlyMap<string, Uint8Array>;
    /** The limits in force. */
    readonly limits: ModelLimits;
    /** "glb" or "gltf". */
    readonly format: "glb" | "gltf";
}

/** What {@link checkGltf} returns. */
export interface GltfChecked {
    readonly summary: ModelSummary;
    readonly warnings: readonly CodedFact[];
}

/**
 * Check the extensions a glTF requires and uses.
 * @param json - The glTF.
 * @returns The required extensions.
 */
function checkExtensions(json: Record<string, unknown>): string[] {
    const required = Array.isArray(json.extensionsRequired)
        ? json.extensionsRequired.filter((e) => typeof e === "string")
        : [];
    const used = Array.isArray(json.extensionsUsed) ? json.extensionsUsed : [];
    if (used.includes("EXT_mesh_gpu_instancing") || required.includes("EXT_mesh_gpu_instancing")) {
        refuse("E_MODEL_STRUCTURE", { rule: "instancing" });
    }

    for (const extension of required) {
        const decoder = DECODERS.get(extension);
        if (decoder !== undefined) {
            refuse("E_MODEL_DECODER_UNAVAILABLE", { extension, package: decoder });
        }

        if (!READABLE_EXTENSIONS.has(extension)) {
            refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: "gltf", extension: cut(extension) });
        }
    }

    return required;
}

/**
 * Each node's parent, refusing a node that is its own child or has two parents.
 * @param nodes - The glTF's nodes.
 * @returns The parent of each node, or -1 for a root.
 */
function parentsOf(nodes: readonly Record<string, unknown>[]): Int32Array {
    const parent = new Int32Array(nodes.length).fill(-1);
    for (let i = 0; i < nodes.length; i++) {
        const children = nodes[i].children ?? [];
        if (!Array.isArray(children)) {
            refuse("E_MODEL_STRUCTURE", { rule: "json", key: "children" });
        }

        for (const child of children) {
            const c = index(child, nodes.length, "node.children") as number;
            if (c === i) {
                refuse("E_MODEL_STRUCTURE", { rule: "cycle" });
            }

            if (parent[c] !== -1) {
                refuse("E_MODEL_STRUCTURE", { rule: "parent" });
            }

            parent[c] = i;
        }
    }

    return parent;
}

/**
 * Walk down from the roots, iteratively, refusing a tree over 64 deep; a node a root never reaches
 * sits on a cycle.
 * @param nodes - The glTF's nodes.
 * @param parent - Each node's parent.
 */
function checkDepth(nodes: readonly Record<string, unknown>[], parent: Int32Array): void {
    const depth = new Int32Array(nodes.length).fill(-1);
    const stack: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
        if (parent[i] === -1) {
            depth[i] = 1;
            stack.push(i);
        }
    }

    while (stack.length > 0) {
        const n = stack.pop() as number;
        if (depth[n] > GLTF_CAPS.depth) {
            refuse("E_MODEL_STRUCTURE", { rule: "depth" });
        }

        for (const child of (nodes[n].children ?? []) as number[]) {
            depth[child] = depth[n] + 1;
            stack.push(child);
        }
    }

    if (depth.includes(-1)) {
        refuse("E_MODEL_STRUCTURE", { rule: "cycle" });
    }
}

/**
 * The roots of the scene that is drawn: `scene`, else the first, else every root. Checks every
 * scene's node indices too.
 * @param json - The glTF.
 * @param nodes - Its nodes.
 * @param parent - Each node's parent.
 * @returns The root nodes.
 */
function sceneRoots(
    json: Record<string, unknown>,
    nodes: readonly Record<string, unknown>[],
    parent: Int32Array,
): number[] {
    const scenes = list(json, "scenes");
    const sceneIndex = index(json.scene, scenes.length, "scene") ?? (scenes.length > 0 ? 0 : undefined);
    let roots: number[];
    if (sceneIndex === undefined) {
        roots = [...parent.keys()].filter((i) => parent[i] === -1);
    } else {
        const sceneNodes = scenes[sceneIndex].nodes ?? [];
        if (!Array.isArray(sceneNodes)) {
            refuse("E_MODEL_STRUCTURE", { rule: "json", key: "scene.nodes" });
        }

        roots = sceneNodes.map((n) => index(n, nodes.length, "scene.nodes") as number);
    }

    for (const scene of scenes) {
        const each = Array.isArray(scene.nodes) ? scene.nodes : [];
        for (const n of each) {
            index(n, nodes.length, "scene.nodes");
        }
    }

    return roots;
}

/**
 * The nodes reached from the roots, each once.
 * @param nodes - The glTF's nodes.
 * @param roots - Where to start.
 * @returns The nodes, in walk order.
 */
function reachedFrom(nodes: readonly Record<string, unknown>[], roots: readonly number[]): number[] {
    const reached: number[] = [];
    const seen = new Uint8Array(nodes.length);
    const walk = [...roots];
    while (walk.length > 0) {
        const n = walk.pop() as number;
        if (seen[n] === 1) {
            continue;
        }

        seen[n] = 1;
        reached.push(n);
        walk.push(...((nodes[n].children ?? []) as number[]));
    }

    return reached;
}

/**
 * Check that the nodes form a forest at most 64 deep, and return the nodes the scene reaches.
 * @param json - The glTF.
 * @param nodes - Its nodes.
 * @returns The scene's nodes, each once.
 */
function checkTree(json: Record<string, unknown>, nodes: readonly Record<string, unknown>[]): number[] {
    const parent = parentsOf(nodes);
    checkDepth(nodes, parent);
    return reachedFrom(nodes, sceneRoots(json, nodes, parent));
}

/**
 * The bytes behind each buffer: a GLB's binary chunk, a file in the set, or a `data:` URL.
 * @param input - The glTF input.
 * @param buffers - Its buffers.
 * @returns Each buffer's bytes.
 */
function bufferBytes(input: GltfInput, buffers: readonly Record<string, unknown>[]): Uint8Array[] {
    return buffers.map((buffer, i) => {
        const declared = integer(buffer.byteLength, "buffer.byteLength");
        let bytes: Uint8Array;
        if (buffer.uri === undefined) {
            if (i !== 0 || input.bin === undefined) {
                refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "buffer" });
            }

            bytes = input.bin;
        } else {
            if (typeof buffer.uri !== "string") {
                refuse("E_MODEL_STRUCTURE", { rule: "json", key: "buffer.uri" });
            }

            ({ bytes } = resolveReference(buffer.uri, input.path, input.files));
        }

        if (declared > bytes.length) {
            refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "buffer.byteLength" });
        }

        return bytes;
    });
}

/**
 * Check every buffer view, accessor and their sizes; refuse when the decoded total is over the limit.
 * @param json - The glTF.
 * @param buffers - Each buffer's bytes.
 * @param limits - The limits in force.
 * @returns The accessors and the views, checked.
 */
function checkAccessors(
    json: Record<string, unknown>,
    buffers: readonly Uint8Array[],
    limits: ModelLimits,
): { accessors: Record<string, unknown>[]; views: Record<string, unknown>[] } {
    const views = list(json, "bufferViews");
    for (const view of views) {
        const buffer = index(view.buffer, buffers.length, "bufferView.buffer") as number;
        if (view.buffer === undefined) {
            refuse("E_MODEL_STRUCTURE", { rule: "index", where: "bufferView.buffer" });
        }

        const end =
            integer(view.byteOffset, "bufferView.byteOffset", 0) + integer(view.byteLength, "bufferView.byteLength");
        if (end > buffers[buffer].length) {
            refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "bufferView" });
        }
    }

    const accessors = list(json, "accessors");
    let decoded = 0;
    const fits = (viewIndex: unknown, offset: number, count: number, size: number, stride?: number): void => {
        const v = index(viewIndex, views.length, "accessor.bufferView");
        if (v === undefined) {
            return;
        }

        const step = integer(views[v].byteStride, "bufferView.byteStride", stride ?? size) || size;
        if (offset + step * (count - 1) + size > integer(views[v].byteLength, "bufferView.byteLength")) {
            refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "accessor" });
        }
    };

    for (const accessor of accessors) {
        const component = COMPONENT_BYTES[accessor.componentType as number];
        const components = TYPE_COMPONENTS[accessor.type as string];
        if (component === undefined || components === undefined) {
            refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "accessor.type" });
        }

        const count = integer(accessor.count, "accessor.count");
        if (count < 1) {
            refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "accessor.count" });
        }

        const size = component * components;
        decoded += count * size;
        fits(accessor.bufferView, integer(accessor.byteOffset, "accessor.byteOffset", 0), count, size);

        if (accessor.sparse !== undefined) {
            const sparse = accessor.sparse as Record<string, unknown>;
            const sparseCount = integer(sparse.count, "accessor.sparse.count");
            const indices = (sparse.indices ?? {}) as Record<string, unknown>;
            const values = (sparse.values ?? {}) as Record<string, unknown>;
            const indexBytes = COMPONENT_BYTES[indices.componentType as number] ?? 4;
            fits(
                indices.bufferView,
                integer(indices.byteOffset, "sparse.byteOffset", 0),
                sparseCount,
                indexBytes,
                indexBytes,
            );
            fits(values.bufferView, integer(values.byteOffset, "sparse.byteOffset", 0), sparseCount, size, size);
            decoded += sparseCount * (size + indexBytes);
        }

        if (decoded > limits.maxDecodedBytes) {
            refuse("E_MODEL_TOO_LARGE", { what: "decodedBytes", found: decoded, limit: limits.maxDecodedBytes });
        }
    }

    return { accessors, views };
}

/** A box around a model's positions. */
interface Bounds {
    min: [number, number, number];
    max: [number, number, number];
}

/** What the meshes of a glTF add up to. */
interface MeshTally {
    /** Triangles per mesh, for one use of it. */
    readonly triangles: Float64Array;
    morphTargets: number;
    bounds: Bounds | undefined;
}

/**
 * Refuse a node whose mesh, skin or camera index is out of range, or that asks for instancing.
 * @param nodes - The glTF's nodes.
 * @param meshes - How many meshes it has.
 * @param skins - How many skins.
 * @param cameras - How many cameras.
 */
function checkNodes(nodes: readonly Record<string, unknown>[], meshes: number, skins: number, cameras: number): void {
    for (const node of nodes) {
        index(node.mesh, meshes, "node.mesh");
        index(node.skin, skins, "node.skin");
        index(node.camera, cameras, "node.camera");
        if (isObject(node.extensions) && "EXT_mesh_gpu_instancing" in node.extensions) {
            refuse("E_MODEL_STRUCTURE", { rule: "instancing" });
        }
    }
}

/**
 * Grow a box by a POSITION accessor's `min` and `max`, when it has both.
 * @param bounds - The box so far.
 * @param accessor - The accessor.
 * @returns The grown box.
 */
function mergeBounds(bounds: Bounds | undefined, accessor: Record<string, unknown>): Bounds | undefined {
    const { min, max } = accessor;
    if (!Array.isArray(min) || !Array.isArray(max) || min.length !== 3 || max.length !== 3) {
        return bounds;
    }

    const lo = min as [number, number, number];
    const hi = max as [number, number, number];
    if (bounds === undefined) {
        return { min: [...lo], max: [...hi] };
    }

    return {
        min: [Math.min(bounds.min[0], lo[0]), Math.min(bounds.min[1], lo[1]), Math.min(bounds.min[2], lo[2])],
        max: [Math.max(bounds.max[0], hi[0]), Math.max(bounds.max[1], hi[1]), Math.max(bounds.max[2], hi[2])],
    };
}

/**
 * Check a primitive's morph targets: within the cap, every accessor index in range.
 * @param targets - The targets.
 * @param accessors - How many accessors the glTF has.
 */
function checkTargets(targets: readonly unknown[], accessors: number): void {
    cap("morphTargets", targets.length, GLTF_CAPS.morphTargets);
    for (const target of targets) {
        for (const a of Object.values(isObject(target) ? target : {})) {
            index(a, accessors, "primitive.targets");
        }
    }
}

/**
 * Check one primitive and add its triangles, morph targets and bounds to the tally.
 * @param primitive - The primitive.
 * @param m - The mesh it belongs to.
 * @param accessors - The glTF's accessors.
 * @param materials - How many materials it has.
 * @param tally - Where it is counted.
 */
function tallyPrimitive(
    primitive: unknown,
    m: number,
    accessors: readonly Record<string, unknown>[],
    materials: number,
    tally: MeshTally,
): void {
    if (!isObject(primitive) || !isObject(primitive.attributes)) {
        refuse("E_MODEL_STRUCTURE", { rule: "json", key: "mesh.primitives" });
    }

    for (const a of Object.values(primitive.attributes)) {
        index(a, accessors.length, "primitive.attributes");
    }

    const position = index(primitive.attributes.POSITION, accessors.length, "primitive.attributes");
    const indices = index(primitive.indices, accessors.length, "primitive.indices");
    index(primitive.material, materials, "primitive.material");
    const targets = Array.isArray(primitive.targets) ? primitive.targets : [];
    checkTargets(targets, accessors.length);
    tally.morphTargets += targets.length;

    const counted = indices ?? position;
    const count = counted === undefined ? 0 : (accessors[counted].count as number);
    tally.triangles[m] += trianglesOf(primitive.mode ?? 4, count);

    if (position !== undefined) {
        tally.bounds = mergeBounds(tally.bounds, accessors[position]);
    }
}

/**
 * Check every mesh's primitives, and count their triangles, morph targets and bounds.
 * @param meshes - The glTF's meshes.
 * @param accessors - Its accessors.
 * @param materials - How many materials it has.
 * @returns The tally.
 */
function tallyMeshes(
    meshes: readonly Record<string, unknown>[],
    accessors: readonly Record<string, unknown>[],
    materials: number,
): MeshTally {
    const tally: MeshTally = { triangles: new Float64Array(meshes.length), morphTargets: 0, bounds: undefined };
    meshes.forEach((mesh, m) => {
        const primitives = Array.isArray(mesh.primitives) ? (mesh.primitives as unknown[]) : [];
        for (const primitive of primitives) {
            tallyPrimitive(primitive, m, accessors, materials, tally);
        }
    });

    return tally;
}

/**
 * Triangles per use: each scene node that draws a mesh adds that mesh's triangles.
 * @param reached - The scene's nodes.
 * @param nodes - The glTF's nodes.
 * @param triangles - Triangles per mesh.
 * @param limits - The limits in force.
 * @returns The triangles drawn.
 */
function drawnTriangles(
    reached: readonly number[],
    nodes: readonly Record<string, unknown>[],
    triangles: Float64Array,
    limits: ModelLimits,
): number {
    let drawn = 0;
    for (const n of reached) {
        const m = nodes[n].mesh;
        if (typeof m === "number") {
            drawn += triangles[m];
            if (drawn > limits.maxTriangles) {
                refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: drawn, limit: limits.maxTriangles });
            }
        }
    }

    return drawn;
}

/**
 * Check every skin: joints within the cap, every index in range.
 * @param skins - The glTF's skins.
 * @param nodes - How many nodes it has.
 * @param accessors - How many accessors.
 */
function checkSkins(skins: readonly Record<string, unknown>[], nodes: number, accessors: number): void {
    for (const skin of skins) {
        const joints = Array.isArray(skin.joints) ? skin.joints : [];
        cap("joints", joints.length, GLTF_CAPS.joints);
        joints.forEach((j) => index(j, nodes, "skin.joints"));
        index(skin.inverseBindMatrices, accessors, "skin.inverseBindMatrices");
        index(skin.skeleton, nodes, "skin.skeleton");
    }
}

/**
 * Check every texture's image and sampler, and every material's texture slots.
 * @param textures - The glTF's textures.
 * @param materials - Its materials.
 * @param images - How many images it has.
 * @param samplers - How many samplers.
 */
function checkTextureIndices(
    textures: readonly Record<string, unknown>[],
    materials: readonly Record<string, unknown>[],
    images: number,
    samplers: number,
): void {
    for (const texture of textures) {
        index(texture.source, images, "texture.source");
        index(texture.sampler, samplers, "texture.sampler");
    }

    for (const material of materials) {
        const pbr = isObject(material.pbrMetallicRoughness) ? material.pbrMetallicRoughness : {};
        for (const slot of [
            pbr.baseColorTexture,
            pbr.metallicRoughnessTexture,
            material.normalTexture,
            material.occlusionTexture,
            material.emissiveTexture,
        ]) {
            if (isObject(slot)) {
                index(slot.index, textures.length, "material.texture");
            }
        }
    }
}

/**
 * The bytes of an image, wherever it lives: a buffer view, a file in the set, or a `data:` URL.
 * @param image - The image.
 * @param i - Its index, for the refusal.
 * @param input - The glTF input.
 * @param views - Its buffer views.
 * @param buffers - Each buffer's bytes.
 * @returns The bytes.
 */
function imageBytes(
    image: Record<string, unknown>,
    i: number,
    input: GltfInput,
    views: readonly Record<string, unknown>[],
    buffers: readonly Uint8Array[],
): Uint8Array {
    if (image.bufferView !== undefined) {
        const v = index(image.bufferView, views.length, "image.bufferView") as number;
        const view = views[v];
        const offset = integer(view.byteOffset, "bufferView.byteOffset", 0);
        return buffers[view.buffer as number].subarray(offset, offset + (view.byteLength as number));
    }

    if (typeof image.uri === "string") {
        return resolveReference(image.uri, input.path, input.files).bytes;
    }

    return refuse("E_MODEL_STRUCTURE", { rule: "image", name: `image ${i}` });
}

/**
 * Image sizes from their headers, against the texture byte limit.
 * @param images - The glTF's images.
 * @param input - The glTF input.
 * @param views - Its buffer views.
 * @param buffers - Each buffer's bytes.
 * @returns The decoded bytes of every image.
 */
function imageTextureBytes(
    images: readonly Record<string, unknown>[],
    input: GltfInput,
    views: readonly Record<string, unknown>[],
    buffers: readonly Uint8Array[],
): number {
    const { limits } = input;
    let textureBytes = 0;
    images.forEach((image, i) => {
        const bytes = imageBytes(image, i, input, views, buffers);
        textureBytes += textureBytesOf(bytes, typeof image.name === "string" ? image.name : `image ${i}`);
        if (textureBytes > limits.maxTextureBytes) {
            refuse("E_MODEL_TOO_LARGE", { what: "textureBytes", found: textureBytes, limit: limits.maxTextureBytes });
        }
    });

    return textureBytes;
}

/**
 * Check an animation's samplers, and how long it runs: the greatest first `max` of their inputs.
 * @param samplers - The animation's samplers.
 * @param accessors - The glTF's accessors.
 * @returns The seconds.
 */
function clipSeconds(samplers: readonly unknown[], accessors: readonly Record<string, unknown>[]): number {
    let seconds = 0;
    for (const sampler of samplers) {
        const input = isObject(sampler) ? index(sampler.input, accessors.length, "animation.sampler") : undefined;
        index(isObject(sampler) ? sampler.output : undefined, accessors.length, "animation.sampler");
        const max = input === undefined ? undefined : accessors[input].max;
        if (Array.isArray(max) && typeof max[0] === "number") {
            seconds = Math.max(seconds, max[0]);
        }
    }

    return seconds;
}

/**
 * Check an animation's channels: sampler and target node in range.
 * @param animation - The animation.
 * @param samplers - How many samplers it has.
 * @param nodes - How many nodes the glTF has.
 */
function checkChannels(animation: Record<string, unknown>, samplers: number, nodes: number): void {
    const channels = Array.isArray(animation.channels) ? (animation.channels as unknown[]) : [];
    for (const channel of channels) {
        if (isObject(channel)) {
            index(channel.sampler, samplers, "animation.channel");
            index(isObject(channel.target) ? channel.target.node : undefined, nodes, "animation.channel");
        }
    }
}

/**
 * Check every animation and name and time it.
 * @param animations - The glTF's animations.
 * @param accessors - Its accessors.
 * @param nodes - How many nodes it has.
 * @returns One clip per animation.
 */
function animationClips(
    animations: readonly Record<string, unknown>[],
    accessors: readonly Record<string, unknown>[],
    nodes: number,
): { readonly name: string; readonly seconds: number }[] {
    return animations.map((animation) => {
        const animSamplers = Array.isArray(animation.samplers) ? (animation.samplers as unknown[]) : [];
        const seconds = clipSeconds(animSamplers, accessors);
        checkChannels(animation, animSamplers.length, nodes);
        return Object.freeze({ name: cut(typeof animation.name === "string" ? animation.name : ""), seconds });
    });
}

/**
 * Check a glTF and summarize it.
 * @param input - The parsed glTF and its files.
 * @returns The summary and the warnings it earns.
 * @throws Refusal for every structural or size problem.
 */
export function checkGltf(input: GltfInput): GltfChecked {
    const { json, limits } = input;
    const { asset } = json;
    if (!isObject(asset) || typeof asset.version !== "string" || !asset.version.startsWith("2")) {
        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: "gltf1", fileName: cut(input.path) });
    }

    const extensionsRequired = checkExtensions(json);
    const nodes = list(json, "nodes");
    const meshes = list(json, "meshes");
    const materials = list(json, "materials");
    const textures = list(json, "textures");
    const images = list(json, "images");
    const samplers = list(json, "samplers");
    const skins = list(json, "skins");
    const animations = list(json, "animations");
    const cameras = list(json, "cameras");

    const reached = checkTree(json, nodes);
    const buffers = bufferBytes(input, list(json, "buffers"));
    const { accessors, views } = checkAccessors(json, buffers, limits);

    // Every index the loader follows.
    checkNodes(nodes, meshes.length, skins.length, cameras.length);
    const { triangles, morphTargets, bounds } = tallyMeshes(meshes, accessors, materials.length);
    const drawn = drawnTriangles(reached, nodes, triangles, limits);

    cap("nodes", nodes.length, GLTF_CAPS.nodes);
    cap("meshes", meshes.length, GLTF_CAPS.meshes);
    cap("materials", materials.length, GLTF_CAPS.materials);
    cap("textures", textures.length, GLTF_CAPS.textures);
    cap("animations", animations.length, GLTF_CAPS.animations);

    checkSkins(skins, nodes.length, accessors.length);
    checkTextureIndices(textures, materials, images.length, samplers.length);
    const textureBytes = imageTextureBytes(images, input, views, buffers);
    const clips = animationClips(animations, accessors, nodes.length);

    const summary: ModelSummary = Object.freeze({
        format: input.format,
        triangles: drawn,
        meshes: meshes.length,
        materials: Object.freeze(materials.map((m) => cut(typeof m.name === "string" ? m.name : ""))),
        textures: textures.length,
        textureBytes,
        ...(bounds === undefined ? {} : { bounds: Object.freeze(bounds) }),
        upAxis: "y" as const,
        animations: Object.freeze(clips),
        skinned: skins.length > 0,
        morphTargets,
        transparent: materials.some((m) => m.alphaMode === "BLEND"),
        extensionsRequired: Object.freeze(extensionsRequired.map(cut)),
    });

    const warnings: CodedFact[] = [];
    if (clips.length > 0) {
        warnings.push({ code: "W_MODEL_HAS_ANIMATIONS", params: { clips: clips.map((c) => c.name) } });
    }

    return { summary, warnings };
}

/**
 * Split a GLB into its JSON and binary chunks, checking the container.
 * @param bytes - The GLB.
 * @returns The JSON text and the binary chunk.
 */
export function readGlb(bytes: Uint8Array): { text: string; bin?: Uint8Array } {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 20 || view.getUint32(4, true) !== 2) {
        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: "glb1" });
    }

    const length = view.getUint32(8, true);
    if (length > bytes.length) {
        refuse("E_MODEL_STRUCTURE", { rule: "length" });
    }

    const jsonLength = view.getUint32(12, true);
    if (view.getUint32(16, true) !== 0x4e4f534a || 20 + jsonLength > length) {
        refuse("E_MODEL_STRUCTURE", { rule: "json" });
    }

    let text: string;
    try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(20, 20 + jsonLength));
    } catch {
        refuse("E_MODEL_STRUCTURE", { rule: "json" });
    }

    // Chunk lengths include their padding, so the binary chunk starts right after the JSON one.
    const binAt = 20 + jsonLength;
    if (binAt + 8 <= length && view.getUint32(binAt + 4, true) === 0x004e4942) {
        const binLength = view.getUint32(binAt, true);
        if (binAt + 8 + binLength > length) {
            refuse("E_MODEL_STRUCTURE", { rule: "length" });
        }

        return { text, bin: bytes.subarray(binAt + 8, binAt + 8 + binLength) };
    }

    return { text };
}
