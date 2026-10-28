/**
 * @file Support points: where a curved edge's control point settles under vis-network's forces, with the nodes held
 * still. The reference points were worked out by stepping vis-network 9.1.9's own force laws (BarnesHutSolver,
 * ForceAtlas2BasedRepulsionSolver, their central gravity solvers and SpringSolver) to rest.
 */
import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import type { Xyz } from "../../src/meshes/edgeRoute";
import {
    stepSupportPoints,
    SUPPORT_DEFAULTS,
    type SupportEdge,
    type SupportForces,
    SupportPoints,
} from "../../src/meshes/supportPoints";

const at = (x: number, y: number): Xyz => ({ x, y, z: 0 });
const BARNES_HUT: SupportForces = { model: "barnesHut", ...SUPPORT_DEFAULTS, unit: 1 };
const FORCE_ATLAS2: SupportForces = {
    model: "forceAtlas2",
    springLength: 100,
    springConstant: 0.08,
    repulsion: 50,
    centralGravity: 0.01,
    unit: 1,
};

/**
 * Step support points from their edges' middles until they rest.
 * @param nodes - The nodes.
 * @param edges - The edges.
 * @returns Each support point, x and y.
 */
function settle(nodes: Xyz[], edges: SupportEdge[]): [number, number][] {
    const points = new Float64Array(edges.flatMap((e) => [(e.src.x + e.dst.x) / 2, (e.src.y + e.dst.y) / 2]));
    const velocities = new Float64Array(points.length);
    let moving = true;
    for (let round = 0; round < 100 && moving; round++) {
        moving = stepSupportPoints(nodes, edges, points, velocities, 100);
    }
    assert.isFalse(moving, "the support points came to rest");
    return edges.map((_, j) => [points[2 * j], points[2 * j + 1]]);
}

