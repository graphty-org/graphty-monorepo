/**
 * The attribute columns of one XGMML (or `.cys`) import: every att and every untyped XML
 * attribute is parsed by its own declared kind when it is read, then each column's dtype is
 * decided once over all its values (design section 5.1 widening: int and long to f64, numbers
 * and booleans to string, lists and scalars to json), and only then declared on the sink, so a
 * column is never re-typed after rows were written and a caller's sink needs no widening call.
 */

import { type ColumnDecl, type Dtype, type GraphSink, type ScalarDtype } from "@graphty/graph-format";

import { declareResolved, DictHeuristic, uniqueColumnName } from "../../common/attributes.js";
import { type ImportReportBuilder, type IssueLocation } from "../../common/report.js";
import { inferTextDtype, parseTextCell } from "../../common/text.js";
import { CYTOSCAPE_ORIGIN_NAMESPACE, FORMAT, XGMML_ISSUE } from "./constants.js";
import { type AttRec, isListLike } from "./document.js";
import { attType, elementKind, parseScalar, type ScalarKind, widenScalar } from "./values.js";

/** A table of the snapshot. */
type Domain = "node" | "edge" | "graph";

/** One item of a list cell. */
interface Item {
    readonly value: boolean | number | string;
    readonly text: string;
}

/** One parsed value. */
interface Cell {
    /** The kind the value was parsed as. */
    readonly kind: ScalarKind | "list" | "json";
    /** A scalar's value, a json value, or null for a list. */
    readonly value: unknown;
    /** A scalar's text as written (what a column widened to string keeps). */
    readonly text: string;
    /** A list's items. */
    readonly items: readonly Item[];
    /** A list's item kind, or null for an empty list whose type nothing states. */
    readonly itemKind: ScalarKind | null;
    /** The kind came from a declared type (not the text grammar of an XML attribute). */
    readonly typed: boolean;
}

/** One column being collected. */
interface Plan {
    readonly name: string;
    readonly namespace: string | null;
    readonly cells: Map<number, Cell>;
    readonly declared: Set<string>;
    readonly lines: Map<number, number>;
    declaredType: string | null;
    hidden: boolean;
    equation: boolean;
    suid: boolean;
    overflow: boolean;
    precision: boolean;
}

/** Options of a column set. */
interface ColumnSetOptions {
    /** Decode Cytoscape's `\n` / `\t` escapes in string values. */
    readonly unescape: boolean;
    /** The importer's `long` option. */
    readonly long: "f64" | "string";
    /** The column names the importer's own columns hold; an att of one of these names is renamed. */
    readonly reserved: ReadonlySet<string>;
}

/** The dtype of each scalar kind. */
const DTYPES: Readonly<Record<ScalarKind, ScalarDtype>> = {
    bool: "bool",
    int: "i32",
    long: "f64",
    real: "f64",
    string: "string",
};

/**
 * Collects the attribute values of one table, then declares and writes the columns.
 */
export class ColumnSet {
    private readonly domain: Domain;

    private readonly report: ImportReportBuilder;

    private readonly options: ColumnSetOptions;

    private readonly plans = new Map<string, Plan>();

    /**
     * Create a column set.
     * @param domain - the table
     * @param report - the report
     * @param options - the options
     */
    constructor(domain: Domain, report: ImportReportBuilder, options: ColumnSetOptions) {
        this.domain = domain;
        this.report = report;
        this.options = options;
    }

    /**
     * Whether a column of that name (any namespace) was collected.
     * @param name - the name
     * @returns true when some row has a value or the column was declared
     */
    has(name: string): boolean {
        return this.plans.has(key(null, name));
    }

