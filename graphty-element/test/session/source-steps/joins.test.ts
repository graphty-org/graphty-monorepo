/**
 * @file Today's join screen under the source-steps experiment: `prepare().load({ join })`,
 * `joins()`, `editJoin` and `editJoinReport` expressed as a source and its steps, each one undo
 * step, the `JoinRecord` derived from the step's source.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

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
 * A session holding one edge file a-b, a-c under the experiment.
 * @returns The session.
 */
async function graph(): Promise<GraphSession> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(csv("one.csv", "source,target\na,b\na,c\n"));
    return session;
}

/**
 * Join a table onto the graph through a draft.
 * @param session - The session.
 * @param table - The table.
 * @param join - The join's choices.
 */
async function join(
    session: GraphSession,
    table: string,
    join: Parameters<Awaited<ReturnType<GraphSession["data"]["prepare"]>>["load"]>[0],
): Promise<void> {
    const draft = await session.data.prepare(csv("values.csv", table), { onto: "graph" });
    try {
        await draft.load(join);
    } finally {
        draft.dispose();
    }
}

describe("source-steps: today's joins as steps", () => {
    it("a values join writes onto the nodes its key names, as one undo step listed by joins()", async () => {
        const session = await graph();
        const [one] = session.data.sources();
        const history = session.history.steps.length;
        await join(session, "id,score\na,1\nb,2\nz,9\n", { join: { keys: [{ file: "id", graph: "id" }] } });
        assert.lengthOf(session.history.steps, history + 1);
        assert.strictEqual(session.history.steps.at(-1)?.fact.code, "data.join");
        assert.strictEqual(session.data.node("a")?.score, 1);
        assert.strictEqual(session.data.node("b")?.score, 2);
        assert.isUndefined(session.data.node("z"), "a values join builds no node");
        const [record] = session.data.joins();
        assert.strictEqual(record?.shape, "node-values");
        assert.strictEqual(record?.matched, 2);
        assert.strictEqual(record?.rows, 3);
        assert.strictEqual(record?.onto, one?.key);
        assert.strictEqual(session.data.steps().at(-1)?.op, "join.node-values");
        assert.strictEqual(session.data.sources().at(-1)?.kind, "join");
        await session.undo();
        assert.isUndefined(session.data.node("a")?.score);
        assert.lengthOf(session.data.joins(), 0);
        session.dispose();
    });

    it("editJoin replaces the join's steps and keeps its source; editJoinReport counts against the graph without it", async () => {
        const session = await graph();
        await join(session, "id,score\na,1\nb,2\n", { join: { keys: [{ file: "id", graph: "id" }] } });
        const [record] = session.data.joins();
        const key = record?.source ?? "";
        const report = session.data.editJoinReport(key, { keys: [{ file: "id", graph: "id" }], columns: [] });
        assert.strictEqual(report.matched, 2);
        await session.data.editJoin(key, { keys: [{ file: "id", graph: "id" }], columns: [] });
        assert.isUndefined(session.data.node("a")?.score, "the edited join brings no column");
        assert.deepStrictEqual(
            session.data.joins().map((each) => each.source),
            [key],
        );
        assert.strictEqual(session.history.steps.at(-1)?.fact.code, "data.edit-join");
        await session.undo();
        assert.strictEqual(session.data.node("a")?.score, 1);
        session.dispose();
    });

    it("an edges join adds edges between the nodes its keys name; removing it gives the graph back", async () => {
        const session = await graph();
        await join(session, "from,to\nb,c\nc,d\n", {
            join: {
                shape: "edges",
                keys: [
                    { file: "from", graph: "id" },
                    { file: "to", graph: "id" },
                ],
            },
        });
        assert.strictEqual(session.data.edges().length, 4);
        assert.isDefined(session.data.node("d"), "an end naming no node makes it");
        const key = session.data.joins()[0]?.source ?? "";
        await session.data.removeSource(key);
        assert.strictEqual(session.data.edges().length, 2);
        assert.isUndefined(session.data.node("d"));
        session.dispose();
    });

    it("a merge join folds the table's rows into the nodes their key names", async () => {
        const session = await graph();
        await join(session, "id,label\na,Ann\nq,Quinn\n", {
            join: { shape: "merge", keys: [{ file: "id", graph: "id" }] },
        });
        assert.strictEqual(session.data.node("a")?.label, "Ann");
        assert.strictEqual(session.data.node("q")?.label, "Quinn", "an unmatched row stays its own node");
        assert.deepStrictEqual(
            session.data.steps().map((s) => s.op),
            ["join.add", "join.add", "join.merge"],
        );
        session.dispose();
    });

    it("a merge join brings only the columns the reader picked, as it does with the experiment off", async () => {
        const nodesWith = async (features: string[]): Promise<unknown[]> => {
            const session = createGraphSession({ features });
            await session.data.import(csv("one.csv", "source,target\na,b\na,c\n"));
            await join(session, "id,label,extra\na,Ann,x\nq,Quinn,y\n", {
                join: { shape: "merge", keys: [{ file: "id", graph: "id" }], columns: ["label"] },
            });
            const nodes = session.data.nodes().map((n) => ({ ...n }));
            session.dispose();
            return nodes;
        };
        const on = await nodesWith(["source-steps"]);
        assert.deepStrictEqual(on, await nodesWith([]));
        assert.isFalse(
            on.some((n) => "extra" in (n as object)),
            "a column the reader left out stays off the nodes",
        );
    });

    it("a join choice the steps do not express yet is refused with E_UNSUPPORTED (later)", async () => {
        const session = await graph();
        let code: unknown;
        try {
            await join(session, "id,score\na,1\n", {
                join: { keys: [{ file: "id", graph: "id" }], aggregate: { score: "sum" } },
            });
        } catch (error) {
            code = [(error as { code?: string }).code, (error as { details?: { reason?: string } }).details?.reason];
        }
        assert.deepStrictEqual(code, ["E_UNSUPPORTED", "later"]);
        assert.lengthOf(session.data.joins(), 0);
        session.dispose();
    });
});
