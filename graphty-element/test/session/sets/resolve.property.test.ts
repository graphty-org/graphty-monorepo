/**
 * @file The oracle: on generated graphs with parallel and reciprocal edges, a naive model (plain
 * Sets and loops) and the bitmap resolver agree for every legacy Scope form, for fixed induced,
 * listed and clipped definitions and for paths, and distinct memberships never share a digest
 * (design/sets/sets-design.md sections 4.1, 4.2, 4.4, 6.3, 6.4 and 12.3). Edge members are drawn
 * from every identity rule (file id, ordinal, minted id), bent into near misses, and seeded to
 * their own edge, another one, or one that is gone.
 */

import { type GraphSnapshot, INVALID_INDEX, maskToIndices } from "@graphty/graph-format";
import fc from "fast-check";
import { assert, describe, it } from "vitest";

import { compareIds } from "../../../src/catalog/sets/canonical";
import { parseSetDefinition } from "../../../src/catalog/sets/parse";
import type { EdgeId, EdgeMember, NodeId, Scope, SetDefinition } from "../../../src/catalog/types";
import { pairsOrdered } from "../../../src/data/edgeIdentity";
import { GraphStore } from "../../../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../../../src/data/ingest";
import {
    createScopeApi,
    edgeSpaceOf,
    ElementMask,
    type MaskIdSpace,
    nodeSpaceOf,
} from "../../../src/session/scope/index";
import { resolvePath } from "../../../src/session/sets/path";
import {
    type ComponentLabels,
    digestOf,
    edgeMemberKey,
    type EdgeSeeds,
    type Resolution,
    resolveFixed,
} from "../../../src/session/sets/resolve";
import { fcParams } from "../../helpers/fc-params";
import { stepMembers, verdict } from "./refreeze-model";

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
    .record({
        nodeCount: fc.integer({ min: 1, max: 300 }),
        directed: fc.boolean(),
        edges: fc.integer({ min: 0, max: 600 }),
    })
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
        // Read induced, edge members are inert.
        for (const member of definition.reading === "induced" ? [] : (definition.edges ?? [])) {
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

                const check = (
                    label: string,
                    resolution: Resolution | null,
                    spec: Scope | SetDefinition,
                    digest: string,
                    nodes: ReadonlySet<NodeId>,
                    edges: ReadonlySet<EdgeId>,
                ): void => {
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
                            assert.isTrue(
                                expected.nodes.has(snapshot.edgeSource(e)) &&
                                    expected.nodes.has(snapshot.edgeTarget(e)),
                            );
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
                    const edges =
                        reading === "induced"
                            ? c.fixedEdges.map(([source, target]) => ({ source, target, ordinal: 0, among: 1 }))
                            : [];
                    const definition: SetDefinition = {
                        kind: "fixed",
                        nodes: c.fixedNodes,
                        ...(edges.length === 0 ? {} : { edges }),
                        reading,
                    };
                    const resolution = resolveFixed(definition, { snapshot });
                    const nodes = new Set(
                        Array.from(maskToIndices(resolution.nodes, snapshot.nodeCount), (i) => snapshot.ids.idOf(i)),
                    );
                    const edgeIds = new Set(
                        Array.from(maskToIndices(resolution.edges, snapshot.edgeCount), (e) => edgeSpace.idOf(e)),
                    );
                    // The digest rule is the resolver's; the model checks membership and distinctness.
                    check(`fixed ${reading}`, resolution, definition, digestOf(resolution, snapshot), nodes, edgeIds);
                }
            }),
            fcParams(1000),
        );
    });
});

// ---------------------------------------------------------------------------------------------
// Listed and clipped fixed sets and paths: edge members bound through the binding table.
// ---------------------------------------------------------------------------------------------

/** One generated edge member: which row it is drawn from, how it is bent, and its seed. */
interface MemberSpec {
    readonly row: number;
    readonly bend: "none" | "ordinal" | "reverse" | "other-id" | "missing-node";
    readonly seed: "none" | "right" | "other" | "gone";
    readonly other: number;
}

