import { assert, describe, it } from "vitest";

import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { Layer } from "../../src/session/styles";
import { type Harness, makeSession } from "./helpers";

/** Which community each node falls in on the first run. */
const FIRST: Readonly<Record<string, number>> = { a: 0, b: 0, c: 0, d: 1, e: 1, f: 1, g: 2, h: 2, i: 3, j: 3, k: 3 };

/**
 * The second run: the same communities renumbered (0 is now 2, 1 is 0, 2 is 3, 3 is 1), except
 * that f leaves its community for a new one, 4.
 */
const SECOND: Readonly<Record<string, number>> = { a: 2, b: 2, c: 2, d: 0, e: 0, f: 4, g: 3, h: 3, i: 1, j: 1, k: 1 };

/** What the community run publishes next; the test swaps it before a re-run. */
let membership: Readonly<Record<string, number>> = FIRST;

/**
 * An executor that publishes {@link membership} as a community result.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function communities(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const nodes = Object.entries(membership);

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
            measured: { nodes: nodes.length, edges: 0 },
            nodes: nodes.map(([id, group]) => ({ id, values: { group } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * The colour a layer paints one value, read from its legend.
 * @param harness - The session.
 * @param layer - The layer.
 * @param value - The value.
 * @returns The colour.
 */
function colorOf(harness: Harness, layer: Layer, value: unknown): string | undefined {
    return harness.session.styles
        .legendOf(layer.id)
        .find((block) => block.channel === "node.color")
        ?.swatches.find((swatch) => swatch.value === value)?.color;
}

/**
 * A session holding the eleven nodes with a Louvain run coloured by community.
 * @returns The session and the run's colour layer.
 */
async function louvainSession(): Promise<{ harness: Harness; layer: Layer }> {
    membership = FIRST;
    const harness = makeSession({ runs: { execute: communities } });
    harness.add(Object.keys(FIRST).map((id) => ({ id })));
    const run = await harness.session.runs.start("louvain", {}, { style: false });
    const layer = await harness.session.styles.encode({ run: run.runId, channel: "node.color" });

    return { harness, layer };
}

