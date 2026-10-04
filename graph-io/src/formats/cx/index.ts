/**
 * The `@graphty/graph-io/cx` subpath (design/graph-io/cytoscape-and-obo/design.md section 1.2):
 * the CX version 1 importer and exporter with their option types and code tables.
 */

export { CX_CAPABILITIES, CX_LOSS, cxExporter, type CxExportOptions } from "./exporter.js";
export { CX_ISSUE, cxImporter, type CxImportOptions } from "./importer.js";