describe("support points", () => {
    it("stay at the middle of a lone edge, which is then drawn straight", () => {
        const nodes = [at(0, 0), at(100, 0)];
        const [[x, y]] = settle(nodes, [{ src: nodes[0], dst: nodes[1], forces: BARNES_HUT }]);
        assert.closeTo(x, 50, 1e-3);
        assert.closeTo(y, 0, 1e-3);
    });

    it("are pushed away from a node beside the edge, as vis-network's barnesHut and forceAtlas2Based push them", () => {
        const nodes = [at(0, 0), at(100, 0), at(50, 30)];
        const [[bx, by]] = settle(nodes, [{ src: nodes[0], dst: nodes[1], forces: BARNES_HUT }]);
        assert.closeTo(bx, 50, 0.05);
        assert.closeTo(by, -38.1, 0.05);
        const [[fx, fy]] = settle(nodes, [{ src: nodes[0], dst: nodes[1], forces: FORCE_ATLAS2 }]);
        assert.closeTo(fx, 50, 0.05);
        assert.closeTo(fy, -37.78, 0.05);
    });

    it("of edges between the same two nodes push each other apart, to either side", () => {
        const nodes = [at(0, 0), at(100, 0)];
        const [[, y0], [, y1]] = settle(nodes, [
            { src: nodes[0], dst: nodes[1], forces: BARNES_HUT },
            { src: nodes[1], dst: nodes[0], forces: BARNES_HUT },
        ]);
        assert.isAbove(Math.abs(y0), 5);
        assert.closeTo(y0, -y1, 0.5);
    });

    it("keep their shape when the scene is drawn at another scale, through the unit", () => {
        const nodes = [at(0, 0), at(100, 0), at(50, 30)];
        const scaled = nodes.map((p) => at(p.x * 3, p.y * 3));
        const [[, y]] = settle(nodes, [{ src: nodes[0], dst: nodes[1], forces: BARNES_HUT }]);
        const [[, y3]] = settle(scaled, [{ src: scaled[0], dst: scaled[1], forces: { ...BARNES_HUT, unit: 3 } }]);
        assert.closeTo(y3, 3 * y, 0.1);
    });

    it("rest where their forces put them, whatever forces they had before", () => {
        const support = new SupportPoints<string>();
        const nodes = [at(0, 0), at(100, 0), at(50, 30)];
        let forces: SupportForces = BARNES_HUT;
        const read = (): SupportEdge => ({ src: nodes[0], dst: nodes[1], forces });
        const rest = (): Xyz | null => {
            for (let frame = 0; frame < 400 && support.update(() => nodes, ["e"], read, frame === 0); frame++) {
                // stepped until the point rests
            }
            return support.pointOf("e");
        };
        const first = rest();
        // a style sets other forces, and is then removed
        forces = { ...BARNES_HUT, springLength: 20, repulsion: -8000 };
        const other = rest();
        assert.isAbove(Math.abs((other?.y ?? 0) - (first?.y ?? 0)), 1, "the other forces move the point");
        forces = BARNES_HUT;
        const again = rest();
        assert.strictEqual(again?.x, first?.x);
        assert.strictEqual(again?.y, first?.y);
    });

    it("move with their edge when the nodes move, and rest once settled", () => {
        const support = new SupportPoints<string>();
        const nodes = [at(0, 0), at(100, 0), at(50, 30)];
        const read = (): SupportEdge => ({ src: nodes[0], dst: nodes[1], forces: BARNES_HUT });
        let asked = 0;
        const centers = (): Xyz[] => {
            asked++;
            return nodes;
        };
        for (let frame = 0; frame < 200 && support.update(centers, ["e"], read, frame === 0); frame++) {
            // stepped until the point rests
        }
        const rested = support.pointOf("e");
        assert.isNotNull(rested);
        assert.closeTo(rested?.y ?? 0, -38.1, 0.1);
        // at rest and nothing moved: no work, the same point
        const before = asked;
        assert.isFalse(support.update(centers, ["e"], read, false));
        assert.strictEqual(asked, before);
        assert.strictEqual(support.pointOf("e"), rested);
        // the whole drawing moved 1000 to the right: the point is where it was on its edge
        nodes.splice(0, 3, at(1000, 0), at(1100, 0), at(1050, 30));
        assert.isTrue(support.update(centers, ["e"], read, true));
        assert.closeTo(support.pointOf("e")?.x ?? 0, 1050, 0.1);
        assert.closeTo(support.pointOf("e")?.y ?? 0, -38.1, 0.1);
        assert.isNull(support.pointOf("other"));
    });

    it("come to rest on vis-network's siblings sample by their speed, well before the step limit", () => {
        // 284 edges among 200 nodes, several between the same two: the Barnes-Hut tree keeps every point trembling a
        // little, which once kept them moving until the 1500-step limit (39 frames) and ran out a stable-frame wait
        const url = new URL("../../../graph-io/test/corpus/styles/json/fidelity/vis-siblings.json", import.meta.url);
        const sample = JSON.parse(readFileSync(url, "utf8")) as {
            nodes: { id: string }[];
            edges: { from: string; to: string }[];
        };
        const index = new Map(sample.nodes.map((n, i) => [n.id, i]));
        let seed = 1;
        const random = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const nodes = sample.nodes.map(() => at(random() * 1500, random() * 1500));
        const edges = sample.edges
            .map((e) => [index.get(e.from) ?? 0, index.get(e.to) ?? 0] as const)
            .filter(([a, b]) => a !== b);
        const read = ([a, b]: readonly [number, number]): SupportEdge => ({
            src: nodes[a],
            dst: nodes[b],
            forces: BARNES_HUT,
        });
        const support = new SupportPoints<readonly [number, number]>();
        let frames = 0;
        while (frames < 100 && support.update(() => nodes, edges, read, frames === 0)) {
            frames++;
        }
        assert.isTrue(support.resting);
        assert.isAtMost(frames, 15, "at rest in 15 frames of 39 steps, not at the 1500-step limit");
        assert.isFalse(
            support.update(() => nodes, edges, read, false),
            "and it stays at rest",
        );
    });
});
