/**
 * Shell geometry: every fixed number the seven shell regions lay themselves out with.
 *
 * Authority split (design/ui/mockups/system/CONTRAST-DIVERGENCE.md section 5):
 * this file owns WHERE a thing goes and HOW BIG it is. It owns no colour at all --
 * colour comes from `@graphty/compact-mantine` (PANEL_INK, the Mantine theme, CSS
 * variables) and never from an artboard hex.
 *
 * Citations name build spec 01 (tmp/shell-spec/01-frame-canvas-toolbar.md), which in
 * turn cites design/ui/app-shell-progressive-disclosure-design.md ("SPEC:<line>") and
 * the artboards ("ART-MAIN", "ART-TB", "ART-VM").
 *
 * Where the spec derives a number by arithmetic, the arithmetic is written here as an
 * expression over its parts. The documented totals (246, 274, 622, 650, 12, 82, 272,
 * 342, 280) are asserted in `__tests__/constants.test.ts` and appear nowhere else.
 *
 * Where the spec makes two named surfaces THE SAME size, the second name is declared as
 * the first (`export const B = A`) rather than as a second literal, so the identity is
 * recorded by the code and cannot drift. Those declarations carry a `@alias` JSDoc tag:
 * knip reports `export const B = A` as a duplicate export by default, and the tag is how
 * it is told the shared value is the point. The tag also takes the constant out of
 * knip's unused-export check, which is why only genuine spec identities get one.
 */

import type { ActivityId, PinnedActivityId, PrimaryActivityId, StatusBarSlotId } from "./types";

/* -------------------------------------------------------------------------- */
/* Region geometry (build spec 01 section 1)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Activity rail width, a fixed column on the left edge of the shell.
 * Spec 01 section 1 (SPEC:123; ART-MAIN `flex: 0 0 48px`).
 */
export const ACTIVITY_RAIL_WIDTH = 48;

/**
 * Height of one rail item. 47 of the 48 px column is the item box, the last 1 px is
 * the rail's right border. Spec 02 section 1.1.
 */
export const ACTIVITY_RAIL_ITEM_HEIGHT = 44;

/**
 * Width of one rail item box: the column minus its 1 px right border.
 * Spec 02 section 1.1.
 */
export const ACTIVITY_RAIL_ITEM_WIDTH = ACTIVITY_RAIL_WIDTH - 1;

/**
 * Vertical gap between two rail items. Spec 02 section 1.1.
 */
export const ACTIVITY_RAIL_ITEM_GAP = 2;

/**
 * Activity panel default width, and the width the 6.9 panel grid is an identity for:
 * 16 pad + 108 field + 8 gutter + 108 field + 8 gap + 24 trailing + 8 pad.
 * Spec 01 section 1 (SPEC:130-131; ART-MAIN:289); spec 04 section 3.1.
 */
export const ACTIVITY_PANEL_WIDTH_DEFAULT = 280;

/**
 * Activity panel minimum width on a desktop drag.
 *
 * The sources name no separate floor, and the 6.9 grid identity sums to exactly 280:
 * a narrower panel breaks every row type at once. The floor is therefore the default
 * itself and the desktop drag only widens. Spec 04 section 3.1 (PANEL_GRID identity).
 *
 * Declared as {@link ACTIVITY_PANEL_WIDTH_DEFAULT} because the floor IS the default; see
 * the alias note in this file's header.
 * @alias ACTIVITY_PANEL_WIDTH_DEFAULT
 */
export const ACTIVITY_PANEL_MIN_WIDTH = ACTIVITY_PANEL_WIDTH_DEFAULT;

/**
 * Activity panel maximum width on a desktop drag.
 *
 * DERIVED, not quoted: the binding cap is the 520 px canvas clamp, which depends on
 * the viewport and is computed by {@link maxActivityPanelWidth}. This constant is the
 * static ceiling above that -- the top rung of 6.11's 280 / 360 / 480 pop-out width
 * ladder, the widest surface the design system admits. Spec 04 section 9.3.
 */
export const ACTIVITY_PANEL_MAX_WIDTH = 480;

