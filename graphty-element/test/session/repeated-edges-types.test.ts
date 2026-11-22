/**
 * @file A load into the graph reduces repeated edges the way opening a version 2 file does
 * (design/data/multiple-data-sources-design.md 3.8): `repeatedEdges` never reduces two edges of
 * different types into one, and reduces repeats whose weight meanings differ only by `first` or
 * `last`, never by a rule that combines their weights. Whatever format the rows came from.
 */

import type { DuplicatePolicy } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";
import type { GraphSession } from "../../src/session/types";

const MESSAGES = "from,to,emails\np01,p02,14\np01,p03,9\n";

/**
 * A session reducing repeats by a policy.
 * @param repeatedEdges - The policy.
 * @returns The session.
 */
function sessionWith(repeatedEdges: DuplicatePolicy): GraphSession {
    return createGraphSession({ config: { data: { knownFields: { repeatedEdges, edgeWeightPath: "w" } } } });
}

/**
 * Each edge as `source>target kind`, sorted.
 * @param session - The session.
 * @returns The edges.
 */
function edgesOf(session: GraphSession): string[] {
    return session.data
        .edges()
        .map((edge) => `${String(edge.source)}>${String(edge.target)} ${String(edge.kind)}`)
        .sort();
}

describe("repeatedEdges on a load: types", () => {
    it("never reduces a CSV's edges of two types, and reduces each type's own repeats", async () => {
        const session = sessionWith("sum");
        const csv = "source,target,kind,w\na,b,call,1\na,b,mail,2\na,b,call,3\n";
        await session.data.import({ type: "csv", config: { data: csv } });
        assert.deepEqual(edgesOf(session), ["a>b call", "a>b mail"]);
        session.dispose();
    });

    it("does the same for a JSON file, and across a merge", async () => {
        const session = sessionWith("first");
        const json = (kind: string): string =>
            JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b", kind, w: 1 }] });
        await session.data.import({ type: "json", config: { data: json("call") } });
        await session.data.import({ type: "json", config: { data: json("mail") } }, { mode: "merge" });
        await session.data.import({ type: "json", config: { data: json("call") } }, { mode: "merge" });
        assert.deepEqual(edgesOf(session), ["a>b call", "a>b mail"]);
        session.dispose();
    });

    it("reads the type a mapping's kind role gives", async () => {
        const session = sessionWith("max");
        const csv = "from,to,how,w\na,b,walk,1\na,b,ride,5\na,b,walk,2\n";
        await session.data.import(
            { type: "csv", config: { data: csv } },
            { mapping: { rowsAre: "edges", source: "from", target: "to", kind: "how", weight: "w" } },
        );
        assert.strictEqual(session.data.statistics().edgeCount, 2);
        session.dispose();
    });
});

describe("repeatedEdges on a load: weight meanings", () => {
    /**
     * Load the messages table twice, as a distance and then merged as a strength.
     * @param repeatedEdges - The policy.
     * @returns The session.
     */
    async function twoMeanings(repeatedEdges: DuplicatePolicy): Promise<GraphSession> {
        const session = createGraphSession({ config: { data: { knownFields: { repeatedEdges } } } });
        const mapping = { rowsAre: "edges", source: "from", target: "to", weight: "emails" } as const;
        await session.data.import(
            { type: "csv", config: { data: MESSAGES } },
            { mapping: { ...mapping, weightMeaning: "distance" } },
        );
        await session.data.import(
            { type: "csv", config: { data: MESSAGES } },
            { mode: "merge", mapping: { ...mapping, weightMeaning: "strength" } },
        );
        return session;
    }

    for (const policy of ["sum", "min", "max"] as const) {
        it(`never combines a distance with a strength under ${policy}`, async () => {
            const session = await twoMeanings(policy);
            assert.strictEqual(session.data.statistics().edgeCount, 4);
            session.dispose();
        });
    }

    for (const policy of ["first", "last"] as const) {
        it(`reduces them under ${policy}`, async () => {
            const session = await twoMeanings(policy);
            assert.strictEqual(session.data.statistics().edgeCount, 2);
            session.dispose();
        });
    }

    it("combines repeats of one meaning", async () => {
        const session = createGraphSession({ config: { data: { knownFields: { repeatedEdges: "sum" } } } });
        const mapping = {
            rowsAre: "edges",
            source: "from",
            target: "to",
            weight: "emails",
            weightMeaning: "strength",
        } as const;
        await session.data.import({ type: "csv", config: { data: MESSAGES } }, { mapping });
        await session.data.import({ type: "csv", config: { data: MESSAGES } }, { mode: "merge", mapping });
        assert.strictEqual(session.data.statistics().edgeCount, 2);
        session.dispose();
    });
});

describe("a load draft's report counts repeats by the same rule", () => {
    it("counts a repeat of the graph's edge only when its type matches", async () => {
        const session = sessionWith("first");
        await session.data.import({ type: "csv", config: { data: "source,target,kind\na,b,call\n" } });
        const draft = await session.data.prepare({ config: { data: "source,target,kind\na,b,mail\na,b,call\n" } });
        const report = await draft.report({ mode: "merge" });
        assert.deepEqual(report.repeated, { seen: 1, kept: 0, dropped: 1, merged: 0 });

        await draft.load({ mode: "merge" });
        assert.deepEqual(session.data.lastImport()?.repeated, report.repeated, "the load counts the same");
        session.dispose();
    });

    it("counts no repeat a combining policy keeps apart for its weight meaning", async () => {
        const session = createGraphSession({ config: { data: { knownFields: { repeatedEdges: "sum" } } } });
        const mapping = { rowsAre: "edges", source: "from", target: "to", weight: "emails" } as const;
        await session.data.import(
            { type: "csv", config: { data: MESSAGES } },
            { mapping: { ...mapping, weightMeaning: "distance" } },
        );
        const draft = await session.data.prepare({ config: { data: MESSAGES } });
        const strength = await draft.report({ mode: "merge", mapping: { ...mapping, weightMeaning: "strength" } });
        assert.strictEqual(strength.repeated.seen, 0);
        const distance = await draft.report({ mode: "merge", mapping: { ...mapping, weightMeaning: "distance" } });
        assert.deepEqual(distance.repeated, { seen: 2, kept: 0, dropped: 0, merged: 2 });
        session.dispose();
    });
});
