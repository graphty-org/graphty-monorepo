/**
 * @file The join a step was written as (`SourceJoinTag`): the steps one join wrote read it back the same, in the
 * draft, after a commit, and after a save and a reopen, with its matches in the order given.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import type { SourceJoinTag } from "../../../src/session/types";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

/**
 * Accounts in the graph, then identifiers and a watchlist waiting.
 * @returns The session and each file's key.
 */
async function opened(): Promise<{ session: GraphSession; accounts: string; ids: string; watch: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    const accounts = await session.data.stage(csv("accounts.csv", "account,name", "A1,a", "A2,b", "A3,c"), {
        key: "account",
    });
    await session.data.add(accounts);
    const ids = await session.data.stage(csv("ids.csv", "id,account_id,phone", "I1,A1,p1", "I2,A2,p2", "I3,A3,p3"), {
        key: "id",
    });
    const watch = await session.data.stage(csv("watch.csv", "value,risk", "p1,high", "p3,mid"), { key: "value" });
    return { session, accounts, ids, watch };
}

describe("the join a step was written as", () => {
    it("reads back on every step one join wrote, after a commit and after a save and a reopen", async () => {
        const { session, accounts, ids, watch } = await opened();
        const join: SourceJoinTag = {
            id: "join-1",
            matches: [
                { a: { source: watch, field: "value" }, b: { source: ids, field: "phone" } },
                { a: { source: ids, field: "account_id" }, b: { source: accounts } },
            ],
        };
        const draft = session.data.draft();
        draft.merge({ from: { source: ids, field: "account_id" }, into: { source: accounts }, join });
        draft.merge({ from: { source: watch, field: "value" }, into: { source: ids, field: "phone" }, join });
        const tagged = (rows: readonly { readonly join?: SourceJoinTag; readonly op: string }[]): unknown[] =>
            rows.filter((row) => row.op !== "join.add").map((row) => row.join);
        assert.deepStrictEqual(tagged(draft.steps()), [join, join]);
        assert.isTrue(
            draft.steps().every((row) => row.op !== "join.add" || row.join === undefined),
            "a source a join adds carries none",
        );
        await draft.commit();
        assert.deepStrictEqual(tagged(session.data.steps()), [join, join], "committed");

        const { text } = await session.project.save();
        session.dispose();
        const again = createGraphSession({ features: ["source-steps"] });
        await again.project.open(text);
        assert.deepStrictEqual(tagged(again.data.steps()), [join, join], "reopened");
    });

    it("a step made again in its place takes the join the act gives, and a step given none has none", async () => {
        const { session, accounts, ids } = await opened();
        const draft = session.data.draft();
        draft.merge({ from: { source: ids, field: "account_id" }, into: { source: accounts } });
        const at = draft.steps().findIndex((row) => row.op === "join.merge");
        assert.isUndefined(draft.steps()[at]?.join);
        const join: SourceJoinTag = {
            id: "join-2",
            matches: [{ a: { source: ids, field: "account_id" }, b: { source: accounts } }],
        };
        draft.replaceStep(at, {
            act: "merge",
            options: { from: { source: ids, field: "account_id" }, into: { source: accounts }, join },
        });
        assert.deepStrictEqual(draft.steps()[at]?.join, join);
    });

    it("a source taken out leaves the join's other steps without its matches", async () => {
        const { session, accounts, ids, watch } = await opened();
        const join: SourceJoinTag = {
            id: "join-3",
            matches: [
                { a: { source: watch, field: "value" }, b: { source: ids, field: "phone" } },
                { a: { source: ids, field: "account_id" }, b: { source: accounts } },
            ],
        };
        const draft = session.data.draft();
        draft.merge({ from: { source: ids, field: "account_id" }, into: { source: accounts }, join });
        draft.merge({ from: { source: watch, field: "value" }, into: { source: ids, field: "phone" }, join });
        await draft.commit();

        const again = session.data.draft();
        again.removeSource(watch, { adds: "remove" });
        const left = again.steps().filter((row) => row.op !== "join.add");
        assert.deepStrictEqual(
            left.map((row) => row.join),
            [{ id: "join-3", matches: [join.matches[1]] }],
            "only the match the step still makes",
        );
        await again.commit();
        const named = session.data
            .steps()
            .flatMap((row) => row.join?.matches ?? [])
            .flatMap((match) => [match.a, match.b]);
        assert.isFalse(
            named.some((side) => "source" in side && side.source === watch),
            "no match names the source taken out",
        );
    });
});
