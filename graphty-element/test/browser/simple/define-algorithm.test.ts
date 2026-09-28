/**
 * @file The simple tier's algorithm verb, `defineAlgorithm`, driven the way a reader of the guide
 * drives it: the guide's own toy examples (docs/examples/simple-tier/, the files the guide shows)
 * are registered on a page with a `<graphty-element>` holding a small real graph, run with
 * `element.run`, and judged by what a reader would see -- the values under `results.<as>.value`
 * or `results.<as>.group`, the layer the element derived from the run and which nodes and edges
 * it paints, the options form the catalogue offers, and the error a beginner reads first.
 *
 * The last block holds a simple registration against one written by hand in the advanced tier:
 * a simple extension IS an advanced one once defined (design/extensions/simple-tier.md section 3),
 * so its catalogue entry, its options and its id look exactly like the advanced one's.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import {
    type AlgorithmDescriptor,
    type AlgorithmOutput,
    checkShapeContract,
    DeclaredAlgorithm,
    defineAlgorithm,
    type GraphtyError,
    isGraphtyError,
    nodeMetricFields,
    type NodeView,
    type Progress,
} from "../../../extend";
import type { Graphty } from "../../../index";
import type { GraphSession, NodeId } from "../../../session";

// ---------------------------------------------------------------------------------------------
// The guide's examples, loaded the way a page loads a plugin: the module's own top-level
// defineAlgorithm call registers it. Loaded lazily, so a define call that throws fails the test
// that needed it rather than the whole file.
// ---------------------------------------------------------------------------------------------

const EXAMPLES = {
    confidenceDegree: () => import("../../../docs/examples/simple-tier/confidence-degree"),
    confidenceShare: () => import("../../../docs/examples/simple-tier/confidence-share"),
    strongestTie: () => import("../../../docs/examples/simple-tier/strongest-tie"),
    components: () => import("../../../docs/examples/simple-tier/components"),
    rank: () => import("../../../docs/examples/simple-tier/rank"),
} as const;

// ---------------------------------------------------------------------------------------------
// The graph: a triangle a-b-c with a tail c-d whose edge has no confidence, a pair e-f, and a
// node with no edges. Every edge carries a second number, `score`, for rebinding the option.
// ---------------------------------------------------------------------------------------------

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }, { id: "f" }, { id: "lone" }];
const EDGES = [
    { source: "a", target: "b", confidence: 0.9, score: 1 },
    { source: "b", target: "c", confidence: 0.5, score: 2 },
    { source: "c", target: "a", confidence: 0.4, score: 3 },
    { source: "c", target: "d", score: 4 },
    { source: "e", target: "f", confidence: 0.7, score: 5 },
];

/** The confidence-weighted degree of each node: the edge c-d has no confidence and is left out. */
const STRENGTH: Readonly<Record<string, number>> = {
    a: 0.9 + 0.4,
    b: 0.9 + 0.5,
    c: 0.5 + 0.4,
    d: 0,
    e: 0.7,
    f: 0.7,
    lone: 0,
};

let element: Graphty;

beforeEach(async () => {
    element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    element.nodeData = NODES;
    element.edgeData = EDGES;
    await element.graph.operationQueue.waitForCompletion();
});

afterEach(() => {
    element.remove();
});

/**
 * The session behind the element.
 * @returns The session.
 */
function session(): GraphSession {
    return element.graph.getSession();
}

/**
 * The element's own id for the edge between two nodes (the test graph has no parallel edges).
 * @param source - One end.
 * @param target - The other end.
 * @returns The edge id.
 */
async function edgeIdOf(source: NodeId, target: NodeId): Promise<string> {
    const resolved = await session().scope.resolve("graph");
    for (const id of resolved.edges) {
        const record = session().data.edge(id);
        if (
            (record?.source === source && record.target === target) ||
            (record?.source === target && record.target === source)
        ) {
            return id;
        }
    }

    return assert.fail(`no edge joins ${String(source)} and ${String(target)}`);
}

