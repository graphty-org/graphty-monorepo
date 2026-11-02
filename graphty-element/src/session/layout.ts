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

import { dotFileLayout, type FileLayout } from "@graphty/graph-io";

import { LAYOUT_DESCRIPTORS } from "../catalog/layouts";
import type { LayoutDescriptor, LayoutId } from "../catalog/types";
import { GRAPHVIZ_NODE_BUDGETS, graphvizLayoutId, isGraphvizEngine } from "../layout/graphviz/engines";
import { DEFAULT_LIMITS } from "./limits";
import type { CodedFact } from "./shared";
import type { GraphStatistics } from "./types";

/** Which arrangement suits this graph, and why. */
export interface LayoutRecommendation {
    /**
     * The arrangement, exactly as `catalog.layouts()` publishes it.
     *
     * `layout.id` is the public arrangement name -- `"force"`, `"circular"` -- and `layout.engine`
     * is the registered engine that runs it by default. `setLayout` takes either, so a consumer
     * acts on the id: `element.setLayout(recommendation.layout.id)`.
     */
    readonly layout: LayoutDescriptor;
    /**
     * Why this arrangement suits this graph, as an English sentence.
     * @deprecated English written by the element. Word {@link LayoutRecommendation.fact}
     *   yourself; removed in the next major release.
     */
    readonly reason: string;
    /**
     * Why this arrangement suits this graph, as a code for the application to word. See
     * {@link LayoutRecommendationCode} for every code and its parameters.
     * @since 3.20.0
     */
    readonly fact: CodedFact<LayoutRecommendationCode>;
    /**
     * The options to pass with the layout, when the rule read them from the file: for a Graphviz
     * file, its graph attributes as `{ attributes }`; for a DOT file that places every node, with
     * the Graphviz package installed, `{ edgeRoutes: "graphviz", graphvizAttributes }`, so Graphviz
     * routes the edges round the placed nodes. Absent when the layout's defaults apply.
     * @since 3.29.0
     */
    readonly options?: Readonly<Record<string, unknown>>;
}

/**
 * Which rule chose a {@link LayoutRecommendation}, as the `code` of its `fact`. The application
 * words it; graphty-element writes no sentence for it. Every code carries the same `params`, the
 * shape the rule read: `nodeCount`, `edgeCount`, `placedNodes` (how many nodes the data placed;
 * zero when the caller did not say) and `largeGraphThreshold`.
 *
 * | Code | Why |
 * | --- | --- |
 * | `recommend.fixed` | Every node already carries a coordinate, so the arrangement the data arrived with is kept |
 * | `recommend.location-map` | The nodes carry geographic locations (`locations` was true), so they are drawn on a map (since 3.31.0) |
 * | `recommend.random` | The graph is larger than `largeGraphThreshold`, so it is scattered from a seed instead of settling a force simulation |
 * | `recommend.circular` | Nothing is connected, so a ring puts the nodes in a readable order where a force layout has no pull to work with |
 * | `recommend.force` | Connected nodes pulled together and unconnected ones pushed apart shows the graph's structure |
 * | `recommend.first-servable` | No rule named an arrangement the catalogue can serve, so this is the first one that can place a graph this size |
 * | `recommend.graphviz-file` | The file is a Graphviz file with no coordinates, so it is drawn by the engine it names (its `layout` attribute, or dot); `params.engine` names it |
 * | `recommend.graphviz-unavailable` | The file asked for a Graphviz engine but `@hpcc-js/wasm-graphviz` is not installed, so the arrangement the next rule chose is used; `params.engine` names the engine it asked for |
 *
 * New codes may be added in a minor release: word an unknown one generically.
 * @since 3.20.0
 */
export type LayoutRecommendationCode =
    | "recommend.fixed"
    | "recommend.location-map"
    | "recommend.random"
    | "recommend.circular"
    | "recommend.force"
    | "recommend.first-servable"
    | "recommend.graphviz-file"
    | "recommend.graphviz-unavailable";

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
    /**
     * What the loaded file said about the whole graph. A file whose `layout` names Graphviz and
     * which has no coordinates is drawn by the Graphviz program it names. Omitted, nothing is known
     * about the file.
     *
     * `layout` is graph-io's fact (`importer.layout(snapshot)`, since 3.35.0). Without it, the
     * layout is read from `format` and the graph-level `attributes` as a DOT file's (`format:
     * "dot"`; `layout`, `rankdir`, ...).
     * @since 3.29.0
     */
    readonly file?: {
        readonly format?: string;
        readonly attributes?: Readonly<Record<string, unknown>>;
        readonly layout?: FileLayout;
    };
    /**
     * Whether the Graphviz layouts can run here (`graphvizAvailability()`). Omitted counts as not
     * available.
     * @since 3.29.0
     */
    readonly graphvizAvailable?: boolean;
    /**
     * Whether the nodes carry geographic locations the location map layout can read (its cost
     * estimate is available). `GraphSession.recommendLayout()` answers this itself. Omitted counts
     * as no.
     * @since 3.31.0
     */
    readonly locations?: boolean;
}

