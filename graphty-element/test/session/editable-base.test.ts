/**
 * @file The `editableBase` project setting: the base look held by the Everything starting row as
 * ordinary values, the element's own base layers painting nothing, and an element no shown layer
 * paints left undrawn.
 */

import { assert, describe, it } from "vitest";

import type { Channel } from "../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { ElementSession } from "../../src/session/types";

/**
 * A run that puts each of the three nodes in its own group.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function groups(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const ids = ["a", "b", "c"];

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
            nodes: ids.map((id, at) => ({ id, values: { group: at } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A session with three nodes in a path.
 * @returns The session.
 */
async function triangle(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);

    return session;
}

/**
 * Repaint every layer, then read one channel for every element of one kind.
 * @param session - The session.
 * @param target - Nodes or edges.
 * @param channel - The channel.
 * @returns What each element is painted, by dense index.
 */
async function painted(session: GraphSession, target: "node" | "edge", channel: Channel): Promise<unknown[]> {
    const element = session as ElementSession;
    await element.paint.repaintAll(element.styles.compiled(), {
        signal: new AbortController().signal,
        report: () => undefined,
    });
    const snapshot = session.data.snapshot();
    const count = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;

    return Array.from({ length: count }, (_, index) => element.paint.styleOf(target, index)[channel]);
}

/**
 * The Everything row.
 * @param session - The session.
 * @returns Its id.
 */
function everything(session: GraphSession): string {
    const row = session.styles.tree().find((each) => each.name === "Everything");
    assert.isDefined(row, "an Everything row");

    return row.id;
}

describe("editableBase", () => {
    it("is off by default, and the element's base layers paint the base look", async () => {
        const session = await triangle();
        assert.isFalse(session.config.editableBase);
        const colors = await painted(session, "node", "node.color");
        assert.isTrue(
            colors.every((color) => color !== undefined),
            "every node painted by the base layers",
        );
        session.dispose();
    });

    it("puts the base look into the Everything row, editable, in the same step", async () => {
        const session = await triangle();
        await session.config.set({ startingRows: true, editableBase: true });
        const row = everything(session);
        const parts = session.styles.list().filter((layer) => layer.row === row || layer.id === row);
        const node = parts.find((layer) => layer.target === "node");
        const edge = parts.find((layer) => layer.target === "edge");
        assert.isDefined(node?.set?.["node.color"], "Everything holds the node color");
        assert.isDefined(edge?.set?.["edge.color"], "Everything holds the edge color");

        await session.styles.writeRow(row, { set: { "node.color": "#ff0000" } });
        const colors = await painted(session, "node", "node.color");
        assert.isTrue(colors.every((color) => (color as { hex?: string } | undefined)?.hex === "#ff0000"));

        await session.undo();
        await session.undo();
        assert.isFalse(session.config.editableBase, "one undo takes the setting and the row back");
        session.dispose();
    });

    it("fills an Everything row that writes nothing when turned on later", async () => {
        const session = await triangle();
        await session.config.set({ startingRows: true });
        await session.config.set({ editableBase: true });
        const row = everything(session);
        const node = session.styles.list().find((layer) => (layer.row ?? layer.id) === row && layer.target === "node");
        assert.isDefined(node?.set?.["node.color"]);
        session.dispose();
    });

    it("hides what no shown layer paints when Everything is hidden, and keeps what one paints", async () => {
        const session = await triangle();
        await session.config.set({ startingRows: true, editableBase: true });
        await session.styles.add({
            name: "Only a",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.color": "#00ff00" },
        });
        assert.isTrue((await painted(session, "node", "node.visible")).every((value) => value !== false));

        await session.styles.hideRow(everything(session), true);
        const visible = await painted(session, "node", "node.visible");
        const a = session.data.snapshot().ids.requireIndex("a");
        assert.notStrictEqual(visible[a], false, "a node a shown layer paints stays drawn");
        assert.strictEqual(visible.filter((value) => value === false).length, 2, "the other two are hidden");
        assert.isTrue(
            (await painted(session, "edge", "edge.visible")).every((value) => value === false),
            "every edge is hidden",
        );

        await session.styles.hideRow(everything(session), false);
        assert.isTrue((await painted(session, "node", "node.visible")).every((value) => value !== false));
        session.dispose();
    });

    it("lets a run's layer paint over Everything under the default placement", async () => {
        const session = createGraphSession({ runs: { execute: groups } });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.config.set({ startingRows: true, editableBase: true });
        const { runId } = await session.runs.start("louvain");
        await session.styles.settled();
        assert.strictEqual(session.config.runPlacement, "beneath");
        assert.isAbove(session.runs.bindings(runId).length, 0, "the run painted a layer");
        session.dispose();
    });

    it("keeps the base look out of the legend, as the base layers were", async () => {
        const session = await triangle();
        await session.config.set({ startingRows: true, editableBase: true });
        await session.styles.settled();
        const row = everything(session);
        assert.deepEqual(
            session.styles
                .legend()
                .filter((block) => (session.styles.get(block.layerId)?.row ?? block.layerId) === row),
            [],
        );
        session.dispose();
    });
});
