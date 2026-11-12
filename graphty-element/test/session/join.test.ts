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

    it("takes the join back when its table is removed, as one undo step", async () => {
        const session = await proteins();
        await session.data.updateNodes([{ id: "TP53", values: { tissue: "blood" } }]);
        const draft = await expression(session);
        const { keys } = draft.suggestJoin();
        await draft.load({ join: { keys, columns: ["log2fc", "tissue"], clash: { tissue: "overwrite" } } });
        const [join] = session.data.joins();
        assert.strictEqual(session.data.node("TP53")?.tissue, "lung");

        await session.data.removeSource(join.source);
        assert.isUndefined(session.data.node("G02")?.log2fc, "a value it wrote is gone");
        assert.isUndefined(session.data.node("G02")?.tissue);
        assert.strictEqual(session.data.node("TP53")?.tissue, "blood", "a value it overwrote is back");
        assert.deepEqual(session.data.joins(), []);
        assert.strictEqual(session.data.nodes().length, 60);

        await session.undo();
        assert.strictEqual(session.data.node("G02")?.log2fc, 0.1);
        assert.strictEqual(session.data.node("TP53")?.tissue, "lung");
        assert.strictEqual(session.data.joins().length, 1);
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

        await session.data.removeSource(session.data.joins()[0].source);
        assert.strictEqual(session.data.nodes().length, 40, "the end only the join made is gone");
        assert.strictEqual(session.data.edges().length, 0);
        assert.deepEqual(session.data.joins(), []);
        session.dispose();
    });

    it("names each row's fate, and leaves out a row with an unknown end when asked", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: SUPPLIERS }, name: "suppliers.csv" });
        // A pair, the same pair again, an end the graph lacks, a blank end.
        const draft = await session.data.prepare(
            { config: { data: "from,to\nS1,S2\nS1,S2\nS1,NEW\nS3,\n" }, name: "extra.csv" },
            { onto: "graph" },
        );
        const { keys } = draft.suggestJoin();
        assert.deepEqual(draft.joinReport({ keys }).rowFates, ["joined", "repeat", "new-end", "left-out"]);
        assert.deepEqual(draft.joinReport({ keys, repeated: "last" }).rowFates, [
            "repeat",
            "joined",
            "new-end",
            "left-out",
        ]);
        assert.deepEqual(draft.joinReport({ keys, repeated: "both" }).rowFates, [
            "joined",
            "joined",
            "new-end",
            "left-out",
        ]);
        const leaving = draft.joinReport({ keys, unknownEnds: "leave-out" });
        assert.deepEqual(leaving.rowFates, ["joined", "repeat", "left-out", "left-out"]);
        assert.deepInclude(leaving, { newNodes: 0, newEdges: 1, unknownEndRows: 1 });
        await draft.load({ join: { keys, unknownEnds: "leave-out" } });
        assert.strictEqual(session.data.nodes().length, 40, "no node made for NEW");
        assert.lengthOf(session.data.edges(), 1);
        session.dispose();
    });

    it("names a values row's fate: joined, a repeat, or left out", async () => {
        const session = await proteins();
        const draft = await session.data.prepare(
            { config: { data: "symbol,x\nTP53,1\nTP53,2\nNOPE,3\n" }, name: "x.csv" },
            { onto: "graph" },
        );
        const keys = [{ file: "symbol", graph: "id" }];
        const shape = "node-values";
        assert.deepEqual(draft.joinReport({ keys, shape }).rowFates, ["joined", "repeat", "left-out"]);
        assert.deepEqual(draft.joinReport({ keys, shape, repeated: "both" }).rowFates, [
            "joined",
            "joined",
            "left-out",
        ]);
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

    it("draft.joinReport on a key every element shares: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession();
                await session.data.addNodes(Array.from({ length: size }, (_, at) => ({ id: at, zip: "same" })));
                const draft = await session.data.prepare(
                    { config: { data: "zip,score\nsame,1\n" }, name: "scores.csv" },
                    { onto: "graph" },
                );
                const visits = await visitsDuring(() =>
                    draft.joinReport({ shape: "node-values", keys: [{ file: "zip", graph: "data.zip" }] }),
                );
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited by draft.joinReport" },
        );
    });

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

