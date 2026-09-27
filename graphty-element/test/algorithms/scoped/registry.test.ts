/**
 * @file Which built-in algorithms compute over their run's scope, proved by running every one
 * (design/sets/sets-design.md section 10.1).
 *
 * The expected table gives each registered algorithm's declaration. It only ever moves from off to
 * on, and the test fails when the class declares something else. Every algorithm then runs over one
 * discriminating fixture:
 *
 * - declared on: its run carries no whole-graph caveat; its in-scope values equal those of the same
 *   algorithm on the scope's graph built by hand; the whole-graph run gives different in-scope
 *   values, so the fixture tells the two apart; and nothing in the run reads the graph around the
 *   input accessor.
 * - declared off: its run says it computed on the whole graph.
 */

import "../../../src/algorithms";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { WHOLE_GRAPH_CAVEAT } from "../../../src/algorithms/input/maskBack";
import { withRunInput } from "../../../src/algorithms/input/ScopedInput";
import type { Graph } from "../../../src/Graph";
import { edgesOf, idsOf, InputGraph } from "../input/harness";
import { assertComputesOverScope, type Build, coveredBy, handBuilt, runScoped, runWhole, valuesOf } from "./harness";

/** Each registered algorithm's `scopeInput`: on computes over the scope, off over the whole graph. */
const EXPECTED: Readonly<Record<string, "on" | "off">> = {
    "graphty:bellman-ford": "off",
    "graphty:betweenness": "on",
    "graphty:bfs": "off",
    "graphty:bipartite-matching": "off",
    "graphty:closeness": "on",
    "graphty:connected-components": "on",
    "graphty:degree": "on",
    "graphty:dfs": "off",
    "graphty:dijkstra": "off",
    "graphty:eigenvector": "off",
    "graphty:floyd-warshall": "off",
    "graphty:girvan-newman": "off",
    "graphty:hits": "on",
    "graphty:k-core": "on",
    "graphty:katz": "on",
    "graphty:kruskal": "off",
    "graphty:label-propagation": "off",
    "graphty:leiden": "off",
    "graphty:link-prediction": "off",
    "graphty:louvain": "off",
    "graphty:max-flow": "off",
    "graphty:min-cut": "off",
    "graphty:pagerank": "on",
    "graphty:prim": "off",
    "graphty:scc": "off",
};

/** Options an algorithm needs on the fixture. */
const OPTIONS: Readonly<Record<string, Record<string, unknown>>> = {
    "graphty:dijkstra": { source: "a", target: "c" },
    "graphty:bfs": { source: "a" },
};

/*
 * The fixture, directed and weighted. The scope is a, b, c, d, e; x and y are outside it, and sit
 * between members in row order so the compact input's renumbering is exercised.
 *
 *     a -5- b -5- c        d -1- e           inside the scope: two pieces
 *     a -1- y -1- c, b -1- y                 a cheaper route, and a triangle, through y
 *     a -1- x -1- e                          x joins the two pieces in the whole graph
 *
 * So the scope cuts a component, the shortest route from a to c runs through a non-member, rank
 * and paths flow through non-members, and a and b sit in a 2-core only with y.
 */
const NODES = ["a", "x", "b", "c", "y", "d", "e"];
const MEMBERS = ["a", "b", "c", "d", "e"];
const EDGES = [
    ["a", "b", 5],
    ["b", "c", 5],
    ["d", "e", 1],
    ["a", "y", 1],
    ["y", "c", 1],
    ["b", "y", 1],
    ["a", "x", 1],
    ["x", "e", 1],
] as const;

/** The fixture graph, recording every read of the graph that goes around the input accessor. */
class Recording extends InputGraph {
    /** Reads around `Algorithm.input`, in order. */
    readonly around: string[] = [];

    /** How deep inside `Algorithm.input` the current call is. */
    inside = 0;

    /**
     * The data manager, whose node and edge maps record every read, and whose snapshot records a
     * read made outside the input accessor.
     * @returns It.
     */
    override getDataManager(): ReturnType<InputGraph["getDataManager"]> {
        const base = super.getDataManager();
        const watch = <T extends object>(name: string, target: T): T =>
            new Proxy(target, {
                get: (object, property) => {
                    this.around.push(`${name}.${String(property)}`);
                    const value: unknown = Reflect.get(object, property, object);
                    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(object) : value;
                },
            });

        return {
            nodes: watch("nodes", base.nodes),
            edges: watch("edges", base.edges),
            getSnapshot: () => {
                if (this.inside === 0) {
                    this.around.push("getSnapshot()");
                }

                return base.getSnapshot();
            },
            undirected: base.undirected,
        };
    }
}

/** The graph the current run reads, for the wrapper of `Algorithm.input`. */
let active: Recording | null = null;

/**
 * A fresh fixture, as the active graph.
 * @returns It.
 */
function fixture(): Recording {
    active = new Recording(NODES, EDGES.map(([s, t, w]) => [s, t, w] as const), true);
    return active;
}

const inputMethod: unknown = Reflect.get(Algorithm.prototype, "input");

