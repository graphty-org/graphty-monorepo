/**
 * @file `session.hidden`: nodes hidden from the drawing only. A hidden node and the edges touching
 * it are painted not visible, while the data, a run's result, the visible scope and an export still
 * hold them; hiding is an undoable step and a project file keeps it.
 */

import { exportGraphToString } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { ElementSession } from "../../src/session/types";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { withConsumerStrictState } from "./helpers";

/**
 * A run that gives each node of the path a score.
 * @param context - The run being executed.
 * @returns The outcome.
 */
async function scores(context: RunExecutionContext): Promise<RunOutcome> {
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
 * A session over a path a - b - c.
 * @returns The session.
 */
async function path(): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute: scores } });
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);

    return session;
}

/**
 * Repaint every layer, then read which nodes and edges are drawn.
 * @param session - The session.
 * @returns For each node id and each edge row, whether it is drawn.
 */
async function drawn(session: GraphSession): Promise<{ nodes: Record<string, boolean>; edges: boolean[] }> {
    const element = session as ElementSession;
    await element.paint.repaintAll(element.styles.compiled(), {
        signal: new AbortController().signal,
        report: () => undefined,
    });
    const snapshot = session.data.snapshot();
    const nodes: Record<string, boolean> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        nodes[String(snapshot.ids.idOf(row))] = element.paint.styleOf("node", row)["node.visible"] !== false;
    }

    const edges = Array.from(
        { length: snapshot.edgeCount },
        (_, row) => element.paint.styleOf("edge", row)["edge.visible"] !== false,
    );

    return { nodes, edges };
}

describe("session.hidden", () => {
    it("hides nothing by default", async () => {
        const session = await path();
        assert.strictEqual(session.hidden.ids.size, 0);
        assert.deepEqual(await drawn(session), { nodes: { a: true, b: true, c: true }, edges: [true, true] });
        session.dispose();
    });

    it("stops drawing a hidden node and every edge touching it, and only those", async () => {
        const session = await path();
        await session.hidden.add(["c"]);
        assert.isTrue(session.hidden.ids.has("c"));
        assert.deepEqual(await drawn(session), { nodes: { a: true, b: true, c: false }, edges: [true, false] });

        await session.hidden.add(["b"]);
        assert.deepEqual(await drawn(session), { nodes: { a: true, b: false, c: false }, edges: [false, false] });

        await session.hidden.remove(["b", "c"]);
        assert.deepEqual(await drawn(session), { nodes: { a: true, b: true, c: true }, edges: [true, true] });
        session.dispose();
    });

    it("leaves the node in the data, the visible scope, a run's result and an export", async () => {
        const session = await path();
        await session.hidden.add(["b"]);

        assert.strictEqual(session.data.snapshot().nodeCount, 3);
        assert.strictEqual(session.status.counts.nodes, 3);
        assert.isTrue(session.visibility.nodes.has("b"), "hidden is not filtered");
        const result = await session.runs.start("louvain", undefined, { style: false });
        assert.isDefined(result.node("b"), "the hidden node keeps its result");
        const exported = JSON.parse(await exportGraphToString(session.data.snapshot(), "json")) as {
            nodes: { id: string }[];
            edges: unknown[];
        };
        assert.includeMembers(
            exported.nodes.map((node) => node.id),
            ["a", "b", "c"],
        );
        assert.lengthOf(exported.edges, 2);
        session.dispose();
    });

    it("is one undoable step each way", async () => {
        const session = await path();
        await session.hidden.add(["a"]);
        assert.isFalse((await drawn(session)).nodes.a);

        await session.undo();
        assert.strictEqual(session.hidden.ids.size, 0);
        assert.isTrue((await drawn(session)).nodes.a, "undo draws it again");

        await session.redo();
        assert.isTrue(session.hidden.ids.has("a"));
        assert.isFalse((await drawn(session)).nodes.a, "redo hides it again");
        session.dispose();
    });

    it("takes an integer id written either way", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: 34 }, { id: 35 }]);
        await session.hidden.add(["34"]);
        assert.isTrue(session.hidden.ids.has(34));
        assert.isFalse((await drawn(session)).nodes["34"]);
        await session.hidden.remove([34]);
        assert.strictEqual(session.hidden.ids.size, 0);
        session.dispose();
    });

    it("survives a project save and open", async () => {
        const session = await path();
        await session.hidden.add(["c"]);
        const { text } = await session.project.save();

        const opened = createGraphSession();
        await opened.project.open(text);
        assert.deepEqual([...opened.hidden.ids], ["c"]);
        assert.deepEqual(await drawn(opened), { nodes: { a: true, b: true, c: false }, edges: [true, false] });

        // Opening a project with nothing hidden clears what was.
        const plain = await path();
        await opened.project.open((await plain.project.save()).text, { discard: true });
        assert.strictEqual(opened.hidden.ids.size, 0);
        session.dispose();
        opened.dispose();
        plain.dispose();
    });

    it.each(["add", "remove"] as const)("hidden.%s costs no more than linear in the graph", async (verb) => {
        await assertScalesLinearly(
            (size) =>
                withConsumerStrictState(async () => {
                    const session = createGraphSession();
                    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
                    await session.data.addNodes(ids.map((id) => ({ id })));
                    await session.data.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
                    if (verb === "remove") {
                        await session.hidden.add(["n1"]);
                    }

                    const visits = await visitsDuring(() => session.hidden[verb](["n1"]));
                    session.dispose();
                    return visits;
                }),
            { sizes: [200, 800], growth: "linear", counter: `elements visited by SessionHidden.${verb}` },
        );
    });
});
