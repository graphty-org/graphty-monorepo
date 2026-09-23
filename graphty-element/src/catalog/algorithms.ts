/**
 * @file The built-in algorithm catalogue: one plain-JSON descriptor per algorithm the element
 * actually registers.
 *
 * A descriptor says what an algorithm is called in words a non-expert reads, what it computes,
 * what its result publishes, what it costs and what it can be configured with -- all as data, so
 * a consumer can build an options form, a metrics panel or a cost gate without importing a
 * single class from this package.
 *
 * Three rules this table keeps:
 *
 * - **Options are never hand-written.** Every option descriptor comes out of `optionsFromZod`
 *   reading the algorithm class's own Zod schema, so the form a consumer renders and the
 *   validation the element runs can never drift apart. The only options authored here are the
 *   two 2.0 parameters that no 1.10 class has a schema for -- the shortest-path engine and the
 *   component strength -- and they are authored as Zod schemas and emitted through the same
 *   walk, not typed out as descriptors.
 * - **Nothing in the table is a function or a class.** `AlgorithmDescriptor.cost` is optional
 *   and is deliberately left unset on every entry: the catalogue has to survive
 *   `JSON.stringify`, a `postMessage` to a worker and a write to a saved document, and a
 *   closure survives none of those. A cost estimate that needs code belongs to
 *   `session.estimate()`, which runs where the code is.
 * - **The table only lists what ships.** Four members of `KNOWN_ALGORITHMS` -- `all-paths`,
 *   `clustering-coefficient`, `k-core` and `link-prediction` -- are not registered by this
 *   package and therefore have no descriptor here. A catalogue that advertised them would be
 *   lying about what the element can run.
 *
 * Two conventions worth stating once:
 *
 * **The `$` in a field path.** A field's path is `results.$.<field>`, where `$` stands for the
 * run id that a static descriptor cannot know. `session.results.path(run, field)` returns the
 * same path with a real run id in place of the `$`.
 *
 * **A field list is a union, not a promise.** Where a parameter changes what a run publishes --
 * the shortest-path engine is the only case in this table -- the descriptor declares every
 * field any run of that algorithm can produce. `RunResult.fields` is the per-run truth and
 * lists only the fields that run actually filled. A parameter may vary the FIELDS a key
 * publishes; it may never vary the SHAPE, because a run fixes its shape from this table once and
 * a consumer reading the table up front would otherwise be wrong about what it gets back. That
 * is why the all-pairs sweep has its own key rather than a switch on shortest-path.
 */

import { z } from "zod/v4";

import { BellmanFordAlgorithm } from "../algorithms/BellmanFordAlgorithm";
import { BetweennessCentralityAlgorithm } from "../algorithms/BetweennessCentralityAlgorithm";
import { BFSAlgorithm } from "../algorithms/BFSAlgorithm";
import { BipartiteMatchingAlgorithm } from "../algorithms/BipartiteMatchingAlgorithm";
import { ClosenessCentralityAlgorithm } from "../algorithms/ClosenessCentralityAlgorithm";
import { ConnectedComponentsAlgorithm } from "../algorithms/ConnectedComponentsAlgorithm";
import { DegreeAlgorithm } from "../algorithms/DegreeAlgorithm";
import { DFSAlgorithm } from "../algorithms/DFSAlgorithm";
import { DijkstraAlgorithm } from "../algorithms/DijkstraAlgorithm";
import { EigenvectorCentralityAlgorithm } from "../algorithms/EigenvectorCentralityAlgorithm";
import { FloydWarshallAlgorithm } from "../algorithms/FloydWarshallAlgorithm";
import { GirvanNewmanAlgorithm } from "../algorithms/GirvanNewmanAlgorithm";
import { HITSAlgorithm } from "../algorithms/HITSAlgorithm";
import { KatzCentralityAlgorithm } from "../algorithms/KatzCentralityAlgorithm";
import { KruskalAlgorithm } from "../algorithms/KruskalAlgorithm";
import { LabelPropagationAlgorithm } from "../algorithms/LabelPropagationAlgorithm";
import { LeidenAlgorithm } from "../algorithms/LeidenAlgorithm";
import { LouvainAlgorithm } from "../algorithms/LouvainAlgorithm";
import { MaxFlowAlgorithm } from "../algorithms/MaxFlowAlgorithm";
import { MinCutAlgorithm } from "../algorithms/MinCutAlgorithm";
import { PageRankAlgorithm } from "../algorithms/PageRankAlgorithm";
import { PrimAlgorithm } from "../algorithms/PrimAlgorithm";
import { StronglyConnectedComponentsAlgorithm } from "../algorithms/StronglyConnectedComponentsAlgorithm";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config/OptionsSchema";
import { optionsFromZod } from "./optionsFromZod";
import type { AlgorithmDescriptor, FieldDescriptor, KnownAlgorithm, OptionDescriptor } from "./types";

