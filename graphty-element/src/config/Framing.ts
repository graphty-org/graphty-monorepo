/**
 * Every way the element can count a node when it frames the graph, as a const array for
 * validation and controls: `"drawn"` the box the node is drawn in, with its labels; `"centers"`
 * its center alone.
 * @since 3.58.0
 */
export const FRAMING_EXTENT_VALUES = ["drawn", "centers"] as const;

/**
 * What each node counts as when the element frames the whole graph: see {@link FRAMING_EXTENT_VALUES}.
 * @since 3.58.0
 */
export type FramingExtent = (typeof FRAMING_EXTENT_VALUES)[number];

/**
 * The extent the element frames the whole graph by while the project's framing names none.
 * @since 3.58.0
 */
export const DEFAULT_FRAMING_EXTENT: FramingExtent = "drawn";
