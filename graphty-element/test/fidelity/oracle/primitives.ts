/**
 * The primitive model both sides of the oracle comparison are read into: what a program's own SVG
 * export draws (`svg-primitives.ts`) and what graphty-element drew (`drawn-primitives.ts`), as
 * resolved geometry and paint in one pixel frame per side, y down. Pure data, no DOM, so the
 * comparer (`compare-oracle.ts`) runs and is unit-tested in Node.
 */

/** A point in a side's own pixel frame, y down. */
export type Pt = [number, number];

/** An axis-aligned box in a side's pixel frame. */
export interface PBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

/** One color stop of a gradient. */
export interface PStop {
    offset: number;
    color: string;
    opacity: number;
}

/** A fill: a flat color, or a gradient (its first stop is also its `color`). */
export interface PFill {
    /** `#rrggbb`. */
    color: string;
    /** Fill opacity times every group opacity above it. */
    opacity: number;
    gradient: { kind: "linear" | "radial"; stops: PStop[] } | null;
}

/** Line style classes, from a dash array relative to the line width. */
export type DashClass = "solid" | "dashed" | "dotted" | "other";

/** A stroke, its width and dashes in the side's pixels. */
export interface PStroke {
    color: string;
    opacity: number;
    width: number;
    /** The dash array as drawn, or null for a solid line. */
    dash: number[] | null;
    dashClass: DashClass;
}

/** Text as drawn. */
export interface PText {
    content: string;
    /** The text's anchor point in the side's frame (its box center when the side has no anchor). */
    x: number;
    y: number;
    box: PBox;
    /** Font size in the side's pixels. */
    sizePx: number;
    family: string;
    /** CSS numeric weight: 400 normal, 700 bold. */
    weight: number;
    style: "normal" | "italic" | "oblique";
    anchor: "start" | "middle" | "end";
    /** Degrees, clockwise on screen, of the text's baseline. */
    rotation: number;
    color: string;
    opacity: number;
}

/** The raw drawing primitives an SVG holds, before they are associated with graph elements. */
export interface Prim {
    /** Document order, for deterministic tie breaks and for findings. */
    index: number;
    tag: string;
    kind: "shape" | "path" | "text" | "image";
    box: PBox;
    /** The outline sampled by arc length (shapes and paths), in the side's frame. */
    points: Pt[];
    closed: boolean;
    /** Polygon vertex count, when the shape is a straight-sided polygon; 0 when curved. */
    corners: number;
    fill: PFill | null;
    stroke: PStroke | null;
    text: PText | null;
    /** marker-start / marker-end, when a marker draws an arrowhead. */
    markers: { start: boolean; end: boolean };
    /** What the program's own markup says this belongs to, when it says. */
    hint: {
        role: "node" | "edge" | "group" | "graph";
        /** The element's id as the markup writes it (a Graphviz title, a Gephi id class). */
        id: string;
        /** What groups primitives into one element: two parallel edges share an id, not a key. */
        key: string;
        /** An edge's ends, when the markup names them apart from its id. */
        ends?: [string, string];
    } | null;
}

/** 2D node shape classes a reader can tell apart from the drawing. */
export type PShape = "ellipse" | "rect" | "roundrect" | "triangle" | "diamond" | "hexagon" | "octagon" | "other";

/** A node as drawn. */
export interface PNode {
    id: string;
    cx: number;
    cy: number;
    w: number;
    h: number;
    shape: PShape | null;
    /** The visible fill, or null for none. */
    fill: PFill | null;
    /** The outline, or null for none. */
    stroke: PStroke | null;
    label: PText | null;
}

/** An arrowhead as drawn. */
export interface PArrow {
    /** Which end of its edge it sits on. */
    end: "source" | "target";
    /** Its extent along the edge and across it, in the side's pixels. */
    length: number;
    width: number;
    filled: boolean;
}

/** An edge as drawn. */
export interface PEdge {
    id: string;
    source: string;
    target: string;
    /** The path, source end first. */
    points: Pt[];
    stroke: PStroke | null;
    arrows: PArrow[];
    label: PText | null;
}

/** A group box as drawn. */
export interface PGroup {
    id: string;
    box: PBox;
    fill: PFill | null;
    stroke: PStroke | null;
    label: PText | null;
    /** Node ids drawn inside it. */
    members: string[];
}

/** An unassociated primitive, a finding of its own (an annotation, a stray shape). */
export interface PStray {
    index: number;
    tag: string;
    kind: Prim["kind"];
    box: PBox;
    fill: string | null;
    stroke: string | null;
    text: string | null;
}

/** One side's drawing, associated with graph elements. */
export interface PScene {
    side: "oracle" | "graphty";
    width: number;
    height: number;
    background: string | null;
    nodes: PNode[];
    edges: PEdge[];
    groups: PGroup[];
    /** Free text not owned by a node, edge or group (annotations, titles). */
    texts: PText[];
    /** Primitives associated with nothing. */
    strays: PStray[];
}

/**
 * A total order on ids by their UTF-16 code units, the same on every machine and locale.
 * @param a - one id
 * @param b - another
 * @returns negative, zero or positive
 */
export const compareIds = (a: string, b: string): number => Number(a > b) - Number(a < b);

/**
 * The dash class of a dash array.
 * @param dash - the dash array, or null
 * @param width - the line width
 * @returns the class
 */
export function dashClassOf(dash: readonly number[] | null, width: number): DashClass {
    if (dash === null || dash.length === 0 || dash.every((d) => d <= 0)) {
        return "solid";
    }
    const on = dash[0];
    return on <= Math.max(1, width) * 1.5 ? "dotted" : "dashed";
}

/**
 * The box of a set of points.
 * @param pts - the points
 * @returns the box
 */
export function boxOfPoints(pts: readonly Pt[]): PBox {
    const box: PBox = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const [x, y] of pts) {
        box.x0 = Math.min(box.x0, x);
        box.y0 = Math.min(box.y0, y);
        box.x1 = Math.max(box.x1, x);
        box.y1 = Math.max(box.y1, y);
    }
    return box;
}
