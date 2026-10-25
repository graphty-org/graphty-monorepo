/**
 * @file Graphviz record shapes (`record`, `Mrecord`): the field tree a record label describes and where Graphviz lays
 * each field, its dividers and its text lines out inside the node (lib/common/shapes.c `parse_reclbl`,
 * `size_reclbl`, `resize_reclbl`, `pos_reclbl`, `gen_fields`). Text widths are estimated from DejaVu Sans's advance
 * widths, which the specimen sheets pin; another font is measured as if it were DejaVu Sans.
 */

/** One field of a record: its text lines (a leaf) or its sub-fields, laid left to right (`lr`) or top to bottom. */
interface Field {
    lines: RecordLine[] | null;
    port: string | null;
    readonly children: readonly Field[];
    readonly lr: boolean;
    w: number;
    h: number;
    x: number;
    y: number;
}

/** One text line of a field and how it is justified (`\l` left, `\r` right, else centered). */
interface RecordLine {
    readonly text: string;
    readonly justify: "l" | "r" | "c";
}

/** Where a record's dividers and text lines go, in points from the node's center, y up. */
interface RecordLayout {
    /** The node's width and height in points. */
    readonly width: number;
    readonly height: number;
    /** Each divider, from one point to the other. */
    readonly dividers: readonly (readonly [number, number, number, number])[];
    /** Each text line, centered on its point. */
    readonly texts: readonly { readonly x: number; readonly y: number; readonly text: string }[];
    /** Each named field's box center and half size, by port name. */
    readonly ports: ReadonlyMap<
        string,
        { readonly x: number; readonly y: number; readonly hw: number; readonly hh: number }
    >;
}

/** Graphviz's padding of a field's text: 4 GAP across (8 a side), 2 GAP down (4 above and below). */
const PAD = { x: 16, y: 8 } as const;

/** Graphviz's line height as a multiple of the font size. */
const LINE_SPACING = 1.2;

/** DejaVu Sans advance widths of the printable ASCII characters, in 1/2048 em, from space (32) to tilde (126). */
// prettier-ignore
const DEJAVU_SANS = [
    651, 821, 942, 1716, 1303, 1946, 1597, 563, 799, 799, 1024, 1716, 651, 739, 651, 690,
    1303, 1303, 1303, 1303, 1303, 1303, 1303, 1303, 1303, 1303, 690, 690, 1716, 1716, 1716, 1087,
    2048, 1401, 1405, 1430, 1577, 1294, 1178, 1587, 1540, 604, 604, 1343, 1141, 1767, 1532, 1612,
    1235, 1612, 1423, 1300, 1251, 1499, 1401, 2025, 1403, 1251, 1403, 799, 690, 799, 1716, 1024,
    1024, 1255, 1300, 1126, 1300, 1260, 721, 1300, 1298, 569, 569, 1186, 569, 1995, 1298, 1253,
    1300, 1300, 842, 1067, 803, 1298, 1212, 1675, 1212, 1212, 1075, 1303, 690, 1303, 1716,
];

/**
 * A text's width in points at a font size, from DejaVu Sans's advances (any other character: 0.6 em).
 * @param text - the text
 * @param size - the font size
 * @returns the width
 */
export function textWidth(text: string, size: number): number {
    let units = 0;
    for (const ch of text) {
        const code = ch.codePointAt(0) ?? 0;
        units += code >= 32 && code <= 126 ? DEJAVU_SANS[code - 32] : 1229;
    }
    return (units / 2048) * size;
}

/**
 * Splits a field's text into lines at `\n`, `\l` and `\r`, each line justified by the escape that ends it; a last
 * line with no escape is centered. Other escapes are kept for the caller.
 * @param text - the field's text, record escapes already removed
 * @returns the lines
 */
function splitLines(text: string): RecordLine[] {
    const lines: RecordLine[] = [];
    let line = "";
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        const next = text[i + 1];
        if (c === "\\" && (next === "n" || next === "l" || next === "r")) {
            lines.push({ text: line, justify: next === "n" ? "c" : next });
            line = "";
            i += 2;
        } else if (c === "\\" && next !== undefined) {
            line += c + next;
            i += 2;
        } else {
            line += c;
            i++;
        }
    }
    if (line !== "" || lines.length === 0) {
        lines.push({ text: line, justify: "c" });
    }
    return lines;
}

