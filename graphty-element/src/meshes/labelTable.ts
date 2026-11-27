/**
 * A label laid out as a table of cells (`shape.labelTable`): pure arithmetic over the table's structure and its
 * measured text, as Graphviz lays out an HTML-like `<TABLE>` (lib/common/htmltable.c `size_html_tbl`,
 * `pos_html_tbl`, `pos_html_cell`). Nothing here reaches Babylon.js, Lit or the DOM: the caller measures the text.
 */

/** Which way something lines up across its room. */
type TableAlign = "left" | "right" | "center";

/** Which way something lines up down its room. */
type TableVAlign = "top" | "bottom" | "middle";

/** Which way a length lines up in a longer one: toward its start, its end, or in its middle. */
type Way = "start" | "end" | "middle";

/** One line of a cell's text: its words in label markup, and which way it lines up in the cell's text box. */
interface LabelTableLine {
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
interface LabelTableCell {
    readonly lines?: readonly LabelTableLine[];
    readonly table?: LabelTable;
    readonly image?: LabelTableImage;
    /** Its background color; of a gradient, the color it starts from. */
    readonly fill?: string;
    /** Of a gradient background, the color it runs to from `fill`. */
    readonly fillGradient?: string;
    /**
     * Which way the gradient runs, in degrees clockwise on screen from left to right (unset, 0): from `fill` at the
     * box's middle less half its width times the angle's cosine and half its height times its sine, to `fillGradient`
     * as far the other way, as a node's gradient fill runs over its box.
     */
    readonly fillGradientAngle?: number;
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
    /** Kept its room but drawn with nothing: no fill, border, text, picture or table (Graphviz's `STYLE="invis"`). */
    readonly hidden?: boolean;
}

/** One row of a table. */
interface LabelTableRow {
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
    /** Its background color; of a gradient, the color it starts from. */
    readonly fill?: string;
    /** Of a gradient background, the color it runs to from `fill`. */
    readonly fillGradient?: string;
    /**
     * Which way the gradient runs, in degrees clockwise on screen from left to right (unset, 0): from `fill` at the
     * box's middle less half its width times the angle's cosine and half its height times its sine, to `fillGradient`
     * as far the other way, as a node's gradient fill runs over its box.
     */
    readonly fillGradientAngle?: number;
    /**
     * How round its corners are, its outline's and its background's: a length, at most a third of its box's shorter
     * side (unset, square).
     */
    readonly radius?: number;
    /**
     * How tall a text line is: a multiple of its font size (unset, 1), or `"font"`, its font's ascent plus its
     * descent, each rounded up to whole `textPixel`s when that is given.
     */
    readonly lineHeight?: number | "font";
    /** The length a line's ascent and descent are each rounded up to whole ones of (`lineHeight: "font"`). */
    readonly textPixel?: number;
    /**
     * How far a line's baseline sits below the line's top, as a multiple of its font size; unset, the line's words
     * are centered in it.
     */
    readonly baseline?: number;
    /**
     * How long each of a picture's own pixels is when a cell that is not fixed is sized by it; unset, as it is drawn
     * (its `pixelSize`, else 1).
     */
    readonly imagePixel?: number;
    /**
     * On a node that does not grow round its label (no `labelFit`), a table larger than the node is drawn smaller,
     * words and all, keeping its proportions, until it fits inside the node; unset, it is drawn at its own size.
     */
    readonly shrinkToNode?: boolean;
    readonly rows: readonly LabelTableRow[];
}

/** A box, from the table's top left corner, y down. */
interface TableBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** A background's gradient: the color it runs to, and which way (`fillGradient`, `fillGradientAngle`). */
export interface TableGradient {
    readonly to: string;
    readonly angle: number;
}

/** What a laid-out table draws. */
export interface TableDrawing {
    /** The table's width and height. */
    readonly width: number;
    readonly height: number;
    /** How round the table's own outline's corners are, drawn inside its border (`radius`, capped); 0, square. */
    readonly radius: number;
    /**
     * Every cell's outline, and every inner table's, each with its width and an inner table's corners' radius; the
     * table's own outline is not one.
     */
    readonly frames: readonly (TableBox & { readonly border: number; readonly radius?: number })[];
    /** The rules between rows and cells (`<HR/>`, `<VR/>`), each from one point to the other. */
    readonly rules: readonly (readonly [number, number, number, number])[];
    /** Every line of text, its words centered on their point. */
    readonly texts: readonly { readonly x: number; readonly y: number; readonly text: string }[];
    /**
     * Every background, the table's own first, each table's before its cells': the box it fills, its color, its
     * gradient, and a rounded table's corners' radius.
     */
    readonly fills: readonly (TableBox & {
        readonly color: string;
        readonly gradient?: TableGradient;
        readonly radius?: number;
    })[];
    /** Every picture: the box inside its cell's padding it is drawn in, lined up by the cell's `align` and `valign`. */
    readonly images: readonly (TableBox & {
        readonly image: LabelTableImage;
        readonly align?: string;
        readonly valign?: string;
    })[];
}

/**
 * A text's width and height, measured: the height one line of the label's font size; and, where the measure knows
 * them, its ascent and descent, how far its ink reaches above and below its baseline. Its words are drawn centered
 * on their point, so their baseline sits half the ascent less the descent below it.
 */
export type MeasureText = (text: string) => { width: number; height: number; ascent?: number; descent?: number };

/** A picture's own width and height in pixels, once known; null while it is read and when it cannot be. */
export type MeasurePicture = (src: string) => { width: number; height: number } | null;

/** What a table is sized by: its texts, how its lines are set, and its pictures. */
interface Measures {
    readonly text: MeasureText;
    readonly lineHeight: number | "font";
    readonly textPixel: number;
    readonly baseline: number | undefined;
    /** A cell's picture's size in the table's lengths, or null while it is not known. */
    readonly picture: (image: LabelTableImage) => { width: number; height: number } | null;
}

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
    readonly lines: readonly Line[];
}

