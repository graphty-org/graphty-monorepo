/**
 * @file Per-source roles and the one weight rule under the source-steps experiment (design 3.9,
 * 8.6), ported from the reference model's role-setting-before-source, review-round-5 "a weight
 * setter naming no source", weight-blank, phases 10 and late-findings "per-type and per-source
 * counts" cases.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { edgeFile, full, phase2, phase6, refused } from "./scenario";

/**
 * A fresh session under the experiment whose weight setting names a column before any data.
 * @param column - The column the setting names.
 * @returns The session.
 */
async function weightedBeforeData(column: string): Promise<GraphSession> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.config.set({ data: { knownFields: { edgeWeightPath: column, edgeWeightMeaning: "strength" } } });
    return session;
}

/**
 * What a PageRank run would read, as the session plans it.
 * @param session - The session.
 * @returns Whether it reads a weight, and the weight it leaves unread.
 */
async function pagerank(session: GraphSession): Promise<{ weighted: boolean; skipped: unknown }> {
    const plan = await session.plan({ op: "algo.run", algorithm: "pagerank" });
    return { weighted: (plan.caveats.weight ?? null) !== null, skipped: plan.caveats.weightSkipped };
}

/**
 * A Source scope on one source's edges, inside the visible graph, as Analyze writes it (design 8.6).
 * @param source - The source.
 * @returns The scope.
 */
function sourceEdges(source: string) {
    return {
        define: {
            kind: "rule",
            where: {
                kind: "all",
                of: [
                    { kind: "member", of: "visible" },
                    { kind: "source", sources: [source], side: "edges" },
                ],
            },
            reading: "listed",
        },
    } as const;
}

/**
 * Every edge's built weight.
 * @param session - The session.
 * @returns The weights, in edge order.
 */
function weights(session: GraphSession): unknown[] {
    return session.data
        .valueCounts("graphty.weight", { kind: "edge" })
        .values.map((v) => v.value)
        .sort((a, b) => Number(a) - Number(b));
}

describe("source-steps: roles", () => {
    it("a weight setting written before any source is the role of the source loaded next", async () => {
        const session = await weightedBeforeData("cost");
        await session.data.import(
            { type: "csv", config: { data: "source,target,cost\na,b,5\nb,c,7" }, name: "e.csv" },
            { edges: { from: { column: "source" }, to: { column: "target" } } },
        );
        assert.deepStrictEqual(weights(session), [5, 7]);
        session.dispose();
    });

    it("a weight setter naming no source is not ambiguous when only one built source makes edges", async () => {
        const { session } = await phase6();
        await session.data.setRole({ kind: "edge", name: "amount" }, "weight");
        assert.strictEqual(session.data.loadedWeight()?.attribute, "amount");
        assert.deepStrictEqual(weights(session), [5, 7, 10, 20]);
        session.dispose();
    });

    it("refuses a weight setter naming no source while two edge sources carry the column", async () => {
        const { session, t, b } = await full();
        const details = await refused(
            () => session.data.setRole({ kind: "edge", name: "amount" }, "weight"),
            "E_ROLE_TARGET_AMBIGUOUS",
        );
        assert.sameMembers(details.sources as string[], [t, b]);
        const steps = session.history.steps.length;
        await session.data.setRole({ kind: "edge", name: "amount" }, "weight", { source: b });
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        // Only bank B's edges read their amount as the weight.
        assert.deepStrictEqual(weights(session), [4, 6]);
        await session.undo();
        assert.deepStrictEqual(weights(session), []);
        session.dispose();
    });

    it("refuses the weight setting naming no source while two edge sources carry the column", async () => {
        const { session, t, b } = await full();
        const details = await refused(
            () => session.config.set({ data: { knownFields: { edgeWeightPath: "amount" } } }),
            "E_ROLE_TARGET_AMBIGUOUS",
        );
        assert.sameMembers(details.sources as string[], [t, b]);
        assert.isNull(session.data.loadedWeight());
        session.dispose();
    });

    it("the weight setting with one edge source gives that source the role, in one step", async () => {
        const { session } = await phase6();
        const steps = session.history.steps.length;
        await session.config.set({ data: { knownFields: { edgeWeightPath: "amount" } } });
        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.deepStrictEqual(weights(session), [5, 7, 10, 20]);
        session.dispose();
    });

    it("taking the weight role away clears it from the source's mapping, and undo gives it back", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "source,target,w\na,b,2\nb,c,3" }, name: "e.csv" },
            { edges: { from: { column: "source" }, to: { column: "target" } } },
        );
        await session.data.setRole({ kind: "edge", name: "w" }, "weight");
        assert.deepStrictEqual(weights(session), [2, 3]);
        const steps = session.history.steps.length;
        await session.data.setRole({ kind: "edge", name: "w" }, null);
        assert.isNull(session.data.loadedWeight());
        assert.deepStrictEqual(weights(session), [], "graphty.weight follows the role");
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        await session.undo();
        assert.deepStrictEqual(weights(session), [2, 3]);
        await session.config.set({ data: { knownFields: { edgeWeightPath: null } } });
        assert.deepStrictEqual(weights(session), [], "the Unweighted setting takes the role away too");
        session.dispose();
    });

    it("refuses a source option while the experiment is off", async () => {
        const session = createGraphSession({ features: [] });
        await session.data.addNodes([{ id: "a", w: 1 }]);
        await refused(
            () => session.data.setRole({ kind: "node", name: "w" }, "weight", { source: "x" }),
            "E_FEATURE_OFF",
        );
        session.dispose();
    });
});