/**
 * Parses a record label into its field tree, as `parse_reclbl` does: `|` parts fields, `{ }` opens a sub-record laid
 * the other way, `<name>` names a field's port, and `\{ \} \| \< \>` and `\ ` stand for themselves.
 * @param label - the label
 * @param lr - whether the top level lays its fields left to right
 * @returns the root field
 */
function parseRecord(label: string, lr: boolean): Field {
    return parseFields(label, { i: 0 }, lr, true);
}

/** Where reading a record label is: the index of the next character. */
interface Cursor {
    i: number;
}

/** The field being read: its text so far, its port and the sub-record it holds. */
interface PendingField {
    text: string;
    port: string | null;
    sub: Field | null;
}

/**
 * A parent field holding its children.
 * @param children - the children
 * @param across - whether they lay left to right
 * @returns the field
 */
function parentField(children: Field[], across: boolean): Field {
    return { lines: null, port: null, children, lr: across, w: 0, h: 0, x: 0, y: 0 };
}

/**
 * Parses the fields of one (sub-)record from the cursor up to its closing `}` (or the label's end).
 * @param label - the label
 * @param cursor - where reading is, moved past what is read
 * @param across - whether these fields lay left to right
 * @param top - whether this is the top level, where a stray `}` is skipped
 * @returns the field holding them
 */
function parseFields(label: string, cursor: Cursor, across: boolean, top: boolean): Field {
    const children: Field[] = [];
    const pending: PendingField = { text: "", port: null, sub: null };
    while (cursor.i < label.length) {
        const c = label[cursor.i];
        if (c === "{") {
            cursor.i++;
            pending.sub = parseFields(label, cursor, !across, false);
        } else if (c === "}") {
            cursor.i++;
            if (!top) {
                flushField(children, pending, across);
                return parentField(children, across);
            }
        } else if (c === "|") {
            cursor.i++;
            flushField(children, pending, across);
        } else {
            readFieldText(label, cursor, pending);
        }
    }
    flushField(children, pending, across);
    return parentField(children, across);
}

/**
 * Reads one escape, port name or character of a field's text at the cursor.
 * @param label - the label
 * @param cursor - where reading is, moved past what is read
 * @param pending - the field being read
 */
function readFieldText(label: string, cursor: Cursor, pending: PendingField): void {
    const c = label[cursor.i];
    const next = label.at(cursor.i + 1);
    if (c === "\\" && next !== undefined) {
        pending.text += "{}|<> ".includes(next) ? next : c + next;
        cursor.i += 2;
    } else if (c === "<") {
        const close = label.indexOf(">", cursor.i + 1);
        const end = close < 0 ? label.length : close;
        pending.port = label.slice(cursor.i + 1, end).trim();
        cursor.i = close < 0 ? label.length : close + 1;
    } else {
        pending.text += c;
        cursor.i++;
    }
}

/**
 * Ends the field being read: adds it (its sub-record, or a leaf of its text) to the children and starts the next.
 * @param children - the children so far
 * @param pending - the field being read, cleared
 * @param across - whether the children lay left to right
 */
function flushField(children: Field[], pending: PendingField, across: boolean): void {
    const { sub, port } = pending;
    children.push(
        sub ?? { lines: splitLines(pending.text.trim()), port, children: [], lr: !across, w: 0, h: 0, x: 0, y: 0 },
    );
    if (sub !== null && port !== null) {
        sub.port = port;
    }
    pending.text = "";
    pending.port = null;
    pending.sub = null;
}

/**
 * Each field's natural size (`size_reclbl`): a leaf's text padded, a parent's children side by side along its way.
 * @param f - the field
 * @param size - the font size
 */
function sizeField(f: Field, size: number): void {
    if (f.lines !== null) {
        const w = Math.max(...f.lines.map((l) => textWidth(l.text, size)));
        const h = f.lines.length * size * LINE_SPACING;
        [f.w, f.h] = w > 0 || h > 0 ? [w + PAD.x, h + PAD.y] : [0, 0];
        return;
    }
    f.w = 0;
    f.h = 0;
    for (const c of f.children) {
        sizeField(c, size);
        f.w = f.lr ? f.w + c.w : Math.max(f.w, c.w);
        f.h = f.lr ? Math.max(f.h, c.h) : f.h + c.h;
    }
}

