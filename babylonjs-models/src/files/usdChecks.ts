/**
 * @file The checks and summary of a USD model -- a text (`.usda`) or binary (`.usdc`) layer named
 * `.usd`, `.usda` or `.usdc`, with the layers and pictures it names beside it, or a `.usdz`
 * package holding them -- before Babylon.js's USD loader draws it with OpenUSD.
 *
 * - A layer's asset paths (`@./geo.usd@`, `@textures/wood.png@`) are its parts: every layer and
 *   picture it names is looked up in the set, from the folder of the layer that names it, and each
 *   layer found is read for the layers and pictures it names in turn.
 * - A USDZ package is read as the zip it is, without inflating anything: USDZ stores its files
 *   uncompressed, so an entry that is compressed, or that runs past the file, is refused. Its first
 *   entry is the stage's root layer.
 * - A binary layer is read with every count, offset and decompressed size checked (./readers/usdc.ts).
 * - Meshes, materials and triangles (from each mesh's `faceVertexCounts`), skeletons, blend shapes
 *   and animated attributes are counted over every layer the stage names, each layer once, and
 *   held to the limits. A layer named twice (a chess set's pawns) counts once: the counts are
 *   per layer, not per use.
 *
 * Babylon-free and DOM-free.
 */

import { ModelReadError } from "./readers/geometry.js";
import { type Crate, type CrateSpec, isTimeSamples, readCrate, SPEC, type ValueRep } from "./readers/usdc.js";
import {
    cap,
    cut,
    type Findings,
    findReference,
    normalizePath,
    refuse,
    resolveReference,
    textureBytesOf,
} from "./references.js";
import type { ModelFact, ModelLimits, ModelPicture, ModelSummary } from "./types.js";

/** An asset path to another USD layer. */
const LAYER = /\.usd[ac]?$/i;
/** An asset path to a picture. */
const PICTURE = /\.(?:png|jpe?g|webp|avif|bmp|gif|tga|tiff?|exr|hdr|ktx2?)$/i;

/** What one layer says about the stage. */
interface LayerFacts {
    /** Every asset path it names (other layers and pictures), as written. */
    readonly refs: string[];
    meshes: number;
    triangles: number;
    readonly materials: string[];
    skeletons: number;
    blendShapes: number;
    animated: boolean;
    /** Picture asset paths, with the materials that draw them. */
    readonly pictures: Map<string, Set<string>>;
    readonly min: [number, number, number];
    readonly max: [number, number, number];
    /** The layer's own metadata (the root layer's is the stage's). */
    upAxis?: string;
    metersPerUnit?: number;
    timeCodesPerSecond?: number;
    startTimeCode?: number;
    endTimeCode?: number;
}

/**
 * Empty facts.
 * @returns Facts with nothing counted.
 */
function noFacts(): LayerFacts {
    return {
        refs: [],
        meshes: 0,
        triangles: 0,
        materials: [],
        skeletons: 0,
        blendShapes: 0,
        animated: false,
        pictures: new Map(),
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
    };
}

/**
 * Count a mesh's triangles from its face sizes.
 * @param counts - `faceVertexCounts`.
 * @returns The triangles.
 */
function trianglesOf(counts: ArrayLike<number>): number {
    let triangles = 0;
    for (let i = 0; i < counts.length; i++) {
        const n = counts[i];
        if (!Number.isInteger(n) || n < 0) {
            refuse("E_MODEL_STRUCTURE", { rule: "index", where: "usd.faceVertexCounts" });
        }
        triangles += Math.max(0, n - 2);
    }
    return triangles;
}

/**
 * Grow the bounds by a flat x, y, z list.
 * @param facts - The facts.
 * @param points - The points.
 */
function bound(facts: LayerFacts, points: ArrayLike<number>): void {
    for (let i = 0; i + 2 < points.length; i += 3) {
        const p = [points[i], points[i + 1], points[i + 2]];
        if (p.every((v) => Number.isFinite(v))) {
            for (let a = 0; a < 3; a++) {
                facts.min[a] = Math.min(facts.min[a], p[a]);
                facts.max[a] = Math.max(facts.max[a], p[a]);
            }
        }
    }
}

