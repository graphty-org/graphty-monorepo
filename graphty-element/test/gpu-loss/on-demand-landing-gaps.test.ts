/**
 * @file Drawing on demand while a GPU layout runs skips the frames between two landings (issue #8801).
 * Work that finishes inside an update pass and owes no event -- here the last batch of a repaint applied
 * over several frames -- must still be drawn at once, not wait for the next landing, and must be drawn
 * at all once the layout can land nothing more. Under renderPath "batched" the same frames are skipped
 * with drawing on demand off, and still nothing else is; under "objects" every tick draws.
 */

import { afterEach, assert, describe, it } from "vitest";

import { type Graph, renderManagerOf } from "../../src/Graph";
import { setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import { hover, nodePoint, wheel } from "../helpers/real-input";
import { landed, layoutOf, nextFrame, running, unmount } from "./shared-device";

afterEach(() => {
    setMinimumWorkPerFrame(false);
    unmount();
});

/**
 * Paints every node red a few nodes a frame, and waits for the tick that applies the last batch.
 * @param graph - The graph.
 * @returns Whether that tick drew a frame, and whether a layout landing was published in it.
 */
async function repaintInBatches(graph: Graph): Promise<{ drew: boolean; landedInIt: boolean }> {
    const painter = graph.getStylePainter();
    const engine = layoutOf(graph);
    let drewThisTick = false;
    let pendingBefore = false;
    let landedBefore = engine.landedBatchesPublished;
    let last: { drew: boolean; landedInIt: boolean } | null = null;
    graph.scene.onAfterRenderObservable.add(() => {
        drewThisTick = true;
    });
    graph.engine.onEndFrameObservable.add(() => {
        const pending = painter.hasPending;
        const landedNow = engine.landedBatchesPublished;
        if (pendingBefore && !pending && last === null) {
            last = { drew: drewThisTick, landedInIt: landedNow !== landedBefore };
        }

        pendingBefore = pending;
        landedBefore = landedNow;
        drewThisTick = false;
    });
    setMinimumWorkPerFrame(true);
    await graph.getSession().styles.add({
        name: "red",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#ff0000" },
    });
    while (last === null) {
        await nextFrame();
    }

    return last;
}

/**
 * Starts a layout whose batches are heavy enough that it lands every few frames, as a large graph
 * does, and waits for two landings.
 * @param graph - The graph.
 */
async function heavyLayout(graph: Graph): Promise<void> {
    await graph.setLayout("forceatlas2", {
        maxIter: 1_000_000_000,
        iterationsPerStep: 256,
        maxInFlight: 1,
        settleThreshold: 1e-12,
    });
    await landed(graph);
    await landed(graph);
}

/**
 * Starts something that changes the picture, and waits for the first tick that draws after it.
 *
 * The tick watchers are added, and a tick that skipped its frame between two landings is waited
 * for, BEFORE acting: a newly added frame observer is itself a reason to draw, so watchers added
 * with the act would count their own frame as the act's.
 * @param graph - The graph.
 * @param act - What changes the picture; not awaited before ticks are watched.
 * @returns How many ticks it took, and whether a layout landing was published in the tick that drew.
 */
async function firstDrawAfter(graph: Graph, act: () => unknown): Promise<{ ticks: number; landedInIt: boolean }> {
    const engine = layoutOf(graph);
    const { ticks: counts } = renderManagerOf(graph);
    let ticks = 0;
    let drewThisTick = false;
    let landedBefore = engine.landedBatchesPublished;
    let first: { ticks: number; landedInIt: boolean } | null = null;
    let acted = false;
    const drew = graph.scene.onAfterRenderObservable.add(() => {
        drewThisTick = true;
    });
    const ended = graph.engine.onEndFrameObservable.add(() => {
        const landedNow = engine.landedBatchesPublished;
        if (acted) {
            ticks++;
            if (drewThisTick && first === null) {
                first = { ticks, landedInIt: landedNow !== landedBefore };
            }
        }

        landedBefore = landedNow;
        drewThisTick = false;
    });
    const rested = counts.awaitedLanding;
    while (counts.awaitedLanding === rested) {
        await nextFrame();
    }

    acted = true;
    const acting = act();
    while (first === null) {
        await nextFrame();
    }

    await acting;
    graph.scene.onAfterRenderObservable.remove(drew);
    graph.engine.onEndFrameObservable.remove(ended);
    return first;
}

/**
 * Changes a property of something already in the scene, which announces nothing to the element.
 * @param graph - The graph.
 */
function dimTheLight(graph: Graph): void {
    const light = graph.scene.getLightByName("light");
    assert.isNotNull(light);
    light.intensity *= 0.5;
}

describe("skipping the frames between two landings of a GPU layout", () => {
    for (const onDemand of [true, false]) {
        it(`draws the last batch of a repaint before the layout lands again (batched, on demand ${onDemand ? "on" : "off"})`, async () => {
            const graph = await running("batched", undefined, "webgl");
            graph.setLayoutBehavior({ rendering: { onDemand } });
            await heavyLayout(graph);

            const last = await repaintInBatches(graph);
            // On a software adapter (as CI runs it) landings are tens of ticks apart, so that tick is one
            // between two landings; on a fast GPU the layout lands nearly every tick and draws it anyway.
            assert.isTrue(
                last.drew,
                `the tick that applied the last paint batch drew nothing (landed in it: ${String(last.landedInIt)})`,
            );

            // Once that is drawn, the ticks between two landings draw nothing again.
            const { ticks } = renderManagerOf(graph);
            const engine = layoutOf(graph);
            const awaited = ticks.awaitedLanding;
            let between = 0;
            let landedBefore = engine.landedBatchesPublished;
            const watch = graph.engine.onEndFrameObservable.add(() => {
                between += engine.landedBatchesPublished === landedBefore ? 1 : 0;
                landedBefore = engine.landedBatchesPublished;
            });
            await landed(graph);
            await landed(graph);
            graph.engine.onEndFrameObservable.remove(watch);
            assert.isTrue(
                between < 3 || ticks.awaitedLanding > awaited,
                `${String(between)} ticks between landings all drew`,
            );
        });
    }

    it("draws a camera move, a hover, a restyle and a selection at once under batched with drawing on demand off", async () => {
        const graph = await running("batched", undefined, "webgl");
        graph.setLayoutBehavior({ rendering: { onDemand: false } });
        await heavyLayout(graph);
        const center = { x: 240, y: 180 };
        const changes: Record<string, () => unknown> = {
            "a camera move": () => wheel(graph.canvas, center, 120),
            "a hover": () => hover(graph.canvas, nodePoint(graph, "n0")),
            "a restyle": () =>
                graph.getSession().styles.add({
                    name: "blue",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": "#0000ff" },
                }),
            "a selection": () => graph.selectNode("n1"),
        };
        for (const [change, act] of Object.entries(changes)) {
            const first = await firstDrawAfter(graph, act);
            // Drawn by the change itself, not left for the next landing: the first frame after it
            // came within two ticks, or in a tick that landed nothing.
            assert.isTrue(
                first.ticks <= 2 || !first.landedInIt,
                `${change} was first drawn ${String(first.ticks)} ticks later, with a landing`,
            );
        }
    });

    it("draws every tick under objects with drawing on demand off", async () => {
        const graph = await running("objects", undefined, "webgl");
        graph.setLayoutBehavior({ rendering: { onDemand: false } });
        await heavyLayout(graph);
        const { ticks } = renderManagerOf(graph);
        const { awaitedLanding, rested } = ticks;
        await landed(graph);
        await landed(graph);
        assert.strictEqual(ticks.awaitedLanding, awaitedLanding, "a tick between landings skipped its frame");
        assert.strictEqual(ticks.rested, rested, "a tick rested");
    });

    for (const onDemand of [true, false]) {
        it(`keeps drawing what changes once the layout can land nothing more (batched, on demand ${onDemand ? "on" : "off"})`, async () => {
            const graph = await running("batched", undefined, "webgl");
            graph.setLayoutBehavior({ rendering: { onDemand } });
            const engine = layoutOf(graph);
            const errors: unknown[] = [];
            graph.on("error", (event) => {
                errors.push(event.error);
            });
            // A batch that fails without the device being lost: reported, and the layout is left running.
            const simulation = engine.simulation as unknown as { step: () => Promise<void> };
            simulation.step = () => Promise.reject(new Error("a batch failed"));
            while (errors.length === 0) {
                await nextFrame();
            }

            const last = await repaintInBatches(graph);
            assert.isTrue(last.drew, "the tick that applied the last paint batch drew nothing");
            if (onDemand) {
                return;
            }

            // With drawing on demand off every tick draws again, so even a change that announces
            // nothing is shown: no tick waits for a landing that cannot come.
            const { ticks } = renderManagerOf(graph);
            const awaited = ticks.awaitedLanding;
            let ended = 0;
            const count = graph.engine.onEndFrameObservable.add(() => {
                ended++;
            });
            dimTheLight(graph);
            while (ended < 30) {
                await nextFrame();
            }
            graph.engine.onEndFrameObservable.remove(count);
            assert.strictEqual(ticks.awaitedLanding - awaited, 0, "ticks waited for a landing after the layout failed");
        });
    }
});
