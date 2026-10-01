/**
 * @file The note ops: `note.add`, `note.update` and `note.remove`. Each is one undoable step on
 * the `notes` slice, keyed `notes/<id>`, on the immediate lane, so the slice is written before the
 * dispatch returns. See design/notes/notes-design.md sections 5 and 8.1.
 *
 * `note.add` carries the input only. Its body mints the id, stamps the time and the author
 * setting, and records the whole note, so a redo puts back exactly the record that was written
 * and never mints again. `note.update` stamps `edited`, and records nothing when the patch
 * changes nothing.
 */

import type { EdgeId, EdgeMember, ResultId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import { planMerge, readMember } from "../notes/document";
import { mintNoteId, noteTime } from "../notes/ids";
import type { Note, NoteId, NoteInput, NoteMergeOptions, NotePatch, NotesReport } from "../notes/types";
import { buildNote, codePoints, type NoteContext, patchNote, refuseNote } from "../notes/validate";
import type { UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import type { NoteEntry } from "../project/state";

/** `note.add`: write a note. */
interface NoteAddCommand {
    readonly op: "note.add";
    readonly note: NoteInput;
}

/** `note.update`: change a note. */
interface NoteUpdateCommand {
    readonly op: "note.update";
    readonly id: NoteId;
    readonly patch: NotePatch;
}

/** `note.remove`: delete a note. */
interface NoteRemoveCommand {
    readonly op: "note.remove";
    readonly id: NoteId;
}

/** `note.merge`: add a saved member's notes. */
interface NoteMergeCommand {
    readonly op: "note.merge";
    /** The `graphty-notes` member, parsed from JSON. */
    readonly document: unknown;
    readonly options?: NoteMergeOptions;
}

/** Every note op. */
export type NoteCommand = NoteAddCommand | NoteUpdateCommand | NoteRemoveCommand | NoteMergeCommand;

/** What a note op reads of the session beyond project state: its graph and its runs. */
export interface NoteService {
    /** The stable form of a session edge id, or undefined when the graph does not hold it. */
    edgeMember(id: EdgeId): EdgeMember | undefined;
    /** A result: undefined when unknown; else the token of its current finished run, if any. */
    result(id: ResultId): { readonly execution: string | undefined } | undefined;
    /** Notes as `toDocument` writes them, so a merge compares a held note in its saved form. */
    saved(notes: readonly Note[]): Note[];
    /** Told the id each `note.add` minted, as it is written: how `session.notes.add` returns it. */
    added(id: NoteId): void;
    /** Told what each `note.merge` did, its missing count still to work out: how `mergeDocument` reports. */
    merged(report: Omit<NotesReport, "missing">): void;
}

/**
 * The service, or the refusal of a dispatcher that keeps no notes.
 * @param ctx - The command's context.
 * @returns The service.
 */
function serviceOf(ctx: UndoableContext): NoteService {
    const service = ctx.services.notes;
    if (service === undefined) {
        throw new GraphtyError({ code: "E_UNSUPPORTED", message: "This session keeps no notes.", source: "data" });
    }

    return service;
}

/**
 * What a note write checks its input against.
 * @param ctx - The command's context.
 * @returns The context.
 */
function contextOf(ctx: UndoableContext): NoteContext {
    const service = serviceOf(ctx);
    return {
        count: ctx.state.notes.size,
        set: (id) => ctx.state.sets.get(id),
        edgeMember: (id) => service.edgeMember(id),
        result: (id) => service.result(id),
    };
}

/**
 * The note an op names, or the refusal of an id the session does not hold.
 * @param ctx - The command's context.
 * @param id - The id.
 * @returns The note's entry.
 */
function heldNote(ctx: UndoableContext, id: NoteId): NoteEntry {
    const entry = typeof id === "string" ? ctx.state.notes.get(id) : undefined;
    if (entry === undefined) {
        throw refuseNote("E_BAD_COMMAND", "unknown-id", `No note has the id ${JSON.stringify(id)}.`, { id });
    }

    return entry;
}

// The caller's input is kept by reference, never cloned: the record is a checked copy of it, and a
// value structured cloning cannot copy (a function in `extensions`) must be refused, not thrown on.
const BY_REFERENCE = ["note", "patch"];

const noteAdd: UndoableDefinition<NoteAddCommand> = {
    op: "note.add",
    moves: false,
    lane: { kind: "immediate" },
    byReference: BY_REFERENCE,
    keys: () => ["notes"],
    undo: { kind: "undoable", label: () => "Added note" },
    execute: (command, ctx) => {
        const now = Date.now();
        const id = mintNoteId(now);
        const author = ctx.state.config.get("author") as string | undefined;
        const note = buildNote(command.note, { id, time: noteTime(now), author }, contextOf(ctx));
        ctx.draft.notes.set(id, Object.freeze({ note }));
        serviceOf(ctx).added(id);
        return id;
    },
};

const noteUpdate: UndoableDefinition<NoteUpdateCommand> = {
    op: "note.update",
    moves: false,
    lane: { kind: "immediate" },
    byReference: BY_REFERENCE,
    keys: (command) => [`notes/${command.id}`],
    undo: { kind: "undoable", label: () => "Edited note" },
    execute: (command, ctx) => {
        const entry = heldNote(ctx, command.id);
        const note = patchNote(entry.note, command.patch, noteTime(), contextOf(ctx));
        if (note !== null) {
            // Targets or cites the edit rewrote were checked against this session, so they bind here.
            const unbound = entry.unbound && {
                targets: entry.unbound.targets && note.targets === entry.note.targets,
                cites: entry.unbound.cites && note.cites === entry.note.cites,
            };
            ctx.draft.notes.set(command.id, Object.freeze({ ...entry, note, unbound }));
        }
    },
};

const noteRemove: UndoableDefinition<NoteRemoveCommand> = {
    op: "note.remove",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [`notes/${command.id}`],
    undo: { kind: "undoable", label: () => "Removed note" },
    execute: (command, ctx) => {
        heldNote(ctx, command.id);
        ctx.draft.notes.delete(command.id);
    },
};

/**
 * The name a merge records as its source: the option's, else the member's.
 * @param command - The merge.
 * @returns The name, if any.
 */
function sourceName(command: NoteMergeCommand): string | undefined {
    const given = command.options?.name;
    if (given !== undefined) {
        return given;
    }

    const { document } = command;
    const name =
        typeof document === "object" && document !== null
            ? Object.getOwnPropertyDescriptor(document, "name")?.value
            : undefined;
    return typeof name === "string" ? name : undefined;
}

const ON_CONFLICT = ["keep-both", "replace", "keep-mine"] as const;

const noteMerge: UndoableDefinition<NoteMergeCommand> = {
    op: "note.merge",
    moves: false,
    lane: { kind: "immediate" },
    byReference: ["document", "options"],
    keys: () => ["notes"],
    undo: {
        kind: "undoable",
        label: (command) => {
            const name = sourceName(command);
            return name === undefined ? "Added notes" : `Added notes from ${name}`;
        },
    },
    execute: (command, ctx) => {
        const { onConflict = "keep-both", name } = command.options ?? {};
        if (
            !ON_CONFLICT.includes(onConflict) ||
            (name !== undefined && (typeof name !== "string" || codePoints(name) > 1024))
        ) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message:
                    'mergeDocument takes onConflict "keep-both", "replace" or "keep-mine", and a name that is text of at most 1,024 characters.',
                source: "data",
                details: { option: ON_CONFLICT.includes(onConflict) ? "name" : "onConflict", values: ON_CONFLICT },
            });
        }

        const now = Date.now();
        const read = readMember(command.document, now);
        // A held note compares in its saved form, so opening what `toDocument` just wrote adds nothing.
        const entries = [...ctx.state.notes];
        const saved = serviceOf(ctx).saved(entries.map(([, entry]) => entry.note));
        const held = new Map(entries.map(([id, entry], at) => [id, { ...entry, note: saved[at] }]));
        const plan = planMerge(read.notes, held, onConflict, () => mintNoteId(now));
        const total = ctx.state.notes.size + plan.added.length;
        if (total > 10_000) {
            throw refuseNote("E_TOO_LARGE", "notes", "A session holds at most 10,000 notes.", { count: total });
        }

        const title = sourceName(command);
        const source = Object.freeze({ ...(title === undefined ? {} : { name: title }), opened: noteTime(now) });
        const unbound = Object.freeze({ targets: true, cites: true });
        for (const [id, note] of plan.writes) {
            ctx.draft.notes.set(id, Object.freeze({ note, source, unbound }));
        }

        const { writes: _writes, ...report } = plan;
        serviceOf(ctx).merged({ ...report, skipped: read.skipped, notices: read.notices });
    },
};

/** The note ops' definitions. */
export const NOTE_DEFINITIONS = [noteAdd, noteUpdate, noteRemove, noteMerge] as const;
