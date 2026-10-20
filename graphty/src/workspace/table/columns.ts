/**
 * What the table dock can show, read from graphty-element: the attributes the records carry, the
 * runs whose results are one value per record (`data.resultColumns`), and the issues
 * (`data.issues()`). The element sorts, reads every value, counts every issue and applies every
 * fix; this file only names the columns, words their headers, issues and fixes, and translates the
 * table's sort into the element's.
 */

import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type {
    ColumnRef,
    ColumnRole,
    DataIssue,
    FixCode,
    GraphSession,
    LoadedSource,
    RecordSort,
    ResultSort,
    SummaryGroup,
    ValueType,
} from "@graphty/graphty-element/session";

import { type FieldKey, loadValue, tableRoles } from "../data-place/words";
import { formatNumber } from "../inspector/words";
import { runName } from "../runWords";

/** Which records a table holds. */
export type RecordKind = "node" | "edge";

/** One column the table can show. */
export interface TableColumnChoice {
    /** Stable id: `id`, `source`, `target`, `a:<attribute>` or `r:<run id>`. */
    readonly id: string;
    /** The header. */
    readonly header: string;
    /** Where the Columns chooser lists it. */
    readonly group: "key" | "attribute" | "result";
    /** Whether its values are numbers, for the sort caption's words. */
    readonly numeric: boolean;
    /** Whether it names groups, which graphty-element sorts by group size. */
    readonly grouping?: boolean;
    /** The attribute's name, for an attribute column. */
    readonly attribute?: string;
    /** The run's id, for a result column. */
    readonly run?: string;
    /** The element's column, for an attribute column: what Type, Role, Rename and Hide change. */
    readonly ref?: ColumnRef;
    /** The element's descriptor of an attribute column, for its type and summary. */
    readonly descriptor?: AttributeDescriptor;
    /** The role the column plays, if any. */
    readonly role?: ColumnRole;
    /** Hidden with `data.setHidden`: a data fact, saved with the project. */
    readonly hidden?: boolean;
}

/** The key columns: frozen on the left. */
const KEYS: Readonly<Record<RecordKind, readonly TableColumnChoice[]>> = {
    node: [{ id: "id", header: "Id", group: "key", numeric: false }],
    edge: [
        { id: "source", header: "From", group: "key", numeric: false },
        { id: "target", header: "To", group: "key", numeric: false },
    ],
};

/** The roles a load reads each kind's rows with, in the header menu's order. */
const LOAD_TABLE: Readonly<Record<RecordKind, "nodes" | "edges">> = { node: "nodes", edge: "edges" };

/**
 * The role a column plays: the element's attribute roles, else the load's own mapping (an id
 * column the load made the node ids from).
 * @param attribute - the column.
 * @param sources - the loads.
 * @param roles - the roles the column's kind can take.
 * @returns the role, or undefined.
 */
function roleOf(
    attribute: AttributeDescriptor,
    sources: readonly LoadedSource[],
    roles: readonly ColumnRole[],
): ColumnRole | undefined {
    const known = attribute.roles?.find((role) => roles.includes(role));
    if (known !== undefined) {
        return known;
    }
    const side = LOAD_TABLE[attribute.kind];
    const mine = sources.filter((source) => attribute.sources?.includes(source.key) ?? true);
    return roles.find((role) =>
        mine.some((source) => loadValue(tableRoles(source, side), role as FieldKey) === attribute.name),
    );
}

/**
 * Every column the table can show for one kind: the keys, the attributes the records arrived with
 * (hidden ones too, marked), then each run's result as the element lists it.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @param roles - the roles the kind's columns can take (`headerRoles`).
 * @returns the columns in the chooser's order.
 */
export function columnChoices(session: GraphSession, kind: RecordKind, roles = headerRoles(kind)): TableColumnChoice[] {
    const sources = session.data.sources();
    const attributes = session.data
        .attributes()
        .filter(
            (attribute) =>
                attribute.kind === kind &&
                attribute.origin !== "result" &&
                !KEYS[kind].some((key) => key.id === attribute.name),
        )
        .map((attribute): TableColumnChoice => {
            const role = roleOf(attribute, sources, roles);
            return {
                id: `a:${attribute.name}`,
                header: attribute.name,
                group: "attribute",
                numeric: attribute.type === "number" || attribute.type === "integer",
                attribute: attribute.name,
                ref: { kind, name: attribute.name },
                descriptor: attribute,
                ...(role === undefined ? {} : { role }),
                ...(attribute.hidden === true ? { hidden: true } : {}),
            };
        });
    const results = session.data.resultColumns(kind).flatMap((column): TableColumnChoice[] => {
        const run = session.runs.get(column.run);
        if (run === undefined) {
            return [];
        }
        return [
            {
                id: `r:${column.run}`,
                header: runName(session, run),
                group: "result",
                numeric: column.type === "number" || column.type === "integer",
                grouping: column.grouping,
                run: column.run,
            },
        ];
    });
    return [...KEYS[kind], ...attributes, ...results];
}

