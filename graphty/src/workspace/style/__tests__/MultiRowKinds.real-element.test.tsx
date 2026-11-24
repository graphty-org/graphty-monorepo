/**
 * Several layers edited together (a folder selected), on the REAL graphty-element with real clicks
 * and keys: the kind switches turn edges on and nodes off for every layer in one step each, and an
 * edge color typed while only one layer sets it goes to that layer, with a receipt that offers to set the other.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { receiptSays } from "./tooltip";

/** What a scene holds: the session, the store and the folder's two layer rows, top first. */
interface Scene {
    readonly session: GraphSession;
    readonly store: WorkspaceStore;
    readonly rows: readonly string[];
}

/**
 * Les Miserables with a folder "Pair" of two hand-made layers of one kind, each writing `set`.
 * @param target - Nodes or edges.
 * @param set - What each layer writes.
 * @returns The scene.
 */
async function openScene(
    target: "node" | "edge",
    set: Readonly<Partial<Record<Channel, string | number>>>,
): Promise<Scene> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.config.set({ layoutBehavior: { preSteps: 1000 } });
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const folder = await session.styles.addFolder("Pair");
    const ids = session.data.nodes().map((node) => String(node.id));
    for (const [at, name] of ["First", "Second"].entries()) {
        const layer = await session.styles.add({
            name: `Pair ${name}`,
            target,
            selector:
                target === "node"
                    ? { match: "ids", nodes: ids.slice(at * 2, at * 2 + 2) }
                    : { match: "rule", where: { kind: "range", attribute: "data.value", min: at + 1, max: at + 1 } },
            set,
        });
        await session.styles.moveRow(layer.id, { parent: folder.id });
    }
    await session.styles.settled();
    const rows = session.styles.layersUnder([folder.id]).map((reach) => reach.row);
    return { session, store, rows };
}

/**
 * Select a row of the style tree by clicking it.
 * @param name - The row's name.
 */
async function clickRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(within(tree).getByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

/**
 * Show one kind's tab of the Style panel.
 * @param name - "Node" or "Edge".
 */
async function showTab(name: "Node" | "Edge"): Promise<void> {
    const tab = await screen.findByTestId("style-tab");
    const button = within(tab).getByRole("tab", { name: new RegExp(`^${name}`) });
    await userEvent.click(button);
    await waitFor(() => {
        assert.equal(button.getAttribute("aria-selected"), "true");
    });
}

/**
 * Whether each row has a part of a kind.
 * @param session - The session.
 * @param rows - The rows.
 * @param side - The kind.
 * @returns One flag per row.
 */
function styles(session: GraphSession, rows: readonly string[], side: "node" | "edge"): boolean[] {
    return rows.map((id) => session.styles.parts(id)?.[side] !== undefined);
}

describe("several layers' kinds and an edge color", () => {
    it("turns edges on and nodes off for both layers", async () => {
        const { session, store, rows } = await openScene("node", { "node.size": 2 });
        await clickRow("Pair");

        await showTab("Edge");
        await userEvent.click(await screen.findByRole("checkbox", { name: "Style edges" }));
        await waitFor(() => {
            assert.deepEqual(styles(session, rows, "edge"), [true, true]);
        });
        assert.equal(store.get().announcement, "2 layers now style edges");

        await showTab("Node");
        const nodes = await screen.findByRole("checkbox", { name: "Style nodes" });
        assert.isTrue((nodes as HTMLInputElement).checked);
        await userEvent.click(nodes);
        await waitFor(() => {
            assert.deepEqual(styles(session, rows, "node"), [false, false]);
        });
        assert.equal(store.get().announcement, "2 layers no longer style nodes");
        assert.deepEqual(styles(session, rows, "edge"), [true, true], "edges stay");
        // The switch for a kind that is every layer's only one is #9685's (RowKinds.real-element.test.tsx).
    });

    it("writes a typed edge color to the one layer that sets it, then Also set those reaches the other", async () => {
        const { session, rows } = await openScene("edge", { "edge.width": 2 });
        const [first, second] = rows.map((id) => session.styles.parts(id)?.edge ?? id);
        await session.styles.update(first, { set: { "edge.width": 2, "edge.color": "#CC79A7" } });
        await session.styles.settled();
        await clickRow("Pair");

        await showTab("Edge");
        const tab = await screen.findByTestId("style-tab");
        const color = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row[data-line="edge.color"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(color).getByRole("textbox", { name: /^Edge color/ }));
        await userEvent.keyboard("{Control>}a{/Control}009E73{Enter}");
        await waitFor(() => {
            assert.equal(session.styles.get(first)?.set?.["edge.color"], "#009E73");
        });
        assert.isUndefined(session.styles.get(second)?.set?.["edge.color"], "the layer that sets no color is left");
        assert.match(await receiptSays(color), /1 changed, 1 left unset/);

        const receipt = await waitFor(() => {
            const found = color.querySelector<HTMLElement>("[data-receipt]");
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(receipt).getByRole("button", { name: "Also set those 1" }));
        await waitFor(() => {
            assert.equal(session.styles.get(second)?.set?.["edge.color"], "#009E73");
        });
    });
});
