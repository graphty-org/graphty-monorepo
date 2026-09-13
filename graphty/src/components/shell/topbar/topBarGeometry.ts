/**
 * Top bar geometry: every pixel the top bar region lays itself out with.
 *
 * Authority split (design/ui/mockups/system/CONTRAST-DIVERGENCE.md section 5): this
 * module owns WHERE a thing goes and HOW BIG it is, and owns no colour at all --
 * colour comes from `@graphty/compact-mantine` (PANEL_INK, the Mantine theme, CSS
 * variables) and never from an artboard hex.
 *
 * Every number is derived from `PANEL_GRID`, from `COMPACT_SIZING`, or from the
 * shell's own `constants.ts` wherever a named member genuinely means the same thing.
 * The rest are quoted from build spec 02 (tmp/shell-spec/02-bars-and-rail.md)
 * sections 2.1 to 2.5 and from `design/ui/mockups/artboards/Main.dc.html` and
 * `HistoryPopover.dc.html`, each with its citation, so no component ever writes a
 * bare number.
 */

import { COMPACT_SIZING, PANEL_GRID } from "@graphty/compact-mantine";

import { STATUS_BAR_HEIGHT, TOP_BAR_HEIGHT } from "../constants";

/* -------------------------------------------------------------------------- */
/* The bar (spec 02 section 2.1)                                               */
/* -------------------------------------------------------------------------- */

/** Horizontal padding of the bar: `padding: 0 12px`. Spec 02 section 2.1. */
export const TOP_BAR_PADDING_X = 12;

/** Gap between the three slot groups. Spec 02 section 2.1. */
export const TOP_BAR_GROUP_GAP = 8;

/** Gap between the controls of the right group. Spec 02 section 2.1. */
export const TOP_BAR_RIGHT_GROUP_GAP = 4;

/** Gap between the controls of the centre group. Spec 02 section 2.1 (ART-MAIN:241). */
export const TOP_BAR_CENTRE_GROUP_GAP = 8;

/** The bar's bottom border, one shell divider. Spec 02 section 2.1. */
export const TOP_BAR_BORDER_WIDTH = 1;

/** A 24 x 24 icon button, the top bar's one button box. Spec 02 section 2.1. */
export const TOP_BAR_ICON_BUTTON = PANEL_GRID.CONTROL_HEIGHT;

/** Icon button radius, `border-radius: 4px`. Spec 02 section 2.1. */
export const TOP_BAR_ICON_RADIUS = 4;

/**
 * The glyph a 24 x 24 top bar icon button draws, at 16 px. Spec 02 section 2.1
 * ("16 px glyph") and the drawn `<svg width="16" height="16">` of ART-MAIN:244.
 */
export const TOP_BAR_GLYPH_SIZE = PANEL_GRID.GLYPH_SLOT;

/**
 * The glyph a text trigger draws beside its word, at 14 px -- the register's default
 * wrapper size (spec 02 section 8).
 */
export const TOP_BAR_SMALL_GLYPH_SIZE = PANEL_GRID.GLYPH;

/** Stroke width of every register glyph. Spec 02 section 8. */
export const TOP_BAR_GLYPH_STROKE = 1.5;

/* -------------------------------------------------------------------------- */
/* Undo split button (spec 02 section 2.3a)                                    */
/* -------------------------------------------------------------------------- */

/** The split button's overall height: one 24 px group. Spec 02 section 2.3. */
export const SPLIT_BUTTON_HEIGHT = PANEL_GRID.CONTROL_HEIGHT;

/** The main (undo) half: 24 x 24, radius `4px 0 0 4px`. Spec 02 section 2.3. */
export const SPLIT_MAIN_WIDTH = PANEL_GRID.CONTROL_HEIGHT;

/** The caret (History) half: 16 x 24, radius `0 4px 4px 0`. Spec 02 section 2.3. */
export const SPLIT_CARET_WIDTH = PANEL_GRID.GLYPH_SLOT;

/** The caret half's glyph, drawn at 12 px. Spec 02 section 2.3. */
export const SPLIT_CARET_GLYPH_SIZE = PANEL_GRID.CHEVRON;