/** A generated case for the listed readings and paths. */
interface EdgeCase {
    readonly nodeCount: number;
    readonly directed: boolean;
    readonly src: number[];
    readonly dst: number[];
    /** The first `loadCut` edges arrive as one load; the rest are session edges. */
    readonly loadCut: number;
    /** A file id per edge, or null. */
    readonly fileIds: (string | number | null)[];
    readonly fixedNodes: NodeId[];
    readonly members: MemberSpec[];
    readonly reading: "listed" | "clipped";
    readonly walk: number[];
    readonly steps: { kind: "null" | "one" | "group"; picks: MemberSpec[] }[];
    readonly pathDirected: boolean;
}

const MEMBER: fc.Arbitrary<MemberSpec> = fc.record({
    row: fc.nat(),
    bend: fc.constantFrom("none", "none", "ordinal", "reverse", "other-id", "missing-node"),
    seed: fc.constantFrom("none", "none", "right", "other", "gone"),
    other: fc.nat(),
});

const EDGE_CASE: fc.Arbitrary<EdgeCase> = fc
    .record({
        nodeCount: fc.integer({ min: 1, max: 60 }),
        directed: fc.boolean(),
        edges: fc.integer({ min: 0, max: 150 }),
    })
    .chain(({ nodeCount, directed, edges }) => {
        const node = fc.integer({ min: 0, max: nodeCount - 1 });

        return fc.record({
            nodeCount: fc.constant(nodeCount),
            directed: fc.constant(directed),
            pairs: fc.array(
                fc.tuple(fc.tuple(node, node), fc.constantFrom("fresh", "parallel", "parallel", "reciprocal")),
                { maxLength: edges },
            ),
            loadCut: fc.nat({ max: edges }),
            fileIds: fc.array(fc.constantFrom<string | number | null>(null, null, "x", "y", 7, "7"), {
                minLength: edges,
                maxLength: edges,
            }),
            fixedNodes: fc.uniqueArray(fc.oneof(node.map(idOf), fc.constant<NodeId>("gone")), { maxLength: 8 }),
            members: fc.array(MEMBER, { maxLength: 12 }),
            reading: fc.constantFrom<"listed" | "clipped">("listed", "clipped"),
            walk: fc.array(fc.integer({ min: 0, max: nodeCount + 1 }), { minLength: 1, maxLength: 7 }),
            steps: fc.array(
                fc.record({
                    kind: fc.constantFrom<"null" | "one" | "group">("null", "one", "group"),
                    picks: fc.array(MEMBER, { minLength: 1, maxLength: 3 }),
                }),
                { minLength: 6, maxLength: 6 },
            ),
            pathDirected: fc.boolean(),
        });
    })
    .map(({ pairs, ...rest }) => {
        const src: number[] = [];
        const dst: number[] = [];
        for (const [[s, d], kind] of pairs) {
            const at = src.length - 1;
            if (kind !== "fresh" && at >= 0) {
                src.push(kind === "parallel" ? src[at] : dst[at]);
                dst.push(kind === "parallel" ? dst[at] : src[at]);
            } else {
                src.push(s);
                dst.push(d);
            }
        }

        return { ...rest, src, dst, loadCut: Math.min(rest.loadCut, src.length) };
    });

/** The naive identity of every edge: what it was ingested as, computed with plain loops. */
interface NaiveEdge {
    readonly s: NodeId;
    readonly t: NodeId;
    readonly counter: number;
    readonly fileId: string | number | undefined;
    readonly ordinal: number;
    readonly among: number;
}

/**
 * Ingest a case: its first `loadCut` edges as one load, the rest as session edges.
 * @param c - The case.
 * @returns The snapshot and the naive identity table, one entry per row.
 */
