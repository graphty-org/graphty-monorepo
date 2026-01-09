/**
 * Vite plugin for automatic project marker injection.
 *
 * This plugin injects global variables that the RemoteLogClient
 * can use to automatically identify which project/worktree logs
 * are coming from.
 * @module vite/plugin
 */

import { extractMarkerFromPath } from "../server/marker-utils.js";

/**
 * Vite plugin configuration object.
 * Matches Vite's Plugin type but without requiring the full vite dependency.
 */
interface VitePlugin {
    name: string;
    config: () => {
        define: Record<string, string>;
    };
}

/**
 * Creates a Vite plugin that injects project marker globals.
 *
 * The plugin detects the current working directory and:
 * 1. Extracts a project marker (worktree name or directory basename)
 * 2. Injects `__REMOTE_LOG_PROJECT_MARKER__` with the marker
 * 3. Injects `__REMOTE_LOG_WORKTREE_PATH__` with the full path
 *
 * These globals are automatically read by RemoteLogClient when no
 * explicit projectMarker/worktreePath options are provided.
 * @returns A Vite plugin configuration object
 * @example
 * ```typescript
 * // vite.config.ts
 * import { remoteLoggerPlugin } from "@graphty/remote-logger/vite";
 *
 * export default defineConfig({
 *     plugins: [remoteLoggerPlugin()]
 * });
 * ```
 */
export function remoteLoggerPlugin(): VitePlugin {
    return {
        name: "remote-logger",
        config() {
            const cwd = process.cwd();
            const marker = extractMarkerFromPath(cwd);

            return {
                define: {
                    __REMOTE_LOG_PROJECT_MARKER__: JSON.stringify(marker),
                    __REMOTE_LOG_WORKTREE_PATH__: JSON.stringify(cwd),
                },
            };
        },
    };
}
