/**
 * @file Today's joins give the same graph with the source-steps experiment on as off: the default
 * clash keeps both values, an edges join reads its repeated rows and loose ends as the reader
 * chose, a values or merge join may key on a graph field, and the suggestion is one `load()` takes.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type JoinChoices } from "../../../src/session";

type LoadArgument = Parameters<Awaited<ReturnType<GraphSession["data"]["prepare"]>>["load"]>[0];

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its text.
 * @returns The source.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * A session holding `base`, with `table` joined onto it.
 * @param on - Whether the source-steps experiment is on.
 * @param base - The graph's file.
 * @param table - The joined table.
 * @param load - The join.
 * @returns The session.
 */
async function joined(on: boolean, base: string, table: string, load: LoadArgument): Promise<GraphSession> {
    const session = createGraphSession({ features: on ? ["source-steps"] : [] });
    await session.data.import(csv("base.csv", base));
    const draft = await session.data.prepare(csv("values.csv", table), { onto: "graph" });
    try {
        await draft.load(load);
    } finally {
        draft.dispose();
    }
    return session;
}

/**
 * The graph as a reader sees it, without element-assigned edge ids.
 * @param session - The session.
 * @returns Its nodes and edges, sorted.
 */
function picture(session: GraphSession): { nodes: string[]; edges: string[] } {
    const nodes = session.data.nodes().map((n) => JSON.stringify(n));
    const edges = session.data.edges().map(({ id: _id, ...rest }) => JSON.stringify(rest));
    return { nodes: nodes.sort(), edges: edges.sort() };
}

/**
 * The same join with the experiment off and on.
 * @param base - The graph's file.
 * @param table - The joined table.
 * @param load - The join.
 * @returns Both sessions.
 */
async function both(base: string, table: string, load: LoadArgument): Promise<{ off: GraphSession; on: GraphSession }> {
    return { off: await joined(false, base, table, load), on: await joined(true, base, table, load) };
}

const ENDS = [
    { file: "from", graph: "id" },
    { file: "to", graph: "id" },
] as const;

describe("source-steps: today's joins give the graph they give with the experiment off", () => {
    it("keeps a clashing value both ways when the reader picks no clash rule", async () => {
        const base = "id,score,label\na,5,A\nb,6,B";
        const load = { join: { keys: [{ file: "id", graph: "id" }] } };
        const { off, on } = await both(base, "id,score\na,1\nb,2", load);
        assert.strictEqual(off.data.node("a")?.score, 5);
        assert.strictEqual(off.data.node("a")?.["score (values.csv)"], 1);
        const key = on.data.joins()[0]?.source;
        assert.strictEqual(on.data.node("a")?.score, 5, "the graph's own value stays");
        // Design 3.3: the clash column is named by the source id; the app labels it.
        assert.strictEqual(on.data.node("a")?.[`score (${key})`], 1, "the joined value is kept too");
        const merged = await joined(true, base, "id,score\na,1\nq,3", { join: { ...load.join, shape: "merge" } });
        const mergeKey = merged.data.joins()[0]?.source;
        assert.strictEqual(merged.data.node("a")?.[`score (${mergeKey})`], 1, "a merge keeps both too");
        for (const session of [off, on, merged]) {
            session.dispose();
        }
    });

    it("keeps an edges join's first, last or every repeated row as the reader chose", async () => {
        const base = "source,target,score\na,b,1\na,c,2";
        for (const repeated of [undefined, "first", "last"] as const) {
            const { off, on } = await both(base, "from,to,w\nb,c,3\nb,c,4", {
                join: { shape: "edges", keys: ENDS, ...(repeated === undefined ? {} : { repeated }) },
            });
            assert.deepStrictEqual(picture(on), picture(off), `repeated: ${String(repeated)}`);
            assert.lengthOf(on.data.edges(), 3, `repeated: ${String(repeated)}`);
            off.dispose();
            on.dispose();
        }
    });

    it("meets an edges join's ends regardless of case and spaces when the reader asks", async () => {
        const { off, on } = await both("id\na\nb\nc", "from,to\na,B\n c ,b", {
            join: { shape: "edges", keys: ENDS, ignoreCase: true, ignoreSpaces: true },
        });
        assert.deepStrictEqual(picture(on), picture(off));
        assert.sameMembers(
            on.data.nodes().map((n) => n.id),
            ["a", "b", "c"],
            "no stray node for an end spelled differently",
        );
        off.dispose();
        on.dispose();
    });

    it("joins values and merges by a graph field the graph's rows hold", async () => {
        const base = "id,name\nn1,Ann\nn2,Bo";
        const keys = [{ file: "name", graph: "data.name" }];
        const values = await both(base, "name,score\nAnn,5\nZed,9", { join: { keys } });
        assert.deepStrictEqual(picture(values.on), picture(values.off));
        assert.strictEqual(values.on.data.node("n1")?.score, 5);
        const merge = await both(base, "name,age\nAnn,30", { join: { keys, shape: "merge" } });
        assert.strictEqual(merge.on.data.node("n1")?.age, 30);
        for (const session of [values.off, values.on, merge.off, merge.on]) {
            session.dispose();
        }
    });

    it("counts as added only the nodes a join made, not the ones it wrote onto", async () => {
        const { off, on } = await both("id,name\ns1,Ana\ns2,Bo\ns3,Cy", "id,rating\ns1,5\ns9,4\ns8,3\ns8,1", {
            join: { shape: "node-values", keys: [{ file: "id", graph: "id" }], unmatchedRows: "add" },
        });
        const added = (session: GraphSession): unknown =>
            session.data.sources().find((each) => each.kind === "join")?.added;
        assert.deepStrictEqual(added(on), { nodes: 2, edges: 0 });
        assert.deepStrictEqual(added(on), added(off));
        off.dispose();
        on.dispose();
    });

    it("suggests only a join the steps take, so loading the suggestion works", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("base.csv", "source,target\na,b\na,c"));
        const draft = await session.data.prepare(csv("values.csv", "source,target,w\na,b,1\na,c,2"), {
            onto: "graph",
        });
        const suggestion = draft.suggestJoin();
        assert.notStrictEqual(suggestion.shape, "edge-values");
        await draft.load({ join: { keys: suggestion.keys, shape: suggestion.shape } });
        assert.lengthOf(session.data.joins(), 1);
        session.dispose();
    });
});

