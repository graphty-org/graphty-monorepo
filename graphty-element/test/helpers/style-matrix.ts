/**
 * @file The style combination matrix (issue #10370): which node style settings are drawn together, under
 * which viewing conditions, and what each drawing must measure. Pure: no browser, no scene. The browser
 * runner (test/browser/style-combination-matrix.test.ts) renders each case and hands the frames here.
 *
 * Every part of a node is painted one flat, unlit color of its own, so a pixel says which part it is.
 * Measurements are taken in the node's own measuring plane, in world units: the slab's plane for a
 * flat shape, the camera-facing plane through the node's center for a solid (where its rings are
 * billboarded). A plane-to-screen homography maps between that plane and device pixels exactly,
 * perspective included, so a tilted flat node is measured in its own plane and not foreshortened.
 *
 * Expected values come from what each setting promises (its channel docs and the code that builds
 * it), never from a picture:
 * - a border is `borderWidth` size units wide; a size unit is `NODE_EXTENT_PER_SIZE` world units under
 *   the default `sizeMode`; `borderPosition` puts its outer edge `width`, `width / 2` or 0 past the
 *   fill's own outline (node-shapes-extents-borders.test.ts pins the same numbers);
 * - `borderScreenWidth` is that many CSS pixels at any zoom (rebuilt every 1/16 of a zoom doubling,
 *   so up to 4.4% off between rebuilds);
 * - an outer border starts `outerBorderOffset` past the border's outer edge and is
 *   `outerBorderWidth` wide, in border units;
 * - an underlay or overlay is the node's outline grown by its padding;
 * - a shadow is the node's outline moved `shadowOffsetX` right and `shadowOffsetY` down;
 * - a halo is the node's own shape scaled `haloScale` about its center;
 * - an outline stays against the node's edge (node-outline-perspective.test.ts);
 * - a label at "bottom" sits beyond the node's outline (it may lie over the rings round it);
 * - an edge stops at the outer edge of the border;
 * - under `sizeSpace: "screen"` two nodes at different depths are drawn the same pixel size.
 */

import { NodeShapes } from "../../src/config/NodeStyle";

// ---------------------------------------------------------------------------------------------
// Settings and conditions
// ---------------------------------------------------------------------------------------------

/** The shapes of the pairwise part: solids and flat shapes, convex and not. */
export const PAIRWISE_SHAPES = [
    "sphere",
    "box",
    "cylinder",
    "cone",
    "tetrahedron",
    "icosphere",
    "capsule",
    "torus",
    "rectangle",
    "round-rectangle",
    "ellipse",
    "diamond",
    "triangle",
    "hexagon",
    "star",
    "vee",
] as const;

/** Every shape the full border sweep draws: all of them but those that need points, or draw no body. */
export const ALL_SHAPES: readonly string[] = NodeShapes.options.filter(
    (shape) => !["none", "polygon", "round-polygon"].includes(shape),
);

/** Each setting factor and the values the matrix gives it. */
export const SETTING_FACTORS = {
    shape: PAIRWISE_SHAPES as readonly string[],
    border: ["none", "outside", "center", "inside", "screen", "dashed"],
    outer: ["none", "abut", "gap"],
    plate: ["none", "underlay", "overlay"],
    shadow: ["none", "offset"],
    effect: ["none", "halo", "outline"],
    sizeSpace: ["scene", "pivot", "screen"],
    extents: ["uniform", "wide"],
    label: ["none", "bottom"],
    edges: ["off", "on"],
} as const;

/** Each viewing-condition factor and its values. */
export const CONDITION_FACTORS = {
    view: ["2d", "3d"],
    zoom: ["far", "mid", "near"],
    angle: ["0", "1", "2", "3", "4"],
    dpr: ["1", "2"],
} as const;

/** One case's settings. */
export type Settings = { [K in keyof typeof SETTING_FACTORS]: string };
/** One case's viewing condition. */
export type Condition = { [K in keyof typeof CONDITION_FACTORS]: string };

/** One case of the matrix. */
export interface MatrixCase {
    id: string;
    /**
     * "pairwise" covers every pair of factor values, "triples" every triple of the ring settings, and
     * "border-shapes" is the owner's report in full.
     */
    family: "pairwise" | "triples" | "border-shapes";
    settings: Settings;
    condition: Condition;
}

/** The numbers each setting value draws, in the units its channel takes. */
export const AMOUNTS = {
    size: 1,
    borderWidth: 0.3,
    borderScreenWidth: 4,
    outerWidth: 0.2,
    outerGap: 0.2,
    underlayPadding: 0.4,
    overlayPadding: 0.3,
    shadowOffset: 0.3,
    haloScale: 1.45,
    wideWidth: 1.6,
} as const;

/**
 * The node size a case draws: under `sizeSpace: "screen"` a size is a fiftieth of the view's height, so
 * size 1 would be a few pixels and nothing round it could be measured; 6 is about an eighth of the view.
 * @param settings - The case's settings.
 * @returns The size.
 */
export function sizeOf(settings: Settings): number {
    return settings.sizeSpace === "screen" ? 6 : AMOUNTS.size;
}

/** World units per size unit under the default `sizeMode` (NODE_EXTENT_PER_SIZE). */
export const PER_SIZE = 1.5;

/** The flat colors each part is painted, as bytes. Checked in test/unit/style-matrix.test.ts to be apart. */
export const PALETTE = {
    fill: [255, 0, 0],
    border: [120, 200, 0],
    outer: [0, 160, 0],
    underlay: [40, 240, 240],
    overlay: [0, 240, 120],
    shadow: [0, 0, 240],
    halo: [255, 190, 0],
    outline: [140, 0, 255],
    label: [0, 90, 120],
    edge: [0, 0, 0],
} as const satisfies Record<string, readonly [number, number, number]>;

/** A part a pixel can belong to. "bg" is the background, "mixed" a blended or unknown pixel. */
export type Part = keyof typeof PALETTE | "bg" | "mixed";

