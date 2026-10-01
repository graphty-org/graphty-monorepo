/**
 * @file The published note types: the record, its targets and cites, what `add` and `update`
 * take, the status read beside a record, the change event, and `session.notes` itself. See
 * design/notes/notes-design.md sections 3 to 5.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the session entry point publishes it.
 */

import type { EdgeId, EdgeMember, NodeId, ResultId, ResultItem, SetId } from "../../catalog/types";
import type { GraphtyErrorCode, GraphtyWarningCode } from "../../errors/codes";

/** A note's id: `note_` then opaque characters. Globally unique; compare for equality only. */
export type NoteId = string;

/**
 * What a note is about.
 *
 * OPEN UNION: kinds may be added in a minor release. Show a kind you do not know by its `label`
 * from `notes.status()`.
 */
export type NoteTarget =
    | { readonly graph: true }
    | { readonly node: NodeId }
    | { readonly edge: EdgeMember }
    | { readonly set: SetId; readonly name?: string }
    | { readonly result: ResultId }
    | { readonly item: ResultItem };

/**
 * A target as `add`, `update` and `list` accept it: any {@link NoteTarget}, or an edge by its
 * session `EdgeId`. An item may leave out `run`, which means the result's current run.
 */
export type NoteTargetInput = NoteTarget | { readonly edge: EdgeId };

/** A result a note's claim rests on, pinned to the run it was written against. */
export interface NoteCite {
    /** The result. */
    readonly result: ResultId;
    /** Which run of it the note was written against. Opaque; compare for equality only. */
    readonly run: string;
}

/**
 * One note. Frozen; `get` and `list` return the same object until the note changes. A field with
 * no value is absent. A record holds only what is saved with the note, so it is also the saved form.
 */
export interface Note {
    /** Made by graphty-element. */
    readonly id: NoteId;
    /** When it was written, as `Date.prototype.toISOString()` writes it; stamped by graphty-element. */
    readonly time: string;
    /** What it is about: one to 64. */
    readonly targets: readonly NoteTarget[];
    /** Plain text, stored exactly as given; never blank, at most 65,536 characters. */
    readonly text: string;
    /** How the writer meant the text to be read (`text/markdown`); stored, never acted on. */
    readonly mediaType?: string;
    /** From the project's author setting, when one was set. A claim, never a verified identity. */
    readonly author?: string;
    /** When it last changed; stamped by graphty-element. */
    readonly edited?: string;
    /** Results the claim rests on. */
    readonly cites?: readonly NoteCite[];
    /** Other applications' data, under reverse-domain keys; kept and never read. */
    readonly extensions?: Readonly<Record<string, unknown>>;
}

/** What `notes.add` takes. `id`, `time`, `author` and `edited` are graphty-element's to stamp. */
export interface NoteInput {
    readonly text: string;
    readonly targets: readonly NoteTargetInput[];
    /** Each cite is pinned to the result's current finished run. */
    readonly cites?: readonly { readonly result: ResultId }[];
    /** `type/subtype`, optionally with parameters in visible ASCII; at most 255 characters. */
    readonly mediaType?: string;
    /** Plain JSON under reverse-domain keys, at most 32 levels deep and 64 KB saved. */
    readonly extensions?: Readonly<Record<string, unknown>>;
}

/** A field left out is unchanged. `null` clears an optional field; `cites: []` clears the cites. */
export interface NotePatch {
    readonly text?: string;
    readonly targets?: readonly NoteTargetInput[];
    readonly cites?: readonly { readonly result: ResultId }[];
    readonly mediaType?: string | null;
    readonly extensions?: Readonly<Record<string, unknown>> | null;
}

/** What one target of a note points at now. */
export interface NoteTargetStatus {
    /** OPEN UNION: values may be added in a minor release. */
    readonly state: "present" | "filtered" | "missing" | "earlier-run" | "unsupported";
    /** Text to show for it, never markup. Display text, not a contract. */
    readonly label: string;
}

