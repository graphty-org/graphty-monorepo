/**
 * The reader's choices on the Data page, held as edits over graphty-element's own reading of the
 * draft (`LoadDraft.mapping` and each column's `suggested`), and turned into the `LoadChoices`
 * that `draft.report()` and `draft.load()` take. Nothing here reads a row: every fact comes from
 * the draft.
 */

import { formatDescriptor } from "@graphty/graphty-element/catalog";
import {
    type ColumnRole,
    type DraftTable,
    LOAD_ROLES,
    type LoadChoices,
    type LoadDraft,
    type TableMapping,
} from "@graphty/graphty-element/session";

import { FILE_STYLE_OPTIONS, fileStylesChoice } from "../settings/preferences";

/** A column's role on the page: one of the element's roles, or "attribute" (no role). */
export type PageRole = ColumnRole | "attribute";

/** What the reader changed on one table. */
interface TableEdits {
    /** What each row becomes, when the reader changed it. */
    readonly rowsAre?: "nodes" | "edges";
    /** The role the reader gave each column, by column name. */
    readonly roles: Readonly<Record<string, PageRole>>;
    /** What the weight means, once the reader chose; unset until then (tier2-design.md section 5). */
    readonly weightMeaning?: NonNullable<TableMapping["weightMeaning"]>;
    /** How a number time column is read, once the reader chose. */
    readonly timeUnit?: NonNullable<TableMapping["timeUnit"]>;
}

/** Every choice on the page. */
export interface PageChoices {
    readonly tables: Readonly<Record<string, TableEdits>>;
    /** An edge naming a node no node row holds: tier1-design.md section 2.10 makes Leave out the default. */
    readonly unmatched: "add" | "leave-out";
    /** Direction: as the file says, or the reader's. */
    readonly directed: boolean | "auto";
    /** Whether the load draws the file's own styles: the reader's import-styles preference. */
    readonly styles: "file" | "none";
}

export const INITIAL_CHOICES: PageChoices = { tables: {}, unmatched: "leave-out", directed: "auto", styles: "file" };

/**
 * The choices a new draft starts with: the defaults, with the reader's import-styles preference.
 * @returns the choices.
 */
export function initialChoices(): PageChoices {
    return { ...INITIAL_CHOICES, styles: fileStylesChoice() };
}

/**
 * Whether the draft's file can carry styles, so the page offers the import-styles choice: its
 * format's catalog entry says so, or the element found styles in this file.
 * @param draft - the draft.
 * @returns true when the choice applies.
 */
export function offersStyles(draft: LoadDraft): boolean {
    return draft.styles?.declared === true || formatDescriptor(draft.type)?.styles?.read === true;
}

/**
 * What each row of a table becomes: the reader's choice, else the element's reading.
 * @param draft - the draft.
 * @param table - the table.
 * @param choices - the page's choices.
 * @returns "nodes" or "edges".
 */
export function rowsAreOf(draft: LoadDraft, table: DraftTable, choices: PageChoices): "nodes" | "edges" {
    return choices.tables[table.id]?.rowsAre ?? draft.mapping.tables[table.id]?.rowsAre ?? "nodes";
}

/**
 * Whether the reader changed what a table's rows are, so the element's suggested roles (read
 * for the other kind) no longer apply and an unchosen role is the element's new reading.
 * @param draft - the draft.
 * @param table - the table.
 * @param choices - the page's choices.
 * @returns true when the kind was changed.
 */
export function kindChanged(draft: LoadDraft, table: DraftTable, choices: PageChoices): boolean {
    const chosen = choices.tables[table.id]?.rowsAre;
    return chosen !== undefined && chosen !== draft.mapping.tables[table.id]?.rowsAre;
}

/**
 * The role the element gives a column on its own, or undefined when the reader changed the
 * table's kind (the element then re-reads the roles it is not given).
 * @param draft - the draft.
 * @param table - the table.
 * @param column - the column name.
 * @param choices - the page's choices.
 * @returns the element's role, "attribute" for none, or undefined when it is not known.
 */
export function elementRole(
    draft: LoadDraft,
    table: DraftTable,
    column: string,
    choices: PageChoices,
): PageRole | undefined {
    if (kindChanged(draft, table, choices)) {
        return undefined;
    }
    return table.columns.find((each) => each.name === column)?.suggested ?? "attribute";
}

/**
 * A column's role now: the reader's, else the element's.
 * @param draft - the draft.
 * @param table - the table.
 * @param column - the column name.
 * @param choices - the page's choices.
 * @returns the role, or undefined when it is the element's unknown re-reading.
 */
export function roleOf(
    draft: LoadDraft,
    table: DraftTable,
    column: string,
    choices: PageChoices,
): PageRole | undefined {
    return choices.tables[table.id]?.roles[column] ?? elementRole(draft, table, column, choices);
}

/**
 * Gives a column a role. A role is held by one column, so the column that held it before goes
 * back to Attribute. `undefined` returns the column to the element's reading.
 * @param draft - the draft.
 * @param table - the table.
 * @param column - the column name.
 * @param role - the role, or undefined to reset.
 * @param choices - the page's choices.
 * @returns the new choices.
 */
