/**
 * The community-result reading template (spec section 7.5, lines 5820-5828 and 5855-5859).
 *
 * "Community readings are method-independent and require group count and modularity
 * from every grouping method" (spec 5841). So this module takes group count, largest
 * group size, modularity and the group sizes -- never a method name, never a parameter,
 * never anything only Louvain knows. Label propagation, MCL and Leiden feed the same
 * template, and the method's own name belongs in the run record instead.
 *
 * The small-graph form is the one spec 5820 writes out: "4 groups found. The largest
 * has 7 members. The groups are clearly separated (modularity 0.54). Colors now show
 * groups." -- drawn verbatim, with 0.447 for the cat fixture, at
 * ExplorerAfterCard.dc.html:938.
 *
 * The many-groups form is spec 5855: "3,412 groups found. The 11 largest hold 62% of
 * nodes; the largest has 61,208 members. Colors show the 11 largest; other nodes are
 * gray." It switches above {@link COMMUNITY_MANY_GROUPS_THRESHOLD} groups, because
 * naming one largest group out of thousands says nothing about the rest.
 *
 * Two clauses are conditional on FACTS rather than on taste:
 *
 * - The banded modularity clause is dropped entirely when the method reported no
 *   modularity. An unbanded number is not one of the three legal phrasings, and
 *   GroupProfilePopout.dc.html:767 and StyleFromAnalysis.dc.html:1404 both draw the
 *   short form ("6 groups found. The largest has 118 members. Colors show groups."),
 *   so the shape is attested rather than invented.
 * - "Colors now show groups." appears only when the encoding was actually applied. A
 *   reading that claims a colour the canvas is not painting is the one failure mode
 *   this flag exists to prevent.
 *
 * `colouredGroupCount` is how many groups were PAINTED, not how many exist, so the
 * many-groups sentence describes the canvas the user is looking at.
 *
 * Pure, and no computation above O(number of groups): the share is one pass over the
 * coloured groups, and the groups arrive largest-first from the caller rather than
 * being sorted here.
 */

import { formatCount, formatModularity, formatPercent, modularityBand, modularityBandPhrase } from "./readingFormat";

/**
 * One group and its size.
 * @public
 */
export interface CommunityGroupSize {
    /** The community id the run assigned. */
    readonly communityId: number;
    /** How many nodes are in it. */
    readonly size: number;
}

/**
 * Everything the community template reads.
 * @public
 */
export interface CommunityStatistics {
    /** How many groups were found. */
    readonly groupCount: number;
    /** The largest group's size. */
    readonly largestGroupSize: number;
    /** Modularity, when the method reported it. Absent omits the whole banded clause. */
    readonly modularity?: number;
    /** Nodes the run covered. */
    readonly nodeCount: number;
    /** Every group, largest first. */
    readonly groups: readonly CommunityGroupSize[];
    /** How many groups the encoding actually painted. 0 when nothing was painted. */
    readonly colouredGroupCount: number;
    /** Whether the colour encoding was applied at all. */
    readonly encodingApplied: boolean;
}

/**
 * Above this many groups the reading switches to the top-K form (spec 5855, "Community
 * above 12 groups"). It is also the cap on {@link communityResultBody}'s rows, so the
 * body never grows past the sentence that describes it.
 */
export const COMMUNITY_MANY_GROUPS_THRESHOLD = 12;

/**
 * Pluralises a noun on a count, so a one-group, one-member run reads "1 group found.
 * The largest has 1 member." rather than the spec's plural strings ungrammatically.
 * @param count - the count the noun is attached to.
 * @param singular - the singular noun.
 * @returns the singular when the count is exactly 1, the "s" plural otherwise.
 */
function pluralise(count: number, singular: string): string {
    return count === 1 ? singular : `${singular}s`;
}

/**
 * The form spec 5820 writes out, for a graph with few enough groups that naming the
 * largest one means something.
 * @param statistics - the community statistics.
 * @returns the reading.
 */
function fewGroupsReading(statistics: CommunityStatistics): string {
    const { groupCount, largestGroupSize, modularity } = statistics;
    const sentences = [`${formatCount(groupCount)} ${pluralise(groupCount, "group")} found.`];

    /* The second sentence is the one fact that is NOT already on screen. Modularity is
       nowhere else on the surface, and it is what the W14 comprehension criterion turns
       on, so it wins the slot whenever the method reported it; the largest group's size
       takes the slot only when it did not, because the result body already lists every
       group with its size. See the sentence budget note on `communityReading`. */
    if (modularity !== undefined && Number.isFinite(modularity)) {
        sentences.push(
            `The groups are ${modularityBandPhrase(modularityBand(modularity))} (modularity ${formatModularity(modularity)}).`,
        );
    } else {
        sentences.push(`The largest has ${formatCount(largestGroupSize)} ${pluralise(largestGroupSize, "member")}.`);
    }

    return sentences.join(" ");
}

/**
 * The form spec 5855 writes out: how much of the graph the painted groups cover, then
 * the largest one's size, then what the canvas is actually showing.
 * @param statistics - the community statistics.
 * @returns the reading.
 */
function manyGroupsReading(statistics: CommunityStatistics): string {
    const { colouredGroupCount, groupCount, largestGroupSize, nodeCount } = statistics;
    let covered = 0;
    for (const group of statistics.groups.slice(0, Math.max(colouredGroupCount, 0))) {
        covered += group.size;
    }

    const share = nodeCount > 0 ? covered / nodeCount : 0;

    /* Two sentences, as above. What the canvas is showing -- "Colors show the N largest;
       other nodes are gray" -- is the legend's channel line, not the reading's third
       sentence; the shell declares that channel when it paints the groups. */
    return [
        `${formatCount(groupCount)} ${pluralise(groupCount, "group")} found.`,
        `The ${formatCount(colouredGroupCount)} largest hold ${formatPercent(share)} of nodes; the largest has ${formatCount(largestGroupSize)} ${pluralise(largestGroupSize, "member")}.`,
    ].join(" ");
}

