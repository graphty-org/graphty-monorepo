import { assert, describe, it } from "vitest";

import type { EdgeId, FieldDescriptor, NodeId, Query } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createResultsApi, type ResultsRegistry, type ResultsRunEntry } from "../../../src/session/results/ResultsApi";
import { createRunResult } from "../../../src/session/results/RunResult";
import type { ResultsApi, RunResult } from "../../../src/session/results/types";
import type { Caveats } from "../../../src/session/runs/types";
import { ElementMask } from "../../../src/session/scope/ElementMask";
import { createScopeApi, edgeSpaceOf, nodeSpaceOf } from "../../../src/session/scope/ScopeApi";
import {
    createSelectionApi,
    type ElementIdTarget,
    type NeighborhoodTarget,
    resolveTarget,
    type SelectionDirection,
    type SelectionMatch,
    type SelectionOwner,
    type SelectionSearchHit,
    type SelectionSources,
    type SelectionTarget,
    type SelectionTextMode,
    type TargetContext,
    type TargetMembers,
} from "../../../src/session/selection/index";
import { edgeBetween, type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";

const CAVEATS: Caveats = {
    exact: true,
    direction: "undirected",
    precision: "f64",
    method: "degree",
    notes: [],
};

/** A field descriptor with the path a catalogue descriptor would have written. */
function field(spec: Omit<FieldDescriptor, "path">): FieldDescriptor {
    return { ...spec, path: `results.$.${spec.name}` };
}

/** A finished metric over the four nodes of the line, worth more the further along it sits. */
const NODE_METRIC: RunResult = createRunResult({
    runId: "degree",
    shape: "node-metric",
    fields: [
        field({ name: "value", plainName: "Connections", technicalName: "degree", kind: "node", type: "number" }),
        field({ name: "measured", plainName: "Measured", technicalName: "measured", kind: "graph", type: "integer" }),
    ],
    measured: { nodes: 4, edges: 0 },
    nodes: [
        { id: "a", values: { value: 1 } },
        { id: "b", values: { value: 2 } },
        { id: "c", values: { value: 3 } },
        { id: "d", values: { value: 4 } },
    ],
    caveats: CAVEATS,
    durationMs: 1,
});

/**
 * The element's ids for the first two edges of the `line()` fixture.
 *
 * `line()` adds a->b, b->c and c->d in that order, and the element stamps its edge counter in
 * arrival order, so these are the ids those edges are addressed by. They are written out rather
 * than resolved from a session because the fixtures below are built at module scope, before any
 * session exists.
 */
const AB = "0";
/** The id of the b->c edge. See {@link AB}. */
const BC = "1";

/** A finished metric over two of the edges. */
const EDGE_METRIC: RunResult = createRunResult({
    runId: "weight",
    shape: "edge-metric",
    fields: [field({ name: "value", plainName: "Weight", technicalName: "weight", kind: "edge", type: "number" })],
    measured: { nodes: 0, edges: 2 },
    edges: [
        { id: AB, values: { value: 5 } },
        { id: BC, values: { value: 1 } },
    ],
    caveats: CAVEATS,
    durationMs: 1,
});

/** A registry over a fixed list of entries. */
function registryOf(entries: readonly ResultsRunEntry[]): ResultsRegistry {
    return {
        entry: (id) => entries.find((candidate) => candidate.id === id),
        entries: () => entries,
    };
}

const RESULTS: ResultsApi = createResultsApi(
    registryOf([
        { id: "degree", label: "Connections", shape: "node-metric", result: NODE_METRIC },
        { id: "weight", label: "Weight", shape: "edge-metric", result: EDGE_METRIC },
        { id: "running", label: "Bridges", shape: "node-metric" },
    ]),
);

/** A session with data in it. */
function harnessOf(nodes: readonly NodeRow[], edges: readonly EdgeRow[] = [], directed?: boolean): Harness {
    const harness = makeSession(directed === undefined ? {} : { directed });
    harness.add(nodes, edges);

    return harness;
}

/** Four nodes in a line, so there are three edges. */
function line(directed?: boolean): Harness {
    return harnessOf(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
        ],
        directed,
    );
}

/** A selection over a harness, with whatever capabilities a test wants to hand it. */
function selectionOf(harness: Harness, extra: Omit<SelectionSources, "snapshot"> = {}): SelectionOwner {
    return createSelectionApi({ snapshot: () => harness.store.getSnapshot(), ...extra });
}

