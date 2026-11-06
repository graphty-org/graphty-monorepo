/**
 * The layer panel's words on the REAL graphty-element and Les Miserables: a selection's Style tab
 * says the first style makes its layer, and the notice after it does not repeat the count; a
 * "+" that adds one thing has one name in its tooltip and its accessible name; the shape list keeps
 * its value in its name; "Which nodes" is a heading; undo words name the kind and the act.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { historyTip } from "../../frame/historyWords";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Les Miserables in the workspace with its starting rows.
 * @returns The session and the node id of a character by name.
 */
async function openScene(): Promise<{ session: GraphSession; idOf: (name: string) => string }> {
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
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    return { session, idOf };
}

/**
 * Clicks a row of the style tree.
 * @param name - The row's name, as its accessible name starts.
 */
async function clickRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

describe("the layer panel's words", () => {
    it("says the first style makes the selection's layer, and then says it once", async () => {
        const { session, idOf } = await openScene();
        await act(async () => {
            await session.selection.apply({ nodes: [idOf("Cosette"), idOf("Marius"), idOf("Valjean")] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        await screen.findByText("The first style you set makes a layer for the 3 selected nodes.");
        // A "+" with one thing to add: its tooltip is its name.
        const fill = await screen.findByRole("button", { name: "Add to node fill" });
        await userEvent.hover(fill);
        // The theme opens a tooltip after 1000 ms, the whole of findByRole's default wait.
        const tip = await screen.findByRole("tooltip", {});
        assert.strictEqual(tip.textContent, "Add to node fill", "the tooltip is the button's name");
        await userEvent.unhover(fill);
        await userEvent.click(await screen.findByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest('[data-line="node.size"]'), "focus on the new line");
        });
        await userEvent.keyboard("{Control>}a{/Control}3{Enter}");
        await waitFor(() => {
            assert.match(
                document.querySelector(".ws-notice-slot")?.textContent ?? "",
                /^Made a layer for the 3 selected nodes/,
            );
        });
        assert.isNull(screen.queryByText(/^The first style you set/), "said only before the layer is made");
    });

    it("keeps the shape's value in its name, and reads the Which row as a heading", async () => {
        const { session } = await openScene();
        await session.styles.add({
            name: "Boxes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        await session.styles.settled();
        await clickRow("Boxes");
        const shape = await screen.findByRole("combobox", { name: /^Node shape, / });
        assert.notInclude(shape.getAttribute("aria-label") ?? "", "default", "a set value is not the default");
        assert.isNotNull(await screen.findByRole("heading", { name: /^Which nodes/ }));
    });

    it("names an edge color's step as the edge's", async () => {
        const { session } = await openScene();
        const ties = await session.styles.add({
            name: "Ties",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.width": 2 },
        });
        await session.styles.update(ties.id, { set: { "edge.width": 2, "edge.color": "#ff0000" } });
        assert.strictEqual(historyTip(session, true), "Undo changing edge color on Ties");
    });
});