/**
 * Inspector default width. The inspector is the same 280 px column as an activity
 * panel and takes the same grid -- 280, not the 260 the artboards' earlier sidebar used.
 * Spec 01 section 1 (SPEC:273; ART-MAIN:1031); spec 04 section 3.3.
 *
 * Declared as {@link ACTIVITY_PANEL_WIDTH_DEFAULT} because design 6.9 makes it the same
 * column by definition; see the alias note in this file's header.
 * @alias ACTIVITY_PANEL_WIDTH_DEFAULT
 */
export const INSPECTOR_WIDTH_DEFAULT = ACTIVITY_PANEL_WIDTH_DEFAULT;

/**
 * Inspector minimum width on a desktop drag. Same reasoning as
 * {@link ACTIVITY_PANEL_MIN_WIDTH}: the panel grid identity is exactly 280.
 * @alias ACTIVITY_PANEL_MIN_WIDTH
 */
export const INSPECTOR_MIN_WIDTH = ACTIVITY_PANEL_MIN_WIDTH;

/**
 * Inspector maximum width on a desktop drag. Same derivation as
 * {@link ACTIVITY_PANEL_MAX_WIDTH}.
 * @alias ACTIVITY_PANEL_MAX_WIDTH
 */
export const INSPECTOR_MAX_WIDTH = ACTIVITY_PANEL_MAX_WIDTH;

/**
 * Top bar height. The top bar spans the FULL shell width above the rail, so it is the
 * frame's first row and the rail starts below it. Spec 01 section 1 (SPEC:275;
 * ART-MAIN:231) put the bar to the right of the rail instead; the product owner
 * reversed that on 2026-09-12 ("make the top bar go all the way across the top"), and
 * the amendment is recorded at design 5.1. The number is unchanged by the move.
 */
export const TOP_BAR_HEIGHT = 40;

/**
 * Status bar height. The status bar is full shell width BELOW the main row, so it
 * does cross under the rail. Spec 01 section 1 (SPEC:307; ART-MAIN:1383).
 */
export const STATUS_BAR_HEIGHT = 24;

/**
 * Header row height shared by the activity panel and the inspector.
 * Spec 01 section 1 (ART-MAIN:292, ART-MAIN:1042); spec 03 sections 1.2 and 3.2.
 */
export const PANEL_HEADER_HEIGHT = 36;

/**
 * Hard clamp on a panel or inspector drag: the live canvas never goes below this.
 * Between this and the reflow threshold the two-line rule is the only response --
 * there is no third step. Spec 01 section 1 (SPEC:157-159, SPEC:3577-3579).
 */
export const CANVAS_MIN_WIDTH = 520;

/**
 * Narrow-screen breakpoint. Below it the panel and inspector become overlays, the
 * canvas is not resized under them, and the canvas toolbar takes its larger profile.
 * Spec 01 section 1 (SPEC:403) and section 7.
 */
export const NARROW_BREAKPOINT = 1280;

/* -------------------------------------------------------------------------- */
/* Canvas overlay geometry (build spec 01 sections 1, 2, 5)                     */
/* -------------------------------------------------------------------------- */

/**
 * The one baseline inset the minimap, the legend and the canvas toolbar share.
 * Spec 01 section 1 (SPEC:3567; ART-MAIN:759/794/1001).
 */
export const OVERLAY_INSET = 12;

/**
 * Minimum horizontal clearance between the three baseline overlays. Below it the
 * two-line reflow fires. Spec 01 section 1 (SPEC:3567-3569).
 */
export const OVERLAY_MIN_CLEARANCE = 16;

/**
 * Minimap box width. Spec 01 section 1 (ART-MAIN:759).
 */
export const MINIMAP_WIDTH = 160;

/**
 * Minimap box height. Spec 01 section 1 (ART-MAIN:759).
 */
export const MINIMAP_HEIGHT = 100;

/**
 * Node count above which the minimap switches to a node-density heatmap.
 * Spec 01 section 1 (SPEC:163-168).
 */
export const MINIMAP_HEATMAP_NODE_THRESHOLD = 10000;

/**
 * Heatmap grid, columns by rows, log-scaled. Spec 01 section 1 (SPEC:163-168).
 */
export const MINIMAP_HEATMAP_GRID_COLUMNS = 64;

/**
 * Heatmap grid rows. Spec 01 section 1 (SPEC:163-168).
 */
export const MINIMAP_HEATMAP_GRID_ROWS = 32;

