/**
 * @file The data-sources guide's "Exporting part of the graph" example (docs/guide/data-sources.md),
 * compiled against the published declarations with no cast. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`. `test/data/export-scope.test.ts` runs
 * each scope.
 */

import "@graphty/graphty-element";

/** The guide's five scopes. */
export async function exportParts(element: HTMLElementTagNameMap["graphty-element"]): Promise<void> {
    const shown = await element.exportGraph("graphml", { scope: "shown" });
    const picked = await element.exportGraph("csv", { scope: "selection" });
    const members = await element.exportGraph("gexf", { scope: { set: "core-team" } });
    const pair = await element.exportGraph("json", { scope: { nodes: ["alice", "bob"] } });
    const busy = await element.exportGraph("csv", {
        scope: { kind: "range", attribute: "data.degree", min: 10 },
    });
    console.log(await Promise.all([shown, picked, members, pair, busy].map((result) => result.text())));
}