/**
 * What a promise rejected with, asserted to be a GraphtyError.
 * @param work - The promise.
 * @returns The error.
 */
async function rejection(work: PromiseLike<unknown>): Promise<GraphtyError> {
    try {
        await work;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `a GraphtyError, not ${String(error)}`);
        return error as GraphtyError;
    }

    return assert.fail("the run did not fail");
}

/**
 * Wait until the element has derived a style layer from a run, as it does on a run's first
 * completion. Polled, because the paint is deliberately not awaited by the run.
 * @param runId - The run.
 */
async function derivedLayerOf(runId: string): Promise<void> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
        if (
            session()
                .styles.list()
                .some((layer) => layer.source.by === "run" && layer.source.runId === runId)
        ) {
            await element.graph.operationQueue.waitForCompletion();
            return;
        }

        await new Promise((settle) => setTimeout(settle, 10));
    }

    assert.fail(`the element derived no layer from run "${runId}"`);
}

/**
 * Whether any layer derived from a run contributes to a node or an edge.
 * @param runId - The run.
 * @param target - The node or edge.
 * @returns True when the run's layer paints it.
 */
function paintedBy(runId: string, target: { node: NodeId } | { edge: string }): boolean {
    return session()
        .styles.explain(target)
        .contributions.some((contribution) => {
            const source = session().styles.get(contribution.layerId)?.source;
            return source?.by === "run" && source.runId === runId;
        });
}

describe("the first plugin: confidence-weighted degree and its edge companion", () => {
    it("publishes each node's summed confidence under results.strength.value", async () => {
        await EXAMPLES.confidenceDegree();

        // The guide's "use it" line.
        const run = element.run("acme-confidence-degree", {}, { as: "strength" });
        await run;

        assert.strictEqual(run.status, "succeeded");
        assert.strictEqual(run.shape, "node-metric");
        const result = session().results.get("strength");
        for (const [id, expected] of Object.entries(STRENGTH)) {
            assert.closeTo(Number(result?.node(id)?.value), expected, 1e-9, `node ${id}`);
        }
    });

    it("says in the run's record that an edge had no confidence and was left out", async () => {
        await EXAMPLES.confidenceDegree();

        const run = element.run("acme-confidence-degree", {}, { as: "strength" });
        await run;

        assert.include(
            run.caveats.notes,
            'acme-confidence-degree: 1 of 5 edges has no number at "confidence"; they were left out.',
        );
    });

    it("colours the nodes on its first completion, with no style code", async () => {
        await EXAMPLES.confidenceDegree();

        const run = element.run("acme-confidence-degree", {}, { as: "strength" });
        await run;
        await derivedLayerOf(run.id);

        const legend = session()
            .styles.legend()
            .find((block) => block.runId === run.id);
        assert.strictEqual(legend?.channel, "node.color");
        for (const id of Object.keys(STRENGTH)) {
            assert.isTrue(paintedBy(run.id, { node: id }), `node ${id} carries a value, so the run paints it`);
        }
    });

    it("reads the attribute the reader names instead of the default", async () => {
        await EXAMPLES.confidenceDegree();

        const run = element.run("acme-confidence-degree", { confidence: "score" }, { as: "by-score" });
        const result = await run;

        assert.strictEqual(result.node("a")?.value, 1 + 3);
        assert.strictEqual(result.node("c")?.value, 2 + 3 + 4);
        assert.strictEqual(result.node("d")?.value, 4);
        assert.deepEqual(run.caveats.notes, [], "every edge carries a score, so nothing was left out");
    });

    it("refuses a misspelt attribute before any code runs, naming what the edges carry", async () => {
        await EXAMPLES.confidenceDegree();

        const error = await rejection(element.run("acme-confidence-degree", { confidence: "confidance" }));

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        assert.strictEqual(
            error.message,
            'acme-confidence-degree: option "confidence" names edge attribute "confidance", which no edge carries; ' +
                "edges carry: confidence, score.",
        );
    });

    it("publishes each edge's share under results.share.value, by the element's own edge ids", async () => {
        await EXAMPLES.confidenceShare();

        const run = element.run("acme-confidence-share", {}, { as: "share" });
        const result = await run;

        assert.strictEqual(run.shape, "edge-metric");
        assert.closeTo(
            Number(result.edge(await edgeIdOf("a", "b"))?.value),
            0.9 / Math.sqrt(STRENGTH.a * STRENGTH.b),
            1e-9,
        );
        assert.closeTo(Number(result.edge(await edgeIdOf("e", "f"))?.value), 1, 1e-9, "0.7 / sqrt(0.7 * 0.7)");
        assert.isUndefined(result.edge(await edgeIdOf("c", "d")), "the edge with no confidence is not measured");
    });

    it("paints only the edges it measured", async () => {
        await EXAMPLES.confidenceShare();

        const run = element.run("acme-confidence-share", {}, { as: "share" });
        await run;
        await derivedLayerOf(run.id);

        assert.isTrue(paintedBy(run.id, { edge: await edgeIdOf("a", "b") }));
        assert.isFalse(
            paintedBy(run.id, { edge: await edgeIdOf("c", "d") }),
            "the unmeasured edge keeps whatever the layers beneath painted",
        );
        assert.isFalse(paintedBy(run.id, { node: "a" }), "an edge score paints no node");
    });
});

