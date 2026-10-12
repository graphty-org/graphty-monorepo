/**
 * @file `session.data.readableValues()`: one list of every value a rule or a binding can read.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { degrees, louvain } from "@graphty/algorithms";
import { lesMiserables } from "@graphty/graph-samples/datasets/les-miserables";
import { assert, describe, it } from "vitest";

import { algorithmByKey } from "../../src/catalog/algorithms";
import type { ReadableValue } from "../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

/**
 * Runs Degree and Louvain with the algorithms package over the session's graph, publishing the
 * fields the element's catalog declares for each.
 * @param session - Read when a run starts.
 * @param context - The run.
 * @returns The outcome.
 */
function execute(session: () => GraphSession, context: RunExecutionContext): Promise<RunOutcome> {
    const snapshot = session().data.snapshot();
    const ids = Array.from({ length: snapshot.nodeCount }, (_, index) => snapshot.ids.idOf(index));
    const community = context.algorithm === "louvain";
    const fields = (algorithmByKey(context.algorithm)?.fields ?? []).map((field) => ({
        ...field,
        path: `results.${context.runId}.${field.name}`,
    }));
    const counted = degrees(snapshot);
    const groups = community ? louvain(snapshot.toUndirected().snapshot).labels : null;
    const result = createRunResult({
        runId: context.runId,
        shape: community ? "community" : "node-metric",
        fields,
        measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
        nodes: ids.map((id, index) => ({
            id,
            values:
                groups === null
                    ? {
                          value: counted.inDegree[index] + counted.outDegree[index],
                          inDegree: counted.inDegree[index],
                          outDegree: counted.outDegree[index],
                      }
                    : { group: groups[index] },
        })),
        caveats: {
            exact: true,
            direction: "as-loaded",
            precision: "f64",
            method: context.algorithm,
            facts: [],
            notes: [],
        },
        durationMs: 1,
    });

    return Promise.resolve({ result });
}

/**
 * A session that runs Degree and Louvain.
 * @returns The session.
 */
function sessionWithRuns(): GraphSession {
    const session: GraphSession = createGraphSession({
        runs: { execute: (context) => execute(() => session, context) },
    });
    return session;
}

/**
 * Les Miserables, each node carrying its name as data, after Degree and Louvain.
 * @returns The session.
 */
async function lesMisAfterRuns(): Promise<GraphSession> {
    const sample = lesMiserables();
    const ids = sample.ids ?? [];
    const session = sessionWithRuns();
    await session.config.set({ data: { directed: false } });
    await session.data.addNodes(ids.map((id) => ({ id, name: id })));
    await session.data.addEdges([...sample.src].map((src, e) => ({ source: ids[src], target: ids[sample.dst[e]] })));
    await session.runs.start("degree", undefined, { style: false });
    await session.runs.start("louvain", {}, { style: false });

    return session;
}

/**
 * The one entry whose path ends with a suffix.
 * @param values - The list.
 * @param suffix - The path's end.
 * @returns The entry.
 */
function entry(values: readonly ReadableValue[], suffix: string): ReadableValue {
    const found = values.filter((value) => value.path.endsWith(suffix));
    assert.lengthOf(found, 1, `one entry ending ${suffix}: ${values.map((value) => value.path).join(", ")}`);

    return found[0];
}

describe("session.data.readableValues()", () => {
    it("lists the data columns and the run results with their path, kind and facts", async () => {
        const session = await lesMisAfterRuns();
        const values = session.data.readableValues();

        const name = entry(values, "data.name");
        assert.strictEqual(name.from, "data");
        assert.strictEqual(name.on, "node");
        assert.strictEqual(name.kind, "text");

        const degree = entry(values, ".value");
        assert.strictEqual(degree.from, "run");
        assert.strictEqual(degree.kind, "number");
        assert.strictEqual(degree.plainName, "Connections");
        assert.match(degree.path, /^results\.[^.]+\.value$/);
        assert.deepEqual(degree.range, { min: 1, max: 36 });
        assert.includeMembers([...degree.fits], ["color", "number"]);

        const group = entry(values, ".group");
        assert.strictEqual(group.kind, "category", "a partition's ids are groups, not amounts");
        assert.isUndefined(group.range);
        assert.isAbove(group.valueCount ?? 0, 1);
        assert.include([...group.fits], "color");
        assert.notInclude([...group.fits], "number", "groups do not drive a size");
    });

    it("leaves out incoming and outgoing connections on an undirected graph", async () => {
        const session = await lesMisAfterRuns();
        assert.strictEqual(session.data.statistics().directedness, "undirected");
        const paths = session.data.readableValues().map((value) => value.path);

        assert.isFalse(
            paths.some((path) => path.endsWith(".inDegree") || path.endsWith(".outDegree")),
            paths.join(", "),
        );
    });

    it("keeps them on a directed graph", async () => {
        const session = sessionWithRuns();
        await session.config.set({ data: { directed: true } });
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ source: "a", target: "b" }]);
        await session.runs.start("degree", undefined, { style: false });

        const values = session.data.readableValues();
        assert.strictEqual(entry(values, ".inDegree").kind, "number");
        assert.strictEqual(entry(values, ".outDegree").kind, "number");
    });

    it("keeps the node id and a data column named id apart on College football", async () => {
        const session = createGraphSession();
        const gml = readFileSync(join(__dirname, "..", "helpers", "corpus", "gml", "football.gml"), "utf8");
        await session.data.import({ type: "gml", config: { data: gml } });

        const ids = session.data.readableValues().filter((value) => value.path === "id" || value.path === "data.id");
        assert.lengthOf(ids, 2);
        const [element, column] = ids;
        assert.strictEqual(element.from, "element");
        assert.strictEqual(column.from, "data");
        assert.notStrictEqual(element.path, column.path);
        assert.notStrictEqual(element.plainName, column.plainName);
        assert.deepEqual(column.range, { min: 0, max: 114 });
    });

    it("a top 10 rule takes any number in the list, run results included", async () => {
        const session = await lesMisAfterRuns();
        const degree = entry(session.data.readableValues(), ".value");

        const layer = await session.styles.add({
            name: "Top 10 by connections",
            target: "node",
            selector: { match: "rule", where: { kind: "threshold", path: degree.path, top: 10 } },
            set: { "node.color": "#d62728" },
        });
        await session.styles.settled();

        // The tie policy takes a group of equal values whole or not at all: the two nodes with 12
        // connections share 10th place, so they would make 11 and both are left out.
        const top = session.results.get(degree.runId ?? "")?.top("value", 10);
        assert.isDefined(top);
        assert.deepEqual(top.leftOut, { value: 12, count: 2 });
        assert.strictEqual(session.styles.counts(layer.id).matched, top.entries.length);
        assert.strictEqual(top.entries.length, 9);

        const eleven = await session.styles.add({
            name: "Top 11 by connections",
            target: "node",
            selector: { match: "rule", where: { kind: "threshold", path: degree.path, top: 11 } },
            set: { "node.color": "#1f77b4" },
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(eleven.id).matched, 11);
    });
});
