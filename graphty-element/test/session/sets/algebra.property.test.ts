/**
 * @file The set algebra against a naive model, 1,000 cases each (design/sets/sets-design.md
 * section 7): (a) `combineMasks` equals a plain-`Set` model of the edge rule over operands of mixed
 * readings, flat and nested; (b) each law holds exactly where design 7 claims it; (c) for
 * all-induced or all-listed operands, a combination resolves like the rule over `scope` leaves
 * that writes the same combination live.
 */

import { type GraphSnapshot, makeMask, maskToIndices } from "@graphty/graph-format";
import fc from "fast-check";
import { assert, describe, it } from "vitest";

import type { Filter, Scope, SetCombine } from "../../../src/catalog/types";
import { stableEdgeMember } from "../../../src/data/edgeIdentity";
import { GraphStore } from "../../../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../../../src/data/ingest";
import { type AlgebraOperand, combineMasks } from "../../../src/session/sets/algebra";
import { resolveScope } from "../../../src/session/sets/resolve";
import { fcParams } from "../../helpers/fc-params";

/** A plain-`Set` operand: node and edge indices, and whether it reads induced. */
interface Plain {
    readonly nodes: ReadonlySet<number>;
    readonly edges: ReadonlySet<number>;
    readonly induced: boolean;
}

/** A combination tree: an operand index, or a call over children. */
type Expr = number | { readonly op: SetCombine; readonly of: readonly Expr[] };

interface Case {
    readonly nodeCount: number;
    readonly src: number[];
    readonly dst: number[];
    /** Per operand: chosen nodes, chosen edges, and induced or listed. */
    readonly operands: { nodes: boolean[]; edges: boolean[]; induced: boolean }[];
}

const OPS: readonly SetCombine[] = ["union", "intersection", "difference", "symmetric-difference"];

const CASE: fc.Arbitrary<Case> = fc
    .record({ nodeCount: fc.integer({ min: 1, max: 24 }), edgeCount: fc.integer({ min: 0, max: 48 }), operandCount: fc.integer({ min: 2, max: 5 }) })
    .chain(({ nodeCount, edgeCount, operandCount }) => {
        const node = fc.integer({ min: 0, max: nodeCount - 1 });

        return fc.record({
            nodeCount: fc.constant(nodeCount),
            // Each edge is fresh, parallel to the one before, or its reverse.
            pairs: fc.array(fc.tuple(node, node, fc.constantFrom("fresh", "parallel", "reciprocal")), { minLength: edgeCount, maxLength: edgeCount }),
            operands: fc.array(
                fc.record({
                    nodes: fc.array(fc.boolean(), { minLength: nodeCount, maxLength: nodeCount }),
                    edges: fc.array(fc.boolean(), { minLength: edgeCount, maxLength: edgeCount }),
                    induced: fc.boolean(),
                }),
                { minLength: operandCount, maxLength: operandCount },
            ),
        });
    })
    .map(({ nodeCount, pairs, operands }) => {
        const src: number[] = [];
        const dst: number[] = [];
        for (const [s, d, kind] of pairs) {
            const at = src.length - 1;
            if (kind !== "fresh" && at >= 0) {
                src.push(kind === "parallel" ? src[at] : dst[at]);
                dst.push(kind === "parallel" ? dst[at] : src[at]);
            } else {
                src.push(s);
                dst.push(d);
            }
        }

        return { nodeCount, src, dst, operands };
    });

/** The case's graph through the element's store, so edges carry their identity columns. */
function snapshotOf(c: Case): GraphSnapshot {
    const store = new GraphStore({
        directed: false,
        positionScale: () => 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });
    for (let i = 0; i < c.nodeCount; i++) {
        ingestNode(store, `n${i}`, {});
    }

    for (let e = 0; e < c.src.length; e++) {
        ingestEdge(store, `n${c.src[e]}`, `n${c.dst[e]}`, 1);
    }

    return store.getSnapshot();
}

