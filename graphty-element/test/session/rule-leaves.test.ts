/**
 * @file Rule leaves over edge columns and a load's source; the key columns reported on the columns a
 * load read them from; hidden key fields; year-like columns.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type RuleTree } from "../../session";
import { accountsCsv, transfersCsv } from "../helpers/fraud-fixture";

/**
 * Three companies and three payments between them.
 * @returns the session
 */
async function payments(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", name: "Acme Corp", active: true },
        { id: "b", name: "Bolt", active: false },
        { id: "c", name: "acme", active: true },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b", amount: 5, method: "wire" },
        { source: "b", target: "c", amount: 50, method: "cash" },
        { source: "a", target: "c", amount: 500, method: "wire", memo: "rent" },
    ]);
    return session;
}

/**
 * What a filter leaves showing.
 * @param session - the session
 * @param rule - the filter
 * @returns the visible node ids and the visible edges' ends
 */
async function kept(session: GraphSession, rule: RuleTree): Promise<[string[], string[]]> {
    await session.visibility.set(rule);
    const nodes = session.data
        .nodes()
        .filter((node) => session.visibility.isVisible(node.id))
        .map((node) => String(node.id));
    const edges = session.data
        .edges()
        .filter((edge) => session.visibility.isVisible(edge.id))
        .map((edge) => `${String(edge.source)}-${String(edge.target)}`);
    return [nodes, edges];
}

describe("leaves over an edge column", () => {
    it("read range, categories and text on the edges, leaving every node", async () => {
        const session = await payments();
        assert.deepEqual(await kept(session, { kind: "range", attribute: "data.amount", min: 10, max: 1000 }), [
            ["a", "b", "c"],
            ["b-c", "a-c"],
        ]);
        assert.deepEqual(await kept(session, { kind: "categories", attribute: "data.method", values: ["wire"] }), [
            ["a", "b", "c"],
            ["a-b", "a-c"],
        ]);
        assert.deepEqual(await kept(session, { kind: "text", reads: "data.memo", mode: "substring", text: "ren" }), [
            ["a", "b", "c"],
            ["a-c"],
        ]);
        session.dispose();
    });
});

describe("a source leaf on one side", () => {
    /** Ava, Ben and Cara, three friendships. */
    const FRIENDS = "source,target\nAva,Ben\nBen,Cara\nCara,Ava\n";
    /** Ava again, Dan and Eve, and a second Ava-Ben edge. */
    const MESSAGES = "source,target\nAva,Dan\nDan,Eve\nAva,Ben\n";

    /**
     * Both files, FRIENDS first.
     * @returns the session
     */
    async function both(): Promise<GraphSession> {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: FRIENDS }, name: "friends.csv" });
        await session.data.import({ type: "csv", config: { data: MESSAGES }, name: "messages.csv" }, { mode: "merge" });
        return session;
    }

    /**
     * How many nodes and edges are visible.
     * @param session - the session
     * @returns nodes, edges
     */
    const shown = (session: GraphSession): [number, number] => [
        session.visibility.summary.visibleNodes,
        session.visibility.summary.visibleEdges,
    ];

    it("on nodes, keeps every edge between the load's nodes, whichever load gave it", async () => {
        const session = await both();
        await session.visibility.set({ kind: "source", sources: ["s2"] });
        assert.deepEqual(shown(session), [4, 3], "both sides: only the load's own edges");
        await session.visibility.set({ kind: "source", sources: ["s2"], side: "nodes" });
        assert.deepEqual(shown(session), [4, 4], "nodes only: friends.csv's Ava-Ben edge stays");
        await session.visibility.set({ kind: "source", sources: ["s1"], side: "edges" });
        assert.deepEqual(shown(session), [5, 3]);
        session.dispose();
    });

    it("counts one load's shown and total elements", async () => {
        const session = await both();
        assert.deepEqual(session.visibility.summaryOf("s1"), {
            totalEdges: 3,
            totalNodes: 3,
            visibleEdges: 3,
            visibleNodes: 3,
        });
        await session.visibility.set({ kind: "source", sources: ["s2"], side: "nodes" });
        // Cara is hidden, and the two friendships that end at her.
        assert.deepEqual(session.visibility.summaryOf("s1"), {
            totalEdges: 3,
            totalNodes: 3,
            visibleEdges: 1,
            visibleNodes: 2,
        });
        assert.deepEqual(session.visibility.summaryOf("nothing"), {
            totalEdges: 0,
            totalNodes: 0,
            visibleEdges: 0,
            visibleNodes: 0,
        });
        session.dispose();
    });
});

describe("key columns", () => {
    it("are reported on the column the load read the node ids from", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({
            config: {
                nodeFile: new File([accountsCsv()], "accounts.csv"),
                edgeFile: new File([transfersCsv()], "transfers.csv"),
            },
        });
        await draft.load();
        const roles = Object.fromEntries(
            session.data.attributes().map((each) => [`${each.kind}:${each.name}`, each.roles ?? []]),
        );
        assert.deepEqual(roles["node:account"], ["key"]);
        // The edge ends are kept apart from the edge records, so `from` and `to` are no edge columns.
        assert.notProperty(roles, "edge:from");
        assert.notProperty(roles, "edge:to");
        session.dispose();
    });

    it("can be hidden when no column carries them, and stay hidden through a reload", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target,weight\na,b,1\nb,c,2\n" } });
        await session.data.setHidden(
            [
                { kind: "edge", name: "source" },
                { kind: "edge", name: "weight" },
            ],
            true,
        );
        assert.deepEqual(session.data.hiddenColumns(), [
            { kind: "edge", name: "source" },
            { kind: "edge", name: "weight" },
        ]);
        assert.isTrue(session.data.attributes().find((each) => each.name === "weight")?.hidden);

        const { text } = await session.project.save();
        const opened = createGraphSession();
        await opened.project.open(text);
        assert.deepEqual(opened.data.hiddenColumns(), session.data.hiddenColumns());

        await session.data.setHidden([{ kind: "edge", name: "source" }], false);
        assert.deepEqual(session.data.hiddenColumns(), [{ kind: "edge", name: "weight" }]);
        await session.data.setHidden([{ kind: "edge", name: "nothing" }], true).then(
            () => assert.fail("a column no record carries is refused"),
            (error: unknown) => assert.strictEqual((error as { code: string }).code, "E_UNKNOWN_ATTRIBUTE"),
        );
        session.dispose();
        opened.dispose();
    });
});

describe("year-like columns", () => {
    it("are flagged when every value is a whole number a year could be", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", founded: 1975, staff: 1200, score: 1975.5 },
            { id: "b", founded: 2001, staff: 4800, score: 2001 },
        ]);
        const flagged = session.data
            .attributes()
            .filter((each) => each.yearLike === true)
            .map((each) => each.name);
        assert.deepEqual(flagged, ["founded"]);
        session.dispose();
    });
});
