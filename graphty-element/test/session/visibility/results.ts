/**
 * @file Hand-built run results for the leaves that read them: a test names what each run
 * publishes per node and per edge, and a harness session runs them under the ids it chose.
 */

import type { EdgeId, NodeId, ResultShape } from "../../../src/catalog/types";
import type { RunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { stubResult } from "../runs/harness";

/** What one run publishes. */
export interface Published {
    readonly shape: ResultShape;
    /** Per node: id to its values. */
    readonly nodes?: ReadonlyMap<NodeId, Readonly<Record<string, unknown>>>;
    /** Per edge: session edge id to its values. */
    readonly edges?: ReadonlyMap<EdgeId, Readonly<Record<string, unknown>>>;
}

/**
 * A result carrying the given values, with a field descriptor per field name and half.
 * @param runId - The run.
 * @param published - What it publishes.
 * @returns The result.
 */
export function resultOf(runId: string, published: Published): RunResult {
    const fields = [];
    for (const [kind, table] of [
        ["node", published.nodes],
        ["edge", published.edges],
    ] as const) {
        const names = new Set<string>();
        for (const values of table?.values() ?? []) {
            for (const name of Object.keys(values)) {
                names.add(name);
            }
        }

        for (const name of names) {
            fields.push({ name, plainName: name, technicalName: name, kind, type: "number" as const, path: `results.${runId}.${name}` });
        }
    }

    return {
        ...stubResult(runId),
        shape: published.shape,
        fields,
        node: (id: NodeId) => published.nodes?.get(id),
        edge: (id: EdgeId) => published.edges?.get(id),
    };
}

/**
 * An executor that publishes, for each run id, what the table says at the moment it runs.
 * @param table - What each run publishes, read on every execution so a re-run can change it.
 * @returns The executor.
 */
export function publishing(table: Map<string, Published>): (context: RunExecutionContext) => Promise<RunOutcome> {
    return (context) => {
        const published = table.get(context.runId);
        if (published === undefined) {
            throw new Error(`nothing to publish for ${context.runId}`);
        }

        return Promise.resolve({ result: resultOf(context.runId, published) });
    };
}
