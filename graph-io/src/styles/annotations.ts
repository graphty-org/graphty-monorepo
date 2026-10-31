/**
 * The annotations a file draws beside its graph: shapes, text notes and arrows that are not nodes or edges. Cytoscape
 * desktop keeps them in the network's `__Annotations` column (sessions, XGMML, CX and CX2 all carry it), one
 * `key=value|key=value` string per annotation; this reads them as neutral facts in the position convention (y up,
 * the file's own units), so they line up with `extractPositions()`.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { StyleArrowShape, StyleColor, StyleNodeShape } from "./types.js";

/**
 * A point in the position convention: y up, in the file's own units.
 * @category Styles
 */
export interface AnnotationPoint {
    /** The x coordinate. */
    readonly x: number;
    /** The y coordinate, y up. */
    readonly y: number;
}

/**
 * What every annotation has.
 * @category Styles
 */
export interface AnnotationBase {
    /** The file's id for the annotation, or its index when the file gives none. */
    readonly id: string;
    /** Whether it is drawn behind the graph or in front of it. */
    readonly layer: "background" | "foreground";
    /** Its drawing order within its layer, lowest first. */
    readonly z: number;
}

/**
 * How far an annotation is turned about its box's center, in degrees, clockwise as seen on screen (0: not turned).
 * Shapes, texts and pictures carry it; Cytoscape saves it as `rotation`.
 */
interface RotatedAnnotation {
    /** The turn in degrees, clockwise on screen. */
    readonly rotation: number;
}

/**
 * A filled, outlined shape.
 * @category Styles
 */
export interface ShapeAnnotation extends AnnotationBase, RotatedAnnotation {
    /** What the annotation is: always `"shape"` for a shape. */
    readonly kind: "shape";
    /** The box's center. */
    readonly center: AnnotationPoint;
    /** The box's width. */
    readonly width: number;
    /** The box's height. */
    readonly height: number;
    /** The outline's shape. */
    readonly shape: StyleNodeShape;
    /** The fill color, or null for none. */
    readonly fill: StyleColor | null;
    /** The fill's opacity, 0..1. */
    readonly fillOpacity: number;
    /** The outline's color. */
    readonly borderColor: StyleColor;
    /** The outline's opacity, 0..1. */
    readonly borderOpacity: number;
    /** The outline's width. */
    readonly borderWidth: number;
}

/**
 * A line of text.
 * @category Styles
 */
export interface TextAnnotation extends AnnotationBase, RotatedAnnotation {
    /** What the annotation is: always `"text"` for a line of text. */
    readonly kind: "text";
    /** The text. */
    readonly text: string;
    /** Where the text is placed: the top-left corner of its box, or its center. */
    readonly at: AnnotationPoint;
    /** What `at` is. */
    readonly anchor: "top-left" | "center";
    /** The font size, in the file's units. */
    readonly fontSize: number;
    /** The font family. */
    readonly fontFamily: string;
    /** Whether the text is bold. */
    readonly bold: boolean;
    /** Whether the text is italic. */
    readonly italic: boolean;
    /** The text color. */
    readonly color: StyleColor;
    /** The text's opacity, 0..1. */
    readonly opacity: number;
}

/**
 * A line between two points, with an arrowhead at either end.
 * @category Styles
 */
export interface ArrowAnnotation extends AnnotationBase {
    /** What the annotation is: always `"arrow"` for an arrow. */
    readonly kind: "arrow";
    /** Where the line starts. */
    readonly from: AnnotationPoint;
    /** Where it ends. */
    readonly to: AnnotationPoint;
    /** The line color. */
    readonly color: StyleColor;
    /** The line's opacity, 0..1. */
    readonly opacity: number;
    /** The line width. */
    readonly width: number;
    /** The arrowhead at the start. */
    readonly sourceArrow: StyleArrowShape;
    /** The arrowhead at the end. */
    readonly targetArrow: StyleArrowShape;
    /** The start's arrowhead size as a factor of the normal size. */
    readonly sourceSize: number;
    /** The end's arrowhead size as a factor of the normal size. */
    readonly targetSize: number;
    /** The arrowhead color at the start. */
    readonly sourceColor: StyleColor;
    /** The arrowhead color at the end. */
    readonly targetColor: StyleColor;
    /**
     * How long the start's arrowhead is along the line, in the units of the points, size included; absent, the
     * drawing program's own length for the line's width.
     */
    readonly sourceHeadLength?: number;
    /** How wide the start's arrowhead is across the line, as `sourceHeadLength` says. */
    readonly sourceHeadWidth?: number;
    /** How long the end's arrowhead is along the line, as `sourceHeadLength` says. */
    readonly targetHeadLength?: number;
    /** How wide the end's arrowhead is across the line, as `sourceHeadLength` says. */
    readonly targetHeadWidth?: number;
    /**
     * The id of the text annotation the line leaves, when it leaves one. The file keeps no size for a text, so `from`
     * is only near it; a drawing that measures the text starts the line where a line from the text's box's center
     * toward `to` crosses the box, as Cytoscape does.
     */
    readonly sourceText?: string;
    /**
     * True when `to` is a node's center as the file saved it. A drawing that knows the node's size stops the line at
     * the node's outline, as Cytoscape does.
     */
    readonly toNode?: boolean;
}

