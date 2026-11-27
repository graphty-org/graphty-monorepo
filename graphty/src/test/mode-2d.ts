/**
 * The view switched to 2D with the canvas's Mode tool, as a reader does.
 */
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert } from "vitest";
import { userEvent } from "vitest/browser";

import { screen, waitFor, within } from "./test-utils";

/**
 * Switches to 2D with the Mode tool, as a reader does.
 * @param session - the session.
 */
export async function modeTo2d(session: GraphSession): Promise<void> {
    const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
    await userEvent.click(within(toolbar).getByRole("button", { name: /^Mode/ }));
    const menu = await screen.findByRole("menu", { name: /^Mode/ });
    await userEvent.click(within(menu).getByRole("menuitemradio", { name: /^2D/ }));
    await waitFor(() => {
        assert.equal(session.layout.dimension, "2d");
    });
}
