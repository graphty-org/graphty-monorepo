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
 * - A layer may name a `.usdz` package (a reference to a packaged asset): its layers are read from
 *   its entries, as a package's are, and counted with the rest.
 * - Meshes and triangles (from each mesh's `faceVertexCounts`, its default value or the largest
 *   of its time samples) are counted per use, as OpenUSD draws them: a prim brought in again by a
 *   reference, payload, inherit or specialize -- to a prim of the same layer or to another layer --
 *   counts again each time, and a point instancer's prototype counts once per instance (a
 *   prototype under its instancer is drawn only as its instances). Materials, skeletons, blend
 *   shapes and animated attributes are counted per layer. Everything is held to the limits.
 *
 * Babylon-free and DOM-free.
 */

import { ModelReadError } from "./readers/geometry.js";
import {
    type Crate,
    type CrateArc,
    type CrateSpec,
    isTimeSamples,
    readCrate,
    SPEC,
    type ValueRep,
} from "./readers/usdc.js";
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

/** An asset path to another USD layer, or to a USDZ package of layers. */
const LAYER = /\.usd[acz]?$/i;
/** A layer a USDZ package may start with. */
const ROOT_LAYER = /\.usd[ac]?$/i;
/** An asset path to a picture. */
const PICTURE = /\.(?:png|jpe?g|webp|avif|bmp|gif|tga|tiff?|exr|hdr|ktx2?)$/i;

/**
 * A prim brought in again: by a reference, payload, inherit or specialize, or as a point
 * instancer's instances of one prototype.
 */
interface Arc {
    /** The layer it is in, as written; undefined for this layer. */
    readonly asset?: string;
    /** The prim; "" for the whole layer (its default prim). */
    readonly path: string;
    /** How many times it is drawn. */
    readonly times: number;
}

/** What one prim writes itself. */
interface PrimFacts {
    triangles: number;
    meshes: number;
    readonly arcs: Arc[];
}

/** What one layer says about the stage. */
interface LayerFacts {
    /** Every asset path it names (other layers and pictures), as written. */
    readonly refs: string[];
    /** Each prim's own meshes, triangles and arcs, by path. */
    readonly prims: Map<string, PrimFacts>;
    /** Prototypes under the point instancer that names them: drawn only as its instances. */
    readonly prototypes: Set<string>;
    readonly materials: string[];
    skeletons: number;
    blendShapes: number;
    animated: boolean;
    /** A mesh carries a `primvars:displayColor` other than white, which Babylon draws as vertex colors. */
    vertexColors: boolean;
    /** A surface's `inputs:opacity` or a mesh's `primvars:displayOpacity` is below 1. */
    transparent: boolean;
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
        prims: new Map(),
        prototypes: new Set(),
        materials: [],
        skeletons: 0,
        blendShapes: 0,
        animated: false,
        vertexColors: false,
        transparent: false,
        pictures: new Map(),
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
    };
}

/**
 * A prim's own facts, made on first use.
 * @param facts - The layer's facts.
 * @param path - The prim's path.
 * @returns Its facts.
 */
function primOf(facts: LayerFacts, path: string): PrimFacts {
    let prim = facts.prims.get(path);
    if (prim === undefined) {
        prim = { triangles: 0, meshes: 0, arcs: [] };
        facts.prims.set(path, prim);
    }
    return prim;
}

/**
 * Note a point instancer's instances: each prototype is drawn once per index naming it, and a
 * prototype under the instancer is not drawn by itself.
 * @param facts - The layer's facts.
 * @param instancer - The instancer's path.
 * @param prototypes - Its prototypes' paths.
 * @param indices - Its instances' prototype indices.
 */
function instance(
    facts: LayerFacts,
    instancer: string,
    prototypes: readonly string[],
    indices: ArrayLike<number>,
): void {
    const times = new Map<number, number>();
    for (let i = 0; i < indices.length; i++) {
        times.set(indices[i], (times.get(indices[i]) ?? 0) + 1);
    }
    prototypes.forEach((path, i) => {
        if (path.startsWith(`${instancer}/`)) {
            facts.prototypes.add(path);
        }
        if ((times.get(i) ?? 0) > 0) {
            primOf(facts, instancer).arcs.push({ path, times: times.get(i) ?? 0 });
        }
    });
}

