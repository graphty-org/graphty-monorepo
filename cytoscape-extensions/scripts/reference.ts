/**
 * The generated part of the reference pages under docs/reference/ (every layout, algorithm, generator, dataset and
 * file format with its options), produced from the source so it cannot drift: option names, types and descriptions
 * come from the TypeScript types and their doc comments (this package's and those of the graphty algorithms, layout
 * and graph-samples packages), the lists from what the package registers, and the defaults from the values it passes.
 *
 * Each page keeps its hand-written text; only what sits between a pair of `generated:<section>` markers is replaced.
 * test/reference.test.ts fails when a page differs from what this produces; `npm run docs:reference` rewrites them.
 */

import { fileURLToPath } from "node:url";

import { DATASETS } from "@graphty/graph-samples";
import { format, resolveConfig } from "prettier";
import ts from "typescript";

import {
    ALGORITHM_NAMES,
    ASYNC_ALGORITHM_NAMES,
    DEFAULTS as ALGORITHM_DEFAULTS,
    DIRECTED as DIRECTED_ALGORITHMS,
    NO_FIELD,
    UNWEIGHTED,
} from "../src/algorithms.js";
import { DEFAULTS as LAYOUT_DEFAULTS, LAYOUT_NAMES, SIMULATION_DEFAULTS, SIMULATIONS } from "../src/layouts.js";
import { BUNDLED_DATASET_NAMES, GENERATORS } from "../src/samples.js";

const pkg = fileURLToPath(new URL("..", import.meta.url));

/** One option as the tables show it. */
interface Option {
    readonly name: string;
    readonly type: string;
    readonly required: boolean;
    readonly doc: string;
}

// Options this package sets itself, so a caller never passes them: the layout frame and stepping, and the library
// spellings the extension replaces with a selector-taking option of its own (bfs `start` is `root` here). A static
// layout's `pos` is passed through, so it is documented there.
const SET_BY_EXTENSION = new Set([
    "scale",
    "center",
    "pos",
    "iterationsPerStep",
    "fixed",
    "start",
    "weights",
    "weighted",
]);
// A pipe escaped for a Markdown table cell.
const ESCAPED_PIPE = String.raw`\|`;
// Options of every algorithm, documented once.
const COMMON_ALGORITHM = new Set(["directed", "weight", "field", "gpu"]);
// Layout options with a Cytoscape-facing meaning of their own, documented per layout from LayoutOptionFields.
const PER_LAYOUT_EXTENSION: Readonly<Record<string, readonly string[]>> = {
    shell: ["nlist"],
    multipartite: ["subsets", "align"],
    bipartite: ["top", "align"],
    bfs: ["root", "align"],
    radial: ["root"],
    forceatlas2: ["nodeMass", "nodeSize"],
};
// The @graphty/layout option type each simulation runs with (the static layouts read their function's parameter).
const SIMULATION_TYPES: Readonly<Record<string, string>> = {
    forceatlas2: "ForceAtlas2Options",
    "fruchterman-reingold": "FruchtermanReingoldOptions",
    "spring-electrical": "SpringElectricalOptions",
};

// The doc comments of the graphty libraries speak to their own users: they compare with the libraries' older API
// ("legacy") and say "snapshot" for the graph a function reads. A Cytoscape user has neither, so those remarks are
// dropped and the wording adjusted here. The site is written in American English, so the few British spellings in
// those comments are changed too.
const FOR_CYTOSCAPE_READERS: readonly (readonly [RegExp, string])[] = [
    [/ The legacy [^.]*\./g, ""],
    [
        /,? (?:as (?:in )?|which is what )?the legacy (?:`\w+`|functions?)(?: does| rule)?(?: when normalization is switched OFF)?/g,
        "",
    ],
    [/ ?\([^)]*\blegacy\b[^)]*\)/g, ""],
    [/the legacy id-keyed record/g, "a record keyed by node id"],
    // the layouts read a string as a node data field (src/layouts.ts nodeFields); a Cytoscape graph has no role columns
    [/the name of a numeric node column/g, "the name of a numeric node data field"],
    [/role-`mass` column, else /g, ""],
    [/\bdirected snapshot\b/g, "directed graph"],
    [/\bundirected snapshot\b/g, "undirected graph"],
    [/neighbour/g, "neighbor"],
    [/favour/g, "favor"],
    [/makes export\(\) throw/g, "makes graphtyExport throw"],
    [/and check\(\) reports them/g, "and `onLoss` hears about them"],
    [/centre/g, "center"],
    [/colour/g, "color"],
    [/(initiali|regulari|normali)s(?=ation|e)/g, "$1z"],
];

/**
 * An option's doc comment text. TypeScript reads an "@" inside the text ("there to match @graphty/layout") as the start
 * of a tag and drops the rest from the text, so a tag it does not know fails the run instead of cutting a cell short.
 * @param p - the option's symbol
 * @param checker - the checker
 * @returns the comment text
 */
function docText(p: ts.Symbol, checker: ts.TypeChecker): string {
    const known = new Set(["default", "defaultValue", "deprecated", "see", "example", "remarks", "internal"]);
    const stray = p.getJsDocTags(checker).find((t) => !known.has(t.name));
    if (stray !== undefined) {
        throw new Error(`the doc comment of ${p.name} has "@${stray.name}" mid-text: put it in backticks or reword it`);
    }
    return ts.displayPartsToString(p.getDocumentationComment(checker));
}

/** What the tables show for one option where the source's own words do not fit a Cytoscape reader. */
interface Override {
    readonly default?: string;
    readonly doc?: string;
}

const SAMPLED_K =
    "Draw this many source nodes instead of using every node; the same node count and `k` draw the same nodes every time. With `sources` it must equal the number of sources. The result is not rescaled.";
const CLOSENESS_NORMALIZED =
    "Multiply by the share of the other nodes that are reached, reached / (n - 1), which changes nothing on a connected graph; with `harmonic`, divide by `n - 1` instead. For NetworkX's `closeness_centrality` (its default `wf_improved=True`), multiply the value with `normalized: true` by the number of other nodes reached; the value without `normalized` times that number is NetworkX's `wf_improved=False`.";
const BETWEENNESS_SOURCES: Override = {
    doc: "The nodes to run from, a selector or a collection; default every node. Sums only the shortest paths that start at these nodes, and is not rescaled by n / k as NetworkX does.",
};
const PREDICTION_TOP_K: Override = {
    default: "every pair above 0",
    doc: "Keep only the best `topK` pairs; 0 or less keeps every pair. A pair that scores 0 is never listed, so the list can be shorter than `topK`. An undirected graph lists each pair twice, once in each order, and `topK` counts rows, not pairs. A directed graph lists each pair once (see above).",
};
const CANDIDATES_TOP_K: Override = {
    default: "`10`",
    doc: "Keep only the best `topK` candidates; 0 or less keeps every candidate. A candidate that scores 0 is never listed, so the list can be shorter than `topK`.",
};
const CANDIDATES: Override = {
    doc: "The nodes to consider linking to `root`. Those that score 0 are left out of the result.",
};
const LPA_REPORT =
    "`iterations` and `converged` are undefined only when the `...Async` twin ran on the GPU, which does not report them; this method always fills them in.";
const SEARCH_GOAL = "Stop when this node is reached; it is then `found`.";
const FLOW_ALGORITHM: Override = {
    doc: 'How augmenting paths are found: `"edmonds-karp"` (breadth-first, O(V E^2)) or `"ford-fulkerson"` (depth-first, O(E f)). Both give the same source side and flow value; the per-edge flows can differ where the maximum flow is not unique.',
};
const ISO_OTHER: Override = {
    doc: 'The graph to compare with, read with the same `directed` and like the calling collection: its nodes, and the edges in it whose ends are both in it. A collection of nodes alone has no edges, so include them: `other: part.union(part.edgesWith(part))`. Also takes an array of elements, or a selector over the whole core (for example ".second", matching that graph\'s nodes and edges).',
};
const LATTICE_POSITIONS: Override = {
    doc: "Give each node its place on the lattice, in lattice units: x and y become the node's position, and on `grid-3d` z becomes a data field.",
};
const Z_AS =
    '`"column"` keeps a node\'s `z` as the data field `z`, where Cytoscape stores a stacking order. `"position"` reads it as a third coordinate, and since a Cytoscape position has no z, it is dropped with no warning.';
const LAYER_ALIGN: Override = {
    default: '`"vertical"`',
    doc: '`"vertical"`: each layer is a column whose nodes share one x, and the layers run left to right. `"horizontal"`: each layer is a row whose nodes share one y, and the layers run top to bottom.',
};

