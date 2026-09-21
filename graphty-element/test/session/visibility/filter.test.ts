import { assert, describe, it } from "vitest";

import type { EdgeId, NodeId, Path } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { edgeSpaceOf, ElementMask, nodeSpaceOf } from "../../../src/session/scope/index";
import {
    assertVisibility,
    type CompiledVisibility,
    compileVisibility,
    type ElementTest,
    type Filter,
    type FilterDirection,
    type FilterSources,
    type FilterValueSource,
    runPass,
    runPassInSlices,
    type TimeStep,
    type TimeWindow,
    type VisibilityPass,
} from "../../../src/session/visibility/index";
import { edgeBetween, type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";

function harnessOf(nodes: readonly NodeRow[], edges: readonly EdgeRow[] = []): Harness {
    const harness = makeSession();
    harness.add(nodes, edges);

    return harness;
}

/** Reads the bags the harness kept, addressing them by the `data.` paths a filter uses. */
function valuesOf(harness: Harness): FilterValueSource {
    const key = (path: Path): string => path.replace(/^data\./, "");

    return {
        nodeValue: (index, path) => harness.nodeAttributes.get(index)?.[key(path)],
        edgeValue: (index, path) => harness.edgeAttributes.get(index)?.[key(path)],
    };
}

/** What a filter and a window leave visible, as two sorted id lists. */
function applied(
    harness: Harness,
    filter: Filter | null,
    window: TimeWindow | null,
    sources: FilterSources = {},
): { nodes: readonly NodeId[]; edges: readonly EdgeId[]; unresolved: readonly Path[] } {
    const graph = harness.store.getSnapshot();
    const nodeSpace = nodeSpaceOf(graph);
    const edgeSpace = edgeSpaceOf(graph);
    const nodes = new ElementMask<NodeId>(() => nodeSpace, Math.max(1, graph.nodeCount));
    const edges = new ElementMask<EdgeId>(() => edgeSpace, Math.max(1, graph.edgeCount));
    nodes.grow(graph.nodeCount);
    edges.grow(graph.edgeCount);

    const compiled: CompiledVisibility = compileVisibility(graph, filter, window, sources);
    const pass: VisibilityPass = { compiled, edges, graph, nodes };
    runPass(pass);

    return { nodes: [...nodes.ids()].sort(), edges: [...edges.ids()].sort(), unresolved: compiled.unresolvedPaths() };
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

describe("a filter over nodes", () => {
    it("keeps the nodes whose category is wanted, and hides one carrying no category", () => {
        const harness = harnessOf([
            { id: "a", type: "host" },
            { id: "b", type: "service" },
            { id: "c" },
        ]);

        const shown = applied(harness, { kind: "categories", attribute: "data.type", values: ["host"] }, null, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.nodes, ["a"]);
        harness.session.dispose();
    });

    it("matches a numeric category against the text a form hands back", () => {
        // A chip list gives back "3"; the record carried the number 3. A category is a label, not
        // an identity, so the two are the same category.
        const harness = harnessOf([
            { id: "a", tier: 3 },
            { id: "b", tier: 4 },
        ]);

        const shown = applied(harness, { kind: "categories", attribute: "data.tier", values: ["3"] }, null, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.nodes, ["a"]);
        harness.session.dispose();
    });

    it("keeps a numeric attribute inside the range, at both ends", () => {
        const harness = harnessOf([
            { id: "a", score: 1 },
            { id: "b", score: 5 },
            { id: "c", score: 9 },
            { id: "d" },
        ]);

        const shown = applied(harness, { kind: "range", attribute: "data.score", min: 1, max: 5 }, null, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.nodes, ["a", "b"], "a range is inclusive at both ends");
        harness.session.dispose();
    });

    it("keeps the nodes inside a degree band, counting the whole graph", () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
            [
                { src: "a", dst: "b" },
                { src: "a", dst: "c" },
            ],
        );

        const shown = applied(harness, { kind: "degree", min: 2 }, null);

        assert.deepStrictEqual(shown.nodes, ["a"]);
        harness.session.dispose();
    });

    it("counts only the arcs a direction names", () => {
        const harness = makeSession({ directed: true });
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const expected: readonly (readonly [FilterDirection, readonly NodeId[]])[] = [
            ["out", ["a"]],
            ["in", ["b"]],
            ["all", ["a", "b"]],
        ];

        for (const [direction, nodes] of expected) {
            assert.deepStrictEqual(applied(harness, { kind: "degree", min: 1, direction }, null).nodes, nodes);
        }

        harness.session.dispose();
    });

    it("keeps a neighbourhood, counting hops in both directions", () => {
        const harness = makeSession({ directed: true });
        harness.add(
            [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
            [
                { src: "a", dst: "b" },
                { src: "c", dst: "a" },
                { src: "b", dst: "d" },
            ],
        );

        const one = applied(harness, { kind: "neighborhood", seeds: ["a"], depth: 1 }, null);
        const zero = applied(harness, { kind: "neighborhood", seeds: ["a"], depth: 0 }, null);

        assert.deepStrictEqual(one.nodes, ["a", "b", "c"], "a predecessor is as much a neighbour as a successor");
        assert.deepStrictEqual(zero.nodes, ["a"], "depth 0 is the seeds alone");
        harness.session.dispose();
    });

    it("keeps one connected component", () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [{ src: "a", dst: "b" }],
        );

        const shown = applied(harness, { kind: "component", id: 1 }, null, {
            components: () => ({ labels: [0, 0, 1], count: 2 }),
        });

        assert.deepStrictEqual(shown.nodes, ["c"]);
        harness.session.dispose();
    });

    it("keeps the nodes a query matched", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }, { id: "c" }]);

        const shown = applied(harness, { kind: "expression", where: "anything" }, null, {
            match: () => ["b", "gone"],
        });

        assert.deepStrictEqual(shown.nodes, ["b"], "an id the graph no longer holds is skipped, not an error");
        harness.session.dispose();
    });
});

