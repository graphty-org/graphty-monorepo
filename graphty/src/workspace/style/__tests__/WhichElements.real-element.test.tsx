/**
 * The Which elements editor on the REAL graphty-element: the rule's sentence opens it, condition
 * rows (the ones Data > Filters uses) make the rule, Escape restores the rule it opened on, and a
 * layer on nodes and edges with a node rule chooses the edges between or touching its nodes.
 * Every count is the element's (`styles.counts`), driven by real clicks and keys.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** 100 nodes with ids 0 to 99, on a line, each joined to the next. */
const NODES = Array.from({ length: 100 }, (_v, i) => ({ id: i, position: { x: i, y: 0, z: 0 } }));
const EDGES = Array.from({ length: 99 }, (_v, i) => ({ source: i, target: i + 1 }));

/**
 * Renders the workspace with a project open and loads the 100 nodes.
 * @returns the session and the store.
 */
async function openWithGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Line", id: 1 }, inspected: { kind: "everything-row" } });
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
    return { session, store };
}

/**
 * Opens a layer's Style tab and its Which elements editor.
 * @param store - the chrome store.
 * @param id - the layer.
 */
async function openEditor(store: WorkspaceStore, id: string): Promise<void> {
    store.set({ inspected: { kind: "layer-row", id } });
    const style = await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await userEvent.click(await screen.findByRole("button", { name: /^Which elements: / }, { timeout: TIMEOUT_MS }));
}

/**
 * Picks an option of a select by clicking it open.
 * @param select - the select's text box.
 * @param option - the option's name.
 */
async function choose(select: HTMLElement, option: string): Promise<void> {
    await userEvent.click(select);
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * Chooses "Where a value" and adds one condition on the id with a comparison.
 * @param compare - the comparison's words.
 * @returns the condition row.
 */
async function idCondition(compare: string): Promise<ReturnType<typeof within>> {
    await choose(screen.getByRole("combobox", { name: "Rule" }), "Where a value");
    await userEvent.click(screen.getByRole("button", { name: "Add condition" }));
    const row = within(screen.getByRole("group", { name: "Condition 1" }));
    await choose(row.getByRole("combobox", { name: "Attribute" }), "Node id");
    await choose(row.getByRole("combobox", { name: "Is" }), compare);
    return row;
}

describe("Which elements", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("odd-numbered ids by a pattern on the last digit paint 50 of 100 nodes", async () => {
        const { session, store } = await openWithGraph();
        const layer = await session.styles.add({
            name: "Odd",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await openEditor(store, layer.id);

        const row = await idCondition("matches pattern");
        // "[[" types one "[" (a lone "[" starts a key name).
        await userEvent.type(row.getByRole("textbox", { name: "Value" }), "[[13579]$");

        await waitFor(() => {
            assert.strictEqual(session.styles.counts(layer.id).matched, 50);
        });
        const editor = within(screen.getByTestId("which-elements"));
        assert.strictEqual(editor.getByRole("status").textContent, "50 of 100 nodes");
        await userEvent.click(editor.getByRole("button", { name: "Done" }));
        const sentence = await screen.findByRole("button", { name: /^Which elements: / });
        assert.include(sentence.textContent, "Nodes where node id matches pattern [13579]$");
    });

    it("Escape restores the rule the editor opened on", async () => {
        const { session, store } = await openWithGraph();
        const layer = await session.styles.add({
            name: "All",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await openEditor(store, layer.id);

        const row = await idCondition("starts with");
        await userEvent.type(row.getByRole("textbox", { name: "Value" }), "9");
        await waitFor(() => {
            // 9 and 90 to 99
            assert.strictEqual(session.styles.counts(layer.id).matched, 11);
        });

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.deepEqual(session.styles.get(layer.id)?.selector, { match: "everything" });
            assert.strictEqual(session.styles.counts(layer.id).matched, 100);
        });
        assert.isNull(screen.queryByRole("button", { name: "Done" }), "the editor closed");
        await waitFor(() => {
            assert.match(document.activeElement?.getAttribute("aria-label") ?? "", /^Which elements: /);
        });
    });

    it("a layer on nodes and edges with a node rule paints the edges between or touching its nodes", async () => {
        const { session, store } = await openWithGraph();
        const row = await session.styles.addRow({
            name: "Start",
            target: "both",
            selector: { match: "everything" },
            set: { color: "#0000ff" },
        });
        const edge = row.edge ?? "";
        await openEditor(store, row.id);

        const condition = await idCondition("matches pattern");
        await userEvent.type(condition.getByRole("textbox", { name: "Value" }), "^[[0-4]$");
        // Nodes 0 to 4; between them the 4 edges 0-1 to 3-4.
        await waitFor(() => {
            assert.strictEqual(session.styles.counts(row.node ?? "").matched, 5);
            assert.strictEqual(session.styles.counts(edge).matched, 4);
        });

        const which = screen.getByRole("radiogroup", { name: "Which edges" });
        await userEvent.click(within(which).getByText("touching them"));
        // Touching adds 4-5.
        await waitFor(() => {
            assert.strictEqual(session.styles.counts(edge).matched, 5);
        });
        assert.include(screen.getByTestId("which-elements").textContent, "5 of 100 nodes, 5 of 99 edges");
    });
});
