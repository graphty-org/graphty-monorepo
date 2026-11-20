/**
 * @file The layout of a session that draws nothing: what `session.layout.play()`, `pause()`,
 * `tick()` and `settle()` run when no renderer has handed the session its own layout service.
 *
 * It runs the chosen layout with `@graphty/layout` over the session's working graph -- what the
 * filters leave shown, or the whole graph when the session's `workingGraph` option is off -- and
 * writes the coordinates into the session's positions lane, holding pinned nodes still. A hidden
 * node is never laid out and keeps its position. A live engine with a
 * processor simulation in `@graphty/layout` (`forceatlas2`, `spring`) is stepped; the `force`
 * layout's two engines that have none there (`ngraph`, `d3`) are stepped as ForceAtlas2 with the
 * choice's `seed`; a one-shot engine is computed once. Nothing runs until a verb asks: choosing a
 * layout only records it, as it always has in a session with no renderer.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type DerivedGraph, type F32, type GraphSnapshot, makeMask, maskSet, type U32 } from "@graphty/graph-format";
import {
    createSimulation,
    LAYOUTS,
    type LayoutSimulation,
    type SimulationType,
    toPositionColumn,
} from "@graphty/layout";

import { arrangedDimension, LAYOUT_CATALOG } from "../catalog/layouts";
import type { ElementPositions } from "../data/positions";
import { GraphtyError } from "../errors/GraphtyError";
import type { ArrangementEngine } from "./project/arrangement";
import type { LayoutChoice } from "./project/state";
import type { LayoutMotion } from "./types";
import type { WorkingSnapshot } from "./working/graphs";
import type { WorkingView } from "./working/view";

/** What the runner reads and tells: the session's graph, lane, choice and motion. */
export interface LayoutRunnerHost {
    /** The graph to lay out: the working graph's view, the same object until its state changes. */
    working(): WorkingView;
    undirected(snapshot: GraphSnapshot): DerivedGraph;
    lane(): ElementPositions;
    choice(): LayoutChoice;
    /** Publishes the motion (`session.layoutMotion`). */
    motion(motion: LayoutMotion): void;
    /** A rest point: seals where the nodes came to rest into history. */
    rest(): void;
    /** False once a renderer has taken over the layout: the runner then stops for good. */
    headless(): boolean;
}

/** One loaded run: a simulation, or a one-shot arrangement already written. */
interface Loaded {
    readonly choice: LayoutChoice;
    readonly snapshot: WorkingSnapshot;
    /** The lane's rows for the element's graph: what the cache compares. */
    readonly lane: F32;
    /** The coordinates the layout writes, by row of `snapshot`: `lane` itself when nothing is hidden. */
    readonly view: F32;
    /** Row of `snapshot` -> the element's row, while something is hidden; else null. */
    readonly origin: U32 | null;
    /** The element's row count. */
    readonly rows: number;
    readonly simulation: LayoutSimulation | null;
}

/**
 * The coordinates of the shown rows, gathered from the lane into a buffer of their own.
 * @param lane - The lane.
 * @param origin - Shown row -> element row.
 * @returns x, y, z per shown row; NaN for an unplaced one.
 */
function gather(lane: ElementPositions, origin: U32): F32 {
    const out = new Float32Array(3 * origin.length).fill(Number.NaN);
    const at = { x: 0, y: 0, z: 0 };
    for (let row = 0; row < origin.length; row += 1) {
        if (lane.isPlaced(origin[row])) {
            lane.read(origin[row], at);
            out.set([at.x, at.y, at.z], 3 * row);
        }
    }

    return out;
}

/** The engines stepped as a simulation, by the `createSimulation` type that runs them. */
const SIMULATED: Readonly<Record<string, SimulationType>> = {
    forceatlas2: "forceatlas2",
    spring: "fruchtermanReingold",
    // No processor simulation of these in @graphty/layout: the same force arrangement, by ForceAtlas2.
    ngraph: "forceatlas2",
    d3: "forceatlas2",
};

/** Engines whose element options are not ForceAtlas2's: only the seed carries over. */
const STAND_INS = new Set(["ngraph", "d3"]);