describe("edges", () => {
    it("hides an edge whose endpoint is hidden", () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );

        const shown = applied(harness, { kind: "expression", where: "q" }, null, { match: () => ["a", "b"] });

        assert.deepStrictEqual(shown.nodes, ["a", "b"]);
        assert.deepStrictEqual(shown.edges, [edgeBetween(harness, "a", "b")], "b:c has an endpoint that is hidden");
        harness.session.dispose();
    });

    it("narrows the edges below what the visible nodes induce", () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );

        const shown = applied(harness, { kind: "edges", where: "q" }, null, { matchEdges: () => [edgeBetween(harness, "a", "b")] });

        assert.deepStrictEqual(shown.nodes, ["a", "b", "c"], "an edge filter says nothing about nodes");
        assert.deepStrictEqual(shown.edges, [edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });

    it("cannot put back an edge whose endpoint a node filter hid", () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );

        const shown = applied(
            harness,
            {
                kind: "all",
                of: [
                    { kind: "expression", where: "nodes" },
                    { kind: "edges", where: "edges" },
                ],
            },
            null,
            { match: () => ["a", "b"], matchEdges: () => [edgeBetween(harness, "a", "b"), edgeBetween(harness, "b", "c")] },
        );

        assert.deepStrictEqual(shown.edges, [edgeBetween(harness, "a", "b")], "the edge query named b:c, but c is hidden");
        harness.session.dispose();
    });
});

