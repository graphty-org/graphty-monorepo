import { describe, expect, it } from "vitest";

import { sniffJsonDialect } from "../../../src/formats/json/dialect.js";

const CASES: Record<string, unknown> = {
    notJson: 42,
    nullRoot: null,
    stringRoot: "x",
    emptyArray: [],
    cytoscapeArray: [{ data: { id: "a" } }],
    cytoscapeArrayAfterNonObject: [1, { data: { id: "a" } }],
    arrayWithoutData: [{ id: "a" }],
    arrayOfNonObjects: [1, 2],
    arrayDataNotObject: [{ data: 1 }],
    cytoscapeElements: { elements: [] },
    cytoscapeElementsWithNodes: { elements: {}, nodes: [], links: [] },
    jgfNodes: { graph: { nodes: {} } },
    jgfEdges: { graph: { edges: [] } },
    graphNotJgf: { graph: { name: "x" }, nodes: [], links: [] },
    jgfGraphs: { graphs: [{ nodes: [{ id: "a" }] }] },
    jgfGraphsEmpty: { graphs: [] },
    oboEdgeSub: { graphs: [{ edges: [{ sub: "a", obj: "b" }] }] },
    oboEdgeSubj: { graphs: [{ edges: [{ subj: "a", obj: "b" }] }] },
    oboEdgePred: { graphs: [{ edges: [{ pred: "is_a" }] }] },
    oboEdgeObjOnly: { graphs: [{ edges: [{ obj: "b" }] }] },
    oboNodeLbl: { graphs: [{ nodes: [{ id: "a", lbl: "A" }] }] },
    oboNodeMeta: { graphs: [{ nodes: [{ id: "a", meta: {} }] }] },
    oboNodeType: { graphs: [{ nodes: [{ id: "a", type: "CLASS" }] }] },
    oboNodeOtherType: { graphs: [{ nodes: [{ id: "a", type: "THING" }] }] },
    oboSecondGraph: { graphs: [{}, { nodes: [{ lbl: "x" }] }] },
    graphsNonObject: { graphs: [1, "x"] },
    adjacency: { nodes: [{ id: 1 }], adjacency: [[]] },
    adjacencyWithLinks: { nodes: [], adjacency: [], links: [] },
    tree: { id: 1, children: [] },
    treeWithNodes: { nodes: [], children: [] },
    noGraph: { foo: 1 },
    emptyObject: {},
    nodesOnly: { nodes: [{ id: "a" }] },
    edgesOnly: { edges: [{ source: "a", target: "b" }] },
    linksOnly: { links: [{ source: 0, target: 1 }] },
    d3: { nodes: [{ name: "a" }], links: [{ source: 0, target: 1 }] },
    nodeLinkDirected: { directed: true, nodes: [], links: [] },
    nodeLinkMultigraph: { multigraph: false, nodes: [], links: [] },
    nodeLinkGraphKey: { graph: {}, nodes: [], links: [] },
    nodeLinkEdges: { nodes: [{ id: "a" }], edges: [{ source: "a", target: "b" }] },
    graphologyOptionsType: { options: { type: "mixed" }, nodes: [], edges: [] },
    graphologyOptionsMulti: { options: { multi: true }, nodes: [], links: [], directed: true },
    optionsOther: { options: { other: 1 }, nodes: [], edges: [] },
    graphologyKeyNode: { nodes: [{ key: "a" }], edges: [] },
    keyNodeWithId: { nodes: [{ key: "a", id: "a" }], edges: [] },
    keyNodeNetworkx: { directed: true, nodes: [{ key: "a" }], edges: [] },
    graphologyUndirected: { nodes: [], edges: [{ source: "a", target: "b", undirected: true }] },
    graphologyAttributes: { nodes: [], edges: [{ source: "a", target: "b", attributes: {} }] },
    attributesNotObject: { nodes: [], edges: [{ source: "a", target: "b", attributes: 1 }] },
    undirectedWithFrom: { nodes: [], edges: [{ from: "a", to: "b", undirected: true }] },
    undirectedNetworkx: { multigraph: true, nodes: [], edges: [{ undirected: true }] },
    vis: { nodes: [{ id: 1 }], edges: [{ from: 1, to: 2 }] },
    visWithSource: { nodes: [], edges: [{ from: 1, to: 2, source: 1 }] },
    visFromOnly: { nodes: [], edges: [{ from: 1 }] },
    visNetworkx: { graph: {}, nodes: [], edges: [{ from: 1, to: 2 }] },
    visViaLinks: { nodes: [], links: [{ from: 1, to: 2 }] },
    visEdgelessOptions: { nodes: [{ id: 1 }], edges: [], options: { physics: false } },
    visNoEdgesKeyOptions: { nodes: [{ id: 1 }], options: { groups: {} } },
    visEdgelessNetworkx: { directed: true, nodes: [{ id: 1 }], edges: [], options: { physics: false } },
    edgesAndLinks: { nodes: [], edges: [{ from: 1, to: 2 }], links: [{ source: 0 }] },
    edgesNotArray: { nodes: [], edges: { a: 1 } },
    firstEdgeAfterNonObject: { nodes: [], edges: [1, { from: 1, to: 2 }] },
    firstNodeAfterNonObject: { nodes: [null, { key: "a" }], edges: [] },
};

describe("sniffJsonDialect golden table", () => {
    it("classifies every case as before", () => {
        const table: Record<string, unknown> = {};
        for (const [name, root] of Object.entries(CASES)) {
            table[name] = sniffJsonDialect(root);
        }
        expect(table).toMatchSnapshot();
    });
});