/**
 * A picture placed in a box, which `readImageAnnotations()` reads.
 * @category Styles
 */
export interface ImageAnnotation extends AnnotationBase, RotatedAnnotation {
    /** What the annotation is: always `"image"` for a picture. */
    readonly kind: "image";
    /** The box's center. */
    readonly center: AnnotationPoint;
    /** The box's width; the picture is stretched to it. */
    readonly width: number;
    /** The box's height. */
    readonly height: number;
    /** Where the picture is, as the file names it. */
    readonly url: string;
    /** The picture's opacity, 0..1. */
    readonly opacity: number;
    /** The outline's color. */
    readonly borderColor: StyleColor;
    /** The outline's opacity, 0..1 (0 draws none). */
    readonly borderOpacity: number;
    /** The outline's width (0 draws none). */
    readonly borderWidth: number;
}

/**
 * One annotation.
 * @category Styles
 */
export type GraphAnnotation = ShapeAnnotation | TextAnnotation | ArrowAnnotation;

/**
 * A file's annotations, and the kinds it holds that are not read (images, groups of annotations), by the file's
 * own type name, once each.
 * @category Styles
 */
export interface FileAnnotations {
    /** The annotations read, in the file's order. */
    readonly annotations: readonly GraphAnnotation[];
    /** The file's type names of the annotations not read. */
    readonly skipped: readonly string[];
}

/** The graph column Cytoscape desktop keeps its annotations in. */
const CYTOSCAPE_ANNOTATIONS_COLUMN = "__Annotations";

const TYPE_PREFIX = "org.cytoscape.view.presentation.annotations.";

/** Cytoscape's annotation shape names, lowercase, as neutral shapes. */
const SHAPES: ReadonlyMap<string, StyleNodeShape> = new Map<string, StyleNodeShape>([
    ["rectangle", "rectangle"],
    ["roundedrectangle", "round-rectangle"],
    ["rounded_rectangle", "round-rectangle"],
    ["ellipse", "ellipse"],
    ["triangle", "triangle"],
    ["diamond", "diamond"],
    ["pentagon", "pentagon"],
    ["hexagon", "hexagon"],
    ["octagon", "octagon"],
    ["parallelogram", "parallelogram"],
    ["star5", "star"],
    ["star6", "star"],
    ["v", "vee"],
]);

/**
 * Cytoscape's annotation arrowheads, by the number it saves (the declaration order of ding's
 * `ArrowAnnotationImpl.ArrowType` in 3.10: Circle, Closed Arrow, Concave Arrow, Diamond, Open Arrow, No Arrow,
 * X Arrow, Triangular Head, T-Shape) and by its display name, lowercase.
 */
const ARROW_ORDER: readonly StyleArrowShape[] = [
    "circle",
    "triangle",
    "vee",
    "diamond",
    "triangle-open",
    "none",
    "other:x",
    "triangle",
    "tee",
];
/**
 * How long along its line each of Cytoscape's annotation arrowheads is drawn at size 1, by its `ArrowType` position,
 * every one 10 wide whatever the line's width (measured on Cytoscape 3.10.5's SVG of `specimen-images-charts-p6`):
 * the Closed, Concave, Diamond and Open Arrows 17, the Circle and the X 10, the Triangular Head 5, the T a bar across.
 */
