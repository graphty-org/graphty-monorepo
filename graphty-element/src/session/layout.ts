/**
 * @file Which arrangement suits a graph, decided from the graph's own shape and the layout
 * catalogue.
 *
 * The decision belongs to the element because both halves of it do. The shape -- how many nodes,
 * how many edges, how many of them already carry a coordinate -- is a fact about the graph, and
 * which arrangements exist, what each one costs at a given size and what extra input each one
 * needs are facts about this package's own catalogue. A consumer that made this call itself would
 * be holding a copy of both, and the copy would fall out of step the first time the element gained
 * or lost an engine.
 *
 * THE RULE READS THE CATALOGUE. Every arrangement a rule names is looked up in
 * `LAYOUT_DESCRIPTORS` before it is recommended, and one that is missing, that needs an input the
 * caller has not supplied, or that the catalogue rates below this graph's size is skipped for the
 * next rule. So a catalogue edit changes what is recommended instead of producing a recommendation
 * the element cannot serve.
 *
 * WHAT "CANNOT SERVE" MEANS HERE, precisely: an arrangement whose descriptor declares a
 * `structuralInputs` entry needs something this function was not given -- a root node, a
 * partition, an ordering -- and its engine refuses without it. `bfs` is the plain case: its
 * configuration requires a `start` node and has no default, so `setLayout("bfs")` on its own
 * throws. Recommending one of those would hand a consumer a name that does not work.
 */

import { LAYOUT_DESCRIPTORS } from "../catalog/layouts";
import type { LayoutDescriptor, LayoutId } from "../catalog/types";
import { DEFAULT_LIMITS } from "./limits";
import type { GraphStatistics } from "./types";

/** Which arrangement suits this graph, and why. */
export interface LayoutRecommendation {
    /**
     * The arrangement, exactly as `catalog.layouts()` publishes it.
     *
     * `layout.id` is the public arrangement name -- `"force"`, `"circular"` -- and `layout.engine`
     * is the registered engine name `setLayout` takes. A consumer needs the second in order to
     * act: `element.setLayout(recommendation.layout.engine)`.
     */
    readonly layout: LayoutDescriptor;
    /** Why this arrangement suits this graph, in a sentence a consumer can show a reader. */
    readonly reason: string;
}

/** What {@link recommendLayout} may be told beyond the graph's shape. */
export interface LayoutRecommendationOptions {
    /**
     * How many nodes THE DATA arrived carrying a coordinate for, from `session.seededNodeCount`.
     *
     * NOT `positions.placedCount`, and the difference decides this whole recommendation. The
     * position array is written by the importer AND by every running layout, so one animation
     * frame after a file with no coordinates finishes loading, every node carries a position --
     * the layout put it there. Reading that number here answers "keep the arrangement the data
     * arrived with" for a file that arrived with none, and pins the graph to whatever the first
     * step of a force layout reached.
     *
     * Given and equal to the node count, the data placed every node and the arrangement that
     * keeps those coordinates wins: recomputing would throw away an arrangement somebody authored.
     * Omitted, the rule assumes nothing is placed, which is what an unseeded graph looks like.
     */
    readonly placedNodes?: number;
    /**
     * The node count above which this graph counts as large.
     *
     * Defaults to the element's own shipped `DEFAULT_LIMITS.largeGraphThreshold`. Pass the value
     * from `capabilities.limits` once something has measured the machine, so the recommendation
     * moves with the host rather than with a constant.
     */
    readonly largeGraphThreshold?: number;
}

/** One rule of the table: the arrangement it names, when it fires, and what it would say. */
interface LayoutRule {
    /** The arrangement's public name, looked up in the catalogue before it is recommended. */
    readonly id: LayoutId;
    /**
     * Whether this rule fires for this graph.
     * @param shape - The graph's shape and what the caller supplied about it.
     * @returns True when the rule claims the graph.
     */
    fires(shape: RuleInput): boolean;
    /** The sentence the recommendation carries when this rule wins. */
    readonly reason: string;
}

/** Everything the rules branch on, gathered once. */
interface RuleInput {
    /** The graph's shape. */
    readonly statistics: GraphStatistics;
    /** How many nodes carry a coordinate; zero when the caller said nothing. */
    readonly placedNodes: number;
    /** The node count above which this graph counts as large. */
    readonly largeGraphThreshold: number;
}

