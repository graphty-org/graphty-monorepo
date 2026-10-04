/**
 * Every @graphty/layout layout as a Cytoscape.js 3.x layout extension, named "graphty-<name>".
 *
 * Two kinds:
 * - static layouts compute once and hand their positions to Cytoscape's `layoutPositions`, which supplies the
 *   events, `fit`, `spacingFactor`, `transform` and the tween for any truthy `animate`;
 * - the force simulations (ForceAtlas2, Fruchterman-Reingold, spring-electrical) step a `LayoutSimulation`. With
 *   `animate: true` they draw every frame and own their events; otherwise they run to the end and finish through
 *   `layoutPositions` like a static layout.
 *
 * Positions are 2D. A 3D run (`dim: 3`) is projected onto the x-y plane.
 */

import { type GraphSnapshot, makeMask, maskSet, maskTest, type U32 } from "@graphty/graph-format";
import {
    arf,
    type ArfOptions,
    bfs,
    bipartite,
    type BipartiteLayoutOptions,
    circular,
    createSimulation,
    type ForceAtlas2Options,
    type FruchtermanReingoldOptions,
    grid,
    type GridLayoutOptions,
    kamadaKawai,
    type KamadaKawaiOptions,
    type LayoutAccelerator,
    type LayoutResult,
    type LayoutSimulation,
    Lcg,
    multipartite,
    planar,
    radial,
    random,
    rescaleInPlace,
    shell,
    type SimulationType,
    spectral,
    spiral,
    type SpiralLayoutOptions,
    type SpringElectricalOptions,
} from "@graphty/layout";
import type {
    BoundingBox12,
    BoundingBoxWH,
    Collection,
    Core,
    LayoutHandler,
    LayoutPositionOptions,
    Layouts as CytoscapeLayouts,
    NodeCollection,
    NodeSingular,
    Position,
} from "cytoscape";

import { type Backend, backendOf, checkGpuMode, cpuWithoutAsking, gpuFor, type GpuMode, warnIfFixable } from "./gpu.js";
import { type CytoscapeSnapshot, hold, indexOf, indicesOf, type NodeSelection, toSnapshot } from "./snapshot.js";

/**
 * Every option this package defines for the "graphty-*" layouts, shared and per layout. A layout takes the shared ones
 * and its own (see GraphtyLayoutOptionsByName); its other options go to the @graphty/layout function unchanged.
 */