// ---------------------------------------------------------------------------------------------
// The descriptor, plus the 1.10 keys it replaces
// ---------------------------------------------------------------------------------------------

/**
 * One 1.10 registry key a 2.0 descriptor replaces, with the parameters that reproduce what that
 * key used to do.
 *
 * The parameters are what makes this a migration source of truth rather than a rename list:
 * `scc` does not become `components`, it becomes `components` run with `{ strength: "strong" }`,
 * and a compatibility shim that forgets the second half silently computes the wrong answer.
 */
export interface LegacyAlgorithmKey {
    /** The `static type` the class carried in 1.10, without the "graphty:" namespace. */
    readonly key: string;
    /** The 2.0 parameters that reproduce the 1.10 behaviour. Absent when only the key changed. */
    readonly params?: Readonly<Record<string, unknown>>;
}

/**
 * A built-in algorithm descriptor: the published descriptor, plus the 1.10 keys that folded
 * into it.
 *
 * `key` is narrowed to {@link KnownAlgorithm} rather than left as the open `AlgorithmKey`, so a
 * built-in whose key is not in the published list fails to compile here instead of appearing in
 * a catalogue nothing else knows about.
 */
export interface BuiltInAlgorithmDescriptor extends AlgorithmDescriptor {
    readonly key: KnownAlgorithm;
    /** Every 1.10 key this descriptor replaces. One entry for all but the two folded keys. */
    readonly legacyKeys: readonly LegacyAlgorithmKey[];
}

// ---------------------------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------------------------

/** The root a static field path is written against; `$` stands for the run id. */
const RESULT_PATH_ROOT = "results.$";

/**
 * Add the published path to a field, so no descriptor spells the path out by hand.
 * @param spec - Everything about the field except its path.
 * @returns The field with its path filled in.
 */
function field(spec: Omit<FieldDescriptor, "path">): FieldDescriptor {
    return { ...spec, path: `${RESULT_PATH_ROOT}.${spec.name}` };
}

/** What a metric shape's primary value is called. */
interface MetricValue {
    plainName: string;
    technicalName: string;
    /** The value's type. Defaults to "number". */
    type?: "number" | "integer";
    /**
     * What the number counts, when it counts something.
     *
     * Omitted is a real answer rather than a gap: most centrality scores are dimensionless, and
     * naming a unit for one would be inventing a measurement.
     */
    unit?: string;
}

/**
 * Build the fields every node-metric and edge-metric result publishes.
 *
 * The per-element trio and the graph-level statistics are fixed by the shape, which is what lets
 * a consumer read `results.<run>.value` for any metric without opening the catalogue.
 * @param kind - Whether the metric is measured per node or per edge.
 * @param value - What this metric's primary value is called.
 * @returns The uniform field list for a metric shape.
 */