/**
 * Throttle, in milliseconds, on rebuilding the minimap heatmap.
 * Spec 01 section 1 (SPEC:165-167).
 */
export const MINIMAP_HEATMAP_REBUILD_THROTTLE_MS = 500;

/**
 * Legend width, on every board, so the reflow arithmetic and the offset ladder are
 * untouched by its content. Spec 01 section 1 (SPEC:229; ART-MAIN:794).
 */
export const LEGEND_WIDTH = 256;

/**
 * Legend minimum height. Spec 01 section 1 (SPEC:224-229; ART-MAIN:794).
 */
export const LEGEND_MIN_HEIGHT = 80;

/**
 * Legend height cap, measured from its raised bottom when the two-line rule has
 * fired. Above it categorical blocks shorten one row at a time; a block is never
 * dropped. Spec 01 sections 1 and 5 (SPEC:224-231).
 */
export const LEGEND_MAX_HEIGHT = 240;

/**
 * Horizontal band one baseline overlay occupies measured from its own canvas edge:
 * the 12 px inset plus the 160 px minimap box. The spec's own reflow arithmetic uses
 * this same 172 for BOTH ends of the baseline, which is why it appears twice in
 * {@link canvasToolbarReflowThreshold}. Spec 01 section 1 (arithmetic SPEC:3568).
 */
export const BASELINE_OVERLAY_BAND = OVERLAY_INSET + MINIMAP_WIDTH;

/**
 * Distance the minimap and the legend rise when the two-line reflow fires. They use
 * the panel's own transition and neither is ever hidden.
 * Spec 01 sections 1 and 5 (SPEC:159, SPEC:3572; drawn minimap `bottom: 60`).
 */
export const OVERLAY_REFLOW_RISE = 48;

/**
 * Insights strip inset from the top of the canvas. Spec 01 section 1 (SPEC:137;
 * ART-MAIN:713).
 */
export const INSIGHTS_STRIP_TOP = 12;

/**
 * Insights strip maximum width, centred. Spec 01 section 1 (ART-MAIN:713).
 */
export const INSIGHTS_STRIP_MAX_WIDTH = 720;

/**
 * Data table drawer default height. The drawer is a DOCK: it shortens the live canvas
 * rect. It drags to resize and its height is remembered (6.5).
 * Spec 01 sections 1 and 2 (SPEC:170-171; SPEC:3554).
 */
export const DATA_DRAWER_DEFAULT_HEIGHT = 260;

/**
 * Time slider height -- 70, not 72. The slider is an OVERLAY: it never resizes the
 * canvas, and it docks to the top edge of the drawer when both are open.
 * Spec 01 sections 1 and 2 (SPEC:140; SPEC:3542; ART-TB "Time slider overlay 70").
 */
export const TIME_SLIDER_HEIGHT = 70;

/* -------------------------------------------------------------------------- */
/* Canvas overlay z-order (build spec 01 section 2)                            */
/* -------------------------------------------------------------------------- */

/**
 * Canvas toolbar stacking. Spec 01 section 2 (ART-MAIN:1001; ART-TB:382).
 */
export const CANVAS_TOOLBAR_Z_INDEX = 6;

/**
 * An anchored pop-out drawn over the canvas. Spec 01 section 2 (ART-MAIN:863).
 */
export const CANVAS_POPOUT_Z_INDEX = 8;

/**
 * Menus, including the Views menu and the Help menu: they paint over the toolbar.
 * Spec 01 section 2 (ART-MAIN:1347; ART-VM:360).
 */
export const CANVAS_MENU_Z_INDEX = 15;

/**
 * Surfaces that float above the WHOLE shell body rather than above the canvas: the
 * Settings full-panel overlay and the shortcuts reference.
 *
 * They sit above the menu rung because they are not canvas chrome. Everything below
 * this line is drawn inside the canvas or anchored to a control in a region, and a
 * surface that covers the panel, the canvas and the inspector together has to cover
 * what those regions drew. Settings carried no stacking at all until this existed,
 * which let the canvas toolbar and the minimap -- 9 rungs below it -- paint straight
 * through an overlay that is supposed to replace the panel.
 *
 * The two cannot currently be on screen together: Settings sets `modalOpen`, which
 * suppresses every binding but Escape, so ? cannot be pressed over it. They share the
 * rung anyway, because the rung describes what a surface IS rather than which
 * surfaces happen to be reachable at once, and a shortcuts reference that later
 * becomes reachable from inside Settings should not have to rediscover this.
 */
