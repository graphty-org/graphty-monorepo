/**
 * @file The kept-set ops: `set.create`, `set.rename`, `set.redefine`, `set.members`, `set.remove`
 * and `set.restore`. Each is one undoable step on the `sets` slice, keyed `sets/<id>`, on the
 * immediate lane, so the slice is written before the dispatch returns.
 *
 * The bodies are the pure prepare functions of `session/sets/prepare.ts`, reached through the
 * session's set service, which also refuses a rule the doors cannot keep (a cycle, the live
 * selection). A prepare that finds nothing to change writes nothing, so no step is recorded.
 *
 * `set.create` as a consumer sends it carries a definition and a name only. The element's own
 * doors mint the id and the order before they dispatch, and say what the set was created from,
 * so the recorded command carries all three; a redo replays the recorded patch and never mints.
 * The register of issued ids, the order high-water mark, the tombstones and the edge seeds sit
 * beside the slice and are never rewound (design/sets/undo-integration.md section 1).
 *
 * See design/undo/undo-design.md section 11.3.
 */

import type { SetCreatedFrom, SetDefinitionInput, SetId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import type { ProjectState } from "../project/state";
import type { ElementSet, SetMemberDelta } from "../sets/types";

/** `set.create`: keep a definition as a new set. */
interface SetCreateCommand {
    readonly op: "set.create";
    /** What the set holds: a fixed list, a rule or a path. Edges may be named by session id. */
    readonly definition: SetDefinitionInput;
    /** Its name; "Set N" (the smallest free N) when absent. */
    readonly name?: string;
}

/**
 * `set.create` as the element's own doors dispatch it: the id and the order already minted, and
 * what the set was created from. A consumer may not send these (design/sets 15.3, decision 2).
 */
export interface MintedSetCreateCommand extends SetCreateCommand {
    readonly id: SetId;
    readonly order: number;
    readonly createdFrom: SetCreatedFrom;
}

/** `set.rename`: give a set another name. */
interface SetRenameCommand {
    readonly op: "set.rename";
    readonly id: SetId;
    readonly name: string;
}

/** `set.redefine`: change what a set holds, keeping its id, name and order. */
interface SetRedefineCommand {
    readonly op: "set.redefine";
    readonly id: SetId;
    readonly definition: SetDefinitionInput;
}

/** `set.members`: add members to a fixed set, or take them out. */
interface SetMembersCommand {
    readonly op: "set.members";
    readonly id: SetId;
    readonly add?: SetMemberDelta;
    readonly remove?: SetMemberDelta;
}

/** `set.remove`: forget a set. What names it becomes detached rather than silently empty. */
interface SetRemoveCommand {
    readonly op: "set.remove";
    readonly id: SetId;
}

/** `set.restore`: bring a removed set back, with the record it had when it was removed. */
interface SetRestoreCommand {
    readonly op: "set.restore";
    readonly id: SetId;
}

/** Every kept-set op. */
export type SetCommand =
    | SetCreateCommand
    | SetRenameCommand
    | SetRedefineCommand
    | SetMembersCommand
    | SetRemoveCommand
    | SetRestoreCommand;

/**
 * The session's sets, as the set ops reach them: each call checks one command against the sets
 * held now and returns what to write, throwing a refusal before anything is written. Built by
 * `createSetsApi`.
 */
export interface SetService {
    /**
     * @param command - The create; minted by a door, or a consumer's, which is minted here.
     * @returns The record to write.
     */
    create(command: SetCreateCommand | MintedSetCreateCommand): ElementSet;
    /**
     * @param command - The rename.
     * @returns The record to write, or null when the name is the one it has.
     */
    rename(command: SetRenameCommand): ElementSet | null;
    /**
     * @param command - The redefinition.
     * @returns The record to write, or null when the definition is canonically the same.
     */
    redefine(command: SetRedefineCommand): ElementSet | null;
    /**
     * @param command - The member edit.
     * @returns The record to write, or null when nothing would change.
     */
    members(command: SetMembersCommand): ElementSet | null;
    /**
     * @param command - The removal.
     * @returns The id to delete.
     */
    remove(command: SetRemoveCommand): SetId;
    /**
     * @param command - The restore.
     * @returns The record to put back.
     */
    restore(command: SetRestoreCommand): ElementSet;
    /**
     * Keep a record's id in the issued-id register: called once the step that wrote it is recorded.
     * @param id - The id.
     */
    issue(id: SetId): void;
}

/**
 * The service, or the refusal of a session that keeps no sets.
 * @param ctx - The command's context.
 * @returns The service.
 */
function serviceOf(ctx: UndoableContext): SetService {
    const service = ctx.services.sets;
    if (service === undefined) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "This session keeps no sets.",
            source: "data",
        });
    }

    return service;
}