export interface LayoutOptionFields {
    readonly name: GraphtyLayoutName;
    /** Set by `cy.layout()` / `eles.layout()`. */
    readonly eles?: Collection;
    /** false: jump; "end" or any truthy value on a static layout: tween to the result; true on a simulation: draw every frame. */
    readonly animate?: boolean | "end";
    /** Length of the tween, in milliseconds. */
    readonly animationDuration?: number;
    /** Easing of the tween, as Cytoscape's built-in layouts take it (for example "ease-out"). */
    readonly animationEasing?: string;
    /** Tween only the nodes for which this returns true; the others jump to their positions. */
    readonly animateFilter?: (node: NodeSingular, i: number) => boolean;
    /** Fit the viewport to the result. Default true. */
    readonly fit?: boolean;
    /** Space around the result when `fit` is true, in pixels. */
    readonly padding?: number;
    /**
     * Where to place the result. Default: the viewport, which is 1 x 1 pixel on a headless core. The result keeps its
     * shape: its centroid goes to the center of the box, and it is scaled so the node farthest from the centroid is
     * half the box's shorter side away. A box wider than it is tall is therefore not filled from side to side. A
     * simulation with locked nodes keeps them in place and scales the free nodes around them instead.
     */
    readonly boundingBox?: BoundingBox12 | BoundingBoxWH;
    /**
     * Expands (above 1) or compresses (below 1) the area the result takes up, after it is fitted to `boundingBox`, so
     * a value above 1 can put nodes outside the box.
     */
    readonly spacingFactor?: number;
    /** Changes each final position: called with the node and its computed position, returns the position to use. */
    readonly transform?: (node: NodeSingular, position: Position) => Position;
    /** Called on layoutready. */
    readonly ready?: LayoutHandler;
    /** Called on layoutstop. */
    readonly stop?: LayoutHandler;
    /**
     * 2 (default) or 3. With 3, graphty-circular puts the nodes on a sphere, and graphty-random, graphty-kamada-kawai,
     * graphty-arf and the simulations place them in 3D; z is then dropped, so the drawing is that 3D result seen from
     * above and no longer looks like the 2D layout (circular is no longer a circle). The other layouts ignore it.
     * Cytoscape draws in 2D, so 3 only gives a different flattened drawing; it is there because the underlying layout
     * functions take it.
     */
    readonly dim?: 2 | 3;
    /**
     * Seed of the layouts that draw random numbers: graphty-random, graphty-spectral, graphty-planar, graphty-arf and
     * the three simulations. The same seed gives the same positions; without one, positions that depend on random
     * numbers differ from run to run. The other layouts ignore it.
     */
    readonly seed?: number;
    /**
     * Edge data field holding the weight; a function of the edge also works at runtime. An edge without a number
     * counts as 1. Only graphty-forceatlas2 and graphty-kamada-kawai read it, in opposite directions: forceatlas2
     * treats it as attraction (higher pulls the ends closer), kamada-kawai as edge length (higher pushes them
     * apart). Default: unweighted.
     */
    readonly weight?: string;
    /** Simulations: start from random positions (true, default) or from the current ones. Locked nodes never move. */
    readonly randomize?: boolean;
    /** Simulations with `animate: true`: iterations per frame. Default 1. */
    readonly refresh?: number;
    /**
     * Simulations: "auto" (default) runs on the core's GPU when the runtime has a usable WebGPU device, else on the
     * CPU. In Node or a browser with `navigator.gpu`, a run that has to look for a device finishes after `run()`
     * returns, whichever it picks, so listen for layoutstop. "off" runs on the CPU, synchronously when `animate` is false; "require" emits layouterror instead of running on the CPU. `layout.backend` says which ran. Any other value makes `run()` throw a TypeError.
     */
    readonly gpu?: GpuMode;
    /**
     * Simulations: an accelerator the caller built and owns (for example the `createAccelerator` of
     * `@graphty/webgpu-graph-algorithms`); overrides `gpu`. null forces the CPU.
     */
    readonly accelerator?: LayoutAccelerator | null;
    /** shell: the shells, innermost first. */
    readonly nlist?: readonly NodeSelection[];
    /**
     * multipartite: a node data field whose value names the layer (default "subset"), or the layers in order. Layers
     * named by a field are ordered by value, numbers ascending and other values alphabetically. A node with no value in
     * the field is not placed and keeps its position, so on a graph where no node has the field nothing moves.
     */
    readonly subsets?: string | readonly NodeSelection[];
    /**
     * bipartite: the nodes of the first line, the left column when `align` is "vertical" and the top row when it is
     * "horizontal". Absent: the first, third, fifth and so on of the laid-out nodes.
     */
    readonly top?: NodeSelection;
    /**
     * multipartite, bipartite and bfs: "vertical" (default) puts each layer in a column, its nodes sharing one x;
     * "horizontal" puts each layer in a row, its nodes sharing one y.
     */
    readonly align?: "vertical" | "horizontal";
    /**
     * bfs: the start node, default the first node; radial: the center node, default the node with the most neighbors.
     */
    readonly root?: NodeSelection;
    /**
     * forceatlas2: each node's mass. The name of a node data field (a node without a number there gets the default),
     * an object keyed by node id, or one number per node in node order (an array or a typed array; see Per-node
     * arrays). Default: the node's degree + 1.
     */
    readonly nodeMass?: string | ArrayLike<number> | Readonly<Record<string, number>>;
    /** forceatlas2: accepted in the same forms as `nodeMass` and not used yet: nodes are treated as points. */
    readonly nodeSize?: string | ArrayLike<number> | Readonly<Record<string, number>>;
}

/** The options of LayoutOptionFields that only some layouts take. */
type PerLayoutField = "nlist" | "subsets" | "top" | "align" | "root" | "nodeMass" | "nodeSize";
/** The options every layout takes. */
type Shared = Omit<LayoutOptionFields, "name" | PerLayoutField>;
/** Some of the per-layout options. */
type Own<K extends PerLayoutField> = Pick<LayoutOptionFields, K>;
/**
 * A @graphty/layout options type without what this package sets itself (the frame and the stepping, `fixed` from
 * locked nodes) or spells its own way (bfs `start` is `root` here).
 */
type Library<T, Drop extends string = never> = Omit<
    T,
    | keyof LayoutOptionFields
    | "scale"
    | "center"
    | "iterationsPerStep"
    | "fixed"
    | "start"
    | "weights"
    | "weighted"
    | Drop
>;

/**
 * The options of each "graphty-*" layout, by name. A simulation's `pos` is the nodes' current positions, so only the
 * static layouts that take a start (arf, kamada-kawai) list it.
 */
