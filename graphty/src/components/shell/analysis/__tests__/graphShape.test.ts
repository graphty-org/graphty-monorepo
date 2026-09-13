import { describe, expect, it } from "vitest";

import { computeGraphShape, edgeEndpointId } from "../graphShape";

/**
 * Node records shaped as `handle.getData()` returns them: an id plus whatever the
 * source file carried.
 * @param ids - the node ids.
 * @returns one record per id.
 */
function nodes(...ids: (string | number)[]): { id: string | number }[] {
    return ids.map((id) => ({ id }));
}

/**
 * Edge records in the src/dst spelling `Graphty.tsx` writes.
 * @param pairs - endpoint pairs.
 * @returns one record per pair.
 */
function edges(...pairs: [string | number, string | number][]): { src: string | number; dst: string | number }[] {
    return pairs.map(([src, dst]) => ({ src, dst }));
}

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

describe("computeGraphShape", () => {
    it("reports every count as zero for no records at all", () => {
        expect(computeGraphShape({ nodes: [], edges: [] })).toEqual({
            nodeCount: 0,
            edgeCount: 0,
            connectedPartCount: 0,
            largestPartNodeCount: 0,
            isolatedNodeCount: 0,
            selfLoopCount: 0,
            parallelEdgeCount: 0,
            smallPartsMostlySingleNodes: true,
            directedness: "unknown",
        });
    });

    it("finds one part in a five node path", () => {
        const shape = computeGraphShape({
            nodes: nodes("a", "b", "c", "d", "e"),
            edges: edges(["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"]),
        });

        expect(shape.nodeCount).toBe(5);
        expect(shape.edgeCount).toBe(4);
        expect(shape.connectedPartCount).toBe(1);
        expect(shape.largestPartNodeCount).toBe(5);
        expect(shape.isolatedNodeCount).toBe(0);
        expect(shape.selfLoopCount).toBe(0);
        expect(shape.parallelEdgeCount).toBe(0);
    });

    it("finds two parts in two disjoint triangles, neither of them a single node", () => {
        const shape = computeGraphShape({
            nodes: nodes("a", "b", "c", "x", "y", "z"),
            edges: edges(["a", "b"], ["b", "c"], ["c", "a"], ["x", "y"], ["y", "z"], ["z", "x"]),
        });

        expect(shape.connectedPartCount).toBe(2);
        expect(shape.largestPartNodeCount).toBe(3);
        expect(shape.isolatedNodeCount).toBe(0);
        expect(shape.smallPartsMostlySingleNodes).toBe(false);
    });

    it("finds three parts in a triangle plus two loose nodes, both of them single", () => {
        const shape = computeGraphShape({
            nodes: nodes("a", "b", "c", "loose1", "loose2"),
            edges: edges(["a", "b"], ["b", "c"], ["c", "a"]),
        });

        expect(shape.connectedPartCount).toBe(3);
        expect(shape.largestPartNodeCount).toBe(3);
        expect(shape.isolatedNodeCount).toBe(2);
        expect(shape.smallPartsMostlySingleNodes).toBe(true);
    });

    it("counts a self loop and leaves the node in its own part", () => {
        const shape = computeGraphShape({
            nodes: nodes("a", "b"),
            edges: edges(["a", "a"], ["a", "b"]),
        });

        expect(shape.selfLoopCount).toBe(1);
        expect(shape.parallelEdgeCount).toBe(0);
        expect(shape.connectedPartCount).toBe(1);
    });

    describe("parallel edges", () => {
        it("counts a repeat of the same ordered pair", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b"),
                edges: edges(["a", "b"], ["a", "b"], ["a", "b"]),
            });

            expect(shape.edgeCount).toBe(3);
            expect(shape.parallelEdgeCount).toBe(2);
        });

        it("does not call a reciprocal pair parallel when direction was never measured", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b"),
                edges: edges(["a", "b"], ["b", "a"]),
            });

            expect(shape.directedness).toBe("unknown");
            expect(shape.parallelEdgeCount).toBe(0);
        });

        it("does not call a reciprocal pair parallel on a measured directed graph", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b"),
                edges: [
                    { src: "a", dst: "b", directed: true },
                    { src: "b", dst: "a", directed: true },
                ],
            });

            expect(shape.directedness).toBe("directed");
            expect(shape.parallelEdgeCount).toBe(0);
        });

        it("counts a reciprocal pair as parallel on a measured undirected graph", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b"),
                edges: [
                    { src: "a", dst: "b", directed: false },
                    { src: "b", dst: "a", directed: false },
                ],
            });

            expect(shape.directedness).toBe("undirected");
            expect(shape.parallelEdgeCount).toBe(1);
        });

        it("still counts an ordered repeat on a directed graph that also has the reciprocal edge", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b"),
                edges: [
                    { src: "a", dst: "b", directed: true },
                    { src: "b", dst: "a", directed: true },
                    { src: "a", dst: "b", directed: true },
                ],
            });

            expect(shape.edgeCount).toBe(3);
            expect(shape.parallelEdgeCount).toBe(1);
        });
    });

    it("ignores direction when it counts parts", () => {
        const shape = computeGraphShape({
            nodes: nodes("a", "b", "c"),
            edges: edges(["a", "b"], ["c", "b"]),
        });

        expect(shape.connectedPartCount).toBe(1);
    });

    it("accepts the source/target spelling as well as src/dst", () => {
        const shape = computeGraphShape({
            nodes: nodes("a", "b", "c"),
            edges: [
                { source: "a", target: "b" },
                { source: { id: "b" }, target: "c" },
            ],
        });

        expect(shape.connectedPartCount).toBe(1);
        expect(shape.largestPartNodeCount).toBe(3);
    });

    it("reads numeric ids consistently across nodes and edges", () => {
        const shape = computeGraphShape({
            nodes: nodes(1, 2, 3),
            edges: edges([1, 2], [2, 3]),
        });

        expect(shape.connectedPartCount).toBe(1);
        expect(shape.largestPartNodeCount).toBe(3);
    });

    it("unions nothing for an edge naming a node that was not loaded", () => {
        const shape = computeGraphShape({
            nodes: nodes("a", "b"),
            edges: edges(["a", "ghost"]),
        });

        expect(shape.nodeCount).toBe(2);
        expect(shape.connectedPartCount).toBe(2);
        expect(shape.largestPartNodeCount).toBe(1);
    });

    describe("directedness", () => {
        it("is directed only when every edge says so", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b", "c"),
                edges: [
                    { src: "a", dst: "b", directed: true },
                    { src: "b", dst: "c", directed: true },
                ],
            });

            expect(shape.directedness).toBe("directed");
        });

        it("is undirected only when every edge says so", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b", "c"),
                edges: [
                    { src: "a", dst: "b", directed: false },
                    { src: "b", dst: "c", directed: false },
                ],
            });

            expect(shape.directedness).toBe("undirected");
        });

        it("is unknown when the edges disagree", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b", "c"),
                edges: [
                    { src: "a", dst: "b", directed: true },
                    { src: "b", dst: "c", directed: false },
                ],
            });

            expect(shape.directedness).toBe("unknown");
        });

        it("is unknown when any edge does not carry the key", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b", "c"),
                edges: [{ src: "a", dst: "b", directed: true }, { src: "b", dst: "c" }],
            });

            expect(shape.directedness).toBe("unknown");
        });

        it("is unknown on the cat fixture's spelling, where no edge carries the key", () => {
            const shape = computeGraphShape({
                nodes: nodes("a", "b"),
                edges: edges(["a", "b"]),
            });

            expect(shape.directedness).toBe("unknown");
        });

        it("is unknown when there are no edges at all, rather than vacuously directed", () => {
            const shape = computeGraphShape({ nodes: nodes("a", "b"), edges: [] });

            expect(shape.directedness).toBe("unknown");
            expect(shape.connectedPartCount).toBe(2);
            expect(shape.isolatedNodeCount).toBe(2);
        });
    });
});
