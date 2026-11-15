/**
 * @file The layout of a session that draws nothing: what `session.layout.play()`, `pause()`,
 * `tick()` and `settle()` run when no renderer has handed the session its own layout service.
 *
 * It runs the chosen layout with `@graphty/layout` over the session's snapshot and writes the
 * coordinates into the session's positions lane, holding pinned nodes still. A live engine with a
 * processor simulation in `@graphty/layout` (`forceatlas2`, `spring`) is stepped; the `force`
 * layout's two engines that have none there (`ngraph`, `d3`) are stepped as ForceAtlas2 with the
 * choice's `seed`; a one-shot engine is computed once. Nothing runs until a verb asks: choosing a
 * layout only records it, as it always has in a session with no renderer.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type DerivedGraph, type F32, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
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

/** What the runner reads and tells: the session's graph, lane, choice and motion. */
export interface LayoutRunnerHost {
    snapshot(): GraphSnapshot;
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
    readonly snapshot: GraphSnapshot;
    readonly view: F32;
    readonly simulation: LayoutSimulation | null;
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
 * The options an engine runs with: the catalogue's defaults under the choice's own.
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

            this.host.lane().moved(this.loaded?.snapshot.nodeCount ?? 0);
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

        const { simulation, snapshot } = this.current();
        const start = performance.now();
        while (simulation !== null && !simulation.settled && performance.now() - start < BATCH_MS) {
            this.stepOnce(simulation);
        }

        this.host.lane().moved(snapshot.nodeCount);
        if (simulation === null || simulation.settled) {
            this.host.motion("settled");
            this.host.rest();
            return;
        }

        this.schedule();
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
        const snapshot = this.host.snapshot();
        const lane = this.host.lane();
        const view = lane.view(snapshot.nodeCount);
        const { loaded } = this;
        if (
            loaded !== null &&
            !this.stale &&
            loaded.choice === choice &&
            loaded.snapshot === snapshot &&
            loaded.view.buffer === view.buffer &&
            loaded.view.length === view.length
        ) {
            return loaded;
        }

        if (loaded?.choice !== choice) {
            this.steps = 0;
        }

        loaded?.simulation?.dispose();
        this.stale = false;
        this.loaded = { choice, snapshot, view, simulation: this.load(choice, snapshot, lane, view) };
        return this.loaded;
    }

    /**
     * Build the engine for a choice and load the graph into it, or write a one-shot arrangement.
     * @param choice - The choice.
     * @param snapshot - The graph.
     * @param lane - The positions lane.
     * @param view - The lane's rows for the graph, written in place.
     * @returns The simulation, or null for a one-shot arrangement (already written).
     */
    private load(
        choice: LayoutChoice,
        snapshot: GraphSnapshot,
        lane: ElementPositions,
        view: F32,
    ): LayoutSimulation | null {
        const n = snapshot.nodeCount;
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
                maskSet(fixed, row, lane.isPinned(row));
            }

            simulation.setFixed(fixed);
            lane.moved(n);
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
            if (!lane.isPinned(row)) {
                lane.write(row, column[3 * row], column[3 * row + 1], column[3 * row + 2]);
            }
        }

        this.steps += 1;
        return null;
    }
}
