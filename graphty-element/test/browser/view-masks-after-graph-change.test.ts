/**
 * @file The selection and the visibility filter are drawn correctly after the render objects
 * change under them: a second dataset loaded, the graph cleared, the view switched between 2D
 * and 3D (issue #2953). Each of those builds new nodes, edges or meshes, so the frame's mask pass
 * must not trust what it drew on the old ones.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";

/** A path of `n` nodes, ids `<prefix>0`..; its two ends have degree 1. */
function path(prefix: string, n: number): string {
    const ids = Array.from({ length: n }, (_, at) => `${prefix}${String(at)}`);
    return JSON.stringify({
        nodes: ids.map((id) => ({ id })),
        edges: ids.slice(1).map((dst, at) => ({ src: ids[at], dst })),
    });
}

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * Mount a graphty-element.
 * @returns The element.
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    await element.graph.setLayout("random");
    return element;
}

/**
 * Load inline JSON the way a host does and wait for it to be drawn.
 * @param element - The element.
 * @param data - The JSON.
 */
async function load(element: Graphty, data: string): Promise<void> {
    element.dataSource = "json";
    element.dataSourceConfig = { data };
    await element.waitForSettled();
}

/**
 * Wait until a frame has drawn what the masks say.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await element.waitForSettled();
    await element.waitForStableFrame();
}

/**
 * Assert every node and edge is drawn as the session's selection and visibility say.
 * @param element - The element.
 * @param when - What just happened, for the message.
 */
function assertMatchesMasks(element: Graphty, when: string): void {
    const { selection, visibility } = element.graph.getSession();
    const dm = element.graph.getDataManager();

    for (const node of dm.nodes.values()) {
        const id = String(node.id);
        const visible = visibility.isVisible(node.id);
        assert.strictEqual(node.getRenderState(), visible ? "visible" : "hidden", `${when}: node ${id} render state`);
        assert.strictEqual(node.mesh.isEnabled(), visible, `${when}: node ${id} mesh drawn`);
        assert.strictEqual(node.isSelected(), selection.has(node.id), `${when}: node ${id} selected`);
    }

    for (const edge of dm.edges.values()) {
        assert.strictEqual(edge.isRenderVisible(), visibility.isVisible(edge.id), `${when}: edge ${edge.id} visible`);
        assert.strictEqual(edge.isSelected(), selection.has(edge.id), `${when}: edge ${edge.id} selected`);
    }
}

/**
 * Load a path, select two nodes and an edge, hide the two ends, and check it is drawn.
 * @returns The element.
 */
async function selectedAndFiltered(): Promise<Graphty> {
    const element = await mount();
    await load(element, path("a", 6));
    const edge = [...element.graph.getDataManager().edges.keys()][2];
    await element.graph.select({ nodes: ["a1", "a2"], edges: [edge] });
    await element.graph.getSession().visibility.set({ kind: "degree", min: 2 });
    await drawn(element);
    assertMatchesMasks(element, "before");
    assert.isTrue(element.graph.getDataManager().nodes.get("a1")?.isSelected(), "a1 is drawn selected");
    assert.strictEqual(element.graph.getDataManager().nodes.get("a0")?.getRenderState(), "hidden", "a0 is hidden");
    return element;
}

describe("the selection and visibility masks after the graph changes under them", () => {
    it("draws a second dataset, with the same ids and with new ones, as the masks say", async () => {
        const element = await selectedAndFiltered();

        element.clearData();
        await load(element, path("a", 6));
        await drawn(element);
        assertMatchesMasks(element, "after reloading the same ids");

        await element.graph.select({ nodes: ["a3"] });
        await drawn(element);
        assertMatchesMasks(element, "after selecting in the reloaded graph");

        element.clearData();
        await load(element, path("b", 7));
        await element.graph.select({ nodes: ["b2"] });
        await drawn(element);
        assertMatchesMasks(element, "after loading new ids");
    });

    it("draws nothing selected after a clear, and a later load as the masks say", async () => {
        const element = await selectedAndFiltered();

        element.clearData();
        await drawn(element);
        assert.strictEqual(element.graph.getDataManager().nodes.size, 0);
        assertMatchesMasks(element, "after clearing");

        await load(element, path("c", 5));
        await element.graph.select({ nodes: ["c1"] });
        await drawn(element);
        assertMatchesMasks(element, "after loading into the cleared graph");
    });

    it("hides a loaded dataset none of whose nodes passes the filter", async () => {
        const element = await selectedAndFiltered();

        element.clearData();
        await drawn(element);
        await load(element, path("d", 2));
        await drawn(element);
        assertMatchesMasks(element, "after loading a dataset the filter hides entirely");

        await element.graph.addNodes([{ id: "lone" }]);
        await drawn(element);
        assertMatchesMasks(element, "after adding a node the filter hides");
    });

    it("keeps the selection and the filter drawn across a 2D/3D switch and back", async () => {
        const element = await selectedAndFiltered();

        await element.graph.setViewMode("2d");
        await drawn(element);
        assertMatchesMasks(element, "after switching to 2D");

        await element.graph.select({ nodes: ["a3"] });
        await drawn(element);
        assertMatchesMasks(element, "after selecting in 2D");

        await element.graph.setViewMode("3d");
        await drawn(element);
        assertMatchesMasks(element, "after switching back to 3D");
    });
});