/** Genes by their Ensembl id. */
const GENES = "id,chrom\nENSG1,17\nENSG2,13\nENSG3,1\nENSG4,2";

/** Symbol (the node id) to Ensembl id; MULTI names two genes. */
const MAPPING = "id,ensembl\nTP53,ENSG1\nBRCA1,ENSG2\nMULTI,ENSG3\nMULTI,ENSG4";

/** Expression by symbol; FOO is in no mapping. */
const EXPRESSION = "symbol,logFC\nTP53,1.5\nBRCA1,2\nFOO,3\nMULTI,4";

/**
 * A session holding the genes and the mapping, with the expression joined through it (`via`).
 * @param on - Whether the source-steps experiment is on.
 * @param choices - More join choices.
 * @returns The session.
 */
async function crosswalked(on: boolean, choices: Partial<JoinChoices> = {}): Promise<GraphSession> {
    const session = createGraphSession({ features: on ? ["source-steps"] : [] });
    await session.data.import(csv("genes.csv", GENES));
    await session.data.import(csv("mapping.csv", MAPPING), { mode: "merge" });
    const via = session.data.sources().at(-1)?.key ?? "";
    const draft = await session.data.prepare(csv("expression.csv", EXPRESSION), { onto: "graph" });
    try {
        await draft.load({ join: { keys: [{ file: "symbol", graph: "id" }], shape: "node-values", via, ...choices } });
    } finally {
        draft.dispose();
    }
    return session;
}

describe("source-steps: a join translating its keys through a loaded source (via, design 3.5)", () => {
    it("translates each key through the source's rows as the join screen's mapping does", async () => {
        const off = await crosswalked(false);
        const on = await crosswalked(true);
        for (const id of ["ENSG1", "ENSG2"]) {
            assert.strictEqual(on.data.node(id)?.logFC, off.data.node(id)?.logFC, id);
        }
        assert.strictEqual(on.data.node("ENSG1")?.logFC, 1.5);
        // Design 3.5: a key the rows map to two genes is never resolved by row order (fan-out).
        assert.isUndefined(on.data.node("ENSG3")?.logFC);
        assert.isUndefined(on.data.node("FOO"), "a key the mapping lacks matches as it is, and names no gene");
        assert.lengthOf(on.data.joins(), 1);

        await on.data.removeSource(on.data.joins()[0].source);
        assert.isUndefined(on.data.node("ENSG1")?.logFC, "removing the join takes its values back");
        off.dispose();
        on.dispose();
    });

    it("merges each row into the gene its translated key names", async () => {
        const on = await crosswalked(true, { shape: "merge" });
        assert.strictEqual(on.data.node("ENSG2")?.logFC, 2);
        on.dispose();
    });

    it("refuses mapping.many, which section 11 reserves", async () => {
        const error = await crosswalked(true, { mapping: { many: "list" } }).then(
            () => null,
            (e: unknown) => e as { code?: string; details?: Record<string, unknown> },
        );
        assert.strictEqual(error?.code, "E_UNSUPPORTED");
        assert.deepInclude(error?.details, { reason: "later" });
    });
});
