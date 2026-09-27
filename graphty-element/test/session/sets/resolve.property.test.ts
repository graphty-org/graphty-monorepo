/**
 * @file The oracle: on generated graphs of up to 300 nodes with parallel and reciprocal edges, a
 * naive model (plain Sets and loops) and the bitmap resolver agree for every legacy Scope form and
 * for fixed induced definitions, and distinct memberships never share a digest
 * (design/sets/sets-design.md sections 4.1, 4.2, 6.3 and 6.4).
 */

import { type GraphSnapshot, maskToIndices } from "@graphty/graph-format";
import fc from "fast-check";
import { assert, describe, it } from "vitest";

import type { EdgeId, NodeId, Scope, SetDefinition } from "../../../src/catalog/types";
import { GraphStore } from "../../../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../../../src/data/ingest";
import { createScopeApi, edgeSpaceOf, ElementMask, type MaskIdSpace, nodeSpaceOf } from "../../../src/session/scope/index";
import { type ComponentLabels, digestOf, type Resolution, resolveFixed } from "../../../src/session/sets/resolve";
import { fcParams } from "../../helpers/fc-params";

/** A generated case: the graph, and the membership inputs every scope form reads. */
interface Case {
    readonly nodeCount: number;
    readonly directed: boolean;
    readonly src: number[];
    readonly dst: number[];
    readonly visibleNodes: boolean[];
    readonly visibleEdges: boolean[];
    readonly selected: boolean[];
    readonly listed: NodeId[];
    readonly matched: NodeId[];
    readonly fixedNodes: NodeId[];
    readonly fixedEdges: [NodeId, NodeId][];
}

/** Node ids: a mix of strings and numbers, so `1` and `"1"` can both appear. */
const idOf = (i: number): NodeId => (i % 3 === 0 ? i : `n${i}`);

const CASE: fc.Arbitrary<Case> = fc
    .record({ nodeCount: fc.integer({ min: 1, max: 300 }), directed: fc.boolean(), edges: fc.integer({ min: 0, max: 600 }) })
    .chain(({ nodeCount, directed, edges }) => {
        const node = fc.integer({ min: 0, max: nodeCount - 1 });
        // A missing id or a real one.
        const named = fc.oneof(node.map(idOf), fc.constantFrom<NodeId>("gone", -1, `n${nodeCount + 5}`));
        const pair = fc.tuple(node, node);

        return fc.record({
            nodeCount: fc.constant(nodeCount),
            directed: fc.constant(directed),
            // Each edge is fresh, a copy of an earlier one (parallel) or its reverse (reciprocal).
            pairs: fc.array(fc.tuple(pair, fc.constantFrom("fresh", "parallel", "reciprocal")), { maxLength: edges }),
            visibleNodes: fc.array(fc.boolean(), { minLength: nodeCount, maxLength: nodeCount }),
            visibleEdges: fc.array(fc.boolean(), { minLength: 1200, maxLength: 1200 }),
            selected: fc.array(fc.boolean(), { minLength: nodeCount, maxLength: nodeCount }),
            listed: fc.array(named, { maxLength: 40 }),
            matched: fc.array(node.map(idOf), { maxLength: 40 }),
            fixedNodes: fc.uniqueArray(named, { maxLength: 40 }),
            fixedEdges: fc.array(fc.tuple(node.map(idOf), node.map(idOf)), { maxLength: 5 }),
        });
    })
    .map((raw) => {
        const src: number[] = [];
        const dst: number[] = [];
        for (const [[s, d], kind] of raw.pairs) {
            const at = src.length - 1;
            if (kind !== "fresh" && at >= 0) {
                src.push(kind === "parallel" ? src[at] : dst[at]);
                dst.push(kind === "parallel" ? dst[at] : src[at]);
            } else {
                src.push(s);
                dst.push(d);
            }
        }

        const { pairs: _pairs, ...rest } = raw;

        return { ...rest, src, dst, visibleEdges: raw.visibleEdges.slice(0, src.length) };
    });

/**
 * The case's graph, ingested through the store the element uses, so every edge carries its
 * counter id and its identity hashes.
 */
function snapshotOf(c: Case): GraphSnapshot {
    const store = new GraphStore({
        directed: c.directed,
        positionScale: () => 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });
    for (let i = 0; i < c.nodeCount; i++) {
        ingestNode(store, idOf(i), {});
    }

    for (let e = 0; e < c.src.length; e++) {
        ingestEdge(store, idOf(c.src[e]), idOf(c.dst[e]), 1);
    }

    return store.getSnapshot();
}

