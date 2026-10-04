/**
 * The CX2 exporter (design/graph-io/cytoscape-and-obo/design.md section 1.3; graphty issue #307):
 * writes a snapshot as one CX2 document -- the descriptor, the pre-metadata, one
 * `attributeDeclarations` block (aliases from `origin.id`, defaults from `meta.default`),
 * `networkAttributes`, `nodes` (x / y from the position with y flipped back to screen coordinates,
 * `z` from the `z` column), `edges`, the `cx2.bypass` columns as `nodeBypasses` / `edgeBypasses`,
 * the opaque aspects a CX2 import kept (which returns its own style rules) and `status`.
 *
 * What CX2 cannot hold is announced by check() before anything is written: every edge is
 * directed (W_CX2_UNDIRECTED_AS_DIRECTED, W_MUTUAL_EXPANDED), node ids are integers (E_ID_CHARSET
 * unless `sanitizeIds: "mangle"`, which keeps the original in the `graphty:originalId` attribute
 * the importer restores), nested values are written as JSON text (W_CX2_JSON_AS_STRING), NaN and
 * the infinities as null (W_CX2_NONFINITE_AS_NULL), and the generic notes of checkCapabilities().
 */

import { type Column, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";

import {
    aspectBlock,
    declaredType,
    directionNotes,
    nonFinitePositions,
    planEdgeIds,
    planNodeIds,
    stringify,
    type WrittenIds,
} from "../../common/cx-export.js";
import { type PairFolding, pairFolding } from "../../common/direction.js";
import { capabilities, checkCapabilities, LOSS } from "../../common/export.js";
import { isRecord, POSITION_COLUMN } from "../../common/json-elements.js";
import { type ResolvedExportOptions, resolveExportOptions } from "../../common/options.js";
import { type ExplicitWeights, explicitWeights } from "../../common/weights.js";
import { encodeChunks, joinText } from "../../common/writer.js";
import { type CommonExportOptions, type ExportCapabilities, type GraphExporter, type LossNote } from "../../types.js";
import { BYPASS_NAMESPACE, CX2_FORMAT, cx2Type, ORIGINAL_ID_ATTRIBUTE } from "./importer.js";

/**
 * The options of the CX2 exporter: the common export options; it has none of its own.
 * @category Built-in formats
 */
export type Cx2ExportOptions = CommonExportOptions;

/**
 * The loss notes the CX2 exporter's check() returns, by name. A key is the
 * code without its severity and format prefixes.
 * @category Built-in formats
 */
export const CX2_LOSS = Object.freeze({
    /**
     * Every edge is written as directed, so an undirected graph, or the undirected edges of a mixed graph, read back
     * as directed.
     */
    UNDIRECTED_AS_DIRECTED: "W_CX2_UNDIRECTED_AS_DIRECTED",
    /** A nested (json) column is written as a string attribute holding its JSON text. */
    JSON_AS_STRING: "W_CX2_JSON_AS_STRING",
    /** NaN and the infinities cannot be written; they are written as null and read back unset. */
    NONFINITE_AS_NULL: "W_CX2_NONFINITE_AS_NULL",
    /** A mutual pair is written as two directed edges without its mark. */
    MUTUAL_EXPANDED: LOSS.MUTUAL_EXPANDED,
    /**
     * An attribute without the weight role is named like the key weights are written under; it reads back as the edge
     * weight, or is not written when the graph has weights of its own.
     */
    WEIGHT_KEY_CLASH: LOSS.WEIGHT_KEY_CLASH,
    /** A parent / parents column: CX2 has no containment. */
    HIERARCHY_DROPPED: LOSS.HIERARCHY,
    /** A start / end / timestamp column: CX2 has no time. */
    TEMPORAL_DROPPED: LOSS.TEMPORAL,
    /** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
    ROLE_DROPPED: LOSS.ROLE,
    /**
     * An attribute type CX2 stores as another (a 32-bit float as double, an unsigned integer as long, a dictionary as
     * string); it reads back with that type.
     */
    DTYPE_UNSUPPORTED: LOSS.DTYPE,
    /**
     * Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with E_INVALID_ID. Pass
     * `sanitizeIds: "mangle"` to rewrite them.
     */
    ID_CHARSET: LOSS.ID_CHARSET,
    /** Node ids that are not integers under sanitizeIds "mangle": renumbered, originals kept. */
    ID_MANGLED: LOSS.ID_MANGLED,
    /** Edges without a usable id get generated integer ids. */
    EDGE_IDS_GENERATED: LOSS.EDGE_IDS_GENERATED,
});

/**
 * What CX2 keeps: directed multigraphs with self-loops, integer node ids,
 * required integer edge ids, declared string / double / integer / boolean columns and lists of
 * them, declared defaults, network attributes and the position role. f32, u32, u8 and dict columns
 * are written as the nearest declared type and read back as it.
 * @category Built-in formats
 */
export const CX2_CAPABILITIES: ExportCapabilities = capabilities({
    mixedDirection: false,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "required",
    idCharset: "integer",
    dtypes: ["string", "f64", "i32", "bool"],
    components: false,
    lists: true,
    json: false,
    defaults: true,
    options: false,
    hierarchy: false,
    temporal: "none",
    graphAttributes: true,
    positions: true,
    viz: false,
});

/** The roles CX2 has a slot for, and the column names its importer gives them. */
const SLOT_ROLES: ReadonlySet<string> = new Set(["label", "position", "id"]);
const ROLE_NAMES: Readonly<Record<string, string>> = Object.freeze({
    label: "name",
    position: POSITION_COLUMN,
});

/** Roles whose columns are never written as attributes. */
const SKIPPED_ROLES: ReadonlySet<string> = new Set([
    "directed",
    "pair",
    "mutual",
    "weight",
    "timeText",
    "originalId",
    "parent",
    "parents",
    "start",
    "end",
    "timestamp",
    "timestamps",
    "spells",
    "open",
    "spellsOpen",
    "position",
    "color",
    "size",
    "shape",
    "thickness",
]);

/** The aspects the exporter writes itself; an opaque aspect of the same name is not written again. */
const CORE_ASPECTS: ReadonlySet<string> = new Set([
    "nodes",
    "edges",
    "attributeDeclarations",
    "networkAttributes",
    "nodeBypasses",
    "edgeBypasses",
    "metaData",
    "status",
]);

/** The weight attribute name. */
const WEIGHT_ATTRIBUTE = "weight";

/** One attribute column as it will be written. */
interface AttributePlan {
    readonly column: Column;
    /** The full attribute name. */
    readonly name: string;
    /** The key used in v (the alias, or the name). */
    readonly key: string;
    /** The declared type text. */
    readonly d: string;
    /** Whether values are written as their JSON text (a json column). */
    readonly jsonText: boolean;
}

/** Everything export() and check() need, computed once. */
interface Plan {
    readonly notes: LossNote[];
    readonly fatal: GraphFormatError | null;
    readonly ids: WrittenIds | null;
    readonly folding: PairFolding;
    readonly weights: ExplicitWeights;
    readonly nodeAttrs: readonly AttributePlan[];
    readonly edgeAttrs: readonly AttributePlan[];
    readonly graphAttrs: readonly AttributePlan[];
    readonly nodeBypasses: readonly Column[];
    readonly edgeBypasses: readonly Column[];
    readonly position: Column | null;
    readonly positionZ: boolean;
    readonly z: Column | null;
    readonly edgeIds: readonly number[];
    readonly originalIds: boolean;
}

/**
 * Whether a column is a bypass column of a CX2 import.
 * @param column - the column
 * @returns true for the cx2.bypass namespace
 */
function isBypass(column: Column): boolean {
    return column.meta.origin?.namespace === BYPASS_NAMESPACE;
}

/**
 * Whether a column is the z (stacking order) column.
 * @param column - the column
 * @returns true for the column marked by a Cytoscape-family importer
 */
function isZ(column: Column): boolean {
    return column.meta.extra.cytoscape === "z";
}

/**
 * Count the non-finite numbers of a column.
 * @param column - the column
 * @returns how many set cells (or list items) are NaN or infinite
 */
function nonFiniteCount(column: Column): number {
    const { dtype, itemDtype } = column.meta;
    const numeric =
        dtype === "f32" || dtype === "f64" || (dtype === "list" && (itemDtype === "f32" || itemDtype === "f64"));
    if (!numeric) {
        return 0;
    }
    let count = 0;
    for (let i = 0; i < column.length; i++) {
        if (!column.isSet(i)) {
            continue;
        }
        const value = column.value(i);
        if (dtype === "list") {
            if ((value as readonly number[]).some((v) => !Number.isFinite(v))) {
                count++;
            }
        } else if (!Number.isFinite(value as number)) {
            count++;
        }
    }
    return count;
}

/**
 * Plan the attribute columns of one table.
 * @param table - the table
 * @param skip - columns not written as attributes
 * @param rename - the written name of a column, when it differs (the label as `name`)
 * @param reserved - keys already used in v
 * @returns the plans
 */
function planAttributes(
    table: Iterable<Column>,
    skip: (column: Column) => boolean,
    rename: (column: Column) => string,
    reserved: ReadonlySet<string> = new Set(),
): AttributePlan[] {
    const plans: AttributePlan[] = [];
    const used = new Set<string>(reserved);
    const candidates = [...table].filter((c) => !skip(c));
    for (const column of candidates) {
        used.add(rename(column));
    }
    for (const column of candidates) {
        const name = rename(column);
        const { origin } = column.meta;
        let key = name;
        const alias = origin?.format === CX2_FORMAT && typeof origin.id === "string" ? origin.id : null;
        if (alias !== null && alias.length > 0 && alias !== name && !used.has(alias)) {
            key = alias;
            used.add(alias);
        }
        plans.push({ column, name, key, d: declaredType(column), jsonText: column.meta.dtype === "json" });
    }
    return plans;
}

/**
 * Plan an export: the notes, the fatal condition and what is written.
 * @param snapshot - the snapshot
 * @param common - the resolved common options
 * @returns the plan
 */
function plan(snapshot: GraphSnapshot, common: ResolvedExportOptions): Plan {
    const notes: LossNote[] = [];
    let fatal: GraphFormatError | null = null;
    const note = (code: string, message: string, column: string | null = null, count: number | null = null): void => {
        notes.push(Object.freeze({ code, message, column, count }));
    };
    // bypass columns are written as bypasses, which hold any JSON value
    const bypassNames = new Set(
        [...snapshot.nodes, ...snapshot.edges].filter((c) => isBypass(c) || isZ(c)).map((c) => c.meta.name),
    );
    for (const gen of checkCapabilities(snapshot, CX2_CAPABILITIES, common, {
        roles: SLOT_ROLES,
        roleNames: ROLE_NAMES,
    })) {
        if (gen.column !== null && bypassNames.has(gen.column) && (gen.code === LOSS.JSON || gen.code === LOSS.DTYPE)) {
            continue;
        }
        if (gen.code === LOSS.ID_CHARSET || gen.code === LOSS.ID_MANGLED) {
            // counted below: CX2 also keeps integer ids beyond 2^53, which the generic rule refuses
            continue;
        }
        if (gen.code === LOSS.JSON) {
            note(
                CX2_LOSS.JSON_AS_STRING,
                `${gen.column === null ? "a column" : `column "${gen.column}"`} holds nested values; written as a string attribute holding their JSON text`,
                gen.column,
                gen.count,
            );
            continue;
        }
        if (gen.code === LOSS.MIXED_DIRECTION_ERROR && fatal === null) {
            fatal = new GraphFormatError("E_DIRECTED", gen.message, { reason: "mixed direction" });
        }
        notes.push(gen);
    }

    const folding = pairFolding(snapshot);
    directionNotes(snapshot, folding, common, CX2_LOSS.UNDIRECTED_AS_DIRECTED, note);

    const planned = planNodeIds(snapshot, common, "CX2", ORIGINAL_ID_ATTRIBUTE, note);
    const ids = planned instanceof GraphFormatError ? null : planned;
    if (planned instanceof GraphFormatError) {
        fatal ??= planned;
    }

    const weights = explicitWeights(snapshot);
    const label = snapshot.nodes.byRole("label");
    const nodeAttrs = planAttributes(
        snapshot.nodes,
        (c) => (c.meta.role !== null && SKIPPED_ROLES.has(c.meta.role)) || isBypass(c) || isZ(c),
        (c) => (c === label && !snapshot.nodes.has("name") ? "name" : c.meta.name),
        ids !== null && ids.changed > 0 ? new Set([ORIGINAL_ID_ATTRIBUTE]) : new Set(),
    );
    const plainWeight = snapshot.edges.get(WEIGHT_ATTRIBUTE);
    const weightColumnClash = plainWeight !== null && plainWeight.meta.role === null;
    if (weightColumnClash) {
        note(
            LOSS.WEIGHT_KEY_CLASH,
            weights.weighted
                ? `edge column "${WEIGHT_ATTRIBUTE}" is not written: the explicit weights are written under that name`
                : `edge column "${WEIGHT_ATTRIBUTE}" reads back as the edge weight`,
            WEIGHT_ATTRIBUTE,
            null,
        );
    }
    const edgeAttrs = planAttributes(
        snapshot.edges,
        (c) =>
            (c.meta.role !== null && (SKIPPED_ROLES.has(c.meta.role) || c.meta.role === "id")) ||
            isBypass(c) ||
            (weights.weighted && c === plainWeight),
        (c) => c.meta.name,
        weights.weighted ? new Set([WEIGHT_ATTRIBUTE]) : new Set(),
    );
    const graphAttrs = planAttributes(
        snapshot.graph,
        () => false,
        (c) => c.meta.name,
    ).map((p) => ({ ...p, key: p.name }));

    let nonfinite = 0;
    for (const p of [...nodeAttrs, ...edgeAttrs, ...graphAttrs]) {
        nonfinite += nonFiniteCount(p.column);
    }
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (weights.isExplicit(e) && !Number.isFinite(weights.value(e))) {
            nonfinite++;
        }
    }
    const position = snapshot.nodes.byRole("position");
    if (position !== null) {
        nonfinite += nonFinitePositions(position);
    }
    if (nonfinite > 0) {
        note(
            CX2_LOSS.NONFINITE_AS_NULL,
            `${nonfinite} NaN or infinite value(s) cannot be written in CX2; written as null, they read back unset`,
            null,
            nonfinite,
        );
    }

    const edgeIds = planEdgeIds(snapshot, note);
    const z = [...snapshot.nodes].find(isZ) ?? null;
    const positionZ = position !== null && z === null && position.meta.extra.sourceDims === 3;
    return {
        notes,
        fatal,
        ids,
        folding,
        weights,
        nodeAttrs,
        edgeAttrs,
        graphAttrs,
        nodeBypasses: [...snapshot.nodes].filter(isBypass),
        edgeBypasses: [...snapshot.edges].filter(isBypass),
        position,
        positionZ,
        z,
        edgeIds,
        originalIds: ids !== null && ids.changed > 0,
    };
}

