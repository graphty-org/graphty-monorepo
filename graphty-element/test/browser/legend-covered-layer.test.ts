/**
 * @file The legend leaves out a block whose channel a layer above paints on every element the
 * block's layer reaches: a key row for colors no node shows is a false claim.
 *
 * Runs the real Degree and then the real Louvain on a real element with each run's own suggested
 * layers, the path a consumer takes.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** Two rings of six nodes, joined by nothing: every node has a degree and a group. */
function twoRings(): { nodes: { id: string }[]; edges: { src: string; dst: string }[] } {
    const nodes: { id: string }[] = [];
    const edges: { src: string; dst: string }[] = [];

    for (const ring of ["a", "b"]) {
        for (let index = 0; index < 6; index++) {
            nodes.push({ id: `${ring}${String(index)}` });
            edges.push({ src: `${ring}${String(index)}`, dst: `${ring}${String((index + 1) % 6)}` });
        }
    }

    return { nodes, edges };
}

describe("a layer painted over on every node it reaches", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        const { nodes, edges } = twoRings();
        await graph.addNodes(nodes);
        await graph.addEdges(edges);
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("has no color block in the legend after a community run paints every node", async () => {
        const degree = session.runs.start("degree");
        await degree;
        await operationQueueOf(graph).waitForCompletion();
        await session.styles.settled();

        assert.isDefined(
            session.styles.legend().find((block) => block.runId === degree.id && block.channel === "node.color"),
            "Degree alone colors every node, so the key has its block",
        );

        const louvain = session.runs.start("louvain");
        await louvain;
        await operationQueueOf(graph).waitForCompletion();
        await session.styles.settled();

        const colors = session.styles.legend().filter((block) => block.channel === "node.color");

        assert.deepEqual(
            colors.map((block) => block.runId),
            [louvain.id],
            "every node shows its group color, so only the groups are in the key",
        );
    });
});
