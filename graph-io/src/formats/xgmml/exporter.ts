/**
 * The XGMML exporter (design `design/graph-io/cytoscape-and-obo/design.md` section 1.1;
 * `research-xgmml.md` section 4.7): the Cytoscape 3.x dialect, which Cytoscape 3 opens with every
 * attribute type intact. It writes `cy:documentVersion="3.0"`, the root `directed` from the
 * snapshot and `cy:directed` on every edge (Cytoscape ignores the root attribute), `type` plus
 * `cy:type` (and `cy:elementType`) on every att, positions as `graphics x y z` with y negated
 * back to screen coordinates, the importer's `graphics` json columns back as graphics attributes
 * and nested atts, containment as each group node's nested graph of `xlink:href` member
 * references (every node is declared at the top level, so the node order survives), and newline
 * and tab as character references unless `cytoscapeEscapes` asks for Cytoscape's two-character
 * form. It writes the graph's structure and columns, never styles.
 */

import { type Column, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";

import { type ChildrenCsr, childrenCsr } from "../../children.js";
import { DictHeuristic } from "../../common/attributes.js";
import { type PairFolding, pairFolding } from "../../common/direction.js";
import { escapeXmlAttribute, escapeXmlText } from "../../common/escape.js";
import { capabilities, checkCapabilities, LOSS } from "../../common/export.js";
import { formatF32, formatF64, idText } from "../../common/format.js";
import { type ResolvedExportOptions, resolveExportOptions } from "../../common/options.js";
import { agree, plural } from "../../common/plural.js";
import { type ExplicitWeights, explicitWeights } from "../../common/weights.js";
import { encodeChunks, joinText } from "../../common/writer.js";
import { xmlIllegalTextNotes } from "../../common/xml.js";
import { type CommonExportOptions, type ExportCapabilities, type GraphExporter, type LossNote } from "../../types.js";
import {
    CY_NAMESPACE,
    CYTOSCAPE_ORIGIN_NAMESPACE,
    EDGE_ID_COLUMN,
    FORMAT,
    GRAPHICS_COLUMN,
    INTERACTION_COLUMN,
    LABEL_COLUMN,
    META_KEY,
    NESTED_NETWORK_COLUMN,
    NETWORK_POINTER_COLUMN,
    NETWORKS_COLUMN,
    PARENT_COLUMN,
    PARENTS_COLUMN,
    POSITION_COLUMN,
    SUBGRAPH_COLUMN,
    XGMML_LOSS,
    XGMML_NAMESPACE,
    XGMML_ORIGIN_NAMESPACE,
    XLINK_NAMESPACE,
    Z_COLUMN,
} from "./constants.js";
import { aliasesOf } from "./emit.js";

/** The two escapes Cytoscape reads back as a newline and a tab, as a message writes them. */
const LITERAL_ESCAPES = String.raw`\n or \t`;

/**
 * The format-specific options of the XGMML exporter.
 * @category Built-in formats
 */
export interface XgmmlExportOptions extends CommonExportOptions {
    /**
     * Write line breaks and tabs in text values as Cytoscape's two-character `\n` and `\t`, as
     * Cytoscape does, instead of the XML character references `&#10;` and `&#9;`.
     * @defaultValue false
     */
    cytoscapeEscapes?: boolean | undefined;
}

/** What XGMML keeps (design section 1.1, all 16 fields). */
const CAPABILITIES: ExportCapabilities = capabilities({
    mixedDirection: true,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "optional",
    idCharset: "any",
    dtypes: ["string", "dict", "f64", "f32", "i32", "u32", "u8", "bool", "list"],
    components: false,
    lists: true,
    json: false,
    defaults: false,
    options: false,
    hierarchy: true,
    temporal: "none",
    graphAttributes: true,
    positions: true,
    viz: false,
});

/** The roles with a slot: label (XML attribute), the edge id, containment and position. */
const SLOT_ROLES: ReadonlySet<string> = new Set(["label", "id", "parent", "parents", "position"]);

/** The names the importer gives the slot columns. */
const ROLE_NAMES: Readonly<Record<string, string>> = Object.freeze({
    label: LABEL_COLUMN,
    id: EDGE_ID_COLUMN,
    parent: PARENT_COLUMN,
    position: POSITION_COLUMN,
});

/** Roles checkCapabilities() reports as not written (no slot in XGMML): the column is skipped. */
const DROPPED_ROLES: ReadonlySet<string> = new Set([
    "color",
    "size",
    "shape",
    "thickness",
    "start",
    "end",
    "timestamp",
    "timestamps",
    "spells",
    "open",
    "spellsOpen",
]);

/** XML attributes of `<node>` and `<edge>` the importer reads itself; a column of such a name is an att. */
const READ_ATTRIBUTES: Readonly<Record<"node" | "edge", ReadonlySet<string>>> = {
    node: new Set(["id", "label", "name"]),
    edge: new Set(["id", "label", "name", "source", "target", "weight"]),
};

/** Roles never written as atts. */
const STRUCTURAL_ROLES: ReadonlySet<string> = new Set([
    "directed",
    "pair",
    "mutual",
    "weight",
    "parent",
    "parents",
    "position",
]);

/** Node column names the importer owns; a plain column of such a name reads back renamed. */
const RESERVED_NODE_NAMES: ReadonlySet<string> = new Set([
    LABEL_COLUMN,
    POSITION_COLUMN,
    Z_COLUMN,
    GRAPHICS_COLUMN,
    PARENT_COLUMN,
    PARENTS_COLUMN,
    SUBGRAPH_COLUMN,
    NESTED_NETWORK_COLUMN,
    NETWORK_POINTER_COLUMN,
    NETWORKS_COLUMN,
]);

/** Edge column names the importer owns. */
const RESERVED_EDGE_NAMES: ReadonlySet<string> = new Set([EDGE_ID_COLUMN, LABEL_COLUMN, GRAPHICS_COLUMN]);

/** The importer-owned names of each table. */
const RESERVED_NAMES: Readonly<Record<"graph" | "node" | "edge", ReadonlySet<string>>> = {
    graph: new Set([GRAPHICS_COLUMN]),
    node: RESERVED_NODE_NAMES,
    edge: RESERVED_EDGE_NAMES,
};

/** The XGMML and Cytoscape `<graphics>` XML attributes; every other graphics key is a nested att. */
const GRAPHICS_ATTRIBUTES: ReadonlySet<string> = new Set([
    "type",
    "w",
    "h",
    "d",
    "image",
    "bitmap",
    "width",
    "arrow",
    "capstyle",
    "joinstyle",
    "smooth",
    "splinesteps",
    "justify",
    "font",
    "background",
    "foreground",
    "extent",
    "start",
    "style",
    "stipple",
    "visible",
    "fill",
    "outline",
    "anchor",
]);

const I32_MAX = 2147483647;

/** A note-recording callback. */
type NoteFn = (code: string, message: string, column?: string | null, count?: number | null) => void;

/** How one column is written. */
interface ColumnWrite {
    readonly column: Column;
    readonly name: string;
    /** "att" for a typed att, or the importer-owned slot it goes to. */
    readonly kind: "att" | "xml" | "label" | "graphics" | "z" | "subgraph" | "nested" | "pointer" | "networks";
    /** The att's type and cy:type; null when the source att had none. */
    readonly type: string | null;
    readonly cyType: string | null;
    readonly elementType: string | null;
}

/** Everything check() and export() agree on. */
interface Plan {
    readonly options: ResolvedExportOptions;
    readonly escapes: boolean;
    readonly notes: LossNote[];
    readonly graph: ColumnWrite[];
    readonly nodes: ColumnWrite[];
    readonly edges: ColumnWrite[];
    readonly folding: PairFolding;
    readonly weights: ExplicitWeights;
    readonly hierarchy: ChildrenCsr;
    /** 1 for a node a traversal from the roots reaches; the others are written without parents. */
    readonly reachable: Uint8Array;
    readonly position: Column | null;
    readonly edgeId: Column | null;
}

/**
 * The Cytoscape type of a scalar dtype and the XGMML type.
 * @param column - the column
 * @param dtype - the dtype (a list's item dtype)
 * @returns [type, cy:type]
 */
function typesOf(column: Column, dtype: string | null): [string, string] {
    if (column.meta.components > 1) {
        return ["string", "String"];
    }
    switch (dtype) {
        case "bool":
            return ["boolean", "Boolean"];
        case "i32":
        case "u8":
            return ["integer", "Integer"];
        case "u32":
            return maxValue(column) > I32_MAX ? ["integer", "Long"] : ["integer", "Integer"];
        case "f32":
        case "f64":
            return column.meta.origin?.type === "long" && allSafeIntegers(column)
                ? ["integer", "Long"]
                : ["real", "Double"];
        default:
            return ["string", "String"];
    }
}

/**
 * Whether every value of a numeric column (or of its list items) is a safe integer.
 * @param column - the column
 * @returns true when Long can carry every value
 */
function allSafeIntegers(column: Column): boolean {
    for (let r = 0; r < column.length; r++) {
        if (!column.isSet(r)) {
            continue;
        }
        const items: unknown[] = column.dtype === "list" ? [...column.sliceOf(r)] : [column.value(r)];
        if (!items.every((item) => typeof item === "number" && Number.isSafeInteger(item))) {
            return false;
        }
    }
    return true;
}

/**
 * The largest value of a u32 column (or of its list items).
 * @param column - the column
 * @returns the maximum, 0 when empty
 */
function maxValue(column: Column): number {
    let max = 0;
    for (let r = 0; r < column.length; r++) {
        if (!column.isSet(r)) {
            continue;
        }
        const value = column.value(r);
        const items: unknown[] = column.dtype === "list" ? [...column.sliceOf(r)] : [value];
        for (const item of items) {
            if (typeof item === "number" && item > max) {
                max = item;
            }
        }
    }
    return max;
}

/**
 * Whether a column came from the XGMML importer's own slot of that name.
 * @param column - the column
 * @param namespace - the origin namespace the importer gives it
 * @returns true for an importer-owned column
 */
function owned(column: Column, namespace: string): boolean {
    const { origin } = column.meta;
    return origin !== null && origin.namespace === namespace;
}

/**
 * Plan the columns of one table.
 * @param table - the columns
 * @param domain - the table
 * @param snapshot - the snapshot
 * @param note - the recorder
 * @returns the writes
 */
function planTable(
    table: Iterable<Column>,
    domain: "graph" | "node" | "edge",
    snapshot: GraphSnapshot,
    note: NoteFn,
): ColumnWrite[] {
    const writes: ColumnWrite[] = [];
    const reserved = RESERVED_NAMES[domain];
    const hasLabelRole =
        domain !== "graph" && (domain === "node" ? snapshot.nodes : snapshot.edges).byRole("label") !== null;
    for (const column of table) {
        const { meta } = column;
        if (
            meta.role !== null &&
            (STRUCTURAL_ROLES.has(meta.role) ||
                DROPPED_ROLES.has(meta.role) ||
                meta.role === "id" ||
                meta.role === "timeText")
        ) {
            continue;
        }
        const kind = slotOf(column, domain, hasLabelRole);
        const set = column.length - column.nullCount;
        if (kind === "att" && reserved.has(meta.name)) {
            note(
                LOSS.COLUMN_NAME_CHANGED,
                `${domain} column "${meta.name}" is named like a column the XGMML importer owns and reads back renamed`,
                meta.name,
                set,
            );
        } else if (kind === "label" && meta.dtype !== "string" && meta.dtype !== "dict") {
            note(
                LOSS.DTYPE,
                `${domain} label column "${meta.name}" (${meta.dtype}) is written as text and reads back as string`,
                meta.name,
                set,
            );
        } else if (kind === "label" && meta.role === null) {
            note(
                LOSS.ROLE_ASSUMED,
                `${domain} column "${meta.name}" is written as the label and reads back with the label role`,
                meta.name,
                set,
            );
        }
        if (kind === "att") {
            attNotes(column, domain, note);
        }
        const item = meta.dtype === "list" ? meta.itemDtype : meta.dtype;
        const [type, cyType] = meta.dtype === "list" ? ["list", "List"] : declaredTypes(column, typesOf(column, item));
        writes.push({
            column,
            name: meta.name,
            kind,
            type,
            cyType,
            elementType: meta.dtype === "list" ? typesOf(column, item)[1] : null,
        });
    }
    return writes;
}

/**
 * Where a column goes.
 * @param column - the column
 * @param domain - the table
 * @param hasLabelRole - whether the table has a label role column
 * @returns the slot
 */
function slotOf(column: Column, domain: "graph" | "node" | "edge", hasLabelRole: boolean): ColumnWrite["kind"] {
    const { meta } = column;
    if (domain !== "graph" && untypedAttribute(column, domain)) {
        return "xml";
    }
    if (
        meta.role === "label" ||
        (!hasLabelRole &&
            domain !== "graph" &&
            meta.role === null &&
            meta.name === LABEL_COLUMN &&
            (meta.dtype === "string" || meta.dtype === "dict"))
    ) {
        return "label";
    }
    if (meta.dtype === "json" && meta.name === GRAPHICS_COLUMN && owned(column, XGMML_ORIGIN_NAMESPACE)) {
        return "graphics";
    }
    if (domain !== "node") {
        return "att";
    }
    if (meta.name === Z_COLUMN && meta.dtype === "f64" && meta.role === null) {
        return "z";
    }
    if (meta.name === SUBGRAPH_COLUMN && meta.dtype === "json" && owned(column, XGMML_ORIGIN_NAMESPACE)) {
        return "subgraph";
    }
    if (meta.name === NESTED_NETWORK_COLUMN && meta.dtype === "string" && owned(column, CYTOSCAPE_ORIGIN_NAMESPACE)) {
        return "nested";
    }
    if (meta.name === NETWORK_POINTER_COLUMN && meta.dtype === "string" && owned(column, XGMML_ORIGIN_NAMESPACE)) {
        return "pointer";
    }
    if (meta.name === NETWORKS_COLUMN && meta.dtype === "list" && owned(column, XGMML_ORIGIN_NAMESPACE)) {
        return "networks";
    }
    return "att";
}

/**
 * Whether a column came from an XML attribute of the element (the importer's 5.1 text grammar:
 * xgmml origin, no declared type) and can be written back as one, so it reads back the same.
 * @param column - the column
 * @param domain - node or edge
 * @returns true to write it as an XML attribute
 */
function untypedAttribute(column: Column, domain: "node" | "edge"): boolean {
    const { meta } = column;
    const { origin } = meta;
    return (
        origin !== null &&
        origin.format === FORMAT &&
        origin.type === null &&
        origin.namespace === null &&
        meta.role === null &&
        meta.components === 1 &&
        (meta.dtype === "string" || meta.dtype === "bool" || meta.dtype === "i32" || meta.dtype === "f64") &&
        /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(meta.name) &&
        !READ_ATTRIBUTES[domain].has(meta.name)
    );
}

/**
 * The type and cy:type of an att: the source's own declaration when the column came from an
 * XGMML att that declared only `type` (a draft or 2.x file), else both.
 * @param column - the column
 * @param types - the type and cy:type of its dtype
 * @returns the pair to write; a null member is not written
 */
function declaredTypes(column: Column, types: [string, string]): [string | null, string | null] {
    const { origin } = column.meta;
    if (origin !== null && origin.format === FORMAT && origin.type === types[0] && column.meta.components === 1) {
        return [types[0], null];
    }
    return types;
}

/**
 * The notes of a column written as a typed att: dtypes Cytoscape widens, json written as text,
 * literal backslash escapes, the string / dict heuristic.
 * @param column - the column
 * @param domain - the table
 * @param note - the recorder
 */
function attNotes(column: Column, domain: string, note: NoteFn): void {
    const { meta } = column;
    const set = column.length - column.nullCount;
    const label = `${domain} column "${meta.name}"`;
    const item = meta.dtype === "list" ? meta.itemDtype : meta.dtype;
    if (meta.dtype === "json") {
        note(
            XGMML_LOSS.JSON_AS_STRING,
            `${label} holds nested values; they are written as JSON text and read back as strings`,
            meta.name,
            set,
        );
        return;
    }
    if (item === "f32" || item === "u8" || item === "u32") {
        note(
            XGMML_LOSS.WIDENED_TYPE,
            `${label} (${item}) is written as a wider Cytoscape type and reads back as ${readBackDtype(column, item)}`,
            meta.name,
            set,
        );
    }
    if (item === "string" || item === "dict") {
        let escapes = 0;
        for (let r = 0; r < column.length; r++) {
            if (column.isSet(r)) {
                const values = column.dtype === "list" ? [...column.sliceOf(r)] : [column.value(r)];
                if (values.some((v) => typeof v === "string" && /\\[nt]/.test(v))) {
                    escapes++;
                }
            }
        }
        if (escapes > 0) {
            note(
                XGMML_LOSS.BACKSLASH_ESCAPE,
                `${label}: ${escapes} value${plural(escapes)} ${agree(escapes, "holds", "hold")} a literal ${LITERAL_ESCAPES}, which Cytoscape's escape convention reads back as a newline or tab`,
                meta.name,
                escapes,
            );
        }
    }
    if (meta.dtype === "string" || meta.dtype === "dict") {
        const heuristic = new DictHeuristic();
        for (let r = 0; r < column.length && !heuristic.decided; r++) {
            if (column.isSet(r)) {
                heuristic.observe(column.value(r) as string);
            }
        }
        const readsAs = heuristic.decide();
        if (readsAs !== meta.dtype) {
            note(
                XGMML_LOSS.STORAGE_CLASS_CHANGED,
                `${label} reads back as ${readsAs}: the importer stores text with few distinct values as dict and other text as string; the values are the same`,
                meta.name,
                null,
            );
        }
    }
}

/**
 * The dtype a widened column reads back as.
 * @param column - the column
 * @param item - its dtype (a list's item dtype)
 * @returns the dtype the importer gives it
 */
function readBackDtype(column: Column, item: string): string {
    if (item === "u8" || (item === "u32" && maxValue(column) <= I32_MAX)) {
        return "i32";
    }
    return "f64";
}

/**
 * Build the plan and its loss notes.
 * @param snapshot - the snapshot
 * @param options - the common options
 * @param escapes - the cytoscapeEscapes option
 * @returns the plan
 */
function planExport(snapshot: GraphSnapshot, options: ResolvedExportOptions, escapes: boolean): Plan {
    const notes = checkCapabilities(snapshot, CAPABILITIES, options, {
        roles: SLOT_ROLES,
        roleNames: ROLE_NAMES,
        positionDtype: "f32",
    }).filter((n) => n.code !== LOSS.JSON);
    const note: NoteFn = (code, message, column = null, count = null): void => {
        notes.push(Object.freeze({ code, message, column, count }));
    };
    notes.push(...xmlIllegalTextNotes(snapshot));
    const folding = pairFolding(snapshot);
    if (folding.mutualCount > 0) {
        note(
            XGMML_LOSS.MUTUAL_EXPANDED,
            `${folding.mutualCount} mutual pair${plural(folding.mutualCount)} ${agree(folding.mutualCount, "is", "are")} written as two directed edges; the mutual mark is lost`,
            null,
            folding.mutualCount,
        );
    }
    const numericIds = countNumericIds(snapshot);
    if (numericIds > 0) {
        note(
            XGMML_LOSS.ID_TEXT_TYPE,
            `${numericIds} numeric node id${plural(numericIds)} ${agree(numericIds, "is", "are")} written as text and read back as strings`,
            null,
            numericIds,
        );
    }
    const edgeId = snapshot.edges.byRole("id");
    if (edgeId !== null && edgeId.dtype !== "string" && edgeId.dtype !== "dict") {
        note(
            XGMML_LOSS.EDGE_ID_TEXT,
            `edge id column "${edgeId.meta.name}" (${edgeId.dtype}) is written as text and reads back as strings`,
            edgeId.meta.name,
            null,
        );
    }
    const hierarchy = childrenCsr(snapshot);
    if (hierarchy.unreachable > 0) {
        note(
            XGMML_LOSS.PARENT_CYCLE,
            `${hierarchy.unreachable} node${plural(hierarchy.unreachable)} whose parent chain never reaches a root ${agree(hierarchy.unreachable, "is", "are")} written at the top level and lose their parent`,
            null,
            hierarchy.unreachable,
        );
    }
    const parents = snapshot.nodes.byRole("parents");
    if (parents !== null && snapshot.nodes.byRole("parent") !== null) {
        note(
            XGMML_LOSS.PARENTS_DROPPED,
            `parents column "${parents.meta.name}" is not written: the "parent" column is the containment written`,
            parents.meta.name,
            parents.length - parents.nullCount,
        );
    } else if (parents !== null && !multiParent(parents)) {
        note(
            LOSS.COLUMN_NAME_CHANGED,
            `parents column "${parents.meta.name}" holds one parent per node and reads back as the "parent" column`,
            parents.meta.name,
            null,
        );
    }
    const position = snapshot.nodes.byRole("position");
    if (position !== null) {
        positionNotes(position, snapshot, note);
    }
    interactionNote(snapshot, note);
    const weights = explicitWeights(snapshot);
    for (const column of snapshot.edges) {
        if (column.meta.name === "weight" && column.meta.role === null && !weights.weighted) {
            note(
                LOSS.WEIGHT_KEY_CLASH,
                `edge column "weight" reads back as the edge weight, not as a column`,
                "weight",
                null,
            );
        }
    }
    return {
        options,
        escapes,
        notes,
        graph: planTable(snapshot.graph, "graph", snapshot, note),
        nodes: planTable(snapshot.nodes, "node", snapshot, note),
        edges: planTable(snapshot.edges, "edge", snapshot, note),
        folding,
        weights,
        hierarchy,
        reachable: reachableNodes(snapshot.nodeCount, hierarchy),
        position,
        edgeId,
    };
}

/**
 * The note for edge labels the importer reads as Cytoscape label aliases (`a (i) b`): without an
 * `interaction` column they read back with one, as Cytoscape fills it.
 * @param snapshot - the snapshot
 * @param note - the recorder
 */
function interactionNote(snapshot: GraphSnapshot, note: NoteFn): void {
    const label = snapshot.edges.byRole("label") ?? snapshot.edges.get(LABEL_COLUMN);
    if (label === null || snapshot.edges.get(INTERACTION_COLUMN) !== null) {
        return;
    }
    let shaped = 0;
    for (let e = 0; e < label.length; e++) {
        if (label.isSet(e) && aliasesOf(scalarText(label.value(e))) !== null) {
            shaped++;
        }
    }
    if (shaped > 0) {
        note(
            XGMML_LOSS.INTERACTION_FROM_LABEL,
            `${shaped} edge label${plural(shaped)} ${agree(shaped, "has", "have")} Cytoscape's "a (i) b" shape and read back with an "${INTERACTION_COLUMN}" column`,
            INTERACTION_COLUMN,
            shaped,
        );
    }
}

/**
 * The nodes a traversal of the containment from its roots reaches.
 * @param nodeCount - the number of nodes
 * @param hierarchy - the children CSR
 * @returns 1 per reached node
 */
function reachableNodes(nodeCount: number, hierarchy: ChildrenCsr): Uint8Array {
    const reached = new Uint8Array(nodeCount);
    const stack = Array.from(hierarchy.roots);
    for (const root of stack) {
        reached[root] = 1;
    }
    while (stack.length > 0) {
        for (const child of hierarchy.childrenOf(stack.pop() as number)) {
            if (reached[child] === 0) {
                reached[child] = 1;
                stack.push(child);
            }
        }
    }
    return reached;
}

/**
 * Whether a parents column gives some node more than one parent.
 * @param column - the parents column
 * @returns true when a row holds two or more parents
 */
function multiParent(column: Column): boolean {
    for (let r = 0; r < column.length; r++) {
        if (column.isSet(r) && column.dtype === "list" && column.sliceOf(r).length > 1) {
            return true;
        }
    }
    return false;
}

/**
 * The notes of a position column: its shape, non-finite coordinates, and a z that reads back in
 * the z column.
 * @param position - the position column
 * @param snapshot - the snapshot
 * @param note - the recorder
 */
function positionNotes(position: Column, snapshot: GraphSnapshot, note: NoteFn): void {
    const { meta } = position;
    if (meta.components !== 3) {
        note(
            XGMML_LOSS.POSITION,
            `position column "${meta.name}" has ${meta.components} component${plural(meta.components)} and reads back with 3`,
            meta.name,
            null,
        );
    }
    let nonFinite = 0;
    let depth = 0;
    for (let r = 0; r < position.length; r++) {
        if (!position.isSet(r)) {
            continue;
        }
        const xyz = Array.from(position.value(r) as ArrayLike<number>);
        if (xyz.slice(0, 2).some((v) => !Number.isFinite(v))) {
            nonFinite++;
        } else if ((xyz[2] ?? 0) !== 0) {
            depth++;
        }
    }
    if (nonFinite > 0) {
        note(
            XGMML_LOSS.POSITION,
            `${nonFinite} position${plural(nonFinite)} with a non-finite coordinate ${agree(nonFinite, "is", "are")} not written`,
            meta.name,
            nonFinite,
        );
    }
    const zColumn = snapshot.nodes.get(Z_COLUMN);
    if (depth > 0) {
        note(
            XGMML_LOSS.POSITION,
            zColumn === null
                ? `${depth} position${plural(depth)} ${agree(depth, "has", "have")} a z; it is written as graphics z and reads back in the z column (zAs: "position" reads it as a coordinate)`
                : `${depth} position${plural(depth)} ${agree(depth, "has", "have")} a z, but graphics z holds the z column; the position z is lost`,
            meta.name,
            depth,
        );
    }
}

/**
 * Node ids that are numbers (written as text, read back as strings).
 * @param snapshot - the snapshot
 * @returns the count
 */
function countNumericIds(snapshot: GraphSnapshot): number {
    let n = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        if (typeof snapshot.ids.idOf(i) === "number") {
            n++;
        }
    }
    return n;
}

