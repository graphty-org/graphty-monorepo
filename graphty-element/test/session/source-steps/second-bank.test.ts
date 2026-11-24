/**
 * @file A second bank's accounts meeting the first's under the source-steps experiment, ported from
 * the reference model's roundtrips cases "second bank, Keep separate (5.5 conformance)", "second
 * bank, Merge" and "edge-only bank B: Add meets existing keys, never asks".
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

const BANK_A = ["account_id,holder", "A-1,Ann", "A-2,Bo", "A-3,Cy"].join("\n");
const BANK_B = ["account_id,holder", "A-2,Bob", "A-3,Cyd", "B-7,Dee"].join("\n");
const BANK_B_EDGES = ["txn_id,account_id,merchant_id", "X-1,A-1,M-1", "X-2,B-8,M-1"].join("\n");

/**
 * A session holding bank A's accounts, typed account.
 * @returns The session.
 */
async function bankA(): Promise<GraphSession> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(
        { type: "csv", config: { data: BANK_A }, name: "bankA.csv" },
        { key: "account_id", type: "account" },
    );
    return session;
}

describe("source-steps: a second bank", () => {
    it("Keep separate (5.5): meeting keys are reported and kept in the source's own space", async () => {
        const session = await bankA();
        await session.data.import(
            { type: "csv", config: { data: BANK_B }, name: "bankB.csv" },
            { mode: "merge", key: "account_id", type: "account" },
        );
        const b = session.data.sources()[1];
        assert.deepStrictEqual(b?.issues, [{ code: "W_SPACE_OVERLAP", params: { space: "account", count: 2, of: 3 } }]);
        const spaces = Object.fromEntries(session.data.spaces().map((s) => [s.space, s.nodes]));
        assert.deepStrictEqual(spaces, { account: 3, [`source:${b?.key ?? ""}`]: 3 });
        assert.deepStrictEqual(session.data.ref("B-7"), { space: `source:${b?.key ?? ""}`, key: "B-7" });
        session.dispose();
    });

    it("Merge: its meeting accounts are bank A's nodes", async () => {
        const session = await bankA();
        await session.data.import(
            { type: "csv", config: { data: BANK_B }, name: "bankB.csv" },
            { mode: "merge", key: "account_id", type: "account", overlap: "merge" },
        );
        const [a, b] = session.data.sources();
        assert.deepStrictEqual(
            session.data.spaces().map((s) => [s.space, s.nodes]),
            [["account", 4]],
        );
        assert.deepStrictEqual(session.data.sourcesOf("A-2"), [a?.key, b?.key]);
        session.dispose();
    });

    it("edge-only bank B: Add meets existing keys, never asks; its own end space keeps it apart", async () => {
        const session = await bankA();
        await session.data.import(
            { type: "csv", config: { data: BANK_B_EDGES }, name: "bankB_transactions.csv" },
            {
                mode: "merge",
                edges: {
                    from: { column: "account_id", space: "account" },
                    to: { column: "merchant_id", space: "merchant" },
                    id: "txn_id",
                },
            },
        );
        assert.isUndefined(session.data.sources()[1]?.issues, "a named space never asks");
        assert.deepStrictEqual(
            Object.fromEntries(session.data.spaces().map((s) => [s.space, s.nodes])),
            { account: 4, merchant: 1 },
            "A-1 met bank A's node; B-8 is new in the same space",
        );
        await session.undo();
        await session.data.import(
            { type: "csv", config: { data: BANK_B_EDGES }, name: "bankB_transactions.csv" },
            {
                mode: "merge",
                edges: {
                    from: { column: "account_id", space: "bankB-account" },
                    to: { column: "merchant_id", space: "merchant" },
                },
            },
        );
        assert.deepStrictEqual(Object.fromEntries(session.data.spaces().map((s) => [s.space, s.nodes])), {
            account: 3,
            "bankB-account": 2,
            merchant: 1,
        });
        session.dispose();
    });

    it("Undo of a data step keeps a note written before it on a node it does not touch (adapted)", async () => {
        const session = await bankA();
        session.notes.add({ text: "watch", targets: [{ node: "A-1" }] });
        await session.data.import(
            { type: "csv", config: { data: BANK_B }, name: "bankB.csv" },
            { mode: "merge", key: "account_id", type: "other" },
        );
        await session.undo();
        assert.strictEqual(session.notes.list().length, 1);
        assert.isDefined(session.data.node("A-1"));
        session.dispose();
    });
});