/**
 * Grows or shrinks each field to its share of a new size (`resize_reclbl`): the difference is shared evenly along
 * the field's way, in whole points.
 * @param f - the field
 * @param w - its new width
 * @param h - its new height
 */
function resizeField(f: Field, w: number, h: number): void {
    const inc = (f.lr ? w - f.w : h - f.h) / Math.max(1, f.children.length);
    f.w = w;
    f.h = h;
    f.children.forEach((c, k) => {
        const amt = Math.trunc((k + 1) * inc) - Math.trunc(k * inc);
        resizeField(c, f.lr ? c.w + amt : w, f.lr ? h : c.h + amt);
    });
}

/**
 * Places each field from its upper left corner (`pos_reclbl`), y up.
 * @param f - the field
 * @param x - its left side
 * @param y - its top
 */
function placeField(f: Field, x: number, y: number): void {
    f.x = x;
    f.y = y;
    let at = f.lr ? x : y;
    for (const c of f.children) {
        placeField(c, f.lr ? at : x, f.lr ? y : at);
        at += f.lr ? c.w : -c.h;
    }
}

/**
 * Lays a record out in a node as Graphviz does: the fields at their natural sizes, the node at least that big unless
 * it is `fixedsize`, every field then grown to share the node, its dividers between neighbors and its lines centered,
 * or set in from its side by 8 points when justified left or right.
 * @param label - the record label, before its escapes are applied
 * @param lr - whether the top level lays its fields left to right (true unless `rankdir` is LR or RL)
 * @param width - the node's width in points
 * @param height - its height in points
 * @param fixed - whether the node keeps its size (`fixedsize`)
 * @param fontSize - the font size in points
 * @param text - applies the label escapes to one line
 * @returns the layout
 */
export function layoutRecord(
    label: string,
    lr: boolean,
    width: number,
    height: number,
    fixed: boolean,
    fontSize: number,
    text: (line: string) => string,
): RecordLayout {
    const root = parseRecord(label, lr);
    const leaves = (f: Field): void => {
        if (f.lines !== null) {
            f.lines = f.lines.map((l) => ({ ...l, text: text(l.text) }));
        }
        f.children.forEach(leaves);
    };
    leaves(root);
    sizeField(root, fontSize);
    const w = fixed ? width : Math.max(width, root.w);
    const h = fixed ? height : Math.max(height, root.h);
    resizeField(root, w, h);
    placeField(root, -w / 2, h / 2);
    const dividers: [number, number, number, number][] = [];
    const texts: { x: number; y: number; text: string }[] = [];
    const ports = new Map<string, { x: number; y: number; hw: number; hh: number }>();
    const lineHeight = fontSize * LINE_SPACING;
    const visit = (f: Field): void => {
        if (f.port !== null && f.port !== "") {
            ports.set(f.port, { x: f.x + f.w / 2, y: f.y - f.h / 2, hw: f.w / 2, hh: f.h / 2 });
        }
        f.children.forEach((c, k) => {
            if (k > 0) {
                dividers.push(f.lr ? [c.x, c.y, c.x, c.y - c.h] : [c.x, c.y, c.x + c.w, c.y]);
            }
            visit(c);
        });
        if (f.lines === null) {
            return;
        }
        const n = f.lines.length;
        f.lines.forEach((l, k) => {
            if (l.text === "") {
                return;
            }
            const half = textWidth(l.text, fontSize) / 2;
            let x = f.x + f.w / 2;
            if (l.justify === "l") {
                x = f.x + PAD.x / 2 + half;
            } else if (l.justify === "r") {
                x = f.x + f.w - PAD.x / 2 - half;
            }
            texts.push({ x, y: f.y - f.h / 2 + ((n - 1) / 2 - k) * lineHeight, text: l.text });
        });
    };
    visit(root);
    return { width: w, height: h, dividers, texts, ports };
}
