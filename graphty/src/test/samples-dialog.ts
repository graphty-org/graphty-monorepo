/**
 * A sample opened from the start page, as a reader picks it: its tile in the sample library.
 */
import { userEvent } from "vitest/browser";

import { screen } from "./test-utils";

/**
 * A sample tile's accessible name, which begins "Open the <name> sample" and goes on with the
 * tile's visible title ("Open the Les Miserables sample: Who holds the novel together").
 * @param name - the sample's name.
 * @returns a pattern for the tile's name.
 */
export function sampleTile(name: string): RegExp {
    return new RegExp(`^Open the ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} sample: `);
}

/**
 * Opens one of the start page's samples by its tile, once the start page shows (it waits for the
 * check for this tab's kept work).
 * @param name - the sample's name.
 */
export async function pickSample(name: string): Promise<void> {
    await userEvent.click(await screen.findByRole("button", { name: sampleTile(name) }));
}
