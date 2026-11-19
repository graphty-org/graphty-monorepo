/**
 * @file Phases 1 and 3 of design section 7 under the source-steps experiment, ported from the
 * reference model's phases cases, and the steps' buckets (late findings, settled 9.2).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

const TRANSACTIONS = [
    "txn_id,account_id,merchant_id,amount",
    "T-1,A-1,M-1,10",
    "T-2,A-1,M-2,20",
    "T-3,A-2,M-1,5",
    "T-4,A-3,M-3,7",
].join("\n");

const ACCOUNTS = ["account_id,holder", "A-1,Ann", "A-2,Bo", "A-9,Cy"].join("\n");

/**
 * Load the transactions as the first edge file: accounts and merchants are its ends.
 * @param session - The session.
 * @returns The source's id.
 */
async function phase1(session: GraphSession): Promise<string> {
    await session.data.import(
        { type: "csv", config: { data: TRANSACTIONS }, name: "transactions.csv" },
        {
            edges: {
                from: { column: "account_id", space: "account" },
                to: { column: "merchant_id", space: "merchant" },
                id: "txn_id",
            },
        },
    );
    const [t] = session.data.sources();
    await session.data.declareType({ name: "account", kind: "node", rules: [{ source: t.key, end: "source" }] });
    await session.data.declareType({ name: "merchant", kind: "node", rules: [{ source: t.key, end: "target" }] });
    await session.data.declareType({ name: "transfer", kind: "edge", rules: [{ source: t.key }] });
    return t.key;
}

describe("source-steps: phases", () => {
    it("phase 1: a first edge file draws at once; its ends are typed by end rules", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const t = await phase1(session);
        const snapshot = session.data.store.getSnapshot();
        assert.strictEqual(snapshot.edgeCount, 4);
        assert.deepStrictEqual(
            session.data.spaces().map((s) => [s.space, s.nodes]),
            [
                ["account", 3],
                ["merchant", 3],
            ],
        );
        assert.deepStrictEqual(
            session.data.types().map((type) => [type.name, type.kind]),
            [
                ["account", "node"],
                ["merchant", "node"],
                ["transfer", "edge"],
            ],
        );
        assert.deepStrictEqual(session.data.steps()[0]?.types, ["account", "merchant", "transfer"]);
        // Nodes an edge list's ends created are supplied by it (3.1).
        assert.deepStrictEqual(session.data.sourcesOf("A-1"), [t]);
        assert.strictEqual(session.data.sources()[0]?.counts.edges, 4);
        // Each declaration is one undo step.
        await session.undo();
        assert.strictEqual(session.data.types().length, 2);
        session.dispose();
    });

    it("phase 3: a second source arrives staged: held, never built", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await phase1(session);
        const nodes = session.data.store.getSnapshot().ids.size;
        const steps = session.data.steps().length;
        const history = session.history.steps.length;
        const a = await session.data.stage(
            { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
            { key: "account_id", type: "account" },
        );
        const staged = session.data.sources().find((s) => s.key === a);
        assert.strictEqual(staged?.state, "staged");
        assert.strictEqual(session.data.store.getSnapshot().ids.size, nodes, "staging builds nothing");
        assert.strictEqual(session.data.steps().length, steps, "no step reads it");
        assert.lengthOf(session.history.steps, history, "staging is not an undo step");
        // Undo takes back the change before it, the last type declared, and not only the staging.
        await session.undo();
        assert.strictEqual(session.data.types().length, 2);
        // Removing a staged source is an undo step.
        await session.data.stage(
            { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
            { key: "account_id", type: "account" },
        );
        const again = session.data.sources().find((s) => s.state === "staged");
        assert.isDefined(again);
        await session.data.removeSource(again?.key ?? "");
        assert.isUndefined(session.data.sources().find((s) => s.state === "staged"));
        await session.undo();
        assert.strictEqual(session.data.sources().find((s) => s.key === again?.key)?.state, "staged");
        session.dispose();
    });

    it("phase 3: staging first in a fresh session is no undo step and survives undo", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const a = await session.data.stage(
            { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
            { key: "account_id", type: "account" },
        );
        assert.lengthOf(session.history.steps, 0, "staging is not an undo step");
        await session.undo();
        assert.strictEqual(session.data.sources().find((s) => s.key === a)?.state, "staged");
        session.dispose();
    });

    it("data.steps() returns each step's buckets from the committed build (late findings, settled 9.2)", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await phase1(session);
        const rows = session.data.steps();
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0]?.op, "join.add");
        assert.strictEqual(rows[0]?.buckets?.newEdges, session.data.store.getSnapshot().edgeCount);
        assert.strictEqual(rows[0]?.buckets?.newNodes, 6);
        assert.deepStrictEqual(rows[0]?.reads, ["account_id", "merchant_id", "txn_id"]);
        assert.deepStrictEqual(rows[0]?.spaces, ["account", "merchant"]);
        assert.isFalse(rows[0]?.off);
        session.dispose();
    });
});
