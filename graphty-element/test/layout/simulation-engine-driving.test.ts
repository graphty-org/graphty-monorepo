/**
 * The force layouts' bridge driven through the layout manager, with no renderer: the frames a
 * running ForceAtlas2, Spring or Spring Electrical layout is stepped through, the pins and drags a
 * reader makes while it runs, new data arriving under it and an accelerator taking it over; what
 * wakes a settled layout (a node's new size, new communities, a rebuild), the plane a 2D or 3D
 * layout publishes on, and a failed batch that lands after the layout was disposed.
 *
 * The bridge (`SimulationLayoutEngine`) is built only by `LayoutManager`, which hands it the
 * graph's acceleration controller, so every case here goes through the manager over a NullEngine
 * scene: a real data store, a real position array and the `@graphty/layout` simulation on the
 * CPU, or the fake accelerator's simulation where the case is about the accelerated path.
 */
// Registers the element's engines, which is what `setLayout` looks them up in.
import "../../src/layout/index";

import { NullEngine, Scene } from "@babylonjs/core";
import { makeMask, maskSet } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import type { GraphtyError } from "../../src/errors";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { MeshCache } from "../../src/meshes/MeshCache";
import type { Node } from "../../src/Node";
import { Styles } from "../../src/Styles";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";

interface Harness {
    readonly dataManager: DataManager;
    readonly manager: LayoutManager;
    readonly controller: AccelerationController;
    readonly errors: GraphtyError[];
    node(id: string): Node;
    at(id: string): { x: number; y: number; z: number };
    engine(): SimulationLayoutEngine;
}

const teardown: (() => void)[] = [];

afterEach(() => {
    for (const dispose of teardown.splice(0)) {
        dispose();
    }
});

/**
 * A layout manager over a NullEngine scene, holding a five-node ring.
 * @param policy - The acceleration policy.
 * @returns The harness.
 */
function harness(policy: "off" | "auto" | "required" = "off"): Harness {
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
    const controller = new AccelerationController({ policy, registry: new AcceleratorRegistry() });
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        manager,
        new MeshCache(),
        scene,
        new StatsManager(eventManager),
        {},
    );
    const withAcceleration = Object.assign(context, { getAcceleration: () => controller });
    dataManager.setGraphContext(withAcceleration);
    manager.setGraphContext(withAcceleration);
    teardown.push(() => {
        manager.dispose();
        controller.dispose();
        scene.dispose();
        engine.dispose();
    });

    const ids = ["a", "b", "c", "d", "e"];
    dataManager.addNodes(ids.map((id) => ({ id })));
    dataManager.addEdges(ids.map((src, i) => ({ src, dst: ids[(i + 1) % ids.length] })));

    return {
        dataManager,
        manager,
        controller,
        errors,
        node(id) {
            const n = dataManager.nodes.get(id);
            assert.isDefined(n, `${id} is a node`);
            return n;
        },
        at(id) {
            const out = { x: 0, y: 0, z: 0 };
            dataManager.positions.read(this.node(id).index, out);
            return out;
        },
        engine() {
            const e = manager.layoutEngine;
            assert.instanceOf(e, SimulationLayoutEngine, "the force layout runs on the bridge");
            return e;
        },
    };
}

/**
 * Steps the manager a number of frames.
 * @param h - The harness.
 * @param frames - How many.
 */
function frames(h: Harness, frames: number): void {
    for (let i = 0; i < frames; i++) {
        h.manager.step();
    }
}

