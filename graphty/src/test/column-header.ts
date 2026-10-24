/**
 * Reaches a column's verbs the way a reader does now that the Data place lists no attributes: the
 * table dock (opened from the toolbar's Table when it is closed), the column's tab, and the
 * "Options for <name>" menu in its header.
 */

import userEvent from "@testing-library/user-event";

import { screen, within } from "./test-utils";

/**
 * Opens a column's header menu in the table dock.
 * @param kind - nodes or edges.
 * @param name - the column's name.
 * @returns the open menu.
 */
export async function openColumnMenu(kind: "node" | "edge", name: string): Promise<HTMLElement> {
    if (screen.queryByRole("region", { name: "Table" }) === null) {
        await userEvent.click(screen.getByRole("button", { name: /^Table/ }));
    }
    const dock = await screen.findByRole("region", { name: "Table" });
    await userEvent.click(await within(dock).findByRole("tab", { name: kind === "node" ? "Nodes" : "Edges" }));
    await userEvent.click(await within(dock).findByRole("button", { name: `Options for ${name}` }));
    return screen.findByRole("menu");
}

/**
 * Runs one verb from a column's header menu.
 * @param kind - nodes or edges.
 * @param name - the column's name.
 * @param verb - the menu item, such as "Filter to..." or "Details".
 */
export async function columnVerb(kind: "node" | "edge", name: string, verb: string): Promise<void> {
    const menu = await openColumnMenu(kind, name);
    await userEvent.click(within(menu).getByRole("menuitem", { name: verb }));
}
