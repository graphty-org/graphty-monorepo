/**
 * @file Mask-back of a scoped run's published values, the caveat saying what the run computed on,
 * and the check of node options against the scope (design/sets/sets-design.md section 10.1).
 */

import { assert, describe, it } from "vitest";

import type { Algorithm } from "../../../src/algorithms/Algorithm";
import { checkNodeOptions, maskBack, WHOLE_GRAPH_CAVEAT } from "../../../src/algorithms/input/maskBack";
import { type ResolvedInputScope, withRunInput } from "../../../src/algorithms/input/ScopedInput";
import { detachedRunContext } from "../../../src/algorithms/results";
import { DeclaredAlgorithm } from "../../../src/algorithms/results/DeclaredAlgorithm";
import type { AlgorithmOutput } from "../../../src/algorithms/results/types";
import type { OptionDescriptor } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import type { RunResult } from "../../../src/session/results";
import { InputGraph, WholeComponents, WholeDegree, WholeDijkstra, WholePageRank } from "./harness";

/** Six nodes in a ring, so a scope of three cuts it. */
function ring(): InputGraph {
    const ids = ["a", "b", "c", "d", "e", "f"];

    return new InputGraph(
        ids,
        ids.map((id, index) => [id, ids[(index + 1) % ids.length], index + 1] as const),
    );
}

/**
 * Publish one algorithm's result bound to a scope.
 * @param algorithm - The instance.
 * @param graph - The graph it runs on.
 * @param scope - The scope.
 * @returns The result.
 */
async function publishOver(algorithm: Algorithm, graph: InputGraph, scope: ResolvedInputScope): Promise<RunResult> {
    const result = await withRunInput(algorithm, graph, () => scope, undefined, () => algorithm.publishResult(detachedRunContext(), "r"));
    assert.isDefined(result);

    return result;
}

/** Counts the nodes of its input and publishes the count on every node it read. */
class ScopedCounter extends DeclaredAlgorithm {
    static namespace = "test";
    static type = "scoped-counter";
    static scopeInput = "subgraph" as const;

    compute(): Promise<AlgorithmOutput> {
        const snapshot = this.input("declared").subgraph();
        const nodes = Array.from({ length: snapshot.nodeCount }, (_, index) => ({ id: snapshot.ids.idOf(index), values: { value: snapshot.nodeCount } }));

        return Promise.resolve({
            shape: "node-metric",
            fields: [{ name: "value", kind: "node", type: "number" }],
            nodes,
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "count", notes: [] },
        });
    }
}

describe("every value outside the scope reads missing", () => {
    it("a metric that computed on the whole graph keeps only its scope's values, and they are the whole-graph values", async () => {
        const graph = ring();
        const whole = await new WholePageRank(graph.asGraph()).publishResult(detachedRunContext(), "r");
        const result = await publishOver(new WholePageRank(graph.asGraph()), graph, graph.scope(["a", "b", "c"]));

        for (const id of ["a", "b", "c"]) {
            assert.strictEqual(result.node(id)?.value, whole?.node(id)?.value);
        }

        for (const id of ["d", "e", "f"]) {
            assert.isUndefined(result.node(id), `${id} is outside the scope`);
        }
    });

    it("the rankings, histograms and summaries count only the scope", async () => {
        const graph = ring();
        const result = await publishOver(new WholeDegree(graph.asGraph()), graph, graph.scope(["a", "b", "c"]));

        assert.deepStrictEqual(result.ranking("value").map((entry) => entry.id).sort(), ["a", "b", "c"]);
        assert.strictEqual(result.histogram("value").bins.reduce((sum, bin) => sum + bin.count, 0), 3);
        assert.strictEqual(result.summary().measured, 3);
        assert.strictEqual(result.column("value").length, 3);
    });

    it("the fields filled from the population count only the scope: a group's size is its members in scope", async () => {
        const graph = ring();
        const result = await publishOver(new WholeComponents(graph.asGraph()), graph, graph.scope(["a", "b", "c"]));

        assert.strictEqual(result.node("a")?.groupSize, 3);
    });

    it("Dijkstra's Infinity and onPath: false defaults outside the scope are dropped", async () => {
        // "z" is isolated: the whole-graph search reports it at Infinity, off the route.
        const graph = new InputGraph(["a", "b", "c", "d", "z"], [["a", "b"], ["b", "c"], ["c", "d"]]);
        const whole = await new WholeDijkstra(graph.asGraph(), { source: "a", target: "b" }).publishResult(detachedRunContext(), "r");
        assert.deepInclude(whole?.node("z"), { distance: Infinity, onPath: false });
        assert.deepInclude(whole?.edge("2"), { onPath: false });

        const result = await publishOver(new WholeDijkstra(graph.asGraph(), { source: "a", target: "b" }), graph, graph.scope(["a", "b"]));

        assert.isUndefined(result.node("z"));
        assert.isUndefined(result.node("d"));
        assert.isUndefined(result.edge("1"));
        assert.isUndefined(result.edge("2"));
        assert.deepInclude(result.edge("0"), { onPath: true });
    });

    it("the many-to-one edge remap is masked: a merged reciprocal half outside a listed scope reads missing", async () => {
        // The undirected view merges a>b and b>a, so both declared halves are on the route.
        const graph = new InputGraph(["a", "b", "c"], [["a", "b"], ["b", "a"], ["b", "c"]], true);
        const whole = await new WholeDijkstra(graph.asGraph(), { source: "a", target: "b" }).publishResult(detachedRunContext(), "r");
        assert.deepInclude(whole?.edge("0"), { onPath: true });
        assert.deepInclude(whole?.edge("1"), { onPath: true });

        // Both endpoints of b>a are members; only a>b is listed.
        const listed = graph.scope(["a", "b"], (source) => source === "a");
        const result = await publishOver(new WholeDijkstra(graph.asGraph(), { source: "a", target: "b" }), graph, listed);

        assert.deepInclude(result.edge("0"), { onPath: true });
        assert.isUndefined(result.edge("1"), "outside the listed edges though both endpoints are members");
        assert.isUndefined(result.edge("2"));
    });

    it("a run over the whole graph, and a run outside any scope, are unchanged and carry no scope caveat", async () => {
        const graph = ring();
        const bound = await publishOver(new WholeDegree(graph.asGraph()), graph, graph.everything());
        const unbound = await new WholeDegree(graph.asGraph()).publishResult(detachedRunContext(), "r");

        assert.strictEqual(bound.column("value").length, 6);
        assert.deepStrictEqual(bound.summary().caveats.notes, unbound?.summary().caveats.notes);
        assert.notInclude(bound.summary().caveats.notes, WHOLE_GRAPH_CAVEAT);
    });

    it("maskBack passes an algorithm that is not in a run through unchanged", () => {
        const init = {
            runId: "r",
            shape: "node-metric" as const,
            fields: [],
            measured: { nodes: 1, edges: 0 },
            nodes: [{ id: "a", values: { value: 1 } }],
            caveats: { exact: true, direction: "as-loaded" as const, precision: "f64" as const, method: "m", notes: [] },
            durationMs: 0,
        };

        assert.strictEqual(maskBack({}, init), init);
    });
});