/**
 * The text of a scalar for an att value.
 * @param value - the value
 * @param dtype - its dtype
 * @param escapes - Cytoscape's two-character newline and tab
 * @returns the attribute text, escaped
 */
function valueText(value: unknown, dtype: string | null, escapes: boolean): string {
    let text: string;
    if (typeof value === "boolean") {
        text = value ? "1" : "0";
    } else if (typeof value === "number") {
        text = dtype === "f32" ? formatF32(value) : formatF64(value);
    } else if (typeof value === "string") {
        text = escapes ? value.replace(/\n/g, "\\n").replace(/\t/g, "\\t") : value;
    } else if (ArrayBuffer.isView(value)) {
        text = JSON.stringify(Array.from(value as unknown as ArrayLike<number>));
    } else {
        text = JSON.stringify(value) ?? "";
    }
    return escapeXmlAttribute(text);
}

/**
 * The text of a scalar cell (a label, an edge id, a graphics value): numbers in their shortest
 * form, anything that is not a scalar as JSON.
 * @param value - the value
 * @returns the text
 */
function scalarText(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number") {
        return formatF64(value);
    }
    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }
    return JSON.stringify(value) ?? "";
}

/**
 * The XML attributes of one row: the columns that came from XML attributes (`untypedAttribute`).
 * @param writes - the column writes of the table
 * @param row - the row
 * @returns the attributes, each with a leading space
 */