const ARROW_LENGTHS: readonly number[] = [10, 17, 17, 17, 17, 0, 10, 5, 0];
/** How wide across its line every Cytoscape annotation arrowhead is at size 1. */
const ARROW_WIDTH = 10;
const ARROW_NAMES: ReadonlyMap<string, StyleArrowShape> = new Map<string, StyleArrowShape>([
    ["circle", "circle"],
    ["closed arrow", "triangle"],
    ["concave arrow", "vee"],
    ["diamond", "diamond"],
    ["open arrow", "triangle-open"],
    ["no arrow", "none"],
    ["pipe", "tee"],
    ["triangle", "triangle"],
    ["t", "tee"],
    ["t-shape", "tee"],
    ["triangular head", "triangle"],
    ["x", "other:x"],
    ["x arrow", "other:x"],
]);

/**
 * The annotations a graph holds, from the column Cytoscape desktop keeps them in.
 * @param snapshot - the graph
 * @returns the annotations; none when the graph has the column empty or not at all
 * @category Styles
 */
export function readAnnotations(snapshot: GraphSnapshot): FileAnnotations {
    const { graph } = snapshot;
    const cell = graph.has(CYTOSCAPE_ANNOTATIONS_COLUMN) ? graph.value(CYTOSCAPE_ANNOTATIONS_COLUMN, 0) : null;
    const entries = cellStrings(cell);
    const fields = entries.map(parseEntry);
    const byId = new Map(fields.map((f, i) => [f.get("uuid") ?? String(i), f]));
    const annotations: GraphAnnotation[] = [];
    const skipped = new Set<string>();
    fields.forEach((f, i) => {
        const read = readOne(f, String(i), byId);
        if (read === null) {
            skipped.add((f.get("type") ?? "").replace(TYPE_PREFIX, ""));
        } else {
            annotations.push(...read);
        }
    });
    return { annotations, skipped: [...skipped] };
}

/**
 * The pictures a graph's annotations place, from the column Cytoscape desktop keeps them in: the annotations
 * `readAnnotations()` lists as skipped `ImageAnnotation`s.
 * @param snapshot - the graph
 * @returns the pictures, in the file's order; none when the graph has none
 * @category Styles
 */
export function readImageAnnotations(snapshot: GraphSnapshot): ImageAnnotation[] {
    const { graph } = snapshot;
    const cell = graph.has(CYTOSCAPE_ANNOTATIONS_COLUMN) ? graph.value(CYTOSCAPE_ANNOTATIONS_COLUMN, 0) : null;
    return cellStrings(cell).flatMap((entry, i) => {
        const f = parseEntry(entry);
        const url = f.get("URL") ?? "";
        if ((f.get("type") ?? "").replace(TYPE_PREFIX, "") !== "ImageAnnotation" || url === "") {
            return [];
        }
        const zoom = positive(f.get("zoom")) ?? 1;
        const x = num(f.get("x")) ?? 0;
        const y = num(f.get("y")) ?? 0;
        const width = (positive(f.get("width")) ?? 0) / zoom;
        const height = (positive(f.get("height")) ?? 0) / zoom;
        const border = javaColor(f.get("edgeColor")) ?? { color: "#000000", alpha: 1 };
        const opacity = num(f.get("opacity"));
        return [
            {
                id: f.get("uuid") ?? String(i),
                layer: f.get("canvas") === "background" ? "background" : "foreground",
                z: num(f.get("z")) ?? 0,
                kind: "image",
                rotation: num(f.get("rotation")) ?? 0,
                center: { x: x + width / 2, y: -(y + height / 2) },
                width,
                height,
                url,
                opacity: opacity === null ? 1 : Math.min(1, Math.max(0, opacity)),
                borderColor: border.color,
                borderOpacity: border.alpha * percent(f.get("edgeOpacity")),
                borderWidth: (num(f.get("edgeThickness")) ?? 0) / zoom,
            },
        ];
    });
}

/**
 * A cell's strings: a list cell's items, or the lines of a text cell.
 * @param cell - the cell
 * @returns the strings
 */
function cellStrings(cell: unknown): string[] {
    if (typeof cell === "string") {
        return cell.split(/[\r\n]+/).filter((s) => s !== "");
    }
    if (cell !== null && typeof cell === "object" && Symbol.iterator in cell) {
        return Array.from(cell as Iterable<unknown>).filter((s): s is string => typeof s === "string" && s !== "");
    }
    return [];
}

/**
 * One annotation string's fields.
 * @param entry - `key=value|key=value`
 * @returns the fields
 */
function parseEntry(entry: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const part of entry.split("|")) {
        const eq = part.indexOf("=");
        if (eq > 0) {
            out.set(part.slice(0, eq), part.slice(eq + 1));
        }
    }
    return out;
}

