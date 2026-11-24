/**
 * "New layer from selection" on the REAL graphty-element, for a selection that holds edges or a
 * neighborhood (a node and its connections): the new layer styles edges, so its Style tab's Edge
 * side offers "Add to edge line" at once.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Three people on a line, joined a-b and b-c, spread out so each node and edge is easy to click. */
const NODES = ["a", "b", "c"].map((id, i) => ({
    id,
    name: id.toUpperCase(),
    position: { x: (i - 1) * 8, y: 0, z: 0 },
}));
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
];

type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * Renders the workspace with a project open and loads the graph where the data puts it.
 * @returns the session and the element.
 */
async function openWithGraph(): Promise<{ session: GraphSession; element: Element }> {
    const store = createWorkspaceStore({ project: { name: "People", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    let element: Element | null = null;
    await waitFor(() => {
        element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element as Element;
    await session.layout.set("fixed");
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return { session, element };
}

/**
 * Where a node is on screen.
 * @param element - the element.
 * @param id - the node.
 * @returns its position on the canvas.
 */
function at(element: Element, id: string): { x: number; y: number } {
    const p = element.nodeScreenPosition(id);
    if (p?.visible !== true) {
        throw new Error(`node ${id} is not on screen`);
    }
    return { x: p.x, y: p.y };
}

/**
 * The reader's own layers, bottom first.
 * @param session - the element's session.
 * @returns the layers.
 */
function readerLayers(session: GraphSession): Layer[] {
    return session.styles.list().filter((l) => l.source.by === "user");
}

/**
 * Opens the new layer's Edge side and checks it styles edges and offers Add to edge line.
 */
async function assertStylesEdges(): Promise<void> {
    const tab = await screen.findByTestId("style-tab", {});
    await userEvent.click(within(tab).getByRole("tab", { name: "Edge" }));
    assert.isTrue(within(tab).getByRole<HTMLInputElement>("checkbox", { name: "Style edges" }).checked);
    assert.isDefined(await within(tab).findByRole("button", { name: "Add to edge line" }));
}

describe("New layer from selection styles edges", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("styles the selected edges, so the Edge tab offers Add to edge line", async () => {
        const { session, element } = await openWithGraph();
        await element.waitForStableFrame();
        await userEvent.click(element, { position: at(element, "a") });
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["a"]);
        });
        // The camera turns to pivot on the selection; read where things are once it has settled.
        await element.waitForStableFrame();
        const a = at(element, "a");
        const b = at(element, "b");
        await userEvent.keyboard("{Shift>}");
        await userEvent.click(element, { position: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
        await userEvent.keyboard("{/Shift}");
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["a"]);
            assert.lengthOf(session.selection.edges, 1);
        });
        await element.waitForStableFrame();

        const before = readerLayers(session).length;
        await userEvent.click(element, { position: at(element, "a"), button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: /New layer from selection/ }));
        // One row with a node part and an edge part: two layers.
        await waitFor(() => {
            assert.sameMembers(
                readerLayers(session)
                    .slice(before)
                    .map((l) => l.target),
                ["node", "edge"],
            );
        });
        await assertStylesEdges();
    });

    it("a neighborhood's layer styles the edges among its nodes", async () => {
        const { session, element } = await openWithGraph();
        await element.waitForStableFrame();
        await userEvent.click(element, { position: at(element, "b") });
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["b"]);
        });
        await element.waitForStableFrame();
        await userEvent.keyboard("g");
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["a", "b", "c"]);
        });

        // The repro: the neighborhood's own actions menu in the inspector.
        const before = readerLayers(session).length;
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        await userEvent.click(await inspector.findByRole("button", { name: /actions$/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /New layer from selection/ }));
        await waitFor(() => {
            assert.sameMembers(
                readerLayers(session)
                    .slice(before)
                    .map((l) => l.target),
                ["node", "edge"],
            );
        });
        // The edge part paints the edges among the neighborhood's nodes: a-b and b-c.
        const edgePart = readerLayers(session)
            .slice(before)
            .find((l) => l.target === "edge");
        assert.isDefined(edgePart);
        assert.strictEqual(session.styles.counts(edgePart.id).matched, 2);
        await assertStylesEdges();

        // Making it is one undo step.
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.lengthOf(readerLayers(session), before);
        });
    });
});