export interface GraphtyLayoutOptionsByName {
    "graphty-random": Shared;
    "graphty-circular": Shared;
    "graphty-spiral": Shared & Library<SpiralLayoutOptions>;
    "graphty-grid": Shared & Library<GridLayoutOptions>;
    "graphty-spectral": Shared;
    "graphty-planar": Shared;
    "graphty-arf": Shared & Library<ArfOptions>;
    "graphty-kamada-kawai": Shared & Library<KamadaKawaiOptions>;
    "graphty-shell": Shared & Own<"nlist">;
    "graphty-multipartite": Shared & Own<"subsets" | "align">;
    "graphty-bipartite": Shared & Own<"top" | "align"> & Library<BipartiteLayoutOptions>;
    "graphty-bfs": Shared & Own<"root" | "align">;
    "graphty-radial": Shared & Own<"root">;
    "graphty-forceatlas2": Shared & Own<"nodeMass" | "nodeSize"> & Library<ForceAtlas2Options>;
    "graphty-fruchterman-reingold": Shared & Library<FruchtermanReingoldOptions, "pos">;
    "graphty-spring-electrical": Shared & Library<SpringElectricalOptions, "pos">;
}

/** Every layout this package registers, by its registered name. */
export type GraphtyLayoutName = keyof GraphtyLayoutOptionsByName;

/**
 * The options of a "graphty-*" layout: a union over the layout names, so a variable annotated with it keeps its
 * layout's options type, and a misspelled name or option does not compile. `GraphtyLayoutOptions<"graphty-bfs">` is
 * one layout's.
 */
export type GraphtyLayoutOptions<N extends GraphtyLayoutName = GraphtyLayoutName> = N extends GraphtyLayoutName
    ? GraphtyLayoutOptionsByName[N] & { readonly name: N }
    : never;

/**
 * The layout a "graphty-*" layout name gives. `backend` is set on a simulation (forceatlas2, fruchterman-reingold,
 * spring-electrical) once it has decided between GPU and CPU, before layoutready; static layouts leave it unset.
 */
export type GraphtyLayouts = CytoscapeLayouts & { readonly backend?: Backend };

// Cytoscape types layout() over a closed union whose catch-all, BaseLayoutOptions, rejects every option it does not
// list, so `cy.layout({ name: "graphty-circular", boundingBox })` written inline would not compile. These overloads
// take a "graphty-*" layout's own options; any other layout name still resolves to Cytoscape's signature.
declare module "cytoscape" {
    interface CoreLayout {
        layout(options: GraphtyLayoutOptions): GraphtyLayouts;
        makeLayout(options: GraphtyLayoutOptions): GraphtyLayouts;
        createLayout(options: GraphtyLayoutOptions): GraphtyLayouts;
    }
    interface CollectionLayout {
        layout(options: GraphtyLayoutOptions): GraphtyLayouts;
        makeLayout(options: GraphtyLayoutOptions): GraphtyLayouts;
        createLayout(options: GraphtyLayoutOptions): GraphtyLayouts;
    }
}

/** The registry hands the constructor the options plus `cy`; options this package does not define pass through. */
interface ConstructorOptions extends Omit<LayoutOptionFields, "name"> {
    readonly name: string;
    readonly cy: Core;
    readonly eles: Collection;
    readonly [option: string]: unknown;
}

/** The layout object the Cytoscape registry builds around a registrant (its emitter methods are added by Cytoscape). */
interface LayoutThis {
    options: ConstructorOptions;
    stopped: boolean;
    looping: boolean;
    /** Simulations: which implementation ran and why, set before layoutready. */
    backend?: Backend;
    emit(event: string | { type: string; layout: LayoutThis }, params?: unknown[]): LayoutThis;
    one(events: string, handler: LayoutHandler): LayoutThis;
}

/** A static layout over the snapshot, given the options with element selections already turned into indices. */
type StaticLayout = (s: GraphSnapshot, o: Record<string, unknown>, cs: CytoscapeSnapshot) => LayoutResult;

export const DEFAULTS = {
    animate: false,
    animationDuration: 500,
    fit: true,
    padding: 30,
    randomize: true,
    refresh: 1,
} as const;

/**
 * Groups the nodes by the value of a data field, in ascending value order; nodes without the field are left out.
 * @param cs - the layout's snapshot
 * @param field - the node data field
 * @returns node indices per value
 */
