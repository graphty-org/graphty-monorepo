/**
 * @file glTF 1.0 upgraded to glTF 2.0 JSON, so the one structure checker and Babylon's glTF 2.0
 * loader read both versions.
 *
 * Modeled on gltf-pipeline's `updateVersion`, limited to what a node draws: buffers, buffer views,
 * accessors, meshes, materials, textures, images, samplers, nodes and scenes. Id-keyed objects
 * become arrays; each accessor gets a buffer view of its own (glTF 1.0 kept the stride on the
 * accessor); attribute names gain their set index (`TEXCOORD` to `TEXCOORD_0`); a material's
 * `diffuse` (a color or a texture, in `values` or `KHR_materials_common`) becomes its
 * `pbrMetallicRoughness` base color with no metal. Techniques, programs, shaders, skins,
 * animations, cameras and lights are dropped: custom GLSL is never compiled, so a 1.0 model draws
 * with its diffuse color or texture, in its rest pose.
 *
 * A GLB version 1 (`KHR_binary_glTF`) keeps its body as buffer 0. Babylon-free and DOM-free.
 */

import { ModelReadError } from "./geometry";

type Json = Record<string, unknown>;

/**
 * Whether a value is a plain object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isObject(value: unknown): value is Json {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * An id-keyed glTF 1.0 dictionary as entries, in key order (an array, as some 1.0 exporters
 * wrote, keeps its order).
 * @param value - The dictionary.
 * @returns Its ids and objects.
 */
function entries(value: unknown): [string, Json][] {
    if (Array.isArray(value)) {
        return value.map((v, i) => [String(i), isObject(v) ? v : {}]);
    }

    return isObject(value) ? Object.entries(value).map(([k, v]) => [k, isObject(v) ? v : {}]) : [];
}

/** Index of each id, per dictionary. */
type Ids = Map<string, number>;

/**
 * Index the ids of a dictionary.
 * @param list - Its entries.
 * @returns id to index.
 */
function idsOf(list: readonly [string, Json][]): Ids {
    return new Map(list.map(([id], i) => [id, i]));
}

/**
 * The index an id names, or undefined (glTF 2.0 refuses the dangling reference later).
 * @param ids - The dictionary's ids.
 * @param id - The id.
 * @returns The index.
 */
function ref(ids: Ids, id: unknown): number | undefined {
    return typeof id === "string" || typeof id === "number" ? ids.get(String(id)) : undefined;
}

/** Bytes per component, by componentType. */
const COMPONENT_BYTES: Readonly<Record<number, number>> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

/** Components per element, by accessor type. */
const TYPE_COMPONENTS: Readonly<Record<string, number>> = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
};

/**
 * A glTF 1.0 attribute semantic's 2.0 name; anything else is dropped.
 * @param semantic - The 1.0 semantic.
 * @returns The 2.0 name, or undefined for an attribute that is dropped.
 */
function attributeName(semantic: string): string | undefined {
    const match = /^(POSITION|NORMAL|TEXCOORD|COLOR)(?:_(\d+))?$/.exec(semantic);
    if (match === null) {
        return undefined;
    }

    return match[1] === "POSITION" || match[1] === "NORMAL" ? match[1] : `${match[1]}_${match[2] ?? "0"}`;
}

/**
 * Whether a glTF's JSON is version 1.
 * @param json - The parsed JSON.
 * @returns True for glTF 1.0.
 */
export function isGltf1(json: Json): boolean {
    const version = isObject(json.asset) ? json.asset.version : undefined;
    return typeof version === "string" ? version.startsWith("1") : !Array.isArray(json.meshes) && isObject(json.meshes);
}

/**
 * Split a GLB version 1 into its JSON and its body.
 * @param bytes - The GLB.
 * @returns The JSON text and the binary body.
 * @throws {ModelReadError} `json` or `length` for a damaged container.
 */