/** Weakly connected component labels, numbered by first node index: union-find. */
function naiveComponents(snapshot: GraphSnapshot): ComponentLabels {
    const parent = Array.from({ length: snapshot.nodeCount }, (_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const a = find(snapshot.edgeSource(e));
        const b = find(snapshot.edgeTarget(e));
        parent[Math.max(a, b)] = Math.min(a, b);
    }

    const label = new Map<number, number>();
    const labels = new Int32Array(snapshot.nodeCount);
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const root = find(i);
        if (!label.has(root)) {
            label.set(root, label.size);
        }

        labels[i] = label.get(root) ?? 0;
    }

    return { labels, count: label.size };
}

/** What the naive model says a scope holds: node indices and edge indices. */
interface Model {
    readonly nodes: Set<number>;
    readonly edges: Set<number>;
    readonly missing: number;
}

/** The naive model of one specification. */
function model(scope: Scope | SetDefinition, c: Case, snapshot: GraphSnapshot, labels: ComponentLabels): Model {
    const all = Array.from({ length: snapshot.nodeCount }, (_, i) => i);
    const lookup = (ids: readonly NodeId[]): { found: Set<number>; missing: number } => {
        const found = new Set<number>();
        let missing = 0;
        for (const id of ids) {
            const index = all.find((i) => snapshot.ids.idOf(i) === id);
            if (index === undefined) {
                missing++;
            } else {
                found.add(index);
            }
        }

        return { found, missing };
    };

    let nodes = new Set<number>();
    let missing = 0;
    let edgeAllowed = (_edge: number): boolean => true;
    let induced = true;

    if (scope === "graph") {
        nodes = new Set(all);
    } else if (scope === "visible") {
        nodes = new Set(all.filter((i) => c.visibleNodes[i]));
        edgeAllowed = (edge) => c.visibleEdges[edge];
    } else if (scope === "selection") {
        nodes = new Set(all.filter((i) => c.selected[i]));
    } else if (scope === "largest-component") {
        const sizes = new Map<number, number>();
        for (const i of all) {
            sizes.set(labels.labels[i], (sizes.get(labels.labels[i]) ?? 0) + 1);
        }

        let best = -1;
        for (const [label, size] of [...sizes].sort((x, y) => x[0] - y[0])) {
            if (best === -1 || size > (sizes.get(best) ?? 0)) {
                best = label;
            }
        }

        nodes = new Set(all.filter((i) => labels.labels[i] === best));
    } else if ("where" in scope) {
        nodes = lookup(c.matched).found;
    } else if ("kind" in scope) {
        const definition = scope as Extract<SetDefinition, { kind: "fixed" }>;
        ({ found: nodes, missing } = lookup(definition.nodes));
        for (const member of definition.edges ?? []) {
            for (const end of lookup([member.source, member.target]).found) {
                nodes.add(end);
            }
        }

        induced = definition.reading === "induced";
    } else if ("nodes" in scope) {
        ({ found: nodes, missing } = lookup(scope.nodes));
    }

    const edges = new Set<number>();
    for (let e = 0; induced && e < snapshot.edgeCount; e++) {
        if (nodes.has(snapshot.edgeSource(e)) && nodes.has(snapshot.edgeTarget(e)) && edgeAllowed(e)) {
            edges.add(e);
        }
    }

    return { nodes, edges, missing };
}

/** A byte mask holding the flagged rows. */
function maskOf<TId>(flags: readonly boolean[], length: number, space: () => MaskIdSpace<TId>): ElementMask<TId> {
    const mask = new ElementMask<TId>(space);
    mask.grow(length);
    for (let i = 0; i < length; i++) {
        if (flags[i]) {
            mask.add(i);
        }
    }

    return mask;
}

/** A membership as a comparable key. */
function keyOf(nodes: Iterable<NodeId>, edges: Iterable<EdgeId>): string {
    const sort = (ids: Iterable<NodeId>): string => JSON.stringify([...ids].map((id) => [typeof id, id]).sort());

    return `${sort(nodes)}|${sort(edges)}`;
}

