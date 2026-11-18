/**
 * @file The checks and summary of an FBX file, binary or ASCII (FBX 6 and 7), before Babylon.js's
 * FBX loader draws it.
 *
 * - Every node is read with its offsets, counts and nesting checked (./readers/fbx.ts); deflated
 *   arrays decode within `maxDecodedBytes`.
 * - Every mesh's vertex indices are in range, and its triangles are counted per use against
 *   `maxTriangles`.
 * - Every picture a texture names is looked up in the set, by its relative path or, as Babylon's
 *   loader also tries, by its base name (an absolute path from the author's disk only by its base
 *   name); a picture embedded in the file is measured from its bytes.
 * - Nodes, meshes, materials, textures, animations, morph targets and joints are held to their limits.
 *
 * Babylon-free and DOM-free.
 */

import { type FbxFile, fbxId, fbxName, type FbxNode, type FbxValue, readFbx } from "./readers/fbx.js";
import { ModelReadError } from "./readers/geometry.js";
import {
    baseName,
    cap,
    cut,
    type Findings,
    findReference,
    refuse,
    resolveReference,
    textureBytesOf,
} from "./references.js";
import type { ModelFact, ModelLimits, ModelPicture, ModelSummary } from "./types.js";

/** FBX time units per second (KTime). */
const FBX_SECOND = 46_186_158_000;

/** Files read already, so the parts lookup and the scan parse a file once. */
const read = new WeakMap<Uint8Array, { readonly limits: ModelLimits; readonly file: FbxFile }>();

/**
 * Read an FBX file, refusing a damaged one.
 * @param bytes - The file.
 * @param limits - The limits in force.
 * @returns The file.
 */
function fbxOf(bytes: Uint8Array, limits: ModelLimits): FbxFile {
    const held = read.get(bytes);
    if (held?.limits === limits) {
        return held.file;
    }

    try {
        if (bytes[0] !== 0x4b && bytes.length > limits.maxTextBytes) {
            refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: bytes.length, limit: limits.maxTextBytes });
        }
        const file = readFbx(bytes, limits.maxDecodedBytes);
        read.set(bytes, { limits, file });
        return file;
    } catch (error) {
        if (error instanceof ModelReadError) {
            if (error.rule === "fbx-size") {
                refuse("E_MODEL_TOO_LARGE", {
                    what: "decodedBytes",
                    found: bytes.length,
                    limit: limits.maxDecodedBytes,
                });
            }
            refuse("E_MODEL_STRUCTURE", { rule: "fbx" });
        }
        throw error;
    }
}

/**
 * A child node by name.
 * @param node - The parent.
 * @param name - The child's name.
 * @returns The first such child.
 */
function child(node: FbxNode | undefined, name: string): FbxNode | undefined {
    return node?.children.find((c) => c.name === name);
}

/**
 * A `Properties70` (or FBX 6 `Properties60`) entry's first value, by its name.
 * @param node - The object.
 * @param name - The property's name.
 * @returns The value, or undefined.
 */
function property(node: FbxNode | undefined, name: string): FbxValue | undefined {
    const block = child(node, "Properties70") ?? child(node, "Properties60");
    const entry = block?.children.find((p) => p.values[0] === name);
    return entry?.values[entry.name === "Property" ? 3 : 4];
}

/**
 * A number from a value.
 * @param value - The value.
 * @returns The number, or NaN.
 */
function numberOf(value: FbxValue | undefined): number {
    return typeof value === "number" || typeof value === "bigint" ? Number(value) : Number.NaN;
}

/**
 * A number array from a node's first value.
 * @param node - The node.
 * @returns The array, empty when there is none.
 */
function arrayOf(node: FbxNode | undefined): ArrayLike<number> {
    const [value] = node?.values ?? [];
    if (value !== undefined && typeof value === "object" && !(value instanceof Uint8Array)) {
        return value;
    }

    // FBX 6 ASCII writes an array as plain comma-separated values.
    const values = node?.values ?? [];
    return values.every((v) => typeof v === "number") ? values : [];
}