describe("a force layout stepped on the CPU", () => {
    it("moves the nodes, counts its iterations and reports where it ran", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", { seed: 7 });
        const engine = h.engine();

        assert.isFalse(engine.isAccelerated);
        assert.strictEqual(engine.accelerator, "cpu");
        assert.strictEqual(engine.type, "forceatlas2");
        assert.isNotNull(engine.simulation);
        assert.isNull(engine.resolvedNodeMass, "no per-node record was given");
        assert.isFalse(engine.builtWithChanged(null), "built with nothing attached, and nothing is");

        const before = h.at("a");
        const done = engine.iterationsDone;
        frames(h, 5);
        assert.isAbove(engine.iterationsDone, done, "each frame submitted iterations");
        assert.notDeepEqual(h.at("a"), before, "and the node moved");
        assert.deepStrictEqual(engine.getNodePosition(h.node("a")), h.at("a"));

        const edge = h.dataManager.edges.values().next().value;
        assert.isDefined(edge);
        const pair = engine.getEdgePosition(edge);
        assert.deepStrictEqual({ ...pair.src }, h.at(edge.srcId as string));
        assert.deepStrictEqual({ ...pair.dst }, h.at(edge.dstId as string));
        assert.strictEqual([...engine.nodes].length, 5);
        assert.strictEqual([...engine.edges].length, 5);
    });

    it("holds a pinned node and a dragged one, and lets them go", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "spring", { seed: 3 });
        const engine = h.engine();
        const a = h.node("a");
        const b = h.node("b");

        a.pin();
        assert.isTrue(engine.pinnedMask.length > 0);
        const held = h.at("a");
        frames(h, 3);
        assert.deepStrictEqual(h.at("a"), held, "a pinned node is not moved by the simulation");

        engine.beginDrag(b);
        layoutEngineInternals.setNodePosition(engine, b, { x: 4, y: 5, z: 6 });
        assert.deepStrictEqual(h.at("b"), { x: 4, y: 5, z: 6 }, "the drag places it");
        layoutEngineInternals.setNodePosition(engine, b, { x: Number.NaN, y: 0 });
        assert.deepStrictEqual(h.at("b"), { x: 4, y: 5, z: 6 }, "a coordinate that is not finite is ignored");
        frames(h, 3);
        assert.deepStrictEqual(h.at("b"), { x: 4, y: 5, z: 6 }, "and the simulation does not move it while held");
        engine.endDrag(b, false);
        frames(h, 3);
        assert.notDeepEqual(h.at("b"), { x: 4, y: 5, z: 6 }, "let go, it moves again");

        a.unpin();
        frames(h, 3);
        assert.notDeepEqual(h.at("a"), held, "unpinned, the simulation moves it again");
    });

    it("stops submitting while paused, and reheats", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "spring", { seed: 1 });
        const engine = h.engine();
        h.manager.setPaused(true);
        assert.isTrue(engine.paused);
        h.manager.setPaused(false);
        assert.isFalse(engine.paused);
        engine.reheat();
        frames(h, 2);
        assert.isAbove(engine.iterationsDone, 0);
    });

    it("takes new data in without rebuilding, and the element's arrangement on a restore", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", { seed: 2 });
        const engine = h.engine();
        const { simulation } = engine;
        frames(h, 2);

        h.dataManager.addNodes([{ id: "f" }]);
        h.dataManager.addEdges([{ src: "a", dst: "f" }]);
        h.dataManager.getSnapshot();
        frames(h, 2);
        assert.strictEqual(engine.simulation, simulation, "the same simulation took the larger graph");
        assert.isTrue(Number.isFinite(h.at("f").x), "and placed the new node");

        h.manager.loadArrangement(true, true, true);
        assert.strictEqual(engine.simulation, simulation);
    });

    it("rebuilds on every load when the reader gave masses per node", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", {
            seed: 2,
            nodeMass: { a: 3, b: 1, c: 1, d: 1, e: 1 },
        });
        const engine = h.engine();
        assert.isNotNull(engine.resolvedNodeMass);
        const { simulation } = engine;
        h.dataManager.addNodes([{ id: "f" }]);
        h.dataManager.getSnapshot();
        assert.notStrictEqual(engine.simulation, simulation, "the masses were re-resolved over the new rows");
    });
});

describe("a force layout the CPU cannot run, or that is built wrong", () => {
    it("refuses Spring Electrical with no accelerator attached", async () => {
        const h = harness();
        let code: string | undefined;
        try {
            await layoutManagerInternals.setLayout(h.manager, "spring-electrical", { seed: 1 });
        } catch (error) {
            ({ code } = error as GraphtyError);
        }

        assert.strictEqual(code, "E_NO_ACCELERATOR", "spring-electrical has no CPU implementation");
    });

    it("refuses to be built without the acceleration controller", () => {
        let code: string | undefined;
        try {
            new SimulationLayoutEngine({});
        } catch (error) {
            ({ code } = error as GraphtyError);
        }

        assert.strictEqual(code, "E_INTERNAL");
    });
});

