/**
 * The Samples dialog from the start page, as a reader reaches it: the Samples button, then a row.
 */
import { userEvent } from "vitest/browser";

import { screen, within } from "./test-utils";

/**
 * Opens the Samples dialog from the start page's Samples button.
 * @returns the dialog.
 */
export async function openSamples(): Promise<HTMLElement> {
    // The header's Samples and the launcher's open the same dialog.
    const [button] = screen.getAllByRole("button", { name: "Samples" });
    await userEvent.click(button);
    return screen.findByRole("dialog", { name: "Samples" });
}

/**
 * The row of a sample in the dialog.
 * @param dialog - the dialog.
 * @param name - the sample's name, as the row starts.
 * @returns the row's button.
 */
export function sampleRow(dialog: HTMLElement, name: string): HTMLElement {
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    return within(dialog).getByRole("button", { name: new RegExp(`^${escaped} `) });
}

/**
 * Opens the Samples dialog from the start page and picks a sample.
 * @param name - the sample's name.
 */
export async function pickSample(name: string): Promise<void> {
    await userEvent.click(sampleRow(await openSamples(), name));
}
