/**
 * @file Offered sets and Memberships (design/sets/sets-design.md sections 8.2 and 15.2).
 *
 * A finished run's result OFFERS sets by its shape, never by its algorithm, so every registered
 * algorithm gets them: one per group of a partition, one per level, one per category, one for a
 * node or edge set, one for a path. An offer is a rule over one held item; using it as a scope
 * writes nothing.
 *
 * Counting is split by what it reads. Node counts of an offer read `induced` need only the
 * result's values, one pass over the nodes, cached per execution and snapshot. Everything that
 * needs the edge list -- the edges of every item, and the nodes of an item read `listed`, which
 * include its edges' endpoints -- comes from ONE pass over the edges, cached the same way and run
 * by the first resolution of an offer, never by `offers`.
 *
 * MEMBERSHIPS answer "what holds this element" without resolving what they need not: a cached
 * resolution is tested when there is one, a fixed set of nodes alone is a binary search of them, a
 * rule of element-local leaves is compiled and tested at the one index, and anything else is
 * resolved once through the cache.
 *
 * Node-safe.
 */

import { type GraphSnapshot, INVALID_INDEX, maskTest } from "@graphty/graph-format";

import { compareIds } from "../../catalog/sets/canonical";
import { parseSetDefinition } from "../../catalog/sets/parse";
import type { EdgeId, NodeId, ResultItem, ResultShape, RuleTree, RunId, SetDefinition } from "../../catalog/types";
import { edgeRowOf } from "../../data/edgeIdentity";
import { GraphtyError } from "../../errors/GraphtyError";
import type { RunResult } from "../results/types";
import type { FilterRunResult } from "../visibility/filter";
import { type OfferCounts, resolveSet } from "./cache";
import { itemKeyOf } from "./captures";
import { listedEdgesOf } from "./prepare";
import { type ResolveContext, ruleHalves } from "./resolve";
import { definitionSignature, identityOf } from "./signature";
import type { ElementSet, Memberships, SetOffer } from "./types";

/** Counts the offers tests read. */
export const offerCounters = { nodeScans: 0, edgePasses: 0 };

/** What one shape offers. */
interface OfferedShape {
    /** The per-element field an item is keyed on. */
    readonly field: string;
    readonly reading: "induced" | "listed";
    /** The one value an item is keyed on (`true`), or undefined for one item per value found. */
    readonly only?: true;
    /** Whether a follow-mode rule over the item means the same after a re-run. */
    readonly followable: boolean;
    readonly path: boolean;
    /** Whether Memberships lists the element's item of this shape. */
    readonly partition: boolean;
    /**
     * The item's name, lower case, as Memberships reads it.
     * @param value - The key's value.
     * @returns The name.
     */
    name(value: string | number | boolean): string;
}

/**
 * What each shape offers (design 8.2). Metrics offer nothing (a `threshold` leaf cuts them), and
 * neither does a temporal result or a pair list: a candidate pair is not an existing subgraph.
 */
const OFFERED: Partial<Record<ResultShape, OfferedShape>> = {
    community: {
        field: "group",
        reading: "induced",
        followable: false,
        path: false,
        partition: true,
        name: (value) => `community ${String(value)}`,
    },
    "layered-grouping": {
        field: "level",
        reading: "induced",
        followable: true,
        path: false,
        partition: true,
        name: (value) => `level ${String(value)}`,
    },
    "category-table": {
        field: "category",
        reading: "induced",
        followable: true,
        path: false,
        partition: true,
        name: (value) => String(value),
    },
    "node-set": {
        field: "in",
        reading: "induced",
        only: true,
        followable: true,
        path: false,
        partition: false,
        name: () => "in the set",
    },
    "edge-set": {
        field: "in",
        reading: "listed",
        only: true,
        followable: true,
        path: false,
        partition: false,
        name: () => "in the set",
    },
    path: {
        field: "onPath",
        reading: "listed",
        only: true,
        followable: true,
        path: true,
        partition: false,
        name: () => "on path",
    },
};

/** The default and the most offers one call returns. */
const DEFAULT_LIMIT = 100;

/** One run as offers read it. */
interface OfferRun {
    readonly id: RunId;
    readonly label: string;
    /** Its current result, or undefined before it has one. */
    readonly result: RunResult | undefined;
}

