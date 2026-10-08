/**
 * @file What a run's caveats say, as codes with their values, and the English the deprecated
 * sentences are worded from.
 *
 * graphty-element does not write sentences for a reader: a run's caveats carry each remark as a
 * {@link CodedFact}, and an application words it. The English `Caveats.notes` and
 * `Caveats.partialReason` still carry are generated HERE from those same facts, so the two can
 * never say different things.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { CodedFact, CodedFactParam } from "../shared";

/**
 * What one remark in a run's {@link Caveats.facts} says. Each code carries these `params`
 * (`{}` when none is listed). A node id is the data's own id, a string or a number.
 *
 * Shared by several algorithms:
 *
 * - `weights.unread` -- edge weights were not read.
 * - `route.found` -- the run measured the route between two nodes: `{ source, target }`.
 * - `route.none` -- no route runs between two nodes: `{ source, target }`.
 * - `iteration.stop-rule` -- iteration stops at a tolerance or a pass count, whichever comes
 *   first: `{ tolerance, maxIterations }`.
 * - `iteration.cap-reached` -- it stopped at the pass cap without reaching the tolerance:
 *   `{ maxIterations }`.
 * - `partition.unscored` -- the algorithm does not score its own partition, so it reports no
 *   modularity: `{ algorithm }`, its catalog key.
 * - `community.resolution` -- the resolution the partition was found at: `{ resolution }`.
 * - `paths.counted-exactly` -- every shortest path was counted exactly, over the graph read as
 *   undirected.
 * - `paths.hop-lengths` -- path lengths count edges, and edge weights were not read.
 * - `tree.edge-count` -- the spanning tree's size: `{ edges }`.
 *
 * About what the run computed on, added to any algorithm's run:
 *
 * - `scope.whole-graph` -- computed on the whole graph, values kept for the scope only.
 * - `scope.induced-subgraph` -- computed on the subgraph the scope's nodes induce: `{ nodes }`.
 * - `scope.subgraph` -- computed on the scope's nodes and edges: `{ nodes, edges }`.
 * - `parallel-edges.merged` -- parallel edges were merged into one, every member of a group
 *   carrying the merged value: `{ count, policy }`, how many were merged and how their weights
 *   combined (`"sum"`, `"min"` or `"max"`).
 * - `input.empty` -- the graph held nothing for the algorithm to measure.
 * - `sampled.instead-of-exact` -- the run sampled rather than computed exactly: `{ method, name,
 *   sampleSize, nodes }`, the approximate method's id and catalog name, the sample, and the
 *   nodes it was drawn from.
 * - `sampled.exact-past-cap` -- an exact run was estimated past the cost cap, so the approximate
 *   method ran: `{ seconds, cap }`.
 * - `sampled.still-past-cap` -- the sampled run is itself estimated past the cap: `{ seconds,
 *   cap }`.
 *
 * One algorithm's own:
 *
 * - `astar.straight-line` -- A* was steered by straight-line distance, so its route is the
 *   cheapest only when every edge weighs at least the distance it spans.
 * - `betweenness.sampled` -- betweenness was estimated from sampled sources, unscaled:
 *   `{ sources, nodes }`.
 * - `betweenness.halved` -- the raw counts were halved, because an undirected shortest path is
 *   reached from both ends.
 * - `edge-betweenness.sampled` -- edge betweenness was estimated from sampled sources, unscaled:
 *   `{ sources, nodes }`.
 * - `bfs.origin` -- the walk went outwards from a node, which is level 0: `{ source }`.
 * - `bfs.target-reached` -- the walk stopped at its target: `{ target }`.
 * - `bfs.target-unreached` -- the walk never reached its target, so it covered everything
 *   reachable: `{ target }`.
 * - `dfs.walk` -- the walk's start and when it recorded a node: `{ source, order }`, `order`
 *   `"pre"` (as reached) or `"post"` (as left).
 * - `closeness.sampled` -- closeness was estimated from sampled sources, unscaled:
 *   `{ sources, nodes }`.
 * - `closeness.exact` -- distances are exact, over the graph read as undirected.
 * - `closeness.hop-distances` -- distance counts edges, and edge weights were not read.
 * - `closeness.reciprocal` -- a score is the reciprocal of the summed distance, uncorrected for
 *   how many nodes are reachable.
 * - `clustering-coefficient.local` -- each value is the node's local clustering coefficient.
 * - `clustering-coefficient.simple` -- the graph was read as simple and undirected.
 * - `components.weak` -- weak components: an edge joins its two nodes whichever way it points.
 * - `components.strong` -- strong components: a directed path must run each way.
 * - `components.undirected-strong` -- the graph is undirected, so its strong components are its
 *   connected ones.
 * - `degree.as-declared` -- degree was counted as the records declared the edges.
 * - `eigenvector.converged` -- power iteration converged: `{ tolerance, maxIterations }`.
 * - `eigenvector.scored-by` -- which nodes score a node: `{ mode }`, `"in"` (the nodes pointing
 *   at it) or anything else (the nodes it points at).
 * - `floyd-warshall.eccentricity` -- every pair was measured, and a node's value is its
 *   eccentricity.
 * - `flow.ends` -- the flow measured: `{ source, sink }`.
 * - `flow.ends-chosen` -- the source or sink was chosen automatically.
 * - `flow.no-path` -- no directed path runs from source to sink: `{ source, sink }`.
 * - `girvan-newman.no-cut` -- no edge could be cut, so every node is its own community.
 * - `girvan-newman.best-of` -- the best of several successive cuts was kept: `{ cuts }`.
 * - `hierarchical.hop-distances` -- distances are hop counts, and edge weights were not read.
 * - `hierarchical.fewer-clusters` -- fewer clusters than asked for: `{ asked, allowed }`.
 * - `hits.published-score` -- which HITS score is the published value: `{ mode }`, `"in"`
 *   (authority), `"out"` (hub) or `"total"` (their average).
 * - `hits.unit-length` -- the hub and authority vectors have unit length.
 * - `hits.max-scaled` -- the hub and authority vectors were divided by their own highest score.
 * - `k-core.undirected` -- counted over the graph read as undirected; edge weights not read.
 * - `k-core.loops-and-parallels` -- a self-loop does not count, and parallel edges count once.
 * - `katz.attenuation` -- every node's base influence and the per-step attenuation:
 *   `{ beta, alpha }`.
 * - `katz.direction` -- which way paths were counted: `{ mode }`, `"in"`, `"out"` or `"total"`.
 * - `link-prediction.candidates` -- only unjoined pairs sharing a neighbor were scored.
 * - `matching.not-bipartite` -- the graph has no two sides, so nothing was paired.
 * - `matching.partnered` -- how many nodes found a partner: `{ count }`.
 * - `min-cut.karger` -- Karger's method is randomized.
 * - `min-cut.sides` -- the size of each side of the cut: `{ first, second }`.
 * - `min-cut.end-chosen` -- only one end was set, so the other was chosen: `{ source, sink }`.
 * - `negative-cycle.no-distance` -- a negative cycle leaves no distance defined, so none was
 *   published.
 * - `negative-cycle.no-route` -- a negative cycle makes every distance past it meaningless, so no
 *   route is marked.
 * - `pagerank.damping` -- the probability of following a link: `{ dampingFactor }`.
 * - `pagerank.sums-to-one` -- the ranks sum to 1.
 * - `pagerank.undirected` -- the graph is undirected, so every edge carries rank both ways.
 * - `pagerank.personalized` -- the random jump lands on the personalization vector's nodes.
 * - `pagerank.personalization-unmatched` -- no personalization entry applies, so the jump lands
 *   anywhere.
 * - `pagerank.personalization-outside` -- personalization entries naming nodes outside the graph
 *   were left out: `{ count }`.
 *
 * An algorithm registered from outside the element that writes `notes` in words has no facts for
 * them: its sentences are in {@link Caveats.notes} only.
 * @since 3.18.0
 */
