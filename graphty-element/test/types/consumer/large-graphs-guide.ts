/**
 * @file The large graphs guide's examples (docs/guide/large-graphs.md), compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks
 * it against `dist/`.
 */

/** The guide's examples, as a function over the page's element. */
export async function largeGraphs(): Promise<void> {
    const graph = document.querySelector("graphty-element");
    if (graph === null) {
        return;
    }

    graph.renderPath = "batched";
    await graph.session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await graph.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    const { batchedNodes, objectNodes, pulledEdges, objectEdges } = graph.rowCounts;
    console.log(batchedNodes, objectNodes, pulledEdges, objectEdges);

    graph.limits = { renderCeiling: 1_000_000, edgesDrawn: 2_000_000 };
    const ceiling: number = graph.session.capabilities.limits.renderCeiling;
    console.log(ceiling);

    await graph.session.data.importColumns({
        sources: new Uint32Array([0, 1, 2]),
        targets: new Uint32Array([1, 2, 0]),
        nodeCount: 3,
    });

    graph.antialias = false;
}