    /**
     * Add one att of a row: parse it by its declared kind (E_BAD_VALUE for a value that does not
     * parse; the cell stays unset). A second value of the same column on one row wins with
     * W_DUPLICATE_ATTRIBUTE.
     * @param row - the row
     * @param att - the att
     * @param where - the element, for issues
     */
    addAtt(row: number, att: AttRec, where: IssueLocation): void {
        const { name } = att;
        if (name === null || name.length === 0) {
            this.badAtt("an <att> without a name was skipped", att, "name");
            return;
        }
        const plan = this.plan(name, att.namespace ?? null);
        const type = attType(att);
        plan.hidden ||= att.hidden;
        plan.suid ||= name.endsWith(".SUID");
        if (type.declared !== null) {
            plan.declaredType ??= type.declared;
        }
        const at = { line: att.line, element: where.element ?? name };
        if (type.unknown !== null) {
            this.report.warnOnce(
                "unsupported",
                XGMML_ISSUE.UNKNOWN_ATTR_TYPE,
                `att type "${type.unknown}" of "${name}" is not an XGMML or Cytoscape type; its values are kept as text`,
                at,
                `${XGMML_ISSUE.UNKNOWN_ATTR_TYPE}:${this.domain}:${name}`,
            );
        }
        let cell: Cell | null;
        if (att.equation) {
            plan.equation = true;
            this.report.warnOnce(
                "unsupported",
                XGMML_ISSUE.EQUATION_AS_TEXT,
                `"${name}" holds Cytoscape formulas; each is kept as its text, never evaluated`,
                at,
                `${XGMML_ISSUE.EQUATION_AS_TEXT}:${this.domain}:${name}`,
            );
            cell = att.value === null ? null : scalarCell("string", att.value, att.value, true);
            if (cell !== null) {
                plan.declared.add("string");
            }
        } else if (type.kind === "list") {
            cell = this.listCell(att, name, plan, at);
            plan.declared.add("list");
        } else if (type.kind === "map") {
            cell = jsonCell(recordOf(att));
            this.recordList(`"${name}" is a 2.x map; it is kept as a json record`, at);
            plan.declared.add("json");
        } else {
            cell = this.scalarAtt(att, type.kind, plan, at);
        }
        if (cell !== null) {
            this.set(plan, row, cell, at);
        }
    }

    /**
     * Add one value read by the 5.1 text grammar (an XML attribute of an element).
     * @param row - the row
     * @param name - the column name
     * @param text - the text
     * @param where - the element, for issues
     */
    addText(row: number, name: string, text: string, where: IssueLocation): void {
        const plan = this.plan(name, null);
        const value = parseTextCell(text);
        const kind = textKind(inferTextDtype(text));
        this.set(plan, row, { kind, value, text, items: [], itemKind: null, typed: false }, where);
    }

    /**
     * Add one value of a known kind (a typed table cell of a session).
     * @param row - the row
     * @param name - the column name
     * @param value - the value
     * @param where - the element, for issues
     */
    addJson(row: number, name: string, value: unknown, where: IssueLocation): void {
        this.set(this.plan(name, null), row, jsonCell(value), where);
    }

    /**
     * Declare every collected column on the sink and write its values.
     * @param sink - the sink
     * @param rowIndex - the sink index of a row (node or edge index), or -1 when the row was not added
     */
    write(sink: GraphSink, rowIndex: (row: number) => number): void {
        const taken = new Set<string>(this.options.reserved);
        const ordered = [...this.plans.values()].sort(
            (a, b) => Number(a.namespace !== null) - Number(b.namespace !== null),
        );
        for (const plan of ordered) {
            let { name } = plan;
            if (taken.has(name)) {
                name = uniqueColumnName(plan.name, plan.namespace, (n) => taken.has(n));
                this.report.warning(
                    "coercion",
                    XGMML_ISSUE.COLUMN_RENAMED,
                    `${this.domain} attribute "${plan.name}" renamed to "${name}": the name was taken`,
                    { element: plan.name },
                );
            }
            taken.add(name);
            this.writePlan(sink, plan, name, rowIndex);
        }
    }

    // ------------------------------------------------------------------ cells

    /**
     * The plan of a column, created on first use.
     * @param name - the attribute name
     * @param namespace - the table namespace, or null
     * @returns the plan
     */
    private plan(name: string, namespace: string | null): Plan {
        const k = key(namespace, name);
        let plan = this.plans.get(k);
        if (plan === undefined) {
            plan = {
                name,
                namespace,
                cells: new Map(),
                declared: new Set(),
                lines: new Map(),
                declaredType: null,
                hidden: false,
                equation: false,
                suid: false,
                overflow: false,
                precision: false,
            };
            this.plans.set(k, plan);
        }
        return plan;
    }

