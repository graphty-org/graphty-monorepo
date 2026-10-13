/**
 * The per-file results table of the style corpus (`test/corpus/styles/RESULTS.md`): counts and three measures of
 * meaning per input, so that a change which makes the rules less readable shows up as a difference to review.
 */

import type { StyleResult } from "./harness.js";

/**
 * A share as a whole percentage, or "-" when there is nothing to share.
 * @param part - the part
 * @param whole - the whole
 * @returns the text
 */
function share(part: number, whole: number): string {
    return whole === 0 ? "-" : `${String(Math.round((100 * part) / whole))}%`;
}

/**
 * The results table as Markdown, one row per input in name order.
 * @param results - every input's result
 * @returns the document
 */
export function resultsTable(results: readonly StyleResult[]): string {
    const rows = [...results].sort((a, b) => Number(a.name > b.name) - Number(a.name < b.name));
    const styled = rows.filter((r) => r.styled);
    const lines = [
        "# Style corpus results",
        "",
        "Written by `test/styles/harness.test.ts`, which fails when this file differs from what the inputs give now;",
        "rerun it with `-u` to accept a change after reviewing it. One row per input: whether it imported, its",
        "elements, the rules its styles plan to per target, and three measures of how readable the rules are. Varying",
        "values are those that differ from their property's most common value; opaque ones come from a rule that only",
        "copies values (an unexplained passthrough or the exceptions), exception ones from the exceptions rule alone.",
        "Tool values are elements drawn with the writing program's default.",
        "",
        `${String(rows.length)} inputs, ${String(styled.length)} with styles; at most ${String(Math.max(0, ...styled.map((r) => r.nodeRules)))} node and ${String(Math.max(0, ...styled.map((r) => r.edgeRules)))} edge rules.`,
        "",
        "| Input | Import | Nodes | Edges | Node rules | Edge rules | Varying | Opaque | Exceptions | Approximated | Tool values | Declared selecting nothing | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ];
    for (const r of rows) {
        const rules = r.styled ? [String(r.nodeRules), String(r.edgeRules)] : ["-", "-"];
        lines.push(
            `| ${r.name} | ${r.import} | ${String(r.nodes)} | ${String(r.edges)} | ${rules.join(" | ")} | ${String(r.varying)} | ${share(r.opaque, r.varying)} | ${share(r.exceptions, r.varying)} | ${String(r.approximated)} | ${String(r.toolValues)} | ${String(r.declaredEmpty)} | ${r.notes.join(", ")} |`,
        );
    }
    lines.push("");
    return lines.join("\n");
}
