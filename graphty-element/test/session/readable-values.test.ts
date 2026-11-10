/**
 * @file `session.data.readableValues()`: one list of every value a rule or a binding can read.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { degrees, louvain } from "@graphty/algorithms";
import { assert, describe, it } from "vitest";

import { algorithmByKey } from "../../src/catalog/algorithms";
import type { ReadableValue, RuleTree } from "../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { lesMiserables } from "../helpers/les-miserables";

/** The Les Miserables network, read once: the snapshot is frozen, so every test can share it. */
const LES_MISERABLES = await lesMiserables();

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
    const sample = LES_MISERABLES;
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
    const found = values.filter((value) => value.end === undefined && value.path.endsWith(suffix));
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

    it("says when a data column holds each node's own id, and not when it holds anything else", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", key: "a", code: "x" },
            { id: "b", key: "b", code: "b" },
            { id: 3, key: "3", code: "3" },
        ]);
        const values = session.data.readableValues();

        assert.isTrue(entry(values, "data.key").holdsNodeIds, "every value spells its node's id");
        assert.isUndefined(entry(values, "data.code").holdsNodeIds, "one value is not its node's id");
        assert.isTrue(entry(values, "data.id").holdsNodeIds, "the id each node was added with, kept as data");
        assert.isUndefined(
            values.find((value) => value.path === "id")?.holdsNodeIds,
            "the node id itself is not a data column",
        );

        await session.data.addNodes([{ id: "d" }]);
        assert.isUndefined(
            entry(session.data.readableValues(), "data.key").holdsNodeIds,
            "a node with no value leaves it unsaid",
        );
    });

    it("says which layers read a value, a run's field as well as a data column", async () => {
        const session = await lesMisAfterRuns();
        const before = session.data.readableValues();
        assert.isUndefined(entry(before, ".value").usedBy, "nothing reads Degree yet");

        const degree = entry(before, ".value");
        const sized = await session.styles.add({
            name: "Sized",
            target: "node",
            selector: { match: "has", path: degree.path },
            encode: { "node.size": { by: degree.path } },
        });
        const named = await session.styles.add({
            name: "Named",
            target: "node",
            selector: { match: "has", path: "data.name" },
            set: { "node.color": "#d62728" },
        });
        await session.styles.settled();

        const after = session.data.readableValues();
        assert.deepEqual(entry(after, ".value").usedBy, [{ kind: "layer", id: sized.id }]);
        assert.deepEqual(entry(after, "data.name").usedBy, [{ kind: "layer", id: named.id }]);
        assert.isUndefined(entry(after, ".group").usedBy, "Louvain's groups are read by nothing");
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

    it("counts a number column's distinct values: College football's conference has 12", async () => {
        const session = createGraphSession();
        const gml = readFileSync(join(__dirname, "..", "helpers", "corpus", "gml", "football.gml"), "utf8");
        await session.data.import({ type: "gml", config: { data: gml } });

        const conference = entry(session.data.readableValues(), "data.value");
        assert.strictEqual(conference.kind, "number");
        assert.deepEqual(conference.range, { min: 0, max: 11 });
        assert.strictEqual(conference.valueCount, 12);
        assert.deepStrictEqual(
            [...conference.tests],
            ["range", "top", "above", "categories"],
            "a number with few values gets number and category tests",
        );
    });

    it("says which rule tests each value takes", async () => {
        const session = await lesMisAfterRuns();
        const values = session.data.readableValues();

        assert.deepStrictEqual([...entry(values, "data.name").tests], ["categories", "text"]);
        assert.deepStrictEqual([...entry(values, ".group").tests], ["categories", "text"]);
        assert.include([...entry(values, ".value").tests], "top");
        const id = values.find((value) => value.path === "id");
        assert.deepStrictEqual([...(id?.tests ?? [])], ["text"]);
        const atSource = values.find((value) => value.end === "source" && value.path.endsWith(".value"));
        assert.notInclude([...(atSource?.tests ?? ["top"])], "top", "a top reads data and results paths only");
    });

    it("says a column of colors holds colors, and a column of names does not", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", fill: "#ff0000", name: "Bob" },
            { id: "b", fill: "#00f", name: "Valjean" },
            { id: "c", fill: "rebeccapurple", name: "Red" },
        ]);
        const values = session.data.readableValues();

        assert.isTrue(entry(values, "data.fill").valuesAreColors);
        assert.isUndefined(entry(values, "data.name").valuesAreColors, "one name that is a color is not enough");
        assert.isTrue(session.data.attributes().find((column) => column.path === "data.fill")?.valuesAreColors);
    });

    it("lists each node value at an edge's source and target, and a rule reads it", async () => {
        const session = await lesMisAfterRuns();
        const values = session.data.readableValues();

        const sourceName = values.find((value) => value.path === "graphty.source.data.name");
        assert.isDefined(sourceName);
        assert.strictEqual(sourceName.on, "edge");
        assert.strictEqual(sourceName.end, "source");
        assert.strictEqual(sourceName.plainName, "name", "the node value's own name");
        const targetDegree = values.find((value) => value.end === "target" && value.path.endsWith(".value"));
        assert.isDefined(targetDegree);
        assert.strictEqual(targetDegree.plainName, "Connections");
        assert.deepEqual(targetDegree.range, { min: 1, max: 36 });

        const ends: RuleTree = {
            kind: "any",
            of: ["Valjean", "Myriel"].map((text) => ({
                kind: "text" as const,
                reads: "graphty.source.data.name",
                mode: "exact" as const,
                text,
            })),
        };
        const spec = {
            name: "From Valjean or Myriel",
            target: "edge" as const,
            selector: { match: "rule" as const, where: ends },
            set: { "edge.color": "#d62728" },
        };
        assert.deepEqual([...session.styles.validate(spec).unresolvedPaths], [], "an end path is answered");
        const layer = await session.styles.add(spec);
        await session.styles.settled();

        const snapshot = session.data.snapshot();
        let expected = 0;
        for (let edge = 0; edge < snapshot.edgeCount; edge++) {
            const source = snapshot.ids.idOf(snapshot.edgeSource(edge));
            expected += source === "Valjean" || source === "Myriel" ? 1 : 0;
        }

        assert.isAbove(expected, 0);
        assert.strictEqual(session.styles.counts(layer.id).matched, expected);
    });
});

