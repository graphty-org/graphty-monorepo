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
 * - a required extension the loader does not read is refused; `EXT_mesh_gpu_instancing` is read,
 *   its instances counted toward the triangle limit, and refused when its attributes disagree;
 * - a meshopt-compressed view's source fits its buffer, and its decoded size counts toward the
 *   limit; a Draco primitive's buffer view and attribute ids are in range;
 * - image sizes are read from their headers (in buffer views and `data:` URLs too).
 *
 * A glTF 1.0 file is upgraded to 2.0 JSON first (./readers/gltf1.ts) and checked as that.
 *
 * What comes out is the model's summary, built from the same JSON.
 */

import {
    cap,
    cut,
    dirOf,
    type Findings,
    findReference,
    refuse,
    resolveReference,
    setKeyOf,
    textureBytesOf,
} from "./references.js";
import type { ModelCompression, ModelFact, ModelLimits, ModelPicture, ModelSummary } from "./types.js";

/** How deep a glTF's JSON and node tree may nest, so reading it cannot exhaust the stack. */
const MAX_DEPTH = 64;

/**
 * Required extensions the bundled loader reads (src/load/loaders.ts registers each, and
 * src/decoders/ the decoders). The transmission family (transmission, volume, dispersion,
 * diffuse_transmission, volume_scatter) is not: it needs a scene-wide render target that thousands
 * of instances cannot afford, so a file that only uses it draws opaque.
 */
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
    "EXT_texture_avif",
    "KHR_materials_anisotropy",
    "KHR_materials_iridescence",
    "KHR_materials_variants",
    "KHR_materials_diffuse_roughness",
    "KHR_materials_coat",
    "KHR_materials_fuzz",
    "KHR_lights_punctual",
    "KHR_node_visibility",
    "KHR_xmp_json_ld",
    "MSFT_sRGBFactors",
    "KHR_draco_mesh_compression",
    "EXT_meshopt_compression",
    "KHR_meshopt_compression",
    "KHR_texture_basisu",
    "EXT_mesh_gpu_instancing",
]);

/**
 * Required extensions that are drawn without: the transmission family. A part using one is drawn
 * with `W_MODEL_EXTENSION_IGNORED`, rather than the whole model refused: a transmissive part alpha
 * blended by its transmission factor unless it is a solid volume (see loadModel), the others opaque.
 */
export const IGNORED_EXTENSIONS: ReadonlySet<string> = new Set([
    "KHR_materials_transmission",
    "KHR_materials_volume",
    "KHR_materials_dispersion",
    "KHR_materials_diffuse_transmission",
    "KHR_materials_volume_scatter",
]);

/** The compression each glTF extension stands for, in {@link ModelCompression} terms. */
const COMPRESSION: ReadonlyMap<string, ModelCompression> = new Map([
    ["KHR_draco_mesh_compression", "draco"],
    ["EXT_meshopt_compression", "meshopt"],
    ["KHR_meshopt_compression", "meshopt"],
    ["KHR_texture_basisu", "ktx2"],
    ["EXT_texture_webp", "webp"],
    ["EXT_texture_avif", "avif"],
]);

