/**
 * @file A saved copy reopens as it was saved (#9307): a project with hidden layers, a layer of
 * named nodes, an algorithm's layer and placed nodes comes back with the same layers shown and
 * hidden, each painting the same nodes, and -- in a version 1 file, or a version 2 file holding
 * its results opened without rerunning them -- every node where it stood.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

const NODES = Array.from({ length: 8 }, (_, at) => ({ id: `n${at}` }));
const EDGES = NODES.slice(1).map((node, at) => ({ source: `n${at}`, target: node.id }));

/**
 * A betweenness run that scores each node by its place in the list.
 * @param context - The run being executed.
 * @returns The outcome.
 */
function betweenness(context: RunExecutionContext): Promise<RunOutcome> {
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields: [
            {
                name: "value",
                plainName: "Bridging",
                technicalName: "betweenness",
                kind: "node",
                type: "number",
                path: "results.$.value",
            },
        ],
        measured: { nodes: NODES.length, edges: EDGES.length },
        nodes: NODES.map((node, at) => ({ id: node.id, values: { value: at / 10 } })),
        edges: [],
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "betweenness", facts: [], notes: [] },
        durationMs: 1,
    });
    return Promise.resolve({ result, summary: result.summary() });
}

/** The graphty app's project settings: the starting rows, and runs' layers on top. */
const APP = { startingRows: true, editableBase: true, runPlacement: "top" } as const;

/**
 * A session as the graphty app makes one.
 * @returns The session.
 */
async function appSession(): Promise<GraphSession> {
    const session = createGraphSession({ features: ["save-files-v2"], runs: { execute: betweenness } });
    await session.config.set(APP);
    return session;
}

/**
 * The project: a file's nodes placed, a hidden "Fraud ring" row of three named nodes and the edges
 * among them, a hidden layer over everything, and a betweenness run's layer, hidden too.
 * @returns The session.
 */
async function bankCase(): Promise<GraphSession> {
    const session = await appSession();
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes: NODES, edges: EDGES }) } });
    // A layer made from a selection: one row painting the nodes and the edges among them.
    const ring = await session.styles.addRow({
        name: "Fraud ring",
        target: "both",
        selector: { match: "ids", nodes: ["n0", "n1", "n2"] },
        set: { "node.color": "#ff0000" },
    });
    const pale = await session.styles.add({
        name: "Pale",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#dddddd" },
    });
    await session.styles.hideRow(pale.id, true);
    await session.positions.set(NODES.map((node, at) => ({ id: node.id, x: at, y: at * 2, z: at + 1 })));
    const run = await session.runs.start("betweenness", undefined, { style: true });
    const runLayer = session.styles
        .list()
        .find((layer) => layer.source?.by === "run" && layer.source.runId === run.runId);
    assert.isDefined(runLayer, "the run made its layer");
    await session.styles.hideRow(runLayer?.id ?? "", true);
    await session.styles.hideRow(ring.id, true);
    await session.styles.settled();
    return session;
}

/**
 * What the reader sees of the stack: each layer by name, shown or hidden, what it matches and
 * paints, and what its row paints (one row painting nodes and edges, or a row of one kind).
 * @param session - The session.
 * @returns The layers, bottom first.
 */
function layers(session: GraphSession): unknown[] {
    return session.styles.list().map((layer) => {
        const counts = session.styles.counts(layer.id);
        return {
            name: layer.name,
            hidden: layer.hidden === true,
            matched: counts.matched,
            painted: counts.painted,
            drawn: session.styles.drawnCount(layer.id),
            row: session.styles.parts(layer.id)?.target,
        };
    });
}

/**
 * Where each node stands, or null where it is not placed.
 * @param session - The session.
 * @returns One entry per node.
 */
function positions(session: GraphSession): unknown[] {
    const snapshot = session.data.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    return NODES.map((node) => {
        const index = snapshot.ids.requireIndex(node.id);
        if (!session.positions.isPlaced(index)) {
            return null;
        }
        session.positions.read(index, at);
        return { ...at };
    });
}

/**
 * Open a saved file in a new session, as the graphty app opens a file from the start screen.
 * @param text - The file.
 * @param options - Extra open options.
 * @returns The session.
 */
async function reopen(text: string, options: { rerun?: boolean } = {}): Promise<GraphSession> {
    const opened = await appSession();
    const report = await opened.project.open(new Blob([text]), {
        fileName: "Bank case.graphty.json",
        history: "start",
        discard: true,
        ...options,
    });
    assert.strictEqual(report.opened, "project");
    await opened.styles.settled();
    return opened;
}

describe("a saved copy reopens as it was saved", () => {
    it("keeps a version 1 file's hidden layers, layer members and positions", async () => {
        const saved = await bankCase();
        const { text } = await saved.project.save({ markSaved: false });
        const opened = await reopen(text);

        assert.deepStrictEqual(layers(opened), layers(saved));
        assert.deepStrictEqual(positions(opened), positions(saved));
        saved.dispose();
        opened.dispose();
    });

    it("keeps a version 2 file's hidden layers, in the style section and in view, and their members", async () => {
        const saved = await bankCase();
        const { text } = await saved.project.save({ format: 2, markSaved: false });
        const opened = await reopen(text);

        const shown = layers(saved);
        assert.deepInclude(shown, {
            name: "Pale",
            hidden: true,
            matched: 8,
            painted: { "node.color": 0 },
            drawn: 8,
            row: "node",
        });
        assert.deepInclude(
            shown.map((layer) => (layer as { row?: string }).row),
            "both",
        );
        assert.deepInclude(
            shown.map((layer) => (layer as { name: string }).name),
            "Fraud ring",
        );
        assert.deepStrictEqual(layers(opened), shown);
        saved.dispose();
        opened.dispose();
    });

    it("keeps a version 2 file's positions when it holds its results and opens without rerunning", async () => {
        const saved = await bankCase();
        const { text } = await saved.project.save({ format: 2, results: true, markSaved: false });
        const opened = await reopen(text, { rerun: false });

        assert.deepStrictEqual(positions(opened), positions(saved));
        assert.deepStrictEqual(layers(opened), layers(saved));
        saved.dispose();
        opened.dispose();
    });
});

describe("moving a layer", () => {
    it("keeps its row's eye, lock and pin", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const a = await session.styles.add({
            name: "A",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.add({
            name: "B",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#00ff00" },
        });
        await session.styles.hideRow(a.id, true);
        await session.styles.move(a.id, null);

        assert.isTrue(session.styles.get(a.id)?.hidden);
        assert.deepStrictEqual(
            session.styles.list().map((layer) => layer.name),
            ["Node defaults", "Edge defaults", "B", "A"],
        );
        session.dispose();
    });
});
