/**
 * The two algorithm runs the novice path performs, and the plain numbers they yield.
 *
 * Spec 7.2 orders the degree pass: "node size by degree on a square-root scale ... labels
 * on the top clamp(round(sqrt(n)), 5, 50) nodes by degree", and "the degree pass used
 * for size and labels runs in the background at import". Spec 7.3's first card is Find
 * groups, and 7.5 requires the community reading's "group count and modularity from
 * every grouping method".
 *
 * Two rules this module holds to:
 *
 * 1. It returns primitives. The readings module turns numbers into sentences and the
 *    defaults module turns numbers into style layers; neither imports the element, so
 *    both stay pure and testable. This module is the only place that awaits the element.
 * 2. It says, per run, whether the element may paint it. A run paints itself on its first
 *    completion -- the session derives an encoding from the result's shape -- and the two
 *    runs here want opposite things. The degree pass at import is measurement for the label
 *    cut and the Most connected card, and 7.2 does not ask a LOAD for a colour ramp, so it
 *    runs with `{ style: false }`. A community run is a reader asking to see the groups, so
 *    it paints. Both go through `session.runs.start`, which is the only door that can say
 *    which: the 1.10 `runAlgorithm` address has no way to opt out and always paints.
 *
 * App shell progressive disclosure design, section 7 "Novice path".
 */

import type { RunId, RunResult } from "@graphty/graphty-element/session";

import { METRIC_VALUE_FIELD } from "../defaults/styleDescriptors";
import type { ElementGraph } from "./elementBridge";
import {
    formatMetricDistribution,
    METRIC_DISTRIBUTION_MAX_BINS,
    type MetricDistribution,
    NODE_METRIC_DEFINITIONS,
} from "./nodeMetrics";

/** graphty-element's registry coordinates for the two algorithms this slice reads back. */
export const DEGREE_NAMESPACE = "graphty";

/** @see DEGREE_NAMESPACE */
export const DEGREE_TYPE = "degree";

/** @see DEGREE_NAMESPACE */
export const COMMUNITY_NAMESPACE = "graphty";

/** @see DEGREE_NAMESPACE */
export const COMMUNITY_TYPE = "louvain";

/** The catalogue key the degree pass is started by, which is also what its run records. */
const DEGREE_ALGORITHM = "degree";

/** The catalogue key a community run is started by. */
const COMMUNITY_ALGORITHM = "louvain";

/** The method's own name, for the run record. */
export const COMMUNITY_METHOD_NAME = "Louvain";

/** One node's degree, read back off the element. @public */
export interface DegreeReading {
    /** The node's id. */
    readonly id: string;
    /** Its degree. */
    readonly degree: number;
    /** Its degree over the graph's maximum, 0 when the maximum is 0. */
    readonly degreePct: number;
}

/** What a degree pass yields. @public */
export interface DegreeResults {
    /** Every node, highest degree first. */
    readonly byDegreeDescending: readonly DegreeReading[];
    /** The highest degree found. */
    readonly maxDegree: number;
    /**
     * The degree distribution the graph summary draws: graphty-element's own bins for the run,
     * asked for with the options the Most connected result card uses, so the two charts agree.
     */
    readonly distribution: MetricDistribution;
    /**
     * The run that measured them, when these readings came from a run started here.
     *
     * A style layer scopes itself to the run whose column it reads, so the label layer needs
     * this to name its selector. {@link readDegreeResults} reads what is already on the nodes
     * and started nothing, so it reports none.
     */
    readonly runId?: RunId;
}

/** What a community run yields -- exactly what the community reading needs. @public */
export interface CommunityRunResult {
    /** The run that produced it, which is what its style layers name. */
    readonly runId: RunId;
    /** How many groups were found. */
    readonly groupCount: number;
    /** The largest group's size. */
    readonly largestGroupSize: number;
    /** Modularity, or undefined when the element did not report it. */
    readonly modularity?: number;
    /** Nodes the run covered. */
    readonly nodeCount: number;
    /** Every group, largest first. */
    readonly groups: readonly {
        readonly communityId: number;
        readonly size: number;
    }[];
}



/** No degree pass yet: no bar, and an axis that claims no range. */
export const NO_DEGREE_DISTRIBUTION: MetricDistribution = formatMetricDistribution(
    NODE_METRIC_DEFINITIONS.degree,
    { bins: [], scale: "linear", suggestedScale: "linear", binning: "empty" },
    0,
    0,
);

/**
 * Turns graphty-element's degree result into the readings this slice carries.
 *
 * WHAT THIS USED TO DO. It walked every node and read a degree off a per-node
 * `algorithmResults` bag, then sorted and normalised the list itself. graphty-element no
 * longer writes that bag, so the read came back empty on every node and the whole load-time
 * degree pass produced nothing: no label cut, no Most connected card, no size ramp input.
 *
 * The element publishes the ordering and the extremes on the result object. `ranking("value")`
 * is sorted highest first with a printed-id tie-break, and `summary().max` is the highest
 * degree -- one source answering every question this function is asked, which is what the old
 * note about not reading the graph-level maximum was reaching for.
 *
 * `degreePct` is a share of the top degree, derived here rather than read: the element
 * publishes degree unnormalised (`normalization: "none"`), because how long to draw a bar is a
 * presentation choice and not a measurement.
 * @param result - what the degree run published.
 * @returns the readings, highest degree first.
 */
