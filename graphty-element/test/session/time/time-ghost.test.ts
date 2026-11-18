/**
 * What lies outside the time window: it stays visible and drawn, in the state "outsideWindow", and
 * only style layers selecting that state change how it looks. The window never narrows a count, the
 * selection, an export or the layout. With the timeline on and the starting rows drawn, one
 * ordinary row, Timeline Hidden, selects the state, hidden or ghosted as the project setting
 * `timelineHiddenLook` says. A held filter condition's ghosts are another state.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError } from "../../../session";
import { exportSession } from "../../../src/data/export";
import type { ElementSession } from "../../../src/session/types";

/**
 * A process trace: ten steps, node i at step i, and edge i -> i + 1 at step i + 1.
 * @param startingRows - Whether the project draws the starting rows.
 * @param look - The Timeline Hidden row's look, when set.
 * @returns The session, as the renderer reads it (the drawn masks and the ghosts), with `step`
 *   designated on nodes and edges.
 */
async function trace(startingRows = true, look?: "hidden" | "ghost"): Promise<ElementSession> {
    const session = createGraphSession({ workingGraph: false }) as ElementSession;
    if (startingRows) {
        await session.config.set({ startingRows: true, ...(look === undefined ? {} : { timelineHiddenLook: look }) });
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
 * The layers of the row a name names, the test's way of finding it (code never does).
 * @param session - The session.
 * @param name - The row's name.
 * @returns The layer ids.
 */
function rowLayers(session: GraphSession, name = "Timeline Hidden"): string[] {
    return session.styles
        .list()
        .filter((layer) => layer.name === name)
        .map((layer) => layer.id);
}

/**
 * The CSV rows an export writes, header left out.
 * @param session - The session.
 * @param table - Which table.
 * @returns The rows.
 */
async function shownRows(session: GraphSession, table: "nodes" | "edges"): Promise<string[]> {
    const text = await exportSession(session, "csv", { table, scope: "shown" }).text();
    return text.trim().split("\n").slice(1);
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

/**
 * Add a reader's layer hiding the edges outside the window.
 * @param session - The session.
 */
async function hideOutsideEdges(session: GraphSession): Promise<void> {
    await session.styles.add({
        name: "Outside edges",
        target: "edge",
        selector: { match: "state", state: "outsideWindow" },
        set: { "edge.visible": false },
    });
}

describe("timeline ghosts", () => {
    it("narrows no count, selection, export or layout input: only the drawing changes", async () => {
        const session = await trace(false);
        await session.selection.apply({ nodes: ["s0", "s5"] });
        const { visibility } = session;
        const { summary } = visibility;
        const nodeMask = [...visibility.nodeMask()];
        const edgeMask = [...visibility.edgeMask()];
        const kept = [...visibility.keptMasks.nodes().bytes()];
        const nodes = await shownRows(session, "nodes");
        const edges = await shownRows(session, "edges");

        await session.time.window({ from: 3, to: 6 });
        await session.time.stepBy(1);

        assert.deepStrictEqual(visibility.summary, summary, "the counts");
        assert.strictEqual(visibility.summary.visibleNodes, 10);
        assert.deepStrictEqual([...visibility.nodeMask()], nodeMask);
        assert.deepStrictEqual([...visibility.edgeMask()], edgeMask);
        assert.lengthOf([...visibility.nodes], 10);
        assert.deepStrictEqual([...visibility.keptMasks.nodes().bytes()], kept, "the layout's input never moved");
        assert.sameMembers([...session.selection.nodes], ["s0", "s5"]);
        assert.deepStrictEqual(await shownRows(session, "nodes"), nodes);
        assert.deepStrictEqual(await shownRows(session, "edges"), edges);
        assert.lengthOf(nodes, 10);

        // What lies outside is in its state, and with no layer selecting it nothing hides it.
        assert.isFalse(visibility.ghosting);
        assert.deepStrictEqual(nodeIds(session, visibility.outsideWindowBytes()?.node), [
            "s0",
            "s1",
            "s2",
            "s3",
            "s7",
            "s8",
            "s9",
        ]);
        assert.isTrue(drawn(session, { node: "s0" }));
        assert.isTrue(drawn(session, { edge: firstEdge(session) }));
        assert.strictEqual(session.visibility.drawnMasks.nodes().size, 10);

        // A slide, the frames of a play, moves nothing visible either.
        await session.time.seek(5.5, { commit: false });
        assert.deepStrictEqual(visibility.summary, summary);
        assert.deepStrictEqual([...visibility.nodeMask()], nodeMask);
        session.dispose();
    });

    it("hides what lies outside through the Timeline Hidden row, which selects the state and counts it", async () => {
        const session = await trace();
        await session.time.window({ from: 3, to: 6 });
        // `explain` reads what was last painted: the window's repaint, once the styles settle.
        await session.styles.settled();
        assert.strictEqual(session.visibility.summary.visibleNodes, 10, "hidden by style, still visible");
        assert.isFalse(drawn(session, { node: "s0" }));
        assert.isFalse(drawn(session, { edge: firstEdge(session) }));
        assert.isTrue(drawn(session, { node: "s4" }));
        assert.strictEqual(session.time.settings.outside, "hide");

        const parts = rowLayers(session);
        const nodePart =
            parts.find((id) => session.styles.list().find((layer) => layer.id === id)?.target === "node") ?? "";
        assert.strictEqual(session.styles.counts(nodePart).matched, 7);

        await session.time.setSettings({ outside: "ghost" });
        assert.strictEqual(session.time.settings.outside, "ghost");
        assert.isTrue(drawn(session, { node: "s0" }));
        assert.strictEqual(session.visibility.summary.visibleNodes, 10);

        // A step moves what lies outside.
        const graph = session.data.snapshot();
        await session.time.stepBy(1);
        assert.isFalse(session.visibility.outsideWindow("node", graph.ids.requireIndex("s6")));
        assert.isTrue(session.visibility.outsideWindow("node", graph.ids.requireIndex("s3")));
        assert.strictEqual(session.styles.counts(nodePart).matched, 7);

        // Deleted, nothing hides what lies outside any more: the row is just a layer.
        await session.time.setSettings({ outside: "hide" });
        const row = session.styles.list().find((layer) => layer.id === nodePart);
        await session.styles.deleteRow(row?.row ?? nodePart);
        assert.isTrue(drawn(session, { node: "s0" }));
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

    it("adds the layers Outside asks for when no layer selects what lies outside", async () => {
        const session = await trace(false);
        await session.time.window({ from: 3, to: 6 });
        const selecting = (): Record<string, unknown>[] =>
            session.styles
                .list()
                .filter((layer) => layer.selector.match === "state" && layer.selector.state === "outsideWindow")
                .map((layer) => ({ ...layer.set }));
        assert.deepStrictEqual(selecting(), []);
        assert.strictEqual(session.time.settings.outside, "hide");
        assert.isTrue(drawn(session, { node: "s0" }), "nothing hides it");

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
            const inside = visibility.windowMasks();
            const graph = session.data.snapshot();
            for (let row = 0; row < graph.nodeCount; row++) {
                const out = (kept.nodes === null || kept.nodes[row] === 1) && inside.nodes[row] !== 1;
                assert.strictEqual(outside?.node[row] === 1, out, `${when}: node ${String(row)}`);
            }

            for (let row = 0; row < graph.edgeCount; row++) {
                const out = (kept.edges === null || kept.edges[row] === 1) && inside.edges[row] !== 1;
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
        const session = await trace(true, "ghost");
        await session.time.window({ from: 3, to: 6 });
        await session.time.setSettings({ outside: "ghost", missing: "outside" });
        const { text } = await session.project.save();
        session.dispose();
        // As a project saved before what lies outside the window had a state of its own: the Ghost
        // row selects "ghosted" and sets no visible, and the playback says how it draws.
        const before = (outside: "hide" | "ghost"): string =>
            text
                .replace(',"outsideByLayers":true', "")
                .replaceAll('"state":"outsideWindow"', '"state":"ghosted"')
                .replaceAll(',"node.visible":true', "")
                .replaceAll(',"edge.visible":true', "")
                .replace('"playback":{"missing":"outside"}', `"playback":{"missing":"outside","outside":"${outside}"}`);
        assert.include(before("ghost"), '"outside":"ghost"');

        for (const outside of ["hide", "ghost"] as const) {
            const opened = createGraphSession() as ElementSession;
            await opened.project.open(before(outside));
            const ghost = opened.styles.list().filter((layer) => layer.name === "Timeline Hidden");
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

    it("reads Outside from the rows that paint, so hiding the Timeline Hidden row draws what it hid", async () => {
        const session = await trace();
        await session.time.window({ from: 3, to: 6 });
        assert.isFalse(drawn(session, { node: "s0" }));

        const row = session.styles.list().find((layer) => layer.name === "Timeline Hidden");
        await session.styles.hideRow(row?.row ?? row?.id ?? "", true);
        assert.isTrue(drawn(session, { node: "s0" }), "nothing hides it");

        await session.time.setSettings({ outside: "hide" });
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
        await hideOutsideEdges(session);
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

    it("hides again what a reader's node-only layer draws when Hide is asked, though Outside already read Hide", async () => {
        const session = await trace(false);
        await session.time.window({ from: 3, to: 6 });
        await hideOutsideEdges(session);
        const added = await session.styles.add({
            name: "Outside the window",
            target: "node",
            selector: { match: "state", state: "outsideWindow" },
            set: { "node.visible": true },
        });
        assert.isTrue(drawn(session, { node: "s0" }), "the reader's layer draws the nodes");
        assert.strictEqual(session.time.settings.outside, "hide", "the edges are still hidden");

        await session.time.setSettings({ outside: "hide" });
        assert.strictEqual(session.styles.get(added.id)?.set?.["node.visible"], false);
        assert.isFalse(drawn(session, { node: "s0" }));

        // Asked again, nothing is left to write.
        const stack = session.styles.list();
        await session.time.setSettings({ outside: "hide" });
        assert.strictEqual(session.styles.list(), stack, "no layer was written");
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
        // An older writer wrote no outsideByLayers mark.
        const before = text
            .replace(',"outsideByLayers":true', "")
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

    it("leaves a held condition's ghosted layer alone in a timed file saved before, with no window or playback", async () => {
        const session = await trace();
        await session.styles.add({
            name: "Held ghosts",
            target: "node",
            selector: { match: "state", state: "ghosted" },
            set: { "node.color": "#123456" },
        });
        const { text } = await session.project.save();
        session.dispose();
        // Saved with the timeline off: no outsideByLayers mark, no window and no playback.
        const before = text.replace(',"outsideByLayers":true', "");
        assert.notInclude(before, '"playback"');
        assert.include(before, '"window":null');

        const opened = createGraphSession() as ElementSession;
        await opened.project.open(before);
        const layer = opened.styles.list().find((each) => each.name === "Held ghosts");
        assert.deepEqual(layer?.selector, { match: "state", state: "ghosted" });
        opened.dispose();
    });

    it("refuses an outside setting it does not know", async () => {
        const session = await trace();
        let refused: unknown = null;
        try {
            await session.time.setSettings({ outside: "fade" as "ghost" });
        } catch (error) {
            refused = error;
        }

        assert.strictEqual(isGraphtyError(refused) ? refused.code : refused, "E_BAD_COMMAND");
        session.dispose();
    });
});
