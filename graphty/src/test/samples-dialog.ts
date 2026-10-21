/**
 * A sample opened from the start page, as a reader picks it: its tile in the sample library.
 */
import { userEvent } from "vitest/browser";

import { screen } from "./test-utils";

/**
 * Opens one of the start page's samples by its tile.
 * @param name - the sample's name.
 */
export async function pickSample(name: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: `Open the ${name} sample` }));
}