/** Hex for a palette color. */
export function hex(part: keyof typeof PALETTE): string {
    return `#${PALETTE[part].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** A small seeded generator (mulberry32), so the matrix is the same on every run. */
function random(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Every set of `t` indices out of `n`, in order.
 * @param n - How many.
 * @param t - Set size.
 * @returns The sets.
 */
function choose(n: number, t: number): number[][] {
    if (t === 0) {
        return [[]];
    }
    const out: number[][] = [];
    for (let last = t - 1; last < n; last++) {
        for (const head of choose(last, t - 1)) {
            out.push([...head, last]);
        }
    }
    return out;
}

/**
 * A covering array of strength `t`: every combination of values of every `t` factors appears in some row.
 * Greedy: each row starts from one combination still uncovered, and each other factor takes the value
 * that covers most of what is left.
 * @param factors - The factors and their values.
 * @param t - The strength: 2 for all pairs, 3 for all triples.
 * @param seed - The generator's seed, so the matrix is the same on every run.
 * @returns The rows.
 */
export function covering(factors: Record<string, readonly string[]>, t = 2, seed = 10370): Record<string, string>[] {
    const names = Object.keys(factors);
    const sets = choose(names.length, t);
    const key = (set: readonly number[], row: readonly string[]): string =>
        set.map((i) => `${String(i)}=${row[i]}`).join("|");
    const uncovered = new Set<string>();
    for (const set of sets) {
        let combos: string[][] = [[]];
        for (const i of set) {
            combos = combos.flatMap((c) => factors[names[i]].map((v) => [...c, v]));
        }
        for (const combo of combos) {
            uncovered.add(set.map((i, k) => `${String(i)}=${combo[k]}`).join("|"));
        }
    }
    const next = random(seed);
    const gain = (row: readonly string[]): number => sets.filter((set) => uncovered.has(key(set, row))).length;
    const rows: Record<string, string>[] = [];
    while (uncovered.size > 0) {
        const [start] = uncovered;
        const fixed = new Map(
            start
                .split("|")
                .map((part) => part.split("="))
                .map(([i, v]) => [Number(i), v]),
        );
        const row = names.map((n, i) => fixed.get(i) ?? factors[n][Math.floor(next() * factors[n].length)]);
        names.forEach((n, i) => {
            if (fixed.has(i)) {
                return;
            }
            let value = row[i];
            let most = -1;
            for (const v of factors[n]) {
                row[i] = v;
                const g = gain(row);
                if (g > most) {
                    most = g;
                    value = v;
                }
            }
            row[i] = value;
        });
        for (const set of sets) {
            uncovered.delete(key(set, row));
        }
        rows.push(Object.fromEntries(names.map((n, i) => [n, row[i]])));
    }
    return rows;
}

/** The settings whose rings stack round one node: every triple of their values is drawn together. */
export const RING_FACTORS = ["shape", "border", "outer", "plate", "shadow", "effect"] as const;

const NO_SETTINGS: Settings = {
    shape: "sphere",
    border: "none",
    outer: "none",
    plate: "none",
    shadow: "none",
    effect: "none",
    sizeSpace: "scene",
    extents: "uniform",
    label: "none",
    edges: "off",
};

/**
 * Every case: all pairs over the settings and conditions together, all triples of the ring settings,
 * then the owner's report in full
 * (a border on every shape, at every zoom and camera angle, in 2D and 3D).
 * @returns The cases, sorted so that one view and pixel ratio run together.
 */
export function allCases(): MatrixCase[] {
    const pairwise = covering({ ...SETTING_FACTORS, ...CONDITION_FACTORS }).map((row, n): MatrixCase => {
        const { view, zoom, angle, dpr, ...settings } = row;
        return {
            id: `pw-${String(n).padStart(3, "0")}`,
            family: "pairwise",
            settings: settings as Settings,
            condition: { view, zoom, angle, dpr },
        };
    });
    // all triples of the ring settings, each under a condition and the other settings drawn in turn
    const ringFactors = Object.fromEntries(RING_FACTORS.map((f) => [f, SETTING_FACTORS[f]]));
    const turn = random(3);
    const any = (list: readonly string[]): string => list[Math.floor(turn() * list.length)];
    const triples = covering(ringFactors, 3).map((row, n): MatrixCase => ({
        id: `tw-${String(n).padStart(3, "0")}`,
        family: "triples",
        settings: {
            ...(Object.fromEntries(Object.entries(SETTING_FACTORS).map(([f, values]) => [f, any(values)])) as Settings),
            ...row,
        },
        condition: {
            view: any(CONDITION_FACTORS.view),
            zoom: any(CONDITION_FACTORS.zoom),
            angle: any(CONDITION_FACTORS.angle),
            dpr: any(CONDITION_FACTORS.dpr),
        },
    }));
    const full: MatrixCase[] = [];
    for (const shape of ALL_SHAPES) {
        for (const border of ["outside", "inside", "screen"]) {
            for (const view of CONDITION_FACTORS.view) {
                for (const zoom of CONDITION_FACTORS.zoom) {
                    for (const angle of CONDITION_FACTORS.angle) {
                        full.push({
                            id: `bs-${shape}-${border}-${view}-${zoom}-a${angle}`,
                            family: "border-shapes",
                            settings: { ...NO_SETTINGS, shape, border },
                            condition: { view, zoom, angle, dpr: "1" },
                        });
                    }
                }
            }
        }
    }
    const order = (c: MatrixCase): string => `${c.condition.view}|${c.condition.dpr}`;
    return [...pairwise, ...triples, ...full].sort((a, b) => order(a).localeCompare(order(b)));
}

/**
 * One shard's share of the cases, chosen by a hash of each id so each shard gets a like mix, in the
 * sorted order (few view and pixel ratio switches).
 * @param cases - All cases.
 * @param index - The shard, from 0.
 * @param count - How many shards.
 * @returns The shard's cases.
 */
export function shardOf(cases: readonly MatrixCase[], index: number, count: number): MatrixCase[] {
    // by a hash of the id, not by position: a stride would line up with the factors' own cycles
    const hash = (id: string): number => {
        let h = 2166136261;
        for (let i = 0; i < id.length; i++) {
            h = Math.imul(h ^ id.charCodeAt(i), 16777619);
        }
        return h >>> 0;
    };
    return cases.filter((c) => hash(c.id) % count === index);
}

/** The flat shapes: drawn as a slab, so measured in the slab's own plane. */
const FLAT = new Set([
    "rectangle",
    "round-rectangle",
    "top-round-rectangle",
    "bottom-round-rectangle",
    "ellipse",
    "diamond",
    "triangle",
    "pentagon",
    "hexagon",
    "octagon",
    "parallelogram",
    "trapezoid",
    "star",
    "vee",
    "cross",
    "house",
    "man",
    "woman",
    "round-triangle",
    "round-diamond",
    "round-pentagon",
    "round-hexagon",
    "round-octagon",
    "barrel",
    "database",
]);

/**
 * Whether a shape is a flat slab.
 * @param shape - The shape.
 * @returns True for a flat shape.
 */
export function isFlat(shape: string): boolean {
    return FLAT.has(shape);
}

/** The channel values a layer sets for a case; `plain` leaves only the fill (the silhouette reference). */
export function nodeStyle(settings: Settings, variant: "full" | "plain" | "scene-plain"): Record<string, unknown> {
    const s = settings;
    const set: Record<string, unknown> = {
        "node.unlit": true,
        "node.color": hex("fill"),
        "node.size": sizeOf(s),
        "node.shape": s.shape,
        "node.sizeSpace": variant === "scene-plain" ? "scene" : s.sizeSpace,
    };
    if (s.extents === "wide") {
        set["node.width"] = AMOUNTS.wideWidth;
        set["node.height"] = AMOUNTS.size;
    }
    if (variant !== "full") {
        return set;
    }
    if (s.border !== "none") {
        set["node.borderColor"] = hex("border");
        if (s.border === "screen") {
            set["node.borderScreenWidth"] = AMOUNTS.borderScreenWidth;
        } else {
            set["node.borderWidth"] = AMOUNTS.borderWidth;
            set["node.borderPosition"] = s.border === "dashed" ? "outside" : s.border;
        }
        if (s.border === "dashed") {
            set["node.borderStyle"] = "dashed";
        }
    }
    if (s.outer !== "none") {
        set["node.outerBorderWidth"] = AMOUNTS.outerWidth;
        set["node.outerBorderColor"] = hex("outer");
        set["node.outerBorderOffset"] = s.outer === "gap" ? AMOUNTS.outerGap : 0;
    }
    if (s.plate === "underlay") {
        Object.assign(set, {
            "node.underlayColor": hex("underlay"),
            "node.underlayOpacity": 1,
            "node.underlayPadding": AMOUNTS.underlayPadding,
        });
    } else if (s.plate === "overlay") {
        Object.assign(set, {
            "node.overlayColor": hex("overlay"),
            "node.overlayOpacity": 1,
            "node.overlayPadding": AMOUNTS.overlayPadding,
        });
    }
    if (s.shadow === "offset") {
        Object.assign(set, {
            "node.shadowColor": hex("shadow"),
            "node.shadowOpacity": 1,
            "node.shadowOffsetX": AMOUNTS.shadowOffset,
            "node.shadowOffsetY": AMOUNTS.shadowOffset,
        });
    }
    if (s.effect === "halo") {
        Object.assign(set, {
            "node.haloColor": hex("halo"),
            "node.haloOpacity": 1,
            "node.haloScale": AMOUNTS.haloScale,
        });
    } else if (s.effect === "outline") {
        set["node.outline"] = hex("outline");
    }
    if (s.label === "bottom") {
        Object.assign(set, {
            "node.label": "Ab",
            "node.labelLocation": "bottom",
            "node.labelBackground": hex("label"),
            "node.labelColor": hex("label"),
        });
    }
    return set;
}

/**
 * The camera for a condition: in 3D a position on a sphere round node a, in 2D orthographic edges and a roll.
 * @param condition - The condition.
 * @returns A camera state for `setCameraState`.
 */
export function cameraOf(condition: Condition): Record<string, unknown> {
    const angle = Number(condition.angle);
    if (condition.view === "2d") {
        const half = { far: 18, mid: 9, near: 3.6 }[condition.zoom] ?? 9;
        return {
            orthoLeft: -half,
            orthoRight: half,
            orthoTop: half * 0.75,
            orthoBottom: -half * 0.75,
            pan: { x: 0, y: 0 },
            rotation: [0, 0.4, 0.8, 1.6, 3][angle],
        };
    }
    const distance = { far: 36, mid: 14, near: 6.5 }[condition.zoom] ?? 14;
    // front, turned 45 degrees, from 45 degrees above, oblique, and 76 degrees off the front (near edge-on)
    const directions: [number, number, number][] = [
        [0, 0, -1],
        [Math.SQRT1_2, 0, -Math.SQRT1_2],
        [0, Math.SQRT1_2, -Math.SQRT1_2],
        [0.5, 0.5, -Math.SQRT1_2],
        [0, 0.97, -0.243],
    ];
    const [x, y, z] = directions[angle];
    const length = Math.hypot(x, y, z);
    return {
        position: { x: (x / length) * distance, y: (y / length) * distance, z: (z / length) * distance },
        target: { x: 0, y: 0, z: 0 },
    };
}

// ---------------------------------------------------------------------------------------------
// Frames and the measuring plane
// ---------------------------------------------------------------------------------------------

/** A read-back frame: RGBA rows bottom-up, as WebGL reads them. */
export interface Frame {
    data: Uint8Array;
    width: number;
    height: number;
}

/** A classified frame: one part index per pixel, rows top-down. */
export interface Classes {
    parts: Int8Array;
    width: number;
    height: number;
}

/** The parts in index order. */
export const PARTS: readonly Part[] = ["bg", "mixed", ...(Object.keys(PALETTE) as (keyof typeof PALETTE)[])];
const PART_INDEX = new Map(PARTS.map((p, i) => [p, i]));

/**
 * The index of a part.
 * @param part - The part.
 * @returns Its index in {@link PARTS}.
 */
export function partIndex(part: Part): number {
    return PART_INDEX.get(part) ?? 1;
}

/**
 * The part index of a pixel another node's meshes cover (NodeFrames.others): the classifier cannot tell two nodes'
 * parts apart, so what lies there is not read as this node's.
 */
export const OTHER_NODE = -2;

/** How far (RGB distance) a pixel may be from its part's color and still count as it. */
export const CLASS_DISTANCE = 40;

/** The clear color the browser runner sets: a node can cover any corner of the frame, so it is never sampled. */
export const BACKGROUND = [255, 255, 255] as const;

/**
 * Sort every pixel into a part by its nearest palette color.
 * @param frame - The frame.
 * @param background - The frame's clear color.
 * @returns The parts, rows top-down.
 */
export function classify(frame: Frame, background: readonly number[] = BACKGROUND): Classes {
    const { data, width, height } = frame;
    const colors: [number, number[]][] = [[0, [...background]]];
    PARTS.forEach((part, i) => {
        if (part !== "bg" && part !== "mixed") {
            colors.push([i, [...PALETTE[part]]]);
        }
    });
    const parts = new Int8Array(width * height).fill(1);
    for (let row = 0; row < height; row++) {
        const y = height - 1 - row;
        for (let x = 0; x < width; x++) {
            const at = (row * width + x) * 4;
            let best = 1;
            let bestDistance = CLASS_DISTANCE;
            for (const [i, c] of colors) {
                const d = Math.hypot(data[at] - c[0], data[at + 1] - c[1], data[at + 2] - c[2]);
                if (d < bestDistance) {
                    bestDistance = d;
                    best = i;
                }
            }
            parts[y * width + x] = best;
        }
    }
    return { parts, width, height };
}

/**
 * A homography from a node's measuring plane (u, v in world units) to device pixels (x right, y down).
 * `m` maps (u, v, 1) to homogeneous screen (x w, y w, w).
 */
export interface Plane {
    m: number[];
    inverse: number[];
}

/**
 * The 3x3 inverse of a row-major matrix.
 * @param m - The matrix.
 * @returns Its inverse.
 */
function invert3(m: readonly number[]): number[] {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [
        A / det,
        -(b * i - c * h) / det,
        (b * f - c * e) / det,
        B / det,
        (a * i - c * g) / det,
        -(a * f - c * d) / det,
        C / det,
        -(a * h - b * g) / det,
        (a * e - b * d) / det,
    ];
}

/**
 * The measuring plane through `center` spanned by unit vectors `ex` and `ey`, under a Babylon
 * view-projection matrix (row-vector convention, `m` as Babylon stores it) on a `width` by `height` target.
 * @param transform - The view-projection matrix's 16 numbers.
 * @param center - The plane's origin in the world.
 * @param ex - Its u axis.
 * @param ey - Its v axis.
 * @param width - Render width.
 * @param height - Render height.
 * @returns The plane.
 */
export function planeOf(
    transform: ArrayLike<number>,
    center: readonly number[],
    ex: readonly number[],
    ey: readonly number[],
    width: number,
    height: number,
): Plane {
    const t = transform;
    const clip = (x: number, y: number, z: number, w: number): number[] => [
        x * t[0] + y * t[4] + z * t[8] + w * t[12],
        x * t[1] + y * t[5] + z * t[9] + w * t[13],
        x * t[3] + y * t[7] + z * t[11] + w * t[15],
    ];
    const A = clip(ex[0], ex[1], ex[2], 0);
    const B = clip(ey[0], ey[1], ey[2], 0);
    const D = clip(center[0], center[1], center[2], 1);
    // ndc (X, Y, W) -> pixels: x = (X/W + 1) / 2 * width, y = (1 - Y/W) / 2 * height
    const toPixels = [width / 2, 0, width / 2, 0, -height / 2, height / 2, 0, 0, 1];
    const ndc = [A[0], B[0], D[0], A[1], B[1], D[1], A[2], B[2], D[2]];
    const m = multiply3(toPixels, ndc);
    return { m, inverse: invert3(m) };
}

/**
 * Two 3x3 row-major matrices multiplied.
 * @param a - Left.
 * @param b - Right.
 * @returns a b.
 */
function multiply3(a: readonly number[], b: readonly number[]): number[] {
    const out: number[] = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            out.push(a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]);
        }
    }
    return out;
}

/**
 * Plane to device pixels.
 * @param plane - The plane.
 * @param u - Plane u.
 * @param v - Plane v.
 * @returns x, y in pixels (y down).
 */
export function toScreen(plane: Plane, u: number, v: number): [number, number] {
    const { m } = plane;
    const w = m[6] * u + m[7] * v + m[8];
    return [(m[0] * u + m[1] * v + m[2]) / w, (m[3] * u + m[4] * v + m[5]) / w];
}

/**
 * Device pixels to the plane.
 * @param plane - The plane.
 * @param x - Pixels right.
 * @param y - Pixels down.
 * @returns u, v.
 */
export function toPlane(plane: Plane, x: number, y: number): [number, number] {
    const m = plane.inverse;
    const w = m[6] * x + m[7] * y + m[8];
    return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

/**
 * The fewest and the most pixels one plane unit spans at the plane's origin (the local map's singular values).
 * @param plane - The plane.
 * @returns min and max pixels per unit.
 */
export function pixelsPerUnit(plane: Plane): { min: number; max: number } {
    const e = 1e-3;
    const [x0, y0] = toScreen(plane, 0, 0);
    const [xu, yu] = toScreen(plane, e, 0);
    const [xv, yv] = toScreen(plane, 0, e);
    const a = (xu - x0) / e;
    const c = (yu - y0) / e;
    const b = (xv - x0) / e;
    const d = (yv - y0) / e;
    const s1 = a * a + b * b + c * c + d * d;
    const det = Math.abs(a * d - b * c);
    const root = Math.sqrt(Math.max(0, s1 * s1 - 4 * det * det));
    return { min: Math.sqrt((s1 - root) / 2), max: Math.sqrt((s1 + root) / 2) };
}

/**
 * The part drawn at a plane point.
 * @param classes - The classified frame.
 * @param plane - The plane.
 * @param u - Plane u.
 * @param v - Plane v.
 * @returns The part index, or -1 off the frame.
 */
export function partAt(classes: Classes, plane: Plane, u: number, v: number): number {
    const [x, y] = toScreen(plane, u, v);
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= classes.width || py >= classes.height) {
        return -1;
    }
    return classes.parts[py * classes.width + px];
}

/** A stretch of one part along a ray, in plane units from the node's center. */
export interface Run {
    part: number;
    from: number;
    to: number;
}

/**
 * The index of the last item that passes a test (Array.prototype.findLastIndex, ES2023).
 * @param list - The items.
 * @param test - The test.
 * @returns The index, or -1.
 */
function lastIndex<T>(list: readonly T[], test: (item: T, index: number) => boolean): number {
    for (let i = list.length - 1; i >= 0; i--) {
        if (test(list[i], i)) {
            return i;
        }
    }
    return -1;
}

/**
 * The last item that passes a test.
 * @param list - The items.
 * @param test - The test.
 * @returns The item, or undefined.
 */
function lastOf<T>(list: readonly T[], test: (item: T) => boolean): T | undefined {
    const i = lastIndex(list, test);
    return i < 0 ? undefined : list[i];
}

/** How far a corner's mitre reaches past it, at most, as a multiple of the offset (shapeOutlines.ts MITRE_LIMIT). */
export const MITRE_LIMIT = 3;

/** How far apart runsAlong's samples are, in device pixels. */
export const RAY_STEP_PX = 0.3;

/**
 * The narrowest band, in device pixels across, every ray through it reads. A pixel lies wholly inside a band when
 * the band holds its extent along the band's normal (|nx| + |ny|, at most one diagonal, SQRT2); a sample is in such a
 * pixel when it is at least a diagonal from both edges, a strip W - 2 SQRT2 wide; a ray crossing the band has a sample
 * there when that strip is wider than a sample step. Narrower, every pixel on a ray may be a blend and read as none.
 */
export const SEEN_BAND_PX = 2 * Math.SQRT2 + RAY_STEP_PX;

/** How many rays a node is measured along. */
export const RAYS = 32;

/**
 * The runs of parts along a ray from the plane's origin.
 * @param classes - The classified frame.
 * @param plane - The plane.
 * @param angle - The ray's angle in the plane.
 * @param reach - How far to walk, in plane units.
 * @returns The runs, in order.
 */
export function runsAlong(classes: Classes, plane: Plane, angle: number, reach: number): Run[] {
    const step = RAY_STEP_PX / pixelsPerUnit(plane).max;
    const [cu, cv] = [Math.cos(angle), Math.sin(angle)];
    const runs: Run[] = [];
    for (let r = 0; r <= reach; r += step) {
        const part = partAt(classes, plane, r * cu, r * cv);
        const last = runs.at(-1);
        if (last?.part === part) {
            last.to = r;
        } else {
            runs.push({ part, from: r, to: r });
        }
    }
    return runs;
}

/** Plane points of a mask's edge pixels, for distances to the mask. */
export interface Edge2 {
    u: Float64Array;
    v: Float64Array;
}

/**
 * The plane positions of the edge pixels of a set of parts (pixels of the set with a neighbor outside
 * it), taken at the boundary between the two pixels, within a window round the node.
 * @param classes - The classified frame.
 * @param plane - The plane.
 * @param inSet - Which part indices are in the mask.
 * @param window - The window in pixels: x0, y0, x1, y1.
 * @returns The edge points.
 */
export function maskEdge(
    classes: Classes,
    plane: Plane,
    inSet: (part: number) => boolean,
    window: readonly number[],
): Edge2 {
    const us: number[] = [];
    const vs: number[] = [];
    const { parts, width, height } = classes;
    const at = (x: number, y: number): boolean =>
        x >= 0 && y >= 0 && x < width && y < height && inSet(parts[y * width + x]);
    const [x0, y0, x1, y1] = window.map((n) => Math.round(n));
    for (let y = Math.max(0, y0); y <= Math.min(height - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(width - 1, x1); x++) {
            if (!at(x, y)) {
                continue;
            }
            for (const [dx, dy] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]) {
                // a pixel another node covers is unknown, not outside the mask: no edge against it
                const [nx, ny] = [x + dx, y + dy];
                const other = nx >= 0 && ny >= 0 && nx < width && ny < height && parts[ny * width + nx] === OTHER_NODE;
                if (!at(nx, ny) && !other) {
                    const [u, v] = toPlane(plane, x + 0.5 + dx / 2, y + 0.5 + dy / 2);
                    us.push(u);
                    vs.push(v);
                }
            }
        }
    }
    return { u: Float64Array.from(us), v: Float64Array.from(vs) };
}

/**
 * The distance from a plane point to a mask's edge.
 * @param edge - The mask's edge points.
 * @param u - Plane u.
 * @param v - Plane v.
 * @returns The distance in plane units, Infinity for an empty mask.
 */
export function distanceTo(edge: Edge2, u: number, v: number): number {
    const i = nearestOn(edge, u, v);
    return i < 0 ? Infinity : Math.hypot(edge.u[i] - u, edge.v[i] - v);
}

/**
 * The mask edge point nearest a plane point.
 * @param edge - The mask's edge points.
 * @param u - Plane u.
 * @param v - Plane v.
 * @returns Its index, -1 for an empty mask.
 */
function nearestOn(edge: Edge2, u: number, v: number): number {
    let best = Infinity;
    let at = -1;
    for (let i = 0; i < edge.u.length; i++) {
        const d = (edge.u[i] - u) ** 2 + (edge.v[i] - v) ** 2;
        if (d < best) {
            best = d;
            at = i;
        }
    }
    return at;
}

/**
 * Whether a point past an outline lies in one of its corners' wedges, where a mitred band reaches past its width:
 * its nearest outline point is a corner when sliding the point `step` either way across its line to that point
 * moves the nearest point less than `step` (along a side it moves `step` each way).
 * @param edge - The outline's edge points.
 * @param u - Plane u.
 * @param v - Plane v.
 * @param step - How far to slide, in plane units.
 * @returns True in a corner's wedge.
 */
export function pastCorner(edge: Edge2, u: number, v: number, step: number): boolean {
    const i = nearestOn(edge, u, v);
    const length = i < 0 ? 0 : Math.hypot(u - edge.u[i], v - edge.v[i]);
    if (length === 0) {
        return false;
    }
    const [tu, tv] = [(-(v - edge.v[i]) / length) * step, ((u - edge.u[i]) / length) * step];
    const a = nearestOn(edge, u + tu, v + tv);
    const b = nearestOn(edge, u - tu, v - tv);
    return Math.hypot(edge.u[a] - edge.u[b], edge.v[a] - edge.v[b]) < step;
}

// ---------------------------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------------------------

/**
 * The parts that may cross a node from elsewhere: an edge, a label, another node. A ray is read only up to them.
 */
const FOREIGN = new Set([...["edge", "label"].map((p) => partIndex(p as Part)), OTHER_NODE]);

/**
 * The longest blended seam (in pixels along the ray) that joins two runs of one part: a ray crossing a one-pixel
 * seam at a slant, as at a concave corner, walks more than one pixel of it.
 */
export const SEAM_PX = 3;

/**
 * A ray's runs made fit to read: a short fragment between two runs of one part joins them, and the ray ends
 * before the first run of an edge or a label crossing it (and the run that crossing cut short is dropped). A
 * fragment is a blended seam under {@link SEAM_PX} pixels, or a stretch of another part under {@link EDGE_PX}
 * pixels: where a ray grazes an outline it meets the stair-stepped pixels of the part beyond for a sample, then
 * the part it was in again, and read as it stands the ring past them would start at that sample. Several
 * fragments in a row (blended, the part beyond, blended: an anti-aliased edge crossed at a shallow angle) join
 * the same way while together they span under {@link SEAM_PX} pixels.
 * @param runs - The runs.
 * @param pxPerUnit - Pixels per plane unit.
 * @returns The runs to read.
 */
export function tidy(runs: readonly Run[], pxPerUnit: number): Run[] {
    const MIXED = partIndex("mixed");
    const out: Run[] = [];
    for (const run of runs) {
        if (FOREIGN.has(run.part)) {
            // the blended pixels where the crossing begins are not the run it cut short: that is the one before them
            while (out.length > 0 && out[out.length - 1].part === MIXED) {
                out.pop();
            }
            if (out.length > 0 && out[out.length - 1].part !== partIndex("bg")) {
                out.pop();
            }
            return out;
        }
        out.push({ ...run });
        const short = (r: Run): boolean => (r.to - r.from) * pxPerUnit < (r.part === MIXED ? SEAM_PX : EDGE_PX);
        for (;;) {
            const after = out[out.length - 1];
            // walk back over the fragments to the last run of the part the ray is in again
            let k = out.length - 2;
            while (k >= 0 && out[k].part !== after.part && short(out[k])) {
                k--;
            }
            const span = k >= 0 ? (out[out.length - 2].to - out[k + 1].from) * pxPerUnit : Infinity;
            if (k < 0 || k === out.length - 2 || out[k].part !== after.part || span >= SEAM_PX) {
                break;
            }
            out[k].to = after.to;
            out.splice(k + 1);
        }
    }
    return out;
}

/**
 * Whether a point lies inside a convex polygon (or on it).
 * @param hull - The polygon, in order.
 * @param p - The point.
 * @returns True inside.
 */
export function insideConvex(hull: readonly P2[], p: P2): boolean {
    let sign = 0;
    for (let i = 0; i < hull.length; i++) {
        const [x0, y0] = hull[i];
        const [x1, y1] = hull[(i + 1) % hull.length];
        const cross = (x1 - x0) * (p[1] - y0) - (y1 - y0) * (p[0] - x0);
        if (cross !== 0) {
            if (sign !== 0 && Math.sign(cross) !== sign) {
                return false;
            }
            sign = Math.sign(cross);
        }
    }
    return true;
}

/**
 * The plain frame with the fill an edge or a label covers in it put back where the full frame shows the fill. With no
 * ring to stop at, an edge in the plain frame can reach over the fill and across its outline (a tilted flat star's,
 * pw-085), and the outline it covered was missing: the ring read wider than it is past the outline either side.
 * @param plain - The classified plain frame.
 * @param full - The classified full frame.
 * @returns The plain frame, fill where it was covered and the full frame shows fill.
 */
export function fillUnderCrossings(plain: Classes, full: Classes): Classes {
    const FILL = partIndex("fill");
    const parts = Int8Array.from(plain.parts);
    parts.forEach((part, i) => {
        if (FOREIGN.has(part) && full.parts[i] === FILL) {
            parts[i] = FILL;
        }
    });
    return { ...plain, parts };
}

/**
 * A frame with every pixel another node's meshes cover marked {@link OTHER_NODE}: inside the convex hull of their
 * projected vertices, or within one pixel of it (a blended pixel at its edge).
 * @param classes - The classified frame.
 * @param others - The other nodes' hulls, in device pixels.
 * @returns The frame, a copy when anything was marked.
 */
export function withoutOthers(classes: Classes, others: readonly (readonly P2[])[]): Classes {
    const live = others.filter((h) => h.length >= 3);
    if (live.length === 0) {
        return classes;
    }
    const { width, height } = classes;
    const parts = Int8Array.from(classes.parts);
    for (const hull of live) {
        const xs = hull.map((p) => p[0]);
        const ys = hull.map((p) => p[1]);
        const [x0, x1] = [
            Math.max(0, Math.floor(Math.min(...xs) - 1)),
            Math.min(width - 1, Math.ceil(Math.max(...xs) + 1)),
        ];
        const [y0, y1] = [
            Math.max(0, Math.floor(Math.min(...ys) - 1)),
            Math.min(height - 1, Math.ceil(Math.max(...ys) + 1)),
        ];
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const p: P2 = [x + 0.5, y + 0.5];
                if (insideConvex(hull, p) || distanceToPolygon(hull, p) <= 1) {
                    parts[y * width + x] = OTHER_NODE;
                }
            }
        }
    }
    return { parts, width, height };
}

/**
 * A database node's frame with the rim it draws across its face (nodeDecoration.ts databaseRim, in the border's
 * color by design) taken as fill: a border or blended pixel that is fill in the plain frame and lies deeper inside
 * the plain outline than the ring can reach (the border's inset, and one band edge) is face, not ring. At far zoom
 * the fill between the rim and the ring is a strip of blended pixels, so the rim cannot be told from the ring by
 * the runs along a ray alone.
 * @param full - The classified full frame.
 * @param plain - The classified plain frame.
 * @param plane - The node's plane.
 * @param window - The node's window in pixels.
 * @param signed - The signed distance from the plain outline at a plane point (negative inside).
 * @param depth - How deep inside the outline the ring may reach.
 * @returns The frame with the rim as fill.
 */
export function withoutRim(
    full: Classes,
    plain: Classes,
    plane: Plane,
    window: readonly number[],
    signed: (u: number, v: number) => number,
    depth: number,
): Classes {
    const [FILL, BORDER, MIXED] = (["fill", "border", "mixed"] as const).map(partIndex);
    const parts = Int8Array.from(full.parts);
    const [x0, y0, x1, y1] = window.map((n) => Math.round(n));
    for (let y = Math.max(0, y0); y <= Math.min(full.height - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(full.width - 1, x1); x++) {
            const at = y * full.width + x;
            if ((parts[at] !== BORDER && parts[at] !== MIXED) || plain.parts[at] !== FILL) {
                continue;
            }
            const [u, v] = toPlane(plane, x + 0.5, y + 0.5);
            if (signed(u, v) < -depth) {
                parts[at] = FILL;
            }
        }
    }
    return { parts, width: full.width, height: full.height };
}

/**
 * The plane moved to the centroid of the fill when the fill does not cover the plane's origin.
 * @param plain - The plain frame.
 * @param plane - The plane.
 * @param window - The node's window in pixels.
 * @returns The plane, or a copy whose origin is the fill's centroid.
 */
function centeredOnFill(plain: Classes, plane: Plane, window: readonly number[]): Plane {
    const FILL = partIndex("fill");
    if (partAt(plain, plane, 0, 0) === FILL) {
        return plane;
    }
    let [su, sv, n] = [0, 0, 0];
    const [x0, y0, x1, y1] = window.map((v) => Math.round(v));
    for (let y = Math.max(0, y0); y <= Math.min(plain.height - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(plain.width - 1, x1); x++) {
            if (plain.parts[y * plain.width + x] === FILL) {
                const [u, v] = toPlane(plane, x + 0.5, y + 0.5);
                su += u;
                sv += v;
                n++;
            }
        }
    }
    if (n === 0) {
        return plane;
    }
    return movedTo(plane, su / n, sv / n);
}

/**
 * A plane with its origin moved to one of its points.
 * @param plane - The plane.
 * @param u - The new origin's u.
 * @param v - The new origin's v.
 * @returns The moved plane.
 */
export function movedTo(plane: Plane, u: number, v: number): Plane {
    const m = multiply3(plane.m, [1, 0, u, 0, 1, v, 0, 0, 1]);
    return { m, inverse: invert3(m) };
}

/** One measured invariant. */
export interface Check {
    name: string;
    /** What the setting promises, in a sentence. */
    promise: string;
    measured: number;
    expected: number;
    tolerance: number;
    pass: boolean;
    /** Per-ray numbers, when the check reads rays. */
    rays?: number[];
    /** Nothing could be read (every ray hidden, or none reached the part): not a pass, not a failure. */
    unread?: boolean;
}

/** Everything one node was measured to have. */
export interface NodeFrames {
    /** The full frame, every part drawn. */
    full: Classes;
    /** The node with only its fill: the silhouette every offset is measured from. */
    plain: Classes;
    /** The node's measuring plane in the full frame (the same camera draws both frames). */
    plane: Plane;
    /** How far out to look, in plane units. */
    reach: number;
    /** Device pixels per CSS pixel. */
    dpr: number;
    /**
     * World units per size unit beyond PER_SIZE: the node's size times its view scale under "pivot" and
     * "screen" (its fill mesh's reach over its reach under "scene"), so every length scales with it.
     */
    sizeFactor: number;
    /** The view mode: in 2D nothing may cross a node, so an edge must stop at its border. */
    view: string;
    /** Whether "bottom" is the screen's bottom (an unturned view), so the label can be judged. */
    labelReadable?: boolean;
    /**
     * How much the element stretches this node's halo along the plane's u and v axes for a `haloScale` and a border
     * reaching `border` plane units (Node.ts: haloAxisScale with borderReach). Unset, the halo is the node scaled
     * `haloScale` about its center.
     */
    haloGrow?: (scale: number, border: number) => [number, number];
    /**
     * The hull, in plane units, of where the element's halo should be for a `haloScale` and a border reaching
     * `border` plane units: the node's own vertices stretched as haloAxisScale stretches them and projected as the
     * camera projects them, so perspective and an oblique view of a stretched solid are in it exactly. Empty (or
     * unset) where a hull would bridge the shape's hollows; then {@link NodeFrames.haloGrow}'s model is used.
     */
    haloHull?: (scale: number, border: number) => P2[];
    /**
     * The other nodes' drawn extents (every mesh they hold), as convex hulls in device pixels. The classifier cannot
     * tell two nodes' parts apart, so a ray is read only up to where it enters one (like an edge crossing it).
     */
    others?: readonly (readonly P2[])[];
    /**
     * The plane a flat node's shadow lies in: parallel to the slab, at the shadow's depth behind it, its origin at
     * plane point (u, v) of the node's plane. Seen off the slab's normal the shadow is displaced on screen by its
     * depth (parallax), so it is walked in its own plane. Unset, it is the node's plane moved to (u, v).
     */
    shadowPlaneAt?: (u: number, v: number) => Plane;
    /**
     * The sharpest corner of the drawn fill's outline, in radians (pi for a round shape, NaN when it cannot be
     * known, a concave shape's hull hiding its corners). A border drawn in from the outline pulls the fill's tip in
     * by the inset over sin(corner / 2).
     */
    sharpestCorner?: number;
}

/** The fewest rays a median is taken over: fewer, a plate's or ring's few mitred tips would be its reading. */
export const MIN_RAYS = 8;

/**
 * The median of the readable rays, unread when too few were.
 * @param list - Per-ray numbers.
 * @returns The median, NaN under {@link MIN_RAYS}.
 */
function readMedian(list: readonly number[]): number {
    return list.length < MIN_RAYS ? Number.NaN : quantile(list, 0.5);
}

/** How many device pixels a band's edge may be off: one blended pixel each side and half a sample. */
export const EDGE_PX = 1.5;

/** Relative slack on a width: a screen-pixel border is rebuilt each 1/16 doubling of zoom (4.4%). */
export const WIDTH_SLACK = 0.05;

/**
 * The value at a quantile of a list.
 * @param list - Numbers.
 * @param q - 0 to 1.
 * @returns The value, NaN for an empty list.
 */
export function quantile(list: readonly number[], q: number): number {
    if (list.length === 0) {
        return Number.NaN;
    }
    const sorted = [...list].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
}

/**
 * The largest number in a list.
 * @param list - Numbers.
 * @returns It, NaN (unread) for an empty list.
 */
function most(list: readonly number[]): number {
    return list.length === 0 ? Number.NaN : Math.max(...list);
}

/**
 * The smallest number in a list.
 * @param list - Numbers.
 * @returns It, NaN (unread) for an empty list.
 */
function least(list: readonly number[]): number {
    return list.length === 0 ? Number.NaN : Math.min(...list);
}

/**
 * Build a check.
 * @param name - Its name.
 * @param promise - What the setting promises.
 * @param measured - The measured value.
 * @param expected - The expected value.
 * @param tolerance - How far off it may be.
 * @param rays - Per-ray numbers.
 * @returns The check; a NaN measurement is unread, an infinite one fails.
 */
function check(
    name: string,
    promise: string,
    measured: number,
    expected: number,
    tolerance: number,
    rays?: number[],
): Check {
    if (Number.isNaN(measured)) {
        return { name, promise, measured, expected, tolerance, pass: true, unread: true };
    }
    const pass = Number.isFinite(measured) && Math.abs(measured - expected) <= tolerance;
    return { name, promise, measured, expected, tolerance, pass, ...(rays ? { rays } : {}) };
}

/**
 * Build an upper-bound check: measured at most `limit`.
 * @param name - Its name.
 * @param promise - What the setting promises.
 * @param measured - The measured value.
 * @param limit - The most allowed.
 * @param rays - Per-ray numbers.
 * @returns The check.
 */
function atMost(name: string, promise: string, measured: number, limit: number, rays?: number[]): Check {
    if (Number.isNaN(measured)) {
        return { name, promise, measured, expected: limit, tolerance: 0, pass: true, unread: true };
    }
    const pass = Number.isFinite(measured) && measured <= limit;
    return { name, promise, measured, expected: limit, tolerance: 0, pass, ...(rays ? { rays } : {}) };
}

/** Expected numbers a test may override to prove a check fails when the drawing is wrong. */
export interface Expectations {
    borderWidth?: number;
    borderOffset?: number;
    centerShift?: [number, number];
    shadowOffset?: [number, number];
    haloScale?: number;
    platePadding?: number;
    outerStart?: number;
}

/**
 * Where a border's outer edge lies past the fill's outline, as a fraction of its width.
 * @param border - The border setting.
 * @returns 1 outside, 0.5 center, 0 inside.
 */
function outerEdgeFraction(border: string): number {
    if (border === "center") {
        return 0.5;
    }
    return border === "inside" ? 0 : 1;
}

/**
 * Measure one node against everything its settings promise.
 * @param settings - The case's settings.
 * @param frames - Its frames and plane.
 * @param override - Expected values to use instead of the promised ones (for proving a check can fail).
 * @returns The checks, and per-node numbers worth keeping.
 */
export function measureNode(
    settings: Settings,
    frames: NodeFrames,
    override: Expectations = {},
): { checks: Check[]; numbers: Record<string, number> } {
    const { reach, dpr, sizeFactor } = frames;
    const checks: Check[] = [];
    const ppu = pixelsPerUnit(frames.plane);
    const numbers: Record<string, number> = { pxPerUnitMin: ppu.min, pxPerUnitMax: ppu.max, sizeFactor };
    const [cx, cy] = toScreen(frames.plane, 0, 0);
    const span = reach * ppu.max;
    const window = [cx - span, cy - span, cx + span, cy + span];
    const FILL = partIndex("fill");
    const MIXED = partIndex("mixed");
    const BG = partIndex("bg");
    // what another node covers is not this node's: both frames are read only up to it
    const others = frames.others ?? [];
    let full = withoutOthers(frames.full, others);
    const plain = fillUnderCrossings(withoutOthers(frames.plain, others), full);
    // A shape whose center is not filled (man, woman) is measured from its fill's centroid instead.
    const plane = centeredOnFill(plain, frames.plane, window);
    const shifted = plane !== frames.plane;
    numbers.originShifted = shifted ? 1 : 0;
    const plainEdge = maskEdge(plain, plane, (p) => p === FILL, window);
    const signed = (u: number, v: number): number =>
        partAt(plain, plane, u, v) === FILL ? -distanceTo(plainEdge, u, v) : distanceTo(plainEdge, u, v);
    // a band's edge may be EDGE_PX device pixels off in the plane's thinnest direction
    const edgeTol = EDGE_PX / ppu.min;
    const s = settings;
    let borderWorld = s.border === "none" ? 0 : AMOUNTS.borderWidth * PER_SIZE * sizeFactor;
    if (s.border === "screen") {
        // the element builds a screen-pixel ring at the face-on scale (Node.roundedPixelsPerUnit, scaledBorder): the
        // most pixels a plane unit spans, so a tilted slab's ring is that wide in its own plane
        borderWorld = (AMOUNTS.borderScreenWidth * dpr) / ppu.max;
    }
    const expectedWidth = override.borderWidth ?? borderWorld;
    const fraction = s.border === "none" ? 0 : outerEdgeFraction(s.border);
    const borderEdge = override.borderOffset ?? borderWorld * fraction;
    if (s.shape === "database" && s.border !== "none") {
        // the ring reaches (1 - fraction) widths inside the outline, and its edge one band edge more
        full = withoutRim(full, plain, plane, window, signed, borderWorld * (1 - fraction) + edgeTol);
    }
    const fullFillEdge = maskEdge(full, plane, (p) => p === FILL, window);
    const angles = Array.from({ length: RAYS }, (_, i) => (i / RAYS) * Math.PI * 2);
    const rawPlain = angles.map((a) => runsAlong(plain, plane, a, reach));
    const plainRuns = rawPlain.map((runs) => tidy(runs, ppu.max));
    const rawRuns = angles.map((a) => runsAlong(full, plane, a, reach));
    // a ray an edge or a label crosses is read only up to it (tidy), so what lies past that is unread, not missing
    const crossed = rawRuns.map((runs) => runs.some((r) => FOREIGN.has(r.part)));
    const fullRuns = rawRuns.map((runs) => tidy(runs, ppu.max));
    const plainExit = plainRuns.map((runs) => (runs[0]?.part === FILL && runs.length > 1 ? runs[0].to : Number.NaN));
    numbers.plainRadiusMedian = quantile(plainExit, 0.5);
    numbers.plainRadiusPx = numbers.plainRadiusMedian * ppu.max;
    // a ray whose fill an edge or a label cuts short (a node a few pixels across) is unread, not bare
    const fillRead = plainExit.filter((r, i) => Number.isFinite(r) || !rawPlain[i].some((x) => FOREIGN.has(x.part)));
    checks.push(
        check(
            "fill-drawn",
            "the node's fill is drawn at its center",
            fillRead.length === 0
                ? Number.NaN
                : fillRead.filter((r) => Number.isFinite(r) && r > 0).length / fillRead.length,
            1,
            0.5,
        ),
    );
    const widthTol = edgeTol * 2 + expectedWidth * WIDTH_SLACK;
    numbers.borderWorld = borderWorld;
    const BORDER = partIndex("border");
    const hidden = s.plate === "overlay";
    /**
     * Whether a ray's raw runs hold any sample of a part between the fill and the first background or crossing: a
     * band a pixel or two across is blended on both sides, and tidy folds its one pure pixel into the blend.
     */
    const rawHas = (i: number, part: number): boolean => {
        const runs = rawRuns[i];
        const start = runs.findIndex((r) => r.part !== FILL);
        for (let k = Math.max(0, start); k < runs.length; k++) {
            if (runs[k].part === part) {
                return true;
            }
            if (runs[k].part === BG || FOREIGN.has(runs[k].part)) {
                return false;
            }
        }
        return false;
    };
    // a band narrower than SEEN_BAND_PX across in the plane's thinnest direction (a flat slab seen near edge-on) may
    // hold no pure pixel on a ray, so nothing about it is read there
    numbers.borderAcrossPx = borderWorld * ppu.min;

    if (s.border !== "none" && !hidden && borderWorld * ppu.min >= SEEN_BAND_PX) {
        const gaps: number[] = [];
        const thick: number[] = [];
        const offs: number[] = [];
        const offAngles: number[] = [];
        const corner: boolean[] = [];
        let shiftU = 0;
        let shiftV = 0;
        let shiftCount = 0;
        let bare = 0;
        let seenOnly = 0;
        const dashed = s.border === "dashed";
        fullRuns.forEach((runs, i) => {
            const fillEnd = runs[0]?.part === FILL ? runs[0].to : Number.NaN;
            if (!Number.isFinite(fillEnd)) {
                return;
            }
            // what the ray meets first past the fill: the ring, background (no ring here), or another part over it
            const next = runs.find((r, k) => k > 0 && r.part !== MIXED);
            if (next !== undefined && next.part !== BORDER && next.part !== BG) {
                return;
            }
            const ring = runs.findIndex((r, k) => k > 0 && r.part === BORDER);
            if (ring < 0 && crossed[i]) {
                // the crossing tidy ends the ray at took the ring with it (an edge stops at the ring's outer edge)
                return;
            }
            if (ring < 0 || (dashed && next?.part === BG)) {
                if (ring < 0 && rawHas(i, BORDER)) {
                    seenOnly++;
                    return;
                }
                bare++;
                return;
            }
            // past this band the ray goes back into fill: it is a gap between two lobes the border fills (narrower
            // than two widths), not the ring, and its width is the gap's
            const after = runs.slice(ring + 1).find((r) => r.part !== MIXED);
            if (after?.part === FILL) {
                return;
            }
            // background between the ring and the fill it starts from (a hole the ray crossed before is not a gap)
            const from = lastIndex(runs, (r, k) => k < ring && r.part === FILL);
            const between = runs.slice(from + 1, ring).filter((r) => r.part === BG);
            gaps.push(between.reduce((sum, r) => sum + (r.to - r.from), 0) * ppu.max);
            // a lobe of fill the ray only grazes (its tip, all blended pixels) or a stair step of an edge crossed at a
            // shallow angle splits the ring into runs with blends between them: its outer edge ends the last of them
            let outer = ring;
            for (let k = ring + 1; k < runs.length && (runs[k].part === MIXED || runs[k].part === BORDER); k++) {
                outer = runs[k].part === BORDER ? k : outer;
            }
            const out = runs[outer].to;
            const [u, v] = [out * Math.cos(angles[i]), out * Math.sin(angles[i])];
            thick.push(distanceTo(fullFillEdge, u, v));
            offs.push(signed(u, v));
            offAngles.push(angles[i]);
            corner.push(pastCorner(plainEdge, u, v, expectedWidth / 2));
        });
        // A mitred corner reaches past the band by design (up to MITRE_LIMIT widths), and on a shape with many
        // corners those rays can be most of them, so the ring's position is read on the rays that leave it through
        // a side, where it is its width thick; with none of those (a ring wrongly thick everywhere), on all.
        const side = offs.filter((_, j) => thick[j] <= expectedWidth + widthTol);
        const offMedian = quantile(side.length > 0 ? side : offs, 0.5);
        offs.forEach((o, j) => {
            // corners need not face each other across the node (a dash gap can take one), so a ray past one of the
            // outline's corners, or thicker than the band, is left out of the centroid: on a tilted plane the width's
            // tolerance is loose enough to let a mitre in
            if (corner[j] || thick[j] > expectedWidth + widthTol) {
                return;
            }
            if (Math.abs(o - offMedian) <= Math.max(edgeTol, expectedWidth * 0.5)) {
                shiftU += (o - offMedian) * Math.cos(offAngles[j]);
                shiftV += (o - offMedian) * Math.sin(offAngles[j]);
                shiftCount++;
            }
        });
        if (override.centerShift) {
            shiftU += override.centerShift[0] * (shiftCount / 2);
            shiftV += override.centerShift[1] * (shiftCount / 2);
        }
        const drawn = thick.length + seenOnly;
        checks.push(
            check(
                "border-drawn",
                "a border wider than 0 is drawn round the node (of the rays nothing else covers)",
                drawn + bare === 0 ? Number.NaN : drawn / (drawn + bare),
                dashed ? 0.6 : 1,
                dashed ? 0.4 : 0.1,
            ),
        );
        checks.push(
            atMost(
                "border-touches-fill",
                "the border's inner edge lies on the fill, no background between them",
                most(gaps),
                EDGE_PX,
                gaps,
            ),
        );
        if (dashed) {
            // a dash's square end crosses a ray at a slant, so a dashed ring has no thinnest to read: its median is
            checks.push(
                check(
                    "border-width-median",
                    "the border is borderWidth size units (or borderScreenWidth pixels) wide",
                    quantile(thick, 0.5),
                    expectedWidth,
                    widthTol,
                    thick,
                ),
            );
        } else {
            // A band of even width with mitred corners is exactly its width thick wherever a ray leaves it through
            // a side, and thicker (up to MITRE_LIMIT widths) through a corner, so its width is its thinnest reading.
            checks.push(
                check(
                    "border-width-thinnest",
                    "the border is borderWidth size units (or borderScreenWidth pixels) wide at its thinnest",
                    least(thick),
                    expectedWidth,
                    widthTol,
                    thick,
                ),
            );
        }
        // The outer part of the ring (fraction of the width past the outline) is mitred to at most MITRE_LIMIT times
        // its reach. The inner part is the outline moved in by the inset side by side (insetOutline), so the fill's
        // tip at a corner of angle t retreats inset / sin(t / 2) from the outline's: the thickest a ray can read is
        // the two added (triangle inequality).
        const inset = expectedWidth * (1 - fraction);
        const sharpest = frames.sharpestCorner ?? Math.PI;
        const thickest = MITRE_LIMIT * expectedWidth * fraction + (inset > 0 ? inset / Math.sin(sharpest / 2) : 0);
        checks.push(
            atMost(
                "border-width-thickest",
                "a mitred corner reaches no more than 3 widths past the outline, and an inset fill's tip retreats no " +
                    "more than the inset over sin(half its angle)",
                most(thick) - thickest,
                widthTol,
            ),
        );
        checks.push(
            check(
                "border-position",
                "borderPosition puts the ring's outer edge width, width/2 or 0 past the fill's own outline",
                offMedian,
                borderEdge,
                widthTol,
                offs,
            ),
        );
        // the centroid's shift, in device pixels through the plane's own map (a tilted slab spans fewer pixels a
        // unit along its foreshortened axis than across it)
        const [su, sv] =
            shiftCount === 0 ? [Number.NaN, Number.NaN] : [(2 * shiftU) / shiftCount, (2 * shiftV) / shiftCount];
        const [x0, y0] = toScreen(plane, 0, 0);
        const [x1, y1] = toScreen(plane, su, sv);
        checks.push(
            atMost(
                "border-concentric",
                "the ring is centered on the fill (its offset from the outline is the same on opposite sides)",
                Math.hypot(x1 - x0, y1 - y0),
                1,
            ),
        );
        numbers.borderMedianPx = quantile(thick, 0.5) * ppu.max;
    }

    const outerWidth = AMOUNTS.outerWidth * PER_SIZE * sizeFactor;
    numbers.outerAcrossPx = outerWidth * ppu.min;
    // an outer ring narrower than SEEN_BAND_PX across (under sizeSpace screen, or a slab seen near edge-on) may hold
    // no pure pixel on a ray: not read
    if (s.outer !== "none" && !hidden && outerWidth * ppu.min >= SEEN_BAND_PX) {
        const OUTER = partIndex("outer");
        const starts: number[] = [];
        const widths: number[] = [];
        const cornered: boolean[] = [];
        const gaps: number[] = [];
        let unseen = 0;
        let seenOnly = 0;
        fullRuns.forEach((runs, i) => {
            const k = runs.findIndex((r) => r.part === OUTER);
            if (k < 0) {
                // blended on both sides and folded by tidy, it is still drawn (its raw runs hold it)
                if (rawHas(i, OUTER)) {
                    seenOnly++;
                    return;
                }
                unseen += crossed[i] ? 1 : 0;
                return;
            }
            const run = runs[k];
            const a = angles[i];
            const inner = signed(run.from * Math.cos(a), run.from * Math.sin(a));
            const outer = signed(run.to * Math.cos(a), run.to * Math.sin(a));
            starts.push(inner);
            widths.push(outer - inner);
            cornered.push(
                pastCorner(plainEdge, run.from * Math.cos(a), run.from * Math.sin(a), Math.max(edgeTol, inner / 2)),
            );
            const b = runs.findIndex((r) => r.part === BORDER);
            if (b >= 0 && b < k) {
                gaps.push(
                    runs
                        .slice(b + 1, k)
                        .filter((r) => r.part === partIndex("bg"))
                        .reduce((sum, r) => sum + (r.to - r.from), 0) * ppu.max,
                );
            }
        });
        const start =
            override.outerStart ?? borderEdge + (s.outer === "gap" ? AMOUNTS.outerGap : 0) * PER_SIZE * sizeFactor;
        // a mitred corner of the border and of the outer ring reaches past them, so (as the border's position is)
        // where the outer ring starts and how wide it is are read on the rays that leave through a side
        const onSides = (list: number[]): number[] => {
            const side = list.filter((_, j) => !cornered[j]);
            return side.length >= MIN_RAYS ? side : list;
        };
        const width = outerWidth;
        checks.push(
            check(
                "outer-drawn",
                "an outer border wider than 0 is drawn round the node (of the rays no edge or label crosses first)",
                RAYS === unseen ? Number.NaN : (starts.length + seenOnly) / (RAYS - unseen),
                1,
                0.1,
            ),
        );
        checks.push(
            check(
                "outer-start",
                "the outer ring starts outerBorderOffset past the border's outer edge",
                readMedian(onSides(starts)),
                start,
                edgeTol * 2 + width * WIDTH_SLACK,
                starts,
            ),
        );
        checks.push(
            check(
                "outer-width",
                "the outer ring is outerBorderWidth border units wide",
                quantile(onSides(widths), 0.5),
                width,
                edgeTol * 2 + width * WIDTH_SLACK,
                widths,
            ),
        );
        if (s.outer === "abut" && s.border !== "none" && s.border !== "dashed") {
            checks.push(
                atMost(
                    "outer-abuts-border",
                    "with offset 0 the outer ring meets the border, no background between",
                    most(gaps),
                    EDGE_PX,
                    gaps,
                ),
            );
        }
    }

    if (s.plate !== "none") {
        const PLATE = partIndex(s.plate === "underlay" ? "underlay" : "overlay");
        const padding =
            override.platePadding ??
            (s.plate === "underlay" ? AMOUNTS.underlayPadding : AMOUNTS.overlayPadding) * PER_SIZE * sizeFactor;
        const ends: number[] = [];
        fullRuns.forEach((runs, i) => {
            const k = lastIndex(runs, (r) => r.part === PLATE);
            const last = runs[k];
            // the plate's end shows only where background follows it; another part there hides it
            const after = runs.slice(k + 1).find((r) => r.part !== partIndex("mixed"));
            if (last !== undefined && (after === undefined || after.part === partIndex("bg"))) {
                const a = angles[i];
                ends.push(signed(last.to * Math.cos(a), last.to * Math.sin(a)));
            }
        });
        // an underlay shows only beyond the node and its border, so only rays where it reaches past them count
        const past = ends.filter((e) => s.plate === "overlay" || e > borderEdge + edgeTol);
        if (past.length > 0) {
            // a plate is the outline's mitred offset: exactly its padding past the outline where a ray leaves it
            // through a side, farther through a corner (most rays, on a small or sharp shape), so its padding is its
            // nearest reading
            checks.push(
                check(
                    `${s.plate}-padding`,
                    `the ${s.plate} is the node's outline grown by its padding`,
                    past.length < MIN_RAYS ? Number.NaN : least(past),
                    padding,
                    edgeTol * 2 + padding * WIDTH_SLACK,
                    ends,
                ),
            );
        }
        const atCenter = partAt(full, plane, 0, 0);
        if (s.plate === "overlay" && !FOREIGN.has(atCenter)) {
            checks.push(
                check(
                    "overlay-on-top",
                    "the overlay is drawn in front of the node: its color wins at the node's center",
                    atCenter === PLATE ? 1 : 0,
                    1,
                    0,
                ),
            );
        } else if (s.plate === "underlay") {
            // underlay pixels inside the fill (by more than an edge) mean it was drawn over the node
            let inside = 0;
            plainRuns.forEach((_, i) => {
                const a = angles[i];
                const exit = plainExit[i];
                if (!Number.isFinite(exit)) {
                    return;
                }
                for (let r = 0; r < exit - edgeTol; r += edgeTol / 2) {
                    if (partAt(full, plane, r * Math.cos(a), r * Math.sin(a)) === PLATE) {
                        inside++;
                        break;
                    }
                }
            });
            checks.push(
                atMost("underlay-behind", "the underlay is drawn behind the node: none of it over the fill", inside, 0),
            );
        }
    }

    // the shadow shows past the node only by its offset: an offset narrower than SEEN_BAND_PX across in the plane's
    // thinnest direction (a slab seen near edge-on) shows no pure shadow pixel to read
    const shadowAcross = AMOUNTS.shadowOffset * PER_SIZE * sizeFactor * Math.SQRT2 * ppu.min;
    numbers.shadowAcrossPx = shadowAcross;
    if (s.shadow === "offset" && !hidden && shadowAcross >= SEEN_BAND_PX) {
        const SHADOW = partIndex("shadow");
        const [ou, ov] = override.shadowOffset ?? [
            AMOUNTS.shadowOffset * PER_SIZE * sizeFactor,
            -AMOUNTS.shadowOffset * PER_SIZE * sizeFactor,
        ];
        const direction = Math.atan2(ov, ou);
        // the shadow's own plane, its origin where the offset puts the shadow's center (the measuring origin, which
        // may be the fill's centroid, moved by the offset)
        const [ox, oy] = toScreen(plane, 0, 0);
        const [su, sv] = toPlane(frames.plane, ox, oy);
        const shadowPlane = frames.shadowPlaneAt?.(su + ou, sv + ov) ?? movedTo(plane, ou, ov);
        const misses: number[] = [];
        angles.forEach((a, i) => {
            const turn = Math.abs(Math.atan2(Math.sin(a - direction), Math.cos(a - direction)));
            if (turn > Math.PI / 3 || !Number.isFinite(plainExit[i])) {
                return;
            }
            // the shadow's edge along this direction, walked from its own center
            const expected = plainExit[i];
            let last = Number.NaN;
            const step = 0.3 / ppu.max;
            for (let r = 0; r <= reach; r += step) {
                if (partAt(full, shadowPlane, r * Math.cos(a), r * Math.sin(a)) === SHADOW) {
                    last = r;
                }
            }
            // where the shadow's edge should be, another part drawn in front of it (or the blended seam between two
            // rings over it) hides it: no reading
            const before = expected - edgeTol;
            const there = partAt(full, shadowPlane, before * Math.cos(a), before * Math.sin(a));
            if (there !== SHADOW && there !== partIndex("bg")) {
                return;
            }
            misses.push(Number.isFinite(last) ? Math.abs(last - expected) * ppu.max : Infinity);
        });
        numbers.shadowRays = misses.length;
        // every ray hidden by a part drawn in front of the shadow: nothing to read, so no check
        if (misses.length > 0) {
            checks.push(
                atMost(
                    "shadow-offset",
                    "the shadow is the node's outline moved shadowOffsetX right and shadowOffsetY down",
                    most(misses),
                    EDGE_PX * 2,
                    misses,
                ),
            );
        }
    }

    // a halo is scaled about the node's center, so it cannot be read from a shifted origin
    if (s.effect === "halo" && !hidden && !shifted) {
        const HALO = partIndex("halo");
        const scale = override.haloScale ?? AMOUNTS.haloScale;
        const [gu, gv] = frames.haloGrow?.(scale, borderWorld) ?? [scale, scale];
        const haloHull = frames.haloHull?.(scale, borderWorld) ?? [];
        const misses: number[] = [];
        const haloSigned: number[] = [];
        angles.forEach((a, i) => {
            if (!Number.isFinite(plainExit[i])) {
                return;
            }
            // where the halo should end on this ray: on the hull of the node's own vertices stretched and projected
            // as the halo's are, or (no hull) the outline point stretched gu, gv about the center
            const [qu, qv] = [gu * plainExit[i] * Math.cos(a), gv * plainExit[i] * Math.sin(a)];
            const b = haloHull.length > 0 ? a : Math.atan2(qv, qu);
            const edge = haloHull.length > 0 ? rayExit(haloHull, a) : Math.hypot(qu, qv);
            if (!Number.isFinite(edge)) {
                return;
            }
            // just inside where the halo should end: a part drawn over it there hides its edge, no reading
            const there = partAt(full, plane, (edge - edgeTol) * Math.cos(b), (edge - edgeTol) * Math.sin(b));
            if (there !== HALO && there !== partIndex("bg") && there !== partIndex("mixed")) {
                return;
            }
            const runs = tidy(runsAlong(full, plane, b, reach), ppu.max);
            // this node's halo runs out from the node to the first background; a halo past that is a neighbor's
            const gap = runs.findIndex((r, k) => k > 0 && r.part === partIndex("bg"));
            const last = lastOf(gap < 0 ? runs : runs.slice(0, gap), (r) => r.part === HALO);
            // no halo on this ray (an edge or a label crossed it first): unread
            if (last !== undefined) {
                misses.push(Math.abs(last.to - edge) * ppu.max);
                haloSigned.push((last.to - edge) * ppu.max);
            }
        });
        numbers.haloRays = misses.length;
        // how far the drawn halo ends past where it should, in device pixels: positive is too large
        numbers.haloPastPx = quantile(haloSigned, 0.5);
        // a halo hidden on every ray by the parts in front of it (a wide border) is drawn as promised
        if (misses.length > 0) {
            checks.push(
                atMost(
                    "halo-scale",
                    "the halo is the node's own shape grown as haloScale and its border grow it, about its center",
                    quantile(misses, 0.9),
                    EDGE_PX * 2,
                    misses,
                ),
            );
        }
    }

    if (s.effect === "outline" && !hidden) {
        const OUTLINE = partIndex("outline");
        const gaps: number[] = [];
        fullRuns.forEach((runs) => {
            const k = runs.findIndex((r) => r.part === OUTLINE);
            if (k < 0) {
                return;
            }
            const drawn = lastIndex(
                runs,
                (r, j) => j < k && (r.part === FILL || r.part === BORDER || r.part === partIndex("outer")),
            );
            if (drawn < 0) {
                return;
            }
            gaps.push(
                runs
                    .slice(drawn + 1, k)
                    .filter((r) => r.part === partIndex("bg"))
                    .reduce((sum, r) => sum + (r.to - r.from), 0) * ppu.max,
            );
        });
        numbers.outlineRays = gaps.length;
        checks.push(
            atMost(
                "outline-touches-node",
                "the outline stays against the node's edge, no background between",
                most(gaps),
                EDGE_PX,
                gaps,
            ),
        );
    }

    if (s.edges === "on" && frames.view === "2d") {
        const EDGE = partIndex("edge");
        let inside = 0;
        // An edge runs to the node's center, so its line from there is radial. Where a solid band lies over the edge
        // the band hides it, so no visible edge pixel lies inside the band's outer edge along the normal. A dashed
        // band shows the edge through its gaps, and the element stops the edge no further than the border's width
        // past the outline along the line (Node.borderReachAlong), which across a slanted side is nearer the
        // outline along the normal: there the edge must reach no nearer than that along the line.
        // an edge pixel is tested at its center, which lies up to half a diagonal from the part of it the edge covers,
        // on top of the band edge's own EDGE_PX
        const edgeAt = (EDGE_PX + Math.SQRT1_2) / ppu.min;
        const edgeStopsShort = (u: number, v: number): boolean => {
            if (s.border !== "dashed") {
                return signed(u, v) < borderEdge - edgeAt;
            }
            const a = Math.atan2(v, u);
            const plainAlong = tidy(runsAlong(plain, plane, a, reach), ppu.max);
            const exit = plainAlong[0]?.part === FILL ? plainAlong[0].to : 0;
            return Math.hypot(u, v) < exit + borderWorld - edgeAt;
        };
        const [x0, y0, x1, y1] = window.map((v) => Math.round(v));
        for (let y = Math.max(0, y0); y <= Math.min(full.height - 1, y1); y++) {
            for (let x = Math.max(0, x0); x <= Math.min(full.width - 1, x1); x++) {
                if (full.parts[y * full.width + x] === EDGE) {
                    const [u, v] = toPlane(plane, x + 0.5, y + 0.5);
                    if (edgeStopsShort(u, v)) {
                        inside++;
                    }
                }
            }
        }
        checks.push(
            atMost(
                "edge-stops-at-border",
                "in 2D an edge stops at the outer edge of the border: none of it on the node",
                inside,
                0,
            ),
        );
    }

    if (s.label === "bottom" && frames.labelReadable) {
        // the element places a label against the node's outline (Node.ts createLabelOptions), not past its rings, so
        // only the outline itself is the node here
        checks.push(...measureLabel(full, plane, window, (u, v) => signed(u, v) < -edgeTol));
    }

    return { checks, numbers };
}