// ============================================================ writing

/**
 * The value written for one cell.
 * @param p - the attribute plan
 * @param row - the row
 * @returns the value, or undefined for an unset cell
 */
function cellValue(p: AttributePlan, row: number): unknown {
    const { column } = p;
    if (!column.isSet(row)) {
        return undefined;
    }
    const value = column.value(row);
    if (p.jsonText) {
        return JSON.stringify(value);
    }
    if (column.meta.dtype === "list" || column.meta.components > 1) {
        const items = Array.from(value as ArrayLike<unknown>);
        if (p.d === "string") {
            return JSON.stringify(items);
        }
        return items.some((v) => typeof v === "number" && !Number.isFinite(v)) ? null : items;
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
        return null;
    }
    return value;
}

/**
 * The declarations of one table.
 * @param plans - the attribute plans
 * @param defaults - whether defaults and aliases may be written (not for network attributes)
 * @returns the declaration object
 */
function declarations(plans: readonly AttributePlan[], defaults: boolean): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const p of plans) {
        const decl: Record<string, unknown> = { d: p.d };
        if (defaults && p.key !== p.name) {
            decl.a = p.key;
        }
        const fallback = p.column.meta.default;
        if (defaults && fallback !== undefined && fallback !== null) {
            if (defaultFits(cx2Type(p.d), fallback)) {
                decl.v = fallback;
            }
        }
        out[p.name] = decl;
    }
    return out;
}