export const SHELL_OVERLAY_Z_INDEX = 20;

/* -------------------------------------------------------------------------- */
/* Canvas toolbar size profiles (build spec 01 section 4)                      */
/* -------------------------------------------------------------------------- */

/**
 * One canvas toolbar size profile. Every component of the width arithmetic is a named
 * member, so the total is computed by {@link canvasToolbarWidth} rather than written
 * down. The two profiles differ only in the sizes below -- nothing else changes
 * between them (spec 01 section 4, SPEC:3534).
 */
export interface CanvasToolbarProfile {
    /** Which profile this is: desktop at >= 1280 px, narrow below it. */
    readonly id: "desktop" | "narrow";
    /** Icon button box, square. 28 desktop / 32 narrow (SPEC:3520, SPEC:3532). */
    readonly itemSize: number;
    /** Drawn glyph size inside an item. 14 desktop / 16 narrow (SPEC:3520). */
    readonly glyphSize: number;
    /**
     * The 2D / 3D segmented control's track width. 60 desktop / 68 narrow. Carried as
     * a drawn value: the sources give the track and its inner halves but do not
     * decompose the remaining 6 px (ART-MAIN:1002; ART-TB:196).
     */
    readonly segmentedWidth: number;
    /** One half of the segmented track. 26 desktop / 30 narrow (ART-TB:196). */
    readonly segmentedHalfWidth: number;
    /** Inner padding of the segmented track, per side (ART-TB:196). */
    readonly segmentedInnerPadding: number;
    /** Radius of a segmented half (ART-TB:196). */
    readonly segmentedHalfRadius: number;
    /** The Views button. 36 desktop / 40 narrow (SPEC:3532). */
    readonly viewsButtonWidth: number;
    /** Divider slot width, item-tall, unchanged between profiles (SPEC:3526-3533). */
    readonly dividerSlotWidth: number;
    /** The rule drawn inside a divider slot: 1 wide (ART-MAIN:1009). */
    readonly dividerRuleWidth: number;
    /** The rule drawn inside a divider slot: 16 tall (ART-MAIN:1009). */
    readonly dividerRuleHeight: number;
    /** Zoom out, Zoom in, Zoom to fit, Zoom to selection: four items (SPEC:3504-3509). */
    readonly zoomItemCount: number;
    /** Gap between two zoom items, unchanged between profiles (SPEC:3526, SPEC:3533). */
    readonly zoomItemGap: number;
    /** Container padding, per side, unchanged between profiles (SPEC:3522). */
    readonly containerPadding: number;
    /** Container border, per side -- the `+ 2` of the derivation (SPEC:3526). */
    readonly borderWidth: number;
    /** Item radius (SPEC:3522; ART-MAIN:1011). */
    readonly itemRadius: number;
    /** Container radius, concentric with the item: padding + item radius (SPEC:3522-3523). */
    readonly containerRadius: number;
    /** Bar height. 36 desktop / 40 narrow (SPEC:3521, SPEC:3534). */
    readonly height: number;
    /** Number of divider slots in the bar: one after the segmented, one before Views. */
    readonly dividerCount: number;
}

/**
 * Canvas toolbar at >= 1280 px. Spec 01 section 4 (SPEC:3519-3528).
 *
 * Derivation the parts reproduce:
 * `3 + 60 + 12 + (28*4 + 2*3) + 12 + 36 + 3 + 2 borders`.
 */
export const CANVAS_TOOLBAR_DESKTOP: CanvasToolbarProfile = {
    id: "desktop",
    itemSize: 28,
    glyphSize: 14,
    segmentedWidth: 60,
    segmentedHalfWidth: 26,
    segmentedInnerPadding: 1,
    segmentedHalfRadius: 3,
    viewsButtonWidth: 36,
    dividerSlotWidth: 12,
    dividerRuleWidth: 1,
    dividerRuleHeight: 16,
    zoomItemCount: 4,
    zoomItemGap: 2,
    containerPadding: 3,
    borderWidth: 1,
    itemRadius: 4,
    containerRadius: 7,
    height: 36,
    dividerCount: 2,
};