function metricFields(kind: "node" | "edge", value: MetricValue): readonly FieldDescriptor[] {
    return [
        field({
            name: "value",
            plainName: value.plainName,
            technicalName: value.technicalName,
            kind,
            type: value.type ?? "number",
            ...(value.unit === undefined ? {} : { unit: value.unit }),
        }),
        field({ name: "rank", plainName: "Rank", technicalName: "rank", kind, type: "integer" }),
        field({ name: "percentile", plainName: "Percentile", technicalName: "percentile", kind, type: "number" }),
        field({ name: "min", plainName: "Lowest", technicalName: "min", kind: "graph", type: "number" }),
        field({ name: "max", plainName: "Highest", technicalName: "max", kind: "graph", type: "number" }),
        field({ name: "median", plainName: "Middle", technicalName: "median", kind: "graph", type: "number" }),
        field({ name: "mean", plainName: "Average", technicalName: "mean", kind: "graph", type: "number" }),
        field({ name: "measured", plainName: "Measured", technicalName: "measured", kind: "graph", type: "integer" }),
        field({
            name: "normalization",
            plainName: "Normalization",
            technicalName: "normalization",
            kind: "graph",
            type: "string",
        }),
        field({
            name: "tiedAtMin",
            plainName: "Tied at the lowest value",
            technicalName: "tiedAtMin",
            kind: "graph",
            type: "integer",
        }),
    ];
}

/**
 * Build the fields every community result publishes.
 * @param plainName - What one group is called in plain words, such as "Community" or "Piece".
 * @param withModularity - Whether the algorithm scores its partition with modularity.
 * @returns The uniform field list for the community shape.
 */
function communityFields(plainName: string, withModularity: boolean): readonly FieldDescriptor[] {
    const fields: FieldDescriptor[] = [
        field({ name: "group", plainName, technicalName: "group", kind: "node", type: "integer" }),
        field({
            name: "groupSize",
            plainName: `${plainName} size`,
            technicalName: "groupSize",
            kind: "node",
            type: "integer",
        }),
        field({
            name: "groupCount",
            plainName: `${plainName} count`,
            technicalName: "groupCount",
            kind: "graph",
            type: "integer",
        }),
        field({
            name: "sizes",
            plainName: `${plainName} sizes`,
            technicalName: "sizes",
            kind: "graph",
            type: "table",
        }),
    ];

    if (withModularity) {
        fields.push(
            field({
                name: "modularity",
                plainName: "Community strength",
                technicalName: "modularity",
                kind: "graph",
                type: "number",
            }),
        );
    }

    return fields;
}

/**
 * Build the fields every node-set or edge-set result publishes, with the one headline number
 * the shape asks each algorithm to add.
 * @param kind - Whether the set is a set of nodes or a set of edges.
 * @param plainName - What membership is called in plain words, such as "In the network".
 * @param headline - The one graph-level scalar this result is read for.
 * @returns The uniform field list for a set shape.
 */
function setFields(
    kind: "node" | "edge",
    plainName: string,
    headline: Omit<FieldDescriptor, "path" | "kind">,
): readonly FieldDescriptor[] {
    return [
        field({ name: "in", plainName, technicalName: "in", kind, type: "boolean" }),
        field({ name: "count", plainName: "Count", technicalName: "count", kind: "graph", type: "integer" }),
        field({ ...headline, kind: "graph" }),
    ];
}

// ---------------------------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------------------------

/** What this table needs from an algorithm class: the Zod option schema it declares. */
interface AlgorithmOptionsSource {
    getZodOptionsSchema(): ZodOptionsSchema;
}

/**
 * Read one algorithm class's own options as plain JSON.
 *
 * The class's Zod schema is the single source of truth for every option it already has; this
 * table adds names and costs, never option definitions.
 * @param algorithm - The registered algorithm class to read.
 * @returns The class's option descriptors, in declaration order.
 */
function optionsOf(algorithm: AlgorithmOptionsSource): readonly OptionDescriptor[] {
    return optionsFromZod(algorithm.getZodOptionsSchema());
}

/**
 * Join several option lists into one, keeping the first descriptor for a repeated name.
 *
 * Two classes that folded into one key usually share an option -- `source` and `target` are on
 * both shortest-path engines -- and the merged key offers it once.
 * @param lists - The option lists to join, in the order they should appear.
 * @returns One list with no repeated option name.
 */
