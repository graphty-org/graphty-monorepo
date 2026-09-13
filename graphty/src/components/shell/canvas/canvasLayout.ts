/**
 * The canvas region's layout arithmetic and its drawn geometry.
 *
 * Two things live here and nothing else:
 *
 * 1. **Pure functions of state.** The bottom-stack offset ladder (build spec 01
 *    section 3), the two-line reflow (section 5), and the drawer / slider / legend
 *    rules that hang off them. They are pure so `__tests__/canvasLayout.test.ts` can
 *    walk every row of the ladder table, and the components below simply read what
 *    they return.
 * 2. **Drawn geometry the shared modules do not name.** `shell/constants.ts` owns the
 *    region sizes and `PANEL_GRID` / `COMPACT_SIZING` own the panel grid; neither
 *    names a legend swatch or an insight card. Every number below carries the source
 *    it is read from, exactly as `compact-mantine` names its own un-tokenised values.
 *    A bare number in a canvas component is a bug; it belongs here with its citation.
 *
 * Authority split (design/ui/mockups/system/CONTRAST-DIVERGENCE.md section 5): this
 * module owns WHERE and HOW BIG, never WHAT COLOUR. There is no colour in this file.
 *
 * Citations: "SPEC" is design/ui/app-shell-progressive-disclosure-design.md,
 * "ART-MAIN" is design/ui/mockups/artboards/Main.dc.html, "ART-DTD" is
 * DataTableDrawer.dc.html, "ART-TS" is TimeSlider.dc.html, "ART-LG" is
 * ExplorerLargeGraph.dc.html, "ART-WEL" is Welcome.dc.html. Section numbers name
 * tmp/shell-spec/01-frame-canvas-toolbar.md unless another spec is named.
 */

import { type CanvasBottomStackState, canvasToolbarBottomOffset, type CanvasToolbarProfile, hasOverlayReflowed, LEGEND_MAX_HEIGHT, LEGEND_MIN_HEIGHT, OVERLAY_INSET, OVERLAY_REFLOW_RISE } from "../constants";

/* -------------------------------------------------------------------------- */
/* Drawn geometry the shared modules do not name                              */
/* -------------------------------------------------------------------------- */

/**
 * The type sizes the canvas overlays draw at, from the type ramp of build spec 04
 * section 3.2. The compact theme's font scale has no 12 px and no 20 px step, so the
 * canvas names its own here rather than writing a literal into a component -- the
 * same move `compact-mantine`'s own `ProseBlock` makes for its 12 px reading.
 */
export const CANVAS_TYPE = {
    /** pill and segmented-control text (spec 04 section 3.2). */
    PILL: 10,
    /** status bar, tooltip, technical name, legend line (spec 04 section 3.2). */
    SMALL: 11,
    /** body text, list row, card title (spec 04 section 3.2). */
    BODY: 12,
    /** the time slider's Viewing readout, 13 / 500 (ART-TS:1374). */
    READOUT: 13,
    /** the Welcome heading, 20 / 600 (spec 04 section 3.2; ART-WEL:310). */
    HEADING: 20,
} as const;

/**
 * The line heights the canvas overlays draw at (build spec 04 section 3.2).
 */
export const CANVAS_LEADING = {
    /** a single line of a control or a legend row. */
    TIGHT: 1.2,
    /** a card body or a departure line. */
    DENSE: 1.4,
    /** the Welcome sub-heading, read as a sentence. */
    PROSE: 1.5,
    /** the Welcome heading. */
    HEADING: 1.25,
} as const;

/**
 * The spacing steps the canvas overlays use, from the 4 px scale of build spec 04
 * section 3.4 ("Values in use: 1, 2, 4, 6, 8, 10, 12, 16"). Always applied as a flex
 * or grid `gap`, never as a sibling margin.
 */