/**
 * The label checks: the label's box (the bounds of its background below the node) holds no point inside
 * the node's outline, and sits below the node's center.
 * @param full - The classified full frame.
 * @param plane - The node's plane.
 * @param window - The node's window in pixels.
 * @param onNode - Whether a plane point is on the node as drawn.
 * @returns The checks.
 */
export function measureLabel(
    full: Classes,
    plane: Plane,
    window: readonly number[],
    onNode: (u: number, v: number) => boolean,
): Check[] {
    const LABEL = partIndex("label");
    const [cx, cy] = toScreen(plane, 0, 0);
    const radius = (window[2] - window[0]) / 2;
    const { parts, width, height } = full;
    // below the node, no wider than half its reach each side, so a neighbor's label is not read
    const box = [cx - radius / 2, cy, cx + radius / 2, cy + radius].map(Math.round);
    const inBox = (x: number, y: number): boolean => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
    // the label is one connected blob (its background is its text's color): the one with most pixels in the box,
    // whole, so stray label-colored pixels (a neighbor's label, a blend) do not stretch its box onto the node
    const seen = new Uint8Array(width * height);
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    let best = 0;
    for (let y = Math.max(0, box[1]); y <= Math.min(height - 1, box[3]); y++) {
        for (let x = Math.max(0, box[0]); x <= Math.min(width - 1, box[2]); x++) {
            if (parts[y * width + x] !== LABEL || seen[y * width + x] === 1) {
                continue;
            }
            const blob = [Infinity, Infinity, -Infinity, -Infinity];
            let count = 0;
            const stack = [y * width + x];
            seen[y * width + x] = 1;
            while (stack.length > 0) {
                const at = stack.pop() ?? 0;
                const [px, py] = [at % width, Math.floor(at / width)];
                count += inBox(px, py) ? 1 : 0;
                [blob[0], blob[1], blob[2], blob[3]] = [
                    Math.min(blob[0], px),
                    Math.min(blob[1], py),
                    Math.max(blob[2], px),
                    Math.max(blob[3], py),
                ];
                for (const [nx, ny] of [
                    [px + 1, py],
                    [px - 1, py],
                    [px, py + 1],
                    [px, py - 1],
                ]) {
                    const n = ny * width + nx;
                    if (nx >= 0 && ny >= 0 && nx < width && ny < height && seen[n] === 0 && parts[n] === LABEL) {
                        seen[n] = 1;
                        stack.push(n);
                    }
                }
            }
            if (count > best) {
                best = count;
                [x0, y0, x1, y1] = blob;
            }
        }
    }
    if (!Number.isFinite(x0)) {
        return [check("label-drawn", "a label with text is drawn by its node", 0, 1, 0)];
    }
    let overlap = 0;
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const [u, v] = toPlane(plane, x + 0.5, y + 0.5);
            if (onNode(u, v)) {
                overlap++;
            }
        }
    }
    return [
        check("label-drawn", "a label with text is drawn by its node", 1, 1, 0),
        atMost("label-off-node", "a label at a side sits beyond the node: none of its box over the node", overlap, 0),
        check("label-below", "a label at bottom is below the node's center", (y0 + y1) / 2 > cy ? 1 : 0, 1, 0),
    ];
}

