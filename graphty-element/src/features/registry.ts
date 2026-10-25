/**
 * @file The experiments graphty-element ships switched off, as data.
 *
 * An experiment is unfinished work that has landed behind a switch: with its id off, the element
 * behaves exactly as it did before the experiment's code arrived. `FEATURES` lists the ones that
 * exist in this build; `GRADUATED_FEATURES` lists ids that have shipped, which are accepted and
 * change nothing, so a link made for an older build still opens. Plain data, free of Babylon.js,
 * Lit and the DOM.
 */

/** The id of an experiment, as `features="..."` and `createGraphSession({ features })` take it. */
export type FeatureId = "data-management" | "timeline" | "location-map";

/** One experiment this build can switch on. */
export interface FeatureDescriptor {
    /** Its id. */
    readonly id: FeatureId;
    /** Its default name, catalog data an application may show or replace. */
    readonly plainName: string;
    /** The GitHub issue that tracks it until it graduates. */
    readonly issue: number;
    /** The ISO date its switch was declared. */
    readonly since: string;
}

/** Every experiment this build can switch on; empty when there are none. */
export const FEATURES: readonly FeatureDescriptor[] = Object.freeze([]);

/** Ids of experiments that have shipped: accepted silently, and they change nothing. */
export const GRADUATED_FEATURES: readonly string[] = Object.freeze([]);
