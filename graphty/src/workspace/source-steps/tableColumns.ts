/**
 * @file The columns of the source-steps tables (the Fields and Preview tabs, and the join
 * workspace's table): a match's value overlap, and the rows behind a step's count.
 */

import type { DataTableColumn } from "@graphty/compact-mantine";
import type {
    GraphSession,
    SourceDraftRow,
    SourceKey,
    SourceMatchValue,
    SourceValue,
} from "@graphty/graphty-element/session";

import { sourceName } from "../data-place/words";
import { cellWords, DRILL_WORDS, EFFECT_WORDS, JOIN_WORDS } from "./words";

/** The value list's columns: the value, then how many in each side hold it. */
export const MATCH_VALUE_COLUMNS: readonly DataTableColumn<SourceMatchValue>[] = [
    {
        id: "value",
        header: JOIN_WORDS.value,
        width: 240,
        sortable: false,
        rowHeader: true,
        value: (row) => cellWords(row.value),
    },
    { id: "in1", header: JOIN_WORDS.in1, sortable: false, align: "end", value: (row) => row.count1 },
    { id: "in2", header: JOIN_WORDS.in2, sortable: false, align: "end", value: (row) => row.count2 },
];

/** A row's tint by what the commit does to its element; the Effect column says it in words. */
export const EFFECT_COLORS: Readonly<Partial<Record<SourceDraftRow["effect"], string>>> = {
    added: "var(--mantine-color-green-light)",
    changed: "var(--mantine-color-yellow-light)",
    removed: "var(--mantine-color-red-light)",
    "left-out": "var(--mantine-color-gray-light)",
};

/**
 * A built value as the tab shows it: a list an aggregate gathered reads as its values.
 * @param value - the value, or undefined where the side holds none.
 * @returns its words.
 */
export function valueWords(value: SourceValue | undefined): string {
    if (value === undefined) {
        return "";
    }
    // A list is the one value that is an object.
    return typeof value === "object" && value !== null
        ? value.map((each) => cellWords(each)).join(", ")
        : cellWords(value);
}

/**
 * A source's name, by its key.
 * @param session - the element's session.
 * @param key - the source.
 * @returns its name.
 */
export function nameOf(session: GraphSession, key: SourceKey): string {
    const source = session.data.sources({ staged: true }).find((each) => each.key === key);
    return source === undefined ? key : sourceName(source);
}

/** A value the session keeps beside a record's own columns. */
const FACTS = /^_source\./;

/**
 * Whether a row's key is a number it was given for want of a column of its own.
 * @param row - the row.
 * @returns true when it is.
 */
function numbered(row: SourceDraftRow): boolean {
    const own = Object.values(row.incoming ?? {}).some((value) => String(value) === String(row.key));
    return row.row !== null && row.table === "nodes" && row.incoming !== null && !own;
}

/**
 * The rows table's columns: the key, the source, the effect, then each value column's held and
 * incoming values side by side.
 * @param session - the element's session.
 * @param rows - the rows.
 * @returns the columns.
 */
export function rowColumns(session: GraphSession, rows: readonly SourceDraftRow[]): DataTableColumn<SourceDraftRow>[] {
    const names = new Set<string>();
    for (const row of rows) {
        for (const name of [...Object.keys(row.held ?? {}), ...Object.keys(row.incoming ?? {})]) {
            names.add(name);
        }
    }
    // what the draft's other steps brought, or an element read from no row of its own
    const brought = new Set(
        rows.flatMap((row) => Object.keys(row.shown ?? {}).filter((name) => !names.has(name) && !FACTS.test(name))),
    );
    // rows numbered for want of a key have none to show
    // and an edge's or a pair's is its two ends
    const keyed = rows.some(
        (row) => row.key !== null && !numbered(row) && !(row.ends !== null && row.incoming === null),
    );
    const held = rows.some((row) => Object.keys(row.held ?? {}).length > 0);
    const incoming = rows.some((row) => Object.keys(row.incoming ?? {}).length > 0);
    // The side first, so a narrow header still tells the two apart; with one side, only the column.
    const header = (side: string, name: string): string => (held && incoming ? `${side} ${name}` : name);
    const width = (text: string): number => Math.min(240, Math.max(96, text.length * 7 + 32));
    const side = (
        which: "held" | "incoming",
        name: string,
        word: string,
        value: (row: SourceDraftRow) => SourceValue | undefined,
    ): DataTableColumn<SourceDraftRow> => ({
        id: `${which}:${name}`,
        header: header(word, name),
        width: width(header(word, name)),
        sortable: false,
        value: (row) => valueWords(value(row)),
    });
    const ends = rows.some((row) => row.ends !== null);
    return [
        ...(keyed
            ? [
                  {
                      id: "key",
                      header: DRILL_WORDS.key,
                      width: 160,
                      sortable: false,
                      rowHeader: true,
                      value: (row: SourceDraftRow) => cellWords(row.key),
                  },
              ]
            : []),
        ...(ends
            ? (["source", "target"] as const).map((end) => ({
                  id: `end:${end}`,
                  header: DRILL_WORDS[end],
                  width: 120,
                  sortable: false,
                  value: (row: SourceDraftRow) => row.ends?.[end].key ?? "",
              }))
            : []),
        { id: "from", header: DRILL_WORDS.from, sortable: false, value: (row) => nameOf(session, row.source) },
        { id: "effect", header: DRILL_WORDS.effect, sortable: false, value: (row) => EFFECT_WORDS[row.effect] },
        ...[...names].flatMap((name) => [
            ...(rows.some((row) => row.held?.[name] !== undefined)
                ? [side("held", name, DRILL_WORDS.held, (row) => row.held?.[name])]
                : []),
            ...(rows.some((row) => row.incoming?.[name] !== undefined)
                ? [side("incoming", name, DRILL_WORDS.incoming, (row) => row.incoming?.[name] ?? undefined)]
                : []),
        ]),
        ...[...brought].map((name): DataTableColumn<SourceDraftRow> => ({
            id: `shown:${name}`,
            header: name,
            width: width(name),
            sortable: false,
            value: (row) => valueWords(row.shown?.[name]),
        })),
    ];
}
