/**
 * @file glTF 1.0 upgraded to glTF 2.0 JSON, so the one structure checker and Babylon's glTF 2.0
 * loader read both versions.
 *
 * Modeled on gltf-pipeline's `updateVersion`, limited to what a node draws and how it moves:
 * buffers, buffer views, accessors, meshes, materials, textures, images, samplers, nodes, scenes,
 * skins and animations. Id-keyed objects become arrays; each accessor gets a buffer view of its own
 * (glTF 1.0 kept the stride on the accessor); attribute names gain their set index (`TEXCOORD` to
 * `TEXCOORD_0`, `JOINT` to `JOINTS_0`); a `COLOR` attribute is kept only when the material's
 * technique reads it (glTF 2.0 multiplies the base color by `COLOR_0`, so an unread all-zero one
 * would draw black); a material's `diffuse` (a color or a texture, in `values` or
 * `KHR_materials_common`) becomes its `pbrMetallicRoughness` base color with no metal. A skin's
 * joint names become joint node indices, and its `bindShapeMatrix` is folded into its inverse bind
 * matrices when the buffer bytes are given. Techniques, programs, shaders, cameras and lights are
 * dropped: custom GLSL is never compiled, so a 1.0 model draws with its diffuse color or texture.
 *
 * A GLB version 1 (`KHR_binary_glTF`) keeps its body as buffer 0. Babylon-free and DOM-free.
 */

import { ModelReadError } from "./geometry.js";

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
    const match = /^(POSITION|NORMAL|TEXCOORD|COLOR|JOINT|WEIGHT)(?:_(\d+))?$/.exec(semantic);
    if (match === null) {
        return undefined;
    }

    const plural = match[1] === "JOINT" || match[1] === "WEIGHT" ? "S" : "";
    return match[1] === "POSITION" || match[1] === "NORMAL" ? match[1] : `${match[1]}${plural}_${match[2] ?? "0"}`;
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
 * @param bytesOf - A buffer's bytes, by its 1.0 id and object (the GLB body is `binary_glTF`);
 *   without it, or when it returns undefined, a skin's `bindShapeMatrix` is not folded in.
 * @returns glTF 2.0 JSON.
 */
