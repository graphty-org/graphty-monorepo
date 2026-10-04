/**
 * The CX version 1 exporter (design/graph-io/cytoscape-and-obo/design.md section 1.2): writes a
 * snapshot as the NDEx form of a CX document -- one network with at most one view, no
 * `cySubNetworks` -- which NDEx, ndex2 and Cytoscape's CX import all read.
 *
 * Aspects, in the order Cytoscape and NDEx write them: `numberVerification`, the pre-`metaData`
 * (element counts, `idCounter` on nodes, edges, citations and supports), `nodes` (`n` the label,
 * `r` the `represents` column), `edges` (`i` the `interaction` column), `nodeAttributes`,
 * `edgeAttributes` and `networkAttributes` (values as JSON strings, the spec's form), `cyTableColumn`
 * (so a column no element fills is still declared), `cartesianLayout` (y negated back to screen
 * coordinates), `cyGroups` from the parent / parents column, `cyVisualProperties` from the
 * `cx.bypass` columns, the provenance aspects a CX import created, the style rules and unknown
 * aspects a CX import kept, and `status`.
 *
 * What CX cannot hold is announced by check() before anything is written: every edge is directed
 * (W_CX_UNDIRECTED_AS_DIRECTED, W_MUTUAL_EXPANDED), node ids are integers (E_ID_CHARSET unless
 * `sanitizeIds: "mangle"`, which keeps the original in the `graphty:originalId` attribute the
 * importer restores), nested values are written as JSON text (W_CX_JSON_AS_STRING), and the generic
 * notes of checkCapabilities(). NaN and the infinities are written as "NaN" / "Infinity" in double
 * attributes, which read back as they were.
 */

import { type Column, GraphFormatError, type GraphSnapshot, type NodeId } from "@graphty/graph-format";