export const CANVAS_SPACE = {
    /** a hairline rule or a 1 px border. */
    HAIRLINE: 1,
    /** the tightest gap the scale admits: legend category rows, toolbar items. */
    TIGHT: 2,
    /** tight gaps and the gap between controls in a group. */
    XS: 4,
    /** the gap between a swatch and its label. */
    SM: 6,
    /** the gap between controls, and the overlay box's horizontal padding. */
    MD: 8,
    /** the canvas overlay inset, and the gap between two overlay rows. */
    LG: 12,
    /** the Welcome block's inner rhythm. */
    XL: 16,
    /** the Welcome drop zone's horizontal padding. */
    XXL: 24,
} as const;

/**
 * Every box the canvas draws that neither `shell/constants.ts` nor `PANEL_GRID`
 * names, with the artboard each is read from.
 */
export const CANVAS_METRICS = {
    /** legend and minimap box padding, top and bottom (ART-MAIN:794 `padding: 6px 8px`). */
    OVERLAY_PAD_Y: 6,
    /** legend and minimap box padding, left and right (ART-MAIN:794). */
    OVERLAY_PAD_X: 8,
    /** one node in the minimap's scaled drawing (ART-MAIN minimap svg `r="1.5"`). */
    MINIMAP_NODE_RADIUS: 1.5,
    /** every glyph in the register is stroked at this weight (spec 04 section 1.5). */
    GLYPH_STROKE: 1.5,
    /** the viewBox every register glyph is drawn in, square (spec 04 section 1.5). */
    GLYPH_VIEWBOX: 16,
    /** a legend category row's swatch, a 10 px circle (ART-LG legend block). */
    LEGEND_SWATCH: 10,
    /** a legend category row (ART-LG `height: 14px`). */
    LEGEND_CATEGORY_ROW: 14,
    /** a legend quantitative stop row (ART-MAIN `height: 16px`). */
    LEGEND_STOP_ROW: 16,
    /** a legend quantitative stop's swatch box (ART-MAIN `width="16"`). */
    LEGEND_STOP_SWATCH: 16,
    /**
     * The most category rows the CANVAS legend draws, before the Other row. Five
     * largest by member count plus one Other (SPEC:208-213; section 9).
     */
    LEGEND_MAX_CATEGORY_ROWS: 5,
    /** a filter or insights chip (spec 04 section 3.3 "chip (filter / insights)"). */
    CHIP_HEIGHT: 20,
    /** a chip's horizontal padding (spec 04 section 3.3). */
    CHIP_PAD_X: 8,
    /** a `Coming` pill and a small state mark (spec 03 section 1.5; ART-DTD:667). */
    PILL_HEIGHT: 16,
    /** a pill's horizontal padding (spec 03 section 1.5). */
    PILL_PAD_X: 6,
    /** the Graph / Table segmented track (ART-DTD:472 `height: 24px`). */
    SEGMENT_TRACK: 24,
    /** one half of that track (ART-DTD:473 `height: 20px`). */
    SEGMENT_ITEM: 20,
    /** a segmented half's horizontal padding (ART-DTD:473 `padding: 0 10px`). */
    SEGMENT_ITEM_PAD_X: 10,
    /** the segmented track's inner padding (ART-DTD:472 `padding: 1px`). */
    SEGMENT_PAD: 1,
    /** the drawer's tab row and its toolbar row (ART-DTD:664 `flex: 0 0 28px`). */
    DRAWER_ROW: 28,
    /** the drawer's own drag strip, sitting on its top border. */
    DRAWER_HANDLE: 4,
    /** one insight card (ART-MAIN:716 `width: 160px`). */
    INSIGHT_CARD_WIDTH: 160,
    /** an insight card's vertical padding (ART-MAIN:716 `padding: 8px 10px`). */
    INSIGHT_CARD_PAD_Y: 8,
    /** an insight card's horizontal padding (ART-MAIN:716). */
    INSIGHT_CARD_PAD_X: 10,
    /** the Welcome block (ART-WEL:306 `width: 600px; max-width: 600px`). */
    WELCOME_WIDTH: 600,
    /** the Welcome drop zone's drawing (ART-WEL:317 `width="72" height="48"`). */
    WELCOME_ART_WIDTH: 72,
    /** the Welcome drop zone's drawing (ART-WEL:317). */
    WELCOME_ART_HEIGHT: 48,
    /** the time slider's track drawing (ART-TS:1384 `height="36"`). */
    TIME_TRACK_HEIGHT: 36,
    /** the time slider's own padding (ART-TS:1360 `padding: 6px 12px 1px`). */
    TIME_PAD_TOP: 6,
    /** the 1 x 16 rule that separates two clusters of one overlay row (ART-TS:1373). */
    RULE_HEIGHT: 16,
    /** a radius large enough that any bar of these heights reads as fully round. */
    FULLY_ROUND: 9999,
} as const;