export function readGlb1(bytes: Uint8Array): { text: string; body: Uint8Array } {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 20 || view.getUint32(4, true) !== 1) {
        throw new ModelReadError("json");
    }

    const length = Math.min(view.getUint32(8, true), bytes.length);
    const contentLength = view.getUint32(12, true);
    if (view.getUint32(16, true) !== 0 || 20 + contentLength > length) {
        throw new ModelReadError("json");
    }

    let text: string;
    try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(20, 20 + contentLength));
    } catch {
        throw new ModelReadError("json");
    }

    return { text, body: bytes.subarray(20 + contentLength, length) };
}

/**
 * Upgrade glTF 1.0 JSON to glTF 2.0 JSON.
 * @param json - The glTF 1.0 JSON.
 * @param bodyUri - For a GLB version 1, the name its body is served under (none: buffer 0 has
 *   no `uri`, as a GLB version 2's binary chunk).
 * @returns glTF 2.0 JSON.
 */
export function upgradeGltf1(json: Json, bodyUri?: string): Json {
    // The KHR_binary_glTF body first, so it is buffer 0.
    const buffers = entries(json.buffers).sort(([a], [b]) => Number(b === "binary_glTF") - Number(a === "binary_glTF"));
    const bufferIds = idsOf(buffers);
    const views = entries(json.bufferViews);
    const viewIds = idsOf(views);
    const out2 = {
        buffers: buffers.map(([id, b]) => {
            const buffer: Json = { byteLength: b.byteLength };
            if (id === "binary_glTF") {
                if (bodyUri !== undefined) {
                    buffer.uri = bodyUri;
                }
            } else if (typeof b.uri === "string") {
                buffer.uri = b.uri;
            }
            return buffer;
        }),
        bufferViews: views.map(([, v]) => ({
            buffer: ref(bufferIds, v.buffer),
            byteOffset: v.byteOffset ?? 0,
            byteLength: v.byteLength,
        })) as Json[],
    };

    // Each accessor on a view of its own, carrying the stride glTF 1.0 kept on the accessor.
    const accessors = entries(json.accessors);
    const accessorIds = idsOf(accessors);
    const accessors2 = accessors.map(([, a]) => {
        const size = (COMPONENT_BYTES[a.componentType as number] ?? 4) * (TYPE_COMPONENTS[a.type as string] ?? 1);
        const stride = typeof a.byteStride === "number" && a.byteStride > size ? a.byteStride : size;
        const count = typeof a.count === "number" ? a.count : 0;
        const source = out2.bufferViews[ref(viewIds, a.bufferView) ?? -1] as Json | undefined;
        const accessor: Json = { componentType: a.componentType, count, type: a.type };
        if (Array.isArray(a.min) && Array.isArray(a.max)) {
            accessor.min = a.min;
            accessor.max = a.max;
        }
        if (source !== undefined) {
            const view: Json = {
                buffer: source.buffer,
                byteOffset: (source.byteOffset as number) + (typeof a.byteOffset === "number" ? a.byteOffset : 0),
                byteLength: stride * Math.max(count - 1, 0) + size,
            };
            if (stride > size) {
                view.byteStride = stride;
            }
            accessor.bufferView = out2.bufferViews.push(view) - 1;
        }
        return accessor;
    });

    const images = entries(json.images);
    const textures = entries(json.textures);
    const samplers = entries(json.samplers);
    const textureIds = idsOf(textures);
    const materials = entries(json.materials);
    const materialIds = idsOf(materials);
    const meshes = entries(json.meshes);
    const meshIds = idsOf(meshes);

    const out: Json = {
        asset: { version: "2.0", generator: "graphty-element glTF 1.0 upgrade" },
        ...out2,
        accessors: accessors2,
        images: images.map(([, image]) => {
            const binary = isObject(image.extensions) ? image.extensions.KHR_binary_glTF : undefined;
            if (isObject(binary)) {
                return { bufferView: ref(viewIds, binary.bufferView), mimeType: binary.mimeType };
            }
            return { uri: image.uri };
        }),
        samplers: samplers.map(([, s]) => {
            const sampler: Json = {};
            for (const key of ["magFilter", "minFilter", "wrapS", "wrapT"]) {
                if (typeof s[key] === "number") {
                    sampler[key] = s[key];
                }
            }
            return sampler;
        }),
        textures: textures.map(([, t]) => ({
            source: ref(idsOf(images), t.source),
            ...(t.sampler === undefined ? {} : { sampler: ref(idsOf(samplers), t.sampler) }),
        })),
        materials: materials.map(([id, m]) => upgradeMaterial(id, m, textureIds)),
        meshes: meshes.map(([, m]) => ({
            primitives: (Array.isArray(m.primitives) ? m.primitives : []).filter(isObject).map((p) => {
                const attributes: Json = {};
                for (const [semantic, accessor] of Object.entries(isObject(p.attributes) ? p.attributes : {})) {
                    const name = attributeName(semantic);
                    if (name !== undefined) {
                        attributes[name] = ref(accessorIds, accessor);
                    }
                }
                const primitive: Json = { attributes, mode: p.mode ?? p.primitive ?? 4 };
                if (p.indices !== undefined) {
                    primitive.indices = ref(accessorIds, p.indices);
                }
                if (p.material !== undefined) {
                    primitive.material = ref(materialIds, p.material);
                }
                return primitive;
            }),
        })),
    };

    upgradeNodes(json, out, meshIds);
    return out;
}

