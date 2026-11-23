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
 * Whether sources and steps are on (issue #9152): a second source arrives staged in its own section
 * of the Sources list instead of opening the join screen, and is added from there. Off, a second
 * source opens the join screen as before.
 * @param session - the element's session, or null before it comes up.
 * @returns true when the element switched the experiment on.
 */
export function sourceStepsOn(session: GraphSession | null | undefined): boolean {
    return (session?.features.enabled ?? []).includes("source-steps");
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

/**
 * Whether version 2 save files are on (issue #8029). On, Save as asks which sections to save and
 * whether to copy or reference each source, Save keeps a version 2 file in this browser, and opening
 * a version 2 file asks which sections to load first; off, saving and opening are as before.
 * @param session - the element's session, or null before it comes up.
 * @returns true when the element switched the experiment on.
 */
export function saveFilesV2On(session: GraphSession | null | undefined): boolean {
    return (session?.features.enabled ?? []).includes("save-files-v2");
}
