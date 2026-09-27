/**
 * @file The random-sequence model of the history (`test/session/history/random-model.ts`), run
 * on a real `Graph` with a real `SimulationLayoutEngine` instead of a headless session with a
 * fake layout, so the arrangement rules the model checks are checked against the engine the fake
 * stands in for. See design/undo/undo-design.md section 12.5.
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
 * The engines the generated layout choices are drawn with here: each one a simulation, which
 * moves nodes only when a frame is stepped. A one-shot layout places every node again when one
 * is added, on the operation queue's own time, which is not a move the model can follow.
 */
const SIMULATIONS: Readonly<Record<string, { readonly id: string; readonly engine: string }>> = {
    circular: { id: "force", engine: "forceatlas2" },
    spiral: { id: "force", engine: "spring" },
    force: { id: "force", engine: "spring" },
};

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
 * A real graph holding `n1 -> n2 -> n3`, with a degree run and a route, laid out by the spring
 * simulation and at rest, with its history cleared.
 * @returns The system and the model.
 */
async function begin(): Promise<{ real: Real; model: Model }> {
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
    await graph.setLayout("spring");
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
    const real: Real = { session, clock, layout, queue, layoutFor: (id) => SIMULATIONS[id] ?? SIMULATIONS.force };
    return { real, model: baselineModel(real) };
}

describe("random sequences on a real graph with a real layout", () => {
    for (const seed of SEEDS) {
        it(
            `holds for seed ${String(seed)}`,
            async () => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.scheduler(),
                        fc.commands(COMMANDS, { maxCommands: MAX_COMMANDS, size: "max" }),
                        async (s, commands) => {
                            let begun: { real: Real; model: Model } | undefined;
                            await fc.scheduledModelRun(
                                s,
                                async () => {
                                    begun = await begin();
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
