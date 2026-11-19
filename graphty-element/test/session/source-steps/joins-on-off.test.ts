/**
 * @file Today's joins give the same graph with the source-steps experiment on as off: the default
 * clash keeps both values, an edges join reads its repeated rows and loose ends as the reader
 * chose, a values or merge join may key on a graph field, and the suggestion is one `load()` takes.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

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