/** The code a call refused with, or null when it did not refuse. */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("elements named outright", () => {
    it("takes the nodes and the edges a caller already holds", () => {
        const harness = line();
        const selection = selectionOf(harness);
        const target: ElementIdTarget = { nodes: ["a", "d"], edges: [edgeBetween(harness, "b", "c")] };

        selection.applyNow(target);

        assert.deepStrictEqual([...selection.nodes], ["a", "d"]);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "b", "c")]);
        harness.session.dispose();
    });

    it("resolves a target against a context built by hand", () => {
        // The resolver is separately usable, which is what lets the gesture layer resolve a
        // marquee against the same grammar without going through a mutation first.
        const harness = line();
        const snapshot = harness.store.getSnapshot();
        const nodeSpace = nodeSpaceOf(snapshot);
        const edgeSpace = edgeSpaceOf(snapshot);
        const selectedNodes = new ElementMask<NodeId>(() => nodeSpace, snapshot.nodeCount);
        const selectedEdges = new ElementMask<EdgeId>(() => edgeSpace, Math.max(1, snapshot.edgeCount));
        selectedNodes.grow(snapshot.nodeCount);
        selectedEdges.grow(snapshot.edgeCount);
        const context: TargetContext = { graph: snapshot, nodeSpace, edgeSpace, selectedNodes, selectedEdges };

        const members: TargetMembers = resolveTarget({ nodes: ["b", "c"] }, context);

        assert.deepStrictEqual([...members.nodes.ids()], ["b", "c"]);
        assert.deepStrictEqual([...members.edges.ids()], [], "a target that names no edges names an empty edge set");
        assert.deepStrictEqual([...members.unmatched], []);
        assert.deepStrictEqual([...members.unresolvedPaths], []);
        harness.session.dispose();
    });

    it("refuses a value that is not a target at all", () => {
        const harness = line();
        const selection = selectionOf(harness);

        for (const bad of [{}, null, "everything", { edgesBetween: false }, { invert: false }]) {
            assert.strictEqual(
                codeOf(() => selection.applyNow(bad as unknown as SelectionTarget)),
                "E_BAD_COMMAND",
                JSON.stringify(bad),
            );
        }

        harness.session.dispose();
    });
});

describe("a pasted list of ids", () => {
    it("reads a node, an edge, a number and nothing at all", () => {
        const harness = harnessOf([{ id: "a" }, { id: 42 }], [{ src: "a", dst: 42 }]);
        const selection = selectionOf(harness);

        // "0" is the element's id for the one edge; "42" is a NODE id that happens to look like
        // a counter, and the resolver has to try both spaces rather than assuming one.
        const delta = selection.applyNow({ ids: ["a", "0", "42", "nobody"] });

        assert.deepStrictEqual([...selection.nodes], ["a", 42], "\"42\" found the node loaded under the number 42");
        assert.deepStrictEqual([...selection.edges], ["0"]);
        assert.deepStrictEqual(delta.unmatched === undefined ? [] : [...delta.unmatched], ["nobody"]);
        harness.session.dispose();
    });

    it("tries the id exactly as it was pasted before it tries anything else", () => {
        // A node genuinely called " a" is not the node "a", and a correction that lost it would
        // be worse than the whitespace it tidied.
        const harness = harnessOf([{ id: " a" }, { id: "b" }]);
        const selection = selectionOf(harness);

        selection.applyNow({ ids: [" a", " b "] });

        assert.deepStrictEqual([...selection.nodes], [" a", "b"], "the exact reading wins, the trimmed one rescues");
        harness.session.dispose();
    });

    it("reports every id that named nothing, rather than a silent short selection", () => {
        const harness = line();
        const selection = selectionOf(harness);

        const delta = selection.applyNow({ ids: ["x", "y", "a"] });

        assert.deepStrictEqual(delta.unmatched === undefined ? [] : [...delta.unmatched], ["x", "y"]);
        assert.strictEqual(delta.nodes, 1);
        harness.session.dispose();
    });
});

