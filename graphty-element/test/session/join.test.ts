/**
 * @file Joining a table onto the graph: `data.prepare(source, { onto: "graph" })`,
 * `draft.suggestJoin()`, `draft.joinReport()`, `draft.load({ join })`, `data.joins()`,
 * `data.editJoin()`, and `LoadChoices.existing`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** Sixty gene symbols around TP53: TP53, then G02 to G60. */
const SYMBOLS = ["TP53", ...Array.from({ length: 59 }, (_unused, at) => `G${String(at + 2).padStart(2, "0")}`)];

/** 120 interactions: each symbol with the next one and the one after it, around the ring. */
const INTERACTIONS = [
    "bait\tprey\tconfidence",
    ...SYMBOLS.flatMap((symbol, at) => [
        `${symbol}\t${SYMBOLS[(at + 1) % 60]}\t0.9`,
        `${symbol}\t${SYMBOLS[(at + 2) % 60]}\t0.5`,
    ]),
].join("\n");

/**
 * The expression table: 70 rows. 52 symbols as the graph spells them (TP53 twice), 6 more in
 * lower case, 1 more with a trailing space, 10 the graph lacks; G60 has no row.
 */
const EXPRESSION = [
    "symbol\tlog2fc\tpadj\ttissue",
    ...SYMBOLS.slice(0, 52).map((symbol, at) => `${symbol}\t${String(at / 10)}\t0.01\tlung`),
    "TP53\t9.9\t0.5\tlung",
    ...SYMBOLS.slice(52, 58).map((symbol) => `${symbol.toLowerCase()}\t1.5\t0.02\tlung`),
    `${SYMBOLS[58]} \t2.5\t0.03\tlung`,
    ...Array.from({ length: 10 }, (_unused, at) => `X${String(at)}\t0.1\t0.9\tlung`),
].join("\n");

/** Forty suppliers. */
const SUPPLIERS = [
    "id,name,country,tier",
    ...Array.from(
        { length: 40 },
        (_unused, at) => `S${String(at)},Supplier ${String(at)},${at % 2 ? "DE" : "FR"},${String(at % 3)}`,
    ),
].join("\n");

/** 150 distinct shipments between suppliers. */
const SHIPS = [
    "from,to,volume,lead_days",
    ...Array.from({ length: 150 }, (_unused, at) => {
        const from = at % 40;
        const to = (from + 1 + Math.floor(at / 40)) % 40;
        return `S${String(from)},S${String(to)},${String(at)},${String(at % 9)}`;
    }),
].join("\n");

/**
 * A session holding the interaction network.
 * @returns the session
 */
async function proteins(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import(
        {
            type: "csv",
            config: { file: new File([INTERACTIONS], "tp53-interactions.tsv") },
            name: "tp53-interactions.tsv",
        },
        { mapping: { rowsAre: "edges", source: { column: "bait" }, target: { column: "prey" } } },
    );
    return session;
}

/**
 * Prepare the expression table onto the graph.
 * @param session - the session
 * @returns the draft
 */
function expression(session: GraphSession): ReturnType<GraphSession["data"]["prepare"]> {
    return session.data.prepare(
        { config: { file: new File([EXPRESSION], "tumor-expression.tsv") }, name: "tumor-expression.tsv" },
        { onto: "graph" },
    );
}

