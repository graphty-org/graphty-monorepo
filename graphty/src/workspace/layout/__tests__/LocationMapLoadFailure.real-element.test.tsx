/**
 * The location map on the REAL graphty-element when its placement code cannot be loaded, as on a
 * page whose build was replaced under it (the server rebuilt, the page's code files are gone).
 * Map is picked and applied with its defaults by real input; the form must say it failed and the
 * drawing must stay as it was, never close as if the map had been applied.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { MantineProvider } from "@mantine/core";
import { render as renderBare } from "@testing-library/react";
import axe from "axe-core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import { theme } from "../../../theme";
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
        // In the light scheme, where a raw red failed 4.5:1 (#3080).
        renderBare(
            <MantineProvider theme={theme} forceColorScheme="light">
                <Workspace store={createWorkspaceStore({ project: { name: "Airports", id: 1 } })} />
            </MantineProvider>,
        );
        let element: HTMLElementTagNameMap["graphty-element"] | null = null;
        await waitFor(() => {
            element = document.querySelector("graphty-element");
            assert.isDefined(element?.session);
        });
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

        const alert = await within(popover).findByRole("alert", undefined);
        assert.include(alert.textContent, "could not be loaded");
        // Status text meets 4.5:1 on the popover (WCAG 1.4.3).
        const contrast = await axe.run(alert, { runOnly: ["color-contrast"], resultTypes: ["violations"] });
        assert.deepEqual(
            contrast.violations.flatMap((v) => v.nodes.map((node) => node.failureSummary ?? "")),
            [],
        );
        assert.strictEqual(el.session.layout.id, before, "the layout it had stays");
        assert.isNull(el.mapFrame, "no map is claimed");
        assert.strictEqual(el.basemapStatus.state, "off");
    });
});
