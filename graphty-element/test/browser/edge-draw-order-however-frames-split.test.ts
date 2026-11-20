/**
 * @file Edges are drawn in the same order however the frames split a load's repaint (#8087).
 *
 * A file's opaque lines in 2D lie in one plane, so where two cross, the one drawn later is on top, and a batch draws
 * its slots in order. A repaint is applied in batches within a frame budget, and the edges a batch painted used to be
 * placed on the frame that painted them, a curve taking its pieces' slots there: how many batches a frame ran decided
 * the slot order, so the GEXF sample gexf-hsk-chars (868 nodes, curved edges) drew two pictures on the same inputs.
 * Loaded here at full speed and in the minimum-work-per-frame test mode (`src/managers/minimumWork.ts`, a few edges
 * painted a frame), every edge line batch must hold the same pieces in the same slots.
 */
import { afterEach, assert, describe, it } from "vitest";

import { CORPUS_SAMPLES } from "../../../graph-io/test/fidelity/corpus-samples";
import { setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import { mountSample, unmount } from "../fidelity/mount";

/**
 * Loads the sample with the mode on or off and reads every edge line batch's pieces in slot order.
 * @param minimum - Whether every frame does the least work it can.
 * @returns Each batch's pieces, as their two ends' x and y, by the batch's key.
 */
async function slots(minimum: boolean): Promise<Record<string, number[][]>> {
    const sample = CORPUS_SAMPLES.find((s) => s.id === "gexf-hsk-chars");
    assert.isDefined(sample);
    setMinimumWorkPerFrame(minimum);
    const { element } = await mountSample(sample);
    const { batchCacheMap } = element.graph.getDataManager().meshCache;
    return Object.fromEntries(
        [...batchCacheMap].map(([key, batch]) => [
            key,
            Array.from({ length: batch.drawnCount }, (_, i) => batch.endsOf(i).flatMap((p) => [p.x, p.y])),
        ]),
    );
}

describe("edge draw order", () => {
    afterEach(() => {
        unmount();
        setMinimumWorkPerFrame(false);
    });

    it("is the same at full speed and with the least work a frame: gexf-hsk-chars", async () => {
        const full = await slots(false);
        const minimum = await slots(true);
        assert.isAbove(Object.values(full).flat().length, 0, "the sample draws batched edge lines");
        assert.deepStrictEqual(minimum, full, "every batch holds the same pieces in the same slots");
    });
});