describe("the resolver against a naive model", () => {
    it("agrees for every legacy scope form and fixed induced definitions", () => {
        fc.assert(
            fc.property(CASE, (c) => {
                const snapshot = snapshotOf(c);
                const nodeSpace = nodeSpaceOf(snapshot);
                const edgeSpace = edgeSpaceOf(snapshot);
                const labels = naiveComponents(snapshot);
                const visibleNodes = maskOf(c.visibleNodes, snapshot.nodeCount, () => nodeSpace);
                const visibleEdges = maskOf(c.visibleEdges, snapshot.edgeCount, () => edgeSpace);
                const selected = maskOf(c.selected, snapshot.nodeCount, () => nodeSpace);
                const scope = createScopeApi({
                    snapshot: () => snapshot,
                    visibility: { nodes: () => visibleNodes, edges: () => visibleEdges },
                    selection: { nodes: () => selected },
                    components: () => labels,
                    match: () => c.matched,
                });
                const saved = scope.save("listed", { nodes: c.listed });
                const outer = scope.save("outer", { set: saved });
                const digests = new Map<string, string>();

                const check = (label: string, resolution: Resolution | null, spec: Scope | SetDefinition, digest: string, nodes: ReadonlySet<NodeId>, edges: ReadonlySet<EdgeId>): void => {
                    const expected = model(spec, c, snapshot, labels);
                    const expectedNodes = new Set([...expected.nodes].map((i) => snapshot.ids.idOf(i)));
                    const expectedEdges = new Set([...expected.edges].map((e) => edgeSpace.idOf(e)));
                    assert.deepStrictEqual(nodes, expectedNodes, `${label} nodes`);
                    assert.deepStrictEqual(edges, expectedEdges, `${label} edges`);
                    if (resolution !== null) {
                        assert.strictEqual(resolution.missingNodes, expected.missing, `${label} missing`);
                        assert.strictEqual(resolution.nodeCount, expected.nodes.size);
                        assert.strictEqual(resolution.edgeCount, expected.edges.size);
                        for (const e of maskToIndices(resolution.edges, snapshot.edgeCount)) {
                            assert.isTrue(expected.nodes.has(snapshot.edgeSource(e)) && expected.nodes.has(snapshot.edgeTarget(e)));
                        }
                    }

                    const key = keyOf(nodes, edges);
                    const held = digests.get(key);
                    if (held === undefined) {
                        for (const [other, value] of digests) {
                            assert.notStrictEqual(value, digest, `${label}: ${key} and ${other} share a digest`);
                        }

                        digests.set(key, digest);
                    } else {
                        assert.strictEqual(digest, held, `${label}: one membership, two digests`);
                    }
                };

                const legacy: [string, Scope, Scope][] = [
                    ["graph", "graph", "graph"],
                    ["visible", "visible", "visible"],
                    ["selection", "selection", "selection"],
                    ["largest-component", "largest-component", "largest-component"],
                    ["where", { where: "x" }, { where: "x" }],
                    ["nodes", { nodes: c.listed }, { nodes: c.listed }],
                    ["set", { set: saved }, { nodes: c.listed }],
                    ["set of set", { set: outer }, { nodes: c.listed }],
                ];
                for (const [label, spec, modelled] of legacy) {
                    const resolved = scope.resolveNow(spec);
                    assert.strictEqual(resolved.nodeCount, resolved.nodes.size);
                    check(label, null, modelled, resolved.digest, resolved.nodes, resolved.edges);
                }

                for (const reading of ["induced", "listed"] as const) {
                    const edges = reading === "induced" ? c.fixedEdges.map(([source, target]) => ({ source, target, ordinal: 0, among: 1 })) : [];
                    const definition: SetDefinition = { kind: "fixed", nodes: c.fixedNodes, ...(edges.length === 0 ? {} : { edges }), reading };
                    const resolution = resolveFixed(definition, { snapshot });
                    const nodes = new Set(Array.from(maskToIndices(resolution.nodes, snapshot.nodeCount), (i) => snapshot.ids.idOf(i)));
                    const edgeIds = new Set(Array.from(maskToIndices(resolution.edges, snapshot.edgeCount), (e) => edgeSpace.idOf(e)));
                    // The digest rule is the resolver's; the model checks membership and distinctness.
                    check(`fixed ${reading}`, resolution, definition, digestOf(resolution, snapshot), nodes, edgeIds);
                }
            }),
            fcParams(1000),
        );
    });
});