/**
 * Whether a declared default can be written as the value of a declared type.
 * @param type - the type
 * @param fallback - the default
 * @returns true when it matches
 */
function defaultFits(type: ReturnType<typeof cx2Type>, fallback: unknown): boolean {
    if (type === null) {
        return false;
    }
    if (type.list) {
        return Array.isArray(fallback);
    }
    switch (type.scalar) {
        case "string":
            return typeof fallback === "string";
        case "boolean":
            return typeof fallback === "boolean";
        default:
            return typeof fallback === "number" && Number.isFinite(fallback);
    }
}

/**
 * The v object of one element.
 * @param plans - the attribute plans
 * @param row - the row
 * @returns the object, or null when empty
 */
function attributesOf(plans: readonly AttributePlan[], row: number): Record<string, unknown> | null {
    let out: Record<string, unknown> | null = null;
    for (const p of plans) {
        const value = cellValue(p, row);
        if (value !== undefined) {
            out ??= {};
            out[p.key] = value;
        }
    }
    return out;
}

/**
 * Write the document as text parts.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @yields the document's text
 * @returns nothing
 */
function* write(snapshot: GraphSnapshot, p: Plan): Generator<string, void, undefined> {
    if (p.fatal !== null) {
        throw p.fatal;
    }
    const { ids } = p;
    if (ids === null) {
        throw new GraphFormatError("E_INVALID_ID", "node ids cannot be written as CX2 integers", { reason: "charset" });
    }
    const { src, dst } = snapshot.edgeList();
    const edges: number[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (!p.folding.folded(e)) {
            edges.push(e);
        }
    }

    const nodeDecls = declarations(p.nodeAttrs, true);
    if (p.originalIds) {
        nodeDecls[ORIGINAL_ID_ATTRIBUTE] = { d: "string" };
    }
    const edgeDecls = declarations(p.edgeAttrs, true);
    if (p.weights.weighted) {
        edgeDecls[WEIGHT_ATTRIBUTE] = { d: "double" };
    }
    const networkDecls = declarations(p.graphAttrs, false);
    const network: Record<string, unknown> = {};
    for (const a of p.graphAttrs) {
        const value = cellValue(a, 0);
        if (value !== undefined) {
            network[a.name] = value;
        }
    }
    const { meta } = snapshot;
    for (const [key, value] of [
        ["name", meta.name],
        ["description", meta.description],
    ] as const) {
        if (value !== null && !(key in network) && !(key in networkDecls)) {
            network[key] = value;
            networkDecls[key] = { d: "string" };
        }
    }
    const kept = isRecord(meta.extra.cx2) ? meta.extra.cx2 : {};
    const otherDecls = isRecord(kept.declarations) ? kept.declarations : {};
    const opaque = meta.sourceFormat === CX2_FORMAT && isRecord(kept.opaque) ? kept.opaque : {};
    const declarationsElement: Record<string, unknown> = { ...otherDecls };
    for (const [key, table] of [
        ["networkAttributes", networkDecls],
        ["nodes", nodeDecls],
        ["edges", edgeDecls],
    ] as const) {
        if (Object.keys(table).length > 0) {
            declarationsElement[key] = table;
        }
    }
    const nodeBypassRows = bypassRows(p.nodeBypasses, snapshot.nodeCount);
    const edgeBypassRows = bypassRows(p.edgeBypasses, snapshot.edgeCount).filter((e) => !p.folding.folded(e));
    const opaqueAspects = Object.entries(opaque).filter(
        (entry): entry is [string, unknown[]] => !CORE_ASPECTS.has(entry[0]) && Array.isArray(entry[1]),
    );

    const counts: [string, number][] = [];
    const hasDeclarations = Object.keys(declarationsElement).length > 0;
    if (hasDeclarations) {
        counts.push(["attributeDeclarations", 1]);
    }
    if (Object.keys(network).length > 0) {
        counts.push(["networkAttributes", 1]);
    }
    counts.push(["nodes", snapshot.nodeCount], ["edges", edges.length]);
    if (nodeBypassRows.length > 0) {
        counts.push(["nodeBypasses", nodeBypassRows.length]);
    }
    if (edgeBypassRows.length > 0) {
        counts.push(["edgeBypasses", edgeBypassRows.length]);
    }
    for (const [name, elements] of opaqueAspects) {
        counts.push([name, elements.length]);
    }

    yield '[{"CXVersion":"2.0","hasFragments":false},\n';
    yield `{"metaData":${stringify(counts.map(([name, elementCount]) => ({ name, elementCount })))}},\n`;
    if (hasDeclarations) {
        yield `{"attributeDeclarations":[${stringify(declarationsElement)}]},\n`;
    }
    if (Object.keys(network).length > 0) {
        yield `{"networkAttributes":[${stringify(network)}]},\n`;
    }
    yield* block("nodes", snapshot.nodeCount, (i) => stringify(nodeElement(p, ids, i)));
    yield* block("edges", edges.length, (k) => {
        const e = edges[k];
        const element: Record<string, unknown> = {
            id: p.edgeIds[e],
            s: ids.idAt(src[e]),
            t: ids.idAt(dst[e]),
        };
        let v = attributesOf(p.edgeAttrs, e);
        if (p.weights.isExplicit(e)) {
            const w = p.weights.value(e);
            v ??= {};
            v[WEIGHT_ATTRIBUTE] = Number.isFinite(w) ? w : null;
        }
        if (v !== null) {
            element.v = v;
        }
        return stringify(element);
    });
    if (nodeBypassRows.length > 0) {
        yield* block("nodeBypasses", nodeBypassRows.length, (k) => {
            const i = nodeBypassRows[k];
            return stringify({ id: ids.idAt(i), v: bypassValues(p.nodeBypasses, i) });
        });
    }
    if (edgeBypassRows.length > 0) {
        yield* block("edgeBypasses", edgeBypassRows.length, (k) => {
            const e = edgeBypassRows[k];
            return stringify({ id: p.edgeIds[e], v: bypassValues(p.edgeBypasses, e) });
        });
    }
    for (const [name, elements] of opaqueAspects) {
        yield* block(name, elements.length, (k) => stringify(elements[k]));
    }
    yield '{"status":[{"error":"","success":true}]}]\n';
}

