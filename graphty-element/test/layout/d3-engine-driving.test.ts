/**
 * The d3 force layout driven through the layout manager, with no renderer: `nodeGap` parting nodes
 * by their drawn size and waking for a new size, `clusterBy` pulling communities together and waking
 * when they change, a lift into depth, a pin released, a scope's hold, and the rows d3 steps under
 * renderPath "batched", where a stored row has no `Node` of its own.
 *
 * The `Node` cases go through `LayoutManager` over a NullEngine scene, with a real data store and a
 * real position array. The row cases hand a d3 engine the store's rows as the manager hands them
 * when it draws rows batched (`addRows`, `addEdgeRows`), over the same real store and array.
 */
// Registers the element's engines, which is what `setLayout` looks them up in.
import "../../src/layout/index";

import { NullEngine, Scene } from "@babylonjs/core";
import { makeMask, maskSet } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import { WRITABLE_LANE } from "../../src/data/lane";
import type { GraphtyError } from "../../src/errors";
import { D3GraphEngine, type RowExtent } from "../../src/layout/D3GraphLayoutEngine";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Styles } from "../../src/Styles";
import { fakeEdge, fakeNode } from "../helpers/layout-fakes";

interface Harness {
    readonly dataManager: DataManager;
    readonly manager: LayoutManager;
    readonly errors: GraphtyError[];
    rowOf(id: string): number;
    at(id: string): { x: number; y: number; z: number };
    engine(): D3GraphEngine;
}

const teardown: (() => void)[] = [];

afterEach(() => {
    for (const dispose of teardown.splice(0)) {
        dispose();
    }
});

/**
 * A layout manager over a NullEngine scene, holding a ring.
 * @param ids - The nodes, in a ring.
 * @returns The harness.
 */
function harness(ids: readonly string[]): Harness {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const styles = Styles.default();
    const eventManager = new EventManager();
    const errors: GraphtyError[] = [];
    eventManager.onGraphError.add((e) => {
        if (e.type === "error") {
            errors.push(e.error as GraphtyError);
        }
    });
    const dataManager = new DataManager(eventManager, styles);
    const manager = new LayoutManager(eventManager, dataManager, styles);
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        manager,
        new MeshCache(),
        scene,
        new StatsManager(eventManager),
        {},
    );
    dataManager.setGraphContext(context);
    manager.setGraphContext(context);
    teardown.push(() => {
        manager.dispose();
        scene.dispose();
        engine.dispose();
    });

    dataManager.addNodes(ids.map((id) => ({ id, group: id < "c" ? 0 : 1 })));
    dataManager.addEdges(ids.map((src, i) => ({ src, dst: ids[(i + 1) % ids.length] })));

    const rowOf = (id: string): number => {
        const row = dataManager.getSnapshot().ids.indexOf(id);
        assert.isAtLeast(row, 0, `${id} has a row`);
        return row;
    };

    return {
        dataManager,
        manager,
        errors,
        rowOf,
        at(id) {
            const out = { x: 0, y: 0, z: 0 };
            dataManager.positions.read(rowOf(id), out);
            return out;
        },
        engine() {
            const e = manager.layoutEngine;
            assert.instanceOf(e, D3GraphEngine, "the d3 layout runs");
            return e;
        },
    };
}

/** The most frames a run is stepped toward rest: d3's default decay rests in about a hundred. */
const MAX_FRAMES = 2000;

/**
 * Step the layout until it rests, at most {@link MAX_FRAMES} frames.
 * @param h - The harness.
 * @returns How many frames it took.
 */
function settle(h: Harness): number {
    const engine = h.engine();
    let frames = 0;
    h.dataManager.getSnapshot();
    while (!engine.isSettled && frames < MAX_FRAMES) {
        engine.step();
        frames++;
    }

    assert.isTrue(engine.isSettled, `the layout rested within ${String(MAX_FRAMES)} frames`);
    return frames;
}

function distance(p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }): number {
    return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
}

const RING = ["a", "b", "c", "d", "e"];

/** How far a row reaches, as the row table measured it, where it is not a sphere of radius 1. */
const EXTENTS = new Map<string, RowExtent | null>([
    ["a", { radius: 1, half: { x: 1, y: 2, z: 3 } }],
    ["e", null],
]);