describe("an optional weight", () => {
    it("counts every edge as 1 when the reader picks no weight", async () => {
        await EXAMPLES.strongestTie();

        const result = await element.run("acme-strongest-tie", {}, { as: "tie" });

        for (const id of ["a", "b", "c", "d", "e", "f"]) {
            assert.strictEqual(result.node(id)?.value, 1, `node ${id}`);
        }
        assert.isUndefined(result.node("lone"), "a node with no edge is not measured");
    });

    it("reads the weight the reader picks, and leaves a node with no weighted edge unmeasured", async () => {
        await EXAMPLES.strongestTie();

        const run = element.run("acme-strongest-tie", { weight: "confidence" }, { as: "tie" });
        const result = await run;

        assert.strictEqual(result.node("a")?.value, 0.9);
        assert.strictEqual(result.node("c")?.value, 0.5);
        assert.isUndefined(result.node("d"), "its only edge has no confidence");

        await derivedLayerOf(run.id);
        assert.isTrue(paintedBy(run.id, { node: "a" }));
        assert.isFalse(paintedBy(run.id, { node: "d" }), "a node the run did not measure is not painted");
        assert.isFalse(paintedBy(run.id, { node: "lone" }));
    });
});

describe("a grouping", () => {
    it("publishes one group per connected component under results.parts.group", async () => {
        await EXAMPLES.components();

        const run = element.run("acme-components", {}, { as: "parts" });
        const result = await run;

        assert.strictEqual(run.shape, "community");
        const group = (id: string): unknown => result.node(id)?.group;
        assert.isDefined(group("a"));
        assert.strictEqual(group("b"), group("a"));
        assert.strictEqual(group("c"), group("a"));
        assert.strictEqual(group("d"), group("a"));
        assert.strictEqual(group("f"), group("e"));
        assert.strictEqual(new Set(["a", "e", "lone"].map(group)).size, 3, "three components, three groups");
    });
});

