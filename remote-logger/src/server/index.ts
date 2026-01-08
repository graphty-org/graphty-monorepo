/**
 * Server-side logging utilities.
 * These are only meant to be run in Node.js, not in the browser.
 * @module server
 */

export {
    createDualServer,
    type DualServerOptions,
    type DualServerResult,
} from "./dual-server.js";
export {
    type FileStats,
    type JsonlEntry,
    JsonlWriter,
} from "./jsonl-writer.js";
export {
    clearLogs,
    createLogServer,
    type CreateLogServerOptions,
    type CreateLogServerResult,
    getJsonlWriter,
    getLogStorage,
    HELP_TEXT,
    type LogEntry,
    type LogServerOptions,
    main,
    parseArgs,
    type ParseArgsResult,
    setLogStorage,
    startLogServer,
} from "./log-server.js";
export {
    type AddLogsOptions,
    type ClearFilter,
    type HealthStatus,
    type LogEntryWithSession,
    type LogFilter,
    LogStorage,
    type LogStorageOptions,
    type SearchOptions,
    type ServerConfig,
    type ServerMode,
    type ServerStatus,
    type SessionFilter,
    type SessionMetadata,
} from "./log-storage.js";
export {
    extractMarkerFromPath,
    extractMarkerFromSessionId,
    type MarkerResolutionOptions,
    resolveProjectMarker,
} from "./marker-utils.js";
export { certFilesExist, type GeneratedCert, generateSelfSignedCert, readCertFiles } from "./self-signed-cert.js";