function groupsByData(cs: CytoscapeSnapshot, field: string): number[][] {
    const groups = new Map<string | number, number[]>();
    cs.nodes.forEach((node, i) => {
        const v: unknown = node.data(field);
        if (typeof v === "number" || typeof v === "string") {
            const g = groups.get(v);
            if (g === undefined) {
                groups.set(v, [i]);
            } else {
                g.push(i);
            }
        }
    });
    const keys = [...groups.keys()].sort((a, b) =>
        typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b)),
    );
    return keys.map((k) => groups.get(k) ?? []);
}

// The @graphty/layout one-shot functions take index arrays, masks and column names where Cytoscape users hold
// selectors and collections; these entries translate the few options that differ and pass the rest through.
const STATIC: Readonly<Record<string, StaticLayout>> = {
    random: (s, o) => random(s, o),
    circular: (s, o) => circular(s, o),
    spiral: (s, o) => spiral(s, o),
    grid: (s, o) => grid(s, o),
    spectral: (s, o) => spectral(s, o),
    planar: (s, o) => planar(s, o),
    arf: (s, o) => arf(s, o),
    "kamada-kawai": (s, o) => kamadaKawai(s, o),
    shell: (s, o, cs) => {
        const nlist = o.nlist as readonly NodeSelection[] | undefined;
        return shell(s, { ...o, nlist: nlist?.map((sel) => indicesOf(cs, sel)) });
    },
    multipartite: (s, o, cs) => {
        const subsets = (o.subsets ?? "subset") as string | readonly NodeSelection[];
        const layers = typeof subsets === "string" ? groupsByData(cs, subsets) : subsets.map((x) => indicesOf(cs, x));
        return multipartite(s, { ...o, subsets: layers });
    },
    bipartite: (s, o, cs) => {
        if (o.top === undefined) {
            return bipartite(s, o);
        }
        const mask = makeMask(s.nodeCount);
        for (const i of indicesOf(cs, o.top as NodeSelection)) {
            maskSet(mask, i, true);
        }
        return bipartite(s, { ...o, top: mask });
    },
    bfs: (s, { root, ...o }, cs) =>
        bfs(s, { ...o, start: indexOf(cs, root as NodeSelection | undefined, "graphty layout: root") }),
    radial: (s, o, cs) =>
        radial(s, { ...o, root: indexOf(cs, o.root as NodeSelection | undefined, "graphty layout: root") }),
};

// This package's own iteration budgets for the simulations, passed explicitly so a change of a @graphty/layout
// default does not change what a Cytoscape user gets; the caller's option overrides them.
export const SIMULATION_DEFAULTS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
    forceatlas2: { maxIter: 100 },
    fruchtermanReingold: { iterations: 50 },
};

/** Registered name suffix -> @graphty/layout simulation type. */
export const SIMULATIONS: Readonly<Record<string, SimulationType>> = {
    forceatlas2: "forceatlas2",
    "fruchterman-reingold": "fruchtermanReingold",
    "spring-electrical": "spring-electrical",
};

/** Every layout name this package registers, without the "graphty-" prefix. */
export const LAYOUT_NAMES: readonly string[] = [...Object.keys(STATIC), ...Object.keys(SIMULATIONS)];

/**
 * The bounding box in x1/y1/w/h form; default the viewport.
 * @param bb - the option
 * @param cy - the core
 * @returns the box
 */
function box(bb: BoundingBox12 | BoundingBoxWH | undefined, cy: Core): BoundingBoxWH {
    if (bb === undefined) {
        return { x1: 0, y1: 0, w: cy.width(), h: cy.height() };
    }
    return "w" in bb ? bb : { x1: bb.x1, y1: bb.y1, w: bb.x2 - bb.x1, h: bb.y2 - bb.y1 };
}

/**
 * The radius and centre the layout fills inside a box.
 * @param b - the box
 * @returns half the shorter side (at least 1) and the centre
 */
function frame(b: BoundingBoxWH): { radius: number; center: [number, number, number] } {
    return { radius: Math.max(Math.min(b.w, b.h) / 2, 1), center: [b.x1 + b.w / 2, b.y1 + b.h / 2, 0] };
}

/**
 * The x-y pairs of `n` rows of `stride` values, rescaled so the farthest placed node is `radius` from the centre. NaN
 * rows (unplaced nodes) stay NaN.
 * @param rows - the rows
 * @param stride - values per row (2 or 3)
 * @param n - row count
 * @param b - the target box
 * @returns 2n values
 */
function fitRows(rows: ArrayLike<number>, stride: number, n: number, b: BoundingBoxWH): Float64Array {
    const xy = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
        xy[2 * i] = rows[stride * i];
        xy[2 * i + 1] = rows[stride * i + 1];
    }
    const { radius, center } = frame(b);
    return rescaleInPlace(xy, 2, radius, center);
}