/**
 * One annotation as neutral facts; a bounded text annotation is a shape and its text.
 * @param f - its fields
 * @param index - its position, its id when it has no uuid
 * @param byId - every annotation's fields by id, for an arrow's ends
 * @returns the annotations, or null for a kind not read
 */
function readOne(
    f: ReadonlyMap<string, string>,
    index: string,
    byId: ReadonlyMap<string, ReadonlyMap<string, string>>,
): GraphAnnotation[] | null {
    const type = (f.get("type") ?? "").replace(TYPE_PREFIX, "");
    const zoom = positive(f.get("zoom")) ?? 1;
    const base: AnnotationBase = {
        id: f.get("uuid") ?? index,
        layer: f.get("canvas") === "background" ? "background" : "foreground",
        z: num(f.get("z")) ?? 0,
    };
    switch (type) {
        case "ShapeAnnotation":
            return [shapeOf(f, base, zoom)];
        case "TextAnnotation":
            return [textOf(f, base, zoom, { x: num(f.get("x")) ?? 0, y: -(num(f.get("y")) ?? 0) }, "top-left")];
        case "BoundedTextAnnotation": {
            const shape = shapeOf(f, base, zoom);
            return [shape, textOf(f, { ...base, id: `${base.id}:text` }, zoom, shape.center, "center")];
        }
        case "ArrowAnnotation":
            return arrowOf(f, base, zoom, byId);
        default:
            return null;
    }
}

/**
 * A shape annotation: `x`, `y` its top-left corner, y down; `width`, `height` and the outline at the saved zoom.
 * @param f - its fields
 * @param base - its id, layer and order
 * @param zoom - the zoom its sizes were saved at
 * @returns the shape
 */
function shapeOf(f: ReadonlyMap<string, string>, base: AnnotationBase, zoom: number): ShapeAnnotation {
    const x = num(f.get("x")) ?? 0;
    const y = num(f.get("y")) ?? 0;
    const width = (positive(f.get("width")) ?? 0) / zoom;
    const height = (positive(f.get("height")) ?? 0) / zoom;
    const fill = javaColor(f.get("fillColor"));
    const border = javaColor(f.get("edgeColor")) ?? { color: "#000000", alpha: 1 };
    return {
        ...base,
        kind: "shape",
        rotation: num(f.get("rotation")) ?? 0,
        center: { x: x + width / 2, y: -(y + height / 2) },
        width,
        height,
        shape: SHAPES.get((f.get("shapeType") ?? "rectangle").toLowerCase()) ?? "rectangle",
        fill: fill?.color ?? null,
        fillOpacity: fill === null ? 0 : fill.alpha * percent(f.get("fillOpacity")),
        borderColor: border.color,
        borderOpacity: border.alpha * percent(f.get("edgeOpacity")),
        borderWidth: (num(f.get("edgeThickness")) ?? 1) / zoom,
    };
}

/**
 * A text annotation, or the text of a bounded one.
 * @param f - its fields
 * @param base - its id, layer and order
 * @param zoom - the zoom its font size was saved at
 * @param at - where it is placed
 * @param anchor - what `at` is
 * @returns the text
 */
function textOf(
    f: ReadonlyMap<string, string>,
    base: AnnotationBase,
    zoom: number,
    at: AnnotationPoint,
    anchor: TextAnnotation["anchor"],
): TextAnnotation {
    // java.awt.Font styles: 1 bold, 2 italic, 3 both
    const style = num(f.get("fontStyle")) ?? 0;
    const color = javaColor(f.get("color")) ?? { color: "#000000", alpha: 1 };
    return {
        ...base,
        kind: "text",
        rotation: num(f.get("rotation")) ?? 0,
        text: f.get("text") ?? "",
        at,
        anchor,
        fontSize: (positive(f.get("fontSize")) ?? 12) / zoom,
        fontFamily: f.get("fontFamily") ?? "sans-serif",
        bold: (style & 1) !== 0,
        italic: (style & 2) !== 0,
        color: color.color,
        opacity: color.alpha,
    };
}

/**
 * An arrow annotation. Cytoscape keeps its start as the annotation it leaves (`sourceAnnotation`) and its end as a
 * point (`targetPoint`), a node's center at save time (`targetNode`) or another annotation (`targetAnnotation`). It
 * draws the line from the middle of the side of the source annotation's box that faces the end, to the end point or
 * the middle of the facing side of the target annotation's box, at half the saved `lineThickness` and never under
 * 1 (measured on Cytoscape 3.10.5's SVG of `specimen-images-charts-p6` and of the tutorial session). A source with
 * no saved size (a text annotation) leaves from the arrow's saved `x`, `y` corner, and names the text (`sourceText`); an
 * end at a node is the node's center (`toNode`).
 * @param f - its fields
 * @param base - its id, layer and order
 * @param zoom - the zoom its line width was saved at
 * @param byId - every annotation's fields by id
 * @returns the arrow, or null when it has no end
 */