/** The 1 px x 16 px rule between the two halves. Spec 02 section 2.3. */
export const SPLIT_DIVIDER_WIDTH = 1;

/** The 1 px x 16 px rule between the two halves. Spec 02 section 2.3. */
export const SPLIT_DIVIDER_HEIGHT = PANEL_GRID.GLYPH_SLOT;

/**
 * Dwell, in milliseconds, before a press on the Undo main half counts as a
 * long-press and opens History.
 *
 * DERIVED, not quoted: spec 02 section 2.5 names long-press as one of History's three
 * routes but gives no duration, and 500 ms is the platform convention every touch
 * context-menu gesture uses.
 */
export const LONG_PRESS_MS = 500;

/* -------------------------------------------------------------------------- */
/* Command palette trigger pill (spec 02 section 2.3c)                         */
/* -------------------------------------------------------------------------- */

/** The pill is 300 x 24. Spec 02 section 2.3. */
export const PALETTE_PILL_WIDTH = 300;

/** The pill is 300 x 24. Spec 02 section 2.3. */
export const PALETTE_PILL_HEIGHT = PANEL_GRID.CONTROL_HEIGHT;

/** Pill radius, `border-radius: 4px`. Spec 02 section 2.3. */
export const PALETTE_PILL_RADIUS = 4;

/** Pill padding, `0 6px 0 8px`. Spec 02 section 2.3. */
export const PALETTE_PILL_PADDING_LEFT = 8;

/** Pill padding, `0 6px 0 8px`. Spec 02 section 2.3. */
export const PALETTE_PILL_PADDING_RIGHT = 6;

/** Gap between the pill's glyph, text and chip. Spec 02 section 2.3. */
export const PALETTE_PILL_GAP = 6;

/** The pill's leading search glyph, at 14 px. Spec 02 section 2.3. */
export const PALETTE_PILL_GLYPH_SIZE = PANEL_GRID.GLYPH;

/* -------------------------------------------------------------------------- */
/* Key chip (spec 02 section 2.3c; spec 04 section 10.3)                       */
/* -------------------------------------------------------------------------- */

/** The trailing key chip: 16 px tall. Spec 02 section 2.3. */
export const KEY_CHIP_HEIGHT = PANEL_GRID.GLYPH_SLOT;

/** The trailing key chip: `padding: 0 4px`. Spec 02 section 2.3. */
export const KEY_CHIP_PADDING_X = 4;

/** The trailing key chip: `border-radius: 3px`. Spec 02 section 2.3. */
export const KEY_CHIP_RADIUS = 3;

/** The trailing key chip: a 1 px border. Spec 02 section 2.3. */
export const KEY_CHIP_BORDER_WIDTH = 1;

/** The trailing key chip: mono 11 px. Spec 02 section 2.3; spec 04 section 3.2. */
export const KEY_CHIP_FONT_SIZE = COMPACT_SIZING.FONT_SIZE;

/* -------------------------------------------------------------------------- */
/* Type (spec 04 section 3.2)                                                  */
/* -------------------------------------------------------------------------- */

/** The dataset name: 13 px / 500, line-height 1.2. Spec 02 section 2.2. */
export const DATASET_NAME_FONT_SIZE = 13;

/** The dataset name: 13 px / 500, line-height 1.2. Spec 02 section 2.2. */
export const DATASET_NAME_FONT_WEIGHT = 500;

/** Every other string in the bar is 11 px. Spec 04 section 3.2. */
export const TOP_BAR_FONT_SIZE = COMPACT_SIZING.FONT_SIZE;

/** The one line-height the bar's strings take. Spec 04 section 3.2. */
export const TOP_BAR_LINE_HEIGHT = 1.2;

/** A label that names an action is weight 500. Spec 04 section 3.2. */
export const TOP_BAR_LABEL_FONT_WEIGHT = 500;

/* -------------------------------------------------------------------------- */
/* Export text trigger (spec 02 section 2.4a)                                  */
/* -------------------------------------------------------------------------- */

