/**
 * A test file's experiments: every test in it runs with exactly these switched on, in the Off and
 * the On configuration alike (design/ci/channels-pipeline/features.md, section 7.1), as a site whose
 * site.json names them would run. Registered after the On setup's own hooks, so it wins.
 */

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