/**
 * The community result reading (spec 7.5, lines 5820-5828 and 5855-5859).
 *
 * TWO SENTENCES, which is a narrower budget than 7.5's own worked examples take. The
 * spec legislates the limit twice -- RT-10 at line 4672 ("the reading at 12 px over 1.5,
 * at most two sentences and 220 characters") and 7.5's opening line 5794 ("one or two
 * sentences a novice can repeat back") -- and `COMPACTION-1.6.md:324` repeats it, so
 * `ProseBlock` enforces it (`READING_MAX_SENTENCES = 2`). Six of 7.5's eight templates
 * already obey it; the two community examples are the only ones that do not, at four and
 * three sentences, so they read as a drafting slip against a rule stated three times
 * rather than as an exception to it. The rule wins.
 *
 * The two sentences dropped were the two already on screen elsewhere, which is the test
 * ProseBlock's own warning names: the largest group's size is in the result body, and
 * what the colours mean is the legend's channel line (design line 201, "Color: groups,
 * categorical"). Modularity is kept because nothing else on the surface carries it.
 * @param statistics - what the grouping run reported, method-independent.
 * @returns the reading, e.g. "6 groups found. The groups are clearly separated (modularity 0.571)."
 */
export function communityReading(statistics: CommunityStatistics): string {
    if (statistics.groupCount > COMMUNITY_MANY_GROUPS_THRESHOLD) {
        return manyGroupsReading(statistics);
    }

    return fewGroupsReading(statistics);
}

/**
 * The community result's COLLAPSED headline: the one line the Results-list card draws
 * beside the run's name, e.g. "6 groups, modularity 0.447".
 *
 * WHY IT LIVES HERE, beside {@link communityReading}, rather than in the panel that draws
 * it. The collapsed line and the expanded reading are two statements about one run, and
 * spec 2200-2202 puts them on screen at the same moment -- "A result open in the inspector
 * renders its Results-list card collapsed to title, state and headline", with the full
 * reading on the inspector surface a few hundred pixels away. Assembled at the call site
 * the two would drift the first time either changed: the same defect
 * `nodeMetricHeadline` records for the node-metric card, where a collapsed line
 * reading "Main bridge: a (0)" sat beside an expanded one reading "No node sits on a
 * shortest path between two others". Built from the SAME {@link CommunityStatistics} by
 * the same module, they cannot disagree about the facts, only about how much of them
 * they have room for.
 *
 * IT IS A HEADLINE, NOT A SENTENCE. No full stop, no verb, no clause about what the
 * colours mean: it is a fragment drawn after a run's name on one 32px row, where the
 * reading is prose in a block that has room to be prose. That is also why it keeps the
 * fact the reading spends its second sentence on -- modularity, which is nowhere else on
 * either surface -- and drops the ones that are already drawn beside it.
 *
 * THREE FORMS, and each one is a fact rather than a preference:
 *
 * - No groups at all reads "No groups". A run that found nothing may not print "0 groups,
 *   modularity 0.000": the modularity of no partition is not a measurement, and a headline
 *   that prints one asserts an outcome nothing computed (spec 7415-7418).
 * - With modularity, it is named, at the SAME three decimals {@link formatModularity}
 *   gives the reading. A headline rounding to two while the reading shows three would
 *   read as two different numbers for one run.
 * - Without it -- a method that reports no modularity -- the largest group's size takes
 *   the slot instead, exactly as {@link fewGroupsReading} does with its second sentence,
 *   so the two surfaces fall back to the same fact rather than to two different ones.
 *
 * Pure, and no computation at all beyond formatting what it was handed.
 * @param statistics - what the grouping run reported, method-independent.
 * @returns the headline, e.g. "6 groups, modularity 0.447", "6 groups, largest 118 members", "No groups".
 */
export function communityHeadline(statistics: CommunityStatistics): string {
    const { groupCount, largestGroupSize, modularity } = statistics;

    if (groupCount <= 0) {
        return "No groups";
    }

    const groups = `${formatCount(groupCount)} ${pluralise(groupCount, "group")}`;

    if (modularity !== undefined && Number.isFinite(modularity)) {
        return `${groups}, modularity ${formatModularity(modularity)}`;
    }

    return `${groups}, largest ${formatCount(largestGroupSize)} ${pluralise(largestGroupSize, "member")}`;
}

/**
 * One row of the result body.
 * @public
 */
export interface CommunityBodyRow {
    /** The group's name, e.g. "Group 1". */
    readonly name: string;
    /** Its size, e.g. "7 members". */
    readonly value: string;
}

/**
 * The result body: one row per group, largest first, capped at
 * {@link COMMUNITY_MANY_GROUPS_THRESHOLD}.
 *
 * Rows are named by RANK, not by community id -- "Group 1" is the largest group, which
 * is how every board labels them (RunRecordPopout.dc.html:403-406, CategoryTable.dc.html:56:
 * "they keep their instance labels Group 1 to Group 6 ... because those are the
 * result's own"). The "links inside" column spec 5828 names is not built here: it needs
 * per-group internal edge counts, which no run reports yet.
 * @param statistics - the community statistics, groups largest first.
 * @returns one row per group, up to the cap.
 */
export function communityResultBody(statistics: CommunityStatistics): readonly CommunityBodyRow[] {
    return statistics.groups.slice(0, COMMUNITY_MANY_GROUPS_THRESHOLD).map((group, index) => ({
        name: `Group ${index + 1}`,
        value: `${formatCount(group.size)} ${pluralise(group.size, "member")}`,
    }));
}