// Options whose source text is another package's (and speaks to its users), is wrong for this package, or leaves out
// what a Cytoscape user needs, by "<method or layout or generator>.<option>"; "algorithms", "layouts" and "*" name
// the shared algorithm table, the shared layout table and every table.
const OVERRIDES: Readonly<Record<string, Override>> = {
    "algorithms.field": {
        doc: 'Write each element\'s value into `data(field)`, so a stylesheet can map it: the score, the cluster number, the distance from `root` (`Infinity` when unreachable) or the search depth (`NaN` when not visited). A method marked "Takes no `field`" below throws when you pass it.',
    },
    "algorithms.weight": {
        doc: "Edge data field holding the weight, or a function of the edge. Each method below says whether it reads weights; one that does not throws when you pass `weight`.",
    },
    "graphtyAllPairsShortestPath.paths": {
        doc: "Keep the predecessor table so `path(from, to)` works; it takes 4 n^2 bytes. With `false` only `distance()` works and `path()` throws, and the Async twin can run on the GPU.",
    },
    "graphtyBetweennessCentrality.k": { doc: SAMPLED_K },
    "graphtyClosenessCentrality.k": { doc: SAMPLED_K },
    "graphtyClosenessCentrality.sources": {
        doc: "The nodes to run from, a selector or a collection; default every node. Each node's value is 1 / the sum of its distances from these sources, so with source `#a` on the path a - b - d, b scores 1 and d 0.5. A node no source reaches scores 0, and so does a source no other source reaches. For one node's own closeness, use `graphtyNodeClosenessCentrality`.",
    },
    "graphtyBetweennessCentrality.sources": BETWEENNESS_SOURCES,
    "graphtyGrsbm.maxIterations": { doc: "Iteration cap of the eigenvector iteration." },
    "graphtyGrsbm.tolerance": { doc: "Convergence tolerance of the eigenvector iteration." },
    "graphtyEdgeBetweennessCentrality.sources": BETWEENNESS_SOURCES,
    "graphtyClosenessCentrality.normalized": { doc: CLOSENESS_NORMALIZED },
    "graphtyNodeClosenessCentrality.normalized": { doc: CLOSENESS_NORMALIZED },
    "graphtyCommonNeighborsPrediction.topK": PREDICTION_TOP_K,
    "graphtyAdamicAdarPrediction.topK": PREDICTION_TOP_K,
    "graphtyTopCandidatesForNode.topK": CANDIDATES_TOP_K,
    "graphtyTopAdamicAdarCandidatesForNode.topK": CANDIDATES_TOP_K,
    "graphtyTopCandidatesForNode.candidates": CANDIDATES,
    "graphtyTopAdamicAdarCandidatesForNode.candidates": CANDIDATES,
    "graphtyBreadthFirstSearch.goal": {
        doc: "Stop when this node comes off the queue; it is then `found`. Every node queued before it is still expanded, so `path` can list nodes one hop deeper than the goal, with a depth: on a-b, a-c, b-d, c-e with `root` a and `goal` c, `path` ends with d at depth 2.",
    },
    "graphtyDepthFirstSearch.goal": {
        doc: `${SEARCH_GOAL} Nothing after it is visited. Only a pre-order walk can stop early: with \`order: "post"\` passing \`goal\` throws.`,
    },
    "graphtyMaxFlow.algorithm": FLOW_ALGORITHM,
    "graphtyIsGraphIsomorphic.other": ISO_OTHER,
    "graphtyFindAllIsomorphisms.other": ISO_OTHER,
    "bianconi-barabasi.fitness": { default: "random, uniform in (0, 1], fixed by `seed`" },
    "hyperbolic.averageDegree": {
        doc: "The target mean degree, a finite number > 0; the mean degree you get is close to it, not equal.",
    },
    "graphtyMinSTCut.algorithm": FLOW_ALGORITHM,
    "graphtyDeltaPageRank.maxIterations": {
        default: "`100`; no limit with `priority`",
        doc: "Rounds, or with `priority` the number of nodes processed. With `priority` and no `maxIterations`, the run goes on until no pending delta is left, so it always converges.",
    },
    "graphtyDeltaPageRank.priority": {
        doc: "Process the largest pending delta first; ignores `personalization`.",
    },
    "graphtyHits.normalized": {
        doc: "`true`: each vector has length 1 (L2 norm). `false`: each vector is divided by its largest entry, so its top node scores 1.",
    },
    "graphtyEigenvectorCentrality.mode": {
        default: '`"in"`',
        doc: 'Which arcs feed a node: `"in"` (as networkx) the nodes pointing at it, `"out"` the nodes it points at, `"total"` both. `"in"` and `"out"` need `directed: true` and throw without it.',
    },
    "graphtyDegreeCentrality.mode": {
        doc: 'Which neighbors to count: `"in"`, `"out"` or `"total"`. `"in"` and `"out"` need `directed: true` and throw without it.',
    },
    "graphtyHierarchicalClustering.linkage": {
        default: '`"single"`',
        doc: 'How the distance between two clusters is read from their members\' hop distances: the minimum (`"single"`), the maximum (`"complete"`), the mean (`"average"`) or Ward\'s scaled mean (`"ward"`).',
    },
    "graphtySpectralClustering.laplacianType": {
        default: '`"normalized"`',
        doc: '`"unnormalized"` is `D - A`, `"normalized"` is `I - D^-1/2 A D^-1/2` with each row of the embedding scaled to unit length, and `"randomWalk"` is `I - D^-1 A`.',
    },
    "layouts.spacingFactor": {
        doc: "Expands (above 1) or compresses (below 1) the result after it is fitted to `boundingBox`, about the center of the nodes' bounding box, as Cytoscape does. A value above 1 can put nodes outside the box, and on a lopsided result the centroid moves off the box's center. Absent: no scaling.",
    },
    "graphty-spiral.resolution": {
        doc: "The angle between consecutive nodes, in radians. With `equidistant: true` it is instead the angle the spiral starts at, and since the spiral's radius grows with its angle, it changes the shape of the inner turns, not only the rotation.",
    },
    "graphty-spiral.equidistant": {
        doc: "Space consecutive nodes the same distance apart along the spiral, instead of by equal angles.",
    },
    "graphty-shell.nlist": {
        doc: "The shells, innermost first. They are evenly spaced out to the edge of the fitted result, and a first shell of exactly one node goes at the center of the drawing. The fit then moves the centroid of all nodes to the center of `boundingBox`, so that node is at the box's center only when the drawing is symmetric. Absent: every node on one circle. A node in no shell is not placed and keeps its position.",
    },
    "graphty-kamada-kawai.pos": {
        doc: "The starting positions, `dim * n` values in node order (see Per-node arrays). The result is fitted to `boundingBox` afterwards. Absent: the layout's own start.",
    },
    "graphty-arf.scaling": {
        doc: "The strength of the repulsion between every pair: scaling * sqrt(n) / distance. It sets the size the forces settle at, and the fit to `boundingBox` removes that size, so a higher value does not spread the drawing. What it changes is where the run starts relative to that size and how far it gets in `maxIter` steps, so the drawing differs but is not predictably wider or tighter.",
    },
    "graphty-arf.a": {
        default: "`1.1`",
        doc: "The spring strength between linked nodes; every other pair attracts with strength 1. A higher value pulls neighbors closer relative to the rest. A value of 1 or less throws `The parameter a should be larger than 1`.",
    },
    "graphty-arf.pos": {
        doc: "The starting positions, `dim * n` values in node order (see Per-node arrays). The result is fitted to `boundingBox` afterwards. Absent: the layout's own start.",
    },
    "graphty-multipartite.align": LAYER_ALIGN,
    "graphty-bfs.align": LAYER_ALIGN,
    "graphty-bipartite.align": {
        default: '`"vertical"`',
        doc: '`"vertical"`: the two lines are columns, the first on the left. `"horizontal"`: they are rows, the first on top.',
    },
    "graphty-bipartite.aspectRatio": {
        default: "`4 / 3`",
        doc: 'The gap between the two lines, where a line is 1 long before the result is scaled into `boundingBox`. A line of k nodes covers (k - 1) / k of that length, so with 3 nodes a line the default gives a result twice as wide as it is tall. With `align: "horizontal"` the gap is vertical.',
    },
    "graphty-forceatlas2.nodeMass": {
        default: "degree + 1",
        doc: "Each node's mass: the name of a node data field (a node without a number there gets the default), an object keyed by node id, or one number per node in node order, as an array or a typed array (see Per-node arrays). Default: the node's degree + 1.",
    },
    "graphty-fruchterman-reingold.cooling": {
        doc: 'The cooling schedule. "linear": the temperature falls from 0.1 to 0 over `iterations` steps, and the run lasts the whole budget unless it settles first (see `settleThreshold`), which at the default threshold is rare. "adaptive": Yifan Hu\'s step control -- the temperature grows by 1 / 0.9 after five consecutive iterations whose total force energy fell and shrinks by 0.9 whenever it rose, so the run settles on its own, usually in a few hundred iterations whatever the graph size; `iterations` is then only a cap. GPU only; the CPU ignores it.',
    },
    "graphty-forceatlas2.nodeSize": {
        doc: "Accepted for compatibility with Gephi's options and not used yet: nodes are treated as points.",
    },
    "graphty-fruchterman-reingold.k": {
        default: "`1 / sqrt(n)`",
        doc: "The ideal distance between neighbors, in layout units: the graph spans about 1 unit before it is scaled into `boundingBox`, so a value in pixels does not apply.",
    },
    "graphty-radial.root": {
        doc: "The node the rings are drawn around. The fit moves the centroid of all nodes to the center of `boundingBox`, so `root` is at the box's center only when the drawing is symmetric.",
    },
    "*.graphIndex": {
        doc: "Which graph of the file to read, 0-based in file order. When a file holds more than one graph, `report.issues` has a `W_MULTIPLE_GRAPHS` issue whose message gives the count.",
    },
    "*.graphName": {
        doc: "Which graph of the file to read, by the name the file gives it; a name two graphs share is refused.",
    },
    "*.maxInFlight": {
        doc: "GPU only: how many batches of steps may wait on the GPU before the next step waits for the oldest to finish. A higher value keeps the GPU busier and shows each frame later. The CPU ignores it.",
    },
    // the classic graphs of @graphty/graph-samples, whose options carry no doc comments
    "balanced-tree.branching": { doc: "Children per node." },
    "balanced-tree.height": { doc: "Levels below the root." },
    "barbell.cliqueSize": { doc: "Nodes in each of the two cliques." },
    "barbell.pathLength": { doc: "Nodes on the path between the cliques." },
    "caveman.cliques": { doc: "Number of cliques, none joined to another." },
    "caveman.size": { doc: "Nodes per clique." },
    "connected-caveman.cliques": { doc: "Number of cliques, joined in a ring." },
    "connected-caveman.size": { doc: "Nodes per clique." },
    "ring-of-cliques.cliques": { doc: "Number of cliques, joined in a ring by one edge each." },
    "ring-of-cliques.size": { doc: "Nodes per clique." },
    "circular-ladder.n": { doc: "Rungs; the graph has 2n nodes." },
    "ladder.n": { doc: "Rungs; the graph has 2n nodes." },
    "mobius-ladder.n": { doc: "Rungs; the graph has 2n nodes." },
    "complete.n": { doc: "Nodes." },
    "cycle.n": { doc: "Nodes." },
    "empty.n": { doc: "Nodes." },
    "path.n": { doc: "Nodes." },
    "star.n": { doc: "Nodes, the hub included." },
    "wheel.n": { doc: "Nodes, the hub included." },
    "complete-bipartite.a": { doc: "Nodes on the first side; their `side` field is 0." },
    "complete-bipartite.b": { doc: "Nodes on the second side; their `side` field is 1." },
    "complete-multipartite.sizes": { doc: "Nodes in each part; the `part` field numbers the parts." },
    "hypercube.dimension": { doc: "The dimension d; the graph has 2^d nodes." },
    "lollipop.cliqueSize": { doc: "Nodes in the clique." },
    "lollipop.pathLength": { doc: "Nodes on the tail." },
    "named.name": { doc: "Which graph." },
    "grid.positions": LATTICE_POSITIONS,
    "grid-3d.positions": LATTICE_POSITIONS,
    "hexagonal-lattice.positions": LATTICE_POSITIONS,
    "triangular-lattice.positions": LATTICE_POSITIONS,
    // graph-io's format options, where they speak of its internals or of a graph read from the same format
    // the doc comment marks the character references, not a value, as the default
    "xgmml-export.cytoscapeEscapes": { default: "`false`" },
    "gexf-import.viz": {
        doc: "Read the `viz` elements: color, position, size, shape and thickness. `false` ignores them, with one warning.",
    },
    "graphml-import.yfiles": {
        doc: '`"json"` keeps the yEd graphics of each element as a JSON data field; `"skip"` leaves them out, with one warning.',
    },
    "graphml-export.edgedefault": {
        default: "the graph's direction",
        doc: "The top-level `edgedefault`: `directed` when you pass `directed: true`, else `undirected`.",
    },
    "gml-import.positions": {
        doc: "Read a node's `graphics [ x y ]` as its position; `false` keeps the whole record as the data field `graphics`.",
    },
    "dot-import.positions": {
        doc: "Read a node's `pos` attribute as its position; `false` keeps `pos` as the text the file wrote.",
    },
    "gml-import.dictionaries": {
        doc: "Store repeated text values compactly while reading; the data you get is the same.",
    },
    "gml-export.weightKey": { default: '`"value"`', doc: "The edge key the edge weights are written under." },
    "dot-export.indent": { default: "four spaces", doc: "The indentation of one nesting level." },
    "dot-export.name": { default: "none", doc: "The graph name to write." },
    "dot-export.strict": { default: "`false`", doc: "Write the `strict` keyword." },
    "csv-import.rowNumberIds": { default: "`false`" },
    "csv-export.table": {
        default: '`"edges"`',
        doc: 'Which table to write: the edge table, the node table, or an adjacency table (a node and its neighbors per row; read it back with `table: "adjacency"`).',
    },
    "csv-export.delimiter": { default: '`","`', doc: "The field delimiter." },
    "csv-export.newline": { default: '`"\\n"`', doc: "The line terminator." },
    "csv-export.header": { default: "`true`", doc: "Write the header row; an adjacency table never has one." },
    "json-export.dialect": {
        default: '`"cytoscape"`',
        doc: 'The dialect to write. `"cytoscape"` is what `cy.json()` and `cy.add()` use and keeps edge ids, compound parents and positions; `"node-link"` is the NetworkX shape.',
    },
    "json-export.edgesKey": {
        default: '`"edges"`',
        doc: 'node-link and d3: the key of the edge array (d3: `"links"`).',
    },
    "json-export.nodeIdKey": { default: '`"id"`', doc: "node-link, d3 and vis: the node id key." },
    "json-export.indexLinks": { default: "`false`", doc: "node-link and d3: write endpoints as node array positions." },
    "json-export.sourceKey": { default: '`"source"`', doc: 'node-link, d3 and vis: the source key (vis: `"from"`).' },
    "json-export.targetKey": { default: '`"target"`', doc: 'node-link, d3 and vis: the target key (vis: `"to"`).' },
    "json-export.weightKey": { default: '`"weight"`', doc: "The key the edge weight is written under." },
    "neo4j-import.arrayDelimiter": { default: '`";"`' },
    "neo4j-import.quote": { default: "a double quote" },
    "neo4j-export.part": {
        default: '`"all"`',
        doc: '`"all"` writes the node sections, then the relationship sections; `"nodes"` or `"relationships"` writes one kind.',
    },
    "neo4j-export.delimiter": { default: '`","`', doc: "The field delimiter; one character." },
    "neo4j-export.arrayDelimiter": { default: '`";"`', doc: "The array delimiter of list values and `:LABEL` cells." },
    "neo4j-export.quote": { default: "a double quote", doc: "The quote character; one character." },
    "neo4j-export.weightColumn": {
        default: '`"weight"`',
        doc: "The property that receives the edge weights (`<name>:double`); null writes no weights.",
    },
    "cx2-import.zAs": { doc: Z_AS },
    "cx-import.zAs": { doc: Z_AS },
    "pajek-export.networkHeader": {
        doc: "Has no effect from Cytoscape: the `*Network` line carries the graph's name, and an exported collection has none.",
    },
};