/**
 * An arc's target prim path, absolute: a relative one (`<../Cube>`) is resolved from the prim
 * that names it.
 * @param path - The path as written.
 * @param from - The prim that names it.
 * @returns The absolute path, or "" for none (the layer's default prim).
 */
function absolute(path: string, from: string): string {
    if (path === "" || path.startsWith("/")) {
        return path.replace(/\/$/, "");
    }
    const parts = from.split("/");
    for (const part of path.split("/")) {
        if (part === "..") {
            parts.pop();
        } else if (part !== "." && part !== "") {
            parts.push(part);
        }
    }
    return parts.join("/");
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
const PRIM_COUNTS: Readonly<Record<string, (facts: LayerFacts, name: string, path: string) => void>> = {
    Mesh: (facts, _name, path) => {
        primOf(facts, path).meshes++;
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
 * @param path - Its path.
 */
function countPrim(facts: LayerFacts, type: string, path: string): void {
    PRIM_COUNTS[type]?.(facts, leafOf(path), path);
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
 * @param indices - Each point instancer's instances' prototype indices, by its path.
 */
function crateAttribute(
    crate: Crate,
    spec: CrateSpec,
    types: ReadonlyMap<string, string>,
    facts: LayerFacts,
    indices: Map<string, ArrayLike<number>>,
): void {
    const samples = spec.fields.get("timeSamples");
    facts.animated ||= isTimeSamples(samples);
    const dot = spec.path.lastIndexOf(".");
    const [prim, name] = [spec.path.slice(0, dot), spec.path.slice(dot + 1)];
    const value = spec.fields.get("default");
    const mesh = types.get(prim) === "Mesh";
    // The value and each time sample: a mesh's faces or an instancer's instances may be only samples.
    const all = (): ArrayLike<number>[] => [value, ...crate.samples(samples)].map((rep) => crate.numbers(rep) ?? []);
    if (name === "faceVertexCounts" && mesh) {
        primOf(facts, prim).triangles += Math.max(...all().map((counts) => trianglesOf(counts)));
    } else if (name === "protoIndices") {
        indices.set(prim, longest(all()));
    } else if (name === "points" && mesh) {
        bound(facts, crate.numbers(value) ?? []);
    } else if (name === "primvars:displayColor" && mesh) {
        // White draws as no color at all (graphty-element drops all-white vertex colors).
        facts.vertexColors ||= Array.from(crate.numbers(value) ?? []).some((v) => v !== 1);
    } else if (name === "primvars:displayOpacity" || name === "inputs:opacity") {
        facts.transparent ||= Array.from(crate.numbers(value) ?? [crate.number(value) ?? 1]).some((v) => v < 1);
    } else if (name === "inputs:file") {
        const ref = crate.text(value);
        if (ref !== undefined && PICTURE.test(ref)) {
            usePicture(facts, ref, materialOf(types, prim));
        }
    }
}

/**
 * The longest of some arrays.
 * @param arrays - The arrays.
 * @returns The longest, or an empty one.
 */
function longest(arrays: readonly ArrayLike<number>[]): ArrayLike<number> {
    return arrays.reduce((a, b) => (b.length > a.length ? b : a), []);
}

/** The prim fields that bring a prim in again. */
const ARC_FIELDS = ["references", "payload", "inherits", "specializes"];

/**
 * Note a binary layer's arcs on the prim that holds them.
 * @param facts - The facts.
 * @param prim - The prim.
 * @param arcs - Its arcs, as the crate lists them.
 */
function crateArcs(facts: LayerFacts, prim: string, arcs: readonly CrateArc[]): void {
    for (const arc of arcs) {
        primOf(facts, prim).arcs.push({
            ...(arc.asset === "" ? {} : { asset: arc.asset }),
            path: arc.path,
            times: 1,
        });
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
    const prototypes = new Map<string, string[]>();
    for (const spec of crate.specs) {
        if (spec.type === SPEC.prim) {
            const type = crate.text(spec.fields.get("typeName")) ?? "";
            types.set(spec.path, type);
            countPrim(facts, type, spec.path);
            for (const field of ARC_FIELDS) {
                crateArcs(facts, spec.path, crate.arcs(spec.fields.get(field)) ?? []);
            }
        } else if (spec.type === SPEC.relationship && spec.path.endsWith(".prototypes")) {
            const arcs = crate.arcs(spec.fields.get("targetPaths")) ?? [];
            prototypes.set(
                spec.path.slice(0, -".prototypes".length),
                arcs.map((a) => a.path),
            );
        } else if (spec.type === SPEC.pseudoRoot) {
            const field = (name: string): ValueRep | undefined => spec.fields.get(name);
            facts.upAxis = crate.text(field("upAxis"));
            facts.metersPerUnit = crate.number(field("metersPerUnit"));
            facts.timeCodesPerSecond = crate.number(field("timeCodesPerSecond"));
            facts.startTimeCode = crate.number(field("startTimeCode"));
            facts.endTimeCode = crate.number(field("endTimeCode"));
        }
    }

    const indices = new Map<string, ArrayLike<number>>();
    for (const spec of crate.specs) {
        if (spec.type === SPEC.attribute) {
            crateAttribute(crate, spec, types, facts, indices);
        }
    }
    for (const [instancer, paths] of prototypes) {
        instance(facts, instancer, paths, indices.get(instancer) ?? []);
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

/**
 * Walks a text layer's lines, keeping which prims are open: to tell which material a picture is
 * in, and which prim each line writes (a prim's metadata, before its `{`, is its own).
 */
class UsdaPrims {
    private readonly stack: (string | null)[] = [];
    /** The open prims' paths; a brace that opens no prim repeats its parent's. */
    private readonly paths: string[] = [];
    private readonly materials: string[] = [];
    private pending: { type: string; path: string } | null = null;
    /** The prim each line writes, by line. */
    readonly owners: string[] = [];

    constructor(private readonly facts: LayerFacts) {}

    line(raw: string): void {
        const def = /^\s*(?:def|over|class)\s+(\w+)?\s*"([^"]*)"/.exec(raw);
        if (def !== null) {
            this.pending = { type: def[1] ?? "", path: `${this.paths.at(-1) ?? ""}/${def[2]}` };
            countPrim(this.facts, this.pending.type, this.pending.path);
        }
        this.owners.push(this.pending?.path ?? this.paths.at(-1) ?? "");

        // Strings and asset paths may hold braces: they are taken out before braces are counted.
        const line = raw.replaceAll(/"(?:[^"\\]|\\.)*"/g, '""');
        const picture = /\binputs:file\s*=\s*@([^@]+)@/.exec(line);
        if (picture !== null && PICTURE.test(picture[1])) {
            usePicture(this.facts, picture[1], this.materials.at(-1));
        }

        for (const c of line.replaceAll(/@[^@]*@/g, "")) {
            if (c === "{") {
                this.open();
            } else if (c === "}") {
                this.paths.pop();
                if (this.stack.pop() !== null) {
                    this.materials.pop();
                }
            }
        }
    }

    private open(): void {
        const opened = this.pending?.type === "Material" ? leafOf(this.pending.path) : null;
        this.stack.push(opened);
        this.paths.push(this.pending?.path ?? this.paths.at(-1) ?? "");
        if (opened !== null) {
            this.materials.push(opened);
        }
        this.pending = null;
    }
}

/**
 * Each array a text layer writes for an attribute: its value, or each of its time samples.
 * @param text - The layer.
 * @param name - The attribute's name.
 * @returns Where each is written, and its arrays.
 */
function arraysOf(text: string, name: string): { at: number; arrays: number[][] }[] {
    const pattern = new RegExp(String.raw`\b${name}(\.timeSamples)?\s*=\s*(\{[^}]*\}|\[[^\]]*\])`, "g");
    return [...text.matchAll(pattern)].map((match) => ({
        at: match.index,
        arrays:
            match[1] === undefined
                ? [numbersIn(match[2].slice(1, -1))]
                : [...match[2].matchAll(/\[([^\]]*)\]/g)].map((sample) => numbersIn(sample[1])),
    }));
}

/**
 * Note a text layer's arcs and point instancers on the prims that write them.
 * @param text - The layer.
 * @param facts - The facts.
 * @param ownerAt - The prim written at an offset.
 */
function usdaArcs(text: string, facts: LayerFacts, ownerAt: (at: number) => string): void {
    const ARC =
        /\b(?:(prepend|append|add|delete|reorder)\s+)?(?:references|payload|inherits|specializes)\s*=\s*(\[[^\]]*\]|[^\n]*)/g;
    for (const match of text.matchAll(ARC)) {
        if (match[1] === "delete" || match[1] === "reorder") {
            continue;
        }
        const owner = ownerAt(match.index);
        for (const item of match[2].matchAll(/@([^@\n]+)@(?:<([^>\n]*)>)?|<([^>\n]*)>/g)) {
            const asset = item[1] as string | undefined;
            primOf(facts, owner).arcs.push({
                ...(asset === undefined ? {} : { asset }),
                path: absolute(item[2] ?? item[3] ?? "", owner),
                times: 1,
            });
        }
    }

    const prototypes = new Map<string, string[]>();
    for (const match of text.matchAll(/\bprototypes\s*=\s*(\[[^\]]*\]|<[^>\n]*>)/g)) {
        const owner = ownerAt(match.index);
        prototypes.set(
            owner,
            [...match[1].matchAll(/<([^>\n]*)>/g)].map((p) => absolute(p[1], owner)),
        );
    }
    const indices = new Map(arraysOf(text, "protoIndices").map(({ at, arrays }) => [ownerAt(at), longest(arrays)]));
    for (const [instancer, paths] of prototypes) {
        instance(facts, instancer, paths, indices.get(instancer) ?? []);
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
    const starts: number[] = [];
    let at = 0;
    for (const raw of text.split("\n")) {
        starts.push(at);
        at += raw.length + 1;
        prims.line(raw);
    }
    const ownerAt = (offset: number): string => {
        let [lo, hi] = [0, starts.length - 1];
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            [lo, hi] = starts[mid] <= offset ? [mid, hi] : [lo, mid - 1];
        }
        return prims.owners[lo] ?? "";
    };

    facts.animated ||= /\.timeSamples\s*=/.test(text);
    for (const { at: written, arrays } of arraysOf(text, "faceVertexCounts")) {
        primOf(facts, ownerAt(written)).triangles += Math.max(0, ...arrays.map((counts) => trianglesOf(counts)));
    }
    usdaArcs(text, facts, ownerAt);
    for (const match of text.matchAll(/\bpoints\s*=\s*\[([^\]]*)\]/g)) {
        bound(facts, numbersIn(match[1]));
    }
    // ponytail: any displayColor counts, not only a mesh's; a prim of another type rarely has one.
    for (const match of text.matchAll(/\bprimvars:displayColor\s*=\s*\[([^\]]*)\]/g)) {
        facts.vertexColors ||= numbersIn(match[1]).some((v) => v !== 1);
    }
    for (const match of text.matchAll(/\b(?:primvars:displayOpacity|inputs:opacity)\s*=\s*\[?([^\]\n]*)/g)) {
        facts.transparent ||= numbersIn(match[1]).some((v) => v < 1);
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

    if (files.size === 0 || !ROOT_LAYER.test([...files.keys()][0])) {
        refuse("E_MODEL_STRUCTURE", { rule: "usdz" });
    }

    return files;
}