export type CaveatCode =
    | "weights.unread"
    | "route.found"
    | "route.none"
    | "iteration.stop-rule"
    | "iteration.cap-reached"
    | "partition.unscored"
    | "community.resolution"
    | "paths.counted-exactly"
    | "paths.hop-lengths"
    | "tree.edge-count"
    | "scope.whole-graph"
    | "scope.induced-subgraph"
    | "scope.subgraph"
    | "parallel-edges.merged"
    | "input.empty"
    | "sampled.instead-of-exact"
    | "sampled.exact-past-cap"
    | "sampled.still-past-cap"
    | "astar.straight-line"
    | "betweenness.sampled"
    | "betweenness.halved"
    | "edge-betweenness.sampled"
    | "bfs.origin"
    | "bfs.target-reached"
    | "bfs.target-unreached"
    | "dfs.walk"
    | "closeness.sampled"
    | "closeness.exact"
    | "closeness.hop-distances"
    | "closeness.reciprocal"
    | "clustering-coefficient.local"
    | "clustering-coefficient.simple"
    | "components.weak"
    | "components.strong"
    | "components.undirected-strong"
    | "degree.as-declared"
    | "eigenvector.converged"
    | "eigenvector.scored-by"
    | "floyd-warshall.eccentricity"
    | "flow.ends"
    | "flow.ends-chosen"
    | "flow.no-path"
    | "girvan-newman.no-cut"
    | "girvan-newman.best-of"
    | "hierarchical.hop-distances"
    | "hierarchical.fewer-clusters"
    | "hits.published-score"
    | "hits.unit-length"
    | "hits.max-scaled"
    | "k-core.undirected"
    | "k-core.loops-and-parallels"
    | "katz.attenuation"
    | "katz.direction"
    | "link-prediction.candidates"
    | "matching.not-bipartite"
    | "matching.partnered"
    | "min-cut.karger"
    | "min-cut.sides"
    | "min-cut.end-chosen"
    | "negative-cycle.no-distance"
    | "negative-cycle.no-route"
    | "pagerank.damping"
    | "pagerank.sums-to-one"
    | "pagerank.undirected"
    | "pagerank.personalized"
    | "pagerank.personalization-unmatched"
    | "pagerank.personalization-outside";

