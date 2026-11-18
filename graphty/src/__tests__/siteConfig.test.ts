/**
 * site.json's analytics block: validated on its own, so a typo switches analytics off and nothing
 * else, and every committed site file keeps the block it has.
 */
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";

/** Every committed site file, as written. */
const SITES = import.meta.glob<Record<string, unknown>>("../../sites/*.json", { eager: true, import: "default" });

const UMAMI = "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const KEY = "phc_abc123XYZ";
const EU = "https://eu.i.posthog.com";

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
        const analytics = { umamiWebsiteId: UMAMI, posthogKey: KEY, posthogHost: EU };
        const config = await loadSiteConfig(siteFile({ site: "production", features: [], analytics }));
        assert.deepEqual(config.analytics, analytics);
    });

    for (const [why, analytics] of [
        ["a numeric posthogKey", { posthogKey: 12, posthogHost: EU }],
        ["a host not on the list", { posthogKey: KEY, posthogHost: "https://evil.example" }],
        ["a key with no host", { posthogKey: KEY }],
        ["a website id that is no UUID", { umamiWebsiteId: "not-a-uuid" }],
        ["a block that is no object", "on"],
    ] as const) {
        it(`drops only the analytics block for ${why}`, async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const config = await loadSiteConfig(
                siteFile({ site: "nightly", features: ["assistant"], datasets: "https://d.example/", analytics }),
            );
            assert.strictEqual(config.site, "nightly");
            assert.include(config.features, "assistant");
            assert.strictEqual(config.datasets, "https://d.example/");
            assert.isUndefined(config.analytics);
            assert.equal(warn.mock.calls.length, 1);
        });
    }

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
