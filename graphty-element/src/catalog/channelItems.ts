/**
 * @file The items of the structured text channels (a polygon's points, a node's lines and texts, an
 * edge's bends, ports and cap stacks, a label table's rows), read with the same parsers the renderer
 * draws from and written back in the text form those parsers read, so an editor that lists the
 * items never keeps its own copy of a format.
 */

import { type ArrowStackPart, parseArrowStack } from "../meshes/arrowStack";
import { parseBends } from "../meshes/edgeRoute";
import { type LabelTable, type LabelTableRow, readLabelTable } from "../meshes/labelTable";
import { pointLists } from "../meshes/nodeDecoration";
import { type ShapeTextLook, shapeTexts } from "../meshes/shapeOutlines";

export type { ArrowStackPart } from "../meshes/arrowStack";
export type {
    LabelTable,
    LabelTableCell,
    LabelTableImage,
    LabelTableLine,
    LabelTableRow,
    TableAlign,
    TableVAlign,
} from "../meshes/labelTable";
export type { ShapeTextLook } from "../meshes/shapeOutlines";

/**
 * One point of a structured channel. On a node's shape channels each coordinate is a fraction of the
 * node's half width or half height (y up), plus a length in the units of `node.size` where one is
 * written (`-1+24` is `x: -1, xLength: 24`); on an edge's bends `x` is how far along the edge and
 * `y` how far across it, and on a port the point on its node, as fractions.
 * @since 3.60.0
 */
export interface ChannelPoint {
    readonly x: number;
    readonly y: number;
    /** A length added to `x`; absent for none. Node shape channels only. */
    readonly xLength?: number;
    /** A length added to `y`; absent for none. Node shape channels only. */
    readonly yLength?: number;
}

/**
 * One of a node's further texts (`node.shapeTexts`): its point, as {@link ChannelPoint} fractions,
 * its words, and what it draws differently from the node's label.
 * @since 3.60.0
 */
export interface ShapeTextItem {
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly look?: ShapeTextLook;
}

/**
 * What one item of each structured channel is: see {@link readChannelItems}.
 * @since 3.60.0
 */
export interface ChannelItemTypes {
    /** A polygon's corner. */
    "node.shapePoints": ChannelPoint;
    /** A closed piece: its corners. */
    "node.shapeParts": readonly ChannelPoint[];
    /** A polyline: its points. */
    "node.shapeLines": readonly ChannelPoint[];
    /** A further text. */
    "node.shapeTexts": ShapeTextItem;
    /** A table row. */
    "node.labelTable": LabelTableRow;
    /** A bend. */
    "edge.bends": ChannelPoint;
    /** The port (one item at most). */
    "edge.sourcePort": ChannelPoint;
    /** The port (one item at most). */
    "edge.targetPort": ChannelPoint;
    /** A cap behind the target end's arrowhead. */
    "edge.arrowHeadStack": ArrowStackPart;
    /** A cap behind the source end's arrowhead. */
    "edge.arrowTailStack": ArrowStackPart;
    /** A table row. */
    "edge.labelTable": LabelTableRow;
}

/**
 * A channel whose value is text holding a list of items: see {@link ChannelItemTypes}.
 * @since 3.60.0
 */
export type ItemChannel = keyof ChannelItemTypes;

/**
 * A shape point from the parser's tuple.
 * @param point - x fraction, x length, y fraction, y length.
 * @returns the point, its lengths only where they are not 0.
 */
function shapePoint(point: readonly [number, number, number, number]): ChannelPoint {
    const [x, xLength, y, yLength] = point;
    return { x, y, ...(xLength === 0 ? {} : { xLength }), ...(yLength === 0 ? {} : { yLength }) };
}

/**
 * Points from `along,across` pairs, as the edge's route reads them.
 * @param value - the value.
 * @returns the points; none when the value does not parse.
 */
function bendItems(value: string): ChannelPoint[] {
    const flat = parseBends(value) ?? [];
    const out: ChannelPoint[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
        out.push({ x: flat[i], y: flat[i + 1] });
    }
    return out;
}

/**
 * The items of a structured channel's value, read by the parser the renderer draws it with: an item
 * the renderer would pass over is left out (a cap that is not a cap type, a polyline with a point
 * that is not two coordinates), except that a further text with empty words is kept, so an editor
 * can show a field it just added.
 *
 * ```ts
 * readChannelItems("node.shapePoints", "0,1 1,-1 -1+24,-1"); // [{x:0,y:1}, {x:1,y:-1}, {x:-1,xLength:24,y:-1}]
 * readChannelItems("edge.arrowHeadStack", "tee:left*2 normal"); // [{type:"tee",side:"left",size:2}, {type:"normal"}]
 * ```
 * @param channel - The channel.
 * @param value - Its value, as a layer holds it.
 * @returns The items in order; none for a value that is not text or holds none.
 * @since 3.60.0
 */
