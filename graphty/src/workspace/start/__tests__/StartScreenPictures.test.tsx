/**
 * The sample library's pictures come from the site's own dataset address, which `site.json` names
 * and which loads after the start screen's module. pictureOf answers from an address the test
 * moves, as the site's configuration moves the real one (which prefers this machine's copy in
 * tests); the site's configuration loading is what tells the tiles to look again.
 */
import { afterEach, assert, describe, it, vi } from "vitest";

vi.mock("../../../lib/sentry", () => ({ initSentry: vi.fn(), stopSentry: vi.fn(), captureUserFeedback: vi.fn() }));

// Every export of open.ts as it is, watched, so pictureOf can answer for the site under test.
vi.mock("../open", { spy: true });

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { pictureOf } from "../open";

/** The site's dataset address the test moves, as site.json moves the real one. */
let datasets = "https://production.example/v1/";
vi.mocked(pictureOf).mockImplementation((entry) =>
    entry.thumbnail === undefined ? undefined : new URL(entry.thumbnail, datasets).href,
);

afterEach(() => {
    resetSiteConfig();
});

describe("the sample library's pictures", () => {
    it("move to the site's own dataset address once site.json loads", async () => {
        resetSiteConfig();
        render(<Workspace store={createWorkspaceStore()} />);
        const tile = within(screen.getByRole("region", { name: "Sample library" })).getByRole("button", {
            name: "Open the Venice public transport sample",
        });

        datasets = "https://canary.example/data/v1/";
        const file = { site: "canary", datasets };
        await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(file))}`);

        await waitFor(() => {
            assert.equal(
                tile.querySelector<HTMLImageElement>("img.ws-land-sample-pic")?.getAttribute("src"),
                "https://canary.example/data/v1/venice-transit.webp",
            );
        });
    });
});