describe("a whole-graph score", () => {
    it("publishes PageRank, reporting progress once per pass", async () => {
        await EXAMPLES.rank();

        const seen: Progress[] = [];
        const result = await element.run("acme-rank", { passes: 20 }, { as: "rank", onProgress: (p) => seen.push(p) });
        const rank = (id: string): number => Number(result.node(id)?.value);

        assert.isAbove(rank("c"), rank("a"), "c, with three neighbours, outranks a");
        assert.closeTo(rank("a"), rank("b"), 1e-12, "a and b sit symmetrically");
        assert.closeTo(rank("e"), rank("f"), 1e-12);
        assert.closeTo(rank("lone"), 0.15 / 7, 1e-12, "nothing flows into a node with no edges");
        assert.isAtLeast(seen.filter((progress) => progress.fraction !== null).length, 20);
        assert.strictEqual(seen.at(-1)?.fraction, 1);
    });

    it("says in the catalogue that its cost grows with the passes option", async () => {
        await EXAMPLES.rank();

        const entry = session()
            .catalog.algorithms()
            .find((candidate) => candidate.key === "acme-rank");
        assert.strictEqual(entry?.costClass, "iterative");
        const few = session().estimate({ op: "algo.run", algorithm: "acme-rank", params: { passes: 2 } });
        const many = session().estimate({ op: "algo.run", algorithm: "acme-rank", params: { passes: 200 } });
        assert.isAbove(many.seconds, few.seconds);
    });
});

describe("the errors a beginner reads", () => {
    it("refuses a definition with no function to compute, and registers nothing", () => {
        let caught: unknown;
        try {
            defineAlgorithm({ id: "acme-nothing" } as never);
        } catch (error) {
            caught = error;
        }

        assert.isTrue(isGraphtyError(caught));
        assert.strictEqual((caught as GraphtyError).code, "E_BAD_COMMAND");
        assert.match((caught as GraphtyError).message, /^defineAlgorithm\("acme-nothing"\): .*"node".*"groups"/);
        assert.isUndefined(
            session()
                .catalog.algorithms()
                .find((candidate) => candidate.key === "acme-nothing"),
        );
    });

    it("reports a throw from the author's own function as E_EXTENSION_FAILED, naming the node", async () => {
        defineAlgorithm({
            id: "acme-fragile",
            node: (node) => {
                if (node.id === "c") {
                    throw new TypeError("c is not welcome");
                }

                return node.degree;
            },
        });

        const run = element.run("acme-fragile");
        const error = await rejection(run);

        assert.strictEqual(error.code, "E_EXTENSION_FAILED");
        assert.strictEqual(error.message, 'acme-fragile: node() threw for node "c" (TypeError: c is not welcome).');
        assert.strictEqual(error.details.extension, "acme-fragile");
        assert.strictEqual(error.details.member, "node");
        assert.instanceOf(error.cause, TypeError);
        assert.strictEqual(run.status, "failed");
    });

    it("refuses an option the definition does not declare, as it does for any algorithm", async () => {
        await EXAMPLES.confidenceDegree();

        let caught: unknown;
        try {
            await element.run("acme-confidence-degree", { confidense: "score" });
        } catch (error) {
            caught = error;
        }

        assert.isTrue(isGraphtyError(caught));
        assert.strictEqual((caught as GraphtyError).code, "E_UNKNOWN_OPTION");
    });
});

// ---------------------------------------------------------------------------------------------
// Parity: the same algorithm written by hand in the advanced tier, filled in exactly as the
// simple tier's table "What the element fills in" says (simple-tier.md section 4.1).
// ---------------------------------------------------------------------------------------------

const TWIN_DESCRIPTOR: AlgorithmDescriptor = {
    key: "acme-confidence-degree-twin",
    plainName: "Acme confidence degree twin",
    technicalName: "Acme confidence degree twin",
    description: "",
    category: "custom",
    shape: "node-metric",
    fields: nodeMetricFields({
        plainName: "Acme confidence degree twin",
        technicalName: "Acme confidence degree twin",
    }),
    options: [{ name: "confidence", plainName: "Confidence", type: "attribute", on: "edge", default: "confidence" }],
    costClass: "instant",
    complexity: "O(n + m)",
};

/** The advanced twin. It is only listed, never run. */
class ConfidenceDegreeTwin extends DeclaredAlgorithm<{ confidence: string }> {
    static override namespace = "acme-confidence-degree-twin";
    static override type = "acme-confidence-degree-twin";
    static override descriptor = TWIN_DESCRIPTOR;

    override compute(): Promise<AlgorithmOutput | null> {
        return Promise.resolve(null);
    }
}