// ---------------------------------------------------------------------------------------------
// Mesh geometry, in the measuring plane
// ---------------------------------------------------------------------------------------------

/** A point in the measuring plane. */
export type P2 = readonly [number, number];

/**
 * Where a ray from the origin leaves a convex polygon.
 * @param hull - The polygon, in order.
 * @param angle - The ray's angle.
 * @returns The distance, NaN when the origin is outside it.
 */
export function rayExit(hull: readonly P2[], angle: number): number {
    const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
    let best = Number.NaN;
    hull.forEach(([x0, y0], i) => {
        const [x1, y1] = hull[(i + 1) % hull.length];
        const [ex, ey] = [x1 - x0, y1 - y0];
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) {
            return;
        }
        const t = (x0 * ey - y0 * ex) / den;
        const s = (x0 * dy - y0 * dx) / den;
        if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9 && !(t <= best)) {
            best = t;
        }
    });
    return best;
}

/**
 * The distance from a point to a polygon's boundary.
 * @param hull - The polygon.
 * @param p - The point.
 * @returns The distance.
 */
export function distanceToPolygon(hull: readonly P2[], p: P2): number {
    let best = Infinity;
    hull.forEach(([x0, y0], i) => {
        const [x1, y1] = hull[(i + 1) % hull.length];
        const [ex, ey] = [x1 - x0, y1 - y0];
        const length = ex * ex + ey * ey;
        const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - x0) * ex + (p[1] - y0) * ey) / length));
        best = Math.min(best, Math.hypot(p[0] - (x0 + t * ex), p[1] - (y0 + t * ey)));
    });
    return best;
}