/** The one-shot engines, by the `LAYOUTS` name that computes them. */
const ONE_SHOT: Readonly<Record<string, keyof typeof LAYOUTS>> = {
    random: "random",
    circular: "circular",
    spiral: "spiral",
    grid: "grid",
    shell: "shell",
    spectral: "spectral",
    planar: "planar",
    arf: "arf",
    bfs: "bfs",
    radial: "radial",
    bipartite: "bipartite",
    multipartite: "multipartite",
    "kamada-kawai": "kamadaKawai",
};

/** How long one batch of steps may hold the thread before yielding, in ms. */
const BATCH_MS = 8;

/**
 * The options an engine runs with: the catalog's defaults under the choice's own.
 * @param choice - The choice.
 * @returns The options.
 */
function optionsOf(choice: LayoutChoice): Record<string, unknown> {
    const implementation = LAYOUT_CATALOG.flatMap((entry) => entry.implementations).find(
        (candidate) => candidate.engine === choice.engine,
    );
    const defaults = Object.fromEntries(
        (implementation?.options ?? []).filter((o) => o.default !== undefined).map((o) => [o.name, o.default]),
    );
    return { ...defaults, ...choice.options };
}

/** Runs the chosen layout for a session with no renderer. */
export class LayoutRunner implements ArrangementEngine {
    /** Steps taken since the layout was last loaded. */
    steps = 0;
    private loaded: Loaded | null = null;
    private stale = false;
    private timer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Build the runner; it runs nothing until asked.
     * @param host - The session's graph, lane, choice and motion.
     */
    constructor(private readonly host: LayoutRunnerHost) {}

    /** Start stepping the layout until it comes to rest; a one-shot arrangement is written at once. */
    play(): void {
        const loaded = this.current();
        if (loaded.simulation === null || loaded.simulation.settled) {
            this.host.motion("settled");
            return;
        }

        this.host.motion("running");
        this.schedule();
    }

    /** Stop stepping before the layout comes to rest. */
    pause(): void {
        this.stop();
        if (this.loaded?.simulation?.settled === false) {
            this.host.motion("paused");
            this.host.rest();
        }
    }

