/**
 * The inspector's reads of graphty-element that more than one view shares.
 */

import {
    type Channel,
    type ExplainTarget,
    type GraphSession,
    type NodeId,
    RESULT_SHAPE_CONTRACTS,
    type Run,
    type RunResult,
} from "@graphty/graphty-element/session";

/** A finished run with its result, and the field its result is read by. */
interface FinishedRun {
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

/**
 * Which row a run's result makes it: a measure, or a grouping. Undefined until it has a result,
 * when the row keeps the kind it was opened as.
 * @param run - the run.
 * @returns the kind.
 */
export function rowKindOf(run: Run): "measure-row" | "run-row" | undefined {
    if (run.result === undefined) {
        return undefined;
    }
    return run.result.summary().groups === undefined ? "measure-row" : "run-row";
}

/**
 * What a run measures, as its shape's contract says: nodes, or edges for an edge metric.
 * @param run - the run.
 * @returns the noun.
 */
export function measuredNoun(run: Run): "node" | "edge" {
    const contract = RESULT_SHAPE_CONTRACTS[run.shape];
    const {
        edgeFields,
        nodeFields,
        primaryField: field,
    }: { edgeFields: readonly string[]; nodeFields: readonly string[]; primaryField: string | null } = contract;
    return field !== null && edgeFields.includes(field) && !nodeFields.includes(field) ? "edge" : "node";
}

/**
 * The color a node or edge is drawn in, as the row that won its color channel set it.
 * @param session - the session.
 * @param target - the node or edge.
 * @returns the color, or undefined when no row set one or the element is gone.
 */
export function swatchOf(session: GraphSession, target: ExplainTarget): string | undefined {
    const channel: Channel = "node" in target ? "node.color" : "edge.color";
    try {
        return hexOf(session.styles.explain(target).merged[channel]);
    } catch {
        // E_BAD_COMMAND: the element is gone.
        return undefined;
    }
}

/**
 * The `#rrggbb` of a color value as graphty-element paints it (a `ColorValue`, whose `hex` it
 * keeps beside the numbers).
 * @param value - a painted value.
 * @returns the hex, or undefined when the value is not a color.
 */
export function hexOf(value: unknown): string | undefined {
    if (typeof value === "object" && value !== null && "hex" in value && typeof value.hex === "string") {
        return value.hex;
    }
    return undefined;
}