/** An FBX file's objects and the connections between them. */
interface Scene {
    readonly objects: FbxNode[];
    readonly byId: Map<string, FbxNode>;
    /** Parent ids of each child id, with the property an `OP` connection names. */
    readonly parents: Map<string, { id: string; prop?: string }[]>;
    /** Child ids of each parent id. */
    readonly children: Map<string, string[]>;
}

/**
 * Index an FBX file's objects and connections.
 * @param file - The file.
 * @returns The scene.
 */
function sceneOf(file: FbxFile): Scene {
    const objects = file.nodes.find((n) => n.name === "Objects")?.children ?? [];
    const byId = new Map<string, FbxNode>();
    for (const object of objects) {
        byId.set(fbxId(object.values[0]), object);
    }

    const parents = new Map<string, { id: string; prop?: string }[]>();
    const children = new Map<string, string[]>();
    for (const c of file.nodes.find((n) => n.name === "Connections")?.children ?? []) {
        if (c.name !== "C" && c.name !== "Connect") {
            continue;
        }
        const [, from, to, prop] = c.values;
        const [childId, parentId] = [fbxId(from), fbxId(to)];
        const list = parents.get(childId) ?? [];
        list.push({ id: parentId, ...(typeof prop === "string" ? { prop } : {}) });
        parents.set(childId, list);
        children.set(parentId, [...(children.get(parentId) ?? []), childId]);
    }

    return { objects, byId, parents, children };
}

/**
 * The objects of a kind connected below one.
 * @param scene - The scene.
 * @param id - The parent's id.
 * @param name - The children's node name.
 * @returns Them.
 */
function below(scene: Scene, id: string, name: string): FbxNode[] {
    return (scene.children.get(id) ?? []).map((c) => scene.byId.get(c)).filter((n): n is FbxNode => n?.name === name);
}

/** A running min/max box. */
interface Bounds {
    readonly min: [number, number, number];
    readonly max: [number, number, number];
}

/**
 * Count a mesh's triangles, check its indices and bound its vertices.
 * @param node - The geometry (or an FBX 6 mesh model).
 * @param box - The box so far.
 * @returns Its triangles, or undefined for a node with no polygons.
 */
function meshTriangles(node: FbxNode, box: Bounds): number | undefined {
    const vertices = arrayOf(child(node, "Vertices"));
    const polygons = arrayOf(child(node, "PolygonVertexIndex"));
    if (vertices.length % 3 !== 0) {
        refuse("E_MODEL_STRUCTURE", { rule: "fbx" });
    }

    if (polygons.length === 0) {
        return undefined;
    }

    const count = vertices.length / 3;
    let triangles = 0;
    let corners = 0;
    for (let i = 0; i < polygons.length; i++) {
        const raw = polygons[i];
        // A negative index ends a polygon: the vertex is its bitwise complement.
        const vertex = raw < 0 ? -raw - 1 : raw;
        if (!Number.isInteger(vertex) || vertex >= count) {
            refuse("E_MODEL_STRUCTURE", { rule: "index", where: "fbx.PolygonVertexIndex" });
        }
        corners++;
        if (raw < 0) {
            triangles += Math.max(0, corners - 2);
            corners = 0;
        }
    }
    triangles += Math.max(0, corners - 2);
    grow(box, vertices);
    return triangles;
}

/**
 * Grow a box by a flat x, y, z list.
 * @param box - The box.
 * @param vertices - The points.
 */
function grow(box: Bounds, vertices: ArrayLike<number>): void {
    for (let i = 0; i + 2 < vertices.length; i += 3) {
        const point = [vertices[i], vertices[i + 1], vertices[i + 2]];
        if (point.every((v) => Number.isFinite(v))) {
            for (const [axis, v] of point.entries()) {
                box.min[axis] = Math.min(box.min[axis], v);
                box.max[axis] = Math.max(box.max[axis], v);
            }
        }
    }
}

/** A texture object's picture: its file name as the loader looks it up, or its embedded bytes. */
interface TextureSource {
    /** The name to look up in the set; undefined for an embedded picture. */
    readonly ref?: string;
    /** The embedded picture's bytes. */
    readonly embedded?: Uint8Array;
    /** What Babylon's loader names the texture it makes: the base name of its file. */
    readonly name: string;
}