    /**
     * Store a cell, reporting a second value on the same row.
     * @param plan - the column
     * @param row - the row
     * @param cell - the cell
     * @param where - the location
     */
    private set(plan: Plan, row: number, cell: Cell, where: IssueLocation): void {
        if (plan.cells.has(row)) {
            this.report.warning(
                "validation-error",
                XGMML_ISSUE.DUPLICATE_ATTRIBUTE,
                `"${plan.name}" is given twice on one ${this.domain}; the later value is kept`,
                { line: where.line ?? null, element: where.element ?? plan.name },
            );
        }
        plan.cells.set(row, cell);
        if (where.line !== undefined && where.line !== null) {
            plan.lines.set(row, where.line);
        }
    }

    /**
     * Parse a scalar att.
     * @param att - the att
     * @param kind - the declared kind
     * @param plan - the column
     * @param at - the location
     * @returns the cell, or null when unset or invalid
     */
    private scalarAtt(att: AttRec, kind: ScalarKind, plan: Plan, at: IssueLocation): Cell | null {
        if (att.children.length > 0) {
            this.badAtt(`the ${kind} att "${att.name ?? ""}" holds child atts; they are ignored`, att, "children");
        }
        if (att.xml !== null) {
            this.recordList(`"${att.name ?? ""}" holds foreign XML; it is kept as text in a json column`, at);
            plan.declared.add("json");
            return jsonCell(att.xml);
        }
        if (att.value === null) {
            plan.declared.add(kind);
            return null;
        }
        const parsed = parseScalar(att.value, kind, this.options.unescape);
        if (parsed === null || (parsed.overflow !== undefined && kind === "int" && exactInteger(att.cyType))) {
            this.badValue(att.value, kind, at);
            return null;
        }
        plan.declared.add(kind);
        if (parsed.overflow === "i32") {
            plan.overflow = true;
        } else if (parsed.overflow === "precision") {
            plan.precision = true;
            plan.overflow ||= kind === "int";
        }
        return scalarCell(kind, parsed.value, att.value, true);
    }

    /**
     * Parse a list att: items by `cy:elementType`, else by the widened kinds of the children.
     * A list of lists, a list with records, or a list of named fields is a json value.
     * @param att - the att
     * @param name - the column name
     * @param plan - the column (an item beyond i32 widens it, as a scalar does)
     * @param at - the location
     * @returns the cell
     */
    private listCell(att: AttRec, name: string, plan: Plan, at: IssueLocation): Cell | null {
        if (att.value !== null) {
            this.badAtt(`the list att "${name}" has a value; it is ignored`, att, "list-value");
        }
        const { children } = att;
        const names = new Set(children.map((c) => c.name).filter((n): n is string => n !== null && n !== name));
        if (names.size > 1 || children.some((c) => c.children.length > 0 || c.xml !== null)) {
            this.recordList(`"${name}" is a record or a list of lists; it is kept as json`, at);
            return jsonCell(names.size > 1 ? recordOf(att) : children.map(jsonOfAtt));
        }
        let itemKind = elementKind(att.elementType);
        if (itemKind === null && att.elementType !== null && att.elementType.trim().length > 0) {
            this.report.warnOnce(
                "unsupported",
                XGMML_ISSUE.UNKNOWN_ATTR_TYPE,
                `list element type "${att.elementType}" of "${name}" is not a Cytoscape type; the items are read by their own types`,
                at,
                `${XGMML_ISSUE.UNKNOWN_ATTR_TYPE}:${this.domain}:${name}:items`,
            );
        }
        if (itemKind === null) {
            const kinds = new Set<ScalarKind>();
            for (const child of children) {
                const type = attType(child);
                const kind: ScalarKind = type.kind === "list" || type.kind === "map" ? "string" : type.kind;
                kinds.add(kind);
                itemKind = itemKind === null ? kind : widenScalar(itemKind, kind);
            }
            if (kinds.size > 1) {
                this.report.warnOnce(
                    "coercion",
                    XGMML_ISSUE.WIDENED,
                    `the items of list "${name}" declare different types; they are read as ${itemKind ?? "string"}`,
                    at,
                    `${XGMML_ISSUE.WIDENED}:${this.domain}:${name}`,
                );
            }
        }
        const items: Item[] = [];
        for (const child of children) {
            if (child.value === null) {
                continue;
            }
            const parsed = parseScalar(child.value, itemKind ?? "string", this.options.unescape);
            const exact = exactInteger(att.elementType) || exactInteger(child.cyType);
            if (parsed === null || (parsed.overflow !== undefined && itemKind === "int" && exact)) {
                this.badValue(child.value, itemKind ?? "string", { line: child.line, element: at.element });
                continue;
            }
            if (parsed.overflow === "i32") {
                plan.overflow = true;
            } else if (parsed.overflow === "precision") {
                plan.precision = true;
                plan.overflow ||= itemKind === "int";
            }
            items.push({ value: parsed.value, text: child.value });
        }
        return { kind: "list", value: null, text: "", items, itemKind, typed: true };
    }

