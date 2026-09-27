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
 */

import fc from "fast-check";
import { assert, describe, it } from "vitest";

import type { Filter, NodeId, Scope } from "../../../src/catalog/types";
import { fcParams } from "../../helpers/fc-params";
import { type Harness, makeSession } from "../helpers";

/** A generated graph. */
interface GraphCase {
    readonly nodeCount: number;
    readonly directed: boolean;
    readonly scores: (number | null)[];
    readonly types: (string | null)[];
    readonly edges: [number, number, number][];
}

const idOf = (i: number): NodeId => `n${i}`;

const GRAPH: fc.Arbitrary<GraphCase> = fc.integer({ min: 1, max: 10 }).chain((nodeCount) =>
    fc.record({
        nodeCount: fc.constant(nodeCount),
        directed: fc.boolean(),
        scores: fc.array(fc.option(fc.integer({ min: 0, max: 5 })), { minLength: nodeCount, maxLength: nodeCount }),
        types: fc.array(fc.option(fc.constantFrom("x", "y")), { minLength: nodeCount, maxLength: nodeCount }),
        edges: fc.array(
            fc.tuple(fc.integer({ min: 0, max: nodeCount - 1 }), fc.integer({ min: 0, max: nodeCount - 1 }), fc.integer({ min: 0, max: 9 })),
            { maxLength: 20 },
        ),
    }),
);

/** Node leaves: each speaks nodes only. */
const NODE_LEAF: fc.Arbitrary<Filter> = fc.oneof(
    fc.integer({ min: 0, max: 5 }).map((k): Filter => ({ kind: "expression", where: `data.score > \`${k}\`` })),
    fc
        .tuple(fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }), fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }))
        .map(([a, b]): Filter => {
            const [min, max] = a !== undefined && b !== undefined && a > b ? [b, a] : [a, b];
            return { kind: "range", attribute: "data.score", ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
        }),
    fc.subarray(["x", "y"]).map((values): Filter => ({ kind: "categories", attribute: "data.type", values })),
    fc.record({ min: fc.integer({ min: 0, max: 4 }), direction: fc.constantFrom<"in" | "out" | "all">("in", "out", "all") }).map((d): Filter => ({ kind: "degree", ...d })),
    fc.constant<Filter>({ kind: "component", id: 0 }),
    fc
        .record({ seeds: fc.array(fc.integer({ min: 0, max: 12 }), { maxLength: 3 }), depth: fc.integer({ min: 0, max: 2 }) })
        .map((n): Filter => ({ kind: "neighborhood", seeds: n.seeds.map(idOf), depth: n.depth })),
);

/** Scope leaves over the forms that exist today, inline definitions included. */
const SCOPE_LEAF: fc.Arbitrary<Filter> = fc
    .oneof(
        fc.constantFrom<Scope>("graph", "largest-component"),
        fc.array(fc.integer({ min: 0, max: 12 }), { maxLength: 4 }).map((ids): Scope => ({ nodes: ids.map(idOf) })),
        fc.integer({ min: 0, max: 5 }).map((k): Scope => ({ where: `data.score >= \`${k}\`` })),
        fc
            .tuple(fc.integer({ min: 0, max: 9 }), fc.constantFrom<"listed" | "clipped">("listed", "clipped"))
            .map(([w, reading]): Scope => ({ define: { kind: "rule", where: { kind: "edges", where: `data.weight > \`${w}\`` }, reading } })),
    )
    .map((scope): Filter => ({ kind: "scope", scope }));

const EDGE_LEAF: fc.Arbitrary<Filter> = fc.integer({ min: 0, max: 9 }).map((w): Filter => ({ kind: "edges", where: `data.weight > \`${w}\`` }));

const LEAF = fc.oneof(NODE_LEAF, EDGE_LEAF, SCOPE_LEAF);

/**
 * A rule tree of at most the given depth.
 * @param depth - Levels of combinators still allowed.
 * @returns The arbitrary.
 */