/** The two names of meshopt compression. */
const MESHOPT = ["EXT_meshopt_compression", "KHR_meshopt_compression"];

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
        if (stack.length > MAX_DEPTH) {
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
function checkJsonText(text: string): void {
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
    /** The JSON was upgraded from glTF 1.0. */
    readonly upgraded?: boolean;
}

/** What {@link checkGltf} returns. */
export interface GltfChecked {
    readonly summary: ModelSummary;
    readonly warnings: readonly ModelFact[];
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
    for (const extension of required) {
        if (!READABLE_EXTENSIONS.has(extension) && !IGNORED_EXTENSIONS.has(extension)) {
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
        if (depth[n] > MAX_DEPTH) {
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
 * Whether a buffer is a meshopt fallback: declared, holding no data, read only through
 * meshopt-compressed views.
 * @param buffer - The buffer.
 * @returns True for a fallback.
 */
function isMeshoptFallback(buffer: Record<string, unknown>): boolean {
    const extensions = isObject(buffer.extensions) ? buffer.extensions : {};
    return MESHOPT.some((name) => isObject(extensions[name]) && extensions[name].fallback === true);
}

/**
 * The bytes behind each buffer: a GLB's binary chunk, a file in the set, or a `data:` URL. A
 * meshopt fallback with no `uri` has none (its length is its declared one).
 * @param input - The glTF input.
 * @param buffers - Its buffers.
 * @returns Each buffer's bytes.
 */
function bufferBytes(input: GltfInput, buffers: readonly Record<string, unknown>[]): Uint8Array[] {
    return buffers.map((buffer, i) => {
        const declared = integer(buffer.byteLength, "buffer.byteLength");
        let bytes: Uint8Array;
        if (buffer.uri === undefined && isMeshoptFallback(buffer) && (i !== 0 || input.bin === undefined)) {
            return new Uint8Array(0);
        } else if (buffer.uri === undefined) {
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
 * Check a meshopt-compressed view's source range against its buffer's bytes, and return what it
 * decodes to.
 * @param view - The buffer view.
 * @param buffers - Each buffer's bytes.
 * @returns The decoded bytes, or 0 for a view that is not compressed.
 */
function meshoptBytes(view: Record<string, unknown>, buffers: readonly Uint8Array[]): number {
    const extensions = isObject(view.extensions) ? view.extensions : {};
    const name = MESHOPT.find((n) => isObject(extensions[n]));
    if (name === undefined) {
        return 0;
    }

    const meshopt = extensions[name] as Record<string, unknown>;
    const buffer = index(meshopt.buffer, buffers.length, "meshopt.buffer");
    if (buffer === undefined) {
        refuse("E_MODEL_STRUCTURE", { rule: "index", where: "meshopt.buffer" });
    }

    const end =
        integer(meshopt.byteOffset, "meshopt.byteOffset", 0) + integer(meshopt.byteLength, "meshopt.byteLength");
    if (end > buffers[buffer].length) {
        refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "meshopt" });
    }

    const decoded = integer(meshopt.count, "meshopt.count") * integer(meshopt.byteStride, "meshopt.byteStride");
    if (decoded > integer(view.byteLength, "bufferView.byteLength")) {
        refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "meshopt" });
    }

    return decoded;
}

/**
 * Check that every buffer view lies inside its buffer.
 * @param json - The glTF JSON.
 * @param views - Its buffer views.
 * @param buffers - Each buffer's bytes.
 * @returns The bytes the compressed views decode to.
 */
function checkViews(
    json: Record<string, unknown>,
    views: readonly Record<string, unknown>[],
    buffers: readonly Uint8Array[],
): number {
    const declared = list(json, "buffers").map((b) => integer(b.byteLength, "buffer.byteLength"));
    let decoded = 0;
    for (const view of views) {
        const buffer = index(view.buffer, buffers.length, "bufferView.buffer") as number;
        if (view.buffer === undefined) {
            refuse("E_MODEL_STRUCTURE", { rule: "index", where: "bufferView.buffer" });
        }

        // A compressed view's own range is in a fallback buffer that holds nothing.
        const compressed = meshoptBytes(view, buffers);
        decoded += compressed;
        const end =
            integer(view.byteOffset, "bufferView.byteOffset", 0) + integer(view.byteLength, "bufferView.byteLength");
        if (end > (compressed > 0 ? Math.max(buffers[buffer].length, declared[buffer]) : buffers[buffer].length)) {
            refuse("E_MODEL_STRUCTURE", { rule: "accessor", where: "bufferView" });
        }
    }

    return decoded;
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
    let decoded = checkViews(json, views, buffers);
    const accessors = list(json, "accessors");
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
    /** The most morph targets one primitive has. */
    mostTargets: number;
    bounds: Bounds | undefined;
}

/**
 * How many copies of its mesh a node draws: its `EXT_mesh_gpu_instancing` instance count, or 1.
 * @param node - The node.
 * @param accessors - The glTF's accessors.
 * @returns The count.
 * @throws ModelError when an instance attribute's accessor is out of range, or the counts disagree.
 */
function instancesOf(node: Record<string, unknown>, accessors: readonly Record<string, unknown>[]): number {
    const extension = isObject(node.extensions) ? node.extensions.EXT_mesh_gpu_instancing : undefined;
    if (extension === undefined) {
        return 1;
    }

    const attributes = isObject(extension) && isObject(extension.attributes) ? Object.values(extension.attributes) : [];
    const counts = new Set(
        attributes.map((a) => integer(accessors[index(a, accessors.length, "instancing") as number].count, "count")),
    );
    if (counts.size !== 1) {
        refuse("E_MODEL_STRUCTURE", { rule: "instancing" });
    }

    return [...counts][0];
}

/**
 * Refuse a node whose mesh, skin, camera or instance accessor index is out of range.
 * @param nodes - The glTF's nodes.
 * @param meshes - How many meshes it has.
 * @param skins - How many skins.
 * @param cameras - How many cameras.
 * @param accessors - Its accessors.
 */
function checkNodes(
    nodes: readonly Record<string, unknown>[],
    meshes: number,
    skins: number,
    cameras: number,
    accessors: readonly Record<string, unknown>[],
): void {
    for (const node of nodes) {
        index(node.mesh, meshes, "node.mesh");
        index(node.skin, skins, "node.skin");
        index(node.camera, cameras, "node.camera");
        instancesOf(node, accessors);
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
 * Check a primitive's morph targets: every accessor index in range.
 * @param targets - The targets.
 * @param accessors - How many accessors the glTF has.
 */
function checkTargets(targets: readonly unknown[], accessors: number): void {
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
 * @param views - How many buffer views the glTF has.
 */
function tallyPrimitive(
    primitive: unknown,
    m: number,
    accessors: readonly Record<string, unknown>[],
    materials: number,
    tally: MeshTally,
    views: number,
): void {
    if (!isObject(primitive) || !isObject(primitive.attributes)) {
        refuse("E_MODEL_STRUCTURE", { rule: "json", key: "mesh.primitives" });
    }

    for (const a of Object.values(primitive.attributes)) {
        index(a, accessors.length, "primitive.attributes");
    }

    checkDraco(primitive, views);
    const position = index(primitive.attributes.POSITION, accessors.length, "primitive.attributes");
    const indices = index(primitive.indices, accessors.length, "primitive.indices");
    index(primitive.material, materials, "primitive.material");
    const targets = Array.isArray(primitive.targets) ? primitive.targets : [];
    checkTargets(targets, accessors.length);
    tally.morphTargets += targets.length;
    tally.mostTargets = Math.max(tally.mostTargets, targets.length);

    const counted = indices ?? position;
    const count = counted === undefined ? 0 : (accessors[counted].count as number);
    tally.triangles[m] += trianglesOf(primitive.mode ?? 4, count);

    if (position !== undefined) {
        tally.bounds = mergeBounds(tally.bounds, accessors[position]);
    }
}

/**
 * Check a Draco-compressed primitive's buffer view and attribute ids.
 * @param primitive - The primitive.
 * @param views - How many buffer views the glTF has.
 */
function checkDraco(primitive: Record<string, unknown>, views: number): void {
    const extensions = isObject(primitive.extensions) ? primitive.extensions : {};
    const draco = extensions.KHR_draco_mesh_compression;
    if (draco === undefined) {
        return;
    }

    if (!isObject(draco) || index(draco.bufferView, views, "draco.bufferView") === undefined) {
        refuse("E_MODEL_STRUCTURE", { rule: "index", where: "draco.bufferView" });
    }

    for (const id of Object.values(isObject(draco.attributes) ? draco.attributes : {})) {
        integer(id, "draco.attributes");
    }
}

/**
 * Check every mesh's primitives, and count their triangles, morph targets and bounds.
 * @param meshes - The glTF's meshes.
 * @param accessors - Its accessors.
 * @param materials - How many materials it has.
 * @param views - How many buffer views the glTF has.
 * @returns The tally.
 */
function tallyMeshes(
    meshes: readonly Record<string, unknown>[],
    accessors: readonly Record<string, unknown>[],
    materials: number,
    views: number,
): MeshTally {
    const tally: MeshTally = {
        triangles: new Float64Array(meshes.length),
        morphTargets: 0,
        mostTargets: 0,
        bounds: undefined,
    };
    meshes.forEach((mesh, m) => {
        const primitives = Array.isArray(mesh.primitives) ? (mesh.primitives as unknown[]) : [];
        for (const primitive of primitives) {
            tallyPrimitive(primitive, m, accessors, materials, tally, views);
        }
    });

    return tally;
}

/**
 * Triangles per use: each scene node that draws a mesh adds that mesh's triangles, once per
 * GPU instance it asks for (each instance is baked into the template as its own copy).
 * @param reached - The scene's nodes.
 * @param nodes - The glTF's nodes.
 * @param triangles - Triangles per mesh.
 * @param limits - The limits in force.
 * @param accessors - The glTF's accessors.
 * @returns The triangles drawn.
 */
function drawnTriangles(
    reached: readonly number[],
    nodes: readonly Record<string, unknown>[],
    triangles: Float64Array,
    limits: ModelLimits,
    accessors: readonly Record<string, unknown>[],
): number {
    let drawn = 0;
    for (const n of reached) {
        const m = nodes[n].mesh;
        if (typeof m === "number") {
            drawn += triangles[m] * instancesOf(nodes[n], accessors);
            if (drawn > limits.maxTriangles) {
                refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: drawn, limit: limits.maxTriangles });
            }
        }
    }

    return drawn;
}

/**
 * Check every skin: every index in range.
 * @param skins - The glTF's skins.
 * @param nodes - How many nodes it has.
 * @param accessors - How many accessors.
 */
function checkSkins(skins: readonly Record<string, unknown>[], nodes: number, accessors: number): void {
    for (const skin of skins) {
        const joints = Array.isArray(skin.joints) ? skin.joints : [];
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
        const extensions = isObject(texture.extensions) ? texture.extensions : {};
        for (const name of ["EXT_texture_webp", "EXT_texture_avif", "KHR_texture_basisu"]) {
            const extension = extensions[name];
            if (isObject(extension)) {
                index(extension.source, images, "texture.source");
            }
        }
    }

    for (const slot of materials.flatMap(textureSlots)) {
        if (isObject(slot)) {
            index(slot.index, textures.length, "material.texture");
        }
    }
}

/**
 * A material's texture slots, set or not.
 * @param material - The material.
 * @returns Its five slots.
 */
function textureSlots(material: Record<string, unknown>): unknown[] {
    const pbr = isObject(material.pbrMetallicRoughness) ? material.pbrMetallicRoughness : {};
    return [
        pbr.baseColorTexture,
        pbr.metallicRoughnessTexture,
        material.normalTexture,
        material.occlusionTexture,
        material.emissiveTexture,
    ];
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
    return animations.map((animation, at) => {
        const animSamplers = Array.isArray(animation.samplers) ? (animation.samplers as unknown[]) : [];
        const seconds = clipSeconds(animSamplers, accessors);
        checkChannels(animation, animSamplers.length, nodes);
        // An unnamed clip is called what Babylon's glTF loader calls its animation group
        // (`animation.name || "animation" + index`), so the name listed is the name that plays.
        const named = typeof animation.name === "string" && animation.name !== "" ? animation.name : "";
        return Object.freeze({ name: cut(named === "" ? `animation${String(at)}` : named), seconds });
    });
}

/** Where a texture may name its image: its own `source`, or an image-format extension's. */
const SOURCE_EXTENSIONS = ["EXT_texture_webp", "EXT_texture_avif", "KHR_texture_basisu"];

/**
 * Each image's picture name: its name, else its `uri` (not a data URI), else `image<index>`, as
 * Babylon's glTF loader names it.
 * @param images - The glTF's images.
 * @returns The names, by image index.
 */
function pictureNames(images: readonly Record<string, unknown>[]): string[] {
    return images.map((image, at) => {
        if (typeof image.name === "string" && image.name !== "") {
            return cut(image.name);
        }

        return cut(typeof image.uri === "string" && !/^data:/i.test(image.uri) ? image.uri : `image${String(at)}`);
    });
}

/**
 * The images a texture may draw.
 * @param texture - The texture.
 * @returns Their indices.
 */
function sourcesOf(texture: Record<string, unknown> | undefined): number[] {
    if (texture === undefined) {
        return [];
    }

    const extensions = isObject(texture.extensions) ? texture.extensions : {};
    return [
        texture.source,
        ...SOURCE_EXTENSIONS.map((name) => (extensions[name] as { source?: unknown } | undefined)?.source),
    ].filter((source): source is number => typeof source === "number");
}

/**
 * Every texture reference in a material (`baseColorTexture`, `normalTexture`, an extension's
 * `...Texture`), with the object holding it, to read or drop.
 * @param value - The material, or a part of it.
 * @param found - Where each reference goes: its holder, its key and its texture index.
 */
function textureRefs(value: unknown, found: [Record<string, unknown>, string, number][]): void {
    if (!isObject(value)) {
        return;
    }

    for (const [key, entry] of Object.entries(value)) {
        if (key.endsWith("Texture") && isObject(entry) && typeof entry.index === "number") {
            found.push([value, key, entry.index]);
        } else {
            textureRefs(entry, found);
        }
    }
}

/**
 * Every picture a glTF's materials draw, and the materials that draw it.
 * @param json - The glTF.
 * @returns The pictures, in image order.
 */
function picturesOf(json: Record<string, unknown>): ModelPicture[] {
    const images = list(json, "images");
    const textures = list(json, "textures");
    const names = pictureNames(images);
    const using = images.map(() => new Set<string>());
    for (const material of list(json, "materials")) {
        const refs: [Record<string, unknown>, string, number][] = [];
        textureRefs(material, refs);
        for (const [, , texture] of refs) {
            for (const image of sourcesOf(textures[texture])) {
                using[image]?.add(cut(typeof material.name === "string" ? material.name : ""));
            }
        }
    }

    return names.map((name, at) => Object.freeze({ name, materials: Object.freeze([...using[at]]) }));
}

/**
 * The key in the file set an image's `uri` names, or undefined for an embedded one.
 * @param image - The image.
 * @param main - The glTF's path in the set.
 * @returns The key.
 */
function imageKey(image: Record<string, unknown> | undefined, main: string): string | undefined {
    const uri = image?.uri;
    if (typeof uri !== "string" || /^data:/i.test(uri)) {
        return undefined;
    }

    try {
        return setKeyOf(dirOf(main) + decodeURIComponent(uri));
    } catch {
        return setKeyOf(dirOf(main) + uri);
    }
}

/**
 * Drop every material's references to the named pictures, and to pictures whose file is loaded
 * without (a skipped part), so those parts draw without them, in their plain color.
 * @param json - The glTF, changed in place.
 * @param hidden - Picture names, as {@link ModelSummary.pictures} gives them.
 * @param skipped - Parts loaded without, by their path in the set. Default: none.
 * @param main - The glTF's path in the set, which `skipped` paths are resolved against.
 * @returns Whether anything was dropped.
 */
export function withoutGltfPictures(
    json: Record<string, unknown>,
    hidden: ReadonlySet<string>,
    skipped: ReadonlySet<string> = new Set(),
    main = "",
): boolean {
    if (hidden.size === 0 && skipped.size === 0) {
        return false;
    }

    const images = Array.isArray(json.images) ? json.images.filter(isObject) : [];
    const names = pictureNames(images);
    const gone = (image: number): boolean =>
        hidden.has(names[image] ?? "") || skipped.has(imageKey(images[image], main) ?? "");
    const textures = Array.isArray(json.textures) ? json.textures.filter(isObject) : [];
    const materials = Array.isArray(json.materials) ? json.materials : [];
    let dropped = false;
    for (const material of materials) {
        const refs: [Record<string, unknown>, string, number][] = [];
        textureRefs(material, refs);
        for (const [holder, key, texture] of refs) {
            if (sourcesOf(textures[texture]).some((image) => gone(image))) {
                Reflect.deleteProperty(holder, key);
                dropped = true;
                // The picture that was its color: the part has no look of its own left.
                if (key === "baseColorTexture" || key === "diffuseTexture") {
                    markWithoutPicture(material);
                }
            }
        }
    }

    return dropped;
}

/** The glTF material `extras` key that says the material's color picture was taken away. */
export const WITHOUT_PICTURE_EXTRA = "babylonjsModelsWithoutPicture";

/**
 * Say in a glTF material's `extras` that it lost a picture, so the loaded material says so too.
 * @param material - The glTF material, changed in place.
 */
function markWithoutPicture(material: unknown): void {
    if (!isObject(material)) {
        return;
    }

    const { extras } = material;
    if (extras === undefined || isObject(extras)) {
        material.extras = { ...extras, [WITHOUT_PICTURE_EXTRA]: true };
    }
}

/**
 * Check a glTF and summarize it.
 * @param input - The parsed glTF and its files.
 * @returns The summary and the warnings it earns.
 * @throws ModelError for every structural or size problem.
 */
export function checkGltf(input: GltfInput): GltfChecked {
    const { json, limits } = input;
    const { asset } = json;
    if (!isObject(asset) || typeof asset.version !== "string" || !asset.version.startsWith("2")) {
        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: "gltf", fileName: cut(input.path) });
    }

    const extensionsRequired = checkExtensions(json);
    const used = Array.isArray(json.extensionsUsed)
        ? json.extensionsUsed.filter((e): e is string => typeof e === "string")
        : [];
    const compression = [...new Set([...used, ...extensionsRequired].flatMap((e) => COMPRESSION.get(e) ?? []))];
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
    checkNodes(nodes, meshes.length, skins.length, cameras.length, accessors);
    const { triangles, morphTargets, mostTargets, bounds } = tallyMeshes(
        meshes,
        accessors,
        materials.length,
        views.length,
    );
    const drawn = drawnTriangles(reached, nodes, triangles, limits, accessors);

    cap("nodes", nodes.length, limits.maxNodes);
    cap("meshes", meshes.length, limits.maxMeshes);
    cap("materials", materials.length, limits.maxMaterials);
    cap("textures", textures.length, limits.maxTextures);
    cap("animations", animations.length, limits.maxAnimations);
    cap("morphTargets", mostTargets, limits.maxMorphTargets);
    const mostJoints = skins.reduce((most, s) => Math.max(most, Array.isArray(s.joints) ? s.joints.length : 0), 0);
    cap("joints", mostJoints, limits.maxJoints);

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
        pictures: Object.freeze(picturesOf(json)),
        skinned: skins.length > 0,
        morphTargets,
        transparent: materials.some((m) => m.alphaMode === "BLEND"),
        extensionsRequired: Object.freeze(extensionsRequired.map(cut)),
        geometry: "mesh" as const,
        ...(input.upgraded === true ? { gltfVersion: "1.0" as const } : { gltfVersion: "2.0" as const }),
        extensionsUsed: Object.freeze(used.map(cut)),
        ...(compression.length > 0 ? { compression: Object.freeze(compression) } : {}),
        ...(hasVertexColors(meshes) ? { vertexColors: true } : {}),
    });

    const warnings: ModelFact[] = [...used, ...extensionsRequired]
        .filter((extension, i, all) => IGNORED_EXTENSIONS.has(extension) && all.indexOf(extension) === i)
        .map((extension) => ({ code: "W_MODEL_EXTENSION_IGNORED", params: { extension } }));
    if (clips.length > 0) {
        warnings.push({ code: "W_MODEL_HAS_ANIMATIONS", params: { clips: clips.map((c) => c.name) } });
    }

    return { summary, warnings };
}

/**
 * Whether any primitive carries a `COLOR_0` attribute.
 * @param meshes - The glTF's meshes.
 * @returns True when one does.
 */
function hasVertexColors(meshes: readonly Record<string, unknown>[]): boolean {
    return meshes.some((mesh) =>
        (Array.isArray(mesh.primitives) ? mesh.primitives : []).some(
            (p: unknown) => isObject(p) && isObject(p.attributes) && p.attributes.COLOR_0 !== undefined,
        ),
    );
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
