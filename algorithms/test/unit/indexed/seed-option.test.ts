import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { plantedPartitionGraph } from "@graphty/graph-samples/generators";
import { describe, expect, it } from "vitest";

import { grsbm } from "../../../src/indexed/grsbm.js";
import { labelPropagation, labelPropagationSemiSupervised } from "../../../src/indexed/label-propagation.js";
import { leiden } from "../../../src/indexed/leiden.js";
import { kargerMinCut } from "../../../src/indexed/min-cut.js";
import { spectralClustering } from "../../../src/indexed/spectral.js";
import { syncClustering } from "../../../src/indexed/sync.js";

function planted(): GraphSnapshot {
    const sample = plantedPartitionGraph({ groups: 3, groupSize: 12, pIn: 0.5, pOut: 0.05, seed: 3 });
    const b = new GraphBuilder({ directed: false });
    for (let i = 0; i < sample.nodeCount; i++) {
        b.addNode(i);
    }
    for (let e = 0; e < sample.src.length; e++) {
        b.addEdge(sample.src[e], sample.dst[e]);
    }
    return b.freeze({ checksum: true });
}

/** Every seeded algorithm, run with a seed option, returning its seed-dependent answer. */
const seeded: Record<string, (s: GraphSnapshot, o: { seed?: number; randomSeed?: number }) => ArrayLike<number>> = {
    leiden: (s, o) => leiden(s, o).labels,
    labelPropagation: (s, o) => labelPropagation(s, o).labels,
    labelPropagationSemiSupervised: (s, o) =>
        labelPropagationSemiSupervised(s, new Uint32Array(s.nodeCount).fill(0xffffffff), o).labels,
    kargerMinCut: (s, o) => kargerMinCut(s, { iterations: 3, ...o }).side,
    spectralClustering: (s, o) => spectralClustering(s, { k: 3, ...o }).labels,
    syncClustering: (s, o) => syncClustering(s, { numClusters: 3, maxIterations: 20, ...o }).labels,
    grsbm: (s, o) => grsbm(s, o).labels,
};

describe("the seed option of the seeded algorithms", () => {
    const s = planted();
    for (const [name, run] of Object.entries(seeded)) {
        it(`${name} takes seed, defaults it to 42 and refuses a non-integer`, () => {
            expect(Array.from(run(s, { seed: 42 }))).toEqual(Array.from(run(s, {})));
            for (const seed of [1.5, Number.NaN, Infinity]) {
                expect(() => run(s, { seed })).toThrow(RangeError);
            }
            s.validate({ checksum: true });
        });
    }

    for (const name of ["leiden", "labelPropagation", "labelPropagationSemiSupervised", "kargerMinCut"]) {
        it(`${name} still reads the deprecated randomSeed, and seed wins over it`, () => {
            const run = seeded[name];
            expect(Array.from(run(s, { randomSeed: 7 }))).toEqual(Array.from(run(s, { seed: 7 })));
            expect(Array.from(run(s, { seed: 7, randomSeed: 8 }))).toEqual(Array.from(run(s, { seed: 7 })));
        });
    }
});