function xmlAttributesOf(writes: readonly ColumnWrite[], row: number): string {
    let out = "";
    for (const w of writes) {
        if (w.kind === "xml" && w.column.isSet(row)) {
            out += ` ${w.name}="${escapeXmlAttribute(scalarText(w.column.value(row)))}"`;
        }
    }
    return out;
}

/**
 * The atts of one row of a table.
 * @param writes - the column writes of the table
 * @param row - the row
 * @param first - whether this is the table's first row (an all-unset column is declared there)
 * @param plan - the plan
 * @param indent - the indentation
 * @yields the att elements
 * @returns nothing
 */
function* attsOf(
    writes: readonly ColumnWrite[],
    row: number,
    first: boolean,
    plan: Plan,
    indent: string,
): Generator<string, void, undefined> {
    for (const w of writes) {
        if (w.kind !== "att") {
            continue;
        }
        const { column } = w;
        const isSet = column.isSet(row);
        if (!isSet && !(first && column.nullCount === column.length)) {
            continue;
        }
        const name = `${indent}<att name="${escapeXmlAttribute(w.name)}"`;
        const types = `${w.type === null ? "" : ` type="${w.type}"`}${w.cyType === null ? "" : ` cy:type="${w.cyType}"`}`;
        const extra = `${column.meta.extra.hidden === true ? ' cy:hidden="1"' : ""}${column.meta.extra.equation === true ? ' cy:equation="1"' : ""}`;
        if (!isSet) {
            yield `${name}${types}${w.elementType === null ? "" : ` cy:elementType="${w.elementType}"`}${extra}/>\n`;
            continue;
        }
        if (column.dtype === "list") {
            const items = [...column.sliceOf(row)];
            const [itemType, itemCy] = typesOf(column, column.meta.itemDtype);
            yield `${name}${types} cy:elementType="${w.elementType ?? "String"}"${extra}${items.length === 0 ? "/>" : ">"}\n`;
            if (items.length > 0) {
                for (const item of items) {
                    yield `${indent}    <att name="${escapeXmlAttribute(w.name)}" value="${valueText(item, column.meta.itemDtype, plan.escapes)}" type="${itemType}" cy:type="${itemCy}"/>\n`;
                }
                yield `${indent}</att>\n`;
            }
            continue;
        }
        yield `${name} value="${valueText(column.value(row), column.dtype, plan.escapes)}"${types}${extra}/>\n`;
    }
}

