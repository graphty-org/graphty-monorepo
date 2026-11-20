/**
 * A sharing reader's reload on the real posthog-js chunk (design/graphty/usage-analytics.md, section
 * 11): the anonymous instance's init must not delete the shared instance's stored id. Its own file,
 * because it needs a posthog-js module no case has initialized yet.
 */
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";
import { interceptPostHog, POSTHOG_TEST_HOST, type PostHogTestNetwork, sentEvents } from "../test/posthog-network";
import { forgetUsageAnswer } from "../workspace/privacy/usageData";
import {
    count,
    importPostHogModule,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    startAnalyticsAtBoot,
    stopPostHog,
} from "./analytics";

const KEY = "phc_reloadtest";
const STORE = `ph_${KEY}_posthog`;
let network: PostHogTestNetwork;
const address = globalThis.location.href;

beforeEach(() => {
    resetAnalyticsForTests();
    resetSiteConfig();
    localStorage.clear();
    sessionStorage.clear();
    network = interceptPostHog();
});

afterEach(() => {
    stopPostHog();
    network.restore();
    globalThis.history.replaceState(null, "", address);
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    setAnalyticsCallsForTests();
    localStorage.clear();
    sessionStorage.clear();
});

describe("a sharing reader's reload", () => {
    it("keeps the shared id when the anonymous instance is created first", async () => {
        const site = {
            site: "production",
            features: ["usage-analytics"],
            analytics: { posthogKey: KEY, posthogHost: "https://us.i.posthog.com" },
        };
        const config = await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
        // What an earlier visit by a reader who shares leaves behind.
        const now = Date.now();
        const seeded = JSON.stringify({
            distinct_id: "SEEDED_ID",
            $device_id: "SEEDED_DEVICE",
            $sesid: [now, "SEEDED_SESSION", now],
        });
        localStorage.setItem(STORE, seeded);
        sessionStorage.setItem(STORE, seeded);
        localStorage.setItem(`__ph_opt_in_out_${KEY}`, "1");
        localStorage.setItem("graphty.usageData.v1", "share-analytics");
        // Every removal made while the anonymous instance is being created. The shared instance
        // rewrites its own entries as it runs, so only this window says what the anonymous init did.
        const { default: posthog } = await importPostHogModule();
        const init = posthog.init.bind(posthog);
        let inAnonymousInit = false;
        vi.spyOn(posthog, "init").mockImplementation((token, options, name) => {
            inAnonymousInit = name === "anonymous";
            try {
                return init(token, options, name);
            } finally {
                inAnonymousInit = false;
            }
        });
        const removed: string[] = [];
        const { removeItem } = Storage.prototype;
        vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (this: Storage, key: string) {
            if (inAnonymousInit) {
                removed.push(key);
            }
            removeItem.call(this, key);
        });

        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            posthogHost: POSTHOG_TEST_HOST,
            afterFirstPaint: (run) => {
                run();
            },
        });
        startAnalyticsAtBoot(config);
        count("sample_loaded", { sample: "karate" });

        const shared = await vi.waitFor(() => {
            const found = sentEvents(network.bodies).filter((event) => event.properties.tracking === "shared");
            assert.isNotEmpty(found, "a shared-mode event left");
            return found;
        });
        const kept = localStorage.getItem(STORE) ?? "";
        assert.include(kept, "SEEDED_ID");
        assert.include(kept, "SEEDED_DEVICE");
        for (const event of shared) {
            assert.equal(event.properties.distinct_id, "SEEDED_ID");
        }
        // Not vacuous: the window saw the anonymous init remove its own entries.
        assert.isTrue(
            removed.some((key) => key.startsWith("ph_graphty_anonymous")),
            `removed: ${removed.join(", ")}`,
        );
        assert.isFalse(
            removed.some((key) => key === STORE || key.startsWith(`${STORE}__`)),
            `removed: ${removed.join(", ")}`,
        );
    });
});