describe("splitting a layer by value", () => {
    it("gives a Louvain layer one child per community", async () => {
        const { harness, layer } = await louvainSession();
        const { styles } = harness.session;

        const split = await styles.split(layer.id);

        assert.strictEqual(split.split?.by, "results.louvain.group");
        assert.sameMembers(
            styles.splitChildren(layer.id).map((child) => child.value),
            [0, 1, 2, 3],
        );
        assert.deepStrictEqual(
            styles.splitChildren(layer.id).map((child) => [child.value, child.count]),
            [
                [0, 3],
                [1, 3],
                [3, 3],
                [2, 2],
            ],
            "largest group first, each with its size",
        );
        assert.isTrue(
            styles.splitChildren(layer.id).every((child) => Object.keys(child.overrides).length === 0),
            "a new child follows the parent",
        );
        harness.session.dispose();
    });

    it("keeps a child's override when the parent's palette changes, and recolours the rest", async () => {
        const { harness, layer } = await louvainSession();
        const { styles } = harness.session;
        await styles.split(layer.id);

        await styles.setSplitOverride(layer.id, 3, "node.color", "#123456");
        const before = colorOf(harness, layer, 0);
        const binding = styles.get(layer.id)?.encode?.["node.color"];
        assert.isDefined(binding);
        await styles.update(layer.id, {
            encode: { "node.color": { ...binding, palette: "tol-vibrant" } as NonNullable<typeof binding> },
        });

        assert.strictEqual(colorOf(harness, layer, 3), "#123456", "community 3 keeps its own colour");
        assert.notStrictEqual(colorOf(harness, layer, 0), before, "community 0 takes the new palette");
        assert.deepStrictEqual(styles.splitChildren(layer.id).find((child) => child.value === 3)?.overrides, {
            "node.color": "#123456",
        });

        await styles.setSplitOverride(layer.id, 3, "node.color", undefined);
        assert.notStrictEqual(colorOf(harness, layer, 3), "#123456", "Follow parent drops the override");
        harness.session.dispose();
    });

    it("keeps an override on the community sharing most members after a re-run renumbers them", async () => {
        const { harness, layer } = await louvainSession();
        const { styles, runs } = harness.session;
        await styles.split(layer.id);
        await styles.setSplitOverride(layer.id, 3, "node.color", "#123456");

        membership = SECOND;
        await runs.start("louvain", {}, { style: false, seed: 7 });
        await styles.settled();

        const after = styles.get(layer.id);
        assert.deepStrictEqual(
            (after?.encode?.["node.color"] as { map?: unknown }).map,
            { 1: "#123456" },
            "old community 3 (i, j, k) is new community 1",
        );
        assert.strictEqual(colorOf(harness, layer, 1), "#123456");
        assert.deepStrictEqual(
            after?.split?.unmatched,
            [{ code: "split.group-new", params: { value: 4 } }],
            "the community f moved to is new",
        );
        assert.sameMembers(
            styles.splitChildren(layer.id).map((child) => child.value),
            [0, 1, 2, 3, 4],
        );
        harness.session.dispose();
    });

    it("splits a layer bound to a data column's categories the same way", async () => {
        const harness = makeSession();
        harness.add([
            { id: "a", team: "red" },
            { id: "b", team: "red" },
            { id: "c", team: "blue" },
        ]);
        const { styles } = harness.session;
        const layer = await styles.add({
            name: "Teams",
            target: "node",
            selector: { match: "has", path: "data.team" },
            encode: { "node.color": { by: "data.team", scale: "ordinal" } },
        });

        await styles.split(layer.id);
        await styles.setSplitOverride(layer.id, "blue", "node.color", "#00ff00");

        assert.sameMembers(
            styles.splitChildren(layer.id).map((child) => child.value),
            ["red", "blue"],
        );
        assert.strictEqual(colorOf(harness, layer, "blue"), "#00ff00");
        assert.strictEqual(styles.toDocument().layers[0]?.split?.by, "data.team", "the split is saved");
        harness.session.dispose();
    });

    it("turns overrides into value-table entries when unsplit", async () => {
        const { harness, layer } = await louvainSession();
        const { styles } = harness.session;
        await styles.split(layer.id);
        await styles.setSplitOverride(layer.id, 2, "node.color", "#abcdef");

        const unsplit = await styles.unsplit(layer.id);

        assert.isUndefined(unsplit.split);
        assert.deepStrictEqual((unsplit.encode?.["node.color"] as { map?: unknown }).map, { 2: "#abcdef" });
        assert.strictEqual(colorOf(harness, layer, 2), "#abcdef");
        assert.deepStrictEqual(styles.splitChildren(layer.id), []);
        harness.session.dispose();
    });

    it("refuses a layer with nothing to split by, and a channel the split does not paint", async () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        const { styles } = harness.session;
        const fixed = await styles.add({
            name: "Fixed",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });

        const error = await styles.split(fixed.id).then(
            () => null,
            (caught: unknown) => caught as { code?: string; details?: { reason?: string } },
        );

        assert.strictEqual(error?.code, "E_BAD_COMMAND");
        assert.strictEqual(error?.details?.reason, "no-categories");
        harness.session.dispose();

        const louvain = await louvainSession();
        await louvain.harness.session.styles.split(louvain.layer.id);
        const size = await louvain.harness.session.styles.setSplitOverride(louvain.layer.id, 0, "node.size", 3).then(
            () => null,
            (caught: unknown) => caught as { code?: string; details?: { reason?: string } },
        );

        assert.strictEqual(size?.details?.reason, "channel-not-split", "the layer paints no size by community");
        louvain.harness.session.dispose();
    });
});
