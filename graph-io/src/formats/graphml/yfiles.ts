/**
 * yFiles / yEd graphics read out of the JSON tree of a `yfiles.type` key (tree.ts) into typed
 * columns, beside the tree itself: a `y:ShapeNode` gives the node's position, size, fill and
 * border colours, label and shape, and a `y:PolyLineEdge` gives the edge's line colour and width,
 * its arrows and the direction they draw. The values are the ones graphty-element's own GraphML
 * parser produced, so a consumer rebuilds its records by dropping the `yfiles.` prefix: colours
 * are `#RRGGBB` in upper case (a `#RGB` is expanded, any other text is kept as written), numbers
 * are parsed with parseFloat, the position is `[x, y, 0]` and the shape is the yFiles shape type
 * as written.
 *
 * The columns are views of the tree: the exporter writes the tree and never these columns, and
 * re-importing the tree gives them back. A value edited after import (a layout writing the
 * position) or a tree column removed is therefore not written, and the exporter reports it as a
 * loss (staleGraphicsRows()).
 */

import { type Column, type ColumnDecl, type JsonColumn } from "@graphty/graph-format";

import { localName } from "../../common/xml.js";

/** The name prefix of every column mapped from yFiles graphics. */
const YFILES_COLUMN_PREFIX = "yfiles.";

type Tree = Record<string, unknown>;

/** The mapped node columns, by the field name graphty-element's records use. */
const NODE_FIELDS: Readonly<Record<string, Omit<ColumnDecl, "name">>> = {
    position: { dtype: "f64", components: 3, role: "position", mutable: true },
    width: { dtype: "f64" },
    height: { dtype: "f64" },
    color: { dtype: "string" },
    borderColor: { dtype: "string" },
    borderWidth: { dtype: "f64" },
    label: { dtype: "string", role: "label" },
    shape: { dtype: "string" },
};

/** The mapped edge columns, by field name. */
const EDGE_FIELDS: Readonly<Record<string, Omit<ColumnDecl, "name">>> = {
    color: { dtype: "string" },
    width: { dtype: "f64" },
    directed: { dtype: "bool" },
    targetArrow: { dtype: "string" },
    sourceArrow: { dtype: "string" },
};

/**
 * The declaration of a mapped column.
 * @param domain - node or edge
 * @param field - the field name (a key of the values graphicsValues() returns)
 * @param keyId - the id of the GraphML key whose tree it is read from
 * @returns the declaration
 */
export function graphicsDecl(domain: "node" | "edge", field: string, keyId: string): ColumnDecl {
    const fields = domain === "node" ? NODE_FIELDS : EDGE_FIELDS;
    return {
        ...fields[field],
        name: YFILES_COLUMN_PREFIX + field,
        nullable: true,
        origin: {
            format: "graphml",
            id: keyId,
            title: null,
            type: domain === "node" ? "ShapeNode" : "PolyLineEdge",
            namespace: "yfiles",
        },
    };
}

/**
 * Whether a column is one graphicsDecl() declared (a view of a yFiles tree, never exported).
 * @param meta - the column's name, dtype and origin
 * @param meta.name - the column name
 * @param meta.dtype - the column dtype
 * @param meta.origin - the column origin
 * @returns true for a mapped graphics column
 */
export function isGraphicsColumn(meta: {
    readonly name: string;
    readonly dtype: string;
    readonly origin: { readonly namespace: string | null } | null;
}): boolean {
    return meta.dtype !== "json" && meta.origin?.namespace === "yfiles" && meta.name.startsWith(YFILES_COLUMN_PREFIX);
}

/**
 * The rows of a mapped graphics column whose value is not the one its yFiles tree column (same
 * origin.id, in the same table) gives: every set row when the tree column is gone. These are the
 * values an export loses, since only the tree is written.
 * @param column - the mapped column (isGraphicsColumn())
 * @param table - the table it is in
 * @param domain - node or edge
 * @returns the number of rows that differ from the tree
 */
export function staleGraphicsRows(column: Column, table: Iterable<Column>, domain: "node" | "edge"): number {
    const { name, origin } = column.meta;
    const field = name.slice(YFILES_COLUMN_PREFIX.length);
    let tree: JsonColumn | undefined;
    for (const c of table) {
        if (c.dtype === "json" && c.meta.origin?.namespace === "yfiles" && c.meta.origin.id === origin?.id) {
            tree = c;
            break;
        }
    }
    let stale = 0;
    for (let r = 0; r < column.length; r++) {
        const want =
            tree === undefined ? undefined : graphicsValues(domain, tree.values[r]).find(([f]) => f === field)?.[1];
        const value = column.value(r);
        const have = column.meta.components > 1 && value !== undefined ? Array.from(value as ArrayLike<number>) : value;
        if (JSON.stringify(have) !== JSON.stringify(want)) {
            stale++;
        }
    }
    return stale;
}

/**
 * The mapped values of one `<data>` tree of a yFiles key: a ShapeNode's for a node, a
 * PolyLineEdge's for an edge; nothing for any other graphics (GenericNode, BezierEdge, ...).
 * @param domain - node or edge
 * @param tree - the `<data>` content as tree.ts builds it
 * @returns field name -> value, in declaration order
 */