/**
 * A text value with backslashes turned into slashes.
 * @param value - The value.
 * @returns The text, or "".
 */
function pathText(value: FbxValue | undefined): string {
    return typeof value === "string" ? value.replaceAll("\\", "/") : "";
}

/**
 * Decode an ASCII file's base64 `Content`.
 * @param text - The base64 text.
 * @returns The bytes, or undefined when it is not base64.
 */
function fromBase64(text: string): Uint8Array | undefined {
    try {
        return Uint8Array.from(atob(text.replaceAll(/\s/g, "")), (c) => c.codePointAt(0) ?? 0);
    } catch {
        return undefined;
    }
}

/**
 * Where a texture object's picture comes from.
 * @param scene - The scene.
 * @param texture - The texture object.
 * @returns Its source, or undefined when it names no picture.
 */
function textureSource(scene: Scene, texture: FbxNode): TextureSource | undefined {
    const relative = pathText(child(texture, "RelativeFilename")?.values[0]);
    const absolute = pathText(child(texture, "FileName")?.values[0] ?? child(texture, "Filename")?.values[0]);
    const written = relative || absolute;
    const name = written === "" ? `embeddedTexture_${fbxId(texture.values[0])}` : baseName(written);
    for (const video of below(scene, fbxId(texture.values[0]), "Video")) {
        const content = child(video, "Content")?.values.find((v) => v instanceof Uint8Array || typeof v === "string");
        const bytes = typeof content === "string" ? fromBase64(content) : content;
        if (bytes !== undefined && bytes.length > 0) {
            return { embedded: bytes, name };
        }
    }

    if (written === "") {
        return undefined;
    }

    // Babylon's loader reads a relative path only when it stays inside the folder, then the base name.
    const climbs = written.split("/").includes("..");
    const ref = relative !== "" && !climbs && !/^(?:[a-z]:|\/)/i.test(relative) ? relative : baseName(written);
    return { ref, name };
}

/**
 * Look up every picture an FBX file names, so every missing one is found at once.
 * @param path - The file's path in the set.
 * @param files - The set.
 * @param limits - The limits in force.
 * @param findings - Where missing parts and substitutions go.
 */
export function findFbxParts(
    path: string,
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
    findings: Findings,
): void {
    const scene = sceneOf(fbxOf(files.get(path) as Uint8Array, limits));
    const seen = new Set<string>();
    for (const texture of scene.objects.filter((o) => o.name === "Texture")) {
        const source = textureSource(scene, texture);
        if (source?.ref !== undefined && !seen.has(source.ref)) {
            seen.add(source.ref);
            findReference(source.ref, path, files, "texture", findings);
        }
    }
}

/**
 * The clips the loader makes: each animation stack with at least one curve (FBX 7), or each take
 * with animated models (FBX 6), with its length in seconds.
 * @param file - The file.
 * @param scene - The scene.
 * @returns The clips.
 */
function animationsOf(file: FbxFile, scene: Scene): { name: string; seconds: number }[] {
    const clips: { name: string; seconds: number }[] = [];
    for (const stack of scene.objects.filter((o) => o.name === "AnimationStack")) {
        const keys = stackKeys(scene, stack);
        if (keys === undefined) {
            continue;
        }

        const start = numberOf(property(stack, "LocalStart"));
        const stop = numberOf(property(stack, "LocalStop"));
        const span = stop > start ? stop - start : Math.max(0, keys.last - keys.first);
        clips.push({ name: cut(fbxName(stack.values[1]) || "Animation"), seconds: span / FBX_SECOND });
    }

    return clips.length > 0 ? clips : legacyTakes(file);
}

/**
 * The first and last key time of an animation stack's curves.
 * @param scene - The scene.
 * @param stack - The stack.
 * @returns The span, or undefined for a stack with no curves.
 */
function stackKeys(scene: Scene, stack: FbxNode): { first: number; last: number } | undefined {
    const curves = below(scene, fbxId(stack.values[0]), "AnimationLayer")
        .flatMap((layer) => below(scene, fbxId(layer.values[0]), "AnimationCurveNode"))
        .flatMap((node) => below(scene, fbxId(node.values[0]), "AnimationCurve"));
    if (curves.length === 0) {
        return undefined;
    }

    let first = Infinity;
    let last = -Infinity;
    for (const curve of curves) {
        const times = arrayOf(child(curve, "KeyTime"));
        for (let i = 0; i < times.length; i++) {
            first = Math.min(first, times[i]);
            last = Math.max(last, times[i]);
        }
    }
    return { first, last };
}