/**
 * Canvas toolbar below 1280 px. Spec 01 section 4 (SPEC:3530-3534).
 *
 * Not invented here: 6.8 point 3 mandates the larger form (32 x 32 with a 16 px
 * glyph) for an icon that is the sole path to a capability.
 *
 * Derivation the parts reproduce:
 * `3 + 68 + 12 + (32*4 + 2*3) + 12 + 40 + 3 + 2 borders`.
 */
export const CANVAS_TOOLBAR_NARROW: CanvasToolbarProfile = {
    id: "narrow",
    itemSize: 32,
    glyphSize: 16,
    segmentedWidth: 68,
    segmentedHalfWidth: 30,
    segmentedInnerPadding: 1,
    segmentedHalfRadius: 3,
    viewsButtonWidth: 40,
    dividerSlotWidth: 12,
    dividerRuleWidth: 1,
    dividerRuleHeight: 16,
    zoomItemCount: 4,
    zoomItemGap: 2,
    containerPadding: 3,
    borderWidth: 1,
    itemRadius: 4,
    containerRadius: 7,
    height: 40,
    dividerCount: 2,
};

/**
 * Width of the four-item zoom group: `itemSize * 4 + gap * 3`.
 * @param profile - the size profile to measure.
 * @returns the zoom group's width in CSS pixels.
 */
export function canvasToolbarZoomGroupWidth(profile: CanvasToolbarProfile): number {
    return profile.itemSize * profile.zoomItemCount + profile.zoomItemGap * (profile.zoomItemCount - 1);
}

/**
 * Total canvas toolbar width, as the sum of its parts rather than a written total.
 * Order left to right, by how long the effect lasts (SPEC:3504-3509):
 * segmented, divider, zoom group, divider, Views -- inside padding and border.
 * @param profile - the size profile to measure.
 * @returns the bar's width in CSS pixels.
 */
export function canvasToolbarWidth(profile: CanvasToolbarProfile): number {
    return (
        profile.borderWidth * 2 +
        profile.containerPadding * 2 +
        profile.segmentedWidth +
        profile.dividerSlotWidth * profile.dividerCount +
        canvasToolbarZoomGroupWidth(profile) +
        profile.viewsButtonWidth
    );
}

/**
 * Canvas width below which the minimap and the legend rise onto a second line:
 * one baseline band and its clearance at each end, plus the bar between them.
 * Spec 01 section 5 (SPEC:3567-3569 desktop, SPEC:3569 narrow).
 * @param profile - the size profile in force on this canvas.
 * @returns the canvas width, in CSS pixels, at or below which the reflow fires.
 */
export function canvasToolbarReflowThreshold(profile: CanvasToolbarProfile): number {
    return (BASELINE_OVERLAY_BAND + OVERLAY_MIN_CLEARANCE) * 2 + canvasToolbarWidth(profile);
}

/**
 * Canvas toolbar width at >= 1280 px, derived from {@link CANVAS_TOOLBAR_DESKTOP}.
 */
export const CANVAS_TOOLBAR_DESKTOP_WIDTH = canvasToolbarWidth(CANVAS_TOOLBAR_DESKTOP);

/**
 * Canvas toolbar width below 1280 px, derived from {@link CANVAS_TOOLBAR_NARROW}.
 */
export const CANVAS_TOOLBAR_NARROW_WIDTH = canvasToolbarWidth(CANVAS_TOOLBAR_NARROW);

/**
 * Two-line reflow threshold with the desktop bar. Spec 01 section 5.
 */
export const REFLOW_THRESHOLD_DESKTOP = canvasToolbarReflowThreshold(CANVAS_TOOLBAR_DESKTOP);

/**
 * Two-line reflow threshold with the narrow bar. Spec 01 section 5.
 */
export const REFLOW_THRESHOLD_NARROW = canvasToolbarReflowThreshold(CANVAS_TOOLBAR_NARROW);

/**
 * Picks the canvas toolbar profile for a viewport width.
 * @param viewportWidth - the window's width in CSS pixels.
 * @returns the desktop profile at or above the narrow breakpoint, the narrow profile below it.
 */
export function canvasToolbarProfile(viewportWidth: number): CanvasToolbarProfile {
    return viewportWidth < NARROW_BREAKPOINT ? CANVAS_TOOLBAR_NARROW : CANVAS_TOOLBAR_DESKTOP;
}