// What each algorithm finds, in a sentence; the generator fails on a method missing here.
const PURPOSE: Readonly<Record<string, string>> = {
    graphtyAStar:
        "The shortest path from `root` to `goal`, guided by an estimate of the distance left; a negative weight throws.",
    graphtyAdamicAdarForPairs: "The Adamic-Adar score of each given node pair.",
    graphtyAdamicAdarPrediction:
        "The node pairs (u, v) with no edge u -> v, ranked by Adamic-Adar score. With `directed: true` a pair joined only by v -> u is listed, but each pair is scored in one order only, with the node that comes first in the collection as u: a predicted arc from a later node to an earlier one is missed. For a complete directed list from one node, use `graphtyTopCandidatesForNode`.",
    graphtyAdamicAdarScore:
        "The Adamic-Adar score of one node pair: its shared neighbors, each counted as 1 / log(degree), so a rare shared neighbor counts more. With `directed: true` the degree is the out-degree, and a shared neighbor of out-degree 1 counts 1.",
    graphtyAllPairsShortestPath: "The shortest distance, and path, between every pair of nodes.",
    graphtyBellmanFord:
        "Shortest paths from one node when some edge weights are negative, and whether a negative cycle exists.",
    graphtyBetweennessCentrality:
        "How often each node lies on the shortest paths between other nodes: the brokers and bridges.",
    graphtyBidirectionalDijkstra:
        "The shortest path between two nodes, searched from both ends at once; a negative weight throws.",
    graphtyBreadthFirstSearch: "Walks outward from `root` one hop at a time, recording each node's depth and parent.",
    graphtyClosenessCentrality: "How near each node is to all others: 1 / the sum of its shortest-path distances.",
    graphtyCommonNeighborsForPairs: "The number of neighbors each given node pair shares.",
    graphtyCommonNeighborsPrediction:
        "The node pairs (u, v) with no edge u -> v, ranked by how many neighbors they share. With `directed: true` a pair joined only by v -> u is listed, but each pair is scored in one order only, with the node that comes first in the collection as u: a predicted arc from a later node to an earlier one is missed. For a complete directed list from one node, use `graphtyTopCandidatesForNode`.",
    graphtyCommonNeighborsScore: "The number of neighbors two nodes share.",
    graphtyCompareAdamicAdarWithCommonNeighbors:
        "Both Evaluate methods on the same held-out edges, to compare the two scores.",
    graphtyCondensation: "The strongly connected components, plus the graph of components, which has no cycle.",
    graphtyConnectedComponents: "The connected pieces of an undirected graph.",
    graphtyDegreeCentrality: "Each node's number of neighbors.",
    graphtyDegrees:
        "Each node's in-degree and out-degree. Without `directed: true` an edge counts both ways, so both are the node's degree.",
    graphtyDeltaPageRank:
        "PageRank computed by passing on only the changes in rank; pass `priority: true` for ranks that match `graphtyPageRank`.",
    graphtyDepthFirstSearch:
        "Walks from `root` as deep as it can before backtracking, recording each node's depth and parent.",
    graphtyDijkstra:
        "Shortest paths from one node to every other, for weights of 0 or more; a negative weight throws (use `graphtyBellmanFord`).",
    graphtyDirectionOptimizedBfs:
        "Breadth-first search that switches to a bottom-up search when the frontier is large: the same depths as `graphtyBreadthFirstSearch`, faster on large graphs with short paths.",
    graphtyEdgeBetweennessCentrality:
        "How often each edge lies on shortest paths: high values mark the bridges between groups.",
    graphtyEigenvectorCentrality: "Influence: a node scores high when its neighbors score high.",
    graphtyEvaluateAdamicAdar: "How well the Adamic-Adar score ranks held-out edges above non-edges.",
    graphtyEvaluateCommonNeighbors: "How well the common-neighbor count ranks held-out edges above non-edges.",
    graphtyFindAllIsomorphisms: "Every way to map this graph's nodes onto `other` so that the edges match.",
    graphtyGirvanNewman: "Communities found by removing the edge with the highest betweenness, round after round.",
    graphtyGreedyBipartiteMatching:
        "A set of edges with no node in common in a bipartite graph, found quickly; not always the largest.",
    graphtyGrsbm:
        "Communities found by splitting groups in two by a spectral split. A split is kept unless it lowers modularity by more than 0.01. Its results are currently unreliable: the split does not follow the eigenvector that best separates the graph.",
    graphtyHasCycle: "Whether the graph has a cycle.",
    graphtyHierarchicalClustering:
        "A merge tree of clusters: every node starts alone, and the two closest clusters by hop distance merge until no pair can.",
    graphtyHits:
        "Hubs and authorities: a good hub points to good authorities, and a good authority is pointed to by good hubs.",
    graphtyIsBipartite: "Whether the nodes split into two sides with every edge between the sides, and the two sides.",
    graphtyIsGraphIsomorphic: "Whether this graph and `other` have the same shape, and how their nodes pair up.",
    graphtyKCoreDecomposition:
        "Each node's core number: the largest k for which the node belongs to a group whose members all have k or more neighbors in the group.",
    graphtyKargerMinCut:
        "A minimum cut found by random contraction over many trials: the lightest set of edges whose removal splits the graph.",
    graphtyKatzCentrality: "Influence counted over walks of every length, the shorter walks counting more.",
    graphtyKruskalMST: "The minimum spanning forest: the lightest edges that connect every node of each component.",
    graphtyLabelPropagation: "Communities found by letting each node take the most common label among its neighbors.",
    graphtyLabelPropagationSemiSupervised: "Spreads the labels of a few seed nodes to the rest of the graph.",
    graphtyLabelPropagationSynchronous: "Label propagation in which every node updates at once, each round.",
    graphtyLeiden: "Communities by modularity, as Louvain finds them, with every community connected.",
    graphtyLouvain: "Communities by modularity: groups with more edges inside them than chance would give.",
    graphtyMarkovClustering: "Communities found by simulating random walks, which stay inside dense regions.",
    graphtyMaxFlow: "The most flow that can move from `source` to `sink`, the flow on each edge, and a minimum cut.",
    graphtyMaximumBipartiteMatching: "The largest set of edges with no node in common in a bipartite graph.",
    graphtyMinSTCut: "The lightest set of edges whose removal separates `source` from `sink`.",
    graphtyModularity: "Scores a given partition: how many more edges fall inside its clusters than chance would give.",
    graphtyNodeClosenessCentrality: "The closeness of one node, without computing every node's.",
    graphtyPageRank: "Importance from links: a node ranks high when high-ranking nodes link to it.",
    graphtyPersonalizedPageRank: "PageRank seen from a set of nodes: importance relative to `personalization`.",
    graphtyPrimMST: "The minimum spanning tree, grown from `root`.",
    graphtySpectralClustering: "`k` clusters found by k-means on the eigenvectors of the graph's Laplacian.",
    graphtyStoerWagner: "The global minimum cut: the lightest set of edges whose removal splits the graph in two.",
    graphtyStronglyConnectedComponents:
        "Groups of nodes in a directed graph in which every node can reach every other.",
    graphtySyncClustering: "`numClusters` clusters found by k-means on node embeddings learned from the edges.",
    graphtyTeraHAC:
        "Hierarchical clustering by hop distance, stopped at `numClusters` clusters or at `distanceThreshold`, returned as a partition.",
    graphtyTopAdamicAdarCandidatesForNode:
        "The nodes `root` is most likely to link to next, ranked by Adamic-Adar score.",
    graphtyTopCandidatesForNode: "The nodes `root` is most likely to link to next, ranked by shared neighbors.",
    graphtyTopologicalSort:
        "The nodes in an order in which every edge points forward; null when the graph has a cycle.",
    graphtyTriangleCount:
        "Each node's number of triangles and clustering coefficient, and the graph's total and transitivity.",
    graphtyWeaklyConnectedComponents: "The pieces of a directed graph that are connected when direction is ignored.",
};