function tree(depth: number): fc.Arbitrary<Filter> {
    if (depth === 0) {
        return LEAF;
    }

    const inner = tree(depth - 1);

    return fc.oneof(
        { weight: 2, arbitrary: LEAF },
        { weight: 1, arbitrary: fc.array(inner, { maxLength: 3 }).map((of): Filter => ({ kind: "all", of })) },
        { weight: 1, arbitrary: fc.array(inner, { maxLength: 3 }).map((of): Filter => ({ kind: "any", of })) },
        { weight: 1, arbitrary: inner.map((of): Filter => ({ kind: "not", of })) },
    );
}

const TREE = tree(4);

/**
 * The equivalent scope of a node leaf.
 * @param leaf - The leaf.
 * @param where - Whether an expression leaf becomes `{ where }` rather than an inline rule.
 * @returns The scope leaf.
 */
function asScope(leaf: Filter, where: boolean): Filter {
    if (leaf.kind === "expression" && where) {
        return { kind: "scope", scope: { where: leaf.where } };
    }

    return { kind: "scope", scope: { define: { kind: "rule", where: leaf, reading: "induced" } } };
}

/**
 * The tree with node leaves replaced by their equivalent scopes, as the choices say.
 * @param node - The tree.
 * @param choices - One draw per leaf, consumed in order: 0 keeps, 1 replaces, 2 replaces an expression with `{ where }`.
 * @returns The rewritten tree.
 */
function replaced(node: Filter, choices: number[]): Filter {
    switch (node.kind) {
        case "all":
        case "any":
            return { kind: node.kind, of: node.of.map((operand) => replaced(operand, choices)) };
        case "not":
            return { kind: "not", of: replaced(node.of, choices) };
        case "edges":
        case "scope":
            return node;
        default: {
            const choice = choices.shift() ?? 0;
            return choice === 0 ? node : asScope(node, choice === 2);
        }
    }
}

/**
 * A session over the generated graph.
 * @param graph - The case.
 * @returns The harness.
 */
function harnessOf(graph: GraphCase): Harness {
    const harness = makeSession({ directed: graph.directed });
    harness.add(
        Array.from({ length: graph.nodeCount }, (_, i) => ({
            id: idOf(i),
            ...(graph.scores[i] === null ? {} : { score: graph.scores[i] }),
            ...(graph.types[i] === null ? {} : { type: graph.types[i] }),
        })),
        graph.edges.map(([s, t, w]) => ({ src: idOf(s), dst: idOf(t), weight: w })),
    );

    return harness;
}

/**
 * The masks a filter leaves.
 * @param harness - The session.
 * @param filter - The filter.
 * @returns The node and edge bytes, as arrays.
 */
async function masksOf(harness: Harness, filter: Filter): Promise<{ nodes: number[]; edges: number[] }> {
    await harness.session.visibility.set(filter);

    return { nodes: [...harness.session.visibility.nodeMask()], edges: [...harness.session.visibility.edgeMask()] };
}

describe("the visibility filter and a rule read clipped are one evaluator", () => {
    it("filter = T equals filter = { scope: { define: rule T clipped } }", async () => {
        await fc.assert(
            fc.asyncProperty(GRAPH, TREE, async (graph, filter) => {
                const harness = harnessOf(graph);
                const direct = await masksOf(harness, filter);
                const wrapped = await masksOf(harness, {
                    kind: "scope",
                    scope: { define: { kind: "rule", where: filter, reading: "clipped" } },
                });

                assert.deepStrictEqual(wrapped, direct);
            }),
            fcParams(1000),
        );
    });

    it("replacing a node leaf with its equivalent scope inside any, all and not changes no mask", async () => {
        await fc.assert(
            fc.asyncProperty(GRAPH, TREE, fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 40, maxLength: 40 }), async (graph, filter, choices) => {
                const harness = harnessOf(graph);
                const direct = await masksOf(harness, filter);
                const rewritten = await masksOf(harness, replaced(filter, [...choices]));

                assert.deepStrictEqual(rewritten, direct);
            }),
            fcParams(1000),
        );
    });
});