/**
 * A glTF 1.0 material as a glTF 2.0 one: its diffuse color or texture as the base color.
 * @param id - Its id, kept as its name when it has none.
 * @param material - The 1.0 material.
 * @param textureIds - The textures' ids.
 * @returns The 2.0 material.
 */
function upgradeMaterial(id: string, material: Json, textureIds: Ids): Json {
    const common = isObject(material.extensions) ? material.extensions.KHR_materials_common : undefined;
    const values = isObject(common) && isObject(common.values) ? common.values : material.values;
    const diffuse = isObject(values) ? values.diffuse : undefined;
    const pbr: Json = { metallicFactor: 0, roughnessFactor: 1 };
    if (Array.isArray(diffuse)) {
        pbr.baseColorFactor = [0, 1, 2, 3].map((k) => (typeof diffuse[k] === "number" ? diffuse[k] : 1));
    } else if (typeof diffuse === "string" && textureIds.has(diffuse)) {
        pbr.baseColorTexture = { index: textureIds.get(diffuse) };
    }

    return { name: typeof material.name === "string" ? material.name : id, pbrMetallicRoughness: pbr };
}

/**
 * Upgrade nodes and scenes: children and scene roots by index, one mesh per node (a node with
 * several gains a child for each one after the first).
 * @param json - The 1.0 JSON.
 * @param out - The 2.0 JSON, written into.
 * @param meshIds - The meshes' ids.
 */
function upgradeNodes(json: Json, out: Json, meshIds: Ids): void {
    const nodes = entries(json.nodes);
    const nodeIds = idsOf(nodes);
    const nodes2: Json[] = nodes.map(([, n]) => {
        const node: Json = {};
        for (const key of ["matrix", "translation", "rotation", "scale"]) {
            if (Array.isArray(n[key])) {
                node[key] = n[key];
            }
        }
        const children = (Array.isArray(n.children) ? n.children : [])
            .map((c) => ref(nodeIds, c))
            .filter((c) => c !== undefined);
        if (children.length > 0) {
            node.children = children;
        }
        return node;
    });

    nodes.forEach(([, n], i) => {
        const listed: unknown[] = n.mesh === undefined ? [] : [n.mesh];
        const meshes = (Array.isArray(n.meshes) ? n.meshes : listed)
            .map((m) => ref(meshIds, m))
            .filter((m) => m !== undefined);
        meshes.forEach((mesh, k) => {
            if (k === 0) {
                nodes2[i].mesh = mesh;
            } else {
                const child = nodes2.push({ mesh }) - 1;
                nodes2[i].children = [...((nodes2[i].children as number[] | undefined) ?? []), child];
            }
        });
    });

    const scenes = entries(json.scenes);
    out.nodes = nodes2;
    out.scenes = scenes.map(([, s]) => ({
        nodes: (Array.isArray(s.nodes) ? s.nodes : []).map((n) => ref(nodeIds, n)).filter((n) => n !== undefined),
    }));
    const scene = ref(idsOf(scenes), json.scene);
    if (scene !== undefined) {
        out.scene = scene;
    }
}
