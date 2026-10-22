/**
 * @file `styles.agreement` with `over`: what lies beneath a row, read over the elements that row
 * matches rather than the whole graph, and, for a row that matches nothing, read from the layers
 * that match every element.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { StyleRow } from "../../src/session/styles/tree";
import { lesMiserables } from "../helpers/les-miserables";

/** The Les Miserables network, read once: the snapshot is frozen, so every test can share it. */
const LES_MISERABLES = await lesMiserables();

/**
 * A community run over Les Miserables: four groups, by node order.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function communities(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const ids = LES_MISERABLES.ids ?? [];

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
            measured: { nodes: ids.length, edges: 0 },
            nodes: ids.map((id, at) => ({ id, values: { group: at % 4 } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A session holding Les Miserables, which runs {@link communities} for any algorithm.
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    const sample = LES_MISERABLES;
    const ids = sample.ids ?? [];
    const session = createGraphSession({ runs: { execute: communities } });
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges([...sample.src].map((src, e) => ({ source: ids[src], target: ids[sample.dst[e]] })));

    return session;
}

/**
 * A top-level row by name.
 * @param session - The session.
 * @param name - The row's name.
 * @returns The row.
 */
function row(session: GraphSession, name: string): StyleRow {
    const found = session.styles.tree().find((each) => each.name === name);
    assert.isDefined(found, `a row named ${name}`);

    return found;
}

describe("what lies beneath a row, read over the row's own elements", () => {
    it("reads one agreeing color beneath a layer for one community, where the whole graph is mixed", async () => {
        const session = await lesMis();
        const { styles } = session;
        await session.runs.start("louvain", {});
        await styles.settled();
        const run = styles.list().find((each) => each.source.by === "run" && each.encode?.["node.color"]);
        assert.isDefined(run);
        const { by } = run?.encode?.["node.color"] as { by: string };

        const group = await styles.add({
            name: "New layer for Group 3",
            target: "node",
            selector: { match: "rule", where: { kind: "categories", attribute: by, values: ["3"] } },
            set: { "node.size": 3 },
        });
        await styles.settled();
        const below = group.row ?? group.id;

        const whole = styles.agreement("graph", "node.color", { below });
        assert.strictEqual(whole.channels[0]?.state, "mixed", "over the whole graph the communities differ");

        const over = styles.agreement("graph", "node.color", { below, over: below });
        const [color] = over.channels;
        assert.strictEqual(color?.state, "agree", "the group's own nodes all carry one color");
        assert.strictEqual(color?.state === "agree" ? color.layerId : undefined, run?.id);
        assert.strictEqual(over.readOver, "row");
    });

    it("answers an empty Selected row from the rows that match every element, and marks it so", async () => {
        const session = await lesMis();
        const { styles } = session;
        await session.config.set({ startingRows: true });
        await styles.writeRow(row(session, "Everything").id, { set: { color: "#888888" } });
        // A layer between them that paints only some nodes: an element entering the selection may
        // or may not be one of them, so it is not what lies beneath an empty row.
        await styles.add({
            name: "Some",
            target: "node",
            selector: { match: "ids", nodes: ["Valjean"] },
            set: { "node.color": "#ff0000" },
        });
        await styles.settled();
        const selected = row(session, "Selected").id;
        const everything = styles.list().find((each) => each.name === "Everything" && each.target === "node");

        const answer = styles.agreement("graph", "node.color", { below: selected, over: selected });
        const [color] = answer.channels;
        assert.strictEqual(answer.readOver, "everyElement");
        assert.strictEqual(color?.state, "agree");
        assert.strictEqual(
            ((color?.state === "agree" ? color.value : undefined) as { hex?: string } | undefined)?.hex,
            "#888888",
        );
        assert.strictEqual(color?.state === "agree" ? color.layerId : undefined, everything?.id);
    });

    it("never reports an empty Selected row as painted over", async () => {
        const session = await lesMis();
        const { styles } = session;
        await session.config.set({ startingRows: true });
        await styles.settled();

        for (const layer of styles.list().filter((each) => each.name === "Selected")) {
            const counts = styles.counts(layer.id);
            assert.strictEqual(counts.matched, 0);
            assert.deepStrictEqual([...counts.paintedBy], [], `${layer.target} part`);
        }
    });

    it("names the element's own base layer as the source of a channel no row sets", async () => {
        const session = await lesMis();
        const { styles } = session;
        await session.config.set({ startingRows: true });
        await styles.settled();
        const selected = row(session, "Selected").id;

        const [shape] = styles.agreement("graph", "node.shape", { below: selected, over: selected }).channels;
        assert.strictEqual(shape?.state, "agree");
        const layerId = shape?.state === "agree" ? shape.layerId : "";
        assert.strictEqual(styles.get(layerId)?.source.by, "element", "the element's own floor");
    });
});
