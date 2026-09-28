import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { degreeCentrality } from "../../../src/indexed/degree.js";
import { legacyResult } from "../../helpers/golden.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { multigraphFixtures, numericIdsFromZero } from "./multigraph-fixtures.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

const OPTION_SETS = [
    {},
    { normalized: true },
    { mode: "in" as const },
    { mode: "out" as const, normalized: true },
    { mode: "total" as const },
];

describe("indexed.degreeCentrality", () => {
    it("counts in, out or both on a directed graph, and ignores the mode when undirected", () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b");
        b.addEdge("a", "c");
        b.addEdge("c", "a");
        const s = b.freeze();
        expect([...degreeCentrality(s)]).toEqual([3, 1, 2]);
        expect([...degreeCentrality(s, { mode: "in" })]).toEqual([1, 1, 1]);
        expect([...degreeCentrality(s, { mode: "out", normalized: true })]).toEqual([1, 0, 0.5]);
        const u = new GraphBuilder({ directed: false });
        u.addEdge("a", "b");
        expect([...degreeCentrality(u.freeze(), { mode: "in" })]).toEqual([1, 1]);
    });

    it("leaves a single node unnormalised rather than dividing by zero", () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode(0);
        expect([...degreeCentrality(b.freeze(), { normalized: true })]).toEqual([0]);
    });

    for (const { name, graph } of [
        ...undirectedFixtures(),
        ...directedFixtures(),
        { name: "numeric ids from 0", graph: numericIdsFromZero() },
    ]) {
        it(`equals the legacy degreeCentrality on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            for (const options of OPTION_SETS) {
                const ported = degreeCentrality(s, options);
                const legacy = legacyResult<CentralityResult>();
                for (let v = 0; v < s.nodeCount; v++) {
                    expect(ported[v]).toBe(legacy[String(s.ids.idOf(v))]);
                }
            }
            s.validate({ checksum: true });
        });
    }

    for (const { name, snapshot } of multigraphFixtures()) {
        it(`counts distinct neighbours on the ${name}, as legacy does on the merged graph`, () => {
            for (const options of OPTION_SETS) {
                const ported = degreeCentrality(snapshot, options);
                const want = legacyResult<CentralityResult>();
                for (let v = 0; v < snapshot.nodeCount; v++) {
                    expect(ported[v], `${String(snapshot.ids.idOf(v))} ${JSON.stringify(options)}`).toBe(
                        want[String(snapshot.ids.idOf(v))],
                    );
                }
            }
            snapshot.validate({ checksum: true });
        });
    }
});
