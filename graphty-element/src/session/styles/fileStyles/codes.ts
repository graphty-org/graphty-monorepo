/**
 * @file The codes of what a load says about a file's styles, and of what an export loses of the
 * graph's styles: graph-io's own style codes and the ones graphty-element adds while it turns a
 * file's rules into layers. An application enumerates them from here and never imports graph-io
 * for them.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { STYLE_ISSUE, type StyleNoteCode } from "@graphty/graph-io/styles";

/**
 * The codes graphty-element adds while it turns a file's styles into layers. Every one is a
 * warning: the rest of the file's styles still apply.
 */
export const FILE_STYLE_TRANSLATION_ISSUE = Object.freeze({
    /** A property graphty-element does not draw (a border width, an image); it is left out. */
    NOT_DRAWN: "W_STYLE_NOT_DRAWN",
    /** A value graphty-element has no counterpart for (an unknown shape or arrow); it is left out. */
    NO_COUNTERPART: "W_STYLE_NO_COUNTERPART",
    /** A value drawn as the nearest one graphty-element has (a 2D shape as a 3D one, width and height as one size). */
    DRAWN_NEAREST: "W_STYLE_DRAWN_NEAREST",
    /** A rule reads a column no element of this load holds; it is left out. */
    COLUMN_ABSENT: "W_STYLE_COLUMN_ABSENT",
    /** A mapping table too large or too mixed to keep as a table; its values are kept per element. */
    TABLE_AS_VALUES: "W_STYLE_TABLE_AS_VALUES",
    /** Layers folded into one that keeps their values, to stay within the bound on layers per kind. */
    LAYERS_FOLDED: "W_STYLE_LAYERS_FOLDED",
    /** Label styles with more distinct values than the label budget; the rest are drawn as the nearest kept value. */
    LABEL_CAPPED: "W_STYLE_LABEL_CAPPED",
    /** A layer the element refused; it is left out and the others apply. */
    LAYER_REFUSED: "W_STYLE_LAYER_REFUSED",
    /** A layer graphty wrote into the file was not rebuilt (a selector too long, a value the file does not hold); the file's neutral rule is used. */
    LAYER_SPEC_IGNORED: "W_STYLE_LAYER_SPEC_IGNORED",
    /** A rule, predicate or mapping of a kind this version does not know; it is left out. */
    NOT_UNDERSTOOD: "W_STYLE_NOT_UNDERSTOOD",
});

/** A code graphty-element adds while it turns a file's styles into layers. */
export type FileStyleTranslationCode = (typeof FILE_STYLE_TRANSLATION_ISSUE)[keyof typeof FILE_STYLE_TRANSLATION_ISSUE];

/**
 * Every code a load's style notes carry: graph-io's `W_STYLE_*` codes for what reading the file
 * met, and graphty-element's own for what turning it into layers met. Open union: later releases
 * add codes, and an application words an unknown one generically.
 */
export type FileStyleNoteCode = StyleNoteCode | FileStyleTranslationCode;

/**
 * Every style code by name: graph-io's (reading, writing and the whole-file codes) and
 * graphty-element's own. A key is the code without its `E_` / `W_` and `STYLE_` / `STYLES_`
 * prefixes.
 */
export const FILE_STYLE_ISSUE = Object.freeze({ ...STYLE_ISSUE, ...FILE_STYLE_TRANSLATION_ISSUE });

/** Any style code: what {@link FILE_STYLE_CODES} lists. */
export type FileStyleCode = (typeof FILE_STYLE_ISSUE)[keyof typeof FILE_STYLE_ISSUE];

/** Every style code, import and export, for an application that words each one. */
export const FILE_STYLE_CODES: readonly FileStyleCode[] = Object.freeze([...new Set(Object.values(FILE_STYLE_ISSUE))]);

/**
 * The style codes an export reports among its losses, before anything is written: what the
 * format cannot hold (`W_STYLE_NOT_WRITTEN`), holds only approximately (`W_STYLE_APPROXIMATED`),
 * the layers it does not keep (`W_STYLE_RULES_NOT_KEPT`), a layer written as its values
 * (`W_STYLE_LAYER_FLATTENED`), layers an export without `styles: true` left out
 * (`W_STYLES_NOT_EXPORTED`), and styles of another graph (`E_STYLES_MISMATCH`, the only error).
 */
export const EXPORT_STYLE_LOSS_CODES = Object.freeze([
    STYLE_ISSUE.NOT_WRITTEN,
    STYLE_ISSUE.APPROXIMATED,
    STYLE_ISSUE.RULES_NOT_KEPT,
    STYLE_ISSUE.LAYER_FLATTENED,
    STYLE_ISSUE.NOT_EXPORTED,
    STYLE_ISSUE.MISMATCH,
] as const);

/** A style code an export reports among its losses: one of {@link EXPORT_STYLE_LOSS_CODES}. */
export type ExportStyleLossCode = (typeof EXPORT_STYLE_LOSS_CODES)[number];