describe("joining a table onto the graph", () => {
    it("suggests symbol = id and counts the matches, the misses and the near misses", async () => {
        const session = await proteins();
        const draft = await expression(session);
        const suggestion = draft.suggestJoin();
        assert.deepEqual(suggestion, {
            shape: "node-values",
            keys: [{ file: "symbol", graph: "id" }],
            confident: true,
        });

        const report = draft.joinReport({ keys: suggestion.keys });
        assert.deepInclude(report, {
            matched: 52,
            notInGraph: 10,
            withoutValue: 8,
            repeatedKeys: 1,
            extraIgnoringCase: 6,
            extraIgnoringSpaces: 1,
            newNodes: 0,
            newEdges: 0,
            updatedNodes: 52,
        });
        assert.deepEqual(report.clashes, []);
        assert.strictEqual(draft.joinReport({ keys: suggestion.keys, ignoreCase: true }).matched, 58);
        assert.strictEqual(
            draft.joinReport({ keys: suggestion.keys, ignoreCase: true, ignoreSpaces: true }).matched,
            59,
        );
        session.dispose();
    });

    it("names each row's match and the nodes left without a value", async () => {
        const session = await proteins();
        const draft = await expression(session);
        const report = draft.joinReport({ keys: draft.suggestJoin().keys });
        assert.strictEqual(report.rowMatches.length, 70);
        assert.deepEqual(report.rowMatches[0], ["TP53"]);
        assert.deepEqual(report.rowMatches[52], ["TP53"]);
        assert.deepEqual(report.rowMatches[53], [], "a lower-case symbol matches nothing yet");
        assert.strictEqual(report.rowMatches.filter((ids) => ids.length === 0).length, 17);
        assert.strictEqual(report.withoutValueIds.length, report.withoutValue);
        assert.include(report.withoutValueIds, "G60");
        assert.notInclude(report.withoutValueIds, "TP53");
        session.dispose();
    });

    it("counts an edit of a join against the graph with the join taken back", async () => {
        const session = await proteins();
        await session.data.updateNodes([{ id: "TP53", values: { tissue: "blood" } }]);
        const draft = await expression(session);
        const { keys } = draft.suggestJoin();
        const before = draft.joinReport({ keys, columns: ["log2fc", "tissue"] });
        await draft.load({ join: { keys, columns: ["log2fc", "tissue"] } });
        const [join] = session.data.joins();

        const edit = session.data.editJoinReport(join.source, { keys, columns: ["log2fc", "tissue"] });
        assert.deepInclude(edit, { matched: 52, notInGraph: 10, withoutValue: 8, extraIgnoringCase: 6 });
        assert.deepEqual(edit.clashes, before.clashes, "the join's own columns are not a clash");
        assert.strictEqual(session.data.editJoinReport(join.source, { keys, ignoreCase: true }).matched, 58);
        assert.strictEqual(session.data.node("TP53")?.log2fc, 0, "counting changes nothing");
        assert.throws(() => session.data.editJoinReport("s9", { keys }), /No joined table/);
        session.dispose();
    });

    it("writes the values as one undo step, keeps the table as a source and lists the join", async () => {
        const session = await proteins();
        const draft = await expression(session);
        const { keys } = draft.suggestJoin();
        await draft.load({ join: { keys, ignoreCase: true, columns: ["log2fc", "padj"] } });

        assert.strictEqual(session.data.node("TP53")?.log2fc, 0);
        assert.strictEqual(session.data.node("G53")?.log2fc, 1.5);
        assert.isUndefined(session.data.node("G60")?.log2fc);
        assert.isUndefined(session.data.node("TP53")?.tissue);
        assert.strictEqual(session.data.nodes().length, 60);

        const [graph, joined] = session.data.sources();
        assert.strictEqual(joined.kind, "join");
        assert.strictEqual(joined.name, "tumor-expression.tsv");
        assert.strictEqual(joined.joinedOnto, graph.key);
        assert.deepEqual(joined.counts, { nodes: 58, edges: 0 });

        const [join] = session.data.joins();
        assert.strictEqual(join.source, joined.key);
        assert.strictEqual(join.onto, graph.key);
        assert.strictEqual(join.shape, "node-values");
        assert.strictEqual(join.matched, 58);
        assert.strictEqual(join.rows, 70);
        assert.deepEqual([...join.columns].sort(), ["log2fc", "padj"]);
        assert.deepEqual(session.data.sourcesOf("G53"), [graph.key, joined.key]);

        await session.undo();
        assert.isUndefined(session.data.node("TP53")?.log2fc);
        assert.deepEqual(session.data.joins(), []);
        assert.strictEqual(session.data.sources().length, 1);
        session.dispose();
    });

    it("keeps a clashing column both ways by default, or keeps or overwrites it", async () => {
        const session = await proteins();
        await session.data.updateNodes([{ id: "TP53", values: { tissue: "blood" } }]);
        const draft = await expression(session);
        const { keys } = draft.suggestJoin();
        assert.deepEqual(draft.joinReport({ keys }).clashes, [{ column: "tissue", code: "clash" }]);
        await draft.load({ join: { keys } });
        assert.strictEqual(session.data.node("TP53")?.tissue, "blood");
        assert.strictEqual(session.data.node("TP53")?.["tissue (tumor-expression.tsv)"], "lung");

        const [join] = session.data.joins();
        await session.data.editJoin(join.source, { keys, clash: { tissue: "overwrite" } });
        assert.strictEqual(session.data.node("TP53")?.tissue, "lung");
        assert.isUndefined(session.data.node("TP53")?.["tissue (tumor-expression.tsv)"]);
        assert.strictEqual(session.data.joins()[0].source, join.source);

        await session.data.editJoin(join.source, { keys, clash: { tissue: "keep" }, columns: ["tissue"] });
        assert.strictEqual(session.data.node("TP53")?.tissue, "blood");
        assert.strictEqual(session.data.node("G02")?.tissue, "lung");
        assert.isUndefined(session.data.node("G02")?.log2fc);

        await session.undo();
        assert.strictEqual(session.data.node("TP53")?.tissue, "lung");
        session.dispose();
    });

    it("keeps every value of a repeated key as a list with repeated: both", async () => {
        const session = await proteins();
        const draft = await expression(session);
        await draft.load({ join: { keys: draft.suggestJoin().keys, repeated: "both", columns: ["log2fc"] } });
        assert.deepEqual(session.data.node("TP53")?.log2fc, [0, 9.9]);
        session.dispose();
    });

    it("takes the last row of a repeated key with repeated: last, and records what the reader ignores", async () => {
        const session = await proteins();
        const draft = await expression(session);
        const { keys } = draft.suggestJoin();
        await draft.load({ join: { keys, repeated: "last", columns: ["log2fc"], ignore: ["repeatedKeys"] } });
        assert.strictEqual(session.data.node("TP53")?.log2fc, 9.9);
        assert.deepEqual(session.data.joins()[0].choices.ignore, ["repeatedKeys"]);
        const log2fc = session.data.attributes().find((each) => each.name === "log2fc");
        assert.strictEqual(log2fc?.origin, "joined");
        await session.undo();
        await session.redo();
        assert.strictEqual(session.data.attributes().find((each) => each.name === "log2fc")?.origin, "joined");
        session.dispose();
    });

    it("counts only the nodes whose values a join changes", async () => {
        const session = await proteins();
        const draft = await expression(session);
        const { keys } = draft.suggestJoin();
        await draft.load({ join: { keys, columns: ["tissue"] } });
        const again = await session.data.prepare(
            { config: { file: new File([EXPRESSION], "tumor-expression-2.tsv") }, name: "tumor-expression-2.tsv" },
            { onto: "graph" },
        );
        // Every matched node holds tissue = lung already: overwriting it changes nothing.
        assert.strictEqual(
            again.joinReport({ keys, columns: ["tissue"], clash: { tissue: "overwrite" } }).updatedNodes,
            0,
        );
        assert.strictEqual(again.joinReport({ keys, columns: ["log2fc"] }).updatedNodes, 52);
        session.dispose();
    });

    it("refuses a key column the table lacks, and a draft not prepared onto the graph", async () => {
        const session = await proteins();
        const draft = await expression(session);
        assert.throws(() => draft.joinReport({ keys: [{ file: "gene", graph: "id" }] }), /no column/);
        const plain = await session.data.prepare({ config: { file: new File([EXPRESSION], "e.tsv") } });
        assert.throws(() => plain.suggestJoin(), /onto/);
        await assertRejects(session.data.editJoin("s9", { keys: [] }), "E_SOURCE_UNKNOWN");
        session.dispose();
    });

    it("survives a save and an open, and a reopened join can be edited", async () => {
        const session = await proteins();
        const draft = await expression(session);
        await draft.load({ join: { keys: draft.suggestJoin().keys, ignoreCase: true } });
        const { text } = await session.project.save();
        session.dispose();

        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        const [join] = reopened.data.joins();
        assert.strictEqual(join.matched, 58);
        assert.strictEqual(reopened.data.node("G53")?.log2fc, 1.5);
        await reopened.data.editJoin(join.source, { ...join.choices, ignoreCase: false });
        assert.strictEqual(reopened.data.joins()[0].matched, 52);
        assert.isUndefined(reopened.data.node("G53")?.log2fc);
        reopened.dispose();
    });
});

