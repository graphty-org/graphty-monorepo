/**
 * @file The several-graphs guide's quick start (docs/guide/graphs.md), compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks it
 * against `dist/`.
 */

/**
 * The guide's quick start, as a function over the page's element.
 * @returns Whether the copy is the graph shown.
 */
export async function severalGraphs(): Promise<boolean> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return false;
    }

    const { session } = element;
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);

    await session.selection.apply({ ids: ["a", "b"] });
    const picked = await session.graphs.create({ from: "selection", name: "Picked" });

    await session.graphs.switch("graph-1");
    await session.graphs.switch(picked.id);

    return session.graphs.list().some((graph) => graph.current && graph.id === picked.id);
}
