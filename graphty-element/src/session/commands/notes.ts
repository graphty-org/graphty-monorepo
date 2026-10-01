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
import { mintNoteId, noteTime } from "../notes/ids";
import type { NoteId, NoteInput, NotePatch } from "../notes/types";
import { buildNote, type NoteContext, patchNote, refuseNote } from "../notes/validate";
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

/** Every note op. */
export type NoteCommand = NoteAddCommand | NoteUpdateCommand | NoteRemoveCommand;

/** What a note op reads of the session beyond project state: its graph and its runs. */
export interface NoteService {
    /** The stable form of a session edge id, or undefined when the graph does not hold it. */
    edgeMember(id: EdgeId): EdgeMember | undefined;
    /** A result: undefined when unknown; else the token of its current finished run, if any. */
    result(id: ResultId): { readonly execution: string | undefined } | undefined;
    /** Told the id each `note.add` minted, as it is written: how `session.notes.add` returns it. */
    added(id: NoteId): void;
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
            ctx.draft.notes.set(command.id, Object.freeze({ ...entry, note }));
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

/** The note ops' definitions. */
export const NOTE_DEFINITIONS = [noteAdd, noteUpdate, noteRemove] as const;
