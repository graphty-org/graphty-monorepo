/**
 * @file `session.data.mergeNodes`: the merged nodes' edges move to the kept node, the kept node
 * takes the chosen values, and one undo puts every node and edge back.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { isGraphtyError } from "../../src/errors";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { withConsumerStrictState } from "./helpers";

/**
 * Each edge as `source>target`, sorted.
 * @param session - The session.
 * @returns The pairs.
 */
function pairs(session: GraphSession): string[] {
    return session.data
        .edges()
        .map((edge) => `${String(edge.source)}>${String(edge.target)}`)
        .sort();
}

/**
 * A session holding a, b, c and d, with a-b, b-c, c-d and d-b.
 * @param edges - The edge records to add; source/target spelled by default.
 * @returns The session.
 */
async function fourNodes(
    edges: Record<string, unknown>[] = [
        { source: "a", target: "b", kind: "x", weight: 2 },
        { source: "b", target: "c", kind: "y" },
        { source: "c", target: "d", kind: "z" },
        { source: "d", target: "b", kind: "w" },
    ],
): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
        { id: "d", name: "D" },
    ]);
    await session.data.addEdges(edges);
    return session;
}

describe("merging nodes", () => {
    it("moves every edge of a merged node to the kept node, keeping its record", async () => {
        const session = await fourNodes();
        await session.data.mergeNodes(["b", "d"]);

        assert.deepEqual(
            session.data.nodes().map((node) => node.id),
            ["a", "b", "c"],
        );
        // c-d became c-b; d-b became a loop on b.
        assert.deepEqual(pairs(session), ["a>b", "b>b", "b>c", "c>b"]);
        const moved = session.data.edges().find((edge) => edge.kind === "z");
        assert.strictEqual(moved?.target, "b");
        assert.strictEqual(session.data.edges().find((edge) => edge.kind === "x")?.weight, 2);
        session.dispose();
    });

    it("keeps the node `into` names, and patches the values onto it", async () => {
        const session = await fourNodes();
        await session.data.mergeNodes(["a", "b"], { into: "b", values: { name: "AB" } });

        assert.isUndefined(session.data.node("a"));
        assert.deepEqual(session.data.node("b"), { id: "b", name: "AB" });
        assert.deepEqual(pairs(session), ["b>b", "b>c", "c>d", "d>b"]);
        session.dispose();
    });

    it("is one undo step that puts back both nodes and every edge", async () => {
        const session = await fourNodes();
        const before = pairs(session);
        const steps = session.history.steps.length;
        await session.data.mergeNodes(["b", "c", "d"], { values: { name: "BCD" } });

        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.deepEqual(session.history.steps.at(-1)?.fact, { code: "data.merge-nodes", params: { count: 3 } });
        assert.strictEqual(session.status.counts.nodes, 2);

        await session.undo();
        assert.strictEqual(session.status.counts.nodes, 4);
        assert.deepEqual(pairs(session), before);
        assert.strictEqual(session.data.node("b")?.name, "B");

        await session.redo();
        assert.strictEqual(session.status.counts.nodes, 2);
        assert.strictEqual(session.data.node("b")?.name, "BCD");
        session.dispose();
    });

    it("writes the moved ends under the keys the records named them by", async () => {
        const session = await fourNodes([
            { src: "a", dst: "b" },
            { src: "c", dst: "a" },
        ]);
        await session.data.mergeNodes(["a", "c"]);

        const edges = session.data.edges();
        assert.strictEqual(session.data.lastImport()?.endpoints.source, "src");
        assert.deepEqual(
            edges.map((edge) => [edge.source, edge.target, edge.src, edge.dst]),
            // The keys naming the ends stay out of every record, the moved one's included.
            [
                ["a", "b", undefined, undefined],
                ["a", "a", undefined, undefined],
            ],
        );
        session.dispose();
    });

    it("finds an integer id in either spelling, and does nothing for one node", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: 1 }, { id: 2 }]);
        await session.data.addEdges([{ source: 2, target: 1 }]);
        const steps = session.history.steps.length;

        await session.data.mergeNodes(["1"]);
        assert.strictEqual(session.history.steps.length, steps);

        await session.data.mergeNodes(["1", "2"]);
        assert.deepEqual(
            session.data.nodes().map((node) => node.id),
            [1],
        );
        assert.deepEqual(pairs(session), ["1>1"]);
        session.dispose();
    });

    it("refuses a node the graph does not hold, and changes nothing", async () => {
        const session = await fourNodes();
        let code: string | null = null;
        try {
            await session.data.mergeNodes(["a", "nobody"]);
        } catch (error) {
            code = isGraphtyError(error) ? error.code : "other";
        }

        assert.strictEqual(code, "E_BAD_COMMAND");
        assert.strictEqual(session.status.counts.nodes, 4);
        session.dispose();
    });
});

describe("merging nodes does work in proportion to its reach", () => {
    it("SessionDataApi.mergeNodes: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            (size) =>
                withConsumerStrictState(async () => {
                    const session = createGraphSession();
                    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
                    await session.data.addNodes(ids.map((id) => ({ id })));
                    await session.data.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
                    // Half the nodes merge into n0, taking half the edges with them.
                    const half = ids.filter((_, at) => at % 2 === 0);
                    const visits = await visitsDuring(() => session.data.mergeNodes(half));
                    session.dispose();
                    return visits;
                }),
            { sizes: [200, 800], growth: "linear", counter: "elements visited by SessionDataApi.mergeNodes" },
        );
    });
});