import { childrenCsr } from "../../children.js";
import {
    aspectBlock,
    type CxNoteFn,
    declaredType,
    directionNotes,
    nextNodeId,
    noteList,
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
import { ORIGINAL_ID_ATTRIBUTE } from "../cx2/importer.js";

/** The format name. */
const CX_FORMAT = "cx";

/**
 * The options of the CX exporter: the common export options; it has none of its own.
 * @category Built-in formats
 */
export type CxExportOptions = CommonExportOptions;

/**
 * The loss notes the CX exporter's check() returns, by name. A key is the code without its
 * severity and format prefixes.
 * @category Built-in formats
 */
export const CX_LOSS = Object.freeze({
    /**
     * Every edge is written as directed, so an undirected graph, or the undirected edges of a mixed graph, read back
     * as directed.
     */
    UNDIRECTED_AS_DIRECTED: "W_CX_UNDIRECTED_AS_DIRECTED",
    /** A nested (json) column is written as a string attribute holding its JSON text. */
    JSON_AS_STRING: "W_CX_JSON_AS_STRING",
    /** A mutual pair is written as two directed edges without its mark. */
    MUTUAL_EXPANDED: LOSS.MUTUAL_EXPANDED,
    /**
     * An attribute named `weight` without the weight role reads back as the edge weight, or is not written when the
     * graph has weights of its own.
     */
    WEIGHT_KEY_CLASH: LOSS.WEIGHT_KEY_CLASH,
    /** A start / end / timestamp column: CX has no time. */
    TEMPORAL_DROPPED: LOSS.TEMPORAL,
    /** An attribute with a role the format has no place for is written as a plain attribute; the role is lost. */
    ROLE_DROPPED: LOSS.ROLE,
    /**
     * An attribute without a role is written where the format keeps a role (a `name` column as the label, say), and
     * reads back with that role.
     */
    ROLE_ASSUMED: LOSS.ROLE_ASSUMED,
    /**
     * An attribute type CX stores as another (a 32-bit float as double, an unsigned integer as long, a byte as
     * integer, a dictionary as string); it reads back with that type.
     */
    DTYPE_UNSUPPORTED: LOSS.DTYPE,
    /** A multi-component column (a second view's `position@2`, a vector) is written as a list of doubles. */
    COMPONENTS_FLATTENED: LOSS.COMPONENTS,
    /** A declared default: CX has none. */
    DEFAULT_DROPPED: LOSS.DEFAULT,
    /** Declared options: CX has no enumerations. */
    OPTIONS_DROPPED: LOSS.OPTIONS,
    /**
     * Node ids the format cannot write, under `sanitizeIds: "error"`; the save fails with E_INVALID_ID. Pass
     * `sanitizeIds: "mangle"` to rewrite them.
     */
    ID_CHARSET: LOSS.ID_CHARSET,
    /** Node ids that are not integers under sanitizeIds "mangle": renumbered, originals kept. */
    ID_MANGLED: LOSS.ID_MANGLED,
    /** Edges without a usable integer id get generated ids. */
    EDGE_IDS_GENERATED: LOSS.EDGE_IDS_GENERATED,
    /**
     * An attribute with a role (the label, say) is written where the format keeps that role, and reads back under the
     * name the format's importer gives it.
     */
    COLUMN_NAME_CHANGED: LOSS.COLUMN_NAME_CHANGED,
    /** An extension table other than the `cx:citations` / `cx:supports` tables a CX import creates. */
    EXTENSION_TABLE_DROPPED: LOSS.EXTENSION_TABLE,
    /** A position, stacking order or weight that is NaN or infinite: CX spells no such number there. */
    NONFINITE_AS_NULL: LOSS.NONFINITE_AS_NULL,
    /** Visual columns (color, size, shape, thickness roles): CX keeps style as visual properties, not roles. */
    VIZ_DROPPED: LOSS.VIZ,
});

/**
 * What CX version 1 keeps: directed multigraphs with self-loops, integer node ids, required
 * integer edge ids, typed string / double / integer / boolean attributes and lists of them, network
 * attributes, the position role (one view), and containment as `cyGroups`. f32, u32, u8 and dict
 * columns are written as the nearest declared type and read back as it.
 * @category Built-in formats
 */
export const CX_CAPABILITIES: ExportCapabilities = capabilities({
    mixedDirection: false,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "required",
    idCharset: "integer",
    dtypes: ["string", "f64", "i32", "bool"],
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

/** The roles CX has a slot for, and the column names its importer gives them. */
const SLOT_ROLES: ReadonlySet<string> = new Set(["label", "position", "id"]);
const ROLE_NAMES: Readonly<Record<string, string>> = Object.freeze({
    label: "name",
    position: POSITION_COLUMN,
    id: "id",
    parent: "parent",
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
    "id",
]);

/** The origin namespace of the per-element visual property columns of a CX import. */
const BYPASS_NAMESPACE = "cx.bypass";

/** The extension tables a CX import creates from the citations and supports aspects. */
const PROVENANCE_TABLES: Readonly<Record<string, string>> = Object.freeze({
    "cx:citations": "citations",
    "cx:supports": "supports",
});

/**
 * Kept aspects never written back: they describe the collection, views and SUIDs of the file the
 * snapshot came from, or are written by the exporter itself.
 */
const NEVER_WRITTEN: ReadonlySet<string> = new Set([
    "nodes",
    "edges",
    "nodeAttributes",
    "edgeAttributes",
    "networkAttributes",
    "cartesianLayout",
    "cyGroups",
    "cyVisualProperties",
    "cyTableColumn",
    "cySubNetworks",
    "cyNetworkRelations",
    "cyViews",
    "CX Element ID",
    "citations",
    "supports",
    "nodeCitations",
    "edgeCitations",
    "nodeSupports",
    "edgeSupports",
    "functionTerms",
    "reifiedEdges",
    "numberVerification",
    "metaData",
    "status",
    "groups",
    "subnetwork",
]);

/** The weight attribute name (the CX importer's weightFrom default). */
const WEIGHT_ATTRIBUTE = "weight";

/** The dtypes a plain `weight` column may have to be written as the weight. */
const NUMERIC_DTYPES: ReadonlySet<string> = new Set(["f32", "f64", "i32", "u32", "u8"]);

/** One attribute column as it will be written. */
interface AttributePlan {
    readonly column: Column;
    /** The attribute name written in n. */
    readonly name: string;
    /** The declared type text. */
    readonly d: string;
}

/** A core field (n, r, i) and the column it comes from. */
interface CorePlan {
    readonly key: "n" | "r" | "i";
    readonly column: Column;
}

/** The edge weights as written: explicit weights or a plain numeric `weight` column. */
interface WeightPlan {
    /**
     * The weight of an edge, or undefined when none is written.
     * @param e - the edge index
     * @returns the value
     */
    value(e: number): number | undefined;
}

/** Everything export() and check() need, computed once. */
interface Plan {
    readonly notes: LossNote[];
    readonly fatal: GraphFormatError | null;
    readonly ids: WrittenIds | null;
    readonly folding: PairFolding;
    readonly edgeIds: readonly number[];
    readonly weight: WeightPlan | null;
    readonly nodeCore: readonly CorePlan[];
    readonly edgeCore: readonly CorePlan[];
    readonly nodeAttrs: readonly AttributePlan[];
    readonly edgeAttrs: readonly AttributePlan[];
    readonly graphAttrs: readonly AttributePlan[];
    readonly position: Column | null;
    readonly positionZ: boolean;
    readonly z: Column | null;
    readonly bypass: {
        readonly node: readonly Column[];
        readonly edge: readonly Column[];
        readonly graph: readonly Column[];
    };
    readonly collapsed: Column | null;
    readonly links: readonly LinkPlan[];
    readonly functionTerm: Column | null;
    readonly reifiedEdge: Column | null;
}

/** A citations / supports list column and the aspect it is written to. */
interface LinkPlan {
    readonly aspect: string;
    readonly key: "citations" | "supports";
    readonly domain: "node" | "edge";
    readonly column: Column;
}

/**
 * Whether a column was created by the CX importer in an origin namespace.
 * @param column - the column
 * @param namespace - the namespace
 * @returns true when it was
 */
function fromCx(column: Column, namespace: string): boolean {
    return column.meta.origin?.format === CX_FORMAT && column.meta.origin.namespace === namespace;
}

/**
 * Whether a column is a bypass column of a CX import.
 * @param column - the column
 * @returns true for the cx.bypass namespace
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
 * Whether a column is a provenance list column (citations / supports) of a CX import.
 * @param column - the column
 * @returns true for one
 */
function isLink(column: Column): boolean {
    return (
        fromCx(column, "provenance") &&
        column.meta.dtype === "list" &&
        (column.meta.name === "citations" || column.meta.name === "supports")
    );
}

/**
 * Whether a column holds a text the core fields (n, r, i) cannot hold as itself.
 * @param column - the column
 * @returns true for every dtype but string (dict and json have their own notes)
 */
function coreNeedsText(column: Column): boolean {
    const { dtype } = column.meta;
    return dtype !== "string" && dtype !== "dict" && dtype !== "json";
}

/**
 * The notes of checkCapabilities(), adapted to CX: json columns are written as JSON text, the id
 * notes are counted by planNodeIds(), the provenance tables and columns a CX import made are
 * written back.
 * @param snapshot - the snapshot
 * @param common - the resolved common options
 * @param several - whether the parents column gives some node several parents
 * @param own - the functionTerm and reifiedEdge columns written as their own aspects
 * @param notes - the notes so far
 * @param note - records a note
 * @returns the error export() throws for mixed direction, or null
 */
function genericNotes(
    snapshot: GraphSnapshot,
    common: ResolvedExportOptions,
    several: boolean,
    own: readonly (Column | null)[],
    notes: LossNote[],
    note: CxNoteFn,
): GraphFormatError | null {
    let fatal: GraphFormatError | null = null;
    const edgeLabel = snapshot.edges.byRole("label")?.meta.name;
    const ownNames = new Set(own.filter((c): c is Column => c !== null).map((c) => c.meta.name));
    for (const gen of checkCapabilities(snapshot, CX_CAPABILITIES, common, {
        roles: SLOT_ROLES,
        // a parents column reads back as parents only when some node has several parents
        roleNames: several ? { ...ROLE_NAMES, parents: "parents" } : ROLE_NAMES,
    })) {
        if (gen.column !== null && ownNames.has(gen.column) && (gen.code === LOSS.JSON || gen.code === LOSS.DTYPE)) {
            continue;
        }
        if (gen.code === LOSS.ID_CHARSET || gen.code === LOSS.ID_MANGLED) {
            // counted by planNodeIds(): CX also keeps integer ids beyond 2^53, which the generic rule refuses
            continue;
        }
        if (gen.code === LOSS.EXTENSION_TABLE && gen.column !== null && gen.column in PROVENANCE_TABLES) {
            continue;
        }
        if (gen.code === LOSS.JSON) {
            note(
                CX_LOSS.JSON_AS_STRING,
                `${gen.column === null ? "a column" : `column "${gen.column}"`} holds nested values; written as a string attribute holding their JSON text`,
                gen.column,
                gen.count,
            );
            continue;
        }
        if (
            gen.code === LOSS.COLUMN_NAME_CHANGED &&
            gen.column === edgeLabel &&
            gen.message.startsWith("edge column")
        ) {
            // only nodes have a label slot (n); an edge label is a plain attribute
            note(
                LOSS.ROLE,
                `edge column "${edgeLabel}" (label) is written as a plain attribute; CX edges have no label slot and the role is lost`,
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
    if (edgeLabel === "name") {
        note(
            LOSS.ROLE,
            `edge column "name" (label) is written as a plain attribute; CX edges have no label slot and the role is lost`,
            "name",
            null,
        );
    }
    return fatal;
}

/**
 * Plan an export: the notes, the fatal condition and what is written.
 * @param snapshot - the snapshot
 * @param common - the resolved common options
 * @returns the plan
 */
function plan(snapshot: GraphSnapshot, common: ResolvedExportOptions): Plan {
    const { notes, note } = noteList();
    const functionTerm =
        [...snapshot.nodes].find((c) => fromCx(c, "provenance") && c.meta.name === "functionTerm") ?? null;
    const reifiedEdge = [...snapshot.nodes].find((c) => fromCx(c, "reifiedEdges") && c.dtype === "u32") ?? null;
    const children = childrenCsr(snapshot);
    const several = children.column?.meta.role === "parents" && severalParents(children.column);
    let fatal = genericNotes(snapshot, common, several, [functionTerm, reifiedEdge], notes, note);

    const folding = pairFolding(snapshot);
    directionNotes(snapshot, folding, common, CX_LOSS.UNDIRECTED_AS_DIRECTED, note);
    const planned = planNodeIds(snapshot, common, "CX", ORIGINAL_ID_ATTRIBUTE, note);
    const ids = planned instanceof GraphFormatError ? null : planned;
    if (planned instanceof GraphFormatError) {
        fatal ??= planned;
    }
    const edgeIds = planEdgeIds(snapshot, note);
    if (snapshot.nodes.has(ORIGINAL_ID_ATTRIBUTE)) {
        note(
            LOSS.ROLE_ASSUMED,
            `node column "${ORIGINAL_ID_ATTRIBUTE}" is the importer's record of mangled ids: it reads back as the node ids unless restoreMangledIds is false`,
            ORIGINAL_ID_ATTRIBUTE,
            null,
        );
    }

    // nodes: n, r, the z column, the groups' collapsed flags, provenance
    const position = snapshot.nodes.byRole("position");
    const zColumn = [...snapshot.nodes].find(isZ) ?? null;
    const z = zColumn !== null && zFitsLayout(zColumn, position) ? zColumn : null;
    let nonfinite = position === null ? 0 : nonFiniteCells(position, (v) => [v[0], v[1]]);
    const depth = position === null ? 0 : nonFiniteCells(position, (v) => (v[2] === 0 ? [] : [NaN]));
    const positionZ = position !== null && zColumn === null && (position.meta.extra.sourceDims === 3 || depth > 0);
    if (position !== null && positionZ) {
        nonfinite += nonFiniteCells(position, (v) => (Number.isFinite(v[0]) && Number.isFinite(v[1]) ? [v[2]] : []));
        note(
            LOSS.COMPONENTS,
            `node column "${position.meta.name}" (position) has a third coordinate; CX writes it as the layout's z, which reads back in the z column (a stacking order), not in the position`,
            position.meta.name,
            depth,
        );
    }
    const collapsed = [...snapshot.nodes].find((c) => fromCx(c, "cyGroups") && c.dtype === "bool") ?? null;
    const nodeCore = corePlans(snapshot, note);
    const edgeCore: CorePlan[] = [];
    const interaction = snapshot.edges.get("interaction");
    if (interaction !== null && (interaction.meta.role === null || !SKIPPED_ROLES.has(interaction.meta.role))) {
        edgeCore.push({ key: "i", column: interaction });
        coreTextNote(interaction, "edge", note);
    }

    const coreColumns = new Set<Column>([...nodeCore, ...edgeCore].map((c) => c.column));
    const special = (c: Column): boolean =>
        coreColumns.has(c) ||
        isBypass(c) ||
        isLink(c) ||
        c === z ||
        c === collapsed ||
        c === functionTerm ||
        c === reifiedEdge ||
        (c.meta.role !== null && SKIPPED_ROLES.has(c.meta.role));

    const label = snapshot.nodes.byRole("label");
    const renamedName = label !== null && label.meta.name !== "name" ? snapshot.nodes.get("name") : null;
    if (renamedName !== null) {
        note(
            LOSS.COLUMN_NAME_CHANGED,
            `node column "name" is written as the attribute "name#2": the label column "${label?.meta.name ?? ""}" is written as n, which reads back as "name"`,
            "name",
            renamedName.length - renamedName.nullCount,
        );
    }
    const nodeAttrs = attributePlans(snapshot.nodes, special, (c) => (c === renamedName ? "name#2" : c.meta.name));

    const weight = planWeight(snapshot, folding, note);
    const plainWeight = snapshot.edges.get(WEIGHT_ATTRIBUTE);
    const edgeAttrs = attributePlans(
        snapshot.edges,
        (c) => special(c) || (c === plainWeight && c.meta.role === null),
        (c) => c.meta.name,
    );
    nonfinite += weight.nonfinite;

    for (const c of snapshot.graph) {
        if (
            !isBypass(c) &&
            (c.meta.name === "name" || c.meta.name === "description") &&
            (c.dtype === "string" || c.dtype === "dict")
        ) {
            note(
                LOSS.ROLE_ASSUMED,
                `graph column "${c.meta.name}" is written as the network attribute ${c.meta.name}, which reads back as the graph's ${c.meta.name}, not as a column`,
                c.meta.name,
                null,
            );
        }
    }
    const graphAttrs = attributePlans(snapshot.graph, isBypass, (c) => c.meta.name);

    if (children.column !== null && children.column.meta.role === "parents" && !several) {
        note(
            LOSS.COLUMN_NAME_CHANGED,
            `node column "${children.column.meta.name}" (parents) holds at most one parent per node; it reads back as the single-parent column "parent"`,
            children.column.meta.name,
            children.column.length - children.column.nullCount,
        );
    }

    if (nonfinite > 0) {
        note(
            LOSS.NONFINITE_AS_NULL,
            `${nonfinite} NaN or infinite position(s), stacking order(s) or weight(s) cannot be written in CX; they read back unset`,
            null,
            nonfinite,
        );
    }
    return {
        notes,
        fatal,
        ids,
        folding,
        edgeIds,
        weight: weight.plan,
        nodeCore,
        edgeCore,
        nodeAttrs,
        edgeAttrs,
        graphAttrs,
        position,
        positionZ,
        z,
        bypass: {
            node: [...snapshot.nodes].filter(isBypass),
            edge: [...snapshot.edges].filter(isBypass),
            graph: [...snapshot.graph].filter(isBypass),
        },
        collapsed,
        links: linkPlans(snapshot),
        functionTerm,
        reifiedEdge,
    };
}

/**
 * The node core fields: n from the label column (else a plain `name` column, which then reads back
 * as the label), r from a `represents` column.
 * @param snapshot - the snapshot
 * @param note - records a note
 * @returns the plans
 */
function corePlans(snapshot: GraphSnapshot, note: CxNoteFn): CorePlan[] {
    const out: CorePlan[] = [];
    const label = snapshot.nodes.byRole("label");
    const plainName = snapshot.nodes.get("name");
    const n = label ?? (plainName !== null && plainName.meta.role === null ? plainName : null);
    if (n !== null) {
        out.push({ key: "n", column: n });
        coreTextNote(n, "node", note);
        if (n !== label) {
            note(
                LOSS.ROLE_ASSUMED,
                `node column "name" is written as n and reads back as the label`,
                "name",
                n.length - n.nullCount,
            );
        }
    }
    const represents = snapshot.nodes.get("represents");
    if (
        represents !== null &&
        represents !== n &&
        (represents.meta.role === null || !SKIPPED_ROLES.has(represents.meta.role))
    ) {
        out.push({ key: "r", column: represents });
        coreTextNote(represents, "node", note);
    }
    return out;
}

/**
 * The note of a core field column that is not text: n, r and i are strings in CX.
 * @param column - the column
 * @param domain - node or edge
 * @param note - records a note
 */
function coreTextNote(column: Column, domain: string, note: CxNoteFn): void {
    if (coreNeedsText(column)) {
        note(
            LOSS.DTYPE,
            `${domain} column "${column.meta.name}" is ${column.dtype}; CX writes it as text and it reads back as string`,
            column.meta.name,
            column.length - column.nullCount,
        );
    }
}

/**
 * The attribute plans of one table.
 * @param table - the table
 * @param skip - columns not written as attributes
 * @param rename - the written name of a column
 * @returns the plans
 */
function attributePlans(
    table: Iterable<Column>,
    skip: (column: Column) => boolean,
    rename: (column: Column) => string,
): AttributePlan[] {
    return [...table]
        .filter((c) => !skip(c))
        .map((column) => ({ column, name: rename(column), d: declaredType(column) }));
}

/**
 * The weights to write: the explicit weights, else a plain numeric `weight` column (which then
 * reads back as THE weight); a plain `weight` column that is not written is noted.
 * @param snapshot - the snapshot
 * @param folding - the pair folding
 * @param note - records a note
 * @returns the plan, or null for no weight attribute, and the count of non-finite weights skipped
 */
function planWeight(
    snapshot: GraphSnapshot,
    folding: PairFolding,
    note: CxNoteFn,
): { plan: WeightPlan | null; nonfinite: number } {
    const weights: ExplicitWeights = explicitWeights(snapshot);
    const plain = snapshot.edges.get(WEIGHT_ATTRIBUTE);
    const clash = plain !== null && plain.meta.role === null;
    let plan: WeightPlan | null = null;
    if (weights.weighted) {
        plan = { value: (e) => (weights.isExplicit(e) ? weights.value(e) : undefined) };
        if (clash) {
            note(
                LOSS.WEIGHT_KEY_CLASH,
                `edge column "${WEIGHT_ATTRIBUTE}" is not written: the explicit weights are written under that name`,
                WEIGHT_ATTRIBUTE,
                null,
            );
        }
    } else if (clash) {
        const numeric = NUMERIC_DTYPES.has(plain.dtype);
        note(
            LOSS.WEIGHT_KEY_CLASH,
            numeric
                ? `edge column "${WEIGHT_ATTRIBUTE}" is written as the weight attribute and reads back as the edge weight`
                : `edge column "${WEIGHT_ATTRIBUTE}" is ${plain.dtype}, and CX reads that attribute as the edge weight; it is not written`,
            WEIGHT_ATTRIBUTE,
            null,
        );
        if (numeric) {
            plan = { value: (e) => (plain.isSet(e) ? (plain.value(e) as number) : undefined) };
        }
    }
    let nonfinite = 0;
    if (plan !== null) {
        for (let e = 0; e < snapshot.edgeCount; e++) {
            const w = plan.value(e);
            // NaN is not a weight on re-import; the infinities are
            if (!folding.folded(e) && w !== undefined && Number.isNaN(w)) {
                nonfinite++;
            }
        }
    }
    return { plan, nonfinite };
}

/**
 * Whether the z column can go into cartesianLayout: every set z is finite and its node has a
 * finite position (a layout entry needs x and y). Otherwise it is written as an ordinary attribute.
 * @param z - the z column
 * @param position - the position column
 * @returns true when every z fits a layout entry
 */
function zFitsLayout(z: Column, position: Column | null): boolean {
    for (let i = 0; i < z.length; i++) {
        if (!z.isSet(i)) {
            continue;
        }
        const value = z.value(i);
        const point = position?.isSet(i) === true ? (position.value(i) as ArrayLike<number>) : null;
        if (
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            point === null ||
            !Number.isFinite(point[0]) ||
            !Number.isFinite(point[1])
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Count the set cells of a multi-component column with a non-finite component among those picked.
 * @param column - the column
 * @param pick - the components that are written
 * @returns the count
 */
function nonFiniteCells(column: Column, pick: (value: ArrayLike<number>) => number[]): number {
    let count = 0;
    for (let i = 0; i < column.length; i++) {
        if (column.isSet(i) && pick(column.value(i) as ArrayLike<number>).some((v) => !Number.isFinite(v))) {
            count++;
        }
    }
    return count;
}

/**
 * Whether a parents column gives some node more than one parent.
 * @param column - the parents list column
 * @returns true when one does
 */
function severalParents(column: Column): boolean {
    for (let i = 0; i < column.length; i++) {
        if (column.isSet(i) && (column.value(i) as ArrayLike<unknown>).length > 1) {
            return true;
        }
    }
    return false;
}

/**
 * The citations / supports list columns of a CX import and the aspects they go to.
 * @param snapshot - the snapshot
 * @returns the plans
 */
function linkPlans(snapshot: GraphSnapshot): LinkPlan[] {
    const out: LinkPlan[] = [];
    for (const [domain, table] of [
        ["node", snapshot.nodes],
        ["edge", snapshot.edges],
    ] as const) {
        for (const column of table) {
            if (isLink(column)) {
                const key = column.meta.name as "citations" | "supports";
                out.push({ aspect: `${domain}${key === "citations" ? "Citations" : "Supports"}`, key, domain, column });
            }
        }
    }
    return out;
}

// ============================================================ writing

/**
 * The text of a scalar the way Cytoscape writes CX values: numbers by their shortest decimal
 * ("-0", "NaN", "Infinity" included), booleans as "true" / "false".
 * @param value - the value
 * @returns the text
 */
function scalarText(value: unknown): string {
    if (typeof value === "number") {
        return Object.is(value, -0) ? "-0" : String(value);
    }
    if (typeof value === "string") {
        return value;
    }
    return typeof value === "boolean" ? String(value) : JSON.stringify(value);
}

/**
 * The v of one cell: a JSON string, or an array of strings for a list type.
 * @param column - the column
 * @param d - its declared type
 * @param row - the row
 * @returns the value, or undefined for an unset cell
 */
function cellValue(column: Column, d: string, row: number): unknown {
    if (!column.isSet(row)) {
        return undefined;
    }
    const value = column.value(row);
    if (column.meta.dtype === "json") {
        return JSON.stringify(value);
    }
    if (column.meta.dtype === "list" || column.meta.components > 1) {
        const items = Array.from(value as ArrayLike<unknown>);
        return d === "string" ? JSON.stringify(items) : items.map(scalarText);
    }
    return scalarText(value);
}

/**
 * The text a core field (n, r, i) holds for one row.
 * @param column - the column
 * @param row - the row
 * @returns the text, or undefined for an unset cell
 */
function coreText(column: Column, row: number): string | undefined {
    if (!column.isSet(row)) {
        return undefined;
    }
    const value = column.value(row);
    if (column.meta.dtype === "json" || column.meta.dtype === "list" || column.meta.components > 1) {
        return JSON.stringify(column.meta.dtype === "json" ? value : Array.from(value as ArrayLike<unknown>));
    }
    return scalarText(value);
}

/** One aspect to write: its name, its elements (produced twice: once to count them) and its idCounter. */
interface Aspect {
    readonly name: string;
    readonly elements: () => Iterable<unknown>;
    readonly idCounter?: NodeId | undefined;
}

/**
 * The written edges: every logical edge but the folded halves of pairs.
 * @param snapshot - the snapshot
 * @param folding - the pair folding
 * @returns the edge indexes
 */
function writtenEdges(snapshot: GraphSnapshot, folding: PairFolding): number[] {
    const out: number[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (!folding.folded(e)) {
            out.push(e);
        }
    }
    return out;
}

/**
 * Build every aspect of the document, in the order Cytoscape and NDEx write them.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @param ids - the written node ids
 * @returns the aspects (those without elements included; the writer skips them)
 */
function aspects(snapshot: GraphSnapshot, p: Plan, ids: WrittenIds): Aspect[] {
    const { src, dst } = snapshot.edgeList();
    const edges = writtenEdges(snapshot, p.folding);
    const nodeRange = (): number[] => Array.from({ length: snapshot.nodeCount }, (_, i) => i);
    const nodeCore = (key: "n" | "r"): Column | null => p.nodeCore.find((c) => c.key === key)?.column ?? null;
    const n = nodeCore("n");
    const r = nodeCore("r");
    const i = p.edgeCore[0]?.column ?? null;
    const kept =
        snapshot.meta.sourceFormat === CX_FORMAT && isRecord(snapshot.meta.extra.cx) ? snapshot.meta.extra.cx : {};

    const out: Aspect[] = [
        {
            name: "nodes",
            idCounter: nextNodeId(ids, snapshot.nodeCount),
            *elements() {
                for (let row = 0; row < snapshot.nodeCount; row++) {
                    const element: Record<string, unknown> = { "@id": ids.idAt(row) };
                    const name = n === null ? undefined : coreText(n, row);
                    const represents = r === null ? undefined : coreText(r, row);
                    if (name !== undefined) {
                        element.n = name;
                    }
                    if (represents !== undefined) {
                        element.r = represents;
                    }
                    yield element;
                }
            },
        },
        {
            name: "edges",
            idCounter: edges.reduce((max, e) => Math.max(max, p.edgeIds[e] + 1), 0),
            *elements() {
                for (const e of edges) {
                    const element: Record<string, unknown> = {
                        "@id": p.edgeIds[e],
                        s: ids.idAt(src[e]),
                        t: ids.idAt(dst[e]),
                    };
                    const interaction = i === null ? undefined : coreText(i, e);
                    if (interaction !== undefined) {
                        element.i = interaction;
                    }
                    yield element;
                }
            },
        },
        {
            name: "nodeAttributes",
            *elements() {
                for (const a of p.nodeAttrs) {
                    for (let row = 0; row < snapshot.nodeCount; row++) {
                        const v = cellValue(a.column, a.d, row);
                        if (v !== undefined) {
                            yield { po: ids.idAt(row), n: a.name, v, d: a.d };
                        }
                    }
                }
                for (let row = 0; row < snapshot.nodeCount; row++) {
                    if (ids.isChanged(row)) {
                        yield {
                            po: ids.idAt(row),
                            n: ORIGINAL_ID_ATTRIBUTE,
                            v: String(ids.originalAt(row)),
                            d: "string",
                        };
                    }
                }
            },
        },
        {
            name: "edgeAttributes",
            *elements() {
                for (const a of p.edgeAttrs) {
                    for (const e of edges) {
                        const v = cellValue(a.column, a.d, e);
                        if (v !== undefined) {
                            yield { po: p.edgeIds[e], n: a.name, v, d: a.d };
                        }
                    }
                }
                if (p.weight !== null) {
                    for (const e of edges) {
                        const w = p.weight.value(e);
                        if (w !== undefined && !Number.isNaN(w)) {
                            yield { po: p.edgeIds[e], n: WEIGHT_ATTRIBUTE, v: scalarText(w), d: "double" };
                        }
                    }
                }
            },
        },
        {
            name: "networkAttributes",
            *elements() {
                for (const a of p.graphAttrs) {
                    const v = cellValue(a.column, a.d, 0);
                    if (v !== undefined) {
                        yield { n: a.name, v, d: a.d };
                    }
                }
                const { meta } = snapshot;
                for (const [key, value] of [
                    ["name", meta.name],
                    ["description", meta.description],
                ] as const) {
                    if (value !== null && !p.graphAttrs.some((a) => a.name === key)) {
                        yield { n: key, v: value, d: "string" };
                    }
                }
            },
        },
        { name: "cyTableColumn", elements: () => tableColumns(p, ids) },
        { name: "cartesianLayout", elements: () => layoutElements(p, ids, nodeRange()) },
        { name: "cyGroups", elements: () => groupElements(snapshot, p, ids, edges) },
        { name: "cyVisualProperties", elements: () => visualProperties(p, ids, nodeRange(), edges, kept) },
    ];
    out.push(...provenanceAspects(snapshot, p, ids, edges));
    for (const [name, value] of Object.entries(kept)) {
        if (!NEVER_WRITTEN.has(name) && Array.isArray(value)) {
            out.push({ name, elements: () => keptElements(value, kept.subnetwork, STYLE_ASPECTS.has(name)) });
        }
    }
    return out;
}

/**
 * The cyTableColumn entries: every written column with its type, so a column no element fills is
 * still declared on re-import.
 * @param p - the plan
 * @param ids - the written ids
 * @yields the entries
 */
function* tableColumns(p: Plan, ids: WrittenIds): Generator<unknown, void, undefined> {
    for (const { key, column } of [...p.nodeCore, ...p.edgeCore]) {
        const n = { n: "name", r: "represents", i: "interaction" }[key];
        if (n !== undefined && column !== null) {
            yield { applies_to: key === "i" ? "edge_table" : "node_table", n, d: "string" };
        }
    }
    for (const a of p.nodeAttrs) {
        yield { applies_to: "node_table", n: a.name, d: a.d };
    }
    if (ids.changed > 0) {
        yield { applies_to: "node_table", n: ORIGINAL_ID_ATTRIBUTE, d: "string" };
    }
    for (const a of p.edgeAttrs) {
        yield { applies_to: "edge_table", n: a.name, d: a.d };
    }
    if (p.weight !== null) {
        yield { applies_to: "edge_table", n: WEIGHT_ATTRIBUTE, d: "double" };
    }
    for (const a of p.graphAttrs) {
        yield { applies_to: "network_table", n: a.name, d: a.d };
    }
}

/** Kept aspects whose view references are rewritten to the one view of the written file. */
const STYLE_ASPECTS: ReadonlySet<string> = new Set(["tableVisualProperties", "cyTableVisualProperties"]);

/**
 * The elements of a kept aspect: those of the snapshot's own subnetwork (or unscoped), with the
 * scope dropped; style elements get their view references rewritten to view 0.
 * @param elements - the kept elements
 * @param subnetwork - the subnetwork the snapshot was read from, if any
 * @param style - whether the aspect is a style aspect
 * @yields the elements to write
 */
function* keptElements(
    elements: readonly unknown[],
    subnetwork: unknown,
    style: boolean,
): Generator<unknown, void, undefined> {
    for (const element of elements) {
        if (!isRecord(element)) {
            yield element;
            continue;
        }
        if (element.s !== undefined && element.s !== null && element.s !== subnetwork) {
            continue;
        }
        const { s: _scope, ...rest } = element;
        yield style ? rewriteView(rest) : rest;
    }
}

/**
 * A style element with its view and subnetwork references rewritten to 0, the written network.
 * @param element - the element
 * @returns the rewritten element
 */
function rewriteView(element: Record<string, unknown>): Record<string, unknown> {
    const out = { ...element };
    if ("view" in out) {
        out.view = 0;
    }
    if (typeof out.applies_to === "number") {
        out.applies_to = 0;
    }
    return out;
}

/**
 * The cartesianLayout entries: x / y (y negated back to screen coordinates) and z.
 * @param p - the plan
 * @param ids - the written ids
 * @param rows - every node row
 * @yields the entries
 */
function* layoutElements(p: Plan, ids: WrittenIds, rows: readonly number[]): Generator<unknown, void, undefined> {
    const { position } = p;
    if (position === null) {
        return;
    }
    for (const row of rows) {
        if (!position.isSet(row)) {
            continue;
        }
        const point = position.value(row) as ArrayLike<number>;
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
            continue;
        }
        const entry: Record<string, unknown> = { node: ids.idAt(row), x: point[0], y: point[1] === 0 ? 0 : -point[1] };
        if (p.z?.isSet(row) === true) {
            entry.z = p.z.value(row);
        } else if (p.positionZ && Number.isFinite(point[2])) {
            entry.z = point[2];
        }
        yield entry;
    }
}

/**
 * The cyGroups entries: one per node that has members (or a collapsed flag), its members, and the
 * edges with both ends (internal) or one end (external) among them.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @param ids - the written ids
 * @param edges - the written edges
 * @yields the entries
 */
function* groupElements(
    snapshot: GraphSnapshot,
    p: Plan,
    ids: WrittenIds,
    edges: readonly number[],
): Generator<unknown, void, undefined> {
    const children = childrenCsr(snapshot);
    const groupsOf = new Map<number, number[]>();
    const groups: number[] = [];
    for (let g = 0; g < snapshot.nodeCount; g++) {
        const members = children.childrenOf(g);
        if (members.length > 0 || p.collapsed?.isSet(g) === true) {
            groups.push(g);
        }
        for (const c of members) {
            groupsOf.set(c, [...(groupsOf.get(c) ?? []), g]);
        }
    }
    if (groups.length === 0) {
        return;
    }
    const internal = new Map<number, number[]>();
    const external = new Map<number, number[]>();
    const add = (table: Map<number, number[]>, g: number, id: number): void => {
        table.set(g, [...(table.get(g) ?? []), id]);
    };
    const { src, dst } = snapshot.edgeList();
    for (const e of edges) {
        const ofSource = groupsOf.get(src[e]) ?? [];
        const ofTarget = groupsOf.get(dst[e]) ?? [];
        for (const g of ofSource) {
            add(ofTarget.includes(g) ? internal : external, g, p.edgeIds[e]);
        }
        for (const g of ofTarget) {
            if (!ofSource.includes(g)) {
                add(external, g, p.edgeIds[e]);
            }
        }
    }
    const label = p.nodeCore.find((c) => c.key === "n")?.column ?? null;
    for (const g of groups) {
        const entry: Record<string, unknown> = { "@id": ids.idAt(g) };
        const name = label === null ? undefined : coreText(label, g);
        if (name !== undefined) {
            entry.n = name;
        }
        entry.nodes = Array.from(children.childrenOf(g), (c) => ids.idAt(c));
        entry.internal_edges = internal.get(g) ?? [];
        entry.external_edges = external.get(g) ?? [];
        if (p.collapsed?.isSet(g) === true) {
            entry.collapsed = p.collapsed.value(g);
        }
        yield entry;
    }
}

/**
 * The visual property values of one row: property -> value text.
 * @param columns - the bypass columns
 * @param row - the row
 * @returns the properties, or null when none is set
 */
function bypassValues(columns: readonly Column[], row: number): Record<string, string> | null {
    let out: Record<string, string> | null = null;
    for (const column of columns) {
        if (column.isSet(row)) {
            // the visual property's own name: a column renamed for a clash with an attribute keeps it in origin.id
            const property = column.meta.origin?.id;
            out ??= {};
            out[typeof property === "string" && property.length > 0 ? property : column.meta.name] = scalarText(
                column.value(row),
            );
        }
    }
    return out;
}

/**
 * The cyVisualProperties entries: the network values, the style rules a CX import kept (its own
 * view's, rewritten to view 0) and the per-element values.
 * @param p - the plan
 * @param ids - the written ids
 * @param rows - every node row
 * @param edges - the written edges
 * @param kept - meta.extra.cx of a CX import, else empty
 * @yields the entries
 */
function* visualProperties(
    p: Plan,
    ids: WrittenIds,
    rows: readonly number[],
    edges: readonly number[],
    kept: Record<string, unknown>,
): Generator<unknown, void, undefined> {
    const network = bypassValues(p.bypass.graph, 0);
    if (network !== null) {
        yield { properties_of: "network", properties: network };
    }
    const view = ownView(kept);
    for (const entry of Array.isArray(kept.cyVisualProperties) ? (kept.cyVisualProperties as unknown[]) : []) {
        if (
            isRecord(entry) &&
            !["nodes", "edges", "network"].includes(String(entry.properties_of)) &&
            (view === null || entry.view === undefined || entry.view === null || entry.view === view)
        ) {
            yield rewriteView(entry);
        }
    }
    for (const row of rows) {
        const properties = bypassValues(p.bypass.node, row);
        if (properties !== null) {
            yield { properties_of: "nodes", applies_to: ids.idAt(row), properties };
        }
    }
    for (const e of edges) {
        const properties = bypassValues(p.bypass.edge, e);
        if (properties !== null) {
            yield { properties_of: "edges", applies_to: p.edgeIds[e], properties };
        }
    }
}

/**
 * The view of the subnetwork a CX import read (the one its style rules belong to).
 * @param kept - meta.extra.cx
 * @returns the view id, or null when the file named none
 */
function ownView(kept: Record<string, unknown>): unknown {
    const sub = kept.subnetwork;
    for (const r of Array.isArray(kept.cyNetworkRelations) ? (kept.cyNetworkRelations as unknown[]) : []) {
        if (isRecord(r) && r.r === "view" && (sub === undefined || r.p === sub)) {
            return r.c;
        }
    }
    for (const v of Array.isArray(kept.cyViews) ? (kept.cyViews as unknown[]) : []) {
        if (isRecord(v) && (sub === undefined || v.s === sub)) {
            return v["@id"];
        }
    }
    return null;
}

/**
 * The provenance aspects a CX import turned into extension tables and columns, written back:
 * citations, supports, their node / edge links, functionTerms and reifiedEdges.
 * @param snapshot - the snapshot
 * @param p - the plan
 * @param ids - the written ids
 * @param edges - the written edges
 * @returns the aspects
 */
function provenanceAspects(snapshot: GraphSnapshot, p: Plan, ids: WrittenIds, edges: readonly number[]): Aspect[] {
    const out: Aspect[] = [];
    for (const [table, aspect] of Object.entries(PROVENANCE_TABLES)) {
        const ext = snapshot.extensions.get(table);
        if (ext === undefined) {
            continue;
        }
        const idColumn = ext.get("id");
        const fields = [...ext].filter((c) => c !== idColumn);
        let max = -1;
        for (let row = 0; row < ext.rowCount; row++) {
            if (idColumn?.isSet(row) === true) {
                max = Math.max(max, Number(idColumn.value(row)));
            }
        }
        out.push({
            name: aspect,
            idCounter: max + 1,
            *elements() {
                for (let row = 0; row < ext.rowCount; row++) {
                    const element: Record<string, unknown> = {};
                    if (idColumn?.isSet(row) === true) {
                        element["@id"] = idColumn.value(row);
                    }
                    for (const field of fields) {
                        if (field.isSet(row)) {
                            element[field.meta.name] = field.value(row);
                        }
                    }
                    yield element;
                }
            },
        });
    }
    for (const link of p.links) {
        out.push({
            name: link.aspect,
            *elements() {
                const rows = link.domain === "node" ? Array.from({ length: snapshot.nodeCount }, (_, i) => i) : edges;
                for (const row of rows) {
                    if (link.column.isSet(row)) {
                        const po = link.domain === "node" ? ids.idAt(row) : p.edgeIds[row];
                        yield { po: [po], [link.key]: Array.from(link.column.value(row) as ArrayLike<unknown>) };
                    }
                }
            },
        });
    }
    const terms = p.functionTerm;
    if (terms !== null) {
        out.push({
            name: "functionTerms",
            *elements() {
                for (let row = 0; row < snapshot.nodeCount; row++) {
                    const term = terms.isSet(row) ? terms.value(row) : null;
                    if (isRecord(term)) {
                        yield { po: ids.idAt(row), ...term };
                    }
                }
            },
        });
    }
    const reified = p.reifiedEdge;
    if (reified !== null) {
        out.push({
            name: "reifiedEdges",
            *elements() {
                for (let row = 0; row < snapshot.nodeCount; row++) {
                    const edge = reified.isSet(row) ? (reified.value(row) as number) : -1;
                    if (edge >= 0 && edge < snapshot.edgeCount) {
                        yield { node: ids.idAt(row), edge: p.edgeIds[edge] };
                    }
                }
            },
        });
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
        throw new GraphFormatError("E_INVALID_ID", "node ids cannot be written as CX integers", { reason: "charset" });
    }
    const all = aspects(snapshot, p, ids);
    const written: { aspect: Aspect; count: number }[] = [];
    for (const aspect of all) {
        let count = 0;
        for (const _ of aspect.elements()) {
            count++;
        }
        if (count > 0 || aspect.name === "nodes") {
            written.push({ aspect, count });
        }
    }
    const metaData = written.map(({ aspect, count }) => ({
        name: aspect.name,
        version: "1.0",
        ...(aspect.idCounter === undefined ? {} : { idCounter: aspect.idCounter }),
        elementCount: count,
        consistencyGroup: 1,
    }));
    yield '[{"numberVerification":[{"longNumber":281474976710655}]},\n';
    yield `{"metaData":${stringify(metaData)}},\n`;
    for (const { aspect } of written) {
        yield* aspectBlock(aspect.name, mapIterable(aspect.elements(), stringify));
    }
    yield '{"status":[{"error":"","success":true}]}]\n';
}

/**
 * Map an iterable lazily.
 * @param items - the items
 * @param fn - the mapping
 * @yields the mapped items
 */
function* mapIterable<T, U>(items: Iterable<T>, fn: (item: T) => U): Generator<U, void, undefined> {
    for (const item of items) {
        yield fn(item);
    }
}

/**
 * The CX version 1 exporter plugin.
 * @category Built-in formats
 */
export const cxExporter: GraphExporter<CxExportOptions> = Object.freeze({
    format: CX_FORMAT,
    capabilities: CX_CAPABILITIES,

    /**
     * Pre-flight: what export() would lose, without writing anything.
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns the notes, empty when the export is exact
     */
    check(snapshot: GraphSnapshot, options?: CxExportOptions): readonly LossNote[] {
        return Object.freeze([...plan(snapshot, resolveExportOptions(options)).notes]);
    },

    /**
     * Write the document as UTF-8 chunks.
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns the chunks
     */
    export(snapshot: GraphSnapshot, options?: CxExportOptions): AsyncIterable<Uint8Array> {
        return encodeChunks(write(snapshot, plan(snapshot, resolveExportOptions(options))));
    },

    /**
     * Write the document as one string.
     * @param snapshot - the snapshot
     * @param options - the common options
     * @returns the document
     */
    exportToString(snapshot: GraphSnapshot, options?: CxExportOptions): Promise<string> {
        return joinText(write(snapshot, plan(snapshot, resolveExportOptions(options))));
    },
});
