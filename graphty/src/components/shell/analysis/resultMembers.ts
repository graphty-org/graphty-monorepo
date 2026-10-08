/**
 * What a result card's member verbs ask graphty-element to do.
 *
 * Every verb is one session call with the element's own target or filter: the top N, the
 * elements above a threshold or in a value range are the run's ranking, read by the element,
 * and nothing here ranks, counts or compares a value. The one thing the app does is write the
 * group export's two columns as CSV text, which is file presentation.
 */

import type { GraphSession, HistogramBin, RunId, SelectionDelta } from "@graphty/graphty-element/session";

/** The parts of the session the member verbs use. */
export type MemberSession = Pick<GraphSession, "selection" | "visibility" | "results" | "data">;

/**
 * Selects the top `n` of a run, ties taken whole or not at all (the element's `top` target).
 * @param session - the session.
 * @param run - the run.
 * @param n - how many at most.
 * @returns what changed.
 */
export function selectTop(session: MemberSession, run: RunId, n: number): Promise<SelectionDelta> {
    return session.selection.apply({ top: { run, n } });
}

/**
 * Selects every element of a run strictly above a value (the element's `above` target).
 * @param session - the session.
 * @param run - the run.
 * @param threshold - the value.
 * @returns what changed.
 */
export function selectAbove(session: MemberSession, run: RunId, threshold: number): Promise<SelectionDelta> {
    return session.selection.apply({ above: { run, threshold } });
}

/**
 * Shows only the elements of a run strictly above a value (the element's `threshold` filter).
 * @param session - the session.
 * @param run - the run.
 * @param threshold - the value.
 * @returns when the filter is applied.
 */
export async function filterAbove(session: MemberSession, run: RunId, threshold: number): Promise<void> {
    await session.visibility.set({ kind: "threshold", path: session.results.path(run), above: threshold });
}

/**
 * Selects the elements a run of histogram bars counted (the element's `range` target).
 * @param session - the session.
 * @param run - the run.
 * @param bins - the element's bars, as `RunResult.histogram` returned them.
 * @param first - the first bar, by position.
 * @param last - the last bar, by position.
 * @returns what changed.
 */
export function selectBins(
    session: MemberSession,
    run: RunId,
    bins: readonly HistogramBin[],
    first: number,
    last: number,
): Promise<SelectionDelta> {
    return session.selection.apply({ range: { run, min: bins[first].from, max: bins[last].to } });
}

/**
 * One CSV cell: quoted when it holds a separator, a quote or a line break, and with a leading
 * apostrophe when a spreadsheet would run it as a formula.
 * @param value - the cell.
 * @returns the cell as written.
 */
function csvCell(value: string | number): string {
    if (typeof value === "number") {
        return String(value);
    }

    const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

    return /[",\n\r]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

/**
 * A community run's groups as CSV: one row per grouped node, its id and its group, where the
 * group is the element's rank by size (1 for the largest), the number the legend and the
 * result card name it by.
 * @param session - the session.
 * @param run - the community run.
 * @returns the CSV text, header first.
 */
export function groupsCsv(session: MemberSession, run: RunId): string {
    const page = session.data.nodePage({ limit: Infinity, columns: [run] });
    const ranks = page.columns[0]?.ranks ?? [];
    const rows = ["id,group"];

    page.records.forEach((record, index) => {
        const rank = ranks[index];

        if (rank !== undefined) {
            rows.push(`${csvCell(record.id)},${String(rank)}`);
        }
    });

    return `${rows.join("\n")}\n`;
}

/**
 * Hands a text to the browser as a file to save.
 * @param text - the file's contents.
 * @param name - the file name.
 * @param type - the media type.
 */
export function downloadText(text: string, name: string, type: string): void {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}