/**
 * Whether the minimap and the legend have risen onto a second line.
 * @param canvasWidth - the live canvas rect's width in CSS pixels.
 * @param profile - the size profile in force on this canvas.
 * @returns true when the two-line rule has fired.
 */
export function hasOverlayReflowed(canvasWidth: number, profile: CanvasToolbarProfile): boolean {
    return canvasWidth < canvasToolbarReflowThreshold(profile);
}

/* -------------------------------------------------------------------------- */
/* Canvas toolbar bottom offsets (build spec 01 section 3)                     */
/* -------------------------------------------------------------------------- */

/**
 * Toolbar bottom offset with nothing else on: 12 above the canvas floor.
 * Spec 01 section 3 (SPEC:3552; ART-TB "Nothing else on 12").
 *
 * Declared as {@link OVERLAY_INSET} because the 12 the table quotes IS the shared
 * overlay inset, not a coincidence; see the alias note in this file's header.
 * @alias OVERLAY_INSET
 */
export const CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE = OVERLAY_INSET;

/**
 * Toolbar bottom offset with the time slider on: 12 above the 70 px slider.
 * Spec 01 section 3 (SPEC:3553).
 */
export const CANVAS_TOOLBAR_BOTTOM_OFFSET_TIME_SLIDER = OVERLAY_INSET + TIME_SLIDER_HEIGHT;

/**
 * Toolbar bottom offset with the data table drawer open at its default height:
 * 12 above the 260 px drawer. Spec 01 section 3 (SPEC:3554).
 */
export const CANVAS_TOOLBAR_BOTTOM_OFFSET_DRAWER = OVERLAY_INSET + DATA_DRAWER_DEFAULT_HEIGHT;

/**
 * Toolbar bottom offset with the drawer open at its default height and the slider
 * docked to the drawer's top edge. Spec 01 section 3 (SPEC:3555).
 */
export const CANVAS_TOOLBAR_BOTTOM_OFFSET_DRAWER_AND_SLIDER =
    OVERLAY_INSET + DATA_DRAWER_DEFAULT_HEIGHT + TIME_SLIDER_HEIGHT;

/**
 * The state the bottom of the canvas is in, for the toolbar's offset ladder.
 */
export interface CanvasBottomStackState {
    /** Whether the data table drawer is docked open. */
    readonly drawerOpen: boolean;
    /** The drawer's current height; it drags to resize and is remembered (6.5). */
    readonly drawerHeight: number;
    /** Whether the drawer has been maximised to the full canvas height. */
    readonly drawerMaximised: boolean;
    /** Whether the time slider overlay is on. */
    readonly timeSliderOn: boolean;
}

/**
 * The canvas toolbar's bottom offset: 12 above whichever of {canvas floor, slider,
 * drawer} is uppermost beneath it. Spec 01 section 3 (SPEC:3543-3548).
 *
 * When the drawer is maximised to the full canvas height the bar is not drawn at all:
 * the whole bar leaves with the minimap and the legend and returns on restore
 * (SPEC:3560-3565). That case returns `null` rather than an offset.
 * @param state - what the bottom of the canvas currently holds.
 * @returns the bottom offset in CSS pixels, or null when the bar is not drawn.
 */
export function canvasToolbarBottomOffset(state: CanvasBottomStackState): number | null {
    if (state.drawerMaximised) {
        return null;
    }

    const drawer = state.drawerOpen ? state.drawerHeight : 0;
    const slider = state.timeSliderOn ? TIME_SLIDER_HEIGHT : 0;

    return OVERLAY_INSET + drawer + slider;
}

/* -------------------------------------------------------------------------- */
/* Width clamps (build spec 01 section 1; SPEC:157-159, SPEC:3577-3579)        */
/* -------------------------------------------------------------------------- */

/**
 * Clamps a number into an inclusive range.
 * @param value - the requested value.
 * @param min - the lower bound.
 * @param max - the upper bound; when it is below `min`, `min` wins.
 * @returns the value moved into range.
 */
export function clampWidth(value: number, min: number, max: number): number {
    if (max < min) {
        return min;
    }

    return Math.min(Math.max(value, min), max);
}

/**
 * Whether a viewport is on the narrow side of the breakpoint.
 * @param viewportWidth - the window's width in CSS pixels.
 * @returns true below 1280 px.
 */
