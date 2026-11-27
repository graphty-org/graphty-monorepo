/**
 * @file The columns an id space's nodes carry as a draft builds them (`draft.columns`), and joins that
 * match on one of them (`into: { space, field }`, a link's `nodes`), each value of a list apart: a
 * field an earlier card merged is matched by a later one. Each is previewed, committed, read back by
 * `steps()`, and saved and reopened as the same graph.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors/GraphtyError";
import { createGraphSession, type GraphSession, type SourceDraft } from "../../../src/session";

type Input = Parameters<GraphSession["data"]["stage"]>[0];

const csv = (name: string, ...data: string[]): Input => ({ type: "csv", config: { data: data.join("\n") }, name });

/** A1 holds d1 and d2, A2 holds D2 and d3, A3 holds d3 twice, A4 nothing. */
const IDENTIFIERS = csv(
    "identifiers.csv",
    "account,device,score",
    "A1,d1,4",
    "A1,d2,5",
    "A2,D2,6",
    "A2,d3,7",
    "A3,d3,8",
    "A3,d3,9",
);
const ACCOUNTS = csv("accounts.csv", "account,name", "A1,Ann", "A2,Bo", "A3,Cy", "A4,Di");

/**
 * Accounts with their identifiers merged on as lists, in a draft.
 * @returns The session, the draft and the sources.
 */
async function merged(): Promise<{ session: GraphSession; d: SourceDraft; ids: string; watch: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(ACCOUNTS, { key: "account", type: "account" });
    const ids = await session.data.stage(IDENTIFIERS);
    const watch = await session.data.stage(csv("watch.csv", "value,risk", "d1,high", "d3,low", "d9,none"));
    const d = session.data.draft();
    d.merge({ from: { source: ids, field: "account" }, into: { space: "account" }, aggregate: { "*": "list" } });
    return { session, d, ids, watch };
}

/**
 * The session's nodes and edges, and its steps' acts and links.
 * @param session - The session.
 * @returns Them.
 */
const now = (session: GraphSession): unknown => ({
    nodes: session.data.nodes(),
    edges: session.data.edges().map(({ id: _id, ...edge }) => edge),
    acts: session.data.steps().map((step) => [step.act, step.link]),
});

/**
 * Commit a draft, then save and reopen the project.
 * @param session - The session.
 * @param d - The draft.
 */
async function committedAndReopened(session: GraphSession, d: SourceDraft): Promise<void> {
    await d.commit();
    const { text } = await session.project.save();
    const reopened = createGraphSession({ features: ["source-steps"] });
    await reopened.project.open(text);
    assert.deepStrictEqual(now(reopened), now(session));
    reopened.dispose();
}

/**
 * The details of the refusal an act throws.
 * @param act - The act.
 * @returns The reason, or null when it is not refused.
 */
function reason(act: () => unknown): unknown {
    try {
        act();
    } catch (error) {
        return isGraphtyError(error) && error.code === "E_BAD_COMMAND" ? error.details.reason : error;
    }
    return null;
}

describe("source-steps drafts: the columns an id space's nodes carry", () => {
    it("lists them with their kinds, a merged list among them, as each step builds them", async () => {
        const { session, d } = await merged();
        assert.sameDeepMembers(
            [...d.columns("account")],
            [
                { name: "account", kind: "text", filled: 4 },
                { name: "name", kind: "text", filled: 4 },
                { name: "device", kind: "list", filled: 3 },
                { name: "score", kind: "list", filled: 3 },
            ],
        );
        assert.sameMembers(
            d.columns("account", { before: 1 }).map((each) => each.name),
            ["account", "name"],
            "before the merge",
        );
        assert.deepStrictEqual(d.columns("nowhere"), []);
        d.editStep(d.steps().length - 1, { aggregate: { "*": "max" } });
        assert.deepInclude(d.columns("account"), { name: "score", kind: "number", filled: 3 });
        d.dispose();
        assert.strictEqual(
            reason(() => d.columns("account")),
            "draft-closed",
        );
        session.dispose();
    });
});