describe("combining filters", () => {
    it("takes every branch of an all, on both halves independently", () => {
        const harness = harnessOf(
            [
                { id: "a", score: 9 },
                { id: "b", score: 1 },
                { id: "c", score: 9 },
            ],
            [
                { src: "a", dst: "c" },
                { src: "a", dst: "b" },
            ],
        );

        const shown = applied(
            harness,
            {
                kind: "all",
                of: [
                    { kind: "range", attribute: "data.score", min: 5 },
                    { kind: "edges", where: "q" },
                ],
            },
            null,
            { matchEdges: () => [edgeBetween(harness, "a", "c")], values: valuesOf(harness) },
        );

        assert.deepStrictEqual(shown.nodes, ["a", "c"]);
        assert.deepStrictEqual(shown.edges, [edgeBetween(harness, "a", "c")]);
        harness.session.dispose();
    });

    it("takes either branch of an any", () => {
        const harness = harnessOf([
            { id: "a", score: 9 },
            { id: "b", score: 1 },
            { id: "c", score: 1 },
        ]);

        const shown = applied(
            harness,
            {
                kind: "any",
                of: [
                    { kind: "range", attribute: "data.score", min: 5 },
                    { kind: "expression", where: "q" },
                ],
            },
            null,
            { match: () => ["c"], values: valuesOf(harness) },
        );

        assert.deepStrictEqual(shown.nodes, ["a", "c"]);
        harness.session.dispose();
    });

    it("inverts a not", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);

        const shown = applied(harness, { kind: "not", of: { kind: "expression", where: "q" } }, null, {
            match: () => ["a"],
        });

        assert.deepStrictEqual(shown.nodes, ["b"]);
        harness.session.dispose();
    });

    it("leaves both halves absent when nothing constrains either", () => {
        // An absent half is not a test that always answers true: the walk skips the call
        // entirely, which is what makes "nothing is filtered" cost nothing per element.
        const harness = harnessOf([{ id: "a" }], [{ src: "a", dst: "a" }]);
        const compiled = compileVisibility(harness.store.getSnapshot(), null, null, {});
        const halves: readonly (ElementTest | null)[] = [compiled.node, compiled.edge];

        assert.deepStrictEqual(halves, [null, null]);
        harness.session.dispose();
    });

    it("constrains nothing when a group is empty", () => {
        // An empty list in a form means "nothing chosen", not "nothing allowed". A filter builder
        // that blanked the graph when its last chip was removed would be unusable.
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        const shown = applied(harness, { kind: "all", of: [] }, null);

        assert.deepStrictEqual(shown.nodes, ["a", "b"]);
        assert.deepStrictEqual(shown.edges, [edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });
});

describe("a time window", () => {
    it("is half-open: the from is inside and the to is not", () => {
        const harness = harnessOf([
            { id: "a", at: 10 },
            { id: "b", at: 20 },
            { id: "c", at: 30 },
        ]);
        // The step is carried rather than applied: whatever advances the window reads it.
        const step: TimeStep = 10;

        const shown = applied(harness, null, { attribute: "data.at", from: 10, to: 30, step }, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.nodes, ["a", "b"]);
        harness.session.dispose();
    });

    it("reads a date string on both the bound and the value", () => {
        const harness = harnessOf([
            { id: "a", at: "2026-02-10" },
            { id: "b", at: "2026-07-10" },
        ]);

        const shown = applied(harness, null, { attribute: "data.at", from: "2026-01", to: "2026-06" }, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.nodes, ["a"]);
        harness.session.dispose();
    });

    it("leaves an element with no place on the timeline alone", () => {
        // The edges carry the time and the nodes do not, which is the ordinary shape of a dynamic
        // graph. Treating a node with no timestamp as "outside the window" would blank the graph.
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b", at: 5 },
                { src: "b", dst: "c", at: 50 },
            ],
        );

        const shown = applied(harness, null, { attribute: "data.at", from: 0, to: 10 }, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.nodes, ["a", "b", "c"], "no timestamp means the window says nothing");
        assert.deepStrictEqual(shown.edges, [edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });

    it("composes with a filter rather than replacing it", () => {
        const harness = harnessOf([
            { id: "a", type: "host", at: 1 },
            { id: "b", type: "host", at: 90 },
            { id: "c", type: "service", at: 1 },
        ]);

        const shown = applied(
            harness,
            { kind: "categories", attribute: "data.type", values: ["host"] },
            { attribute: "data.at", from: 0, to: 10 },
            { values: valuesOf(harness) },
        );

        assert.deepStrictEqual(shown.nodes, ["a"], "a host, inside the window");
        harness.session.dispose();
    });
});

