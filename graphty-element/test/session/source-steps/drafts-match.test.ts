/**
 * @file Live match counts and the value-overlap list (design 5.2) under the source-steps
 * experiment, ported from the reference model's "phase 4: live match counts from hashing two
 * columns, no build" and late findings "the staged section's meets-N and the card's Key counts".
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { phase2, refused } from "./scenario";

/** accounts.csv with a repeated key, one key in other case and one with a space in it. */
const ACCOUNTS = ["account_id,holder", "A-1,Ann", "A-2,Bob", "A-2,Bo", "A-9,Dee", "a-3,Cy", "A- 3,Cy"].join("\n");

/**
 * Stage a CSV keyed by one column.
 * @param session - The session.
 * @param data - The CSV.
 * @param name - Its name.
 * @param key - Its key column.
 * @returns The staged source's id.
 */
function stage(session: GraphSession, data: string, name: string, key: string): Promise<string> {
    return session.data.stage({ type: "csv", config: { data }, name }, { key });
}

describe("source-steps: match counts", () => {
    it("phase 4: live match counts from hashing two columns, no build and no step", async () => {
        const { session } = await phase2();
        const a = await stage(session, ACCOUNTS, "accounts.csv", "account_id");
        const history = session.history.steps.length;
        const nodes = session.data.store.getSnapshot().ids.size;
        const c = session.data.matchCounts({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        // The transactions name A-1, A-2 and A-3; accounts.csv holds A-1, A-2 (twice), A-9, a-3 and "A- 3".
        assert.strictEqual(c.matched, 2);
        assert.strictEqual(c.only1, 1, "A-3: no account row reaches it");
        assert.strictEqual(c.only2, 3, "A-9, a-3 and A- 3 name no node");
        assert.strictEqual(c.repeated1, 0);
        assert.strictEqual(c.repeated2, 1, "A-2 is held by two rows");
        assert.strictEqual(c.fanOut, 0);
        assert.strictEqual(c.textVersusNumber, 0);
        assert.strictEqual(c.moreWithIgnoreCase, 1, "a-3 meets A-3 ignoring case");
        assert.strictEqual(c.moreWithIgnoreSpaces, 1, "A- 3 meets A-3 ignoring spaces");
        assert.lengthOf(session.history.steps, history, "counting is no undo step");
        assert.strictEqual(session.data.store.getSnapshot().ids.size, nodes, "counting builds nothing");
        session.dispose();
    });

    it("a toggle that is on counts its matches and reports no more for itself", async () => {
        const { session } = await phase2();
        const a = await stage(session, ACCOUNTS, "accounts.csv", "account_id");
        const pair = { from: { source: a, field: "account_id" }, into: { space: "account" } };
        const c = session.data.matchCounts(pair, { ignoreCase: true });
        assert.strictEqual(c.matched, 3);
        assert.isNull(c.moreWithIgnoreCase);
        assert.strictEqual(c.moreWithIgnoreSpaces, 0, "A- 3 and a-3 already reach A-3: no new key");
        const both = session.data.matchCounts(pair, { ignoreCase: true, ignoreSpaces: true });
        assert.strictEqual(both.matched, 3);
        assert.strictEqual(both.only2, 1, "A-9");
        assert.isNull(both.moreWithIgnoreSpaces);
        session.dispose();
    });

    it("the staged section's meets-N and the card's Key counts (late findings)", async () => {
        const { session } = await phase2();
        const kyc = ["alert_id,account_id,score", "K-0,A-1,5", "K-1,A-1,3", "K-2,A-77,1"].join("\n");
        const k = await stage(session, kyc, "kyc.csv", "alert_id");
        // meets N: the alerts' account_id against the account space's keys.
        assert.strictEqual(
            session.data.matchCounts({ from: { source: k, field: "account_id" }, into: { space: "account" } }).matched,
            1,
        );
        // Field 1 a column of a source: two alerts name A-1, so an accounts row naming A-1 fans out.
        const a = await stage(session, ACCOUNTS, "accounts.csv", "account_id");
        const c = session.data.matchCounts({
            from: { source: a, field: "account_id" },
            into: { source: k, field: "account_id" },
        });
        assert.strictEqual(c.matched, 1);
        assert.strictEqual(c.repeated1, 1);
        assert.strictEqual(c.fanOut, 1, "one accounts row names two alerts' A-1");
        session.dispose();
    });

    it("counts text that would match as a number", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const one = await stage(session, "id,code\nx,7\ny,9", "one.csv", "id");
        const two = await stage(session, "id,code\np,007\nq,8\nr,007", "two.csv", "id");
        const c = session.data.matchCounts({
            from: { source: two, field: "code" },
            into: { source: one, field: "code" },
        });
        assert.strictEqual(c.matched, 0);
        assert.strictEqual(c.textVersusNumber, 2, "both 007 rows meet 7 only as numbers");
        session.dispose();
    });

    it("lists the values either side holds, filtered and paged", async () => {
        const { session } = await phase2();
        const a = await stage(session, ACCOUNTS, "accounts.csv", "account_id");
        const pair = { from: { source: a, field: "account_id" }, into: { space: "account" } };
        const matched = session.data.matchValues(pair, { only: "matched" });
        assert.strictEqual(matched.total, 2);
        assert.deepStrictEqual(matched.values, [
            { value: "A-2", count1: 1, count2: 2 },
            { value: "A-1", count1: 1, count2: 1 },
        ]);
        assert.deepStrictEqual(session.data.matchValues(pair, { only: "only1" }).values, [
            { value: "A-3", count1: 1, count2: 0 },
        ]);
        const page = session.data.matchValues(pair, { only: "only2", offset: 1, limit: 1 });
        assert.strictEqual(page.total, 3);
        assert.deepStrictEqual(page.values, [{ value: "a-3", count1: 0, count2: 1 }]);
        assert.strictEqual(session.data.matchValues(pair).total, 6);
        assert.strictEqual(session.data.matchValues(pair, { ignoreCase: true, ignoreSpaces: true }).total, 4);
        session.dispose();
    });

    it("a draft counts the source it staged, which the committed project does not hold", async () => {
        const { session } = await phase2();
        const d = session.data.draft();
        const a = await d.stage(
            { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
            { key: "account_id" },
        );
        const pair = { from: { source: a, field: "account_id" }, into: { space: "account" } };
        assert.strictEqual(d.matchCounts(pair).matched, 2);
        assert.strictEqual(d.matchValues(pair, { only: "only2" }).total, 3);
        await refused(() => Promise.resolve(session.data.matchCounts(pair)), "E_LOAD_UNKNOWN");
        // After a merge in the draft, every account row's key is a node of the space.
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        assert.strictEqual(d.matchCounts(pair).only2, 0);
        d.dispose();
        await refused(() => Promise.resolve(d.matchCounts(pair)), "E_BAD_COMMAND");
        session.dispose();
    });

    it("an unknown source and an edge source's unnamed end are refused", async () => {
        const { session, t } = await phase2();
        const a = await stage(session, ACCOUNTS, "accounts.csv", "account_id");
        await refused(
            () =>
                Promise.resolve(
                    session.data.matchCounts({ from: { source: "src_nope", field: "x" }, into: { space: "account" } }),
                ),
            "E_LOAD_UNKNOWN",
        );
        await refused(
            () =>
                Promise.resolve(
                    session.data.matchCounts({
                        from: { source: a, field: "account_id" },
                        into: { source: t, field: "account_id" },
                    }),
                ),
            "E_AMBIGUOUS_ID",
        );
        session.dispose();
    });

    it("with the experiment off both are refused", async () => {
        const session = createGraphSession();
        const pair = { from: { source: "src_x", field: "id" }, into: { space: "account" } };
        await refused(() => Promise.resolve(session.data.matchCounts(pair)), "E_FEATURE_OFF");
        await refused(() => Promise.resolve(session.data.matchValues(pair)), "E_FEATURE_OFF");
        session.dispose();
    });
});
