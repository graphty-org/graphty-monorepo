import { assert, describe, it } from "vitest";

import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { makeSession } from "./helpers";

/**
 * Which group each node falls in: groups 2 and 10 are equally the largest, then 0, then 7.
 *
 * The two ids that tie are the case that used to split the surfaces: compared as text "10" sorts
 * before "2", compared as numbers it does not.
 */
const MEMBERSHIP: readonly (readonly [string, number])[] = [
    ["a", 2],
    ["b", 2],
    ["c", 2],
    ["d", 10],
    ["e", 10],
    ["f", 10],
    ["g", 0],
    ["h", 0],
    ["i", 7],
];

/**
 * An executor that publishes the partition above as a community result.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function partition(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();

    return {
        result: createRunResult({
            runId: context.runId,
            shape: "community",
            fields: [
                {
                    name: "group",
                    plainName: "Group",
                    technicalName: "community",
                    kind: "node",
                    type: "integer",
                    path: `results.${context.runId}.group`,
                },
            ],
            measured: { nodes: MEMBERSHIP.length, edges: 0 },
            nodes: MEMBERSHIP.map(([id, group]) => ({ id, values: { group } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", notes: [] },
            durationMs: 1,
        }),
    };
}

describe("the names of a partition's groups", () => {
    it("are the same in the run's summary and in the legend of its colours", async () => {
        const harness = makeSession({ runs: { execute: partition } });
        harness.add(MEMBERSHIP.map(([id]) => ({ id })));

        const result = await harness.session.runs.start("louvain", {}, { style: false });
        await harness.session.styles.encode({ run: result.runId, channel: "node.color" });
        const groups = result.summary().groups ?? [];
        const block = harness.session.styles.legend().find((entry) => entry.runId === result.runId);

        assert.deepStrictEqual(
            groups.map((group) => [group.name, group.group]),
            [
                ["Group 1", 2],
                ["Group 2", 10],
                ["Group 3", 0],
                ["Group 4", 7],
            ],
            "largest first, and equal sizes ordered by id as a number",
        );
        assert.isDefined(block, "the groups were painted, so the legend has a block for them");
        assert.deepStrictEqual(
            block?.swatches.map((swatch) => [swatch.label, swatch.value]),
            groups.map((group) => [group.name, group.group]),
            "each swatch carries the summary's name and the group exactly as the summary spells it",
        );
        assert.deepStrictEqual(
            groups.map((group) => group.rank),
            [1, 2, 3, 4],
            "each group carries its place by size, the fact its name is worded from (#921)",
        );
        assert.deepStrictEqual(
            block?.swatches.map((swatch) => [swatch.rank, swatch.value]),
            groups.map((group) => [group.rank, group.group]),
            "the legend carries the same rank for the same group",
        );
        const sizes = result.graph.sizes as readonly { readonly group: unknown }[];
        assert.deepStrictEqual(
            sizes.map((row) => row.group),
            groups.map((group) => group.group),
            "the sizes table spells each group the same way (#906)",
        );
        for (const swatch of block?.swatches ?? []) {
            assert.isTrue(
                groups.some((group) => group.group === swatch.value),
                `the swatch value ${String(swatch.value)} matches a summary group with ===`,
            );
        }
        harness.session.dispose();
    });
});
