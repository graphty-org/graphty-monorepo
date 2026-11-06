/**
 * @file Counted-work scaling of a branches view (`styles.showBranches`), the picture the graphty
 * app's selection workspace draws while a reader picks, with the base look held by the Everything
 * row (`editableBase`). The view suspends the Everything row with every other layer; the element's
 * base layers then paint the base look, so a node outside every branch keeps the mesh it is drawn
 * with and only a branch's members are rebuilt. Before that, every node lost the base look under
 * the view and was rebuilt as an unstyled default, and again when the view ended: 50,000 rebuilds
 * each way on the app's large graph (#5753). Counted (meshes added to the scene), never timed.
 */
import { afterEach, describe, it } from "vitest";

import type { UnionLeaf } from "../../session";
import { Graph, operationQueueOf } from "../../src/Graph";
import { assertScalesLinearly } from "../helpers/cost";

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
 * Show the view over a graph of `size` nodes and end it, counting the meshes added meanwhile.
 * @param size - How many nodes.
 * @returns The meshes added.
 */
async function meshesForAView(size: number): Promise<number> {
    (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    graphs.push({ graph, container });
    await graph.init();
    const session = graph.getSession();
    await session.config.set({ startingRows: true, editableBase: true });
    await graph.setLayout("random");
    await session.data.addNodes(
        Array.from({ length: size }, (_unused, at) => ({
            id: `n${String(at)}`,
            group: at < MEMBERS ? "picked" : "rest",
        })),
    );
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForPainted();

    let added = 0;
    const counting = graph.scene.onNewMeshAddedObservable.add(() => {
        added++;
    });
    const view = session.styles.showBranches({ rule: PICKED, rest: "plain" });
    await graph.waitForPainted();
    view.end();
    await graph.waitForPainted();
    graph.scene.onNewMeshAddedObservable.remove(counting);
    return added;
}

describe("a branches view over the editable base", () => {
    it("rebuilds only the branch's members, however many nodes the graph holds", async () => {
        await assertScalesLinearly(meshesForAView, {
            sizes: [200, 800],
            growth: "constant",
            counter: "meshes added while a view was shown and ended",
        });
    });
});