/**
 * The x-y pairs of a simulation with locked nodes: each locked node where it stands, each free node scaled about
 * the locked nodes' centroid by the largest factor that keeps every free node inside the box (by the factor that
 * puts the farthest at half the box's shorter side when the centroid is outside the box).
 * @param pos - the stride-3 positions, in pixels
 * @param locked - the locked nodes' mask
 * @param n - node count
 * @param b - the target box
 * @returns 2n values
 */
function fitAroundLocked(pos: ArrayLike<number>, locked: U32, n: number, b: BoundingBoxWH): Float64Array {
    let cx = 0;
    let cy = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
        if (maskTest(locked, i)) {
            cx += pos[3 * i];
            cy += pos[3 * i + 1];
            count++;
        }
    }
    cx /= count;
    cy /= count;
    const inside = cx >= b.x1 && cx <= b.x1 + b.w && cy >= b.y1 && cy <= b.y1 + b.h;
    // the largest factor keeping one coordinate inside [lo, hi], seen from c
    const limit = (c: number, d: number, lo: number, hi: number): number => {
        if (d === 0) {
            return Infinity;
        }
        return ((d > 0 ? hi : lo) - c) / d;
    };
    let scale = Infinity;
    let farthest = 0;
    for (let i = 0; i < n; i++) {
        if (!maskTest(locked, i)) {
            const dx = pos[3 * i] - cx;
            const dy = pos[3 * i + 1] - cy;
            scale = Math.min(scale, limit(cx, dx, b.x1, b.x1 + b.w), limit(cy, dy, b.y1, b.y1 + b.h));
            farthest = Math.max(farthest, Math.hypot(dx, dy));
        }
    }
    if (!inside) {
        scale = farthest > 0 ? frame(b).radius / farthest : 1;
    } else if (!Number.isFinite(scale)) {
        scale = 1;
    }
    const xy = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
        const s = maskTest(locked, i) ? 1 : scale;
        xy[2 * i] = cx + s * (pos[3 * i] - cx);
        xy[2 * i + 1] = cy + s * (pos[3 * i + 1] - cy);
    }
    return xy;
}

/**
 * The per-node options as @graphty/layout takes them: a node data field (`nodeMass: "mass"`) becomes an id-keyed
 * record, where a node whose field is missing or not a finite number gets the layout's default; an array or a typed
 * array other than a Float32Array becomes a Float32Array in node order (@graphty/layout would read a plain array as
 * an object keyed by id, so `[2, 5]` would set nodes "0" and "1").
 * @param cs - the layout's snapshot
 * @param o - the layout options
 * @returns the converted options
 */
function nodeFields(
    cs: CytoscapeSnapshot,
    o: ConstructorOptions,
): Record<string, Record<string, number> | Float32Array> {
    const out: Record<string, Record<string, number> | Float32Array> = {};
    for (const key of ["nodeMass", "nodeSize"] as const) {
        const field = o[key];
        if (Array.isArray(field) || (ArrayBuffer.isView(field) && !(field instanceof Float32Array))) {
            out[key] = Float32Array.from(field as ArrayLike<number>);
        } else if (typeof field === "string") {
            const values: Record<string, number> = {};
            cs.nodes.forEach((node) => {
                const v: unknown = node.data(field);
                if (typeof v === "number" && Number.isFinite(v)) {
                    values[node.id()] = v;
                }
            });
            out[key] = values;
        }
    }
    return out;
}

/**
 * The position function `layoutPositions` and `positions()` take: an unplaced node keeps its position.
 * @param xy - 2n values by node index
 * @returns the position of node i
 */
function positionOf(xy: ArrayLike<number>): (node: NodeSingular, i: number) => Position {
    return (node, i) => (Number.isNaN(xy[2 * i]) ? node.position() : { x: xy[2 * i], y: xy[2 * i + 1] });
}

/**
 * Ends a discrete run through Cytoscape's `layoutPositions` (events, fit, spacing, transform, tween).
 * @param layout - the layout
 * @param nodes - the nodes in index order
 * @param xy - 2n values by node index
 */
function finishDiscrete(layout: LayoutThis, nodes: NodeCollection, xy: ArrayLike<number>): void {
    // layoutPositions memoizes by node id and calls back with ITS index (non-parent nodes in collection order),
    // which is ours because the snapshot was built from the same non-parent nodes
    const at = positionOf(xy);
    // Cytoscape's typings declare the first parameter a string; it is the layout object (index.d.ts defect)
    (
        nodes.layoutPositions as unknown as (
            l: LayoutThis,
            o: LayoutPositionOptions,
            fn: (n: NodeSingular, i: number) => Position,
        ) => void
    )(layout, layout.options as unknown as LayoutPositionOptions, at);
}

