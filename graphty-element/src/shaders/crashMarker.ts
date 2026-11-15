/**
 * @file The crash marker: which pasted shaders were being compiled, tested or drawn when the page
 * last died (design/rendering/shader-styles.md section 5).
 *
 * A shader that trips the GPU watchdog can take the whole tab with it -- on an iPad, with the
 * reader's unsaved work. So the element writes the shader's text hash to `localStorage` before
 * it compiles or test-draws one, and when the set of drawn pasted shaders changes, never per
 * frame; it takes the hash out again once a few calm frames have passed, or on `pagehide`. On the
 * next load the marker is read before autosave restores any layer, and a marked shader is held
 * whatever `trustedHashes` says.
 *
 * Every access is wrapped: blocked storage (a private window, a sandboxed frame) only skips the
 * marker, it never stops a graph.
 */

/** The storage key, shared by every graph on the origin. */
export const CRASH_MARKER_KEY = "graphty-shader-crash-marker";

/**
 * The hashes the marker names now.
 * @returns The hashes; empty when there is no marker or no storage.
 */
export function readCrashMarker(): Set<string> {
    try {
        const raw = globalThis.localStorage.getItem(CRASH_MARKER_KEY);
        const parsed: unknown = raw === null ? [] : JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed.filter((hash): hash is string => typeof hash === "string") : []);
    } catch {
        return new Set();
    }
}

/**
 * Write the marker's hashes.
 * @param hashes - The hashes; empty removes the marker.
 */
function writeCrashMarker(hashes: ReadonlySet<string>): void {
    try {
        if (hashes.size === 0) {
            globalThis.localStorage.removeItem(CRASH_MARKER_KEY);
        } else {
            globalThis.localStorage.setItem(CRASH_MARKER_KEY, JSON.stringify([...hashes]));
        }
    } catch {
        // Blocked storage: nothing is marked, and nothing else changes.
    }
}

/**
 * Name hashes in the marker, beside whatever another graph on the origin named.
 * @param hashes - The hashes about to be compiled, tested or drawn.
 */
export function markCrash(hashes: Iterable<string>): void {
    const marked = readCrashMarker();
    const before = marked.size;
    for (const hash of hashes) {
        marked.add(hash);
    }

    if (marked.size !== before) {
        writeCrashMarker(marked);
    }
}

/**
 * Take hashes out of the marker, leaving another graph's.
 * @param hashes - The hashes that are calm again.
 */
export function clearCrash(hashes: Iterable<string>): void {
    const marked = readCrashMarker();
    const before = marked.size;
    for (const hash of hashes) {
        marked.delete(hash);
    }

    if (marked.size !== before) {
        writeCrashMarker(marked);
    }
}