/** One layer of a stage, as read. */
interface StageLayer {
    readonly facts: LayerFacts;
    /** Its path in the set it is in. */
    readonly path: string;
    /** That set: the model's, or a USDZ package's entries. */
    readonly files: ReadonlyMap<string, Uint8Array>;
    /** Its key's prefix: "" in the model's set, a package's own key and "!" inside it. */
    readonly prefix: string;
    /** Each layer it names that was found, by its asset path as written: that layer's key. */
    readonly found: Map<string, string>;
}

/** A stage: every layer read, by key (its path in its set, after its package's key). */
interface Stage {
    readonly root: string;
    readonly layers: Map<string, StageLayer>;
}

/**
 * Walk the layers a stage names, from its root, each once. A `.usdz` a layer names is a package:
 * its layers are read from its entries, from its first, and nothing outside it is a part of it.
 * @param root - The root layer's path.
 * @param files - The set.
 * @param limits - The limits in force.
 * @param findings - Where missing parts and substitutions go; without, a missing one is refused.
 * @returns The stage.
 */
function walk(root: string, files: ReadonlyMap<string, Uint8Array>, limits: ModelLimits, findings?: Findings): Stage {
    const stage: Stage = { root, layers: new Map() };
    const queue: Next[] = [{ key: root, path: root, files, prefix: "" }];
    while (queue.length > 0) {
        const at = queue.shift() as Next;
        if (stage.layers.has(at.key)) {
            continue;
        }
        const facts = layerFacts(at.files.get(at.path) as Uint8Array, limits);
        const layer: StageLayer = { facts, path: at.path, files: at.files, prefix: at.prefix, found: new Map() };
        stage.layers.set(at.key, layer);
        // Inside a package, a part it lacks is drawn without: it is no part of the model's set.
        const notes = at.prefix === "" ? findings : { warnings: [], missing: [] };
        for (const ref of new Set(facts.refs)) {
            const next = follow(ref, layer, notes);
            if (next !== undefined) {
                layer.found.set(ref, next.key);
                queue.push(next);
            }
        }
    }

    return stage;
}