export function upgradeGltf1(
    json: Json,
    bodyUri?: string,
    bytesOf?: (id: string, buffer: Json) => Uint8Array | undefined,
): Json {
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
    const colorReaders = colorReadingMaterials(json);

    const out: Json = {
        asset: { version: "2.0", generator: "babylonjs-models glTF 1.0 upgrade" },
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
                    const unread = name?.startsWith("COLOR") === true && !colorReaders.has(String(p.material));
                    if (name !== undefined && !unread) {
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

    const nodeIds = upgradeNodes(json, out, meshIds);
    upgradeSkins(json, out, { nodeIds, accessorIds, buffers, bytesOf });
    upgradeAnimations(json, out, { nodeIds, accessorIds, buffers, bytesOf });
    return out;
}

/**
 * The materials whose technique reads a `COLOR` attribute.
 * @param json - The 1.0 JSON.
 * @returns Their ids.
 */
function colorReadingMaterials(json: Json): Set<string> {
    const techniques = new Map(entries(json.techniques));
    const readers = new Set<string>();
    for (const [id, material] of entries(json.materials)) {
        const technique = techniques.get(String(material.technique));
        const parameters = isObject(technique?.parameters) ? technique.parameters : {};
        const read = Object.values(isObject(technique?.attributes) ? technique.attributes : {}).some((name) => {
            const parameter = parameters[String(name)];
            return isObject(parameter) && /^COLOR(?:_\d+)?$/.test(String(parameter.semantic));
        });
        if (read) {
            readers.add(id);
        }
    }

    return readers;
}

/** What {@link upgradeSkins} and {@link upgradeAnimations} read besides the JSON. */
interface SkinInputs {
    readonly nodeIds: Ids;
    readonly accessorIds: Ids;
    readonly buffers: readonly [string, Json][];
    readonly bytesOf: ((id: string, buffer: Json) => Uint8Array | undefined) | undefined;
}

/**
 * Upgrade skins: joint names to joint node indices (searched under the skinned node's skeleton
 * roots first), and `skin` on each skinned node and the children it gained for its extra meshes.
 * @param json - The 1.0 JSON.
 * @param out - The 2.0 JSON, written into (its nodes already upgraded).
 * @param inputs - The node and accessor ids, the buffers and their bytes.
 */
function upgradeSkins(json: Json, out: Json, inputs: SkinInputs): void {
    const skins = entries(json.skins);
    if (skins.length === 0) {
        return;
    }

    const skinIds = idsOf(skins);
    const nodes = entries(json.nodes);
    const nodes2 = out.nodes as Json[];
    const byJointName = new Map<string, number>();
    nodes.forEach(([, n], i) => {
        if (typeof n.jointName === "string" && !byJointName.has(n.jointName)) {
            byJointName.set(n.jointName, i);
        }
    });

    const roots = new Map<number, number[]>();
    nodes.forEach(([, n], i) => {
        const skin = ref(skinIds, n.skin);
        if (skin === undefined) {
            return;
        }
        const node = nodes2[i];
        node.skin = skin;
        for (const child of (node.children as number[] | undefined) ?? []) {
            if (child >= nodes.length) {
                nodes2[child].skin = skin;
            }
        }
        const skeletons = (Array.isArray(n.skeletons) ? n.skeletons : []).map((s) => ref(inputs.nodeIds, s));
        roots.set(
            skin,
            skeletons.filter((s) => s !== undefined),
        );
    });

    out.skins = skins.map(([, skin], k) => {
        const under = jointNamesUnder(roots.get(k) ?? [], nodes, nodes2);
        const joints = (Array.isArray(skin.jointNames) ? skin.jointNames : []).map(
            (name) => under.get(String(name)) ?? byJointName.get(String(name)),
        );
        const skin2: Json = { joints };
        const skeleton = roots.get(k)?.[0];
        if (skeleton !== undefined) {
            skin2.skeleton = skeleton;
        }
        const inverse = ref(inputs.accessorIds, skin.inverseBindMatrices);
        const folded = foldBindShape(out, skin.bindShapeMatrix, inverse, joints.length, inputs);
        if (folded !== undefined) {
            skin2.inverseBindMatrices = folded;
        } else if (inverse !== undefined) {
            skin2.inverseBindMatrices = inverse;
        }
        return skin2;
    });
}

/**
 * The nodes under some roots (the roots included), by joint name.
 * @param roots - The root node indices.
 * @param nodes - The 1.0 nodes.
 * @param nodes2 - The 2.0 nodes (their children by index).
 * @returns Joint name to node index.
 */
function jointNamesUnder(
    roots: readonly number[],
    nodes: readonly [string, Json][],
    nodes2: readonly Json[],
): Map<string, number> {
    const found = new Map<string, number>();
    const seen = new Set<number>();
    const stack = [...roots];
    while (stack.length > 0) {
        const i = stack.pop() ?? 0;
        if (seen.has(i) || i >= nodes.length) {
            continue;
        }
        seen.add(i);
        const name = nodes[i][1].jointName;
        if (typeof name === "string" && !found.has(name)) {
            found.set(name, i);
        }
        stack.push(...((nodes2[i].children as number[] | undefined) ?? []));
    }

    return found;
}

/**
 * Fold a skin's `bindShapeMatrix` into its inverse bind matrices (each becomes `IBM * BSM`), written
 * as a new buffer with a `data:` URL, since glTF 2.0 has no bind shape matrix.
 * @param out - The 2.0 JSON, written into.
 * @param bindShape - The 1.0 `bindShapeMatrix`.
 * @param inverse - The inverse bind matrices' accessor index (none: each is the identity).
 * @param joints - How many joints.
 * @param inputs - The buffers and their bytes.
 * @returns The new accessor's index, or undefined when the matrix is absent or the identity, or
 *   the inverse bind matrices cannot be read.
 */
function foldBindShape(
    out: Json,
    bindShape: unknown,
    inverse: number | undefined,
    joints: number,
    inputs: SkinInputs,
): number | undefined {
    if (
        !Array.isArray(bindShape) ||
        bindShape.length !== 16 ||
        bindShape.every((v, i) => v === (i % 5 === 0 ? 1 : 0)) ||
        !bindShape.every((v) => typeof v === "number")
    ) {
        return undefined;
    }

    const accessors = out.accessors as Json[];
    const views = out.bufferViews as Json[];
    const matrices = inverseBindMatrices(out, inverse, joints, inputs);
    if (matrices === undefined) {
        return undefined;
    }

    const bsm = bindShape;
    const folded = new Float32Array(joints * 16);
    for (let at = 0; at < folded.length; at++) {
        const base = at - (at % 16);
        const column = Math.floor((at % 16) / 4);
        const row = at % 4;
        folded[at] = [0, 1, 2, 3].reduce((sum, k) => sum + matrices[base + k * 4 + row] * bsm[column * 4 + k], 0);
    }

    const raw = new Uint8Array(folded.buffer);
    let binary = "";
    for (const byte of raw) {
        binary += String.fromCodePoint(byte);
    }
    const buffers = out.buffers as Json[];
    const buffer =
        buffers.push({ byteLength: raw.length, uri: `data:application/octet-stream;base64,${btoa(binary)}` }) - 1;
    const view = views.push({ buffer, byteOffset: 0, byteLength: raw.length }) - 1;
    return accessors.push({ bufferView: view, componentType: 5126, count: joints, type: "MAT4" }) - 1;
}

/**
 * A skin's inverse bind matrices, read from its buffer (none: each is the identity).
 * @param out - The 2.0 JSON.
 * @param inverse - Their accessor index.
 * @param joints - How many joints.
 * @param inputs - The buffers and their bytes.
 * @returns The matrices, column-major, or undefined when they cannot be read.
 */
function inverseBindMatrices(
    out: Json,
    inverse: number | undefined,
    joints: number,
    inputs: SkinInputs,
): Float32Array | undefined {
    const matrices = new Float32Array(joints * 16);
    if (inverse === undefined) {
        matrices.forEach((_, k) => (matrices[k] = (k % 16) % 5 === 0 ? 1 : 0));
        return matrices;
    }

    const floats = floatsOf(out, inverse, inputs);
    return floats !== undefined && floats.length >= matrices.length ? floats.subarray(0, matrices.length) : undefined;
}

/**
 * A float accessor's values, read from its buffer (the stride of its view honored).
 * @param out - The 2.0 JSON.
 * @param at - The accessor's index.
 * @param inputs - The buffers and their bytes.
 * @returns Its values, or undefined when they cannot be read.
 */
function floatsOf(out: Json, at: number, inputs: SkinInputs): Float32Array | undefined {
    const accessor = (out.accessors as Json[])[at] as Json | undefined;
    const view = (out.bufferViews as Json[])[accessor?.bufferView as number] as Json | undefined;
    const buffer = inputs.buffers[view?.buffer as number] as [string, Json] | undefined;
    const bytes = buffer === undefined ? undefined : inputs.bytesOf?.(buffer[0], buffer[1]);
    if (accessor?.componentType !== 5126 || view === undefined || bytes === undefined) {
        return undefined;
    }

    const components = TYPE_COMPONENTS[accessor.type as string] ?? 1;
    const count = accessor.count as number;
    const stride = typeof view.byteStride === "number" ? view.byteStride : components * 4;
    const offset = view.byteOffset as number;
    if (count > 0 && offset + stride * (count - 1) + components * 4 > bytes.length) {
        return undefined;
    }

    const data = new DataView(bytes.buffer, bytes.byteOffset);
    const values = new Float32Array(count * components);
    return values.map((_, k) =>
        data.getFloat32(offset + Math.floor(k / components) * stride + (k % components) * 4, true),
    );
}

/**
 * Upgrade animations, all into one: glTF 1.0 exporters wrote an animation per animated node, and
 * glTF 2.0 plays each animation as a clip of its own, so they are one clip. Samplers and channels
 * go by index, a sampler's `input` and `output` from its animation's parameters to accessor
 * indices, and a channel's target node by index. An input with no `min` and `max` (glTF 2.0
 * requires them; the clip's length is read from them) gets them from its values.
 * @param json - The 1.0 JSON.
 * @param out - The 2.0 JSON, written into.
 * @param inputs - The node and accessor ids, the buffers and their bytes.
 */
function upgradeAnimations(json: Json, out: Json, inputs: SkinInputs): void {
    const animations = entries(json.animations);
    if (animations.length === 0) {
        return;
    }

    const samplers2: Json[] = [];
    const channels2: Json[] = [];
    for (const [, animation] of animations) {
        const parameters = isObject(animation.parameters) ? animation.parameters : {};
        const samplers = entries(animation.samplers);
        const first = samplers2.length;
        samplers2.push(
            ...samplers.map(([, s]) => ({
                input: ref(inputs.accessorIds, parameters[String(s.input)]),
                output: ref(inputs.accessorIds, parameters[String(s.output)]),
                interpolation: typeof s.interpolation === "string" ? s.interpolation : "LINEAR",
            })),
        );
        const samplerIds = new Map([...idsOf(samplers)].map(([id, i]) => [id, first + i]));
        for (const c of (Array.isArray(animation.channels) ? animation.channels : []).filter(isObject)) {
            const target = isObject(c.target) ? c.target : {};
            channels2.push({
                sampler: ref(samplerIds, c.sampler),
                target: { node: ref(inputs.nodeIds, target.id), path: target.path },
            });
        }
    }

    timeRanges(out, samplers2, inputs);
    out.animations = [{ samplers: samplers2, channels: channels2 }];
}

/**
 * Give each sampler input with no `max` its `min` and `max`, read from its values.
 * @param out - The 2.0 JSON, written into.
 * @param samplers - The 2.0 samplers.
 * @param inputs - The buffers and their bytes.
 */
function timeRanges(out: Json, samplers: readonly Json[], inputs: SkinInputs): void {
    const accessors = out.accessors as Json[];
    for (const input of new Set(samplers.map((s) => s.input as number | undefined))) {
        const accessor = input === undefined ? undefined : accessors[input];
        const times =
            accessor === undefined || Array.isArray(accessor.max) ? undefined : floatsOf(out, input as number, inputs);
        if (accessor !== undefined && times !== undefined && times.length > 0) {
            accessor.min = [times.reduce((a, b) => Math.min(a, b))];
            accessor.max = [times.reduce((a, b) => Math.max(a, b))];
        }
    }
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
 * @returns The nodes' ids.
 */
function upgradeNodes(json: Json, out: Json, meshIds: Ids): Ids {
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

    return nodeIds;
}
