/**
 * @file The two identities of design/sets/sets-design.md section 4.3, over generated rule trees
 * of depth 4 on generated graphs, for every leaf kind that exists today:
 *
 * 1. `visibility.filter = T` and `visibility.filter = { scope: { define: rule T clipped } }` give
 *    identical masks.
 * 2. Replacing a leaf with an equivalent scope inside `any`, `all` and `not` gives identical masks.
 *    A node leaf L is equivalent to `{ define: rule L induced }` (a scope over an induced set is
 *    silent on edges, exactly like the node leaf), and an expression leaf also to `{ where }`. An
 *    edge leaf has no equivalent scope: every scope speaks its node half.
 *
 * Each generated graph carries three runs, so `item` and `threshold` leaves are generated beside the
 * others: a layered grouping (`lvl`, node `level`), a metric (`met`, node `value`, some nodes
 * unmeasured) and a path (`route`, `onPath` on nodes and edges). An item over `level`, and a
 * threshold over `data.score` or a run's node field, speak nodes only; a threshold over
 * `data.weight` speaks edges only; an `onPath` item speaks both, so it has no equivalent scope.
 */

import fc from "fast-check";
import { assert, describe, it } from "vitest";

import type { NodeId, RuleTree, Scope } from "../../../src/catalog/types";
import { edgeSpaceOf } from "../../../src/session/scope";
import { guardedAsyncProperty } from "../../helpers/caught-errors";
import { fcParams } from "../../helpers/fc-params";
import { type Harness, makeSession } from "../helpers";
import { type Published, publishing } from "./results";

/** A generated graph. */
interface GraphCase {
    readonly nodeCount: number;
    readonly directed: boolean;
    readonly scores: (number | null)[];
    readonly types: (string | null)[];
    readonly edges: [number, number, number][];
    /** Per node: its `level` in the `lvl` run. */
    readonly levels: number[];
    /** Per node: its `value` in the `met` run, or null when the run did not measure it. */
    readonly metric: (number | null)[];
    /** Per node, then cycled over the edges: `onPath` in the `route` run. */
    readonly onPath: boolean[];
}

const idOf = (i: number): NodeId => `n${i}`;

const GRAPH: fc.Arbitrary<GraphCase> = fc.integer({ min: 1, max: 10 }).chain((nodeCount) =>
    fc.record({
        nodeCount: fc.constant(nodeCount),
        directed: fc.boolean(),
        scores: fc.array(fc.option(fc.integer({ min: 0, max: 5 })), { minLength: nodeCount, maxLength: nodeCount }),
        types: fc.array(fc.option(fc.constantFrom("x", "y")), { minLength: nodeCount, maxLength: nodeCount }),
        edges: fc.array(
            fc.tuple(
                fc.integer({ min: 0, max: nodeCount - 1 }),
                fc.integer({ min: 0, max: nodeCount - 1 }),
                fc.integer({ min: 0, max: 9 }),
            ),
            { maxLength: 20 },
        ),
        levels: fc.array(fc.integer({ min: 0, max: 2 }), { minLength: nodeCount, maxLength: nodeCount }),
        metric: fc.array(fc.option(fc.integer({ min: 0, max: 4 })), { minLength: nodeCount, maxLength: nodeCount }),
        onPath: fc.array(fc.boolean(), { minLength: nodeCount, maxLength: nodeCount }),
    }),
);

/** Node leaves: each speaks nodes only. */
const NODE_LEAF: fc.Arbitrary<RuleTree> = fc.oneof(
    fc.integer({ min: 0, max: 5 }).map((k): RuleTree => ({ kind: "expression", where: `data.score > \`${k}\`` })),
    fc
        .tuple(
            fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
            fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
        )
        .map(([a, b]): RuleTree => {
            const [min, max] = a !== undefined && b !== undefined && a > b ? [b, a] : [a, b];
            return {
                kind: "range",
                attribute: "data.score",
                ...(min === undefined ? {} : { min }),
                ...(max === undefined ? {} : { max }),
            };
        }),
    fc.subarray(["x", "y"]).map((values): RuleTree => ({ kind: "categories", attribute: "data.type", values })),
    fc
        .record({
            min: fc.integer({ min: 0, max: 4 }),
            direction: fc.constantFrom<"in" | "out" | "all">("in", "out", "all"),
        })
        .map((d): RuleTree => ({ kind: "degree", ...d })),
    fc.constant<RuleTree>({ kind: "component", id: 0 }),
    fc
        .record({
            seeds: fc.array(fc.integer({ min: 0, max: 12 }), { maxLength: 3 }),
            depth: fc.integer({ min: 0, max: 2 }),
        })
        .map((n): RuleTree => ({ kind: "neighborhood", seeds: n.seeds.map(idOf), depth: n.depth })),
    fc
        .integer({ min: 0, max: 3 })
        .map((level): RuleTree => ({ kind: "item", item: { result: "lvl", key: { field: "level", value: level } } })),
    fc
        .tuple(fc.constantFrom("data.score", "results.met.value"), fc.boolean(), fc.integer({ min: 0, max: 5 }))
        .map(
            ([path, top, n]): RuleTree =>
                top ? { kind: "threshold", path, top: n } : { kind: "threshold", path, above: n - 1 },
        ),
);