/** A line of a cell's text, measured: its height, and how far below its top its words' middle sits. */
interface Line {
    readonly text: string;
    readonly align?: string;
    readonly width: number;
    readonly height: number;
    readonly middle: number;
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
 * Whether a cell holds a picture it names.
 * @param cell - the cell
 * @returns true when it does
 */
function hasPicture(cell: LabelTableCell): cell is LabelTableCell & { readonly image: LabelTableImage } {
    return cell.image !== undefined && typeof cell.image.src === "string" && cell.image.src !== "";
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
 * @param measure - measures its texts and pictures
 * @param depth - how deep it is inside other tables
 * @returns the sized table
 */
function sizeTable(table: LabelTable, measure: Measures, depth: number): Sized {
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
            cells.push(sizeCell(table, cell, { row: r, col: c, rows, cols }, measure, depth));
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
 * @param measure - measures its texts and pictures
 * @param depth - how deep its table is inside other tables
 * @returns the placed cell
 */
function sizeCell(
    table: LabelTable,
    cell: LabelTableCell,
    at: { row: number; col: number; rows: number; cols: number },
    measure: Measures,
    depth: number,
): Placed {
    const inner = cell.table !== undefined && depth < MAX_DEPTH ? sizeTable(cell.table, measure, depth + 1) : null;
    const lines = (inner === null ? (cell.lines ?? []) : []).map((line) => setLine(line, measure));
    // a cell holding a picture holds the picture's own size, once it is known
    const fixed = isFixed(cell);
    const picture = inner === null && !fixed && hasPicture(cell) ? measure.picture(cell.image) : null;
    const content = inner ??
        picture ?? {
            width: Math.max(0, ...lines.map((l) => l.width)),
            height: lines.reduce((sum, l) => sum + l.height, 0),
        };
    const margin = 2 * (cellPadding(table, cell) + cellBorder(table, cell));
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
 * Measures a line and sets it as Graphviz sets an HTML-like label's line (lib/common/htmltable.c `size_html_txt`,
 * `emit_htextspans`): as tall as its font's ascent and descent, each rounded up to whole pixels by its text layout
 * (`lineHeight: "font"`, `textPixel`), its baseline a set share of its font size below its top (`baseline`); the
 * words, drawn centered on their point, go half their ascent less their descent above that baseline.
 * @param line - the line
 * @param measure - measures its text and says how lines are set
 * @returns the line, measured
 */
function setLine(line: LabelTableLine, measure: Measures): Line {
    const m = measure.text(line.text);
    const { ascent, descent } = m;
    const font = typeof ascent === "number" && typeof descent === "number" && ascent + descent > 0;
    const px = measure.textPixel;
    // the epsilon keeps a length already on the grid from rounding up a whole pixel more
    const up = (v: number): number => (px > 0 ? Math.ceil(v / px - 1e-6) * px : v);
    let height = m.height * (typeof measure.lineHeight === "number" ? measure.lineHeight : 1);
    if (measure.lineHeight === "font" && font) {
        height = up(ascent) + up(descent);
    }
    const middle =
        measure.baseline !== undefined && font ? measure.baseline * m.height - (ascent - descent) / 2 : height / 2;
    return { text: line.text, align: line.align, width: m.width, height, middle };
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
    frames: TableDrawing["frames"][number][];
    rules: [number, number, number, number][];
    texts: { x: number; y: number; text: string }[];
    fills: TableDrawing["fills"][number][];
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
    const radius = cornerRadius(table, b, border);
    if (outline && border > 0) {
        out.frames.push({ ...b, border, ...(radius > 0 ? { radius } : {}) });
    }
    if (radius > 0) {
        // a rounded table is filled inside the middle of its border, where its outline is stroked (Graphviz
        // htmltable.c emit_html_tbl, round_corners on the box inset by half the border)
        pushFill(
            out,
            table,
            { x: b.x + border / 2, y: b.y + border / 2, width: b.width - border, height: b.height - border },
            radius,
        );
    } else {
        pushFill(out, table, b, 0);
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
 * How round a table's corners are: its `radius`, at most a third of the shorter side of the box its outline is
 * stroked on (inside the middle of its border), as Graphviz's `round_corners` caps it; 0 when it is square.
 * @param table - the table
 * @param b - its box
 * @param border - its border's width
 * @returns the radius
 */
function cornerRadius(table: LabelTable, b: TableBox, border: number): number {
    return Math.max(0, Math.min(len(table.radius), (Math.min(b.width, b.height) - border) / 3));
}

/**
 * Adds a table's or a cell's background, when it has one: its color, and its gradient's.
 * @param out - collects what is drawn
 * @param owner - the table or cell
 * @param box - the box it fills
 * @param radius - how round its corners are
 */
function pushFill(
    out: Collected,
    owner: Pick<LabelTableCell, "fill" | "fillGradient" | "fillGradientAngle">,
    box: TableBox,
    radius: number,
): void {
    const { fill, fillGradient: to, fillGradientAngle: angle } = owner;
    if (typeof fill !== "string" || fill === "") {
        return;
    }
    const gradient =
        typeof to === "string" && to !== ""
            ? { gradient: { to, angle: typeof angle === "number" && Number.isFinite(angle) ? angle : 0 } }
            : {};
    out.fills.push({ ...box, color: fill, ...gradient, ...(radius > 0 ? { radius } : {}) });
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
    if (cell.hidden === true) {
        return;
    }
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
    // Graphviz fills the cell inside its border
    pushFill(
        out,
        cell,
        { x: b.x + border, y: b.y + border, width: b.width - 2 * border, height: b.height - 2 * border },
        0,
    );
    const inset = border + cellPadding(table, cell);
    const inner = { x: b.x + inset, y: b.y + inset, width: b.width - 2 * inset, height: b.height - 2 * inset };
    if (p.inner !== null) {
        placeTable(p.inner, inner, out, true);
        return;
    }
    if (hasPicture(cell)) {
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
        out.texts.push({ x: lx + line.width / 2, y: ty + line.middle, text: line.text });
        ty += line.height;
    }
}

/** How many straight pieces a rounded corner is drawn with. */
const CORNER_STEPS = 8;

/**
 * A box's outline with its corners rounded, clockwise on screen from the top of its left side, y down; its four
 * corners when the radius is 0.
 * @param box - the box
 * @param radius - how round its corners are, at most half its shorter side
 * @returns the outline's points, not closed
 */
export function roundedBoxOutline(box: TableBox, radius: number): [number, number][] {
    const r = Math.max(0, Math.min(radius, box.width / 2, box.height / 2));
    const { x, y, width: w, height: h } = box;
    if (r === 0) {
        return [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
        ];
    }
    // each corner's middle, and the angle its arc starts at (y down, so a quarter turn on is clockwise on screen)
    const corners: [number, number, number][] = [
        [x + r, y + r, Math.PI],
        [x + w - r, y + r, 1.5 * Math.PI],
        [x + w - r, y + h - r, 0],
        [x + r, y + h - r, 0.5 * Math.PI],
    ];
    return corners.flatMap(([cx, cy, from]) =>
        Array.from({ length: CORNER_STEPS + 1 }, (_, i): [number, number] => {
            const a = from + (i / CORNER_STEPS) * (Math.PI / 2);
            return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        }),
    );
}

/**
 * Lays a table out: its size, and where its cells' outlines, its rules and its text lines go, from its top left
 * corner, y down.
 * @param table - the table
 * @param measure - measures a text: its width, one line's height at the label's size, its ascent and descent
 * @param picture - a picture's own size in pixels, once known; a cell holding a picture is sized by it
 * @returns what it draws
 */
export function layoutLabelTable(
    table: LabelTable,
    measure: MeasureText,
    picture: MeasurePicture = () => null,
): TableDrawing {
    const { lineHeight, baseline } = table;
    const sizing: Measures = {
        text: measure,
        lineHeight: lineHeight === "font" || (typeof lineHeight === "number" && lineHeight > 0) ? lineHeight : 1,
        textPixel: len(table.textPixel),
        baseline: typeof baseline === "number" && Number.isFinite(baseline) ? baseline : undefined,
        picture: (image) => {
            const own = picture(image.src);
            const each = len(table.imagePixel) || len(image.pixelSize) || 1;
            return own === null ? null : { width: own.width * each, height: own.height * each };
        },
    };
    const sized = sizeTable(table, sizing, 0);
    const out: Collected = { frames: [], rules: [], texts: [], fills: [], images: [] };
    const whole = { x: 0, y: 0, width: sized.width, height: sized.height };
    placeTable(sized, whole, out, false);
    const radius = cornerRadius(table, whole, len(table.border));
    return { width: sized.width, height: sized.height, radius, ...out };
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
