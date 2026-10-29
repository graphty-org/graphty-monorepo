import type { JoinChoices, JoinReport } from "@graphty/graphty-element/session";

/** What a count chip narrows the tables to. */
export type JoinShow = "matched" | "not-in-graph" | "without-value" | null;

/**
 * The count chips drawn now, so a narrowing whose chip went (its count fell to zero, the shape
 * changed) stops narrowing.
 * @param report - the element's counts.
 * @param choices - the join as chosen.
 * @returns the chips' Shows.
 */
export function shownChips(report: JoinReport, choices: JoinChoices): JoinShow[] {
    const shape = choices.shape ?? "node-values";
    const values = shape === "node-values";
    return [
        ...(values && report.matched > 0 ? (["matched"] as const) : []),
        ...(report.notInGraph > 0 ? (["not-in-graph"] as const) : []),
        ...(values && report.withoutValue > 0 ? (["without-value"] as const) : []),
    ];
}