const TIES =
    "A held-out edge and a non-edge with the same score count as the edge ranked higher, so a score with many ties reads better than it is: when every pair scores 0, every metric is 1. Common-neighbor counts tie often, which also favors them in the comparison.";

// what a "shared neighbor" is on a directed graph, which the plain wording reads as symmetric
const DIRECTED_LINKS =
    "With `directed: true`, a shared neighbor of (source, target) is a node w with arcs source -> w and w -> target, so the score is not symmetric, and a node with no out-arcs has no candidates.";
const DIRECTED_HELD_OUT = "A held-out arc u -> v scores above 0 only while some path u -> w -> v is left in the graph.";

const CAPACITY = "Edge capacities come from `weight`; without it every edge has capacity 1.";

// What a method's result means beyond its type, where the type alone leaves the reader guessing.
const METHOD_NOTES: Readonly<Record<string, string>> = {
    graphtyBetweennessCentrality:
        "`score` is NetworkX's value (divided as `normalized` says). `betweenness` is always the raw count over ordered pairs, as Cytoscape's built-in gives it (twice `score` on an undirected graph), and `betweennessNormalized` is that divided by its largest value.",
    graphtyHits: "`score` is the authority value.",
    graphtyEvaluateCommonNeighbors: `${TIES} ${DIRECTED_LINKS} ${DIRECTED_HELD_OUT}`,
    graphtyEvaluateAdamicAdar: `${TIES} ${DIRECTED_LINKS} ${DIRECTED_HELD_OUT}`,
    graphtyCompareAdamicAdarWithCommonNeighbors: `${TIES} ${DIRECTED_LINKS} ${DIRECTED_HELD_OUT}`,
    graphtyCommonNeighborsScore: DIRECTED_LINKS,
    graphtyCommonNeighborsForPairs: DIRECTED_LINKS,
    graphtyCommonNeighborsPrediction: DIRECTED_LINKS,
    graphtyTopCandidatesForNode: DIRECTED_LINKS,
    graphtyAdamicAdarScore: DIRECTED_LINKS,
    graphtyAdamicAdarForPairs: DIRECTED_LINKS,
    graphtyAdamicAdarPrediction: DIRECTED_LINKS,
    graphtyTopAdamicAdarCandidatesForNode: DIRECTED_LINKS,
    graphtyTriangleCount: "`score` is the node's number of triangles.",
    graphtyKCoreDecomposition:
        "`score` is the core number; `core(k)` returns the nodes whose core number is k or more.",
    graphtyHasCycle:
        "By default the edges are read as undirected, so any two routes between the same nodes form a cycle: a diamond-shaped DAG has one. With `directed: true` only a directed cycle counts, and the diamond has none.",
    graphtyMaxFlow: `${CAPACITY} The edges are read as undirected unless you pass \`directed: true\`, which a flow network needs: \`cy.graphtyMaxFlow({ source: "#s", sink: "#t", weight: "capacity", directed: true })\`. \`partitionFirst\` is the source side of the cut. \`flow(edge)\` is measured from the edge's source to its target: read undirected, flow that runs the other way is negative; with \`directed: true\` it is between 0 and the capacity.`,
    graphtyEigenvectorCentrality:
        'When `maxIterations` passes do not meet `tolerance` it throws an error whose `code` is `"E_NOT_CONVERGED"`, where PageRank, Katz and HITS return `converged: false`. So `converged` is always `true`.',
    graphtyLouvain:
        "`modularity` is measured at the `resolution` you passed: `graphtyModularity({ clusters: result, resolution })` with the same value gives the same number.",
    graphtyLeiden:
        "`modularity` is measured at the `resolution` you passed: `graphtyModularity({ clusters: result, resolution })` with the same value gives the same number.",
    graphtySpectralClustering:
        "Every connected component, an isolated node included, takes a cluster of its own before any component is split. On an 80-node graph of 4 communities, `k: 4` finds the communities; add 3 isolated nodes and it returns the 80 nodes as one cluster plus 3 single nodes. Run it on the component you want to cluster, or raise `k` by the number of extra components.",
    graphtySyncClustering:
        "On an 80-node graph the defaults (`maxIterations: 100`, `learningRate: 0.01`) end with `converged: false` and mixed clusters. Check `converged`; there, `maxIterations: 2000, learningRate: 0.05` converges in about 750 iterations. `converged: true` does not mean the clusters are right: each isolated node or extra component takes one of the `numClusters` centers, so add 3 isolated nodes to that graph and, with the same settings, it converges with three of the four groups merged. Run it on the component you want to cluster, or raise `numClusters` by the number of extra components.",
    graphtyLabelPropagation: LPA_REPORT,
    graphtyLabelPropagationSemiSupervised:
        'Cluster numbers are not seed labels: they follow node order, not the order of `seeds` or the values in the seed field, and `field` writes those numbers. To find the cluster a label spread to, ask one of its seed nodes: with `seeds: ["#33", "#0"]`, `result.cluster("#33")` is the cluster of the first label.',
    graphtyDeltaPageRank:
        "For ranks that match `graphtyPageRank({ directed: true })`, pass `priority: true` and leave out `maxIterations`: the ranks then match a fully converged PageRank to within about 1e-8, so they differ from a default `graphtyPageRank` by up to its `tolerance` of 1e-6. With `priority`, a `maxIterations` you pass counts processed nodes and can stop the run early without saying so: at 100 on a 200-node graph the ranks are off by a third. Without `priority` the ranks can differ from PageRank's by up to 0.07 (on the karate club), and a `maxIterations` in the thousands overflows and throws.",
    graphtyIsGraphIsomorphic:
        "`mapping(node)` takes a node of this collection and returns the node of `other` it is paired with. A node of `other`, or any node when `isomorphic` is false, returns undefined.",
    graphtyLabelPropagationSynchronous: LPA_REPORT,
    graphtyTeraHAC:
        "With `numClusters`, the clusters returned are not the ones left when merging stopped: the run joins those into one tree and splits it again from the top. So a smaller `numClusters` is not always a coarsening of a larger one, and separate components can share a cluster while connected nodes are split. For clusters that keep separate components apart, use `graphtyHierarchicalClustering` and its `cut(height)`.",
    graphtyMinSTCut: `${CAPACITY} The edges are read as undirected unless you pass \`directed: true\`. \`partitionFirst\` is the source side.`,
    graphtyCondensation:
        "`condensed.snapshot` is the graph of components as a @graphty/graph-format snapshot. Its node i stands for `result[i]`. Its edges run from e = 0 to `edgeCount - 1`, and the snapshot methods `edgeSource(e)` and `edgeTarget(e)` give the components at each end: `for (let e = 0; e < s.edgeCount; e++) console.log(result[s.edgeSource(e)].map((n) => n.id()), result[s.edgeTarget(e)].map((n) => n.id()))`, with `s = result.condensed.snapshot`. The other fields of `condensed` record how @graphty/graph-format derived the graph; you do not need them. [Snapshot](../guide/snapshot) explains snapshots.",
    graphtyGrsbm:
        "Check the result with `graphtyModularity` before you use it; for communities you can rely on, use `graphtyLouvain` or `graphtyLeiden`.",
    graphtyHierarchicalClustering:
        "Distances are hop counts: weights are not read, and nodes with no path between them never merge. `cut(height)` returns the clusters of the merge tree whose height is `height` or less, where a node has height 0 and a merge is one more than its taller part. So `cut(0)` gives every node alone, and a large height gives one cluster per connected component. `merges` is the number of merges made.",
    graphtyGirvanNewman:
        "`level(k)` is the partition after k rounds of edge removal, for k from 0 (no edge removed) to `levels - 1`; past the end it returns an empty array. `modularities[k]` is the modularity of `level(k)`. The result itself, with its `modularity`, is the level with the highest modularity.",
};