/**
 * The options handed to a @graphty/layout function: the caller's, with the layout's own frame and weight flag.
 * @param o - the layout options
 * @returns the options
 */
function graphtyOptions(o: ConstructorOptions): Record<string, unknown> {
    return { ...o, dim: o.dim ?? 2, scale: 1, center: undefined, seed: o.seed ?? null, weight: o.weight !== undefined };
}

/**
 * The snapshot of the layout's nodes (compound parents are positioned by Cytoscape from their children).
 * @param o - the layout options
 * @returns the snapshot
 */
function layoutSnapshot(o: ConstructorOptions): CytoscapeSnapshot {
    return toSnapshot(o.eles.not(":parent"), { weight: o.weight });
}

/**
 * Throws when the run would tween on a core that cannot: a headless core without `styleEnabled: true`, where
 * Cytoscape's own tween fails with "ani.play is not a function".
 * @param o - the layout options
 * @param simulation - whether the layout is a simulation, which draws `animate: true` frame by frame instead
 */
function checkTween(o: ConstructorOptions, simulation: boolean): void {
    const tweens = simulation ? o.animate !== true && Boolean(o.animate) : Boolean(o.animate);
    // styleEnabled() is public Cytoscape API that its typings leave out
    if (tweens && !(o.cy as Core & { styleEnabled(): boolean }).styleEnabled()) {
        throw new Error(
            `${o.name}: animate needs a core that renders; create a headless core with styleEnabled: true, or pass animate: false`,
        );
    }
}

/**
 * Runs a static layout.
 * @param layout - the layout
 * @param fn - the layout function
 */
function runStatic(layout: LayoutThis, fn: StaticLayout): void {
    const o = layout.options;
    checkTween(o, false);
    const cs = layoutSnapshot(o);
    const r = fn(cs.snapshot, graphtyOptions(o), cs);
    finishDiscrete(layout, cs.nodes, fitRows(r.positions, r.dim, r.n, box(o.boundingBox, o.cy)));
}

/**
 * Steps until settled or stopped. Synchronous for a CPU simulation; a GPU simulation's step is a promise, and then
 * so is this.
 * @param sim - the simulation
 * @param layout - the layout (its `stopped` flag ends the run)
 * @returns a promise only when the simulation is asynchronous
 */
function stepToEnd(sim: LayoutSimulation, layout: LayoutThis): void | Promise<void> {
    while (!sim.settled && !layout.stopped) {
        const r = sim.step(50);
        if (r instanceof Promise) {
            return r.then(() => stepToEnd(sim, layout));
        }
    }
    return undefined;
}

/**
 * Runs a simulation layout: on the caller's accelerator, on the CPU when no GPU is enabled (synchronously), or on
 * the core's GPU once one is acquired. The decision is made before the simulation starts; a GPU failure after that
 * is reported as layouterror, never finished on the CPU.
 * @param layout - the layout
 * @param type - the simulation type
 */
function runSimulation(layout: LayoutThis, type: SimulationType): void {
    const o = layout.options;
    checkTween(o, true);
    checkGpuMode(o.name, o.gpu);
    layout.stopped = false;
    if (o.accelerator !== undefined) {
        layout.backend =
            o.accelerator === null
                ? { ran: "cpu", reason: "accelerator: null was passed", device: null }
                : { ran: "gpu", reason: null, device: o.accelerator.kind };
        simulate(layout, type, o.accelerator);
        return;
    }
    // "require" goes through gpuFor, which turns a known CPU decision into the error layouterror reports
    const known = o.gpu === "require" ? null : cpuWithoutAsking(o.gpu);
    if (known !== null) {
        layout.backend = backendOf(known, false, "");
        warnIfFixable(known, o.eles.nodes().length);
        simulate(layout, type, null);
        return;
    }
    layout.looping = true;
    gpuFor(o.cy, o.gpu)
        .then((d) => {
            layout.looping = false;
            layout.backend = backendOf(d, d.gpu !== null, "");
            warnIfFixable(d, o.eles.nodes().length);
            if (layout.stopped) {
                layout.emit({ type: "layoutstop", layout });
                return;
            }
            simulate(layout, type, d.gpu?.accelerator ?? null);
        })
        .catch((error: unknown) => {
            layout.looping = false;
            layout.emit("layouterror", [error]);
            layout.emit({ type: "layoutstop", layout });
        });
}