/**
 * The minimum height a data table drawer may be dragged to: its two chrome rows (the
 * tab row and the toolbar row) plus two data rows' worth of table. DERIVED, not
 * quoted -- the sources give the default (260) and say it drags to resize, but name
 * no floor, and a drawer shorter than its own chrome is not a drawer.
 */
export const DATA_DRAWER_MIN_HEIGHT = CANVAS_METRICS.DRAWER_ROW * 4;

/**
 * The transition the minimap and the legend rise with when the two-line rule fires,
 * in milliseconds. Section 5 says they "use the panel's own transition" and names no
 * duration anywhere; 150 ms is the one dwell the design system does name (spec 04
 * section 8.2), so the rise matches the tooltip rather than inventing a second speed.
 */
export const OVERLAY_REFLOW_TRANSITION_MS = 150;

/**
 * The data table drawer and the time slider stack BELOW the three baseline overlays,
 * so the legend and the minimap always paint over a dock (ART-DTD:563 and :654 draw
 * both docks at `z-index: 5`, with the compact legend and the Graph / Table control at
 * the toolbar's own 6). The canvas toolbar's 6, a pop-out's 8 and a menu's 15 are in
 * `shell/constants.ts`.
 */
export const CANVAS_DOCK_Z_INDEX = 5;

/**
 * The legend's block order, top to bottom, with a 1 px rule between blocks. A channel
 * with no encoding renders no block at all (section 9; ART-MAIN:761-764).
 */
export const LEGEND_BLOCK_ORDER = ["color", "size", "outline", "edgeWidth", "arrow"] as const;

/**
 * One of the five channels the canvas legend can key.
 */
export type LegendChannelId = (typeof LEGEND_BLOCK_ORDER)[number];

/* -------------------------------------------------------------------------- */
/* The bottom stack (build spec 01 sections 2, 3 and 5)                        */
/* -------------------------------------------------------------------------- */

/**
 * The offset the minimap and the legend sit at: the toolbar's own baseline, raised by
 * 48 when the two-line rule has fired. The bottom band then belongs to the toolbar
 * alone, and neither box is ever hidden by the reflow (section 5).
 *
 * Null when the drawer is maximised to the full canvas height: the whole baseline
 * leaves with it and returns on restore (section 3; ART-DTD Graph / Table note).
 * @param state - what the bottom of the canvas currently holds.
 * @param reflowed - whether the two-line rule has fired at this canvas width.
 * @returns the bottom offset in CSS pixels, or null when the baseline is not drawn.
 */
export function overlayBaselineOffset(state: CanvasBottomStackState, reflowed: boolean): number | null {
    const baseline = canvasToolbarBottomOffset(state);

    if (baseline === null) {
        return null;
    }

    return reflowed ? baseline + OVERLAY_REFLOW_RISE : baseline;
}