describe("joining edges between the nodes a graph holds", () => {
    /**
     * A session holding the suppliers, with the shipments prepared onto it.
     * @returns the session and the draft
     */
    async function supplyChain(): Promise<{
        session: GraphSession;
        draft: Awaited<ReturnType<GraphSession["data"]["prepare"]>>;
    }> {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: SUPPLIERS }, name: "suppliers.csv" });
        const draft = await session.data.prepare(
            { config: { file: new File([SHIPS], "ships-to-2024-09.csv") }, name: "ships-to-2024-09.csv" },
            { onto: "graph" },
        );
        return { session, draft };
    }

    it("suggests edges and counts 150 new edges", async () => {
        const { session, draft } = await supplyChain();
        const suggestion = draft.suggestJoin();
        assert.deepEqual(suggestion, {
            shape: "edges",
            keys: [
                { file: "from", graph: "id" },
                { file: "to", graph: "id" },
            ],
            confident: true,
        });
        assert.deepInclude(draft.joinReport({ keys: suggestion.keys }), {
            matched: 150,
            notInGraph: 0,
            newEdges: 150,
            newNodes: 0,
            updatedNodes: 0,
            withoutValue: 0,
        });
        const { rowMatches } = draft.joinReport({ keys: suggestion.keys });
        assert.deepEqual(rowMatches[0], ["S0", "S1"], "an edge row names its two ends");
        session.dispose();
    });

    it("loads the edges as one step, and an edit makes them again under the same key", async () => {
        const { session, draft } = await supplyChain();
        await draft.load({ join: { keys: draft.suggestJoin().keys } });
        assert.strictEqual(session.data.edges().length, 150);
        assert.strictEqual(session.data.nodes().length, 40);
        const [suppliers, ships] = session.data.sources();
        assert.strictEqual(ships.kind, "join");
        assert.strictEqual(ships.joinedOnto, suppliers.key);
        assert.strictEqual(session.data.edges()[0].volume, 0);

        await session.data.editJoin(ships.key, { keys: ships.join?.choices.keys ?? [], columns: ["volume"] });
        assert.strictEqual(session.data.edges().length, 150);
        assert.isUndefined(session.data.edges()[0].lead_days);
        assert.strictEqual(session.data.joins()[0].source, ships.key);

        await session.undo();
        await session.undo();
        assert.strictEqual(session.data.edges().length, 0);
        assert.deepEqual(session.data.joins(), []);
        session.dispose();
    });

    it("keeps the graph's own source, marks the joined columns, and routes the same file to its join", async () => {
        const { session, draft } = await supplyChain();
        await draft.load({ join: { keys: draft.suggestJoin().keys } });
        assert.strictEqual(session.data.source()?.name, "suppliers.csv", "a join is not the graph's source");
        const volume = session.data.attributes().find((each) => each.kind === "edge" && each.name === "volume");
        assert.strictEqual(volume?.origin, "joined");
        const country = session.data.attributes().find((each) => each.name === "country");
        assert.strictEqual(country?.origin, "imported");

        const [, ships] = session.data.sources();
        const again = new File([SHIPS], "ships-to-2024-09.csv");
        assert.strictEqual(await session.data.matchesSource({ config: { file: again } }), ships.key);
        const twice = await session.data.prepare(
            { config: { file: again }, name: "ships-to-2024-09.csv" },
            { onto: "graph" },
        );
        await assertRejects(twice.load({ join: { keys: twice.suggestJoin().keys } }), "E_BAD_COMMAND");
        assert.strictEqual(session.data.edges().length, 150, "not joined twice");

        // A newer copy with nine more shipments: the join is counted again.
        const newer = [SHIPS, ...Array.from({ length: 9 }, (_unused, at) => `S${String(at)},S${String(at + 20)},1,1`)];
        await session.data.replaceSource(ships.key, { config: { file: new File([newer.join("\n")], "ships.csv") } });
        assert.strictEqual(session.data.edges().length, 159);
        const [join] = session.data.joins();
        assert.strictEqual(join.rows, 159);
        assert.strictEqual(join.matched, 159);
        session.dispose();
    });

    it("makes a node for an end the graph lacks", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: SUPPLIERS }, name: "suppliers.csv" });
        const draft = await session.data.prepare(
            { config: { data: "from,to\nS1,S2\nS1,NEW\ns3 ,S4\n" }, name: "extra.csv" },
            { onto: "graph" },
        );
        const { keys } = draft.suggestJoin();
        assert.deepInclude(draft.joinReport({ keys }), {
            matched: 1,
            newNodes: 2,
            newEdges: 3,
            extraIgnoringCase: 0,
            extraIgnoringSpaces: 0,
        });
        assert.deepInclude(draft.joinReport({ keys, ignoreCase: true, ignoreSpaces: true }), {
            matched: 2,
            newNodes: 1,
        });
        await draft.load({ join: { keys, ignoreCase: true, ignoreSpaces: true } });
        assert.strictEqual(session.data.nodes().length, 41);
        assert.isDefined(session.data.edges().find((edge) => edge.source === "S3" && edge.target === "S4"));
        session.dispose();
    });
});