/** The edges between a node set. */
function inducedEdges(graph: GraphSnapshot, nodes: ReadonlySet<number>): Set<number> {
    const edges = new Set<number>();
    for (let e = 0; e < graph.edgeCount; e++) {
        if (nodes.has(graph.edgeSource(e)) && nodes.has(graph.edgeTarget(e))) {
            edges.add(e);
        }
    }

    return edges;
}

/** A case's operands as the model holds them: an induced operand derives its edges, a listed one adds its edges' endpoints. */
function plainOperands(c: Case, graph: GraphSnapshot): Plain[] {
    return c.operands.map(({ nodes, edges, induced }) => {
        const nodeSet = new Set<number>();
        nodes.forEach((on, i) => on && nodeSet.add(graph.ids.indexOf(`n${i}`)));
        if (induced) {
            return { nodes: nodeSet, edges: inducedEdges(graph, nodeSet), induced };
        }

        const edgeSet = new Set<number>();
        edges.forEach((on, e) => {
            if (on) {
                edgeSet.add(e);
                nodeSet.add(graph.edgeSource(e));
                nodeSet.add(graph.edgeTarget(e));
            }
        });

        return { nodes: nodeSet, edges: edgeSet, induced };
    });
}

/** One set op over plain sets. */
function setOp(op: SetCombine, sets: readonly ReadonlySet<number>[]): Set<number> {
    const [first, ...rest] = sets;
    if (op === "difference") {
        return new Set([...first].filter((x) => !rest.some((set) => set.has(x))));
    }

    const all = new Set(sets.flatMap((set) => [...set]));
    const count = (x: number): number => sets.filter((set) => set.has(x)).length;

    return new Set(
        [...all].filter((x) => {
            switch (op) {
                case "union":
                    return true;
                case "intersection":
                    return count(x) === sets.length;
                default:
                    return count(x) % 2 === 1;
            }
        }),
    );
}

/** The design 7 edge rule, naively. */
function model(op: SetCombine, operands: readonly Plain[], graph: GraphSnapshot): Plain {
    const nodes = setOp(
        op,
        operands.map((o) => o.nodes),
    );
    if (operands.every((o) => o.induced)) {
        return { nodes, edges: inducedEdges(graph, nodes), induced: true };
    }

    const edges = setOp(
        op,
        operands.map((o) => o.edges),
    );
    for (const e of edges) {
        nodes.add(graph.edgeSource(e));
        nodes.add(graph.edgeTarget(e));
    }

    return { nodes, edges, induced: false };
}

/** A plain operand as bitmaps. */
function masksOf(plain: Plain, graph: GraphSnapshot): AlgebraOperand {
    const nodes = makeMask(graph.nodeCount);
    const edges = makeMask(graph.edgeCount);
    for (const i of plain.nodes) {
        nodes[i >>> 5] |= 1 << (i & 31);
    }

    for (const e of plain.edges) {
        edges[e >>> 5] |= 1 << (e & 31);
    }

    return { nodes, edges, induced: plain.induced };
}

/** Bitmaps as plain sets. */
function plainOf(masks: AlgebraOperand, graph: GraphSnapshot): Plain {
    return {
        nodes: new Set(maskToIndices(masks.nodes, graph.nodeCount)),
        edges: new Set(maskToIndices(masks.edges, graph.edgeCount)),
        induced: masks.induced,
    };
}

/** Evaluate a tree both ways. */
function evaluate(expr: Expr, operands: readonly Plain[], graph: GraphSnapshot): { real: AlgebraOperand; naive: Plain } {
    if (typeof expr === "number") {
        return { real: masksOf(operands[expr], graph), naive: operands[expr] };
    }

    const children = expr.of.map((child) => evaluate(child, operands, graph));

    return {
        real: combineMasks(
            expr.op,
            children.map((child) => child.real),
            graph,
        ),
        naive: model(
            expr.op,
            children.map((child) => child.naive),
            graph,
        ),
    };
}

