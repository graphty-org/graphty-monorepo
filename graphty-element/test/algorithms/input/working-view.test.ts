/**
 * @file Algorithms over the working graph (design/working-graph/design.md section 6). A run whose
 * scope is the view its store shares -- the session's working graph, with the `workingGraph` option
 * on -- computes over that view whatever its class declares: an algorithm that declares no scoped
 * input (a plugin, `defineAlgorithm`, an older class) reads the view through both seams instead of
 * the whole graph, its values are the view's, its record says it computed on a subgraph, and an
 * accelerator is handed the view. A scope the store does not share keeps today's whole-graph route.
 */

import { type GraphSnapshot, maskTest } from "@graphty/graph-format";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import type { DerivedInput, InputMembership } from "../../../src/algorithms/input/derivedInputs";
import {
    intermediateOf,
    scopedInputCounters,
    shareInputs,
    withRunInput,
} from "../../../src/algorithms/input/ScopedInput";
import { detachedRunContext } from "../../../src/algorithms/results";
import { createFakeAccelerator } from "../../../src/testing/fakeAccelerator";
import { idsOf, InputGraph, WholeDegree, WholePageRank } from "./harness";

/** Reads its input through both seams, and declares nothing. */
class WholeReader extends Algorithm {
    static namespace = "test";
    static type = "working-whole-reader";

    run(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * What both seams hand over.
     * @returns The input subgraph and the accelerated snapshot.
     */
    seams(): { subgraph: GraphSnapshot; accelerated: GraphSnapshot } {
        return {
            subgraph: this.input("declared").subgraph(),
            accelerated: this.accelerated("pageRank", "directed").snapshot,
        };
    }
}

/** Six nodes in a ring, so a scope of three cuts it. */
function ring(): InputGraph {
    const ids = ["a", "b", "c", "d", "e", "f"];

    return new InputGraph(
        ids,
        ids.map((id, index) => [id, ids[(index + 1) % ids.length], index + 1] as const),
        true,
    );
}

/** What is shown: three neighbours on the ring. */
const SHOWN = ["a", "b", "c"];

/**
 * Share a view of what is shown on a graph's store, as the session's working graph does: one
 * derivation, handed to a run whose membership is the shown one.
 * @param graph - The graph.
 * @returns The view's snapshot, built on first ask.
 */
function shareView(graph: InputGraph): () => GraphSnapshot | undefined {
    const shown = graph.scope(SHOWN).resolution;
    let view: DerivedInput | undefined;
    shareInputs(graph.store, (membership: InputMembership, declared: GraphSnapshot) => {
        const same =
            declared === graph.snapshot() &&
            membership.nodes.every((word, index) => word === shown.nodes[index]) &&
            membership.edges.every((word, index) => word === shown.edges[index]);
        if (!same) {
            return undefined;
        }

        view ??= intermediateOf(membership, declared);
        return view;
    });

    return () => view?.snapshot;
}

let graph: InputGraph;

beforeEach(() => {
    graph = ring();
    scopedInputCounters.derivations = 0;
});

afterEach(() => {
    shareInputs(graph.store, null);
});

describe("an algorithm that declares no scoped input, over the working view", () => {
    it("reads the shared view through both seams, and derives nothing of its own", async () => {
        const viewOf = shareView(graph);
        const algorithm = new WholeReader(graph.asGraph());
        const scope = graph.scope(SHOWN);

        const seen = await withRunInput(
            algorithm,
            graph,
            () => scope,
            undefined,
            () => Promise.resolve(algorithm.seams()),
        );

        assert.strictEqual(seen.subgraph, viewOf(), "the view itself, not a copy");
        assert.deepStrictEqual(idsOf(seen.accelerated), SHOWN);
        assert.strictEqual(scopedInputCounters.derivations, 1, "the view's one induce, and nothing else");
    });

    it("still reads the whole graph under a scope the store does not share", async () => {
        shareView(graph);
        const algorithm = new WholeReader(graph.asGraph());
        const scope = graph.scope(["a", "b"]);

        const seen = await withRunInput(
            algorithm,
            graph,
            () => scope,
            undefined,
            () => Promise.resolve(algorithm.seams()),
        );

        assert.strictEqual(seen.subgraph.nodeCount, 6);
        assert.strictEqual(scopedInputCounters.derivations, 0);
    });

    it("publishes the view's values and says it computed on a subgraph", async () => {
        shareView(graph);
        const degree = new WholeDegree(graph.asGraph());
        const scope = graph.scope(SHOWN);

        const result = await withRunInput(
            degree,
            graph,
            () => scope,
            undefined,
            () => degree.publishResult(detachedRunContext(), "r"),
        );

        assert.isDefined(result);
        // On the whole ring every node has degree 2; on the view a and c have one neighbour each.
        assert.deepStrictEqual(
            ["a", "b", "c", "d"].map((id) => result.node(id)?.value),
            [1, 2, 1, undefined],
        );
        const codes = result.summary().caveats.facts.map((fact) => fact.code);
        assert.notInclude(codes, "scope.whole-graph");
        assert.isTrue(
            codes.includes("scope.subgraph") || codes.includes("scope.induced-subgraph"),
            `a subgraph caveat, not ${codes.join(", ")}`,
        );
    });

    it("hands an accelerator the view, not the whole graph", async () => {
        const viewOf = shareView(graph);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);
        const pagerank = new WholePageRank(graph.asGraph());
        const scope = graph.scope(SHOWN);

        const result = await withRunInput(
            pagerank,
            graph,
            () => scope,
            undefined,
            () => pagerank.publishResult(detachedRunContext(), "r"),
        );

        assert.lengthOf(fake.calls.uploaded, 1);
        const uploaded = fake.calls.uploaded[0];
        assert.strictEqual(uploaded.nodeCount, 3);
        assert.deepStrictEqual(idsOf(uploaded), idsOf(viewOf() ?? uploaded));
        const shown = graph.scope(SHOWN).resolution.nodes;
        for (const id of ["d", "e", "f"]) {
            assert.isFalse(maskTest(shown, graph.snapshot().ids.indexOf(id)));
            assert.isUndefined(result?.node(id), `${id} is hidden and gets no value`);
        }
    });
});
