/**
 * Utilities for extracting and resolving project markers.
 *
 * Project markers are used to identify which git worktree or project
 * a log session belongs to, enabling filtering of logs by project.
 * @module server/marker-utils
 */


/**
 * Extract a project marker from a filesystem path.
 *
 * The function looks for `.worktrees` in the path and extracts the worktree name.
 * If no worktree is found, it falls back to the directory basename.
 * @param cwd - The filesystem path to extract a marker from
 * @returns The extracted project marker, or "default" if extraction fails
 * @example
 * // Worktree paths
 * extractMarkerFromPath("/home/user/.worktrees/remote-logging") // "remote-logging"
 * extractMarkerFromPath("C:\\Users\\dev\\.worktrees\\feature-xyz") // "feature-xyz"
 *
 * // Regular paths (uses basename)
 * extractMarkerFromPath("/home/user/my-project") // "my-project"
 */
export function extractMarkerFromPath(cwd: string): string {
    if (!cwd || cwd === "/") {
        return "default";
    }

    // Normalize trailing slashes
    const normalizedPath = cwd.replace(/[/\\]+$/, "");

    if (!normalizedPath) {
        return "default";
    }

    // Check if in .worktrees directory (supports both Unix and Windows paths)
    // Match: .worktrees/worktree-name or .worktrees\worktree-name
    const worktreeMatch = normalizedPath.match(/\.worktrees[/\\]([^/\\]+)/);
    if (worktreeMatch) {
        return worktreeMatch[1];
    }

    // Fall back to directory name
    // Handle both Unix and Windows paths by splitting on both separators
    const segments = normalizedPath.split(/[/\\]/);
    const basename = segments.filter(Boolean).pop();
    return basename || "default";
}

/**
 * Extract a project marker from a session ID.
 *
 * Session IDs typically follow the format: {prefix}-{timestamp}-{random}
 * This function extracts the prefix part as the project marker.
 * @param sessionId - The session ID to extract a marker from
 * @returns The extracted project marker, or "default" if extraction fails
 * @example
 * extractMarkerFromSessionId("graphty-element-1704067200000-abc123") // "graphty-element"
 * extractMarkerFromSessionId("my-app-1704067200000-xyz") // "my-app"
 * extractMarkerFromSessionId("simple") // "simple"
 */
export function extractMarkerFromSessionId(sessionId: string): string {
    if (!sessionId) {
        return "default";
    }

    // Session IDs follow format: {prefix}-{timestamp}-{random}
    // The timestamp is typically a 13-digit number (milliseconds since epoch)
    // We want to extract everything before the timestamp

    // Look for pattern: name-{13 digits}-{suffix}
    const timestampMatch = sessionId.match(/^(.+?)-(\d{10,13})-[a-zA-Z0-9]+$/);
    if (timestampMatch) {
        return timestampMatch[1];
    }

    // Fall back to first segment before hyphen
    const firstHyphen = sessionId.indexOf("-");
    if (firstHyphen > 0) {
        return sessionId.substring(0, firstHyphen);
    }

    // Return the whole session ID if no hyphen
    return sessionId;
}

/**
 * Options for resolving a project marker.
 */
export interface MarkerResolutionOptions {
    /** Explicit project marker (highest priority) */
    projectMarker?: string;
    /** Working directory path to extract marker from */
    workingDirectory?: string;
    /** Session ID to extract marker from (lowest priority) */
    sessionId?: string;
}

/**
 * Resolve a project marker using a fallback chain.
 *
 * Priority order:
 * 1. Explicit projectMarker parameter
 * 2. Extracted from workingDirectory path
 * 3. Extracted from sessionId
 * 4. "default" as final fallback
 * @param options - Resolution options with various marker sources
 * @returns The resolved project marker
 * @example
 * resolveProjectMarker({
 *   projectMarker: "explicit",
 *   workingDirectory: "/path/to/.worktrees/from-path"
 * }) // "explicit"
 *
 * resolveProjectMarker({
 *   workingDirectory: "/path/to/.worktrees/remote-logging"
 * }) // "remote-logging"
 */
export function resolveProjectMarker(options: MarkerResolutionOptions): string {
    // Priority 1: Explicit project marker
    if (options.projectMarker) {
        return options.projectMarker;
    }

    // Priority 2: Extract from working directory
    if (options.workingDirectory) {
        const fromPath = extractMarkerFromPath(options.workingDirectory);
        if (fromPath !== "default") {
            return fromPath;
        }
    }

    // Priority 3: Extract from session ID
    if (options.sessionId) {
        const fromSession = extractMarkerFromSessionId(options.sessionId);
        if (fromSession !== "default") {
            return fromSession;
        }
    }

    // Final fallback
    return "default";
}