function ingestEdgeCase(c: EdgeCase): { snapshot: GraphSnapshot; table: NaiveEdge[] } {
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

    const fileIdOf = (e: number): string | number | undefined => c.fileIds[e] ?? undefined;
    store.openLoad();
    for (let e = 0; e < c.src.length; e++) {
        if (e === c.loadCut) {
            store.closeLoad();
        }

        ingestEdge(store, idOf(c.src[e]), idOf(c.dst[e]), 1, fileIdOf(e));
    }

    store.closeLoad();

    // Ordinals by hand: per pair (unordered unless the store is directed), over the load's edges,
    // in ingest order.
    const pairOf = (e: number): string => {
        const [s, t] = [c.src[e], c.dst[e]];
        return c.directed || s <= t ? `${s}:${t}` : `${t}:${s}`;
    };
    const table: NaiveEdge[] = [];
    for (let e = 0; e < c.src.length; e++) {
        let ordinal = -1;
        let among = -1;
        if (e < c.loadCut) {
            const group = Array.from({ length: c.loadCut }, (_, k) => k).filter((k) => pairOf(k) === pairOf(e));
            ordinal = group.indexOf(e);
            among = group.length;
        }

        table.push({ s: idOf(c.src[e]), t: idOf(c.dst[e]), counter: e, fileId: fileIdOf(e), ordinal, among });
    }

    return { snapshot: store.getSnapshot(), table };
}

/**
 * The stable member a naive edge was ingested as: its file id, else its ordinal, else its minted
 * id; ends in comparator order unless pairs are ordered.
 * @param edge - The naive edge.
 * @param ordered - Whether pairs are ordered.
 * @returns The member.
 */
function naiveMember(edge: NaiveEdge, ordered: boolean): EdgeMember {
    const [source, target] = ordered || compareIds(edge.s, edge.t) <= 0 ? [edge.s, edge.t] : [edge.t, edge.s];
    if (edge.fileId !== undefined) {
        return { source, target, id: edge.fileId };
    }

    return edge.ordinal >= 0
        ? { source, target, ordinal: edge.ordinal, among: edge.among }
        : { source, target, id: `graphty:e${edge.counter}` };
}

/**
 * The naive binding of one member: its seed's edge when that edge is there, else the one edge
 * whose identity it is.
 * @param member - The member.
 * @param seed - Its seeded counter, if any.
 * @param table - The naive identity table.
 * @param ordered - Whether pairs are ordered.
 * @returns The row, or -1 missing, or -2 ambiguous.
 */
function naiveBind(
    member: EdgeMember,
    seed: number | undefined,
    table: readonly NaiveEdge[],
    ordered: boolean,
): number {
    if (seed !== undefined) {
        const at = table.findIndex((edge) => edge.counter === seed);
        if (at >= 0) {
            return at;
        }
    }

    const hits = table
        .map((edge, row) => ({ edge, row }))
        .filter(({ edge }) => {
            const pair = ordered
                ? edge.s === member.source && edge.t === member.target
                : (edge.s === member.source && edge.t === member.target) ||
                  (edge.s === member.target && edge.t === member.source);
            if (!pair) {
                return false;
            }

            if (member.id !== undefined) {
                return (edge.fileId ?? (edge.ordinal < 0 ? `graphty:e${edge.counter}` : undefined)) === member.id;
            }

            return edge.ordinal >= 0 && edge.ordinal === member.ordinal && edge.among === member.among;
        });

    return verdict(hits.map((hit) => hit.row));
}

/**
 * A generated member spec, made concrete against the table, with its seed.
 * @param spec - The spec.
 * @param table - The naive identity table.
 * @param ordered - Whether pairs are ordered.
 * @returns The member and its seed, or null when the graph has no edges to draw from.
 */
function concrete(
    spec: MemberSpec,
    table: readonly NaiveEdge[],
    ordered: boolean,
): { member: EdgeMember; seed?: number } | null {
    if (table.length === 0) {
        return null;
    }

    const edge = table[spec.row % table.length];
    let member = naiveMember(edge, ordered);
    if (spec.bend === "ordinal") {
        member = {
            source: member.source,
            target: member.target,
            ordinal: Math.max(0, edge.ordinal) + 1,
            among: Math.max(1, edge.among) + 1,
        };
    } else if (spec.bend === "reverse") {
        member = { ...member, source: member.target, target: member.source };
    } else if (spec.bend === "other-id") {
        member = { source: member.source, target: member.target, id: ["x", "y", 7, "graphty:e0"][spec.other % 4] };
    } else if (spec.bend === "missing-node") {
        member = { ...member, target: "gone" };
    }

    const seeds = {
        none: undefined,
        right: edge.counter,
        other: table[spec.other % table.length].counter,
        gone: 1_000_000,
    };
    const seed = seeds[spec.seed];

    return seed === undefined ? { member } : { member, seed };
}

