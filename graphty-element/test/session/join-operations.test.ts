/**
 * @file The join operations beyond values and edges: aggregating repeated keys and repeated
 * pairs (`JoinChoices.aggregate`), linking nodes that share a value (`shape: "link"`), and merging
 * a table's rows into the nodes they name on a non-id key (`shape: "merge"`).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/** Forty suppliers, S0 to S39, named "Supplier 0" to "Supplier 39". */
const SUPPLIERS = [
    "id,name,tier",
    ...Array.from({ length: 40 }, (_unused, at) => `S${String(at)},Supplier ${String(at)},${String(at % 3)}`),
].join("\n");

/**
 * A session holding the suppliers.
 * @returns the session
 */
async function suppliers(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "csv", config: { data: SUPPLIERS }, name: "suppliers.csv" });
    return session;
}

/**
 * Prepare a table onto the graph.
 * @param session - the session
 * @param name - the table's name
 * @param data - its CSV text
 * @returns the draft
 */
function table(session: GraphSession, name: string, data: string): ReturnType<GraphSession["data"]["prepare"]> {
    return session.data.prepare({ config: { data }, name }, { onto: "graph" });
}

describe("JoinChoices.aggregate", () => {
    it("reduces a key's rows to one value per node, and takes it back as one step", async () => {
        const session = await suppliers();
        const draft = await table(session, "orders.csv", "supplier,amount\nS1,1\nS1,2\nS1,4\nS2,5\nS2,\nNOPE,9\n");
        const keys = [{ file: "supplier", graph: "id" }];
        const shape = "node-values";
        const report = draft.joinReport({ keys, shape, aggregate: { amount: "sum" } });
        assert.deepEqual(report.rowFates, ["joined", "joined", "joined", "joined", "joined", "left-out"]);
        assert.deepInclude(report, { matched: 2, repeatedKeys: 2 });

        await draft.load({ join: { keys, shape, aggregate: { amount: ["count", "sum", "max", "list"] } } });
        assert.deepInclude(session.data.node("S1"), {
            "amount (count)": 3,
            "amount (sum)": 7,
            "amount (max)": 4,
            "amount (list)": [1, 2, 4],
        });
        assert.strictEqual(session.data.node("S2")?.["amount (count)"], 1, "a blank value is not counted");

        await session.undo();
        assert.isUndefined(session.data.node("S1")?.["amount (sum)"]);
        assert.deepEqual(session.data.joins(), []);
        session.dispose();
    });

    it("reads a column given no reduction as its first value", async () => {
        const session = await suppliers();
        const draft = await table(session, "orders.csv", "supplier,amount,note\nS1,1,a\nS1,2,b\n");
        await draft.load({
            join: { keys: [{ file: "supplier", graph: "id" }], shape: "node-values", aggregate: { amount: "mean" } },
        });
        assert.deepInclude(session.data.node("S1"), { amount: 1.5, note: "a" });
        session.dispose();
    });

    it("makes one edge per pair with its rows' count, first and last", async () => {
        const session = await suppliers();
        const events = "from,to,time\nS1,S2,t1\nS1,S2,t3\nS1,S2,t2\nS2,S3,t5\n";
        const draft = await table(session, "door-entries.csv", events);
        const keys = [
            { file: "from", graph: "id" },
            { file: "to", graph: "id" },
        ];
        const aggregate = { time: ["count", "first", "last"] } as const;
        const report = draft.joinReport({ keys, aggregate });
        assert.deepInclude(report, { newEdges: 2, matched: 4, repeatedKeys: 1 });
        assert.deepEqual(report.rowFates, ["joined", "joined", "joined", "joined"]);

        await draft.load({ join: { keys, aggregate } });
        const edges = session.data.edges();
        assert.lengthOf(edges, 2);
        const pair = edges.find((edge) => edge.source === "S1" && edge.target === "S2");
        assert.deepInclude(pair, { "time (count)": 3, "time (first)": "t1", "time (last)": "t2" });
        session.dispose();
    });
});

