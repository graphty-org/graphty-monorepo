/**
 * The site's site.json, on the REAL graphty-element: with a file, the element the workspace mounts
 * gets the site's experiments plus the address's ?features=, and the header names a nightly site;
 * with none, or an invalid one, every experiment is off and the header names no site.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";
import { render, screen, waitFor } from "../test/test-utils";
import { createWorkspaceStore } from "../workspace/state/store";
import { Workspace } from "../workspace/Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * A site.json served as a data: address.
 * @param config - the file's contents.
 * @returns its address.
 */
function siteFile(config: unknown): string {
    return `data:application/json,${encodeURIComponent(JSON.stringify(config))}`;
}

/**
 * Mounts the workspace and waits for its element's session.
 * @returns the element.
 */
async function mountElement(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Site", id: 1 } })} />);
    return waitFor(
        () => {
            const element = document.querySelector("graphty-element");
            assert.isNotNull(element);
            assert.isDefined(element.session);
            return element;
        },
        { timeout: TIMEOUT_MS },
    );
}

describe("site.json", () => {
    const address = globalThis.location.href;

    // Each test loads its own site.json, from a fresh page's state: the "On" test configuration
    // (src/test/setup-features-on.ts) has already loaded one before the first test.
    beforeEach(() => {
        resetSiteConfig();
    });

    afterEach(() => {
        resetSiteConfig();
        globalThis.history.replaceState(null, "", address);
    });

    it("hands the site's experiments and the address's to the element, and names the site", async () => {
        const url = new URL(address);
        url.searchParams.set("features", "Location-Map,timeline");
        globalThis.history.replaceState(null, "", url.href);
        const config = await loadSiteConfig(siteFile({ site: "nightly", features: ["timeline"] }));
        assert.deepEqual(config.features, ["timeline", "location-map"]);

        const element = await mountElement();
        assert.deepEqual(element.features, ["timeline", "location-map"]);
        // This build declares no experiment yet, so the element reports both ids as unknown.
        assert.deepEqual(element.enabledFeatures.unknown, ["timeline", "location-map"]);
        await screen.findByLabelText("Site: nightly");
    });

    it("switches every experiment off when the site serves no site.json", async () => {
        // A real 404, never a request to the test server: its SPA fallback answers index.html, and
        // Vite then optimizes main.tsx's dependencies mid-run and reloads the next test file (#3762).
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
        const config = await loadSiteConfig("/no-site-here/site.json");
        fetchSpy.mockRestore();
        assert.strictEqual(config.site, "unknown");

        const element = await mountElement();
        assert.deepEqual(element.features, []);
        assert.deepEqual(element.enabledFeatures, { enabled: [], unknown: [] });
        assert.isNull(screen.queryByLabelText(/^Site: /));
    });

    it("switches every experiment off when the site answers site.json with a page", async () => {
        const config = await loadSiteConfig("data:text/html,<!doctype html><title>Graphty</title>");
        assert.deepEqual(config, { site: "unknown", features: [] });
    });

    it("switches every experiment off when site.json is invalid", async () => {
        const config = await loadSiteConfig(siteFile({ site: "staging", features: ["timeline"] }));
        assert.deepEqual(config, { site: "unknown", features: [] });

        const element = await mountElement();
        assert.deepEqual(element.features, []);
    });

    it("keeps the experiments of a site.json that names no site, and names no site", async () => {
        const config = await loadSiteConfig(siteFile({ features: ["timeline"] }));
        assert.deepEqual(config, { site: "unknown", features: ["timeline"] });

        const element = await mountElement();
        assert.deepEqual(element.features, ["timeline"]);
        assert.isNull(screen.queryByLabelText(/^Site: /));
    });
});