/**
 * The table, read top to bottom: the first rule that fires AND names an arrangement the catalogue
 * can serve at this size wins.
 *
 * The last rule fires for every graph, so the table always has an answer as long as the catalogue
 * serves the force arrangement -- which it does, at any size, with no structural input.
 */
const LAYOUT_RULES: readonly LayoutRule[] = [
    {
        id: "fixed",
        fires: ({ statistics, placedNodes }) => statistics.nodeCount > 0 && placedNodes >= statistics.nodeCount,
        reason:
            "Every node already carries a coordinate, so this keeps the arrangement the data " +
            "arrived with instead of computing a new one over the top of it.",
    },
    {
        id: "random",
        fires: ({ statistics, largeGraphThreshold }) => statistics.nodeCount > largeGraphThreshold,
        reason:
            "This graph is large enough that settling a force simulation would hold the frame for " +
            "a long time, so it is scattered from a seed instead: instant, and the same every time.",
    },
    {
        id: "circular",
        fires: ({ statistics }) => statistics.nodeCount > 0 && statistics.edgeCount === 0,
        reason:
            "Nothing is connected, so a force layout has no pull to work with and would push every " +
            "node equally far from every other. A ring puts them in a readable order instead.",
    },
    {
        id: "force",
        fires: () => true,
        reason:
            "Connected nodes are pulled together and unconnected ones pushed apart, which is the " +
            "arrangement that shows this graph's structure without being told anything about it.",
    },
];

/**
 * Whether the catalogue can serve an arrangement for a graph this size with no further input.
 *
 * Two tests, and they mean different things. `structuralInputs` is a CAPABILITY question: the
 * engine needs a root, a partition or an ordering that nobody has supplied, and it refuses without
 * one. `sizeRating` is the catalogue's own advice -- the largest graph the default engine is
 * recommended for -- so an arrangement rated below this graph is passed over for the next rule
 * rather than recommended with a caveat nobody reads.
 * @param descriptor - The arrangement.
 * @param nodeCount - How many nodes it would have to place.
 * @returns True when it can be recommended as it stands.
 */
function servable(descriptor: LayoutDescriptor, nodeCount: number): boolean {
    if (descriptor.structuralInputs.length > 0) {
        return false;
    }

    return descriptor.sizeRating === "any" || nodeCount <= descriptor.sizeRating;
}

/**
 * Which arrangement suits this graph.
 *
 * It never names an arrangement the element cannot serve: every candidate is resolved against the
 * layout catalogue and skipped if it is missing, if it needs an input the caller has not supplied,
 * or if the catalogue rates it below this graph's size.
 * @param statistics - The graph's shape, from `session.data.statistics()`.
 * @param options - How many nodes carry a coordinate, and the large-graph threshold to use.
 * @returns The recommendation, or undefined when the catalogue serves no arrangement that needs no
 *     further input -- which the shipped catalogue always does, so a consumer sees this only after
 *     the catalogue has been cut down.
 * @example
 * ```ts
 * const advice = recommendLayout(session.data.statistics(), {
 *     placedNodes: session.positions.placedCount,
 * });
 *
 * if (advice !== undefined) {
 *     await element.setLayout(advice.layout.engine);
 * }
 * ```
 */
export function recommendLayout(
    statistics: GraphStatistics,
    options: LayoutRecommendationOptions = {},
): LayoutRecommendation | undefined {
    const input: RuleInput = {
        statistics,
        placedNodes: options.placedNodes ?? 0,
        largeGraphThreshold: options.largeGraphThreshold ?? DEFAULT_LIMITS.largeGraphThreshold,
    };

    for (const rule of LAYOUT_RULES) {
        if (!rule.fires(input)) {
            continue;
        }

        const descriptor = LAYOUT_DESCRIPTORS.find((candidate) => candidate.id === rule.id);

        if (descriptor !== undefined && servable(descriptor, statistics.nodeCount)) {
            return Object.freeze({ layout: descriptor, reason: rule.reason });
        }
    }

    // Every rule named an arrangement the catalogue could not serve, which the shipped catalogue
    // never does. Anything servable beats answering nothing, because a consumer with no
    // recommendation has to invent one, and an invented one is the copy this function exists to
    // stop.
    const fallback = LAYOUT_DESCRIPTORS.find((candidate) => servable(candidate, statistics.nodeCount));

    return fallback === undefined
        ? undefined
        : Object.freeze({
              layout: fallback,
              reason: "The first arrangement this element can place a graph of this size with.",
          });
}