/**
 * Where the time slider's bottom edge sits. The slider is an OVERLAY -- it never
 * shortens the canvas -- and it docks to the top edge of the data table drawer when
 * both are open (section 2; SPEC:182-183).
 *
 * A drawer maximised to the full canvas height leaves no edge to dock to, so the
 * slider goes with the rest of the bottom stack and returns on restore.
 * @param state - what the bottom of the canvas currently holds.
 * @returns the slider's bottom offset in CSS pixels, or null when it is not drawn.
 */
export function timeSliderBottomOffset(state: CanvasBottomStackState): number | null {
    if (!state.timeSliderOn || state.drawerMaximised) {
        return null;
    }

    return state.drawerOpen ? state.drawerHeight : 0;
}

/**
 * How much of the canvas the docks take. Docks shorten the live canvas rect; overlays
 * never do (section 2), so this is what the graph host gives up and what the overlay
 * offsets are measured OVER rather than inside.
 * @param state - what the bottom of the canvas currently holds.
 * @param canvasHeight - the canvas element's height in CSS pixels.
 * @returns the height the drawer occupies, 0 when it is closed.
 */
export function dockedHeight(state: CanvasBottomStackState, canvasHeight: number): number {
    if (!state.drawerOpen) {
        return 0;
    }

    if (state.drawerMaximised) {
        return canvasHeight;
    }

    // A height of 0 is a canvas that has not been measured yet, not a canvas with no
    // room in it: clamping against it would close the drawer on the first frame.
    if (canvasHeight <= 0) {
        return state.drawerHeight;
    }

    return Math.min(state.drawerHeight, canvasHeight);
}

/**
 * Whether the minimap is drawn. It HIDES while the data table drawer is open -- the
 * legend compacts instead, because an encoded channel always needs its line
 * (section 2; SPEC:171-181) -- and the two-line reflow never hides it.
 * @param visible - the Views menu's remembered Minimap state (6.5).
 * @param state - what the bottom of the canvas currently holds.
 * @returns true when the minimap should render.
 */
export function isMinimapDrawn(visible: boolean, state: CanvasBottomStackState): boolean {
    return visible && !state.drawerOpen;
}

/**
 * Whether the legend takes its compact form: the reading legend with the swatch rows
 * and the ramps subtracted and the header lines kept, at the same 256 width and the
 * same right edge, with no min-height and no scroll (section 2; SPEC:171-181).
 * @param state - what the bottom of the canvas currently holds.
 * @returns true while the drawer is open and has not been maximised.
 */
export function isLegendCompact(state: CanvasBottomStackState): boolean {
    return state.drawerOpen && !state.drawerMaximised;
}

/**
 * Whether the legend is drawn at all. With nothing encoded it does not render
 * (section 9); with the drawer maximised there is no canvas left for it to describe,
 * so it leaves with the minimap and the toolbar (section 3).
 * @param visible - the Views menu's remembered Legend state (6.5).
 * @param encodedChannelCount - how many channels currently carry an encoding.
 * @param state - what the bottom of the canvas currently holds.
 * @returns true when the legend should render.
 */
export function isLegendDrawn(
    visible: boolean,
    encodedChannelCount: number,
    state: CanvasBottomStackState,
): boolean {
    return visible && encodedChannelCount > 0 && !state.drawerMaximised;
}

/**
 * The legend's height cap, measured from its RAISED bottom (section 5). Never below
 * the 80 px minimum and never above the 240 px cap, and never taller than the canvas
 * left above its own bottom edge less one overlay inset of clear space at the top.
 * @param canvasHeight - the canvas element's height in CSS pixels.
 * @param bottomOffset - the legend's bottom offset, from {@link overlayBaselineOffset}.
 * @returns the legend's maximum height in CSS pixels.
 */
export function legendMaxHeight(canvasHeight: number, bottomOffset: number): number {
    const available = canvasHeight - bottomOffset - OVERLAY_INSET;

    return Math.max(LEGEND_MIN_HEIGHT, Math.min(LEGEND_MAX_HEIGHT, available));
}

