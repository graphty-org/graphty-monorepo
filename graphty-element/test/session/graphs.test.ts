/**
 * `session.graphs`: several graphs in one session. A copy made from a selection keeps the nodes'
 * attributes and a run's results, and switching back and forth keeps each graph's styles.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { isGraphtyError } from "../../src/errors";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { sessionWithRuns } from "../helpers/project-session";
import { withConsumerStrictState } from "./helpers";

/**
 * A path a - b - c - d, each node with a score.
 * @returns The session.
 */
async function path(): Promise<GraphSession> {
    const session = sessionWithRuns();
    await session.data.addNodes(["a", "b", "c", "d"].map((id, at) => ({ id, score: at })));
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
        { src: "c", dst: "d" },
    ]);
    return session;
}

const ids = (session: GraphSession): string[] => session.data.nodes({ scope: "graph" }).map((node) => String(node.id));

describe("session.graphs", () => {
    it("starts with the one graph the session holds", () => {
        const session = createGraphSession();
        assert.deepStrictEqual(session.graphs.list(), [{ id: "graph-1", name: null, current: true }]);
        assert.strictEqual(session.graphs.currentId, "graph-1");
        session.dispose();
    });

    it("copies a selection into a new graph with its attributes and results", async () => {
        const session = await path();
        await session.runs.start("degree", undefined, { style: false });
        await session.selection.apply({ ids: ["a", "b", "c"] });

        const copy = await session.graphs.create({ from: "selection", name: "Picked" });
        assert.deepStrictEqual(copy, { id: "graph-2", name: "Picked", current: true });
        assert.deepStrictEqual(ids(session), ["a", "b", "c"]);
        assert.lengthOf(session.data.edges(), 2);
        assert.strictEqual(session.data.node("c")?.score, 2);
        const degree = session.results.get(session.runs.list()[0]?.id ?? "");
        assert.isDefined(degree?.node("b"), "the run's results came along");
        assert.isFalse(session.canUndo, "the copy starts its own history");

        await session.graphs.switch("graph-1");
        assert.deepStrictEqual(ids(session), ["a", "b", "c", "d"], "the original is whole");
        assert.lengthOf(session.data.edges(), 3);
        session.dispose();
    });

    it("keeps each graph's styles across switches", async () => {
        const session = await path();
        const copy = await session.graphs.create();
        assert.deepStrictEqual(ids(session), ["a", "b", "c", "d"]);
        await session.styles.add({ name: "Copy only", target: "node", selector: { match: "everything" }, set: {} });
        const copyStyles = session.styles.toDocument();

        await session.graphs.switch("graph-1");
        const originalStyles = session.styles.toDocument();
        assert.notDeepEqual(originalStyles, copyStyles);

        await session.graphs.switch(copy.id);
        assert.deepStrictEqual(session.styles.toDocument(), copyStyles);
        await session.graphs.switch("graph-1");
        assert.deepStrictEqual(session.styles.toDocument(), originalStyles);
        assert.deepStrictEqual(
            session.graphs.list().map((graph) => [graph.id, graph.current]),
            [
                ["graph-1", true],
                ["graph-2", false],
            ],
        );
        session.dispose();
    });

    it("refuses an id no graph has, changing nothing", async () => {
        const session = await path();
        const error: unknown = await session.graphs.switch("graph-9").catch((thrown: unknown) => thrown);
        assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
        assert.strictEqual(session.graphs.currentId, "graph-1");
        assert.lengthOf(ids(session), 4);
        session.dispose();
    });

    for (const verb of ["create", "switch"] as const) {
        it(`${verb} does work in proportion to the graph`, async () => {
            await assertScalesLinearly(
                (size) =>
                    withConsumerStrictState(async () => {
                        const session = createGraphSession();
                        const names = Array.from({ length: size }, (_, at) => `n${String(at)}`);
                        await session.data.addNodes(names.map((id) => ({ id })));
                        await session.data.addEdges(names.slice(1).map((id, at) => ({ src: names[at], dst: id })));
                        await session.selection.apply({ ids: names.slice(0, size / 2) });
                        if (verb === "switch") {
                            await session.graphs.create({ from: "selection" });
                        }

                        const visits = await visitsDuring(() =>
                            verb === "create"
                                ? session.graphs.create({ from: "selection" })
                                : session.graphs.switch("graph-1"),
                        );
                        session.dispose();
                        return visits;
                    }),
                { sizes: [200, 800], counter: `graphs.${verb} visits` },
            );
        });
    }
});
