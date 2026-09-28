import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { girvanNewman } from "../../../src/indexed/girvan-newman.js";
import { modularity } from "../../../src/indexed/modularity.js";
import type { NodeId } from "../../../src/types/index.js";
import { legacyResult } from "../../helpers/golden.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { undirectedFixtures } from "./port-fixtures.js";

/** A partition as a sorted list of sorted id lists, comparable across the two implementations. */
function canonical(groups: readonly (readonly NodeId[])[]): string[] {
    return groups.map((g) => g.map(String).sort().join(",")).sort();
}

function levelGroups(s: GraphSnapshot, labels: ArrayLike<number>, minSize = 1): string[] {
    const groups = new Map<number, NodeId[]>();
    for (let u = 0; u < s.nodeCount; u++) {
        const g = groups.get(labels[u]) ?? [];
        g.push(s.ids.idOf(u));
        groups.set(labels[u], g);
    }
    return canonical([...groups.values()].filter((g) => g.length >= minSize));
}

describe("indexed.girvanNewman", () => {
    for (const { name, graph } of undirectedFixtures()) {
        it(`gives the legacy dendrogram level for level, with the same modularity, on ${name}`, () => {
            const s = checksummedSnapshot(graph);
            const r = girvanNewman(s);
            const legacy = legacyResult<CommunityResult[]>();
            expect(r.levels.length).toBe(legacy.length);
            expect(r.modularity.length).toBe(legacy.length);
            for (let i = 0; i < legacy.length; i++) {
                expect(levelGroups(s, r.levels[i])).toEqual(canonical(legacy[i].communities));
                expect(r.modularity[i]).toBeCloseTo(legacy[i].modularity, 12);
            }
            expect(Math.max(...r.modularity)).toBeGreaterThanOrEqual(
                Math.max(...legacy.map((l) => l.modularity)) - 1e-12,
            );
            s.validate({ checksum: true });
        });
    }

    it("stops where the legacy function does with maxCommunities, minCommunitySize and maxIterations", () => {
        const graph = undirectedFixtures().find((f) => f.name === "Zachary's karate club")?.graph as Graph;
        const s = checksummedSnapshot(graph);
        for (const options of [
            { maxCommunities: 2 },
            { maxCommunities: 5, minCommunitySize: 3 },
            { maxIterations: 4 },
            { maxIterations: 0 },
        ]) {
            const r = girvanNewman(s, options);
            const legacy = legacyResult<CommunityResult[]>();
            expect(r.levels.length).toBe(legacy.length);
            for (let i = 0; i < legacy.length; i++) {
                expect(levelGroups(s, r.levels[i], options.minCommunitySize)).toEqual(canonical(legacy[i].communities));
            }
        }
        s.validate({ checksum: true });
    });

    it("splits two triangles joined by a bridge at the bridge first", () => {
        const g = new Graph({ directed: false });
        for (const [u, v] of [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["d", "e"],
            ["e", "f"],
            ["f", "d"],
            ["c", "d"],
        ]) {
            g.addEdge(u, v);
        }
        const s = checksummedSnapshot(g);
        const r = girvanNewman(s, { maxCommunities: 2 });
        expect(r.levels.map((l) => [...l])).toEqual([
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1],
        ]);
        expect(r.modularity[0]).toBeCloseTo(0, 15);
        expect(r.modularity[1]).toBeCloseTo(5 / 14, 12);
        s.validate({ checksum: true });
    });

    it("removes a doubled bridge one parallel edge per round", () => {
        const b = new GraphBuilder({ directed: false });
        for (const [u, v] of [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["d", "e"],
            ["e", "f"],
            ["f", "d"],
            ["c", "d"],
            ["c", "d"],
        ]) {
            b.addEdge(u, v);
        }
        const s = b.freeze({ checksum: true });
        const r = girvanNewman(s, { maxCommunities: 2 });
        expect(r.levels.map((l) => [...l])).toEqual([
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1],
        ]);
        // Modularity counts both parallels as weight.
        expect(r.modularity[2]).toBeCloseTo(modularity(s, r.levels[2]), 15);
        s.validate({ checksum: true });
    });

    it("reads exact f64 weights in its modularity", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1 + 1e-9);
        g.addEdge("b", "c", 1e-30);
        g.addEdge("c", "d", 2);
        const s = checksummedSnapshot(g);
        const r = girvanNewman(s);
        const legacy = legacyResult<CommunityResult[]>();
        for (let i = 0; i < legacy.length; i++) {
            expect(r.modularity[i]).toBe(legacy[i].modularity);
        }
        s.validate({ checksum: true });
    });

    it("returns one level on an edgeless graph and on an empty snapshot", () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        b.addNode("b");
        const s = b.freeze({ checksum: true });
        const r = girvanNewman(s);
        expect(r.levels.map((l) => [...l])).toEqual([[0, 1]]);
        expect([...r.modularity]).toEqual([0]);
        const none = new GraphBuilder({ directed: false }).freeze({ checksum: true });
        const empty = girvanNewman(none);
        expect(empty.levels.map((l) => [...l])).toEqual([[]]);
        none.validate({ checksum: true });
        s.validate({ checksum: true });
    });

    it("rejects a directed snapshot", () => {
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b");
        const s = b.freeze({ checksum: true });
        expect(() => girvanNewman(s)).toThrow("requires an undirected graph");
        s.validate({ checksum: true });
    });
});