    /**
     * Take `count` steps now, without starting the layout running.
     * @param count - How many; a one-shot arrangement takes one.
     */
    tick(count: number): void {
        if (!Number.isInteger(count) || count < 1) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `A layout takes a whole number of steps, at least one; it was asked for ${String(count)}.`,
                source: "layout",
                details: { count },
            });
        }

        const { simulation } = this.current();
        if (simulation !== null) {
            for (let i = 0; i < count && !simulation.settled; i += 1) {
                this.stepOnce(simulation);
            }

            this.publish();
            if (this.timer === null) {
                this.host.motion(simulation.settled ? "settled" : "paused");
                this.host.rest();
            }
        }
    }

    /** {@link ArrangementEngine.suspend}: a history call is about to restore the lane. */
    suspend(): void {
        this.pause();
    }

    /** {@link ArrangementEngine.loadArrangement}: the lane was restored or written; reload from it. */
    loadArrangement(): void {
        this.stale = true;
    }

    /** {@link ArrangementEngine.pin}: the lane's pin byte changed; reload to hold the pins. */
    pin(): void {
        this.stale = true;
    }

    /** Stop for good. */
    dispose(): void {
        this.stop();
        this.loaded?.simulation?.dispose();
        this.loaded = null;
    }

    private stop(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private schedule(): void {
        this.timer ??= setTimeout(() => {
            this.timer = null;
            this.batch();
        }, 0);
    }

    /** One batch of steps, then yield, until the layout rests or a renderer takes over. */
    private batch(): void {
        if (!this.host.headless()) {
            this.dispose();
            return;
        }

        const { simulation } = this.current();
        const start = performance.now();
        while (simulation !== null && !simulation.settled && performance.now() - start < BATCH_MS) {
            this.stepOnce(simulation);
        }

        this.publish();
        if (simulation === null || simulation.settled) {
            this.host.motion("settled");
            this.host.rest();
            return;
        }

        this.schedule();
    }

    /** Tell the lane the layout moved its rows, writing a working graph's rows back to the element's first. */
    private publish(): void {
        const { loaded } = this;
        if (loaded === null) {
            return;
        }

        const lane = this.host.lane();
        const { origin, view } = loaded;
        if (origin !== null) {
            for (let row = 0; row < origin.length; row += 1) {
                if (!lane.isPinned(origin[row]) && !Number.isNaN(view[3 * row])) {
                    lane.write(origin[row], view[3 * row], view[3 * row + 1], view[3 * row + 2]);
                }
            }
        }

        lane.moved(loaded.rows);
    }

    private stepOnce(simulation: LayoutSimulation): void {
        void simulation.step(1);
        this.steps += 1;
    }

    /**
     * The run for the choice, graph and lane as they are now, reloaded when any of them changed.
     * @returns The run.
     */
    private current(): Loaded {
        const choice = this.host.choice();
        const working = this.host.working();
        const { snapshot } = working;
        const lane = this.host.lane();
        const rows = working.graph.nodeCount;
        const elementRows = lane.view(rows);
        const { loaded } = this;
        if (
            loaded !== null &&
            !this.stale &&
            loaded.choice === choice &&
            loaded.snapshot === snapshot &&
            loaded.lane.buffer === elementRows.buffer &&
            loaded.lane.length === elementRows.length
        ) {
            return loaded;
        }

        if (loaded?.choice !== choice) {
            this.steps = 0;
        }

        loaded?.simulation?.dispose();
        this.stale = false;
        // A hidden node is not laid out: the layout runs over the shown rows, in a buffer of their own.
        const origin = working.whole ? null : working.nodeOrigin;
        const view = origin === null ? elementRows : gather(lane, origin);
        const simulation = this.load(choice, snapshot, lane, view, origin, rows);
        this.loaded = { choice, snapshot, lane: elementRows, view, origin, rows, simulation };
        return this.loaded;
    }

    /**
     * Build the engine for a choice and load the graph into it, or write a one-shot arrangement.
     * @param choice - The choice.
     * @param snapshot - The working graph.
     * @param lane - The positions lane.
     * @param view - The coordinates by row of `snapshot`, written in place.
     * @param origin - Row of `snapshot` -> the element's row, or null when they are the same.
     * @param rows - The element's row count.
     * @returns The simulation, or null for a one-shot arrangement (already written).
     */
    private load(
        choice: LayoutChoice,
        snapshot: WorkingSnapshot,
        lane: ElementPositions,
        view: F32,
        origin: U32 | null,
        rows: number,
    ): LayoutSimulation | null {
        const n = snapshot.nodeCount;
        const elementRow = (row: number): number => (origin === null ? row : origin[row]);
        const graph = this.host.undirected(snapshot).snapshot;
        const options = optionsOf(choice);
        const dim = arrangedDimension(choice) === "2d" ? 2 : 3;
        const type = SIMULATED[choice.engine];
        if (type !== undefined) {
            const simulation = createSimulation(
                type,
                STAND_INS.has(choice.engine) ? { seed: options.seed as number | undefined, dim } : { ...options, dim },
            );
            simulation.load(graph, view);
            const fixed = makeMask(n);
            for (let row = 0; row < n; row += 1) {
                maskSet(fixed, row, lane.isPinned(elementRow(row)));
            }

            simulation.setFixed(fixed);
            lane.moved(rows);
            return simulation;
        }

        const name = ONE_SHOT[choice.engine];
        if (name === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message:
                    `The "${choice.engine}" engine runs only on a renderer; a session with no renderer runs ` +
                    `${[...Object.keys(SIMULATED), ...Object.keys(ONE_SHOT)].join(", ")}.`,
                source: "layout",
                details: { engine: choice.engine },
            });
        }

        const fn = LAYOUTS[name].fn as (
            graph: GraphSnapshot,
            options: object,
        ) => Parameters<typeof toPositionColumn>[0];
        const column = toPositionColumn(fn(graph, { ...options, dim }), Number(options.scalingFactor ?? 1), null);
        for (let row = 0; row < n; row += 1) {
            if (!lane.isPinned(elementRow(row))) {
                lane.write(elementRow(row), column[3 * row], column[3 * row + 1], column[3 * row + 2]);
            }
        }

        this.steps += 1;
        return null;
    }
}