describe("paths nothing answered", () => {
    it("names an attribute no element carried", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);

        const shown = applied(harness, { kind: "range", attribute: "data.rank", min: 1 }, null, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.nodes, [], "matching nothing is a legitimate answer");
        assert.deepStrictEqual(shown.unresolved, ["data.rank"]);
        harness.session.dispose();
    });

    it("says nothing about an attribute some element carried, even when none matched", () => {
        const harness = harnessOf([
            { id: "a", rank: 1 },
            { id: "b", rank: 2 },
        ]);

        const shown = applied(harness, { kind: "range", attribute: "data.rank", min: 50 }, null, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.nodes, []);
        assert.deepStrictEqual(shown.unresolved, [], "the path answered; nothing was in the band");
        harness.session.dispose();
    });

    it("still names a path whose branch could not change the answer", () => {
        // `all` evaluates every branch rather than short-circuiting, because a branch that is
        // never called never reads its attribute, and an unread path looks exactly like an
        // unanswered one.
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);

        const shown = applied(
            harness,
            {
                kind: "all",
                of: [
                    { kind: "expression", where: "nothing" },
                    { kind: "range", attribute: "data.rank", min: 1 },
                ],
            },
            null,
            { match: () => [], values: valuesOf(harness) },
        );

        assert.deepStrictEqual(shown.unresolved, ["data.rank"]);
        harness.session.dispose();
    });

    it("carries through the paths a query engine could not resolve", () => {
        const harness = harnessOf([{ id: "a" }]);

        const shown = applied(harness, { kind: "expression", where: "results.nope.value > `1`" }, null, {
            match: () => [],
            unresolvedPathsOf: () => ["results.nope.value"],
        });

        assert.deepStrictEqual(shown.unresolved, ["results.nope.value"]);
        harness.session.dispose();
    });

    it("counts a window path as answered when only the edges carried it", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", at: 5 }]);

        const shown = applied(harness, null, { attribute: "data.at", from: 0, to: 10 }, {
            values: valuesOf(harness),
        });

        assert.deepStrictEqual(shown.unresolved, []);
        harness.session.dispose();
    });
});