/**
 * Identifiers per account: S0, S1 and S2 share phone p1, S0 and S1 device d1, S3 and S4 phone p2;
 * S5 holds a phone no one else does; twelve accounts (S10 to S21) share the hub phone pH; NOPE is
 * no account.
 */
const IDENTIFIERS = [
    "account,phone,device",
    "S0,p1,d1",
    "S1,p1,d1",
    "S2,p1,d9",
    "S3,p2,",
    "S4,p2,",
    "S5,p5,",
    ...Array.from({ length: 12 }, (_unused, at) => `S${String(at + 10)},pH,`),
    "NOPE,p1,",
].join("\n");

describe("joining by a shared value (shape: link)", () => {
    const keys = [{ file: "account", graph: "id" }];
    const link = { columns: ["phone", "device"] };

    it("counts the pairs a shared value links, the hubs it skips and the pairs below the minimum", async () => {
        const session = await suppliers();
        const draft = await table(session, "account-identifiers.csv", IDENTIFIERS);
        const report = draft.joinReport({ keys, shape: "link", link });
        // p1 links S0-S1, S0-S2, S1-S2; d1 links S0-S1 again; p2 links S3-S4.
        assert.deepInclude(report, {
            pairsLinked: 4,
            valuesOverCap: 1,
            pairsBelowMin: 0,
            newEdges: 4,
            newNodes: 0,
            notInGraph: 1,
        });
        assert.deepEqual(report.rowFates.slice(0, 7), [
            "linked",
            "linked",
            "linked",
            "linked",
            "linked",
            "left-out",
            "over-cap",
        ]);
        assert.strictEqual(report.rowFates.at(-1), "left-out");

        assert.deepInclude(draft.joinReport({ keys, shape: "link", link: { ...link, minShared: 2 } }), {
            pairsLinked: 1,
            pairsBelowMin: 3,
            newEdges: 1,
        });
        assert.deepInclude(draft.joinReport({ keys, shape: "link", link: { ...link, maxShared: 20 } }), {
            valuesOverCap: 0,
            pairsLinked: 4 + 66,
        });
        session.dispose();
    });

    it("adds one edge per linked pair carrying how many values it shares, removed with its join", async () => {
        const session = await suppliers();
        const draft = await table(session, "account-identifiers.csv", IDENTIFIERS);
        await draft.load({ join: { keys, shape: "link", link: { ...link, kind: "shares" } } });
        const edges = session.data.edges();
        assert.lengthOf(edges, 4);
        const pair = edges.find((edge) => edge.source === "S0" && edge.target === "S1");
        assert.deepInclude(pair, { shared: 2, kind: "shares" });
        const [join] = session.data.joins();
        assert.strictEqual(join.shape, "link");
        assert.strictEqual(session.data.nodes().length, 40);

        await session.data.removeSource(join.source);
        assert.lengthOf(session.data.edges(), 0);
        assert.deepEqual(session.data.joins(), []);
        session.dispose();
    });

    it("adds one node per shared value, linked to each holder", async () => {
        const session = await suppliers();
        const draft = await table(session, "account-identifiers.csv", IDENTIFIERS);
        const choices = { keys, shape: "link" as const, link: { ...link, as: "nodes" as const } };
        assert.deepInclude(draft.joinReport(choices), { newNodes: 3, newEdges: 7 });
        await draft.load({ join: choices });
        assert.strictEqual(session.data.nodes().length, 43);
        assert.deepInclude(session.data.node("phone:p1"), { kind: "phone", phone: "p1" });
        assert.lengthOf(
            session.data.edges().filter((edge) => edge.target === "phone:p1"),
            3,
        );

        await session.undo();
        assert.strictEqual(session.data.nodes().length, 40);
        assert.lengthOf(session.data.edges(), 0);
        session.dispose();
    });

    it("refuses a link column the table lacks", async () => {
        const session = await suppliers();
        const draft = await table(session, "account-identifiers.csv", IDENTIFIERS);
        assert.throws(() => draft.joinReport({ keys, shape: "link", link: { columns: ["email"] } }), /email/);
        assert.throws(() => draft.joinReport({ keys, shape: "link" }), /link/);
        session.dispose();
    });
});