describe("d3 with nodeGap", () => {
    it("parts nodes by their drawn size at rest, and wakes for a new size only once at rest", async () => {
        const h = harness(RING);
        await layoutManagerInternals.setLayout(h.manager, "d3", { nodeGap: 4, dim: 2 });
        const engine = h.engine();
        assert.isTrue(engine.spacesBySize);
        assert.isFalse(engine.wakeForResize(), "a running layout reads new sizes at its next refresh");
        settle(h);

        const reach = (id: string): number => (h.dataManager.nodes.get(id)?.spacingRadius(true) ?? 0) + 2;
        for (const [i, p] of RING.entries()) {
            for (const q of RING.slice(i + 1)) {
                assert.isAtLeast(
                    distance(h.at(p), h.at(q)) + 1e-6,
                    reach(p) + reach(q) - 0.05,
                    `${p} and ${q} keep the gap`,
                );
            }

            assert.strictEqual(h.at(p).z, 0, "a 2D layout stays on the plane");
        }

        assert.isTrue(engine.wakeForResize(), "a resting layout is started again");
        assert.isFalse(engine.isSettled);
        assert.isAbove(settle(h), 0, "and steps again");
    });

    it("never wakes for a size without nodeGap", async () => {
        const h = harness(RING);
        await layoutManagerInternals.setLayout(h.manager, "d3", {});
        assert.isFalse(h.engine().spacesBySize);
        settle(h);
        assert.isFalse(h.engine().wakeForResize());
    });
});

describe("d3 with clusterBy", () => {
    it("steps with communities read from the nodes or a session column, and wakes only when they change", async () => {
        for (const dim of [2, 3] as const) {
            const h = harness(RING);
            await layoutManagerInternals.setLayout(h.manager, "d3", { clusterBy: "group", clusterStrength: 1, dim });
            settle(h);
            assert.isFalse(h.engine().wakeForClusters(), `${String(dim)}D: the same communities wake nothing`);

            // A session path: the communities come from the element's column of run results.
            await layoutManagerInternals.setLayout(h.manager, "d3", {
                clusterBy: "results.test.community",
                clusterStrength: 1,
                dim,
            });
            const engine = h.engine();
            let column: (number | null)[] = [0, 0, 1, 1, null];
            let reads = 0;
            engine.clusterColumn = (): readonly unknown[] => {
                reads += 1;
                return column;
            };
            h.manager.clustersChanged();
            assert.isAtLeast(reads, 1, "the communities were read again");
            assert.isFalse(engine.isSettled, "new communities start the layout again");
            settle(h);

            column = [0, 0, 1, 1, null];
            assert.isFalse(engine.wakeForClusters(), "read the same: nothing to move");
            column = [1, 1, 0, 0, 0];
            assert.isTrue(engine.wakeForClusters(), "changed: the layout moves again");
            settle(h);
            assert.deepEqual(h.errors, []);
        }
    });
});

describe("d3 woken and held", () => {
    it("is woken by a lift into depth and by releasing a pin", async () => {
        const h = harness(RING);
        await layoutManagerInternals.setLayout(h.manager, "d3", {});
        const engine = h.engine();
        settle(h);
        assert.isTrue(engine.wakeForLift());
        engine.step();
        assert.isFalse(engine.isSettled, "a lift reheats the simulation at its next step");
        settle(h);

        const a = h.dataManager.nodes.get("a");
        assert.isDefined(a);
        a.pin();
        a.unpin();
        engine.step();
        assert.isFalse(engine.isSettled, "a released node moves again");
        settle(h);
    });

    it("holds the rows a scope leaves out, and a following group pushes nothing", async () => {
        const h = harness(RING);
        await layoutManagerInternals.setLayout(h.manager, "d3", { nodeGap: 1 });
        const engine = h.engine();
        settle(h);
        const e = h.rowOf("e");
        const held = h.at("e");
        const hold = makeMask(5);
        maskSet(hold, e, true);
        layoutEngineInternals.setFollowers(engine, new Set([h.rowOf("d")]));
        engine.setHoldMask(hold, 5);
        engine.wakeForLift();
        engine.step();
        assert.isFalse(engine.isSettled, "the scoped run steps again");
        settle(h);
        assert.deepEqual(h.at("e"), held, "the held row stays where it was");
        engine.setHoldMask(null, 5);
        layoutEngineInternals.setFollowers(engine, null);
        engine.wakeForLift();
        settle(h);
    });
});