describe("refusing a filter that is not one", () => {
    it("checks a filter without touching the graph, so a form can gate its own button", () => {
        assert.strictEqual(codeOf(() => assertVisibility({ kind: "nope" } as unknown as Filter, null)), "E_BAD_COMMAND");
        assert.strictEqual(
            codeOf(() => assertVisibility(null, { attribute: "data.at", from: 9, to: 1 })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(codeOf(() => assertVisibility({ kind: "degree", min: 1 }, null)), null);
        assert.strictEqual(codeOf(() => assertVisibility(null, null)), null);
    });

    it("refuses an unknown kind, a missing query and an inverted range", () => {
        const harness = harnessOf([{ id: "a" }]);
        const graph = harness.store.getSnapshot();
        const compile = (filter: Filter): unknown => compileVisibility(graph, filter, null, {});

        assert.strictEqual(codeOf(() => compile({ kind: "nope" } as unknown as Filter)), "E_BAD_COMMAND");
        assert.strictEqual(codeOf(() => compile({ kind: "expression", where: "  " })), "E_BAD_QUERY");
        assert.strictEqual(
            codeOf(() => compile({ kind: "range", attribute: "data.x", min: 9, max: 1 })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(codeOf(() => compile({ kind: "range", attribute: "", min: 1 })), "E_BAD_COMMAND");
        assert.strictEqual(
            codeOf(() => compile({ kind: "neighborhood", seeds: ["a"], depth: -1 })),
            "E_OPTION_RANGE",
        );
        harness.session.dispose();
    });

    it("refuses a window whose bounds are not instants, or are the wrong way round", () => {
        const harness = harnessOf([{ id: "a" }]);
        const graph = harness.store.getSnapshot();
        const compile = (window: TimeWindow): unknown => compileVisibility(graph, null, window, {});

        assert.strictEqual(codeOf(() => compile({ attribute: "data.at", from: "nope", to: 5 })), "E_OPTION_RANGE");
        assert.strictEqual(codeOf(() => compile({ attribute: "data.at", from: 9, to: 1 })), "E_OPTION_RANGE");
        assert.strictEqual(
            codeOf(() => compile({ attribute: "data.at", from: 1, to: 9, step: 0 })),
            "E_OPTION_RANGE",
        );
        harness.session.dispose();
    });

    it("refuses a filter this session cannot evaluate rather than widening it", () => {
        const harness = harnessOf([{ id: "a" }]);
        const graph = harness.store.getSnapshot();
        const compile = (filter: Filter): unknown => compileVisibility(graph, filter, null, {});

        assert.strictEqual(codeOf(() => compile({ kind: "expression", where: "q" })), "E_UNSUPPORTED");
        assert.strictEqual(codeOf(() => compile({ kind: "edges", where: "q" })), "E_UNSUPPORTED");
        assert.strictEqual(codeOf(() => compile({ kind: "component", id: 0 })), "E_UNSUPPORTED");
        assert.strictEqual(codeOf(() => compile({ kind: "range", attribute: "data.x", min: 1 })), "E_UNSUPPORTED");
        harness.session.dispose();
    });
});

describe("running the pass in slices", () => {
    it("fills the same masks the one-shot pass does, and reports a determinate total", async () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const graph = harness.store.getSnapshot();
        const nodeSpace = nodeSpaceOf(graph);
        const edgeSpace = edgeSpaceOf(graph);
        const nodes = new ElementMask<NodeId>(() => nodeSpace, graph.nodeCount);
        const edges = new ElementMask<EdgeId>(() => edgeSpace, graph.edgeCount);
        nodes.grow(graph.nodeCount);
        edges.grow(graph.edgeCount);
        const compiled = compileVisibility(graph, { kind: "expression", where: "q" }, null, {
            match: () => ["a", "b"],
        });
        const seen: { completed: number; total: number }[] = [];

        await runPassInSlices({ compiled, edges, graph, nodes }, new AbortController().signal, (completed, total) => {
            seen.push({ completed, total });
        });

        assert.deepStrictEqual([...nodes.ids()].sort(), ["a", "b"]);
        assert.deepStrictEqual([...edges.ids()], [edgeBetween(harness, "a", "b")]);
        assert.isAtLeast(seen.length, 1);
        assert.deepStrictEqual(seen.at(-1), { completed: 5, total: 5 }, "three nodes and two edges");
        harness.session.dispose();
    });

    it("throws the signal's reason when it is already aborted", async () => {
        const harness = harnessOf([{ id: "a" }]);
        const graph = harness.store.getSnapshot();
        const nodeSpace = nodeSpaceOf(graph);
        const edgeSpace = edgeSpaceOf(graph);
        const nodes = new ElementMask<NodeId>(() => nodeSpace, 1);
        const edges = new ElementMask<EdgeId>(() => edgeSpace, 1);
        nodes.grow(graph.nodeCount);
        edges.grow(graph.edgeCount);
        const compiled = compileVisibility(graph, null, null, {});
        const controller = new AbortController();
        controller.abort(new DOMException("stop", "AbortError"));

        let thrown: unknown = null;

        try {
            await runPassInSlices({ compiled, edges, graph, nodes }, controller.signal, () => undefined);
        } catch (error) {
            thrown = error;
        }

        assert.instanceOf(thrown, DOMException);
        assert.strictEqual((thrown).name, "AbortError");
        assert.strictEqual(nodes.size, 0, "an aborted pass wrote nothing");
        harness.session.dispose();
    });
});