function mergeOptions(...lists: readonly (readonly OptionDescriptor[])[]): readonly OptionDescriptor[] {
    const merged: OptionDescriptor[] = [];
    const seen = new Set<string>();

    for (const list of lists) {
        for (const option of list) {
            if (seen.has(option.name)) {
                continue;
            }

            seen.add(option.name);
            merged.push(option);
        }
    }

    return merged;
}

/**
 * The parameter that replaces the two single-source 1.10 shortest-path keys.
 *
 * The third 1.10 key, floyd-warshall, is NOT an engine choice here: it answers a different
 * question and publishes a different result shape, so it has its own catalogue key.
 *
 * It is authored as a Zod schema rather than as a descriptor so it goes through the same emitter
 * as every other option, and so the session has a schema to validate a caller's params against
 * once the folded algorithm is implemented.
 */
const shortestPathEngineOptions = defineOptions({
    method: {
        schema: z.enum(["dijkstra", "bellman-ford"]).nullable().default(null),
        meta: {
            label: "Method",
            description:
                "Which engine computes the paths. Left unset, the element uses Dijkstra when every weight is zero or above and Bellman-Ford when any weight is negative.",
            advanced: true,
            group: "engine",
        },
    },
});

/** The parameter that replaces the two 1.10 component keys. */
const componentStrengthOptions = defineOptions({
    strength: {
        schema: z.enum(["weak", "strong"]).default("weak"),
        meta: {
            label: "Strength",
            description:
                "Weak follows an edge in either direction. Strong needs a directed path each way, and only differs from weak on a directed graph.",
        },
    },
});

// ---------------------------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------------------------

/**
 * Every algorithm this package registers, as a plain-JSON descriptor.
 *
 * Twenty-one descriptors for twenty-three registered algorithms: the two single-source
 * shortest-path engines are one key with a `method` parameter, and the two component algorithms
 * are one key with a `strength` parameter. Each descriptor's `legacyKeys` names the 1.10 keys it
 * replaces and the parameters that reproduce them.
 */
