/**
 * What lies outside the time window: it stays drawn and in the state "outsideWindow", the
 * element's own layers hide it by style, and the timeline's `outside: "ghost"` sets `visible: true`
 * on the layers selecting that state (the Ghost row, pinned directly below Selected), which count
 * it. It never counts as visible, and a held filter condition's ghosts are another state.
 */

import { assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { setDefaultFeatures } from "../../../src/features/resolve";
import type { ElementSession } from "../../../src/session/types";

// The timeline is an experiment: this file's sessions switch it on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

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

/**
 * The rows of one kind in a byte array, as ids.
 * @param session - The session.
 * @param bytes - One byte per node.
 * @returns The ids of the rows set, sorted.
 */
function nodeIds(session: GraphSession, bytes: Uint8Array | undefined): string[] {
    const graph = session.data.snapshot();
    return Array.from({ length: graph.nodeCount }, (_, i) => i)
        .filter((i) => bytes?.[i] === 1)
        .map((i) => String(graph.ids.idOf(i)))
        .sort();
}

/**
 * Whether a node or an edge is drawn, as the style layers resolve its `visible`.
 * @param session - The session.
 * @param target - The node, or the edge.
 * @returns False when a layer hides it.
 */
function drawn(session: GraphSession, target: { node: string } | { edge: string }): boolean {
    const channel = "node" in target ? "node.visible" : "edge.visible";
    return session.styles.explain(target).merged[channel] !== false;
}

/**
 * The id of the edge s0 -> s1, outside every window that starts after step 1.
 * @param session - The session.
 * @returns Its id.
 */
function firstEdge(session: GraphSession): string {
    const edge = session.data.edges().find((each) => each.source === "s0" && each.target === "s1");
    return String(edge?.id);
}

describe("timeline ghosts", () => {
    it("keeps what lies outside the window drawn, hidden by style, and ghosts it when asked", async () => {
        const session = await trace();
        assert.strictEqual(session.time.settings.outside, "hide");
        await session.time.window({ from: 3, to: 6 });
        // Drawn: everything the filter keeps. Visible: the window.
        assert.isTrue(session.visibility.ghosting);
        assert.strictEqual(session.visibility.drawnMasks.nodes().size, 10);
        assert.strictEqual(session.visibility.drawnMasks.edges().size, 9);
        assert.strictEqual(session.visibility.summary.visibleNodes, 3);
        assert.deepStrictEqual([...session.visibility.nodes].sort(), ["s3", "s4", "s5"]);
        assert.deepStrictEqual(nodeIds(session, session.visibility.outsideWindowBytes()?.node), [
            "s0",
            "s1",
            "s2",
            "s6",
            "s7",
            "s8",
            "s9",
        ]);
        // No condition is held, so nothing is a held ghost.
        assert.isNull(session.visibility.ghosts());

        // The Ghost row selects what lies outside and counts it, hidden or drawn.
        const parts = ghostLayers(session);
        const nodePart =
            parts.find((id) => session.styles.list().find((layer) => layer.id === id)?.target === "node") ?? "";
        const edgePart = parts.find((id) => id !== nodePart) ?? "";
        const outsideEdges = 9 - session.visibility.summary.visibleEdges;
        assert.strictEqual(session.styles.counts(nodePart).matched, 7);
        assert.strictEqual(session.styles.counts(edgePart).matched, outsideEdges);
        const ghost = (): unknown =>
            session.styles.list().find((layer) => layer.id === nodePart)?.set?.["node.visible"];
        assert.isUndefined(ghost(), "the element's own layers hide what lies outside");

        await session.time.setSettings({ outside: "ghost" });
        assert.strictEqual(session.time.settings.outside, "ghost");
        assert.isTrue(ghost(), "the Ghost row draws it");
        assert.strictEqual(session.styles.counts(nodePart).matched, 7);
        assert.strictEqual(session.visibility.summary.visibleNodes, 3, "ghosts are never visible");

        // A step moves what lies outside.
        const graph = session.data.snapshot();
        await session.time.stepBy(1);
        assert.isFalse(session.visibility.outsideWindow("node", graph.ids.requireIndex("s6")));
        assert.isTrue(session.visibility.outsideWindow("node", graph.ids.requireIndex("s3")));
        assert.strictEqual(session.styles.counts(nodePart).matched, 7);

        await session.time.setSettings({ outside: "hide" });
        assert.strictEqual(session.time.settings.outside, "hide");
        assert.isFalse(ghost());
        session.dispose();
    });

    it("stores how what lies outside draws in the layers alone, and undoes it with the rest in one step", async () => {
        const session = await trace();
        await session.time.window({ from: 3, to: 6 });
        await session.time.setSettings({ outside: "ghost", missing: "outside" });
        const saved = (await session.project.save()).text;
        assert.include(saved, '"missing":"outside"');
        assert.notInclude(saved, '"outside":"ghost"');
        assert.strictEqual(session.time.settings.outside, "ghost");
        assert.strictEqual(session.time.settings.missing, "outside");
        await session.undo();
        assert.strictEqual(session.time.settings.outside, "hide");
        assert.strictEqual(session.time.settings.missing, "inside");
        session.dispose();
    });

    it("adds a layer that draws what lies outside when no layer selects it", async () => {
        const session = await trace(false);
        await session.time.window({ from: 3, to: 6 });
        const selecting = (): Record<string, unknown>[] =>
            session.styles
                .list()
                .filter((layer) => layer.source.by !== "element")
                .filter((layer) => layer.selector.match === "state" && layer.selector.state === "outsideWindow")
                .map((layer) => ({ ...layer.set }));
        assert.deepStrictEqual(selecting(), []);
        assert.strictEqual(session.time.settings.outside, "hide");

        await session.time.setSettings({ outside: "ghost" });
        assert.deepStrictEqual(selecting(), [{ "node.visible": true }, { "edge.visible": true }]);
        assert.strictEqual(session.time.settings.outside, "ghost");

        await session.time.setSettings({ outside: "hide" });
        assert.deepStrictEqual(selecting(), [{ "node.visible": false }, { "edge.visible": false }]);
        assert.strictEqual(session.time.settings.outside, "hide");
        session.dispose();
    });

    it("carries what lies outside through slides by their rows, and starts over when more moved", async () => {
        const session = await trace();
        await session.time.window({ from: 2, to: 5 });
        const { visibility } = session;
        const assertOutside = (when: string): void => {
            const outside = visibility.outsideWindowBytes();
            const kept = visibility.passingBytes();
            const shownNodes = visibility.masks.nodes();
            const shownEdges = visibility.masks.edges();
            const graph = session.data.snapshot();
            for (let row = 0; row < graph.nodeCount; row++) {
                const out = (kept.nodes === null || kept.nodes[row] === 1) && !shownNodes.has(row);
                assert.strictEqual(outside?.node[row] === 1, out, `${when}: node ${String(row)}`);
            }

            for (let row = 0; row < graph.edgeCount; row++) {
                const out = (kept.edges === null || kept.edges[row] === 1) && !shownEdges.has(row);
                assert.strictEqual(outside?.edge[row] === 1, out, `${when}: edge ${String(row)}`);
            }
        };

        // Sliding steps by rows: the same bytes come back, brought forward.
        await session.time.seek(2.5, { commit: false });
        const kept = visibility.outsideWindowBytes()?.node;
        for (const from of [3, 3.5, 4]) {
            await session.time.seek(from, { commit: false });
            assert.strictEqual(visibility.outsideWindowBytes()?.node, kept, `at ${String(from)}`);
            assertOutside(`at ${String(from)}`);
        }

        // A filter moves what is kept, so every row is read again; what it hides is not outside.
        await session.visibility.set({ kind: "range", attribute: "step", min: 2 });
        assert.notStrictEqual(visibility.outsideWindowBytes()?.node, kept);
        assertOutside("under a filter");
        assert.isFalse(visibility.outsideWindow("node", session.data.snapshot().ids.requireIndex("s0")));
        await session.time.seek(4, { commit: false });
        await session.time.seek(4.5, { commit: false });
        assertOutside("sliding under the filter");
        session.dispose();
    });

    it("leaves a held condition's ghosts drawn and apart from what lies outside the window", async () => {
        const session = await trace();
        await session.time.window({ from: 3, to: 6 });
        const { id } = await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "range", attribute: "step", max: 4 },
        });
        session.visibility.hold(id);
        // s5 passes the window but not the held condition: a ghost, drawn, and not outside the window.
        const graph = session.data.snapshot();
        const s5 = graph.ids.requireIndex("s5");
        assert.isTrue(session.visibility.ghosted("node", s5));
        assert.isFalse(session.visibility.outsideWindow("node", s5));
        assert.isTrue(session.visibility.drawnMasks.nodes().has(s5));
        assert.deepStrictEqual(nodeIds(session, session.visibility.ghosts()?.node), ["s5", "s6", "s7", "s8", "s9"]);
        session.visibility.hold(null);
        assert.isNull(session.visibility.ghosts());
        session.dispose();
    });

    it("brings a project saved with the window's ghosts in the ghosted state up to date on load", async () => {
        const session = await trace();
        await session.time.window({ from: 3, to: 6 });
        await session.time.setSettings({ outside: "ghost", missing: "outside" });
        const { text } = await session.project.save();
        session.dispose();
        // As a project saved before what lies outside the window had a state of its own: the Ghost
        // row selects "ghosted" and sets no visible, and the playback says how it draws.
        const before = (outside: "hide" | "ghost"): string =>
            text
                .replaceAll('"state":"outsideWindow"', '"state":"ghosted"')
                .replaceAll(',"node.visible":true', "")
                .replaceAll(',"edge.visible":true', "")
                .replace('"playback":{"missing":"outside"}', `"playback":{"missing":"outside","outside":"${outside}"}`);
        assert.include(before("ghost"), '"outside":"ghost"');

        for (const outside of ["hide", "ghost"] as const) {
            const opened = createGraphSession() as ElementSession;
            await opened.project.open(before(outside));
            const ghost = opened.styles.list().filter((layer) => layer.name === "Ghost");
            assert.lengthOf(ghost, 2);
            for (const layer of ghost) {
                assert.deepEqual(layer.selector, { match: "state", state: "outsideWindow" });
            }

            assert.strictEqual(opened.time.settings.outside, outside, `saved ${outside}`);
            assert.strictEqual(opened.time.settings.missing, "outside");
            // Saved again and opened again, it is as it was.
            const again = createGraphSession() as ElementSession;
            await again.project.open((await opened.project.save()).text);
            assert.strictEqual(again.time.settings.outside, outside);
            assert.notInclude((await again.project.save()).text, '"state":"ghosted"');
            opened.dispose();
            again.dispose();
        }
    });

    it("reads Outside from the rows that paint, so hiding the Ghost row reads Hide and Ghost draws again", async () => {
        const session = await trace();
        await session.time.window({ from: 3, to: 6 });
        await session.time.setSettings({ outside: "ghost" });
        assert.isTrue(drawn(session, { node: "s0" }));

        const row = session.styles.list().find((layer) => layer.name === "Ghost");
        await session.styles.hideRow(row?.row ?? row?.id ?? "", true);
        assert.strictEqual(session.time.settings.outside, "hide");
        assert.isFalse(drawn(session, { node: "s0" }));

        await session.time.setSettings({ outside: "ghost" });
        assert.strictEqual(session.time.settings.outside, "ghost");
        assert.isTrue(drawn(session, { node: "s0" }));
        assert.isTrue(drawn(session, { edge: firstEdge(session) }));
        session.dispose();
    });

    it("draws nodes and edges alike when a reader's own layer selects only nodes", async () => {
        const session = await trace(false);
        await session.time.window({ from: 3, to: 6 });
        await session.styles.add({
            name: "Outside the window",
            target: "node",
            selector: { match: "state", state: "outsideWindow" },
            set: { "node.visible": true, "node.opacity": 0.2 },
        });
        assert.strictEqual(session.time.settings.outside, "hide", "the edges are still hidden");

        await session.time.setSettings({ outside: "ghost" });
        assert.strictEqual(session.time.settings.outside, "ghost");
        assert.isTrue(drawn(session, { node: "s0" }));
        assert.isTrue(drawn(session, { edge: firstEdge(session) }));
        session.dispose();
    });

    it("keeps what lies outside drawn faint while a branches view is open under Outside: Ghost", async () => {
        const session = await trace();
        await session.time.window({ from: 3, to: 6 });
        await session.time.setSettings({ outside: "ghost" });
        const view = session.styles.showBranches({
            rule: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [
                    {
                        start: "none",
                        color: "#009E73",
                        steps: [{ op: "add", rule: { kind: "state", state: "selected" } }],
                    },
                ],
            },
        });
        await session.styles.settled();
        assert.isTrue(drawn(session, { node: "s0" }));
        assert.strictEqual(session.styles.explain({ node: "s0" }).merged["node.opacity"], 0.2);
        view.end();
        await session.styles.settled();

        await session.time.setSettings({ outside: "hide" });
        const hidden = session.styles.showBranches({
            rule: {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [
                    {
                        start: "none",
                        color: "#009E73",
                        steps: [{ op: "add", rule: { kind: "state", state: "selected" } }],
                    },
                ],
            },
        });
        await session.styles.settled();
        assert.isFalse(drawn(session, { node: "s0" }), "Outside: Hide stays hidden");
        hidden.end();
        await session.styles.settled();
        session.dispose();
    });

    it("brings a saved Ghost choice with no layer to draw it, and a rule on the old state, up to date on load", async () => {
        const session = await trace(false);
        await session.time.window({ from: 3, to: 6 });
        await session.styles.add({
            name: "Old outside rule",
            target: "node",
            selector: { match: "rule", where: { kind: "all", of: [{ kind: "state", state: "outsideWindow" }] } },
            set: { "node.color": "#123456" },
        });
        await session.time.setSettings({ missing: "outside" });
        const { text } = await session.project.save();
        session.dispose();
        const before = text
            .replaceAll('"state":"outsideWindow"', '"state":"ghosted"')
            .replace('"playback":{"missing":"outside"}', '"playback":{"missing":"outside","outside":"ghost"}');
        assert.include(before, '"outside":"ghost"');

        const opened = createGraphSession() as ElementSession;
        await opened.project.open(before);
        assert.strictEqual(opened.time.settings.outside, "ghost");
        assert.isTrue(drawn(opened, { node: "s0" }));
        const rule = opened.styles.list().find((layer) => layer.name === "Old outside rule");
        assert.deepEqual(rule?.selector, {
            match: "rule",
            where: { kind: "all", of: [{ kind: "state", state: "outsideWindow" }] },
        });
        opened.dispose();
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