    // ------------------------------------------------------------------ decision and writing

    /**
     * Decide one column's dtype, declare it and write its values.
     * @param sink - the sink
     * @param plan - the column
     * @param name - the name to declare it under
     * @param rowIndex - the row to sink index map
     */
    private writePlan(sink: GraphSink, plan: Plan, name: string, rowIndex: (row: number) => number): void {
        const cells = [...plan.cells.values()];
        const decision = this.decide(plan, cells);
        const decl: ColumnDecl = {
            name,
            dtype: decision.dtype,
            nullable: true,
            origin: {
                format: FORMAT,
                id: null,
                title: name === plan.name ? null : plan.name,
                type: originType(plan, decision),
                namespace: plan.namespace ?? (plan.hidden ? CYTOSCAPE_ORIGIN_NAMESPACE : null),
            },
        };
        if (decision.itemDtype !== null) {
            decl.itemDtype = decision.itemDtype;
        }
        const extra: Record<string, unknown> = {};
        if (plan.hidden) {
            extra.hidden = true;
        }
        if (plan.suid) {
            extra.suidReference = true;
        }
        if (plan.equation) {
            extra.equation = true;
        }
        if (Object.keys(extra).length > 0) {
            decl.extra = extra;
        }
        const where = { element: name };
        if (this.domain === "graph") {
            const cell = plan.cells.get(0);
            try {
                sink.setGraphValue(name, cell === undefined ? undefined : convert(cell, decision), decl);
            } catch (err) {
                this.report.recordError(err, where);
            }
            return;
        }
        let handle;
        try {
            ({ handle } = declareResolved(sink, this.domain, decl, this.report, where));
        } catch (err) {
            this.report.recordError(err, where);
            return;
        }
        for (const [row, cell] of plan.cells) {
            const index = rowIndex(row);
            if (index < 0) {
                continue;
            }
            const value = convert(cell, decision);
            try {
                if (this.domain === "node") {
                    sink.setNodeValue(handle, index, value);
                } else {
                    sink.setEdgeValue(handle, index, value);
                }
            } catch (err) {
                this.report.recordError(err, { line: plan.lines.get(row) ?? null, element: name });
            }
        }
    }

