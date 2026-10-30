/**
 * Selection as a way into a layer's rule, on the REAL graphty-element: "New layer from selection"
 * makes a layer of what is selected, keeping the rule the selection came from when it came from one.
 * Every assertion reads what the element reports: the layer's selector and how many it matches.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Five people, three with "bob" in their name, spread out on a line so each is easy to click. */
const NODES = [
    { id: "a", name: "Bob", age: 31 },
    { id: "b", name: "Bobby Tables", age: 12 },
    { id: "c", name: "Ann", age: 40 },
    { id: "d", name: "jimbob", age: 33 },
    { id: "e", name: "Eve", age: 5 },
].map((node, i) => ({ ...node, position: { x: (i - 2) * 6, y: 0, z: 0 } }));
const EDGES = [
    { source: "a", target: "b" },
    { source: "c", target: "d" },
];

/** The workspace with a project open, the element's session, its element and the store. */
interface Opened {
    readonly session: GraphSession;
    readonly element: HTMLElementTagNameMap["graphty-element"];
    readonly store: WorkspaceStore;
}

/**
 * Renders the workspace with a project open, waits for the element and loads the graph, laid out
 * where the data puts it.
 * @returns the session, the element and the store.
 */
async function openWithGraph(): Promise<Opened> {
    const store = createWorkspaceStore({ project: { name: "People", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    let element: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(() => {
        element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element as HTMLElementTagNameMap["graphty-element"];
    await session.layout.set("fixed");
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return { session, element, store };
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
 * Picks "New layer from selection" from the inspector's actions menu for the selection, then sets
 * the new layer's first value, a node color, which makes it a layer.
 * @param hex - the color, six hex digits.
 */
async function newLayerFromSelection(hex: string): Promise<void> {
    const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
    await userEvent.click(await inspector.findByRole("button", { name: /actions$/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /New layer from selection/ }));
    const tab = await screen.findByTestId("style-tab", {});
    // Fill's "+" adds Color; typing its hex writes it.
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node fill" }));
    const field = await screen.findByRole("textbox", { name: /^Node color(,|$)/ });
    await userEvent.clear(field);
    await userEvent.type(field, `${hex}{Enter}`);
}

describe("selection as a way into a rule", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Shift-clicking two nodes and choosing New layer from selection makes a layer of those 2", async () => {
        const { session, element } = await openWithGraph();
        await element.waitForStableFrame();
        const before = readerLayers(session).length;
        const at = (id: string): { x: number; y: number } => {
            const p = element.nodeScreenPosition(id);
            if (p?.visible !== true) {
                throw new Error(`node ${id} is not on screen`);
            }
            return { x: p.x, y: p.y };
        };
        await userEvent.click(element, { position: at("a") });
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["a"]);
        });
        // The camera turns to pivot on the selection; read where c is once it has settled.
        await element.waitForStableFrame();
        await userEvent.keyboard("{Shift>}");
        await userEvent.click(element, { position: at("c") });
        await userEvent.keyboard("{/Shift}");
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["a", "c"]);
        });

        await newLayerFromSelection("00AA55");
        await waitFor(() => {
            assert.lengthOf(readerLayers(session), before + 1);
        });
        const made = readerLayers(session).at(-1);
        assert.isDefined(made);
        assert.deepEqual(made.selector, { match: "ids", nodes: ["a", "c"], edges: [] });
        assert.strictEqual(session.styles.counts(made.id).matched, 2);
    });

    it("New layer from selection on the canvas menu makes the layer at once and opens its Style tab", async () => {
        const { session, element } = await openWithGraph();
        await element.waitForStableFrame();
        const before = readerLayers(session).length;
        const at = (id: string): { x: number; y: number } => {
            const p = element.nodeScreenPosition(id);
            if (p?.visible !== true) {
                throw new Error(`node ${id} is not on screen`);
            }
            return { x: p.x, y: p.y };
        };
        await userEvent.click(element, { position: at("a") });
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["a"]);
        });
        // The camera turns to pivot on the selection; read where each node is once it has settled.
        await element.waitForStableFrame();
        await userEvent.keyboard("{Shift>}");
        await userEvent.click(element, { position: at("c") });
        await userEvent.keyboard("{/Shift}");
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["a", "c"]);
        });
        await element.waitForStableFrame();

        // A right-click on a selected node keeps the selection and lists its commands.
        await userEvent.click(element, { position: at("a"), button: "right" });
        await userEvent.click(await screen.findByRole("menuitem", { name: /New layer from selection/ }));

        // The layer is made with no value set yet, named after the selection.
        await waitFor(() => {
            assert.lengthOf(readerLayers(session), before + 1);
        });
        const made = readerLayers(session).at(-1);
        assert.isDefined(made);
        assert.deepEqual(made.selector, { match: "ids", nodes: ["a", "c"], edges: [] });
        // It is the selected row of the tree, a notice names it, and focus is on its Style tab.
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await waitFor(() => {
            const row = within(tree).getByRole("treeitem", { selected: true });
            assert.include(row.textContent, made.name);
        });
        // The notice, and the status line that speaks it.
        assert.isNotEmpty(await screen.findAllByText("Made a layer for the 2 selected nodes"));
        await waitFor(() => {
            const focused = document.activeElement;
            assert.strictEqual(focused?.getAttribute("role"), "tab");
            assert.strictEqual(focused?.textContent, "Style");
            assert.isNotNull(focused?.closest('[data-inspected="layer-row"]'));
        });

        // Undo takes the layer back.
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.lengthOf(readerLayers(session), before);
        });
    });

    it("a selection made by a rule makes a layer with that rule", async () => {
        const { session } = await openWithGraph();
        const before = readerLayers(session).length;
        const find = await screen.findByRole("combobox", { name: "Find" });
        await userEvent.click(find);
        await userEvent.keyboard("=age > `30`{Enter}");
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes], ["a", "c", "d"]);
        });

        await newLayerFromSelection("00AA55");
        await waitFor(() => {
            assert.lengthOf(readerLayers(session), before + 1);
        });
        const made = readerLayers(session).at(-1);
        assert.isDefined(made);
        assert.deepEqual(made.selector, { match: "expression", where: "age > `30`" });
        assert.strictEqual(session.styles.counts(made.id).matched, 3);
    });
});
