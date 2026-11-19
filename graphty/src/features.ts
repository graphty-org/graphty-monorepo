/**
 * The app's own experiments: ones with no graphty-element part (design/ci/channels-pipeline/features.md,
 * section 5.3). graphty-element's `resolveFeatures` lists an id it does not declare under `unknown`
 * and never under `enabled`, so these are read from the combined raw list the site configuration
 * holds (site.json's `features`, then the page address's `?features=`), where `"all"` switches every
 * one on as it does the element's. tools/check-features.mjs reads `APP_FEATURES` too, so these ids
 * get the same checks as graphty-element's `FEATURES`.
 */

import { useSyncExternalStore } from "react";

import { onSiteConfig, siteConfig } from "./siteConfig";

/** An experiment of the app alone. */
interface AppFeature {
    /** The id a site file or `?features=` names. */
    readonly id: AppFeatureId;
    /** Its tracking issue. */
    readonly issue: number;
    /** The day it was declared. */
    readonly since: string;
}

/** The ids of the app's own experiments. */
export type AppFeatureId = "usage-analytics";

/** The app's own experiments, with their tracking issues. */
export const APP_FEATURES: readonly AppFeature[] = Object.freeze([
    // PostHog's anonymous counts and shared mode, surveys, and the words and links that describe
    // them (design/graphty/usage-analytics.md); off, the app sends PostHog nothing and loads none of it.
    { id: "usage-analytics", issue: 8818, since: "2026-11-18" },
]);

/**
 * Whether one of the app's own experiments is on. Off until `loadSiteConfig` settles.
 * @param id - the experiment.
 * @param features - the combined raw list; the loaded site configuration's by default.
 * @returns true when the list names it, or names "all".
 */
export function appFeatureOn(id: AppFeatureId, features: readonly string[] = siteConfig().features): boolean {
    return features.includes(id) || features.includes("all");
}

/**
 * `appFeatureOn` for a component: renders again once the site configuration has loaded.
 * @param id - the experiment.
 * @returns true when it is on.
 */
export function useAppFeature(id: AppFeatureId): boolean {
    return useSyncExternalStore(onSiteConfig, () => appFeatureOn(id));
}
