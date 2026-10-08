/**
 * The JSON subpath entry (`@graphty/graph-io/json`): the importer and exporter
 * objects, their option types, the dialect names and the issue / loss codes they use.
 * @module @graphty/graph-io/json
 */

export {
    dialectCapabilities,
    JSON_DIALECTS,
    type JsonDialect,
    type JsonImportDialect,
    type JsonShapeMeta,
    jsonShapeOf,
} from "./dialect.js";
export { JSON_LOSS, jsonCapabilities, jsonExporter, type JsonExportOptions } from "./exporter.js";
export { JSON_ISSUE, jsonImporter, type JsonImportOptions } from "./importer.js";
