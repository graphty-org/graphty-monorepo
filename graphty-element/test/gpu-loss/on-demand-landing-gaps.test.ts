/**
 * @file Drawing on demand while a GPU layout runs skips the frames between two landings (issue #8801).
 * Work that finishes inside an update pass and owes no event -- here the last batch of a repaint applied
 * over several frames -- must still be drawn at once, not wait for the next landing, and must be drawn
 * at all once the layout can land nothing more.
 */

import { afterEach, assert, describe, it } from "vitest";

import { type Graph, renderManagerOf } from "../../src/Graph";
import { setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
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

describe("drawing on demand while a GPU layout runs", () => {
    it("draws the last batch of a repaint before the layout lands again", async () => {
        const graph = await running("batched", undefined, "webgl");
        graph.setLayoutBehavior({ rendering: { onDemand: true } });
        // Batches heavy enough that the layout lands every few frames, as a large graph does.
        await graph.setLayout("forceatlas2", {
            maxIter: 1_000_000_000,
            iterationsPerStep: 256,
            maxInFlight: 1,
            settleThreshold: 1e-12,
        });
        await landed(graph);
        await landed(graph);

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

    it("keeps drawing what changes once the layout can land nothing more", async () => {
        const graph = await running("batched", undefined, "webgl");
        graph.setLayoutBehavior({ rendering: { onDemand: true } });
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
    });
});
