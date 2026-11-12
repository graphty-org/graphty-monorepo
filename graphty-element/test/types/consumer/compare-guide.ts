/**
 * @file The result-columns guide's comparison examples (docs/guide/result-columns.md, "Comparing two
 * results"), compiled against the published declarations with no cast. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`. `test/session/results/compare.test.ts`
 * runs the comparison itself.
 */

import "@graphty/graphty-element";

/** The guide's ranking comparison. */
export async function compareRankings(): Promise<void> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    const pagerank = await element.run("pagerank");
    const degree = await element.run("degree");

    const ranks = element.session.results.compare(pagerank, degree);
    if (ranks.kind === "ranking") {
        console.log(ranks.correlation);
        for (const { id, rankA, rankB, move } of ranks.changes.slice(0, 5)) {
            console.log(id, rankA, "->", rankB, move);
        }
    }
}

/** The guide's grouping comparison. */
export async function compareGroupings(element: HTMLElementTagNameMap["graphty-element"]): Promise<void> {
    const louvain = await element.run("louvain");
    const leiden = await element.run("leiden");

    const groups = element.session.results.compare(louvain, { run: leiden, field: "group" });
    if (groups.kind === "partition") {
        console.log(groups.agreement, groups.overlaps.length, groups.groups.a);
        for (const { id, a, b, mostOfGroup } of groups.moves) {
            console.log(id, a, b, mostOfGroup);
        }
    }
}