describe("a seeded force layout set through the layout slice", () => {
    it("draws from the seed rather than the arrangement the element held, keeping a pinned node", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "circular", {});
        h.node("a").pin();
        const pinned = h.at("a");
        const choice = { id: "fa2", engine: "forceatlas2", options: { seed: 9 }, dimension: "3d" } as const;
        await layoutManagerInternals.apply(h.manager, choice, { restoring: false });
        frames(h, 2);
        assert.deepStrictEqual(h.at("a"), pinned, "the pinned node kept its place");
        assert.isTrue(Number.isFinite(h.at("b").x), "and the rest were drawn from the seed");
    });

    it("holds the rows a scope leaves out, through a pin and its release", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", { seed: 9 });
        const engine = h.engine();
        const hold = makeMask(5);
        maskSet(hold, h.node("e").index, true);
        engine.setHoldMask(hold, 5);
        const outside = h.at("e");
        frames(h, 3);
        assert.deepStrictEqual(h.at("e"), outside, "a held node is not moved");
        h.node("e").pin();
        h.node("e").unpin();
        engine.beginDrag(h.node("e"));
        engine.endDrag(h.node("e"), false);
        frames(h, 1);
        assert.deepStrictEqual(h.at("e"), outside, "and neither an unpin nor a drag releases the hold");
    });
});

describe("a force layout on an accelerator", () => {
    /**
     * A harness with the fake accelerator attached.
     * @returns The harness and the fake.
     */
    function accelerated(): { h: Harness; fake: FakeAccelerator } {
        const h = harness("auto");
        const fake = createFakeAccelerator();
        h.controller.setAccelerator(fake);
        return { h, fake };
    }

    it("submits batches that land later, and reports where it ran", async () => {
        const { h, fake } = accelerated();
        await layoutManagerInternals.setLayout(h.manager, "spring-electrical", { seed: 4 });
        const engine = h.engine();
        assert.isTrue(engine.isAccelerated);
        assert.strictEqual(engine.precision, "f32");
        assert.isTrue(engine.builtWithChanged(null), "the accelerator leaving would rebuild it");
        assert.isFalse(engine.builtWithChanged(fake));

        frames(h, 1);
        assert.isTrue(engine.canLand, "a batch is in flight");
        await fake.flush();
        frames(h, 1);
        assert.isAtLeast(engine.landedBatches, 1, "the first batch landed");
        assert.isAtLeast(engine.landedBatchesPublished, 1, "and was published");

        engine.reheat();
        assert.strictEqual(fake.calls.reheat, 1, "the simulation was reheated");

        await engine.stepAsync(3);
        assert.isAtLeast(fake.calls.step, 2, "an awaited batch is a batch too");
    });

    it("hands the simulation each node's community and spacing", async () => {
        const { h, fake } = accelerated();
        h.dataManager.addNodes([{ id: "f", group: 1 }]);
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", {
            seed: 4,
            clusterBy: "group",
            nodeGap: 1,
        });
        const simulation = fake.simulations.at(-1);
        assert.isDefined(simulation);
        assert.isNotNull(simulation.clusters, "a node with a community is pulled toward it");
        frames(h, 1);
        await fake.flush();
        frames(h, 1);
        assert.isNotNull(simulation.collision, "and nodes are kept a gap apart");
    });

    it("reports a batch that failed and stops stepping", async () => {
        const { h, fake } = accelerated();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", { seed: 4 });
        const engine = h.engine();
        const simulation = fake.simulations.at(-1);
        assert.isDefined(simulation);
        simulation.fail("E_DEVICE_LOST");
        frames(h, 1);
        await fake.flush().catch(() => undefined);
        assert.isFalse(engine.canLand, "a failed batch leaves nothing to land");
        const steps = fake.calls.step;
        frames(h, 2);
        await engine.stepAsync(1);
        assert.strictEqual(fake.calls.step, steps, "and nothing more is submitted");
        assert.include(
            h.errors.map((e) => e.code),
            "E_DEVICE_LOST",
        );
    });

    it("does not report a batch that fails after the layout was disposed", async () => {
        const { h, fake } = accelerated();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", { seed: 4 });
        const engine = h.engine();
        const simulation = fake.simulations.at(-1);
        assert.isDefined(simulation);
        simulation.fail("E_DEVICE_LOST");
        frames(h, 1);
        assert.isTrue(engine.canLand, "the failing batch is in flight");
        engine.dispose();
        await fake.flush().catch(() => undefined);
        assert.deepStrictEqual(
            h.errors.map((e) => e.code),
            [],
            "nothing asked for that batch any more",
        );
    });
});

/**
 * Steps the manager until the layout settles, counting the frames it took.
 * @param h - The harness.
 * @param most - The most frames a settling run may take before the case fails.
 * @returns The frames stepped.
 */
