/**
 * The app's gates on graphty-element's experiments (design/ci/channels-pipeline/features.md,
 * section 5.3): read from the element's own `features.enabled`, never from the page address or the
 * site file, which the element was handed when its session was made.
 */

import type { GraphSession } from "@graphty/graphty-element/session";

/**
 * Whether the full-screen selection workspace is on (issue #5805). Off, Edit on a selection opens the
 * outline-and-pane editor and nothing of the experiment is drawn.
 * @param session - the element's session, or null before it comes up.
 * @returns true when the element switched the experiment on.
 */
export function selectionWorkspaceOn(session: GraphSession | null | undefined): boolean {
    const features = new Set<string>(session?.features.enabled ?? []);
    return features.has("selection-workspace");
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
