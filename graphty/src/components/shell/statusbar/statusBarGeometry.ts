/**
 * Status bar geometry: every pixel the status bar draws itself with.
 *
 * Authority split (design/ui/mockups/system/CONTRAST-DIVERGENCE.md section 5): this
 * module owns WHERE a thing goes and HOW BIG it is and owns no colour at all. Colour
 * comes from `PANEL_INK`, the Mantine theme and CSS variables.
 *
 * The shell foundation (`../constants.ts`) names the bar's height and nothing else
 * about it, and `PANEL_GRID` / `COMPACT_SIZING` are the 280 px panel's grid rather
 * than a 24 px bar's. The rest of the bar's numbers are therefore named here, each
 * one cited to build spec 02 section 4.1 ("Geometry") or to the artboard that draws
 * it, so that no component writes a bare number.
 */

import { COMPACT_SIZING, PANEL_GRID } from "@graphty/compact-mantine";

import { STATUS_BAR_HEIGHT } from "../constants";

/** The chip atom's height, and so the drawn box of the caret half inside it. */
const CHIP_HEIGHT = 16;

/** Half the difference between the caret's 24 px hit area and its 16 px drawn box. */
const CARET_HIT_INSET = 4;

/**
 * The bar's own measurements, spec 02 section 4.1 unless another source is named.
 */
export const STATUS_BAR_GEOMETRY = {
    /** 24 px tall, full shell width, below the main row so it crosses under the rail. */
    HEIGHT: STATUS_BAR_HEIGHT,
    /** `padding: 0 12px`. */
    PADDING_X: 12,
    /** 12 px between two slots. */
    SLOT_GAP: 12,
    /** 8 px inside a slot: the two count spans, the issue chips, the running row. */
    GROUP_GAP: 8,
    /** 6 px between the AI slot's status dot and its span. */
    AI_GAP: 6,
    /** 4 px between a chip's leading mark, its label and its caret. */
    CHIP_GAP: 4,
    /** 11 px type, the bar's own size. */
    FONT_SIZE: COMPACT_SIZING.FONT_SIZE,
    /** line-height 1.2 on the bar's 11 px type. */
    LINE_HEIGHT: 1.2,
    /** the 1 px top border, drawn in the shell divider ink. */
    BORDER: 1,
    /** a 1 px x 12 px rule, between counts and zoom and between zoom and the layout slot. */
    DIVIDER_WIDTH: 1,
    /** the drawn height of that rule. */
    DIVIDER_HEIGHT: 12,
    /** the chip atom: 16 px tall. */
    CHIP_HEIGHT,
    /** the chip atom: `padding: 0 6px`. */
    CHIP_PADDING_X: 6,
    /** the chip atom carrying a caret: `padding: 0 4px 0 6px`. */
    CHIP_PADDING_RIGHT_CARET: 4,
    /** the chip atom: `border-radius: 8px`. */
    CHIP_RADIUS: 8,
    /** the chip atom: 10 px type. */
    CHIP_FONT_SIZE: 10,
    /** the chip atom: weight 500. */
    CHIP_FONT_WEIGHT: 500,
    /** the chip atom: line-height 1. */
    CHIP_LINE_HEIGHT: 1,
    /** the menu-affordance caret, fixed by REGISTER 1.5 at 8 px (spec 02 section 4.2 slot 4). */
    CARET: 8,
    /** the caret half's drawn box: the chip's own height, so the chip does not grow. */
    CARET_BOX: CHIP_HEIGHT,
    /**
     * the caret half's hit area.
     *
     * Spec 04 section 8.2 asks 24 x 24 of any icon-only control, and the chip it sits
     * in is 16 tall inside a 24 tall bar, so the hit area is won the way the info
     * circle wins its own (section 8.4): padding out to 24 and an equal negative
     * margin back, so no row grows.
     */
    CARET_HIT: CHIP_HEIGHT + CARET_HIT_INSET * 2,
    /** half the difference between the caret's hit area and its drawn box. */
    CARET_HIT_INSET,
    /** the validation chip's leading warning dot, 6 x 6 (spec 02 section 4.2 slot 7a). */
    WARNING_DOT: 6,
    /** the notes chip's leading accent dot, 8 x 8 (spec 02 section 4.2 slot 7b). */
    NOTE_DOT: 8,
    /** the AI slot's status dot, 6 x 6 (spec 02 section 4.2 slot 8). */
    AI_DOT: 6,
    /** the Performance mode chip's leading bolt, 10 px in warning ink (spec 02 section 4.2 slot 7c). */
    BOLT: 10,
    /**
     * the indeterminate spinner.
     *
     * The sources draw no spinner, so it takes the size of the bar's other inline
     * mark, the 10 px performance bolt, which is the largest drawing that fits the
     * 16 px chip rhythm without lifting the 24 px bar.
     */
    SPINNER: 10,
    /** the loading phase's progress bar, 120 x 4 (ExplorerLoading.dc.html). */
    PROGRESS_WIDTH: 120,
    /** the drawn height of that bar. */
    PROGRESS_HEIGHT: 4,
    /** its radius, half its height. */
    PROGRESS_RADIUS: 2,
    /** the register chevron size, used by the layout menu's check column. */
    CHECK: PANEL_GRID.CHEVRON,
    /**
     * the completion toast's width cap: the middle rung of the 280 / 360 / 480 ladder,
     * the rung the History pop-out takes for a surface that is read once.
     */
    TOAST_MAX_WIDTH: 360,
    /** the gap between the completion toast and the bar it hangs above. */
    TOAST_GAP: COMPACT_SIZING.CONTROL_PADDING,
    /** the completion toast's padding. */
    TOAST_PADDING: COMPACT_SIZING.CONTROL_PADDING,
    /**
     * how long the completion toast stays.
     *
     * Spec 02 section 6 says "a few seconds" and measures none, so the toast takes the
     * longest of the shell's own few-second spans: three times the two seconds the
     * Details highlight lasts.
     */
    TOAST_DURATION_MS: 6000,
} as const;