describe("source-steps: the one weight rule", () => {
    it("one source, one blank weight cell: a run still reads the weight", async () => {
        const session = await weightedBeforeData("w");
        await session.data.import(
            { type: "csv", config: { data: "a,m,w\nacct-1,m-1,10\nacct-2,m-2,\nacct-3,m-1,4" }, name: "T" },
            { edges: { from: { column: "a", space: "account" }, to: { column: "m", space: "merchant" } } },
        );
        const run = await pagerank(session);
        assert.isTrue(run.weighted, `went unweighted: ${JSON.stringify(run.skipped)}`);
        session.dispose();
    });

    it("one file split into transfers and devices still reads the transfer weight", async () => {
        const { session } = await phase2(await weightedBeforeData("amount"));
        const run = await pagerank(session);
        assert.isTrue(run.weighted, `went unweighted: ${JSON.stringify(run.skipped)}`);
        session.dispose();
    });

    it("phase 10: edges of a source that reads no weight mix with weighted ones", async () => {
        const { session, t } = await phase2(await weightedBeforeData("amount"));
        await session.config.set({ data: { knownFields: { edgeWeightPath: "amount" } } });
        const other = await edgeFile(
            session,
            ["txn_id,account_id,merchant_id", "Z-1,A-1,M-2"].join("\n"),
            "unweighted.csv",
            "merge",
        );
        const run = await pagerank(session);
        assert.isFalse(run.weighted);
        assert.strictEqual((run.skipped as { code: string }).code, "weight.meaning-mixed");
        assert.includeMembers((run.skipped as { params: { sources: string[] } }).params.sources, [t, other]);
        assert.sameMembers([...(session.data.loadedWeight()?.mixed?.sources ?? [])], [t, other]);
        // Judged over the edges a run reads: T's own edges share one meaning, so a run on them is
        // weighted (one meaning: weighted), and one on the other file's edge too reads no mix.
        const onT = await session.plan({ op: "algo.run", algorithm: "pagerank", scope: sourceEdges(t) });
        assert.strictEqual(onT.caveats.weight?.attribute, "amount");
        assert.isUndefined(onT.caveats.weightSkipped);
        const onBoth = await session.plan({
            op: "algo.run",
            algorithm: "pagerank",
            scope: {
                define: {
                    kind: "rule",
                    where: { kind: "source", sources: [t, other], side: "edges" },
                    reading: "listed",
                },
            },
        });
        assert.strictEqual(
            (onBoth.caveats.weightSkipped as { code: string } | undefined)?.code,
            "weight.meaning-mixed",
        );
        session.dispose();
    });
});

describe("source-steps: per-type and per-source counts", () => {
    it("attributes and count read one type's or one source's elements", async () => {
        const { session, b } = await full();
        // Bank B's two edges and the nodes its edge ends created (B-7, M-9); A-1 and M-1 it only names.
        assert.deepStrictEqual(session.data.count({ source: b }), { nodes: 2, edges: 2 });
        assert.deepStrictEqual(session.data.count({ type: "merchant" }), { nodes: 3, edges: 0 });
        assert.include(
            session.data.attributes({ type: "merchant" }).map((a) => a.name),
            "city",
        );
        assert.notInclude(
            session.data.attributes({ source: b }).map((a) => a.name),
            "holder",
        );
        session.dispose();
    });
});