// What a layout does that its options table cannot say.
const LAYOUT_NOTES: Readonly<Record<string, string>> = {
    spectral: "Starts its eigenvector solver from random values: pass `seed` for the same positions on every run.",
    planar: "Places one cycle of the graph on a circle and every other node at the average position of its already placed neighbors, plus a small random offset. It does not guarantee a drawing without crossings: on a 3 x 3 grid, edges cross and two nodes can land on the same point. Only the nodes off that cycle get the random offset: pass `seed` for the same positions on every run. When the cycle covers every node (a ring), there is nothing random and `seed` has no effect. For K5, K3,3 and a connected graph with more than 3n - 6 distinct edges (n nodes), `run()` throws `G is not planar.` and emits no events ([failures before the run](../guide/layouts#events)). Any other graph that is not planar is drawn with crossing edges.",
    bfs: "When a node cannot be reached from `root`, `run()` throws `bfs_layout didn't include all nodes. Graph may be disconnected.` and emits no events ([failures before the run](../guide/layouts#events)).",
    radial: "The nodes `root` cannot reach go on one extra ring outside the others.",
    "spring-electrical":
        'Runs only on the GPU. With no GPU for any reason (`gpu: "off"`, `accelerator: null`, a browser with no `navigator.gpu`, no usable device), `run()` returns normally and the layout then emits `layouterror`, with an error whose message starts `graphty-spring-electrical has no CPU simulation and runs only on the GPU; no GPU ran because` and names the reason (for example `gpu: "off" was requested`), and then `layoutstop`. No node moves and `layout.backend` stays undefined. It has no iteration cap: it runs until it settles (see `settleThreshold` and `settleWindow`) or until you call `layout.stop()`.',
};

// What each file format is, and what an import expects.
const FORMAT_SUMMARY: Readonly<Record<string, string>> = {
    gexf: "Gephi's XML format, with node and edge attributes and positions.",
    graphml: "The XML format of yEd and NetworkX, with typed node and edge attributes.",
    gml: "Graph Modelling Language text, as NetworkX and igraph write it.",
    dot: "Graphviz DOT text.",
    pajek: "Pajek `.net` text: a `*Vertices` list, then `*Edges` or `*Arcs` lists.",
    csv: 'Delimited text. By default an edge table with a header row naming the source and target columns; its other columns become edge data. `table: "nodes"` reads a node table, and `nodes` takes a node table to read with the edges.',
    json: "JSON graphs: Cytoscape JSON (what `cy.json()` writes, and the export default), NetworkX node-link, d3, JSON Graph Format, graphology and vis.js. An import detects the dialect.",
    neo4j: "The CSV files of `neo4j-admin import`: a node file with an `:ID` column as the input, and relationship files with `:START_ID` and `:END_ID` columns in `relationships`. The text `graphtyExport` writes holds both, and one `graphtyImport` call reads it back; `relationships` is for separate files.",
    xgmml: "The XML network format of Cytoscape desktop (2.x and 3.x). Cytoscape desktop opens the XGMML `graphtyExport` writes, so it is the way back into Cytoscape desktop.",
    cx2: "Cytoscape Exchange 2 JSON, what Cytoscape desktop and NDEx write.",
    cx: "Cytoscape Exchange version 1 JSON.",
    cys: "A Cytoscape desktop session file (`.cys`), passed as bytes (an `ArrayBuffer` or `Uint8Array`), not text. It reads the session's first network; `graphIndex` or `graphName` picks another.",
    obo: "An ontology in OBO flat file form, such as the Gene Ontology: each `[Term]` is a node, and its `is_a` and `relationship` lines are edges.",
};

// The members of a result type whose declaration has no doc comment of its own.
const MEMBER_DOCS: Readonly<Record<string, string>> = {
    "LinkPredictionMetrics.precision":
        "The precision at the score threshold with the best F1. Every metric ranks a held-out edge ahead of a non-edge with the same score, so a score that ties every pair reports 1 for all four.",
    "LinkPredictionMetrics.recall": "The recall at that threshold.",
    "CutResult.cut":
        "The edges that cross the cut. In `graphtyMaxFlow` and `graphtyMinSTCut` with `directed: true`, only the arcs from `partitionFirst` to `partitionSecond`, whose capacities sum to `value`.",
    "LinkPredictionMetrics.f1Score": "The best F1 over every threshold.",
    "LinkPredictionMetrics.auc":
        "The chance that a held-out edge scores above a non-edge, a tie counting as the edge scoring higher; 0.5 when either list is empty.",
};

/**
 * Cleans a doc comment for a table cell: one line, no references to design documents (they are not published).
 * @param s - the doc text
 * @returns the cell text
 */
function cell(s: string): string {
    let out = s.replaceAll(/\s+/g, " ");
    for (const [from, to] of FOR_CYTOSCAPE_READERS) {
        out = out.replaceAll(from, to);
    }
    return out
        .replaceAll(/ ?\((?:see )?design [^)]*\)/gi, "")
        .replaceAll(/\{@link ([^}\s|]+)(?:[\s|][^}]*)?\}/g, "`$1`")
        .replaceAll("|", ESCAPED_PIPE)
        .trim();
}

/**
 * The word a doc comment marks as the default ("0.85 (default)"), found without a regex that could backtrack.
 * @param doc - the doc text
 * @returns the first word directly followed by " (default)", or undefined when there is none
 */
function markedDefault(doc: string): string | undefined {
    const MARK = " (default)";
    for (let at = doc.indexOf(MARK); at !== -1; at = doc.indexOf(MARK, at + 1)) {
        let start = at;
        while (start > 0 && /\S/.test(doc[start - 1])) {
            start--;
        }
        if (start < at) {
            return doc.slice(start, at);
        }
    }
    return undefined;
}

/**
 * The default a doc comment states ("default 0.85", "Default: every edge weighs 1"), or "" when it states none.
 * @param doc - the doc text
 * @returns the default as written
 */
function statedDefault(doc: string): string {
    const marked = markedDefault(doc);
    if (marked !== undefined) {
        return marked;
    }
    const m = /\bdefaults?(?: is| to)?:?\s+/i.exec(doc);
    if (m === null) {
        return "";
    }
    // up to the end of the clause: a semicolon, a full stop, or a closing bracket the clause did not open
    const rest = doc.slice(m.index + m[0].length);
    let depth = 0;
    for (let i = 0; i < rest.length; i++) {
        const ch = rest[i];
        if (ch === "(") {
            depth++;
        } else if (ch === ")") {
            if (depth === 0) {
                return rest.slice(0, i).trim();
            }
            depth--;
        } else if (depth === 0 && (ch === ";" || /^(?:\.(?:\s|$)|, | and )/.test(rest.slice(i)))) {
            return rest.slice(0, i).trim();
        }
    }
    return rest.trim();
}

/**
 * Orders strings by UTF-16 code unit, as a plain sort() does (graphtyAStar before graphtyAdamicAdar); a locale order
 * would interleave upper and lower case and reorder the page.
 * @param a - one string
 * @param b - the other
 * @returns negative, zero or positive
 */
function byCodeUnit(a: string, b: string): number {
    return Number(a > b) - Number(a < b);
}

/**
 * A default value as code.
 * @param v - the value
 * @returns `v` in backticks
 */
function code(v: unknown): string {
    return `\`${typeof v === "string" ? JSON.stringify(v) : String(v)}\``;
}

/**
 * A type as a Cytoscape user writes it: without the graph-format aliases and Cytoscape's expanded generics.
 * @param t - the type text the checker prints
 * @returns the readable form
 */
function readable(t: string): string {
    return t
        .replaceAll("Collection<SingularElementReturnValue, SingularElementArgument>", "Collection")
        .replaceAll("<ArrayBufferLike>", "")
        .replaceAll("Readonly<Record<NodeId, number>>", "Record<string, number>")
        .replaceAll(/\bNodeId\b/g, "string")
        .replaceAll(/\bF32\b/g, "Float32Array")
        .replaceAll(/\bF64\b/g, "Float64Array");
}

/**
 * A type in a table cell.
 * @param t - the type text
 * @returns the cell text
 */
function typeCell(t: string): string {
    return `\`${readable(t).replaceAll("|", ESCAPED_PIPE)}\``;
}

/**
 * A default as the Default column shows it: a value in code font, a description in plain text.
 * @param d - the default as written, possibly in backticks already
 * @param type - the option's type text
 * @returns the cell text
 */
function defaultCell(d: string, type: string): string {
    const quoted = /^`[^`]*`$/.test(d);
    const bare = quoted ? d.slice(1, -1) : d;
    if (bare === "" || bare === "required") {
        return bare;
    }
    // a member of a string union written without its quotes ("Default `vertical`")
    if (type.includes(`"${bare}"`)) {
        return code(bare);
    }
    if (quoted) {
        return d;
    }
    const value = /^(?:-?[\d.,]+(?:e-?\d+)?|true|false|null|"[^"]*"|\d+ \/ \d+|ceil\(sqrt\(n\)\)|tolerance \/ 10)$/;
    return value.test(bare) ? `\`${bare}\`` : bare;
}

/**
 * A Meaning cell without the sentence or clause that only restates the Default column ("; default 0.85.",
 * "Default false.").
 * @param doc - the cleaned doc text
 * @returns the text without it
 */