/**
 * A graphics record as `<graphics>` XML attributes and nested atts.
 * @param record - the record (the importer's graphics json value)
 * @param coords - the x, y, z texts to write, or empty
 * @param indent - the indentation
 * @yields the graphics element
 * @returns nothing
 */
function* graphicsOf(
    record: Record<string, unknown> | null,
    coords: readonly [string, string][],
    indent: string,
): Generator<string, void, undefined> {
    const attrs: [string, string][] = [...coords];
    const nested: [string, unknown][] = [];
    for (const [key, value] of Object.entries(record ?? {})) {
        if (key === "Line") {
            nested.push([key, value]);
        } else if (typeof value === "string" && (GRAPHICS_ATTRIBUTES.has(key) || key.startsWith("cy:"))) {
            attrs.push([key, value]);
        } else {
            nested.push([key, value]);
        }
    }
    if (attrs.length === 0 && nested.length === 0) {
        return;
    }
    const head = `${indent}<graphics${attrs.map(([k, v]) => ` ${k}="${escapeXmlAttribute(v)}"`).join("")}`;
    if (nested.length === 0) {
        yield `${head}/>\n`;
        return;
    }
    yield `${head}>\n`;
    for (const [key, value] of nested) {
        if (key === "Line" && Array.isArray(value)) {
            yield `${indent}    <Line>\n`;
            for (const point of value) {
                const entries =
                    typeof point === "object" && point !== null ? Object.entries(point as Record<string, unknown>) : [];
                yield `${indent}        <point${entries.map(([k, v]) => ` ${k}="${escapeXmlAttribute(String(v))}"`).join("")}/>\n`;
            }
            yield `${indent}    </Line>\n`;
        } else {
            yield* jsonAtt(key, value, `${indent}    `);
        }
    }
    yield `${indent}</graphics>\n`;
}

