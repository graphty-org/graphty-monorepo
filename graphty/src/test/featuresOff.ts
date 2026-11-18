/**
 * Keeping experiments off in the On test configuration, for test files (`withoutFeatures` in
 * ./features) and stories (a story's `beforeEach`) alike: free of vitest, so a story may import it.
 */

import { FEATURES } from "@graphty/graphty-element/catalog";
import { setDefaultFeatures } from "@graphty/graphty-element/extend";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";

/** Whether this run is the On configuration: every declared experiment switched on. */
let featuresOn = false;

/** Called by the On configuration's setup file (setup-features-on.ts). */
export function markFeaturesOn(): void {
    featuresOn = true;
}

/**
 * In the On configuration, switches these experiments off and keeps every other one on; in the Off
 * configuration it changes nothing.
 * @param ids - the experiment ids to keep off.
 */
export async function keepFeaturesOff(ids: readonly string[]): Promise<void> {
    if (!featuresOn) {
        return;
    }
    const rest = FEATURES.map((feature) => feature.id).filter((id) => !ids.includes(id));
    resetSiteConfig();
    setDefaultFeatures(rest);
    await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify({ features: rest }))}`);
}