function withoutDefault(doc: string): string {
    const trimmed = doc
        .replaceAll(/;\s*default\s+(?:[^;.]|\.(?=\S))*\.(?=\s|$)/gi, ".")
        .replaceAll(/,\s*default\s+(?:[^;.,]|\.(?=\S))*(?=\.(?:\s|$))/gi, "")
        .replaceAll(/ \(default [^)]+\)/gi, "");
    return trimmed
        .split(/(?<=\.)\s+(?=[A-Z`"])/)
        .filter((sentence) => !(/^Default\b/.test(sentence) && sentence.length < 50))
        .join(" ");
}

/** The type checker over the package source. */
class Source {
    readonly checker: ts.TypeChecker;
    private readonly program: ts.Program;

    constructor() {
        const config = ts.getParsedCommandLineOfConfigFile(
            `${pkg}tsconfig.json`,
            {},
            {
                ...ts.sys,
                onUnRecoverableConfigFileDiagnostic: (d) => {
                    throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
                },
            },
        );
        if (config === undefined) {
            throw new Error("tsconfig.json could not be read");
        }
        this.program = ts.createProgram([`${pkg}src/index.ts`, `${pkg}src/samples.ts`], config.options);
        this.checker = this.program.getTypeChecker();
    }

    /**
     * The exports of a module, by name.
     * @param file - a source file of this package, relative to the package
     * @param from - a module specifier imported by that file, or undefined for the file itself
     * @returns the exported symbols
     */
    exportsOf(file: string, from?: string): Map<string, ts.Symbol> {
        const sf = this.program.getSourceFile(`${pkg}${file}`);
        if (sf === undefined) {
            throw new Error(`${file} is not in the program`);
        }
        let node: ts.Node = sf;
        if (from !== undefined) {
            const decl = sf.statements.find(
                (s): s is ts.ImportDeclaration =>
                    ts.isImportDeclaration(s) && (s.moduleSpecifier as ts.StringLiteral).text === from,
            );
            if (decl === undefined) {
                throw new Error(`${file} does not import ${from}`);
            }
            node = decl.moduleSpecifier;
        }
        const mod = this.checker.getSymbolAtLocation(node);
        if (mod === undefined) {
            throw new Error(`no module symbol for ${from ?? file}`);
        }
        return new Map(this.checker.getExportsOfModule(mod).map((s) => [s.name, s]));
    }

    /**
     * The declared type of an exported type alias or interface, or the type of an exported value.
     * @param sym - the symbol
     * @returns its type
     */
    typeOf(sym: ts.Symbol): ts.Type {
        const s = sym.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(sym) : sym;
        return s.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)
            ? this.checker.getDeclaredTypeOfSymbol(s)
            : this.checker.getTypeOfSymbol(s);
    }

    /**
     * The options parameter of a function type.
     * @param fn - the function's type
     * @param index - the parameter's position
     * @returns the parameter's type without undefined, or undefined when there is no such parameter
     */
    param(fn: ts.Type, index: number): ts.Type | undefined {
        const sig = fn.getCallSignatures()[0];
        if (sig === undefined || sig.getParameters().length === 0) {
            return undefined;
        }
        const p = sig.getParameters()[Math.min(index, sig.getParameters().length - 1)];
        let t = this.checker.getTypeOfSymbol(p);
        // the algorithm methods take `...options`, a tuple of zero or one options object
        if (this.checker.isTupleType(t)) {
            t = this.checker.getTypeArguments(t as ts.TypeReference)[index];
        } else if (index >= sig.getParameters().length) {
            return undefined;
        }
        return t === undefined ? undefined : this.checker.getNonNullableType(t);
    }

    /**
     * The properties of an options type.
     * @param type - the options type
     * @returns one entry per property, in declaration order
     */
    options(type: ts.Type): Option[] {
        return this.checker
            .getPropertiesOfType(this.checker.getApparentType(type))
            .filter((p) => !p.name.startsWith("__"))
            .map((p) => {
                const t = this.checker.getNonNullableType(this.checker.getTypeOfSymbol(p));
                // a union of string literals behind an alias (LayerAlign, Linkage) is spelled out: a reader cannot
                // look the alias up
                const literals =
                    t.isUnion() && t.types.every((m) => m.isStringLiteral())
                        ? t.types.map((m) => JSON.stringify((m as ts.StringLiteralType).value)).join(" | ")
                        : undefined;
                return {
                    name: p.name,
                    type:
                        literals ??
                        this.checker.typeToString(
                            t,
                            undefined,
                            ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
                        ),
                    required: (p.flags & ts.SymbolFlags.Optional) === 0,
                    doc: docText(p, this.checker),
                };
            });
    }

    /**
     * The interfaces a source file declares, each written out as an object type, for a name a reader cannot import.
     * @param file - a source file of this package, relative to the package
     * @returns the object type text of each plain interface (no type parameters, no `extends`), by name
     */
    interfaces(file: string): Map<string, string> {
        const sf = this.program.getSourceFile(`${pkg}${file}`);
        if (sf === undefined) {
            throw new Error(`${file} is not in the program`);
        }
        const out = new Map<string, string>();
        for (const s of sf.statements) {
            if (ts.isInterfaceDeclaration(s) && s.typeParameters === undefined && s.heritageClauses === undefined) {
                const members = s.members.map((m) => m.getText(sf).replaceAll(/\s+/g, " ").replace(/;$/, ""));
                out.set(s.name.text, `{ ${members.join("; ")} }`);
            }
        }
        return out;
    }

    /**
     * The first sentence of a symbol's doc comment.
     * @param sym - the symbol
     * @returns the sentence, or ""
     */
    summary(sym: ts.Symbol): string {
        const s = sym.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(sym) : sym;
        const doc = ts.displayPartsToString(s.getDocumentationComment(this.checker));
        // the first full stop that ends a sentence: before a capital or the end, and not after an initial or "et al"
        const end = /(?<!\b[A-Z]|\bal|\.)\.(?=\s+[A-Z(]|\s*$)/.exec(doc);
        return end === null ? doc : doc.slice(0, end.index + 1);
    }
}

/**
 * An options table.
 * @param rows - the options
 * @param scope - the method, layout or generator the table belongs to, the key of its OVERRIDES
 * @param defaults - this package's own defaults, by option name
 * @returns the markdown lines
 */
function table(rows: readonly Option[], scope: string, defaults: Readonly<Record<string, unknown>> = {}): string[] {
    const out = ["| Option | Type | Default | Meaning |", "| --- | --- | --- | --- |"];
    for (const o of rows) {
        const override = OVERRIDES[`${scope}.${o.name}`] ?? OVERRIDES[`*.${o.name}`] ?? {};
        let d = o.required ? "required" : cell(statedDefault(o.doc));
        if (Object.keys(defaults).includes(o.name)) {
            d = code(defaults[o.name]);
        }
        d = defaultCell(override.default ?? d, o.type);
        const doc = override.doc === undefined ? withoutDefault(cell(o.doc)) : cell(override.doc);
        out.push(`| \`${o.name}\` | ${typeCell(o.type)} | ${d} | ${doc} |`);
    }
    return out;
}

/**
 * An option's doc comment as one layout reads it: "bfs: the start node; radial: the center node." becomes "The start
 * node." for bfs. A doc without a "<layout>: " clause is returned unchanged.
 * @param doc - the doc text
 * @param layout - the layout name, without the graphty- prefix
 * @returns the doc text for that layout
 */
function forLayout(doc: string, layout: string): string {
    const own = doc.split("; ").find((part) => part.startsWith(`${layout}: `));
    if (own === undefined) {
        return doc;
    }
    const text = trimTrailing(own.slice(layout.length + 2));
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/**
 * A result type as a reader can look it up. A union whose members are the same type written two ways (an alias and its
 * expansion, as `Awaited` of a maybe-async result produces) is shown once, by the name this package exports when it
 * has one, and otherwise spelled out, so no name a consumer cannot import is shown alone.
 * @param src - the checker
 * @param type - the method's return type
 * @param exported - the names the package's main entry exports
 * @returns the type as text
 */
function resultType(src: Source, type: ts.Type, exported: ReadonlySet<string>): string {
    const { checker } = src;
    const shapes = src.interfaces("src/algorithms.ts");
    const same = (a: ts.Type, b: ts.Type): boolean =>
        checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a);
    const named = (t: ts.Type): boolean => t.aliasSymbol !== undefined && exported.has(t.aliasSymbol.name);
    const kept: ts.Type[] = [];
    for (const t of type.isUnion() ? type.types : [type]) {
        const at = kept.findIndex((k) => same(k, t));
        if (at < 0) {
            kept.push(t);
        } else if (named(t) || (!named(kept[at]) && t.aliasSymbol === undefined)) {
            kept[at] = t;
        }
    }
    const members = type.isUnion() && kept.length < type.types.length ? kept : [type];
    return (
        members
            .map((t) =>
                checker.typeToString(
                    t,
                    undefined,
                    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
                ),
            )
            .join(" | ")
            // an interface of this package that the main entry does not export, written out
            .replaceAll(/\b\w+\b/g, (word) => (exported.has(word) ? word : (shapes.get(word) ?? word)))
            // Cytoscape's CollectionReturnValue, which the checker prints expanded
            .replace(
                "Collection<SingularElementReturnValue, SingularElementArgument> & EdgeCollection & NodeCollection & EdgeSingular & NodeSingular",
                "CollectionReturnValue",
            )
    );
}

/**
 * The algorithm section of docs/reference/algorithms.md.
 * @param src - the checker
 * @returns the markdown lines
 */
function algorithms(src: Source): string[] {
    const index = src.exportsOf("src/index.ts");
    const methods = src.typeOf(index.get("GraphtyAlgorithms") as ts.Symbol);
    const common = src.options(src.typeOf(index.get("AlgorithmOptions") as ts.Symbol));
    const out = [
        "## Options every algorithm takes",
        "",
        ...table(common, "algorithms"),
        "",
        `The algorithms defined only for directed graphs (${[...DIRECTED_ALGORITHMS]
            .map((k) => `\`graphty${k.charAt(0).toUpperCase()}${k.slice(1)}\``)
            .join(", ")}) default \`directed\` to \`true\`.`,
        "",
        "## Every algorithm",
        "",
    ];
    for (const name of [...ALGORITHM_NAMES].sort(byCodeUnit)) {
        const sym = methods.getProperty(name);
        if (sym === undefined) {
            throw new Error(`GraphtyAlgorithms has no ${name}`);
        }
        const key = name.charAt("graphty".length).toLowerCase() + name.slice("graphty".length + 1);
        const fn = src.checker.getTypeOfSymbol(sym);
        const param = src.param(fn, 0);
        const own = param === undefined ? [] : src.options(param).filter((o) => !COMMON_ALGORITHM.has(o.name));
        const returns = resultType(src, fn.getCallSignatures()[0].getReturnType(), new Set(index.keys()));
        const twin = `${name}Async`;
        const gpu = ASYNC_ALGORITHM_NAMES.includes(twin)
            ? ` Async twin, which can run on the GPU: \`${twin}\`.`
            : " No Async twin: it runs on the CPU only.";
        const weights = UNWEIGHTED.has(key) ? " Reads no edge weights." : " Reads edge weights from `weight`.";
        const field = NO_FIELD.has(key) ? " Takes no `field`." : "";
        const purpose = PURPOSE[name];
        if (purpose === undefined) {
            throw new Error(`PURPOSE has no sentence for ${name}: add one`);
        }
        const note = METHOD_NOTES[name];
        out.push(
            `### \`${name}\``,
            "",
            purpose,
            "",
            `Returns \`${readable(returns)}\`.${weights}${field}${gpu}`,
            "",
            ...(note === undefined ? [] : [note, ""]),
            ...(own.length === 0
                ? ["No options of its own.", ""]
                : [...table(own, name, ALGORITHM_DEFAULTS[key] ?? {}), ""]),
        );
    }
    return out;
}

