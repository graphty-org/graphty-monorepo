/**
 * An attribute's verbs in its inspector's "Attribute actions" menu, on the REAL graphty-element and
 * driven by real clicks: Add label line labels the nodes by it, Filter to... opens a filter on it,
 * Set in Data makes it the time and opens the Data place (then says it already is), and Show in table
 * opens the table dock on its side.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { columnVerb } from "../../../test/column-header";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML } from "../fixtures";

withFeatures([]);

/**
 * The workspace on the Data place with the small graph file loaded.
 * @returns the session and the element.
 */
async function openWithGraph(): Promise<{ session: GraphSession; element: HTMLElementTagNameMap["graphty-element"] }> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    await element.session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    return { session: element.session, element };
}

/**
 * Opens a column's inspector from its table header, then its "Attribute actions" menu.
 * @param kind - nodes or edges.
 * @param name - the column.
 * @returns the open menu.
 */
async function attributeMenu(kind: "node" | "edge", name: string): Promise<HTMLElement> {
    await columnVerb(kind, name, "Details");
    await userEvent.click(await screen.findByRole("button", { name: "Attribute actions" }));
    return screen.findByRole("menu");
}

/**
 * A menu's item names.
 * @param menu - the menu.
 * @returns each item's text.
 */
function itemsOf(menu: HTMLElement): string[] {
    return within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent ?? "");
}

describe("an attribute's actions", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Add label line labels every node by a node attribute", async () => {
        const { element } = await openWithGraph();
        const menu = await attributeMenu("node", "group");
        assert.includeMembers(itemsOf(menu), ["Add label line", "Filter to...", "Set in Data", "Show in table"]);
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Add label line" }));
        await waitFor(() => {
            // Valjean is in group 1.
            assert.strictEqual(element.labelOf("0")?.text, "1");
        });
    });

    it("an edge attribute offers no label line, and Filter to... opens a filter on it", async () => {
        await openWithGraph();
        const menu = await attributeMenu("edge", "value");
        assert.notInclude(itemsOf(menu), "Add label line");
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Filter to..." }));
        await screen.findByRole("textbox", { name: "value from, number" });
    });

    it("Set in Data makes the attribute the time, opens the Data place, then says it already is", async () => {
        const { session } = await openWithGraph();
        const menu = await attributeMenu("edge", "value");
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Set in Data" }));
        await waitFor(() => {
            // A number column's time also names the unit it is read in.
            assert.strictEqual(session.time.field?.edges?.start, "value");
        });
        await screen.findByRole("region", { name: "Data place" });

        const again = within(await attributeMenu("edge", "value")).getByRole("menuitem", { name: /^Set in Data/ });
        assert.include(again.textContent ?? "", "Already the time field");
        assert.isTrue(again.hasAttribute("data-disabled") || again.hasAttribute("disabled"));
    });

    it("Show in table opens the closed table dock on the attribute's side", async () => {
        await openWithGraph();
        await columnVerb("edge", "value", "Details");
        // Close the dock the header menu opened.
        const pressed = screen
            .getAllByRole("button", { name: /^Table/ })
            .find((button) => button.getAttribute("aria-pressed") === "true");
        assert.isDefined(pressed, "the toolbar's Table button is on");
        await userEvent.click(pressed);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Table" }));
        });
        await userEvent.click(await screen.findByRole("button", { name: "Attribute actions" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Show in table" }));
        const dock = await screen.findByRole("region", { name: "Table" });
        await waitFor(() => {
            assert.strictEqual(within(dock).getByRole("tab", { name: "Edges" }).getAttribute("aria-selected"), "true");
        });
    });
});