/**
 * Prepare a table onto the graph.
 * @param session - the session
 * @param csv - the table
 * @param name - its file name
 * @returns the draft
 */
function tableDraft(session: GraphSession, csv: string, name: string): ReturnType<GraphSession["data"]["prepare"]> {
    return session.data.prepare({ config: { file: new File([csv], name) }, name }, { onto: "graph" });
}

describe("removing what a join rests on", () => {
    /**
     * A graph with a value joined onto it.
     * @returns the session, the base's key and the join's key
     */
    async function withValues(): Promise<{ session: GraphSession; base: string; join: string }> {
        const session = await proteins();
        const draft = await expression(session);
        await draft.load({ join: { keys: [{ file: "symbol", graph: "id" }] } });
        const [{ key: base }] = session.data.sources();
        return { session, base, join: session.data.joins()[0].source };
    }

    it("takes a removed values join's values back, in one undo step", async () => {
        const { session, join } = await withValues();
        assert.isDefined(session.data.node("G02")?.log2fc);
        await session.data.removeSource(join);
        assert.isUndefined(session.data.node("G02")?.log2fc);
        assert.strictEqual(session.data.sources().length, 1);
        await session.undo();
        assert.isDefined(session.data.node("G02")?.log2fc);
        assert.strictEqual(session.data.sources().length, 2);
    });

    it("removes the file a values join was made onto, with the join, leaving nothing it never brought", async () => {
        const { session, base, join } = await withValues();
        const result = await session.data.removeSource(base);
        assert.deepEqual(result.alsoRemoved, [join]);
        assert.strictEqual(session.data.nodes().length, 0);
        assert.deepEqual(session.data.sources(), []);
    });

    it("removes a join of edges with the node list it was made onto, and reopens listing what is left", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id,name\na,Ann\nb,Bo\nc,Cy" }, name: "n.csv" });
        await session.data.import(
            { type: "csv", config: { data: "id,rank\nd,1\ne,2" }, name: "m.csv" },
            { mode: "merge" },
        );
        const draft = await tableDraft(session, "from,to,w\na,b,1\nb,c,2", "e.csv");
        await draft.load({
            join: {
                shape: "edges",
                keys: [
                    { file: "from", graph: "id" },
                    { file: "to", graph: "id" },
                ],
            },
        });
        const [first] = session.data.sources();
        await session.data.removeSource(first.key);
        assert.deepEqual(
            session.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["d", "e"],
        );
        assert.strictEqual(session.data.edges().length, 0);
        const { text } = await session.project.save();
        await session.project.open(text);
        assert.deepEqual(
            session.data.sources().map((each) => each.name),
            ["m.csv"],
        );
    });

    it("removes a join with the mapping table it went through, and puts both tables' values back", async () => {
        const session = await proteins();
        const map = await tableDraft(session, "symbol,ensembl\nTP53,E1\nG02,E2", "map.tsv");
        await map.load({ join: { keys: [{ file: "symbol", graph: "id" }] } });
        const via = session.data.joins()[0].source;
        const values = await tableDraft(session, "ensembl,tpm\nE1,7\nE2,8", "tpm.tsv");
        await values.load({ join: { keys: [{ file: "ensembl", graph: "id" }], via } });
        assert.strictEqual(session.data.node("G02")?.tpm, 8);
        const result = await session.data.removeSource(via);
        assert.strictEqual(result.alsoRemoved.length, 1);
        assert.isUndefined(session.data.node("G02")?.tpm);
        assert.isUndefined(session.data.node("G02")?.ensembl);
        assert.deepEqual(session.data.joins(), []);
    });
    it("removes a join keyed on a column the removed join wrote", async () => {
        const session = await proteins();
        const map = await tableDraft(session, "symbol,ensembl\nTP53,E1\nG02,E2", "map.tsv");
        await map.load({ join: { keys: [{ file: "symbol", graph: "id" }] } });
        const via = session.data.joins()[0].source;
        const values = await tableDraft(session, "ensembl,tpm\nE1,7\nE2,8", "tpm.tsv");
        await values.load({ join: { keys: [{ file: "ensembl", graph: "data.ensembl" }] } });
        assert.strictEqual(session.data.node("G02")?.tpm, 8);
        assert.strictEqual((await session.data.removeSource(via)).alsoRemoved.length, 1);
        assert.isUndefined(session.data.node("G02")?.tpm);
        assert.deepEqual(session.data.joins(), []);
    });
});

