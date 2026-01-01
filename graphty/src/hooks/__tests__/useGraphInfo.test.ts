import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGraphInfo } from "../useGraphInfo";

describe("useGraphInfo", () => {
    it("returns default graph info initially", () => {
        const { result } = renderHook(() => useGraphInfo());

        expect(result.current.graphInfo).toEqual({
            nodeCount: 0,
            edgeCount: 0,
            density: 0,
            dataSources: [],
            graphType: {
                directed: true,
                weighted: false,
                selfLoops: false,
            },
        });
    });

    it("accepts initial info overrides", () => {
        const { result } = renderHook(() =>
            useGraphInfo({
                nodeCount: 10,
                edgeCount: 15,
            }),
        );

        expect(result.current.graphInfo.nodeCount).toBe(10);
        expect(result.current.graphInfo.edgeCount).toBe(15);
    });

    it("updates stats and calculates density for directed graph", () => {
        const { result } = renderHook(() => useGraphInfo());

        act(() => {
            result.current.updateStats(5, 10);
        });

        expect(result.current.graphInfo.nodeCount).toBe(5);
        expect(result.current.graphInfo.edgeCount).toBe(10);
        // Directed density = edges / (nodes * (nodes - 1)) = 10 / (5 * 4) = 0.5
        expect(result.current.graphInfo.density).toBe(0.5);
    });

    it("calculates density correctly for undirected graph", () => {
        const { result } = renderHook(() =>
            useGraphInfo({
                graphType: { directed: false, weighted: false, selfLoops: false },
            }),
        );

        act(() => {
            result.current.updateStats(5, 10);
        });

        // Undirected density = 2 * edges / (nodes * (nodes - 1)) = 20 / 20 = 1.0
        expect(result.current.graphInfo.density).toBe(1);
    });

    it("handles zero nodes when calculating density", () => {
        const { result } = renderHook(() => useGraphInfo());

        act(() => {
            result.current.updateStats(0, 0);
        });

        expect(result.current.graphInfo.density).toBe(0);
    });

    it("handles single node when calculating density", () => {
        const { result } = renderHook(() => useGraphInfo());

        act(() => {
            result.current.updateStats(1, 0);
        });

        expect(result.current.graphInfo.density).toBe(0);
    });

    it("adds data sources", () => {
        const { result } = renderHook(() => useGraphInfo());

        act(() => {
            result.current.addDataSource({ name: "test.json", type: "json" });
        });

        expect(result.current.graphInfo.dataSources).toHaveLength(1);
        expect(result.current.graphInfo.dataSources[0]).toEqual({
            name: "test.json",
            type: "json",
        });
    });

    it("adds multiple data sources", () => {
        const { result } = renderHook(() => useGraphInfo());

        act(() => {
            result.current.addDataSource({ name: "nodes.csv", type: "csv" });
            result.current.addDataSource({ name: "edges.csv", type: "csv" });
        });

        expect(result.current.graphInfo.dataSources).toHaveLength(2);
    });

    it("clears data sources", () => {
        const { result } = renderHook(() => useGraphInfo());

        act(() => {
            result.current.addDataSource({ name: "test.json", type: "json" });
            result.current.addDataSource({ name: "test2.json", type: "json" });
        });

        expect(result.current.graphInfo.dataSources).toHaveLength(2);

        act(() => {
            result.current.clearDataSources();
        });

        expect(result.current.graphInfo.dataSources).toHaveLength(0);
    });

    it("sets graph type and recalculates density", () => {
        const { result } = renderHook(() => useGraphInfo());

        // First set some stats
        act(() => {
            result.current.updateStats(5, 10);
        });

        expect(result.current.graphInfo.density).toBe(0.5); // directed

        // Change to undirected
        act(() => {
            result.current.setGraphType({
                directed: false,
                weighted: true,
                selfLoops: true,
            });
        });

        expect(result.current.graphInfo.graphType.directed).toBe(false);
        expect(result.current.graphInfo.graphType.weighted).toBe(true);
        expect(result.current.graphInfo.graphType.selfLoops).toBe(true);
        // Density recalculated for undirected: 2 * 10 / (5 * 4) = 1.0
        expect(result.current.graphInfo.density).toBe(1);
    });
});