/** The graph attributes Graphviz's routes between placed nodes follow: the kind of line, and how far they keep from the nodes. */
const ROUTE_ATTRIBUTES = ["splines", "sep", "esep"] as const;

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
    /** The code the recommendation carries when this rule wins. */
    readonly code: LayoutRecommendationCode;
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
    /** Whether the nodes carry geographic locations. */
    readonly locations: boolean;
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
        code: "recommend.fixed",
        fires: ({ statistics, placedNodes }) => statistics.nodeCount > 0 && placedNodes >= statistics.nodeCount,
        reason:
            "Every node already carries a coordinate, so this keeps the arrangement the data " +
            "arrived with instead of computing a new one over the top of it.",
    },
    {
        id: "location-map",
        code: "recommend.location-map",
        fires: ({ statistics, locations }) => statistics.nodeCount > 0 && locations,
        reason: "The nodes carry geographic locations, so they are drawn where they are, on a map.",
    },
    {
        id: "random",
        code: "recommend.random",
        fires: ({ statistics, largeGraphThreshold }) => statistics.nodeCount > largeGraphThreshold,
        reason:
            "This graph is large enough that settling a force simulation would hold the frame for " +
            "a long time, so it is scattered from a seed instead: instant, and the same every time.",
    },
    {
        id: "circular",
        code: "recommend.circular",
        fires: ({ statistics }) => statistics.nodeCount > 0 && statistics.edgeCount === 0,
        reason:
            "Nothing is connected, so a force layout has no pull to work with and would push every " +
            "node equally far from every other. A ring puts them in a readable order instead.",
    },
    {
        id: "force",
        code: "recommend.force",
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
    // An engine that needs an optional package is recommended only by the rule that checked it is there.
    if (descriptor.structuralInputs.length > 0 || descriptor.requires?.package !== undefined) {
        return false;
    }

    return descriptor.sizeRating === "any" || nodeCount <= descriptor.sizeRating;
}

/**
 * The recommendation's fact: the winning rule's code and the shape every rule read.
 * @param code - The winning rule's code.
 * @param input - The shape the rules read.
 * @returns The fact.
 */
function factOf(code: LayoutRecommendationCode, input: RuleInput): CodedFact<LayoutRecommendationCode> {
    return {
        code,
        params: {
            nodeCount: input.statistics.nodeCount,
            edgeCount: input.statistics.edgeCount,
            placedNodes: input.placedNodes,
            largeGraphThreshold: input.largeGraphThreshold,
        },
    };
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
 *     await element.setLayout(advice.layout.id);
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
        locations: options.locations === true,
    };
    const placesAll = statistics.nodeCount > 0 && input.placedNodes >= statistics.nodeCount;
    if (placesAll) {
        return withGraphvizRoutes(recommendByRules(input), options, statistics);
    }

    const layout = fileLayoutOf(options.file);
    const engine = graphvizEngineOf(layout);
    if (layout !== null && engine !== null) {
        const params = { ...factOf("recommend.graphviz-file", input).params, engine };
        const descriptor = LAYOUT_DESCRIPTORS.find((candidate) => candidate.id === graphvizLayoutId(engine));
        if (options.graphvizAvailable !== true) {
            const next = recommendByRules(input);
            return next === undefined
                ? undefined
                : Object.freeze({ ...next, fact: { code: "recommend.graphviz-unavailable" as const, params } });
        }

        if (descriptor !== undefined && statistics.nodeCount <= GRAPHVIZ_NODE_BUDGETS[engine]) {
            return Object.freeze({
                layout: descriptor,
                reason: "The file is a Graphviz file with no coordinates, so it is drawn by the engine it names.",
                fact: { code: "recommend.graphviz-file" as const, params },
                ...graphvizFileOptions(layout.settings, layout.ownFormat),
            });
        }
    }

    return recommendByRules(input);
}

/**
 * The options a Graphviz file is drawn with: its layout settings, and for a file in Graphviz's own format, whose nodes
 * carry the attributes Graphviz sizes them by, nodes at the size Graphviz gives them, as Graphviz lays the file out itself.
 * @param settings - the file's layout settings
 * @param ownFormat - whether the file is in Graphviz's own format
 * @returns the recommendation's `options`, or nothing when there are none
 */
