/**
 * The sample library's pictures come from the site's own dataset address, which `site.json` names
 * and which loads after the start screen's module. pictureOf answers from an address the test
 * moves, as the site's configuration moves the real one (which prefers this machine's copy in
 * tests); the site's configuration loading is what tells the tiles to look again.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { sampleTile } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { preferLocalDatasets } from "../open";

// The site's own dataset address, as on a deployed site, rather than this machine's copy.
beforeEach(() => {
    preferLocalDatasets(false);
});
afterEach(() => {
    preferLocalDatasets(true);
    resetSiteConfig();
});

describe("the sample library's pictures", () => {
    it("move to the site's own dataset address once site.json loads", async () => {
        resetSiteConfig();
        render(<Workspace store={createWorkspaceStore()} />);
        const tile = within(screen.getByRole("region", { name: "Sample library" })).getByRole("button", {
            name: sampleTile("Venice public transport"),
        });

        const file = { site: "canary", datasets: "https://canary.example/data/v1/" };
        await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(file))}`);

        await waitFor(() => {
            assert.equal(
                tile.querySelector<HTMLImageElement>("img.ws-land-sample-pic")?.getAttribute("src"),
                "https://canary.example/data/v1/venice-transit.webp",
            );
        });
    });
});
