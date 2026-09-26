/**
 * @file The canonical state digest: one string that is equal for two states exactly when they
 * hold the same project. The round-trip and random-sequence tests compare it before and after
 * undo and redo.
 *
 * Canonical means order-free where order carries no meaning: map and set entries are sorted, and
 * object keys are sorted. Functions (a compiled selector's predicate) are left out, because they
 * are derived from data that is hashed.
 *
 * The graph part hashes whatever the `graph` slice holds; it grows with the slice. The
 * arrangement part is off until captures are restored.
 */

import { stableDigest } from "../runs/runId";
import type { ProjectState } from "./state";

/** Which optional parts a digest includes. */
interface DigestOptions {
    /** Hash the `arrangement` slice. Off until undo restores coordinates. */
    readonly arrangement?: boolean;
}

/**
 * The canonical text of a value.
 * @param value - Any value state holds.
 * @param path - The objects being written, to cut a cycle instead of recursing forever.
 * @returns Its text; equal for equal values whatever their insertion order.
 */
function canonical(value: unknown, path: WeakSet<object>): string {
    if (typeof value === "number") {
        return Object.is(value, -0) ? "0" : String(value);
    }

    if (typeof value === "bigint") {
        return `${value}n`;
    }

    if (typeof value === "symbol") {
        return value.toString();
    }

    if (typeof value !== "object" || value === null) {
        return value === undefined ? "undefined" : JSON.stringify(value);
    }

    if (path.has(value)) {
        return "[cycle]";
    }

    path.add(value);
    try {
        if (ArrayBuffer.isView(value)) {
            const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

            return `${value.constructor.name}(${bytes.join(",")})`;
        }

        if (Array.isArray(value)) {
            return `[${value.map((entry: unknown) => canonical(entry, path)).join(",")}]`;
        }

        if (value instanceof Map) {
            const entries = [...value].map(([key, entry]) => `${canonical(key, path)}:${canonical(entry, path)}`);

            return `Map{${entries.sort().join(",")}}`;
        }

        if (value instanceof Set) {
            return `Set{${[...value].map((entry: unknown) => canonical(entry, path)).sort().join(",")}}`;
        }

        if (value instanceof Date) {
            return `Date(${value.getTime()})`;
        }

        const entries = Object.entries(value)
            .filter(([, entry]) => entry !== undefined && typeof entry !== "function")
            .sort(([left], [right]) => (left < right ? -1 : 1))
            .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry, path)}`);

        return `{${entries.join(",")}}`;
    } finally {
        path.delete(value);
    }
}

/**
 * The canonical digest of a project state.
 * @param state - The state.
 * @param options - Which optional parts to include.
 * @returns A digest, equal for equal states.
 */
export function stateDigest(state: ProjectState, options: DigestOptions = {}): string {
    const path = new WeakSet();
    const parts = [
        `graph=${canonical(state.graph, path)}`,
        `pins=${canonical(state.pins, path)}`,
        `config=${canonical(state.config, path)}`,
        `layout=${canonical(state.layout, path)}`,
        `runs=${canonical(state.runs, path)}`,
        `styles=${canonical(state.styles, path)}`,
        `visibility=${canonical(state.visibility, path)}`,
        `scopes=${canonical(state.scopes, path)}`,
        `views=${canonical(state.views, path)}`,
    ];
    if (options.arrangement === true) {
        parts.push(`arrangement=${canonical(state.arrangement, path)}`);
    }

    return stableDigest(parts.join("\n"));
}