/** What one cite of a note points at now. */
export interface NoteCiteStatus {
    /** OPEN UNION. */
    readonly state: "current" | "earlier-run" | "missing" | "unsupported";
    readonly label: string;
}

/** What a note's targets and cites point at now, worked out when read. */
export interface NoteStatus {
    /** One per entry of `note.targets`, in the same order. */
    readonly targets: readonly NoteTargetStatus[];
    /** One per entry of `note.cites`, in the same order; empty when the note cites nothing. */
    readonly cites: readonly NoteCiteStatus[];
    /** Present when the note came from an opened file: which one, and when. */
    readonly source?: { readonly name?: string; readonly opened: string };
}

/** One note a write touched, published as `note:changed`. Frozen. */
export interface NoteChange {
    readonly id: NoteId;
    /** OPEN UNION. */
    readonly change: "created" | "updated" | "removed";
    /** Which fields an "updated" change touched; empty otherwise. OPEN UNION. */
    readonly fields: readonly ("text" | "targets" | "cites" | "mediaType" | "extensions")[];
    /** The frozen record after the change; null after removal. Not in the DOM event's detail. */
    readonly note: Note | null;
    /** OPEN UNION: a write, a history move, or a saved project being opened. */
    readonly cause: "command" | "undo" | "redo" | "load";
}

/** Options of `notes.list`. */
export interface NoteListOptions {
    /**
     * Only notes about this target, or about any of these. Exact: a note about a set is not
     * listed under its members, and a note citing a result is not listed under the result.
     */
    readonly target?: NoteTargetInput | readonly NoteTargetInput[];
    /** Only notes with at least one target of this kind ("node", "edge", ...). */
    readonly targetKind?: string;
    /** Only notes citing this result, whichever run they cite. */
    readonly cites?: ResultId;
    /** Only notes with exactly this author. */
    readonly author?: string;
    /** True: only notes with at least one target reading `missing`. */
    readonly missing?: boolean;
}

/**
 * A session's notes as a saved `graphty-notes` member, version 1 (design/documents/notes.md). A
 * bare member is also a valid `.graphty.json` file.
 */
export interface NotesDocument {
    readonly kind: "graphty-notes";
    readonly version: 1;
    /** At most 1,024 characters. */
    readonly name?: string;
    /** At most 65,536 characters. */
    readonly description?: string;
    /** Oldest first: by time, then by id. At most 10,000. */
    readonly notes: readonly Note[];
    /** Data for other software, under reverse-domain keys. */
    readonly extensions?: Readonly<Record<string, unknown>>;
}

/** One thing a report says about a document: where, why, and its code. */
export interface Problem {
    /** Where: a JSON pointer into the document (`/notes/3/time`). */
    readonly what: string;
    /** One sentence a person can act on. */
    readonly reason: string;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly code: GraphtyErrorCode | GraphtyWarningCode;
}

/** What `notes.mergeDocument` takes beside the member. */
export interface NoteMergeOptions {
    /**
     * When a saved note and a held note share an id but disagree. Default `"keep-both"`: the saved
     * note is added under a new id. `"replace"` overwrites the held note; `"keep-mine"` keeps it.
     */
    readonly onConflict?: "keep-both" | "replace" | "keep-mine";
    /** What to call the source in each note's status and in the history: usually the file name. */
    readonly name?: string;
}