/** Per core and simulation: pixels per simulation unit of its last run, which a randomize: false run continues. */
const DRAWN_SCALE = new WeakMap<Core, Map<SimulationType, number>>();

/**
 * The x-y centroid of stride-3 rows.
 * @param pos - the rows
 * @param n - row count
 * @returns the centroid, z 0
 */
function centroidOf(pos: ArrayLike<number>, n: number): [number, number, number] {
    let x = 0;
    let y = 0;
    for (let i = 0; i < n; i++) {
        x += pos[3 * i];
        y += pos[3 * i + 1];
    }
    return n === 0 ? [0, 0, 0] : [x / n, y / n, 0];
}

/**
 * Runs a simulation on an accelerator (null: the CPU).
 * @param layout - the layout
 * @param type - the simulation type
 * @param accelerator - the accelerator
 */
function simulate(layout: LayoutThis, type: SimulationType, accelerator: LayoutAccelerator | null): void {
    const o = layout.options;
    if (accelerator === null && type === "spring-electrical") {
        const reason = layout.backend?.reason ?? "none was available";
        // nothing ran, so no backend: "cpu" would say the layout ran there (as with gpu: "require")
        layout.backend = undefined;
        const error = new Error(
            `graphty-spring-electrical has no CPU simulation and runs only on the GPU; no GPU ran because ${reason}`,
        );
        // reported as gpu: "require" reports it, after run() returns, whether or not the GPU was asked for
        layout.looping = true;
        void Promise.resolve().then(() => {
            layout.looping = false;
            layout.emit("layouterror", [error]);
            layout.emit({ type: "layoutstop", layout });
        });
        return;
    }
    const cs = layoutSnapshot(o);
    const s = cs.snapshot;
    const n = s.nodeCount;
    const b = box(o.boundingBox, o.cy);
    const { radius, center } = frame(b);
    const dim = o.dim ?? 2;

    // The simulation reads and writes this stride-3 array in "scene" units; scene units are pixels here, so a
    // locked node is pinned exactly where it stands. A randomized node starts anywhere in the box (Cytoscape's
    // convention). Not left NaN for @graphty/layout's seedPositions to fill: with exactly one finite row (one locked
    // node) its draw box has zero width and every seeded node lands on the locked one; Fruchterman-Reingold then
    // never separates them, and ForceAtlas2Simulation.load does not seed NaN rows at all.
    const pos = new Float32Array(3 * n);
    const fixed = makeMask(n);
    const rng = new Lcg(o.seed ?? null);
    let anyLocked = false;
    cs.nodes.forEach((node, i) => {
        const locked = node.locked();
        anyLocked ||= locked;
        maskSet(fixed, i, locked);
        const p = node.position();
        const keep = locked || o.randomize === false;
        pos[3 * i] = keep ? p.x : b.x1 + rng.next() * b.w;
        pos[3 * i + 1] = keep ? p.y : b.y1 + rng.next() * b.h;
        pos[3 * i + 2] = keep || dim === 2 ? 0 : (rng.next() * 2 - 1) * radius;
    });
    // A continuation (randomize: false) reads the positions at the scale the last run of this simulation on this core
    // drew them at, about their centroid. Read at the box's scale instead, the graph would start far smaller than the
    // simulation's own size, and the first steps would jolt it back out.
    const drawn = o.randomize === false && !anyLocked ? DRAWN_SCALE.get(o.cy)?.get(type) : undefined;
    const scale = drawn ?? radius;
    const sim = createSimulation(
        type,
        {
            ...SIMULATION_DEFAULTS[type],
            ...graphtyOptions(o),
            ...nodeFields(cs, o),
            scale,
            center: drawn === undefined ? center : centroidOf(pos, n),
            iterationsPerStep: 1,
        },
        accelerator,
    );
    sim.load(s, pos);
    if (anyLocked) {
        sim.setFixed(fixed);
    }
    // a data change while the simulation runs must not release the snapshot its device upload came from
    const unhold = hold(s);
    const dispose = (): void => {
        sim.dispose();
        unhold();
        if (!anyLocked) {
            // pixels per simulation unit once fitted to the box: fitRows scales the farthest node to `radius`
            const [cx, cy] = centroidOf(pos, n);
            let farthest = 0;
            for (let i = 0; i < n; i++) {
                farthest = Math.max(farthest, Math.hypot(pos[3 * i] - cx, pos[3 * i + 1] - cy));
            }
            if (farthest > 0) {
                const scales = DRAWN_SCALE.get(o.cy) ?? new Map<SimulationType, number>();
                scales.set(type, (scale * radius) / farthest);
                DRAWN_SCALE.set(o.cy, scales);
            }
        }
    };

    // Fitted to the box as a static result is; with a locked node, the free nodes are scaled about the locked ones
    const xy = (): ArrayLike<number> => (anyLocked ? fitAroundLocked(pos, fixed, n, b) : fitRows(pos, 3, n, b));
    const fail = (error: unknown): void => {
        layout.looping = false;
        dispose();
        layout.emit("layouterror", [error]);
        layout.emit({ type: "layoutstop", layout });
    };

    if (o.animate !== true) {
        const done = (): void => {
            layout.looping = false;
            dispose();
            finishDiscrete(layout, cs.nodes, xy());
        };
        const r = stepToEnd(sim, layout);
        if (r === undefined) {
            done();
        } else {
            layout.looping = true;
            r.then(done, fail);
        }
        return;
    }

    // Continuous: one frame per animation frame, `refresh` iterations each
    layout.looping = true;
    layout.emit({ type: "layoutstart", layout });
    let first = true;
    const schedule =
        typeof requestAnimationFrame === "function"
            ? requestAnimationFrame
            : (f: () => void): unknown => setTimeout(f, 16);
    const draw = (): void => {
        cs.nodes.positions(positionOf(xy()));
        if (o.fit !== false) {
            o.cy.fit(o.eles, o.padding);
        }
        if (first) {
            first = false;
            if (o.ready !== undefined) {
                layout.one("layoutready", o.ready);
            }
            layout.emit({ type: "layoutready", layout });
        }
        if (sim.settled || layout.stopped) {
            layout.looping = false;
            dispose();
            if (o.stop !== undefined) {
                layout.one("layoutstop", o.stop);
            }
            layout.emit({ type: "layoutstop", layout });
        } else {
            schedule(tick);
        }
    };
    const tick = (): void => {
        if (layout.stopped) {
            draw();
            return;
        }
        let r: void | Promise<void>;
        try {
            r = sim.step(o.refresh ?? 1);
        } catch (error) {
            fail(error);
            return;
        }
        if (r instanceof Promise) {
            r.then(draw, fail);
        } else {
            draw();
        }
    };
    tick();
}

