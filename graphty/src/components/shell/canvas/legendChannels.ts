/**
 * The legend's channel lines, built from what the shell actually painted.
 *
 * One encoding reaches the canvas on the novice path -- a community run recolours the
 * nodes -- and until this module existed the legend did not name it: `CanvasRegion`
 * defaults its channel list to empty, so a graph whose every node had just been repainted
 * drew a legend with nothing in it.
 *
 * There is no SIZE channel. 7.2 asks a load to size nodes by degree and that was reverted
 * on 2026-09-13 in favour of the element's hand-tuned defaults, so nothing encodes size
 * and a "Size: Most connected, sqrt scale" line would name an encoding the canvas does not
 * apply.
 *
 * This is also where the sentence the community reading gave up now lives. RT-10 caps a
 * reading at two sentences (design line 4672, restated at 5794 and in
 * COMPACTION-1.6.md:324), and "Colors now show groups." was the third: design line 201
 * gives the legend the header "Color: groups, categorical", and 5808 has Copy reading
 * pick the legend's channel lines up, so what the colours MEAN is the legend's fact and
 * repeating it in the reading said the same thing twice.
 *
 * A node metric run -- Most connected, Influence or Bridges -- declares a COLOUR channel
 * of its own, and it REPLACES the community one rather than joining it: the shell holds a
 * single colourChannel and the canvas paints a single colour per node, so a legend drawing
 * two colour blocks would name an encoding that is no longer on the screen.
 *
 * A channel is built only for an encoding that was actually applied. An unencoded channel
 * is absent rather than empty (design line 4121), which is why both builders can return
 * null and the caller passes no `legend` config at all when they do. A metric run reaches
 * this module unapplied whenever a hand-authored layer already drives node colour: the
 * result card draws its un-applied form, the canvas paints nothing, and so the legend
 * names nothing.
 */

import {
    NODE_METRIC_DEFINITIONS,
    type NodeMetricId,
    type NodeMetricNormalisation,
    type NodeMetricRanking,
} from "../analysis/nodeMetrics";
import { UNENCODED_NODE_COLOR } from "../defaults/loadDefaults";
import { viridisAt } from "../defaults/nodeMetricStyle";
import { COMMUNITY_PALETTE } from "../defaults/styleDescriptors";
import type { CommunityStatistics } from "../readings/communityReading";
import { formatMetricValue } from "../readings/nodeMetricReading";
import { formatCount, formatPercent } from "../readings/readingFormat";
import { CANVAS_METRICS } from "./canvasLayout";
import type { LegendCategory, LegendChannel, LegendStop } from "./Legend";

/** The plain-then-technical pair (6.3) the community encoding is named by. */
const COMMUNITY_ATTRIBUTE = "Groups";

/** The technical half, without its parentheses -- the legend draws those. */
const COMMUNITY_TECHNICAL_NAME = "Communities, Louvain";

/**
 * The colour channel for a community run: one category per coloured group, largest
 * first, and an Other row for the groups the colour cap left neutral.
 *
 * Categories are named by RANK rather than by community id, because that is how the
 * result body and every board label them ("Group 1" is the largest), and the legend has
 * to agree with the rows beside it.
 * @param statistics - what the grouping run reported, after the encoding was applied.
 * @returns the colour channel, or null when nothing was painted.
 */