/** Export is a text menu trigger: `height: 24px`. Spec 02 section 2.4. */
export const EXPORT_TRIGGER_HEIGHT = PANEL_GRID.CONTROL_HEIGHT;

/** Export is a text menu trigger: `padding: 0 6px`. Spec 02 section 2.4. */
export const EXPORT_TRIGGER_PADDING_X = 6;

/** Export is a text menu trigger: gap 4 px. Spec 02 section 2.4. */
export const EXPORT_TRIGGER_GAP = 4;

/** Export is a text menu trigger: `border-radius: 4px`. Spec 02 section 2.4. */
export const EXPORT_TRIGGER_RADIUS = 4;

/* -------------------------------------------------------------------------- */
/* Menu-affordance caret (spec 02 section 8)                                   */
/* -------------------------------------------------------------------------- */

/*
 * The caret's two numbers are shell-wide, not the top bar's: the status bar chip, the
 * layout chip and the canvas toolbar's Views button draw the same register entry. They
 * live in `shell/constants.ts` beside every other shell number and are re-exported
 * here so this bar's own geometry still reads as one list.
 */
export { MENU_CARET_SIZE, MENU_CARET_STROKE } from "../constants";

/* -------------------------------------------------------------------------- */
/* The 1 px x 16 px right-group divider (spec 02 section 2.4c)                  */
/* -------------------------------------------------------------------------- */

/** The divider between Share and Compare: 1 px wide. Spec 02 section 2.4. */
export const RIGHT_GROUP_DIVIDER_WIDTH = 1;

/** The divider between Share and Compare: 16 px tall. Spec 02 section 2.4. */
export const RIGHT_GROUP_DIVIDER_HEIGHT = PANEL_GRID.GLYPH_SLOT;

/* -------------------------------------------------------------------------- */
/* History pop-out (spec 02 section 2.5)                                       */
/* -------------------------------------------------------------------------- */

/** The middle rung of 6.11's 280 / 360 / 480 width ladder. Spec 02 section 2.5. */
export const HISTORY_POPOVER_WIDTH = 360;

/**
 * Gap to the bar: 0. The pop-out touches the bar it hangs from, which is also why it
 * draws no caret -- at top 40 there is no gap to draw one in. Spec 02 section 2.5.
 */
export const HISTORY_POPOVER_GAP = 0;

/**
 * The pop-out's height cap is the owning region's height minus this inset (6.11).
 * The half-region cap does not bind: a top-bar pop-out opens down from the bar's own
 * bottom edge and has no flip. Spec 02 section 2.5.
 *
 * Exported as the named spec 02 section 2.5 inset, so the reserve computed from it can be
 * checked against the spec.
 * @public
 */
export const HISTORY_POPOVER_HEIGHT_INSET = 32;

/** The pop-out header: 32 px. Spec 02 section 2.5. */
export const HISTORY_HEADER_HEIGHT = PANEL_GRID.SECTION_HEADER;

/** The pop-out header's inner gap. HistoryPopover.dc.html. */
export const HISTORY_HEADER_GAP = 6;

/**
 * The pop-out's own name, at the panel-title step of the ramp: 12 px / 500.
 * Spec 04 section 3.2.
 */
export const HISTORY_HEADER_FONT_SIZE = 12;

/** The gap between an entry's title and the mark on the current position. */
export const HISTORY_TITLE_GAP = 4;

/** The gap between an entry's title and its provenance line. HistoryPopover.dc.html. */
export const HISTORY_PROVENANCE_GAP = 1;

/** The pop-out header's left padding. HistoryPopover.dc.html. */
export const HISTORY_HEADER_PADDING_LEFT = 12;

/** The pop-out header's right padding, which the close button's own box fills out. */
export const HISTORY_HEADER_PADDING_RIGHT = 4;

/** The list's padding inside the pop-out. HistoryPopover.dc.html. */
export const HISTORY_BODY_PADDING = 4;

/**
 * What the pop-out holds inside its 1 px border: "the shell is 358 inside its border".
 * Spec 02 section 2.5.
 */
export const HISTORY_POPOVER_CONTENT_WIDTH = HISTORY_POPOVER_WIDTH - TOP_BAR_BORDER_WIDTH * 2;