describe("the run says what it computed on", () => {
    it("an algorithm without the declaration computed on the whole graph, and says so, decided at run time", async () => {
        const graph = ring();
        for (const algorithm of [new WholePageRank(graph.asGraph()), new WholeDegree(graph.asGraph())]) {
            const result = await publishOver(algorithm, graph, graph.scope(["a", "b", "c"]));

            assert.include(result.summary().caveats.notes, WHOLE_GRAPH_CAVEAT);
        }

        assert.strictEqual(WHOLE_GRAPH_CAVEAT, "Computed on the whole graph; values kept for the scope only.");
    });

    it("a declaring algorithm over an induced scope names the induced subgraph", async () => {
        const graph = ring();
        const scope = { ...graph.scope(["a", "b", "c"]), reading: "induced" as const };
        const result = await publishOver(new ScopedCounter(graph.asGraph()), graph, scope);

        assert.include(result.summary().caveats.notes, "Computed on the induced subgraph of 3 nodes.");
        assert.notInclude(result.summary().caveats.notes, WHOLE_GRAPH_CAVEAT);
        assert.strictEqual(result.node("a")?.value, 3, "it computed on the scope");
    });

    for (const reading of ["listed", "clipped"] as const) {
        it(`a declaring algorithm over a ${reading} scope names its nodes and its edges`, async () => {
            const graph = ring();
            const scope = { ...graph.scope(["a", "b", "c"], (source) => source === "a"), reading };
            const result = await publishOver(new ScopedCounter(graph.asGraph()), graph, scope);

            assert.include(result.summary().caveats.notes, "Computed on the subgraph of 3 nodes and the 1 edge in scope.");
        });
    }
});

describe("node options are checked against the scope", () => {
    const options: OptionDescriptor[] = [
        { name: "source", plainName: "Source", type: "node-id" },
        { name: "seeds", plainName: "Seeds", type: "node-set" },
        { name: "label", plainName: "Label", type: "string" },
    ];

    /**
     * The error a check throws, or undefined.
     * @param check - The check.
     * @returns The error.
     */
    function thrown(check: () => void): unknown {
        try {
            check();
        } catch (error) {
            return error;
        }

        return undefined;
    }

    it("refuses a node option outside the scope with E_OPTION_RANGE and outside-scope", () => {
        const graph = ring();
        const scope = graph.scope(["a", "b", "c"]);

        for (const params of [{ source: "d" }, { seeds: ["a", "e"] }]) {
            const error = thrown(() => {
                checkNodeOptions(options, params, scope);
            });
            assert.isTrue(isGraphtyError(error));
            if (isGraphtyError(error)) {
                assert.strictEqual(error.code, "E_OPTION_RANGE");
                assert.strictEqual(error.details?.reason, "outside-scope");
            }
        }
    });

    it("accepts members, ids the graph does not hold, other option types, and any node over the whole graph", () => {
        const graph = ring();
        const scope = graph.scope(["a", "b", "c"]);

        checkNodeOptions(options, { source: "a", seeds: ["b", "c"], label: "d" }, scope);
        checkNodeOptions(options, { source: "nowhere" }, scope);
        checkNodeOptions(options, { source: "d" }, graph.everything());
        checkNodeOptions(options, { source: "d" }, null);
    });
});