beforeAll(() => {
    const original = inputMethod as (this: Algorithm, ...args: unknown[]) => unknown;
    Reflect.set(Algorithm.prototype, "input", function (this: Algorithm, ...args: unknown[]): unknown {
        const graph = active;
        if (graph !== null) {
            graph.inside++;
        }

        try {
            return original.apply(this, args);
        } finally {
            if (graph !== null) {
                graph.inside--;
            }
        }
    });
});

afterAll(() => {
    Reflect.set(Algorithm.prototype, "input", inputMethod);
    active = null;
});

/** Every registered built-in, by key. */
const KEYS = Algorithm.getRegisteredAlgorithms("graphty");

/**
 * How to build one registered algorithm over a graph.
 * @param key - Its key.
 * @returns The builder.
 */
function builderOf(key: string): Build {
    const [namespace, type] = key.split(":");

    return (graph: Graph) => {
        const algorithm = Algorithm.get(graph, namespace, type, OPTIONS[key]);
        assert.isNotNull(algorithm, key);
        return algorithm;
    };
}

/**
 * What a class declares.
 * @param key - Its key.
 * @returns On or off.
 */
function declared(key: string): "on" | "off" {
    const [namespace, type] = key.split(":");
    const cls = Algorithm.getClass(namespace, type) as { scopeInput?: unknown } | null;

    return cls?.scopeInput === "subgraph" ? "on" : "off";
}

describe("the declaration table", () => {
    it("lists every registered built-in, and each declares what the table says", () => {
        assert.sameMembers(KEYS, Object.keys(EXPECTED));
        assert.deepStrictEqual(Object.fromEntries(KEYS.map((key) => [key, declared(key)])), Object.fromEntries(KEYS.map((key) => [key, EXPECTED[key]])));
    });

    it("the hand-built graph holds its nodes and edges in the order inducedSubgraph gives them", () => {
        const graph = fixture();
        const scope = graph.scope(MEMBERS);
        const induced = graph.snapshot().inducedSubgraph({ mask: scope.resolution.nodes }).snapshot;
        const hand = handBuilt(graph, scope).snapshot();

        assert.deepStrictEqual(idsOf(hand), idsOf(induced));
        assert.deepStrictEqual(edgesOf(hand), edgesOf(induced));
    });

    it("a pure relabelling of a partition is judged equal", () => {
        const graph = new InputGraph(["p", "q"], []);
        const result = (labels: number[]): Parameters<typeof valuesOf>[0] =>
            ({
                shape: "community",
                node: (id: string) => ({ group: labels[id === "p" ? 0 : 1] }),
                edge: () => undefined,
            }) as unknown as Parameters<typeof valuesOf>[0];

        assert.deepStrictEqual(valuesOf(result([7, 3]), graph), valuesOf(result([0, 1]), graph));
        assert.notDeepEqual(valuesOf(result([7, 7]), graph), valuesOf(result([0, 1]), graph));
    });
});

/** A declaring test algorithm that reads the graph around its input, to show the recording sees it. */
class Peeker extends Algorithm {
    static namespace = "test";
    static type = "peeker";
    static scopeInput = "subgraph" as const;

    run(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Read the input, then the node map around it.
     * @returns How many nodes each said.
     */
    peek(): [number, number] {
        return [this.input("declared").nodeCount, this.graph.getDataManager().nodes.size];
    }
}

describe("the recording of reads around the input accessor", () => {
    it("sees a read of the node map, and not the input's own read of the snapshot", async () => {
        const graph = fixture();
        const peeker = new Peeker(graph.asGraph());
        const seen = await withRunInput(peeker, graph, () => graph.scope(MEMBERS), undefined, () => Promise.resolve(peeker.peek()));

        assert.deepStrictEqual(seen, [5, 7]);
        assert.deepStrictEqual(graph.around, ["nodes.size"]);
    });
});

const DECLARED_ON = Object.keys(EXPECTED).filter((name) => EXPECTED[name] === "on");

describe.runIf(DECLARED_ON.length > 0)("every algorithm declared on computes over its scope", () => {
    for (const key of DECLARED_ON) {
        it(key, async () => {
            const build = builderOf(key);
            const graph = fixture();
            const scope = graph.scope(MEMBERS);

            const scoped = await assertComputesOverScope(build, graph, scope);
            assert.deepStrictEqual(graph.around, [], "no read of the graph around the input accessor");
            assert.notInclude(scoped?.summary().caveats.notes ?? [], WHOLE_GRAPH_CAVEAT);

            const whole = await runWhole(build, fixture());
            const covered = coveredBy(graph, scope);
            assert.notDeepEqual(
                valuesOf(whole, graph, covered.node, covered.edge),
                valuesOf(scoped, graph, covered.node, covered.edge),
                "the fixture tells a scoped run from a whole-graph one",
            );
        });
    }
});

describe("every algorithm declared off says it computed on the whole graph", () => {
    for (const key of Object.keys(EXPECTED).filter((name) => EXPECTED[name] === "off")) {
        it(key, async () => {
            const graph = fixture();
            const result = await runScoped(builderOf(key), graph, graph.scope(MEMBERS));

            assert.isDefined(result, "the run published a result");
            assert.include(result?.summary().caveats.notes ?? [], WHOLE_GRAPH_CAVEAT);
        });
    }
});