/**
 * A graphics value as an att: a string as its value, an array as a list of child atts, a record
 * as named child atts (a record of strings with no further structure keeps its keys).
 * @param name - the att name
 * @param value - the value
 * @param indent - the indentation
 * @yields the att element
 * @returns nothing
 */
function* jsonAtt(name: string | null, value: unknown, indent: string): Generator<string, void, undefined> {
    const nameAttr = name === null ? "" : ` name="${escapeXmlAttribute(name)}"`;
    if (Array.isArray(value)) {
        yield `${indent}<att${nameAttr} type="list">\n`;
        for (const item of value) {
            yield* jsonAtt(name, item, `${indent}    `);
        }
        yield `${indent}</att>\n`;
    } else if (typeof value === "object" && value !== null) {
        const entries = Object.entries(value as Record<string, unknown>);
        if (
            name !== null &&
            entries.every(([, v]) => typeof v === "string") &&
            entries.length <= 3 &&
            entries.every(([k]) => /^[a-z]$/.test(k))
        ) {
            yield `${indent}<att${nameAttr}${entries.map(([k, v]) => ` ${k}="${escapeXmlAttribute(v as string)}"`).join("")}/>\n`;
            return;
        }
        yield `${indent}<att${nameAttr}>\n`;
        for (const [key, item] of entries) {
            yield* jsonAtt(key, item, `${indent}    `);
        }
        yield `${indent}</att>\n`;
    } else if (value === null || value === undefined) {
        yield `${indent}<att${nameAttr} type="string"/>\n`;
    } else {
        yield `${indent}<att${nameAttr} value="${escapeXmlAttribute(scalarText(value))}" type="string"/>\n`;
    }
}