/**
 * The roles a header's Role menu offers for a kind: what a load reads the kind's rows with, less
 * the edge id, which a reader never picks here.
 * @param kind - nodes or edges.
 * @returns the roles.
 */
export function headerRoles(kind: RecordKind): ColumnRole[] {
    return kind === "node" ? ["key", "label", "time", "kind"] : ["source", "target", "weight", "time", "kind"];
}

/** What a role is called in a header: the special field's name. */
export const ROLE_WORDS: Readonly<Record<string, string>> = {
    key: "id",
    label: "label",
    source: "source",
    target: "target",
    weight: "weight",
    time: "time",
    kind: "kind",
    edgeId: "edge id",
};

/** The types a header's Type menu offers, in order, with their words. */
export const VALUE_TYPES: readonly { readonly type: ValueType; readonly label: string }[] = [
    { type: "text", label: "text" },
    { type: "number", label: "number" },
    { type: "boolean", label: "yes/no" },
    { type: "date", label: "date" },
    { type: "category", label: "category" },
];

/**
 * The type a column reads as now, as the Type menu names it.
 * @param descriptor - the column.
 * @returns the type, or undefined for a mixed column.
 */
export function valueTypeOf(descriptor: AttributeDescriptor | undefined): ValueType | undefined {
    switch (descriptor?.type) {
        case "string":
            return "text";
        case "number":
        case "integer":
            return "number";
        case "boolean":
            return "boolean";
        case "time":
            return "date";
        case "category":
            return "category";
        default:
            return undefined;
    }
}

/**
 * The element's sort for a column of the table.
 * @param column - the sorted column.
 * @param descending - largest first.
 * @returns the sort graphty-element takes.
 */
export function elementSort(column: TableColumnChoice, descending: boolean): RecordSort | ResultSort {
    if (column.run !== undefined) {
        return { run: column.run, descending };
    }
    return { key: column.attribute ?? column.id, descending };
}

/**
 * The line under the tab strip that says how the rows are ordered (round 8: the caption follows
 * the sort).
 * @param column - the sorted column, or undefined when the rows are in the graph's order.
 * @param descending - largest first.
 * @returns the caption.
 */
export function sortCaption(column: TableColumnChoice | undefined, descending: boolean): string {
    if (column === undefined) {
        return "In the order loaded";
    }
    if (column.grouping === true) {
        return `Sorted by ${column.header}, ${descending ? "largest group first" : "smallest group first"}`;
    }
    if (column.numeric) {
        return `Sorted by ${column.header}, ${descending ? "highest first" : "lowest first"}`;
    }
    return `Sorted by ${column.header}, ${descending ? "Z to A" : "A to Z"}`;
}

/**
 * A count with its noun: "1 node", "77 nodes".
 * @param count - how many.
 * @param noun - the singular noun.
 * @returns the words.
 */
