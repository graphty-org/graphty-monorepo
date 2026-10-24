/**
 * The timeline's ghost option: elements outside the window stay drawn, in the state "ghosted", and
 * a Ghost row pinned directly below Selected paints them; they never count as visible.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { ElementSession } from "../../../src/session/types";

/**
 * A process trace: ten steps, node i at step i, and edge i -> i + 1 at step i + 1.
 * @param startingRows - Whether the project draws the starting rows.
 * @returns The session, as the renderer reads it (the drawn masks and the ghosts), with `step`
 *   designated on nodes and edges.
 */
async function trace(startingRows = true): Promise<ElementSession> {
    const session = createGraphSession() as ElementSession;
    if (startingRows) {
        await session.config.set({ startingRows: true });
    }

    const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `s${String(i)}`, step: i }));
    const edges = Array.from({ length: 9 }, (_, i) => ({
        source: `s${String(i)}`,
        target: `s${String(i + 1)}`,
        step: i + 1,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ directed: true, nodes, edges }) } });
    await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });

    return session;
}

/**
 * The stack's layers by name, bottom first.
 * @param session - The session.
 * @returns The names.
 */
function names(session: GraphSession): string[] {
    return session.styles.list().map((layer) => layer.name);
}

/**
 * The Ghost row's layer ids.
 * @param session - The session.
 * @returns The ids.
 */
function ghostLayers(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((layer) => layer.source.by === "template" && layer.source.templateId === "graphty:timeline-ghost")
        .map((layer) => layer.id);
}

describe("timeline ghosts", () => {
    it("hides by default, and ghosts out-of-window elements when asked, without counting them", async () => {
        const session = await trace();
        assert.strictEqual(session.time.settings.outside, "hide");
        await session.time.window({ from: 3, to: 6 });
        assert.isFalse(session.visibility.ghosting);
        assert.isNull(session.visibility.ghosts());
        assert.strictEqual(session.visibility.drawnMasks.nodes().size, 3);

        await session.time.setSettings({ outside: "ghost" });
        assert.isTrue(session.visibility.ghosting);
        // Visible is unchanged: three nodes, the two edges between them and the one into s3.
        assert.strictEqual(session.visibility.summary.visibleNodes, 3);
        assert.deepStrictEqual([...session.visibility.nodes].sort(), ["s3", "s4", "s5"]);
        // Drawn: everything.
        assert.strictEqual(session.visibility.drawnMasks.nodes().size, 10);
        assert.strictEqual(session.visibility.drawnMasks.edges().size, 9);
        const graph = session.data.snapshot();
        const ghosted = Array.from({ length: graph.nodeCount }, (_, i) => i)
            .filter((i) => session.visibility.ghosted("node", i))
            .map((i) => String(graph.ids.idOf(i)))
            .sort();
        assert.deepStrictEqual(ghosted, ["s0", "s1", "s2", "s6", "s7", "s8", "s9"]);

        // The Ghost row matches exactly the ghosts, nodes and edges.
        const [nodePart, edgePart] = ghostLayers(session);
        assert.strictEqual(session.styles.counts(nodePart).matched, 7);
        assert.strictEqual(session.styles.counts(edgePart).matched, 9 - session.visibility.summary.visibleEdges);

        // A step moves which elements are ghosts.
        await session.time.stepBy(1);
        assert.isFalse(session.visibility.ghosted("node", graph.ids.requireIndex("s6")));
        assert.isTrue(session.visibility.ghosted("node", graph.ids.requireIndex("s3")));

        // Undo the setting: nothing is a ghost, and only the window is drawn.
        await session.time.setSettings({ outside: "hide" });
        assert.isNull(session.visibility.ghosts());
        assert.strictEqual(session.styles.counts(nodePart).matched, 0);
        session.dispose();
    });

    it("adds the Ghost row directly below Selected with the field, and takes it away with it", async () => {
        const session = await trace();
        const order = names(session);
        assert.strictEqual(order.lastIndexOf("Ghost"), order.indexOf("Selected") - 1, order.join(", "));
        const ghost = session.styles.list().find((layer) => layer.name === "Ghost" && layer.target === "node");
        assert.deepInclude(ghost?.set ?? {}, { "node.color": "#9E9E9E", "node.opacity": 0.2 });
        assert.strictEqual(ghostLayers(session).length, 2);

        await session.time.setField(null);
        assert.deepStrictEqual(ghostLayers(session), []);
        await session.undo();
        assert.strictEqual(ghostLayers(session).length, 2);
        session.dispose();
    });

    it("adds no Ghost row to a project that does not draw the starting rows", async () => {
        const session = await trace(false);
        assert.deepStrictEqual(ghostLayers(session), []);
        session.dispose();
    });

    it("refuses an outside setting it does not know", async () => {
        const session = await trace();
        let refused = false;
        try {
            await session.time.setSettings({ outside: "fade" as "ghost" });
        } catch {
            refused = true;
        }

        assert.isTrue(refused);
        session.dispose();
    });
});