export function setRole(
    draft: LoadDraft,
    table: DraftTable,
    column: string,
    role: PageRole | undefined,
    choices: PageChoices,
): PageChoices {
    const edits = choices.tables[table.id] ?? { roles: {} };
    const roles: Record<string, PageRole> = Object.fromEntries(
        Object.entries(edits.roles).filter(([name]) => name !== column),
    );
    if (role !== undefined) {
        if (role !== "attribute") {
            for (const other of table.columns) {
                if (other.name !== column && roleOf(draft, table, other.name, choices) === role) {
                    roles[other.name] = "attribute";
                }
            }
        }
        roles[column] = role;
    }
    return { ...choices, tables: { ...choices.tables, [table.id]: { ...edits, roles } } };
}

/**
 * The column holding a table's Weight role now, if any.
 * @param draft - the draft.
 * @param table - the table.
 * @param choices - the page's choices.
 * @returns the column's name, or undefined.
 */
export function weightHolder(draft: LoadDraft, table: DraftTable, choices: PageChoices): string | undefined {
    return table.columns.find((column) => roleOf(draft, table, column.name, choices) === "weight")?.name;
}

/**
 * Says what a table's weight means.
 * @param table - the table.
 * @param meaning - the meaning, or undefined to leave it unset.
 * @param choices - the page's choices.
 * @returns the new choices.
 */
export function setWeightMeaning(
    table: DraftTable,
    meaning: NonNullable<TableMapping["weightMeaning"]> | undefined,
    choices: PageChoices,
): PageChoices {
    const { weightMeaning: _was, ...rest } = choices.tables[table.id] ?? { roles: {} };
    const edits: TableEdits = { ...rest, ...(meaning === undefined ? {} : { weightMeaning: meaning }) };
    return { ...choices, tables: { ...choices.tables, [table.id]: edits } };
}

/**
 * Says how a table's number time column is read.
 * @param table - the table.
 * @param unit - the unit.
 * @param choices - the page's choices.
 * @returns the new choices.
 */
export function setTimeUnit(
    table: DraftTable,
    unit: NonNullable<TableMapping["timeUnit"]>,
    choices: PageChoices,
): PageChoices {
    const edits: TableEdits = { ...(choices.tables[table.id] ?? { roles: {} }), timeUnit: unit };
    return { ...choices, tables: { ...choices.tables, [table.id]: edits } };
}

/**
 * Changes what a table's rows become, dropping its role edits (they were for the other kind).
 * @param draft - the draft.
 * @param table - the table.
 * @param rowsAre - the new kind.
 * @param choices - the page's choices.
 * @returns the new choices.
 */
export function setRowsAre(
    draft: LoadDraft,
    table: DraftTable,
    rowsAre: "nodes" | "edges",
    choices: PageChoices,
): PageChoices {
    const same = rowsAre === draft.mapping.tables[table.id]?.rowsAre;
    const edits: TableEdits = same ? { roles: {} } : { rowsAre, roles: {} };
    return { ...choices, tables: { ...choices.tables, [table.id]: edits } };
}

/**
 * One table's mapping from the reader's edits: each role the reader placed, and `null` for a role
 * the element had placed on a column the reader took it from.
 * @param draft - the draft.
 * @param table - the table.
 * @param choices - the page's choices.
 * @returns the mapping, or undefined when the reader changed nothing on the table.
 */
function tableMapping(draft: LoadDraft, table: DraftTable, choices: PageChoices): TableMapping | undefined {
    const edits = choices.tables[table.id];
    if (edits === undefined || table.fixed) {
        return undefined;
    }
    const kind = rowsAreOf(draft, table, choices);
    const mapping: Record<string, string | null> = {};
    for (const role of LOAD_ROLES[kind].takes) {
        const holder = table.columns.find((column) => roleOf(draft, table, column.name, choices) === role);
        if (holder !== undefined) {
            mapping[role] = holder.name;
        } else if (table.columns.some((column) => elementRole(draft, table, column.name, choices) === role)) {
            mapping[role] = null;
        }
    }
    const meaning =
        edits.weightMeaning !== undefined && kind === "edges" && weightHolder(draft, table, choices) !== undefined;
    const unit =
        edits.timeUnit !== undefined && table.columns.some((c) => roleOf(draft, table, c.name, choices) === "time");
    const changed = edits.rowsAre !== undefined || Object.keys(edits.roles).length > 0 || meaning || unit;
    return changed
        ? {
              ...(edits.rowsAre === undefined ? {} : { rowsAre: edits.rowsAre }),
              ...mapping,
              ...(meaning ? { weightMeaning: edits.weightMeaning } : {}),
              ...(unit ? { timeUnit: edits.timeUnit } : {}),
          }
        : undefined;
}

/**
 * The `LoadChoices` for the page's choices.
 * @param draft - the draft.
 * @param choices - the page's choices.
 * @param mode - "replace" for a new graph, "merge" to add to the open project.
 * @returns the choices `report` and `load` take.
 */
export function loadChoices(draft: LoadDraft, choices: PageChoices, mode: "replace" | "merge"): LoadChoices {
    const tables: Record<string, TableMapping> = {};
    for (const table of draft.tables) {
        const mapping = tableMapping(draft, table, choices);
        if (mapping !== undefined) {
            tables[table.id] = mapping;
        }
    }
    return {
        mode,
        unmatched: choices.unmatched,
        directed: choices.directed,
        styles: choices.styles,
        styleOptions: FILE_STYLE_OPTIONS,
        ...(Object.keys(tables).length > 0 ? { mapping: { tables } } : {}),
    };
}