/** Membership equality, as sorted arrays. */
function sameMembers(actual: Plain, expected: Plain, message: string): void {
    assert.deepStrictEqual([...actual.nodes].sort((a, b) => a - b), [...expected.nodes].sort((a, b) => a - b), `${message}: nodes`);
    assert.deepStrictEqual([...actual.edges].sort((a, b) => a - b), [...expected.edges].sort((a, b) => a - b), `${message}: edges`);
}

/** Every member edge's endpoints are member nodes. */
function assertEndpoints(result: Plain, graph: GraphSnapshot): void {
    for (const e of result.edges) {
        assert.isTrue(result.nodes.has(graph.edgeSource(e)) && result.nodes.has(graph.edgeTarget(e)), `edge ${e} keeps its endpoints`);
    }
}

/** A random tree over the case's operands, up to depth 3. */
function exprOf(operandCount: number): fc.Arbitrary<Expr> {
    const leaf = fc.integer({ min: 0, max: operandCount - 1 });
    const { tree } = fc.letrec<{ tree: Expr }>((tie) => ({
        tree: fc.oneof(
            { depthSize: "small", withCrossShrink: true },
            leaf,
            fc.record({ op: fc.constantFrom(...OPS), of: fc.array(tie("tree"), { minLength: 2, maxLength: 3 }) }),
        ),
    }));

    return fc.record({ op: fc.constantFrom(...OPS), of: fc.array(tree, { minLength: 2, maxLength: 3 }) });
}

const WITH_TREE = CASE.chain((c) => fc.tuple(fc.constant(c), exprOf(c.operands.length), fc.constantFrom(...OPS)));

describe("combineMasks against the naive model", () => {
    it("(a) equals the design 7 edge rule, bit for bit, for flat n-ary calls and nested calls over mixed readings", () => {
        fc.assert(
            fc.property(WITH_TREE, ([c, tree, op]) => {
                const graph = snapshotOf(c);
                const operands = plainOperands(c, graph);
                const flat = evaluate({ op, of: operands.map((_, i) => i) }, operands, graph);
                sameMembers(plainOf(flat.real, graph), flat.naive, "flat");
                assert.strictEqual(flat.real.induced, flat.naive.induced);

                const nested = evaluate(tree, operands, graph);
                sameMembers(plainOf(nested.real, graph), nested.naive, "nested");
            }),
            fcParams(1000),
        );
    });

    it("(b) keeps the laws design 7 claims: commutativity, idempotence, intersection associativity, A - A empty, odd counts, endpoints", () => {
        fc.assert(
            fc.property(WITH_TREE, ([c, tree]) => {
                const graph = snapshotOf(c);
                const operands = plainOperands(c, graph);
                const masks = operands.map((o) => masksOf(o, graph));
                const run = (op: SetCombine, of: readonly AlgebraOperand[]): Plain => plainOf(combineMasks(op, of, graph), graph);
                const [a, b, ...rest] = masks;

                for (const op of ["union", "intersection"] as const) {
                    sameMembers(run(op, [a, b, ...rest]), run(op, [...rest, b, a]), `${op} commutes`);
                    sameMembers(run(op, [a, a]), operands[0], `${op} is idempotent`);
                }

                const c3 = rest[0] ?? a;
                const ab = combineMasks("intersection", [a, b], graph);
                const bc = combineMasks("intersection", [b, c3], graph);
                sameMembers(run("intersection", [ab, c3]), run("intersection", [a, bc]), "intersection associates");
                sameMembers(run("intersection", [ab, c3]), run("intersection", [a, b, c3]), "intersection nests like one call");

                const self = run("difference", [a, a]);
                assert.strictEqual(self.nodes.size + self.edges.size, 0, "A - A is empty");

                // n-ary symmetric difference keeps exactly the odd-count elements.
                const odd = run("symmetric-difference", masks);
                const count = (index: number, of: "nodes" | "edges"): number => operands.filter((o) => o[of].has(index)).length;
                if (!operands.every((o) => o.induced)) {
                    for (let e = 0; e < graph.edgeCount; e++) {
                        assert.strictEqual(odd.edges.has(e), count(e, "edges") % 2 === 1, `edge ${e} odd count`);
                    }
                }

                for (let i = 0; i < graph.nodeCount; i++) {
                    if (count(i, "nodes") % 2 === 1) {
                        assert.isTrue(odd.nodes.has(i), `node ${i} odd count`);
                    }
                }

                assertEndpoints(odd, graph);
                assertEndpoints(plainOf(evaluate(tree, operands, graph).real, graph), graph);
            }),
            fcParams(1000),
        );
    });

    it("(b) keeps union associative across nested calls within one regime: all induced, or all edge-first", () => {
        fc.assert(
            fc.property(CASE, fc.boolean(), (c, induced) => {
                const graph = snapshotOf({ ...c, operands: c.operands.map((o) => ({ ...o, induced })) });
                const operands = plainOperands({ ...c, operands: c.operands.map((o) => ({ ...o, induced })) }, graph).map((o) => masksOf(o, graph));
                const [a, b, ...rest] = operands;
                const c3 = rest[0] ?? a;
                const run = (of: readonly AlgebraOperand[]): Plain => plainOf(combineMasks("union", of, graph), graph);
                const left = run([combineMasks("union", [a, b], graph), c3]);
                const right = run([a, combineMasks("union", [b, c3], graph)]);
                sameMembers(left, right, "nested unions agree");
                sameMembers(left, run([a, b, c3]), "and equal one call");
            }),
            fcParams(1000),
        );
    });
});

