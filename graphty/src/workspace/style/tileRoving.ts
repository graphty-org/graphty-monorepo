/**
 * One Tab stop for a group of tiles (decided.md's grids), as the shader gallery walks its tiles:
 * the arrows move by one tile, or by one row in a grid, and stop at the ends; Home and End go to
 * the first and last. A stand-in until compact-mantine exports its roving focus (issue #6233).
 */

import type React from "react";

/** What marks a tile of a roving group; a disabled one is passed over. */
const TILE = "[data-tile]:not([aria-disabled])";

/**
 * Moves focus among a group's tiles.
 * @param event - the key, bubbled from a tile to the group.
 * @param columns - tiles per row: 1 walks a list, where up and down move by one too.
 * @param tile - what marks a tile, when it is not `data-tile`.
 */
export function roveTiles(event: React.KeyboardEvent<HTMLElement>, columns = 1, tile = TILE): void {
    const tiles = [...event.currentTarget.querySelectorAll<HTMLElement>(tile)];
    const at = tiles.indexOf(event.target as HTMLElement);
    if (at < 0) {
        return;
    }
    const moves: Readonly<Record<string, number>> = {
        ArrowRight: at + 1,
        ArrowLeft: at - 1,
        ArrowDown: at + columns,
        ArrowUp: at - columns,
        Home: 0,
        End: tiles.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) {
        return;
    }
    event.preventDefault();
    tiles[Math.max(0, Math.min(next, tiles.length - 1))]?.focus();
}

/**
 * The tile that is the group's one Tab stop: the one focused last, else the chosen one, else the first.
 * @param ids - the tiles' ids, in order.
 * @param focused - the tile focused last, if any.
 * @param chosen - the chosen tile, if any.
 * @returns the stop's id, or undefined for an empty group.
 */
export function tileStop(
    ids: readonly string[],
    focused: string | undefined,
    chosen: string | undefined,
): string | undefined {
    if (focused !== undefined && ids.includes(focused)) {
        return focused;
    }
    return chosen !== undefined && ids.includes(chosen) ? chosen : ids[0];
}