/**
 * Add a picture use.
 * @param facts - The facts.
 * @param ref - The picture's asset path.
 * @param material - The material drawing it, or "".
 */
function usePicture(facts: LayerFacts, ref: string, material: string | undefined): void {
    const using = facts.pictures.get(ref) ?? new Set<string>();
    if (material !== undefined) {
        using.add(cut(material));
    }
    facts.pictures.set(ref, using);
}

/** What a prim of each counted type adds to a layer's facts. */
const PRIM_COUNTS: Readonly<Record<string, (facts: LayerFacts, name: string) => void>> = {
    Mesh: (facts) => {
        facts.meshes++;
    },
    Material: (facts, name) => {
        facts.materials.push(cut(name));
    },
    Skeleton: (facts) => {
        facts.skeletons++;
    },
    BlendShape: (facts) => {
        facts.blendShapes++;
    },
    SkelAnimation: (facts) => {
        facts.animated = true;
    },
};

/**
 * Count a prim by its type.
 * @param facts - The facts.
 * @param type - Its type name.
 * @param name - Its name.
 */
function countPrim(facts: LayerFacts, type: string, name: string): void {
    PRIM_COUNTS[type]?.(facts, name);
}

/**
 * The name of a path's last element.
 * @param path - A prim or property path.
 * @returns Its name.
 */
const leafOf = (path: string): string => path.slice(path.lastIndexOf("/") + 1);

/**
 * The material a prim sits in, by its nearest ancestor of type Material.
 * @param types - Each prim's type, by path.
 * @param path - The prim's path.
 * @returns The material's name, or undefined.
 */
function materialOf(types: ReadonlyMap<string, string>, path: string): string | undefined {
    for (let at = path; at.length > 1; at = at.slice(0, Math.max(1, at.lastIndexOf("/")))) {
        if (types.get(at) === "Material") {
            return leafOf(at);
        }
    }
    return undefined;
}

/**
 * Read one attribute of a binary layer: a mesh's faces and points, a picture's file, an animation.
 * @param crate - The layer.
 * @param spec - The attribute.
 * @param types - Each prim's type, by path.
 * @param facts - The facts.
 */
function crateAttribute(crate: Crate, spec: CrateSpec, types: ReadonlyMap<string, string>, facts: LayerFacts): void {
    facts.animated ||= isTimeSamples(spec.fields.get("timeSamples"));
    const dot = spec.path.lastIndexOf(".");
    const [prim, name] = [spec.path.slice(0, dot), spec.path.slice(dot + 1)];
    const value = spec.fields.get("default");
    const mesh = types.get(prim) === "Mesh";
    if (name === "faceVertexCounts" && mesh) {
        facts.triangles += trianglesOf(crate.numbers(value) ?? []);
    } else if (name === "points" && mesh) {
        bound(facts, crate.numbers(value) ?? []);
    } else if (name === "inputs:file") {
        const ref = crate.text(value);
        if (ref !== undefined && PICTURE.test(ref)) {
            usePicture(facts, ref, materialOf(types, prim));
        }
    }
}

/**
 * Read a binary layer's facts.
 * @param crate - The layer.
 * @returns The facts.
 */
