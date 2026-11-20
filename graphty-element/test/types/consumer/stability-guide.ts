/**
 * @file The algorithms guide's stability example (docs/guide/algorithms.md, "How much the seed
 * matters"), compiled against the published declarations with no cast. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`. `test/session/runs/runs-api.test.ts`
 * runs a stability run itself.
 */

import "@graphty/graphty-element";

/** The guide's stability run. */
export async function seedStability(element: HTMLElementTagNameMap["graphty-element"]): Promise<void> {
    const stability = await element.session.runs.stability("louvain", [1, 2, 3, 4, 5]);

    console.log(stability.agreement);
    console.log(stability.adjustedMutualInformation);
    for (const pair of stability.pairs) {
        console.log(pair.a.runId, pair.b.runId, pair.kind === "partition" ? pair.agreement : pair.correlation);
    }
}
