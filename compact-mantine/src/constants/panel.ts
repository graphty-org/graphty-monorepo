/**
 * The panel grid and the panel ink map.
 *
 * Every row type in a 280px property panel is laid out from `PANEL_GRID` and
 * painted from `PANEL_INK`. Nothing in this library writes a raw hex colour
 * and nothing retypes a number that `PANEL_GRID` already names.
 *
 * The grid identity is
 *
 * ```
 * 16  +  108  +  8  +  108  +  8  +  24  +  8  =  280
 * pad    field  gut  field   gap  trail  pad
 * ```
 */

/**
 * The pixel grid every panel row is measured against.
 *
 * All members are pixels. Import them; a literal `24`, `108` or `32` written
 * into a component is a bug, because it hides the fact that the number is part
 * of one identity that has to keep adding up to 280.
 */
export const PANEL_GRID = {
    /** the width of the panel column every row is laid out in */
    WIDTH: 280,
    /** left panel padding: where the content band begins */
    PAD_LEFT: 16,
    /** right panel padding: 8, not 16, because the trailing slot's glyph is optically inset */
    PAD_RIGHT: 8,
    /** x 16 to x 272 */
    CONTENT: 256,
    /** a control that fills the row and still leaves a trailing slot */
    BODY: 224,
    /** one of a pair */
    FIELD: 108,
    /** between the two fields of a pair */
    GUTTER: 8,
    /** between the body and the trailing slot */
    TRAIL_GAP: 8,
    /** the fixed trailing slot at x 248..272: an advanced settings button, a reset control, or nothing */
    TRAIL: 24,
    /** one of three segmented buttons */
    TRIPLE: 72,
    /** between two segmented buttons */
    TRIPLE_GAP: 4,
    /** every field, button and icon button in a panel row */
    CONTROL_HEIGHT: 24,
    /** 24px control, 8px between */
    ROW_PITCH: 32,
    /** toggles are the one row type that packs tighter than the row pitch */
    TOGGLE_PITCH: 24,
    /** a row of the user's own strings */
    DATA_PITCH: 28,
    /** the section header row, frozen at 32 */
    SECTION_HEADER: 32,
    /** the pad below a section's last content row */
    SECTION_PAD_BOTTOM: 8,
    /** the square a field's label glyph lives in, and the scrub handle */
    GLYPH_SLOT: 16,
    /** the drawn size of a glyph inside its slot */
    GLYPH: 14,
    /** the drawn size of a chevron, an X and a reset */
    CHEVRON: 12,
    /** the value text begins here, measured from the field's leading edge */
    VALUE_INSET: 24,
    /** one row pitch of chart */
    SPARKLINE_HEIGHT: 32,
    /** two row pitches of chart */
    HISTOGRAM_HEIGHT: 64,
    /** the label column shown when the `showLabels` preference writes a word beside each control */
    LABEL_COLUMN: 76,
} as const;

/**
 * The panel ink map: one Mantine CSS variable per colour role a panel row
 * paints.
 *
 * Every colour a row type paints comes from here, so the same component reads
 * correctly in the light scheme, in the dark scheme and under a consumer's own
 * primary colour. A raw hex written into a component is a defect that shows up
 * in only one of the two schemes.
 *
 * A hex in the notes below is the value the token resolves to in the dark
 * scheme, quoted so the intended shade is recognisable. Contrast ratios are
 * WCAG 2.x ratios measured from this library's own theme, in the scheme named
 * beside them.
 */