export const BUILT_IN_ALGORITHMS: readonly BuiltInAlgorithmDescriptor[] = [
    {
        key: "degree",
        plainName: "Connections",
        technicalName: "Degree centrality",
        description: "Counts how many edges each node has, incoming, outgoing and in total.",
        category: "centrality",
        shape: "node-metric",
        fields: [
            ...metricFields("node", { plainName: "Connections", technicalName: "degree", type: "integer", unit: "links" }),
            field({
                name: "inDegree",
                plainName: "Incoming connections",
                technicalName: "inDegree",
                kind: "node",
                type: "integer",
            }),
            field({
                name: "outDegree",
                plainName: "Outgoing connections",
                technicalName: "outDegree",
                kind: "node",
                type: "integer",
            }),
        ],
        options: optionsOf(DegreeAlgorithm),
        costClass: "instant",
        complexity: "O(n + m)",
        legacyKeys: [{ key: "degree" }],
    },
    {
        key: "betweenness",
        plainName: "Bridges",
        technicalName: "Betweenness centrality",
        description:
            "Scores a node by how many of the shortest paths between other nodes run through it, which is what finds the bridges.",
        category: "centrality",
        shape: "node-metric",
        fields: metricFields("node", { plainName: "Bridging", technicalName: "betweenness" }),
        options: optionsOf(BetweennessCentralityAlgorithm),
        costClass: "heavy",
        complexity: "O(n * m)",
        legacyKeys: [{ key: "betweenness" }],
    },
    {
        key: "closeness",
        plainName: "Reach",
        technicalName: "Closeness centrality",
        description:
            "Scores a node by how short its paths to the rest of the graph are, which is what finds the nodes that reach everything quickly.",
        category: "centrality",
        shape: "node-metric",
        fields: metricFields("node", { plainName: "Reach", technicalName: "closeness" }),
        options: optionsOf(ClosenessCentralityAlgorithm),
        costClass: "heavy",
        complexity: "O(n * m)",
        legacyKeys: [{ key: "closeness" }],
    },
    {
        key: "pagerank",
        plainName: "Influence",
        technicalName: "PageRank",
        description: "Ranks a node by the influence that flows into it from the nodes that point at it.",
        category: "centrality",
        shape: "node-metric",
        fields: metricFields("node", { plainName: "Influence", technicalName: "PageRank score" }),
        options: optionsOf(PageRankAlgorithm),
        costClass: "iterative",
        complexity: "O(k(n + m))",
        legacyKeys: [{ key: "pagerank" }],
    },
    {
        key: "eigenvector",
        plainName: "Influence by association",
        technicalName: "Eigenvector centrality",
        description:
            "Scores a node by how influential its neighbours are, so a few important connections count for more than many unimportant ones.",
        category: "centrality",
        shape: "node-metric",
        fields: metricFields("node", { plainName: "Influence by association", technicalName: "eigenvector score" }),
        options: optionsOf(EigenvectorCentralityAlgorithm),
        costClass: "iterative",
        complexity: "O(k(n + m))",
        legacyKeys: [{ key: "eigenvector" }],
    },
    {
        key: "katz",
        plainName: "Influence at a distance",
        technicalName: "Katz centrality",
        description: "Scores a node by every path that reaches it, with a longer path counting for less.",
        category: "centrality",
        shape: "node-metric",
        fields: metricFields("node", { plainName: "Influence at a distance", technicalName: "Katz score" }),
        options: optionsOf(KatzCentralityAlgorithm),
        costClass: "iterative",
        complexity: "O(k(n + m))",
        legacyKeys: [{ key: "katz" }],
    },
    {
        key: "hits",
        plainName: "Hubs and authorities",
        technicalName: "HITS",
        description:
            "Scores every node twice: as a hub that points at good sources, and as an authority that good hubs point at.",
        category: "centrality",
        shape: "node-metric",
        fields: [
            ...metricFields("node", { plainName: "Hub and authority", technicalName: "combined HITS score" }),
            field({ name: "hub", plainName: "Hub", technicalName: "hub score", kind: "node", type: "number" }),
            field({
                name: "authority",
                plainName: "Authority",
                technicalName: "authority score",
                kind: "node",
                type: "number",
            }),
        ],
        options: optionsOf(HITSAlgorithm),
        costClass: "iterative",
        complexity: "O(k(n + m))",
        legacyKeys: [{ key: "hits" }],
    },
    {
        key: "louvain",
        plainName: "Communities",
        technicalName: "Louvain",
        description:
            "Groups nodes into communities by repeatedly merging the groups whose merger tightens the partition the most.",
        category: "community",
        shape: "community",
        fields: communityFields("Community", true),
        options: optionsOf(LouvainAlgorithm),
        costClass: "iterative",
        complexity: "O(k(n + m))",
        legacyKeys: [{ key: "louvain" }],
    },
    {
        key: "leiden",
        plainName: "Communities, refined",
        technicalName: "Leiden",
        description:
            "Groups nodes into communities the way Louvain does, with a refinement pass that rules out groups held together by a single node.",
        category: "community",
        shape: "community",
        fields: communityFields("Community", true),
        options: optionsOf(LeidenAlgorithm),
        costClass: "iterative",
        complexity: "O(k(n + m))",
        legacyKeys: [{ key: "leiden" }],
    },
    {
        key: "label-propagation",
        plainName: "Communities, fast",
        technicalName: "Label propagation",
        description:
            "Groups nodes into communities by letting every node repeatedly take whichever label most of its neighbours carry.",
        category: "community",
        shape: "community",
        fields: communityFields("Community", false),
        options: optionsOf(LabelPropagationAlgorithm),
        costClass: "iterative",
        complexity: "O(k(n + m))",
        legacyKeys: [{ key: "label-propagation" }],
    },
    {
        key: "girvan-newman",
        plainName: "Communities by cutting bridges",
        technicalName: "Girvan-Newman",
        description:
            "Groups nodes into communities by repeatedly cutting the edge that the most shortest paths run through, until the graph falls apart.",
        category: "community",
        shape: "community",
        fields: communityFields("Community", true),
        options: optionsOf(GirvanNewmanAlgorithm),
        costClass: "heavy",
        complexity: "O(n * m^2)",
        legacyKeys: [{ key: "girvan-newman" }],
    },
    {
        key: "components",
        plainName: "Separate pieces",
        technicalName: "Connected components",
        description:
            "Finds the separate pieces of the graph: two nodes belong to the same piece when a path joins them.",
        category: "structure",
        shape: "community",
        fields: communityFields("Piece", false),
        options: mergeOptions(
            optionsOf(ConnectedComponentsAlgorithm),
            optionsOf(StronglyConnectedComponentsAlgorithm),
            optionsFromZod(componentStrengthOptions),
        ),
        costClass: "instant",
        complexity: "O(n + m)",
        legacyKeys: [{ key: "connected-components" }, { key: "scc", params: { strength: "strong" } }],
    },
    {
        key: "shortest-path",
        plainName: "Shortest route",
        technicalName: "Shortest path",
        description:
            "Finds the cheapest route from one node to another, and how far every reachable node is from the source.",
        category: "path",
        shape: "path",
        fields: [
            field({ name: "onPath", plainName: "On the route", technicalName: "onPath", kind: "node", type: "boolean" }),
            field({ name: "order", plainName: "Position on the route", technicalName: "order", kind: "node", type: "integer" }),
            field({ name: "distance", plainName: "Distance from the source", technicalName: "distance", kind: "node", type: "number" }),
            field({ name: "onPath", plainName: "On the route", technicalName: "onPath", kind: "edge", type: "boolean" }),
            field({ name: "length", plainName: "Nodes on the route", technicalName: "length", kind: "graph", type: "integer" }),
            field({ name: "cost", plainName: "Total cost", technicalName: "cost", kind: "graph", type: "number" }),
            field({ name: "hops", plainName: "Edges on the route", technicalName: "hops", kind: "graph", type: "integer" }),
            field({
                name: "hasNegativeCycle",
                plainName: "Has a loop that costs less every time round",
                technicalName: "hasNegativeCycle",
                kind: "graph",
                type: "boolean",
            }),
        ],
        options: mergeOptions(
            optionsOf(DijkstraAlgorithm),
            optionsOf(BellmanFordAlgorithm),
            optionsFromZod(shortestPathEngineOptions),
        ),
        costClass: "instant",
        complexity: "O((n + m) log n) with dijkstra, O(n * m) with bellman-ford",
        legacyKeys: [
            { key: "dijkstra", params: { method: "dijkstra" } },
            { key: "bellman-ford", params: { method: "bellman-ford" } },
        ],
    },
    {
        /* ONE KEY, ONE RESULT SHAPE. The all-pairs sweep used to be a PARAMETER on shortest-path
           -- `allPairs: true`, engine floyd-warshall -- which made one catalogue key claim two
           different result shapes: a route for the single-source engines, and a measurement of
           every node for this one. A run takes its shape from its descriptor once, at creation,
           so the all-pairs run reported "path", found no `onPath` to paint from, and suggested
           nothing; `styles.encode` refused a hand-written encoding for the same reason. Its own
           key is what makes the shape true, and every consumer that reads the catalogue up front
           right about what a run of it will publish. */
        key: "all-pairs-distance",
        plainName: "How far from everything else",
        technicalName: "All-pairs shortest paths",
        description:
            "Measures the distance between every pair of nodes, and gives each node the distance to the furthest node it can reach.",
        category: "path",
        shape: "node-metric",
        fields: [
            ...metricFields("node", { plainName: "Distance to the furthest node", technicalName: "eccentricity" }),
            field({ name: "diameter", plainName: "Widest distance", technicalName: "diameter", kind: "graph", type: "number" }),
            field({ name: "radius", plainName: "Narrowest distance", technicalName: "radius", kind: "graph", type: "number" }),
            field({
                name: "hasNegativeCycle",
                plainName: "Has a loop that costs less every time round",
                technicalName: "hasNegativeCycle",
                kind: "graph",
                type: "boolean",
            }),
        ],
        options: optionsOf(FloydWarshallAlgorithm),
        costClass: "cubic",
        complexity: "O(n^3)",
        legacyKeys: [{ key: "floyd-warshall" }],
    },
    {
        key: "bfs",
        plainName: "Steps away",
        technicalName: "Breadth-first search",
        description: "Walks outwards from one node a level at a time, recording how many steps away each node is.",
        category: "path",
        shape: "layered-grouping",
        fields: [
            field({ name: "level", plainName: "Steps away", technicalName: "level", kind: "node", type: "integer" }),
            field({ name: "levelSize", plainName: "Nodes this many steps away", technicalName: "levelSize", kind: "node", type: "integer" }),
            field({ name: "order", plainName: "Visit order", technicalName: "order", kind: "node", type: "integer" }),
            field({ name: "levelCount", plainName: "Levels", technicalName: "levelCount", kind: "graph", type: "integer" }),
            field({ name: "sizes", plainName: "Level sizes", technicalName: "sizes", kind: "graph", type: "table" }),
            field({ name: "targetFound", plainName: "Target reached", technicalName: "targetFound", kind: "graph", type: "boolean" }),
        ],
        options: optionsOf(BFSAlgorithm),
        costClass: "instant",
        complexity: "O(n + m)",
        legacyKeys: [{ key: "bfs" }],
    },
    {
        key: "dfs",
        plainName: "Exploration order",
        technicalName: "Depth-first search",
        description:
            "Walks as deep as it can from one node before backtracking, recording the order in which it reached each node.",
        category: "path",
        shape: "node-metric",
        fields: [
            ...metricFields("node", { plainName: "Exploration order", technicalName: "discovery time", type: "integer" }),
            field({ name: "visited", plainName: "Reached", technicalName: "visited", kind: "node", type: "boolean" }),
        ],
        options: optionsOf(DFSAlgorithm),
        costClass: "instant",
        complexity: "O(n + m)",
        legacyKeys: [{ key: "dfs" }],
    },
    {
        key: "kruskal",
        plainName: "Cheapest connecting network",
        technicalName: "Kruskal minimum spanning tree",
        description:
            "Finds the cheapest set of edges that still joins every node, by taking the cheapest edge that does not close a loop.",
        category: "structure",
        shape: "edge-set",
        fields: setFields("edge", "In the network", {
            name: "totalWeight",
            plainName: "Total cost",
            technicalName: "totalWeight",
            type: "number",
        }),
        options: optionsOf(KruskalAlgorithm),
        costClass: "instant",
        complexity: "O(m log m)",
        requires: { directed: false },
        legacyKeys: [{ key: "kruskal" }],
    },
    {
        key: "prim",
        plainName: "Cheapest network from one node",
        technicalName: "Prim minimum spanning tree",
        description:
            "Finds the cheapest set of edges that still joins every node, by growing outwards from one starting node.",
        category: "structure",
        shape: "edge-set",
        fields: setFields("edge", "In the network", {
            name: "totalWeight",
            plainName: "Total cost",
            technicalName: "totalWeight",
            type: "number",
        }),
        options: optionsOf(PrimAlgorithm),
        costClass: "instant",
        complexity: "O(m log n)",
        requires: { directed: false },
        legacyKeys: [{ key: "prim" }],
    },
    {
        key: "bipartite-matching",
        plainName: "Best pairing",
        technicalName: "Maximum bipartite matching",
        description:
            "Pairs up the two sides of a two-sided graph so that as many nodes as possible end up with a partner.",
        category: "structure",
        shape: "edge-set",
        fields: [
            ...setFields("edge", "In the pairing", {
                name: "bipartite",
                plainName: "Has two sides",
                technicalName: "bipartite",
                type: "boolean",
            }),
            field({ name: "side", plainName: "Side", technicalName: "side", kind: "node", type: "string" }),
            field({ name: "matched", plainName: "Paired", technicalName: "matched", kind: "node", type: "boolean" }),
        ],
        options: optionsOf(BipartiteMatchingAlgorithm),
        costClass: "heavy",
        complexity: "O(n * m)",
        requires: { directed: false },
        legacyKeys: [{ key: "bipartite-matching" }],
    },
    {
        key: "max-flow",
        plainName: "Most that can flow",
        technicalName: "Maximum flow",
        description: "Finds the most that can flow from a source to a sink when every edge has a capacity.",
        category: "flow",
        shape: "edge-metric",
        fields: [
            ...metricFields("edge", { plainName: "Flow", technicalName: "flow" }),
            field({ name: "capacity", plainName: "Capacity", technicalName: "capacity", kind: "edge", type: "number" }),
            field({ name: "utilization", plainName: "Share of capacity used", technicalName: "utilization", kind: "edge", type: "number" }),
            field({ name: "netFlow", plainName: "Net flow", technicalName: "netFlow", kind: "node", type: "number" }),
            field({ name: "role", plainName: "Source or sink", technicalName: "role", kind: "node", type: "string" }),
            field({ name: "maxFlow", plainName: "Most that can flow", technicalName: "maxFlow", kind: "graph", type: "number" }),
        ],
        options: optionsOf(MaxFlowAlgorithm),
        costClass: "heavy",
        complexity: "O(n * m^2)",
        legacyKeys: [{ key: "max-flow" }],
    },
    {
        key: "min-cut",
        plainName: "Weakest link",
        technicalName: "Minimum cut",
        description: "Finds the cheapest set of edges to remove to split the graph into two pieces.",
        category: "flow",
        shape: "edge-set",
        fields: [
            ...setFields("edge", "In the cut", {
                name: "cutValue",
                plainName: "Cost of the cut",
                technicalName: "cutValue",
                type: "number",
            }),
            field({ name: "side", plainName: "Side", technicalName: "side", kind: "node", type: "string" }),
        ],
        options: optionsOf(MinCutAlgorithm),
        costClass: "heavy",
        complexity: "O(n * m^2) between two nodes, O(n * m + n^2 log n) across the whole graph, O(k * n^2) with Karger",
        legacyKeys: [{ key: "min-cut" }],
    },
];