/**
 * The takes of an FBX 6 file that animate a model.
 * @param file - The file.
 * @returns The clips.
 */
function legacyTakes(file: FbxFile): { name: string; seconds: number }[] {
    const takes = file.nodes.find((n) => n.name === "Takes")?.children ?? [];
    return takes
        .filter((take) => take.name === "Take" && take.children.some((c) => c.name === "Model"))
        .map((take) => {
            const [start, stop] = child(take, "LocalTime")?.values.map((v) => numberOf(v)) ?? [0, 0];
            return { name: cut(fbxName(take.values[0]) || "Take"), seconds: Math.max(0, stop - start) / FBX_SECOND };
        });
}

/**
 * The pictures of a scene's textures and the materials that draw them.
 * @param scene - The scene.
 * @param path - The file's path in the set.
 * @param files - The set.
 * @returns The pictures and their decoded bytes.
 */
function picturesOf(
    scene: Scene,
    path: string,
    files: ReadonlyMap<string, Uint8Array>,
): { pictures: ModelPicture[]; textureBytes: number; textures: number } {
    const uses = new Map<string, Set<string>>();
    const measured = new Map<string, number>();
    let textures = 0;
    for (const texture of scene.objects.filter((o) => o.name === "Texture")) {
        const source = textureSource(scene, texture);
        if (source === undefined) {
            continue;
        }

        textures++;
        let { name } = source;
        if (source.embedded === undefined) {
            const found = resolveReference(source.ref as string, path, files);
            name = found.path;
            measured.set(name, textureBytesOf(found.bytes, found.path));
        } else {
            measured.set(name, textureBytesOf(source.embedded, name));
        }

        const using = uses.get(name) ?? new Set<string>();
        for (const parent of scene.parents.get(fbxId(texture.values[0])) ?? []) {
            const material = scene.byId.get(parent.id);
            if (material?.name === "Material") {
                using.add(cut(fbxName(material.values[1])));
            }
        }
        uses.set(name, using);
    }

    return {
        pictures: [...uses].map(([name, using]) => Object.freeze({ name, materials: Object.freeze([...using]) })),
        textureBytes: [...measured.values()].reduce((a, b) => a + b, 0),
        textures,
    };
}

/**
 * Count the meshes a scene draws and their triangles, per use, checking each mesh's indices.
 * @param scene - The scene.
 * @param box - The bounds, grown by every mesh's vertices.
 * @param limits - The limits in force.
 * @returns The counts, and whether any mesh has vertex colors.
 */
function countMeshes(
    scene: Scene,
    box: Bounds,
    limits: ModelLimits,
): { triangles: number; meshes: number; vertexColors: boolean } {
    let triangles = 0;
    let meshes = 0;
    let vertexColors = false;
    // FBX 7 keeps a mesh's polygons in a Geometry object; FBX 6 in the mesh model itself.
    for (const node of scene.objects.filter(
        (o) => (o.name === "Geometry" && o.values[2] === "Mesh") || o.name === "Model",
    )) {
        const counted = meshTriangles(node, box);
        if (counted === undefined) {
            continue;
        }

        const uses =
            node.name === "Model"
                ? 1
                : Math.max(
                      1,
                      (scene.parents.get(fbxId(node.values[0])) ?? []).filter(
                          (p) => scene.byId.get(p.id)?.name === "Model",
                      ).length,
                  );
        meshes += uses;
        triangles += counted * uses;
        vertexColors ||= child(node, "LayerElementColor") !== undefined;
        if (triangles > limits.maxTriangles) {
            refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: triangles, limit: limits.maxTriangles });
        }
    }

    // Curves (NURBS curves, lines) are drawn as thin tubes, one mesh each.
    meshes += scene.objects.filter(
        (o) => o.name === "Geometry" && (o.values[2] === "NurbsCurve" || o.values[2] === "Line"),
    ).length;
    return { triangles, meshes, vertexColors };
}