describe("a simple registration is an ordinary one", () => {
    it("is listed in the catalogue exactly as its advanced twin is", async () => {
        await EXAMPLES.confidenceDegree();
        DeclaredAlgorithm.register(ConfidenceDegreeTwin);

        const listed = session().catalog.algorithms();
        const simple = listed.find((entry) => entry.key === "acme-confidence-degree");
        const twin = listed.find((entry) => entry.key === "acme-confidence-degree-twin");
        assert.isDefined(simple, "the simple registration is in the catalogue under its id");
        assert.isDefined(twin);

        assert.strictEqual(simple?.plainName, "Acme confidence degree", "the id in sentence case");
        assert.strictEqual(simple?.technicalName, "Acme confidence degree");
        const { key: _k1, plainName: _p1, technicalName: _t1, fields: simpleFields, ...simpleRest } = simple ?? {};
        const { key: _k2, plainName: _p2, technicalName: _t2, fields: twinFields, ...twinRest } = twin ?? {};
        assert.deepEqual(simpleRest, twinRest, "description, category, shape, options, cost and scope agree");
        assert.deepEqual(
            simpleFields?.map((field) => [field.name, field.kind, field.type, field.path]),
            twinFields?.map((field) => [field.name, field.kind, field.type, field.path]),
            "the same fields at the same published paths",
        );
        assert.isEmpty(checkShapeContract("node-metric", simpleFields ?? []));
    });

    it("declares its options in the catalogue's own vocabulary, in the order they were written", async () => {
        await EXAMPLES.rank();
        await EXAMPLES.strongestTie();

        const options = (key: string): unknown =>
            session()
                .catalog.algorithms()
                .find((entry) => entry.key === key)?.options;
        assert.deepEqual(options("acme-rank"), [
            { name: "passes", plainName: "Passes", type: "integer", default: 30, min: 1, max: 200 },
        ]);
        assert.deepEqual(
            options("acme-strongest-tie"),
            [{ name: "weight", plainName: "Weight", type: "attribute", on: "edge" }],
            "an optional attribute has no default",
        );
    });

    it("publishes the fields each shape promises, for an edge score and a grouping too", async () => {
        await EXAMPLES.confidenceShare();
        await EXAMPLES.components();

        const entry = (key: string) =>
            session()
                .catalog.algorithms()
                .find((candidate) => candidate.key === key);
        assert.strictEqual(entry("acme-confidence-share")?.shape, "edge-metric");
        assert.isEmpty(checkShapeContract("edge-metric", entry("acme-confidence-share")?.fields ?? []));
        assert.strictEqual(entry("acme-components")?.shape, "community");
        assert.isEmpty(checkShapeContract("community", entry("acme-components")?.fields ?? []));
    });

    it("is offered as a metric with a finite cost before anybody clicks", async () => {
        await EXAMPLES.confidenceDegree();

        const offered = session()
            .catalog.metrics()
            .find((entry) => entry.key === "acme-confidence-degree");
        assert.isTrue(offered?.available);
        assert.isTrue(Number.isFinite(offered?.estimateSeconds));
    });

    it("answers at the older <id>:<id> address as well", async () => {
        await EXAMPLES.confidenceDegree();

        await element.graph.runAlgorithm("acme-confidence-degree", "acme-confidence-degree");
        await element.graph.operationQueue.waitForCompletion();

        const finished = session()
            .runs.list()
            .filter((run) => run.algorithm === "acme-confidence-degree" && run.status === "succeeded");
        assert.lengthOf(finished, 1, "an ordinary run, under the id");
    });

    it("counts the same definition registered twice as one", () => {
        const definition = { id: "acme-twice", node: (node: NodeView) => node.degree };
        defineAlgorithm(definition);
        defineAlgorithm(definition);

        assert.lengthOf(
            session()
                .catalog.algorithms()
                .filter((entry) => entry.key === "acme-twice"),
            1,
        );
    });
});