function arrowOf(
    f: ReadonlyMap<string, string>,
    base: AnnotationBase,
    zoom: number,
    byId: ReadonlyMap<string, ReadonlyMap<string, string>>,
): ArrowAnnotation[] | null {
    const sourceBox = boxOf(byId.get(f.get("sourceAnnotation") ?? ""), zoom);
    const targetBox = boxOf(byId.get(f.get("targetAnnotation") ?? ""), zoom);
    const toPoint = point(f.get("targetPoint")) ?? point(f.get("targetNode"));
    const corner = { x: num(f.get("x")) ?? 0, y: num(f.get("y")) ?? 0 };
    const sourceCenter = sourceBox === null ? corner : centerOfBox(sourceBox);
    const aim = toPoint ?? (targetBox === null ? null : centerOfBox(targetBox));
    if (aim === null) {
        return null;
    }
    // a source with no saved size (a text) leaves from the arrow's saved top-left corner where the end lies right of
    // and below it, else from the source's corner: the file keeps no other trace of where the text was drawn
    const from =
        sourceBox !== null && sourceBox.width > 0 && sourceBox.height > 0
            ? facing(sourceBox, aim)
            : { x: aim.x > corner.x ? corner.x : sourceCenter.x, y: aim.y > corner.y ? corner.y : sourceCenter.y };
    // a node end is its center and a text source's start is a guess: the drawing has the node's size and the text's
    // measured box, and moves both ends by them (`toNode`, `sourceText`)
    const to = toPoint ?? facing(targetBox ?? { x: aim.x, y: aim.y, width: 0, height: 0 }, sourceCenter);
    const sourceSize = positive(f.get("sourceSize")) ?? 1;
    const sourceType = (byId.get(f.get("sourceAnnotation") ?? "")?.get("type") ?? "").replace(TYPE_PREFIX, "");
    const sourceText = sourceType === "TextAnnotation" ? f.get("sourceAnnotation") : undefined;
    const start = xOut(from, to, f.get("sourceType"), sourceSize);
    const color = javaColor(f.get("lineColor")) ?? { color: "#000000", alpha: 1 };
    const sourceColor = javaColor(f.get("sourceColor"))?.color ?? color.color;
    const targetColor = javaColor(f.get("targetColor"))?.color ?? color.color;
    return [
        {
            ...base,
            kind: "arrow",
            from: { x: start.x, y: -start.y },
            to: { x: to.x, y: -to.y },
            color: color.color,
            opacity: color.alpha * percent(f.get("lineOpacity")),
            width: Math.max(1, (positive(f.get("lineThickness")) ?? 1) / zoom / 2),
            sourceArrow: arrowShape(f.get("sourceType")),
            targetArrow: arrowShape(f.get("targetType")),
            sourceSize,
            targetSize: positive(f.get("targetSize")) ?? 1,
            sourceColor,
            targetColor,
            ...heads("source", f.get("sourceType"), sourceSize),
            ...heads("target", f.get("targetType"), positive(f.get("targetSize")) ?? 1),
            ...(sourceText === undefined ? {} : { sourceText }),
            ...(point(f.get("targetPoint")) === null && toPoint !== null ? { toNode: true } : {}),
        },
    ];
}

/**
 * Where a line starts. An X at the source lies wholly outside the source, from its side out half the X's length each
 * way of where the line starts (measured on Cytoscape 3.10.5's SVG of `specimen-images-charts-p6`: the source box ends
 * at 249, the X spans 249 to 259 and the line starts at 254); every other head's tip is the source's side.
 * @param from - the side of the source the line leaves, y down
 * @param to - the line's end, y down
 * @param type - the source end's saved `ArrowType`, a position or a name
 * @param size - the source end's saved size
 * @returns the line's start, y down
 */
function xOut(from: AnnotationPoint, to: AnnotationPoint, type: string | undefined, size: number): AnnotationPoint {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (arrowShape(type) !== "other:x" || length === 0) {
        return from;
    }
    const out = (ARROW_LENGTHS[ARROW_ORDER.indexOf("other:x")] * size) / 2 / length;
    return { x: from.x + (to.x - from.x) * out, y: from.y + (to.y - from.y) * out };
}

