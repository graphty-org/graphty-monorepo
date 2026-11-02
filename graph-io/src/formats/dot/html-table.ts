/**
 * @file The structure of a DOT HTML-like table label (`<TABLE>`, `<TR>`, `<TD>`, `<HR/>`, `<VR/>`) as the neutral
 * `labelTable` value: rows of cells, each with its attributes and its text as lines of font runs, a table of its
 * own, or a picture (`<IMG>`, its `SRC` as written). Graphviz's defaults are written out (lib/common/htmltable.c, htmllex.c), so a reader needs none of them. How
 * the cells are laid out is left to whoever draws the label, which measures the text.
 */

import { htmlLabelSpans } from "../../styles/canon/text.js";
import type { StyleValue } from "../../styles/types.js";

/** One line of a cell's text: its runs left to right, and which way the `<BR ALIGN>` that ends it lines it up. */
interface TableLine {
    runs: Record<string, StyleValue>[];
    align?: "left" | "right";
}

/** A picture in a cell (`<IMG>`): its file as written, and how it is scaled in the cell (`SCALE`; unset, `false`). */
interface TableImage {
    src: string;
    scale?: "true" | "width" | "height" | "both";
}

/** One cell (`<TD>`): its attributes, and its text, a table of its own or a picture. */
interface TableCell {
    lines?: TableLine[];
    table?: LabelTable;
    image?: TableImage;
    /** Its background (`BGCOLOR`), a color; of a gradient, its first color. */
    fill?: string;
    colspan?: number;
    rowspan?: number;
    width?: number;
    height?: number;
    fixedSize?: true;
    align?: "left" | "right" | "text";
    valign?: "top" | "bottom";
    balign?: "left" | "right";
    border?: number;
    padding?: number;
    /** A `<VR/>` before it: a rule between it and the cell on its left. */
    rule?: true;
}

/** One row (`<TR>`). */
interface TableRow {
    cells: TableCell[];
    /** An `<HR/>` before it: a rule between it and the row above. */
    rule?: true;
}

/** A table, in points: Graphviz's defaults written out. */
export interface LabelTable {
    border: number;
    cellBorder: number;
    cellSpacing: number;
    cellPadding: number;
    width?: number;
    height?: number;
    fixedSize?: true;
    align?: "left" | "right";
    valign?: "top" | "bottom";
    /** Its background (`BGCOLOR`), a color; of a gradient, its first color. */
    fill?: string;
    rows: TableRow[];
}

/** The font of a run inside font tags, as `labelRuns` fields (the DOT reader's `htmlRunFont`). */
type RunFont = (tags: readonly string[]) => Record<string, StyleValue>;

/** A Graphviz color as a CSS color, or null for none or a bad one (the DOT reader's color reading). */
type ReadColor = (value: string) => string | null;

/** A tag of the label: its name in lower case, whether it closes or closes itself, its attributes, where it ends. */
interface Tag {
    readonly name: string;
    readonly closing: boolean;
    readonly empty: boolean;
    readonly text: string;
    readonly start: number;
    readonly end: number;
}

/** The font tags a table may sit inside, or a cell's text inside. */
const FONT_TAGS: ReadonlySet<string> = new Set(["font", "b", "i", "u", "o", "s", "sub", "sup"]);

/** How deep tables may nest inside cells; deeper ones are dropped. */
const MAX_DEPTH = 8;

/**
 * The next tag at or after an offset, or null.
 * @param body - the label
 * @param from - where to look from
 * @returns the tag
 */
function nextTag(body: string, from: number): Tag | null {
    const start = body.indexOf("<", from);
    const close = start < 0 ? -1 : body.indexOf(">", start + 1);
    if (close < 0) {
        return null;
    }
    const text = body.slice(start + 1, close);
    const closing = text.startsWith("/");
    const name = (/^\/?\s*([a-z]+)/i.exec(text)?.[1] ?? "").toLowerCase();
    return { name, closing, empty: text.endsWith("/"), text, start, end: close + 1 };
}

/**
 * Where the cell whose content starts at an offset ends: its `</TD>`, past the cells of tables inside it.
 * @param body - the label
 * @param from - where its content starts
 * @returns the closing tag, or null when there is none
 */
function cellEnd(body: string, from: number): Tag | null {
    let depth = 0;
    for (let tag = nextTag(body, from); tag !== null; tag = nextTag(body, tag.end)) {
        if (tag.name === "td" && !tag.empty) {
            if (!tag.closing) {
                depth++;
            } else if (depth === 0) {
                return tag;
            } else {
                depth--;
            }
        }
    }
    return null;
}

