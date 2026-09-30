/**
 * @file The random-sequence model of the history (`test/session/history/random-model.ts`), run
 * on a real `Graph` with real layout engines instead of a headless session with a fake layout, so
 * the arrangement rules the model checks are checked against the engines the fake stands in for:
 * the spring simulation, and ngraph and d3, which keep a graph of their own. See
 * design/undo/undo-design.md section 12.5.
 *
 * The same generators, fewer and shorter runs: each command here costs real meshes and real
 * layout passes. Three things are held still so a failure replays from its seed:
 *
 * - The render loop is stopped. The layout moves only when the model steps a frame, as the fake
 *   does, and comes to rest when the model pauses it, which the layout manager reports as a rest
 *   point exactly as it reports a settle.
 * - The history's coalescing clock is the model's fake clock rather than `performance.now()`.
 * - Queued turns go to the element's operation queue unless the model holds them.
 *
 * The last two replace a private member of the dispatcher and of its history: the element has no
 * public way to hand a renderer's session a clock or a queue, and needs none outside a test.
 */

import fc from "fast-check";
import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { Scheduler } from "../../src/session/project/Dispatcher";
import { guardedAsyncProperty } from "../helpers/caught-errors";
import { fakeClock, heldScheduler } from "../session/history/fakes";
import {
    baselineModel,
    COMMANDS,
    type Model,
    type ModelLayout,
    type Real,
    undoAllRedoAll,
} from "../session/history/random-model";

/** The seeds CI runs. */
const SEEDS = [1, 17, 4242];
/** Sequences tried per seed. */
const NUM_RUNS = 8;
/** Longest sequence tried. */
const MAX_COMMANDS = 20;
/** Per seed. */
const SEED_TIMEOUT_MS = 120_000;
/** Frames a settle may take before the model pauses the layout instead. */
const SETTLE_FRAMES = 300;

/**
 * The engines each sequence is run under: the spring simulation, which moves nodes only when a
 * frame is stepped and reads the graph from the snapshot, and ngraph (the default) and d3, which
 * keep a copy of the graph of their own and place newcomers by stepping as an add is derived.
 */
const ENGINES = ["spring", "ngraph", "d3"] as const;

/**
 * The engines the generated layout choices are drawn with under each: each one moves nodes only
 * when a frame is stepped or an add is derived. A one-shot layout places every node again whenever
 * it is read, which is not a move the model can follow.
 * @param engine - The engine the run is under.
 * @returns The choice each generated layout id stands for.
 */
function simulations(
    engine: (typeof ENGINES)[number],
): Readonly<Record<string, { readonly id: string; readonly engine: string }>> {
    return engine === "spring"
        ? {
              circular: { id: "force", engine: "forceatlas2" },
              spiral: { id: "force", engine: "spring" },
              force: { id: "force", engine: "spring" },
          }
        : { circular: { id: "force", engine }, spiral: { id: "force", engine }, force: { id: "force", engine } };
}

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * The layout of a real graph, driven a frame at a time.
 * @param graph - The graph.
 * @returns The layout the model drives.
 */
function realLayout(graph: Graph): ModelLayout {
    const manager = graph.getLayoutManager();
    return {
        get running() {
            return manager.running;
        },
        play() {
            manager.running = true;
        },
        step() {
            graph.getUpdateManager().stepFrames(1);
        },
        settle() {
            for (let frame = 0; frame < SETTLE_FRAMES && manager.running; frame++) {
                graph.getUpdateManager().stepFrames(1);
            }

            // Not settled in time: a pause, which is a rest point too.
            manager.running = false;
        },
    };
}

/**
 * A real graph holding `n1 -> n2 -> n3`, with a degree run and a route, laid out by one engine
 * and at rest, with its history cleared.
 * @param engine - The engine.
 * @returns The system and the model.
 */
async function begin(engine: (typeof ENGINES)[number]): Promise<{ real: Real; model: Model }> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    await graph.init();
    graph.engine.stopRenderLoop();
    await graph.setLayout(engine);
    const session = graph.getSession();
    const dispatcher = dispatcherOf(session);
    const clock = fakeClock();
    Reflect.set(dispatcher.history, "now", clock.now);
    const queue = heldScheduler(Reflect.get(dispatcher, "scheduler") as Scheduler);
    Reflect.set(dispatcher, "scheduler", queue);

    await session.data.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
    await session.data.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
    ]);
    await session.runs.start("degree", {}, { as: "deg", style: false });
    await session.runs.start("shortest-path", { source: "n1", target: "n3" }, { as: "route", style: false });
    const layout = realLayout(graph);
    await layout.settle();
    session.history.clear();
    const real: Real = {
        session,
        clock,
        layout,
        queue,
        layoutFor: (id) => simulations(engine)[id] ?? simulations(engine).force,
    };
    return { real, model: baselineModel(real) };
}

describe.each(ENGINES)("random sequences on a real graph under %s", (engine) => {
    for (const seed of SEEDS) {
        it(
            `holds for seed ${String(seed)}`,
            async () => {
                await fc.assert(
                    guardedAsyncProperty(
                        fc.scheduler(),
                        fc.commands(COMMANDS, { maxCommands: MAX_COMMANDS, size: "max" }),
                        async (s, commands) => {
                            let begun: { real: Real; model: Model } | undefined;
                            await fc.scheduledModelRun(
                                s,
                                async () => {
                                    begun = await begin(engine);
                                    return begun;
                                },
                                commands,
                            );

                            assert.isDefined(begun);
                            await undoAllRedoAll(begun.model, begun.real);
                            for (const cleanup of cleanups.splice(0)) {
                                cleanup();
                            }
                        },
                    ),
                    { seed, numRuns: NUM_RUNS, endOnFailure: true, timeout: 20_000 },
                );
            },
            SEED_TIMEOUT_MS,
        );
    }
});
