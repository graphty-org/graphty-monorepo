import { assert, describe, it } from "vitest";

import { DataManager, dataManagerInternals } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import type { GraphContext } from "../../src/managers/GraphContext";
import { Styles } from "../../src/Styles";

/**
 * A manager on the "batched" or "objects" render path, counting how often ingest asks it for the
 * edges between a pair: the per-edge question a bulk load on the batched path answers from its own
 * pass instead.
 * @param batched - true for the "batched" render path
 * @returns the manager and the running count of pair questions
 */
function makeManager(batched: boolean): { dm: DataManager; asked: () => number } {
    const dm = new DataManager(new EventManager(), Styles.default());
    dm.setGraphContext({} as unknown as GraphContext);
    dm.renderLimits = { ceilings: () => undefined, batched: () => batched };
    let asked = 0;
    const between = dm.getEdgesBetween.bind(dm);
    dm.getEdgesBetween = (source, target) => {
        asked++;
        return between(source, target);
    };
    return { dm, asked: () => asked };
}

const BATCH = [
    { src: "a", dst: "b", weight: 2 },
    { src: "b", dst: "c", weight: 1 },
    { src: "a", dst: "b", weight: 3 },
    { src: "b", dst: "a", weight: 5 },
];

describe("repeat checks in a batch on the batched path", () => {
    it("asks the host nothing for a batch with no repeat into an empty graph", () => {
        const { dm, asked } = makeManager(true);
        dm.addEdges(BATCH.filter((_, at) => at !== 2));
        assert.strictEqual(asked(), 0);
        assert.strictEqual(dm.getSnapshot().edgeCount, 3);
    });

    it("asks the host only about the record that repeats a pair", () => {
        const { dm, asked } = makeManager(true);
        dm.addEdges(BATCH);
        assert.strictEqual(asked(), 1);
        assert.strictEqual(dm.getSnapshot().edgeCount, 4, "keep holds every repeat as its own edge");
    });

    it("folds a repeat within the batch exactly as the objects path does", () => {
        for (const policy of ["first", "sum", "last"] as const) {
            const batched = makeManager(true);
            const objects = makeManager(false);
            batched.dm.addEdges(BATCH, { repeated: policy });
            objects.dm.addEdges(BATCH, { repeated: policy });
            // Only the store asks, once, about the one repeat; the ceiling's count runs before
            // anything is stored and finds the repeat within the batch itself.
            assert.strictEqual(batched.asked(), 1, policy);
            assert.isAtLeast(objects.asked(), BATCH.length, "the objects path asks per edge, as before");
            const weights = (dm: DataManager): number[] => [...dm.getSnapshot().weightedOutDegree()];
            assert.strictEqual(batched.dm.getSnapshot().edgeCount, 3, policy);
            assert.deepEqual(weights(batched.dm), weights(objects.dm), policy);
        }
    });

    it("still finds a repeat of an edge an earlier batch stored", () => {
        const { dm } = makeManager(true);
        dm.addEdges([{ src: "a", dst: "b" }], { repeated: "first" });
        dm.addEdges([{ src: "a", dst: "b" }], { repeated: "first" });
        assert.strictEqual(dm.getSnapshot().edgeCount, 1);
    });

    it("lets go of the batch's pair index once a batch outside a load ends", () => {
        const { dm } = makeManager(true);
        dm.addEdges(BATCH);
        // One Set per source node, kept after the batch, was 58 MB at 1M + 1M; the next batch
        // outside a load starts its own index anyway.
        assert.strictEqual(dataManagerInternals.pairIndexSources(dm), 0);
    });
});
