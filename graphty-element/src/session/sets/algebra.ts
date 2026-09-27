/**
 * @file Set algebra and the resolve step of the materialising doors (design/sets/sets-design.md
 * sections 4.1, 5.1, 7 and 13.3).
 *
 * `combineMasks` is the edge rule of section 7 over bitmaps: every operand induced gives an
 * induced result, anything else is edge-first. The {@link Materialiser} is the asynchronous half
 * of `createFrom`, `combine` and `createPath`: it resolves its source against the current graph
 * and builds a concrete fixed or path definition with every edge member already in stable form,
 * so the synchronous commit that follows only sorts, interns and freezes.
 *
 * Nothing here mints, names or writes: the doors do that in one tick after this resolves.
 *
 * Node-safe.
 */

import {
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskAnd,
    maskAndNot,
    maskCount,
    maskOr,
    maskToIndices,
    maskXor,
    type U32,
} from "@graphty/graph-format";

import { compareIds } from "../../catalog/sets/canonical";
import type {
    EdgeId,
    EdgeMember,
    EdgeReading,
    NodeId,
    Scope,
    SetCombine,
    SetCreatedFrom,
    SetDefinition,
    SetOperand,
} from "../../catalog/types";
import { edgeCounterOf, edgeIdOf } from "../../data/edgeIdentity";
import { GraphtyError } from "../../errors/GraphtyError";
import type { ElementMask } from "../scope/ElementMask";
import { deriveEdges, type Resolution } from "./resolve";

/** The four combinations, in the order the doors check them. */
export const SET_COMBINES: readonly SetCombine[] = ["union", "intersection", "difference", "symmetric-difference"];

/** One operand of a combination: its two bitmaps, and whether it reads `induced`. */
export interface AlgebraOperand {
    readonly nodes: U32;
    readonly edges: U32;
    readonly induced: boolean;
}

/**
 * Fold bitmaps with one combination. `difference` is the first minus the union of the rest;
 * `symmetric-difference` keeps what an odd number of them hold.
 * @param op - The combination.
 * @param masks - Two or more bitmaps over `length` indices.
 * @param length - The index count.
 * @returns A fresh bitmap.
 */
function fold(op: SetCombine, masks: readonly U32[], length: number): U32 {
    const [first, ...rest] = masks;
    if (op === "difference") {
        return maskAndNot(
            first,
            rest.reduce((acc, mask) => maskOr(acc, mask, length, acc), makeMask(length)),
            length,
        );
    }

    const step = { union: maskOr, intersection: maskAnd, "symmetric-difference": maskXor }[op];

    return rest.reduce((acc, mask) => step(acc, mask, length, acc), first.slice());
}

/**
 * Combine resolved operands by the edge rule of design 7. Every operand induced: the nodes are the
 * op on the node bitmaps and the edges are induced from them. Otherwise edge-first: the edges are
 * the op on the edge bitmaps and the nodes are the op on the node bitmaps plus those edges'
 * endpoints, so every member edge keeps both endpoints.
 * @param op - The combination.
 * @param operands - Two or more operands over one snapshot.
 * @param graph - The snapshot.
 * @returns The combined bitmaps.
 */
export function combineMasks(op: SetCombine, operands: readonly AlgebraOperand[], graph: GraphSnapshot): AlgebraOperand {
    const nodes = fold(
        op,
        operands.map((operand) => operand.nodes),
        graph.nodeCount,
    );
    if (operands.every((operand) => operand.induced)) {
        return { nodes, edges: deriveEdges({ nodes, constraint: null, all: false, missingNodes: 0 }, graph), induced: true };
    }

    const edges = fold(
        op,
        operands.map((operand) => operand.edges),
        graph.edgeCount,
    );
    for (const edge of maskToIndices(edges, graph.edgeCount)) {
        const s = graph.edgeSource(edge);
        const t = graph.edgeTarget(edge);
        nodes[s >>> 5] |= 1 << (s & 31);
        nodes[t >>> 5] |= 1 << (t & 31);
    }

    return { nodes, edges, induced: false };
}

