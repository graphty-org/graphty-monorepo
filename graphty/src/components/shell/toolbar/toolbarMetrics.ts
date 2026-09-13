/**
 * The canvas toolbar's own measurements, its two pure decisions and the three string
 * compositions the bar and its menu share.
 *
 * Nothing here draws. It is a plain module so the arithmetic can be asserted on its
 * own (`__tests__/toolbarMetrics.test.ts`) rather than inferred from a rendered tree,
 * which is what build spec 01 section 4 asks for: the bar's width is the sum of its
 * parts, never two written totals.
 *
 * Where a number already has a home it comes from there -- `shell/constants.ts` for
 * the bar's two size profiles and the canvas overlay ladder, `PANEL_GRID` and
 * `COMPACT_SIZING` for panel-scale metrics, `POPOUT_GAP` for the gap a transient
 * surface leaves its opener. The handful below are the Views menu's own drawn values,
 * each carrying the citation that fixes it.
 */

import { POPOUT_GAP } from "@graphty/compact-mantine";

import { CANVAS_TOOLBAR_DESKTOP, CANVAS_TOOLBAR_NARROW, type CanvasToolbarProfile, OVERLAY_INSET } from "../constants";

/* -------------------------------------------------------------------------- */
/* The bar                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Gap between the end of a tooltip's sentence and its key chip.
 * Build spec 04 section 10.3 point 1; VOCAB section 14 "Icon-only button".
 */
export const TOOLTIP_KEY_CHIP_GAP = 6;

/**
 * The 2D / 3D labels' type size and weight, the one place the bar prints words.
 * ART-TB: `font-size: 11px; font-weight: 500`.
 */
export const SEGMENT_FONT_SIZE = 11;

/**
 * Weight of the 2D / 3D labels. ART-TB.
 */
export const SEGMENT_FONT_WEIGHT = 500;

/**
 * The size profile in force, by the id the shell passes.
 *
 * Nothing changes between the two profiles except the sizes they carry (build spec 01
 * section 4, SPEC:3534), so this is the only place the id is read.
 * @param profileId - which profile the shell is in.
 * @returns the profile's measurements.
 */
export function canvasToolbarProfileFor(profileId: CanvasToolbarProfile["id"]): CanvasToolbarProfile {
    return profileId === "narrow" ? CANVAS_TOOLBAR_NARROW : CANVAS_TOOLBAR_DESKTOP;
}

/**
 * The register's flattened title for one icon-only bar item: the verb, its key chip
 * in parentheses, and -- when the item is drawn disabled -- the reason, as a second
 * sentence. This is the string the artboards carry in `title`, character for
 * character: "Zoom out (-)", "Zoom to selection (F). Select something first".
 * @param label - the capability's plain name, e.g. "Zoom to selection".
 * @param keyChip - the chip from `keyChipFor`, or null where the action has no chord.
 * @param disabledReason - why the item is inoperable, when it is.
 * @returns the full title.
 */
export function toolbarItemTitle(label: string, keyChip: string | null, disabledReason?: string): string {
    const withChip = keyChip === null ? label : `${label} (${keyChip})`;

    return disabledReason === undefined ? withChip : `${withChip}. ${disabledReason}`;
}

/**
 * The same title with the key chip taken out: the accessible name of an icon-only
 * control is "the tooltip text with the key chip removed" (build spec 04 section 8.2
 * point 1), and the tooltip bubble draws that sentence with the chip beside it rather
 * than inside it.
 * @param title - a title from {@link toolbarItemTitle}.
 * @param keyChip - the chip that title was built with, or null.
 * @returns the sentence without its chip, e.g. "Zoom to selection. Select something first".
 */
export function toolbarItemSentence(title: string, keyChip: string | null): string {
    return keyChip === null ? title : title.replace(` (${keyChip})`, "");
}

/* -------------------------------------------------------------------------- */
/* The Views menu (build spec 01 section 6)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Views menu width. ART-VM:360 (`width: 248px`).
 */
export const VIEWS_MENU_WIDTH = 248;

/**
 * The caret on the menu's bottom edge -- the edge that faces its opener, because the
 * toolbar is below it. VOCAB 14.2: a surface under 280 wide carries a caret rather
 * than a shared edge line. ART-VM caret box.
 */
export const VIEWS_MENU_CARET_SIZE = 8;

/**
 * How far inside its own corner the caret is clamped. The caret wants the Views
 * button's centre; on a 36 px button that lands 14 px inside a 248 px menu whose
 * right edge is the button's right edge, and the clamp is what fixes it at 12 on
 * every board and every profile. ART-VM ("clamped 12px inside its own right corner").
 */
export const VIEWS_MENU_CARET_CLAMP = 12;

/**
 * The menu's corner radius. ART-VM:360 (`border-radius: 4px`), the same 4 every
 * menu, popover, minimap and legend takes (VOCAB section 3).
 */
export const VIEWS_MENU_RADIUS = 4;

/**
 * One menu row's corner radius. ART-VM row block (`border-radius: 3px`).
 */
export const VIEWS_MENU_ROW_RADIUS = 3;

/**
 * The menu's inner padding. ART-VM:360 (`padding: 4px`).
 */
export const VIEWS_MENU_PADDING = 4;

/**
 * The gap between two rows. ART-VM:360 (`gap: 1px`).
 */
export const VIEWS_MENU_ROW_GAP = 1;