function crateFacts(crate: Crate): LayerFacts {
    const facts = noFacts();
    const types = new Map<string, string>();
    for (const spec of crate.specs) {
        if (spec.type === SPEC.prim) {
            const type = crate.text(spec.fields.get("typeName")) ?? "";
            types.set(spec.path, type);
            countPrim(facts, type, leafOf(spec.path));
        } else if (spec.type === SPEC.pseudoRoot) {
            const field = (name: string): ValueRep | undefined => spec.fields.get(name);
            facts.upAxis = crate.text(field("upAxis"));
            facts.metersPerUnit = crate.number(field("metersPerUnit"));
            facts.timeCodesPerSecond = crate.number(field("timeCodesPerSecond"));
            facts.startTimeCode = crate.number(field("startTimeCode"));
            facts.endTimeCode = crate.number(field("endTimeCode"));
        }
    }

    for (const spec of crate.specs) {
        if (spec.type === SPEC.attribute) {
            crateAttribute(crate, spec, types, facts);
        }
    }

    // Every asset path is a token (a string is stored as one too): the layers and pictures it names.
    facts.refs.push(...crate.tokens.filter((t) => LAYER.test(t) || PICTURE.test(t)));
    return facts;
}

/**
 * The numbers in a text array literal.
 * @param text - `[(0, 1, 2), ...]` without its brackets.
 * @returns The numbers.
 */
function numbersIn(text: string): number[] {
    return text
        .split(/[\s,()]+/)
        .filter((t) => t !== "")
        .map(Number);
}

/**
 * Read a text layer's metadata, in the parentheses after `#usda 1.0`.
 * @param text - The layer.
 * @param facts - Where it goes.
 */
function usdaMeta(text: string, facts: LayerFacts): void {
    const head = text.slice(0, 4096);
    const meta = (key: string): string | undefined =>
        new RegExp(String.raw`^\s*${key}\s*=\s*"?([^"\n]*)"?\s*$`, "m").exec(head)?.[1];
    const number = (key: string): number | undefined => {
        const value = meta(key);
        return value === undefined ? undefined : Number(value);
    };
    facts.upAxis = meta("upAxis");
    facts.metersPerUnit = number("metersPerUnit");
    facts.timeCodesPerSecond = number("timeCodesPerSecond");
    facts.startTimeCode = number("startTimeCode");
    facts.endTimeCode = number("endTimeCode");
}

/** Walks a text layer's lines, keeping which prims are open, to tell which material a picture is in. */
class UsdaPrims {
    private readonly stack: (string | null)[] = [];
    private readonly materials: string[] = [];
    private pending: { type: string; name: string } | null = null;

    constructor(private readonly facts: LayerFacts) {}

    line(raw: string): void {
        const def = /^\s*(?:def|over|class)\s+(\w+)?\s*"([^"]*)"/.exec(raw);
        if (def !== null) {
            this.pending = { type: def[1] ?? "", name: def[2] };
            countPrim(this.facts, this.pending.type, this.pending.name);
        }

        // Strings and asset paths may hold braces: they are taken out before braces are counted.
        const line = raw.replaceAll(/"(?:[^"\\]|\\.)*"/g, '""');
        const picture = /\binputs:file\s*=\s*@([^@]+)@/.exec(line);
        if (picture !== null && PICTURE.test(picture[1])) {
            usePicture(this.facts, picture[1], this.materials.at(-1));
        }

        for (const c of line.replaceAll(/@[^@]*@/g, "")) {
            if (c === "{") {
                this.open();
            } else if (c === "}" && this.stack.pop() !== null) {
                this.materials.pop();
            }
        }
    }

    private open(): void {
        const opened = this.pending?.type === "Material" ? this.pending.name : null;
        this.stack.push(opened);
        if (opened !== null) {
            this.materials.push(opened);
        }
        this.pending = null;
    }
}

/**
 * Read a text layer's facts with a single pass of plain patterns (no grammar): enough to count
 * and find parts, never to draw.
 * @param text - The layer.
 * @returns The facts.
 */
function usdaFacts(text: string): LayerFacts {
    const facts = noFacts();
    usdaMeta(text, facts);
    const prims = new UsdaPrims(facts);
    for (const raw of text.split("\n")) {
        prims.line(raw);
    }

    facts.animated ||= /\.timeSamples\s*=/.test(text);
    for (const match of text.matchAll(/\bfaceVertexCounts\s*=\s*\[([^\]]*)\]/g)) {
        facts.triangles += trianglesOf(numbersIn(match[1]));
    }
    for (const match of text.matchAll(/\bpoints\s*=\s*\[([^\]]*)\]/g)) {
        bound(facts, numbersIn(match[1]));
    }
    for (const match of text.matchAll(/@([^@\n]+)@/g)) {
        if (LAYER.test(match[1]) || PICTURE.test(match[1])) {
            facts.refs.push(match[1]);
        }
    }

    return facts;
}