describe("session.find over every readable value", () => {
    it("offers Connections by name after Degree has run, with the elements at its top quarter", async () => {
        const session = await lesMisAfterRuns();
        const degree = entry(session.data.readableValues(), ".value");

        const found = session.find("degree");
        const named = found.named?.find((row) => row.path === degree.path);
        assert.isDefined(named, JSON.stringify(found.named));
        assert.strictEqual(named.plainName, "Connections");
        assert.isDefined(named.atLeast);
        const snapshot = session.data.snapshot();
        const result = session.results.get(degree.runId ?? "");
        const counts = Array.from({ length: snapshot.nodeCount }, (_, at) =>
            Number(result?.node(snapshot.ids.idOf(at))?.value),
        );
        const { value, count } = named.atLeast;
        assert.strictEqual(count, counts.filter((each) => each >= value).length);
        assert.isAtLeast(count * 4, snapshot.nodeCount, "a quarter or more");
        assert.isBelow(counts.filter((each) => each > value).length * 4, snapshot.nodeCount, "the largest such value");
    });

    it("reads a run's values: typing 10 offers Connections is 10 or more", async () => {
        const session = await lesMisAfterRuns();
        const degree = entry(session.data.readableValues(), ".value");

        const found = session.find("10");
        const row = found.values.find((value) => value.path === degree.path);
        assert.isDefined(row, JSON.stringify(found.values.map((value) => value.path)));
        assert.strictEqual(row.value, 10);
        assert.isDefined(row.atLeast);
        assert.isAbove(row.atLeast.count, row.count);
    });

    it("offers one rule per distinct set of matches: Mme on Les Miserables", async () => {
        const session = await lesMisAfterRuns();

        const contains = session.find("Mme").contains ?? [];
        assert.isAbove(contains.length, 0);
        const sets = contains.map((row) =>
            JSON.stringify([row.kind, "nodes" in row.target ? [...(row.target.nodes ?? [])].sort() : []]),
        );
        assert.strictEqual(new Set(sets).size, sets.length, JSON.stringify(contains.map((row) => row.path)));
        assert.notInclude(
            contains.map((row) => row.path),
            "id",
            "the node id names the same nodes as the name column here, so only the name is offered",
        );
    });
});