function degreeResultsFrom(result: RunResult): DegreeResults {
    const summary = result.summary();
    const maxDegree = summary.max ?? 0;
    const histogram = result.histogram(METRIC_VALUE_FIELD, { bins: METRIC_DISTRIBUTION_MAX_BINS, scale: "auto" });
    const byDegreeDescending: DegreeReading[] = result.ranking(METRIC_VALUE_FIELD).map((entry) => ({
        id: String(entry.id),
        degree: entry.value,
        degreePct: maxDegree > 0 ? entry.value / maxDegree : 0,
    }));

    return {
        byDegreeDescending,
        maxDegree,
        distribution: formatMetricDistribution(NODE_METRIC_DEFINITIONS.degree, histogram, summary.min ?? 0, maxDegree),
    };
}

/**
 * Reads a degree pass that has already run, without running one.
 *
 * The numbers live on the run rather than on the nodes, so this finds the run rather than
 * walking the graph: the most recent succeeded degree run, which is the one the label cut and
 * the size ramp were built from. No degree run yet reports nothing rather than zeros.
 * @param graph - the element graph whose session holds the runs.
 * @returns the readings, highest degree first.
 */
export function readDegreeResults(graph: ElementGraph): DegreeResults {
    const latest = graph
        .getSession()
        .runs.list()
        .filter((run) => run.algorithm === DEGREE_ALGORITHM && run.status === "succeeded")
        .at(-1);

    if (latest?.result === undefined) {
        return { byDegreeDescending: [], maxDegree: 0, distribution: NO_DEGREE_DISTRIBUTION };
    }

    return { ...degreeResultsFrom(latest.result), runId: latest.id };
}

/**
 * Runs the degree pass and reads it back, WITHOUT letting it paint.
 *
 * `{ style: false }` is the whole reason this goes through `session.runs.start` rather than
 * through the 1.10 address: a run paints itself on its first completion, and this one is
 * measurement for the label cut and the Most connected card. A load that recoloured every
 * node from a background pass would be overriding the element's own hand-tuned defaults,
 * which 7.2's colour and size layers were reverted in order to stop doing.
 * @param graph - the element graph to run on.
 * @returns the readings, highest degree first, and the run that produced them.
 */
export async function runDegreePass(graph: ElementGraph): Promise<DegreeResults> {
    const run = graph.getSession().runs.start(DEGREE_ALGORITHM, {}, { style: false });
    const result = await run;

    return { ...degreeResultsFrom(result), runId: run.id };
}

/**
 * Runs community detection and reads the statistics back.
 *
 * groupCount comes from the grouped nodes rather than from the element's own
 * groupCount graph result, so the count and the group list cannot disagree. Modularity
 * comes from the graph result, and only when it is a finite number: an older element
 * bundle that does not publish it must degrade to the reading with no banded clause,
 * never to a fabricated score.
 * @param graph - the element graph to run on.
 * @returns the group sizes, the group count and modularity when one was reported.
 */
export async function runCommunityDetection(graph: ElementGraph): Promise<CommunityRunResult> {
    /* This one PAINTS. A reader asking to see the groups is asking for the picture, and the
       session derives it from the result's shape: a categorical colour over the nodes the run
       grouped, with the palette, the legend and the swatch counts read off the same prepared
       binding the repaint painted from. The shell used to build one layer per group by hand. */
    const run = graph.getSession().runs.start(COMMUNITY_ALGORITHM);
    const result = await run;
    const summary = result.summary();

    /* The element counts the groups while it walks the result, so the sizes and the count come
       from one reading and cannot disagree -- which is what the shell used to get by counting
       the grouped nodes itself rather than trusting a graph-level number beside them. Largest
       first, ties broken by group id, so the card's "largest group" row does not reshuffle
       between two equally large groups on a re-run. */
    const groups = [...(summary.groups ?? [])]
        .map((entry) => ({ communityId: Number(entry.group), size: entry.size }))
        .sort((a, b) => (b.size === a.size ? a.communityId - b.communityId : b.size - a.size));

    /* Only a finite number is carried. Modularity is a graph-level field of the grouping shape,
       and a run that did not publish one must degrade to the reading with no banded clause
       rather than to a fabricated score. */
    const { modularity } = result.graph;

    return {
        runId: run.id,
        groupCount: groups.length,
        largestGroupSize: groups.length > 0 ? groups[0].size : 0,
        ...(typeof modularity === "number" && Number.isFinite(modularity) ? { modularity } : {}),
        nodeCount: summary.measured,
        groups,
    };
}