describe("a predicate and a text search", () => {
    /** A matcher that answers one fixed set, and one predicate it cannot answer at all. */
    const match = (where: Query): SelectionMatch =>
        where === "unanswerable"
            ? { unresolvedPaths: ["results.betwenness.value"] }
            : { nodes: ["a", "c"], edges: [AB] };

    it("selects whatever the query engine matched, in both halves", () => {
        const harness = line();
        const selection = selectionOf(harness, { match });

        selection.applyNow({ where: "anything" });

        assert.deepStrictEqual([...selection.nodes], ["a", "c"]);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });

    it("reports a path nothing answers instead of a silent zero", () => {
        const harness = line();
        const selection = selectionOf(harness, { match });

        const delta = selection.applyNow({ where: "unanswerable" });

        assert.strictEqual(delta.nodes, 0);
        assert.deepStrictEqual([...delta.unresolvedPaths], ["results.betwenness.value"]);
        harness.session.dispose();
    });

    it("passes the search mode through, and defaults to a substring", () => {
        const harness = line();
        const modes: SelectionTextMode[] = [];
        const find = (text: string, mode: SelectionTextMode): readonly SelectionSearchHit[] => {
            modes.push(mode);

            return text === "edge" ? [{ id: edgeBetween(harness, "a", "b"), kind: "edge" }] : [{ id: "a", kind: "node" }];
        };
        const selection = selectionOf(harness, { find });

        selection.applyNow({ text: "a" });
        assert.deepStrictEqual([...selection.nodes], ["a"]);

        selection.applyNow({ text: "edge", mode: "exact" });
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "a", "b")]);
        assert.deepStrictEqual(modes, ["substring", "exact"]);
        harness.session.dispose();
    });

    it("refuses both when the session can do neither", () => {
        const harness = line();
        const selection = selectionOf(harness);

        assert.strictEqual(codeOf(() => selection.applyNow({ where: "anything" })), "E_UNSUPPORTED");
        assert.strictEqual(codeOf(() => selection.applyNow({ text: "a" })), "E_UNSUPPORTED");
        harness.session.dispose();
    });
});

describe("a scope", () => {
    it("selects everything the scope covers, edges included", () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const selection = selectionOf(harness, { scope });

        selection.applyNow({ scope: { nodes: ["a", "b", "c"] } });

        assert.deepStrictEqual([...selection.nodes], ["a", "b", "c"]);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "a", "b"), edgeBetween(harness, "b", "c")], "a scope's edges come with it");
        harness.session.dispose();
    });

    it("refuses when the session keeps no scopes", () => {
        const harness = line();
        const selection = selectionOf(harness);

        assert.strictEqual(codeOf(() => selection.applyNow({ scope: "graph" })), "E_UNSUPPORTED");
        harness.session.dispose();
    });
});

describe("a neighbourhood", () => {
    it("includes the nodes it was grown from", () => {
        // A neighbourhood that excluded its own centre would deselect the node a person just
        // clicked in order to look around it.
        const harness = line(true);
        const selection = selectionOf(harness);

        selection.applyNow({ neighborsOf: ["b"], depth: 1, direction: "all" });

        assert.deepStrictEqual([...selection.nodes], ["a", "b", "c"]);
        harness.session.dispose();
    });

    it("walks the depth it was given", () => {
        const harness = line(true);
        const selection = selectionOf(harness);
        const target: NeighborhoodTarget = { neighborsOf: ["a"], depth: 2, direction: "out" };

        selection.applyNow(target);

        assert.deepStrictEqual([...selection.nodes], ["a", "b", "c"]);
        harness.session.dispose();
    });

    it("follows the direction it was given on a directed graph", () => {
        const harness = line(true);
        const selection = selectionOf(harness);
        const inward: SelectionDirection = "in";

        selection.applyNow({ neighborsOf: ["c"], direction: inward });
        assert.deepStrictEqual([...selection.nodes], ["b", "c"]);

        selection.applyNow({ neighborsOf: ["c"], direction: "out" });
        assert.deepStrictEqual([...selection.nodes], ["c", "d"]);
        harness.session.dispose();
    });

    it("reaches both ways on an undirected graph whatever direction was asked", () => {
        const harness = line(false);
        const selection = selectionOf(harness);

        selection.applyNow({ neighborsOf: ["b"], direction: "out" });

        assert.deepStrictEqual([...selection.nodes], ["a", "b", "c"], "an undirected edge has no upstream end");
        harness.session.dispose();
    });

    it("grows the current selection when it names no seeds", () => {
        const harness = line(true);
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a"] });

        selection.applyNow({ depth: 1 });

        assert.deepStrictEqual([...selection.nodes], ["a", "b"]);
        harness.session.dispose();
    });

    it("refuses a depth outside the one it declares", () => {
        const harness = line(true);
        const selection = selectionOf(harness);
        const tooFar = { neighborsOf: ["a"], depth: 4 } as unknown as SelectionTarget;

        assert.strictEqual(codeOf(() => selection.applyNow(tooFar)), "E_OPTION_RANGE");
        harness.session.dispose();
    });
});

