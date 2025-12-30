import {useCallback, useState} from "react";

export interface GraphNode {
    id: string;
    label?: string;
    [key: string]: unknown;
}

export interface GraphEdge {
    source: string;
    target: string;
    label?: string;
    [key: string]: unknown;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export function useGraphtyData(initialData?: GraphData): {
    data: GraphData;
    addNode: (node: GraphNode) => void;
    addEdge: (edge: GraphEdge) => void;
    removeNode: (nodeId: string) => void;
    removeEdge: (source: string, target: string) => void;
    clearData: () => void;
    loadData: (newData: GraphData) => void;
} {
    const [data, setData] = useState<GraphData>(
        initialData ?? {nodes: [], edges: []},
    );

    const addNode = useCallback((node: GraphNode) => {
        setData((prev) => ({
            ... prev,
            nodes: [... prev.nodes, node],
        }));
    }, []);

    const addEdge = useCallback((edge: GraphEdge) => {
        setData((prev) => ({
            ... prev,
            edges: [... prev.edges, edge],
        }));
    }, []);

    const removeNode = useCallback((nodeId: string) => {
        setData((prev) => ({
            nodes: prev.nodes.filter((n) => n.id !== nodeId),
            edges: prev.edges.filter(
                (e) => e.source !== nodeId && e.target !== nodeId,
            ),
        }));
    }, []);

    const removeEdge = useCallback((source: string, target: string) => {
        setData((prev) => ({
            ... prev,
            edges: prev.edges.filter(
                (e) => !(e.source === source && e.target === target),
            ),
        }));
    }, []);

    const clearData = useCallback(() => {
        setData({nodes: [], edges: []});
    }, []);

    const loadData = useCallback((newData: GraphData) => {
        setData(newData);
    }, []);

    return {
        data,
        addNode,
        addEdge,
        removeNode,
        removeEdge,
        clearData,
        loadData,
    };
}
