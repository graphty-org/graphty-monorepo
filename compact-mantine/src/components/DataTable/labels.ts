import { useMemo } from "react";

import { type CompactMantineLabels, useLabels } from "../../i18n";

// The table's strings live in src/i18n/labels.ts with every other string this
// library produces, so one LabelsProvider translates the whole package. This
// file only narrows that set to the entries the table uses and merges the
// table's own `labels` prop over it.
//
// The prop is kept because a page often holds two tables of different things --
// "12 of 400 rows" is right for one and "12 of 400 nodes" for the other -- and
// that is a per-instance wording rather than a translation.

/**
 * The strings a data table produces.
 *
 * A subset of {@link CompactMantineLabels}: translate them for a whole
 * application through `LabelsProvider`, or pass a partial object as one table's
 * `labels` prop to reword that table alone. Entries that interpolate are
 * functions, so a translation can order the pieces the way its own language
 * needs, and numbers arrive already formatted for the active locale.
 */
export type DataTableLabels = Pick<
    CompactMantineLabels,
    | "clearSearch"
    | "dataTable"
    | "no"
    | "noMatchingRows"
    | "noRows"
    | "rowsSelected"
    | "rowsShown"
    | "search"
    | "searchPlaceholder"
    | "yes"
>;

/**
 * Resolves the strings one data table uses.
 *
 * Starts from the strings in force -- the English defaults, or whatever a
 * `LabelsProvider` above replaced them with -- and merges this table's own
 * overrides over them, so every entry is always present and a caller may
 * replace as few as one.
 * @param overrides - The strings to replace for this table alone; anything left out is inherited
 * @returns A complete set of the strings a data table uses
 */
export function useDataTableLabels(overrides?: Partial<DataTableLabels>): DataTableLabels {
    const labels = useLabels();

    return useMemo(() => ({ ...labels, ...overrides }), [labels, overrides]);
}
