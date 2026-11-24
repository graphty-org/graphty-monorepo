/**
 * @file The `store.graphty.notes.*` style paths and the values they read, apart from the note index that
 * computes them, so a style source or a layer check can name them without loading the notes
 * reader and writer (and the `./extend` entry stays small).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Path } from "../../catalog/types";

/** Every path under `store.graphty.notes.` reads a note value; nothing else does. */
// Spelled out rather than imported from `../storePaths`, which reaches the expression parser this
// file is kept apart from.
const NOTE_PATH_PREFIX = "store.graphty.notes.";

/** The note values one node or edge carries. */
export interface NoteFacts {
    /** How many notes name it. */
    readonly count: number;
    /** The newest note's text. */
    readonly latest: string;
    /** The newest note's time. */
    readonly latestTime: string;
}

/** The fields each `store.graphty.notes.<field>` path reads. */
const NOTE_FIELDS: Readonly<Record<string, keyof NoteFacts>> = Object.freeze({
    [`${NOTE_PATH_PREFIX}count`]: "count",
    [`${NOTE_PATH_PREFIX}latest`]: "latest",
    [`${NOTE_PATH_PREFIX}latestTime`]: "latestTime",
});

/**
 * Whether a path reads a note value, known or not.
 * @param path - The path.
 * @returns True for a path under `store.graphty.notes.`.
 */
export function isNotePath(path: Path): boolean {
    return path.startsWith(NOTE_PATH_PREFIX);
}

/**
 * The field of {@link NoteFacts} a path reads.
 * @param path - The path.
 * @returns The field, or undefined for a path that names no note value this release knows.
 */
export function noteFieldOf(path: Path): keyof NoteFacts | undefined {
    return Object.hasOwn(NOTE_FIELDS, path) ? NOTE_FIELDS[path] : undefined;
}

/** The note values a selector source reads. */
export type NoteFactsReader = (target: "node" | "edge", row: number) => NoteFacts | undefined;