describe("join cost", () => {
    /**
     * A session of `size` nodes with a table of `size` rows joined onto them.
     * @param size - how many
     * @returns the session and the join's key
     */
    async function joined(size: number): Promise<{ session: GraphSession; key: string }> {
        const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
        const strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
        try {
            const session = createGraphSession();
            await session.data.addNodes(Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` })));
            const rows = Array.from({ length: size }, (_, at) => `N${String(at)},${String(at)}`).join("\n");
            const draft = await session.data.prepare(
                { config: { data: `name,score\n${rows}\n` }, name: "scores.csv" },
                { onto: "graph" },
            );
            await draft.load({ join: { keys: [{ file: "name", graph: "id" }], ignoreCase: true } });
            return { session, key: session.data.joins()[0].source };
        } finally {
            scope.__GRAPHTY_STRICT_STATE__ = strict;
        }
    }

    it("SessionDataApi.editJoin: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session, key } = await joined(size);
                const visits = await visitsDuring(() =>
                    session.data.editJoin(key, { keys: [{ file: "name", graph: "id" }] }),
                );
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited by SessionDataApi.editJoin" },
        );
    });
});

describe("LoadChoices.existing", () => {
    it("updates the nodes a merge names with 'update', and keeps them by default", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: SUPPLIERS } });
        const update = "id,name\nS1,Renamed\n";
        await session.data.import({ type: "csv", config: { data: update } }, { mode: "merge", mapping: { key: "id" } });
        assert.strictEqual(session.data.node("S1")?.name, "Supplier 1");
        await session.data.import(
            { type: "csv", config: { data: update } },
            { mode: "merge", existing: "update", mapping: { key: "id" } },
        );
        assert.strictEqual(session.data.node("S1")?.name, "Renamed");
        assert.strictEqual(session.data.node("S1")?.country, "DE");
        session.dispose();
    });
});

/**
 * Assert a promise rejects with a code.
 * @param promise - the promise
 * @param code - the code
 */
async function assertRejects(promise: Promise<unknown>, code: string): Promise<void> {
    try {
        await promise;
    } catch (error) {
        assert.strictEqual((error as { code?: string }).code, code);
        return;
    }

    assert.fail(`expected a rejection with ${code}`);
}
