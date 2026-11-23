/**
 * site.json's analytics block: validated on its own, so a typo switches analytics off and nothing
 * else, and every committed site file keeps the block it has.
 */
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";

/** Every committed site file, as written. */
const SITES = import.meta.glob<Record<string, unknown>>("../../sites/*.json", { eager: true, import: "default" });

const KEY = "phc_abc123XYZ";
const US = "https://us.i.posthog.com";

/**
 * A site.json served as a data: address.
 * @param config - the file's contents.
 * @returns its address.
 */
function siteFile(config: unknown): string {
    return `data:application/json,${encodeURIComponent(JSON.stringify(config))}`;
}

describe("site.json analytics", () => {
    beforeEach(() => {
        resetSiteConfig();
    });
    afterEach(() => {
        resetSiteConfig();
        vi.restoreAllMocks();
    });

    it("accepts a valid block", async () => {
        const analytics = { posthogKey: KEY, posthogHost: US };
        const config = await loadSiteConfig(siteFile({ site: "production", features: [], analytics }));
        assert.deepEqual(config.analytics, analytics);
    });

    for (const [why, analytics] of [
        ["a numeric posthogKey", { posthogKey: 12, posthogHost: US }],
        ["a host not on the list", { posthogKey: KEY, posthogHost: "https://evil.example" }],
        // The privacy page names the US region; the EU host would make it false.
        ["PostHog's EU host", { posthogKey: KEY, posthogHost: "https://eu.i.posthog.com" }],
        ["a key with no host", { posthogKey: KEY }],
        ["a block that is no object", "on"],
    ] as const) {
        it(`drops only the analytics block for ${why}`, async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const config = await loadSiteConfig(
                siteFile({ site: "nightly", features: ["cosmograph"], datasets: "https://d.example/", analytics }),
            );
            assert.strictEqual(config.site, "nightly");
            assert.include(config.features, "cosmograph");
            assert.strictEqual(config.datasets, "https://d.example/");
            assert.isUndefined(config.analytics);
            assert.equal(warn.mock.calls.length, 1);
        });
    }

    it("ignores a leftover key and keeps the rest of the block", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const analytics = { oldVendorId: "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", posthogKey: KEY, posthogHost: US };
        const config = await loadSiteConfig(siteFile({ site: "production", features: [], analytics }));
        assert.deepEqual(config.analytics, { posthogKey: KEY, posthogHost: US });
        assert.equal(warn.mock.calls.length, 0);
    });

    it("keeps the analytics block of every committed site file", async () => {
        assert.isAbove(Object.keys(SITES).length, 0);
        for (const [path, file] of Object.entries(SITES)) {
            resetSiteConfig();
            const config = await loadSiteConfig(siteFile(file));
            assert.notStrictEqual(config.site, "unknown", path);
            if (file.analytics !== undefined) {
                assert.deepEqual(config.analytics, file.analytics, `${path}: its analytics block was dropped`);
            }
        }
    });
});
