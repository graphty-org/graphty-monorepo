/**
 * A node's inspector header on the REAL graphty-element, driven by real clicks (#3128): Pin holds
 * the node through `session.positions`, Unpin lets it go, and Copy id puts its id on the clipboard.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, NodeId } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A small graph file. */
const PAIRS = "graph [\n node [ id 1 ]\n node [ id 2 ]\n edge [ source 1 target 2 ]\n]\n";

/**
 * The workspace on a two-node graph, with its first node selected and inspected.
 * @returns the session, the node and the inspector.
 */
async function inspectNode(): Promise<{ session: GraphSession; node: NodeId; inspector: HTMLElement }> {
    const store = createWorkspaceStore({ project: { name: "Pairs", id: 1 }, inspected: null });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "pairs.gml", config: { data: PAIRS } });
    await session.styles.settled();
    const [node] = session.data.nodes().map((each) => each.id);
    await session.selection.apply({ nodes: [node] });
    const inspector = await screen.findByRole("complementary", { name: "Inspector" });
    return { session, node, inspector };
}

describe("a node's inspector header", () => {
    it("Pin pins the node, and Unpin lets it go", async () => {
        const { session, node, inspector } = await inspectNode();
        assert.isFalse(session.positions.pinned.has(node));
        await userEvent.click(page.elementLocator(inspector).getByRole("button", { name: "Pin", exact: true }));
        await waitFor(() => {
            assert.isTrue(session.positions.pinned.has(node));
        });
        await userEvent.click(page.elementLocator(inspector).getByRole("button", { name: "Unpin", exact: true }));
        await waitFor(() => {
            assert.isFalse(session.positions.pinned.has(node));
        });
        await within(inspector).findByRole("button", { name: "Pin" });
    });

    it("Copy id puts the node's id on the clipboard", async () => {
        const { node, inspector } = await inspectNode();
        await userEvent.click(page.elementLocator(inspector).getByRole("button", { name: "Copy id", exact: true }));
        await waitFor(async () => {
            assert.equal(await navigator.clipboard.readText(), String(node));
        });
    });
});
