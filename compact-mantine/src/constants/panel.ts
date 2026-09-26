/**
 * The panel grid and the panel ink map.
 *
 * Every row type in a 240px property panel is laid out from `PANEL_GRID` and painted from
 * `PANEL_INK`, both measured from Figma's editor (design/figma-spec.md 9.1 and 2.2). Nothing in
 * this library writes a raw hex colour and nothing retypes a number that `PANEL_GRID` already
 * names.
 *
 * The grid identity is
 *
 * ```
 * 16  +  88  +  8  +  88  +  8  +  24  +  8  =  240
 * pad   field  gut  field   gap  trail  pad
 * ```
 */

/**
 * The pixel grid every panel row is measured against.
 *
 * All members are pixels. Import them; a literal `24`, `88` or `32` written into a component is
 * a bug, because it hides the fact that the number is part of one identity that has to keep
 * adding up to 240.
 */
export const PANEL_GRID = {
    /** the width of the panel column every row is laid out in (241 with its 1px edge) */
    WIDTH: 240,
    /** left panel padding: where the content band begins */
    PAD_LEFT: 16,
    /** right panel padding */
    PAD_RIGHT: 8,
    /** x 16 to x 232 */
    CONTENT: 216,
    /** a control that spans both fields and still leaves a trailing slot */
    BODY: 184,
    /** one of a pair */
    FIELD: 88,
    /** between the two fields of a pair */
    GUTTER: 8,
    /** between the body and the trailing slot */
    TRAIL_GAP: 8,
    /** the fixed trailing slot at x 208..232: an advanced settings button, a reset control, or nothing */
    TRAIL: 24,
    /** one of three segments: the body shared three ways, no gaps */
    TRIPLE: 184 / 3,
    /** between two segments: joined */
    TRIPLE_GAP: 0,
    /** every field, button and icon button in a panel row */
    CONTROL_HEIGHT: 24,
    /** a single row: a 24px control in a 32px row */
    ROW_PITCH: 32,
    /** a checkbox row in a panel (24 in dialogs) */
    TOGGLE_PITCH: 32,
    /** list and tree rows: a 24 pill in a 32 row */
    DATA_PITCH: 32,
    /** the section header row */
    SECTION_HEADER: 40,
    /** the pad below a section's last content row */
    SECTION_PAD_BOTTOM: 12,
    /** a field's leading slot, and the scrub handle */
    GLYPH_SLOT: 24,
    /** the nominal drawn size of a glyph inside its slot (10-14 allowed) */
    GLYPH: 12,
    /** the box of a chevron, an X and a reset; carets are drawn 5 x 3 inside it */
    CHEVRON: 10,
    /** the value text begins here, measured from the field's leading edge */
    VALUE_INSET: 24,
    /** one row pitch of chart */
    SPARKLINE_HEIGHT: 32,
    /** two row pitches of chart */
    HISTOGRAM_HEIGHT: 64,
    /** the label column of a popover row (64-72) */
    LABEL_COLUMN: 72,
    /** a field row with a legend: 16 legend + 4 + 24 control + 4 */
    FIELD_ROW: 48,
    /** a 9/14 caption above each column + 3 + 24 */
    CAPTION_ROW: 50,
    /** the legend band */
    LEGEND: 16,
    /** a light popover's default width */
    POPOVER_WIDTH: 240,
    /** a popover or modal header */
    POPOVER_HEADER: 40,
} as const;

/**
 * The panel ink map: one `--cm-*` token per colour role a panel row paints (spec 2.2).
 *
 * Every value resolves per element from its `color-scheme`, so the same component reads
 * correctly in light, in dark, inside a dark-scoped menu, and in the AA mode. Light / dark hex
 * values are quoted in the notes.
 */
