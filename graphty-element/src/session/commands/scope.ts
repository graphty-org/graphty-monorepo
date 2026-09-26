/**
 * @file The saved-scope ops: `scope.save` keeps a scope specification under a name, and
 * `scope.remove` forgets one. Each is one undoable step on the `scopes` slice.
 *
 * Both run on the immediate lane, so the slice is written when the command is dispatched. The id
 * `scope.save` mints is part of what the step recorded, so a redo puts back the same id, and
 * anything that names `{ set: id }` finds it again. The stored specification is the frozen copy
 * the dispatcher made of the command, never the caller's own object. See
 * design/undo/undo-design.md sections 3.1, 3.4 and 11.3.
 */

import type { Scope, ScopeId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableDefinition } from "../project/Dispatcher";
import type { SavedScopeRecord } from "../scope/ScopeApi";

/** `scope.save`: keep a specification under a name. `id` is minted from the name when absent. */
interface ScopeSaveCommand {
    readonly op: "scope.save";
    readonly name: string;
    readonly spec: Scope;
    readonly id?: ScopeId;
}

/** `scope.remove`: forget a saved scope. */
interface ScopeRemoveCommand {
    readonly op: "scope.remove";
    readonly id: ScopeId;
}

/** Every saved-scope op. */
export type ScopeCommand = ScopeSaveCommand | ScopeRemoveCommand;

/** The session's scope resolver, as `scope.save` reaches it. */
export interface ScopeService {
    /**
     * Check a save against the saved scopes and build the record it would store.
     * @param saved - The saved scopes now.
     * @param command - The save.
     * @returns The record, with its id minted when the command named none.
     */
    prepare(saved: ReadonlyMap<ScopeId, SavedScopeRecord>, command: ScopeSaveCommand): SavedScopeRecord;
}

/**
 * The refusal of an id nothing is saved under.
 * @param id - The id.
 * @param saved - The saved scopes, for the list of what is available.
 * @returns The error.
 */
export function unknownScopeError(id: ScopeId, saved: ReadonlyMap<ScopeId, unknown>): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `No saved scope is called "${id}", so there is nothing to remove.`,
        source: "run",
        target: { kind: "scope", id },
        details: { available: [...saved.keys()] },
    });
}

const scopeSave: UndoableDefinition<ScopeSaveCommand> = {
    op: "scope.save",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [command.id === undefined ? "scopes" : `scopes/${command.id}`],
    undo: { kind: "undoable", label: (command) => `Saved the scope "${command.name.trim()}"` },
    execute: (command, ctx) => {
        const service = ctx.services.scopes;
        if (service === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session holds no scope resolver, so it cannot save a scope.",
                source: "run",
            });
        }

        const record = service.prepare(ctx.state.scopes, command);
        ctx.draft.scopes.set(record.id, record);
        return record.id;
    },
};

const scopeRemove: UndoableDefinition<ScopeRemoveCommand> = {
    op: "scope.remove",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [`scopes/${command.id}`],
    undo: {
        kind: "undoable",
        label: (command, state) => `Removed the scope "${state.scopes.get(command.id)?.name ?? command.id}"`,
    },
    execute: (command, ctx) => {
        if (!ctx.state.scopes.has(command.id)) {
            throw unknownScopeError(command.id, ctx.state.scopes);
        }

        ctx.draft.scopes.delete(command.id);
    },
};

/** The saved-scope ops' definitions. */
export const SCOPE_DEFINITIONS = [scopeSave, scopeRemove] as const;
