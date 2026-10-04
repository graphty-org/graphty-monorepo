/**
 * What the table dock can show, read from graphty-element: the attributes the records carry and
 * the runs whose results are one value per record. The element sorts and reads every value; this
 * file only names the columns, words their headers and the sort caption, and translates the
 * table's sort into the element's.
 */

import type {
    AttributeDescriptor,
    GraphSession,
    PageColumn,
    RecordSort,
    ResultSort,
    Run,
    SummaryGroup,
} from "@graphty/graphty-element/session";

/** Which records a table holds. */
export type RecordKind = "node" | "edge";

/** One column the Columns chooser offers. */
export interface TableColumnChoice {
    /** Stable id: `id`, `source`, `target`, `a:<attribute>` or `r:<run id>`. */
    readonly id: string;
    /** The header. */
    readonly header: string;
    /** Where the chooser lists it. */
    readonly group: "key" | "attribute" | "result";
    /** Whether its values are numbers, for the sort caption's words. */
    readonly numeric: boolean;
    /** Whether it names groups, which graphty-element sorts by group size. */
    readonly grouping?: boolean;
    /** The attribute's name, for an attribute column. */
    readonly attribute?: string;
    /** The run's id, for a result column. */
    readonly run?: string;
}

/** The key columns: frozen on the left, always shown. */
const KEYS: Readonly<Record<RecordKind, readonly TableColumnChoice[]>> = {
    node: [{ id: "id", header: "Id", group: "key", numeric: false }],
    edge: [
        { id: "source", header: "From", group: "key", numeric: false },
        { id: "target", header: "To", group: "key", numeric: false },
    ],
};

/**
 * A run's result as a column of this table, as graphty-element reads it: undefined when the run
 * has no result yet, or publishes no value per record of this kind (a bare fact, an edge metric on
 * the Nodes tab), which the element refuses with `E_BAD_COMMAND`.
 * @param session - the element's session.
 * @param run - the run.
 * @param kind - nodes or edges.
 * @returns the column's description, or undefined.
 */
function resultColumn(session: GraphSession, run: Run, kind: RecordKind): PageColumn | undefined {
    if (run.result === undefined) {
        return undefined;
    }
    const options = { limit: 0, columns: [run.id] };
    try {
        const page = kind === "node" ? session.data.nodePage(options) : session.data.edgePage(options);
        return page.columns[0];
    } catch {
        return undefined;
    }
}

/**
 * Every column the table can show for one kind: the keys, the attributes the records arrived with,
 * then each run's result.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @returns the columns in the chooser's order.
 */
export function columnChoices(session: GraphSession, kind: RecordKind): TableColumnChoice[] {
    const attributes = session.data
        .attributes()
        .filter(
            (attribute: AttributeDescriptor) =>
                attribute.kind === kind &&
                attribute.origin !== "result" &&
                !KEYS[kind].some((key) => key.id === attribute.name),
        )
        .map(
            (attribute): TableColumnChoice => ({
                id: `a:${attribute.name}`,
                header: attribute.name,
                group: "attribute",
                numeric: attribute.type === "number" || attribute.type === "integer",
                attribute: attribute.name,
            }),
        );
    const results = session.runs.list().flatMap((run): TableColumnChoice[] => {
        const column = resultColumn(session, run, kind);
        if (column === undefined) {
            return [];
        }
        return [
            {
                id: `r:${run.id}`,
                header: run.label,
                group: "result",
                numeric: column.type === "number" || column.type === "integer",
                grouping: run.result?.summary().groups !== undefined,
                run: run.id,
            },
        ];
    });
    return [...KEYS[kind], ...attributes, ...results];
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
 * What to call a group: the element's name for it ("Group 1"), else its id.
 * @param group - the group.
 * @returns the name.
 */
export function groupName(group: SummaryGroup): string {
    return group.name ?? String(group.group);
}