/** Layers read already, so the parts lookup and the scan read a layer once. */
const layers = new WeakMap<Uint8Array, { readonly limits: ModelLimits; readonly facts: LayerFacts }>();

/**
 * Read one layer, binary or text, refusing a damaged one.
 * @param bytes - The layer.
 * @param limits - The limits in force.
 * @returns Its facts.
 */
function layerFacts(bytes: Uint8Array, limits: ModelLimits): LayerFacts {
    const held = layers.get(bytes);
    if (held?.limits === limits) {
        return held.facts;
    }

    let facts: LayerFacts;
    try {
        if (new TextDecoder("latin1").decode(bytes.subarray(0, 8)) === "PXR-USDC") {
            facts = crateFacts(readCrate(bytes, limits.maxDecodedBytes));
        } else {
            if (bytes.length > limits.maxTextBytes) {
                refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: bytes.length, limit: limits.maxTextBytes });
            }
            const text = new TextDecoder().decode(bytes);
            if (!text.trimStart().startsWith("#usda")) {
                refuse("E_MODEL_STRUCTURE", { rule: "usd" });
            }
            facts = usdaFacts(text);
        }
    } catch (error) {
        if (error instanceof ModelReadError || error instanceof RangeError) {
            refuse("E_MODEL_STRUCTURE", { rule: "usd" });
        }
        throw error;
    }

    layers.set(bytes, { limits, facts });
    return facts;
}

/**
 * A USDZ package's entries, read in place: USDZ stores every file uncompressed.
 * @param bytes - The package.
 * @returns Its files by path, in order: the first is the root layer.
 */
export function readUsdz(bytes: Uint8Array): Map<string, Uint8Array> {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const files = new Map<string, Uint8Array>();
    let at = 0;
    while (at + 30 <= bytes.length && view.getUint32(at, true) === 0x04034b50) {
        const flags = view.getUint16(at + 6, true);
        const method = view.getUint16(at + 8, true);
        const size = view.getUint32(at + 18, true);
        const nameLength = view.getUint16(at + 26, true);
        const extra = view.getUint16(at + 28, true);
        const start = at + 30 + nameLength + extra;
        if (
            method !== 0 ||
            (flags & 8) !== 0 ||
            start + size > bytes.length ||
            view.getUint32(at + 22, true) !== size
        ) {
            refuse("E_MODEL_STRUCTURE", { rule: "usdz" });
        }
        const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLength));
        const path = normalizePath(name);
        if (path === undefined || path === "" || name.startsWith("/")) {
            refuse("E_MODEL_STRUCTURE", { rule: "usdz" });
        }
        if (!name.endsWith("/")) {
            files.set(path, bytes.subarray(start, start + size));
        }
        at = start + size;
    }

    if (files.size === 0 || !LAYER.test([...files.keys()][0])) {
        refuse("E_MODEL_STRUCTURE", { rule: "usdz" });
    }

    return files;
}

/** A stage: the facts of each layer read, and the root layer's path in its file set. */
interface Stage {
    readonly root: string;
    /** The set the layers and pictures are looked up in: the model's, or a USDZ's entries. */
    readonly files: ReadonlyMap<string, Uint8Array>;
    readonly layers: Map<string, LayerFacts>;
}

/**
 * Walk the layers a stage names, from its root, each once.
 * @param root - The root layer's path.
 * @param files - The set.
 * @param limits - The limits in force.
 * @param findings - Where missing parts and substitutions go; without, a missing one is refused.
 * @returns The stage.
 */
