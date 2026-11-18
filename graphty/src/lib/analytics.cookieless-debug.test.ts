/**
 * A link carrying `?__posthog_debug=true` on the real posthog-js chunk (design/graphty/usage-analytics.md,
 * section 11): the anonymous instance still stores nothing. posthog-js works out its default `debug`
 * from the address bar when an instance is created, and stores `ph_debug` when it comes out true.
 * Its own file, because it needs a posthog-js module no case has initialized yet.
 */
import type { PostHog } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";
import { interceptPostHog, POSTHOG_TEST_HOST, type PostHogTestNetwork, sentEvents } from "../test/posthog-network";
import { forgetUsageAnswer } from "../workspace/privacy/usageData";
import {
    importPostHogModule,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    startAnalyticsAtBoot,
} from "./analytics";

const KEY = "phc_debuglinktest";
let network: PostHogTestNetwork;
const address = globalThis.location.href;

beforeEach(() => {
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    localStorage.clear();
    sessionStorage.clear();
    network = interceptPostHog();
});

afterEach(() => {
    network.restore();
    globalThis.history.replaceState(null, "", address);
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    setAnalyticsCallsForTests();
    localStorage.clear();
    sessionStorage.clear();
});

describe("a link with PostHog's debug parameter", () => {
    it("never makes the anonymous instance store ph_debug or turn debug on", async () => {
        const site = {
            site: "production",
            features: [],
            analytics: { posthogKey: KEY, posthogHost: "https://eu.i.posthog.com" },
        };
        const config = await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
        globalThis.history.replaceState(null, "", "?__posthog_debug=true&ref=x");
        const setItem = vi.spyOn(Storage.prototype, "setItem");
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            posthogHost: POSTHOG_TEST_HOST,
            afterFirstPaint: (run) => {
                run();
            },
        });
        startAnalyticsAtBoot(config);

        const { default: posthog } = await importPostHogModule();
        const anonymous = await vi.waitFor(() => {
            const instance = (posthog as unknown as { anonymous?: PostHog }).anonymous;
            assert.isDefined(instance, "the anonymous instance was created");
            return instance;
        });
        // Not vacuous: the parameter was still in the address when the instance was created.
        assert.include(globalThis.location.search, "__posthog_debug=true");
        await vi.waitFor(() => {
            assert.include(
                sentEvents(network.bodies).map((event) => event.event),
                "$pageview",
            );
        });
        assert.isFalse(anonymous.config.debug);
        assert.isNull(localStorage.getItem("ph_debug"));
        assert.notInclude(
            setItem.mock.calls.map((call) => call[0]),
            "ph_debug",
        );
        setItem.mockRestore();
    });
});
