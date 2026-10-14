/**
 * `@graphty/graph-io/positions`: any format's stored node coordinates in one neutral form (each
 * node's center, y up, in the file's own unit), and the inverse a writer uses. This entry loads in
 * Node and never loads a format module: pass it the importer that read the snapshot.
 */

export { POSITION_ISSUE, type PositionNoteCode } from "./codes.js";
export { flipY, toFilePositions } from "./convert.js";
export { extractPositions } from "./extract.js";
export type {
    ExtractPositionsOptions,
    FilePositionGroup,
    FilePositions,
    GraphTool,
    ImporterGroupBox,
    ImporterPositions,
    LengthUnit,
    PositionAnchor,
    PositionColumnExtra,
    PositionNote,
    PositionReadContext,
    YAxis,
} from "./types.js";
