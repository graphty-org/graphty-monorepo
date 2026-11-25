/**
 * Style panel v2's parallel color lists (design/ui/style-panel-v2/design.md, section 6, R15; stripes design 3),
 * drawn by `ItemListEditor`: a list thing's items (a pie's slices, stripes, a chart's values) as lines under a legend
 * whose buttons make every share equal, reverse the order and add one, with a caption row above a scroll region four
 * rows tall. Each line is a grip, a color chip whose picker shows the opacity the item draws at, its share (a slider
 * and its number) or a chart's value, its by-data link (Color, Share or Opacity) and its "-". A binding on an item
 * adds a full-width sub-line under it. The items are graphty-element's parallel list channels (`listOf`): shares are
 * read with `listShares` and written with `setListShare`, reorders and removals with `styles.moveListItems`, so item
 * values and item bindings move with their items, every edit one undo step.
 */

import type React from "react";

import type { RowContext } from "../PropertyRow";
import { ColorLines, ListTools } from "./ListItems";
import { drawnItems, type ListSpec, nextColor } from "./lists";
import { revealAdded, stateOf, writeAll } from "./listState";

/**
 * A parallel color list's lines and "+", for `ItemListEditor`: see the file header.
 * @param args - the list.
 * @param args.ctx - the row.
 * @param args.list - the list.
 * @param args.fail - reports a write that failed.
 * @returns its lines, its legend's tools, and what its "+" adds (nothing while its colors vary by data).
 */
export function colorItems({
    ctx,
    list,
    fail,
}: Readonly<{ ctx: RowContext; list: ListSpec; fail: (error: unknown) => void }>): {
    readonly lines: React.ReactNode;
    readonly add: (() => void) | undefined;
    readonly tools: React.ReactNode;
} {
    const state = stateOf(ctx, list, fail);
    if (state === undefined) {
        return { lines: null, add: undefined, tools: null };
    }
    const { colors } = state;
    const add = (): void => {
        revealAdded(list.colors);
        writeAll(state, [...colors.items, nextColor(ctx, colors.items)]);
    };
    return {
        add: colors.bound ? undefined : add,
        tools: <ListTools state={state} />,
        lines: <ColorLines state={state} />,
    };
}

/**
 * A parallel color list's swatches, as the CSS background its row's value button draws (R15r).
 * @param ctx - the row.
 * @param list - the list.
 * @returns the background, or "" for an empty list.
 */
export function swatchesOf(ctx: RowContext, list: ListSpec): string {
    const colors = drawnItems(ctx, list.colors).items;
    const stops = colors.flatMap((color, at) => [
        `${color} ${String((at / colors.length) * 100)}%`,
        `${color} ${String(((at + 1) / colors.length) * 100)}%`,
    ]);
    return colors.length === 0 ? "" : `linear-gradient(to right, ${stops.join(", ")})`;
}
