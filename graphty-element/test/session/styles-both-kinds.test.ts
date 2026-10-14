/**
 * @file One style row that paints nodes and edges: `styles.addRow` with target "both", writes that
 * reach the parts whose kind has the channel, remove and move acting on the row, and the
 * `incident` edge reading ("touching them") beside `induced` ("between them"), and a row whose
 * kind changes keeping its id, name and place, its rule carried to the new kind.
 */

import { lesMiserables } from "@graphty/graph-samples/datasets/les-miserables";
import { assert, describe, it } from "vitest";

import type { Selector } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

/**
 * A shortest path in Les Miserables, four hops: Napoleon and Tholomyes are four apart, and the
 * route runs through Valjean. (Valjean and Javert are neighbors, so their own shortest path is one
 * edge.)
 */
const ROUTE = ["Napoleon", "Myriel", "Valjean", "Fantine", "Tholomyes"];

/** "On the route": a set that speaks both kinds, its five nodes and the four edges of its steps. */
const ON_ROUTE: Selector = { match: "member", of: { define: { kind: "path", nodes: ROUTE } } };

/**
 * A session holding Les Miserables.
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    const sample = lesMiserables();
    const ids = sample.ids ?? [];
    const session = createGraphSession();
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges([...sample.src].map((src, e) => ({ source: ids[src], target: ids[sample.dst[e]] })));

    return session;
}

/**
 * The consumer's layers, without the element's base layers.
 * @param styles - The styles API.
 * @returns The layers, bottom first.
 */
function own(styles: GraphSession["styles"]): ReturnType<GraphSession["styles"]["list"]> {
    return styles.list().filter((layer) => !layer.locked);
}

/**
 * How many edges of Les Miserables touch a node.
 * @param id - The node.
 * @returns Its degree.
 */
function degreeOf(id: string): number {
    const sample = lesMiserables();
    const index = (sample.ids ?? []).indexOf(id);

    return [...sample.src].filter((src, e) => src === index || sample.dst[e] === index).length;
}