// ---------------------------------------------------------------------------------------------
// The resolve step
// ---------------------------------------------------------------------------------------------

/** A source resolved into what `set.create` records: nothing minted, every edge member stable. */
export interface Concrete {
    /** A fixed or path definition in stable form. */
    readonly definition: SetDefinition;
    /** Each edge member with the session edge it came from, so the door can seed it (design 4.2). */
    readonly refs: readonly (readonly [EdgeId, EdgeMember])[];
    readonly createdFrom: SetCreatedFrom;
}

/** The resolve step of the materialising doors. Injectable, so a test can hold it open. */
export interface Materialiser {
    /**
     * A scope's current members as a fixed definition (design 15.2 `createFrom` defaults).
     * @param source - A canonical scope.
     * @param reading - The caller's reading, or undefined for the default.
     * @returns The concrete definition.
     */
    from(source: Scope, reading: EdgeReading | undefined): Promise<Concrete>;
    /**
     * Two or more scopes combined into a fixed definition (design 7).
     * @param op - The combination.
     * @param of - Canonical scopes.
     * @param reading - The caller's reading, or undefined for the default.
     * @returns The concrete definition.
     */
    combine(op: SetCombine, of: readonly Scope[], reading: EdgeReading | undefined): Promise<Concrete>;
    /**
     * The selected edges ordered into a walk.
     * @param source - `"selection"`.
     * @returns The concrete path definition.
     */
    path(source: "selection"): Promise<Concrete>;
}

/** What the resolve step reads from the session. */
interface MaterialiseSources {
    /** The current snapshot. */
    snapshot(): GraphSnapshot;
    /**
     * A scope's resolution against the current snapshot.
     * @param scope - A canonical scope.
     * @returns The resolution and the snapshot it was resolved against.
     * @throws A `GraphtyError` when the scope cannot be resolved.
     */
    resolve(scope: Scope): { readonly resolution: Resolution; readonly graph: GraphSnapshot };
    /**
     * How a scope reads, following a `{ set }` to its definition.
     * @param scope - A canonical scope.
     * @returns The reading.
     */
    readingOf(scope: Scope): EdgeReading;
    /**
     * A session edge's stable identity.
     * @param id - The session edge id.
     * @returns The member, or undefined when the graph holds no such edge.
     */
    edgeMember(id: EdgeId): EdgeMember | undefined;
    /** The selection's two masks, synced to the current snapshot. Absent refuses `"selection"`. */
    readonly selection?: () => { readonly nodes: ElementMask<NodeId>; readonly edges: ElementMask<EdgeId> };
}

/**
 * What `createdFrom` records for a scope: the reference itself, or `{ inline }` sizes for a member
 * list, so a large operand is never stored twice (design 5.1).
 * @param scope - A canonical scope.
 * @returns The operand.
 */
function operandOf(scope: Scope): SetOperand {
    if (typeof scope === "object" && "nodes" in scope) {
        return { inline: { nodes: scope.nodes.length, edges: 0 } };
    }

    if (typeof scope === "object" && "define" in scope && (scope.define.kind === "fixed" || scope.define.kind === "path")) {
        return { inline: { nodes: scope.define.nodes.length, edges: scope.define.edges?.length ?? 0 } };
    }

    return scope;
}

/**
 * The refusal of an empty source.
 * @param source - What was asked for.
 * @returns The error to throw.
 */
function emptySource(source: Scope): GraphtyError {
    return new GraphtyError({
        code: "E_SCOPE_EMPTY",
        message: "The source holds no nodes and no edges, so there is nothing to keep as a set.",
        source: "data",
        details: { source },
    });
}

/** Why a selection cannot be ordered into one walk. OPEN UNION. */
type AmbiguousPath = "no-edges" | "self-loop" | "branch" | "cycle" | "disconnected" | "off-path-nodes";