function settle(h: Harness, most: number): number {
    let stepped = 0;
    while (!h.engine().isSettled && stepped < most) {
        h.manager.step();
        stepped += 1;
    }

    assert.isTrue(h.engine().isSettled, `the layout settled within ${most} frames`);
    return stepped;
}

describe("a force layout woken after it settled", () => {
    it("wakes for a node's new size only when nodeGap spaces nodes by size, and only once at rest", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "spring", { seed: 5, iterations: 5 });
        assert.isFalse(h.engine().spacesBySize);
        assert.isFalse(h.engine().wakeForResize(), "with no nodeGap a size means nothing to the layout");

        await layoutManagerInternals.setLayout(h.manager, "spring", { seed: 5, iterations: 5, nodeGap: 1 });
        const engine = h.engine();
        assert.isTrue(engine.spacesBySize);
        assert.isFalse(engine.isSettled);
        assert.isFalse(engine.wakeForResize(), "a running layout reads the new sizes at its next publish");

        settle(h, 100);
        assert.isTrue(engine.wakeForResize(), "a settled one is started again");
        assert.isFalse(engine.isSettled);
        const done = engine.iterationsDone;
        frames(h, 1);
        assert.isAbove(engine.iterationsDone, done, "and steps again");
    });

    it("rebuilds when the communities it clusters by change, and not when they read the same", async () => {
        const h = harness();
        let column: (number | null)[] = [0, 0, 1, 1, null];
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", {
            seed: 6,
            clusterBy: "results.test.community",
        });
        const engine = h.engine();
        let reads = 0;
        engine.clusterColumn = (): readonly unknown[] => {
            reads += 1;
            return column;
        };
        h.manager.clustersChanged();
        const clustered = engine.simulation;
        assert.isAtLeast(reads, 1, "the communities were read");

        h.manager.clustersChanged();
        assert.strictEqual(engine.simulation, clustered, "the same partition keeps the simulation");

        column = [0, 1, 0, 1, 2];
        h.manager.clustersChanged();
        assert.notStrictEqual(engine.simulation, clustered, "a new partition rebuilds it");
        assert.isFalse(engine.isSettled, "and runs it from the arrangement as it stands");
    });

    it("keeps a settled layout at rest across a rebuild asked to keep it, and runs one that was not", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "spring", { seed: 8, iterations: 5 });
        const engine = h.engine();
        settle(h, 100);
        const before = engine.simulation;

        engine.replaceSimulation(true);
        assert.notStrictEqual(engine.simulation, before, "a new simulation was built");
        assert.isTrue(engine.isSettled, "and it is still at rest");
        const done = engine.iterationsDone;
        await engine.stepAsync(3);
        assert.strictEqual(engine.iterationsDone, done, "a resting layout computes no pre-steps");

        engine.replaceSimulation();
        assert.isFalse(engine.isSettled, "a rebuild for new data runs");
    });
});

describe("where a force layout publishes its arrangement", () => {
    it("keeps a 2D layout on the plane of z = 0", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", { seed: 2, dim: 2 });
        frames(h, 3);
        for (const id of ["a", "b", "c", "d", "e"]) {
            assert.strictEqual(h.at(id).z, 0, `${id} is on the plane`);
        }
    });

    it("lifts a flat arrangement into depth for a 3D layout, leaving a pinned node where it was", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "circular", { dim: 2 });
        for (const id of ["a", "b", "c", "d", "e"]) {
            assert.strictEqual(h.at(id).z, 0, "the circle is flat");
        }

        h.node("a").pin();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", { dim: 3 });
        frames(h, 1);
        assert.strictEqual(h.at("a").z, 0, "the pinned node keeps its depth");
        assert.isTrue(
            ["b", "c", "d", "e"].some((id) => h.at(id).z !== 0),
            "the free nodes were drawn off the plane",
        );
    });

    it("measures the same envelope by walking the rows when no device measured one", async () => {
        const h = harness();
        await layoutManagerInternals.setLayout(h.manager, "forceatlas2", { seed: 3 });
        frames(h, 2);
        const agreement = h.engine().envelopeAgreement();
        assert.isNotNull(agreement);
        assert.isNull(agreement.device, "a CPU simulation has no device to measure on");
        assert.strictEqual(agreement.walked.placed, 5, "every row was walked");
        assert.isAbove(agreement.walked.scale, 0);
    });
});
