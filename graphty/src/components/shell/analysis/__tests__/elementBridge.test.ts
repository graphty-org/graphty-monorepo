import { describe, expect, it, vi } from "vitest";

import {
    addStyleLayers,
    asElementGraph,
    type ElementGraph,
    type ElementStyleLayerLike,
    readResultPath,
    removeLayersFromSource,
    repaintStyles,
} from "../elementBridge";

/** What a stub records, so a test can see what the bridge did to the element. */
interface StubGraph {
    /** The graph the bridge talks to. */
    readonly graph: ElementGraph;
    /** The layer list, in the order the bridge left it. */
    readonly layers: ElementStyleLayerLike[];
    /** How many times the node repaint ran. */
    readonly nodeRepaints: () => number;
    /** How many times the edge repaint ran. */
    readonly edgeRepaints: () => number;
}

/**
 * A hand-written element graph that records repaints and holds a real layer list.
 * @param initialLayers - the layers the graph starts with.
 * @returns the stub and its recorded calls.
 */
function makeStub(initialLayers: ElementStyleLayerLike[] = []): StubGraph {
    const layers = [...initialLayers];
    const applyStylesToExistingNodes = vi.fn();
    const applyStylesToExistingEdges = vi.fn();

    const graph: ElementGraph = {
        runAlgorithm: async () => {
            await Promise.resolve();
        },
        getNodes: () => [],
        getDataManager: () => ({
            graphResults: undefined,
            applyStylesToExistingNodes,
            applyStylesToExistingEdges,
        }),
        getStyleManager: () => ({
            addLayer: (layer) => {
                layers.push(layer);
            },
            getLayers: () => layers,
            removeLayerByIndex: (index) => {
                if (index < 0 || index >= layers.length) {
                    return false;
                }

                layers.splice(index, 1);
                return true;
            },
        }),
    };

    return {
        graph,
        layers,
        nodeRepaints: () => applyStylesToExistingNodes.mock.calls.length,
        edgeRepaints: () => applyStylesToExistingEdges.mock.calls.length,
    };
}

describe("asElementGraph", () => {
    it("refuses null and undefined", () => {
        expect(asElementGraph(null)).toBeNull();
        expect(asElementGraph(undefined)).toBeNull();
    });

    it("refuses a primitive", () => {
        expect(asElementGraph("graph")).toBeNull();
        expect(asElementGraph(42)).toBeNull();
    });

    it("refuses an empty object", () => {
        expect(asElementGraph({})).toBeNull();
    });

    it("refuses an object carrying only some of the four methods", () => {
        expect(
            asElementGraph({
                runAlgorithm: () => Promise.resolve(),
                getNodes: () => [],
            }),
        ).toBeNull();
    });

    it("refuses an object whose method is not a function", () => {
        expect(
            asElementGraph({
                runAlgorithm: () => Promise.resolve(),
                getNodes: () => [],
                getDataManager: () => ({}),
                getStyleManager: "not a function",
            }),
        ).toBeNull();
    });

    it("refuses an array", () => {
        expect(asElementGraph([])).toBeNull();
    });

    it("accepts a graph carrying all four methods, and returns it unchanged", () => {
        const stub = makeStub();

        expect(asElementGraph(stub.graph)).toBe(stub.graph);
    });
});

describe("readResultPath", () => {
    it("reads a nested value", () => {
        expect(readResultPath({ graphty: { louvain: { modularity: 0.447 } } }, ["graphty", "louvain", "modularity"])).toBe(
            0.447,
        );
    });

    it("returns undefined when a step is missing", () => {
        expect(readResultPath({ graphty: {} }, ["graphty", "louvain", "modularity"])).toBeUndefined();
    });

    it("returns undefined when the root is not an object", () => {
        expect(readResultPath(undefined, ["graphty"])).toBeUndefined();
        expect(readResultPath("nope", ["graphty"])).toBeUndefined();
    });

    it("returns the root itself for an empty path", () => {
        const root = { a: 1 };

        expect(readResultPath(root, [])).toBe(root);
    });
});

describe("repaintStyles", () => {
    it("re-applies styles to existing nodes and edges exactly once each", () => {
        const stub = makeStub();

        repaintStyles(stub.graph);

        expect(stub.nodeRepaints()).toBe(1);
        expect(stub.edgeRepaints()).toBe(1);
    });
});

describe("addStyleLayers", () => {
    it("adds the layers in order and repaints once", () => {
        const stub = makeStub();

        addStyleLayers(stub.graph, [{ metadata: { name: "first" } }, { metadata: { name: "second" } }]);

        expect(stub.layers.map((layer) => layer.metadata?.name)).toEqual(["first", "second"]);
        expect(stub.nodeRepaints()).toBe(1);
        expect(stub.edgeRepaints()).toBe(1);
    });

    it("still repaints when the layer list is empty", () => {
        const stub = makeStub();

        addStyleLayers(stub.graph, []);

        expect(stub.nodeRepaints()).toBe(1);
    });
});

describe("removeLayersFromSource", () => {
    it("removes every layer carrying the tag and leaves the rest in order", () => {
        const stub = makeStub([
            { metadata: { name: "neutral" } },
            { metadata: { name: "groups 1", algorithmSource: "graphty:louvain" } },
            { metadata: { name: "size" } },
            { metadata: { name: "groups 2", algorithmSource: "graphty:louvain" } },
            { metadata: { name: "groups 3", algorithmSource: "graphty:louvain" } },
        ]);

        removeLayersFromSource(stub.graph, "graphty:louvain");

        expect(stub.layers.map((layer) => layer.metadata?.name)).toEqual(["neutral", "size"]);
        expect(stub.nodeRepaints()).toBe(1);
    });

    it("leaves a different source's layers alone", () => {
        const stub = makeStub([
            { metadata: { name: "degree", algorithmSource: "graphty:degree" } },
            { metadata: { name: "groups", algorithmSource: "graphty:louvain" } },
        ]);

        removeLayersFromSource(stub.graph, "graphty:louvain");

        expect(stub.layers.map((layer) => layer.metadata?.name)).toEqual(["degree"]);
    });

    it("does not repaint when nothing carried the tag", () => {
        const stub = makeStub([{ metadata: { name: "neutral" } }]);

        removeLayersFromSource(stub.graph, "graphty:louvain");

        expect(stub.layers).toHaveLength(1);
        expect(stub.nodeRepaints()).toBe(0);
        expect(stub.edgeRepaints()).toBe(0);
    });
});