/**
 * The importer's slot column of a kind, if the table has it.
 * @param writes - the writes
 * @param kind - the slot
 * @returns the column, or null
 */
function slot(writes: readonly ColumnWrite[], kind: ColumnWrite["kind"]): Column | null {
    return writes.find((w) => w.kind === kind)?.column ?? null;
}

/**
 * The value of a set cell, else null.
 * @param column - the column, or null
 * @param row - the row
 * @returns the value
 */
function cellOf(column: Column | null, row: number): unknown {
    return column !== null && column.isSet(row) ? column.value(row) : null;
}

/**
 * The graphics coordinates of a node: x, y negated back to screen coordinates, z.
 * @param plan - the plan
 * @param zColumn - the z column, or null
 * @param node - the node
 * @returns the coordinates as XML attributes
 */
function coordsOf(plan: Plan, zColumn: Column | null, node: number): [string, string][] {
    const out: [string, string][] = [];
    const xyz = cellOf(plan.position, node);
    if (xyz !== null) {
        const [x, y, z] = Array.from(xyz as ArrayLike<number>);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            out.push(["x", formatF32(x)], ["y", formatF32(y === 0 ? 0 : -y)]);
            if (zColumn === null && z !== undefined && z !== 0 && Number.isFinite(z)) {
                out.push(["z", formatF32(z)]);
            }
        }
    }
    const z = cellOf(zColumn, node);
    if (typeof z === "number") {
        out.push(["z", formatF64(z)]);
    }
    return out;
}

