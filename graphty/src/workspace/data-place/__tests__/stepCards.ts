/**
 * Driving a filter step's Which nodes and Which edges pickers with real clicks, as a reader does.
 */

import userEvent from "@testing-library/user-event";

import { screen, within } from "../../../test/test-utils";

/**
 * A filter step's picker of one kind.
 * @param side - nodes or edges.
 * @returns the picker.
 */
export async function stepPicker(side: "node" | "edge" = "node"): Promise<HTMLElement> {
    const inspector = await screen.findByRole("complementary", { name: "Inspector" });
    const found = inspector.querySelector<HTMLElement>(`[data-testid="which-picker"][data-side="${side}"]`);
    if (found !== null) {
        return found;
    }
    // Not drawn yet: wait for its heading.
    await within(inspector).findByText(side === "node" ? "Which nodes" : "Which edges");
    return stepPicker(side);
}

/**
 * Opens a filter step's picker of one kind, when it is folded, by clicking its Which row.
 * @param side - nodes or edges.
 * @returns the open picker.
 */
export async function openStepPicker(side: "node" | "edge" = "node"): Promise<HTMLElement> {
    const picker = await stepPicker(side);
    if (picker.querySelector("[data-add]") === null) {
        await userEvent.click(
            within(picker).getByRole("button", { name: side === "node" ? /^Which nodes/ : /^Which edges/ }),
        );
    }
    return picker;
}

/**
 * Adds a condition card on a field from a filter step's picker: Add a condition, then the field.
 * @param name - the field's name, as the list shows it.
 * @param side - nodes or edges.
 */
export async function addStepCondition(name: string, side: "node" | "edge" = "node"): Promise<void> {
    const picker = await openStepPicker(side);
    await userEvent.click(within(picker).getByRole("button", { name: "Add a condition" }));
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${escaped}(,|$)`) }));
}
