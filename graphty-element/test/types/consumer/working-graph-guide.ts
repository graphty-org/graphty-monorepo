/**
 * @file The working-graph guide's examples (docs/guide/working-graph.md), compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks it
 * against `dist/`.
 */

import "@graphty/graphty-element";

/**
 * The guide's first example, as a function over the page's element.
 * @param graph - The element.
 */
export async function quickStart(graph: HTMLElementTagNameMap["graphty-element"]): Promise<void> {
    const { session } = graph;
    await session.data.addNodes([
        { id: "a", team: "red" },
        { id: "b", team: "red" },
        { id: "c", team: "blue" },
    ]);
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    await session.visibility.set({ kind: "categories", attribute: "data.team", values: ["red"] });

    await session.layout.set("circular");
    console.log(session.data.statistics().nodeCount);
    console.log(session.data.statistics({ scope: "graph" }).nodeCount);
    await session.runs.start("pagerank");
    await graph.applyCameraView("fitToGraph");
}

/**
 * The guide's other snippets, in the order the page shows them.
 * @param graph - The element.
 */
export async function otherSnippets(graph: HTMLElementTagNameMap["graphty-element"]): Promise<void> {
    const { session } = graph;
    session.data.nodePage({ scope: "graph" });
    session.find("bob", { scope: "graph" });
    await graph.applyCameraView("fitToGraph", { scope: "graph" });
    graph.layoutScope = "graph";

    await session.styles.add({
        name: "Top 3 shown",
        target: "node",
        selector: { match: "rule", where: { kind: "threshold", path: "data.score", top: 3, within: "visible" } },
        encode: { "node.color": { by: "data.score", palette: "viridis", domainFrom: "visible" } },
    });

    session.on("working-graph:changed", ({ nodeCount, settled }) => {
        if (settled) {
            console.log(`${String(nodeCount)} nodes shown`);
        }
    });

    session.config.setWorkingGraph("visible");
    const shown = session.data.working();
    console.log(shown.nodeCount, shown.has("a"), shown.originalNodeRow(0));
}
