/**
 * Search and selection as ways into a layer's rule, on the REAL graphty-element: a layer's find
 * field offers what it finds as a live rule or a fixed list, and "New layer from selection" makes
 * a layer of what is selected, keeping the rule the selection came from when it came from one.
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

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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
    await waitFor(
        () => {
            element = document.querySelector("graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
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
    await userEvent.click(await inspector.findByRole("button", { name: /actions$/ }, { timeout: TIMEOUT_MS }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /New layer from selection/ }));
    const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
    // Node color is always drawn; typing its hex writes it.
    const field = within(await within(tab).findByRole("group", { name: /^Node color, / })).getByRole("textbox", {
        name: "Node color",
    });
    await userEvent.clear(field);
    await userEvent.type(field, `${hex}{Enter}`);
}

describe("search and selection as ways into a rule", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("typing bob in a layer's find field offers 'name contains bob' as a live rule, and picking it paints those 3", async () => {
        const { session, store } = await openWithGraph();
        const layer = await session.styles.add({
            name: "People",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        store.set({ inspected: { kind: "layer-row", id: layer.id } });
        const style = await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }

        const field = await screen.findByRole("combobox", { name: "Find elements" }, { timeout: TIMEOUT_MS });
        await userEvent.click(field);
        await userEvent.keyboard("bob");
        const live = await screen.findByRole("option", { name: "Nodes where name contains bob, 3 nodes" });
        assert.isNotNull(screen.queryByRole("option", { name: "These 3 nodes" }), "the fixed list is offered too");
        await userEvent.click(live);

        await waitFor(() => {
            const now = session.styles.get(layer.id);
            assert.strictEqual(now?.selector.match, "rule");
            assert.strictEqual(session.styles.counts(layer.id).matched, 3);
        });
        // A live rule follows the data: a new Bob joins the layer.
        await session.data.addNodes([{ id: "f", name: "Bobo", age: 1, position: { x: 30, y: 0, z: 0 } }]);
        await waitFor(() => {
            assert.strictEqual(session.styles.counts(layer.id).matched, 4);
        });
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

    it("a selection made by a rule makes a layer with that rule", async () => {
        const { session } = await openWithGraph();
        const before = readerLayers(session).length;
        const find = await screen.findByRole("combobox", { name: "Find" }, { timeout: TIMEOUT_MS });
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
