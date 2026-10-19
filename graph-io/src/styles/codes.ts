/**
 * The codes of every style condition graph-io reports: the notes attached to a file's styles (`W_STYLE_*`), the
 * import and export report codes about styles as a whole (`W_STYLES_*`), and the one error (`E_STYLES_MISMATCH`).
 */

import { STYLES_NOT_IMPORTED_CODE } from "../common/codes.js";

/**
 * Every style code by name. A key is the code without its `E_` / `W_` and `STYLE_` / `STYLES_` prefixes. Every style
 * condition is a warning except `MISMATCH`; none counts toward an import's `errorLimit`.
 * @category Styles
 */
export const STYLE_ISSUE = Object.freeze({
    // ------------------------------------------------ reading values
    /** A value longer than 256 characters was not parsed. */
    VALUE_TOO_LONG: "W_STYLE_VALUE_TOO_LONG",
    /** A value does not parse in the file's dialect (an unknown color name, a non-number, a negative length). */
    BAD_VALUE: "W_STYLE_BAD_VALUE",
    /** An enumeration value the vocabulary has no name for; kept as `other:<value>`. */
    UNKNOWN_VALUE: "W_STYLE_UNKNOWN_VALUE",
    /** A color's alpha was dropped because the property has no opacity to carry it. */
    ALPHA_DROPPED: "W_STYLE_ALPHA_DROPPED",
    /** A list of colors where one color is expected; the tool draws it its own way and the first is not taken. */
    COLOR_LIST: "W_STYLE_COLOR_LIST",
    /** A gradient fill; its first color is kept. */
    GRADIENT: "W_STYLE_GRADIENT",
    /** A node the tool draws unfilled although the file gives it a fill color. */
    UNFILLED: "W_STYLE_UNFILLED",
    /** A node fill the file marks as transparent or absent. */
    NO_FILL: "W_STYLE_NO_FILL",
    /** An edge stroke the file marks as absent. */
    NO_STROKE: "W_STYLE_NO_STROKE",
    /** The tool grows a node to fit its label, so the stated size is a minimum. */
    SIZE_MINIMUM: "W_STYLE_SIZE_MINIMUM",
    /** An HTML-like label: its text is kept and its markup dropped. */
    HTML_LABEL: "W_STYLE_HTML_LABEL",
    /** A record label: its fields are joined with " | ". */
    RECORD_LABEL: "W_STYLE_RECORD_LABEL",
    /** An element carries more than one label; the first is kept. */
    EXTRA_LABELS: "W_STYLE_EXTRA_LABELS",
    /** A color that inherits from the edge's ends in a way the vocabulary cannot express. */
    INHERIT_COLOR: "W_STYLE_INHERIT_COLOR",
    /** A style property the vocabulary has no counterpart for was not carried. */
    NOT_CARRIED: "W_STYLE_NOT_CARRIED",
    // ------------------------------------------------ reading declared styles
    /** A declared mapping that cannot be read. */
    BAD_MAPPING: "W_STYLE_BAD_MAPPING",
    /** A declared mapping reads a column the file does not have. */
    MAPPING_COLUMN_MISSING: "W_STYLE_MAPPING_COLUMN_MISSING",
    /** References between style records that are circular or too deep; the rest are read. */
    REFERENCE_CYCLE: "W_STYLE_REFERENCE_CYCLE",
    /** A style reference that names nothing in the file. */
    UNRESOLVED: "W_STYLE_UNRESOLVED",
    /** Style structures nested deeper than graph-io reads. */
    NESTING: "W_STYLE_NESTING",
    /** A style section that cannot be read at all. */
    UNREADABLE: "W_STYLE_UNREADABLE",
    /** A Cytoscape session without its visual styles; the tool's fallbacks apply. */
    NO_VIZMAP: "W_STYLE_NO_VIZMAP",
    /** The view names a visual style the file does not hold. */
    VIEW_STYLE_MISSING: "W_STYLE_VIEW_STYLE_MISSING",
    /** The file holds more visual styles than the one its view uses; the others are not read. */
    OTHER_STYLES: "W_STYLE_OTHER_STYLES",
    /** The file holds more views than one; only the first view's styles are read. */
    OTHER_VIEWS: "W_STYLE_OTHER_VIEWS",
    /** A selector the tool treats as invalid, which matches every element there. */
    SELECTOR: "W_STYLE_SELECTOR",
    /** A selector a short predicate cannot express; its members are marked on the elements instead. */
    SELECTOR_AS_COLUMN: "W_STYLE_SELECTOR_AS_COLUMN",
    /** A selector state that changes while the tool runs (selected, hovered), evaluated as at load. */
    STATE_ASSUMED: "W_STYLE_STATE_ASSUMED",
    // ------------------------------------------------ planning
    /** A continuous mapping matches the file's values only within the tool's rounding. */
    RAMP_ROUNDED: "W_STYLE_RAMP_ROUNDED",
    /** Rules were folded into a copy to keep the number of rules per kind bounded. */
    LAYER_CAP: "W_STYLE_LAYER_CAP",
    /** The counted work budget ran out; the values not yet explained are copied per element. */
    BUDGET: "W_STYLE_BUDGET",
    // ------------------------------------------------ graphty's own block
    /** A `graphty.styles` block was ignored, with a reason code; the file is read like any other. */
    BLOCK_IGNORED: "W_STYLE_BLOCK_IGNORED",
    // ------------------------------------------------ export
    /** The format has no place for this property; it is not written. */
    NOT_WRITTEN: "W_STYLE_NOT_WRITTEN",
    /** Written as the nearest value the format allows. */
    APPROXIMATED: "W_STYLE_APPROXIMATED",
    /** Per-element values were written but not the rules; importing the file infers them again. */
    RULES_NOT_KEPT: "W_STYLE_RULES_NOT_KEPT",
    /** A style was written as its per-element values and lost its editable form, with a reason code. */
    LAYER_FLATTENED: "W_STYLE_LAYER_FLATTENED",
    // ------------------------------------------------ styles as a whole
    /** The file holds styles that were not imported; import them with the `styles` option. */
    NOT_IMPORTED: STYLES_NOT_IMPORTED_CODE,
    /** The graph has styles that were not exported; export them with the `styles` option. */
    NOT_EXPORTED: "W_STYLES_NOT_EXPORTED",
    /** The styles were read from or built for a different graph; nothing is written. */
    MISMATCH: "E_STYLES_MISMATCH",
});

/**
 * Any style code.
 * @category Styles
 */
export type StyleIssueCode = (typeof STYLE_ISSUE)[keyof typeof STYLE_ISSUE];