describe("source-steps drafts: matching on a merged list", () => {
    it("counts a value against each value of the list", async () => {
        const { session, d, ids, watch } = await merged();
        const pair = { from: { source: watch, field: "value" }, into: { space: "account", field: "device" } };
        assert.deepInclude(d.matchCounts(pair), { matched: 2, only1: 2, only2: 1, repeated1: 1, fanOut: 1 });
        const { values } = d.matchValues(pair, { only: "matched" });
        assert.sameDeepMembers(
            [...values],
            [
                { value: "d3", count1: 2, count2: 1 },
                { value: "d1", count1: 1, count2: 1 },
            ],
        );
        // accounts.device = accounts.device: every value of the list meets itself.
        const self = { from: { source: ids, field: "device" }, into: pair.into };
        assert.deepInclude(d.matchCounts(self), { matched: 4, only1: 0, only2: 0 });
        assert.strictEqual(d.matchCounts(self).moreWithIgnoreCase, -1, "d2 and D2 are one value then");
        session.dispose();
    });

    it("merges a watchlist into the one account holding each value, and reads the step back", async () => {
        const { session, d, watch } = await merged();
        const options = { from: { source: watch, field: "value" }, into: { space: "account", field: "device" } };
        d.merge(options);
        const step = d.preview().steps.at(-1);
        assert.deepInclude(step?.buckets, { merged: 1, fanOut: 1, keptNew: 2 });
        const row = d.steps().at(-1);
        assert.deepStrictEqual(row?.act?.into, { space: "account", field: "device" });
        const inAccounts = d.spaces().find((each) => each.space === "account")?.nodes;
        assert.strictEqual(inAccounts, 4, "a value that is no account's key makes no account");
        // As it was read back, made again with one choice changed.
        d.replaceStep(row?.index ?? -1, { act: "merge", options: { ...options, unmatchedFrom: "drop" } });
        await committedAndReopened(session, d);
        assert.strictEqual(session.data.node("A1")?.risk, "high");
        assert.isUndefined(session.data.node("A2")?.risk, "d3 names two accounts");
        assert.strictEqual(session.data.statistics().nodeCount, 4, "under drop, the row naming two makes no node");
        session.dispose();
    });

    it("connects a watchlist row to the account holding its value, ignoring case", async () => {
        const { session, d } = await merged();
        const flags = await d.stage(csv("flags.csv", "flag,device", "F1,D1", "F2,d2", "F3,d9"), {
            key: "flag",
            type: "flag",
        });
        d.connect({
            from: { source: flags, field: "device" },
            into: { space: "account", field: "device" },
            ignoreCase: true,
        });
        // d2 is A1's, D2 is A2's: two accounts, so F2 names no one.
        assert.deepInclude(d.preview().steps.at(-1)?.buckets, { newEdges: 1, fanOut: 1, unmatched: 1 });
        assert.deepStrictEqual(d.steps().at(-1)?.act?.into, { space: "account", field: "device" });
        await committedAndReopened(session, d);
        assert.deepStrictEqual(
            session.data.edges().map((e) => [e.source, e.target]),
            [["A1", "F1"]],
        );
        session.dispose();
    });

    it("links the accounts sharing a value of the merged list (accounts.device = accounts.device)", async () => {
        const { session, d, ids } = await merged();
        d.link({ source: ids, nodes: "account", columns: ["device"], ignoreCase: true });
        assert.deepInclude(d.preview().steps.at(-1)?.buckets, { newEdges: 2, matched: 3, unmatched: 0 });
        assert.deepInclude(d.steps().at(-1)?.link, { nodes: "account", columns: ["device"], maxShared: 10 });
        assert.deepStrictEqual(d.preview().marks.edges, { merged: 0, new: 2, removed: 0 });
        assert.strictEqual(
            d.preview().rows({ step: d.steps().length - 1, bucket: "newEdges" }).total,
            2,
            "an edge read from no row is still listed",
        );
        assert.strictEqual(
            reason(() => d.link({ source: ids, nodes: "account", field: "account", columns: ["device"] })),
            "nodes",
        );
        await committedAndReopened(session, d);
        const part = session.data.steps().find((step) => step.link !== null)?.buckets?.part ?? 0;
        const lineage = session.data.lineage({ load: ids, key: `${String(part)}/A1|A2` });
        assert.deepInclude(lineage, { supplied: [ids], steps: [] }, "read from no row");
        assert.sameDeepMembers(
            session.data.edges().map((e) => [e.source, e.target, e.shared]),
            [
                ["A1", "A2", 1],
                ["A2", "A3", 1],
            ],
        );
        session.dispose();
    });

    it("links a space's nodes through a node per shared value", async () => {
        const { session, d, ids } = await merged();
        d.link({ source: ids, nodes: "account", columns: ["device"], as: "nodes", type: "device" });
        await committedAndReopened(session, d);
        assert.deepInclude(session.data.node("device:d3"), { device: "d3" });
        assert.sameDeepMembers(
            session.data.edges().map((e) => [e.source, e.target]),
            [
                ["A2", "device:d3"],
                ["A3", "device:d3"],
            ],
        );
        session.dispose();
    });

    it("refuses a column with no name, and a rename of a column a step matches on", async () => {
        const { session, d, ids, watch } = await merged();
        const from = { source: watch, field: "value" };
        assert.strictEqual(
            reason(() => {
                d.merge({ from, into: { space: "account", field: "" } });
            }),
            "no-field",
        );
        d.merge({ from, into: { space: "account", field: "device" } });
        let code = "";
        try {
            d.renameColumn({ kind: "node", name: "device" }, "gadget", { source: ids });
        } catch (error) {
            code = isGraphtyError(error) ? error.code : String(error);
        }
        assert.strictEqual(code, "E_EDIT_ROLE_COLUMN");
        session.dispose();
    });
});

