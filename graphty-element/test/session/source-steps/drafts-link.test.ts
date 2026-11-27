/**
 * @file Linking nodes whose rows share a value (`draft.link`): as edges between them, capped by how
 * many nodes hold a value and how many values a pair shares, or as one node per value. Each is
 * previewed, committed, read back by `steps()`, edited, undone, and saved and reopened as the same
 * graph.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors/GraphtyError";
import { createGraphSession, type GraphSession, type SourceDraft } from "../../../src/session";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

/** A1 and A2 share a phone and a device, A2 and A3 a device; three hold the email; A5 shares nothing. */
const ACCOUNTS = csv(
    "accounts.csv",
    "account,phone,device,email",
    "A1,555,d1,team@x",
    "A2,555,d1,team@x",
    "A3,777,D1,team@x",
    "A4,,d4,",
    "A5,999,d5,solo@x",
);

/**
 * The accounts in a draft of their own.
 * @returns The session, the draft and the accounts' key.
 */
async function opened(): Promise<{ session: GraphSession; d: SourceDraft; accounts: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    const d = session.data.draft();
    const accounts = await d.stage(ACCOUNTS, { key: "account", type: "account" });
    return { session, d, accounts };
}

/**
 * Each edge as `<source>-<target>` and its shared count, sorted.
 * @param session - The session.
 * @returns The edges.
 */
const drawn = (session: GraphSession): string[] =>
    session.data
        .edges()
        .map(
            (e) =>
                `${String(e.source)}-${String(e.target)}${typeof e.shared === "number" ? ` ${String(e.shared)}` : ""}`,
        )
        .sort();

/**
 * The graph and the links its steps read back.
 * @param session - The session.
 * @returns The edges, the nodes and the links.
 */
const now = (session: GraphSession): { edges: string[]; nodes: string[]; links: unknown[] } => ({
    edges: drawn(session),
    nodes: session.data
        .nodes()
        .map((n) => String(n.id))
        .sort(),
    links: session.data.steps().map((row) => row.link),
});

/**
 * The graph after a save and an open, as `now` reads it.
 * @param session - The session.
 * @returns The reopened graph.
 */
async function reopened(session: GraphSession): Promise<ReturnType<typeof now>> {
    const { text } = await session.project.save();
    const other = createGraphSession({ features: ["source-steps"] });
    const report = await other.project.open(text);
    assert.deepStrictEqual(report.problems, []);
    const out = now(other);
    other.dispose();
    return out;
}

/**
 * The reason of the `E_BAD_COMMAND` a call throws.
 * @param call - The call.
 * @returns The reason.
 */
function reason(call: () => unknown): unknown {
    try {
        call();
    } catch (error) {
        if (isGraphtyError(error) && error.code === "E_BAD_COMMAND") {
            return error.details.reason;
        }
        throw error;
    }
    return assert.fail("nothing was refused");
}

