import {useCallback, useState} from "react";

import type {DataSourceInfo, GraphInfo, GraphTypeConfig} from "../types/selection";

/**
 * Default graph info state.
 */
const DEFAULT_GRAPH_INFO: GraphInfo = {
    nodeCount: 0,
    edgeCount: 0,
    density: 0,
    dataSources: [],
    graphType: {
        directed: true,
        weighted: false,
        selfLoops: false,
    },
};

/**
 * Hook for managing graph information state.
 * Provides methods to update graph statistics and configuration.
 */
export function useGraphInfo(initialInfo?: Partial<GraphInfo>): {
    graphInfo: GraphInfo;
    updateStats: (nodeCount: number, edgeCount: number) => void;
    addDataSource: (source: DataSourceInfo) => void;
    clearDataSources: () => void;
    setGraphType: (graphType: GraphTypeConfig) => void;
} {
    const [graphInfo, setGraphInfo] = useState<GraphInfo>({
        ... DEFAULT_GRAPH_INFO,
        ... initialInfo,
    });

    const updateStats = useCallback((nodeCount: number, edgeCount: number) => {
        setGraphInfo((prev) => {
            // Calculate density: for directed graph, density = edges / (nodes * (nodes - 1))
            // For undirected: density = 2 * edges / (nodes * (nodes - 1))
            const possibleEdges = nodeCount * (nodeCount - 1);
            const density = possibleEdges > 0 ?
                (prev.graphType.directed ? edgeCount : edgeCount * 2) / possibleEdges :
                0;

            return {
                ... prev,
                nodeCount,
                edgeCount,
                density,
            };
        });
    }, []);

    const addDataSource = useCallback((source: DataSourceInfo) => {
        setGraphInfo((prev) => ({
            ... prev,
            dataSources: [... prev.dataSources, source],
        }));
    }, []);

    const clearDataSources = useCallback(() => {
        setGraphInfo((prev) => ({
            ... prev,
            dataSources: [],
        }));
    }, []);

    const setGraphType = useCallback((graphType: GraphTypeConfig) => {
        setGraphInfo((prev) => {
            // Recalculate density when graph type changes (directed vs undirected)
            const possibleEdges = prev.nodeCount * (prev.nodeCount - 1);
            const density = possibleEdges > 0 ?
                (graphType.directed ? prev.edgeCount : prev.edgeCount * 2) / possibleEdges :
                0;

            return {
                ... prev,
                graphType,
                density,
            };
        });
    }, []);

    return {
        graphInfo,
        updateStats,
        addDataSource,
        clearDataSources,
        setGraphType,
    };
}