describe("session.data.valueCounts()", () => {
    it("counts a run's groups, a data column and an end's value, most first, with the gaps", async () => {
        const session = await lesMisAfterRuns();
        const values = session.data.readableValues();
        const nodes = session.data.statistics().nodeCount;

        const group = session.data.valueCounts(entry(values, ".group").path);
        assert.strictEqual(group.total, nodes);
        assert.strictEqual(group.missing, 0);
        assert.strictEqual(
            group.values.reduce((sum, each) => sum + each.count, 0),
            nodes,
        );
        const counts = group.values.map((each) => each.count);
        assert.deepEqual(
            counts,
            [...counts].sort((a, b) => b - a),
            "largest group first",
        );

        const name = session.data.valueCounts("data.name");
        assert.strictEqual(name.values.length, nodes, "each name once");
        assert.strictEqual(name.values[0].count, 1);

        const ids = session.data.valueCounts("id");
        assert.strictEqual(ids.values.length, nodes);

        const edges = session.data.statistics().edgeCount;
        const source = session.data.valueCounts("graphty.source.data.name", { kind: "edge" });
        assert.strictEqual(source.total, edges);
        assert.strictEqual(source.missing, 0);
    });

    it("says how many carry no value", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a", kind: "x" }, { id: "b", kind: "x" }, { id: "c" }]);
        const kind = session.data.valueCounts("data.kind");
        assert.deepEqual(kind, { values: [{ value: "x", count: 2 }], missing: 1, total: 3 });
    });
});

describe("valueKind and field facts", () => {
    it("reads each value's kind from its type, its measurement, a declared order and list values", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            {
                id: "a",
                age: 30,
                staff: true,
                tags: ["red", "blue"],
                level: "low",
                seen: "2001-02-03T00:00:00Z",
                note: "x1",
            },
            { id: "b", age: 41, staff: false, tags: ["red"], level: "high", seen: "2002-03-04T00:00:00Z", note: "x2" },
            { id: "c", age: 52, staff: true, tags: [], level: "low", seen: "2003-04-05T00:00:00Z", note: "x3" },
        ]);
        await session.data.declare({ kind: "node", name: "level" }, { measurement: "ordinal", order: ["low", "high"] });
        await session.data.declare({ kind: "node", name: "seen" }, { measurement: "time" });
        const values = session.data.readableValues();
        const kindOf = (suffix: string): unknown => entry(values, suffix).valueKind;
        assert.strictEqual(kindOf("data.age"), "number");
        assert.strictEqual(kindOf("data.staff"), "flag");
        assert.strictEqual(kindOf("data.tags"), "tags");
        assert.strictEqual(kindOf("data.level"), "ordered");
        assert.strictEqual(kindOf("data.seen"), "time");
        assert.strictEqual(values[0].path, "id");
        assert.strictEqual(values[0].valueKind, "text");
        assert.isTrue(session.data.structureValues().every((each) => each.valueKind === "number"));
    });

    it("carries a run field's declared facts: a rank counts down, a community's numbers are unstable", async () => {
        const session = await lesMisAfterRuns();
        const values = session.data.readableValues();
        assert.deepEqual(entry(values, ".rank").facts, { polarity: "lower" });
        assert.deepEqual(entry(values, ".percentile").facts, { domain: { min: 0, max: 1 } });
        assert.deepEqual(entry(values, ".group").facts, { unstable: true });
        assert.strictEqual(entry(values, ".group").valueKind, "category");
        assert.isUndefined(entry(values, ".value").facts);
    });

    it("declares what a search's unreached nodes mean", () => {
        const level = algorithmByKey("bfs")?.fields.find((field) => field.name === "level");
        const distance = algorithmByKey("shortest-path")?.fields.find((field) => field.name === "distance");
        assert.strictEqual(level?.missing, "unreached");
        assert.deepEqual([distance?.missing, distance?.polarity], ["unreached", "lower"]);
        assert.include(algorithmByKey("betweenness")?.keywords ?? [], "bridges");
    });
});