describe("a style row that paints nodes and edges", () => {
    it("paints the route's 5 nodes and 4 edges with one color write, and a width write reaches only the edges", async () => {
        const session = await lesMis();
        const { styles } = session;

        const row = await styles.addRow({
            name: "On route",
            target: "both",
            selector: ON_ROUTE,
            set: { color: "#ff0000" },
        });
        assert.isDefined(row.node);
        assert.isDefined(row.edge);
        assert.strictEqual(row.target, "both");

        const nodeId = row.node ?? "";
        const edgeId = row.edge ?? "";
        assert.deepStrictEqual(
            own(styles).map((layer) => layer.target),
            ["edge", "node"],
            "one layer per part, each with its own target, the edges under the nodes",
        );
        assert.strictEqual(styles.counts(nodeId).painted["node.color"], 5);
        assert.strictEqual(styles.counts(edgeId).painted["edge.color"], 4);

        await styles.writeRow(row.id, { set: { width: 3 } });
        assert.strictEqual(styles.counts(edgeId).painted["edge.width"], 4);
        assert.deepStrictEqual(styles.get(nodeId)?.set, { "node.color": "#ff0000" }, "the node part takes no width");
        assert.deepStrictEqual(styles.get(edgeId)?.set, { "edge.color": "#ff0000", "edge.width": 3 });

        await styles.writeRow(row.id, { set: { shape: "box" } });
        assert.strictEqual(styles.get(nodeId)?.set?.["node.shape"], "box", "shape is a node channel");
        assert.isUndefined(styles.get(edgeId)?.set?.["node.shape"]);

        const nowhere = await styles.writeRow(row.id, { set: { curvature: true, bogus: 1 } }).then(
            () => null,
            (error: unknown) => error,
        );
        assert.strictEqual(isGraphtyError(nowhere) ? nowhere.details?.reason : null, "row-channel-unknown");
        assert.isUndefined(styles.get(edgeId)?.set?.["edge.curvature"], "a refused write writes nothing");
        session.dispose();
    });

    it("removes both parts in one undo step, and undo brings both back", async () => {
        const session = await lesMis();
        const { styles } = session;
        const row = await styles.addRow({
            name: "On route",
            target: "both",
            selector: ON_ROUTE,
            set: { color: "#ff0000" },
        });
        const steps = session.history.steps.length;

        await styles.remove(row.edge ?? "");
        assert.lengthOf(own(styles), 0, "removing either part removes the row");
        assert.lengthOf(session.history.steps, steps + 1, "one step");

        await session.undo();
        assert.deepStrictEqual(
            own(styles).map((layer) => layer.id),
            [row.edge, row.node],
        );
        assert.deepStrictEqual(styles.parts(row.id), row);
        session.dispose();
    });

    it("moves as one block, and keeps a layer added beside it out of the middle", async () => {
        const session = await lesMis();
        const { styles } = session;
        const plain = await styles.add({
            name: "All",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        const row = await styles.addRow({
            name: "On route",
            target: "both",
            selector: ON_ROUTE,
            set: { color: "#ff0000" },
        });

        await styles.move(row.node ?? "", plain.id);
        assert.deepStrictEqual(
            own(styles).map((layer) => layer.id),
            [row.edge, row.node, plain.id],
        );

        const below = await styles.add(
            { name: "Under", target: "node", selector: { match: "everything" }, set: { "node.size": 1 } },
            { below: row.node ?? "" },
        );
        assert.deepStrictEqual(
            own(styles).map((layer) => layer.id),
            [below.id, row.edge, row.node, plain.id],
            "below the row means below its bottom part",
        );

        await styles.writeRow(row.id, { enabled: false });
        assert.isFalse(styles.parts(row.id)?.enabled, "one eye hides both parts");
        assert.isFalse(styles.get(row.edge ?? "")?.enabled);
        session.dispose();
    });

    it("is one row of the style tree, which hides, locks and deletes both parts", async () => {
        const session = await lesMis();
        const { styles } = session;
        const row = await styles.addRow({
            name: "On route",
            target: "both",
            selector: ON_ROUTE,
            set: { color: "#ff0000" },
        });
        const nodeId = row.node ?? "";
        const edgeId = row.edge ?? "";

        assert.deepStrictEqual(
            styles.tree().map((entry) => entry.id),
            [row.id],
            "one tree row for the two parts",
        );

        await styles.hideRow(row.id, true);
        assert.strictEqual(styles.counts(nodeId).painted["node.color"] ?? 0, 0);
        assert.strictEqual(styles.counts(edgeId).painted["edge.color"] ?? 0, 0, "the eye reaches the edge part");
        await styles.hideRow(row.id, false);

        await styles.lockRow(row.id, true);
        const locked = await styles.writeRow(row.id, { set: { width: 3 } }).then(
            () => null,
            (error: unknown) => error,
        );
        assert.isTrue(isGraphtyError(locked), "a locked row refuses a write to either part");
        await styles.lockRow(row.id, false);

        const steps = session.history.steps.length;
        await styles.deleteRow(row.id);
        assert.lengthOf(own(styles), 0);
        assert.lengthOf(session.history.steps, steps + 1, "one step");
        await session.undo();
        assert.lengthOf(own(styles), 2);
        session.dispose();
    });

    it("refuses a layer that claims a row outside addRow", async () => {
        const session = await lesMis();
        const refused = await session.styles
            .add({ name: "Stray", target: "edge", selector: { match: "everything" }, row: "elsewhere" })
            .then(
                () => null,
                (error: unknown) => error,
            );
        assert.strictEqual(isGraphtyError(refused) ? refused.code : null, "E_BAD_COMMAND");
        session.dispose();
    });
});

describe("the edges beside a node rule", () => {
    /**
     * A row on Valjean and Javert whose edges are read one way.
     * @param reading - How the edges are read.
     * @returns How many edges the edge part paints.
     */
    async function edgesRead(reading: "induced" | "incident"): Promise<number> {
        const session = await lesMis();
        const row = await session.styles.addRow({
            name: "Two",
            target: "both",
            selector: {
                match: "member",
                of: {
                    define: {
                        kind: "rule",
                        where: {
                            kind: "member",
                            of: { define: { kind: "fixed", nodes: ["Valjean", "Javert"], reading: "induced" } },
                        },
                        reading,
                    },
                },
            },
            set: { color: "#0000ff" },
        });
        const nodes = session.styles.counts(row.node ?? "").matched;
        const edges = session.styles.counts(row.edge ?? "").matched;
        session.dispose();
        assert.strictEqual(nodes, 2, "the node part paints the rule's nodes either way");

        return edges;
    }

    it("'induced' takes only the edges between them, 'incident' every edge touching them", async () => {
        assert.strictEqual(await edgesRead("induced"), 1, "Valjean to Javert only");
        // Valjean and Javert share one edge, counted once.
        assert.strictEqual(await edgesRead("incident"), degreeOf("Valjean") + degreeOf("Javert") - 1);
    });

    it("refuses 'incident' on a fixed set, which has no rule to read touching edges from", async () => {
        const session = await lesMis();
        // Typed out of reach on purpose: a fixed set's type has no "incident", and the door refuses it.
        const fixed: unknown = {
            match: "member",
            of: { define: { kind: "fixed", nodes: ["Valjean"], reading: "incident" } },
        };
        const refused = await session.styles
            .addRow({ name: "Fixed", target: "edge", selector: fixed as Selector })
            .then(
                () => null,
                (error: unknown) => error,
            );
        assert.isTrue(isGraphtyError(refused));
        session.dispose();
    });
});

describe("a row whose kind changes", () => {
    /**
     * Les Miserables with a `name` on every node, a `tie` on every edge ("close" for Valjean's), and
     * a degree run whose executor publishes what the element's own does.
     * @returns The session.
     */
    async function named(): Promise<GraphSession> {
        const execute = async (context: RunExecutionContext): Promise<RunOutcome> => {
            await Promise.resolve();
            const nodes = session.data.nodes();
            const edges = session.data.edges();
            const path = `results.${context.runId}.value`;
            return {
                result: createRunResult({
                    runId: context.runId,
                    measured: { nodes: nodes.length, edges: edges.length },
                    caveats: {
                        exact: true,
                        direction: "as-loaded",
                        precision: "f64",
                        method: context.algorithm,
                        facts: [],
                        notes: [],
                    },
                    durationMs: 1,
                    shape: "node-metric",
                    fields: [
                        {
                            name: "value",
                            plainName: "Degree",
                            technicalName: "value",
                            kind: "node",
                            type: "number",
                            path,
                        },
                    ],
                    nodes: nodes.map((node) => ({ id: node.id, values: { value: degreeOf(String(node.id)) } })),
                }),
            };
        };
        const session = createGraphSession({ runs: { execute } });
        const sample = lesMiserables();
        const ids = sample.ids ?? [];
        await session.data.addNodes(ids.map((id) => ({ id, name: id })));
        await session.data.addEdges(
            [...sample.src].map((src, e) => {
                const [source, target] = [ids[src], ids[sample.dst[e]]];
                return { source, target, tie: source === "Valjean" || target === "Valjean" ? "close" : "far" };
            }),
        );

        return session;
    }

    /**
     * The row as a reader sees it, every part's matches, and the whole stack and tree, for undo.
     * @param session - The session.
     * @param id - The row.
     * @returns What is compared.
     */
    function shot(session: GraphSession, id: string): { name: string; matched: number[]; whole: string } {
        const { styles } = session;
        const parts = styles.parts(id);
        const row = styles.tree().find((entry) => entry.id === id);
        assert.isDefined(parts, `the row ${id} is still there`);
        assert.isDefined(row, `the row ${id} is still in the tree`);
        const layers = [parts?.node, parts?.edge].filter((layer) => layer !== undefined);
        assert.include(layers, id, "the row's id is one of its layers");

        return {
            name: row?.name ?? "",
            matched: layers.map((layer) => styles.counts(layer).matched),
            whole: JSON.stringify([styles.list(), styles.tree()]),
        };
    }

    /**
     * Walk a row through every change of kind, then undo each one.
     * @param session - The session.
     * @param id - The row, painting nodes.
     */
    async function walk(session: GraphSession, id: string): Promise<void> {
        const { styles } = session;
        const first = shot(session, id);
        const shots = [first];
        for (const target of ["edge", "node", "both", "edge", "both", "node"] as const) {
            const steps = session.history.steps.length;
            const row = await styles.writeRow(id, { target });
            assert.strictEqual(row.id, id, `${target}: the row keeps its id`);
            assert.strictEqual(row.target, target);
            assert.lengthOf(session.history.steps, steps + 1, `${target}: one step`);
            assert.include(session.history.steps.at(-1)?.label ?? "", first.name, "the step names the row");

            const now = shot(session, id);
            assert.strictEqual(now.name, first.name, `${target}: the row keeps its name`);
            assert.lengthOf(now.matched, target === "both" ? 2 : 1);
            for (const matched of now.matched) {
                assert.isAbove(matched, 0, `${target}: every part matches something`);
            }
            shots.push(now);
        }

        for (let at = shots.length - 2; at >= 0; at--) {
            await session.undo();
            assert.strictEqual(shot(session, id).whole, shots[at].whole, `undo restores step ${at}`);
        }
    }

    it("keeps Degree's run row through every change, and undo restores each", async () => {
        const session = await named();
        await session.runs.start("degree", {}, { as: "deg" });
        await session.styles.settled();
        const [row] = session.styles.tree();
        assert.strictEqual(session.styles.get(row.id)?.source.by, "run");

        await walk(session, row.id);
        session.dispose();
    });

    it("keeps a reader's 'name contains Val' row through every change, and undo restores each", async () => {
        const session = await named();
        const row = await session.styles.addRow({
            name: "name contains Val",
            target: "node",
            selector: { match: "rule", where: { kind: "text", reads: "data.name", mode: "substring", text: "Val" } },
            set: { color: "#ff0000" },
        });

        await walk(session, row.id);
        assert.deepStrictEqual(session.styles.get(row.id)?.set, { "node.color": "#ff0000" });
        session.dispose();
    });

    it("carries a node rule to the edges touching those nodes, and drops the values the row no longer paints", async () => {
        const session = await named();
        const row = await session.styles.addRow({
            name: "Valjean",
            target: "node",
            selector: { match: "rule", where: { kind: "text", reads: "data.name", mode: "exact", text: "Valjean" } },
            set: { color: "#ff0000", shape: "box" },
        });

        const edges = await session.styles.writeRow(row.id, { target: "edge" });
        assert.strictEqual(session.styles.counts(row.id).matched, degreeOf("Valjean"));
        assert.isUndefined(session.styles.get(edges.id)?.set, "node values went with the node part");
        session.dispose();
    });

    it("carries an edge rule to the nodes at the ends of those edges", async () => {
        const session = await named();
        const row = await session.styles.addRow({
            name: "Close ties",
            target: "edge",
            selector: { match: "rule", where: { kind: "categories", attribute: "data.tie", values: ["close"] } },
            set: { width: 3 },
        });
        assert.strictEqual(session.styles.counts(row.id).matched, degreeOf("Valjean"));

        const nodes = await session.styles.writeRow(row.id, { target: "node" });
        assert.strictEqual(nodes.id, row.id);
        assert.strictEqual(session.styles.counts(row.id).matched, degreeOf("Valjean") + 1, "Valjean and his neighbors");
        session.dispose();
    });

    it("keeps a rule that reads nothing kind-specific as it is", async () => {
        const session = await named();
        const row = await session.styles.addRow({
            name: "Everything",
            target: "node",
            selector: { match: "everything" },
            set: { color: "#ff0000" },
        });

        await session.styles.writeRow(row.id, { target: "edge" });
        assert.deepStrictEqual(session.styles.get(row.id)?.selector, { match: "everything" });
        assert.strictEqual(session.styles.counts(row.id).matched, lesMiserables().src.length);
        session.dispose();
    });
});