/**
 * The radius of the largest circle inside a convex polygon: the deepest any point inside lies from its outline.
 * The distance to the outline is concave over the polygon, so the deepest point is found by a ternary search
 * along x of the deepest along each vertical line.
 * @param hull - The polygon, in order (either way round).
 * @returns The inradius; 0 for fewer than three points.
 */
export function inradius(hull: readonly P2[]): number {
    if (hull.length < 3) {
        return 0;
    }
    const xs = hull.map((p) => p[0]);
    const ys = hull.map((p) => p[1]);
    // inside the polygon the depth is the distance to the outline; outside, it counts against the point
    const depth = (p: P2): number => {
        const d = distanceToPolygon(hull, p);
        return insideConvex(hull, p) ? d : -d;
    };
    const search = (lo: number, hi: number, f: (t: number) => number): number => {
        for (let i = 0; i < 80; i++) {
            const [a, b] = [lo + (hi - lo) / 3, hi - (hi - lo) / 3];
            [lo, hi] = f(a) < f(b) ? [a, hi] : [lo, b];
        }
        return f((lo + hi) / 2);
    };
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    return Math.max(
        0,
        search(Math.min(...xs), Math.max(...xs), (x) => search(y0, y1, (y) => depth([x, y]))),
    );
}

/**
 * A convex polygon's mitred offset outward by a distance, each corner's mitre cut square to its bisector at
 * {@link MITRE_LIMIT} times the distance from the corner (as the element's mitredEdges cuts a sharp corner).
 * @param hull - The polygon, in order (either way round).
 * @param distance - How far out.
 * @returns The offset polygon.
 */
