/**
 * @file A run's group is spelled one way everywhere the element reports it (#906): the run
 * summary, the `sizes` table, the legend swatch and a selection made from the swatch.
 *
 * Runs the real Louvain on a real element with the run's own suggested colours, the path a
 * consumer takes, rather than a stubbed executor.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import type { LegendSwatch } from "../../src/session/styles/legend";

/** Two rings of six nodes, joined by nothing: Louvain finds exactly two groups. */
function twoRings(): { nodes: { id: string }[]; edges: { src: string; dst: string }[] } {
    const nodes: { id: string }[] = [];
    const edges: { src: string; dst: string }[] = [];

    for (const ring of ["a", "b"]) {
        for (let index = 0; index < 6; index++) {
            nodes.push({ id: `${ring}${String(index)}` });
            edges.push({ src: `${ring}${String(index)}`, dst: `${ring}${String((index + 1) % 6)}` });
        }
    }

    return { nodes, edges };
}

describe("a run's group value (#906)", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        const { nodes, edges } = twoRings();
        await graph.addNodes(nodes);
        await graph.addEdges(edges);
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("is the same value in the summary, the sizes table, the legend and the selection", async () => {
        const run = session.runs.start("louvain");
        const result = await run;
        await operationQueueOf(graph).waitForCompletion();

        const groups = run.record.summary?.groups ?? [];
        assert.lengthOf(groups, 2, "two rings, two groups");

        const sizes = result.graph.sizes as readonly { readonly group: unknown; readonly size: number }[];
        assert.deepStrictEqual(
            sizes.map((row) => row.group),
            groups.map((group) => group.group),
            "the sizes table spells each group as the summary does",
        );

        const block = session.styles.legend().find((entry) => entry.runId === run.id);
        assert.isDefined(block, "the run painted its groups, so the legend has a block for it");

        for (const group of groups) {
            const swatch: LegendSwatch | undefined = block?.swatches.find((entry) => entry.value === group.group);
            assert.isDefined(swatch, `a swatch's value is === the summary's group ${JSON.stringify(group.group)}`);
            assert.strictEqual(typeof swatch?.value, typeof group.group, "the same type, not a string of it");
            assert.strictEqual(swatch?.rank, group.rank);

            await session.selection.apply({
                where: `results.${run.id}.group == \`${JSON.stringify(swatch?.value)}\``,
            });
            assert.strictEqual(session.selection.nodes.length, group.size, "the swatch's value selects its group");
        }
    });
});
