/**
 * @file What a run's caveats say, as codes with their values.
 *
 * graphty-element does not write sentences for a reader: a run's caveats carry each remark as a
 * {@link CodedFact}, and an application words it.
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
 * - `groups.split` -- on a re-run, which keeps each group's number on the group sharing most of
 *   its members, an old group's members now mostly fill new groups as well:
 *   `{ field, group, into }`, the field, the number the group kept, and the new groups' numbers.
 * - `groups.merged` -- on a re-run, old groups' members now mostly sit in one group, which kept
 *   another number: `{ field, group, from }`, the field, the number it kept, and the numbers of
 *   the groups that merged into it.
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
 * - `direction.mixed` -- the graph mixes directed and undirected edges, and the run read every
 *   edge alike, with the graph's default direction: `{ directed }`, true when it read them as
 *   directed.
 * - `input.empty` -- the graph held nothing for the algorithm to measure.
 * - `sampled.instead-of-exact` -- the run sampled rather than computed exactly: `{ method, name,
 *   sampleSize, nodes }`, the approximate method's id and catalog name, the sample, and the
 *   nodes it was drawn from.
 * - `sampled.exact-past-cap` -- an exact run was estimated past the cost cap, so the approximate
 *   method ran: `{ seconds, cap }`.
 * - `sampled.still-past-cap` -- the sampled run is itself estimated past the cap: `{ seconds,
 *   cap }`.
 *
 * About a run of an algorithm registered with `defineAlgorithm`, whose catalog key is
 * `algorithm`:
 *
 * - `defined.nothing-measured` -- the function returned no number for any element it was asked
 *   about: `{ algorithm, kind }`, `"node"` or `"edge"`.
 * - `defined.long-task` -- the function held the page for longer than `ms` at a time:
 *   `{ algorithm, member, ms }`, the definition's member (`"node"`, `"edge"`, `"nodes"` or
 *   `"groups"`) and the limit in milliseconds.
 * - `defined.inputs-read` -- the paths the run read: `{ algorithm, targets, paths }`, two lists of
 *   the same length, each target `"node"` or `"edge"` with the path read on it.
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
    | "groups.split"
    | "groups.merged"
    | "paths.counted-exactly"
    | "paths.hop-lengths"
    | "tree.edge-count"
    | "scope.whole-graph"
    | "scope.induced-subgraph"
    | "scope.subgraph"
    | "parallel-edges.merged"
    | "direction.mixed"
    | "input.empty"
    | "defined.nothing-measured"
    | "defined.long-task"
    | "defined.inputs-read"
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

/**
 * A caveat fact, frozen with its parameters.
 * @param code - What it says.
 * @param params - The values it is about.
 * @returns The fact.
 */
export function caveat(code: CaveatCode, params: Readonly<Record<string, CodedFactParam>> = {}): CodedFact<CaveatCode> {
    return Object.freeze({ code, params: Object.freeze({ ...params }) });
}

/** The notes of a run that wrote none. */
const NO_NOTES: readonly string[] = Object.freeze([]);

/**
 * The facts a built-in run's caveats carry, frozen and ready to spread into a `Caveats`, with no
 * notes: a built-in algorithm writes none.
 * @param facts - The facts, in the order a reader reads them.
 * @returns `facts`, and `notes` empty.
 */
export function noted(facts: readonly CodedFact<CaveatCode>[]): {
    readonly facts: readonly CodedFact<CaveatCode>[];
    readonly notes: readonly string[];
} {
    return { facts: Object.freeze([...facts]), notes: NO_NOTES };
}
