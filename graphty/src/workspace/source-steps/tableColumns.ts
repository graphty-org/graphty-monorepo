/**
 * @file The columns of the join workspace's list of the rows behind a step's count.
 */

import type { DataTableColumn } from "@graphty/compact-mantine";
import type { SourceDraftRow, SourceValue } from "@graphty/graphty-element/session";

import { nameOf, type SourceNames } from "./cardWords";
import { cellWords, DRILL_WORDS, EFFECT_WORDS } from "./words";

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

/** A value the session keeps beside a record's own columns. */
const FACTS = "_source.";

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
 * @param names - the sources' names.
 * @param rows - the rows.
 * @returns the columns.
 */
export function rowColumns(names: SourceNames, rows: readonly SourceDraftRow[]): DataTableColumn<SourceDraftRow>[] {
    const columns = new Set<string>();
    for (const row of rows) {
        for (const name of [...Object.keys(row.held ?? {}), ...Object.keys(row.incoming ?? {})]) {
            columns.add(name);
        }
    }
    // what the draft's other steps brought, or an element read from no row of its own
    const brought = new Set(
        rows.flatMap((row) =>
            Object.keys(row.shown ?? {}).filter((name) => !columns.has(name) && !name.startsWith(FACTS)),
        ),
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
        { id: "from", header: DRILL_WORDS.from, sortable: false, value: (row) => nameOf(names, row.source) },
        { id: "effect", header: DRILL_WORDS.effect, sortable: false, value: (row) => EFFECT_WORDS[row.effect] },
        ...[...columns].flatMap((name) => [
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