const AMBIGUOUS_MESSAGES: Readonly<Record<AmbiguousPath, string>> = {
    "no-edges": "No edges are selected, so there is no walk to order. Select the edges of the path, or a single node.",
    "self-loop": "A selected edge is a loop, which fits no single place in a walk.",
    branch: "A selected node joins three or more selected edges, so the walk could go more than one way.",
    cycle: "The selected edges close a cycle, so the walk has no first node.",
    disconnected: "The selected edges are in more than one piece, so they are not one walk.",
    "off-path-nodes": "Some selected nodes are not on the selected edges, and a path cannot hold them.",
};

/**
 * The refusal of a selection that is not one unambiguous chain.
 * @param why - What makes it ambiguous.
 * @returns The error to throw.
 */
function ambiguousPath(why: AmbiguousPath): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `The selection cannot be ordered into a path: ${AMBIGUOUS_MESSAGES[why]}`,
        source: "data",
        details: { reason: "ambiguous-path", why },
    });
}

/**
 * Build the resolve step over a session.
 * @param sources - What it reads.
 * @returns The resolve step.
 */
export function createMaterialiser(sources: MaterialiseSources): Materialiser {
    /**
     * The selection's masks.
     * @returns The masks.
     * @throws `E_UNSUPPORTED` when the session has no selection.
     */
    const selected = (): { readonly nodes: ElementMask<NodeId>; readonly edges: ElementMask<EdgeId> } => {
        if (sources.selection === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session holds no selection to create a set from.",
                source: "data",
                details: { source: "selection" },
            });
        }

        return sources.selection();
    };

    /**
     * A session edge in stable form, recorded for seeding.
     * @param id - The session edge id.
     * @param refs - Where to record it.
     * @returns The member.
     * @throws An Error when the snapshot the edge was read from no longer holds it; the resolve
     * step reads one snapshot synchronously, so this is a bug.
     */
    const stable = (id: EdgeId, refs: [EdgeId, EdgeMember][]): EdgeMember => {
        const member = sources.edgeMember(id);
        if (member === undefined) {
            throw new Error(`The edge "${id}" was resolved but has no stable identity.`);
        }

        refs.push([id, member]);

        return member;
    };

    /**
     * Bitmaps as a fixed definition. A listed result whose edges are exactly the ones its nodes
     * induce is stored induced when the caller did not choose the reading (design 4.1).
     * @param nodes - The node bitmap.
     * @param edges - The edge bitmap; every edge's endpoints are in `nodes`.
     * @param graph - The snapshot both cover.
     * @param reading - The reading to store.
     * @param defaulted - Whether the caller left the reading to the door.
     * @param createdFrom - What the set is created from.
     * @returns The concrete definition.
     */
    const fixedOf = (
        nodes: U32,
        edges: U32,
        graph: GraphSnapshot,
        reading: "induced" | "listed",
        defaulted: boolean,
        createdFrom: SetCreatedFrom,
    ): Concrete => {
        const nodeIds = Array.from(maskToIndices(nodes, graph.nodeCount), (index) => graph.ids.idOf(index));
        let stored = reading;
        if (stored === "listed" && defaulted) {
            const induced = deriveEdges({ nodes, constraint: null, all: false, missingNodes: 0 }, graph);
            if (maskCount(induced, graph.edgeCount) === maskCount(edges, graph.edgeCount)) {
                stored = "induced";
            }
        }

        if (stored === "induced") {
            return { definition: { kind: "fixed", nodes: nodeIds, reading: "induced" }, refs: [], createdFrom };
        }

        const refs: [EdgeId, EdgeMember][] = [];
        const column = edgeIdsOf(graph);
        const members = Array.from(maskToIndices(edges, graph.edgeCount), (row) => stable(column(row), refs));

        return { definition: { kind: "fixed", nodes: nodeIds, edges: members, reading: "listed" }, refs, createdFrom };
    };

    /**
     * The reading a door stores: the caller's, else the source's; `clipped` freezes to `listed`,
     * which holds the same members (design 4.1).
     * @param given - The caller's reading.
     * @param source - The source's reading.
     * @returns The reading to store, and whether it was the door's choice.
     */
    const storedReading = (given: EdgeReading | undefined, source: EdgeReading): ["induced" | "listed", boolean] => {
        const reading = given ?? source;

        return [reading === "induced" ? "induced" : "listed", given === undefined];
    };

    /**
     * The selection's members, as `createFrom("selection")` keeps them: the selected nodes and the
     * selected edges, read `induced` when any node is selected, else `listed`.
     * @param given - The caller's reading.
     * @returns The concrete definition.
     * @throws `E_SCOPE_EMPTY` when nothing is selected.
     */
    const fromSelection = (given: EdgeReading | undefined): Concrete => {
        const { nodes, edges } = selected();
        const nodeIds = nodes.ids();
        const edgeIds = edges.ids();
        if (nodeIds.length === 0 && edgeIds.length === 0) {
            throw emptySource("selection");
        }

        const reading = given ?? (nodeIds.length > 0 ? "induced" : "listed");
        const refs: [EdgeId, EdgeMember][] = [];
        const members = edgeIds.map((id) => stable(id, refs));

        return {
            definition: {
                kind: "fixed",
                nodes: [...nodeIds],
                ...(members.length === 0 ? {} : { edges: members }),
                reading: reading === "induced" ? "induced" : "listed",
            },
            refs,
            createdFrom: { kind: "selection" },
        };
    };

    return {
        from(source: Scope, given: EdgeReading | undefined): Promise<Concrete> {
            return Promise.resolve().then(() => {
                if (source === "selection") {
                    return fromSelection(given);
                }

                const { resolution, graph } = sources.resolve(source);
                if (resolution.nodeCount === 0 && resolution.edgeCount === 0) {
                    throw emptySource(source);
                }

                const [reading, defaulted] = storedReading(given, sources.readingOf(source));

                return fixedOf(resolution.nodes, resolution.edges, graph, reading, defaulted, { kind: "scope", from: operandOf(source) });
            });
        },

        combine(op: SetCombine, of: readonly Scope[], given: EdgeReading | undefined): Promise<Concrete> {
            return Promise.resolve().then(() => {
                const graph = sources.snapshot();
                const operands = of.map((scope): AlgebraOperand => {
                    const { resolution } = sources.resolve(scope);

                    return { nodes: resolution.nodes, edges: resolution.edges, induced: sources.readingOf(scope) === "induced" };
                });
                const combined = combineMasks(op, operands, graph);
                const [reading, defaulted] = storedReading(given, combined.induced ? "induced" : "listed");

                return fixedOf(combined.nodes, combined.edges, graph, reading, defaulted, {
                    kind: "combine",
                    op,
                    of: of.map(operandOf),
                });
            });
        },

        path(): Promise<Concrete> {
            return Promise.resolve().then(() => {
                const { nodes, edges } = selected();
                const graph = sources.snapshot();
                const order = chainOf(graph, edges.ids(), nodes.ids());
                const refs: [EdgeId, EdgeMember][] = [];
                const steps = order.steps.map((group) => {
                    const members = group.map((id) => stable(id, refs));

                    return members.length === 1 ? members[0] : members;
                });

                return {
                    definition: { kind: "path", nodes: order.nodes, ...(steps.length === 0 ? {} : { edges: steps }) },
                    refs,
                    createdFrom: { kind: "selection" },
                };
            });
        },
    };
}

