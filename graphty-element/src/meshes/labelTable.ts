/**
 * A label laid out as a table of cells (`shape.labelTable`): pure arithmetic over the table's structure and its
 * measured text, as Graphviz lays out an HTML-like `<TABLE>` (lib/common/htmltable.c `size_html_tbl`,
 * `pos_html_tbl`, `pos_html_cell`). Nothing here reaches Babylon.js, Lit or the DOM: the caller measures the text.
 */

/** Which way something lines up across its room. */
export type TableAlign = "left" | "right" | "center";

/** Which way something lines up down its room. */
export type TableVAlign = "top" | "bottom" | "middle";

/** Which way a length lines up in a longer one: toward its start, its end, or in its middle. */
type Way = "start" | "end" | "middle";

/** One line of a cell's text: its words in label markup, and which way it lines up in the cell's text box. */
export interface LabelTableLine {
    readonly text: string;
    readonly align?: TableAlign;
}

/**
 * A picture in a cell: its URL, and how it is scaled inside the cell's padding (unset: at its own size, each pixel
 * `pixelSize` long; `true` keeps its proportions, `both` stretches it, `width` or `height` stretches that side only).
 */
export interface LabelTableImage {
    readonly src: string;
    readonly scale?: "true" | "width" | "height" | "both";
    readonly pixelSize?: number;
}

/** One cell of a table. Lengths are in the units of the node's size. */
export interface LabelTableCell {
    readonly lines?: readonly LabelTableLine[];
    readonly table?: LabelTable;
    readonly image?: LabelTableImage;
    /** Its background color. */
    readonly fill?: string;
    readonly colspan?: number;
    readonly rowspan?: number;
    readonly width?: number;
    readonly height?: number;
    readonly fixedSize?: boolean;
    readonly align?: TableAlign | "text";
    readonly valign?: TableVAlign;
    readonly balign?: TableAlign;
    readonly border?: number;
    readonly padding?: number;
    readonly rule?: boolean;
}

/** One row of a table. */
export interface LabelTableRow {
    readonly cells: readonly LabelTableCell[];
    readonly rule?: boolean;
}

/** A table, as `shape.labelTable` writes it (JSON). Every length unset is 0. */
export interface LabelTable {
    readonly border?: number;
    readonly cellBorder?: number;
    readonly cellSpacing?: number;
    readonly cellPadding?: number;
    readonly width?: number;
    readonly height?: number;
    readonly fixedSize?: boolean;
    readonly align?: TableAlign;
    readonly valign?: TableVAlign;
    /** Its background color. */
    readonly fill?: string;
    readonly lineHeight?: number;
    readonly rows: readonly LabelTableRow[];
}

/** A box, from the table's top left corner, y down. */
export interface TableBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** What a laid-out table draws. */
export interface TableDrawing {
    /** The table's width and height. */
    readonly width: number;
    readonly height: number;
    /** Every cell's outline, and every inner table's, each with its width; the table's own outline is not one. */
    readonly frames: readonly (TableBox & { readonly border: number })[];
    /** The rules between rows and cells (`<HR/>`, `<VR/>`), each from one point to the other. */
    readonly rules: readonly (readonly [number, number, number, number])[];
    /** Every line of text, centered on its point. */
    readonly texts: readonly { readonly x: number; readonly y: number; readonly text: string }[];
    /** Every background, the table's own first, each table's before its cells': the box it fills and its color. */
    readonly fills: readonly (TableBox & { readonly color: string })[];
    /** Every picture: the box inside its cell's padding it is drawn in, lined up by the cell's `align` and `valign`. */
    readonly images: readonly (TableBox & {
        readonly image: LabelTableImage;
        readonly align?: string;
        readonly valign?: string;
    })[];
}

/** A text's width and height, measured: the height one line of the label's font size. */
export type MeasureText = (text: string) => { width: number; height: number };

/** A cell placed in its table's grid, with the size it asks for. */
interface Placed {
    readonly cell: LabelTableCell;
    readonly row: number;
    readonly col: number;
    readonly rows: number;
    readonly cols: number;
    readonly width: number;
    readonly height: number;
    readonly inner: Sized | null;
    readonly lines: readonly { text: string; align?: string; width: number; height: number }[];
}

/** A table sized: its grid's columns and rows, its cells, its own size. */
interface Sized {
    readonly table: LabelTable;
    readonly cells: readonly Placed[];
    readonly widths: number[];
    readonly heights: number[];
    readonly width: number;
    readonly height: number;
}

/** What sizes a table or a cell. */
type Sizing = Pick<LabelTableCell, "fixedSize" | "width" | "height">;

/** How deep tables are laid out inside cells. */
const MAX_DEPTH = 8;

