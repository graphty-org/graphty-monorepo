/**
 * What the shell does with the graph's shape, now that it no longer measures it.
 *
 * The arithmetic -- components, repeats, self loops, density, the direction the graph is
 * frozen with -- belongs to graphty-element and is tested there against its own snapshot.
 * Nothing here asserts any of it. What is asserted is the shell's half: that it reads the
 * element rather than a second copy of the graph, that it has an honest answer when there
 * is no element to read, and the two derived facts it still owns -- the small-parts
 * predicate the graph-summary sentence branches on, and the endpoint reader the node
 * inspector's neighbour list is built from.
 */

import type { ComponentStatistics, GraphSession, GraphStatistics } from "@graphty/graphty-element/session";
import { describe, expect, it, vi } from "vitest";

import {
    edgeEndpointId,
    edgeEndpoints,
    EMPTY_GRAPH_STATISTICS,
    readGraphStatistics,
    smallPartsAreSingleNodes,
} from "../graphShape";

/**
 * The component shape the element publishes for a graph with these part sizes.
 *
 * The sizes are the fixture and the three summary numbers are derived from them, which is
 * the relationship the element maintains: a board states the parts it means and cannot
 * state a count that disagrees with them.
 * @param sizes - one node count per component, in any order.
 * @returns the component statistics.
 */
function components(...sizes: number[]): ComponentStatistics {
    return {
        count: sizes.length,
        sizes: [...sizes].sort((a, b) => b - a),
        largestSize: sizes.length === 0 ? 0 : Math.max(...sizes),
        isolatedCount: sizes.filter((size) => size === 1).length,
        truncatedSizes: false,
        componentOf: () => undefined,
    };
}

/**
 * A session that answers one fixed set of statistics.
 * @param statistics - what its data surface reports.
 * @returns the session, with only the member this module reads.
 */
function sessionReporting(statistics: GraphStatistics): GraphSession {
    return { data: { statistics: () => statistics } } as unknown as GraphSession;
}

describe("readGraphStatistics", () => {
    it("reports every count as zero, and claims no direction, when there is no element yet", () => {
        const statistics = readGraphStatistics(null);

        expect(statistics).toEqual(EMPTY_GRAPH_STATISTICS);
        expect(statistics.nodeCount).toBe(0);
        expect(statistics.edgeCount).toBe(0);
        expect(statistics.density).toBe(0);
        expect(statistics.selfLoopCount).toBe(0);
        expect(statistics.repeatedEdgeCount).toBe(0);
        expect(statistics.components.count).toBe(0);
        expect(statistics.components.largestSize).toBe(0);
        expect(statistics.components.isolatedCount).toBe(0);
        expect(statistics.directedness).toBe("unknown");
    });

    it("hands back exactly what the element said, without reshaping it", () => {
        const published: GraphStatistics = {
            nodeCount: 20,
            edgeCount: 29,
            density: 0.152,
            directedness: "undirected",
            directednessSource: { by: "unsettled", statedBy: null },
            weighted: true,
            selfLoopCount: 1,
            repeatedEdgeCount: 2,
            degreeRange: [2, 4],
            meanDegree: 0,
            components: components(18, 1, 1),
        };

        expect(readGraphStatistics(sessionReporting(published))).toBe(published);
    });

    /**
     * A disposed session throws rather than answering, and the shell asking one is a
     * lifecycle bug above this line -- so it is reported, and the surfaces get the empty
     * shape rather than a crash halfway through a data event.
     */
    it("reports the empty shape, loudly, when the session refuses to answer", () => {
        const reported = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const disposed = {
            data: {
                statistics: () => {
                    throw new Error("E_DISPOSED");
                },
            },
        } as unknown as GraphSession;

        expect(readGraphStatistics(disposed)).toEqual(EMPTY_GRAPH_STATISTICS);
        expect(reported).toHaveBeenCalled();

        reported.mockRestore();
    });
});

describe("smallPartsAreSingleNodes", () => {
    it("is true for one part, because there are no small parts to be anything else", () => {
        expect(smallPartsAreSingleNodes(components(5))).toBe(true);
    });

    it("is true for a graph that is nothing at all", () => {
        expect(smallPartsAreSingleNodes(components())).toBe(true);
    });

    it("is false for two disjoint triangles, neither of them a single node", () => {
        expect(smallPartsAreSingleNodes(components(3, 3))).toBe(false);
    });

    it("is true for a triangle plus two loose nodes, both of them single", () => {
        expect(smallPartsAreSingleNodes(components(3, 1, 1))).toBe(true);
    });

    it("is false as soon as one small part holds a pair", () => {
        expect(smallPartsAreSingleNodes(components(5, 2, 1))).toBe(false);
    });

    it("is true for a graph of nothing but isolated nodes", () => {
        expect(smallPartsAreSingleNodes(components(1, 1, 1))).toBe(true);
    });
});

describe("edgeEndpointId", () => {
    it("reads a string id", () => {
        expect(edgeEndpointId("a")).toBe("a");
    });

    it("reads a numeric id as its string form", () => {
        expect(edgeEndpointId(7)).toBe("7");
    });

    it("reads an id off a node object", () => {
        expect(edgeEndpointId({ id: 12, name: "Mr_Whiskers" })).toBe("12");
    });

    it("reads null, undefined, an empty string and an object with no id as no id at all", () => {
        expect(edgeEndpointId(null)).toBeNull();
        expect(edgeEndpointId(undefined)).toBeNull();
        expect(edgeEndpointId("")).toBeNull();
        expect(edgeEndpointId({ name: "no id here" })).toBeNull();
        expect(edgeEndpointId(Number.NaN)).toBeNull();
    });
});

describe("edgeEndpoints", () => {
    /**
     * The spelling `GraphtyHandle.getData` writes, which is the spelling every one of the
     * element's importers now produces. It used to write `src`/`dst`, so a reader that knew only
     * `source`/`target` found neither on a GML load and the inspector drew "Expand 0 neighbors"
     * for a node whose own card said 17 links.
     */
    it("reads the source/target spelling the app's own records carry", () => {
        expect(edgeEndpoints({ id: "0", source: "a", target: "b" })).toEqual({ source: "a", target: "b" });
    });

    it("names no node for a record spelled the old src/dst way, which the element no longer writes", () => {
        // The inverse of the assertion that stood here while the reader carried a fallback. The
        // element resolves an input file's own spelling before the record exists, so `src`/`dst`
        // on a record reaching this reader is an ATTRIBUTE that happens to be called that, not an
        // endpoint -- and reading it as an endpoint is how two spellings of one fact start
        // disagreeing again.
        expect(edgeEndpoints({ src: "a", dst: "b" })).toEqual({ source: null, target: null });
    });

    it("ignores the old spelling sitting beside the canonical one", () => {
        // A source file carrying its own `src` attribute survives the spread onto the record.
        // Only the two names the element resolved are read.
        expect(edgeEndpoints({ src: "x", dst: "y", source: "a", target: "b" })).toEqual({ source: "a", target: "b" });
    });

    it("reads an endpoint given as a node object, and a numeric id as its printed form", () => {
        expect(edgeEndpoints({ source: { id: 1 }, target: 2 })).toEqual({ source: "1", target: "2" });
    });

    it("names no node for an endpoint the record does not carry", () => {
        expect(edgeEndpoints({ id: "e1" })).toEqual({ source: null, target: null });
        expect(edgeEndpoints({ source: "", target: "b" })).toEqual({ source: null, target: "b" });
    });
});
