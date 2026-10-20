/**
 * The project boundary: the moment the whole project is about to be replaced (a project file
 * opened, a replacing load, the graph cleared, a different source described). An internal hook,
 * fired before the change runs, so autosave can keep the work it replaces as an entry of its own.
 *
 * `history:changed` with reason `clear` is NOT a boundary: disposal and a consumer capping memory
 * clear the history too, and neither replaces the project.
 * @module session/project/boundary
 */

import type { DataSourceDescriptor } from "../types";

/** What crossed the boundary. */
export type BoundaryReason = "open" | "import" | "clear" | "source";

type Listener = (reason: BoundaryReason) => void;

const LISTENERS = new WeakMap<object, Set<Listener>>();

/**
 * Hear every project boundary of one session, before it changes anything.
 * @param session - The session.
 * @param listener - Called synchronously with the reason.
 * @returns Stops listening.
 */
export function onProjectBoundary(session: object, listener: Listener): () => void {
    let listeners = LISTENERS.get(session);
    if (listeners === undefined) {
        listeners = new Set();
        LISTENERS.set(session, listeners);
    }

    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Announce a project boundary.
 * @param session - The session about to be replaced.
 * @param reason - What replaces it.
 */
export function projectBoundary(session: object, reason: BoundaryReason): void {
    for (const listener of LISTENERS.get(session) ?? []) {
        listener(reason);
    }
}

/**
 * Whether a dispatched command replaces the project: a replacing import, a clear, or a source
 * that is not the one loaded (a new name for the same source is a rename, not a boundary).
 * @param command - The command, as dispatched.
 * @param command.op - Its op.
 * @param source - The source loaded now.
 * @returns The reason, or null for an ordinary command.
 */
export function boundaryOf(
    command: { readonly op: string },
    source: () => DataSourceDescriptor | null,
): BoundaryReason | null {
    const fields = command as {
        readonly op: string;
        readonly mode?: string;
        readonly mutation?: { readonly kind?: string };
        readonly source?: DataSourceDescriptor;
    };
    if (fields.op === "data.import") {
        return fields.mode === "merge" ? null : "import";
    }

    // A batch that replaces the project is announced before its first step: an import batched
    // behind a config.set (a file naming its nodes) replaces the project with that write.
    if (fields.op === "batch") {
        const steps = (command as { readonly steps?: readonly { readonly op: string }[] }).steps ?? [];
        for (const step of steps) {
            const reason = boundaryOf(step, source);
            if (reason !== null) {
                return reason;
            }
        }
        return null;
    }

    if (fields.op === "data.apply") {
        return fields.mutation?.kind === "clear" ? "clear" : null;
    }

    if (fields.op === "data.setSource") {
        const identity = (each: DataSourceDescriptor | null | undefined): string =>
            JSON.stringify([each?.type, each?.size, each?.config]);
        return identity(fields.source) === identity(source()) ? null : "source";
    }

    return null;
}
