/**
 * The inspector's reads of graphty-element that more than one view shares.
 */

import { type GraphSession, type NodeId, RESULT_SHAPE_CONTRACTS, type Run, type RunResult } from "@graphty/graphty-element/session";

/** A finished run with its result, and the field its result is read by. */
export interface FinishedRun {
    readonly id: string;
    readonly label: string;
    readonly result: RunResult;
    readonly field: string;
}

/**
 * Every run that finished with a result, each with its primary field.
 * @param session - the session.
 * @returns the runs, oldest first.
 */
export function finishedRuns(session: GraphSession): FinishedRun[] {
    return session.runs.list().flatMap((run) => {
        const field = RESULT_SHAPE_CONTRACTS[run.shape].primaryField;
        return run.status === "succeeded" && run.result !== undefined && field !== null
            ? [{ id: run.id, label: run.label, result: run.result, field }]
            : [];
    });
}

/**
 * Selects one node alone.
 * @param session - the session.
 * @param id - the node.
 */
export function selectNode(session: GraphSession, id: NodeId): void {
    void session.selection.apply({ nodes: [id] });
}

/** The settings the reader changed in Made with and has not rerun yet. */
export type Draft = Readonly<Record<string, unknown>>;

/**
 * The run's settings with the reader's changes over them.
 * @param run - the run.
 * @param draft - the changes.
 * @returns the settings.
 */
export function settingsOf(run: Run, draft: Draft): Record<string, unknown> {
    return { ...run.params, ...draft };
}

/**
 * Whether the reader changed a setting since the run.
 * @param run - the run.
 * @param draft - the changes.
 * @returns true when a value differs from the one the run used.
 */
export function settingsChanged(run: Run, draft: Draft): boolean {
    return Object.entries(draft).some(([name, value]) => run.params[name] !== value);
}