export function isNarrowViewport(viewportWidth: number): boolean {
    return viewportWidth < NARROW_BREAKPOINT;
}

/**
 * The widest the activity panel may be dragged before the live canvas would fall
 * below {@link CANVAS_MIN_WIDTH}.
 * @param shellWidth - the shell's full width in CSS pixels.
 * @param inspectorWidth - the inspector's width, or 0 when it is collapsed.
 * @returns the maximum activity panel width in CSS pixels.
 */
export function maxActivityPanelWidth(shellWidth: number, inspectorWidth: number): number {
    const available = shellWidth - ACTIVITY_RAIL_WIDTH - inspectorWidth - CANVAS_MIN_WIDTH;

    return clampWidth(available, ACTIVITY_PANEL_MIN_WIDTH, ACTIVITY_PANEL_MAX_WIDTH);
}

/**
 * The widest the inspector may be dragged before the live canvas would fall below
 * {@link CANVAS_MIN_WIDTH}.
 * @param shellWidth - the shell's full width in CSS pixels.
 * @param panelWidth - the activity panel's width, or 0 when no panel is open.
 * @returns the maximum inspector width in CSS pixels.
 */
export function maxInspectorWidth(shellWidth: number, panelWidth: number): number {
    const available = shellWidth - ACTIVITY_RAIL_WIDTH - panelWidth - CANVAS_MIN_WIDTH;

    return clampWidth(available, INSPECTOR_MIN_WIDTH, INSPECTOR_MAX_WIDTH);
}

/**
 * Clamps a requested activity panel width against the canvas minimum.
 *
 * Below the narrow breakpoint the panel is a 280 px overlay and the canvas is NOT
 * resized under it, so the clamp does not apply and the default width is returned
 * (spec 01 section 7 item 7, SPEC:425-426).
 * @param requested - the width the drag asked for.
 * @param shellWidth - the shell's full width in CSS pixels.
 * @param inspectorWidth - the inspector's width, or 0 when it is collapsed.
 * @returns the width the panel should actually take.
 */
export function clampActivityPanelWidth(requested: number, shellWidth: number, inspectorWidth: number): number {
    if (isNarrowViewport(shellWidth)) {
        return ACTIVITY_PANEL_WIDTH_DEFAULT;
    }

    return clampWidth(requested, ACTIVITY_PANEL_MIN_WIDTH, maxActivityPanelWidth(shellWidth, inspectorWidth));
}

/**
 * Clamps a requested inspector width against the canvas minimum. Below the narrow
 * breakpoint the inspector is a 280 px overlay and the clamp does not apply.
 * @param requested - the width the drag asked for.
 * @param shellWidth - the shell's full width in CSS pixels.
 * @param panelWidth - the activity panel's width, or 0 when no panel is open.
 * @returns the width the inspector should actually take.
 */
export function clampInspectorWidth(requested: number, shellWidth: number, panelWidth: number): number {
    if (isNarrowViewport(shellWidth)) {
        return INSPECTOR_WIDTH_DEFAULT;
    }

    return clampWidth(requested, INSPECTOR_MIN_WIDTH, maxInspectorWidth(shellWidth, panelWidth));
}

/**
 * The live canvas width left by the rail, an open panel and an open inspector.
 * Docks (the drawer, the Compare split) shorten the rect further; overlays do not.
 * Below the narrow breakpoint the panel and inspector are overlays and take nothing.
 * Spec 01 section 2 and section 7 item 7.
 * @param shellWidth - the shell's full width in CSS pixels.
 * @param panelWidth - the activity panel's width, or 0 when no panel is open.
 * @param inspectorWidth - the inspector's width, or 0 when it is collapsed.
 * @returns the live canvas rect width in CSS pixels.
 */
export function liveCanvasWidth(shellWidth: number, panelWidth: number, inspectorWidth: number): number {
    if (isNarrowViewport(shellWidth)) {
        return shellWidth - ACTIVITY_RAIL_WIDTH;
    }

    return shellWidth - ACTIVITY_RAIL_WIDTH - panelWidth - inspectorWidth;
}

/* -------------------------------------------------------------------------- */
/* Rail order and status bar slot order                                        */
/* -------------------------------------------------------------------------- */

/**
 * The six activities of the rail, top to bottom. Spec 02 section 1.2.
 */
