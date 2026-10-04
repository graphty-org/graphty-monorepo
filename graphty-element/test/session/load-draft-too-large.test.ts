/**
 * @file A load past the element's limit: a draft's report carries the details `E_TOO_LARGE`
 * would, without throwing, and the load and `import` refuse with exactly those details. The
 * ceiling is mocked small.
 */

import { assert, describe, it, vi } from "vitest";

vi.mock("../../src/session/limits", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../src/session/limits")>();
    return { ...original, DEFAULT_LIMITS: { ...original.DEFAULT_LIMITS, renderCeiling: 3 } };
});

const { createGraphSession } = await import("../../src/session");

const FOUR = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], edges: [] });

/**
 * The error a promise rejects with.
 * @param promise - the promise
 * @returns the error, or null when it resolved
 */
async function refusal(
    promise: Promise<unknown>,
): Promise<{ code?: string; details?: Record<string, unknown> } | null> {
    return promise.then(
        () => null,
        (error: unknown) => error as { code?: string; details?: Record<string, unknown> },
    );
}

describe("E_TOO_LARGE on a load", () => {
    it("is reported by a draft and thrown by the load, with the same details", async () => {
        const session = createGraphSession();
        const source = { type: "json", config: { data: FOUR } };

        const draft = await session.data.prepare(source);
        const report = await draft.report();
        assert.deepEqual(report.tooLarge, { limit: 3, count: 4, of: "nodes", graph: { nodes: 0, edges: 0 } });
        assert.strictEqual(report.counts.nodes, 4);

        const loaded = await refusal(draft.load());
        assert.strictEqual(loaded?.code, "E_TOO_LARGE");
        assert.deepEqual(loaded?.details, { ...report.tooLarge });

        const imported = await refusal(session.data.import(source));
        assert.strictEqual(imported?.code, "E_TOO_LARGE");
        assert.deepEqual(imported?.details, { ...report.tooLarge });
        session.dispose();
    });

    it("counts a merge against the nodes already in the graph", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [{ id: "x" }], edges: [] }) },
        });
        const three = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [] });
        const draft = await session.data.prepare({ type: "json", config: { data: three } });

        assert.isNull((await draft.report()).tooLarge);
        assert.deepEqual((await draft.report({ mode: "merge" })).tooLarge, {
            limit: 3,
            count: 4,
            of: "nodes",
            graph: { nodes: 1, edges: 0 },
        });
        session.dispose();
    });

    it("refuses an edge list whose endpoints alone pass the limit", async () => {
        const session = createGraphSession();
        const edges = { type: "csv", config: { data: "source,target\na,b\nc,d\n" } };

        assert.deepEqual((await (await session.data.prepare(edges)).report()).tooLarge, {
            limit: 3,
            count: 4,
            of: "nodes",
            graph: { nodes: 0, edges: 0 },
        });
        assert.strictEqual((await refusal(session.data.import(edges)))?.code, "E_TOO_LARGE");
        session.dispose();
    });

    it("counts the nodes edges create, and fits once those edges are left out", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({
            config: {
                nodeFile: new File(["id\na\nb\n"], "people.csv"),
                edgeFile: new File(["source,target\na,b\nb,y\ny,z\n"], "ties.csv"),
            },
        });

        const added = await draft.report();
        assert.strictEqual(added.tooLarge?.of, "nodes");
        const leftOut = await draft.report({ unmatched: "leave-out" });
        assert.isNull(leftOut.tooLarge);
        assert.strictEqual(leftOut.counts.nodes, 2);
        assert.strictEqual((await refusal(draft.load()))?.code, "E_TOO_LARGE");
        await draft.load({ unmatched: "leave-out" });
        assert.strictEqual(session.data.statistics().nodeCount, 2);
        session.dispose();
    });
});
