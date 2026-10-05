/**
 * The OBO subpath entry (`@graphty/graph-io/obo`): the importer and exporter of the OBO flat file
 * format (the Gene Ontology and the OBO Foundry ontologies), their options and their issue and
 * loss codes. The JSON form of the same ontologies, OBO Graphs, is the `obographs` dialect of
 * `@graphty/graph-io/json`.
 * @module @graphty/graph-io/obo
 */

export { OBO_CAPABILITIES, OBO_LOSS, oboExporter, type OboExportOptions } from "./exporter.js";
export { OBO_ISSUE, oboImporter, type OboImportOptions } from "./importer.js";