/** Suppliers as a second system lists them: two named as the graph names them, one it lacks. */
const ERP = 'erpId,name,rating\nE1,Supplier 1,A\nE2,"supplier 2 ",B\nE3,Acme,C\nE3b,Acme,D\n';

describe("merging a table into the nodes it names (shape: merge)", () => {
    const keys = [{ file: "name", graph: "data.name" }];
    const choices = { keys, shape: "merge" as const, ignoreCase: true, ignoreSpaces: true };

    it("counts what merges, what only the table has and what only the graph has", async () => {
        const session = await suppliers();
        const draft = await table(session, "suppliers-erp.csv", ERP);
        const report = draft.joinReport(choices);
        assert.deepInclude(report, { merged: 2, matched: 2, onlyFrom: 1, onlyOnto: 38, newNodes: 1, fanOut: 0 });
        assert.deepEqual(report.rowFates, ["merged", "merged", "new-end", "repeat"]);
        assert.deepInclude(draft.joinReport({ ...choices, unmatchedFrom: "drop" }), { newNodes: 0, onlyFrom: 1 });
        assert.deepEqual(draft.joinReport({ ...choices, unmatchedFrom: "drop" }).rowFates, [
            "merged",
            "merged",
            "left-out",
            "left-out",
        ]);
        session.dispose();
    });

    it("fuses matched rows into their nodes, adds the rest as nodes, and splits back on removal", async () => {
        const session = await suppliers();
        const draft = await table(session, "suppliers-erp.csv", ERP);
        await draft.load({ join: choices });
        assert.deepInclude(session.data.node("S1"), { rating: "A", erpId: "E1", name: "Supplier 1" });
        assert.strictEqual(session.data.node("S2")?.rating, "B");
        assert.deepInclude(session.data.node("Acme"), { name: "Acme", rating: "C", erpId: "E3" });
        assert.strictEqual(session.data.nodes().length, 41);
        const [graph, joined] = session.data.sources();
        assert.deepEqual(session.data.sourcesOf("S1"), [graph.key, joined.key], "a merged node belongs to both");
        assert.deepEqual(session.data.sourcesOf("Acme"), [joined.key]);
        assert.strictEqual(session.data.joins()[0].shape, "merge");

        await session.data.removeSource(joined.key);
        assert.strictEqual(session.data.nodes().length, 40);
        assert.isUndefined(session.data.node("S1")?.rating);
        assert.strictEqual(session.data.node("S1")?.name, "Supplier 1");

        await session.undo();
        assert.strictEqual(session.data.nodes().length, 41);
        assert.strictEqual(session.data.node("S1")?.rating, "A");
        session.dispose();
    });

    it("keeps a clashing column both ways by default, and survives a save and an open", async () => {
        const session = await suppliers();
        const draft = await table(session, "suppliers-erp.csv", "name,tier\nSupplier 1,gold\nAcme,silver\n");
        await draft.load({ join: { keys, shape: "merge" } });
        assert.deepInclude(session.data.node("S1"), { tier: 1, "tier (suppliers-erp.csv)": "gold" });
        assert.strictEqual(session.data.node("Acme")?.tier, "silver", "a new node has nothing to clash with");
        const { text } = await session.project.save();
        session.dispose();

        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        const [join] = reopened.data.joins();
        assert.strictEqual(join.shape, "merge");
        await reopened.data.editJoin(join.source, { ...join.choices, clash: { tier: "overwrite" } });
        assert.strictEqual(reopened.data.node("S1")?.tier, "gold");
        assert.strictEqual(reopened.data.nodes().length, 41);
        reopened.dispose();
    });
});