/**
 * The XML of one node and its group graph, whose members are `xlink:href` references (every
 * node is declared at the top level, in index order).
 * @param snapshot - the snapshot
 * @param plan - the plan
 * @param node - the node
 * @param indent - the indentation
 * @yields the node element
 * @returns nothing
 */
function* nodeOf(
    snapshot: GraphSnapshot,
    plan: Plan,
    node: number,
    indent: string,
): Generator<string, void, undefined> {
    const labelCol = slot(plan.nodes, "label");
    const label = cellOf(labelCol, node);
    yield `${indent}<node id="${escapeXmlAttribute(idText(snapshot.ids.idOf(node)))}"${label === null ? "" : ` label="${escapeXmlAttribute(scalarText(label))}"`}${xmlAttributesOf(plan.nodes, node)}>\n`;
    const inner = `${indent}    `;
    yield* attsOf(plan.nodes, node, node === 0, plan, inner);
    const children = plan.reachable[node] === 1 ? plan.hierarchy.childrenOf(node) : [];
    const nested = cellOf(slot(plan.nodes, "nested"), node);
    const pointer = cellOf(slot(plan.nodes, "pointer"), node);
    const subgraph = cellOf(slot(plan.nodes, "subgraph"), node);
    if (children.length > 0 || subgraph !== null) {
        const sub = (subgraph ?? {}) as Record<string, unknown>;
        yield `${inner}<att name="__isGroup" value="1" type="boolean" cy:type="Boolean" cy:hidden="1"/>\n`;
        const id = typeof sub.id === "string" ? ` id="${escapeXmlAttribute(sub.id)}"` : "";
        const lbl = typeof sub.label === "string" ? ` label="${escapeXmlAttribute(sub.label)}"` : "";
        yield `${inner}<att>\n${inner}    <graph${id}${lbl}>\n`;
        const atts =
            typeof sub.atts === "object" && sub.atts !== null
                ? Object.entries(sub.atts as Record<string, unknown>)
                : [];
        for (const [key, value] of atts) {
            yield* jsonAtt(key, value, `${inner}        `);
        }
        for (const child of children) {
            yield `${inner}        <node xlink:href="#${escapeXmlAttribute(idText(snapshot.ids.idOf(child)))}"/>\n`;
        }
        yield `${inner}    </graph>\n${inner}</att>\n`;
    } else if (typeof nested === "string") {
        yield `${inner}<att>\n${inner}    <graph label="${escapeXmlAttribute(nested)}"/>\n${inner}</att>\n`;
    } else if (typeof pointer === "string") {
        yield `${inner}<att>\n${inner}    <graph xlink:href="${escapeXmlAttribute(pointer)}"/>\n${inner}</att>\n`;
    }
    const graphics = cellOf(slot(plan.nodes, "graphics"), node) as Record<string, unknown> | null;
    yield* graphicsOf(graphics, coordsOf(plan, slot(plan.nodes, "z"), node), inner);
    yield `${indent}</node>\n`;
}

/**
 * The document, as string parts; the plan (and the E_ conditions it throws) is made when the
 * first part is asked for.
 * @param snapshot - the snapshot
 * @param options - the options
 * @yields the XML text
 * @returns nothing
 */
function* write(
    snapshot: GraphSnapshot,
    options: (XgmmlExportOptions & CommonExportOptions) | undefined,
): Generator<string, void, undefined> {
    const plan = planFor(snapshot, options);
    const meta = snapshot.meta.extra[META_KEY] as { graphId?: unknown; directed?: unknown } | undefined;
    const graphId = typeof meta?.graphId === "string" ? ` id="${escapeXmlAttribute(meta.graphId)}"` : "";
    // Every edge carries cy:directed, so when they all agree the root attribute does not decide
    // the direction and the source's own text is written back.
    const keep =
        (meta?.directed === "0" || meta?.directed === "1") &&
        snapshot.edgeCount > 0 &&
        snapshot.edges.byRole("directed") === null;
    let directed = snapshot.directed ? "1" : "0";
    if (keep) {
        directed = meta?.directed as string;
    }
    const name = snapshot.meta.name === null ? "" : ` label="${escapeXmlAttribute(snapshot.meta.name)}"`;
    yield '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    yield `<graph${graphId}${name} directed="${directed}" cy:documentVersion="3.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xlink="${XLINK_NAMESPACE}" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cy="${CY_NAMESPACE}" xmlns="${XGMML_NAMESPACE}">\n`;
    yield* metadataOf(snapshot);
    yield* attsOf(plan.graph, 0, true, plan, "    ");
    yield* graphicsOf(cellOf(slot(plan.graph, "graphics"), 0) as Record<string, unknown> | null, [], "    ");
    for (let u = 0; u < snapshot.nodeCount; u++) {
        yield* nodeOf(snapshot, plan, u, "    ");
    }
    yield* networksOf(snapshot, plan);
    yield* edgesOf(snapshot, plan);
    yield "</graph>\n";
}

