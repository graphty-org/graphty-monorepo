/**
 * What a compiled selector reads when it is pointed at a real session.
 *
 * Every fixture below is a real `GraphStore`, a real snapshot with real attribute columns, and a
 * real `RunResult` built by the factory the element ships. A hand-made source would agree with
 * whatever this file asserted; the column shapes, the id map, the edge id convention and the
 * renumbering a compacting freeze performs are the whole subject, and none of them survive being
 * mocked.
 *
 * The assertions fall into four groups, and each group is a bug that was available instead:
 * presence answered two different ways by the two forms of one question; a path nothing answers
 * throwing out of a paint loop; a cached snapshot answering about a graph that has moved; and a
 * run-bound layer walking the graph instead of the run.
 */

import { assert, describe, it, vi } from "vitest";

import type { FieldDescriptor, NodeId } from "../../../src/catalog/types";
import { createRunResult } from "../../../src/session/results";
import type { Caveats, RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { compileSelector } from "../../../src/session/styles/selector";
import {
    createSelectorSource,
    type SelectorSourceParts,
    type SessionSelectorSource,
} from "../../../src/session/styles/sources";
import { edgeBetween, type Harness, makeSession } from "../helpers";

/** What qualifies the numbers a test run publishes. */
const CAVEATS: Caveats = {
    exact: true,
    direction: "as-loaded",
    precision: "f64",
    method: "test",
    notes: [],
};

/**
 * One field descriptor, spelled out, because a result publishes what it declares.
 * @param runId - The run publishing it.
 * @param name - The field name.
 * @param kind - Which half of the result it belongs to.
 * @param type - What its values are.
 * @returns The descriptor.
 */
function field(
    runId: string,
    name: string,
    kind: "edge" | "node",
    type: FieldDescriptor["type"],
): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.${runId}.${name}` };
}

/**
 * An executor that partitions the nodes it was given and says nothing about the rest.
 * @param groups - The group each measured node belongs to, by node id.
 * @returns The executor.
 */
function communities(groups: readonly (readonly [NodeId, string])[]) {
    return (context: RunExecutionContext): Promise<RunOutcome> =>
        Promise.resolve({
            result: createRunResult({
                runId: context.runId,
                shape: "community",
                fields: [field(context.runId, "group", "node", "string")],
                measured: { nodes: groups.length, edges: 0 },
                nodes: groups.map(([id, group]) => ({ id, values: { group } })),
                caveats: CAVEATS,
                durationMs: 1,
            }),
        });
}

/**
 * An executor that measures some of the edges and says nothing about the others.
 * @param entries - The value each measured edge carries, by edge id.
 * @returns The executor.
 */
function flows(entries: readonly (readonly [string, number])[]) {
    return (context: RunExecutionContext): Promise<RunOutcome> =>
        Promise.resolve({
            result: createRunResult({
                runId: context.runId,
                shape: "edge-metric",
                fields: [field(context.runId, "value", "edge", "number")],
                measured: { nodes: 0, edges: entries.length },
                edges: entries.map(([id, value]) => ({ id, values: { value } })),
                caveats: CAVEATS,
                durationMs: 1,
            }),
        });
}

/**
 * An executor that measures a number for some of the nodes.
 * @param values - The value each measured node carries, by node id.
 * @returns The executor.
 */
function metric(values: readonly (readonly [NodeId, number])[]) {
    return (context: RunExecutionContext): Promise<RunOutcome> =>
        Promise.resolve({
            result: createRunResult({
                runId: context.runId,
                shape: "node-metric",
                fields: [field(context.runId, "value", "node", "integer")],
                measured: { nodes: values.length, edges: 0 },
                nodes: values.map(([id, value]) => ({ id, values: { value } })),
                caveats: CAVEATS,
                durationMs: 1,
            }),
        });
}

/**
 * The element's ids for two of the fixture's three edges.
 *
 * The fixture adds a->b, b->c and c->d in that order, and the element stamps its edge counter in
 * arrival order, so these are the ids those two edges are addressed by everywhere. They are
 * written out rather than resolved from the session because a run executor is built BEFORE the
 * session it will run inside exists.
 */
const AB = "0";
/** The id of the c->d edge. See {@link AB}. */
const CD = "2";

/** A session, the source over it, and the store behind both. */
interface Fixture {
    /** The session harness, so a test can add data or reach the store. */
    readonly harness: Harness;
    /** The source under test. */
    readonly source: SessionSelectorSource;
}

/**
 * Four nodes, three edges, and the attributes carried BOTH ways.
 *
 * `kind` and `weight` are real snapshot columns, which is where an attribute lives once the store
 * carries one. `label` is only in the record bag, which is where every imported attribute lives
 * today. Both roads have to work, and a test that exercised one of them would leave the other
 * free to rot.
 * @param options - An executor for the session's runs.
 * @returns The fixture.
 */
function fixture(options: { execute?: (context: RunExecutionContext) => Promise<RunOutcome> } = {}): Fixture {
    const harness = makeSession(options.execute === undefined ? {} : { runs: { execute: options.execute } });

    harness.add(
        [
            { id: "a", label: "alpha" },
            { id: "b", label: "beta" },
            { id: "c", label: null },
            { id: "d" },
        ],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
        ],
    );

    const { builder } = harness.store;
    const kind = builder.declareNodeColumn({ name: "kind", dtype: "string" });
    const weight = builder.declareNodeColumn({ name: "weight", dtype: "f64" });
    const tier = builder.declareNodeColumn({ name: "tier", dtype: "string", default: "unranked" });
    const link = builder.declareEdgeColumn({ name: "link", dtype: "string" });

    builder.setNodeValue(kind, 0, "host");
    builder.setNodeValue(kind, 1, "switch");
    builder.setNodeValue(kind, 2, "host");
    builder.setNodeValue(kind, 3, "switch");
    builder.setNodeValue(weight, 0, 0);
    builder.setNodeValue(weight, 1, 4);
    builder.setNodeValue(weight, 3, 12);
    builder.setNodeValue(tier, 0, "core");
    builder.setEdgeValue(link, 0, "copper");
    builder.setEdgeValue(link, 2, "fibre");
    harness.store.touch();

    const parts: SelectorSourceParts = {
        snapshot: () => harness.session.snapshot(),
        results: (runId) => harness.session.runs.get(runId)?.result,
        records: {
            nodeAttributes: (index) => harness.nodeAttributes.get(index),
            edgeAttributes: (index) => harness.edgeAttributes.get(index),
        },
    };

    return { harness, source: createSelectorSource(parts) };
}

describe("a selector source over the session's own attributes", () => {
    it("reads a node attribute out of the snapshot's own column", () => {
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeValue(0, "data.kind"), "host");
        assert.strictEqual(source.nodeValue(1, "data.kind"), "switch");
        assert.strictEqual(source.nodeValue(1, "data.weight"), 4);
        // Zero is a measurement, and it has to come back as one: the whole reason the predicate
        // engine implements JMESPath truthiness rather than JavaScript's.
        assert.strictEqual(source.nodeValue(0, "data.weight"), 0);
        harness.session.dispose();
    });

    it("reads an edge attribute out of the snapshot's own column", () => {
        const { harness, source } = fixture();

        assert.strictEqual(source.edgeValue(0, "data.link"), "copper");
        assert.strictEqual(source.edgeValue(1, "data.link"), undefined);
        assert.strictEqual(source.edgeValue(2, "data.link"), "fibre");
        harness.session.dispose();
    });

    it("reads an attribute the store holds no column for out of the record it arrived with", () => {
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeValue(0, "data.label"), "alpha");
        assert.strictEqual(source.nodeValue(1, "data.label"), "beta");
        // A record that carries the key with a null and a record that never carried it at all are
        // the same fact to a selector, and both are absent.
        assert.strictEqual(source.nodeValue(2, "data.label"), null);
        assert.isFalse(source.nodeHas(2, "data.label"));
        assert.isFalse(source.nodeHas(3, "data.label"));
        harness.session.dispose();
    });

    it("reads a bare key exactly as it reads the published data. path", () => {
        // The session's filter value source strips the same prefix, and two readers over one
        // session that disagreed about what "kind" means is a wrong picture nobody would think to
        // look for.
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeValue(0, "kind"), source.nodeValue(0, "data.kind"));
        assert.strictEqual(source.nodeValue(0, "label"), source.nodeValue(0, "data.label"));
        harness.session.dispose();
    });

    it("answers presence from the column, and answers it the same way the value reader does", () => {
        const { harness, source } = fixture();

        for (let index = 0; index < 4; index++) {
            const value = source.nodeValue(index, "data.weight");
            const present = value !== undefined && value !== null;

            assert.strictEqual(
                source.nodeHas(index, "data.weight"),
                present,
                `node ${index}: "has" and the value reader must not disagree`,
            );
        }

        assert.isTrue(source.nodeHas(0, "data.weight"), "a measured zero is a value");
        assert.isFalse(source.nodeHas(2, "data.weight"), "the row nothing wrote carries nothing");
        harness.session.dispose();
    });

    it("counts a column's declared default as a value, because that is what the row reads", () => {
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeValue(0, "data.tier"), "core");
        assert.strictEqual(source.nodeValue(1, "data.tier"), "unranked", "an unset row reads the default");
        assert.isTrue(source.nodeHas(1, "data.tier"), "and a row that reads a value carries one");
        harness.session.dispose();
    });

    it("resolves one column once, however many elements read it", () => {
        const { harness, source } = fixture();
        const snapshot = harness.session.snapshot();
        const lookups = vi.spyOn(snapshot.nodes, "get");

        for (let index = 0; index < 4; index++) {
            source.nodeValue(index, "data.kind");
            source.nodeHas(index, "data.kind");
        }

        assert.strictEqual(lookups.mock.calls.length, 1, "eight reads, one column lookup");
        lookups.mockRestore();
        harness.session.dispose();
    });
});

describe("an edge's endpoints", () => {
    it("reads an edge's source and target ids, though the record no longer carries them", () => {
        // The fixture's edges arrived as { src, dst }, and those keys are removed from the record
        // a selector reads so the data table does not show them twice.
        const { harness, source } = fixture();

        assert.strictEqual(source.edgeValue(0, "data.source"), "a");
        assert.strictEqual(source.edgeValue(0, "data.target"), "b");
        assert.strictEqual(source.edgeValue(2, "source"), "c");
        assert.isTrue(source.edgeHas(1, "data.source"));
        assert.isTrue(source.edgeHas(1, "data.target"));
        assert.isUndefined(source.nodeValue(0, "data.source"), "a node has no endpoints");
        harness.session.dispose();
    });

    it("lets an edge layer select by source, and paints only the edges leaving that node", () => {
        const { harness, source } = fixture();
        const bySource = compileSelector({ match: "expression", where: "data.source == 'b'" }, "edge", source);
        const byTarget = compileSelector({ match: "has", path: "data.target" }, "edge", source);

        assert.deepStrictEqual([0, 1, 2].map((index) => bySource.test?.(index)), [false, true, false]);
        assert.deepStrictEqual([0, 1, 2].map((index) => byTarget.test?.(index)), [true, true, true]);
        harness.session.dispose();
    });

    it("keeps a `source` attribute the edge really carries, with its endpoints under src/dst", () => {
        const { harness, source } = fixture();

        // Edge 1 arrived as { src: "b", dst: "c", source: "crawler" }: a provenance field.
        harness.edgeAttributes.set(1, { source: "crawler" });

        assert.strictEqual(source.edgeValue(1, "data.source"), "crawler");
        assert.strictEqual(source.edgeValue(1, "data.target"), "c", "the other endpoint still reads");
        assert.strictEqual(source.edgeValue(0, "data.source"), "a", "an edge without one reads its endpoint");
        harness.session.dispose();
    });
});

describe("a selector source over what a run published", () => {
    it("reads one run's field for the node at a dense index", async () => {
        const { harness, source } = fixture({
            execute: communities([
                ["a", "left"],
                ["b", "left"],
                ["d", "right"],
            ]),
        });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        assert.strictEqual(source.nodeValue(0, "results.groups.group"), "left");
        assert.strictEqual(source.nodeValue(3, "results.groups.group"), "right");
        // groupSize is filled in by the result factory rather than by the algorithm, and it is
        // addressable exactly like any other field.
        assert.strictEqual(source.nodeValue(0, "results.groups.groupSize"), 2);
        harness.session.dispose();
    });

    it("says an element the run never measured carries nothing", async () => {
        const { harness, source } = fixture({
            execute: communities([
                ["a", "left"],
                ["b", "left"],
                ["d", "right"],
            ]),
        });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        assert.strictEqual(source.nodeValue(2, "results.groups.group"), undefined);
        assert.isFalse(source.nodeHas(2, "results.groups.group"));
        assert.isTrue(source.nodeHas(0, "results.groups.group"));
        harness.session.dispose();
    });

    it("reads an edge result through the edge id the element mints", async () => {
        const { harness, source } = fixture({
            execute: flows([
                [AB, 3],
                [CD, 7],
            ]),
        });
        await harness.session.runs.start("max-flow", undefined, { as: "flow" });

        assert.strictEqual(source.edgeValue(0, "results.flow.value"), 3);
        assert.strictEqual(source.edgeValue(1, "results.flow.value"), undefined);
        assert.strictEqual(source.edgeValue(2, "results.flow.value"), 7);
        assert.isTrue(source.edgeHas(2, "results.flow.value"));
        assert.isFalse(source.edgeHas(1, "results.flow.value"));
        harness.session.dispose();
    });

    it("reads absent for a run that has not happened, rather than throwing", () => {
        // The state a selector is in between being typed and being answered. A throw here aborts
        // the repaint, which is what the evaluator this replaces did.
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeValue(0, "results.nothing.value"), undefined);
        assert.isFalse(source.nodeHas(0, "results.nothing.value"));
        assert.strictEqual(source.edgeValue(0, "results.nothing.value"), undefined);
        assert.isFalse(source.edgeHas(0, "results.nothing.value"));
        harness.session.dispose();
    });

    it("reads absent for a field the run published for the graph rather than for an element", async () => {
        const { harness, source } = fixture({ execute: communities([["a", "left"]]) });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        assert.strictEqual(harness.session.results.get("groups")?.graph.groupCount, 1, "the run did publish it");
        assert.strictEqual(source.nodeValue(0, "results.groups.groupCount"), undefined, "but no element carries it");
        assert.isFalse(source.nodeHas(0, "results.groups.groupCount"));
        harness.session.dispose();
    });

    it("reads absent for a run's whole result object, which belongs to no element", async () => {
        const { harness, source } = fixture({ execute: communities([["a", "left"]]) });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        assert.strictEqual(source.nodeValue(0, "results.groups"), undefined);
        assert.isFalse(source.nodeHas(0, "results.groups"));
        assert.strictEqual(source.nodeValue(0, "results.groups.group.deeper"), undefined);
        harness.session.dispose();
    });
});

describe("a selector source reading past what it holds", () => {
    it("reads absent for an index past the end of the graph, on every road", async () => {
        const { harness, source } = fixture({ execute: communities([["a", "left"]]) });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        assert.strictEqual(source.nodeValue(9, "data.kind"), undefined, "the column road");
        assert.strictEqual(source.nodeValue(9, "data.label"), undefined, "the record road");
        assert.strictEqual(source.nodeValue(9, "results.groups.group"), undefined, "the result road");
        assert.isFalse(source.nodeHas(9, "data.kind"));
        assert.isFalse(source.nodeHas(9, "data.tier"), "not even a column that declares a default");
        assert.isFalse(source.nodeHas(9, "results.groups.group"));
        assert.strictEqual(source.edgeValue(9, "data.link"), undefined);
        assert.strictEqual(source.edgeValue(9, "results.groups.group"), undefined);
        harness.session.dispose();
    });

    it("reads absent for an attribute nothing in the session answers", () => {
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeValue(0, "data.nothing"), undefined);
        assert.isFalse(source.nodeHas(0, "data.nothing"));
        assert.strictEqual(source.nodeValue(0, ""), undefined, "and an empty path names nothing at all");
        harness.session.dispose();
    });

    it("reads the ids an ids selector tests against", () => {
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeIdOf(0), "a");
        assert.strictEqual(source.nodeIdOf(3), "d");
        assert.strictEqual(source.edgeIdOf(0), edgeBetween(harness, "a", "b"));
        assert.strictEqual(source.edgeIdOf(2), edgeBetween(harness, "c", "d"));
        harness.session.dispose();
    });

    it("hands the record source the id the row carries now", () => {
        // The record seam is keyed by index AND told the id, and the id it is told has to be the
        // one the current snapshot holds at that row. A source answering out of the snapshot it
        // last saw would name the node that used to be there.
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }, { id: "c" }]);

        const asked: NodeId[] = [];
        const source = createSelectorSource({
            snapshot: () => harness.session.snapshot(),
            records: {
                nodeAttributes: (_index, id) => {
                    asked.push(id);

                    return undefined;
                },
                edgeAttributes: () => undefined,
            },
        });

        source.nodeValue(0, "data.label");
        assert.deepStrictEqual(asked, ["a"]);

        harness.store.builder.removeNode("a");
        harness.store.touch();
        source.nodeValue(0, "data.label");

        assert.deepStrictEqual(asked, ["a", "b"]);
        harness.session.dispose();
    });
});

describe("the measured column a run-bound layer walks", () => {
    it("names exactly the elements the run measured, ascending", async () => {
        const { harness, source } = fixture({
            execute: communities([
                ["d", "right"],
                ["a", "left"],
            ]),
        });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        const measured = source.measured("results.groups.group", "node");
        assert.isDefined(measured);
        assert.deepStrictEqual(Array.from(measured), [0, 3], "dense order, whatever order the run published in");

        // The list and the presence test are two readings of one fact. An index missing from the
        // list is an element the layer would silently never visit.
        const byPresence: number[] = [];
        for (let index = 0; index < 4; index++) {
            if (source.nodeHas(index, "results.groups.group")) {
                byPresence.push(index);
            }
        }

        assert.deepStrictEqual(Array.from(measured), byPresence);
        harness.session.dispose();
    });

    it("names the edges a run measured by their dense index", async () => {
        const { harness, source } = fixture({
            execute: flows([
                [CD, 7],
                [AB, 3],
            ]),
        });
        await harness.session.runs.start("max-flow", undefined, { as: "flow" });

        const measured = source.measured("results.flow.value", "edge");
        assert.isDefined(measured);
        assert.deepStrictEqual(Array.from(measured), [0, 2]);

        // The same path asked about the other half of the graph: the run published no node
        // values, so no node carries one, and a node layer bound to it walks nothing rather than
        // walking every node to find that out.
        const nodes = source.measured("results.flow.value", "node");
        assert.isDefined(nodes);
        assert.strictEqual(nodes.length, 0);
        harness.session.dispose();
    });

    it("answers nothing for an attribute path, so the repaint walks the element list", () => {
        // Enumerating an attribute column means a walk over every element that allocates an array
        // as long as the graph, to save a walk over every element that allocates nothing.
        const { harness, source } = fixture();

        assert.isUndefined(source.measured("data.kind", "node"));
        assert.isUndefined(source.measured("data.link", "edge"));
        assert.isUndefined(source.measured("results.groups", "node"), "and for a path that names no field");
        harness.session.dispose();
    });

    it("answers an empty list for a run that has published nothing", () => {
        // Not undefined: "no element carries this" is knowable, and it is what turns a layer bound
        // to a run that has not finished into a layer that walks nothing at all.
        const { harness, source } = fixture();
        const measured = source.measured("results.nothing.value", "node");

        assert.isDefined(measured);
        assert.strictEqual(measured.length, 0);
        harness.session.dispose();
    });

    it("hands back the same list until something moves", async () => {
        const { harness, source } = fixture({ execute: communities([["a", "left"]]) });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        const first = source.measured("results.groups.group", "node");
        assert.strictEqual(source.measured("results.groups.group", "node"), first, "walked once, not once per pass");
        harness.session.dispose();
    });

    it("follows a run that publishes after the first ask", async () => {
        const { harness, source } = fixture({
            execute: communities([
                ["b", "left"],
                ["c", "left"],
            ]),
        });

        const before = source.measured("results.groups.group", "node");
        assert.isDefined(before);
        assert.strictEqual(before.length, 0, "nothing has run yet");

        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        const after = source.measured("results.groups.group", "node");
        assert.isDefined(after);
        assert.deepStrictEqual(Array.from(after), [1, 2], "the cache is keyed on the result, not only the graph");
        harness.session.dispose();
    });
});

describe("a freeze that renumbers the rows", () => {
    it("follows the column values to the rows they moved to", () => {
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeValue(0, "data.kind"), "host", "before: row 0 is a");

        harness.store.builder.removeNode("a");
        harness.store.touch();

        assert.strictEqual(harness.session.snapshot().nodeCount, 3);
        assert.strictEqual(source.nodeValue(0, "data.kind"), "switch", "after: row 0 is b");
        assert.strictEqual(source.nodeValue(0, "data.weight"), 4);
        assert.strictEqual(source.nodeValue(2, "data.kind"), "switch", "and row 2 is d");
        assert.strictEqual(source.nodeValue(2, "data.weight"), 12);
        harness.session.dispose();
    });

    it("follows the ids, rather than answering out of the snapshot it last saw", () => {
        // This is the bug class: a source holding the previous snapshot answers "a" for row 0
        // forever, and an ids selector paints the node that moved into the row instead of the one
        // it named.
        const { harness, source } = fixture();

        assert.strictEqual(source.nodeIdOf(0), "a");
        assert.strictEqual(source.edgeIdOf(0), edgeBetween(harness, "a", "b"));

        harness.store.builder.removeNode("a");
        harness.store.touch();

        assert.strictEqual(source.nodeIdOf(0), "b");
        assert.strictEqual(source.edgeIdOf(0), edgeBetween(harness, "b", "c"), "the a->b edge died with a, so b->c slid down");
        harness.session.dispose();
    });

    it("follows a run's values, which are addressed by id and not by row", async () => {
        const { harness, source } = fixture({
            execute: communities([
                ["a", "left"],
                ["b", "left"],
                ["d", "right"],
            ]),
        });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        assert.strictEqual(source.nodeValue(0, "results.groups.group"), "left", "before: row 0 is a");

        harness.store.builder.removeNode("a");
        harness.store.touch();

        assert.strictEqual(source.nodeValue(0, "results.groups.group"), "left", "after: row 0 is b, also left");
        assert.strictEqual(source.nodeValue(2, "results.groups.group"), "right", "and row 2 is d");
        assert.isFalse(source.nodeHas(1, "results.groups.group"), "row 1 is c, which the run never measured");
        harness.session.dispose();
    });

    it("rebuilds the measured column against the new index space", async () => {
        const { harness, source } = fixture({
            execute: communities([
                ["a", "left"],
                ["d", "right"],
            ]),
        });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        const before = source.measured("results.groups.group", "node");
        assert.isDefined(before);
        assert.deepStrictEqual(Array.from(before), [0, 3]);

        harness.store.builder.removeNode("a");
        harness.store.touch();

        const after = source.measured("results.groups.group", "node");
        assert.isDefined(after);
        assert.deepStrictEqual(Array.from(after), [2], "only d survives, and it is row 2 now");
        harness.session.dispose();
    });

    it("rebuilds an edge run's measured column when the edges are renumbered", async () => {
        const { harness, source } = fixture({
            execute: flows([
                [AB, 3],
                [CD, 7],
            ]),
        });
        await harness.session.runs.start("max-flow", undefined, { as: "flow" });

        const before = source.measured("results.flow.value", "edge");
        assert.isDefined(before);
        assert.deepStrictEqual(Array.from(before), [0, 2]);

        harness.store.builder.removeNode("a");
        harness.store.touch();

        const after = source.measured("results.flow.value", "edge");
        assert.isDefined(after);
        assert.deepStrictEqual(Array.from(after), [1], "c->d is the second of the two surviving edges");
        assert.strictEqual(source.edgeValue(1, "results.flow.value"), 7);
        harness.session.dispose();
    });
});

describe("wired to the selector engine it was written for", () => {
    it("answers a has selector and the expression form of it with the same elements", async () => {
        // The two spellings of one question: a "has" selector compiles to the presence test, and
        // an expression comparing the path against a null literal is recognised as the same test.
        // A source whose presence test disagreed with its value reader would paint two different
        // sets from one intent.
        const { harness, source } = fixture({
            execute: communities([
                ["a", "left"],
                ["d", "right"],
            ]),
        });
        await harness.session.runs.start("louvain", undefined, { as: "groups" });

        const has = compileSelector({ match: "has", path: "results.groups.group" }, "node", source);
        const expression = compileSelector(
            { match: "expression", where: "results.groups.group != `null`" },
            "node",
            source,
        );
        const accepted: number[] = [];

        for (let index = 0; index < 4; index++) {
            const byHas = has.test?.(index) ?? false;

            assert.strictEqual(byHas, expression.test?.(index), `node ${index}: the two forms must agree`);

            if (byHas) {
                accepted.push(index);
            }
        }

        assert.deepStrictEqual(accepted, [0, 3]);

        const measured = source.measured("results.groups.group", "node");
        assert.isDefined(measured);
        assert.deepStrictEqual(Array.from(measured), accepted, "and the list the repaint walks is the same set");
        harness.session.dispose();
    });

    it("keeps an ids selector correct across a freeze that renumbers the rows", () => {
        // The reason the source reads an id per element instead of resolving the named ids to
        // indices once: a remembered row belongs to somebody else after a compaction, and the
        // layer would paint the node that moved into it.
        const { harness, source } = fixture();
        const selector = compileSelector({ match: "ids", nodes: ["b", "d"] }, "node", source);

        assert.deepStrictEqual([0, 1, 2, 3].map((index) => selector.test?.(index)), [false, true, false, true]);

        harness.store.builder.removeNode("a");
        harness.store.touch();

        assert.deepStrictEqual([0, 1, 2].map((index) => selector.test?.(index)), [true, false, true], "b and d moved");
        harness.session.dispose();
    });

    it("matches nothing, and refuses nothing, for a selector naming a run that never happened", () => {
        const { harness, source } = fixture();
        const selector = compileSelector({ match: "has", path: "results.nothing.value" }, "node", source);

        for (let index = 0; index < 4; index++) {
            assert.isFalse(selector.test?.(index), `node ${index}`);
        }

        harness.session.dispose();
    });
});

describe("a top selector over a run's column", () => {
    /**
     * Which of the fixture's four nodes a top selector paints.
     * @param source - The source.
     * @param n - How many the top may hold.
     * @returns The node indices it accepts.
     */
    function topOf(source: SessionSelectorSource, n: number): number[] {
        const selector = compileSelector({ match: "top", path: "results.degree.value", n }, "node", source);
        const accepted: number[] = [];

        for (let index = 0; index < 4; index++) {
            if (selector.test?.(index) === true) {
                accepted.push(index);
            }
        }

        return accepted;
    }

    it("paints whole tie groups only, and never more than n", async () => {
        const { harness, source } = fixture({
            execute: metric([
                ["a", 5],
                ["b", 5],
                ["c", 3],
                ["d", 1],
            ]),
        });
        await harness.session.runs.start("degree", undefined, { as: "degree" });

        assert.deepStrictEqual(topOf(source, 1), [], "a and b tie at 5, and two do not fit in one");
        assert.deepStrictEqual(topOf(source, 2), [0, 1]);
        assert.deepStrictEqual(topOf(source, 3), [0, 1, 2]);
        assert.deepStrictEqual(topOf(source, 9), [0, 1, 2, 3]);
        harness.session.dispose();
    });

    it("paints nothing on a regular graph whose one tie group is larger than n", async () => {
        const { harness, source } = fixture({
            execute: metric([
                ["a", 2],
                ["b", 2],
                ["c", 2],
                ["d", 2],
            ]),
        });
        await harness.session.runs.start("degree", undefined, { as: "degree" });

        assert.deepStrictEqual(topOf(source, 3), []);
        harness.session.dispose();
    });

    it("matches nothing, and refuses nothing, before the run has published", () => {
        const { harness, source } = fixture();

        assert.deepStrictEqual(topOf(source, 3), []);
        harness.session.dispose();
    });
});