/** Each layout object's run body, set by its registrant's constructor. */
const RUN_BODIES = new WeakMap<LayoutThis, (layout: LayoutThis) => void>();

/**
 * A registrant's run(): runs the layout's body.
 * @returns the layout
 */
function runLayout(this: LayoutThis): LayoutThis {
    RUN_BODIES.get(this)?.(this);
    return this;
}

/**
 * A simulation registrant's stop(). A running loop ends itself on its next frame and emits layoutstop; otherwise
 * act as the registry would.
 * @returns the layout
 */
function stopLayout(this: LayoutThis): LayoutThis {
    if (this.looping) {
        this.stopped = true;
    } else {
        this.emit({ type: "layoutstop", layout: this });
    }
    return this;
}

/**
 * A Cytoscape layout registrant. It must be a function constructor: the registry calls it as
 * `registrant.call(this, options)`, which a native class rejects.
 * @param run - the run body
 * @param withStop - whether the registrant defines stop(); without one the registry emits layoutstop itself
 * @returns the registrant
 */
function registrant(run: (layout: LayoutThis) => void, withStop: boolean): unknown {
    function GraphtyLayout(this: LayoutThis, options: ConstructorOptions): void {
        this.options = { ...DEFAULTS, ...options };
        this.stopped = false;
        this.looping = false;
        RUN_BODIES.set(this, run);
    }
    GraphtyLayout.prototype.run = runLayout;
    if (withStop) {
        GraphtyLayout.prototype.stop = stopLayout;
    }
    return GraphtyLayout;
}

/** The registration function Cytoscape's `use()` calls. */
type Register = (type: string, name: string, registrant: unknown) => void;

/**
 * Registers every graphty layout as "graphty-<name>": `cytoscape.use(graphtyCytoscape)`.
 * @param cytoscape - the cytoscape function
 */
export function registerLayouts(cytoscape: Register): void {
    for (const [name, fn] of Object.entries(STATIC)) {
        cytoscape(
            "layout",
            `graphty-${name}`,
            registrant((l) => {
                runStatic(l, fn);
            }, false),
        );
    }
    for (const [name, type] of Object.entries(SIMULATIONS)) {
        cytoscape(
            "layout",
            `graphty-${name}`,
            registrant((l) => {
                runSimulation(l, type);
            }, true),
        );
    }
}