describe("a finished run's ranking", () => {
    it("takes the top few, best first, from the ranking the run already produced", () => {
        const harness = line();
        const selection = selectionOf(harness, { results: RESULTS });

        selection.applyNow({ top: { run: "degree", field: "value", n: 2 } });

        assert.deepStrictEqual([...selection.nodes], ["c", "d"], "the two highest, in index order");
        harness.session.dispose();
    });

    it("takes a tie group only when all of it fits, the same cut a top style selector paints", () => {
        const harness = line();
        const tied = createRunResult({
            runId: "tied",
            shape: "node-metric",
            fields: [field({ name: "value", plainName: "Connections", technicalName: "degree", kind: "node", type: "number" })],
            measured: { nodes: 4, edges: 0 },
            nodes: [
                { id: "a", values: { value: 1 } },
                { id: "b", values: { value: 3 } },
                { id: "c", values: { value: 3 } },
                { id: "d", values: { value: 4 } },
            ],
            caveats: CAVEATS,
            durationMs: 1,
        });
        const results = createResultsApi(registryOf([{ id: "tied", label: "Tied", shape: "node-metric", result: tied }]));
        const selection = selectionOf(harness, { results });

        selection.applyNow({ top: { run: "tied", field: "value", n: 2 } });
        assert.deepStrictEqual([...selection.nodes], ["d"], "b and c tie, and the two of them do not fit beside d");

        selection.applyNow({ top: { run: "tied", field: "value", n: 3 } });
        assert.deepStrictEqual([...selection.nodes], ["b", "c", "d"]);
        harness.session.dispose();
    });

    it("takes everything above a threshold", () => {
        const harness = line();
        const selection = selectionOf(harness, { results: RESULTS });

        selection.applyNow({ above: { run: "degree", field: "value", threshold: 2 } });

        assert.deepStrictEqual([...selection.nodes], ["c", "d"], "strictly above, so the node at 2 is out");
        harness.session.dispose();
    });

    it("selects edges when the run measured edges", () => {
        const harness = line();
        const selection = selectionOf(harness, { results: RESULTS });

        selection.applyNow({ top: { run: "weight", field: "value", n: 1 } });

        assert.deepStrictEqual([...selection.nodes], []);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });

    it("reports the path when the run has not published a result", () => {
        const harness = line();
        const selection = selectionOf(harness, { results: RESULTS });

        const running = selection.applyNow({ top: { run: "running", field: "value", n: 2 } });
        const missing = selection.applyNow({ above: { run: "nobody", field: "value", threshold: 1 } });

        assert.deepStrictEqual([...running.unresolvedPaths], ["results.running.value"]);
        assert.deepStrictEqual([...missing.unresolvedPaths], ["results.nobody.value"]);
        assert.strictEqual(selection.size, 0);
        harness.session.dispose();
    });

    it("refuses a field that is one number for the whole graph", () => {
        const harness = line();
        const selection = selectionOf(harness, { results: RESULTS });

        assert.strictEqual(
            codeOf(() => selection.applyNow({ top: { run: "degree", field: "measured", n: 1 } })),
            "E_BAD_COMMAND",
        );
        harness.session.dispose();
    });

    it("refuses a count and a threshold that are not numbers of the right kind", () => {
        const harness = line();
        const selection = selectionOf(harness, { results: RESULTS });

        assert.strictEqual(
            codeOf(() => selection.applyNow({ top: { run: "degree", field: "value", n: 1.5 } })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => selection.applyNow({ above: { run: "degree", field: "value", threshold: Number.NaN } })),
            "E_OPTION_RANGE",
        );
        harness.session.dispose();
    });

    it("refuses when the session reads no runs", () => {
        const harness = line();
        const selection = selectionOf(harness);

        assert.strictEqual(
            codeOf(() => selection.applyNow({ top: { run: "degree", field: "value", n: 1 } })),
            "E_UNSUPPORTED",
        );
        harness.session.dispose();
    });
});

describe("the two targets that are relative to the selection", () => {
    it("adds the edges whose endpoints are both selected", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "b", "c"] });

        selection.applyNow({ edgesBetween: true }, "add");

        assert.deepStrictEqual([...selection.nodes], ["a", "b", "c"]);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "a", "b"), edgeBetween(harness, "b", "c")], "c:d leaves the selection, so it is not between");
        harness.session.dispose();
    });

    it("names the edges and no nodes, so replacing with it narrows to the edges", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "b"] });

        selection.applyNow({ edgesBetween: true });

        assert.deepStrictEqual([...selection.nodes], []);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });

    it("inverts both halves", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a"], edges: [edgeBetween(harness, "a", "b")] });

        selection.applyNow({ invert: true });

        assert.deepStrictEqual([...selection.nodes], ["b", "c", "d"]);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "b", "c"), edgeBetween(harness, "c", "d")]);
        harness.session.dispose();
    });

    it("inverts an empty selection into the whole graph", () => {
        const harness = line();
        const selection = selectionOf(harness);

        selection.applyNow({ invert: true });

        assert.strictEqual(selection.size, 7, "four nodes and three edges");
        harness.session.dispose();
    });
});