/**
 * A reader of the session edge id at a row.
 * @param graph - The snapshot.
 * @returns The reader.
 */
function edgeIdsOf(graph: GraphSnapshot): (row: number) => EdgeId {
    const column = graph.edges.byRole("id");

    return (row: number): EdgeId => {
        const counter = column !== null && column.isSet(row) ? column.value(row) : undefined;

        return edgeIdOf(typeof counter === "number" ? counter : INVALID_INDEX);
    };
}

/**
 * Order selected edges into the one walk they form. Parallel and reciprocal edges between one pair
 * form one step's group. The walk starts at the end from which every step can follow a declared
 * edge direction, when exactly one end allows that; otherwise at the end whose id sorts first.
 * @param graph - The snapshot.
 * @param edgeIds - The selected session edge ids.
 * @param nodeIds - The selected node ids.
 * @returns The walk's nodes and each step's session edges.
 * @throws `E_BAD_COMMAND`, `details.reason: "ambiguous-path"` with `details.why`, when the edges
 * are not one open chain or selected nodes lie off it.
 */
function chainOf(
    graph: GraphSnapshot,
    edgeIds: readonly EdgeId[],
    nodeIds: readonly NodeId[],
): { nodes: NodeId[]; steps: EdgeId[][] } {
    if (edgeIds.length === 0) {
        if (nodeIds.length === 1) {
            return { nodes: [nodeIds[0]], steps: [] };
        }

        throw ambiguousPath("no-edges");
    }

    // Each unordered pair of node indices is one logical step.
    const groups = new Map<string, { a: number; b: number; ids: EdgeId[]; rows: number[] }>();
    const neighbours = new Map<number, number[]>();
    for (const id of edgeIds) {
        const row = rowOf(graph, id);
        const s = graph.edgeSource(row);
        const t = graph.edgeTarget(row);
        if (s === t) {
            throw ambiguousPath("self-loop");
        }

        const [a, b] = s < t ? [s, t] : [t, s];
        const key = `${a}:${b}`;
        let group = groups.get(key);
        if (group === undefined) {
            group = { a, b, ids: [], rows: [] };
            groups.set(key, group);
            for (const [from, to] of [
                [a, b],
                [b, a],
            ]) {
                const list = neighbours.get(from) ?? [];
                list.push(to);
                neighbours.set(from, list);
            }
        }

        group.ids.push(id);
        group.rows.push(row);
    }

    if ([...neighbours.values()].some((list) => list.length > 2)) {
        throw ambiguousPath("branch");
    }

    const ends = [...neighbours.entries()].filter(([, list]) => list.length === 1).map(([node]) => node);
    if (ends.length === 0) {
        throw ambiguousPath("cycle");
    }

    if (ends.length > 2) {
        throw ambiguousPath("disconnected");
    }

    const walk = (start: number): number[] => {
        const order = [start];
        let previous = -1;
        let at = start;
        for (;;) {
            const next = (neighbours.get(at) ?? []).find((node) => node !== previous);
            if (next === undefined) {
                return order;
            }

            order.push(next);
            previous = at;
            at = next;
        }
    };

    const forward = walk(ends[0]);
    if (forward.length - 1 !== groups.size) {
        throw ambiguousPath("disconnected");
    }

    const onChain = new Set(forward);
    const map = graph.ids;
    if (nodeIds.some((id) => !onChain.has(map.indexOf(id)) || map.indexOf(id) === INVALID_INDEX)) {
        throw ambiguousPath("off-path-nodes");
    }

    const groupOf = (u: number, v: number): { ids: EdgeId[]; rows: number[] } => {
        const group = groups.get(u < v ? `${u}:${v}` : `${v}:${u}`);
        if (group === undefined) {
            throw new Error("a walk step has no edge group");
        }

        return group;
    };
    const follows = (order: readonly number[]): boolean =>
        order.every((node, i) => i === 0 || groupOf(order[i - 1], node).rows.some((row) => graph.edgeSource(row) === order[i - 1]));

    const backward = [...forward].reverse();
    const directed = [forward, backward].filter(follows);
    const [first] =
        directed.length === 1
            ? directed
            : [forward, backward].sort((x, y) => compareIds(map.idOf(x[0]), map.idOf(y[0])));

    return {
        nodes: first.map((index) => map.idOf(index)),
        steps: first.slice(1).map((node, i) => groupOf(first[i], node).ids),
    };
}

/**
 * The row of a selected session edge.
 * @param graph - The snapshot.
 * @param id - The session edge id.
 * @returns The row.
 * @throws An Error when the snapshot does not hold it; the selection is synced to it, so this is a
 * bug.
 */
function rowOf(graph: GraphSnapshot, id: EdgeId): number {
    const counter = edgeCounterOf(id);
    const row = counter === INVALID_INDEX ? INVALID_INDEX : graph.edgeIndexOf(counter);
    if (row === INVALID_INDEX) {
        throw new Error(`The selected edge "${id}" is not in the snapshot.`);
    }

    return row;
}
