import { type LoggerConfig, LogLevel } from "./types.js";

/**
 * Default configuration when logging is not explicitly configured.
 */
const DEFAULT_CONFIG: LoggerConfig = {
    enabled: false,
    level: LogLevel.INFO,
    modules: "*",
    format: {
        timestamp: true,
        module: true,
        colors: true,
    },
};

/**
 * Current logging configuration. This is mutable and can be updated
 * by calling configureLogging().
 */
let currentConfig: LoggerConfig = { ...DEFAULT_CONFIG, format: { ...DEFAULT_CONFIG.format } };

/**
 * Change the logging configuration, leaving alone everything the caller did not mention.
 *
 * WHY IT MERGES RATHER THAN RESETS. Attaching a destination is a `configure` call -- that is the
 * declarative route, and the only route a configuration a host stored can take -- so a call that
 * rebuilt the whole configuration from defaults would turn "send my records here as well" into
 * "and put the level back to INFO and the modules back to everything". Whoever was reading debug
 * output would watch it stop, with nothing in the call that said so.
 * @param config - The settings to change. What is absent keeps the value it has.
 */
export function configureLogging(config: Partial<LoggerConfig>): void {
    currentConfig = {
        enabled: config.enabled ?? currentConfig.enabled,
        level: config.level ?? currentConfig.level,
        modules: config.modules ?? currentConfig.modules,
        moduleLevels: config.moduleLevels ?? currentConfig.moduleLevels,
        format: {
            timestamp: config.format?.timestamp ?? currentConfig.format.timestamp,
            timestampFormat: config.format?.timestampFormat ?? currentConfig.format.timestampFormat,
            module: config.format?.module ?? currentConfig.format.module,
            colors: config.format?.colors ?? currentConfig.format.colors,
        },
    };
}

/**
 * The level that applies to one category: its own override when it has one, the global level
 * otherwise.
 *
 * The most specific segment of the category wins, so with `{ graphty: WARN, layout: TRACE }` a
 * record from ["graphty", "layout"] is kept down to TRACE.
 * @param category - Hierarchical category path, e.g. ["graphty", "layout", "ngraph"].
 * @returns The lowest severity that is still delivered for that category.
 */
export function levelForCategory(category: readonly string[]): LogLevel {
    const overrides = currentConfig.moduleLevels;
    if (overrides === undefined) {
        return currentConfig.level;
    }

    for (let index = category.length - 1; index >= 0; index--) {
        const override = overrides[category[index]];
        if (override !== undefined) {
            return override;
        }
    }

    return currentConfig.level;
}

/**
 * Get the current logging configuration.
 * @returns The current configuration (readonly copy)
 */
export function getLoggingConfig(): LoggerConfig {
    return { ...currentConfig, format: { ...currentConfig.format } };
}

/**
 * Check if a specific module category is enabled for logging.
 * @param category - Hierarchical category path, e.g., ["graphty", "layout", "ngraph"]
 * @returns true if the module should log
 */
export function isModuleEnabled(category: string[]): boolean {
    // If logging is disabled, nothing is enabled
    if (!currentConfig.enabled) {
        return false;
    }

    // Empty category doesn't match specific modules
    if (category.length === 0) {
        return false;
    }

    // If all modules are enabled, return true
    if (currentConfig.modules === "*") {
        return true;
    }

    // Check if any of the category parts match an enabled module
    // This allows hierarchical matching:
    // - If "layout" is enabled, ["graphty", "layout"] matches
    // - If "layout" is enabled, ["graphty", "layout", "ngraph"] also matches
    const enabledModules = currentConfig.modules;

    for (const moduleName of enabledModules) {
        // Check if the module name appears in the category
        if (category.includes(moduleName)) {
            return true;
        }
    }

    return false;
}

/**
 * Reset logging configuration to defaults.
 * Primarily useful for testing.
 */
export function resetLoggingConfig(): void {
    currentConfig = { ...DEFAULT_CONFIG, format: { ...DEFAULT_CONFIG.format } };
}

// Re-export types for convenience
export type { LoggerConfig } from "./types.js";
