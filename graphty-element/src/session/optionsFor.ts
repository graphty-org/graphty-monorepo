/**
 * @file `session.catalog.optionsFor`: one algorithm's or layout's options, with everything that
 * depends on the data filled in for a scope.
 *
 * A static descriptor cannot know the graph. A bound written as a reference -- `{ from:
 * "graph.nodeCount" }` -- becomes the number measured over the scope, and a "node-id" or
 * "node-set" option gets `values`: one choice per node in the scope, so a picker lists real ids.
 * A "partition" option on nodes gets `values` too: one choice per categorical node column that
 * can group the nodes -- a node attribute or a finished run's field -- leaving out the key and
 * label columns and any column with a value per node, which would make a group of each node.
 * Everything else comes back exactly as the descriptor declares it.
 */

import { kCoreDecomposition, weaklyConnectedComponents } from "@graphty/algorithms";
import { type GraphSnapshot, maskToIndices } from "@graphty/graph-format";

import {
    type AlgorithmDescriptor,
    type AlgorithmKey,
    type AttributeDescriptor,
    isOptionBound,
    type LayoutDescriptor,
    type LayoutId,
    OPTION_BOUND_SOURCES,
    type OptionDescriptor,
    type Scope,
} from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import { englishRunLabel } from "./english";
import { fieldMeasurement, type ResultsApi } from "./results/types";
import type { Resolution } from "./sets/resolve";

/** One of the measurements a bound may name. */
type BoundSource = (typeof OPTION_BOUND_SOURCES)[number];

/** What `optionsFor` reads: the two descriptor tables and a resolved scope. */
export interface OptionsForSource {
    algorithms(): readonly AlgorithmDescriptor[];
    layouts(): readonly LayoutDescriptor[];
    /**
     * Resolve a scope, or the session's default scope when none is given.
     * @param scope - The scope, as the caller passed it.
     * @returns The resolution and the snapshot it covers.
     */
    resolve(scope: Scope | undefined): { readonly resolution: Resolution; readonly graph: GraphSnapshot };
    /** The graph's attributes, for a partition's choices; none when absent. */
    attributes?(): readonly AttributeDescriptor[];
    /** The session's results, for a partition's choices; none when absent. */
    results?(): ResultsApi;
}

/**
 * The measurements over a scope, each computed on first use over the subgraph of the scope's own
 * nodes and edges. Direction is ignored: a degree counts every edge at a node, a component is
 * weak, and a core is taken over distinct neighbors with self-loops left out.
 * @param resolution - The scope's node and edge bitmaps.
 * @param graph - The snapshot the bitmaps cover.
 * @returns A reader from a bound name to its number.
 */
function measurer(resolution: Resolution, graph: GraphSnapshot): (source: BoundSource) => number {
    let scoped: GraphSnapshot | undefined;
    const subgraph = (): GraphSnapshot =>
        (scoped ??= graph.filterEdges(resolution.edges).snapshot.inducedSubgraph({ mask: resolution.nodes }).snapshot);

    const measures: Record<BoundSource, () => number> = {
        "graph.nodeCount": () => resolution.nodeCount,
        "graph.edgeCount": () => resolution.edgeCount,
        "graph.maxDegree": () =>
            subgraph()
                .degree()
                .reduce((max, degree) => Math.max(max, degree), 0),
        "graph.maxCore": () => kCoreDecomposition(subgraph().toUndirected().snapshot).maxCore,
        "graph.componentCount": () => weaklyConnectedComponents(subgraph()).count,
    };
    const cache = new Map<BoundSource, number>();

    return (source) => {
        let value = cache.get(source);
        if (value === undefined) {
            value = measures[source]();
            cache.set(source, value);
        }

        return value;
    };
}

/**
 * The name a bound refers to, when it names a measurement this element takes.
 * @param bound - The bound as declared.
 * @returns The measurement's name, or undefined for a literal or an unknown reference.
 */
function boundSource(bound: OptionDescriptor["min"]): BoundSource | undefined {
    const name = isOptionBound(bound) ? bound.from : bound;
    return (OPTION_BOUND_SOURCES as readonly unknown[]).includes(name) ? (name as BoundSource) : undefined;
}

