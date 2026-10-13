/**
 * The Style tab on the REAL graphty-element, and tier 1 tasks T9 (color or size by a value or a
 * result) and T10 (labels from an attribute). From the empty app: open a project, put a small
 * graph in through the element's session, then work the Style tab as a reader would. Every
 * assertion reads what the element reports: the layer stack, the bindings, the label counts.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { registration } from "../commands";

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "1", name: "Alpha", dept: "east", code: 1 },
    { id: "2", name: "Beta", dept: "west", code: 2 },
    { id: "3", name: "Gamma", dept: "east", code: 1 },
    { id: "4", name: "Delta", dept: "north", code: 3 },
];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
    { source: "3", target: "4" },
    { source: "4", target: "1" },
];

/** The workspace with a project open, the element's session, its element and the store. */
interface Opened {
    readonly session: GraphSession;
    readonly element: HTMLElementTagNameMap["graphty-element"];
    readonly store: WorkspaceStore;
}

/**
 * Renders the workspace with a project open on the Everything row, as a click on it in the
 * Graph place opens it, waits for the element and loads the graph.
 * @param stacked - put every node on one spot with the fixed layout, so their labels overlap.
 * @returns the session, the element and the store.
 */
async function openWithGraph(stacked = false): Promise<Opened> {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 }, inspected: { kind: "everything-row" } });
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
    if (stacked) {
        await session.layout.set("fixed");
    }
    await session.data.addNodes(stacked ? NODES.map((n) => ({ ...n, position: { x: 0, y: 0, z: 0 } })) : NODES);
    await session.data.addEdges(EDGES);
    return { session, element, store };
}

/**
 * The Style tab, inside the inspector.
 * @returns the tab.
 */
function styleTab(): HTMLElement {
    return screen.getByTestId("style-tab");
}

/**
 * The reader's own layers: everything but the element's.
 * @param session - the element's session.
 * @returns the layers, bottom first.
 */
function readerLayers(session: GraphSession): ReturnType<GraphSession["styles"]["list"]> {
    return session.styles.list().filter((l) => l.source.by !== "element");
}

describe("labels from an attribute (task T10) on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("a Label entry picked from Text's + binds the label and states the counts", async () => {
        // Every node on one spot, so the overlap rule (on in the workspace) hides all labels but one.
        const { session, element } = await openWithGraph(true);
        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        // The Nodes group's list: the Edges group draws a Text list of its own.
        const nodes = tab.querySelector<HTMLElement>('[data-group="node"]');
        if (nodes === null) {
            throw new Error("the Style tab draws no Nodes group");
        }
        const text = within(nodes).getByRole("group", { name: "Node text" });
        await userEvent.click(within(text).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label/ }));
        const list = await screen.findByRole("dialog", { name: "From data" });
        await userEvent.click(within(list).getByRole("option", { name: "name" }));

        await waitFor(() => {
            const binding = readerLayers(session)[0]?.encode?.["node.label"];
            assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, "data.name");
        });
        // The statement is the element's counts, read live, the hidden part included.
        await waitFor(
            () => {
                const { labeled, hiddenByOverlap } = element.nodeLabelCounts;
                assert.equal(labeled, NODES.length);
                assert.isAbove(hiddenByOverlap, 0, "stacked labels overlap");
                assert.isNotNull(
                    within(styleTab()).getByText(`${String(labeled)} labels, ${String(hiddenByOverlap)} hidden`),
                );
            },
            { timeout: TIMEOUT_MS },
        );
        // Show all labels turns the overlap rule off on the element: every label is drawn.
        const showAll = within(styleTab()).getByRole("checkbox", { name: "Show all labels" });
        assert.isFalse((showAll as HTMLInputElement).checked);
        await userEvent.click(showAll);
        await waitFor(
            () => {
                assert.isFalse(element.layoutBehavior?.labels?.declutter);
                assert.equal(element.nodeLabelCounts.hiddenByOverlap, 0);
                for (const node of NODES) {
                    assert.isTrue(element.labelOf(node.id)?.drawn, node.name);
                }
                assert.isNotNull(within(styleTab()).getByText(`${String(NODES.length)} labels`));
            },
            { timeout: TIMEOUT_MS },
        );
        // And back: the rule hides the stacked labels again.
        await userEvent.click(within(styleTab()).getByRole("checkbox", { name: "Show all labels" }));
        await waitFor(
            () => {
                assert.isTrue(element.layoutBehavior?.labels?.declutter);
                assert.isAbove(element.nodeLabelCounts.hiddenByOverlap, 0);
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("Add label line from an attribute makes a row on top, bound to it, and selects it", async () => {
        const { session, element, store } = await openWithGraph();
        const [command] = registration.commands;
        const ctx = { session, element, workspace: store };
        assert.equal(command.disabled?.(ctx), "Pick a node attribute first");
        store.set({ inspected: { kind: "attribute", id: "data.name" } });
        assert.isNull(command.disabled?.(ctx) ?? null);
        await command.run(ctx);
        const top = session.styles.list().at(-1);
        const binding = top?.encode?.["node.label"];
        assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, "data.name");
        assert.deepEqual(store.get().inspected, { kind: "layer-row", id: top?.id });
    });
});

describe("the Selection row's highlight on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("shows the edge band beside the node halo, and writes the band's color and size back to the element", async () => {
        const { session, store } = await openWithGraph();
        act(() => {
            store.set({ inspected: { kind: "selection-row", id: "selection" } });
        });
        const highlight = await screen.findByRole("group", { name: "Highlight" }, { timeout: TIMEOUT_MS });
        const part = (name: string): HTMLElement => within(highlight).getByRole("group", { name });
        const hexOf = (name: string): HTMLInputElement =>
            within(part(name)).getByRole<HTMLInputElement>("textbox", { name: "Color hex value" });
        assert.equal(hexOf("Nodes").value, "FFD700");
        assert.equal(hexOf("Edges").value, "0077BB", "the band the element draws selected edges with");

        await userEvent.clear(hexOf("Edges"));
        await userEvent.type(hexOf("Edges"), "FF0000{Enter}");
        await waitFor(() => {
            assert.equal(session.config.selectionStyle.edgeColor.toUpperCase(), "#FF0000");
        });
        assert.equal(session.config.selectionStyle.color.toUpperCase(), "#FFD700", "the halo is left alone");

        const size = within(part("Edges")).getByRole("combobox", { name: "Size" });
        await userEvent.clear(size);
        await userEvent.type(size, "4{Enter}");
        await waitFor(() => {
            assert.equal(session.config.selectionStyle.edgeScale, 4);
        });
        assert.equal(session.config.selectionStyle.scale, 1.45, "the halo's size is left alone");
        await waitFor(() => {
            assert.equal(hexOf("Edges").value, "FF0000");
        });
    });
});