/** A layer to read next. */
interface Next {
    readonly key: string;
    readonly path: string;
    readonly files: ReadonlyMap<string, Uint8Array>;
    readonly prefix: string;
}

/**
 * Look up one asset path a layer names, and say which layer to read next for it: the layer found,
 * or the first layer of the package found.
 * @param ref - The asset path.
 * @param layer - The layer naming it.
 * @param notes - Where a missing part goes; without, a missing one is refused.
 * @returns The layer to read, or undefined for a picture or a part not found.
 */
function follow(ref: string, layer: StageLayer, notes: Findings | undefined): Next | undefined {
    const role = PICTURE.test(ref) ? "texture" : "geometry";
    const found =
        notes === undefined
            ? resolveReference(ref, layer.path, layer.files)
            : findReference(ref, layer.path, layer.files, role, notes);
    if (found === undefined || found.path === "" || role !== "geometry") {
        return undefined;
    }
    const key = layer.prefix + found.path;
    if (found.bytes[0] !== 0x50 || found.bytes[1] !== 0x4b) {
        return { key, path: found.path, files: layer.files, prefix: layer.prefix };
    }
    const entries = readUsdz(found.bytes);
    const [first] = entries.keys();
    return { key: `${key}!${first}`, path: first, files: entries, prefix: `${key}!` };
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

/** Meshes and triangles drawn. */
interface Drawn {
    triangles: number;
    meshes: number;
}

/**
 * The meshes and triangles a stage draws, counted per use: each prim's own, each arc's target
 * again as many times as it is drawn, and every layer no arc reaches (a sublayer) once.
 * @param stage - The stage.
 * @returns What it draws.
 */
function drawn(stage: Stage): Drawn {
    const memo = new Map<string, Drawn>();
    const open = new Set<string>();
    const reached = new Set<string>();
    const children = new Map<string, Map<string, string[]>>();
    /**
     * Each prim's children in one layer, every prim's ancestors included.
     * @param key - The layer's key.
     * @param layer - The layer.
     * @returns The children by parent path ("" the layer's root).
     */
    const childrenOf = (key: string, layer: StageLayer): Map<string, string[]> => {
        let tree = children.get(key);
        if (tree === undefined) {
            tree = new Map();
            const seen = new Set([""]);
            for (let path of layer.facts.prims.keys()) {
                while (!seen.has(path)) {
                    seen.add(path);
                    const parent = path.slice(0, Math.max(0, path.lastIndexOf("/")));
                    tree.set(parent, [...(tree.get(parent) ?? []), path]);
                    path = parent;
                }
            }
            children.set(key, tree);
        }
        return tree;
    };
    const add = (into: Drawn, from: Drawn, times: number): void => {
        into.triangles += from.triangles * times;
        into.meshes += from.meshes * times;
    };
    const below = (key: string, path: string): Drawn => {
        const id = `${key}\0${path}`;
        const known = memo.get(id);
        if (known !== undefined) {
            return known;
        }
        const out: Drawn = { triangles: 0, meshes: 0 };
        const layer = stage.layers.get(key);
        // A cycle of arcs draws nothing more (OpenUSD refuses it).
        if (layer === undefined || open.has(id)) {
            return out;
        }
        open.add(id);
        reached.add(key);
        const prim = layer.facts.prims.get(path);
        add(out, prim ?? out, prim === undefined ? 0 : 1);
        for (const arc of prim?.arcs ?? []) {
            const target = arc.asset === undefined ? key : layer.found.get(arc.asset);
            if (target !== undefined) {
                add(out, below(target, arc.path), arc.times);
            }
        }
        for (const child of childrenOf(key, layer).get(path) ?? []) {
            if (!layer.facts.prototypes.has(child)) {
                add(out, below(key, child), 1);
            }
        }
        open.delete(id);
        memo.set(id, out);
        return out;
    };

    try {
        const total = below(stage.root, "");
        for (const key of stage.layers.keys()) {
            if (!reached.has(key)) {
                add(total, below(key, ""), 1);
            }
        }
        return total;
    } catch (error) {
        // Arcs or prims nested past the call stack: no real stage is that deep.
        if (error instanceof RangeError) {
            refuse("E_MODEL_STRUCTURE", { rule: "usd" });
        }
        throw error;
    }
}

/**
 * Every picture a stage's layers name, by its path in the set, with the materials that draw it.
 * @param stage - The stage.
 * @returns The pictures and their decoded bytes.
 */
function stagePictures(stage: Stage): { pictures: ModelPicture[]; textureBytes: number } {
    let textureBytes = 0;
    const named = new Map<string, { name: string; using: Set<string> }>();
    // Missing pictures were refused by the parts lookup; inside a USDZ one is drawn without.
    const scratch: Findings = { warnings: [], missing: [] };
    for (const layer of stage.layers.values()) {
        const { facts } = layer;
        const refs = new Set([...facts.pictures.keys(), ...facts.refs.filter((r) => PICTURE.test(r))]);
        for (const ref of refs) {
            const found = findReference(ref, layer.path, layer.files, "texture", scratch);
            if (found === undefined || found.path === "") {
                continue;
            }
            const key = layer.prefix + found.path;
            const entry = named.get(key) ?? { name: found.path, using: new Set<string>() };
            if (!named.has(key)) {
                textureBytes += textureBytesOf(found.bytes, found.path);
                named.set(key, entry);
            }
            for (const material of facts.pictures.get(ref) ?? []) {
                entry.using.add(material);
            }
        }
    }

    const pictures = [...named.values()].map(({ name, using }) =>
        Object.freeze({ name, materials: Object.freeze([...using]) }),
    );
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
    const all = [...stage.layers.values()].map((layer) => layer.facts);
    const sum = (key: "skeletons" | "blendShapes"): number => all.reduce((total, facts) => total + facts[key], 0);
    const { triangles, meshes } = drawn(stage);
    if (triangles > limits.maxTriangles) {
        refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: triangles, limit: limits.maxTriangles });
    }

    const { pictures, textureBytes } = stagePictures(stage);
    const materials = all.flatMap((f) => f.materials);
    const root = (stage.layers.get(stage.root) as StageLayer).facts;
    const animated = all.some((f) => f.animated);
    const rate = root.timeCodesPerSecond !== undefined && root.timeCodesPerSecond > 0 ? root.timeCodesPerSecond : 24;
    const span = (root.endTimeCode ?? 0) - (root.startTimeCode ?? 0);
    // Babylon's USD loader puts the stage's animation in one group, named as below.
    const animations = animated ? [Object.freeze({ name: "USD Animation 1", seconds: Math.max(0, span) / rate })] : [];
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
            transparent: all.some((f) => f.transparent),
            extensionsRequired: Object.freeze([]),
            geometry: "mesh",
            ...(all.some((f) => f.vertexColors) ? { vertexColors: true } : {}),
            ...(format === "usd" ? { encoding: binary ? "binary" : "ascii" } : {}),
            metersPerUnit: root.metersPerUnit !== undefined && root.metersPerUnit > 0 ? root.metersPerUnit : 0.01,
        }),
        warnings:
            animations.length > 0
                ? [{ code: "W_MODEL_HAS_ANIMATIONS", params: { clips: animations.map((a) => a.name) } }]
                : [],
    };
}
