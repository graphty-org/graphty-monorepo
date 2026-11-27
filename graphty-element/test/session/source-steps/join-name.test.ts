/**
 * @file A join's name (`SourceJoinTag.name`): `draft.renameJoin` sets or clears it on every step the join
 * wrote as one undo step, and the name survives a commit, a save and a reopen, a rewrite of the join and
 * a source taken out of it.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import type { SourceJoinTag } from "../../../src/session/types";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

interface Opened {
    session: GraphSession;
    accounts: string;
    ids: string;
    watch: string;
    join: SourceJoinTag;
}

/**
 * Accounts in the graph, then identifiers and a watchlist waiting, and a two-match join of them.
 * @returns The session, each file's key and the join.
 */
async function opened(): Promise<Opened> {
    const session = createGraphSession({ features: ["source-steps"] });
    const accounts = await session.data.stage(csv("accounts.csv", "account,name", "A1,a", "A2,b", "A3,c"), {
        key: "account",
    });
    await session.data.add(accounts);
    const ids = await session.data.stage(csv("ids.csv", "id,account_id,phone", "I1,A1,p1", "I2,A2,p2", "I3,A3,p3"), {
        key: "id",
    });
    const watch = await session.data.stage(csv("watch.csv", "value,risk", "p1,high", "p3,mid"), { key: "value" });
    const join: SourceJoinTag = {
        id: "join-1",
        matches: [
            { a: { source: watch, field: "value" }, b: { source: ids, field: "phone" } },
            { a: { source: ids, field: "account_id" }, b: { source: accounts } },
        ],
    };
    return { session, accounts, ids, watch, join };
}

const names = (rows: readonly { readonly join?: SourceJoinTag; readonly op: string }[]): unknown[] =>
    rows.filter((row) => row.op !== "join.add").map((row) => row.join?.name);

describe("a join's name", () => {
    it("is set on every step of the join, undone in one step, cleared by null, and saved", async () => {
        const { session, accounts, ids, watch, join } = await opened();
        const draft = session.data.draft();
        draft.merge({ from: { source: ids, field: "account_id" }, into: { source: accounts }, join });
        draft.merge({ from: { source: watch, field: "value" }, into: { source: ids, field: "phone" }, join });

        draft.renameJoin("join-1", "Risky accounts");
        assert.deepStrictEqual(names(draft.steps()), ["Risky accounts", "Risky accounts"]);
        draft.renameJoin("join-1", "Watched");
        draft.undo();
        assert.deepStrictEqual(names(draft.steps()), ["Risky accounts", "Risky accounts"], "one undo step");
        draft.renameJoin("join-1", null);
        assert.deepStrictEqual(names(draft.steps()), [undefined, undefined], "null clears it");
        assert.isFalse(
            draft.steps().some((row) => row.join !== undefined && "name" in row.join),
            "no name key is left",
        );
        draft.renameJoin("join-1", "Risky accounts");
        await draft.commit();
        assert.deepStrictEqual(names(session.data.steps()), ["Risky accounts", "Risky accounts"], "committed");

        const { text } = await session.project.save();
        session.dispose();
        const again = createGraphSession({ features: ["source-steps"] });
        await again.project.open(text);
        assert.deepStrictEqual(names(again.data.steps()), ["Risky accounts", "Risky accounts"], "reopened");
        again.dispose();
    });

    it("refuses a join id no step carries", async () => {
        const { session } = await opened();
        const draft = session.data.draft();
        assert.throws(() => draft.renameJoin("nope", "x"), /join/);
        try {
            draft.renameJoin("nope", "x");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_BAD_COMMAND");
        }
        session.dispose();
    });

    it("refuses a saved name that is not text", async () => {
        const { session, accounts, ids, join } = await opened();
        const draft = session.data.draft();
        draft.merge({ from: { source: ids, field: "account_id" }, into: { source: accounts }, join });
        draft.renameJoin("join-1", "Named");
        await draft.commit();
        const { text } = await session.project.save();
        session.dispose();
        assert.include(text, '"name":"Named"');
        const bad = text.replace('"name":"Named"', '"name":5');
        const again = createGraphSession({ features: ["source-steps"] });
        let refused = false;
        try {
            await again.project.open(bad);
            refused = !again.data.steps().some((row) => row.join?.id === "join-1");
        } catch {
            refused = true;
        }
        assert.isTrue(refused, "a non-text name is not read back");
        again.dispose();
    });

    it("survives a rewrite of the join's step and a source taken out of the join", async () => {
        const { session, accounts, ids, watch, join } = await opened();
        const named: SourceJoinTag = { ...join, name: "Risky accounts" };
        const draft = session.data.draft();
        draft.merge({ from: { source: ids, field: "account_id" }, into: { source: accounts }, join: named });
        draft.merge({ from: { source: watch, field: "value" }, into: { source: ids, field: "phone" }, join: named });
        const at = draft.steps().findIndex((row) => row.op === "join.merge");
        draft.replaceStep(at, {
            act: "merge",
            options: { from: { source: ids, field: "account_id" }, into: { source: accounts }, join: named },
        });
        assert.deepStrictEqual(names(draft.steps()), ["Risky accounts", "Risky accounts"], "rewritten");
        await draft.commit();

        const again = session.data.draft();
        again.removeSource(watch, { adds: "remove" });
        assert.deepStrictEqual(names(again.steps()), ["Risky accounts"], "pruned to one match");
        again.dispose();
        session.dispose();
    });
});
