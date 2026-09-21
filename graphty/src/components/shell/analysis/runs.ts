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

import type { RunId } from "@graphty/graphty-element/session";

import { type ElementGraph, readResultPath } from "./elementBridge";

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
    /** Just the degrees, highest first -- what `labelDegreeThreshold` takes. */
    readonly degreesDescending: readonly number[];
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

/**
 * Whether a value read back off the element is a number a reading can print.
 * @param value - the value at a result path.
 * @returns true when it is a finite number.
 */
function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * Compares two ids as a stable tie-break, so equal degrees and equal group sizes come
 * back in the same order on every run.
 * @param a - one id.
 * @param b - the other id.
 * @returns the usual negative, zero or positive ordering.
 */
function compareIds(a: string, b: string): number {
    if (a === b) {
        return 0;
    }

    return a < b ? -1 : 1;
}

/**
 * Reads a degree pass that has already run, without running one.
 *
 * A node with no numeric degree is skipped rather than read as 0: the pass either
 * reached it or it did not, and a fabricated zero would sit at the bottom of the label
 * ranking claiming to have been measured. maxDegree comes from the readings themselves
 * rather than from the graph-level maxDegree result, so one source answers every
 * question this function is asked.
 * @param graph - the element graph whose nodes carry the results.
 * @returns the readings, highest degree first.
 */
export function readDegreeResults(graph: ElementGraph): DegreeResults {
    const raw: { id: string; degree: number; storedPct: number | undefined }[] = [];

    for (const node of graph.getNodes()) {
        const degree = readResultPath(node.algorithmResults, [DEGREE_NAMESPACE, DEGREE_TYPE, "degree"]);
        if (!isFiniteNumber(degree)) {
            continue;
        }

        const storedPct = readResultPath(node.algorithmResults, [DEGREE_NAMESPACE, DEGREE_TYPE, "degreePct"]);
        raw.push({
            id: String(node.id),
            degree,
            storedPct: isFiniteNumber(storedPct) ? storedPct : undefined,
        });
    }

    raw.sort((a, b) => (b.degree === a.degree ? compareIds(a.id, b.id) : b.degree - a.degree));

    const maxDegree = raw.length > 0 ? raw[0].degree : 0;
    const byDegreeDescending: DegreeReading[] = raw.map((reading) => ({
        id: reading.id,
        degree: reading.degree,
        degreePct: reading.storedPct ?? (maxDegree > 0 ? reading.degree / maxDegree : 0),
    }));

    return {
        byDegreeDescending,
        maxDegree,
        degreesDescending: byDegreeDescending.map((reading) => reading.degree),
    };
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

    await run;

    return { ...readDegreeResults(graph), runId: run.id };
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

    await run;

    const sizes = new Map<number, number>();
    let nodeCount = 0;

    for (const node of graph.getNodes()) {
        const communityId = readResultPath(node.algorithmResults, [
            COMMUNITY_NAMESPACE,
            COMMUNITY_TYPE,
            "communityId",
        ]);
        if (!isFiniteNumber(communityId)) {
            continue;
        }

        nodeCount++;
        sizes.set(communityId, (sizes.get(communityId) ?? 0) + 1);
    }

    const groups = Array.from(sizes.entries())
        .map(([communityId, size]) => ({ communityId, size }))
        .sort((a, b) => (b.size === a.size ? a.communityId - b.communityId : b.size - a.size));

    const modularity = readResultPath(graph.getDataManager().graphResults, [
        COMMUNITY_NAMESPACE,
        COMMUNITY_TYPE,
        "modularity",
    ]);

    return {
        runId: run.id,
        groupCount: groups.length,
        largestGroupSize: groups.length > 0 ? groups[0].size : 0,
        ...(isFiniteNumber(modularity) ? { modularity } : {}),
        nodeCount,
        groups,
    };
}
