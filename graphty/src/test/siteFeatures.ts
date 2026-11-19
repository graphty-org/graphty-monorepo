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

/**
 * A story's `beforeEach` that runs it as on a site switching exactly these experiments on, and
 * puts the site back after.
 * @param features - the experiment ids; empty for none.
 * @returns the hook.
 */
export function onSiteWith(features: readonly string[]): () => Promise<() => Promise<void>> {
    return async () => {
        await siteFeatures(features);
        return async () => {
            resetSiteConfig();
            await loadSiteConfig();
        };
    };
}
