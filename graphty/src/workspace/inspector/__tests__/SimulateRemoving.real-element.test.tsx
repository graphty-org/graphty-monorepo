/**
 * Simulate removing, on the REAL graphty-element: the node and edge inspectors' action runs the
 * element's removal impact on what is selected, opens its result, and leaves the graph as it was.
 *
 * The graph: a triangle a-b-c joined to a pair d-e by the bridge c-d.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { act, render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * Renders the workspace and waits for the element and the graph.
 * @returns the element and the store.
 */
async function open(): Promise<{ element: Element; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Bridge", id: 1 } });
    render(<Workspace store={store} />);
    let found: Element | null = null;
    await waitFor(() => {
        found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
    });
    if (found === null) {
        throw new Error("the element never came up");
    }
    const element: Element = found;
    await element.session.config.set({ data: { directed: false } });
    await element.session.data.addNodes(["a", "b", "c", "d", "e"].map((id) => ({ id })));
    await element.session.data.addEdges(
        [
            ["a", "b"],
            ["b", "c"],
            ["a", "c"],
            ["c", "d"],
            ["d", "e"],
        ].map(([source, target]) => ({ source, target })),
    );
    return { element, store };
}

/**
 * Chooses Simulate removing from the inspector's actions menu and waits for the run it opens.
 * @param element - the element.
 * @param store - the workspace store.
 * @param kind - the inspector's kind word, on its actions button.
 * @returns the nodes the run marks cut off, and its graph facts.
 */
async function simulate(
    element: Element,
    store: WorkspaceStore,
    kind: "Node" | "Edge",
): Promise<{ params: Readonly<Record<string, unknown>>; cutOff: string[]; graph: Record<string, unknown> }> {
    await userEvent.click(await screen.findByRole("button", { name: `${kind} actions` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Simulate removing/ }));
    let id = "";
    await waitFor(() => {
        const { inspected } = store.get();
        assert.strictEqual(inspected?.kind, "run-row");
        id = inspected?.id ?? "";
    });
    const run = element.session.runs.list().find((each) => each.id === id);
    assert.strictEqual(run?.algorithm, "removal-impact");
    const result = await (run as NonNullable<typeof run>);
    const cutOff = ["a", "b", "c", "d", "e"].filter((node) => result.node(node)?.in === true);
    return { params: run?.params ?? {}, cutOff, graph: { ...result.graph } };
}

describe("Simulate removing", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("from a node's menu runs removal impact on the node and leaves the graph unchanged", async () => {
        const { element, store } = await open();
        await act(async () => {
            await element.session.selection.apply({ nodes: ["c"] });
        });

        const { params, cutOff, graph } = await simulate(element, store, "Node");

        assert.deepEqual(params.nodes, ["c"]);
        // a-b and d-e are left the same size: the part holding the first node stays, the other is cut off.
        assert.deepEqual(cutOff, ["d", "e"]);
        assert.deepInclude(graph, { componentsBefore: 1, componentsAfter: 2 });
        assert.lengthOf(element.session.data.nodes(), 5);
        assert.lengthOf(element.session.data.edges(), 5);
    });

    it("from an edge's menu runs removal impact on the edge", async () => {
        const { element, store } = await open();
        const bridge = element.session.data.edges().find((edge) => edge.source === "c" && edge.target === "d");
        assert.isDefined(bridge);
        await act(async () => {
            await element.session.selection.apply({ edges: [bridge?.id ?? ""] });
        });

        const { params, cutOff, graph } = await simulate(element, store, "Edge");

        assert.deepEqual(params.edges, [bridge?.id]);
        assert.deepEqual(cutOff, ["d", "e"]);
        assert.deepInclude(graph, { removedEdges: 1, removedNodes: 0 });
        assert.lengthOf(element.session.data.edges(), 5);
    });
});