/** Scope leaves over the forms that exist today, inline definitions included. */
const SCOPE_LEAF: fc.Arbitrary<RuleTree> = fc
    .oneof(
        fc.constantFrom<Scope>("graph", "largest-component"),
        fc.array(fc.integer({ min: 0, max: 12 }), { maxLength: 4 }).map((ids): Scope => ({ nodes: ids.map(idOf) })),
        fc.integer({ min: 0, max: 5 }).map((k): Scope => ({ where: `data.score >= \`${k}\`` })),
        fc.tuple(fc.integer({ min: 0, max: 9 }), fc.constantFrom<"listed" | "clipped">("listed", "clipped")).map(
            ([w, reading]): Scope => ({
                define: { kind: "rule", where: { kind: "edges", where: `data.weight > \`${w}\`` }, reading },
            }),
        ),
    )
    .map((scope): RuleTree => ({ kind: "member", of: scope }));

const EDGE_LEAF: fc.Arbitrary<RuleTree> = fc.oneof(
    fc.integer({ min: 0, max: 9 }).map((w): RuleTree => ({ kind: "edges", where: `data.weight > \`${w}\`` })),
    fc
        .tuple(fc.boolean(), fc.integer({ min: 0, max: 9 }))
        .map(
            ([top, n]): RuleTree =>
                top
                    ? { kind: "threshold", path: "data.weight", top: n }
                    : { kind: "threshold", path: "data.weight", above: n },
        ),
);

/** Leaves that speak both halves: the path's nodes and edges. */
const BOTH_LEAF: fc.Arbitrary<RuleTree> = fc
    .boolean()
    .map((value): RuleTree => ({ kind: "item", item: { result: "route", key: { field: "onPath", value } } }));

const LEAF = fc.oneof(NODE_LEAF, EDGE_LEAF, SCOPE_LEAF, BOTH_LEAF);

/**
 * A rule tree of at most the given depth.
 * @param depth - Levels of combinators still allowed.
 * @returns The arbitrary.
 */
function tree(depth: number): fc.Arbitrary<RuleTree> {
    if (depth === 0) {
        return LEAF;
    }

    const inner = tree(depth - 1);

    return fc.oneof(
        { weight: 2, arbitrary: LEAF },
        { weight: 1, arbitrary: fc.array(inner, { maxLength: 3 }).map((of): RuleTree => ({ kind: "all", of })) },
        { weight: 1, arbitrary: fc.array(inner, { maxLength: 3 }).map((of): RuleTree => ({ kind: "any", of })) },
        { weight: 1, arbitrary: inner.map((of): RuleTree => ({ kind: "not", of })) },
    );
}

const TREE = tree(4);

/**
 * The equivalent scope of a node leaf.
 * @param leaf - The leaf.
 * @param where - Whether an expression leaf becomes `{ where }` rather than an inline rule.
 * @returns The scope leaf.
 */
function asScope(leaf: RuleTree, where: boolean): RuleTree {
    if (leaf.kind === "expression" && where) {
        return { kind: "member", of: { where: leaf.where } };
    }

    return { kind: "member", of: { define: { kind: "rule", where: leaf, reading: "induced" } } };
}

/**
 * The tree with node leaves replaced by their equivalent scopes, as the choices say.
 * @param node - The tree.
 * @param choices - One draw per leaf, consumed in order: 0 keeps, 1 replaces, 2 replaces an expression with `{ where }`.
 * @returns The rewritten tree.
 */
