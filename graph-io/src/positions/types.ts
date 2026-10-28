/**
 * The types of `@graphty/graph-io/positions`: the neutral form every format's stored node
 * coordinates are read into, and how a column or an importer says how its coordinates are spelled.
 *
 * The neutral convention: every coordinate is the node's center, y grows upward, in the file's own
 * length unit (`units`), with 3 components (z = 0 when the file stored 2, or when every node has the
 * same z).
 */

import type { GraphTool, LengthUnit } from "../common/units.js";
import type { PositionNoteCode } from "./codes.js";

export type { GraphTool, LengthUnit } from "../common/units.js";

/**
 * Which way a file's y coordinate grows. "down" is screen order (yEd, Cytoscape, Pajek, d3), "up"
 * is math order (Gephi, Graphviz, graph-io's own position columns).
 * @category Positions
 */
export type YAxis = "up" | "down";

/**
 * What a stored node coordinate points at: the node's center, or the top-left corner of its box
 * (yEd), which needs the node's width and height to find the center.
 * @category Positions
 */
export type PositionAnchor = "center" | "top-left";

/**
 * How a role-`position` column's values are spelled, as optional fields of the column's
 * `meta.extra`. A missing field means y up, center, `"file"` units: what the Cytoscape-family,
 * GEXF and DOT columns already hold.
 * @category Positions
 */
export interface PositionColumnExtra {
    /** The unit of the coordinates. */
    readonly units?: LengthUnit;
    /**
     * How many px (points) one unit of the coordinates is, when `units` is "file" but the file's
     * unit is a known length: 72 for Graphviz input inches. Lets a reader draw the coordinates in
     * the same unit as the file's px style lengths; the coordinates themselves stay as written.
     */
    readonly pxPerUnit?: number;
    /**
     * How many px one unit of y is, when the program that draws the file stretches its axes apart
     * (Pajek fits the file's 0..1 square to its Draw window, x across the width and y down the
     * height); absent when y is `pxPerUnit` like x. `extractPositions()` returns y in x's unit.
     */
    readonly pxPerUnitY?: number;
    /**
     * Set when the coordinates have no fixed length: the program that draws the file fits their
     * bounding box into its canvas, `padding` px in from each side, and draws label sizes in the
     * canvas's px rather than in the coordinates' unit (sigma.js). Absent when the coordinates
     * keep their own length.
     */
    readonly viewerFit?: ViewerFit;
    /** How many coordinates the file wrote per node: 2, or 3 when it stored a z. */
    readonly sourceDims?: 2 | 3;
    /** Which way y grows; "down" is flipped to y up. */
    readonly yAxis?: YAxis;
    /** What the coordinate points at; "top-left" is moved to the center using `width` and `height`. */
    readonly anchor?: PositionAnchor;
    /** The name of the node column holding each node's width, for a top-left anchor. */
    readonly width?: string;
    /** The name of the node column holding each node's height, for a top-left anchor. */
    readonly height?: string;
    /** A z the file centers its depth on (Pajek's 0.5): subtracted from a real z before any flip. */
    readonly zOrigin?: number;
    /**
     * The file writes (0, 0) for a node it has no position for (NetworkX's Pajek writer): when other
     * rows are placed, a (0, 0) shared by two or more rows counts as unplaced.
     */
    readonly zeroUnplaced?: boolean;
    /**
     * The program that draws the file puts a node the file gives no position at the origin, (0, 0, 0) as written,
     * when other nodes are placed (Gephi), rather than leaving it for a layout to place.
     */
    readonly originUnplaced?: boolean;
    /**
     * The program that draws the file draws a container node (one other nodes name as their
     * parent) around its children, wherever the container's own stored coordinate says: Cytoscape.js
     * computes a compound node's position and size from its children's. A container's stored
     * coordinate is then not read, and it has no position here unless the file stores its box.
     */
    readonly containersFollowChildren?: boolean;
}

/**
 * How the program that draws a file fits coordinates that have no fixed length into its canvas.
 * @category Positions
 */
export interface ViewerFit {
    /**
     * The px the fitted bounding box keeps from each end of the canvas's smaller side; along the
     * longer side the room is that side's share of the same fraction (sigma.js's `stagePadding`).
     */
    readonly padding: number;
}

/**
 * A group container's box, as an importer's `positions()` hook gives it: (`x`, `y`) is where the
 * box's anchor is, spelled like the node coordinates (the same y direction and anchor).
 * @category Positions
 */
export interface ImporterGroupBox {
    /** The container node, by index. */
    readonly node: number;
    /** The box. */
    readonly box: {
        /** The box's anchor, x. */
        readonly x: number;
        /** The box's anchor, y. */
        readonly y: number;
        /** The box's width. */
        readonly width: number;
        /** The box's height. */
        readonly height: number;
    };
}

/**
 * What an importer's `positions()` hook returns: where its coordinates are and how they are spelled.
 *
 * The simple form names two (or three) plain numeric node columns:
 * `{ x: "x", y: "y", yAxis: "down", units: "px" }`. The advanced form names a 3-component column
 * (`column`) and may add the anchor, size columns, group boxes, a median node size and the tool.
 * @category Positions
 */
