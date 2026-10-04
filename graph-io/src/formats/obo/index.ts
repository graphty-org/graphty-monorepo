/**
 * The OBO subpath entry (`@graphty/graph-io/obo`): the importer of the OBO
 * flat file format (the Gene Ontology and the OBO Foundry ontologies), its options and its issue
 * codes. OBO is read-only: there is no exporter.
 */

export { OBO_ISSUE, oboImporter, type OboImportOptions } from "./importer.js";
