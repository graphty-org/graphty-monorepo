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

import { type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import {
    arf,
    bfs,
    bipartite,
    circular,
    createSimulation,
    grid,
    kamadaKawai,
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

import { type Backend, backendOf, cpuWithoutAsking, gpuFor, type GpuMode, warnIfFixable } from "./gpu.js";
import { type CytoscapeSnapshot, hold, indexOf, indicesOf, type NodeSelection, toSnapshot } from "./snapshot.js";

/** Options of every "graphty-*" layout. Options not listed here go to the @graphty/layout function unchanged. */
export interface GraphtyLayoutOptions {
    readonly name: string;
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
    /** Where to place the result; default the viewport, which is 1 x 1 when headless. */
    readonly boundingBox?: BoundingBox12 | BoundingBoxWH;
    /** Expands (above 1) or compresses (below 1) the area the result takes up. */
    readonly spacingFactor?: number;
    /** Changes each final position: called with the node and its computed position, returns the position to use. */
    readonly transform?: (node: NodeSingular, position: Position) => Position;
    /** Called on layoutready. */
    readonly ready?: LayoutHandler;
    /** Called on layoutstop. */
    readonly stop?: LayoutHandler;
    /** 2 (default) or 3; a 3D result is projected onto x-y. */
    readonly dim?: 2 | 3;
    /** Seed of the layouts that draw random numbers; random when absent. */
    readonly seed?: number;
    /** Edge data field holding the weight (forceatlas2, kamada-kawai, the simulations). Default: unweighted. */
    readonly weight?: string;
    /** Simulations: start from random positions (true, default) or from the current ones. Locked nodes never move. */
    readonly randomize?: boolean;
    /** Simulations with `animate: true`: iterations per frame. Default 1. */
    readonly refresh?: number;
    /**
     * Simulations: "auto" (default) runs on the core's GPU when the runtime has a usable WebGPU device (the run may
     * then be asynchronous: listen for layoutstop); "off" runs on the CPU, synchronously when `animate` is false; "require" emits layouterror instead of running on the CPU. `layout.backend` says which ran.
     */
    readonly gpu?: GpuMode;
    /**
     * Simulations: an accelerator the caller built and owns (for example the `createAccelerator` of
     * `@graphty/webgpu-graph-algorithms`); overrides `gpu`. null forces the CPU.
     */
    readonly accelerator?: LayoutAccelerator | null;
    /** shell: the shells, innermost first. */
    readonly nlist?: readonly NodeSelection[];
    /** multipartite: a node data field whose value names the layer (default "subset"), or the layers in order. */
    readonly subsets?: string | readonly NodeSelection[];
    /** bipartite: the nodes of the first line. */
    readonly top?: NodeSelection;
    /** bfs: the start node; radial: the centre node. */
    readonly root?: NodeSelection;
    readonly [option: string]: unknown;
}

/**
 * The layout a "graphty-*" layout name gives. `backend` is set on a simulation (forceatlas2, fruchterman-reingold,
 * spring-electrical) once it has decided between GPU and CPU, before layoutready; static layouts leave it unset.
 */
export type GraphtyLayouts = CytoscapeLayouts & { readonly backend?: Backend };

/** A "graphty-*" layout's options as `layout()`, `makeLayout()` and `createLayout()` take them. */
type NamedGraphtyLayoutOptions = GraphtyLayoutOptions & { readonly name: `graphty-${string}` };

// Cytoscape types layout() over a closed union whose catch-all, BaseLayoutOptions, rejects every option it does not
// list, so `cy.layout({ name: "graphty-circular", boundingBox })` written inline would not compile. These overloads
// take a "graphty-*" layout's own options; any other layout name still resolves to Cytoscape's signature.
declare module "cytoscape" {
    interface CoreLayout {
        layout(options: NamedGraphtyLayoutOptions): GraphtyLayouts;
        makeLayout(options: NamedGraphtyLayoutOptions): GraphtyLayouts;
        createLayout(options: NamedGraphtyLayoutOptions): GraphtyLayouts;
    }
    interface CollectionLayout {
        layout(options: NamedGraphtyLayoutOptions): GraphtyLayouts;
        makeLayout(options: NamedGraphtyLayoutOptions): GraphtyLayouts;
        createLayout(options: NamedGraphtyLayoutOptions): GraphtyLayouts;
    }
}

/** The registry hands the constructor the options plus `cy`. */
interface ConstructorOptions extends GraphtyLayoutOptions {
    readonly cy: Core;
    readonly eles: Collection;
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
 * Runs a static layout.
 * @param layout - the layout
 * @param fn - the layout function
 */
function runStatic(layout: LayoutThis, fn: StaticLayout): void {
    const o = layout.options;
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

/**
 * Runs a simulation on an accelerator (null: the CPU).
 * @param layout - the layout
 * @param type - the simulation type
 * @param accelerator - the accelerator
 */
function simulate(layout: LayoutThis, type: SimulationType, accelerator: LayoutAccelerator | null): void {
    const o = layout.options;
    if (accelerator === null && type === "spring-electrical") {
        throw new Error(
            `graphty-spring-electrical has no CPU simulation and runs only on the GPU; no GPU ran because ${layout.backend?.reason ?? "none was available"}`,
        );
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
    const sim = createSimulation(
        type,
        { ...SIMULATION_DEFAULTS[type], ...graphtyOptions(o), scale: radius, center, iterationsPerStep: 1 },
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
    };

    // With a locked node the pixel frame is fixed by it; otherwise the result is fitted to the box, as static ones are
    const xy = (): ArrayLike<number> => {
        if (!anyLocked) {
            return fitRows(pos, 3, n, b);
        }
        const out = new Float64Array(2 * n);
        for (let i = 0; i < n; i++) {
            out[2 * i] = pos[3 * i];
            out[2 * i + 1] = pos[3 * i + 1];
        }
        return out;
    };
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
    }
    GraphtyLayout.prototype.run = function (this: LayoutThis): LayoutThis {
        run(this);
        return this;
    };
    if (withStop) {
        // A running loop ends itself on its next frame and emits layoutstop; otherwise act as the registry would
        GraphtyLayout.prototype.stop = function (this: LayoutThis): LayoutThis {
            if (this.looping) {
                this.stopped = true;
            } else {
                this.emit({ type: "layoutstop", layout: this });
            }
            return this;
        };
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