describe("source-steps drafts: link", () => {
    it("links each pair of nodes sharing a value once, with the count it shares", async () => {
        const { session, d, accounts } = await opened();
        const part = d.link({ source: accounts, columns: ["phone", "device"], edgeType: "shares" });
        assert.deepStrictEqual(
            d.steps().map((row) => row.op),
            ["join.add", "join.edges"],
            "the staged accounts are added first",
        );
        const row = d.preview().steps[1];
        assert.deepInclude(row?.buckets, {
            part,
            newEdges: 1,
            newNodes: 0,
            matched: 2,
            unmatched: 3,
            pairsBelowMin: 0,
        });
        assert.deepStrictEqual(d.preview().marks.edges, { merged: 0, new: 1, removed: 0 });
        assert.strictEqual(row?.act, null, "no Merge or Connect made it");
        assert.deepStrictEqual(row?.link, {
            source: accounts,
            columns: ["phone", "device"],
            as: "edges",
            maxShared: 10,
            minShared: 1,
            edgeType: "shares",
            ignoreCase: false,
            ignoreSpaces: false,
        });
        assert.deepStrictEqual(row?.reads, ["phone", "device"]);
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["A1-A2 2"]);
        assert.deepStrictEqual(
            session.data.values({ load: accounts, key: `${String(part)}/A1|A2` }, "shared")?.shown,
            2,
        );
        assert.lengthOf(session.data.nodes(), 5);
        assert.deepStrictEqual(await reopened(session), now(session));
        const made = now(session);
        await session.undo();
        assert.lengthOf(session.data.nodes(), 0, "one undo step takes back the link and the add");
        await session.redo();
        assert.deepStrictEqual(now(session), made);
        session.dispose();
    });

    it("leaves out a value more nodes hold than the hub cap, and a pair sharing too few", async () => {
        const { session, d, accounts } = await opened();
        d.link({ source: accounts, columns: ["phone", "device", "email"], maxShared: 2, ignoreCase: true });
        const [, row] = d.preview().steps;
        assert.deepStrictEqual(
            row?.buckets?.hub,
            [
                { value: "d1", rows: 3 },
                { value: "team@x", rows: 3 },
            ],
            "three accounts hold each: the device whatever its case",
        );
        assert.deepInclude(
            d.preview().issues.map((each) => each.code),
            "W_VALUE_HUB",
        );
        assert.strictEqual(row?.buckets?.newEdges, 1, "only the phone links");
        const at = row?.index ?? -1;
        d.editStep(at, { maxShared: 3, minShared: 2 });
        assert.deepInclude(d.steps()[at]?.link, { maxShared: 3, minShared: 2 });
        assert.deepInclude(d.steps()[at]?.buckets, { newEdges: 3, pairsBelowMin: 0, hub: [] });
        d.editStep(at, { minShared: 3 });
        assert.deepInclude(d.steps()[at]?.buckets, { newEdges: 1, pairsBelowMin: 2 });
        assert.deepStrictEqual(
            d
                .preview()
                .rows({ step: at, bucket: "pairsBelowMin" })
                .rows.map((each) => each.key),
            ["A1|A3", "A2|A3"],
        );
        d.undo();
        assert.strictEqual(d.steps()[at]?.buckets?.newEdges, 3);
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["A1-A2 3", "A1-A3 2", "A2-A3 2"]);
        session.dispose();
    });

    it("links the nodes a field names when the values are in rows of their own", async () => {
        const { session, d, accounts } = await opened();
        const ids = await d.stage(
            csv(
                "ids.csv",
                "acct,kind,value",
                "a1,phone,1",
                "A2,phone,1",
                "A2,device,2",
                "A3,device,2",
                "A9,device,2",
                ",phone,1",
            ),
        );
        d.link({ source: ids, field: "acct", into: { source: accounts }, columns: ["value"], ignoreCase: true });
        const row = d.preview().steps.at(-1);
        assert.strictEqual(d.steps()[0]?.source, accounts, "the staged accounts are added, the value rows are not");
        assert.lengthOf(d.steps(), 2);
        assert.deepInclude(row?.buckets, { newEdges: 2, newNodes: 0, matched: 4, unmatched: 1, emptyKey: 1 });
        assert.deepInclude(row?.link, { source: ids, field: "acct", into: { space: "account" } });
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["A1-A2 1", "A2-A3 1"]);
        assert.deepStrictEqual(await reopened(session), now(session));
        session.dispose();
    });

    it("translates a field through the column of the source that names its nodes", async () => {
        const { session, d, accounts } = await opened();
        const ids = await d.stage(csv("ids.csv", "phone,ip", "999,10.0.0.1", "777,10.0.0.1"));
        const options = { source: ids, field: "phone", into: { source: accounts, field: "phone" }, columns: ["ip"] };
        d.link(options);
        assert.deepInclude(d.steps().at(-1)?.link, { ...options, into: { ...options.into, space: "account" } });
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["A3-A5 1"]);
        session.dispose();
    });

    it("as nodes: one node per shared value, with an edge from each node holding it", async () => {
        const { session, d, accounts } = await opened();
        const part = d.link({
            source: accounts,
            columns: ["phone", "device"],
            as: "nodes",
            type: "shared",
            edgeType: "has",
        });
        assert.deepInclude(d.steps()[1]?.buckets, { newNodes: 2, newEdges: 4, matched: 2 });
        assert.deepInclude(d.steps()[1]?.link, { as: "nodes", type: "shared", space: "shared", edgeType: "has" });
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["A1-device:d1", "A1-phone:555", "A2-device:d1", "A2-phone:555"]);
        assert.strictEqual(session.data.node("phone:555")?.phone, 555);
        assert.strictEqual(session.data.lineage({ space: "shared", key: "device:d1" })?.type, "shared");
        assert.isNotNull(session.data.lineage({ load: accounts, key: `${String(part)}/A1|phone:555` }));
        assert.deepStrictEqual(await reopened(session), now(session));

        // A later merge of the accounts folds accounts, never the value nodes their rows named.
        const crm = session.data.draft();
        const people = await crm.stage(csv("crm.csv", "id,name", "A1,Ann"), { key: "id", type: "person" });
        crm.add(people);
        crm.merge({ from: { source: accounts, field: "account" }, into: { space: "person" } });
        assert.deepInclude(crm.steps().at(-1)?.buckets, { merged: 1, keptNew: 4 });
        crm.dispose();
        session.dispose();
    });

    it("links edge rows: the nodes an end names, or with no field the node each row becomes", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const d = session.data.draft();
        const calls = await d.stage(csv("calls.csv", "a,b,tower", "P1,P2,t1", "P3,P4,t1", "P1,P5,t1"), {
            edges: { from: { column: "a", space: "person" }, to: { column: "b", space: "person" } },
            type: "call",
        });
        d.add(calls);
        d.link({ source: calls, field: "a", columns: ["tower"] });
        assert.deepInclude(d.steps().at(-1)?.link, { field: "a", into: { space: "person" } });
        assert.deepInclude(d.steps().at(-1)?.buckets, { newNodes: 0, newEdges: 1, matched: 3 });
        d.replaceStep(1, { act: "link", options: { source: calls, columns: ["tower"] } });
        assert.lengthOf(d.steps(), 2);
        assert.deepInclude(d.steps()[1]?.buckets, { newNodes: 3, newEdges: 3 });
        await d.commit();
        assert.lengthOf(session.data.nodes(), 8);
        assert.deepStrictEqual(await reopened(session), now(session));
        session.dispose();
    });

    it("takes a Connect's place and gives it back, and leaves with its source", async () => {
        const { session, d, accounts } = await opened();
        d.link({ source: accounts, columns: ["phone"] });
        const ids = await d.stage(csv("ids.csv", "id,acct", "I1,A1", "I2,A1"), { key: "id" });
        d.connect({ from: { source: ids, field: "acct" }, into: { space: "account" } });
        const at = d.steps().length - 1;
        d.replaceStep(at, { act: "link", options: { source: ids, columns: ["acct"] } });
        assert.deepInclude(d.steps()[at], { op: "join.edges", act: null });
        assert.strictEqual(d.steps()[at]?.buckets?.newEdges, 1);
        const link = d.steps()[at]?.link;
        assert.isNotNull(link ?? null);
        if (link !== null && link !== undefined) {
            d.replaceStep(at, { act: "link", options: { ...link, minShared: 2 } });
        }
        assert.strictEqual(d.steps()[at]?.buckets?.pairsBelowMin, 1);
        d.replaceStep(at, {
            act: "connect",
            options: { from: { source: ids, field: "acct" }, into: { space: "account" } },
        });
        assert.strictEqual(d.steps()[at]?.act?.act, "connect");
        assert.isNull(d.steps()[at]?.link ?? null);
        d.removeSource(ids);
        d.removeStep(1);
        assert.lengthOf(d.steps(), 1);
        await d.commit();
        assert.lengthOf(session.data.edges(), 0);
        session.dispose();
    });

    it("holds its columns: a rename is refused, and a refresh without one holds the step", async () => {
        const { session, d, accounts } = await opened();
        d.link({ source: accounts, columns: ["phone"] });
        assert.throws(() => {
            d.renameColumn({ kind: "node", name: "phone" }, "tel", { source: accounts });
        }, /E_EDIT_ROLE_COLUMN/);
        await d.commit();
        await session.data.replaceSource(accounts, csv("accounts.csv", "account,device", "A1,d1", "A2,d1"));
        const step = session.data.steps()[1];
        assert.deepStrictEqual(
            step?.missing.map((each) => (each.code === "E_COLUMN_MISSING" ? each.params.column : each.code)),
            ["phone"],
        );
        assert.isTrue(step?.held);
        session.dispose();
    });

    it("refuses what it cannot link, with a reason", async () => {
        const { session, d, accounts } = await opened();
        assert.strictEqual(
            reason(() => d.link({ source: accounts, columns: [] })),
            "no-columns",
        );
        assert.strictEqual(
            reason(() => d.link({ source: accounts, columns: ["phone"], into: { space: "account" } })),
            "no-field",
        );
        assert.strictEqual(
            reason(() => d.link({ source: accounts, columns: ["phone"], maxShared: 1 })),
            "max-shared",
        );
        assert.strictEqual(
            reason(() => d.link({ source: accounts, columns: ["phone"], minShared: 0 })),
            "min-shared",
        );
        assert.lengthOf(d.steps(), 0, "a refused link adds nothing");
        d.link({ source: accounts, columns: ["phone"] });
        assert.strictEqual(
            reason(() => {
                d.editStep(1, { maxShared: 0 });
            }),
            "max-shared",
        );
        assert.strictEqual(
            reason(() => {
                d.editStep(0, { minShared: 2 });
            }),
            "link",
        );
        session.dispose();
    });
});
