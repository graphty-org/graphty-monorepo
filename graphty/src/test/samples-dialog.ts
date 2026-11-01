/**
 * A sample opened from the start page, as a reader picks it: its tile in the sample library.
 */
import { userEvent } from "vitest/browser";

import { sampleTile } from "./sample-tile";
import { screen } from "./test-utils";

export { sampleTile };

/**
 * Opens one of the start page's samples by its tile, once the start page shows (it waits for the
 * check for this tab's kept work).
 * @param name - the sample's name.
 */
export async function pickSample(name: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: sampleTile(name) }));
}
