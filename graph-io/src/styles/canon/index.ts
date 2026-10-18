/**
 * Canonical style values: every reader turns a file's raw value into one spelling per property before anything
 * compares values. Colors are `#rrggbb` with the alpha moved to an opacity, numbers have 6 significant digits,
 * enumerations come from the neutral vocabulary, and text is what the tool draws.
 */

export * from "./bends.js";
export * from "./color.js";
export * from "./enums.js";
export { type GraphvizColor, graphvizColor, type GraphvizColorUse } from "./graphviz.js";
export * from "./number.js";
export { type CanonSite, MAX_STYLE_VALUE_LENGTH } from "./site.js";
export * from "./text.js";
