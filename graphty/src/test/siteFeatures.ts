import { loadSiteConfig, resetSiteConfig } from "../siteConfig";

/**
 * Makes the app run as on a site whose `site.json` switches these experiments on, for the
 * workspaces rendered from now on.
 * @param features - the experiment ids.
 */
export async function siteFeatures(features: readonly string[]): Promise<void> {
    resetSiteConfig();
    await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify({ features }))}`);
}