/**
 * Why a run stopped before it finished, in {@link Caveats.partialCause}. Each code carries these
 * `params` (`{}` when none is listed):
 *
 * - `partial.iteration-cap` -- the algorithm stopped at an iteration cap the caller set.
 * - `partial.time-box` -- the run's time box ran out: `{ ms }`, the box.
 * - `partial.canceled` -- the run was canceled and published what it had: `{ reason, runId }`,
 *   the reason the caller gave to `cancel()` (its own text, or null) and the run.
 * - `partial.stopped` -- the work stopped early without saying why.
 * - `partial.batch-incomplete` -- a batch stopped before every member finished:
 *   `{ completed, total }`.
 * @since 3.18.0
 */
export type PartialCode =
    "partial.iteration-cap" | "partial.time-box" | "partial.canceled" | "partial.stopped" | "partial.batch-incomplete";

/** Reads one parameter of a fact as text. */
type Text = (name: string) => string;

/**
 * A count with thousands separators, as the cost estimate prints it.
 * @param value - The count.
 * @returns The digits, or "unknown" for a count that is not finite.
 */
function grouped(value: CodedFactParam): string {
    const count = Number(value);

    return Number.isFinite(count) ? String(Math.round(count)).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "unknown";
}

/** The English name each unscored partition algorithm goes by in its caveat. */
const UNSCORED_NAMES: Readonly<Record<string, string>> = {
    "markov-clustering": "Markov clustering",
    "label-propagation": "Label propagation",
    "hierarchical-clustering": "Hierarchical clustering",
    "spectral-clustering": "Spectral clustering",
};

/** How parallel weights combined, in the merged-edges caveat. */
const MERGED_WEIGHTS: Readonly<Record<string, string>> = {
    sum: "with weights summed",
    min: "keeping the lowest weight",
    max: "keeping the highest weight",
};

/** Which way Katz counted paths, by its `mode`. */
const KATZ_DIRECTIONS: Readonly<Record<string, string>> = {
    in: "Paths were counted arriving at each node, along the direction each edge was declared in.",
    out: "Paths were counted leaving each node, along the direction each edge was declared in.",
    total: "Paths were counted over the graph read as undirected, so an edge carries influence both ways.",
};

