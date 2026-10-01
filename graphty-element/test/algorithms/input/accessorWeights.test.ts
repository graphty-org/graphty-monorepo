/**
 * @file The snapshot accessor's weight option and its result columns: what `weight` fills and
 * refuses, over the whole graph and over a run's scope, and which result paths a column may name.
 */

import { assert, describe, it } from "vitest";

import { type InputColumns, sessionColumns } from "../../../src/algorithms/input/columns";
import { DerivedInputs } from "../../../src/algorithms/input/derivedInputs";
import { createScopedInput, type RunInput, scopeEdges } from "../../../src/algorithms/input/ScopedInput";
import { isGraphtyError } from "../../../src/errors";
import type { GraphSession } from "../../../src/session/types";
import { edgesOf, InputGraph } from "./harness";

/** a -> b twice, b -> a, b -> c and c -> c: parallel edges, a reciprocal pair and a self-loop. */
function multigraph(): InputGraph {
    return new InputGraph(
        ["a", "b", "c"],
        [
            ["a", "b"],
            ["a", "b"],
            ["b", "a"],
            ["b", "c"],
            ["c", "c"],
        ],
    );
}

/**
 * Columns where only the edges carry `w`, with these values by edge row.
 * @param values - The values.
 * @returns The reader.
 */
function edgeAttribute(values: readonly unknown[]): InputColumns {
    return {
        option: (name) => ({ path: name }),
        read: (_graph, path, on) => (path === "w" && on !== "node" ? { kind: "edge", values: [...values] } : null),
    };
}

/**
 * The code a thrown value carries.
 * @param run - What throws.
 * @returns The code, or "no error".
 */
function codeOf(run: () => unknown): string {
    try {
        run();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "uncoded";
    }

    return "no error";
}

describe("the weight option", () => {
    it("keeps an unweighted input unweighted in the subgraph, rather than weighing merged edges by count", () => {
        const data = multigraph().getDataManager();

        for (const orientation of ["declared", "undirected"] as const) {
            const input = createScopedInput(data, orientation, { weight: null });
            assert.isNull(input.graph.weights, orientation);
            assert.isNull(input.subgraph().edgeList().weights, `${orientation} subgraph`);
        }
    });

    it("keeps the element's edge ids on a weighted input's graph, so the element's own helpers read it", () => {
        const data = multigraph().getDataManager();
        const plain = scopeEdges(createScopedInput(data, "declared"));

        for (const orientation of ["declared", "undirected"] as const) {
            for (const simplify of ["sum", "min", "none"] as const) {
                const input = createScopedInput(
                    data,
                    orientation,
                    { simplify, weight: { attribute: "w", meaning: "distance" } },
                    undefined,
                    edgeAttribute([1, 2, 3, 4, 5]),
                );
                assert.deepStrictEqual(scopeEdges(input), plain, `${orientation} / ${simplify}`);
            }
        }
    });

    it("refuses a weight attribute that nothing carries", () => {
        const data = multigraph().getDataManager();

        assert.strictEqual(
            codeOf(() =>
                createScopedInput(
                    data,
                    "declared",
                    { weight: { attribute: "nothing", meaning: "strength" } },
                    undefined,
                    edgeAttribute([]),
                ),
            ),
            "E_OPTION_RANGE",
        );
    });

    it("weighs a scoped run's subgraph by the attribute, over the scope's edges only", () => {
        const graph = multigraph();
        const run: RunInput = { inputs: new DerivedInputs(), holder: {}, scope: () => graph.scope(["a", "b"]) };
        const input = createScopedInput(
            graph.getDataManager(),
            "declared",
            { weight: { attribute: "w", meaning: "strength" } },
            run,
            edgeAttribute([2, 3, 7, 11, 13]),
        );

        assert.isFalse(input.whole);
        assert.deepStrictEqual(edgesOf(input.subgraph()).sort(), ["a>b:5", "b>a:7"]);
        assert.deepStrictEqual(
            Array.from({ length: input.subgraph().edgeCount }, (_, row) => input.subgraphEdgeIds(row).length).sort(),
            [1, 2],
        );
    });
});

describe("result paths as columns", () => {
    /** A session with one run, `r`, that published an edge field `value` and a node field `rank`. */
    const session = {
        results: {
            get: (run: string) =>
                run === "r"
                    ? {
                          fields: [
                              { name: "value", kind: "edge" },
                              { name: "rank", kind: "node" },
                          ],
                          node: () => ({ rank: 1 }),
                          edge: () => ({ value: 2 }),
                      }
                    : undefined,
        },
        data: { attributes: () => [], node: () => undefined, edge: () => undefined },
    } as unknown as GraphSession;
    const columns = sessionColumns(session, [], {}, "probe");
    const graph = multigraph().snapshot();
    const edgeIdAt = (row: number): never => String(row) as never;

    it("reads a field on the kind of element that carries it", () => {
        assert.deepStrictEqual(columns.read(graph, "results.r.value", "edge", edgeIdAt)?.values, [2, 2, 2, 2, 2]);
        assert.deepStrictEqual(columns.read(graph, "results.r.rank", "node", edgeIdAt)?.values, [1, 1, 1]);
        assert.strictEqual(columns.read(graph, "results.r.rank", undefined, edgeIdAt)?.kind, "node");
    });

    it("refuses a field the run did not publish, or one on the other kind of element", () => {
        for (const on of ["node", "edge", undefined] as const) {
            assert.isNull(columns.read(graph, "results.r.typo", on, edgeIdAt), `typo on ${String(on)}`);
        }
        assert.isNull(columns.read(graph, "results.r.value", "node", edgeIdAt), "an edge field as a partition");
        assert.isNull(columns.read(graph, "results.r.rank", "edge", edgeIdAt), "a node field as a weight");
        assert.isNull(columns.read(graph, "results.missing.value", "edge", edgeIdAt));
    });
});