export function readChannelItems<C extends ItemChannel>(channel: C, value: unknown): readonly ChannelItemTypes[C][] {
    if (typeof value !== "string" || value.trim() === "") {
        return [];
    }
    return readItems(channel, value) as readonly ChannelItemTypes[C][];
}

/**
 * The untyped reader behind {@link readChannelItems}.
 * @param channel - The channel.
 * @param value - Its value, not empty.
 * @returns The items.
 */
function readItems(channel: ItemChannel, value: string): readonly unknown[] {
    switch (channel) {
        case "node.shapePoints":
            return (pointLists(value.split(";")[0])[0] ?? []).map((point) => shapePoint(point));
        case "node.shapeParts":
        case "node.shapeLines":
            return pointLists(value).map((list) => list.map((point) => shapePoint(point)));
        case "node.shapeTexts":
            return shapeTexts(value, true).map(([x, y, text, look]) => ({
                x,
                y,
                text,
                ...(Object.keys(look).length === 0 ? {} : { look }),
            }));
        case "edge.bends":
            return bendItems(value);
        case "edge.sourcePort":
        case "edge.targetPort":
            return bendItems(value).slice(0, 1);
        case "edge.arrowHeadStack":
        case "edge.arrowTailStack":
            return parseArrowStack(value);
        case "node.labelTable":
        case "edge.labelTable":
            return readLabelTable(value)?.rows ?? [];
        default:
            return [];
    }
}

/**
 * A shape coordinate as text: its fraction, then its length with its sign.
 * @param fraction - the fraction.
 * @param length - the length, if any.
 * @returns the text.
 */
function coordinateText(fraction: number, length: number | undefined): string {
    if (length === undefined || length === 0) {
        return String(fraction);
    }
    return `${String(fraction)}${length > 0 ? "+" : ""}${String(length)}`;
}

/**
 * Points as `x,y` pairs separated by spaces.
 * @param points - the points.
 * @returns the text.
 */
function pointsText(points: readonly ChannelPoint[]): string {
    return points.map((p) => `${coordinateText(p.x, p.xLength)},${coordinateText(p.y, p.yLength)}`).join(" ");
}

/**
 * A cap as its word: its type, then `:side`, `*size`, `xwidth` and `ooutline` where it has them.
 * @param part - the cap.
 * @returns the word.
 */
function capText(part: ArrowStackPart): string {
    return [
        part.type,
        part.side === undefined ? "" : `:${part.side}`,
        part.size === undefined ? "" : `*${String(part.size)}`,
        part.width === undefined ? "" : `x${String(part.width)}`,
        part.outline === undefined ? "" : `o${String(part.outline)}`,
    ].join("");
}

/**
 * A structured channel's value written from its items, as {@link readChannelItems} reads it back.
 *
 * ```ts
 * const rows = readChannelItems("edge.labelTable", value);
 * writeChannelItems("edge.labelTable", rows.slice(1), value); // the first row gone, the table's own settings kept
 * ```
 * @param channel - The channel.
 * @param items - The items in order.
 * @param from - The value the items were read from: a label table keeps its own settings (border,
 *     spacing, fill and the rest) from it. Other channels ignore it.
 * @returns The value to write; empty text for no items.
 * @since 3.60.0
 */
export function writeChannelItems<C extends ItemChannel>(
    channel: C,
    items: readonly ChannelItemTypes[C][],
    from?: unknown,
): string {
    if (items.length === 0) {
        return "";
    }
    return writeItems(channel, items, from);
}

/**
 * The untyped writer behind {@link writeChannelItems}.
 * @param channel - The channel.
 * @param items - The items, not none.
 * @param from - The value they were read from.
 * @returns The text.
 */
function writeItems(channel: ItemChannel, items: readonly unknown[], from: unknown): string {
    switch (channel) {
        case "node.shapeParts":
        case "node.shapeLines":
            return (items as readonly (readonly ChannelPoint[])[]).map((points) => pointsText(points)).join("; ");
        case "node.shapeTexts":
            return JSON.stringify(
                (items as readonly ShapeTextItem[]).map(({ x, y, text, look }) =>
                    look === undefined || Object.keys(look).length === 0 ? [x, y, text] : [x, y, text, look],
                ),
            );
        case "edge.arrowHeadStack":
        case "edge.arrowTailStack":
            return (items as readonly ArrowStackPart[]).map((part) => capText(part)).join(" ");
        case "node.labelTable":
        case "edge.labelTable": {
            const table: LabelTable = {
                ...(typeof from === "string" ? readLabelTable(from) : null),
                rows: items as readonly LabelTableRow[],
            };
            return JSON.stringify(table);
        }
        case "edge.sourcePort":
        case "edge.targetPort":
            return pointsText((items as readonly ChannelPoint[]).slice(0, 1));
        default:
            return pointsText(items as readonly ChannelPoint[]);
    }
}