/**
 * Check an FBX file and summarize it. Its pictures must have been found first ({@link findFbxParts}).
 * @param path - The file's path in the set.
 * @param files - The set.
 * @param limits - The limits in force.
 * @returns The summary and warnings.
 */
export function scanFbx(
    path: string,
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
): { summary: ModelSummary; warnings: readonly ModelFact[] } {
    const file = fbxOf(files.get(path) as Uint8Array, limits);
    const scene = sceneOf(file);
    const box: Bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    const models = scene.objects.filter((o) => o.name === "Model");
    const { triangles, meshes, vertexColors } = countMeshes(scene, box, limits);
    const materials = scene.objects.filter((o) => o.name === "Material");
    const deformers = scene.objects.filter((o) => o.name === "Deformer");
    const skins = deformers.filter((d) => d.values[2] === "Skin");
    const joints = Math.max(0, ...skins.map((s) => below(scene, fbxId(s.values[0]), "Deformer").length));
    const channels = deformers.filter((d) => d.values[2] === "BlendShapeChannel").length;
    const animations = animationsOf(file, scene);
    const { pictures, textureBytes, textures } = picturesOf(scene, path, files);
    cap("nodes", models.length, limits.maxNodes);
    cap("meshes", meshes, limits.maxMeshes);
    cap("materials", materials.length, limits.maxMaterials);
    cap("textures", textures, limits.maxTextures);
    cap("animations", animations.length, limits.maxAnimations);
    cap("morphTargets", channels, limits.maxMorphTargets);
    cap("joints", joints, limits.maxJoints);
    if (textureBytes > limits.maxTextureBytes) {
        refuse("E_MODEL_TOO_LARGE", { what: "textureBytes", found: textureBytes, limit: limits.maxTextureBytes });
    }

    // One file unit is UnitScaleFactor centimeters (1 when the file does not say).
    const settings = file.nodes.find((n) => n.name === "GlobalSettings");
    const unit = numberOf(property(settings, "UnitScaleFactor"));
    return {
        summary: Object.freeze({
            format: "fbx",
            triangles,
            meshes,
            materials: Object.freeze(materials.map((m) => cut(fbxName(m.values[1])))),
            textures,
            textureBytes,
            ...(box.min[0] === Infinity ? {} : { bounds: Object.freeze({ min: box.min, max: box.max }) }),
            // Babylon's loader turns the file's own axis system to Y up.
            upAxis: "y",
            animations: Object.freeze(animations.map((a) => Object.freeze(a))),
            pictures: Object.freeze(pictures),
            skinned: skins.length > 0,
            morphTargets: channels,
            transparent: materials.some((m) => numberOf(property(m, "Opacity")) < 1),
            extensionsRequired: Object.freeze([]),
            geometry: "mesh",
            encoding: file.binary ? "binary" : "ascii",
            metersPerUnit: (Number.isFinite(unit) && unit > 0 ? unit : 1) / 100,
            ...(vertexColors ? { vertexColors: true } : {}),
        }),
        warnings:
            animations.length > 0
                ? [{ code: "W_MODEL_HAS_ANIMATIONS", params: { clips: animations.map((a) => a.name) } }]
                : [],
    };
}

/**
 * The pictures an ASCII FBX file embeds (as base64), by the relative path its texture names.
 * Babylon's FBX loader reads embedded pictures only from binary files, so a load hands these over
 * as files of their own, at the path the loader then looks for.
 * @param bytes - The file.
 * @param limits - The limits in force.
 * @returns The pictures, by path relative to the file; empty for a binary file.
 */
export function asciiFbxPictures(bytes: Uint8Array, limits: ModelLimits): Map<string, Uint8Array> {
    const out = new Map<string, Uint8Array>();
    const file = fbxOf(bytes, limits);
    if (file.binary) {
        return out;
    }

    const scene = sceneOf(file);
    for (const texture of scene.objects.filter((o) => o.name === "Texture")) {
        const source = textureSource(scene, texture);
        if (source?.embedded !== undefined) {
            out.set(source.name, source.embedded);
        }
    }

    return out;
}
