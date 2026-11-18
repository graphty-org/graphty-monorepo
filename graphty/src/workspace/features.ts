/**
 * The app's gates on graphty-element's experiments (design/ci/channels-pipeline/features.md,
 * section 5.3): read from the element's own `features.enabled`, never from the page address or the
 * site file, which the element was handed when its session was made.
 */

import type { GraphSession } from "@graphty/graphty-element/session";

/**
 * Whether the Cosmograph-inspired rendering is on (issue #3247). On, the app draws its graph with
 * graphty-element's batched render path and the Style tab's Line section offers the long-edge fade
 * and blending; off, nothing of it is drawn or set.
 * @param session - the element's session, or null before it comes up.
 * @returns true when the element switched the experiment on.
 */
export function cosmographOn(session: GraphSession | null | undefined): boolean {
    return (session?.features.enabled ?? []).includes("cosmograph");
}

/**
 * Whether styles from files are on (issue #706): reading a file's styles on a load, writing styles
 * into an exported file, and the style settings and values added to draw other programs' files.
 * Off, the app asks for no styles, offers no switch for them, and the Style tab offers only what the
 * element's catalog offers.
 * @param session - the element's session, or null before it comes up.
 * @returns true when the element switched the experiment on.
 */
export function fileStylesOn(session: GraphSession | null | undefined): boolean {
    const features = new Set<string>(session?.features.enabled ?? []);
    return features.has("file-styles");
}

/**
 * Whether the node models experiment is on (issue #3396). On, the Style tab's Shape field offers
 * "Model..." with its Models, Model settings and Parts pop-overs, Fill offers Picture, and saving a
 * project that names a model or picture by web address asks whether to embed it or keep its address;
 * off, nothing of it is drawn.
 * @param session - the element's session, or null before it comes up.
 * @returns true when the element switched the experiment on.
 */
export function nodeModelsOn(session: GraphSession | null | undefined): boolean {
    return (session?.features.enabled ?? []).includes("node-models");
}

/**
 * Whether the source references experiment is on (issue #8813). On, Save as offers to keep each
 * data source as a copy or a reference, and the Data sources list marks a referenced source; off,
 * nothing of it is shown.
 * @param session - the element's session, or null before it comes up.
 * @returns true when the element switched the experiment on.
 */
export function sourceReferencesOn(session: GraphSession | null | undefined): boolean {
    return (session?.features.enabled ?? []).includes("source-references");
}