describe("combine against the live rule over scope leaves", () => {
    it("(c) resolves like the rule that writes the combination live, for all-induced or all-listed operands", () => {
        fc.assert(
            fc.property(CASE, fc.boolean(), fc.constantFrom(...OPS), (c, induced, op) => {
                const graph = snapshotOf(c);
                const operands = plainOperands({ ...c, operands: c.operands.map((o) => ({ ...o, induced })) }, graph);
                // Each operand as an inline set: an induced node list, or listed nodes and edges.
                const scopes: Scope[] = operands.map((o) => ({
                    define: induced
                        ? { kind: "fixed", nodes: [...o.nodes].map((i) => graph.ids.idOf(i)), reading: "induced" }
                        : {
                              kind: "fixed",
                              nodes: [...o.nodes].map((i) => graph.ids.idOf(i)),
                              edges: [...o.edges].map((e) => stableEdgeMember(graph, e)),
                              reading: "listed",
                          },
                }));
                const context = { snapshot: graph };
                const resolved = scopes.map((scope): AlgebraOperand => {
                    const resolution = resolveScope(scope, context);

                    return { nodes: resolution.nodes, edges: resolution.edges, induced };
                });
                const leaves: Filter[] = scopes.map((scope) => ({ kind: "scope", scope }));
                const [first, ...rest] = leaves;
                let where: Filter;
                if (op === "union") {
                    where = { kind: "any", of: leaves };
                } else if (op === "intersection") {
                    where = { kind: "all", of: leaves };
                } else if (op === "difference") {
                    where = { kind: "all", of: [first, { kind: "not", of: { kind: "any", of: rest } }] };
                } else if (leaves.length === 2) {
                    const [x, y] = leaves;
                    where = {
                        kind: "any",
                        of: [
                            { kind: "all", of: [x, { kind: "not", of: y }] },
                            { kind: "all", of: [y, { kind: "not", of: x }] },
                        ],
                    };
                } else {
                    // An n-ary symmetric difference has no one-rule form; (b) pins its odd counts.
                    return;
                }

                const combined = plainOf(combineMasks(op, resolved, graph), graph);
                const live = resolveScope({ define: { kind: "rule", where, reading: induced ? "induced" : "listed" } }, context);
                const livePlain: Plain = {
                    nodes: new Set(maskToIndices(live.nodes, graph.nodeCount)),
                    edges: new Set(maskToIndices(live.edges, graph.edgeCount)),
                    induced,
                };
                sameMembers(combined, livePlain, `${op} over ${induced ? "induced" : "listed"} operands`);
            }),
            fcParams(1000),
        );
    });
});