/** What offers and Memberships read from the session. */
interface OfferSources {
    /**
     * A run.
     * @param id - Its id.
     * @returns The run, or undefined when the session holds none.
     */
    run(id: RunId): OfferRun | undefined;
    /** Every run, in the session's order. */
    runs(): readonly OfferRun[];
    /**
     * A run's current result by dense index, with its execution token.
     * @param id - The run.
     * @returns The values, or undefined when it has no result.
     */
    values(id: RunId): FilterRunResult | undefined;
    /** What a resolution reads now: the snapshot, the cache, the readers. */
    context(): ResolveContext;
    /** The kept sets, in listing order. */
    sets(): readonly ElementSet[];
}

/** Offers and Memberships over one session. */
export interface Offering {
    /**
     * The offers of a run's result, largest first.
     * @param run - The run.
     * @param limit - The most to return.
     * @returns The offers and how many were left out.
     * @throws `E_UNKNOWN_RUN` for a run the session does not hold.
     */
    offers(run: RunId, limit?: number): { readonly offers: readonly SetOffer[]; readonly more: number };
    /**
     * Run a run's edge-count pass over the current snapshot unless it is cached. The first
     * resolution of an offer calls this.
     * @param run - The run.
     */
    countEdges(run: RunId): void;
    /**
     * A path offer's node order: the `order` value of a node index.
     * @param run - The run.
     * @returns A reader of the value, or undefined when the run has no result.
     */
    orderOf(run: RunId): ((index: number) => unknown) | undefined;
    /**
     * What holds one element.
     * @param element - The node or edge.
     * @returns The memberships.
     * @throws `E_BAD_COMMAND` for an element the graph does not hold.
     */
    memberships(element: { readonly node: NodeId } | { readonly edge: EdgeId }): Memberships;
}

/**
 * Whether a value is one an item can be keyed on.
 * @param value - Any value.
 * @returns True for a string, a finite number or a boolean.
 */
function isKeyValue(value: unknown): value is string | number | boolean {
    return (
        typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))
    );
}

/**
 * The key values one element's value names: itself, or each entry of an array (an overlapping
 * partition), keeping only `true` for a single-item shape.
 * @param value - The element's value.
 * @param spec - The shape.
 * @returns The key values.
 */
function keyValues(value: unknown, spec: OfferedShape): (string | number | boolean)[] {
    const values = (Array.isArray(value) ? (value as unknown[]) : [value]).filter(isKeyValue);

    return spec.only === undefined ? values : values.filter((entry) => entry === true);
}

/**
 * Whether a result publishes a field per node and per edge.
 * @param values - The result.
 * @param field - The field.
 * @returns The halves it lives on.
 */
function halvesOf(values: FilterRunResult, field: string): { node: boolean; edge: boolean } {
    const kinds = values.fields.filter((descriptor) => descriptor.name === field).map((descriptor) => descriptor.kind);

    return { node: kinds.includes("node"), edge: kinds.includes("edge") };
}

/**
 * The refusal of a run the session does not hold.
 * @param run - The run.
 * @param available - The runs it does hold.
 * @returns The error to throw.
 */
function unknownRun(run: RunId, available: readonly RunId[]): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_RUN",
        message: `There is no run called "${run}" in this session.`,
        source: "data",
        details: { run, available },
    });
}

/**
 * The leaves a Memberships read may test at one element: each reads that element and nothing about
 * the rest of the graph.
 * @param filter - A rule tree.
 * @returns True when every leaf is element-local.
 */
function elementLocal(filter: RuleTree): boolean {
    switch (filter.kind) {
        case "expression":
        case "edges":
        case "range":
        case "categories":
        case "degree":
        case "isolated":
        case "item":
            return true;
        case "threshold":
            return filter.top === undefined;
        case "all":
        case "any":
            return filter.of.every(elementLocal);
        case "not":
            return elementLocal(filter.of);
        default:
            return false;
    }
}

/**
 * Binary search of a canonical (sorted) node list.
 * @param nodes - The sorted ids.
 * @param id - The id sought.
 * @returns True when the list holds it.
 */