/**
 * A generated step as a definition names it: null, one member, or a group.
 * @param step - The step's members, or null.
 * @returns The step.
 */
function stepDefinition(step: readonly { member: EdgeMember }[] | null): EdgeMember | EdgeMember[] | null {
    if (step === null) {
        return null;
    }

    return step.length === 1 ? step[0].member : step.map((entry) => entry.member);
}

/** Seeds as the store files them. */
function seedsOf(entries: readonly { member: EdgeMember; seed?: number }[]): EdgeSeeds {
    const counters = new Map<string, number>();
    for (const { member, seed } of entries) {
        if (seed !== undefined && !counters.has(edgeMemberKey(member))) {
            counters.set(edgeMemberKey(member), seed);
        }
    }

    return { counters, version: 1 };
}

describe("the resolver against a naive model, for edge members and paths", () => {
    it("agrees for listed and clipped fixed sets and for paths", () => {
        fc.assert(
            fc.property(EDGE_CASE, (c) => {
                const { snapshot, table } = ingestEdgeCase(c);
                const ordered = c.directed;
                assert.strictEqual(pairsOrdered(snapshot), ordered);
                const present = (id: NodeId): number => snapshot.ids.indexOf(id);
                const digests = new Map<string, string>();

                const check = (
                    label: string,
                    resolution: Resolution,
                    nodes: Set<number>,
                    edges: Set<number>,
                    missingNodes: number,
                    missingEdges: number,
                    ambiguous: number,
                ): void => {
                    const gotNodes = new Set(maskToIndices(resolution.nodes, snapshot.nodeCount));
                    const gotEdges = new Set(maskToIndices(resolution.edges, snapshot.edgeCount));
                    assert.deepStrictEqual(gotNodes, nodes, `${label} nodes`);
                    assert.deepStrictEqual(gotEdges, edges, `${label} edges`);
                    assert.strictEqual(resolution.missingNodes, missingNodes, `${label} missing nodes`);
                    assert.strictEqual(resolution.missingEdges, missingEdges, `${label} missing edges`);
                    assert.strictEqual(resolution.ambiguousEdges, ambiguous, `${label} ambiguous`);
                    for (const e of gotEdges) {
                        assert.isTrue(
                            gotNodes.has(snapshot.edgeSource(e)) && gotNodes.has(snapshot.edgeTarget(e)),
                            `${label} endpoint invariant`,
                        );
                    }

                    // The digest sums stable identities, so two edges that share one (twins: one
                    // pair, one file id) are one member to it. Memberships are keyed the same way.
                    const key = keyOf(
                        [...nodes].map((i) => snapshot.ids.idOf(i)),
                        [...edges].map((e) => JSON.stringify(naiveMember(table[e], ordered))),
                    );
                    const digest = digestOf(resolution, snapshot);
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

                // A fixed set, listed (or clipped, stored listed).
                const entries = c.members.flatMap((spec) => concrete(spec, table, ordered) ?? []);
                const definition = parseSetDefinition({
                    kind: "fixed",
                    nodes: c.fixedNodes,
                    edges: entries.map((entry) => entry.member),
                    reading: c.reading,
                });
                assert.strictEqual(definition.kind === "fixed" && definition.reading, "listed");
                const fixed = definition as Extract<SetDefinition, { kind: "fixed" }>;
                const seeds = seedsOf(entries);
                const nodes = new Set<number>();
                let missingNodes = 0;
                for (const id of fixed.nodes) {
                    if (present(id) === INVALID_INDEX) {
                        missingNodes++;
                    } else {
                        nodes.add(present(id));
                    }
                }

                const edges = new Set<number>();
                let missingEdges = 0;
                let ambiguous = 0;
                for (const member of fixed.edges ?? []) {
                    // Read listed, an edge member's ends join only with its bound edge.
                    const row = naiveBind(member, seeds.counters.get(edgeMemberKey(member)), table, ordered);
                    if (row >= 0) {
                        edges.add(row);
                        nodes.add(snapshot.edgeSource(row));
                        nodes.add(snapshot.edgeTarget(row));
                    } else {
                        missingEdges++;
                        ambiguous += row === -2 ? 1 : 0;
                    }
                }

                check(
                    "fixed listed",
                    resolveFixed(fixed, { snapshot }, seeds),
                    nodes,
                    edges,
                    missingNodes,
                    missingEdges,
                    ambiguous,
                );

                // A path over the walk.
                const walk = c.walk.map((i) => (i < c.nodeCount ? idOf(i) : `n${c.nodeCount + 5}`));
                const stepEntries = walk.slice(1).map((_, i) => {
                    const step = c.steps[i];
                    if (step.kind === "null") {
                        return null;
                    }

                    const picks = step.picks.flatMap((spec) => concrete(spec, table, ordered) ?? []);
                    if (picks.length === 0) {
                        return null;
                    }

                    // A door refuses a step edge that does not join the step's two nodes.
                    const [from, to] = [walk[i], walk[i + 1]];
                    const joining = picks.filter(
                        ({ member }) =>
                            (member.source === from && member.target === to) ||
                            (member.source === to && member.target === from),
                    );
                    if (joining.length === 0) {
                        return null;
                    }

                    return step.kind === "one" ? [joining[0]] : joining;
                });
                const path = parseSetDefinition({
                    kind: "path",
                    nodes: walk,
                    ...(walk.length > 1 ? { edges: stepEntries.map(stepDefinition) } : {}),
                    directed: c.pathDirected,
                }) as Extract<SetDefinition, { kind: "path" }>;
                const pathSeeds = seedsOf(stepEntries.flatMap((step) => step ?? []));
                const pathNodes = new Set<number>();
                const absent = new Set<NodeId>();
                for (const id of path.nodes) {
                    if (present(id) === INVALID_INDEX) {
                        absent.add(id);
                    } else {
                        pathNodes.add(present(id));
                    }
                }

                const pathEdges = new Set<number>();
                let missingSteps = 0;
                let pathAmbiguous = 0;
                for (let i = 0; i + 1 < path.nodes.length; i++) {
                    const [from, to] = [present(path.nodes[i]), present(path.nodes[i + 1])];
                    const step = path.edges?.[i] ?? null;
                    const rows: number[] = [];
                    if (step === null) {
                        for (let e = 0; e < snapshot.edgeCount && from !== INVALID_INDEX && to !== INVALID_INDEX; e++) {
                            const [s, t] = [snapshot.edgeSource(e), snapshot.edgeTarget(e)];
                            if ((s === from && t === to) || (!path.directed && s === to && t === from)) {
                                rows.push(e);
                            }
                        }
                    } else {
                        for (const member of stepMembers(step)) {
                            const row = naiveBind(
                                member,
                                pathSeeds.counters.get(edgeMemberKey(member)),
                                table,
                                ordered,
                            );
                            pathAmbiguous += row === -2 ? 1 : 0;
                            if (
                                row >= 0 &&
                                (!path.directed ||
                                    (snapshot.edgeSource(row) === from && snapshot.edgeTarget(row) === to))
                            ) {
                                rows.push(row);
                            }
                        }
                    }

                    missingSteps += rows.length === 0 ? 1 : 0;
                    for (const row of rows) {
                        pathEdges.add(row);
                        pathNodes.add(snapshot.edgeSource(row));
                        pathNodes.add(snapshot.edgeTarget(row));
                    }
                }

                check(
                    "path",
                    resolvePath(path, { snapshot }, pathSeeds),
                    pathNodes,
                    pathEdges,
                    absent.size,
                    missingSteps,
                    pathAmbiguous,
                );
            }),
            fcParams(1000),
        );
    });
});
