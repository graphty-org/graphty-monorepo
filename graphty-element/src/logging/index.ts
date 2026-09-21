/**
 * Logging module for graphty-element.
 *
 * Provides a structured logging system with:
 * - Hierarchical module categories matching the codebase structure
 * - Configurable log levels (silent, error, warn, info, debug, trace)
 * - Console and remote sinks for output, plus any destination a consumer registers
 * - TypeScript-first design with full type safety
 *
 * This module is published as `@graphty/graphty-element/logging`. Import from that subpath
 * rather than from the root: the root barrel defines the custom element and pulls in Babylon.js
 * and Lit on import, and a logger has no use for either.
 * @example
 * ```typescript
 * import { GraphtyLogger, LogLevel } from "@graphty/graphty-element/logging";
 *
 * // Configure logging
 * await GraphtyLogger.configure({
 *     enabled: true,
 *     level: LogLevel.DEBUG,
 *     modules: "*",
 *     format: { timestamp: true, module: true },
 * });
 *
 * // Get a logger for a category
 * const logger = GraphtyLogger.getLogger(["graphty", "layout"]);
 * logger.info("Layout started", { nodeCount: 100 });
 * ```
 * @module logging
 */

// Core exports
export { type LogFormatOptions } from "./format.js";
export { formatLogRecord, GraphtyLogger, type GraphtyLoggerConfig, type Logger, type LogSinkReference } from "./GraphtyLogger.js";
export { lazy } from "./LazyEval.js";
export {
    configureLogging,
    getLoggingConfig,
    isModuleEnabled,
    type LoggerConfig,
    resetLoggingConfig,
} from "./LoggerConfig.js";
export { type ConsoleSinkOptions, createConsoleSink } from "./sinks/ConsoleSink.js";
export { createRemoteSink, type RemoteSinkOptions } from "./sinks/RemoteSink.js";
export { clearLoggingConfig, loadLoggingConfig, saveLoggingConfig } from "./storage.js";
export { LOG_LEVEL_NAMES, LOG_LEVEL_TO_NAME, LogLevel, type LogRecord, parseLogLevel, type Sink } from "./types.js";
export { type ParsedLoggingParams, parseLoggingURLParams } from "./URLParamParser.js";
