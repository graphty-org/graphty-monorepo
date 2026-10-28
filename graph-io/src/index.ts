/**
 * Read and write graph files as `@graphty/graph-format` snapshots.
 *
 * Most programs need eight functions: `loadFromUrl()`, `loadFromFile()` and `importGraph()` to read
 * a graph; `exportGraphToBytes()`, `exportGraphToString()`, `exportGraphToBlob()` and
 * `downloadGraph()` to write one; and `checkExport()` to see what a format would not keep. They are
 * under Loading and Saving. Each format's importer, exporter, options and codes are in its own
 * module, `@graphty/graph-io/<format>`, and are also exported here. Writing a format and Plugin
 * helpers are for adding a format of your own. The guide is at https://graphty.app/docs/graph-io/.
 * @module @graphty/graph-io
 */

// ============================================================ graph-format re-exports
// The error class every deliberate graph-io failure extends, the graph type every function takes
// or returns, the column type its attribute tables hold, the builder that copies or combines graphs,
// the graph an importer fills, and the "no such index" value a plugin compares with, so a caller
// needs no second import.
export {
    type Column,
    GraphBuilder,
    GraphFormatError,
    type GraphSink,
    type GraphSnapshot,
    INVALID_INDEX,
} from "@graphty/graph-format";

// ============================================================ a line format in one function
export { defineLineFormat, type LineAttributes, type LineFormat, type LineGraph } from "./common/line-format.js";

// ============================================================ testing a plugin
export { type CompareOptions, compareSnapshots, describeDiffs, type SnapshotDiff } from "./common/compare.js";

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
    expandFromSource,
    exportGraph,
    type ExportGraphOptions,
    exportGraphToBlob,
    exportGraphToBytes,
    exportGraphToString,
    type FormatInfo,
    FormatRegistry,
    importAllGraphs,
    importFromSource,
    importGraph,
    type ImportGraphOptions,
    type ImportGraphResult,
    listFormats,
    listFromSource,
    listGraphs,
    listSources,
    loadFromFile,
    loadFromSource,
    loadFromUrl,
    type LoadFromUrlOptions,
    probeSource,
    registerSource,
    registry,
    sniff,
    SNIFF_FAILED_CODE,
    UNKNOWN_FORMAT_CODE,
    validateSource,
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

// ============================================================ network sources (experimental)
// The contract, the load functions and credentials; each built-in source's code is its own subpath
// (@graphty/graph-io/sources/ndex, /cypher, /rest, /sparql), loaded on first use.
export {
    SOURCE_ISSUE,
    type SourceBlockedCause,
    type SourceIssueCode,
    type SourceIssueParams,
} from "./sources/codes.js";
export {
    type AwsSigV4Options,
    type CredentialBind,
    credentials,
    fromStorableCredential,
    type StorableCredential,
    storableCredential,
} from "./sources/credentials.js";
export { defineSource } from "./sources/define.js";
export {
    CYPHER_SOURCE_ID,
    NDEX_SOURCE_ID,
    NEO4J_SOURCE_ID,
    NEPTUNE_SOURCE_ID,
    OPENALEX_SOURCE_ID,
    REST_SOURCE_ID,
    SOURCE_ATTR_PREFIX,
    SOURCE_DEGREE_ATTR,
    SOURCE_ENTITY_ATTR,
    SOURCE_FORMAT_PREFIX,
    SOURCE_STUB_ATTR,
    SPARQL_SOURCE_ID,
} from "./sources/ids.js";
export { type SourceParamsMap } from "./sources/params.js";
export { sha256Hex } from "./sources/sigv4.js";
export {
    type Recording,
    recordingFrom,
    type ReplayCall,
    type ReplayFetch,
    replayFetch,
    type ReplayOptions,
} from "./sources/testing.js";
export {
    type AwsCredentials,
    type Credential,
    type CredentialKind,
    type EdgeRecord,
    type ExpandRequest,
    type FileFn,
    type GraphSource,
    type ImportFn,
    type LazySource,
    type LoadFromSourceOptions,
    type NodeRecord,
    type QueryLanguage,
    type RecordBatch,
    type RecordsFn,
    type RetryOptions,
    type SourceBase,
    type SourceContext,
    type SourceCursor,
    type SourceDescriptor,
    type SourceFeature,
    type SourceFile,
    type SourceFinish,
    type SourceFreshness,
    type SourceInfo,
    type SourceKind,
    type SourceLimitOptions,
    type SourceLimits,
    type SourceListing,
    type SourceListItem,
    type SourceListQuery,
    type SourceParamDescriptor,
    type SourceParamType,
    type SourceProbe,
    type SourceReportInfo,
    type SourceRequestInit,
    type SourceRuntime,
    type SourceRuntimeReason,
    type SourceSample,
    type SourceTotal,
    type SourceValidators,
} from "./sources/types.js";

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
    type BendPoint,
    DOT_ISSUE,
    DOT_LOSS,
    DOT_STYLE_BLOCK_ATTRIBUTE,
    DOT_STYLE_CAPABILITIES,
    dotExporter,
    type DotExportOptions,
    dotImporter,
    type DotImportOptions,
    graphvizPosBends,
    RANK_COLUMN,
    RANK_SET_COLUMN,
} from "./formats/dot/index.js";
export {
    GEXF_1_2_CAPABILITIES,
    GEXF_ISSUE,
    GEXF_LOSS,
    GEXF_STYLE_CAPABILITIES,
    gexfExporter,
    type GexfExportOptions,
    gexfImporter,
    type GexfImportOptions,
    type GexfVersion,
    GRAPHTY_XML_NAMESPACE,
} from "./formats/gexf/index.js";
export {
    GML_ISSUE,
    GML_LOSS,
    GML_STYLE_BLOCK_KEY,
    GML_STYLE_CAPABILITIES,
    gmlExporter,
    type GmlExportOptions,
    gmlImporter,
    type GmlImportOptions,
} from "./formats/gml/index.js";
export {
    GRAPHML_ISSUE,
    GRAPHML_LOSS,
    GRAPHML_STYLE_CAPABILITIES,
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
    jsonShapeOf,
    sniffJsonDialect,
} from "./formats/json/index.js";
export {
    exportNeo4jFiles,
    ID_SPACE_COLUMN,
    LABELS_COLUMN,
    NEO4J_CAPABILITIES,
    NEO4J_ISSUE,
    NEO4J_LOSS,
    neo4jExporter,
    type Neo4jExportOptions,
    type Neo4jFile,
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
    PAJEK_STYLE_CAPABILITIES,
    PAJEK_STYLE_COMMENT,
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
    refusedSave,
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
    forDecodedText,
    graphChosen,
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
    keptForStyles,
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
export {
    edgeWeights,
    type ExplicitWeights,
    explicitWeights,
    isWeightField,
    parseWeightText,
} from "./common/weights.js";
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
    MAX_XML_DEPTH,
    tokenizeXml,
    type XmlHandler,
    xmlIllegalTextNotes,
    XmlNestingError,
    type XmlRepairs,
    XmlSyntaxError,
    XmlTokenizer,
} from "./common/xml.js";

// ============================================================ styles through the importer and exporter contracts
export type { StyleImportOptions } from "./styles/io/generic.js";
export type { ExporterStyleInput, ExporterStyleOptions } from "./styles/io/writer.js";
