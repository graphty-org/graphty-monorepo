/**
 * The app's own experiments: ones with no graphty-element part (design/ci/channels-pipeline/features.md,
 * section 5.3). graphty-element's `resolveFeatures` lists an id it does not declare under `unknown`
 * and never under `enabled`, so these are read from the combined raw list the site configuration
 * holds (site.json's `features`, then the page address's `?features=`), where `"all"` switches every
 * one on as it does the element's. tools/check-features.mjs reads `APP_FEATURES` too, so these ids
 * get the same checks as graphty-element's `FEATURES`.
 */

import { siteConfig } from "./siteConfig";

/** An experiment of the app alone. */
interface AppFeature {
    /** The id a site file or `?features=` names: `never` while none is declared; the next one makes it a string union. */
    readonly id: never;
    /** Its tracking issue. */
    readonly issue: number;
    /** The day it was declared. */
    readonly since: string;
}

/**
 * The app's own experiments, with their tracking issues. Exported for tools/check-features.mjs, which reads it as text.
 * @public
 */
export const APP_FEATURES: readonly AppFeature[] = Object.freeze([]);

/**
 * Ids of the app's experiments that have shipped: a site file or `?features=` naming one is accepted
 * and changes nothing. tools/check-features.mjs fails where code still names one.
 */
export const GRADUATED_FEATURES: readonly string[] = Object.freeze(["usage-analytics"]);

/**
 * Whether one of the app's own experiments is on. Off until `loadSiteConfig` settles.
 * @param id - the experiment.
 * @param features - the combined raw list; the loaded site configuration's by default.
 * @returns true when the list names it, or names "all".
 */
export function appFeatureOn(id: AppFeature["id"], features: readonly string[] = siteConfig().features): boolean {
    return features.includes(id) || features.includes("all");
}