/**
 * The result type tables of docs/reference/algorithms.md: each member of the result interfaces the methods name.
 * @param src - the checker
 * @returns the markdown lines
 */
function resultTypes(src: Source): string[] {
    const index = src.exportsOf("src/index.ts");
    const lib = src.exportsOf("src/algorithms.ts", "@graphty/algorithms");
    const names = ["ScoreResult", "PathsResult", "SearchResult", "PointPathResult", "CutResult", "PredictedLink"];
    const symbols: [string, ts.Symbol][] = [
        ...names.map((n): [string, ts.Symbol] => [n, index.get(n) as ts.Symbol]),
        ["LinkPredictionMetrics", lib.get("LinkPredictionMetrics") as ts.Symbol],
    ];
    const out: string[] = [];
    for (const [name, sym] of symbols) {
        if (sym === undefined) {
            throw new Error(`no result type ${name}`);
        }
        out.push(`### \`${name}\``, "", src.summary(sym), "", "| Member | Type | Meaning |", "| --- | --- | --- |");
        for (const p of src.checker.getPropertiesOfType(src.typeOf(sym))) {
            const t = src.checker.typeToString(
                src.checker.getTypeOfSymbol(p),
                undefined,
                ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
            );
            const doc =
                MEMBER_DOCS[`${name}.${p.name}`] ?? ts.displayPartsToString(p.getDocumentationComment(src.checker));
            if (doc === "") {
                throw new Error(
                    `${name}.${p.name} has no doc comment: write one where it is declared, or in MEMBER_DOCS`,
                );
            }
            out.push(`| \`${p.name}\` | ${typeCell(t)} | ${cell(doc)} |`);
        }
        out.push("");
    }
    return out;
}

/**
 * The layout section of docs/reference/layouts.md.
 * @param src - the checker
 * @returns the markdown lines
 */
function layouts(src: Source): string[] {
    const lib = src.exportsOf("src/layouts.ts", "@graphty/layout");
    const all = src.options(src.typeOf(src.exportsOf("src/layouts.ts").get("LayoutOptionFields") as ts.Symbol));
    const perLayout = new Set(Object.values(PER_LAYOUT_EXTENSION).flat());
    const shared = all.filter((o) => o.name !== "name" && o.name !== "eles" && !perLayout.has(o.name));
    const sharedNames = new Set(shared.map((o) => o.name));
    const out = [
        "## Options every layout takes",
        "",
        ...table(shared, "layouts", LAYOUT_DEFAULTS),
        "",
        "## Every layout",
        "",
    ];
    for (const name of LAYOUT_NAMES) {
        const simulation = SIMULATIONS[name];
        const libType =
            name in SIMULATION_TYPES
                ? src.typeOf(lib.get(SIMULATION_TYPES[name]) as ts.Symbol)
                : src.param(
                      src.typeOf(lib.get(name.replaceAll(/-(\w)/g, (_, c: string) => c.toUpperCase())) as ts.Symbol),
                      1,
                  );
        if (libType === undefined) {
            throw new Error(`no @graphty/layout options type for graphty-${name}`);
        }
        const own = [
            ...(PER_LAYOUT_EXTENSION[name] ?? []).map((n) => all.find((o) => o.name === n) as Option),
            ...src.options(libType).filter(
                (o) =>
                    !sharedNames.has(o.name) &&
                    // a static layout's `pos` is the caller's starting positions; a simulation's is the extension's
                    !(SET_BY_EXTENSION.has(o.name) && !(o.name === "pos" && simulation === undefined)) &&
                    !(PER_LAYOUT_EXTENSION[name] ?? []).includes(o.name),
            ),
        ].map((o) => ({ ...o, doc: forLayout(o.doc, name), required: false }));
        const note = LAYOUT_NOTES[name];
        out.push(
            `### \`graphty-${name}\` (${simulation === undefined ? "static" : "simulation"})`,
            "",
            ...(note === undefined ? [] : [note, ""]),
            ...(own.length === 0
                ? ["No options of its own.", ""]
                : [
                      ...table(
                          own,
                          `graphty-${name}`,
                          simulation === undefined ? {} : (SIMULATION_DEFAULTS[simulation] ?? {}),
                      ),
                      "",
                  ]),
        );
    }
    return out;
}

/**
 * Text without its trailing spaces and punctuation, trimmed without a regex that could backtrack.
 * @param text - text whose whitespace is single spaces
 * @returns the text without trailing spaces, full stops, commas and semicolons
 */
function trimTrailing(text: string): string {
    let end = text.length;
    while (end > 0 && " .,;".includes(text[end - 1])) {
        end--;
    }
    return text.slice(0, end);
}

/**
 * What a generator makes, in a few words: its doc's first sentence up to the first colon, citation or quoted title.
 * @param summary - the first sentence
 * @returns the short form
 */
