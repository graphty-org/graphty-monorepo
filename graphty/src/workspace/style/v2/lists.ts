/**
 * Style panel v2's list things (design/ui/style-panel-v2/design.md, section 7.1, R15): which
 * graphty-element list channels make each item of a pie, stripes or a chart, the color a new item
 * starts with, and the one write of every list of an edit.
 */

import {
    type Channel,
    type ChannelDescriptor,
    readChannelList,
    writeChannelList,
} from "@graphty/graphty-element/catalog";

import type { RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";

/** One number of each item: its list channel, its name, and whether it reads as a percent. */
export interface ListNumber {
    readonly channel: Channel;
    readonly name: string;
    readonly percent?: boolean;
}

/** A list thing's list: the legend, the colors (one an item) and each item's numbers. */
export interface ListSpec {
    readonly name: string;
    /** The item's name, for each line's controls ("Slice 2 color"). */
    readonly item: string;
    readonly colors: Channel;
    readonly numbers: readonly ListNumber[];
}

/** The list things (design 7.1), by thing id. */
export const LISTS: Readonly<Record<string, ListSpec>> = {
    pie: {
        name: "Slices",
        item: "Slice",
        colors: "node.pieColors",
        numbers: [
            { channel: "node.pieSizes", name: "Share" },
            { channel: "node.pieOpacities", name: "Opacity", percent: true },
        ],
    },
    stripes: {
        name: "Stripes",
        item: "Stripe",
        colors: "node.stripeColors",
        numbers: [
            { channel: "node.stripeSizes", name: "Share" },
            { channel: "node.stripeOpacities", name: "Opacity", percent: true },
        ],
    },
    chart: {
        name: "Values",
        item: "Value",
        colors: "node.chartColors",
        numbers: [{ channel: "node.chartValues", name: "Value" }],
    },
};

/**
 * The color a new item starts with (design 5.1): the next of the document's colors after the
 * list's, else the color the row's nodes are drawn in.
 * @param ctx - the row.
 * @param colors - the list's colors now.
 * @returns the color.
 */
export function nextColor(ctx: RowContext, colors: readonly string[]): string {
    const unused = ctx.documentColors.find((color) => !colors.includes(color));
    if (unused !== undefined) {
        return unused;
    }
    const drawn = lineIn(ctx, "node.color")?.value ?? ctx.session.styles.defaultValue("node.color");
    return typeof drawn === "string" ? drawn : "#808080";
}

/**
 * Writes every list of a list thing in one undo step: the colors, and each number list that holds
 * items or is given new ones.
 * @param ctx - the row.
 * @param list - the list.
 * @param colors - the colors.
 * @param numbers - each number list's items, by channel.
 * @returns when it is written.
 */
export function writeList(
    ctx: RowContext,
    list: ListSpec,
    colors: readonly string[],
    numbers: Readonly<Partial<Record<Channel, readonly string[]>>>,
): Promise<unknown> {
    const also = Object.fromEntries(
        list.numbers.flatMap(({ channel }) => {
            const items = numbers[channel];
            return items === undefined || items.length === 0 ? [] : [[channel, writeChannelList(channel, items)]];
        }),
    );
    return writeIn(ctx, list.colors, { value: writeChannelList(list.colors, colors) }, also, true);
}

/**
 * A list channel's items as the row holds them.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns the items, as text.
 */
export function itemsOf(ctx: RowContext, channel: Channel): string[] {
    return readChannelList(channel, lineIn(ctx, channel)?.value).map(String);
}

/**
 * The structured text channels v2 edits as lists (design 6, R15, R17 and pairs): each a codec
 * between graphty-element's text form (its caveat's format) and items. Coordinates stay text,
 * so one the panel cannot read as a plain number (a length after its fraction) is written back
 * unchanged unless the reader edits it.
 */

/** A point, each coordinate as its text. */
export type Point = readonly [string, string];

/**
 * Points as `x,y` pairs separated by spaces (`node.shapePoints`, `edge.bends`, a port).
 * @param text - the text.
 * @returns the points.
 */
export function readPoints(text: unknown): Point[] {
    return typeof text !== "string"
        ? []
        : text
              .trim()
              .split(/\s+/)
              .filter((pair) => pair.includes(","))
              .map((pair) => {
                  const [x = "0", y = "0"] = pair.split(",");
                  return [x, y];
              });
}

/**
 * Points as text.
 * @param points - the points.
 * @returns the text.
 */
export function writePoints(points: readonly Point[]): string {
    return points.map(([x, y]) => `${x},${y}`).join(" ");
}

/**
 * Polylines or polygons separated by ";" (`node.shapeLines`, `node.shapeParts`).
 * @param text - the text.
 * @returns each one's points.
 */
export function readPolylines(text: unknown): Point[][] {
    return typeof text !== "string"
        ? []
        : text
              .split(";")
              .map((part) => readPoints(part))
              .filter((points) => points.length > 0);
}

/**
 * Polylines as text.
 * @param lines - each one's points.
 * @returns the text.
 */
export function writePolylines(lines: readonly (readonly Point[])[]): string {
    return lines.map((points) => writePoints(points)).join("; ");
}

/** One of a node's further texts (`node.shapeTexts`): its point, its words and what else it gives. */
export interface ShapeText {
    readonly point: Point;
    readonly text: string;
    readonly look?: unknown;
}

/**
 * A node's further texts, a JSON list of `[x, y, text, look?]`.
 * @param text - the JSON.
 * @returns the texts; none when it is not a list.
 */
export function readShapeTexts(text: unknown): ShapeText[] {
    let list: unknown;
    try {
        list = typeof text === "string" && text.trim() !== "" ? JSON.parse(text) : [];
    } catch {
        return [];
    }
    return Array.isArray(list)
        ? list.flatMap((entry: unknown): ShapeText[] =>
              Array.isArray(entry) && entry.length >= 3
                  ? [{ point: [String(entry[0]), String(entry[1])], text: String(entry[2]), look: entry[3] }]
                  : [],
          )
        : [];
}

/**
 * Further texts as JSON.
 * @param texts - the texts.
 * @returns the JSON.
 */
export function writeShapeTexts(texts: readonly ShapeText[]): string {
    return JSON.stringify(
        texts.map(({ point: [x, y], text, look }) => [
            Number(x) || 0,
            Number(y) || 0,
            text,
            ...(look === undefined ? [] : [look]),
        ]),
    );
}

/** One cap of an end's stack: its type, and its side, size, width and outline as written after it. */
export interface Cap {
    readonly type: string;
    readonly rest: string;
}

/**
 * An end's stack of caps (`edge.arrowHeadStack`): types separated by spaces, each optionally
 * followed by `:side`, `*size`, `xwidth`, `owidth`.
 * @param text - the text.
 * @returns the caps.
 */
export function readCaps(text: unknown): Cap[] {
    return typeof text !== "string"
        ? []
        : text
              .trim()
              .split(/\s+/)
              .filter((token) => token !== "")
              .map((token) => {
                  const type = /^[^:*]+/.exec(token)?.[0] ?? token;
                  return { type, rest: token.slice(type.length) };
              });
}

/**
 * Caps as text.
 * @param caps - the caps.
 * @returns the text.
 */
export function writeCaps(caps: readonly Cap[]): string {
    return caps.map(({ type, rest }) => `${type}${rest}`).join(" ");
}

/** A label table (`edge.labelTable`), as JSON: rows of cells of lines. */
interface Table {
    rows?: { cells?: { lines?: { text?: string }[] }[] }[];
}

/**
 * A label table's cells' words, row by row: each cell's first line.
 * @param text - the table's JSON.
 * @returns the table, parsed, and its words; none when it is not a table.
 */
export function readTable(text: unknown): { readonly table: Table; readonly rows: string[][] } {
    let table: Table = {};
    try {
        const parsed: unknown = typeof text === "string" && text.trim() !== "" ? JSON.parse(text) : {};
        table = typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
        table = {};
    }
    const rows = (table.rows ?? []).map((row) => (row.cells ?? []).map((cell) => cell.lines?.[0]?.text ?? ""));
    return { table, rows };
}

/**
 * A label table with new words, keeping every other thing each row and cell gives.
 * @param table - the table as read.
 * @param rows - each row's cells' words.
 * @returns the JSON.
 */
export function writeTable(table: Table, rows: readonly (readonly string[])[]): string {
    return JSON.stringify({
        ...table,
        rows: rows.map((cells, r) => {
            const row = table.rows?.[r] ?? {};
            return {
                ...row,
                cells: cells.map((words, c) => {
                    const cell = row.cells?.[c] ?? {};
                    const [, ...more] = cell.lines ?? [];
                    return { ...cell, lines: [{ ...cell.lines?.[0], text: words }, ...more] };
                }),
            };
        }),
    });
}

/** How v2 edits each structured text channel, and what its first item is when it is added (design 5.1). */
export type ItemKind = "points" | "polylines" | "texts" | "caps" | "table";

/** A structured channel's list. */
export interface ItemList {
    readonly kind: ItemKind;
    /** The list's name, on its legend. */
    readonly name: string;
    /** An item's name ("Line 2"). */
    readonly item: string;
    /** A new item, as text in the channel's form. */
    readonly fresh: string;
}

/** Every channel v2 edits as a list (design 7), by channel. */
export const ITEM_LISTS: Partial<Readonly<Record<Channel, ItemList>>> = {
    "node.shapeLines": { kind: "polylines", name: "Lines", item: "Line", fresh: "-1,0 1,0" },
    "node.shapeParts": { kind: "polylines", name: "Parts", item: "Part", fresh: "-0.5,-0.5 0.5,-0.5 0,0.5" },
    "node.shapePoints": { kind: "points", name: "Points", item: "Point", fresh: "0,0" },
    "edge.bends": { kind: "points", name: "Bends", item: "Bend", fresh: "0.5,0" },
    "node.shapeTexts": { kind: "texts", name: "Fields", item: "Field", fresh: '[[0,0,""]]' },
    "edge.labelTable": {
        kind: "table",
        name: "Rows",
        item: "Row",
        fresh: '{"rows":[{"cells":[{"lines":[{"text":""}]}]}]}',
    },
    ...Object.fromEntries(
        (["arrowHead", "arrowTail"] as const).map((end) => [
            `edge.${end}Stack`,
            { kind: "caps", name: "Stack", item: "Cap", fresh: "normal" },
        ]),
    ),
};

/**
 * A list's first item as words, for its row's read-only strip (R15r).
 * @param list - the list.
 * @param value - the channel's value.
 * @returns the words, empty for an empty list.
 */
export function firstItemWords(list: ItemList, value: unknown): string {
    switch (list.kind) {
        case "polylines": {
            const [first] = readPolylines(value);
            return first === undefined ? "" : writePoints(first);
        }
        case "points": {
            const [first] = readPoints(value);
            return first === undefined ? "" : writePoints([first]);
        }
        case "texts":
            return readShapeTexts(value)[0]?.text ?? "";
        case "caps":
            return readCaps(value)[0]?.type ?? "";
        default:
            return (readTable(value).rows[0] ?? []).join(" ");
    }
}

/**
 * A number descriptor for the coordinates of a structured channel.
 * @param descriptor - the channel's.
 * @returns the number descriptor.
 */
export function coordinateDescriptor(descriptor: ChannelDescriptor): ChannelDescriptor {
    return { ...descriptor, accepts: "number", min: undefined, max: undefined, step: 0.1 };
}