/**
 * A whole-number attribute as Graphviz reads it (strtol, so "1.5" is 1) in its range; null when absent, empty or out
 * of range (Graphviz then keeps its default).
 * @param attrs - the tag's attributes, by lowercase name
 * @param name - the attribute
 * @param min - the least value
 * @param max - the largest value
 * @returns the value, or null
 */
function whole(attrs: ReadonlyMap<string, string>, name: string, min: number, max: number): number | null {
    const v = Number.parseInt(attrs.get(name) ?? "", 10);
    return Number.isFinite(v) && v >= min && v <= max ? v : null;
}

/**
 * The size attributes shared by a table and a cell: `WIDTH`, `HEIGHT` (a least size; 0 is none) and `FIXEDSIZE`.
 * @param attrs - the tag's attributes
 * @returns the fields that are set
 */
function sizeFields(attrs: ReadonlyMap<string, string>): Pick<TableCell, "width" | "height" | "fixedSize"> {
    const width = whole(attrs, "width", 0, 65535) ?? 0;
    const height = whole(attrs, "height", 0, 65535) ?? 0;
    return {
        ...(width > 0 ? { width } : {}),
        ...(height > 0 ? { height } : {}),
        ...((attrs.get("fixedsize") ?? "").toLowerCase() === "true" ? { fixedSize: true as const } : {}),
    };
}

/**
 * `ALIGN` and `VALIGN` as written, lowercase, where they move something off center.
 * @param attrs - the tag's attributes
 * @param text - whether `ALIGN="TEXT"` is allowed (a cell's)
 * @returns the fields that are set
 */
function alignFields(attrs: ReadonlyMap<string, string>, text: boolean): Pick<TableCell, "align" | "valign"> {
    const align = (attrs.get("align") ?? "").toLowerCase();
    const valign = (attrs.get("valign") ?? "").toLowerCase();
    return {
        ...(align === "left" || align === "right" || (text && align === "text") ? { align } : {}),
        ...(valign === "top" || valign === "bottom" ? { valign } : {}),
    };
}

/** What reading a table needs besides the label. */
interface Reading {
    readonly body: string;
    readonly attributes: (tag: string) => Map<string, string>;
    readonly runFont: RunFont;
    readonly color: ReadColor;
}

/**
 * Reads a table from just after its `<TABLE ...>` tag to its `</TABLE>`.
 * @param r - the label and the helpers
 * @param attrs - the table tag's attributes
 * @param from - where its content starts
 * @param fonts - the font tags open round it, outermost first
 * @param depth - how deep it is inside other tables
 * @returns the table and where reading goes on
 */
function readTable(
    r: Reading,
    attrs: ReadonlyMap<string, string>,
    from: number,
    fonts: readonly string[],
    depth: number,
): { table: LabelTable; next: number } {
    const border = whole(attrs, "border", 0, 255) ?? 1;
    const table: LabelTable = {
        border,
        cellBorder: whole(attrs, "cellborder", 0, 127) ?? border,
        // a negative CELLSPACING overlaps the cells; graphty lays none out overlapping
        cellSpacing: Math.max(0, whole(attrs, "cellspacing", -128, 127) ?? 2),
        cellPadding: whole(attrs, "cellpadding", 0, 255) ?? 2,
        ...sizeFields(attrs),
        ...(alignFields(attrs, false) as Pick<LabelTable, "align" | "valign">),
        ...fillField(r, attrs),
        rows: [],
    };
    const state: RowState = { row: null, rowRule: false, cellRule: false };
    let at = from;
    for (let tag = nextTag(r.body, at); tag !== null; tag = nextTag(r.body, at)) {
        if (tag.name === "table" && tag.closing) {
            return { table, next: tag.end };
        }
        at = readRowTag(r, table, state, tag, { fonts, depth });
    }
    return { table, next: at };
}

/** Where reading a table's rows is: the row being read, and whether a rule comes before the next row or cell. */
interface RowState {
    row: TableRow | null;
    rowRule: boolean;
    cellRule: boolean;
}

/**
 * Reads one tag of a table's rows: a row, a rule, or a cell with its content.
 * @param r - the label and the helpers
 * @param table - the table, its rows added to
 * @param state - where reading its rows is, changed in place
 * @param tag - the tag
 * @param nest - the font tags open round the table, and how deep it is inside other tables
 * @param nest.fonts - the font tags, outermost first
 * @param nest.depth - the depth
 * @returns where reading goes on
 */
