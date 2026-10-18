/**
 * The note codes of `extractPositions()`. Singular `W_POSITION_*` codes are about some nodes,
 * plural `W_POSITIONS_*` codes about the file as a whole. Keys drop the `W_` and `POSITION_` /
 * `POSITIONS_` prefixes.
 */

/**
 * Every code a `PositionNote` carries.
 * @category Positions
 */
export const POSITION_ISSUE = Object.freeze({
    /** Every placed node sits on one point; the coordinates are dropped and `usable` is false. */
    STACKED: "W_POSITION_STACKED",
    /** Some nodes have no position. */
    PARTIAL: "W_POSITION_PARTIAL",
    /** Some coordinates are not finite numbers; those nodes count as unplaced. */
    NON_FINITE: "W_POSITION_NON_FINITE",
    /** The file mixes 2- and 3-coordinate positions. */
    DIMS_MIXED: "W_POSITION_DIMS_MIXED",
    /** A top-left coordinate has no width or height, so it was not moved to the center. */
    ANCHOR_NO_SIZE: "W_POSITION_ANCHOR_NO_SIZE",
    /** The file holds more than one view (layout); only the first is used. */
    OTHER_VIEWS: "W_POSITION_OTHER_VIEWS",
    /** The file has position-like columns this format does not read (plain `x` / `y`). */
    NOT_READ: "W_POSITIONS_NOT_READ",
} as const);

/**
 * A code of `POSITION_ISSUE`.
 * @category Positions
 */
export type PositionNoteCode = (typeof POSITION_ISSUE)[keyof typeof POSITION_ISSUE];
