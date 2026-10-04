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

    it("hides and shows the paint of one group, as one undoable step (#907)", async () => {
        const harness = makeSession({ runs: { execute: partition } });
        harness.add(MEMBERSHIP.map(([id]) => ({ id })));
        const result = await harness.session.runs.start("louvain", {}, { style: false });
        const { styles } = harness.session;
        const layer = await styles.encode({ run: result.runId, channel: "node.color" });
        const painter = (node: string): string | undefined =>
            styles.explain({ node }).channels.find((entry) => entry.channel === "node.color")?.layerId;
        const swatchOf = (value: unknown) =>
            styles
                .legend()
                .find((entry) => entry.layerId === layer.id)
                ?.swatches.find((swatch) => swatch.value === value);
        const colour = swatchOf(2)?.color;
        assert.strictEqual(painter("a"), layer.id, "group 2 is painted by the run's layer");

        const hidden = await styles.setValueHidden(layer.id, "node.color", 2, true);

        assert.deepStrictEqual((hidden.encode?.["node.color"] as { hidden?: unknown }).hidden, [2]);
        assert.notStrictEqual(painter("a"), layer.id, "a node of the hidden group is left to the layers beneath");
        assert.strictEqual(painter("d"), layer.id, "every other group is still painted");
        assert.isTrue(swatchOf(2)?.hidden, "the legend keeps the row, marked hidden");
        assert.strictEqual(swatchOf(2)?.color, colour, "with the colour it comes back in");
        assert.isUndefined(swatchOf(10)?.hidden);
        const saved = styles.toDocument().layers.find((entry) => entry.name === layer.name);
        assert.deepStrictEqual(
            (saved?.encode?.["node.color"] as { hidden?: unknown }).hidden,
            [2],
            "the saved style document keeps it",
        );

        await harness.session.undo();
        assert.strictEqual(painter("a"), layer.id, "undo paints the group again");
        assert.isUndefined(swatchOf(2)?.hidden);

        await styles.setValueHidden(layer.id, "node.color", "2", true);
        await styles.setValueHidden(layer.id, "node.color", 2, false);
        assert.strictEqual(painter("a"), layer.id, '2 and "2" are one value, so showing it clears it');
        assert.isUndefined((styles.get(layer.id)?.encode?.["node.color"] as { hidden?: unknown }).hidden);
        harness.session.dispose();
    });
    it("hides a value only in the bindings that read its field", async () => {
        const harness = makeSession({ runs: { execute: partition } });
        // Each node's weight equals its group, so a value of one field is also a value of the other.
        harness.add(MEMBERSHIP.map(([id, group]) => ({ id, weight: group })));
        const result = await harness.session.runs.start("louvain", {}, { style: false });
        const { styles } = harness.session;
        const layer = await styles.add({
            name: "group and weight",
            target: "node",
            selector: { match: "has", path: `results.${result.runId}.group` },
            encode: {
                "node.color": { by: `results.${result.runId}.group`, scale: "ordinal" },
                "node.size": { by: "data.weight", scale: "linear", range: [1, 4] },
            },
        });

        const hidden = await styles.setValueHidden(layer.id, "node.color", 2, true);

        assert.deepStrictEqual((hidden.encode?.["node.color"] as { hidden?: unknown }).hidden, [2]);
        assert.isUndefined(
            (hidden.encode?.["node.size"] as { hidden?: unknown }).hidden,
            "a weight of 2 is not community 2",
        );
        harness.session.dispose();
    });

    it("ranks a group in the legend as the run does when an order re-sorts the rows", async () => {
        const harness = makeSession({ runs: { execute: partition } });
        harness.add(MEMBERSHIP.map(([id]) => ({ id })));
        const result = await harness.session.runs.start("louvain", {}, { style: false });
        const { styles } = harness.session;
        const layer = await styles.add({
            name: "ordered groups",
            target: "node",
            selector: { match: "has", path: `results.${result.runId}.group` },
            encode: {
                "node.color": {
                    by: `results.${result.runId}.group`,
                    scale: "ordinal",
                    map: { "7": "#ff0000", "0": "#00ff00" },
                },
            },
        });
        const block = styles.legend().find((entry) => entry.layerId === layer.id);
        const summary = new Map((result.summary().groups ?? []).map((group) => [group.group, group.rank]));

        assert.deepStrictEqual(
            block?.swatches.map((swatch) => swatch.value),
            [0, 7, 2, 10],
            "the mapped groups come first",
        );
        for (const swatch of block?.swatches ?? []) {
            assert.strictEqual(
                swatch.rank,
                summary.get(swatch.value as string | number),
                `group ${String(swatch.value)}`,
            );
        }
        harness.session.dispose();
    });

    it("takes a hidden value out of the other row", async () => {
        const harness = makeSession({ runs: { execute: partition } });
        harness.add(MEMBERSHIP.map(([id]) => ({ id })));
        const result = await harness.session.runs.start("louvain", {}, { style: false });
        const { styles } = harness.session;
        const layer = await styles.add({
            name: "folded groups",
            target: "node",
            selector: { match: "has", path: `results.${result.runId}.group` },
            encode: {
                "node.color": {
                    by: `results.${result.runId}.group`,
                    scale: "ordinal",
                    other: { threshold: 3, value: "#888888" },
                },
            },
        });
        const swatches = () => styles.legend().find((entry) => entry.layerId === layer.id)?.swatches ?? [];
        assert.deepStrictEqual(swatches().at(-1)?.value, [0, 7], "0 and 7 fold into other");

        await styles.setValueHidden(layer.id, "node.color", 7, true);

        const other = swatches().at(-1);
        assert.strictEqual(other?.role, "other");
        assert.deepStrictEqual(other?.value, [0], "the other row holds only what it still paints");
        assert.strictEqual(other?.count, 2);
        const seven = swatches().find((swatch) => swatch.value === 7);
        assert.isTrue(seven?.hidden, "the hidden value has a row of its own, marked hidden");
        assert.strictEqual(seven?.color?.toLowerCase(), "#888888", "with the colour it comes back in");
        harness.session.dispose();
    });
});
