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
    | "assistant"
    | "data-management"
    | "timeline"
    | "location-map"
    | "cosmograph"
    | "file-styles"
    | "node-models"
    | "save-files-v2";

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
    { id: "timeline", plainName: "Timeline", issue: 300, since: "2026-11-04" },
    { id: "assistant", plainName: "Assistant", issue: 2000, since: "2026-11-04" },
    // The graphty app's use of batched drawing and the long-edge fade and blending options;
    // graphty-element's `renderPath`, edge styles and layout options are not gated.
    { id: "cosmograph", plainName: "Cosmograph-inspired rendering", issue: 3247, since: "2026-11-06" },
    // Reading and writing the styles other programs write into graph files, and every style channel
    // and value added to draw them.
    { id: "file-styles", plainName: "File styles", issue: 706, since: "2026-11-06" },
    // The graphty app's model and picture UI in the Style panel and the save question, and in
    // graphty-element a save with no choice for a URL keeping it as the project last kept it (off:
    // embedded, as before); node.model* and node.texture, session.assets and session.network are not gated.
    { id: "node-models", plainName: "Node models", issue: 3396, since: "2026-11-07" },
    // Version 2 save files (spec/README.md): `project.save` with `format: 2` and `project.open` of a
    // version 2 full or section file. Off, `format: 2` is refused and version 2 files are read as
    // before (refused as a newer version); version 1 files are written and read exactly as before.
    { id: "save-files-v2", plainName: "Save files version 2", issue: 8029, since: "2026-11-14" },
]);

/** Ids of experiments that have shipped: accepted silently, and they change nothing. */
export const GRADUATED_FEATURES: readonly string[] = Object.freeze(["network-data", "selection-workspace"]);
