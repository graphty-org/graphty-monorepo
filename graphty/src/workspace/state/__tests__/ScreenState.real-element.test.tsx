/**
 * A reload of this tab puts back what the reader arranged on screen: the timeline dock and the
 * table dock come back open. Real element, real autosave, real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { forgetAutosave, openAutosaved, reload } from "../../../test/reload";
import { siteFeatures } from "../../../test/siteFeatures";
import { screen, waitFor, within } from "../../../test/test-utils";

/** Starts with nothing kept: no autosaved work and nothing in this tab's session storage. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

describe("screen state across a reload of this tab", () => {
    beforeAll(async () => {
        await siteFeatures(["timeline"]);
        await page.viewport(1366, 768);
    });
    beforeEach(forget);
    afterEach(forget);

    it("brings the timeline dock and the table back open", async () => {
        const before = await openAutosaved("Paper citations");

        // The papers' year is the time field, picked in Data > Fields as the reader does.
        await userEvent.click(page.getByRole("button", { name: "Data", exact: true }));
        const place = within(await screen.findByRole("region", { name: "Data place" }));
        const fields = within(place.getByRole("group", { name: "Attributes" }));
        await userEvent.click(await fields.findByRole("button", { name: "Add to node attributes" }));
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Time" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^year/ }));

        // The canvas toolbar's Timeline and Table buttons.
        await userEvent.click(await screen.findByRole("button", { name: "Timeline" }));
        await screen.findByRole("region", { name: "Timeline" });
        await userEvent.click(screen.getByRole("button", { name: "Table" }));
        await screen.findByRole("region", { name: "Table" });

        const after = await reload(before);
        await screen.findByRole("region", { name: "Timeline" });
        await screen.findByRole("region", { name: "Table" });
        await waitFor(() => {
            assert.equal(screen.getByRole("button", { name: "Timeline" }).getAttribute("aria-pressed"), "true");
        });
        after.view.unmount();
    });
});
