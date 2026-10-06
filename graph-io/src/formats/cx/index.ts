/**
 * The `@graphty/graph-io/cx` subpath (design/graph-io/cytoscape-and-obo/design.md section 1.2):
 * the CX version 1 importer with its option type and code table. CX1 is read only: CX2 is what
 * NDEx and Cytoscape write today, and `@graphty/graph-io/cx2` writes it.
 */

export { CX_ISSUE, cxImporter, type CxImportOptions } from "./importer.js";
