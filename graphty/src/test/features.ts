/**
 * A test file's experiments: every test in it runs with exactly these switched on, in the Off and
 * the On configuration alike (design/ci/channels-pipeline/features.md, section 7.1), as a site whose
 * site.json names them would run. Registered after the On setup's own hooks, so it wins.
 */

import { setDefaultFeatures } from "@graphty/graphty-element/extend";
import { afterEach, beforeEach } from "vitest";

import { setAnalyticsCallsForTests } from "../lib/analytics";
import { loadSiteConfig, resetSiteConfig } from "../siteConfig";
import { keepFeaturesOff } from "./featuresOff";
import { TEST_ANALYTICS } from "./usage-recorders";

/**
 * Runs every test of the calling file with exactly these experiments on.
 * @param ids - the experiment ids; empty for none.
 */
export function withFeatures(ids: readonly string[]): void {
    beforeEach(async () => {
        resetSiteConfig();
        setDefaultFeatures(ids);
        await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify({ features: ids }))}`);
    });
    afterEach(() => {
        resetSiteConfig();
        setDefaultFeatures([]);
    });
}

export { markFeaturesOn } from "./featuresOff";

/**
 * Runs every test of the calling file with these experiments off, the rest as the configuration
 * has them: nothing changes in the Off configuration, and in the On configuration every other
 * experiment stays on. For a file that tests what the app shows with one experiment off, when the
 * experiment replaces that part of the app (file-styles replaces the node tab of the Style panel).
 * @param ids - the experiment ids to keep off.
 */
export function withoutFeatures(ids: readonly string[]): void {
    beforeEach(async () => {
        await keepFeaturesOff(ids);
    });
}

/**
 * Runs every test of the calling file on a site that sends PostHog: PostHog ids in site.json and
 * the site's own host, so the app shows the words for it. PostHog's
 * code never arrives, so nothing is sent. Registered after `withFeatures`, so it wins.
 */
export function withPostHogSite(): void {
    beforeEach(async () => {
        resetSiteConfig();
        const site = { site: "production", analytics: TEST_ANALYTICS };
        await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
        setAnalyticsCallsForTests({ hostname: () => "graphty.app", importPostHog: () => new Promise(() => undefined) });
    });
    afterEach(() => {
        setAnalyticsCallsForTests();
        resetSiteConfig();
    });
}