describe('d3 under renderPath "batched"', () => {
    /**
     * A d3 engine handed every row of a five-node ring as a row with no `Node`, as the layout manager
     * hands them when it draws rows batched: the store and its position array are real.
     * @param options - The engine's options.
     * @returns The engine, the store and the row readers.
     */
    function rowEngine(options: Record<string, unknown>): {
        engine: D3GraphEngine;
        dm: DataManager;
        rowOf: (id: string) => number;
        at: (id: string) => { x: number; y: number; z: number };
    } {
        const h = harness(RING);
        const dm = h.dataManager;
        const engine = new D3GraphEngine(options);
        layoutEngineInternals.attachPositions(engine, dm[WRITABLE_LANE]);
        engine.storeRowOf = (id) => dm.getSnapshot().ids.indexOf(id);
        engine.rowRecord = (row) => ({ group: row < 2 ? 0 : 1 });
        engine.addRows(RING, {
            getSnapshot: () => dm.getSnapshot(),
            positions: dm[WRITABLE_LANE],
            // A box for "a", "e" not measured yet, a sphere for the rest.
            extentOf: (id) => EXTENTS.get(String(id)) ?? { radius: 1, half: null },
        });
        engine.addEdgeRows(RING.map((src, i) => ({ key: `r${String(i)}`, source: src, target: RING[(i + 1) % 5] })));
        return { engine, dm, rowOf: h.rowOf, at: h.at };
    }

    function rest(engine: D3GraphEngine): void {
        for (let frame = 0; frame < MAX_FRAMES && !engine.isSettled; frame++) {
            engine.step();
        }

        assert.isTrue(engine.isSettled, `the layout rested within ${String(MAX_FRAMES)} frames`);
    }

    it("steps and publishes every row, spaced by the row table and clustered by the row's record", () => {
        const { engine, dm, rowOf, at } = rowEngine({ nodeGap: 2, clusterBy: "group", dim: 2 });
        assert.isTrue(engine.graphNeedsRefresh);
        rest(engine);
        for (const id of RING) {
            assert.isTrue(dm.positions.isPlaced(rowOf(id)), `${id} is placed by row`);
            assert.strictEqual(at(id).z, 0, "a 2D layout stays on the plane");
        }

        // b, c and d are spheres of radius 1, kept 2 apart surface to surface.
        assert.isAtLeast(distance(at("b"), at("c")), 1 + 1 + 2 - 0.05);
        assert.isAtLeast(distance(at("c"), at("d")), 1 + 1 + 2 - 0.05);
        assert.deepEqual(layoutEngineInternals.edgeProblems(engine, new Map()), []);
    });

    it("holds a scope's rows where the array has them, and takes a restored arrangement", () => {
        const { engine, dm, rowOf, at } = rowEngine({ nodeGap: 1 });
        rest(engine);
        const c = rowOf("c");
        dm[WRITABLE_LANE].write(c, 11, 22, 33);
        const hold = makeMask(5);
        maskSet(hold, c, true);
        layoutEngineInternals.setFollowers(engine, new Set([rowOf("d")]));
        engine.setHoldMask(hold, 5);
        // The hold moved the row's body, which reheats the next step.
        engine.step();
        assert.isFalse(engine.isSettled);
        rest(engine);
        assert.deepEqual(at("c"), { x: 11, y: 22, z: 33 }, "a held row stays where the array put it");

        engine.setHoldMask(null, 5);
        layoutEngineInternals.setFollowers(engine, null);
        const b = rowOf("b");
        dm[WRITABLE_LANE].write(b, -5, 6, 7);
        engine.loadArrangement();
        engine.publishPositions();
        assert.deepEqual(at("b"), { x: -5, y: 6, z: 7 }, "the restored place survives the next publish");
    });

    it("gives a row's late Node and Edge the body and link the row already has", () => {
        const { engine, rowOf } = rowEngine({});
        // Adopted before the first refresh: the link has not reached the simulation yet.
        const early = fakeEdge("a", "b", { id: "r0" });
        assert.isTrue(engine.adoptEdgeRow("r0", early));
        assert.isFalse(engine.adoptEdgeRow("missing", early), "no link carries that id");
        rest(engine);

        const late = fakeEdge("b", "c", { id: "r1" });
        assert.isTrue(engine.adoptEdgeRow("r1", late));
        assert.sameMembers([...engine.edges], [early, late]);
        const a = fakeNode("a", { index: rowOf("a"), isPinned: () => false });
        const hold = makeMask(5);
        maskSet(hold, rowOf("a"), true);
        engine.setHoldMask(hold, 5);
        layoutEngineInternals.addNode(engine, a);
        assert.isFalse(engine.graphNeedsRefresh, "the Node took over the row's body: nothing to refresh");
        const edgeAt = engine.getEdgePosition(early);
        const nodeAt = engine.getNodePosition(a);
        assert.closeTo(edgeAt.src.x, nodeAt.x, 1e-4, "the link pulls on the body the Node took over");
        assert.deepEqual(
            layoutEngineInternals.edgeProblems(
                engine,
                new Map([
                    ["r0", early],
                    ["r1", late],
                ]),
            ),
            [],
        );
    });

    it("resets a row added again, lets rows and their links go, and keeps stepping", () => {
        const { engine, dm, rowOf } = rowEngine({});
        rest(engine);
        engine.addRows(["b"], { getSnapshot: () => dm.getSnapshot(), positions: dm[WRITABLE_LANE] });
        assert.isTrue(engine.graphNeedsRefresh, "the row comes back to the next refresh");
        rest(engine);

        engine.removeRows(["e", "unknown"]);
        engine.removeEdgeRows(["r0", "unknown"]);
        rest(engine);
        for (const id of ["a", "b", "c", "d"]) {
            assert.isTrue(dm.positions.isPlaced(rowOf(id)));
        }

        assert.deepEqual(layoutEngineInternals.edgeProblems(engine, new Map()), []);
    });
});
