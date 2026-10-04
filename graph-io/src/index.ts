/**
 * The public barrel of @graphty/graph-io: the io contract
 * types and ImportError, the registry with `importGraph()` / `exportGraph()` / `sniff()`, the
 * `children` CSR helper, every built-in importer and exporter (also reachable through the per-format
 * subpath exports `@graphty/graph-io/<format>`), and the shared helpers a third-party importer or
 * exporter builds on (report builder, input reader, option resolution, direction resolver, id
 * coercion, the capability check and the loss / issue codes callers branch on). Named exports
 * only; no default export.
 */

// ============================================================ graph-format re-exports
// The error class every deliberate graph-io failure extends, and the graph type every function takes
// or returns, so a caller needs no second import.
export { GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";

// ============================================================ io contract types (12.4)
export {
    type CommonExportOptions,
    type CommonImportOptions,
    type ExportCapabilities,
    type GraphChoiceOptions,
    type GraphExporter,
    type GraphImporter,
    type GraphListing,
    ImportError,
    type ImportInput,
    type ImportIssue,
    type ImportReport,
    type IssueCategory,
    type LossNote,
} from "./types.js";

// ============================================================ registry, sniffing, children (8.2)
export {
    ChildrenCsr,
    childrenCsr,
    childrenFromColumn,
    type ChildrenOptions,
    type ContainmentRole,
    type DepthFirstOrder,
} from "./children.js";
export {
    type BuilderSeed,
    checkExport,
    createRegistry,
    downloadGraph,
    type DownloadGraphOptions,
    exportGraph,
    type ExportGraphOptions,
    exportGraphToBlob,
    exportGraphToBytes,
    exportGraphToString,
    type FormatInfo,
    FormatRegistry,
    importAllGraphs,
    importGraph,
    type ImportGraphOptions,
    type ImportGraphResult,
    listFormats,
    listGraphs,
    loadFromFile,
    loadFromUrl,
    type LoadFromUrlOptions,
    registry,
    sniff,
    SNIFF_FAILED_CODE,
    UNKNOWN_FORMAT_CODE,
} from "./registry.js";
export {
    extensionOf,
    type FormatName,
    GRAPH_FORMATS,
    type GraphFormatName,
    headBytes,
    normalizeMimeType,
    rankFormats,
    SNIFF_HEAD_BYTES,
    sniffFormat,
    type SniffHints,
    sniffJsonDialectHead,
    type SniffResult,
} from "./sniff.js";

// ============================================================ formats (8.4, 8.5)
export {
    CSV_CAPABILITIES,
    CSV_ISSUE,
    CSV_LOSS,
    type CsvColumnRef,
    csvExporter,
    type CsvExportOptions,
    csvImporter,
    type CsvImportOptions,
} from "./formats/csv/index.js";
export {
    CX_CAPABILITIES,
    CX_ISSUE,
    CX_LOSS,
    cxExporter,
    type CxExportOptions,
    cxImporter,
    type CxImportOptions,
} from "./formats/cx/index.js";
export {
    CX2_CAPABILITIES,
    CX2_ISSUE,
    CX2_LOSS,
    cx2Exporter,
    type Cx2ExportOptions,
    cx2Importer,
    type Cx2ImportOptions,
} from "./formats/cx2/index.js";
export {
    CYS_CAPABILITIES,
    CYS_ISSUE,
    CYS_LOSS,
    cysExporter,
    type CysExportOptions,
    cysImporter,
    type CysImportOptions,
} from "./formats/cys/index.js";
export {
    DOT_ISSUE,
    DOT_LOSS,
    dotExporter,
    type DotExportOptions,
    dotImporter,
    type DotImportOptions,
} from "./formats/dot/index.js";
export {
    GEXF_1_2_CAPABILITIES,
    GEXF_ISSUE,
    GEXF_LOSS,
    gexfExporter,
    type GexfExportOptions,
    gexfImporter,
    type GexfImportOptions,
    type GexfVersion,
} from "./formats/gexf/index.js";
export {
    GML_ISSUE,
    GML_LOSS,
    gmlExporter,
    type GmlExportOptions,
    gmlImporter,
    type GmlImportOptions,
} from "./formats/gml/index.js";
export {
    GRAPHML_ISSUE,
    GRAPHML_LOSS,
    graphmlExporter,
    type GraphmlExportOptions,
    graphmlImporter,
    type GraphmlImportOptions,
} from "./formats/graphml/index.js";
export {
    dialectCapabilities,
    JSON_DIALECTS,
    JSON_ISSUE,
    JSON_LOSS,
    jsonCapabilities,
    type JsonDialect,
    jsonExporter,
    type JsonExportOptions,
    type JsonImportDialect,
    jsonImporter,
    type JsonImportOptions,
    type JsonShapeMeta,
} from "./formats/json/index.js";
export {
    ID_SPACE_COLUMN,
    LABELS_COLUMN,
    NEO4J_CAPABILITIES,
    NEO4J_ISSUE,
    NEO4J_LOSS,
    neo4jExporter,
    type Neo4jExportOptions,
    neo4jImporter,
    type Neo4jImportOptions,
    ORIGINAL_ID_COLUMN,
    TYPE_COLUMN,
} from "./formats/neo4j/index.js";
export {
    OBO_CAPABILITIES,
    OBO_ISSUE,
    OBO_LOSS,
    oboExporter,
    type OboExportOptions,
    oboImporter,
    type OboImportOptions,
} from "./formats/obo/index.js";
export {
    PAJEK_ISSUE,
    PAJEK_LOSS,
    pajekExporter,
    type PajekExportOptions,
    pajekImporter,
    type PajekImportOptions,
} from "./formats/pajek/index.js";
export {
    XGMML_ISSUE,
    XGMML_LOSS,
    xgmmlExporter,
    type XgmmlExportOptions,
    xgmmlImporter,
    type XgmmlImportOptions,
} from "./formats/xgmml/index.js";

// ============================================================ shared helpers for plugin authors (8.4, 8.5, 8.6)
export {
    BAD_DEFAULT_CODE,
    BAD_OPTIONS_CODE,
    declareCompanion,
    declareResolved,
    PRECISION_CODE,
    RENAMED_CODE,
    type ResolvedDeclaration,
    ROLE_TAKEN_CODE,
    UNKNOWN_TYPE_CODE,
} from "./common/attributes.js";
export * from "./common/codes.js";
export {
    DIRECTED_COLUMN,
    DIRECTION_FORCED_CODE,
    DIRECTION_REFUSED_CODE,
    DirectionResolver,
    type EdgeKind,
    type EdgeLocation,
    MIXED_DIRECTION_CODE,
    MUTUAL_COLUMN,
    PAIR_COLUMN,
    type PairFolding,
    pairFolding,
    type PairFoldingOptions,
} from "./common/direction.js";
export {
    capabilities,
    checkCapabilities,
    type CheckExtras,
    type IdCharset,
    isNmtoken,
    LOSS,
    mangleNmtoken,
    NO_CAPABILITIES,
    type SanitizedIds,
    sanitizeIds,
} from "./common/export.js";
export { formatDecimal, formatF32, formatF64, formatGmlReal, formatInteger } from "./common/format.js";
export {
    canonicalId,
    coerceId,
    coerceIdText,
    ID_MERGED_CODE,
    IdCoercer,
    isCanonicalIntegerText,
} from "./common/ids.js";
export {
    decodeEntryName,
    inputLength,
    INVALID_UTF8_CODE,
    isImportInput,
    LineReader,
    type ReadOptions,
    readText,
    textChunks,
    throwIfAborted,
} from "./common/input.js";
export {
    chooseGraph,
    DEFAULT_ERROR_LIMIT,
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    type ResolvedExportOptions,
    type ResolvedImportOptions,
    resolveExportOptions,
    resolveImportOptions,
    SINK_OPTION_CODE,
} from "./common/options.js";
export {
    ImportReportBuilder,
    isAbortError,
    type IssueLocation,
    type MutableCounts,
    PARSE_ERROR_CODE,
} from "./common/report.js";
export {
    inferTextDtype,
    isNumericText,
    parseTextCell,
    TextCellWriter,
    type TextDtype,
    WIDENING_UNSUPPORTED_CODE,
} from "./common/text.js";
export { type ExplicitWeights, explicitWeights, isWeightField, parseWeightText } from "./common/weights.js";
export {
    collectBytes,
    decodeChunks,
    DEFAULT_CHUNK_BYTES,
    encodeChunks,
    joinText,
    type TextParts,
    toReadableStream,
} from "./common/writer.js";
export {
    hasIllegalXmlChar,
    tokenizeXml,
    type XmlHandler,
    xmlIllegalTextNotes,
    type XmlRepairs,
    XmlSyntaxError,
    XmlTokenizer,
} from "./common/xml.js";