export const PANEL_INK = {
    /** primary text: a field's value, a row's name (#000000e5 / #fff) */
    VALUE: "var(--cm-text)",
    /** secondary text: glyph labels, unit suffixes, legends (#00000080 / #ffffffb2) */
    CHROME: "var(--cm-text-secondary)",
    /** reading prose (secondary text) */
    PROSE: "var(--cm-text-secondary)",
    /** placeholder text (#0000004d / #ffffff66; darker in the AA mode) */
    PLACEHOLDER: "var(--cm-text-tertiary)",
    /** the text and glyphs of a control that cannot be operated (exempt from contrast minimums) */
    DISABLED: "var(--cm-text-disabled)",
    /** a field's fill, a segmented track (#f5f5f5 / #383838) */
    SURFACE: "var(--cm-bg-secondary)",
    /** the panel itself (#fff / #2c2c2c) */
    PANEL: "var(--cm-bg)",
    /** a raised or pressed ground: a chip's label ground, a bar's track (#e6e6e6 / #444) */
    RAISED: "var(--cm-bg-pressed)",
    /** a selected item's ground (#e5f4ff / #394360) */
    SELECTED: "var(--cm-bg-selected)",
    /** the glyph on a selected item (#007be5 / #7cc4f8) */
    ON_SELECTED: "var(--cm-icon-brand)",
    /** borders, chart bars, the chart baseline (#e6e6e6 / #444) */
    BORDER: "var(--cm-border)",
    /** the 1px divider (#e6e6e6 / #444) */
    DIVIDER: "var(--cm-border)",
    /** a filled accent surface: primary button, checked box (#0d99ff / #0c8ce9) */
    ACCENT: "var(--cm-bg-brand)",
    /** text and glyphs on the accent (#fff) */
    ON_ACCENT: "var(--cm-text-onbrand)",
    /** warning (#ffcd29 / #f3c11b) */
    WARNING: "var(--cm-bg-warning)",
    /** success (#14ae5c / #198f51) */
    SUCCESS: "var(--cm-bg-success)",
    /** danger (#f24822 / #e03e1a) */
    DANGER: "var(--cm-bg-danger)",
    /** a row, tab or tool under the pointer (#f5f5f5 / #383838) */
    HOVER: "var(--cm-bg-hover)",
    /** pressed (#e6e6e6 / #444) */
    PRESSED: "var(--cm-bg-pressed)",
    /** translucent hover over any ground (#0000000d / #ffffff0d) */
    TRANSPARENT_HOVER: "var(--cm-bg-transparent-hover)",
    /** translucent pressed over any ground (#0000001a / #ffffff1a) */
    TRANSPARENT_PRESSED: "var(--cm-bg-transparent-pressed)",
    /** a selected item under the pointer (#bde3ff / #4a5878) */
    SELECTED_HOVER: "var(--cm-bg-selected-hover)",
    /** the children of a selected item (#f2f9ff / #32394d) */
    SELECTED_SECONDARY: "var(--cm-bg-selected-secondary)",
    /** links and brand text (#007be5 / #7cc4f8) */
    BRAND_TEXT: "var(--cm-text-brand)",
    /** tertiary glyphs (#0000004d / #ffffff66) */
    TERTIARY: "var(--cm-icon-tertiary)",
    /** the focus ring (#0d99ff / #0c8ce9) */
    FOCUS: "var(--cm-border-selected)",
    /** a translucent hairline: secondary button, panel edge (#0000001a / #ffffff1a) */
    TRANSLUCENT: "var(--cm-border-translucent)",
    /** a stronger translucent edge: checkbox, switch track (#00000033 / #ffffff33) */
    TRANSLUCENT_STRONG: "var(--cm-border-translucent-strong)",
    /** the dark menu surface, the same in both schemes (#1e1e1e) */
    MENU: "var(--cm-bg-menu)",
    /** text on the menu (#fff) */
    ON_MENU: "var(--cm-text-menu)",
    /** secondary text on the menu: shortcuts (#ffffffb2) */
    ON_MENU_SECONDARY: "var(--cm-text-menu-secondary)",
    /** component (purple) text (#8638e5 / #d1a8ff) */
    COMPONENT: "var(--cm-text-component)",
} as const;
