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
 * 2. It does not ask for suggested styles. `applySuggestedStyles` would paint Louvain's
 *    own okabeIto layer, whose palette cycles modulo 8 and would therefore give group 8
 *    the same colour as group 0 -- the exact thing the design's "N largest, rest neutral"
 *    rule forbids. The encoding this slice paints is built by the defaults module from
 *    the group sizes returned here.
 *
 * App shell progressive disclosure design, section 7 "Novice path".
 */

import { type ElementGraph, readResultPath } from "./elementBridge";

/** graphty-element's registry coordinates for the two algorithms this slice runs. */
export const DEGREE_NAMESPACE = "graphty";

/** @see DEGREE_NAMESPACE */
export const DEGREE_TYPE = "degree";

/** @see DEGREE_NAMESPACE */
export const COMMUNITY_NAMESPACE = "graphty";

/** @see DEGREE_NAMESPACE */
export const COMMUNITY_TYPE = "louvain";

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
}

/** What a community run yields -- exactly what the community reading needs. @public */
export interface CommunityRunResult {
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
 * Runs the degree pass and reads it back.
 * @param graph - the element graph to run on.
 * @returns the readings, highest degree first.
 */
export async function runDegreePass(graph: ElementGraph): Promise<DegreeResults> {
    await graph.runAlgorithm(DEGREE_NAMESPACE, DEGREE_TYPE);

    return readDegreeResults(graph);
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
    await graph.runAlgorithm(COMMUNITY_NAMESPACE, COMMUNITY_TYPE);

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
        groupCount: groups.length,
        largestGroupSize: groups.length > 0 ? groups[0].size : 0,
        ...(isFiniteNumber(modularity) ? { modularity } : {}),
        nodeCount,
        groups,
    };
}