describe("what a join says about its rows", () => {
    it("names a new node under the file's own column when the graph's nodes clash", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id,name\ns1,Ana" }, name: "a.csv" });
        const draft = await tableDraft(session, "id,name\ns1,Anna\ns9,Fjord Metals", "b.csv");
        await draft.load({ join: { shape: "node-values", keys: [{ file: "id", graph: "id" }], unmatchedRows: "add" } });
        assert.strictEqual(session.data.node("s9")?.name, "Fjord Metals");
        assert.strictEqual(session.data.node("s1")?.name, "Ana", "the matched node keeps its own");
        assert.strictEqual(session.data.node("s1")?.["name (b.csv)"], "Anna");
    });

    it("gives a new node a free id when its key value is another node's id", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id,zip\nn1,10\nn2,20" }, name: "a.csv" });
        const draft = await tableDraft(session, "zip,score\nn1,5", "b.csv");
        const choices = {
            shape: "node-values",
            keys: [{ file: "zip", graph: "data.zip" }],
            unmatchedRows: "add",
        } as const;
        assert.strictEqual(draft.joinReport(choices).newNodes, 1);
        await draft.load({ join: choices });
        assert.strictEqual(session.data.nodes().length, 3);
        assert.strictEqual(session.data.node("n1 (2)")?.score, 5);
        assert.strictEqual(session.data.node("n1 (2)")?.zip, "n1");
        assert.isUndefined(session.data.node("n1")?.score);
    });

    it("counts a line the reader could not read, and keeps the count for an edit", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id\na\nb\nc" }, name: "a.csv" });
        const draft = await tableDraft(session, "id,score\na,1\nb,2,extra\nc,3", "b.csv");
        const choices = { shape: "node-values", keys: [{ file: "id", graph: "id" }] } as const;
        assert.strictEqual(draft.joinReport(choices).unreadRows, 1);
        await draft.load({ join: choices });
        const [record] = session.data.joins();
        assert.strictEqual(record.table.unreadRows, 1);
        assert.strictEqual(session.data.editJoinReport(record.source, choices).unreadRows, 1);
        assert.isUndefined(session.data.node("b")?.score);
    });

    it("suggests keeping both when rows naming one pair say different things, and not for a plain repeat", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id\na\nb\nc" }, name: "a.csv" });
        const events = await tableDraft(session, "from,to,time\na,b,1\na,b,2\nb,c,3", "events.csv");
        assert.strictEqual(events.suggestJoin().repeated, "both");
        const same = await tableDraft(session, "from,to,time\na,b,1\na,b,1\nb,c,3", "same.csv");
        assert.isUndefined(same.suggestJoin().repeated);
        events.dispose();
        same.dispose();
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

describe("joining by an edge's two ends, new rows and a file's own kind", () => {
    /**
     * A session holding a table of edges.
     * @param csv - the table
     * @param directed - whether its edges are directed
     * @returns the session
     */
    async function edgesOf(csv: string, directed = true): Promise<GraphSession> {
        const session = createGraphSession();
        await session.data.import(
            { type: "csv", config: { file: new File([csv], "pairs.csv") }, name: "pairs.csv" },
            { mapping: { rowsAre: "edges", source: { column: "from" }, target: { column: "to" } }, directed },
        );
        return session;
    }

    /**
     * Prepare a table onto the graph.
     * @param session - the session
     * @param csv - the table
     * @param name - its file name
     * @returns the draft
     */
    function draftOf(session: GraphSession, csv: string, name: string): ReturnType<GraphSession["data"]["prepare"]> {
        return session.data.prepare({ config: { file: new File([csv], name) }, name }, { onto: "graph" });
    }

    const PAIRS = "from,to,km\na,b,1\nb,c,2\nc,d,3\nd,e,4\ne,a,5";

    it("reads a table naming the graph's edges as values on them, and writes them", async () => {
        const session = await edgesOf(PAIRS);
        const draft = await draftOf(session, "from,to,price\na,b,10\nb,c,20\nc,d,30\nd,e,40\na,e,99", "prices.csv");
        const suggestion = draft.suggestJoin();
        assert.deepEqual(suggestion, {
            shape: "edge-values",
            keys: [
                { file: "from", graph: "source" },
                { file: "to", graph: "target" },
            ],
            confident: true,
        });
        const report = draft.joinReport({ keys: suggestion.keys, shape: suggestion.shape });
        assert.strictEqual(report.matched, 4, "a,e is not e,a on a directed graph");
        assert.strictEqual(report.notInGraph, 1);
        await draft.load({ join: { keys: suggestion.keys, shape: suggestion.shape } });
        const prices = session.data.edges().map((edge) => (edge as { price?: number }).price);
        assert.deepEqual(prices.sort(), [10, 20, 30, 40, undefined]);
    });

    it("matches a reversed pair on an undirected graph", async () => {
        const session = await edgesOf(PAIRS, false);
        const draft = await draftOf(session, "from,to,price\nb,a,10\nc,b,20\nd,c,30\ne,d,40\na,e,99", "prices.csv");
        const { keys, shape } = draft.suggestJoin();
        assert.strictEqual(shape, "edge-values");
        assert.strictEqual(draft.joinReport({ keys, shape }).matched, 5);
    });

    it("reads a table as new edges when fewer than 80% of its rows name one the graph holds", async () => {
        const session = await edgesOf(PAIRS);
        const draft = await draftOf(session, "from,to,price\na,b,10\nb,c,20\na,c,30\na,d,40\nb,e,50", "prices.csv");
        assert.strictEqual(draft.suggestJoin().shape, "edges");
    });

    it("keeps a table's own column order for the ends it reads as edges", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "csv",
            config: { file: new File(["id\np1\np2\nb1\nb2"], "held.csv") },
            name: "held.csv",
        });
        // person_id matches less well than building_id, which used to make it the target.
        const draft = await draftOf(session, "person_id,building_id\np1,b1\np2,b2\np9,b1", "doors.csv");
        assert.deepEqual(
            draft.suggestJoin().keys.map((key) => key.file),
            ["person_id", "building_id"],
        );
    });

    /**
     * A session with three suppliers, and a draft of a list with one shared and two new rows.
     * @returns the session, the draft and its choices
     */
    async function twoLists(): Promise<{
        session: GraphSession;
        draft: Awaited<ReturnType<GraphSession["data"]["prepare"]>>;
        choices: Parameters<Awaited<ReturnType<GraphSession["data"]["prepare"]>>["joinReport"]>[0];
    }> {
        const session = createGraphSession();
        await session.data.import({
            type: "csv",
            config: { file: new File(["id,name\ns1,Ana\ns2,Bo\ns3,Cy"], "first.csv") },
            name: "first.csv",
        });
        const draft = await draftOf(session, "id,rating\ns1,5\ns9,4\ns8,3\ns8,1", "second.csv");
        return {
            session,
            draft,
            choices: { shape: "node-values", keys: [{ file: "id", graph: "id" }], unmatchedRows: "add" },
        };
    }

    it("adds a row matching no node as a new node with unmatchedRows, and reports it", async () => {
        const { session, draft, choices } = await twoLists();
        const report = draft.joinReport(choices);
        assert.strictEqual(report.newNodes, 2);
        assert.deepEqual(report.rowFates, ["joined", "new-end", "new-end", "repeat"]);
        await draft.load({ join: choices });
        assert.strictEqual(session.data.nodes().length, 5);
        assert.strictEqual(session.data.node("s9")?.rating, 4);
        assert.strictEqual(session.data.node("s1")?.rating, 5);
        const joined = session.data.sources().find((each) => each.kind === "join");
        assert.deepEqual(joined?.added, { nodes: 2, edges: 0 });
        assert.strictEqual(joined?.counts.nodes, 3);
    });

    it("takes the new nodes back with Undo and Edit join, and leaves rows out by default", async () => {
        const { session, draft, choices } = await twoLists();
        assert.strictEqual(draft.joinReport({ ...choices, unmatchedRows: undefined }).newNodes, 0);
        await draft.load({ join: choices });
        assert.strictEqual(session.data.nodes().length, 5);
        await session.undo();
        assert.strictEqual(session.data.nodes().length, 3);
        await session.redo();
        const [record] = session.data.joins();
        await session.data.editJoin(record.source, { ...record.choices, unmatchedRows: "leave-out" });
        assert.strictEqual(session.data.nodes().length, 3);
        assert.isUndefined(session.data.node("s9"));
        assert.strictEqual(session.data.node("s1")?.rating, 5, "the matched row stays");
    });

    it("gives every row of a node file the file's own kind", async () => {
        const session = createGraphSession();
        await session.data.import(
            { type: "csv", config: { file: new File(["id,name\np1,Ana\np2,Bo"], "people.csv") }, name: "people.csv" },
            { mapping: { rowsAre: "nodes", key: "id", kindName: "people" } },
        );
        assert.strictEqual(session.data.node("p1")?.kind, "people");
        assert.strictEqual(session.data.node("p2")?.kind, "people");
    });

    it("reads a file added as rows the same way when a kind is laid over it", async () => {
        const session = createGraphSession();
        await session.data.import(
            { type: "csv", config: { file: new File(["id,name\np1,Ana"], "people.csv") }, name: "people.csv" },
            { mapping: { rowsAre: "nodes", key: "id" } },
        );
        const draft = await session.data.prepare(
            {
                config: { file: new File(["building_id,address\nb1,Harbor\nb2,Canal"], "buildings.csv") },
                name: "buildings.csv",
            },
            { onto: "graph", guess: "values" },
        );
        await draft.load({ mode: "merge" });
        const { key } = session.data.sources()[1];
        await session.data.reloadSource(key, { mapping: { kindName: "buildings" } });
        assert.strictEqual(session.data.node("b1")?.kind, "buildings");
        assert.strictEqual(session.data.node("b2")?.kind, "buildings");
        assert.isUndefined(session.data.node("p1")?.kind);
    });

    it("keeps every row when different kinds of node split an id across a reload", async () => {
        const session = createGraphSession();
        const rows = [
            "user,host",
            ...Array.from({ length: 20 }, () => "admin,web1"),
            ...Array.from({ length: 20 }, () => "ana,admin"),
            ...Array.from({ length: 10 }, () => "ana,web1"),
        ];
        await session.data.import(
            { type: "csv", config: { file: new File([rows.join("\n")], "log.csv") }, name: "log.csv" },
            { mapping: { rowsAre: "edges", source: { column: "user" }, target: { column: "host" } } },
        );
        assert.strictEqual(session.data.edges().length, 50);
        const [{ key }] = session.data.sources();
        await session.data.reloadSource(key, {
            mapping: { sourceKind: "user", targetKind: "host" },
            kindIds: "scoped",
        });
        assert.strictEqual(session.data.edges().length, 50, "the repeats of a new pair stay");
        assert.isDefined(session.data.node("user:admin"));
        assert.isDefined(session.data.node("host:admin"));
    });
});