export function mitredOffset(hull: readonly P2[], distance: number): P2[] {
    const n = hull.length;
    if (n < 3 || !(distance > 0)) {
        return [...hull];
    }
    let area = 0;
    hull.forEach(([x0, y0], i) => {
        const [x1, y1] = hull[(i + 1) % n];
        area += x0 * y1 - x1 * y0;
    });
    // the outward normal of a side running (ex, ey) is (ey, -ex) round a counter-clockwise polygon
    const turn = area > 0 ? 1 : -1;
    const sideOf = (i: number): { dir: P2; normal: P2 } => {
        const [x0, y0] = hull[i];
        const [x1, y1] = hull[(i + 1) % n];
        const length = Math.hypot(x1 - x0, y1 - y0) || 1;
        const dir: P2 = [(x1 - x0) / length, (y1 - y0) / length];
        return { dir, normal: [turn * dir[1], -turn * dir[0]] };
    };
    const out: P2[] = [];
    for (let i = 0; i < n; i++) {
        const p = hull[i];
        const before = sideOf((i - 1 + n) % n);
        const after = sideOf(i);
        const bis: P2 = [before.normal[0] + after.normal[0], before.normal[1] + after.normal[1]];
        const length = Math.hypot(bis[0], bis[1]);
        // the mitre reaches distance / cos(half the turn) = 2 distance / |n1 + n2| past the corner
        if (length > 0 && 2 / length <= MITRE_LIMIT) {
            const k = (2 * distance) / (length * length);
            out.push([p[0] + bis[0] * k, p[1] + bis[1] * k]);
            continue;
        }
        const b: P2 = length > 0 ? [bis[0] / length, bis[1] / length] : before.normal;
        const c: P2 = [p[0] + b[0] * MITRE_LIMIT * distance, p[1] + b[1] * MITRE_LIMIT * distance];
        for (const side of [before, after]) {
            const base: P2 = [p[0] + side.normal[0] * distance, p[1] + side.normal[1] * distance];
            const along = side.dir[0] * b[0] + side.dir[1] * b[1];
            const t = ((c[0] - base[0]) * b[0] + (c[1] - base[1]) * b[1]) / along;
            out.push([base[0] + side.dir[0] * t, base[1] + side.dir[1] * t]);
        }
    }
    return out;
}

