import { LogLevel, parseLogLevel } from "./types.js";

/**
 * URL parameter names for logging configuration.
 */
const LOGGING_PARAM = "graphty-element-logging";
const LOG_LEVEL_PARAM = "graphty-element-log-level";
const REMOTE_LOG_PARAM = "graphty-element-remote-log";

/**
 * Parsed logging parameters from the URL.
 */
export interface ParsedLoggingParams {
    /** Whether logging is enabled */
    enabled: boolean;
    /** Modules to enable: array of module names or "*" for all */
    modules: string[] | "*";
    /** Global log level (if specified via graphty-element-log-level param) */
    level?: LogLevel;
    /** Per-module log level overrides (from module:level format) */
    moduleOverrides?: Map<string, LogLevel>;
    /**
     * URL of remote log server, from the graphty-element-remote-log param. Present only when its
     * origin is in the `allowedRemoteLogOrigins` the caller passed.
     */
    remoteLogUrl?: string;
}

/**
 * Options for {@link parseLoggingURLParams}.
 */
export interface ParseLoggingURLParamsOptions {
    /**
     * Origins (such as `"http://localhost:9080"`) a page address may name as a remote log server.
     * The graphty-element-remote-log param is ignored unless its origin is listed here, so a
     * crafted link cannot send the page's logs to a server the embedder did not choose. Default:
     * none, so the address never turns on remote logging.
     */
    allowedRemoteLogOrigins?: readonly string[];
}

/**
 * Parse a comma-separated module list (each entry optionally `module:level`)
 * into the result's module list and per-module level overrides.
 * @param result - The parsed parameters to fill in
 * @param loggingValue - The raw logging URL parameter value
 */
function applyModuleSpecs(result: ParsedLoggingParams, loggingValue: string): void {
    const moduleSpecs = loggingValue
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    const modules: string[] = [];
    const moduleOverrides = new Map<string, LogLevel>();

    for (const spec of moduleSpecs) {
        // Check for module:level format
        const colonIndex = spec.indexOf(":");
        if (colonIndex > 0) {
            const moduleName = spec.substring(0, colonIndex).trim();
            const levelStr = spec.substring(colonIndex + 1).trim();
            const level = parseLogLevel(levelStr);

            modules.push(moduleName);
            if (level !== undefined) {
                moduleOverrides.set(moduleName, level);
            }
        } else {
            modules.push(spec);
        }
    }

    result.modules = modules;
    if (moduleOverrides.size > 0) {
        result.moduleOverrides = moduleOverrides;
    }
}

/**
 * Parse logging configuration from URL parameters.
 *
 * Supported URL parameter formats:
 * - `?graphty-element-logging=true` - Enable all logging at default level
 * - `?graphty-element-logging=layout,xr` - Enable specific modules
 * - `?graphty-element-logging=layout:debug,xr:info` - Enable modules with levels
 * - `?graphty-element-log-level=debug` - Set global log level
 * - `?graphty-element-remote-log=https://localhost:9080` - Send logs to remote server, only when
 *   that origin is in `options.allowedRemoteLogOrigins`
 * @param options - Which remote log servers the address may name
 * @returns Parsed logging parameters, or null if logging param is not present or disabled
 */
export function parseLoggingURLParams(options: ParseLoggingURLParamsOptions = {}): ParsedLoggingParams | null {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || typeof URLSearchParams === "undefined") {
        return null;
    }

    const params = new URLSearchParams(window.location.search);
    const loggingValue = params.get(LOGGING_PARAM);
    const levelValue = params.get(LOG_LEVEL_PARAM);
    const remoteLogValue = params.get(REMOTE_LOG_PARAM);

    // No logging param or explicitly disabled
    if (!loggingValue || loggingValue === "" || loggingValue === "false") {
        return null;
    }

    // Parse the logging value
    const result: ParsedLoggingParams = {
        enabled: true,
        modules: "*",
    };

    // "true" means enable all modules
    if (loggingValue !== "true") {
        applyModuleSpecs(result, loggingValue);
    }

    // Parse global log level if specified
    if (levelValue) {
        const level = parseLogLevel(levelValue);
        if (level !== undefined) {
            result.level = level;
        }
    }

    // A remote server named by the address is used only when the embedder allowed its origin
    if (remoteLogValue && isAllowedRemoteUrl(remoteLogValue, options.allowedRemoteLogOrigins ?? [])) {
        result.remoteLogUrl = remoteLogValue;
    }

    return result;
}

/**
 * Origin of an http or https URL.
 * @param urlString - The string to read
 * @returns The URL's origin, or undefined when it is not an http or https URL
 */
function httpOrigin(urlString: string): string | undefined {
    try {
        const url = new URL(urlString);
        return url.protocol === "http:" || url.protocol === "https:" ? url.origin : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Check that a string is an http or https URL whose origin the embedder allowed.
 * @param urlString - The string to validate
 * @param allowedOrigins - Origins the embedder allowed
 * @returns true if the URL may be used as a remote log server
 */
function isAllowedRemoteUrl(urlString: string, allowedOrigins: readonly string[]): boolean {
    const origin = httpOrigin(urlString);
    return origin !== undefined && allowedOrigins.some((allowed) => httpOrigin(allowed) === origin);
}
