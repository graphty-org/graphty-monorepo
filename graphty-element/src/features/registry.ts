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
export type FeatureId =
    | "data-management"
    | "timeline"
    | "location-map"
    | "selection-workspace"
    | "cosmograph"
    | "file-styles";

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

/** Every experiment this build can switch on. */
export const FEATURES: readonly FeatureDescriptor[] = Object.freeze([
    // The graphty app's full-screen selection editor; graphty-element's selection API is not gated.
    { id: "selection-workspace", plainName: "Selection workspace", issue: 5805, since: "2026-11-04" },
    { id: "timeline", plainName: "Timeline", issue: 300, since: "2026-11-04" },
    // The graphty app's use of batched drawing and the long-edge fade and blending options;
    // graphty-element's `renderPath`, edge styles and layout options are not gated.
    { id: "cosmograph", plainName: "Cosmograph-inspired rendering", issue: 3247, since: "2026-11-06" },
    // Reading and writing the styles other programs write into graph files, and every style channel
    // and value added to draw them.
    { id: "file-styles", plainName: "File styles", issue: 706, since: "2026-11-06" },
]);

/** Ids of experiments that have shipped: accepted silently, and they change nothing. */
export const GRADUATED_FEATURES: readonly string[] = Object.freeze([]);