/**
 * The text of one aspect block, element by element.
 * @param aspect - the aspect name
 * @param count - its element count
 * @param element - the JSON text of element k
 * @returns the block's text parts
 */
function block(aspect: string, count: number, element: (k: number) => string): Generator<string, void, undefined> {
    return aspectBlock(
        aspect,
        (function* elements(): Generator<string, void, undefined> {
            for (let k = 0; k < count; k++) {
                yield element(k);
            }
        })(),
    );
}

/**
 * The element of node i.
 * @param p - the plan
 * @param ids - the written ids
 * @param i - the node index
 * @returns the element
 */
function nodeElement(p: Plan, ids: WrittenIds, i: number): Record<string, unknown> {
    const element: Record<string, unknown> = { id: ids.idAt(i) };
    if (p.position?.isSet(i) === true) {
        const point = p.position.value(i) as ArrayLike<number>;
        if (Number.isFinite(point[0]) && Number.isFinite(point[1])) {
            element.x = point[0];
            element.y = point[1] === 0 ? 0 : -point[1];
            if (p.positionZ && Number.isFinite(point[2])) {
                element.z = point[2];
            }
        }
    }
    if (p.z?.isSet(i) === true) {
        const z = p.z.value(i);
        if (typeof z === "number" && Number.isFinite(z)) {
            element.z = z;
        }
    }
    let v = attributesOf(p.nodeAttrs, i);
    if (p.originalIds && ids.isChanged(i)) {
        v ??= {};
        v[ORIGINAL_ID_ATTRIBUTE] = String(ids.originalAt(i));
    }
    if (v !== null) {
        element.v = v;
    }
    return element;
}