export const PANEL_INK = {
    /** primary text: the value in a field, a data row's name, a filled-in section's name (#d5d7da) */
    VALUE: "var(--mantine-color-text)",
    /**
     * secondary text: glyph labels, unit suffixes, the name of a section that
     * has nothing set in it.
     *
     * One step brighter than the #7a828e of the original palette, which
     * measured 4.03:1 on the panel and 3.44:1 on a field against the 4.5:1
     * WCAG AA requirement for text. This is the dimmest step of the palette
     * that meets AA on both of those grounds, in both colour schemes.
     */
    CHROME: "light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1))",
    /**
     * reading prose: a sentence of explanation rather than a value.
     *
     * It shares its value with the secondary text, because the secondary text
     * had to be lifted to this step to meet WCAG AA on a field.
     */
    PROSE: "light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1))",
    /**
     * placeholder text: what an empty but editable field shows in place of a
     * value.
     *
     * Lifted from the #5f6873 of the original palette, which measured 2.36:1
     * on a field against the 4.5:1 WCAG AA requirement for text. Placeholder
     * text is ordinary text to WCAG and gets no exemption, so on these grounds
     * it cannot be dimmer than the secondary text and still meet AA.
     *
     * A control that cannot be operated is a different case and uses
     * `DISABLED`, which is allowed to be dimmer than this.
     */
    PLACEHOLDER: "light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1))",
    /**
     * the text and glyphs of a control that is present but not operable.
     *
     * Deliberately dimmer than every other text role here -- 2.36:1 on a field
     * and 2.77:1 on the panel in the dark scheme, 1.87:1 and 2.07:1 in the
     * light one -- and deliberately not lifted to meet the 4.5:1 that ordinary
     * text has to meet. WCAG 2.2 exempts an inactive control from its contrast
     * minimums (1.4.3 for text and 1.4.11 for boundaries both exclude a
     * component that cannot be operated), and being visibly dimmer than a live
     * control is how a disabled one says what it is. An ink bright enough to
     * meet the text minimum would read as available.
     *
     * The value is Mantine's own `--mantine-color-disabled-color`, so a
     * disabled row in this library matches a disabled Mantine input standing
     * next to it, and follows a consumer who overrides that variable.
     */
    DISABLED: "var(--mantine-color-disabled-color)",
    /**
     * the default surface: a field's background, a segmented track (#2a3035).
     *
     * A field is borderless, so the only thing that draws its box is a fill
     * one step away from the panel behind it. That step runs in opposite
     * directions in the two schemes -- lighter than the panel in dark, darker
     * than it in light -- so this cannot be `--mantine-color-default`, which
     * is the panel's own white in light mode and would leave every field
     * invisible.
     *
     * The fill is 1.17:1 against the panel, short of the 3:1 that WCAG AA asks
     * of a component boundary. It is not lifted here: any fill bright enough
     * to reach 3:1 against the panel leaves no room for an ink dimmer than the
     * primary text colour inside the field. Giving a field a visible boundary is a
     * design decision -- a hairline, a shadow or an underline -- rather than a
     * token move.
     */
    SURFACE: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
    /** the panel itself, and therefore the hairline that divides a compound row (#1f2428) */
    PANEL: "var(--mantine-color-body)",
    /**
     * the raised surface: the ground under a small chip's label, and the track
     * a bar's fill runs along (#374047).
     *
     * One step further from the panel than `SURFACE`, in the same direction.
     * Like `SURFACE` it flips between the schemes, which
     * `--mantine-color-default-hover` does not -- in the light scheme that
     * token is #f8f9fa and would be indistinguishable from the surface under
     * it.
     *
     * This is not the ground of a selected item; that is `SELECTED`. The two
     * pull in opposite directions and cannot be one value. A raised ground has
     * things drawn *on* it -- a chip's label, a bar's coloured fill -- so in
     * the dark scheme it has to stay dark enough for those to stay legible. A
     * selected item is the other way round: it has to separate from the track
     * around it, which in the dark scheme means going lighter. Lifting this
     * token to serve a selected item is what made a chip's label and a bar's
     * fill unreadable, so the two roles are two tokens.
     *
     * Two pairings on this token are still short of WCAG AA, and neither can
     * be fixed by moving it. A chip labelled in the secondary text colour
     * measures 4.43:1 in the dark scheme against the 4.5:1 for text; the same
     * chip labelled in the primary text colour measures 7.33:1. An accent fill
     * on this track measures 2.11:1 (dark) and 2.73:1 (light) against the 3:1
     * for a shape that carries meaning; the same fill on the panel measures
     * 3.12:1 and 3.56:1. Both are settled where they are drawn, by choosing
     * the ink or the ground, not by another value here.
     */
    RAISED: "light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-5))",
    /**
     * the ground of the selected item in a group: the checked segment of a
     * segmented control, the current tile of an icon group, the active choice
     * in a set of buttons.
     *
     * It inverts -- light in the dark scheme, dark in the light scheme -- so a
     * selected item reads as a solid patch against its track rather than as a
     * slightly different shade of it. Against `SURFACE`, which is what a track
     * is painted with, it measures 5.59:1 in the dark scheme and 7.35:1 in the
     * light one, past the 3:1 that WCAG 2.2 (1.4.11) asks of the visual
     * boundary that distinguishes a control's state. Against the panel it
     * measures 6.56:1 and 8.18:1, so it also survives a selected item that
     * sits directly on the panel.
     *
     * Label it with `ON_SELECTED` rather than `VALUE`: a ground bright enough
     * to satisfy 1.4.11 against its track is too bright to carry the primary
     * text colour, which measures only 1.66:1 on it in the dark scheme.
     *
     * See `RAISED` for why the selected state and the raised surface are not
     * one token.
     */
    SELECTED: "light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1))",
    /**
     * the text and glyphs drawn on `SELECTED`.
     *
     * The panel's own colour, so the label of a selected item reads as a shape
     * punched out of a solid patch. It measures 6.56:1 against `SELECTED` in
     * the dark scheme and 8.18:1 in the light one, past the 4.5:1 WCAG AA
     * (1.4.3) requirement for text.
     */
    ON_SELECTED: "var(--mantine-color-body)",
    /**
     * borders, chart bars and the chart baseline.
     *
     * Lifted from the #48525c of the original palette, which measured 1.97:1
     * on the panel against the 3:1 WCAG AA requirement for meaningful non-text
     * such as a chart bar. This is the dimmest step of the palette that meets
     * 3:1 on the panel in both colour schemes.
     */
    BORDER: "light-dark(var(--mantine-color-gray-6), var(--mantine-color-dark-2))",
    /** the 1px rule above a section header, at the weight of `BORDER` */
    DIVIDER: "light-dark(var(--mantine-color-gray-6), var(--mantine-color-dark-2))",
    /** accent: a checked box, the highlighted bin, a filled micro-bar, the Run button (#4a7ee8) */
    ACCENT: "var(--mantine-primary-color-filled)",
    /** text and glyphs drawn on the accent (#ffffff) */
    ON_ACCENT: "var(--mantine-primary-color-contrast)",
    /** the warning glyph on a departure line (#f7b731) */
    WARNING: "var(--mantine-color-yellow-6)",
    /** success (#61d095) */
    SUCCESS: "var(--mantine-color-green-6)",
    /** danger (#eb4949) */
    DANGER: "var(--mantine-color-red-6)",
} as const;