function holdsNode(nodes: readonly NodeId[], id: NodeId): boolean {
    let lo = 0;
    let hi = nodes.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const order = compareIds(nodes[mid], id);
        if (order === 0) {
            return true;
        }

        if (order < 0) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    return false;
}

/**
 * Build offers and Memberships over a session.
 * @param sources - What they read.
 * @returns The offering.
 */
export function createOffering(sources: OfferSources): Offering {
    /**
     * A run's counts over the current snapshot: from the cache while its execution, store and
     * serial hold, else one node pass. Entries of runs the session no longer holds are dropped once
     * they outnumber the live runs.
     * @param run - The run.
     * @param spec - Its shape's offers.
     * @param values - Its result by index.
     * @param context - What is resolved against now.
     * @returns The counts.
     */
    const countsOf = (
        run: RunId,
        spec: OfferedShape,
        values: FilterRunResult,
        context: ResolveContext,
    ): OfferCounts => {
        const { cache, snapshot } = context;
        const store = identityOf(context.store ?? snapshot);
        const known = cache?.offers.get(run);
        if (
            known !== undefined &&
            known.execution === values.execution &&
            known.store === store &&
            known.serial === snapshot.serial
        ) {
            return known;
        }

        offerCounters.nodeScans++;
        const nodes = new Map<string, { value: string | number | boolean; count: number }>();
        if (halvesOf(values, spec.field).node) {
            for (let index = 0; index < snapshot.nodeCount; index++) {
                for (const value of keyValues(values.nodeValue(index, spec.field), spec)) {
                    const key = itemKeyOf({ field: spec.field, value });
                    const entry = nodes.get(key);
                    nodes.set(key, { value, count: (entry?.count ?? 0) + 1 });
                }
            }
        }

        if (spec.only !== undefined && nodes.size === 0) {
            nodes.set(itemKeyOf({ field: spec.field, value: true }), { value: true, count: 0 });
        }

        const counts: OfferCounts = { execution: values.execution, store, serial: snapshot.serial, nodes };
        if (cache !== undefined) {
            cache.offers.set(run, counts);
            if (cache.offers.size > 2 * sources.runs().length + 16) {
                for (const id of cache.offers.keys()) {
                    if (sources.run(id) === undefined) {
                        cache.offers.delete(id);
                    }
                }
            }
        }

        return counts;
    };

    /**
     * The one pass over the edges: for each item, its edges, and read `listed` its nodes with its
     * edges' endpoints. An edge read `induced` counts once for every item in the intersection of
     * its endpoints' key values, which is the item leaf's containment rule.
     * @param spec - The shape's offers.
     * @param values - The result by index.
     * @param graph - The snapshot.
     * @returns Item key to counts.
     */
    const edgePass = (
        spec: OfferedShape,
        values: FilterRunResult,
        graph: GraphSnapshot,
    ): Map<string, { edges: number; nodes: number }> => {
        offerCounters.edgePasses++;
        const pass = new Map<string, { edges: number; nodes: number }>();
        const { src, dst } = graph.edgeList();
        const keyOf = (value: string | number | boolean): string => itemKeyOf({ field: spec.field, value });
        const halves = halvesOf(values, spec.field);

        if (spec.reading === "induced") {
            const keys: (string[] | null)[] = [];
            for (let index = 0; index < graph.nodeCount; index++) {
                const found = keyValues(values.nodeValue(index, spec.field), spec).map(keyOf);
                keys.push(found.length === 0 ? null : found);
            }

            for (let edge = 0; edge < graph.edgeCount; edge++) {
                const ends = [keys[src[edge]], keys[dst[edge]]];
                for (const key of ends[0] ?? []) {
                    if (ends[1]?.includes(key) === true) {
                        const entry = pass.get(key) ?? { edges: 0, nodes: 0 };
                        pass.set(key, { ...entry, edges: entry.edges + 1 });
                    }
                }
            }

            return pass;
        }

        // Read `listed`: the node half, plus every member edge's endpoints.
        const members = new Map<string, { edges: number; nodes: Uint8Array }>();
        const memberOf = (key: string): { edges: number; nodes: Uint8Array } => {
            let entry = members.get(key);
            if (entry === undefined) {
                entry = { edges: 0, nodes: new Uint8Array(graph.nodeCount) };
                members.set(key, entry);
            }

            return entry;
        };
        if (halves.node) {
            for (let index = 0; index < graph.nodeCount; index++) {
                for (const value of keyValues(values.nodeValue(index, spec.field), spec)) {
                    memberOf(keyOf(value)).nodes[index] = 1;
                }
            }
        }

        if (halves.edge) {
            for (let edge = 0; edge < graph.edgeCount; edge++) {
                for (const value of keyValues(values.edgeValue(edge, spec.field), spec)) {
                    const entry = memberOf(keyOf(value));
                    entry.edges++;
                    entry.nodes[src[edge]] = 1;
                    entry.nodes[dst[edge]] = 1;
                }
            }
        }

        for (const [key, entry] of members) {
            pass.set(key, { edges: entry.edges, nodes: entry.nodes.reduce((sum, bit) => sum + bit, 0) });
        }

        return pass;
    };

    /**
     * A finished run's shape, values and counts.
     * @param run - The run.
     * @returns Them, or undefined when the run has no result or its shape offers nothing.
     * @throws `E_UNKNOWN_RUN` for a run the session does not hold.
     */
    const offeredBy = (
        run: RunId,
    ):
        | { found: OfferRun; spec: OfferedShape; values: FilterRunResult; counts: OfferCounts; context: ResolveContext }
        | undefined => {
        const found = sources.run(run);
        if (found === undefined) {
            throw unknownRun(
                run,
                sources.runs().map((entry) => entry.id),
            );
        }

        const spec = found.result === undefined ? undefined : OFFERED[found.result.shape];
        const values = sources.values(run);
        if (spec === undefined || values === undefined) {
            return undefined;
        }

        const context = sources.context();

        return { found, spec, values, counts: countsOf(run, spec, values, context), context };
    };

    return {
        offers(run: RunId, limit = DEFAULT_LIMIT): { readonly offers: readonly SetOffer[]; readonly more: number } {
            const offered = offeredBy(run);
            if (offered === undefined) {
                return Object.freeze({ offers: Object.freeze([]), more: 0 });
            }

            const { spec, values, counts } = offered;
            const { reading } = spec;
            const items = [...counts.nodes].sort(([, a], [, b]) => b.count - a.count || compareIds(a.value, b.value));
            const kept = items.slice(0, Math.max(0, Math.floor(limit)));
            const offers = kept.map(([key, { value, count }]): SetOffer => {
                const item: ResultItem = {
                    result: run,
                    key: { field: spec.field, value },
                    ...(values.execution === undefined ? {} : { run: values.execution }),
                };
                const passed = counts.pass?.get(key);
                const nodes = reading === "induced" ? count : passed?.nodes;
                const edges = counts.pass === undefined ? undefined : (passed?.edges ?? 0);
                const name = spec.name(value);
                const title = name.charAt(0).toUpperCase() + name.slice(1);

                return Object.freeze({
                    item,
                    label:
                        nodes === undefined
                            ? title
                            : `${title} (${nodes.toLocaleString("en-US")} ${nodes === 1 ? "node" : "nodes"})`,
                    ...(nodes === undefined ? {} : { nodes }),
                    ...(edges === undefined ? {} : { edges }),
                    reading,
                    path: spec.path,
                    followable: spec.followable,
                    definition: parseSetDefinition({ kind: "rule", where: { kind: "item", item }, reading }),
                });
            });

            return Object.freeze({ offers: Object.freeze(offers), more: items.length - kept.length });
        },

        countEdges(run: RunId): void {
            const offered = offeredBy(run);
            if (offered !== undefined && offered.counts.pass === undefined) {
                offered.counts.pass = edgePass(offered.spec, offered.values, offered.context.snapshot);
            }
        },

        orderOf(run: RunId): ((index: number) => unknown) | undefined {
            const values = sources.values(run);

            return values === undefined ? undefined : (index: number) => values.nodeValue(index, "order");
        },

        memberships(element: { readonly node: NodeId } | { readonly edge: EdgeId }): Memberships {
            const context = sources.context();
            const graph = context.snapshot;
            const isNode = "node" in element;
            const index = isNode ? graph.ids.indexOf(element.node) : edgeRowOf(graph, element.edge);
            if (index === INVALID_INDEX) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `The graph holds no ${isNode ? "node" : "edge"} ${JSON.stringify(isNode ? element.node : element.edge)}.`,
                    source: "data",
                    details: { ...element },
                });
            }

            const sets = sources
                .sets()
                .filter((set) => holds(set, isNode, index, context))
                .map((set) => set.id);

            const items: Memberships["items"][number][] = [];
            for (const run of isNode ? sources.runs() : []) {
                const spec = run.result === undefined ? undefined : OFFERED[run.result.shape];
                const values = sources.values(run.id);
                if (spec?.partition !== true || values === undefined) {
                    continue;
                }

                const of = countsOf(run.id, spec, values, context).nodes.size;
                for (const value of keyValues(values.nodeValue(index, spec.field), spec)) {
                    items.push(
                        Object.freeze({
                            item: {
                                result: run.id,
                                key: { field: spec.field, value },
                                ...(values.execution === undefined ? {} : { run: values.execution }),
                            },
                            label: `${run.label}: ${spec.name(value)} of ${of.toLocaleString("en-US")}`,
                            of,
                        }),
                    );
                }
            }

            return Object.freeze({ sets: Object.freeze(sets), items: Object.freeze(items) });
        },
    };
}

