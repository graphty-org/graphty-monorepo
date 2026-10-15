import type { GraphSession, RuleTree, RunId } from "@graphty/graphty-element/session";

/**
 * What a threshold filter's chip calls the values it filters on: the title of the
 * result on screen when that result's run is the one the filter reads, else "Result".
 * @param activeResult - the result the inspector is drawing, or null.
 * @param activeResult.title - its plain name.
 * @param activeResult.runId - the run it reads, if any.
 * @param session - the element's graph session, or null.
 * @param path - the result path the filter reads.
 * @returns the chip's subject.
 */
export function thresholdFilterSubject(
    activeResult: { readonly title: string; readonly runId?: RunId } | null,
    session: GraphSession | null,
    path: Extract<RuleTree, { kind: "threshold" }>["path"],
): string {
    return activeResult?.runId !== undefined && session?.results.path(activeResult.runId) === path
        ? activeResult.title
        : "Result";
}