function readRowTag(
    r: Reading,
    table: LabelTable,
    state: RowState,
    tag: Tag,
    nest: { fonts: readonly string[]; depth: number },
): number {
    if (tag.name === "tr" && !tag.closing) {
        state.row = { cells: [], ...(state.rowRule ? { rule: true as const } : {}) };
        table.rows.push(state.row);
        state.rowRule = false;
    } else if (tag.name === "hr") {
        state.rowRule = true;
    } else if (tag.name === "vr") {
        state.cellRule = true;
    } else if (tag.name === "td" && !tag.closing && state.row !== null) {
        return readCellTag(r, state.row, state, tag, nest);
    }
    return tag.end;
}

/**
 * Reads a `<TD>` and its content into its row.
 * @param r - the label and the helpers
 * @param row - the row, its cells added to
 * @param state - where reading the rows is: whether a rule comes before the cell, cleared
 * @param tag - the cell's tag
 * @param nest - the font tags open round the table, and how deep it is inside other tables
 * @param nest.fonts - the font tags, outermost first
 * @param nest.depth - the depth
 * @returns where reading goes on: after its `</TD>`
 */
function readCellTag(
    r: Reading,
    row: TableRow,
    state: RowState,
    tag: Tag,
    nest: { fonts: readonly string[]; depth: number },
): number {
    const end = tag.empty ? null : cellEnd(r.body, tag.end);
    const content = end === null ? "" : r.body.slice(tag.end, end.start);
    const cell = readCell(r, r.attributes(tag.text), content, nest);
    row.cells.push(state.cellRule ? { ...cell, rule: true } : cell);
    state.cellRule = false;
    return end === null ? tag.end : end.end;
}

/**
 * The `<TABLE>` tag a markup opens with, perhaps inside font tags, and those font tags; null when it opens with text
 * or any other tag.
 * @param markup - the markup
 * @returns the table tag and the font tags round it, outermost first, or null
 */
function openingTable(markup: string): { tag: Tag; fonts: string[] } | null {
    const fonts: string[] = [];
    for (let tag = nextTag(markup, 0); tag !== null; tag = nextTag(markup, tag.end)) {
        if (
            markup
                .slice(0, tag.start)
                .replaceAll(/<[^<>]*>/g, "")
                .trim() !== ""
        ) {
            return null;
        }
        if (tag.name === "table" && !tag.closing) {
            return { tag, fonts };
        }
        if (!FONT_TAGS.has(tag.name) || tag.closing) {
            return null;
        }
        fonts.push(`<${tag.text}>`);
    }
    return null;
}

/**
 * Reads one cell: its attributes, and its content -- a table (perhaps inside font tags), or its text.
 * @param r - the label and the helpers
 * @param attrs - the cell tag's attributes
 * @param content - the markup between `<TD>` and `</TD>`
 * @param nest - the font tags open round its table, and how deep that table is inside other tables
 * @param nest.fonts - the font tags, outermost first
 * @param nest.depth - the depth
 * @returns the cell
 */
function readCell(
    r: Reading,
    attrs: ReadonlyMap<string, string>,
    content: string,
    nest: { fonts: readonly string[]; depth: number },
): TableCell {
    const balign = (attrs.get("balign") ?? "").toLowerCase();
    const colspan = whole(attrs, "colspan", 1, 65535) ?? 1;
    const rowspan = whole(attrs, "rowspan", 1, 65535) ?? 1;
    const border = whole(attrs, "border", 0, 127);
    const padding = whole(attrs, "cellpadding", 0, 255);
    const cell: TableCell = {
        ...(colspan > 1 ? { colspan } : {}),
        ...(rowspan > 1 ? { rowspan } : {}),
        ...sizeFields(attrs),
        ...alignFields(attrs, true),
        ...(balign === "left" || balign === "right" ? { balign } : {}),
        ...(border === null ? {} : { border }),
        ...(padding === null ? {} : { padding }),
        ...fillField(r, attrs),
    };
    // a table inside the cell, perhaps inside font tags
    const inner = openingTable(content);
    if (inner !== null) {
        if (nest.depth + 1 < MAX_DEPTH) {
            const fonts = [...nest.fonts, ...inner.fonts];
            const body = { ...r, body: content };
            cell.table = readTable(body, r.attributes(inner.tag.text), inner.tag.end, fonts, nest.depth + 1).table;
        }
        return cell;
    }
    const image = cellImage(r, content);
    if (image !== null) {
        cell.image = image;
        return cell;
    }
    const lines = cellLines(content, nest.fonts, r.runFont);
    if (lines.length > 0) {
        cell.lines = lines;
    }
    return cell;
}

