import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGraphtyData } from "../useGraphtyData";

describe("useGraphtyData", () => {
    describe("initialization", () => {
        it("initializes with empty data by default", () => {
            const { result } = renderHook(() => useGraphtyData());

            expect(result.current.data).toEqual({ nodes: [], edges: [] });
        });

        it("initializes with provided initial data", () => {
            const initialData = {
                nodes: [{ id: "1", label: "Node 1" }],
                edges: [{ source: "1", target: "2" }],
            };

            const { result } = renderHook(() => useGraphtyData(initialData));

            expect(result.current.data).toEqual(initialData);
        });
    });

    describe("addNode", () => {
        it("adds a node to the graph", () => {
            const { result } = renderHook(() => useGraphtyData());

            act(() => {
                result.current.addNode({ id: "1", label: "Node 1" });
            });

            expect(result.current.data.nodes).toHaveLength(1);
            expect(result.current.data.nodes[0]).toEqual({ id: "1", label: "Node 1" });
        });

        it("adds multiple nodes to the graph", () => {
            const { result } = renderHook(() => useGraphtyData());

            act(() => {
                result.current.addNode({ id: "1", label: "Node 1" });
                result.current.addNode({ id: "2", label: "Node 2" });
            });

            expect(result.current.data.nodes).toHaveLength(2);
        });

        it("preserves existing edges when adding a node", () => {
            const initialData = {
                nodes: [],
                edges: [{ source: "1", target: "2" }],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.addNode({ id: "1" });
            });

            expect(result.current.data.edges).toHaveLength(1);
        });
    });

    describe("addEdge", () => {
        it("adds an edge to the graph", () => {
            const { result } = renderHook(() => useGraphtyData());

            act(() => {
                result.current.addEdge({ source: "1", target: "2" });
            });

            expect(result.current.data.edges).toHaveLength(1);
            expect(result.current.data.edges[0]).toEqual({ source: "1", target: "2" });
        });

        it("adds an edge with label", () => {
            const { result } = renderHook(() => useGraphtyData());

            act(() => {
                result.current.addEdge({ source: "1", target: "2", label: "connects" });
            });

            expect(result.current.data.edges[0].label).toBe("connects");
        });

        it("preserves existing nodes when adding an edge", () => {
            const initialData = {
                nodes: [{ id: "1" }],
                edges: [],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.addEdge({ source: "1", target: "2" });
            });

            expect(result.current.data.nodes).toHaveLength(1);
        });
    });

    describe("removeNode", () => {
        it("removes a node from the graph", () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.removeNode("1");
            });

            expect(result.current.data.nodes).toHaveLength(1);
            expect(result.current.data.nodes[0].id).toBe("2");
        });

        it("removes edges connected to the removed node (source)", () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2" }],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.removeNode("1");
            });

            expect(result.current.data.edges).toHaveLength(0);
        });

        it("removes edges connected to the removed node (target)", () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2" }],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.removeNode("2");
            });

            expect(result.current.data.edges).toHaveLength(0);
        });

        it("preserves unrelated edges when removing a node", () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }, { id: "3" }],
                edges: [
                    { source: "1", target: "2" },
                    { source: "2", target: "3" },
                ],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.removeNode("1");
            });

            expect(result.current.data.edges).toHaveLength(1);
            expect(result.current.data.edges[0]).toEqual({ source: "2", target: "3" });
        });

        it("handles removing non-existent node gracefully", () => {
            const initialData = {
                nodes: [{ id: "1" }],
                edges: [],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.removeNode("999");
            });

            expect(result.current.data.nodes).toHaveLength(1);
        });
    });

    describe("removeEdge", () => {
        it("removes an edge from the graph", () => {
            const initialData = {
                nodes: [],
                edges: [
                    { source: "1", target: "2" },
                    { source: "2", target: "3" },
                ],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.removeEdge("1", "2");
            });

            expect(result.current.data.edges).toHaveLength(1);
            expect(result.current.data.edges[0]).toEqual({ source: "2", target: "3" });
        });

        it("preserves nodes when removing an edge", () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2" }],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.removeEdge("1", "2");
            });

            expect(result.current.data.nodes).toHaveLength(2);
        });

        it("handles removing non-existent edge gracefully", () => {
            const initialData = {
                nodes: [],
                edges: [{ source: "1", target: "2" }],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.removeEdge("999", "888");
            });

            expect(result.current.data.edges).toHaveLength(1);
        });
    });

    describe("clearData", () => {
        it("clears all nodes and edges", () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2" }],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.clearData();
            });

            expect(result.current.data).toEqual({ nodes: [], edges: [] });
        });

        it("works on already empty data", () => {
            const { result } = renderHook(() => useGraphtyData());

            act(() => {
                result.current.clearData();
            });

            expect(result.current.data).toEqual({ nodes: [], edges: [] });
        });
    });

    describe("loadData", () => {
        it("loads new data replacing existing data", () => {
            const initialData = {
                nodes: [{ id: "1" }],
                edges: [],
            };
            const newData = {
                nodes: [{ id: "A" }, { id: "B" }],
                edges: [{ source: "A", target: "B" }],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.loadData(newData);
            });

            expect(result.current.data).toEqual(newData);
        });

        it("loads empty data", () => {
            const initialData = {
                nodes: [{ id: "1" }],
                edges: [{ source: "1", target: "2" }],
            };
            const { result } = renderHook(() => useGraphtyData(initialData));

            act(() => {
                result.current.loadData({ nodes: [], edges: [] });
            });

            expect(result.current.data).toEqual({ nodes: [], edges: [] });
        });
    });
});