function replaced(node: RuleTree, choices: number[]): RuleTree {
    switch (node.kind) {
        case "all":
        case "any":
            return { kind: node.kind, of: node.of.map((operand) => replaced(operand, choices)) };
        case "not":
            return { kind: "not", of: replaced(node.of, choices) };
        case "edges":
        case "member":
            return node;
        case "item":
            return node.item.key.field === "onPath" ? node : replaceLeaf(node, choices);
        case "threshold":
            return node.path === "data.weight" ? node : replaceLeaf(node, choices);
        default:
            return replaceLeaf(node, choices);
    }
}

/**
 * A node leaf, kept or replaced by its equivalent scope as the next choice says.
 * @param node - The leaf.
 * @param choices - The draws, consumed in order.
 * @returns The leaf or its scope.
 */
function replaceLeaf(node: RuleTree, choices: number[]): RuleTree {
    const choice = choices.shift() ?? 0;
    return choice === 0 ? node : asScope(node, choice === 2);
}

/**
 * A session over the generated graph, with its three runs finished.
 * @param graph - The case.
 * @returns The harness.
 */
async function harnessOf(graph: GraphCase): Promise<Harness> {
    const table = new Map<string, Published>();
    const harness = makeSession({ directed: graph.directed, runs: { execute: publishing(table) } });
    harness.add(
        Array.from({ length: graph.nodeCount }, (_, i) => ({
            id: idOf(i),
            ...(graph.scores[i] === null ? {} : { score: graph.scores[i] }),
            ...(graph.types[i] === null ? {} : { type: graph.types[i] }),
        })),
        graph.edges.map(([s, t, w]) => ({ src: idOf(s), dst: idOf(t), weight: w })),
    );

    const snapshot = harness.session.data.snapshot();
    const space = edgeSpaceOf(snapshot);
    const nodes = (value: (i: number) => Record<string, unknown> | null): Map<NodeId, Record<string, unknown>> =>
        new Map(
            Array.from({ length: graph.nodeCount }, (_, i) => [idOf(i), value(i)] as const).filter(
                (entry): entry is [NodeId, Record<string, unknown>] => entry[1] !== null,
            ),
        );
    table.set("lvl", { shape: "layered-grouping", nodes: nodes((i) => ({ level: graph.levels[i] })) });
    table.set("met", {
        shape: "node-metric",
        nodes: nodes((i) => (graph.metric[i] === null ? null : { value: graph.metric[i] })),
    });
    table.set("route", {
        shape: "path",
        nodes: nodes((i) => ({ onPath: graph.onPath[i] })),
        edges: new Map(
            Array.from(
                { length: snapshot.edgeCount },
                (_, e) => [space.idOf(e), { onPath: graph.onPath[e % graph.nodeCount] }] as const,
            ),
        ),
    });
    for (const as of table.keys()) {
        await harness.session.runs.start("degree", undefined, { as, scope: "graph", style: false });
    }

    return harness;
}

/**
 * The masks a filter leaves.
 * @param harness - The session.
 * @param filter - The filter.
 * @returns The node and edge bytes, as arrays.
 */
async function masksOf(harness: Harness, filter: RuleTree): Promise<{ nodes: number[]; edges: number[] }> {
    await harness.session.visibility.set(filter);

    return { nodes: [...harness.session.visibility.nodeMask()], edges: [...harness.session.visibility.edgeMask()] };
}

describe("the visibility filter and a rule read clipped are one evaluator", () => {
    it("filter = T equals filter = { scope: { define: rule T clipped } }", async () => {
        await fc.assert(
            guardedAsyncProperty(GRAPH, TREE, async (graph, filter) => {
                const harness = await harnessOf(graph);
                const direct = await masksOf(harness, filter);
                const wrapped = await masksOf(harness, {
                    kind: "member",
                    of: { define: { kind: "rule", where: filter, reading: "clipped" } },
                });

                assert.deepStrictEqual(wrapped, direct);
            }),
            fcParams(1000),
        );
    });

    it("replacing a node leaf with its equivalent scope inside any, all and not changes no mask", async () => {
        await fc.assert(
            guardedAsyncProperty(
                GRAPH,
                TREE,
                fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 40, maxLength: 40 }),
                async (graph, filter, choices) => {
                    const harness = await harnessOf(graph);
                    const direct = await masksOf(harness, filter);
                    const rewritten = await masksOf(harness, replaced(filter, [...choices]));

                    assert.deepStrictEqual(rewritten, direct);
                },
            ),
            fcParams(1000),
        );
    });
});