export function countOf(count: number, noun: string): string {
    return `${count.toLocaleString("en-US")} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * What to call a group: "Group 1" for the largest group of a partition, else the group's own
 * value (a category). The element ranks a partition's groups largest first; the words are the
 * app's.
 * @param group - the group.
 * @returns the name.
 */
export function groupName(group: SummaryGroup): string {
    return group.rank === undefined ? String(group.group) : `Group ${String(group.rank)}`;
}

/** Each issue code's words after its count: "3 decimal commas". */
const ISSUE_WORDS: Readonly<Record<string, readonly [one: string, many: string]>> = {
    "not-a-number": ["not a number", "not numbers"],
    "decimal-comma": ["decimal comma", "decimal commas"],
    "unknown-end": ["unknown end", "unknown ends"],
    "repeated-edge": ["repeated", "repeated"],
    "repeated-id": ["repeated id", "repeated ids"],
    "padded-space": ["padded spaces", "padded spaces"],
    "case-variant": ["case variant", "case variants"],
    "blank-id": ["blank id", "blank ids"],
    "refused-row": ["row refused", "rows refused"],
    "mixed-type": ["mixed types", "mixed types"],
};

/**
 * An issue as a short label with its count: "1 not a number", "row 412 refused".
 * @param issue - the element's issue.
 * @returns the label.
 */
export function issueLabel(issue: DataIssue): string {
    const { lines } = issue.params;
    if (issue.code === "refused-row" && Array.isArray(lines) && lines.length === 1) {
        return `row ${String(lines[0])} refused`;
    }
    const [one, many] = ISSUE_WORDS[issue.code] ?? [issue.code, issue.code];
    return `${formatNumber(issue.count)} ${issue.count === 1 ? one : many}`;
}

/** Each fix's button label. */
const FIX_WORDS: Readonly<Record<string, string>> = {
    "make-blank": "Make blank",
    "read-decimal-comma": "Read as decimals",
    "add-nodes": "Add nodes",
    "leave-out": "Leave out",
    merge: "Merge",
    keep: "Keep",
    "keep-first": "Keep first",
    "merge-rows": "Merge rows",
    trim: "Trim",
    "merge-case": "Merge case",
};

/**
 * A fix's button label.
 * @param fix - the element's fix code.
 * @returns the label.
 */
export function fixLabel(fix: FixCode): string {
    return FIX_WORDS[fix] ?? fix;
}

/** Where an issue shows: the table and the column whose header carries its warning. */
interface IssuePlace {
    readonly kind: RecordKind;
    /** The column id, as `TableColumnChoice.id`. */
    readonly column: string;
    /** What the Issues list names it by: the column's name, or "nodes" or "edges". */
    readonly name: string;
}

/**
 * Where an issue's warning shows. A column issue is in its column's header. An issue about rows
 * rather than a column is in the key header of the rows it is about: an edge's unknown end or
 * repeat in From, a repeated node id in Id; a refused or blank row in the key of the rows its
 * load made (edges when it made any).
 * @param issue - the element's issue.
 * @param session - the element's session, for the load's counts.
 * @returns the place.
 */
export function issuePlace(issue: DataIssue, session: GraphSession): IssuePlace {
    if (issue.column !== undefined) {
        return { kind: issue.column.kind, column: `a:${issue.column.name}`, name: issue.column.name };
    }
    const edgeRows = (): boolean => {
        const { rowsAre } = issue.params;
        if (rowsAre === "nodes" || rowsAre === "edges") {
            return rowsAre === "edges";
        }
        const sources = session.data
            .sources()
            .filter((each) => issue.source === undefined || each.key === issue.source);
        return sources.some((each) => each.counts.edges > 0);
    };
    const onEdges =
        issue.code === "unknown-end" || issue.code === "repeated-edge" || (issue.code !== "repeated-id" && edgeRows());
    return onEdges ? { kind: "edge", column: "source", name: "edges" } : { kind: "node", column: "id", name: "nodes" };
}

/**
 * The column's summary for its header's hover: how full it is, its distinct values, its range.
 * @param descriptor - the column.
 * @returns such as "98% filled  300 unique  1 to 36".
 */
export function columnSummary(descriptor: AttributeDescriptor): string {
    const parts = [`${String(Math.round(descriptor.completeness * 100))}% filled`];
    if (descriptor.uniqueCount !== undefined) {
        parts.push(`${formatNumber(descriptor.uniqueCount)} unique`);
    }
    if (descriptor.min !== undefined && descriptor.max !== undefined) {
        parts.push(`${formatNumber(descriptor.min)} to ${formatNumber(descriptor.max)}`);
    }
    return parts.join("  ");
}

/** About how wide a character of a header's name is drawn, in px. */
const CHAR = 7;

/** A header icon's size, in px. */
const HEADER_ICON = 14;

/**
 * A column wide enough that its name shows beside its icons, warning and menu caret.
 * @param column - the column.
 * @param warned - whether it carries a warning.
 * @returns the width in px.
 */
export function headerWidth(column: TableColumnChoice, warned: boolean): number {
    const role = column.role === undefined ? 0 : (ROLE_WORDS[column.role] ?? column.role).length * 6 + 12;
    const origin = column.group === "result" || column.descriptor?.origin === "joined" ? HEADER_ICON + 2 : 0;
    const name = Math.min(column.header.length, 16) * CHAR;
    // Padding 16 + 16, the type icon and its gap, the menu caret's 32, the warning's 24.
    return 32 + HEADER_ICON + 4 + role + origin + name + 32 + (warned ? 24 : 0);
}

/**
 * What a header's leading icons say, for a screen reader: the type, the role and the origin, in
 * the order they are drawn.
 * @param column - the column
 * @returns the icons' words, such as "number, weight, joined"
 */
export function headerIconsLabel(column: TableColumnChoice): string {
    const fallback = column.numeric ? "number" : "category";
    const type = valueTypeOf(column.descriptor) ?? (column.descriptor === undefined ? fallback : "mixed");
    const origin = column.group === "result" ? "computed" : column.descriptor?.origin;
    return [
        column.group === "key" ? "key" : (VALUE_TYPES.find((entry) => entry.type === type)?.label ?? type),
        column.role === undefined ? undefined : (ROLE_WORDS[column.role] ?? column.role),
        origin === "joined" || origin === "computed" ? origin : undefined,
    ]
        .filter((word) => word !== undefined)
        .join(", ");
}
