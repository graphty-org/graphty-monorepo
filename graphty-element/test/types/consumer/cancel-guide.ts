/**
 * @file The algorithms guide's cancel example (docs/guide/algorithms.md, "Stopping a run"),
 * compiled against the published declarations with no cast. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`.
 * `test/browser/algorithm-off-thread.test.ts` cancels runs on the element.
 */

import "@graphty/graphty-element";

/**
 * The guide's Cancel button.
 * @param element - The element.
 * @param cancel - The button.
 */
export async function runWithCancel(
    element: HTMLElementTagNameMap["graphty-element"],
    cancel: HTMLButtonElement,
): Promise<void> {
    const run = element.run("betweenness");
    cancel.hidden = false;
    cancel.onclick = () => {
        run.cancel();
    };

    try {
        const result = await run;
        console.log(result.summary().max);
    } catch (error) {
        // A canceled run keeps nothing: no result and no coloring.
        if (!(error instanceof DOMException && error.name === "AbortError")) {
            throw error;
        }
        console.log("canceled");
    } finally {
        cancel.hidden = true;
    }

    const estimate = element.session.estimate({ op: "algo.run", algorithm: "betweenness" });
    console.log(estimate.cancelable, estimate.blocksFrame);
}