/**
 * A non-negative length, or 0.
 * @param v - the value
 * @returns it, or 0
 */
function len(v: number | undefined): number {
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Whether a table or a cell is drawn at exactly its size: `fixedSize` with both a width and a height.
 * @param t - the table or cell
 * @returns true when it is
 */
function isFixed(t: Sizing): boolean {
    return t.fixedSize === true && len(t.width) > 0 && len(t.height) > 0;
}

/**
 * Grows the columns (or rows) a spanning cell covers until they hold it, its shortfall shared evenly.
 * @param sizes - the columns' widths or the rows' heights, grown in place
 * @param from - the first it covers
 * @param span - how many it covers
 * @param need - the length it needs
 * @param spacing - the room between two of them, which it covers too
 */
function growSpan(sizes: number[], from: number, span: number, need: number, spacing: number): void {
    let have = (span - 1) * spacing;
    for (let i = from; i < from + span; i++) {
        have += sizes[i];
    }
    // ponytail: shared evenly; Graphviz solves a network simplex over the spans, which differs only where spans
    // overlap unevenly
    const short = (need - have) / span;
    if (short > 0) {
        for (let i = from; i < from + span; i++) {
            sizes[i] += short;
        }
    }
}

/**
 * Sizes a table: each cell's size, its place in the grid, the grid's columns and rows, and the table's size.
 * @param table - the table
 * @param measure - measures a text
 * @param lineHeight - a text line's height as a multiple of its measured height
 * @param depth - how deep it is inside other tables
 * @returns the sized table
 */
function sizeTable(table: LabelTable, measure: MeasureText, lineHeight: number, depth: number): Sized {
    const spacing = len(table.cellSpacing);
    const taken = new Set<string>();
    const cells: Placed[] = [];
    table.rows.forEach((row, r) => {
        let c = 0;
        for (const cell of row.cells) {
            while (taken.has(`${r},${c}`)) {
                c++;
            }
            const rows = Math.max(1, Math.floor(cell.rowspan ?? 1));
            const cols = Math.max(1, Math.floor(cell.colspan ?? 1));
            for (let i = r; i < r + rows; i++) {
                for (let j = c; j < c + cols; j++) {
                    taken.add(`${i},${j}`);
                }
            }
            cells.push(sizeCell(table, cell, { row: r, col: c, rows, cols }, measure, lineHeight, depth));
            c += cols;
        }
    });
    const nCols = Math.max(0, ...cells.map((p) => p.col + p.cols));
    const nRows = Math.max(table.rows.length, ...cells.map((p) => p.row + p.rows));
    const widths = Array.from({ length: nCols }, () => 0);
    const heights = Array.from({ length: nRows }, () => 0);
    // the cells of one column or row first, then the spanning ones grow what they cover
    for (const p of [...cells].sort((a, b) => a.cols + a.rows - (b.cols + b.rows))) {
        growSpan(widths, p.col, p.cols, p.width, spacing);
        growSpan(heights, p.row, p.rows, p.height, spacing);
    }
    const border = len(table.border);
    const natural = (sizes: number[]): number =>
        sizes.reduce((sum, v) => sum + v, 0) + (sizes.length + 1) * spacing + 2 * border;
    const fixed = isFixed(table);
    return {
        table,
        cells,
        widths,
        heights,
        width: fixed ? len(table.width) : Math.max(natural(widths), len(table.width)),
        height: fixed ? len(table.height) : Math.max(natural(heights), len(table.height)),
    };
}

/**
 * Sizes one cell: its content (its lines' widest and their heights, or its table) inside its padding and border,
 * at least its own width and height, exactly them when it is fixed.
 * @param table - its table
 * @param cell - the cell
 * @param at - its place in the grid
 * @param at.row - its first row
 * @param at.col - its first column
 * @param at.rows - how many rows it spans
 * @param at.cols - how many columns it spans
 * @param measure - measures a text
 * @param lineHeight - a text line's height as a multiple of its measured height
 * @param depth - how deep its table is inside other tables
 * @returns the placed cell
 */
function sizeCell(
    table: LabelTable,
    cell: LabelTableCell,
    at: { row: number; col: number; rows: number; cols: number },
    measure: MeasureText,
    lineHeight: number,
    depth: number,
): Placed {
    const inner =
        cell.table !== undefined && depth < MAX_DEPTH ? sizeTable(cell.table, measure, lineHeight, depth + 1) : null;
    const lines = (inner === null ? (cell.lines ?? []) : []).map((line) => {
        const m = measure(line.text);
        return { text: line.text, align: line.align, width: m.width, height: m.height * lineHeight };
    });
    const content = inner ?? {
        width: Math.max(0, ...lines.map((l) => l.width)),
        height: lines.reduce((sum, l) => sum + l.height, 0),
    };
    const margin = 2 * (cellPadding(table, cell) + cellBorder(table, cell));
    const fixed = isFixed(cell);
    return {
        cell,
        ...at,
        inner,
        lines,
        width: fixed ? len(cell.width) : Math.max(content.width + margin, len(cell.width)),
        height: fixed ? len(cell.height) : Math.max(content.height + margin, len(cell.height)),
    };
}

/**
 * A cell's padding: its own, else its table's.
 * @param table - its table
 * @param cell - the cell
 * @returns the padding
 */
function cellPadding(table: LabelTable, cell: LabelTableCell): number {
    return len(cell.padding ?? table.cellPadding);
}

/**
 * A cell's border width: its own, else its table's for its cells.
 * @param table - its table
 * @param cell - the cell
 * @returns the width
 */
function cellBorder(table: LabelTable, cell: LabelTableCell): number {
    return len(cell.border ?? table.cellBorder);
}

/**
 * Where a length sits in a longer one, lined up one way.
 * @param start - where the longer one starts
 * @param room - its length
 * @param size - the shorter one's length
 * @param way - which way it lines up: toward the start ("left", "top"), the end, or the middle
 * @returns where the shorter one starts
 */
function lineUp(start: number, room: number, size: number, way: Way): number {
    if (way === "start") {
        return start;
    }
    return way === "end" ? start + room - size : start + (room - size) / 2;
}

/**
 * Which way a horizontal alignment lines up.
 * @param align - the alignment
 * @returns the way
 */
function across(align: string | undefined): Way {
    if (align === "left") {
        return "start";
    }
    return align === "right" ? "end" : "middle";
}

/**
 * Which way a vertical alignment lines up.
 * @param valign - the alignment
 * @returns the way
 */
function down(valign: string | undefined): Way {
    if (valign === "top") {
        return "start";
    }
    return valign === "bottom" ? "end" : "middle";
}

/** What laying out a table collects. */
interface Collected {
    frames: (TableBox & { border: number })[];
    rules: [number, number, number, number][];
    texts: { x: number; y: number; text: string }[];
    fills: (TableBox & { color: string })[];
    images: TableDrawing["images"][number][];
}

/**
 * Places a sized table in a box: a fixed table lined up in it at its own size, any other given the box's extra room
 * shared evenly among its columns and rows; then each cell in its columns and rows.
 * @param s - the sized table
 * @param box - the room it is given
 * @param out - collects what it draws
 * @param outline - whether its own outline is drawn (not the label's own table: the node draws that)
 */
function placeTable(s: Sized, box: TableBox, out: Collected, outline: boolean): void {
    const { table } = s;
    let b = box;
    if (isFixed(table)) {
        b = {
            x: lineUp(box.x, box.width, s.width, across(table.align)),
            y: lineUp(box.y, box.height, s.height, down(table.valign)),
            width: s.width,
            height: s.height,
        };
    }
    const border = len(table.border);
    const spacing = len(table.cellSpacing);
    if (outline && border > 0) {
        out.frames.push({ ...b, border });
    }
    if (typeof table.fill === "string" && table.fill !== "") {
        out.fills.push({ ...b, color: table.fill });
    }
    const extraX = s.widths.length > 0 ? Math.max(0, b.width - s.width) / s.widths.length : 0;
    const extraY = s.heights.length > 0 ? Math.max(0, b.height - s.height) / s.heights.length : 0;
    const colX: number[] = [];
    let x = b.x + border + spacing;
    for (const w of s.widths) {
        colX.push(x);
        x += w + extraX + spacing;
    }
    const rowY: number[] = [];
    let y = b.y + border + spacing;
    for (const h of s.heights) {
        rowY.push(y);
        y += h + extraY + spacing;
    }
    const span = (sizes: number[], from: number, n: number, extra: number): number =>
        sizes.slice(from, from + n).reduce((sum, v) => sum + v + extra, 0) + (n - 1) * spacing;
    table.rows.forEach((row, r) => {
        if (row.rule === true && r > 0 && r < rowY.length) {
            const ry = rowY[r] - spacing / 2;
            out.rules.push([b.x + border, ry, b.x + b.width - border, ry]);
        }
    });
    for (const p of s.cells) {
        const cellBox = {
            x: colX[p.col],
            y: rowY[p.row],
            width: span(s.widths, p.col, p.cols, extraX),
            height: span(s.heights, p.row, p.rows, extraY),
        };
        if (p.cell.rule === true && p.col > 0) {
            const rx = cellBox.x - spacing / 2;
            out.rules.push([rx, cellBox.y, rx, cellBox.y + cellBox.height]);
        }
        placeCell(table, p, cellBox, out);
    }
}

/**
 * Places one cell in its box: a fixed cell lined up in it at its own size; its outline; its table, or its text box
 * lined up inside its padding and each line lined up in the text box.
 * @param table - its table
 * @param p - the placed cell
 * @param box - the room its columns and rows give it
 * @param out - collects what it draws
 */
function placeCell(table: LabelTable, p: Placed, box: TableBox, out: Collected): void {
    const { cell } = p;
    let b = box;
    if (isFixed(cell)) {
        b = {
            x: lineUp(box.x, box.width, Math.min(box.width, p.width), across(cell.align)),
            y: lineUp(box.y, box.height, Math.min(box.height, p.height), down(cell.valign)),
            width: Math.min(box.width, p.width),
            height: Math.min(box.height, p.height),
        };
    }
    const border = cellBorder(table, cell);
    if (border > 0) {
        out.frames.push({ ...b, border });
    }
    if (typeof cell.fill === "string" && cell.fill !== "") {
        // Graphviz fills the cell inside its border
        out.fills.push({
            x: b.x + border,
            y: b.y + border,
            width: b.width - 2 * border,
            height: b.height - 2 * border,
            color: cell.fill,
        });
    }
    const inset = border + cellPadding(table, cell);
    const inner = { x: b.x + inset, y: b.y + inset, width: b.width - 2 * inset, height: b.height - 2 * inset };
    if (p.inner !== null) {
        placeTable(p.inner, inner, out, true);
        return;
    }
    if (cell.image !== undefined && typeof cell.image.src === "string" && cell.image.src !== "") {
        out.images.push({ ...inner, image: cell.image, align: cell.align, valign: cell.valign });
        return;
    }
    const textWidth = Math.max(0, ...p.lines.map((l) => l.width));
    const textHeight = p.lines.reduce((sum, l) => sum + l.height, 0);
    // ALIGN="TEXT" lines the lines up across the whole cell; any other ALIGN moves the text box
    const wide = cell.align === "text";
    const tx = wide ? inner.x : lineUp(inner.x, inner.width, textWidth, across(cell.align));
    const tw = wide ? inner.width : textWidth;
    let ty = lineUp(inner.y, inner.height, textHeight, down(cell.valign));
    for (const line of p.lines) {
        const lx = lineUp(tx, tw, line.width, across(line.align ?? cell.balign));
        out.texts.push({ x: lx + line.width / 2, y: ty + line.height / 2, text: line.text });
        ty += line.height;
    }
}

/**
 * Lays a table out: its size, and where its cells' outlines, its rules and its text lines go, from its top left
 * corner, y down.
 * @param table - the table
 * @param measure - measures a text: its width, and one line's height at the label's size
 * @returns what it draws
 */
export function layoutLabelTable(table: LabelTable, measure: MeasureText): TableDrawing {
    const lineHeight = typeof table.lineHeight === "number" && table.lineHeight > 0 ? table.lineHeight : 1;
    const sized = sizeTable(table, measure, lineHeight, 0);
    const out: Collected = { frames: [], rules: [], texts: [], fills: [], images: [] };
    placeTable(sized, { x: 0, y: 0, width: sized.width, height: sized.height }, out, false);
    return { width: sized.width, height: sized.height, ...out };
}

/**
 * Reads `shape.labelTable`: a table as JSON, or null when it is absent or is not one.
 * @param json - the value
 * @returns the table, or null
 */
export function readLabelTable(json: string | undefined): LabelTable | null {
    if (json === undefined || json.trim() === "") {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(json);
        return isTable(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Whether a value has a table's shape: rows of cells, each an object.
 * @param v - the value
 * @returns true when it does
 */
function isTable(v: unknown): v is LabelTable {
    if (typeof v !== "object" || v === null || !Array.isArray((v as { rows?: unknown }).rows)) {
        return false;
    }
    return (v as { rows: unknown[] }).rows.every(
        (row) =>
            typeof row === "object" &&
            row !== null &&
            Array.isArray((row as { cells?: unknown }).cells) &&
            (row as { cells: unknown[] }).cells.every(
                (cell) =>
                    typeof cell === "object" &&
                    cell !== null &&
                    ((cell as { table?: unknown }).table === undefined ||
                        isTable((cell as { table: unknown }).table)) &&
                    ((cell as { lines?: unknown }).lines === undefined ||
                        (Array.isArray((cell as { lines: unknown }).lines) &&
                            (cell as { lines: unknown[] }).lines.every(
                                (l) => typeof (l as { text?: unknown } | null)?.text === "string",
                            ))),
            ),
    );
}