/**
 * Clamps a dragged data table drawer height: never below its own chrome, never taller
 * than the canvas it docks into.
 * @param requested - the height the drag asked for.
 * @param canvasHeight - the canvas element's height in CSS pixels.
 * @returns the height the drawer should actually take.
 */
export function clampDataDrawerHeight(requested: number, canvasHeight: number): number {
    const floored = Math.max(requested, DATA_DRAWER_MIN_HEIGHT);

    // A height of 0 is a canvas that has not been measured yet: there is no ceiling to
    // clamp against, and clamping anyway would shrink the drawer on the first frame.
    if (canvasHeight <= 0) {
        return floored;
    }

    return Math.min(floored, Math.max(DATA_DRAWER_MIN_HEIGHT, canvasHeight));
}

/* -------------------------------------------------------------------------- */
/* Minimap arithmetic (build spec 01 section 1; SPEC:163-168)                  */
/* -------------------------------------------------------------------------- */

/**
 * One heatmap cell's opacity, log-scaled. Above 10,000 nodes the minimap is a
 * node-density heatmap on a 64 x 32 grid, log-scaled, and a linear scale would paint
 * every cell but the densest as empty.
 * @param count - how many nodes fall in this cell.
 * @param maxCount - the densest cell's count.
 * @returns an opacity between 0 and 1.
 */
export function heatmapCellOpacity(count: number, maxCount: number): number {
    if (count <= 0 || maxCount <= 0) {
        return 0;
    }

    return Math.min(1, Math.log1p(count) / Math.log1p(maxCount));
}

/**
 * A drawing area in client coordinates -- the part of a DOM rect
 * {@link pointerFractionWithin} reads.
 * @public
 */
export interface PointerBox {
    /** The box's left edge in client coordinates. */
    readonly left: number;
    /** The box's top edge in client coordinates. */
    readonly top: number;
    /** The box's width in CSS pixels. */
    readonly width: number;
    /** The box's height in CSS pixels. */
    readonly height: number;
}

/**
 * A point inside a box, as a fraction of its width and height.
 *
 * {@link pointerFractionWithin}'s return.
 * @public
 */
export interface BoxFraction {
    /** The horizontal fraction, 0 at the left edge and 1 at the right. */
    readonly x: number;
    /** The vertical fraction, 0 at the top edge and 1 at the bottom. */
    readonly y: number;
}

/**
 * Where a pointer landed inside a box, as a fraction of its width and height. The
 * minimap centres the view on the point that is clicked and scrubs it on a drag, and
 * both need the click in the graph's own coordinates rather than the window's.
 * @param box - the minimap's drawing area, as a DOM rect.
 * @param clientX - the pointer's x in client coordinates.
 * @param clientY - the pointer's y in client coordinates.
 * @returns the point as a pair of fractions, each clamped to 0..1.
 */