    /**
     * The dtype of a column from its cells, with the widening and precision warnings.
     * @param plan - the column
     * @param cells - its cells
     * @returns the decision
     */
    private decide(plan: Plan, cells: readonly Cell[]): Decision {
        const where = { element: plan.name };
        const typedKinds = new Set(cells.filter((c) => c.typed).map((c) => c.kind));
        let widened = typedKinds.size > 1 || plan.declared.size > 1;
        let decision: Decision;
        if (
            cells.some((c) => c.kind === "json") ||
            (cells.some((c) => c.kind === "list") && cells.some((c) => c.kind !== "list"))
        ) {
            decision = { dtype: "json", itemDtype: null, scalar: null, item: null, long: false };
        } else if (cells.length > 0 && cells.every((c) => c.kind === "list")) {
            let item: ScalarKind | null = null;
            for (const cell of cells) {
                if (cell.itemKind !== null) {
                    widened ||= item !== null && item !== cell.itemKind;
                    item = item === null ? cell.itemKind : widenScalar(item, cell.itemKind);
                }
            }
            if (item === null) {
                this.report.warnOnce(
                    "coercion",
                    XGMML_ISSUE.EMPTY_LIST_TYPE,
                    `list "${plan.name}" has no element type and no items; it is a list of strings`,
                    where,
                    `${XGMML_ISSUE.EMPTY_LIST_TYPE}:${this.domain}:${plan.name}`,
                );
                item = "string";
            }
            if (plan.overflow && item === "int") {
                item = "real";
                widened = true;
            }
            decision = { dtype: "list", itemDtype: DTYPES[item], scalar: null, item, long: item === "long" };
        } else {
            decision = this.decideScalar(plan, cells);
            widened ||= plan.overflow && decision.scalar === "real" && plan.declared.has("int");
        }
        if (widened) {
            this.report.warnOnce(
                "coercion",
                XGMML_ISSUE.WIDENED,
                `${this.domain} column "${plan.name}" was widened to ${decision.dtype}: its values or declared types disagree`,
                where,
                `${XGMML_ISSUE.WIDENED}:${this.domain}:${plan.name}`,
            );
        }
        if (plan.precision) {
            this.report.warnOnce(
                "precision",
                XGMML_ISSUE.PRECISION,
                `values of "${plan.name}" beyond what a double holds exactly are stored as the nearest double (or infinity)`,
                where,
                `${XGMML_ISSUE.PRECISION}:${this.domain}:${plan.name}`,
            );
        }
        return decision;
    }

    /**
     * The scalar decision of a column.
     * @param plan - the column
     * @param cells - its cells
     * @returns the decision
     */
    private decideScalar(plan: Plan, cells: readonly Cell[]): Decision {
        let scalar: ScalarKind | null = null;
        for (const cell of cells) {
            const kind = cell.kind as ScalarKind;
            scalar = scalar === null ? kind : widenScalar(scalar, kind);
        }
        if (scalar === null) {
            const declared = [...plan.declared].find((k): k is ScalarKind => k in DTYPES);
            scalar = declared ?? "string";
        }
        if (scalar === "int" && plan.overflow) {
            scalar = "real";
        }
        const long = scalar === "long";
        if (long && this.options.long === "string") {
            return { dtype: "string", itemDtype: null, scalar: "string", item: null, long: true };
        }
        let dtype: Dtype = DTYPES[scalar];
        if (scalar === "string") {
            const heuristic = new DictHeuristic();
            for (const cell of cells) {
                if (heuristic.observe(cell.text)) {
                    break;
                }
            }
            dtype = heuristic.decide();
        }
        return { dtype, itemDtype: null, scalar, item: null, long };
    }

    /**
     * Report a malformed att, once per kind of defect.
     * @param message - the message
     * @param att - the att
     * @param kind - the defect, for the once key
     */
    private badAtt(message: string, att: AttRec, kind: string): void {
        this.report.warnOnce(
            "parse-error",
            XGMML_ISSUE.BAD_ATT,
            message,
            { line: att.line, element: att.name },
            `${XGMML_ISSUE.BAD_ATT}:${kind}`,
        );
    }

    /**
     * Report a value that does not parse as its declared kind (an error; the cell stays unset).
     * @param text - the value
     * @param kind - the kind
     * @param at - the location
     */
    private badValue(text: string, kind: ScalarKind, at: IssueLocation): void {
        this.report.error(
            "validation-error",
            XGMML_ISSUE.BAD_VALUE,
            `value ${JSON.stringify(text)} is not a valid ${KIND_NAMES[kind]}; the cell is left unset`,
            at,
        );
    }

    /**
     * Report a record list, list of lists, map or foreign XML kept as json, once.
     * @param message - the message
     * @param at - the location
     */
    private recordList(message: string, at: IssueLocation): void {
        this.report.warnOnce("coercion", XGMML_ISSUE.RECORD_LIST, message, at);
    }
}

/**
 * Whether a Cytoscape type names Java's Integer exactly (`cy:type="Integer"`, a CyCSV
 * `java.lang.Integer` column): a value beyond i32 is then not an Integer at all (Cytoscape cannot
 * write one), where the XGMML `integer` of pre-3.3 Cytoscape also carried Longs and widens.
 * @param cyType - the Cytoscape type, or null
 * @returns true for Integer
 */