/**
 * The length and width Cytoscape draws one end's arrowhead at: its type's length and 10 across, times its size.
 * @param end - which end
 * @param type - the end's saved `ArrowType`, a position or a name
 * @param size - the end's saved size
 * @returns the end's head length and width, none for an end without a head
 */
function heads(
    end: "source" | "target",
    type: string | undefined,
    size: number,
): Partial<Pick<ArrowAnnotation, "sourceHeadLength" | "sourceHeadWidth" | "targetHeadLength" | "targetHeadWidth">> {
    const shape = arrowShape(type);
    if (shape === "none") {
        return {};
    }
    const k = num(type) ?? ARROW_ORDER.indexOf(shape);
    const length = ARROW_LENGTHS[k] ?? ARROW_LENGTHS[1];
    return { [`${end}HeadLength`]: length * size, [`${end}HeadWidth`]: ARROW_WIDTH * size };
}

/** An annotation's box as the file writes it: top-left corner, y down. */
interface FileBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/**
 * An annotation's box, y down as the file writes it.
 * @param f - its fields, or undefined
 * @param zoom - the zoom the arrow was saved at
 * @returns the box, or null
 */
function boxOf(f: ReadonlyMap<string, string> | undefined, zoom: number): FileBox | null {
    if (f === undefined) {
        return null;
    }
    const x = num(f.get("x"));
    const y = num(f.get("y"));
    if (x === null || y === null) {
        return null;
    }
    return { x, y, width: (positive(f.get("width")) ?? 0) / zoom, height: (positive(f.get("height")) ?? 0) / zoom };
}

/**
 * A box's center.
 * @param b - the box
 * @returns the center
 */
function centerOfBox(b: FileBox): AnnotationPoint {
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/**
 * The middle of the side of a box that faces a point: a left or right side when the point lies more across than
 * along, against the box's own proportions, else the top or bottom.
 * @param b - the box
 * @param p - the point
 * @returns the side's middle
 */
function facing(b: FileBox, p: AnnotationPoint): AnnotationPoint {
    const c = centerOfBox(b);
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    if (Math.abs(dx) * b.height >= Math.abs(dy) * b.width) {
        return { x: c.x + Math.sign(dx) * (b.width / 2), y: c.y };
    }
    return { x: c.x, y: c.y + Math.sign(dy) * (b.height / 2) };
}

/**
 * An arrowhead by its `ArrowType` position or name.
 * @param raw - the field
 * @returns the shape; a triangle for one not known
 */
function arrowShape(raw: string | undefined): StyleArrowShape {
    if (raw === undefined) {
        return "none";
    }
    const n = num(raw);
    if (n !== null) {
        return ARROW_ORDER[n] ?? "triangle";
    }
    return ARROW_NAMES.get(raw.trim().toLowerCase()) ?? "triangle";
}

/**
 * A `x,y` point as the file writes it.
 * @param raw - the field
 * @returns the point, or null
 */
function point(raw: string | undefined): AnnotationPoint | null {
    const [x, y] = (raw ?? "").split(",").map((s) => num(s));
    return x === null || x === undefined || y === null || y === undefined ? null : { x, y };
}

/**
 * A Java color as a signed ARGB integer.
 * @param raw - the field
 * @returns the color and its alpha, or null
 */
function javaColor(raw: string | undefined): { color: StyleColor; alpha: number } | null {
    const n = num(raw);
    if (n === null || !Number.isInteger(n)) {
        return null;
    }
    const argb = n >>> 0;
    return {
        color: `#${(argb & 0xffffff).toString(16).padStart(6, "0")}`,
        alpha: (argb >>> 24) / 255,
    };
}

/**
 * A 0..100 percentage as 0..1; 1 when absent.
 * @param raw - the field
 * @returns the fraction
 */
function percent(raw: string | undefined): number {
    const n = num(raw);
    return n === null ? 1 : Math.min(1, Math.max(0, n / 100));
}

/**
 * A finite number.
 * @param raw - the field
 * @returns the number, or null
 */
function num(raw: string | undefined): number | null {
    if (raw === undefined || raw.trim() === "") {
        return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

/**
 * A positive number.
 * @param raw - the field
 * @returns the number, or null
 */
function positive(raw: string | undefined): number | null {
    const n = num(raw);
    return n !== null && n > 0 ? n : null;
}