/** Which HITS score is published, by its `mode`. */
const HITS_SCORES: Readonly<Record<string, string>> = {
    in: "The published value is this node's authority score: how well the nodes pointing at it point.",
    out: "The published value is this node's hub score: how well the nodes it points at are pointed at.",
    total: "The published value is the average of this node's hub score and its authority score.",
};

/** The English sentence the deprecated {@link Caveats.notes} carries for each code. */
const CAVEAT_SENTENCES: Readonly<Record<CaveatCode, (text: Text, params: CodedFact["params"]) => string>> = {
    "weights.unread": () => "Edge weights are not read.",
    "route.found": (text) => `Route from ${text("source")} to ${text("target")}.`,
    "route.none": (text) => `No route runs from ${text("source")} to ${text("target")}.`,
    "iteration.stop-rule": (text) =>
        `Iteration stops at a tolerance of ${text("tolerance")} or after ${text("maxIterations")} passes, whichever comes first.`,
    "iteration.cap-reached": (text) =>
        `It stopped at the ${text("maxIterations")}-pass cap without reaching the tolerance.`,
    "partition.unscored": (text) =>
        `${UNSCORED_NAMES[text("algorithm")] ?? text("algorithm")} does not score its own partition, so it reports no modularity.`,
    "community.resolution": (text) => `Resolution ${text("resolution")}.`,
    "paths.counted-exactly": () => "Every shortest path is counted exactly, over the graph read as undirected.",
    "paths.hop-lengths": () => "Path lengths count edges; edge weights are not read.",
    "tree.edge-count": (text) => `The tree joins the graph with ${text("edges")} edges.`,
    "scope.whole-graph": () => "Computed on the whole graph; values kept for the scope only.",
    "scope.induced-subgraph": (_, params) => `Computed on the induced subgraph of ${counted(params.nodes, "node")}.`,
    "scope.subgraph": (_, params) =>
        `Computed on the subgraph of ${counted(params.nodes, "node")} and the ${counted(params.edges, "edge")} in scope.`,
    "parallel-edges.merged": (text, params) =>
        `${text("count")} parallel ${params.count === 1 ? "edge was" : "edges were"} merged, ${MERGED_WEIGHTS[text("policy")] ?? text("policy")}, ` +
        "because this algorithm runs over a graph that holds one edge per pair. Every member of a merged " +
        "group carries the merged value.",
    "input.empty": () => "The graph had nothing for this algorithm to measure.",
    "sampled.instead-of-exact": (text, params) =>
        `Sampled rather than exact: ${text("name")} over ${grouped(params.sampleSize)} of ${grouped(params.nodes)} nodes.`,
    "sampled.exact-past-cap": (text, params) =>
        `An exact run was estimated at ${Number(params.seconds).toPrecision(3)} s, past the ${text("cap")} s cap, so the approximate method was used instead.`,
    "sampled.still-past-cap": (_, params) =>
        `The sampled run is itself estimated at ${Number(params.seconds).toPrecision(3)} s, which is still past the cap.`,
    "astar.straight-line": () =>
        "Steered by the straight-line distance between the nodes' current positions: the route is the cheapest only when every edge weighs at least the distance it spans.",
    "betweenness.sampled": (text) =>
        `Estimated from the shortest paths of ${text("sources")} sampled sources of ${text("nodes")} nodes, over the graph read as undirected, unscaled: multiply by ${text("nodes")} / ${text("sources")} to estimate the exact count.`,
    "betweenness.halved": () =>
        "The raw counts are halved, because an undirected shortest path is reached from both ends.",
    "edge-betweenness.sampled": (text) =>
        `Estimated from the shortest paths of ${text("sources")} sampled sources of ${text("nodes")} nodes, unscaled.`,
    "bfs.origin": (text) => `Walked outwards from ${text("source")}, which is level 0.`,
    "bfs.target-reached": (text) => `The walk stopped at ${text("target")}.`,
    "bfs.target-unreached": (text) => `The walk never reached ${text("target")}, so it covered everything reachable.`,
    "dfs.walk": (text, params) =>
        `Walked from ${text("source")}, ${params.order === "pre" ? "recording each node as it was reached" : "recording each node as it was left"}.`,
    "closeness.sampled": (text) =>
        `Estimated from ${text("sources")} sampled sources of ${text("nodes")} nodes, over the graph read as undirected: each node's distances are summed to those sources only, unscaled, so multiply by ${text("sources")} / ${text("nodes")} to estimate the exact score.`,
    "closeness.exact": () => "Distances are exact, measured over the graph read as undirected.",
    "closeness.hop-distances": () => "Distance counts edges; edge weights are not read.",
    "closeness.reciprocal": () =>
        "A score is the reciprocal of the total distance to the nodes this one can reach, with no correction for how many that is, so a node in a small component scores as though it reached the whole graph.",
    "clustering-coefficient.local": () =>
        "Each node's value is its local clustering coefficient: the share of the pairs of its neighbours that are joined by an edge. A node with fewer than two neighbours scores 0.",
    "clustering-coefficient.simple": () =>
        "The graph is read as simple and undirected: direction is ignored, parallel edges count once and self-loops not at all.",
    "components.weak": () => "Strength: weak. An edge joins its two nodes whichever way it was declared.",
    "components.strong": () => "Strength: strong. Two nodes share a piece only when a directed path runs each way.",
    "components.undirected-strong": () =>
        "The graph is undirected: every edge runs both ways, so the pieces are its connected ones.",
    "degree.as-declared": () =>
        "Counted over the graph as the records declared it, so a node's total is its incoming edges plus its outgoing ones.",
    "eigenvector.converged": (text) =>
        `Power iteration reached a tolerance of ${text("tolerance")} within ${text("maxIterations")} passes.`,
    "eigenvector.scored-by": (_, params) =>
        params.mode === "in"
            ? "A node is scored by the nodes whose edges point at it."
            : "A node is scored by the nodes its edges point at.",
    "floyd-warshall.eccentricity": () =>
        "Every pair was measured. Each node's value is its eccentricity: the distance to the furthest node it can reach.",
    "flow.ends": (text) => `Flow from ${text("source")} to ${text("sink")}.`,
    "flow.ends-chosen": () =>
        "The source or sink was chosen automatically (the first and last node); " +
        "set the source and sink options to measure between the nodes you mean.",
    "flow.no-path": (text) =>
        `There is no directed path from ${text("source")} to ${text("sink")}, so no flow can run.`,
    "girvan-newman.no-cut": () => "No edge could be cut, so every node is its own community.",
    "girvan-newman.best-of": (text) => `Kept the best of ${text("cuts")} successive cuts.`,
    "hierarchical.hop-distances": () => "Distances are hop counts; edge weights are not read.",
    "hierarchical.fewer-clusters": (text) =>
        `${text("asked")} clusters were asked for; the graph allows ${text("allowed")}.`,
    "hits.published-score": (text) => HITS_SCORES[text("mode")] ?? text("mode"),
    "hits.unit-length": () =>
        "The hub and authority vectors each have unit length, which is how the iteration leaves them.",
    "hits.max-scaled": () => "The hub and authority vectors were each divided by their own highest score.",
    "k-core.undirected": () => "Counted over the graph read as undirected; edge weights are not read.",
    "k-core.loops-and-parallels": () =>
        "A self-loop does not count toward its node's core number, and parallel edges count once.",
    "katz.attenuation": (text) =>
        `Every node starts with a base influence of ${text("beta")}, and a path of length k contributes ${text("alpha")} to the power k.`,
    "katz.direction": (text) => KATZ_DIRECTIONS[text("mode")] ?? text("mode"),
    "link-prediction.candidates": () =>
        "Only pairs that are not already joined, and that share at least one neighbour, are scored.",
    "matching.not-bipartite": () => "The graph does not have two sides, so nothing could be paired up.",
    "matching.partnered": (text) => `${text("count")} of the two sides' nodes found a partner.`,
    "min-cut.karger": () =>
        "Karger's method is randomised: it finds the cheapest cut with high probability, not certainty.",
    "min-cut.sides": (text) => `The cut separates ${text("first")} nodes from ${text("second")}.`,
    "min-cut.end-chosen": (text) =>
        `Only one end was set, so the other was chosen automatically (cut between ${text("source")} and ${text("sink")}); ` +
        "set both source and sink to cut between the nodes you mean.",
    "negative-cycle.no-distance": () =>
        "The graph has a negative cycle, so no distance is defined and none was published.",
    "negative-cycle.no-route": () =>
        "A loop that costs less every time round was found, so no distance past it is meaningful and no route is marked.",
    "pagerank.damping": (text) =>
        `A reader follows a link with probability ${text("dampingFactor")} and jumps to a random node otherwise.`,
    "pagerank.sums-to-one": () => "The ranks sum to 1 across the graph.",
    "pagerank.undirected": () => "The graph is undirected, so every edge carries rank both ways.",
    "pagerank.personalized": () =>
        "The random jump lands on the personalization vector's nodes, in proportion to their values.",
    "pagerank.personalization-unmatched": () =>
        "No personalization entry gives a node of this graph a positive share, so the random jump lands on any node.",
    "pagerank.personalization-outside": (text, params) =>
        `${text("count")} personalization ${params.count === 1 ? "entry names a node" : "entries name nodes"} outside this graph, left out of the random jump.`,
};