// ---------------------------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------------------------

/**
 * Find a built-in algorithm by its 2.0 key.
 * @param key - The key to look for, such as "shortest-path".
 * @returns The descriptor, or undefined when no built-in carries that key.
 */
export function algorithmByKey(key: string): BuiltInAlgorithmDescriptor | undefined {
    return BUILT_IN_ALGORITHMS.find((descriptor) => descriptor.key === key);
}

/** Where a 1.10 key ended up: the descriptor that replaced it, and the parameters it needs. */
export interface LegacyAlgorithmMapping {
    descriptor: BuiltInAlgorithmDescriptor;
    /** The parameters that reproduce the 1.10 behaviour. Empty when only the key changed. */
    params: Readonly<Record<string, unknown>>;
}

/**
 * Find what a 1.10 algorithm key became, for a migration tool or a compatibility shim.
 * @param legacyKey - The 1.10 key, such as "scc" or "floyd-warshall", with no namespace.
 * @returns The descriptor that replaced it and the parameters to run it with, or undefined when
 * the key was never registered.
 */
export function algorithmByLegacyKey(legacyKey: string): LegacyAlgorithmMapping | undefined {
    for (const descriptor of BUILT_IN_ALGORITHMS) {
        for (const legacy of descriptor.legacyKeys) {
            if (legacy.key === legacyKey) {
                return { descriptor, params: legacy.params ?? {} };
            }
        }
    }

    return undefined;
}
