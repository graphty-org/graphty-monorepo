/**
 * The scene description both sides of the style fidelity harness reduce a drawing to: what a
 * reference program drew (or an independent reading of the file), and what graphty-element drew.
 * `scene.schema.json` is the same contract as JSON Schema, for the Python and Java extractors and for
 * `references.test.ts`; keep the two in step.
 *
 * Units are reference pixels, y points down, and node x, y are centers. Colors are `#rrggbb`
 * (lowercase); their alpha is a separate opacity.
 */
import type { RouteId } from "./routes.js";

export type { RouteId } from "./routes.js";

/** `#rrggbb`, lowercase. */
export type Color = string;

export type ShapeClass =
    | "ellipse"
    | "rect"
    | "roundrect"
    | "diamond"
    | "triangle"
    | "hexagon"
    | "octagon"
    | "star"
    | "parallelogram"
    | "image"
    | "other";

export type ArrowClass = "filled-triangle" | "open-triangle" | "diamond" | "circle" | "tee" | "other";

export type LineStyle = "solid" | "dashed" | "dotted" | "other";

/** Every property the comparer scores, and the ones a route's ledger says it can or cannot carry. */
export const PROPERTIES = [
    "position",
    "size",
    "shape",
    "fill",
    "fillOpacity",
    "borderColor",
    "borderWidth",
    "borderStyle",
    "labelText",
    "labelColor",
    "fontSize",
    "labelPosition",
    "visible",
    "zOrder",
    "edgeColor",
    "edgeOpacity",
    "edgeWidth",
    "lineStyle",
    "arrows",
    "edgePath",
    "edgeLabel",
    "groups",
    "annotations",
    "background",
] as const;

export type Property = (typeof PROPERTIES)[number];

export type Carry = "yes" | "no" | "altered";

/** Top-left corner and size. */
export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface SceneNode {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    shape: ShapeClass;
    fill: Color | null;
    fillOpacity: number;
    border: { color: Color | null; width: number; style: LineStyle };
    label: {
        text: string;
        fontSize: number;
        color: Color;
        position: "inside" | "below" | "above" | "left" | "right" | "other";
        visible: boolean;
    } | null;
    visible: boolean;
    z: number;
    /**
     * graphty side only, diagnostic and never scored: what the style asked for, per scored
     * property, so a miss can be told apart as a mapping bug (it asked for the wrong thing) or a
     * rendering bug (it asked for the right thing and drew another).
     */
    requested?: Partial<Record<Property, unknown>>;
    /** graphty side only, diagnostic and never scored: renderer facts behind the drawn values. */
    drawn?: Record<string, unknown>;
}

export interface SceneEdge {
    id: string;
    source: string;
    target: string;
    /** The drawn path as a polyline, source end first (curves are flattened). */
    points: [number, number][];
    curved: boolean;
    color: Color;
    opacity: number;
    width: number;
    style: LineStyle;
    arrow: { source: ArrowClass | "none"; target: ArrowClass | "none" };
    label: string | null;
    /**
     * graphty side only, diagnostic and never scored: what the style asked for, per scored
     * property, so a miss can be told apart as a mapping bug (it asked for the wrong thing) or a
     * rendering bug (it asked for the right thing and drew another).
     */
    requested?: Partial<Record<Property, unknown>>;
    /** graphty side only, diagnostic and never scored: renderer facts behind the drawn values. */
    drawn?: Record<string, unknown>;
}

export interface SceneGroup {
    id: string;
    members: string[];
    bbox: Box;
    fill: Color | null;
    border: Color | null;
    label: string | null;
}

export interface Scene {
    provenance: {
        side: "reference" | "graphty";
        route: RouteId;
        tool: string;
        version: string;
        command: string;
        /** sha256 of the sample file as stored in the corpus (compressed when it is stored compressed). */
        sourceSha256: string;
        generatedAt: string;
    };
    canCarry: Partial<Record<Property, Carry>>;
    nodes: SceneNode[];
    edges: SceneEdge[];
    groups: SceneGroup[];
    annotations?: { kind: "text" | "shape" | "arrow"; bbox: Box; text?: string }[];
    background?: Color;
    /** Things this side could not read; a property listed here is not judged against this side. */
    gaps: { property: Property; reason: string }[];
}