export interface ImporterPositions extends PositionColumnExtra {
    /** A plain numeric node column holding x (simple form). */
    readonly x?: string;
    /** A plain numeric node column holding y (simple form). */
    readonly y?: string;
    /** A plain numeric node column holding z (simple form); omit for a 2D file. */
    readonly z?: string;
    /** A 3-component node column holding the coordinates (advanced form); defaults to the role-`position` column. */
    readonly column?: string;
    /** Group container boxes the file stores apart from the node coordinates (Graphviz cluster `bb`). */
    readonly groups?: readonly ImporterGroupBox[];
    /** The median node diameter in the file's unit, when the importer knows it better than the size columns. */
    readonly medianNodeSize?: number | null;
    /** The tool that wrote the file, when the importer knows it better than `meta.creator`. */
    readonly tool?: GraphTool | null;
    /**
     * Where the program that draws the file puts its nodes when the file places none: evenly round a circle in node
     * order, the first at `startDegrees`, each next one further round in `direction` (1: the angle grows, -1: it
     * shrinks), in the file's own coordinates as the rest of this answer spells them (Pajek: center 0.5, 0.5, radius
     * 0.4, the first vertex on the left). Absent, such a file has no positions.
     */
    readonly unplacedCircle?: {
        /** The circle's center, x and y. */
        readonly center: readonly [number, number];
        /** Its radius. */
        readonly radius: number;
        /** The angle of the first node, in degrees. */
        readonly startDegrees: number;
        /** Which way round the next nodes go: 1 the angle grows, -1 it shrinks. */
        readonly direction: 1 | -1;
    };
}

/**
 * What an importer's `positions()` hook is given besides the snapshot.
 * @category Positions
 */
export interface PositionReadContext {
    /** Aborts a long read. */
    readonly signal: AbortSignal | null;
}

/**
 * A note about the stored positions: a code with its parameters, never a sentence for a reader.
 * `message` is graph-io's English for its own logs.
 * @category Positions
 */
export interface PositionNote {
    /** The condition. */
    readonly code: PositionNoteCode;
    /** How many elements (or columns) it covers, and up to 8 examples. */
    readonly params: {
        /** How many elements (or columns) it covers. */
        readonly count: number;
        /** Up to 8 of their ids (or column names). */
        readonly samples: readonly string[];
    };
    /** The node indexes it covers, or only their count when it is about the file as a whole. */
    readonly elements:
        | readonly number[]
        | {
              /** How many it covers. */
              readonly count: number;
          };
    /** graph-io's English; never shown to a reader by graphty-element. */
    readonly message: string;
}

/**
 * A group container's box in the neutral convention: (`x`, `y`) is the box's center, y up.
 * @category Positions
 */
export interface FilePositionGroup {
    /** The container node, by index. */
    readonly node: number;
    /** The box: center, width and height in the file's unit. */
    readonly box: {
        /** The box's center, x. */
        readonly x: number;
        /** The box's center, y. */
        readonly y: number;
        /** The box's width. */
        readonly width: number;
        /** The box's height. */
        readonly height: number;
    };
}

/**
 * A file's stored node coordinates in the neutral convention: the node's center, y up, in the
 * file's own unit, 3 components per node.
 * @category Positions
 */
export interface FilePositions {
    /** The shape version of this object. */
    readonly version: 1;
    /** Where the coordinates came from: the format, the tool that wrote the file, and the y direction it used. */
    readonly source: {
        /** The format that read the file. */
        readonly format: string;
        /** The tool that wrote the file, or null when the file does not say. */
        readonly tool: GraphTool | null;
        /** Which way y grew in the file; every coordinate here has y up. */
        readonly yAxis: YAxis;
    };
    /** The unit of every coordinate and size. */
    readonly units: LengthUnit;
    /**
     * How many px (points) one unit is, when `units` is "file" but the file's unit is a known
     * length (Graphviz input inches: 72); absent otherwise. Multiply a coordinate by it to compare
     * it with the file's px style lengths.
     */
    readonly pxPerUnit?: number;
    /**
     * Set when the coordinates have no fixed length: the program that draws the file fits their
     * bounding box into its canvas, `padding` px in from each side, and draws label sizes in the
     * canvas's px (sigma.js). A label of `s` px is then `s / k` units, where k is the px per unit of
     * that fit on the canvas it is drawn on. Absent otherwise.
     */
    readonly viewerFit?: ViewerFit;
    /** The median node diameter, in `units`, when the file stores node sizes; else null. */
    readonly medianNodeSize: number | null;
    /** 3 when the nodes differ in z, else 2 (z is then 0). */
    readonly dims: 2 | 3;
    /** x, y, z per node, by node index (3 * nodeCount); NaN for a node with no position. */
    readonly coords: Float64Array;
    /** The nodes with a position. */
    readonly placed: number;
    /** The nodes that need one: every node except group containers the file gives no box. */
    readonly total: number;
    /** False when nothing is stored, or every node sits on one point (coords are then all NaN). */
    readonly usable: boolean;
    /** The box around every placed node, or null when none is placed. */
    readonly bounds: {
        /** The smallest x, y and z. */
        readonly min: readonly [number, number, number];
        /** The largest x, y and z. */
        readonly max: readonly [number, number, number];
    } | null;
    /** Group containers with a box. */
    readonly groups: readonly FilePositionGroup[];
    /** What could not be read as written. */
    readonly notes: readonly PositionNote[];
}

/**
 * Options of `extractPositions()`.
 * @category Positions
 */
export interface ExtractPositionsOptions {
    /** Aborts the read; it throws the signal's reason. */
    readonly signal?: AbortSignal | null;
}