/**
 * The columns that can group the graph's nodes: categorical node attributes that are neither
 * the key nor the label, then each finished run's categorical node fields, leaving out any column
 * with a value per node.
 * @param source - Where the attributes and the results are read.
 * @param graph - The snapshot, whose node count a grouping must stay under.
 * @returns One choice per column: an attribute's name, or a run field's path.
 */
function groupings(source: OptionsForSource, graph: GraphSnapshot): OptionDescriptor["values"] {
    const { nodeCount } = graph;
    const attributes = (source.attributes?.() ?? [])
        .filter(
            (a) =>
                a.kind === "node" &&
                a.measurement === "categorical" &&
                (a.uniqueCount ?? 0) < nodeCount &&
                !(a.roles ?? []).some((role) => role === "key" || role === "label"),
        )
        .map((a) => ({ value: a.name, label: a.plainName }));
    const results = source.results?.();
    const fields = (results?.roots ?? []).flatMap((root) => {
        const result = results?.get(root.runId);
        const grouping = root.fields.filter((field) => {
            if (
                field.kind !== "node" ||
                result === undefined ||
                fieldMeasurement(field, result.shape) !== "categorical"
            ) {
                return false;
            }

            const distinct = new Set<unknown>();
            for (let index = 0; index < nodeCount; index++) {
                const value = result.node(graph.ids.idOf(index))?.[field.name];
                if (value !== undefined && value !== null) {
                    distinct.add(value);
                }
            }

            return distinct.size > 0 && distinct.size < nodeCount;
        });
        return grouping.map((field) => ({
            value: field.path,
            label: grouping.length === 1 ? englishRunLabel(root) : `${englishRunLabel(root)}: ${field.plainName}`,
        }));
    });
    return [...attributes, ...fields];
}

/**
 * One algorithm's or layout's options, resolved for a scope.
 * @param source - The descriptor tables and the scope resolver.
 * @param key - An algorithm key or a layout id. An algorithm is looked for first.
 * @param scope - The scope to measure; the session's default scope when absent.
 * @returns The options, each a fresh object: bound references replaced by numbers, and every
 *   "node-id" and "node-set" option given one choice per node in the scope. A numeric node id
 *   is listed as its decimal string, which is what `OptionChoice.value` holds. A "partition"
 *   option on nodes is given one choice per column that can group the nodes.
 * @throws A `GraphtyError` with `E_UNKNOWN_ALGORITHM` when neither table holds the key.
 */
export function optionsFor(
    source: OptionsForSource,
    key: AlgorithmKey | LayoutId,
    scope: Scope | undefined,
): readonly OptionDescriptor[] {
    const declared =
        source.algorithms().find((descriptor) => descriptor.key === key)?.options ??
        source.layouts().find((descriptor) => descriptor.id === key)?.options;

    if (declared === undefined) {
        throw new GraphtyError({
            code: "E_UNKNOWN_ALGORITHM",
            message: `No algorithm or layout is registered under "${key}".`,
            source: "config",
            details: {
                key,
                algorithms: source.algorithms().map((descriptor) => descriptor.key),
                layouts: source.layouts().map((descriptor) => descriptor.id),
            },
        });
    }

    const { resolution, graph } = source.resolve(scope);
    const measure = measurer(resolution, graph);
    let choices: OptionDescriptor["values"];
    let groups: OptionDescriptor["values"];

    return declared.map((option) => {
        const resolved: OptionDescriptor = { ...option };
        const min = boundSource(option.min);
        const max = boundSource(option.max);
        if (min !== undefined) {
            resolved.min = measure(min);
        }

        if (max !== undefined) {
            resolved.max = measure(max);
        }

        if (option.type === "node-id" || option.type === "node-set") {
            choices ??= Array.from(maskToIndices(resolution.nodes, graph.nodeCount), (index) => {
                const id = String(graph.ids.idOf(index));
                return { value: id, label: id };
            });
            resolved.values = choices;
        }

        // ponytail: node partitions only; an edge partition keeps no choices until one exists.
        if (option.type === "partition" && (option.on ?? "node") === "node") {
            groups ??= groupings(source, graph);
            resolved.values = groups;
        }

        return resolved;
    });
}
