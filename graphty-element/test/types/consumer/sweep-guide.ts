/**
 * @file The algorithms guide's sweep example (docs/guide/algorithms.md, "Trying a range of
 * settings"), compiled against the published declarations with no cast. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`. `test/session/runs/runs-api.test.ts`
 * runs the sweep itself.
 */

import "@graphty/graphty-element";

/** The guide's resolution sweep. */
export async function sweepResolution(element: HTMLElementTagNameMap["graphty-element"]): Promise<void> {
    const sweep = await element.session.runs.sweep("louvain", "resolution", [0.5, 1, 2], { seed: 1 });

    for (const row of sweep.rows) {
        console.log(row.value, row.summary?.groupCount, row.graph?.modularity);
    }
}