/**
 * Mesh checks for one ring: its outer hull's distance past the fill's hull at every ray, and how far its
 * hull's middle sits from the middle of the fill hull's mitred offset by the promised reach. Both hulls are of the
 * meshes' vertices projected into the measuring plane, so this is exact geometry with no pixels.
 *
 * A mitred offset of a polygon lies exactly its distance from the polygon along every side and farther beside a
 * corner (up to {@link MITRE_LIMIT} times it). On a small or sharp polygon most rays land beside a corner, so the
 * reach is the nearest ray's distance, and the farthest is bounded by the mitre's limit.
 * @param fill - The fill's hull.
 * @param ring - The ring's hull.
 * @param expected - How far past the fill's outline the ring's outer edge should lie.
 * @param tolerance - How far off it may be.
 * @param symmetric - Whether the shape is symmetric about its center, so the two middles must agree.
 * @param name - The ring's name in the checks.
 * @param nearest - Whether the ring is the fill hull's exact mitred offset in this plane, so its nearest ray and the
 * mitre's limit are read; false where it is not (a plate drawn at its own depth round a solid seen in perspective),
 * where only the median is.
 * @returns The checks.
 */
export function meshRingChecks(
    fill: readonly P2[],
    ring: readonly P2[],
    expected: number,
    tolerance: number,
    symmetric: boolean,
    name: string,
    nearest = true,
): Check[] {
    const offsets = Array.from({ length: RAYS }, (_, i) => {
        const angle = (i / RAYS) * Math.PI * 2;
        const r = rayExit(ring, angle);
        return distanceToPolygon(fill, [r * Math.cos(angle), r * Math.sin(angle)]);
    });
    const middle = (hull: readonly P2[]): P2 => {
        const xs = hull.map((p) => p[0]);
        const ys = hull.map((p) => p[1]);
        return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    };
    // under perspective a polyhedron's silhouette is uneven (near corners magnified), and an even mitred band round
    // it has its box's middle off the outline's: the ring is compared with the offset it should be
    const [a, b] = [middle(mitredOffset(fill, expected)), middle(ring)];
    // a fill lies no deeper inside the ring's outer edge than that outline's inradius, however far in a border
    // draws it (a 0.45 inside border on a capsule 0.25 deep, a cone's triangle with an inradius of 0.37)
    const reach = Math.min(expected, inradius(ring));
    const checks = [
        check(
            `mesh-${name}-reach`,
            `the ${name} mesh's outer edge lies its promised distance past the fill mesh's outline${
                nearest ? ", at its nearest" : ""
            }`,
            nearest ? least(offsets) : quantile(offsets, 0.5),
            reach,
            tolerance,
            offsets,
        ),
    ];
    if (nearest) {
        checks.push(
            atMost(
                `mesh-${name}-mitre`,
                `the ${name} mesh reaches no more than ${String(MITRE_LIMIT)} times its distance past a corner`,
                most(offsets) - MITRE_LIMIT * expected,
                tolerance,
            ),
        );
    }
    if (symmetric) {
        checks.push(
            atMost(
                `mesh-${name}-centered`,
                `the ${name} mesh is centered on the fill mesh`,
                Math.hypot(a[0] - b[0], a[1] - b[1]),
                tolerance,
            ),
        );
    }
    return checks;
}