export function pointerFractionWithin(box: PointerBox, clientX: number, clientY: number): BoxFraction {
    const x = box.width === 0 ? 0 : (clientX - box.left) / box.width;
    const y = box.height === 0 ? 0 : (clientY - box.top) / box.height;

    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

/**
 * Everything the bottom stack decides, as one value.
 *
 * {@link canvasBottomStack}'s one parameter.
 * @public
 */
export interface CanvasBottomStackInput {
    /** The drawer and the slider, as {@link canvasToolbarBottomOffset} reads them. */
    readonly stack: CanvasBottomStackState;
    /** The live canvas rect's width in CSS pixels. */
    readonly canvasWidth: number;
    /** The canvas element's height in CSS pixels. */
    readonly canvasHeight: number;
    /** The canvas toolbar size profile in force, which sets the reflow threshold. */
    readonly profile: CanvasToolbarProfile;
    /** The Views menu's remembered Minimap state. */
    readonly minimapVisible: boolean;
    /** The Views menu's remembered Legend state. */
    readonly legendVisible: boolean;
    /** How many channels currently carry an encoding. */
    readonly encodedChannelCount: number;
    /**
     * Whether the data table drawer OVERLAYS the canvas rather than docking into it.
     * Below 1280 px it does: spec 01 section 7 item 3 says "the Data table drawer
     * overlays from the bottom", and item 7 says the canvas is not resized under a
     * narrow overlay. It still stacks under the toolbar, the minimap and the legend --
     * it is drawn at the same height either way -- it simply takes no canvas away.
     * @default false
     */
    readonly drawerOverlaysCanvas?: boolean;
}

/**
 * What the bottom stack draws and where.
 */
export interface CanvasBottomStackLayout {
    /** Whether the two-line rule has fired at this canvas width. */
    readonly reflowed: boolean;
    /** The canvas toolbar's bottom offset; null when the bar is not drawn. */
    readonly toolbarBottom: number | null;
    /** The minimap's and the legend's shared bottom offset; null when not drawn. */
    readonly overlayBottom: number | null;
    /** The time slider's bottom offset; null when the slider is not drawn. */
    readonly timeSliderBottom: number | null;
    /** How much of the canvas the docks take from the graph host. */
    readonly dockedHeight: number;
    /** Whether the minimap renders. */
    readonly minimapDrawn: boolean;
    /** Whether the legend renders. */
    readonly legendDrawn: boolean;
    /** Whether the legend renders in its compact form. */
    readonly legendCompact: boolean;
    /** The legend's height cap, measured from its raised bottom. */
    readonly legendMaxHeight: number;
}

/**
 * The whole bottom stack as one pure function of state, so the components below never
 * decide an offset themselves and the ladder table of section 3 can be walked in one
 * test. Bottom to top the stack is: canvas rect, data table drawer (a dock, 260 by
 * default), time slider (an overlay, 70), canvas toolbar (an overlay, 36), with the
 * minimap and the legend riding the toolbar's own baseline.
 * @param input - the canvas rect, the docks, the profile and the Views menu state.
 * @returns every offset and every visibility decision the stack makes.
 */
export function canvasBottomStack(input: CanvasBottomStackInput): CanvasBottomStackLayout {
    const {
        canvasHeight,
        canvasWidth,
        drawerOverlaysCanvas = false,
        encodedChannelCount,
        legendVisible,
        minimapVisible,
        profile,
        stack,
    } = input;

    // Every rung of the ladder is measured against the height the drawer ACTUALLY
    // draws, which is what `DataTableDrawer` clamps it to. A remembered height is a
    // number from another window -- drag the drawer to 700 on a tall screen and reopen
    // on a short one -- and feeding the raw value to the ladder would put the toolbar,
    // the minimap and the legend above the top of a shorter canvas, where the canvas's
    // own `overflow: hidden` clips them away. Spec 01 section 3 leaves the bar off the
    // screen in exactly one state, the maximised drawer, and this is not it.
    const clamped: CanvasBottomStackState = {
        ...stack,
        drawerHeight: clampDataDrawerHeight(stack.drawerHeight, canvasHeight),
    };

    // Before the first measurement the rect is 0 wide, which is not a narrow canvas.
    const reflowed = canvasWidth > 0 && hasOverlayReflowed(canvasWidth, profile);
    const overlayBottom = overlayBaselineOffset(clamped, reflowed);

    return {
        reflowed,
        toolbarBottom: canvasToolbarBottomOffset(clamped),
        overlayBottom,
        timeSliderBottom: timeSliderBottomOffset(clamped),
        dockedHeight: drawerOverlaysCanvas ? 0 : dockedHeight(clamped, canvasHeight),
        minimapDrawn: isMinimapDrawn(minimapVisible, clamped),
        legendDrawn: isLegendDrawn(legendVisible, encodedChannelCount, clamped),
        legendCompact: isLegendCompact(clamped),
        legendMaxHeight: legendMaxHeight(canvasHeight, overlayBottom ?? OVERLAY_INSET),
    };
}