function exactInteger(cyType: string | null): boolean {
    return cyType?.trim().toLowerCase() === "integer";
}

/** A column's decided storage. */
interface Decision {
    readonly dtype: Dtype;
    readonly itemDtype: ScalarDtype | null;
    readonly scalar: ScalarKind | null;
    readonly item: ScalarKind | null;
    /** The column is a declared long (origin.type "long"). */
    readonly long: boolean;
}

/**
 * The `origin.type` of a column: "equation" for formulas, "long" for a declared long, else the
 * declared type text.
 * @param plan - the column
 * @param decision - its decision
 * @returns the type text, or null
 */
function originType(plan: Plan, decision: Decision): string | null {
    if (plan.equation) {
        return "equation";
    }
    return decision.long ? "long" : plan.declaredType;
}

/** How a kind is named in messages. */
const KIND_NAMES: Readonly<Record<ScalarKind, string>> = {
    bool: "boolean (1, 0, true, false, yes, no)",
    int: "integer",
    long: "long integer",
    real: "real number",
    string: "string",
};

/**
 * The plans key of a column.
 * @param namespace - the namespace, or null
 * @param name - the name
 * @returns the key
 */
function key(namespace: string | null, name: string): string {
    return namespace === null ? name : `${namespace}\u0000${name}`;
}

/**
 * The scalar kind of a text grammar dtype.
 * @param dtype - the dtype
 * @returns the kind
 */
function textKind(dtype: "bool" | "i32" | "f64" | "string"): ScalarKind {
    switch (dtype) {
        case "bool":
            return "bool";
        case "i32":
            return "int";
        case "f64":
            return "real";
        default:
            return "string";
    }
}

/**
 * A scalar cell.
 * @param kind - its kind
 * @param value - its value
 * @param text - its text as written
 * @param typed - whether a declared type gave the kind
 * @returns the cell
 */
function scalarCell(kind: ScalarKind, value: unknown, text: string, typed: boolean): Cell {
    return { kind, value, text, items: [], itemKind: null, typed };
}

/**
 * A json cell.
 * @param value - the value
 * @returns the cell
 */
function jsonCell(value: unknown): Cell {
    return { kind: "json", value, text: JSON.stringify(value), items: [], itemKind: null, typed: true };
}

/**
 * An att with named children as a record of name to value.
 * @param att - the att
 * @returns the record
 */
function recordOf(att: AttRec): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const child of att.children) {
        out[child.name ?? ""] = jsonOfAtt(child);
    }
    return out;
}

/**
 * An att as a json value: its value text, its children as an array or a record, or its XML.
 * @param att - the att
 * @returns the value
 */
function jsonOfAtt(att: AttRec): unknown {
    if (att.xml !== null) {
        return att.xml;
    }
    if (att.children.length === 0) {
        return att.value;
    }
    return isListLike(att) ? att.children.map(jsonOfAtt) : recordOf(att);
}

/**
 * A cell as the value its column's dtype stores.
 * @param cell - the cell
 * @param decision - the column's decision
 * @returns the value
 */
function convert(cell: Cell, decision: Decision): unknown {
    if (decision.dtype === "json") {
        if (cell.kind === "json") {
            return cell.value;
        }
        return cell.kind === "list" ? cell.items.map((i) => i.value) : cell.value;
    }
    if (decision.dtype === "list") {
        return cell.items.map((item) => convertScalar(item.value, item.text, decision.item ?? "string"));
    }
    return convertScalar(
        cell.value,
        cell.text,
        decision.long && decision.dtype === "string" ? "string" : (decision.scalar ?? "string"),
    );
}

/**
 * A scalar as the kind its column stores.
 * @param value - the parsed value
 * @param text - its text as written
 * @param kind - the column's kind
 * @returns the value
 */
function convertScalar(value: unknown, text: string, kind: ScalarKind): unknown {
    switch (kind) {
        case "bool":
            return value;
        case "int":
        case "long":
        case "real":
            return Number(value);
        default:
            return typeof value === "string" ? value : text;
    }
}