export function graphicsValues(domain: "node" | "edge", tree: unknown): [string, unknown][] {
    const out: [string, unknown][] = [];
    if (domain === "node") {
        const shape = child(tree, "ShapeNode");
        if (shape !== undefined) {
            shapeNodeValues(shape, out);
        }
    } else {
        const edge = child(tree, "PolyLineEdge");
        if (edge !== undefined) {
            polyLineEdgeValues(edge, out);
        }
    }
    return out;
}

/**
 * Read a ShapeNode.
 * @param shape - the ShapeNode element
 * @param out - receives the values
 */
function shapeNodeValues(shape: unknown, out: [string, unknown][]): void {
    const geometry = child(shape, "Geometry");
    // yFiles requires x, y, width and height on Geometry; a position needs both coordinates
    const x = number(attr(geometry, "x"));
    const y = number(attr(geometry, "y"));
    if (x !== undefined && y !== undefined) {
        out.push(["position", [x, y, 0]]);
    }
    push(out, "width", number(attr(geometry, "width")));
    push(out, "height", number(attr(geometry, "height")));
    push(out, "color", color(attr(child(shape, "Fill"), "color")));
    const border = child(shape, "BorderStyle");
    push(out, "borderColor", color(attr(border, "color")));
    push(out, "borderWidth", number(attr(border, "width")));
    const label = child(shape, "NodeLabel");
    // an element with no text and no attributes is "" (no label); one with attributes but no text is a blank label
    if (typeof label === "string" ? label.length > 0 : label !== undefined) {
        // trimmed, as the element's parser (trimValues) reads it: pretty-printed yEd puts whitespace before the label's children
        out.push(["label", (typeof label === "string" ? label : (text(label) ?? "")).trim()]);
    }
    push(out, "shape", nonEmpty(attr(child(shape, "Shape"), "type")));
}

/**
 * Read a PolyLineEdge.
 * @param edge - the PolyLineEdge element
 * @param out - receives the values
 */
function polyLineEdgeValues(edge: unknown, out: [string, unknown][]): void {
    const line = child(edge, "LineStyle");
    push(out, "color", color(attr(line, "color")));
    push(out, "width", number(attr(line, "width")));
    const arrows = child(edge, "Arrows");
    if (arrows !== undefined && typeof arrows === "object") {
        const target = attr(arrows, "target");
        const source = attr(arrows, "source");
        // yEd draws direction with the target arrow; the file's edgedefault still decides topology
        out.push(["directed", target !== undefined && target !== "none"]);
        push(out, "targetArrow", target === "none" ? undefined : nonEmpty(target));
        push(out, "sourceArrow", source === "none" ? undefined : nonEmpty(source));
    }
}

/**
 * Append a value when it is defined.
 * @param out - the values
 * @param field - the field name
 * @param value - the value
 */
function push(out: [string, unknown][], field: string, value: unknown): void {
    if (value !== undefined) {
        out.push([field, value]);
    }
}

/**
 * The first child element of a tree node by local name, whatever its namespace prefix.
 * @param node - the tree node
 * @param local - the local name
 * @returns the child, or undefined
 */
function child(node: unknown, local: string): unknown {
    if (typeof node !== "object" || node === null) {
        return undefined;
    }
    for (const [key, value] of Object.entries(node as Tree)) {
        if (!key.startsWith("@_") && key !== "#text" && localName(key) === local) {
            return Array.isArray(value) ? value[0] : value;
        }
    }
    return undefined;
}

/**
 * An attribute of a tree node.
 * @param node - the tree node
 * @param name - the attribute name
 * @returns the text, or undefined
 */
function attr(node: unknown, name: string): string | undefined {
    if (typeof node !== "object" || node === null) {
        return undefined;
    }
    const value = (node as Tree)[`@_${name}`];
    return typeof value === "string" ? value : undefined;
}

/**
 * The character data of an element that also has attributes or children.
 * @param node - the tree node
 * @returns the text, or undefined
 */
function text(node: unknown): string | undefined {
    const value = typeof node === "object" && node !== null ? (node as Tree)["#text"] : undefined;
    return typeof value === "string" ? value : undefined;
}

/**
 * A non-empty text.
 * @param value - the text
 * @returns the text, or undefined when absent or empty
 */
function nonEmpty(value: string | undefined): string | undefined {
    return value === undefined || value.length === 0 ? undefined : value;
}

/**
 * A number attribute, parsed as graphty-element's parser parsed it.
 * @param value - the text
 * @returns the number, or undefined when absent, empty or not a number
 */
function number(value: string | undefined): number | undefined {
    if (value === undefined || value.length === 0) {
        return undefined;
    }
    const n = Number.parseFloat(value);
    return Number.isNaN(n) ? undefined : n;
}

/**
 * A colour attribute: `#RRGGBB` upper-cased, `#RGB` expanded, anything else as written.
 * @param value - the text
 * @returns the colour, or undefined when absent or empty
 */
function color(value: string | undefined): string | undefined {
    if (value === undefined || value.length === 0) {
        return undefined;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        return value.toUpperCase();
    }
    if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
        const [, r, g, b] = value;
        return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return value;
}
