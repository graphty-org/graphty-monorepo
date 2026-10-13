/**
 * @file A run's layers behave like a reader's: a route that paints nodes and edges is one style
 * row, every run layer's selector reads back as an editable rule that matches the same elements,
 * a row's kind changes in place, and with `runPlacement: "top"` a later run sits above an earlier.
 */

import { lesMiserables } from "@graphty/graph-samples/datasets/les-miserables";
import { assert, describe, it } from "vitest";

import type { FieldDescriptor, RuleTree } from "../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { selectorRule } from "../../src/session/styles";

/** A shortest route in Les Miserables, four hops. */
const ROUTE = ["Napoleon", "Myriel", "Valjean", "Fantine", "Tholomyes"];

/**
 * One field a run publishes.
 * @param runId - The run.
 * @param name - The field.
 * @param kind - Which half carries it.
 * @param type - Its value type.
 * @returns The descriptor.
 */
function field(runId: string, name: string, kind: "node" | "edge", type: FieldDescriptor["type"]): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.${runId}.${name}` };
}

/**
 * A session over Les Miserables whose runs publish what the element's own would, in the same
 * shapes: degree, Louvain (four groups by node order), edge betweenness, and the shortest route,
 * whose membership is false for every element off the route.
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    const execute = async (context: RunExecutionContext): Promise<RunOutcome> => {
        await Promise.resolve();
        const nodes = session.data.nodes();
        const edges = session.data.edges();
        const base = {
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
        } as const;
        const { runId } = context;
        switch (context.algorithm) {
            case "degree":
                return {
                    result: createRunResult({
                        ...base,
                        shape: "node-metric",
                        fields: [field(runId, "value", "node", "number")],
                        nodes: nodes.map((node) => ({
                            id: node.id,
                            values: { value: edges.filter((e) => e.source === node.id || e.target === node.id).length },
                        })),
                    }),
                };
            case "louvain":
                return {
                    result: createRunResult({
                        ...base,
                        shape: "community",
                        fields: [field(runId, "group", "node", "integer")],
                        nodes: nodes.map((node, at) => ({ id: node.id, values: { group: at % 4 } })),
                    }),
                };
            case "edge-betweenness":
                return {
                    result: createRunResult({
                        ...base,
                        shape: "edge-metric",
                        fields: [field(runId, "value", "edge", "number")],
                        edges: edges.map((edge, at) => ({ id: edge.id, values: { value: at } })),
                    }),
                };
            default: {
                const steps = new Set(ROUTE.slice(1).map((id, at) => `${ROUTE[at]}|${id}`));
                const on = (a: unknown, b: unknown): boolean =>
                    steps.has(`${String(a)}|${String(b)}`) || steps.has(`${String(b)}|${String(a)}`);
                return {
                    result: createRunResult({
                        ...base,
                        shape: "path",
                        fields: [field(runId, "onPath", "node", "boolean"), field(runId, "onPath", "edge", "boolean")],
                        nodes: nodes.map((node) => ({
                            id: node.id,
                            values: { onPath: ROUTE.includes(String(node.id)) },
                        })),
                        edges: edges.map((edge) => ({ id: edge.id, values: { onPath: on(edge.source, edge.target) } })),
                    }),
                };
            }
        }
    };
    const session = createGraphSession({ runs: { execute } });
    const sample = lesMiserables();
    const ids = sample.ids ?? [];
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges([...sample.src].map((src, e) => ({ source: ids[src], target: ids[sample.dst[e]] })));

    return session;
}

/**
 * Run an algorithm and let its suggested layers land.
 * @param session - The session.
 * @param algorithm - Which.
 * @param as - The run's id.
 */
async function run(session: GraphSession, algorithm: string, as: string): Promise<void> {
    await session.runs.start(algorithm, {}, { as });
    await session.styles.settled();
}

/**
 * Every value path a rule's leaves read.
 * @param rule - The rule.
 * @returns The paths.
 */
function leafPaths(rule: RuleTree): string[] {
    switch (rule.kind) {
        case "all":
        case "any":
            return rule.of.flatMap(leafPaths);
        case "not":
            return leafPaths(rule.of);
        case "text":
            return [rule.reads];
        case "range":
        case "categories":
            return [rule.attribute];
        case "threshold":
            return [rule.path];
        default:
            return [];
    }
}

/**
 * The run's layers, bottom first.
 * @param session - The session.
 * @param runId - The run.
 * @returns Its layers.
 */
function layersOf(session: GraphSession, runId: string): ReturnType<GraphSession["styles"]["list"]> {
    return session.styles.list().filter((layer) => layer.source.by === "run" && layer.source.runId === runId);
}

describe("a run's style layers", () => {
    it("are one row for a route that paints nodes and edges, painting only the route", async () => {
        const session = await lesMis();
        await run(session, "shortest-path", "route");

        const [row] = session.styles.tree();
        assert.lengthOf(session.styles.tree(), 1, "one row for the route");
        assert.strictEqual(row.kind, "layer");
        const parts = layersOf(session, "route");
        assert.deepStrictEqual(
            parts.map((layer) => layer.target),
            ["node", "edge"],
            "a node part and an edge part",
        );
        assert.isTrue(
            parts.every((layer) => layer.row === row.id && layer.name === parts[0].name),
            "both parts carry the row and its name",
        );
        const [nodes, edges] = parts;
        assert.strictEqual(session.styles.counts(nodes.id).painted["node.color"], ROUTE.length);
        assert.strictEqual(session.styles.counts(edges.id).painted["edge.color"], ROUTE.length - 1);
        session.dispose();
    });

    it("read back as a rule over the run's value that matches the same elements", async () => {
        const session = await lesMis();
        const runs = [
            ["degree", "deg"],
            ["louvain", "lv"],
            ["edge-betweenness", "eb"],
            ["shortest-path", "route"],
        ] as const;
        for (const [algorithm, as] of runs) {
            await run(session, algorithm, as);
        }

        for (const [, as] of runs) {
            for (const layer of layersOf(session, as)) {
                const rule = selectorRule(layer.selector);
                assert.isDefined(rule, `${layer.name} reads as a rule`);
                const where = rule?.where ?? { kind: "all", of: [] };
                assert.isTrue(
                    leafPaths(where).some((path) => path.startsWith(`results.${as}.`)),
                    `${layer.name}'s rule names the run's value: ${JSON.stringify(where)}`,
                );
                const channel = layer.target === "node" ? "node.size" : "edge.width";
                const copy = await session.styles.add({
                    name: `${layer.name} again`,
                    target: layer.target,
                    selector: { match: "rule", where },
                    set: { [channel]: 2 },
                });
                assert.strictEqual(
                    session.styles.counts(copy.id).matched,
                    session.styles.counts(layer.id).matched,
                    `${layer.name}: the rule matches what the layer matches`,
                );
                assert.isAbove(session.styles.counts(copy.id).matched, 0);
            }
        }

        session.dispose();
    });

    it("keep a category door's rule, 'group is 3', with its path and value", async () => {
        const session = await lesMis();
        await run(session, "louvain", "lv");
        const [louvain] = layersOf(session, "lv");
        const where: RuleTree = { kind: "categories", attribute: "results.lv.group", values: ["3"] };
        const layer = await session.styles.add(
            { name: "Louvain 3", target: "node", selector: { match: "rule", where }, set: { "node.color": "#00ff00" } },
            { above: louvain.id },
        );

        const read = selectorRule(session.styles.get(layer.id)?.selector ?? { match: "everything" });
        assert.deepStrictEqual(read, { match: "rule", where });
        const groupThree = (lesMiserables().ids ?? []).filter((_, at) => at % 4 === 3).length;
        assert.strictEqual(session.styles.counts(layer.id).matched, groupThree);
        session.dispose();
    });
});

describe("a row's kind", () => {
    it("changes in place: a node row takes an edge part in one undo step, and undo takes it away", async () => {
        const session = await lesMis();
        const { styles } = session;
        const row = await styles.addRow({
            name: "Key people",
            target: "node",
            selector: { match: "everything" },
            set: { color: "#ff0000" },
        });
        const steps = session.history.steps.length;

        const both = await styles.writeRow(row.id, { target: "both" });
        assert.strictEqual(both.id, row.id, "the row keeps its id");
        assert.strictEqual(both.target, "both");
        assert.isDefined(both.edge);
        assert.lengthOf(session.history.steps, steps + 1, "one step");
        assert.deepStrictEqual(
            styles.tree().map((entry) => entry.id),
            [row.id],
            "still one row",
        );
        assert.isUndefined(styles.get(both.edge ?? "")?.set, "the new part writes nothing yet");

        // Its first write reaches the new part.
        await styles.writeRow(row.id, { set: { "edge.width": 3 } });
        assert.strictEqual(styles.counts(both.edge ?? "").painted["edge.width"], lesMiserables().src.length);

        await session.undo();
        await session.undo();
        const back = styles.list().filter((layer) => !layer.locked);
        assert.deepStrictEqual(
            back.map((layer) => [layer.id, layer.target]),
            [[row.id, "node"]],
            "undo restores the node row",
        );

        // And back the other way: Both to Edges drops the node part, keeping the row's id.
        const edgesOnly = await styles.writeRow(row.id, { target: "both", set: { "edge.width": 2 } });
        const dropped = await styles.writeRow(row.id, { target: "edge" });
        assert.strictEqual(dropped.id, row.id);
        assert.strictEqual(dropped.target, "edge");
        assert.strictEqual(dropped.edge, row.id, "the row id stays a layer id");
        assert.isDefined(edgesOnly.edge);
        assert.deepStrictEqual(
            styles.tree().map((entry) => entry.id),
            [row.id],
        );
        session.dispose();
    });
});

describe("runPlacement top", () => {
    it("puts a later run's row above an earlier run's", async () => {
        const session = await lesMis();
        await session.config.set({ runPlacement: "top", startingRows: true });
        await session.styles.settled();
        await session.styles.add({
            name: "Key people",
            target: "node",
            selector: { match: "ids", nodes: ["Valjean"] },
            set: { "node.color": "#ff0000" },
        });

        await run(session, "degree", "deg");
        await run(session, "edge-betweenness", "eb");
        await run(session, "shortest-path", "route");

        const names = session.styles.tree().map((row) => row.name);
        const [route] = layersOf(session, "route");
        const [bridges] = layersOf(session, "eb");
        const [degree] = layersOf(session, "deg");
        assert.isAbove(names.indexOf(route.name), names.indexOf(bridges.name), names.join(", "));
        assert.isAbove(names.indexOf(bridges.name), names.indexOf(degree.name), names.join(", "));
        assert.isAbove(names.indexOf(degree.name), names.indexOf("Key people"), names.join(", "));
        session.dispose();
    });
});