/** Shapes whose outline is not convex: a hull of their mesh bridges the hollows, so mesh reach is not read. */
export const CONCAVE = new Set(["star", "vee", "cross", "man", "woman", "torus-knot", "torus"]);

/** Shapes symmetric about their center in the measuring plane, whose ring middles must agree. */
export const SYMMETRIC = new Set([
    "sphere",
    "box",
    "cylinder",
    "capsule",
    "torus",
    "icosphere",
    "octahedron",
    "rectangle",
    "round-rectangle",
    "ellipse",
    "diamond",
    "hexagon",
    "octagon",
    "round-diamond",
    "round-hexagon",
    "round-octagon",
    "cross",
    "barrel",
]);

/**
 * Where the outer edge of a case's border lies past the fill's outline, in world units.
 * @param settings - The case's settings.
 * @param sizeFactor - The node's view scale.
 * @returns The distance; 0 with no border.
 */
export function borderEdgeWorld(settings: Settings, sizeFactor: number): number {
    if (settings.border === "none" || settings.border === "screen") {
        return 0;
    }
    return AMOUNTS.borderWidth * PER_SIZE * sizeFactor * outerEdgeFraction(settings.border);
}

/**
 * How far a node's fill mesh is drawn in from its plain outline, and how far its border mesh's outer edge lies past
 * the fill mesh's outline, in world units. A flat shape, or a solid in 2D, draws its fill in by the border's inset
 * (its width inside the outline, half of it centered), so the ring ends its whole width past the fill. A solid in 3D
 * keeps its plain size and its ring is drawn over its edge, so the fill mesh is the plain outline and the ring ends on
 * it (inside) or half its width past it (centered).
 * @param settings - The case's settings.
 * @param sizeFactor - The node's view scale.
 * @param drawnOver - Whether the node is a solid seen in 3D.
 * @returns The inset, and the border's reach past the fill mesh.
 */
export function fillMeshReach(
    settings: Settings,
    sizeFactor: number,
    drawnOver: boolean,
): { inset: number; border: number } {
    const width =
        settings.border === "none" || settings.border === "screen" ? 0 : AMOUNTS.borderWidth * PER_SIZE * sizeFactor;
    const edge = borderEdgeWorld(settings, sizeFactor);
    const inset = drawnOver ? 0 : width - edge;
    return { inset, border: inset + edge };
}