/**
 * A `BGCOLOR` as a fill: a gradient's first color (`"red:blue"`, `"red;0.3:blue"`).
 * @param r - the label and the helpers
 * @param attrs - the tag's attributes
 * @returns the field, when it is a color
 */
function fillField(r: Reading, attrs: ReadonlyMap<string, string>): { fill?: string } {
    const first = (attrs.get("bgcolor") ?? "").split(":")[0].split(";")[0].trim();
    const fill = first === "" ? null : r.color(first);
    return fill === null ? {} : { fill };
}

/**
 * The picture a cell holds: its content is one `<IMG>` (Graphviz allows nothing beside it), with a `SRC`.
 * @param r - the label and the helpers
 * @param content - the cell's markup
 * @returns the picture, or null
 */
function cellImage(r: Reading, content: string): TableImage | null {
    const tag = nextTag(content, 0);
    if (tag?.name !== "img" || tag.closing) {
        return null;
    }
    const attrs = r.attributes(tag.text);
    const src = (attrs.get("src") ?? "").trim();
    if (src === "") {
        return null;
    }
    const scale = (attrs.get("scale") ?? "").toLowerCase();
    return scale === "true" || scale === "width" || scale === "height" || scale === "both" ? { src, scale } : { src };
}

/**
 * A cell's text as lines of font runs: a `<BR>` ends a line and its `ALIGN` lines that line up; a last `<BR>` starts
 * no empty line. Blanks at a line's ends are dropped, as Graphviz draws none there.
 * @param content - the cell's markup
 * @param fonts - the font tags open round the table, outermost first
 * @param runFont - a run's font from its tags
 * @returns the lines; none for a cell with no text
 */
function cellLines(content: string, fonts: readonly string[], runFont: RunFont): TableLine[] {
    const aligns = [...content.matchAll(/<br\b([^>]*)>/gi)].map(
        (m) => /\balign\s*=\s*["']?(left|right)/i.exec(m[1])?.[1].toLowerCase() as "left" | "right" | undefined,
    );
    const lines: TableLine[] = [{ runs: [] }];
    for (const span of htmlLabelSpans(`<${fonts.join("")}${content}>`)) {
        const font = runFont(span.tags);
        span.text.split("\n").forEach((text, i) => {
            if (i > 0) {
                lines.push({ runs: [] });
            }
            const line = lines.at(-1) ?? { runs: [] };
            const last = line.runs.at(-1);
            if (last !== undefined && JSON.stringify({ ...last, text: "" }) === JSON.stringify({ ...font, text: "" })) {
                last.text = `${String(last.text)}${text}`;
            } else if (text !== "") {
                line.runs.push({ text, ...font });
            }
        });
    }
    // a last break starts no line of its own
    if (lines.length > 1 && lines.at(-1)?.runs.every((run) => String(run.text).trim() === "")) {
        lines.pop();
    }
    lines.forEach((line, i) => {
        trimLine(line);
        const align = aligns[i];
        if (align !== undefined) {
            line.align = align;
        }
    });
    return lines.every((line) => line.runs.length === 0) ? [] : lines;
}

/**
 * Drops the blanks at a line's ends, and the runs left empty.
 * @param line - the line, changed in place
 */
function trimLine(line: TableLine): void {
    const first = line.runs[0];
    if (first !== undefined) {
        first.text = String(first.text).trimStart();
    }
    const last = line.runs.at(-1);
    if (last !== undefined) {
        last.text = String(last.text).trimEnd();
    }
    line.runs = line.runs.filter((run) => run.text !== "");
}

/**
 * The table an HTML-like label is, perhaps inside font tags (Graphviz's `fonttable`), or null for any other label.
 * @param markup - the label without its outer `<` and `>`
 * @param attributes - a tag's attributes by lowercase name
 * @param runFont - a run's font from its tags
 * @param color - a `BGCOLOR` color as a CSS color
 * @returns the table, or null
 */
export function readLabelTable(
    markup: string,
    attributes: (tag: string) => Map<string, string>,
    runFont: RunFont,
    color: ReadColor,
): LabelTable | null {
    const opened = openingTable(markup);
    if (opened === null) {
        return null;
    }
    return readTable(
        { body: markup, attributes, runFont, color },
        attributes(opened.tag.text),
        opened.tag.end,
        opened.fonts,
        0,
    ).table;
}
