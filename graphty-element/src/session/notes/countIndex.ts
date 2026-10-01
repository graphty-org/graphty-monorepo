/**
 * @file What the `graphty.notes.*` style paths read (design/notes/notes-design.md section 6.1): per
 * node and per edge row, how many notes name it, and the text and time of the newest of them.
 *
 * Only node and edge targets count; a note about a set, an item, a result or the graph counts on
 * nothing. Node ids match by their text, as `status` matches them, and edges bind by their stable
 * identity, through the same rows `counts()` reads.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { Path } from "../../catalog/types";
import type { NoteEntry } from "../project/state";
import { bindable, edgeRowsOf, nodeRowOf } from "./status";
import type { Note, NoteId } from "./types";

/** Every path under the `graphty.notes.` root reads a note value; nothing else does. */
export const NOTE_PATH_PREFIX = "graphty.notes.";

/** The note values one node or edge carries. */
export interface NoteFacts {
    /** How many notes name it. */
    readonly count: number;
    /** The newest note's text. */
    readonly latest: string;
    /** The newest note's time. */
    readonly latestTime: string;
}

/** The fields each `graphty.notes.<field>` path reads. */
const NOTE_FIELDS: Readonly<Record<string, keyof NoteFacts>> = Object.freeze({
    "graphty.notes.count": "count",
    "graphty.notes.latest": "latest",
    "graphty.notes.latestTime": "latestTime",
});

/**
 * Whether a path reads a note value, known or not.
 * @param path - The path.
 * @returns True for a path under `graphty.notes.`.
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

/**
 * Newest first: by time, compared as instants, then by id.
 * @param left - One note.
 * @param right - The other.
 * @returns The order.
 */
export function newestFirst(left: Note, right: Note): number {
    const by = Date.parse(right.time) - Date.parse(left.time);
    if (by !== 0 || left.id === right.id) {
        return by;
    }

    return left.id < right.id ? 1 : -1;
}

/**
 * The rows each note's node and edge targets bind in a snapshot, with one edge binding pass for
 * all of them.
 * @param notes - The notes.
 * @param snapshot - The snapshot.
 * @returns Per note, per target: the row, negative when unbound, undefined for other kinds.
 */
export function rowsOf(notes: readonly Note[], snapshot: GraphSnapshot): (number | undefined)[][] {
    const binds = notes.map(bindable);
    const edges = notes.flatMap((note, at) =>
        note.targets.flatMap((target, index) => (binds[at][index] && "edge" in target ? [target.edge] : [])),
    );
    const edgeRows = edgeRowsOf(snapshot, edges);
    let next = 0;
    return notes.map((note, at) =>
        note.targets.map((target, index) => {
            if (!binds[at][index]) {
                return undefined;
            }

            return "node" in target ? nodeRowOf(snapshot, target.node) : edgeRows[next++];
        }),
    );
}

/** The rows a set of notes binds, by kind of element. */
export interface NoteRows {
    /** Node rows. */
    readonly node: number[];
    /** Edge rows. */
    readonly edge: number[];
}

/**
 * The node and edge rows some notes name in a snapshot.
 * @param notes - The notes.
 * @param snapshot - The snapshot.
 * @returns The rows, each once.
 */
export function noteRowsOf(notes: readonly Note[], snapshot: GraphSnapshot): NoteRows {
    const node = new Set<number>();
    const edge = new Set<number>();
    rowsOf(notes, snapshot).forEach((rows, at) => {
        rows.forEach((row, index) => {
            if (row !== undefined && row >= 0) {
                ("node" in notes[at].targets[index] ? node : edge).add(row);
            }
        });
    });

    return { node: [...node], edge: [...edge] };
}

/** The note values of every row, built from one notes map over one snapshot. */
interface Index {
    readonly version: number;
    readonly snapshot: GraphSnapshot;
    readonly node: Map<number, NoteFacts>;
    readonly edge: Map<number, NoteFacts>;
}

/**
 * Build the note values of every row.
 * @param notes - The notes slice.
 * @param snapshot - The snapshot.
 * @param version - The notes slice's write count it was built at.
 * @returns The index.
 */
function build(notes: ReadonlyMap<NoteId, NoteEntry>, snapshot: GraphSnapshot, version: number): Index {
    const all = [...notes.values()].map((entry) => entry.note);
    const tally = {
        node: new Map<number, { count: number; newest: Note }>(),
        edge: new Map<number, { count: number; newest: Note }>(),
    };
    rowsOf(all, snapshot).forEach((rows, at) => {
        const note = all[at];
        // A note binding one row twice (two positions of a pair, say) counts on it once.
        const seen = { node: new Set<number>(), edge: new Set<number>() };
        rows.forEach((row, position) => {
            const kind = "node" in note.targets[position] ? "node" : "edge";
            if (row === undefined || row < 0 || seen[kind].has(row)) {
                return;
            }

            seen[kind].add(row);
            const held = tally[kind].get(row);
            if (held === undefined) {
                tally[kind].set(row, { count: 1, newest: note });
            } else {
                held.count++;
                held.newest = newestFirst(note, held.newest) < 0 ? note : held.newest;
            }
        });
    });

    const facts = (from: Map<number, { count: number; newest: Note }>): Map<number, NoteFacts> =>
        new Map(
            [...from].map(([row, { count, newest }]) => [
                row,
                Object.freeze({ count, latest: newest.text, latestTime: newest.time }),
            ]),
        );
    return { version, snapshot, node: facts(tally.node), edge: facts(tally.edge) };
}

/** The note values a selector source reads. */
export type NoteFactsReader = (target: "node" | "edge", row: number) => NoteFacts | undefined;

/**
 * The reader of every row's note values, rebuilt when the notes or the snapshot change.
 * @param notes - Reads the notes slice as it stands now. The map is written in place.
 * @param version - The notes slice's write count, which moves on every write to it.
 * @param snapshot - Reads the snapshot as it stands now.
 * @returns The reader.
 */
export function createNoteFacts(
    notes: () => ReadonlyMap<NoteId, NoteEntry>,
    version: () => number,
    snapshot: () => GraphSnapshot,
): NoteFactsReader {
    let index: Index | null = null;
    return (target, row) => {
        const graph = snapshot();
        const now = version();
        // ponytail: rebuilt whole on any note write (O(notes x targets)); update per changed
        // note if editing in a session of thousands of notes shows it.
        if (index === null || index.version !== now || index.snapshot !== graph) {
            index = build(notes(), graph, now);
        }

        return index[target].get(row);
    };
}