function graphvizFileOptions(
    settings: Readonly<Record<string, string>>,
    ownFormat: boolean,
): { options?: Readonly<Record<string, unknown>> } {
    const options = {
        ...(Object.keys(settings).length === 0 ? {} : { attributes: { ...settings } }),
        ...(ownFormat ? { nodeSize: "label" } : {}),
    };
    return Object.keys(options).length === 0 ? {} : { options: Object.freeze(options) };
}

/**
 * The Graphviz engine a file asks for: the program its layout names, or dot for a program this element does not run.
 * @param file - what the file said about the graph
 * @returns the engine, or null when the file asks for no Graphviz layout
 */
export function graphvizEngineFor(file: LayoutRecommendationOptions["file"]): GraphvizEngineName | null {
    return graphvizEngineOf(fileLayoutOf(file));
}

/**
 * The Graphviz engine a file's layout names.
 * @param layout - the file's layout
 * @returns the engine, or null when the layout is not Graphviz's
 */
function graphvizEngineOf(layout: FileLayout | null): GraphvizEngineName | null {
    if (layout?.tool !== "graphviz") {
        return null;
    }

    return isGraphvizEngine(layout.program) ? layout.program : "dot";
}

/**
 * The layout a file asks for: graph-io's fact when the caller passed it, else read from a caller's
 * `{ format, attributes }` as graph-io reads a DOT file's graph attributes, as this option was
 * read before the fact existed: a DOT file, or another file whose `layout` names a Graphviz engine.
 * @param file - what the file said about the graph
 * @returns the layout, or null when the file asks for none
 */
function fileLayoutOf(file: LayoutRecommendationOptions["file"]): FileLayout | null {
    if (file?.layout !== undefined) {
        return file.layout;
    }

    const attributes = file?.attributes ?? {};
    if (file?.format === "dot") {
        return dotFileLayout(attributes);
    }

    return isGraphvizEngine(attributes.layout) ? { ...dotFileLayout(attributes), ownFormat: false } : null;
}

/**
 * A DOT file that places every node is drawn where it says, and when its edges store no route
 * Graphviz routes them round those places, as Graphviz draws such a file (`neato -n2`): the fixed
 * layout with `edgeRoutes: "graphviz"` and the file's graph attributes (its `splines`).
 * @param advice - the rule table's recommendation
 * @param options - what the caller said about the file and the Graphviz package
 * @param statistics - the graph's shape
 * @returns the recommendation, with the routing options when they apply
 */
function withGraphvizRoutes(
    advice: LayoutRecommendation | undefined,
    options: LayoutRecommendationOptions,
    statistics: GraphStatistics,
): LayoutRecommendation | undefined {
    const layout = fileLayoutOf(options.file);
    const routed =
        advice?.layout.id === "fixed" &&
        layout?.tool === "graphviz" &&
        layout.ownFormat &&
        options.graphvizAvailable === true &&
        statistics.edgeCount > 0 &&
        statistics.nodeCount <= GRAPHVIZ_NODE_BUDGETS.neato;
    return routed
        ? Object.freeze({
              ...advice,
              options: Object.freeze({
                  edgeRoutes: "graphviz",
                  graphvizAttributes: routeSettings(layout.settings),
              }),
          })
        : advice;
}

/** The engine names `graphvizEngineFor` answers. */
type GraphvizEngineName = Parameters<typeof graphvizLayoutId>[0];

/**
 * The layout settings Graphviz's routes between placed nodes follow.
 * @param settings - the file's layout settings
 * @returns the ones passed on
 */
function routeSettings(settings: Readonly<Record<string, string>>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const name of ROUTE_ATTRIBUTES) {
        const value = settings[name];
        if (value !== undefined) {
            out[name] = value;
        }
    }

    return out;
}

/**
 * The rule table's recommendation.
 * @param input - the shape the rules read
 * @returns the recommendation, or undefined when nothing can be served
 */
function recommendByRules(input: RuleInput): LayoutRecommendation | undefined {
    const { statistics } = input;

    for (const rule of LAYOUT_RULES) {
        if (!rule.fires(input)) {
            continue;
        }

        const descriptor = LAYOUT_DESCRIPTORS.find((candidate) => candidate.id === rule.id);

        if (descriptor !== undefined && servable(descriptor, statistics.nodeCount)) {
            return Object.freeze({ layout: descriptor, reason: rule.reason, fact: factOf(rule.code, input) });
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
              fact: factOf("recommend.first-servable", input),
          });
}