describe("source-steps drafts: a list in a source's own cell", () => {
    const records = (rows: readonly object[]): Input => ({
        type: "json",
        config: { data: JSON.stringify({ nodes: rows, edges: [] }) },
        name: "rows.json",
    });

    it("matches by each of its values, with an edge to each node it names", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const cases = await session.data.stage(
            records([
                { id: "C1", accounts: ["A1", "A3"] },
                { id: "C2", accounts: ["A1"] },
                { id: "C3", accounts: [] },
            ]),
            { type: "case" },
        );
        const d = session.data.draft();
        const pair = { from: { source: cases, field: "accounts" }, into: { space: "account" } };
        assert.deepInclude(d.matchCounts(pair), { matched: 2, only1: 2, only2: 0 });
        d.connect(pair);
        assert.deepInclude(d.preview().steps.at(-1)?.buckets, { newEdges: 3, matched: 2, emptyKey: 1 });
        await committedAndReopened(session, d);
        assert.sameDeepMembers(
            session.data.edges().map((e) => [e.source, e.target]),
            [
                ["A1", "C1"],
                ["A3", "C1"],
                ["A1", "C2"],
            ],
        );
        session.dispose();
    });

    it("keeps a row naming several nodes as one node between them", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const cases = await session.data.stage(records([{ id: "C1", accounts: ["A1", "A3"], owner: ["A2", "A4"] }]), {
            type: "case",
        });
        const d = session.data.draft();
        const into = { space: "account" };
        d.connect({ from: { source: cases, field: "accounts" }, into, to: { field: "owner", into, keepRow: true } });
        assert.deepInclude(d.preview().steps.at(-1)?.buckets, { newEdges: 4, newNodes: 1 });
        await committedAndReopened(session, d);
        session.dispose();
    });
});
