/**
 * @file The starting rows (Everything, Selected and Hovered) behind the `startingRows` project
 * setting, the `{ match: "state" }` selector they read, `styles.restoreStartingRows()`, and the
 * `runPlacement` setting that puts a run's layer on top of the reader's rows.
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

/**
 * The layer of a row painting one kind.
 * @param session - The session.
 * @param name - The row's name.
 * @param target - Which kind.
 * @returns The layer's id.
 */
function part(session: GraphSession, name: string, target: "node" | "edge"): string {
    const layer = session.styles.list().find((each) => each.name === name && each.target === target);
    assert.isDefined(layer, `${name} paints ${target}s`);

    return layer?.id ?? "";
}

describe("the starting rows", () => {
    it("are absent by default, so nothing changes for a consumer that does not ask", async () => {
        const session = await lesMis();

        assert.isFalse(session.config.startingRows);
        assert.strictEqual(session.config.runPlacement, "beneath");
        assert.deepStrictEqual(session.styles.tree(), []);
    });

    it("arrive with the setting in one step: Everything pinned to the bottom, Selected and Hovered to the top", async () => {
        const session = await lesMis();

        await session.config.set({ startingRows: true });
        await session.styles.settled();

        assert.deepStrictEqual(
            session.styles.tree().map((each) => [each.name, each.pin]),
            [
                ["Everything", "bottom"],
                ["Selected", "top"],
                ["Hovered", "top"],
            ],
            "bottom first",
        );
        assert.strictEqual(
            session.styles.list().find((each) => each.name === "Hovered" && each.target === "edge"),
            undefined,
            "Hovered paints nodes only",
        );

        // A layer added later lands between them.
        await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        assert.deepStrictEqual(
            session.styles.tree().map((each) => each.name),
            ["Everything", "Mine", "Selected", "Hovered"],
        );

        await session.undo();
        await session.undo();
        assert.isFalse(session.config.startingRows);
        assert.deepStrictEqual(session.styles.tree(), [], "one undo takes the setting and its rows back");
    });

    it("Selected follows the selection with no step, and draws a two-tone ring as a halo and a band", async () => {
        const session = await lesMis();
        await session.config.set({ startingRows: true });
        const node = part(session, "Selected", "node");
        const edge = part(session, "Selected", "edge");
        const steps = session.history.steps.length;

        assert.strictEqual(session.styles.counts(node).matched, 0, "nothing is selected yet");

        await session.selection.apply({ ids: ["Valjean"] });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(node).matched, 1);
        assert.strictEqual(session.styles.counts(node).painted["node.haloColor"], 1);
        assert.deepStrictEqual(session.styles.get(node)?.set, {
            "node.haloColor": "#FFD700",
            "node.haloScale": 1.45,
            "node.haloOpacity": 1,
            "node.glow": "#111111",
        });

        await session.selection.apply({ scope: { define: { kind: "path", nodes: ["Valjean", "Javert"] } } });
        await session.styles.settled();
        assert.isAbove(session.selection.edges.length, 0);
        assert.strictEqual(session.styles.counts(edge).matched, session.selection.edges.length);
        assert.strictEqual(session.styles.counts(edge).painted["edge.bandColor"], session.selection.edges.length);

        session.selection.clear();
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(node).matched, 0, "deselecting leaves Selected matching nothing");
        assert.strictEqual(session.styles.counts(edge).matched, 0);
        assert.strictEqual(session.history.steps.length, steps, "the selection is view state, never a step");
    });

    it("Hovered follows the node under the pointer", async () => {
        const session = await lesMis();
        await session.config.set({ startingRows: true });
        const node = part(session, "Hovered", "node");

        session.selection.hover("Javert");
        assert.strictEqual(session.selection.hovered, "Javert");
        assert.strictEqual(session.styles.counts(node).matched, 1);

        session.selection.hover(null);
        assert.strictEqual(session.styles.counts(node).matched, 0);
    });

    it("deleting Selected and restoring it are one undo step each, and it comes back in its place", async () => {
        const session = await lesMis();
        await session.config.set({ startingRows: true });
        const steps = session.history.steps.length;

        await session.styles.deleteRow(row(session, "Selected").id);
        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.deepStrictEqual(
            session.styles.tree().map((each) => each.name),
            ["Everything", "Hovered"],
        );

        const added = await session.styles.restoreStartingRows();
        assert.strictEqual(session.history.steps.length, steps + 2);
        assert.deepStrictEqual(
            added.map((each) => each.name),
            ["Selected"],
        );
        assert.deepStrictEqual(
            session.styles.tree().map((each) => [each.name, each.pin]),
            [
                ["Everything", "bottom"],
                ["Selected", "top"],
                ["Hovered", "top"],
            ],
        );

        // Nothing missing: no step.
        await session.styles.restoreStartingRows();
        assert.strictEqual(session.history.steps.length, steps + 2);

        await session.undo();
        assert.deepStrictEqual(
            session.styles.tree().map((each) => each.name),
            ["Everything", "Hovered"],
        );
    });
});

describe("run placement", () => {
    /**
     * A session with the starting rows and a fixed node color on Everything, then a Louvain run.
     * @param placement - The run placement.
     * @returns The session and how many nodes the run's color layer paints.
     */
    async function louvainOverEverything(placement: "beneath" | "top"): Promise<number> {
        const session = await lesMis();
        await session.config.set({ startingRows: true, runPlacement: placement });
        await session.styles.writeRow(row(session, "Everything").id, { set: { color: "#888888" } });

        await session.runs.start("louvain", {});
        await session.styles.settled();

        const layer = session.styles.list().find((each) => each.source.by === "run" && each.encode?.["node.color"]);
        if (layer === undefined) {
            return 0;
        }

        const names = session.styles.tree().map((each) => each.name);
        assert.isBelow(names.indexOf(layer.name), names.indexOf("Selected"), "the run lands below the pinned rows");

        return session.styles.counts(layer.id).painted["node.color"] ?? 0;
    }

    it("beneath (the default) lets a fixed Everything color hold a run back", async () => {
        assert.strictEqual(await louvainOverEverything("beneath"), 0);
    });

    it("top puts a run's groups over a fixed Everything color", async () => {
        assert.strictEqual(await louvainOverEverything("top"), LES_MISERABLES.ids?.length);
    });
});
