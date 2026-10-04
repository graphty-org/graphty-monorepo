/**
 * What every workspace component reads: the chrome store, the command registry, and the element
 * with its session once it has come up.
 */

import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { createContext, useContext } from "react";

import type { Command, CommandContext, WorkspaceCommands } from "../commands/registry";
import { useStoreValue, type WorkspaceState, type WorkspaceStore } from "./store";

/** The workspace context's value. */
export interface WorkspaceValue extends CommandContext {
    readonly store: WorkspaceStore;
    readonly registry: WorkspaceCommands;
    /**
     * Runs a command by id, unless it is a stub or disabled.
     * @param id - the command id.
     */
    run: (id: string) => void;
}

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/**
 * The workspace context.
 * @returns the store, registry, session and element.
 */
export function useWorkspace(): WorkspaceValue {
    const value = useContext(WorkspaceContext);
    if (value === null) {
        throw new Error("useWorkspace must be used inside <Workspace>");
    }
    return value;
}

/**
 * Reads one value of the chrome state.
 * @param select - picks the value.
 * @returns the value, re-read on every change.
 */
export function useWorkspaceState<T>(select: (state: WorkspaceState) => T): T {
    return useStoreValue(useWorkspace().store, select);
}

/** A door's view of one command. */
interface CommandDoor {
    readonly command: Command;
    /** Why it cannot run now, or null. */
    readonly disabledReason: string | null;
    /** Runs it. */
    readonly run: () => void;
}

/**
 * One built command for a door, or null when it is a stub or not registered (so the door is not
 * drawn).
 * @param id - the command id.
 * @returns the door's view, re-read on each render.
 */
export function useCommand(id: string): CommandDoor | null {
    const workspace = useWorkspace();
    // Re-render on chrome changes, which is what most `disabled` checks read.
    useStoreValue(workspace.store, (state) => state);
    const command = workspace.registry.built(id);
    if (command === undefined) {
        return null;
    }
    return {
        command,
        disabledReason: command.disabled?.(workspace) ?? null,
        run: () => {
            workspace.run(id);
        },
    };
}

/**
 * The context value for a store, registry, session and element.
 * @param store - the chrome store.
 * @param registry - the commands.
 * @param session - the element's session, or null.
 * @param element - the element, or null.
 * @returns the value.
 */
export function makeWorkspaceValue(
    store: WorkspaceStore,
    registry: WorkspaceCommands,
    session: GraphSession | null,
    element: GraphtyElement | null,
): WorkspaceValue {
    const value: WorkspaceValue = {
        store,
        registry,
        session,
        element,
        workspace: store,
        run: (id) => {
            const command = registry.built(id);
            if (command === undefined || (command.disabled?.(value) ?? null) !== null) {
                return;
            }
            const outcome = command.run(value);
            if (outcome instanceof Promise) {
                outcome.catch((error: unknown) => {
                    const reason = error instanceof Error ? error.message : String(error);
                    store.set({ notice: { message: `${command.label} failed: ${reason}` } });
                });
            }
        },
    };
    return value;
}