export const PRIMARY_ACTIVITIES: readonly PrimaryActivityId[] = [
    "data",
    "explore",
    "analyze",
    "style",
    "present",
    "ai",
];

/**
 * The two items a `flex: 1 1 auto` spacer pushes to the bottom of the rail.
 * Settings is a full-panel overlay and Help is a menu -- neither is a 280 px panel.
 * Spec 02 section 1.3; spec 03 sections 2.7 and 2.8.
 */
export const PINNED_ACTIVITIES: readonly PinnedActivityId[] = ["settings", "help"];

/**
 * Every rail item in drawn order. Spec 02 sections 1.2 and 1.3.
 */
export const ACTIVITY_ORDER: readonly ActivityId[] = [...PRIMARY_ACTIVITIES, ...PINNED_ACTIVITIES];

/**
 * The activities disabled in the Empty state, each with the tooltip suffix
 * ". Load data first". Data, AI, Settings and Help stay enabled.
 * Spec 02 section 1.2; spec 04 section 5.1.
 */
export const ACTIVITIES_REQUIRING_DATA: readonly ActivityId[] = ["explore", "analyze", "style", "present"];

/**
 * Status bar slots, left to right. All boards agree on this order.
 * Spec 02 section 4.2.
 */
export const STATUS_BAR_SLOT_ORDER: readonly StatusBarSlotId[] = [
    "counts",
    "zoom",
    "xr",
    "layout",
    "running",
    "viewing",
    "issues",
    "ai",
    "selection",
];

/**
 * The order slots drop in when the status bar overflows, first to drop first. Only
 * the layout chip's NAME drops -- the chip and its caret remain. Counts, the running
 * slot with its Cancel, the issues chip and the Performance mode chip never drop; the
 * XR chip and the selection count appear in neither list. Spec 02 section 4.3.
 */
export const STATUS_BAR_DROP_ORDER: readonly StatusBarSlotId[] = ["ai", "layout", "zoom", "viewing"];

/**
 * Slots that never drop, whatever the overflow. Spec 02 section 4.3.
 */
export const STATUS_BAR_NEVER_DROP: readonly StatusBarSlotId[] = ["counts", "running", "issues"];

/* -------------------------------------------------------------------------- */
/* Miscellaneous shell facts                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Undo depth. One history store for the whole application; a new action clears the
 * redo stack. Spec 01 section 1 (SPEC:296); spec 02 section 3.3.
 */
export const UNDO_DEPTH = 50;

/**
 * Dwell, in milliseconds, before a tooltip or an info circle opens. Never suppressed
 * in Performance mode. Spec 04 sections 8.2 and 8.4.
 */
export const TOOLTIP_DELAY_MS = 150;

/**
 * The latch's verb, on the activity panel's title row and on the inspector's alike.
 *
 * One word lives here rather than one in each region, because 6.8 gives a verb exactly
 * one word and one drawing wherever it is drawn, and this one is drawn in two regions.
 * It is NOT the inspector's `Pin as A` (design 5.4), which freezes a copy of the
 * CONTENT as a comparison anchor: this holds the SURFACE on screen. Two objects, two
 * words, two drawings -- `keepOpen`, a padlock, and the register's pushpin.
 * Design 6.12 ("The latch"), added 2026-09-12 at the product owner's direction.
 */
export const KEEP_OPEN_LABEL = "Keep open";

/* -------------------------------------------------------------------------- */
/* The menu-affordance caret (spec 02 section 8; REGISTER-1.5 section 1.1)      */
/* -------------------------------------------------------------------------- */

/**
 * The menu-affordance caret is drawn at 8 px, and at no other size: spec 02 section 8
 * fixes the wrapper sizes as "16 for rail items, 12 for chevrons / X / the info
 * circle, and 8 for the menu-affordance caret. Never any other size." It is a
 * different register entry from the 12 px disclosure caret, with a different drawing;
 * `MenuCaret` holds that drawing.
 */
export const MENU_CARET_SIZE = 8;

/**
 * The menu-affordance caret carries `stroke-width="2"` (REGISTER-1.5 section 1.1),
 * because 1.5 in a 16 px viewBox drawn at 8 px resolves to three quarters of a pixel.
 */
export const MENU_CARET_STROKE = 2;
