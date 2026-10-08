/**
 * The notice a finished run gives when its style was held back (tier1-design.md section 3, item 9):
 * "Hidden by your layer <name>", with Show anyway.
 *
 * graphty-element decides what a run paints and reports it through `runs.painting(id)`; the app
 * only words that report and, on Show anyway, hands the same suggestion back to the element.
 */

import type { GraphSession, RunId } from "@graphty/graphty-element/session";

import type { Notice } from "../state/store";

/**
 * The notice for one run, from what the element decided to paint for it.
 * @param session - the element's session.
 * @param runId - the run.
 * @returns the notice, or null when every suggestion painted (a started run shows no notice).
 */
export function runNotice(session: GraphSession, runId: RunId): Notice | null {
    const painting = session.runs.painting(runId);
    if (painting?.state !== "decided") {
        return null;
    }
    for (const outcome of painting.suggestions) {
        if (outcome.outcome !== "suppressed") {
            continue;
        }
        const layer = session.styles.get(outcome.byLayerId);
        const { suggestion } = outcome;
        return {
            message: `Hidden by your layer ${layer?.name ?? "above it"}`,
            action: {
                label: "Show anyway",
                run: () => {
                    // The element's own verb for each suggestion kind puts it on the stack.
                    if (suggestion.as === "encoding") {
                        void session.styles.encode(suggestion.spec);
                    } else {
                        void session.styles.highlight(suggestion.spec);
                    }
                },
            },
        };
    }
    return null;
}
