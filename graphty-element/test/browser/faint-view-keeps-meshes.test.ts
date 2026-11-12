/**
 * @file Counted work of a faint branches view (`styles.showBranches` with `rest: "faint"`),
 * the picture the graphty app's selection workspace draws while a reader picks. A node's opacity is
 * its source mesh's `visibility`, so a node painted faint moves to another source mesh; a node whose
 * paint differs from its mesh's only in its fill now moves its own instance onto that source instead
 * of being disposed and rebuilt with its label and border (#6047). Counted (node meshes replaced),
 * never timed.
 */
import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { UnionLeaf } from "../../session";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";

/** How many nodes the one branch holds, whatever the graph's size. */
const MEMBERS = 5;

/** A selection of the nodes in group "picked", in one branch with its color. */
const PICKED: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "b1",
            color: "#d55e00",
            start: "all",
            steps: [
                { id: "s1", op: "keep", rule: { kind: "categories", attribute: "data.group", values: ["picked"] } },
            ],
        },
    ],
};

const graphs: { graph: Graph; container: HTMLElement }[] = [];

afterEach(() => {
    for (const { graph, container } of graphs.splice(0)) {
        graph.dispose();
        container.remove();
    }
});

/**
 * A graph of `size` nodes, painted.
 * @param size - How many nodes.
 * @returns The graph.
 */
async function graphOf(size: number): Promise<Graph> {
    (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    graphs.push({ graph, container });
    await graph.init();
    await graph.setLayout("random");
    await graph.getSession().data.addNodes(
        Array.from({ length: size }, (_unused, at) => ({
            id: `n${String(at)}`,
            group: at < MEMBERS ? "picked" : "rest",
        })),
    );
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForPainted();
    return graph;
}

/**
 * Each node's own mesh, now.
 * @param graph - The graph.
 * @returns The mesh of each node.
 */
function meshesOf(graph: Graph): Map<Node, AbstractMesh | null> {
    return new Map([...graph.getDataManager().nodes.values()].map((node) => [node, node.drawnPickMesh]));
}

/**
 * How many nodes are drawn by another mesh than the one they had.
 * @param graph - The graph.
 * @param before - Each node's mesh before.
 * @returns The nodes whose mesh was replaced.
 */
function replaced(graph: Graph, before: Map<Node, AbstractMesh | null>): number {
    let count = 0;
    for (const node of graph.getDataManager().nodes.values()) {
        if (node.drawnPickMesh !== before.get(node)) {
            count++;
        }
    }

    return count;
}

/**
 * Show a faint view over a graph of `size` nodes and end it, counting the node meshes replaced by
 * the view's opening and by its end.
 * @param size - How many nodes.
 * @returns The node meshes replaced.
 */
async function meshesForAFaintView(size: number): Promise<number> {
    const graph = await graphOf(size);
    const shown = meshesOf(graph);
    const view = graph.getSession().styles.showBranches({ rule: PICKED, rest: "faint" });
    await graph.waitForPainted();
    const opened = replaced(graph, shown);
    const faint = meshesOf(graph);
    view.end();
    await graph.waitForPainted();
    return opened + replaced(graph, faint);
}

describe("a faint branches view", () => {
    it("replaces no node's mesh when it opens or when it ends", async () => {
        // Every node's paint changes only in its fill: the rest's opacity, the branch's colour.
        assert.strictEqual(await meshesForAFaintView(400), 0, "node meshes replaced");
    });

    it("draws the rest at the faint opacity, and at full opacity again once the view ends", async () => {
        const graph = await graphOf(20);
        const rest = graph.getDataManager().getNode("n10");
        const member = graph.getDataManager().getNode("n0");
        assert.isDefined(rest);
        assert.isDefined(member);
        const before = rest.drawnOpacity;

        const view = graph.getSession().styles.showBranches({ rule: PICKED, rest: "faint" });
        await graph.waitForPainted();
        assert.closeTo(rest.drawnOpacity, 0.2, 1e-6, "a node outside the branch is faint");
        assert.closeTo(member.drawnOpacity, before, 1e-6, "a branch member keeps its opacity");

        view.end();
        await graph.waitForPainted();
        assert.closeTo(rest.drawnOpacity, before, 1e-6, "the node is drawn as before once the view ends");
    });
});