function walk(root: string, files: ReadonlyMap<string, Uint8Array>, limits: ModelLimits, findings?: Findings): Stage {
    const stage: Stage = { root, files, layers: new Map() };
    const queue = [root];
    while (queue.length > 0) {
        const path = queue.shift() as string;
        if (stage.layers.has(path)) {
            continue;
        }
        const facts = layerFacts(files.get(path) as Uint8Array, limits);
        stage.layers.set(path, facts);
        for (const ref of new Set(facts.refs)) {
            const role = PICTURE.test(ref) ? "texture" : "geometry";
            const found =
                findings === undefined
                    ? resolveReference(ref, path, files)
                    : findReference(ref, path, files, role, findings);
            if (found !== undefined && found.path !== "" && role === "geometry") {
                queue.push(found.path);
            }
        }
    }

    return stage;
}

/**
 * The stage of a USD model: a USDZ package's, read from its entries, or a layer's in the set.
 * @param path - The main file's path.
 * @param files - The set.
 * @param limits - The limits in force.
 * @param findings - Where missing parts go, when parts are being listed.
 * @returns The stage.
 */
function stageOf(
    path: string,
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
    findings?: Findings,
): Stage {
    const bytes = files.get(path) as Uint8Array;
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
        const entries = readUsdz(bytes);
        // The package's own references resolve inside it; nothing outside it is a part of it.
        return walk([...entries.keys()][0], entries, limits, { warnings: [], missing: [] });
    }

    return walk(path, files, limits, findings);
}

/**
 * Look up every layer and picture a USD model names, so every missing one is found at once.
 * @param path - The main file's path.
 * @param files - The set.
 * @param limits - The limits in force.
 * @param findings - Where missing parts and substitutions go.
 */
export function findUsdParts(
    path: string,
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
    findings: Findings,
): void {
    stageOf(path, files, limits, findings);
}

/**
 * Every picture a stage's layers name, by its path in the set, with the materials that draw it.
 * @param stage - The stage.
 * @returns The pictures and their decoded bytes.
 */
function stagePictures(stage: Stage): { pictures: ModelPicture[]; textureBytes: number } {
    let textureBytes = 0;
    const named = new Map<string, Set<string>>();
    // Missing pictures were refused by the parts lookup; inside a USDZ one is drawn without.
    const scratch: Findings = { warnings: [], missing: [] };
    for (const [layer, facts] of stage.layers) {
        const refs = new Set([...facts.pictures.keys(), ...facts.refs.filter((r) => PICTURE.test(r))]);
        for (const ref of refs) {
            const found = findReference(ref, layer, stage.files, "texture", scratch);
            if (found === undefined || found.path === "") {
                continue;
            }
            if (!named.has(found.path)) {
                textureBytes += textureBytesOf(found.bytes, found.path);
            }
            named.set(found.path, new Set([...(named.get(found.path) ?? []), ...(facts.pictures.get(ref) ?? [])]));
        }
    }

    const pictures = [...named].map(([name, using]) => Object.freeze({ name, materials: Object.freeze([...using]) }));
    return { pictures, textureBytes };
}

/**
 * The box around every layer's points.
 * @param all - The layers' facts.
 * @returns The box; `min[0]` is Infinity when there are no points.
 */
function stageBounds(all: readonly LayerFacts[]): { min: [number, number, number]; max: [number, number, number] } {
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const facts of all) {
        for (let a = 0; a < 3; a++) {
            min[a] = Math.min(min[a], facts.min[a]);
            max[a] = Math.max(max[a], facts.max[a]);
        }
    }
    return { min, max };
}

/**
 * Check a USD model and summarize it. Its parts must have been found first ({@link findUsdParts}).
 * @param path - The main file's path.
 * @param format - `usd` or `usdz`.
 * @param files - The set.
 * @param limits - The limits in force.
 * @returns The summary and warnings.
 */
