/**
 * A reload of this tab puts back what the reader arranged on screen: the timeline dock and the
 * table dock come back open. Real element, real autosave, real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { forgetAutosave, openAutosaved, reload } from "../../../test/reload";
import { screen, waitFor } from "../../../test/test-utils";

/** Starts with nothing kept: no autosaved work and nothing in this tab's session storage. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

describe.each([{ lostSession: false }, { lostSession: true }])(
    "screen state across a reload of this tab (session storage emptied: $lostSession)",
    ({ lostSession }) => {
        beforeAll(async () => {
            await page.viewport(1366, 768);
        });
        beforeEach(forget);
        afterEach(forget);

        it("brings the timeline dock and the table back open", async () => {
            const before = await openAutosaved("Paper citations");

            // The papers' year is the time field, picked as the reader does: in the Data place, the
            // load's own section on the Sources tab holds its attributes.
            await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
            await userEvent.click(
                page
                    .getByRole("region", { name: "Data place", exact: true })
                    .getByRole("button", { name: "Add to node attributes", exact: true }),
            );
            await userEvent.hover(page.getByRole("menuitem", { name: "Time", exact: true }));
            await userEvent.click(page.getByRole("menuitem", { name: /^year/ }));

            // The canvas toolbar's Timeline and Table buttons.
            await userEvent.click(page.getByRole("button", { name: "Timeline", exact: true }));
            await screen.findByRole("region", { name: "Timeline" });
            await userEvent.click(page.getByRole("button", { name: "Table", exact: true }));
            await screen.findByRole("region", { name: "Table" });

            const after = await reload(before, { lostSession });
            await screen.findByRole("region", { name: "Timeline" });
            await screen.findByRole("region", { name: "Table" });
            await waitFor(() => {
                assert.equal(screen.getByRole("button", { name: "Timeline" }).getAttribute("aria-pressed"), "true");
            });
            after.view.unmount();
        });
    },
);