/**
 * The RDF network metadata, when the snapshot has a description or a creation date.
 * @param snapshot - the snapshot
 * @yields the networkMetadata att
 * @returns nothing
 */
function* metadataOf(snapshot: GraphSnapshot): Generator<string, void, undefined> {
    const { name, description, created } = snapshot.meta;
    if (description === null && created === null) {
        return;
    }
    yield '    <att name="networkMetadata">\n        <rdf:RDF>\n            <rdf:Description rdf:about="http://www.cytoscape.org/">\n';
    if (name !== null) {
        yield `                <dc:title>${escapeXmlText(name)}</dc:title>\n`;
    }
    if (description !== null) {
        yield `                <dc:description>${escapeXmlText(description)}</dc:description>\n`;
    }
    if (created !== null) {
        yield `                <dc:date>${escapeXmlText(created)}</dc:date>\n`;
    }
    yield "            </rdf:Description>\n        </rdf:RDF>\n    </att>\n";
}

/**
 * The root-level subgraphs of an `xgmml.networks` membership column.
 * @param snapshot - the snapshot
 * @param plan - the plan
 * @yields the subgraph atts
 * @returns nothing
 */
function* networksOf(snapshot: GraphSnapshot, plan: Plan): Generator<string, void, undefined> {
    const column = slot(plan.nodes, "networks");
    if (column?.dtype !== "list") {
        return;
    }
    const members = new Map<string, number[]>();
    for (let u = 0; u < snapshot.nodeCount; u++) {
        for (const id of column.isSet(u) ? column.sliceOf(u) : []) {
            const list = members.get(String(id)) ?? [];
            list.push(u);
            members.set(String(id), list);
        }
    }
    for (const [id, nodes] of members) {
        yield `    <att>\n        <graph id="${escapeXmlAttribute(id)}">\n`;
        for (const u of nodes) {
            yield `            <node xlink:href="#${escapeXmlAttribute(idText(snapshot.ids.idOf(u)))}"/>\n`;
        }
        yield "        </graph>\n    </att>\n";
    }
}

/**
 * The edges: one per logical edge, expanded pairs folded.
 * @param snapshot - the snapshot
 * @param plan - the plan
 * @yields the edge elements
 * @returns nothing
 */
function* edgesOf(snapshot: GraphSnapshot, plan: Plan): Generator<string, void, undefined> {
    const { folding, weights } = plan;
    const labelCol = slot(plan.edges, "label");
    const graphicsCol = slot(plan.edges, "graphics");
    const list = snapshot.edgeList();
    let first = true;
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (folding.folded(e)) {
            continue;
        }
        const u = list.src[e];
        const v = list.dst[e];
        const directed = snapshot.directed && folding.sourceDirected(e);
        const id = cellOf(plan.edgeId, e);
        const label = cellOf(labelCol, e);
        const weight = weights.text(e);
        yield `    <edge${id === null ? "" : ` id="${escapeXmlAttribute(scalarText(id))}"`}${label === null ? "" : ` label="${escapeXmlAttribute(scalarText(label))}"`} source="${escapeXmlAttribute(idText(snapshot.ids.idOf(u)))}" target="${escapeXmlAttribute(idText(snapshot.ids.idOf(v)))}" cy:directed="${directed ? "1" : "0"}"${weight === null ? "" : ` weight="${weight}"`}${xmlAttributesOf(plan.edges, e)}>\n`;
        yield* attsOf(plan.edges, e, first, plan, "        ");
        yield* graphicsOf(cellOf(graphicsCol, e) as Record<string, unknown> | null, [], "        ");
        yield "    </edge>\n";
        first = false;
    }
}

/**
 * Resolve the format-specific options.
 * @param options - the caller's options
 * @returns the cytoscapeEscapes flag
 */
function resolveEscapes(options: XgmmlExportOptions | undefined): boolean {
    const value = options?.cytoscapeEscapes ?? false;
    if (typeof value !== "boolean") {
        throw new GraphFormatError("E_UNSUPPORTED", "option cytoscapeEscapes must be a boolean", {
            option: "cytoscapeEscapes",
            found: typeof value,
        });
    }
    return value;
}

/**
 * The plan of one export call; throws the E_ conditions before anything is written.
 * @param snapshot - the snapshot
 * @param options - the options
 * @returns the plan
 */
function planFor(snapshot: GraphSnapshot, options: (XgmmlExportOptions & CommonExportOptions) | undefined): Plan {
    const plan = planExport(snapshot, resolveExportOptions(options), resolveEscapes(options));
    const illegal = plan.notes.find((n) => n.code === XGMML_LOSS.XML_ILLEGAL_CHAR);
    if (illegal !== undefined) {
        throw new GraphFormatError("E_COLUMN_TYPE", illegal.message, { code: illegal.code, column: illegal.column });
    }
    return plan;
}

/**
 * The XGMML exporter.
 * @category Built-in formats
 */
export const xgmmlExporter: GraphExporter<XgmmlExportOptions> = Object.freeze({
    format: FORMAT,
    options: Object.freeze(["cytoscapeEscapes"]),
    capabilities: CAPABILITIES,
    check: (snapshot: GraphSnapshot, options?: XgmmlExportOptions & CommonExportOptions): readonly LossNote[] =>
        Object.freeze(planExport(snapshot, resolveExportOptions(options), resolveEscapes(options)).notes),
    export: (snapshot: GraphSnapshot, options?: XgmmlExportOptions & CommonExportOptions): AsyncIterable<Uint8Array> =>
        encodeChunks(write(snapshot, options)),
    exportToString: (snapshot: GraphSnapshot, options?: XgmmlExportOptions & CommonExportOptions): Promise<string> =>
        joinText(write(snapshot, options)),
});
