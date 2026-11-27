/**
 * Which lines a thing's settings pop-over shows (design/ui/style-panel-v2/design.md, 2.6), and whether they would only
 * repeat the row's panel lines, so the row has no "..." (design 2.6, "Only when there is more").
 */

import { type Channel } from "@graphty/graphty-element/catalog";

import { type RowContext } from "../PropertyRow";
import { channelHidden, ruledOut } from "./drawn";
import { lineChannels, type LineSpec, rubricChannels, type SubGroup, type ThingRubric } from "./rubric";
import { setOn } from "./things";

/**
 * A rubric pop-over's main lines, the test of which lines it shows, and its groups with a line in this view.
 * @param ctx - the row.
 * @param rubric - the thing's rubric.
 * @param head - the row's main value's line, Main's first.
 * @returns them.
 */
export function popoverLines(
    ctx: RowContext,
    rubric: ThingRubric,
    head: LineSpec | undefined,
): { mainLines: readonly LineSpec[]; shown: (line: LineSpec) => boolean; groups: readonly SubGroup[] } {
    // Main starts with the row's main value, which binds from its by-data link like every line (design 2.6).
    const lines = [...(rubric.common ?? []), ...rubric.main];
    // The tab strip shows the row's main value when it is the same channel (a route): no line of its own then.
    const mainLines =
        head === undefined ||
        head.channel === rubric.strip?.channel ||
        lines.some((line) => line.channel === head.channel)
            ? lines
            : [head, ...lines];
    // A line another setting of the row rules out appears once it applies (design "Input rules", "Tabs"). A line drawn
    // only in the other view is hidden, set or not, and a group of only such lines leaves the "..." menu.
    const own = [...rubricChannels(rubric), ...(head === undefined ? [] : [head.channel])];
    const shown = (line: LineSpec): boolean =>
        !channelHidden(ctx.session, line.channel) &&
        (!ruledOut(
            ctx,
            line.channel,
            // A condition on the line's own other value (a pair's second number) never hides it.
            own.filter((channel) => !lineChannels(line).includes(channel)),
        ) ||
            lineChannels(line).some((channel) => setOn(ctx, channel)));
    const groups = (rubric.groups ?? []).filter((group) =>
        group.lines.some((line) => !channelHidden(ctx.session, line.channel)),
    );
    return { mainLines, shown, groups };
}

/**
 * Whether a rubric pop-over would only repeat its row's panel lines: no tab strip, and every line it shows, in Main or
 * in a group, is one the panel already draws. Such a row has no "..." and carries its link on its own line (design
 * "Input rules", 2026-11-27: "..." only where it opens more settings).
 * @param ctx - the row.
 * @param rubric - the thing's rubric.
 * @param head - the row's main value's line, Main's first.
 * @param onPanel - the channels the row and the lines under it draw.
 * @returns true when it holds nothing more.
 */
export function popoverRepeats(
    ctx: RowContext,
    rubric: ThingRubric,
    head: LineSpec | undefined,
    onPanel: ReadonlySet<Channel>,
): boolean {
    if (rubric.strip !== undefined) {
        return false;
    }
    const { mainLines, shown, groups } = popoverLines(ctx, rubric, head);
    return [...mainLines, ...groups.flatMap((group) => group.lines)]
        .filter((line) => shown(line))
        .every((line) => lineChannels(line).every((channel) => onPanel.has(channel)));
}
