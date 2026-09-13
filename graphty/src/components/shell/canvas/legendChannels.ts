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
 * A channel is built only for an encoding that was applied. An unencoded channel is
 * absent rather than empty (design line 4121), which is why both builders can return
 * null and the caller passes no `legend` config at all when both do.
 */

import { UNENCODED_NODE_COLOR } from "../defaults/loadDefaults";
import { COMMUNITY_PALETTE } from "../defaults/styleDescriptors";
import type { CommunityStatistics } from "../readings/communityReading";
import { formatCount, formatPercent } from "../readings/readingFormat";
import { CANVAS_METRICS } from "./canvasLayout";
import type { LegendCategory, LegendChannel } from "./Legend";

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