export function communityColourChannel(statistics: CommunityStatistics): LegendChannel | null {
    const { colouredGroupCount, encodingApplied, groupCount, nodeCount } = statistics;

    if (!encodingApplied || colouredGroupCount <= 0) {
        return null;
    }

    const coloured = statistics.groups.slice(0, colouredGroupCount);
    const categories: LegendCategory[] = coloured.map((group, index) => ({
        id: `group-${String(group.communityId)}`,
        label: `Group ${String(index + 1)}`,
        color: COMMUNITY_PALETTE[index % COMMUNITY_PALETTE.length],
    }));

    /* The Other row covers every group the legend does not NAME, which is not the same as
       every group the canvas leaves neutral. Design line 234-237 gives the canvas legend
       "the five largest categories by member count and then one Other row ... reading
       'Other (3,388 groups, 43% of nodes)'", and `capLegendCategories` enforces that five
       silently. Counting only the groups past the COLOUR cap let a painted-but-unnamed
       group disappear from the legend altogether: six groups painted, five named, the
       sixth nowhere on screen.

       The swatch stays the neutral the spec names, which is exact whenever the unnamed
       groups really are neutral and approximate for a painted one the cap pushed out; the
       count and the share are the facts the row carries, and they are now right either
       way. */
    const namedGroups = Math.min(colouredGroupCount, CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS);
    const remainingGroups = groupCount - namedGroups;

    if (remainingGroups <= 0) {
        return {
            channel: "color",
            channelLabel: "Color",
            attribute: COMMUNITY_ATTRIBUTE,
            technicalName: COMMUNITY_TECHNICAL_NAME,
            scaleLine: "categorical",
            scaleShort: "categorical",
            categories,
        };
    }

    /* The remainder's share is counted from the groups that kept the neutral colour, so
       the footer reports the nodes a reader can actually see are grey. */
    let uncovered = 0;

    for (const group of statistics.groups.slice(namedGroups)) {
        uncovered += group.size;
    }

    return {
        channel: "color",
        channelLabel: "Color",
        attribute: COMMUNITY_ATTRIBUTE,
        technicalName: COMMUNITY_TECHNICAL_NAME,
        scaleLine: "categorical",
        scaleShort: "categorical",
        categories,
        other: {
            label: "Other",
            coverage: `${formatCount(remainingGroups)} ${remainingGroups === 1 ? "group" : "groups"}, ${formatPercent(nodeCount > 0 ? uncovered / nodeCount : 0)} of nodes`,
            color: UNENCODED_NODE_COLOR,
        },
    };
}

/**
 * The word the MIDDLE stop carries inside its own label. Legend.tsx's {@link LegendStop}
 * doc is explicit that the median names itself rather than being read off its position:
 * "1 to 44" and "1 to 44" print the same string over two very different distributions,
 * and the median is the one number that tells them apart.
 */
const MEDIAN_STOP_PREFIX = "median ";

/** The compact form's dimmed suffix for a metric ramp (Legend.tsx, `scaleShort`). */
const NODE_METRIC_SCALE_SHORT = "linear";

/**
 * The scale IN WORDS, one sentence per normalisation.
 *
 * Keyed by {@link NodeMetricNormalisation} rather than by metric, so a fourth metric
 * normalised one of these two ways needs no edit here, and a metric normalised some third
 * way cannot compile until this record has a sentence for it.
 *
 * Design line 232-236 prints the scale "always, even where it is the default, because the
 * scale word is the one line on the legend that nothing else on the screen says", and
 * Legend.tsx's own header restates it. So a linear ramp says "linear" rather than saying
 * nothing.
 *
 * The two sentences differ, and they have to. Degree's degreePct and PageRank's rankPct
 * are value/max, so the lowest-scoring node lands wherever its own share of the maximum
 * puts it and is only at the bottom of the ramp if it scores zero. Betweenness's scorePct
 * is (score - min) / (max - min), so the lowest node is always exactly at the ramp's
 * bottom and the highest always exactly at its top. One shared "percent" sentence would
 * be wrong for one of the two whichever way it was written: it would either promise a
 * floor that only min-max delivers, or hide the floor min-max really has.
 */
const NODE_METRIC_SCALE_LINES: Readonly<Record<NodeMetricNormalisation, string>> = {
    max: "linear, scaled to the highest value",
    "min-max": "linear, scaled between the lowest and highest value",
};

