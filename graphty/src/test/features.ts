/**
 * A test file's experiments: every test in it runs with exactly these switched on, in the Off and
 * the On configuration alike (design/ci/channels-pipeline/features.md, section 7.1), as a site whose
 * site.json names them would run. Registered after the On setup's own hooks, so it wins.
 */

import { FEATURES } from "@graphty/graphty-element/catalog";
import { setDefaultFeatures } from "@graphty/graphty-element/extend";
import { afterEach, beforeEach } from "vitest";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";

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

/** Whether this run is the On configuration: every declared experiment switched on. */
let featuresOn = false;

/** Called by the On configuration's setup file (setup-features-on.ts). */
export function markFeaturesOn(): void {
    featuresOn = true;
}

/**
 * Runs every test of the calling file with these experiments off, the rest as the configuration
 * has them: nothing changes in the Off configuration, and in the On configuration every other
 * experiment stays on. For a file that tests what the app shows with one experiment off, when the
 * experiment replaces that part of the app (file-styles replaces the node tab of the Style panel).
 * @param ids - the experiment ids to keep off.
 */
export function withoutFeatures(ids: readonly string[]): void {
    beforeEach(async () => {
        if (!featuresOn) {
            return;
        }
        const rest = FEATURES.map((feature) => feature.id).filter((id) => !ids.includes(id));
        resetSiteConfig();
        setDefaultFeatures(rest);
        await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify({ features: rest }))}`);
    });
}