/** One entry row is a data row: 28 px. Spec 04 section 3.1 (`DATA_PITCH`). */
export const HISTORY_ROW_HEIGHT = PANEL_GRID.DATA_PITCH;

/** Row radius. HistoryPopover.dc.html. */
export const HISTORY_ROW_RADIUS = 3;

/** Row horizontal padding, which is what turns the 350 px row into the 338 px grid. */
export const HISTORY_ROW_PADDING_X = 6;

/** The gap between two columns of the row grid. Spec 02 section 2.5. */
export const HISTORY_ROW_GAP = 6;

/** Row grid column 1: the step's glyph, 14 px. Spec 02 section 2.5. */
export const HISTORY_GLYPH_COLUMN = PANEL_GRID.GLYPH;

/**
 * Row grid column 2: the step's title, 228 px. Spec 02 section 2.5. Exported as the named spec
 * 02 section 2.5 column width, one of the three the row grid adds up.
 * @public
 */
export const HISTORY_TITLE_COLUMN = 228;

/** Row grid column 3: the owning activity, 44 px (`Analyze` measures 43.4). */
export const HISTORY_ACTIVITY_COLUMN = 44;

/** Row grid column 4: the time, 34 px (a mono HH:MM measures 33.1). */
export const HISTORY_TIME_COLUMN = 34;

/**
 * The row grid the four columns and their three gaps add up to.
 * 14 + 6 + 228 + 6 + 44 + 6 + 34 = 338, inside a 350 px row. Spec 02 section 2.5.
 */
export const HISTORY_ROW_GRID_WIDTH =
    HISTORY_GLYPH_COLUMN +
    HISTORY_ROW_GAP +
    HISTORY_TITLE_COLUMN +
    HISTORY_ROW_GAP +
    HISTORY_ACTIVITY_COLUMN +
    HISTORY_ROW_GAP +
    HISTORY_TIME_COLUMN;

/**
 * A row inside the pop-out: the 360 px shell is 358 inside its border and the body
 * pads 4 a side. Spec 02 section 2.5 ("the 360 band, measured").
 */
export const HISTORY_ROW_WIDTH =
    HISTORY_POPOVER_WIDTH - TOP_BAR_BORDER_WIDTH * 2 - HISTORY_BODY_PADDING * 2;

/** An XR session's children indent 36, not 46. HistoryPopover.dc.html. */
export const HISTORY_XR_CHILD_INDENT = 36;

/** The current position's left bar, drawn inset. HistoryPopover.dc.html. */
export const HISTORY_CURRENT_BAR_WIDTH = 2;

/** The Current badge: 14 tall, the compact badge of spec 04 section 3.3. */
export const HISTORY_BADGE_HEIGHT = PANEL_GRID.GLYPH;

/** The Current badge: `padding: 0 4px`. Spec 04 section 3.3. */
export const HISTORY_BADGE_PADDING_X = 4;

/** The Current badge: `border-radius: 7px`. Spec 04 section 3.3. */
export const HISTORY_BADGE_RADIUS = 7;

/** The Current badge: 9 px / 500. Spec 04 section 3.2 (badge text). */
export const HISTORY_BADGE_FONT_SIZE = 9;

/** The provenance line under an XR step: 10 px. HistoryPopover.dc.html. */
export const HISTORY_PROVENANCE_FONT_SIZE = 10;

/** The pop-out's close X, a 12 px chevron-class glyph. Spec 02 section 8. */
export const HISTORY_CLOSE_GLYPH_SIZE = PANEL_GRID.CHEVRON;

/**
 * Everything the pop-out's height cap has to clear: the top bar it hangs from, the
 * status bar under the region, and 6.11's 32 px inset. The cap itself is
 * `100vh` minus this, which on the drawn 900 px board is the 804 the artboard
 * records. Spec 02 section 2.5 ("max-height stays 804").
 */
export const HISTORY_POPOVER_HEIGHT_RESERVE =
    TOP_BAR_HEIGHT + STATUS_BAR_HEIGHT + HISTORY_POPOVER_HEIGHT_INSET;