/**
 * One end of the ramp, drawn in the ink the CANVAS paints that node.
 *
 * The swatch takes that reading's own fraction rather than 0, 0.5 and 1. A median swatch
 * drawn at `viridisAt(0.5)` would be the ramp's midpoint rather than the colour the
 * median node actually carries, and a metric ranking is almost always skewed -- on a
 * degree or betweenness distribution the median's fraction sits far nearer 0 than 0.5.
 * A legend whose middle swatch is green beside a canvas whose middle node is purple is a
 * swatch that lies about the picture next to it.
 *
 * The ranking carries the value and the fraction as separate scalars
 * ({@link NodeMetricRanking.medianValue} and {@link NodeMetricRanking.medianFraction}),
 * which is why they arrive here as two arguments: the label is the VALUE a reader reads
 * and the swatch is the FRACTION the canvas painted, and the two must not be derived from
 * each other.
 * @param metric - which metric the value belongs to; its precision is a property of it.
 * @param value - the metric value at this end of the domain.
 * @param fraction - where on the ramp the canvas paints it, 0 to 1.
 * @param prefix - {@link MEDIAN_STOP_PREFIX} for the middle stop, "" for the two ends.
 * @returns the stop, with its printed label and its ink.
 */
function metricStop(metric: NodeMetricId, value: number, fraction: number, prefix: string): LegendStop {
    return {
        label: `${prefix}${formatMetricValue(metric, value)}`,
        color: viridisAt(fraction),
    };
}

/**
 * What the legend needs of a node metric run in order to name its colour.
 * @public
 */
export interface NodeMetricChannelInput {
    /** Which metric ran; it names the channel through {@link NODE_METRIC_DEFINITIONS}. */
    readonly metric: NodeMetricId;
    /** What the run reported, read back off the element. */
    readonly ranking: NodeMetricRanking;
    /** Whether the colour ramp was actually applied. False draws no channel at all. */
    readonly encodingApplied: boolean;
}

/**
 * The colour channel for a node metric run: the metric's plain-then-technical pair, the
 * scale in words, the domain's two ends with the median between them, and the departure
 * line for any node the run did not reach.
 *
 * It is QUANTITATIVE, so it carries `stops` and neither `categories` nor `other`. A
 * categorical row under a ramp would be a second kind of legend for one encoding, and the
 * Other row's coverage footer belongs to a categorical cap this channel does not have.
 *
 * The technical half is handed over WITHOUT its parentheses: Legend.tsx's own
 * {@link LegendChannel.technicalName} doc says it is drawn dimmed inside parentheses on
 * the same line, so a parenthesised name here would print twice over.
 * @param input - the metric, its ranking and whether the ramp was applied.
 * @returns the colour channel, or null when nothing was painted.
 * @public
 */
export function nodeMetricColourChannel(input: NodeMetricChannelInput): LegendChannel | null {
    const { encodingApplied, metric, ranking } = input;

    if (!encodingApplied || ranking.rankedCount === 0) {
        return null;
    }

    const definition = NODE_METRIC_DEFINITIONS[metric];
    const stops: readonly LegendStop[] = [
        metricStop(metric, ranking.minValue, ranking.minFraction, ""),
        metricStop(metric, ranking.medianValue, ranking.medianFraction, MEDIAN_STOP_PREFIX),
        metricStop(metric, ranking.maxValue, ranking.maxFraction, ""),
    ];

    /* Legend.tsx's LegendChannel.departures doc names this exact line -- "including the
       clamp line and 'not measured (N nodes)'" -- and design lines 236 and 5117 name it
       twice more. It is the legend's half of the rule that a node the run did not reach
       keeps the neutral UNENCODED_NODE_COLOR rather than being painted viridis(0): the
       canvas shows grey nodes under a ramp, and this line is what says why they are grey.

       Floor item 2 prunes duplicates, never the departure itself, so the count appears
       ONCE here and appears whenever there is one, whatever the result card's caveats
       line also says. When the run reached every node the field is omitted rather than
       set to an empty array -- absent is how this module says "nothing to report", the
       same way an unencoded channel is absent rather than empty.

       The wording is the spec's, printed as written rather than inflected, because the
       same line is quoted by the screen legend and by the composed export legend. */
    const notMeasured = ranking.nodeCount - ranking.rankedCount;

    return {
        channel: "color",
        channelLabel: "Color",
        attribute: definition.plainName,
        technicalName: definition.technicalName,
        scaleLine: NODE_METRIC_SCALE_LINES[definition.normalisation],
        scaleShort: NODE_METRIC_SCALE_SHORT,
        stops,
        ...(notMeasured > 0 ? { departures: [`Not measured (${formatCount(notMeasured)} nodes)`] } : {}),
    };
}
