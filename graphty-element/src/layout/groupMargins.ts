/**
 * @file The room a layout gave each group round its members, side by side, for a layout that lays
 * groups out itself (Graphviz draws a cluster round its members, its label and the edges it routes
 * inside it). The element draws such a group that much past its members' box on each side, so it is
 * drawn where the layout put it at rest and still follows its members when one is moved.
 */

/** How far a group reaches past its members' box on each side, in scene units. */
export interface GroupMargins {
    readonly left: number;
    readonly right: number;
    readonly bottom: number;
    readonly top: number;
}

/**
 * Each engine's group margins, by the group's row (its node's index): written by an engine that lays
 * groups out, read by the layout manager.
 */
export const laidGroupMargins = new WeakMap<object, ReadonlyMap<number, GroupMargins>>();
