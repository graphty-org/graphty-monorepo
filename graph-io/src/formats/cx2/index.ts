/**
 * The `@graphty/graph-io/cx2` subpath (design/graph-io/cytoscape-and-obo/design.md section 1.3):
 * the CX2 importer and exporter with their option types and code tables.
 */

export { CX2_CAPABILITIES, CX2_LOSS, cx2Exporter, type Cx2ExportOptions } from "./exporter.js";
export { CX2_ISSUE, cx2Importer, type Cx2ImportOptions } from "./importer.js";
