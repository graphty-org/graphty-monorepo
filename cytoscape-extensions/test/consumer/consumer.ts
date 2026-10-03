/**
 * What a TypeScript application writes against the published package: compiled by test/consumer-types.test.ts
 * with strict settings and skipLibCheck off, against the built dist/ and the installed Cytoscape typings.
 * Every line here must compile without a cast; a method or option the augmentation lost fails the build.
 */

import graphtyCytoscape, { type Backend, type GraphtyLayoutOptions } from "@graphty/cytoscape-extensions";
import cytoscape from "cytoscape";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({
    headless: true,
    elements: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { source: "a", target: "b", w: 2 } }],
});

const layout: GraphtyLayoutOptions = { name: "graphty-forceatlas2", maxIter: 50, weight: "w", gpu: "off" };
cy.layout(layout).run();
// written inline, a "graphty-*" layout's own options compile too; a misspelt layout option is still an error
cy.elements()
    .layout({ name: "graphty-circular", boundingBox: { x1: 0, y1: 0, w: 100, h: 100 }, animate: "end" })
    .run();
cy.layout({ name: "graphty-grid", boundingBox: { x1: 0, y1: 0, w: 100, h: 100 } }).run();
cy.layout({ name: "grid", rows: 2 }).run();
// @ts-expect-error -- Cytoscape's own layouts keep their own option types
cy.layout({ name: "grid", boundingBox: 3 });

const rank: number | undefined = cy.elements().graphtyPageRank().rank("#a");
const path = cy.elements().graphtyDijkstra({ root: "#a", weight: "w" }).pathTo("#b");
const communities = cy.graphtyLouvain();

/**
 * The asynchronous methods report which backend ran.
 * @returns the backend of a PageRank run
 */
export async function run(): Promise<Backend> {
    const r = await cy.elements().graphtyPageRankAsync();
    const added = await cy.graphtyGenerate("grid", { rows: 2, cols: 2 });
    const text: string = await cy.graphtyExport("graphml");
    await cy.graphtyImport(text, "graphml");
    void added.elements.nodes();
    return r.backend;
}

export { communities, path, rank };