/** What `notes.mergeDocument` did. Frozen. */
export interface NotesReport {
    /** Every note added, in file order: new ids, and the new ids of `renamed` copies. */
    readonly added: readonly NoteId[];
    /** Notes whose content a held note already had. */
    readonly unchanged: number;
    /** `"keep-both"`: saved notes whose id was held with other content, added under a new id. */
    readonly renamed: readonly { readonly from: NoteId; readonly to: NoteId }[];
    /** `"keep-both"`: saved notes a held note is a later edit of; not added. */
    readonly older: readonly NoteId[];
    /** `"replace"`: held notes the saved ones replaced. */
    readonly replaced: readonly NoteId[];
    /** `"keep-mine"`: held notes the saved ones disagreed with. */
    readonly kept: readonly NoteId[];
    /** Added or replaced notes with at least one target reading `missing`. */
    readonly missing: number;
    /** Notes that fail the schema, each skipped alone with `E_BAD_DOCUMENT` and its pointer. */
    readonly skipped: readonly Problem[];
    /** Unknown fields kept (`W_UNKNOWN_MEMBER`), and times far in the future (`W_FUTURE_TIME`). */
    readonly notices: readonly Problem[];
}

/**
 * The session's notes: text people write about the graph, its nodes and edges, kept sets and
 * results, stored, undone and redone with everything else. graphty-element never interprets a
 * note's text.
 */
export interface NotesApi {
    /**
     * Notes, newest first: by `time`, then by `id`. The same frozen objects until a note changes.
     * @param options - Filters; every one given must hold.
     * @returns The notes.
     */
    list(options?: NoteListOptions): readonly Note[];
    /**
     * One note.
     * @param id - Its id.
     * @returns The note, or undefined when no note has that id.
     */
    get(id: NoteId): Note | undefined;
    /**
     * What each target and cite of a note points at now. Synchronous.
     * @param id - The note.
     * @returns The status, frozen.
     * @throws A `GraphtyError` `E_BAD_COMMAND` with `details.reason` `"unknown-id"`.
     */
    status(id: NoteId): NoteStatus;
    /** @returns The distinct authors of the session's notes, in the order of their first note. */
    authors(): readonly string[];
    /** @returns How many notes, and how many distinct nodes and edges in the graph have at least one. */
    counts(): { readonly notes: number; readonly nodes: number; readonly edges: number };
    /**
     * Write a note. One undoable step, labeled "Added note".
     * @param input - The note.
     * @returns The new note's id.
     * @throws A `GraphtyError` (`E_BAD_COMMAND` or `E_TOO_LARGE`) whose `details.reason` says why;
     *     nothing changes then.
     */
    add(input: NoteInput): NoteId;
    /**
     * Change a note. One undoable step, labeled "Edited note"; stamps `edited`. A change that
     * changes nothing records nothing.
     * @param id - The note.
     * @param patch - What to change.
     */
    update(id: NoteId, patch: NotePatch): void;
    /**
     * Delete a note. One undoable step, labeled "Removed note"; undo brings it back with the same id.
     * @param id - The note.
     */
    remove(id: NoteId): void;
    /**
     * The session's notes as a `graphty-notes` member, ready to save as JSON: oldest first, the
     * same bytes for the same notes. Where a note was opened from is never written.
     * @param options - The member's `name` and `description`.
     * @param options.name - Its name, at most 1,024 characters.
     * @param options.description - Its description, at most 65,536 characters.
     * @returns The member.
     * @throws A `GraphtyError` `E_BAD_COMMAND` for a name over 1,024 or a description over 65,536
     *     characters.
     */
    toDocument(options?: { readonly name?: string; readonly description?: string }): NotesDocument;
    /**
     * Add a saved member's notes to the session's, in one undoable step labeled "Added notes from
     * <name>". Never deletes a note. A note whose id is held with other content is added under a
     * new id by default (`onConflict`). A note that fails the schema is skipped alone. A set,
     * result or item target, or a cite, read from a member binds to nothing here: it reads
     * `missing`, because two projects can share a set or result id.
     * @param document - The member, parsed from JSON.
     * @param options - What to do on a conflicting id, and the source's name.
     * @returns The report.
     * @throws A `GraphtyError`, and nothing changes: `E_BAD_DOCUMENT` for what is not a
     *     `graphty-notes` member, `E_UNSUPPORTED_VERSION` for another version, `E_TOO_LARGE` past
     *     10,000 notes.
     */
    mergeDocument(document: unknown, options?: NoteMergeOptions): NotesReport;
}
