/**
 * The style layer target picker (Which nodes) on the REAL graphty-element: a reader's own layer
 * gets its targets from condition cards, added and edited through real input. The assertions read
 * the layer's selector, the elements it holds as the element counts them, and the card's count.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { selectorRule } from "../cards";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "1", dept: "east", code: 1 },
    { id: "2", dept: "west", code: 2 },
    { id: "3", dept: "east", code: 1 },
    { id: "4", dept: "north", code: 3 },
];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
    { source: "3", target: "4" },
];

/**
 * Renders the workspace with a small graph and the reader's own red layer open in the inspector.
 * @returns the session and the layer's id.
 */
async function openWithLayer(): Promise<{ session: GraphSession; id: string }> {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 } });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    const layer = await session.styles.add({
        name: "Red",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#FF0000" },
    });
    // A layer's row opens on its Style tab, with no other tab.
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
    return { session, id: layer.id };
}

describe("the Which nodes picker on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("narrows a layer with a category card and a number card, each with its own count", async () => {
        const { session, id } = await openWithLayer();
        const picker = await screen.findByRole("group", { name: "Which nodes" }, { timeout: TIMEOUT_MS });

        await userEvent.click(within(picker).getByRole("button", { name: "Add condition" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "dept" }));
        const dept = await within(picker).findByRole("group", { name: "dept" });
        await userEvent.click(within(dept).getByRole("textbox", { name: "Values" }));
        await userEvent.click(await screen.findByRole("option", { name: "east (2)" }));

        await waitFor(() => {
            const selector = session.styles.get(id)?.selector;
            assert.deepEqual(selector === undefined ? undefined : selectorRule(selector), {
                kind: "categories",
                attribute: "data.dept",
                values: ["east"],
            });
        });
        const written = await within(picker).findByRole("group", { name: "dept" });
        await waitFor(() => {
            assert.strictEqual(within(written).getByTestId("card-count").dataset.count, "2 of 4");
        });
        // The layer paints exactly the nodes its card holds.
        await waitFor(() => {
            assert.strictEqual(session.styles.counts(id).matched, 2);
        });
        // Target cards carry no Select / Hide: that is a filter's.
        assert.isNull(within(written).queryByRole("radio", { name: "Hide" }));

        await userEvent.click(within(picker).getByRole("button", { name: "Add condition" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "code" }));
        const code = await within(picker).findByRole("group", { name: "code" });
        const max = within(code).getByRole("textbox", { name: "Max" });
        await userEvent.clear(max);
        await userEvent.type(max, "1{Enter}");
        await waitFor(() => {
            const selector = session.styles.get(id)?.selector;
            const rule = selector === undefined ? undefined : selectorRule(selector);
            assert.strictEqual(rule?.kind, "all");
        });
        const codeCard = await within(picker).findByRole("group", { name: "code" });
        await waitFor(() => {
            assert.strictEqual(within(codeCard).getByTestId("card-count").dataset.count, "2 of 4");
        });

        // Removing both cards puts the layer back on every node.
        await userEvent.click(within(picker).getByRole("button", { name: "Remove dept" }));
        await userEvent.click(within(picker).getByRole("button", { name: "Remove code" }));
        await waitFor(() => {
            assert.deepEqual(session.styles.get(id)?.selector, { match: "everything" });
        });
    });

    it("adds a reader's layer from the paint tree's +, and writes a number card as it is added", async () => {
        const { session } = await openWithLayer();
        await userEvent.click(await screen.findByRole("button", { name: "Add layer" }, { timeout: TIMEOUT_MS }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "New layer" }));
        const layer = await waitFor(() => {
            const found = session.styles.list().find((l) => l.name === "Layer 1");
            assert.isDefined(found);
            return found;
        });
        const picker = await screen.findByRole("group", { name: "Which nodes" });
        await waitFor(() => {
            assert.strictEqual(picker.closest("[data-testid=style-tab]") !== null, true);
        });
        // A number card makes a rule at once: it is written as it is added.
        await userEvent.click(within(picker).getByRole("button", { name: "Add condition" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "code" }));
        await waitFor(() => {
            const selector = session.styles.get(layer?.id ?? "")?.selector;
            assert.deepEqual(selector === undefined ? undefined : selectorRule(selector), {
                kind: "range",
                attribute: "data.code",
                min: 1,
                max: 3,
            });
        });
    });

    it("paints the selection as a new layer of its own", async () => {
        const { session } = await openWithLayer();
        await session.selection.apply({ nodes: ["1", "2"] });
        await userEvent.click(await screen.findByRole("button", { name: "Add layer" }, { timeout: TIMEOUT_MS }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Paint selection" }));
        await waitFor(() => {
            const found = session.styles.list().find((l) => l.name === "Layer 1");
            assert.deepEqual(found?.selector, { match: "ids", nodes: ["1", "2"] });
        });
    });
});
