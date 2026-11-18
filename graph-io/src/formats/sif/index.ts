/**
 * The `@graphty/graph-io/sif` subpath: the importer and exporter of Cytoscape's Simple Interaction
 * Format (SIF) with their option types and issue / loss codes.
 * @module @graphty/graph-io/sif
 */

export { SIF_CAPABILITIES, SIF_LOSS, sifExporter, type SifExportOptions } from "./exporter.js";
export { INTERACTION_COLUMN, SIF_ISSUE, sifImporter, type SifImportOptions } from "./importer.js";
