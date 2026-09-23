/**
 * @file On-demand expansion, reached the way a consumer reaches it.
 *
 * Double-clicking a node asks the consumer for that node's neighbourhood and adds what comes
 * back. The two functions that answer -- `fetchNodes` and `fetchEdges` -- are declared in
 * `GraphBehaviorOpts`, so `element.layoutBehavior = { fetchNodes, fetchEdges }` parses and is
 * stored in the configuration. `NodeBehavior` then looks for them somewhere else entirely: on
 * the `Graph` object's own `fetchNodes` and `fetchEdges` fields, which nothing in the package
 * ever assigned. The setting was accepted, kept, and never read; the only way to switch
 * expansion on was to reach past the element and write the field by hand, which is what every
 * test in `node-behavior.test.ts` does.
 *
 * This file asks for it through the public door instead.
 */

import { ActionManager } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import type { AdHocData } from "../../src/config";
import { Graph } from "../../src/Graph";

/**
 * Run a node's double-click action, whichever shape Babylon is holding it in.
 * @param graph - the graph the node belongs to
 * @param id - the node to expand
 */
function doubleClick(graph: Graph, id: string): void {
    const node = graph.getDataManager().getNode(id);
    assert.isDefined(node, "the node to expand is in the graph");

    const { actions } = node.mesh.actionManager ?? { actions: [] };
    const action = actions.find((candidate) => candidate.trigger === ActionManager.OnDoublePickTrigger);

    assert.isDefined(action, "double-clicking a node does something");
    (action as unknown as { execute?: () => void }).execute?.();
}

describe("expansion switched on through the element's own behaviour setting", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    test("setLayoutBehavior makes double-click ask the consumer for the neighbourhood", () => {
        const fetchEdges = vi.fn().mockReturnValue(new Set([{ source: "a", target: "b" }]));
        const fetchNodes = vi.fn().mockReturnValue([{ id: "b", data: {} }]);

        graph.setLayoutBehavior({ fetchNodes, fetchEdges });

        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "a" } as unknown as AdHocData);
        vi.spyOn(dataManager, "addNodes").mockImplementation(() => undefined);
        vi.spyOn(dataManager, "addEdges").mockImplementation(() => undefined);

        doubleClick(graph, "a");

        assert.strictEqual(fetchEdges.mock.calls.length, 1, "the consumer was asked for the edges");
        assert.strictEqual(fetchNodes.mock.calls.length, 1, "and for the nodes they name");
    });

    test("a behaviour set after a node is on screen still reaches that node", () => {
        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "a" } as unknown as AdHocData);

        const fetchEdges = vi.fn().mockReturnValue(new Set([{ source: "a", target: "b" }]));
        const fetchNodes = vi.fn().mockReturnValue([{ id: "b", data: {} }]);

        graph.setLayoutBehavior({ fetchNodes, fetchEdges });

        vi.spyOn(dataManager, "addNodes").mockImplementation(() => undefined);
        vi.spyOn(dataManager, "addEdges").mockImplementation(() => undefined);

        doubleClick(graph, "a");

        assert.strictEqual(fetchEdges.mock.calls.length, 1);
    });

    test("naming one pacing setting does not switch expansion back off", () => {
        const fetchEdges = vi.fn().mockReturnValue(new Set([{ source: "a", target: "b" }]));
        const fetchNodes = vi.fn().mockReturnValue([{ id: "b", data: {} }]);

        graph.setLayoutBehavior({ fetchNodes, fetchEdges });
        graph.setLayoutBehavior({ layout: { preSteps: 5 } });

        const dataManager = graph.getDataManager();
        dataManager.addNode({ id: "a" } as unknown as AdHocData);
        vi.spyOn(dataManager, "addNodes").mockImplementation(() => undefined);
        vi.spyOn(dataManager, "addEdges").mockImplementation(() => undefined);

        doubleClick(graph, "a");

        assert.strictEqual(fetchEdges.mock.calls.length, 1, "the merge kept the fetchers");
    });
});