export function scanUsd(
    path: string,
    format: "usd" | "usdz",
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
): { summary: ModelSummary; warnings: readonly ModelFact[] } {
    const stage = stageOf(path, files, limits);
    const all = [...stage.layers.values()];
    const sum = (key: "meshes" | "triangles" | "skeletons" | "blendShapes"): number =>
        all.reduce((total, facts) => total + facts[key], 0);
    const triangles = sum("triangles");
    if (triangles > limits.maxTriangles) {
        refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: triangles, limit: limits.maxTriangles });
    }

    const { pictures, textureBytes } = stagePictures(stage);
    const materials = all.flatMap((f) => f.materials);
    const root = stage.layers.get(stage.root) as LayerFacts;
    const animated = all.some((f) => f.animated);
    const rate = root.timeCodesPerSecond !== undefined && root.timeCodesPerSecond > 0 ? root.timeCodesPerSecond : 24;
    const span = (root.endTimeCode ?? 0) - (root.startTimeCode ?? 0);
    // Babylon's USD loader puts the stage's animation in one group, named as below.
    const animations = animated ? [Object.freeze({ name: "USD Animation 1", seconds: Math.max(0, span) / rate })] : [];
    const meshes = sum("meshes");
    cap("meshes", meshes, limits.maxMeshes);
    cap("materials", materials.length, limits.maxMaterials);
    cap("textures", pictures.length, limits.maxTextures);
    cap("morphTargets", sum("blendShapes"), limits.maxMorphTargets);
    cap("animations", animations.length, limits.maxAnimations);
    if (textureBytes > limits.maxTextureBytes) {
        refuse("E_MODEL_TOO_LARGE", { what: "textureBytes", found: textureBytes, limit: limits.maxTextureBytes });
    }

    const { min, max } = stageBounds(all);
    const binary = new TextDecoder("latin1").decode(files.get(path)?.subarray(0, 8)) === "PXR-USDC";
    return {
        summary: Object.freeze({
            format,
            triangles,
            meshes,
            materials: Object.freeze(materials),
            textures: pictures.length,
            textureBytes,
            ...(min[0] === Infinity ? {} : { bounds: Object.freeze({ min, max }) }),
            // Babylon's USD loader turns a Z-up stage to Y up.
            upAxis: "y",
            animations: Object.freeze(animations),
            pictures: Object.freeze(pictures),
            skinned: sum("skeletons") > 0,
            morphTargets: sum("blendShapes"),
            transparent: false,
            extensionsRequired: Object.freeze([]),
            geometry: "mesh",
            ...(format === "usd" ? { encoding: binary ? "binary" : "ascii" } : {}),
            metersPerUnit: root.metersPerUnit !== undefined && root.metersPerUnit > 0 ? root.metersPerUnit : 0.01,
        }),
        warnings:
            animations.length > 0
                ? [{ code: "W_MODEL_HAS_ANIMATIONS", params: { clips: animations.map((a) => a.name) } }]
                : [],
    };
}

/**
 * The materials that draw any of some pictures, for a load that draws without them.
 * @param root - The root layer's path.
 * @param files - The set, a USDZ's entries already unpacked.
 * @param pictures - The pictures, by path in the set.
 * @param limits - The limits in force.
 * @returns The materials' names.
 */
export function usdMaterialsDrawing(
    root: string,
    files: ReadonlyMap<string, Uint8Array>,
    pictures: readonly string[],
    limits: ModelLimits,
): Set<string> {
    const gone = new Set(pictures.map((p) => p.toLowerCase()));
    const out = new Set<string>();
    const scratch: Findings = { warnings: [], missing: [] };
    for (const [layer, facts] of walk(root, files, limits, scratch).layers) {
        for (const [ref, using] of facts.pictures) {
            const found = findReference(ref, layer, files, "texture", { warnings: [], missing: [] });
            if (found !== undefined && gone.has(found.path.toLowerCase())) {
                using.forEach((m) => out.add(m));
            }
        }
    }
    return out;
}