function shortSummary(text: string): string {
    const summary = text.replaceAll(/\s+/g, " ");
    let end = summary.length;
    const colon = summary.indexOf(":");
    if (colon > 0) {
        end = colon;
    }
    const quote = summary.indexOf(', "');
    if (quote > 0 && quote < end) {
        end = quote;
    }
    // a parenthesis holding a year or a page number, starting with an initial, or left open by the sentence split
    // (at an abbreviated journal name) is a citation
    for (const m of summary.matchAll(/ \(/g)) {
        let depth = 0;
        let close = m.index + 1;
        for (; close < summary.length; close++) {
            if (summary[close] === "(") {
                depth++;
            } else if (summary[close] === ")" && --depth === 0) {
                break;
            }
        }
        const inner = summary.slice(m.index, close);
        if (m.index < end && (/\d/.test(inner) || /^ \([A-Z]\./.test(inner) || close === summary.length)) {
            end = m.index;
            break;
        }
    }
    return trimTrailing(summary.slice(0, end));
}

// What a generator builds, in words a reader without a network-science background can picture; the generators
// not listed keep the first sentence of their @graphty/graph-samples doc comment.
const GENERATOR_SUMMARIES: Readonly<Record<string, string>> = {
    "balanced-tree":
        "A tree in which every node above the bottom level has `branching` children, `height` levels below the root",
    "ring-of-cliques": "`cliques` cliques of `size` nodes joined in a ring, one edge between each clique and the next",
    ak: "The AK network of B. V. Cherkassky and A. V. Goldberg, a max-flow test graph",
    "barabasi-albert":
        "A scale-free graph grown one node at a time: each new node links to `m` existing nodes, preferring those of high degree",
    barbell: "Two cliques of `cliqueSize` nodes joined by a path of `pathLength` nodes",
    "bianconi-barabasi":
        "Like `barabasi-albert`, but a new node prefers existing nodes of high degree times `fitness`, so a fit late node can overtake early ones",
    "bipartite-configuration-model":
        "A random bipartite graph whose two sides have the degrees in `leftDegrees` and `rightDegrees`",
    caveman: "`cliques` separate cliques of `size` nodes, with no edges between them",
    "chung-lu": "A random graph in which each node's expected degree is its entry in `expectedDegrees`",
    "configuration-model":
        "A random graph whose nodes have the degrees in `degrees`, before any self-loops and repeated edges are erased",
    "connected-caveman":
        "`cliques` cliques of `size` nodes joined into a ring: in each clique one edge is moved to reach the previous clique",
    "degree-corrected-sbm":
        "Blocks of nodes (`sizes`) whose degrees follow `expectedDegrees`, with a `mixing` share of each node's edges leaving its block",
    "directed-configuration-model":
        "A random directed graph whose nodes have the out- and in-degrees in `outDegrees` and `inDegrees`",
    "duplication-divergence":
        "A graph grown by copying a random node and keeping each of its edges with probability `retention`, a model of protein interaction networks",
    empty: "`n` nodes and no edges",
    "erdos-renyi": "`n` nodes, each of the possible edges present with probability `p`, independently",
    "erdos-renyi-gnm": "`n` nodes and exactly `m` edges, chosen uniformly at random",
    "forest-fire":
        "A directed graph grown one node at a time: each new node picks a random node, spreads from it through its neighbors as a fire would, and links to every node reached",
    hyperbolic:
        "Random points in a hyperbolic disk, joined when close: degrees follow a power law (`exponent`) and neighbors share many neighbors",
    kronecker:
        "A random graph of k^`power` nodes drawn by nesting the k x k `initiator` matrix inside itself, with heavy-tailed degrees",
    lfr: "A graph with planted communities whose degrees and community sizes follow power laws, used to test community detection; `mixing` is the share of each node's edges that leave its community",
    lollipop: "A clique of `cliqueSize` nodes with a path of `pathLength` nodes hanging off it",
    "newman-watts":
        "A ring in which each node links to its `k` nearest neighbors, plus random shortcuts, one per ring edge with probability `p`",
    petersen: "The Petersen graph: 10 nodes and 15 edges, every node of degree 3",
    "planted-partition":
        "`groups` groups of `groupSize` nodes: two nodes are joined with probability `pIn` inside a group and `pOut` across groups",
    price: "A directed citation network: each new node cites `citations` earlier nodes, preferring those already cited often",
    "random-apollonian":
        "A planar graph built by placing each new node inside a random triangle and joining it to the triangle's three corners",
    "random-bipartite": "Two sides of `n1` and `n2` nodes, each pair across the sides joined with probability `p`",
    "random-dag":
        "A directed acyclic graph in `layers`: each node links to each node of the next layer with probability `p`",
    "random-geometric": "`n` random points in the unit square (or cube), joined when they are at most `radius` apart",
    "random-order-dag":
        "A directed acyclic graph on `n` nodes: each arc i -> j with i < j is present with probability `p`",
    "random-recursive-tree":
        "A tree grown one node at a time, each new node joined to an earlier node chosen at random",
    rmat: "A random directed graph of 2^`scale` nodes with heavy-tailed degrees, the Graph500 benchmark generator",
    star: "A hub joined to `n - 1` leaves",
    "stochastic-block-model":
        "Blocks of nodes (`sizes`): two nodes are joined with the probability `probabilities` gives for their two blocks",
    "watts-strogatz":
        "A small world: a ring in which each node links to its `k` nearest neighbors, each edge then moved to a random node with probability `beta`",
    waxman: "`n` random points in the unit square, each pair joined with probability `beta` at distance 0, falling as they get farther apart",
    wheel: "A cycle of `n - 1` nodes, each also joined to a hub",
};

/**
 * The generator table of docs/reference/graphs.md.
 * @param src - the checker
 * @returns the markdown lines
 */
function generators(src: Source): string[] {
    const gens = src.typeOf(src.exportsOf("src/samples.ts").get("GENERATORS") as ts.Symbol);
    const lib = src.exportsOf("src/samples.ts", "@graphty/graph-samples/generators");
    const shared = src.options(src.typeOf(lib.get("WeightOptions") as ts.Symbol));
    const sharedNames = new Set(shared.map((o) => o.name));
    const out = [...table(shared, "generators"), ""];
    for (const name of Object.keys(GENERATORS)) {
        const fn = gens.getProperty(name);
        const param = fn === undefined ? undefined : src.param(src.checker.getTypeOfSymbol(fn), 0);
        const opts = param === undefined ? [] : src.options(param);
        const libName = `${name.replaceAll(/-(\w)/g, (_, c: string) => c.toUpperCase())}Graph`;
        const libSym =
            lib.get(libName) ?? lib.get(libName.replace(/Graph$/, "")) ?? lib.get(libName.replace(/Graph$/, "Network"));
        let what = GENERATOR_SUMMARIES[name] ?? (libSym === undefined ? "" : shortSummary(src.summary(libSym)));
        if (name === "named") {
            what = "A named graph from the literature, chosen by `name`";
        }
        const own = opts.filter((o) => !sharedNames.has(o.name));
        // one fixed order, whatever order the generator's own type lists them in
        const also = opts
            .filter((o) => sharedNames.has(o.name))
            .map((o) => `\`${o.name}\``)
            .sort();
        const takes = also.length === 0 ? "" : ` Also takes ${also.join(" and ")}.`;
        out.push(
            `### \`${name}\``,
            "",
            `${trimTrailing(cell(what))}.${takes}`,
            "",
            ...(own.length === 0 ? ["No options of its own.", ""] : [...table(own, name), ""]),
        );
    }
    return out;
}

/**
 * The dataset table of docs/reference/graphs.md.
 * @returns the markdown lines
 */
function datasets(): string[] {
    const out = [
        "| Name | Nodes | Edges | Directed | Data fields | Where | License | Source |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ];
    for (const d of Object.values(DATASETS)) {
        const where = BUNDLED_DATASET_NAMES.includes(d.name) ? "bundled" : "hosted";
        // datasetElements makes a drawn dataset's x and y the node positions
        const drawn = "x" in d.attributes && "y" in d.attributes;
        const nodeFields = Object.keys(d.attributes)
            .filter((f) => !drawn || (f !== "x" && f !== "y"))
            .map((f) => `\`${f}\``);
        const fields = [
            ...(drawn ? ["node positions"] : []),
            ...(nodeFields.length === 0 ? [] : [`nodes: ${nodeFields.join(", ")}`]),
            ...(d.weighted ? ["edges: `weight`"] : []),
        ];
        out.push(
            `| \`${d.name}\` | ${d.nodes} | ${d.edges} | ${d.directed ? "yes" : "no"} | ${fields.join("; ") || "none"} | ${where} | ${cell(d.license)} | <${d.source}> |`,
        );
    }
    return out;
}

/**
 * The file format table of docs/reference/graphs.md.
 * @param src - the checker
 * @returns the markdown lines
 */
function formats(src: Source): string[] {
    const index = src.exportsOf("src/index.ts");
    const members = (alias: string): string[] =>
        (src.typeOf(index.get(alias) as ts.Symbol) as ts.UnionType).types.map((t) => (t as ts.StringLiteralType).value);
    const exports = new Set(members("ExportFormat"));
    const io = src.exportsOf("src/io.ts", "@graphty/graph-io");
    const formatNames = members("ImportFormat").filter((f) => f !== "auto");
    const out = ["| Format | Import | Export | What it is |", "| --- | --- | --- | --- |"];
    const details: string[] = [];
    for (const f of formatNames) {
        const summary = FORMAT_SUMMARY[f];
        if (summary === undefined) {
            throw new Error(`FORMAT_SUMMARY has no sentence for ${f}: add one`);
        }
        out.push(`| \`${f}\` | yes | ${exports.has(f) ? "yes" : "no"} | ${cell(summary)} |`);
        // GraphmlImportOptions, Cx2ExportOptions, ...: the format's own options in @graphty/graph-io
        const pascal = f.charAt(0).toUpperCase() + f.slice(1);
        details.push(`### \`${f}\``, "");
        for (const [kind, method] of [
            ["Import", "graphtyImport"],
            ["Export", "graphtyExport"],
        ] as const) {
            const sym = io.get(`${pascal}${kind}Options`);
            if (sym === undefined) {
                continue;
            }
            const opts = src.options(src.typeOf(sym));
            details.push(
                `\`${method}\` options:`,
                "",
                ...(opts.length === 0 ? ["None of its own.", ""] : [...table(opts, `${f}-${kind.toLowerCase()}`), ""]),
            );
        }
    }
    return [...out, "", ...details];
}

/** Each reference page under docs/reference/, and the generated sections it holds, in page order. */
const PAGES: Readonly<Record<string, Readonly<Record<string, (src: Source) => string[]>>>> = {
    "layouts.md": { layouts },
    "algorithms.md": { algorithms, resultTypes },
    "graphs.md": { generators, datasets, formats },
};

/** The file names of the reference pages, relative to docs/reference/. */
export const REFERENCE_PAGES: readonly string[] = Object.keys(PAGES);

let cached: Source | undefined;

/**
 * The type checker, built once: building it reads the whole program.
 * @returns the checker
 */
function source(): Source {
    cached ??= new Source();
    return cached;
}

/** The generated module that lists each algorithm's and each generator's options, relative to the package. */
export const OPTION_NAMES_FILE = "src/algorithm-options.ts";

/**
 * The text of src/algorithm-options.ts: the option names each algorithm method and each generator takes, from the
 * same types the reference tables come from, so an option a caller misspells is refused at run time.
 * @returns the module's text
 */
export async function optionNamesModule(): Promise<string> {
    const src = source();
    const methods = src.typeOf(src.exportsOf("src/index.ts").get("GraphtyAlgorithms") as ts.Symbol);
    const entries = [...ALGORITHM_NAMES].sort(byCodeUnit).map((name) => {
        const sym = methods.getProperty(name);
        if (sym === undefined) {
            throw new Error(`GraphtyAlgorithms has no ${name}`);
        }
        const param = src.param(src.checker.getTypeOfSymbol(sym), 0);
        const key = name.charAt("graphty".length).toLowerCase() + name.slice("graphty".length + 1);
        const all = param === undefined ? [...COMMON_ALGORITHM] : src.options(param).map((o) => o.name);
        // an option the method would refuse anyway is not one it takes
        const names = all.filter(
            (o) => !(o === "field" && NO_FIELD.has(key)) && !(o === "weight" && UNWEIGHTED.has(key)),
        );
        return `    ${name}: ${JSON.stringify([...new Set(names)].sort(byCodeUnit))},`;
    });
    const gens = src.typeOf(src.exportsOf("src/samples.ts").get("GENERATORS") as ts.Symbol);
    const generatorEntries = Object.keys(GENERATORS)
        .sort(byCodeUnit)
        .map((name) => {
            const fn = gens.getProperty(name);
            const param = fn === undefined ? undefined : src.param(src.checker.getTypeOfSymbol(fn), 0);
            const names = param === undefined ? [] : src.options(param).map((o) => o.name);
            return `    ${JSON.stringify(name)}: ${JSON.stringify([...new Set(names)].sort(byCodeUnit))},`;
        });
    const text = [
        "// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT scripts/reference.ts (npm run docs:reference",
        "// regenerates it from the algorithm option types in src/algorithms.ts and the generator types in src/samples.ts).",
        "",
        "/** The options each algorithm method takes, by method name; any other option is refused. */",
        "export const OPTION_NAMES: Readonly<Record<string, readonly string[]>> = {",
        ...entries,
        "};",
        "",
        "/** The options each generator takes, by generator name; any other option is refused. */",
        "export const GENERATOR_OPTION_NAMES: Readonly<Record<string, readonly string[]>> = {",
        ...generatorEntries,
        "};",
        "",
    ].join("\n");
    const filepath = `${pkg}${OPTION_NAMES_FILE}`;
    return format(text, { ...(await resolveConfig(filepath)), filepath });
}

/**
 * Every generated section of every page, as one text (what the tests scan for undocumented options).
 * @returns the generated markdown, without the markers
 */
export function reference(): string {
    return Object.values(PAGES)
        .flatMap((sections) => Object.values(sections))
        .flatMap((make) => make(source()))
        .join("\n");
}

/**
 * A reference page with each generated section replaced, formatted as the repository's Prettier configuration formats
 * it (so the format check and this generator agree on every byte). The text outside the markers is kept as written.
 * @param page - the page's file name, one of REFERENCE_PAGES
 * @param text - the page's current text
 * @returns the new text
 */
export async function withReference(page: string, text: string): Promise<string> {
    const sections = PAGES[page];
    if (sections === undefined) {
        throw new Error(`${page} is not a reference page`);
    }
    let out = text;
    for (const [name, make] of Object.entries(sections)) {
        const begin = `<!-- generated:${name}:begin (by scripts/reference.ts; run npm run docs:reference) -->`;
        const end = `<!-- generated:${name}:end -->`;
        const start = out.indexOf(begin);
        const stop = out.indexOf(end);
        if (start < 0 || stop < start) {
            throw new Error(`docs/reference/${page} has no markers for the ${name} section: add\n${begin}\n${end}`);
        }
        out = `${out.slice(0, start + begin.length)}\n\n${make(source()).join("\n")}\n\n${out.slice(stop)}`;
    }
    const filepath = `${pkg}docs/reference/${page}`;
    return format(out, { ...(await resolveConfig(filepath)), filepath });
}