/** The English sentence the deprecated {@link Caveats.partialReason} carries for each code. */
const PARTIAL_SENTENCES: Readonly<Record<PartialCode, (text: Text, params: CodedFact["params"]) => string>> = {
    "partial.iteration-cap": () => "iteration cap reached",
    "partial.time-box": (text) => `Stopped after the ${text("ms")} ms time box and published what was computed.`,
    "partial.canceled": (text, params) =>
        typeof params.reason === "string" ? params.reason : `Run "${text("runId")}" was canceled.`,
    "partial.stopped": () => "Stopped before every element was measured.",
    "partial.batch-incomplete": (text) => `${text("completed")} of ${text("total")} members finished.`,
};

/**
 * A count and its noun, plural unless the count is exactly one.
 * @param count - How many.
 * @param noun - The singular.
 * @returns The phrase, such as "4 nodes".
 */
function counted(count: CodedFactParam | undefined, noun: string): string {
    return `${String(count)} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * Word one fact with a sentence table.
 * @param table - The sentences by code.
 * @param fact - The fact.
 * @returns The sentence.
 */
function word<Code extends string>(
    table: Readonly<Record<Code, (text: Text, params: CodedFact["params"]) => string>>,
    fact: CodedFact<Code>,
): string {
    return table[fact.code]((name) => String(fact.params[name]), fact.params);
}

/**
 * The English sentence the deprecated {@link Caveats.notes} carries for one fact.
 * @param fact - The fact.
 * @returns The sentence.
 */
export function caveatSentence(fact: CodedFact<CaveatCode>): string {
    return word(CAVEAT_SENTENCES, fact);
}

/**
 * The English sentence the deprecated {@link Caveats.partialReason} carries for one cause.
 * @param fact - The cause.
 * @returns The sentence.
 */
export function partialSentence(fact: CodedFact<PartialCode>): string {
    return word(PARTIAL_SENTENCES, fact);
}

/**
 * A caveat fact, frozen with its parameters.
 * @param code - What it says.
 * @param params - The values it is about.
 * @returns The fact.
 */
export function caveat(code: CaveatCode, params: Readonly<Record<string, CodedFactParam>> = {}): CodedFact<CaveatCode> {
    return Object.freeze({ code, params: Object.freeze({ ...params }) });
}

/**
 * The facts a run's caveats carry and the English sentences worded from them, ready to spread into
 * a `Caveats`.
 * @param facts - The facts, in the order a reader reads them.
 * @returns `facts` and `notes`.
 */
export function noted(facts: readonly CodedFact<CaveatCode>[]): {
    readonly facts: readonly CodedFact<CaveatCode>[];
    readonly notes: readonly string[];
} {
    return { facts: Object.freeze([...facts]), notes: Object.freeze(facts.map(caveatSentence)) };
}
