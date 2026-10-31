/**
 * The DOT / Graphviz subpath entry (`@graphty/graph-io/dot`): the importer and
 * exporter plugins with their option types and issue / loss codes.
 * @module @graphty/graph-io/dot
 */

export type { BendPoint } from "../../styles/canon/bends.js";
export { type GraphvizFont, graphvizFont } from "./drawing.js";
export { DOT_LOSS, dotExporter, type DotExportOptions } from "./exporter.js";
export { DOT_ISSUE, dotImporter, type DotImportOptions } from "./importer.js";
export { RANK_COLUMN, RANK_SET_COLUMN } from "./names.js";
export { DOT_STYLE_BLOCK_ATTRIBUTE, DOT_STYLE_CAPABILITIES, graphvizPosBends } from "./styles.js";