/**
 * The rows with at least one bypass value.
 * @param columns - the bypass columns
 * @param rows - the row count
 * @returns the rows, ascending
 */
function bypassRows(columns: readonly Column[], rows: number): number[] {
    const out: number[] = [];
    if (columns.length === 0) {
        return out;
    }
    for (let i = 0; i < rows; i++) {
        if (columns.some((c) => c.isSet(i))) {
            out.push(i);
        }
    }
    return out;
}

/**
 * The bypass values of one row.
 * @param columns - the bypass columns
 * @param row - the row
 * @returns property -> value
 */
function bypassValues(columns: readonly Column[], row: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const column of columns) {
        if (column.isSet(row)) {
            // the visual property's own name: a column renamed for a clash with an attribute keeps it in origin.id
            const property = column.meta.origin?.id;
            out[typeof property === "string" && property.length > 0 ? property : column.meta.name] = column.value(row);
        }
    }
    return out;
}

/**
 * The CX2 exporter plugin.
 * @category Built-in formats
 */
export const cx2Exporter: GraphExporter<Cx2ExportOptions> = Object.freeze({
    format: CX2_FORMAT,
    capabilities: CX2_CAPABILITIES,

    /**
     * Pre-flight: what export() would lose, without writing anything.
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns the notes, empty when the export is exact
     */
    check(snapshot: GraphSnapshot, options?: Cx2ExportOptions): readonly LossNote[] {
        return Object.freeze([...plan(snapshot, resolveExportOptions(options)).notes]);
    },

    /**
     * Write the document as UTF-8 chunks.
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns the chunks
     */
    export(snapshot: GraphSnapshot, options?: Cx2ExportOptions): AsyncIterable<Uint8Array> {
        return encodeChunks(write(snapshot, plan(snapshot, resolveExportOptions(options))));
    },

    /**
     * Write the document as one string.
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns the document
     */
    exportToString(snapshot: GraphSnapshot, options?: Cx2ExportOptions): Promise<string> {
        return joinText(write(snapshot, plan(snapshot, resolveExportOptions(options))));
    },
});
