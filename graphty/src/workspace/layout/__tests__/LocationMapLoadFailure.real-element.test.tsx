/**
 * The location map on the REAL graphty-element when its placement code cannot be loaded, as on a
 * page whose build was replaced under it (the server rebuilt, the page's code files are gone).
 * Map is picked and applied with its defaults by real input; the form must say it failed and the
 * drawing must stay as it was, never close as if the map had been applied.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Fails every request whose URL holds the fragment with 404, or stops (graphty/vitest.config.ts). */
        failRequests: (fragment: string, failing: boolean) => Promise<void>;
    }
}

/** The file the element loads when the map first runs. */
const PLACEMENT_CODE = "locationMap/place";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** Three airports with a latitude and longitude each. */
const AIRPORTS = [
    { id: "SFO", latitude: 37.619, longitude: -122.375 },
    { id: "JFK", latitude: 40.64, longitude: -73.779 },
    { id: "LHR", latitude: 51.47, longitude: -0.454 },
];

describe("the location map whose placement code cannot be loaded", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
        await commands.failRequests(PLACEMENT_CODE, true);
    });

    afterAll(async () => {
        await commands.failRequests(PLACEMENT_CODE, false);
    });

    it("says so on Apply and leaves the layout and the drawing as they were", async () => {
        render(<Workspace store={createWorkspaceStore({ project: { name: "Airports", id: 1 } })} />);
        let element: HTMLElementTagNameMap["graphty-element"] | null = null;
        await waitFor(
            () => {
                element = document.querySelector("graphty-element");
                assert.isDefined(element?.session);
            },
            { timeout: TIMEOUT_MS },
        );
        if (element === null) {
            throw new Error("the element never came up");
        }
        const el: HTMLElementTagNameMap["graphty-element"] = element;
        await el.session.data.addNodes(AIRPORTS);
        await el.session.data.addEdges([{ source: "SFO", target: "JFK" }]);
        const tool = screen.getByRole("button", { name: "Layout" });
        await waitFor(() => {
            assert.isFalse(tool.hasAttribute("aria-disabled"));
        });
        const before = el.session.layout.id;

        await userEvent.click(tool);
        const popover = await screen.findByRole("dialog", { name: "Layout" });
        await userEvent.click(within(popover).getByRole("option", { name: /^Map/ }));
        await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));

        const alert = await within(popover).findByRole("alert", undefined, { timeout: TIMEOUT_MS });
        assert.include(alert.textContent, "could not be loaded");
        assert.strictEqual(el.session.layout.id, before, "the layout it had stays");
        assert.isNull(el.mapFrame, "no map is claimed");
        assert.strictEqual(el.basemapStatus.state, "off");
    });
});