/**
 * The clear space above and below a separator rule. ART-VM (`margin: 3px 0`).
 */
export const VIEWS_MENU_SEPARATOR_MARGIN = 3;

/**
 * The second line of the Enter VR row -- the readiness count -- at the size the row
 * types give a secondary line. ART-VM (`font-size: 10px`).
 */
export const VIEWS_MENU_SECOND_LINE_FONT_SIZE = 10;

/**
 * How far inside the canvas's left, right and top edges the menu is clamped, above
 * which it scrolls internally instead of growing. Build spec 01 section 6
 * (SPEC:3592-3596): the same 12 the three baseline overlays are inset by.
 */
export const CANVAS_EDGE_CLAMP = OVERLAY_INSET;

/**
 * The drawn bottom edge of the open menu, measured from the canvas floor.
 *
 * Two readings of the same pixel, and they agree: the spec's "bottom edge 4 px above
 * the toolbar's top edge" (SPEC:3589-3597), and the artboard's 8 px gap above the
 * VIEWS BUTTON's top edge (ART-VM:340-343), the button sitting one border and one
 * container padding inside the bar. On the desktop profile both give 52. The menu is
 * anchored to the button itself, so this function is the statement the anchor has to
 * reproduce rather than a value passed to CSS.
 * @param profile - the size profile in force.
 * @param toolbarBottomOffset - the bar's own offset from the canvas floor, from `canvasToolbarBottomOffset`.
 * @returns the menu's bottom edge in CSS pixels above the canvas floor.
 */
export function viewsMenuBottomOffset(profile: CanvasToolbarProfile, toolbarBottomOffset: number): number {
    return toolbarBottomOffset + profile.height - (profile.borderWidth + profile.containerPadding) + POPOUT_GAP;
}

/* -------------------------------------------------------------------------- */
/* The XR entry gate (build spec 01 section 6; SPEC:3491-3498, SPEC:3989-3991) */
/* -------------------------------------------------------------------------- */

/**
 * The XR entry ceiling, in visible nodes. The desktop large-graph threshold, not the
 * render ceiling (SPEC:3257).
 */
export const XR_ENTRY_NODE_CEILING = 10000;

/**
 * The XR entry ceiling, in visible edges (SPEC:3257).
 */
export const XR_ENTRY_EDGE_CEILING = 50000;

/**
 * Above this many visible nodes XR entry is refused outright rather than offered on
 * the visible subset (SPEC:3491-3498).
 */
export const XR_SUBSET_NODE_LIMIT = 50000;

/**
 * Which of the gate's three states an XR row is in.
 *
 * {@link xrEntryState}'s return, and {@link xrRowLabel}'s parameter.
 * @public
 */
export type XrEntryState = "blocked" | "ready" | "subset";

/**
 * The XR entry gate: under the ceiling the row reads "Enter VR"; between the ceiling
 * and 50,000 visible nodes it offers the visible subset; above that it is disabled
 * with the reason on the row. Choosing either row opens the flat entry sheet of 5.9,
 * never the session.
 * @param visibleNodeCount - how many nodes are currently visible.
 * @param visibleEdgeCount - how many edges are currently visible.
 * @returns the gate state the two XR rows draw.
 */
export function xrEntryState(visibleNodeCount: number, visibleEdgeCount: number): XrEntryState {
    if (visibleNodeCount > XR_SUBSET_NODE_LIMIT) {
        return "blocked";
    }

    if (visibleNodeCount > XR_ENTRY_NODE_CEILING || visibleEdgeCount > XR_ENTRY_EDGE_CEILING) {
        return "subset";
    }

    return "ready";
}

/**
 * The departure named on the readiness line between the ceiling and 50,000 visible
 * nodes. ART-VM records it verbatim.
 *
 * The one home for the verbatim ART-VM wording, quoted rather than retyped by whatever asserts
 * the readiness line.
 * @public
 */
export const XR_SUBSET_DEPARTURE = "Visible subset only";

/**
 * The reason an XR row carries when the gate refuses entry. Composed rather than
 * quoted: the sources fix the rule ("disabled with the reason on the row") without
 * printing a sentence for it.
 *
 * Public with the departure above it, so both sentences are read from one place.
 * @public
 */
export const XR_BLOCKED_REASON = "Too many to enter VR";

/**
 * An XR row's name. The gate renames the row rather than hiding it, so the capability
 * keeps its plain name (floor item 6) and says what it will act on before it acts
 * (floor item 4).
 * @param verb - "Enter VR" or "Enter AR".
 * @param state - the gate state.
 * @returns the row's label.
 */
export function xrRowLabel(verb: string, state: XrEntryState): string {
    return state === "subset" ? `${verb} (visible subset)` : verb;
}

/**
 * The Enter VR row's second line: the count it acts on, always, plus the departure
 * when there is one. The reassurance clause of the default state is not drawn, which
 * is what keeps the line loud in the two states that are departures (ART-VM, rule 7a).
 * @param formattedCount - the visible node count, already formatted for the locale.
 * @param state - the gate state.
 * @returns the readiness line.
 */
export function xrReadinessLine(formattedCount: string, state: XrEntryState): string {
    const scope = `${formattedCount} visible nodes`;

    if (state === "subset") {
        return `${scope}. ${XR_SUBSET_DEPARTURE}`;
    }

    if (state === "blocked") {
        return `${scope}. ${XR_BLOCKED_REASON}`;
    }

    return scope;
}