/**
 * What to call a set in a label.
 * @param state - The state the label reads.
 * @param id - The set.
 * @returns Its name, or its id when it has none.
 */
function nameOf(state: ProjectState, id: SetId): string {
    return state.sets.get(id)?.name ?? id;
}

/**
 * Write a prepared record, and register its id once the step is recorded.
 * @param ctx - The command's context.
 * @param record - The record, or null for a no-op.
 * @returns The record's id, or undefined for a no-op.
 */
function put(ctx: UndoableContext, record: ElementSet | null): SetId | undefined {
    if (record === null) {
        return undefined;
    }

    ctx.draft.sets.set(record.id, record);
    const service = serviceOf(ctx);
    ctx.after(`sets/issue/${record.id}`, () => {
        service.issue(record.id);
    });

    return record.id;
}

// A definition, and a member delta, are kept by reference: a fixed set of a million edges holds
// its members in typed columns, which a deep freeze of the command would walk and could not freeze.
const BY_REFERENCE = ["definition", "add", "remove"];

const setCreate: UndoableDefinition<SetCreateCommand> = {
    op: "set.create",
    moves: false,
    lane: { kind: "immediate" },
    byReference: BY_REFERENCE,
    keys: (command) => ["id" in command ? `sets/${String(command.id)}` : "sets"],
    undo: {
        kind: "undoable",
        label: (command) => (command.name === undefined ? "Created a set" : `Created the set "${command.name.trim()}"`),
    },
    execute: (command, ctx) => put(ctx, serviceOf(ctx).create(command)),
};

const setRename: UndoableDefinition<SetRenameCommand> = {
    op: "set.rename",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [`sets/${command.id}`],
    undo: {
        kind: "undoable",
        label: (command, state) => `Renamed the set "${nameOf(state, command.id)}" to "${command.name.trim()}"`,
    },
    execute: (command, ctx) => {
        put(ctx, serviceOf(ctx).rename(command));
    },
};

const setRedefine: UndoableDefinition<SetRedefineCommand> = {
    op: "set.redefine",
    moves: false,
    lane: { kind: "immediate" },
    byReference: BY_REFERENCE,
    keys: (command) => [`sets/${command.id}`],
    undo: { kind: "undoable", label: (command, state) => `Changed the set "${nameOf(state, command.id)}"` },
    execute: (command, ctx) => {
        put(ctx, serviceOf(ctx).redefine(command));
    },
};

const setMembers: UndoableDefinition<SetMembersCommand> = {
    op: "set.members",
    moves: false,
    lane: { kind: "immediate" },
    byReference: BY_REFERENCE,
    keys: (command) => [`sets/${command.id}`],
    undo: { kind: "undoable", label: (command, state) => `Changed the members of "${nameOf(state, command.id)}"` },
    execute: (command, ctx) => {
        put(ctx, serviceOf(ctx).members(command));
    },
};

const setRemove: UndoableDefinition<SetRemoveCommand> = {
    op: "set.remove",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [`sets/${command.id}`],
    undo: { kind: "undoable", label: (command, state) => `Removed the set "${nameOf(state, command.id)}"` },
    execute: (command, ctx) => {
        ctx.draft.sets.delete(serviceOf(ctx).remove(command));
    },
};

const setRestore: UndoableDefinition<SetRestoreCommand> = {
    op: "set.restore",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [`sets/${command.id}`],
    undo: { kind: "undoable", label: (command) => `Restored the set "${command.id}"` },
    execute: (command, ctx) => {
        put(ctx, serviceOf(ctx).restore(command));
    },
};

/** The kept-set ops' definitions. */
export const SET_DEFINITIONS = [setCreate, setRename, setRedefine, setMembers, setRemove, setRestore] as const;
