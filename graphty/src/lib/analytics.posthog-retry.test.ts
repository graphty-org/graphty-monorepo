/**
 * A failed load of the real posthog-js file is tried again and the buffered counts still go out
 * (design/graphty/usage-analytics.md, section 5). A browser keeps a failed module load for the life
 * of the page, so this needs a page whose module map has never held posthog-js: its own file.
 */
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig, type SiteConfig } from "../siteConfig";
import { interceptPostHog, POSTHOG_TEST_HOST, type PostHogTestNetwork, sentEvents } from "../test/posthog-network";
import { forgetUsageAnswer } from "../workspace/privacy/usageData";
import {
    importPostHogModule,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    startAnalyticsAtBoot,
} from "./analytics";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Fails every request whose URL holds the fragment with 404, or lets them through again. */
        failRequests: (fragment: string, failing: boolean) => Promise<void>;
    }
}

/** A piece of the posthog-js file's URL, in the dev server and the build alike. */
const POSTHOG_FILE = "module.full.no-external";

let network: PostHogTestNetwork;
let config: SiteConfig;

beforeEach(async () => {
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    const site = {
        site: "production",
        features: [],
        analytics: { posthogKey: "phc_retrytest", posthogHost: "https://eu.i.posthog.com" },
    };
    config = await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
    setAnalyticsCallsForTests({
        hostname: () => "graphty.app",
        posthogHost: POSTHOG_TEST_HOST,
        afterFirstPaint: (run) => {
            run();
        },
    });
    network = interceptPostHog();
});

afterEach(async () => {
    await commands.failRequests(POSTHOG_FILE, false);
    network.restore();
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    setAnalyticsCallsForTests();
});

describe("a failed load of posthog-js", () => {
    it("loads it again when the browser is back online, and sends the page view it held", async () => {
        await commands.failRequests(POSTHOG_FILE, true);
        startAnalyticsAtBoot(config);
        // The same URL the app asked for: it rejects once that load has failed.
        let failed = false;
        await importPostHogModule().catch(() => {
            failed = true;
        });
        assert.isTrue(failed, "the first load failed");
        await commands.failRequests(POSTHOG_FILE, false);

        // Back online, as many times as it takes for the app to have recorded the failure first.
        await vi.waitFor(() => {
            globalThis.dispatchEvent(new Event("online"));
            assert.include(
                sentEvents(network.bodies).map((event) => event.event),
                "$pageview",
            );
        });
        assert.lengthOf(
            sentEvents(network.bodies).filter((event) => event.event === "$pageview"),
            1,
        );
    });
});
