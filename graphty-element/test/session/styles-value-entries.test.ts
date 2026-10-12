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
 * A session holding the eleven nodes with a Louvain run colored by community.
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

describe("per-value entries", () => {
    it("lists a Louvain layer's communities, largest first, each with its size", async () => {
        const { harness, layer } = await louvainSession();
        const { styles } = harness.session;

        assert.deepStrictEqual(
            styles.categories(layer.id, "node.color").map((each) => [each.value, each.count, each.hidden]),
            [
                [0, 3, false],
                [1, 3, false],
                [3, 3, false],
                [2, 2, false],
            ],
        );
        assert.isTrue(
            styles.categories(layer.id, "node.color").every((each) => each.entry === undefined),
            "a value follows the palette until it is given an entry",
        );
        assert.deepStrictEqual(styles.categories(layer.id, "node.size"), [], "a channel it does not paint");
        harness.session.dispose();
    });

    it("keeps an entry when the palette changes, recolors the rest, and clearing it returns to the palette", async () => {
        const { harness, layer } = await louvainSession();
        const { styles } = harness.session;
        const paletteColor = colorOf(harness, layer, 3);

        await styles.setValueEntry(layer.id, "node.color", 3, "#123456");
        const before = colorOf(harness, layer, 0);
        const binding = styles.get(layer.id)?.encode?.["node.color"];
        assert.isDefined(binding);
        await styles.update(layer.id, {
            encode: { "node.color": { ...binding, palette: "tol-vibrant" } as NonNullable<typeof binding> },
        });

        assert.strictEqual(colorOf(harness, layer, 3), "#123456", "community 3 keeps its entry");
        assert.notStrictEqual(colorOf(harness, layer, 0), before, "community 0 takes the new palette");
        assert.strictEqual(
            styles.categories(layer.id, "node.color").find((each) => each.value === 3)?.entry,
            "#123456",
        );

        await styles.setValueEntry(layer.id, "node.color", 3, undefined);
        assert.notStrictEqual(colorOf(harness, layer, 3), "#123456", "clearing the entry drops it");
        assert.notStrictEqual(colorOf(harness, layer, 3), paletteColor, "and 3 takes the new palette's color");
        assert.isUndefined((styles.get(layer.id)?.encode?.["node.color"] as { map?: unknown }).map);
        harness.session.dispose();
    });

    it("moves an entry, a hidden value and a hand layer's rule to the community sharing most members on a re-run", async () => {
        const { harness, layer } = await louvainSession();
        const { styles, runs } = harness.session;
        await styles.setValueEntry(layer.id, "node.color", 3, "#123456");
        await styles.setValueHidden(layer.id, "node.color", 0, true);
        const hand = await styles.add({
            name: "Community 3",
            target: "node",
            selector: {
                match: "rule",
                where: { kind: "categories", attribute: "results.louvain.group", values: ["3"] },
            },
            set: { "node.size": 3 },
        });
        const item = await styles.add({
            name: "Community 2",
            target: "node",
            selector: {
                match: "rule",
                where: { kind: "item", item: { result: "louvain", key: { field: "group", value: 2 } } },
            },
            set: { "node.size": 2 },
        });

        membership = SECOND;
        await runs.start("louvain", {}, { style: false, seed: 7 });
        await styles.settled();

        const after = styles.get(layer.id);
        const color = after?.encode?.["node.color"] as { map?: unknown; hidden?: unknown };
        assert.deepStrictEqual(color.map, { 1: "#123456" }, "old community 3 (i, j, k) is new community 1");
        assert.deepStrictEqual(color.hidden, [2], "old community 0 (a, b, c) is new community 2");
        assert.strictEqual(colorOf(harness, layer, 1), "#123456");
        assert.deepStrictEqual(
            (styles.get(hand.id)?.selector as { where?: unknown }).where,
            { kind: "categories", attribute: "results.louvain.group", values: ["1"] },
            "the hand layer's rule follows community 3 too",
        );
        assert.deepStrictEqual(
            (styles.get(item.id)?.selector as { where?: unknown }).where,
            { kind: "item", item: { result: "louvain", key: { field: "group", value: 3 } } },
            "an item of the run's current result follows its group",
        );
        assert.deepStrictEqual(
            after?.unmatched,
            [{ code: "group.new", params: { path: "results.louvain.group", value: 4 } }],
            "the community f moved to is new",
        );
        assert.isUndefined(styles.get(hand.id)?.unmatched, "a rule naming no lost group reports nothing");
        assert.sameMembers(
            styles.categories(layer.id, "node.color").map((each) => each.value),
            [0, 1, 2, 3, 4],
        );
        harness.session.dispose();
    });

    it("gives a data column's categories entries the same way, saved with the layer", async () => {
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

        await styles.setValueEntry(layer.id, "node.color", "blue", "#00ff00");

        assert.deepStrictEqual(
            styles.categories(layer.id, "node.color").map((each) => [each.value, each.count, each.entry]),
            [
                ["red", 2, undefined],
                ["blue", 1, "#00ff00"],
            ],
        );
        assert.strictEqual(colorOf(harness, layer, "blue"), "#00ff00");
        assert.deepStrictEqual(
            (styles.toDocument().layers[0]?.encode?.["node.color"] as { map?: unknown }).map,
            { blue: "#00ff00" },
            "the entry is saved",
        );
        harness.session.dispose();
    });

    it("refuses an entry on a channel the layer does not paint from a value", async () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        const { styles } = harness.session;
        const fixed = await styles.add({
            name: "Fixed",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });

        const error = await styles.setValueEntry(fixed.id, "node.color", "x", "#00ff00").then(
            () => null,
            (caught: unknown) => caught as { code?: string; details?: { reason?: string } },
        );

        assert.strictEqual(error?.code, "E_BAD_COMMAND");
        assert.strictEqual(error?.details?.reason, "not-bound");
        harness.session.dispose();
    });
});
