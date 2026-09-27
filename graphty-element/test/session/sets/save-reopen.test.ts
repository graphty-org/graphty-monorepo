/**
 * @file The `d1:` digest and the `r1:` revision survive a save and reopen of a file that embeds
 * the graph (design/sets/sets-design.md section 6.4; section 15.3, item 11): the graph written as
 * graph-format bytes, the sets as their logical records through JSON, both read back into a new
 * store. A graph holding edges matched by position (a load's ordinal members) and edges the
 * element minted an id for (added in the session) resolves every kept set to the same members,
 * so the same digest, and every record keeps its revision.
 */

import { fromBytes } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { EdgeMember, SetDefinition, SetDefinitionInput } from "../../../src/catalog/types";
import { resolveSet } from "../../../src/session/sets/cache";
import { digestOf } from "../../../src/session/sets/resolve";
import { createSetsApi, setsStoreOf } from "../../../src/session/sets/SetsApi";
import { TestGraph } from "./graphs";

describe("a save and reopen of an embedded graph", () => {
    it("keeps every kept set's d1 digest and r1 revision", () => {
        const graph = new TestGraph();
        const [, ab1, bc] = graph.load([
            { s: "a", t: "b" },
            { s: "a", t: "b" },
            { s: "b", t: "c" },
        ]);
        const [cd] = graph.load([{ s: "c", t: "d" }], { asLoad: false });
        const ordinal: EdgeMember = { source: "a", target: "b", ordinal: 1, among: 2 };
        const minted: EdgeMember = { source: "c", target: "d", id: `graphty:e${String(cd)}` };
        const definitions: SetDefinitionInput[] = [
            { kind: "fixed", nodes: ["a"], edges: [ordinal, minted], reading: "listed" },
            { kind: "fixed", nodes: ["b", "c"], reading: "induced" },
            { kind: "path", nodes: ["a", "b", "c", "d"], edges: [graph.edgeId(ab1), graph.edgeId(bc), graph.edgeId(cd)] },
            { kind: "rule", where: { kind: "degree", min: 2 }, reading: "induced" },
        ];
        const ids = definitions.map((definition, index) => graph.sets.create(definition, { name: `S${String(index)}` }));

        const measure = (sets: typeof graph.sets, snapshot: ReturnType<typeof graph.snapshot>): { revision: string; digest: string; edges: number }[] =>
            ids.map((id) => {
                const record = sets.get(id);
                assert.isDefined(record, id);
                const resolution = resolveSet(record as { id: string; definition: SetDefinition }, { snapshot, sets: setsStoreOf(sets) });
                assert.isUndefined(resolution.problem, id);

                return { revision: record?.revision ?? "", digest: digestOf(resolution, snapshot), edges: resolution.edgeCount };
            });
        const before = measure(graph.sets, graph.snapshot());
        assert.deepStrictEqual(
            before.map((entry) => entry.edges),
            [2, 1, 3, 3],
            "the ordinal and minted members bind before the save",
        );

        // Save: the graph as bytes, the sets as their logical records through JSON.
        const bytes = graph.snapshot().toBytes();
        const json = JSON.stringify(graph.setsStore.toLogicalRecords());

        // Reopen into a new store.
        const reopened = fromBytes(bytes);
        const sets = createSetsApi({ edgeMember: () => undefined });
        setsStoreOf(sets).loadLogicalRecords(JSON.parse(json));
        const after = measure(sets, reopened);

        assert.deepStrictEqual(after, before);
        for (const entry of after) {
            assert.match(entry.revision, /^r1:/);
            assert.match(entry.digest, /^d1:/);
        }
    });
});