/**
 * Whether a kept set holds one element: a cached resolution when there is one; a fixed set's
 * sorted nodes; a rule of element-local leaves tested at the one index; else resolved once
 * through the cache.
 * @param set - The set.
 * @param isNode - Whether the element is a node.
 * @param index - Its node index or edge row.
 * @param context - What is resolved against.
 * @returns True when the set holds it.
 */
function holds(set: ElementSet, isNode: boolean, index: number, context: ResolveContext): boolean {
    const { cache, snapshot } = context;
    const { definition } = set;
    const signature = cache === undefined ? null : definitionSignature(set.id, definition, context, cache.memo);
    const cached = signature === null ? undefined : cache?.peek(definition, signature);
    if (cached !== undefined) {
        return maskTest(isNode ? cached.nodes : cached.edges, index);
    }

    // A fixed set's node half is its nodes plus its edges' endpoints; with no edges, its nodes.
    if (definition.kind === "fixed" && listedEdgesOf(definition).length === 0) {
        const has = (node: number): boolean => holdsNode(definition.nodes, snapshot.ids.idOf(node));

        return isNode ? has(index) : has(snapshot.edgeSource(index)) && has(snapshot.edgeTarget(index));
    }

    // ponytail: a node's membership of a rule read `listed` needs its incident edges; it is
    // resolved in full instead. A per-node walk of the incident edges when a panel needs it.
    const local =
        definition.kind === "rule" && (typeof definition.where === "string" || elementLocal(definition.where));
    if (local && !(isNode && definition.reading === "listed")) {
        return ruleHolds(definition, isNode, index, context);
    }

    const resolution = resolveSet(set, context);

    return maskTest(isNode ? resolution.nodes : resolution.edges, index);
}

/**
 * A rule of element-local leaves, tested at one element with the reading applied as the root
 * applies it (design 4.3). A rule that cannot compile holds nothing, as its pass would.
 * @param definition - The rule.
 * @param isNode - Whether the element is a node.
 * @param index - Its node index or edge row.
 * @param context - What the tests read.
 * @returns True when the rule holds it.
 */
function ruleHolds(
    definition: Extract<SetDefinition, { kind: "rule" }>,
    isNode: boolean,
    index: number,
    context: ResolveContext,
): boolean {
    let halves: ReturnType<typeof ruleHalves>;
    try {
        halves = ruleHalves(definition, context);
    } catch {
        return false;
    }

    const { reading } = definition;
    const nodeIn = (node: number): boolean => (halves.node === null ? reading !== "listed" : halves.node(node));
    if (isNode) {
        return nodeIn(index);
    }

    const { snapshot } = context;
    const ends = (): boolean => nodeIn(snapshot.edgeSource(index)) && nodeIn(snapshot.edgeTarget(index));
    switch (reading) {
        case "induced":
            return ends();
        case "listed":
            return halves.edge?.(index) ?? false;
        default:
            return (halves.edge === null || halves.edge(index)) && ends();
    }
}
