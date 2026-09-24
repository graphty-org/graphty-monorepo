/**
 * The layout bridge: one `LayoutEngine` over `@graphty/layout`'s simulation seam, driven by the
 * element's acceleration controller.
 *
 * Every case here is about the JOIN rather than about a layout: whether an accelerator arriving
 * or leaving mid-run keeps the arrangement and the pins, whether a freeze reaches the running
 * simulation before anything frees the snapshot it was laying out, whether a rejected batch is
 * reported once and stops the stepping, and whether the `required` policy stops the layout
 * instead of quietly finishing it on the CPU. The accelerator is the deterministic fake, so a
 * result never depends on a device, a driver or how many frames the browser happened to render.
 *
 * They run in the browser because they need a real `Graph`: the controller, the data manager and
 * the position array are all its, and the frame loop is what the bridge is written against. The
 * loop itself is STOPPED in the fixture, so every assertion follows a step this file asked for.
 *
 * The layout is set the way a consumer sets one, by name: `forceatlas2`, `spring` and
 * `spring-electrical` are declared over the bridge, so `setLayout` is what builds it, with the
 * graph's own controller and the graph's own error channel.
 */
import { type F32, maskTest } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import { type GraphtyError, isGraphtyError } from "../../src/errors";
import type { GraphErrorEvent } from "../../src/events";
import { Graph } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { createFakeAccelerator, type FakeAccelerator, type FakeSimulation } from "../../src/testing/fakeAccelerator";
import { cleanupE2EGraph, createE2EGraph } from "../helpers/e2e-graph-setup";

/** Graphs a case built, shut down after it whether it passed or not. */
const graphs: Graph[] = [];

/** One graph, one bridge over it, and the error channel a failure is reported on. */
interface Rig {
    graph: Graph;
    engine: SimulationLayoutEngine;
    /** Every graph `error` event the case has seen, oldest first. */
    errors: GraphErrorEvent[];
    /**
     * One frame's worth of layout: submit a batch, then publish.
     *
     * BOTH HALVES, because the simulation runs in an array of its own and `publishPositions()` is
     * what maps it into the element's scene units -- so a case that only stepped would read the
     * coordinates of the frame before. `LayoutManager.step()` is these same two calls.
     */
    step: () => void;
    /**
     * A node's current x, in scene units, out of the element's own position array.
     *
     * Published first, for the same reason {@link Rig.step} publishes: an accelerated batch lands
     * after the step that submitted it, so a case that drained the fake and then read would
     * otherwise be reading the frame before. Publishing twice over an unchanged arrangement writes
     * the same numbers, so "nothing moved" still means nothing moved.
     */
    x: (row: number) => number;
    /** A node's current scene-unit position; published first, like {@link Rig.x}. */
    at: (row: number) => { x: number; y: number; z: number };
    /** The dense row of a node, which a freeze may renumber. */
    row: (id: string) => number;
}

/**
 * Builds a graph of `count` nodes in a path, with the render loop stopped.
 * @param count - How many nodes.
 * @returns The graph.
 */
async function pathGraph(count: number): Promise<Graph> {
    const ids = Array.from({ length: count }, (_value, index) => `n${String(index)}`);
    const { graph } = await createE2EGraph({
        nodes: ids.map((id) => ({ id })),
        edges: ids.slice(1).map((id, index) => ({ src: ids[index], dst: id })),
        enableAi: false,
    });
    graphs.push(graph);

    // DETERMINISM, not speed. With the loop running, every await in a case would step the
    // simulation an unknown number of times, and a counter assertion would be a race.
    graph.engine.stopRenderLoop();

    return graph;
}

/**
 * Watches a graph's error channel, which is where a layout failure is reported.
 *
 * The same channel `LayoutManager.reportLayoutFailure` publishes on, and the one the element
 * forwards to the DOM as `CustomEvent("error")` with `detail.context === "layout"`.
 * @param graph - The graph to listen to.
 * @returns Every graph `error` event seen since, oldest first.
 */
function watchErrors(graph: Graph): GraphErrorEvent[] {
    const errors: GraphErrorEvent[] = [];
    graph.getEventManager().onGraphEvent.add((event) => {
        if (event.type === "error") {
            errors.push(event);
        }
    });

    return errors;
}

/**
 * Sets one of the three force layouts on a graph by name and hands back the bridge behind it.
 * @param graph - The graph to lay out.
 * @param layout - Which registered layout name to set.
 * @param options - Layout options, as a consumer would pass them to `setLayout`.
 * @returns The rig.
 */
async function bridge(graph: Graph, layout = "forceatlas2", options: object = {}): Promise<Rig> {
    const errors = watchErrors(graph);

    await graph.setLayout(layout, options);

    const engine = graph.getLayoutManager().layoutEngine;
    assert.instanceOf(engine, SimulationLayoutEngine, `"${layout}" resolves to the simulation bridge`);

    const read = { x: 0, y: 0, z: 0 };
    return {
        graph,
        engine,
        errors,
        step: (): void => {
            engine.step();
            engine.publishPositions();
        },
        x: (rowIndex: number): number => {
            engine.publishPositions();
            graph.getDataManager().positions.read(rowIndex, read);
            return read.x;
        },
        at: (rowIndex: number): { x: number; y: number; z: number } => {
            engine.publishPositions();
            const out = { x: 0, y: 0, z: 0 };
            graph.getDataManager().positions.read(rowIndex, out);
            return out;
        },
        row: (id: string): number => graph.getDataManager().getNode(id)?.index ?? -1,
    };
}

/**
 * A row's x in the SIMULATION's own units, off a fake that is running the layout.
 *
 * WHY NOT THE PUBLISHED ARRAY. This fake's movement is a rigid translation -- every unfixed row
 * slides the same distance along x -- and a rigid translation is exactly what the bridge's refit
 * removes on the way out, because the arrangement's centre slides with it. So "did a batch move
 * the graph" is a question only the simulation's own array can answer. A real layout deforms the
 * arrangement and shows up in both.
 * @param simulation - The fake simulation to read, which holds the array the bridge handed it.
 * @param row - The dense row to read.
 * @returns The x coordinate, in the simulation's units.
 */
function rawX(simulation: FakeSimulation | undefined, row: number): number {
    const positions = simulation?.positions;
    assert.isNotNull(positions ?? null, "the fake simulation is holding the bridge's array");

    return (positions as F32)[3 * row];
}

/**
 * A row's whole coordinate in the SIMULATION's own units, off a fake that is running the layout.
 *
 * The three components of {@link rawX}, for the cases that are about the MAP between the two unit
 * systems rather than about movement: the scale is one number but the centre is three, so a case
 * that only read x would leave two thirds of the map unpinned.
 * @param simulation - The fake simulation to read, which holds the array the bridge handed it.
 * @param row - The dense row to read.
 * @returns Its simulation-unit position.
 */
function rawAt(simulation: FakeSimulation | undefined, row: number): { x: number; y: number; z: number } {
    const positions = simulation?.positions;
    assert.isNotNull(positions ?? null, "the fake simulation is holding the bridge's array");

    const raw = positions as F32;
    return { x: raw[3 * row], y: raw[3 * row + 1], z: raw[3 * row + 2] };
}

/**
 * How far the furthest of these rows sits from their own centre, in scene units.
 *
 * The published radius of a part of the graph, which is what the refit fits to `scalingFactor` --
 * so it is also what a case asking "did something else resize these rows" measures.
 * @param rig - The rig to read the rows from.
 * @param rows - The dense rows to measure.
 * @returns The scene-unit radius.
 */
function spread(rig: Rig, rows: readonly number[]): number {
    const places = rows.map((row) => rig.at(row));
    const centre = places.reduce(
        (total, place) => ({
            x: total.x + place.x / places.length,
            y: total.y + place.y / places.length,
            z: total.z + place.z / places.length,
        }),
        { x: 0, y: 0, z: 0 },
    );

    return places.reduce(
        (furthest, place) => Math.max(furthest, Math.hypot(place.x - centre.x, place.y - centre.y, place.z - centre.z)),
        0,
    );
}

/**
 * A number that describes an arrangement's shape and nothing about its size or its position.
 *
 * The ratio of two distances, which the envelope map -- a uniform scale about a moving centre --
 * cannot change. A row that was reseeded instead of carried would land somewhere unrelated and
 * change it.
 * @param rig - The rig whose first three rows are measured.
 * @returns The ratio of the row 0 to row 1 distance against the row 0 to row 2 distance.
 */
function shape(rig: Rig): number {
    const a = rig.at(0);
    const b = rig.at(1);
    const c = rig.at(2);

    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) / Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z);
}

/**
 * Awaits every batch in flight, including the ones armed to reject.
 * @param fake - The accelerator to drain.
 */
async function drain(fake: FakeAccelerator): Promise<void> {
    await fake.flush().catch(() => undefined);
}

/**
 * Waits for a condition the controller reaches on its own.
 * @param predicate - What has to become true.
 */
async function until(predicate: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 200 && !predicate(); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5));
    }

    assert.isTrue(predicate(), "the condition never became true");
}

afterEach(() => {
    while (graphs.length > 0) {
        graphs.pop()?.shutdown();
    }

    cleanupE2EGraph();
});

describe("the simulation layout bridge", () => {
    it("the frame loop walks the graph's own nodes and edges, so the meshes follow the simulation", async () => {
        const graph = await pathGraph(5);
        const rig = await bridge(graph);
        const layout = graph.getLayoutManager();

        // What `UpdateManager` iterates. A bridge that kept no list of its own and answered these
        // with nothing would let the simulation rewrite the position array every frame while not
        // one mesh moved, no bounding box was computed and the camera never framed the graph.
        assert.lengthOf(Array.from(layout.nodes), 5, "every node reaches the frame loop");
        assert.lengthOf(Array.from(layout.edges), 4, "and every edge");

        const node = graph.getDataManager().getNode("n0");
        assert.isDefined(node);
        const before = node.mesh.position.x;

        for (let step = 0; step < 20; step += 1) {
            rig.step();
        }

        // The frame, in the one line of it this is about: `updateNodes()` is this loop.
        for (const each of layout.nodes) {
            each.update();
        }

        assert.notStrictEqual(node.mesh.position.x, before, "the mesh followed the simulation");
        assert.strictEqual(node.mesh.position.x, rig.x(node.index), "to the row the simulation wrote");
    });

    it("the controller reads active while the accelerated simulation is stepping, and idle once it settles", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator({ settleAfter: 1 });
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph);
        assert.isTrue(rig.engine.isAccelerated, "the fake is running the layout");
        assert.strictEqual(graph.acceleration.state, "idle", "attached, and nothing has been stepped yet");

        rig.step();

        // WHAT A STATUS CHIP SHOWS WHILE THE DEVICE IS BUSY. A layout is not a `run()`, so the
        // controller only knows work is on the accelerator because the bridge tells it; without
        // that the state says "idle" -- documented as nothing using the accelerator -- for the
        // whole of a GPU layout.
        assert.strictEqual(graph.acceleration.state, "active", "a batch is in flight on the accelerator");

        await drain(fake);
        await until(() => graph.acceleration.state === "idle");
        assert.isTrue(rig.engine.isSettled, "and it is idle because the arrangement came to rest");
    });

    it("a fake accelerator injected AFTER the bridge was loaded engages the GPU simulation on the running layout", async () => {
        const graph = await pathGraph(5);
        const rig = await bridge(graph);

        assert.isFalse(rig.engine.isAccelerated, "nothing is attached, so the CPU simulation runs");
        rig.step();
        rig.step();
        const carried = rig.x(0);

        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);

        assert.isTrue(rig.engine.isAccelerated, "the transition swapped the simulation onto the accelerator");
        assert.strictEqual(fake.calls.forceAtlas2, 1, "one simulation was built on the fake");
        assert.strictEqual(rig.x(0), carried, "the arrangement continued; no row was reset");
    });

    it("the accelerator removed mid-run hands the layout to the CPU with positions and pins preserved", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph);
        assert.isTrue(rig.engine.isAccelerated);

        const pinned = graph.getDataManager().getNode("n2");
        assert.isDefined(pinned);
        pinned.pin();
        const held = rig.x(pinned.index);

        graph.acceleration.setAccelerator(null);
        assert.isFalse(rig.engine.isAccelerated, "with nothing attached the layout continues on the CPU");

        const moved = rig.x(0);
        for (let step = 0; step < 20; step += 1) {
            rig.step();
        }

        assert.strictEqual(rig.x(pinned.index), held, "the pinned row did not move on the CPU simulation");
        assert.notStrictEqual(rig.x(0), moved, "an unpinned row did");
    });

    it("pin A, remove B < A, freeze, reload -> A is still fixed", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph);
        const pinned = graph.getDataManager().getNode("n3");
        assert.isDefined(pinned);
        pinned.pin();
        assert.isTrue(maskTest(rig.engine.pinnedMask, pinned.index));

        await graph.removeNodes(["n1"]);
        graph.getDataManager().getSnapshot();

        const renumbered = rig.row("n3");
        assert.isAbove(renumbered, -1, "the pinned node survived the removal");
        assert.isTrue(maskTest(rig.engine.pinnedMask, renumbered), "the reload re-packed the pin at its new row");

        const held = rig.x(renumbered);
        for (let step = 0; step < 5; step += 1) {
            rig.step();
        }

        await drain(fake);
        assert.strictEqual(rig.x(renumbered), held, "and the simulation still holds it still");
    });

    it("a saturated step returns the same promise and .catch is attached once", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator({ maxInFlight: 1 });
        graph.acceleration.setAccelerator(fake);

        // THROUGH THE LAYOUT'S OWN OPTIONS, because that is where the ceiling the simulation runs
        // under comes from: `behavior.layout.maxInFlight` defaults to two, and a value set on one
        // layout beats it.
        const rig = await bridge(graph, "forceatlas2", { maxInFlight: 1 });

        rig.step();
        rig.step();
        rig.step();
        assert.strictEqual(fake.calls.step, 1, "two of the three calls landed on the batch already in flight");
        await drain(fake);

        fake.fail("E_DEVICE_LOST");
        rig.step();
        rig.step();
        rig.step();
        await drain(fake);

        const reported = rig.errors.filter((event) => event.context === "layout");
        assert.lengthOf(reported, 1, "one rejection, one report");
    });

    it("pays every pre-step owed by a layout set up over an empty graph, instead of coalescing all but the first couple away", async () => {
        // THE OWED COUNT IS PAID FROM INSIDE THE FRAME LOOP. A layout set up before the data
        // arrived -- which is every element whose `nodeData` is assigned, or that is pointed at a
        // URL -- cannot spend its pre-steps when it is built, so they are owed and spent on the
        // first frame that has a node to move. An accelerated step is a batch that is submitted
        // and not waited for, and a simulation already holding a couple of them returns the
        // oldest rather than submitting another, so a thousand of them in a tight synchronous
        // loop are two batches of work and nine hundred and ninety-eight dropped on the floor --
        // silently, because a coalesced batch is not an error and the graph is simply drawn less
        // arranged than the consumer asked for.
        //
        // MEASURED IN BATCHES THE FAKE ACTUALLY SAW, not in distance moved: the bridge rescales
        // what it publishes and re-adopts the arrangement at a freeze, so a coordinate is not a
        // step counter. The fake counts a SUBMISSION, so a call that landed on a batch already in
        // flight is not counted -- which is exactly the difference under test.
        const chunk = 256; // The element's own MAX_ITERATIONS_PER_STEP_CHUNK.
        const chunks = 4;
        const owed = chunks * chunk;
        const graph = await pathGraph(0);

        // Far more landed batches than this case produces, so nothing reports itself settled
        // before the owed count has been spent.
        const fake = createFakeAccelerator({ settleAfter: 100 });
        graph.acceleration.setAccelerator(fake);
        graph.styles.config.behavior.layout.preSteps = owed;

        const rig = await bridge(graph);
        assert.isTrue(rig.engine.isAccelerated, "the fake is running the layout");
        assert.strictEqual(fake.calls.step, 0, "an empty graph has nothing to step, so the count is still owed");

        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);

        // The frame at which there is finally something to move. The render loop is stopped, so
        // this is the only frame there is, and every batch below is one this line asked for.
        graph.getLayoutManager().step();

        // A chunk is submitted only once the one before it has landed, so waiting for whatever is
        // in flight right now would return in the middle of the run.
        for (let attempt = 0; attempt < 200 && fake.calls.resolved < chunks; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 5));
        }

        assert.isAtLeast(
            fake.calls.resolved,
            chunks,
            `the layout was configured with ${String(owed)} pre-steps and could not spend them over an empty ` +
                `graph, so it owed them to the first frame that had something to move. That frame computed ` +
                `${String(fake.calls.resolved)} of the ${String(chunks)} batches the count comes to`,
        );
    });

    it("device loss: the error is reported with E_DEVICE_LOST, the controller reaches error, and that transition puts the running layout on the CPU", async () => {
        const graph = await pathGraph(5);
        let loseDevice: (loss: { reason: string }) => void = () => undefined;
        const lost = new Promise<{ reason: string }>((resolve) => {
            loseDevice = resolve;
        });
        const fake = createFakeAccelerator({ lost });
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph);
        assert.isTrue(rig.engine.isAccelerated);

        fake.fail("E_DEVICE_LOST");
        rig.step();
        await drain(fake);

        const reported = rig.errors.filter((event) => event.context === "layout");
        assert.lengthOf(reported, 1, "the rejected batch was reported on the layout");
        assert.strictEqual(
            (reported[0].error as GraphtyError).code,
            "E_DEVICE_LOST",
            "with the code the accelerator gave it, not a code the element invented",
        );

        loseDevice({ reason: "the test lost it" });
        await until(() => graph.acceleration.status.state === "error");

        assert.isFalse(rig.engine.isAccelerated, "the transition handed the running layout to the CPU");
        const before = rig.x(0);
        for (let step = 0; step < 5; step += 1) {
            rig.step();
        }

        assert.notStrictEqual(rig.x(0), before, "and stepping resumed");
    });

    it("the freeze init() itself asks for does not build a second simulation behind it", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);

        // The store is DIRTY when the layout is set, which is the ordinary case for a layout set
        // from the element's attribute: `init()` calls `getSnapshot()`, the freeze emits
        // `snapshot-replaced` synchronously, and the manager is already listening.
        await graph.addNodes([{ id: "late" }]);

        const rig = await bridge(graph);

        assert.strictEqual(fake.simulations.length, 1, "one plan, one simulation");
        assert.strictEqual(fake.calls.load, 1, "and one graph upload");
        assert.strictEqual(rig.engine.simulation, fake.simulations[0]);
    });

    it("a batch rejected AFTER its simulation was replaced is reported once and does not stop the one that replaced it", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph);
        assert.isTrue(rig.engine.isAccelerated);

        // The batch is submitted and armed to reject, and the swap happens while it is still in
        // flight -- which is what a lost device does with `maxInFlight` batches outstanding.
        fake.fail("E_DEVICE_LOST");
        rig.step();
        graph.acceleration.setAccelerator(null);
        assert.isFalse(rig.engine.isAccelerated, "the transition put the layout on the CPU");

        await drain(fake);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const reported = rig.errors.filter((event) => event.context === "layout");

        // REPORTED, although the simulation it came from is gone: which of the device loss and an
        // outstanding readback settles first is not ordered, and a failure the consumer hears
        // about only on one side of that race is not a report.
        assert.lengthOf(reported, 1, "the dead simulation's rejection was reported once");
        assert.strictEqual((reported[0].error as GraphtyError).code, "E_DEVICE_LOST");

        const before = rig.x(0);
        for (let step = 0; step < 5; step += 1) {
            rig.step();
        }

        assert.notStrictEqual(rig.x(0), before, "and the CPU simulation that replaced it still steps");
    });

    it("a snapshot replacement reloads the same simulation with the new node count and reseeds only the new rows", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph);
        assert.strictEqual(fake.calls.load, 1);
        const carried = shape(rig);

        await graph.addNodes([{ id: "late" }]);
        graph.getDataManager().getSnapshot();

        assert.strictEqual(fake.calls.load, 2, "the freeze reloaded the simulation");
        assert.strictEqual(fake.simulations.length, 1, "on the SAME simulation: nothing was rebuilt");
        assert.strictEqual(rig.engine.simulation, fake.simulations[0]);

        // NOT THE SAME COORDINATES, and that is the point of the envelope: a sixth node joins the
        // arrangement, the bridge refits the whole of it to the same scene-unit radius, and every
        // published row moves by the one factor that refit needed. What a reseed would destroy is
        // the SHAPE, so that is what is pinned -- a ratio of distances survives any refit.
        assert.closeTo(shape(rig), carried, 1e-4, "the five original rows kept their arrangement");
    });

    it("re-resolves a node-mass record when a freeze renumbers the rows without changing the count", async () => {
        // THE COUNT IS NOT THE TEST. A freeze that drops one node and adds another hands the graph
        // the same number of rows in a different order, so a simulation still holding the masses
        // resolved over the old order would pull every node with some other node's mass -- and
        // nothing about the size would say so.
        const graph = await pathGraph(5);
        const rig = await bridge(graph, "forceatlas2", {
            nodeMass: { n0: 5, n1: 4, n2: 3, n3: 2, n4: 1 },
        });

        assert.strictEqual(rig.engine.resolvedNodeMass?.[rig.row("n4")], 1, "the reader's mass, at n4's row");

        await graph.removeNodes(["n0"]);
        await graph.addNodes([{ id: "late" }]);
        graph.getDataManager().getSnapshot();

        assert.strictEqual(rig.engine.resolvedNodeMass?.length, 5, "the same number of rows as before");
        assert.strictEqual(rig.engine.resolvedNodeMass?.[rig.row("n4")], 1, "still following the reader's ids");
        assert.strictEqual(rig.engine.resolvedNodeMass?.[rig.row("n2")], 3, "every one of them");

        // The node the reader said nothing about falls back to its degree, not to another node's
        // mass: the record was re-resolved rather than re-used.
        assert.strictEqual(rig.engine.resolvedNodeMass?.[rig.row("late")], 1, "a lone new node weighs degree + 1");
        assert.lengthOf(rig.errors.filter((event) => event.context === "layout"), 0, "and nothing failed");
    });

    it("re-resolves a node-mass record when a freeze changes how many nodes there are", async () => {
        // The masses a reader gives by node ID are resolved by the ELEMENT, one per dense row,
        // because an accelerator never sees an ID. They are handed to the simulation when it is
        // built, so a freeze that adds a node leaves the simulation holding one fewer mass than
        // it has rows -- which is why this one option can force a rebuild.
        const graph = await pathGraph(5);
        const rig = await bridge(graph, "forceatlas2", {
            nodeMass: { n0: 5, n1: 4, n2: 3, n3: 2, n4: 1 },
        });

        assert.strictEqual(rig.engine.resolvedNodeMass?.length, 5, "one mass per row of the graph as it was");

        await graph.addNodes([{ id: "late" }]);
        graph.getDataManager().getSnapshot();

        assert.strictEqual(rig.engine.resolvedNodeMass?.length, 6, "and one per row of the graph as it is");
        assert.strictEqual(rig.engine.resolvedNodeMass?.[rig.row("n0")], 5, "still following the reader's ids");
        assert.lengthOf(rig.errors.filter((event) => event.context === "layout"), 0, "and nothing failed");
    });

    it("minNodes above the count keeps the CPU simulation until a reload crosses it", async () => {
        const graph = await pathGraph(5);
        graph.acceleration.setMinNodes(10);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph);
        assert.isFalse(rig.engine.isAccelerated, "five nodes is below the threshold, so the CPU runs it");

        await graph.addNodes([
            { id: "a" },
            { id: "b" },
            { id: "c" },
            { id: "d" },
            { id: "e" },
            { id: "f" },
        ]);
        graph.getDataManager().getSnapshot();

        assert.isTrue(rig.engine.isAccelerated, "the reload re-planned and the bigger graph crossed the threshold");
    });

    it("setRunning(false) lands only the in-flight batches and setRunning(true) reheats a settled simulation", async () => {
        const graph = await pathGraph(5);

        // FOUR BATCHES TO SETTLE, TWO IN FLIGHT AT ONCE. The pause is only worth asserting on a
        // simulation that still has work to do -- a settled one submits nothing whether anyone
        // paused it or not -- so the two batches the pause lands leave this fake half way, and
        // the two the resume lands settle it, which is the state "play" has to be visible from.
        const fake = createFakeAccelerator({ maxInFlight: 2, settleAfter: 4 });
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph, "forceatlas2", { maxInFlight: 2 });
        const layout = graph.getLayoutManager();
        assert.isTrue(rig.engine.isAccelerated, "the fake is running the layout");
        assert.strictEqual(fake.calls.reheat, 0, "a simulation nobody has paused has not been reheated");

        rig.step();
        rig.step();
        assert.strictEqual(fake.pending, 2, "both batches the ceiling allows are in flight");

        graph.setRunning(false);
        await drain(fake);

        assert.strictEqual(fake.calls.resolved, 2, "exactly the batches that were in flight landed");
        assert.strictEqual(fake.calls.step, 2, "and the pause submitted none of its own");
        assert.isFalse(rig.engine.isSettled, "with work still to do, so the pause is the only thing stopping it");

        const parked = rawX(fake.simulations[0], 0);
        for (let frame = 0; frame < 20; frame += 1) {
            // WHAT THE FRAME LOOP CALLS. The loop itself is stopped in this fixture, so driving
            // the manager's own per-frame entry is the only way to ask whether a paused layout
            // would submit anything if the browser were rendering.
            layout.stepBatch();
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        assert.strictEqual(fake.calls.step, 2, "twenty paused frames submitted nothing");
        assert.strictEqual(rawX(fake.simulations[0], 0), parked, "and nothing moved");

        graph.setRunning(true);
        assert.strictEqual(fake.calls.reheat, 0, "an unsettled simulation has no settle count to restart");

        layout.stepBatch();
        layout.stepBatch();
        await drain(fake);

        assert.strictEqual(fake.calls.step, 4, "play put the frames back to work");
        assert.notStrictEqual(rawX(fake.simulations[0], 0), parked, "which moved the graph");
        assert.isTrue(rig.engine.isSettled, "and four landed batches is this fake finished");

        graph.setRunning(false);
        graph.setRunning(true);
        assert.strictEqual(fake.calls.reheat, 1, "play restarted the settle count on the settled simulation");
        assert.isFalse(rig.engine.isSettled, "so the layout has work to do again");
    });

    it("a node the pointer is holding keeps its fixed bit through a freeze that renumbers the rows", async () => {
        const graph = await pathGraph(5);
        graph.acceleration.setAccelerator(createFakeAccelerator());

        const rig = await bridge(graph);
        const held = graph.getDataManager().getNode("n3");
        assert.isDefined(held);
        rig.engine.beginDrag(held);
        assert.isTrue(maskTest(rig.engine.pinnedMask, held.index), "the pointer fixed the row");

        // THE PIN LANE HAS NO ROW FOR A DRAG. The reload repacks the mask from that lane, so a
        // freeze in the middle of a drag would hand the node the pointer is holding back to the
        // forces.
        await graph.removeNodes(["n1"]);
        graph.getDataManager().getSnapshot();

        const renumbered = rig.row("n3");
        assert.isAbove(renumbered, -1, "the dragged node survived the removal");
        assert.isTrue(maskTest(rig.engine.pinnedMask, renumbered), "and it is still held, at its new row");

        rig.engine.endDrag(held, false);
        assert.isFalse(maskTest(rig.engine.pinnedMask, renumbered), "the drop gave the row back to the simulation");
    });

    it("under required, the accelerator removed mid-run stops the layout with E_NO_ACCELERATOR, never builds a CPU simulation, and a later setAccelerator resumes it on the GPU", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);
        graph.acceleration.setPolicy("required");

        const rig = await bridge(graph);
        assert.isTrue(rig.engine.isAccelerated);

        graph.acceleration.setAccelerator(null);

        const reported = rig.errors.filter((event) => event.context === "layout");
        assert.lengthOf(reported, 1, "the stop was reported once");
        assert.strictEqual((reported[0].error as GraphtyError).code, "E_NO_ACCELERATOR");
        assert.isFalse(rig.engine.isAccelerated);
        assert.isNull(rig.engine.simulation, "no CPU simulation was built under the required policy");

        // The array outlives the simulation the policy just stopped: the bridge keeps it so that
        // an accelerator arriving later continues the arrangement rather than restarting it.
        const stopped = rawX(fake.simulations[0], 0);
        for (let frame = 0; frame < 20; frame += 1) {
            // THE BRIDGE, not `LayoutManager.stepBatch()`: the manager's step is gated on
            // `running`, which the stop path set to false, so that loop would have moved nothing
            // even with a live CPU simulation behind the bridge.
            rig.step();
        }

        assert.strictEqual(rawX(fake.simulations[0], 0), stopped, "a stopped layout submits nothing");
        assert.strictEqual(fake.calls.forceAtlas2, 1, "and nothing was rebuilt on the detached accelerator");

        const second = createFakeAccelerator();
        graph.acceleration.setAccelerator(second);
        assert.strictEqual(second.calls.forceAtlas2, 1, "the layout came back on the accelerator that arrived");

        rig.step();
        await drain(second);
        assert.notStrictEqual(rawX(second.simulations[0], 0), stopped, "and it is moving again");
    });
    it("setLayout('spring') runs Fruchterman-Reingold on the processor without an accelerator, and on one with it", async () => {
        const onTheCpu = await bridge(await pathGraph(5), "spring");
        assert.strictEqual(onTheCpu.engine.simulationType, "spring", "the element's name for Fruchterman-Reingold");
        assert.isFalse(onTheCpu.engine.isAccelerated, "nothing is attached, so the processor runs it");

        const before = onTheCpu.x(0);
        for (let step = 0; step < 20; step += 1) {
            onTheCpu.step();
        }

        assert.notStrictEqual(onTheCpu.x(0), before, "and it arranges the graph");

        const graph = await pathGraph(5);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);
        const accelerated = await bridge(graph, "spring");

        assert.isTrue(accelerated.engine.isAccelerated);
        assert.strictEqual(fake.calls.fruchtermanReingold, 1, "spring asked for the accelerator's FR simulation");
        assert.strictEqual(fake.calls.forceAtlas2, 0, "and for nothing else");
    });

    it("setLayout('spring-electrical') without an accelerator fails with E_NO_ACCELERATOR and keeps the running layout", async () => {
        const graph = await pathGraph(5);
        const rig = await bridge(graph);
        assert.strictEqual(rig.engine.simulationType, "forceatlas2");

        // LOUD, not quiet. There is no processor implementation of spring-electrical at all, so
        // the alternative to refusing is arranging the graph some other way and saying nothing.
        // The layout catalogue declares `requires.accelerator` on this engine, so a picker never
        // has to reach this refusal to find out.
        const refused = await graph.setLayout("spring-electrical").catch((error: unknown) => error);

        assert.isTrue(isGraphtyError(refused), "the refusal carries a code a consumer can switch on");
        assert.strictEqual((refused as GraphtyError).code, "E_NO_ACCELERATOR");
        assert.strictEqual(
            graph.getLayoutManager().layoutEngine,
            rig.engine,
            "and the layout that was running is still the one running",
        );

        const before = rig.x(0);
        rig.step();
        assert.notStrictEqual(rig.x(0), before, "still stepping");
    });

    it("setLayout('spring-electrical') runs on an accelerator that implements it", async () => {
        const graph = await pathGraph(5);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph, "spring-electrical");

        assert.isTrue(rig.engine.isAccelerated);
        assert.strictEqual(fake.calls.springElectrical, 1, "on the accelerator's own spring-electrical simulation");
        assert.strictEqual(fake.calls.load, 1, "which was handed the graph once");

        // Read off the SIMULATION, for the reason rawX is written down: the fake's movement is a
        // rigid translation and the refit takes a rigid translation back out again, so the
        // published array answers "did a batch move the graph" only by the rounding it happens to
        // land on -- which made this one case fail about one run in seven.
        const before = rawX(fake.simulations[0], 0);
        rig.step();
        await drain(fake);
        assert.notStrictEqual(rawX(fake.simulations[0], 0), before, "and it arranges the graph");
    });

    it("setLayout('spring-electrical') refuses an attached accelerator that does not implement it", async () => {
        const graph = await pathGraph(5);

        // FEATURE-TESTED, not assumed: an accelerator declares its capabilities by having the
        // methods, so one that computes ForceAtlas2 and nothing else is attached, active and still
        // unable to run this layout. The refusal has to be the same one an empty slot gets.
        const { springElectrical: _unimplemented, ...partial } = createFakeAccelerator();
        graph.acceleration.setAccelerator(partial);

        const rig = await bridge(graph);
        const refused = await graph.setLayout("spring-electrical").catch((error: unknown) => error);

        assert.isTrue(isGraphtyError(refused), "the refusal carries a code a consumer can switch on");
        assert.strictEqual((refused as GraphtyError).code, "E_NO_ACCELERATOR");
        assert.include(
            (refused as GraphtyError).message,
            "springElectrical",
            "and says which capability the attached accelerator is missing",
        );
        assert.strictEqual(
            graph.getLayoutManager().layoutEngine,
            rig.engine,
            "and the layout that was running is still the one running",
        );
    });

    it("publishes a settled ForceAtlas2 inside the scene-unit radius the layout was configured with", async () => {
        // THE DEFECT THIS PINS. ForceAtlas2's equilibrium grows with the graph and the simulation
        // never rescales what it computes, so a settled graph used to reach tens of thousands of
        // scene units -- where a node, which is one scene unit across whatever the layout does,
        // projects to a thirtieth of a pixel and the canvas reads empty.
        const graph = await pathGraph(60);
        const rig = await bridge(graph, "forceatlas2", { scalingFactor: 100, seed: 42 });

        for (let frame = 0; frame < 400 && !rig.engine.isSettled; frame += 1) {
            rig.step();
        }

        let furthest = 0;
        for (let row = 0; row < 60; row += 1) {
            const { x, y, z } = rig.at(row);
            assert.isTrue(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z), `row ${String(row)} placed`);
            furthest = Math.max(furthest, Math.hypot(x, y, z));
        }

        assert.closeTo(furthest, 100, 0.5, "the widest node sits at the configured radius, not two orders past it");
    });

    it("a position written in scene units comes back in scene units, before and after the refit moves", async () => {
        const graph = await pathGraph(20);
        const rig = await bridge(graph, "forceatlas2", { scalingFactor: 100, seed: 42 });
        const held = graph.getDataManager().getNode("n7");
        assert.isDefined(held);

        // A DRAG: the pointer holds the row still and writes where it is, in the scene units the
        // pointer moves in, and the node renders there until the pointer lets go. That is this
        // case, and only that: what the write ALSO does -- reach the simulation in the
        // simulation's own units -- is invisible from here, because a held row is not published
        // over, and it is pinned two cases down against the array the simulation runs in.
        rig.engine.beginDrag(held);
        rig.engine.setNodePosition(held, { x: 41, y: -17, z: 5 });

        const landed = rig.at(held.index);
        assert.closeTo(landed.x, 41, 1e-3, "the node is where the pointer put it");
        assert.closeTo(landed.y, -17, 1e-3);
        assert.closeTo(landed.z, 5, 1e-3);

        // AND IT STAYS THERE while the arrangement around it is refitted, which is the harder
        // half: the graph is still settling, so the scale and the centre move under it every
        // frame. A node that was published from the simulation's stale copy of itself would drift
        // out from under the pointer by the ratio of the two scales.
        for (let frame = 0; frame < 30; frame += 1) {
            rig.step();
        }

        const still = rig.at(held.index);
        assert.closeTo(still.x, 41, 1e-3, "the dragged node did not drift under the pointer");
        assert.closeTo(still.y, -17, 1e-3);
        assert.closeTo(still.z, 5, 1e-3);

        // A DROP THAT PINS keeps the row fixed, and the pin is the store's: the refit that carries
        // on around it still must not move it.
        rig.engine.endDrag(held, true);
        held.pin();
        for (let frame = 0; frame < 30; frame += 1) {
            rig.step();
        }

        const pinned = rig.at(held.index);
        assert.closeTo(pinned.x, 41, 1e-3, "and a pinned node stays where it was put");
        assert.closeTo(pinned.y, -17, 1e-3);
        assert.closeTo(pinned.z, 5, 1e-3);
    });

    it("a node dragged outside the envelope does not resize the graph behind it", async () => {
        const graph = await pathGraph(40);
        const rig = await bridge(graph, "forceatlas2", { scalingFactor: 100, seed: 42 });

        for (let frame = 0; frame < 400 && !rig.engine.isSettled; frame += 1) {
            rig.step();
        }

        const dragged = graph.getDataManager().getNode("n20");
        assert.isDefined(dragged);
        const others = Array.from({ length: 40 }, (_node, row) => row).filter((row) => row !== dragged.index);

        // MEASURED WITH THE NODE ALREADY HELD, so the only thing that changes between the two
        // readings is where the pointer put it. The pointer is not stepping the simulation
        // either: nothing here can move the other 39 rows.
        rig.engine.beginDrag(dragged);
        const before = spread(rig, others);
        assert.closeTo(before, 100, 0.5, "the 39 rows the layout still owns fill the configured radius");

        rig.engine.setNodePosition(dragged, { x: 400, y: 0, z: 0 });

        // The defect this pins took them from 99.993 to 25.626: the refit was fitting every row
        // it published inside a radius set by the one row it does not publish, so the graph
        // shrank under a pointer that had not moved, and the camera refit to the bigger bounding
        // box shrank it again.
        assert.closeTo(spread(rig, others), before, 1e-4, "dragging one node out did not shrink the other 39");

        // AND THE SECOND MOVE OF THE SAME DRAG, because the defect compounded: the write is
        // divided by whatever scale the last publish left behind, so a pointer moving back in to
        // x 150 after x 400 reached the simulation further out still and took the other 39 to
        // 17.227.
        rig.engine.setNodePosition(dragged, { x: 150, y: 0, z: 0 });
        assert.closeTo(spread(rig, others), before, 1e-4, "and nor did dragging it back in");
    });

    it("reads a scene-unit position as the simulation coordinate that point is published from", async () => {
        // THE WRITE-BACK DIRECTION, pinned where it can be seen. A published position cannot pin
        // it: the refit is a uniform scale about the arrangement's own centre, so it normalises
        // any consistent pair of unit systems to the same picture, and a drag that wrote raw
        // scene units into the simulation would still read back at the pointer. What it would
        // break is the simulation's own arithmetic -- a dragged node would pull its neighbours
        // toward some other point entirely -- and only the simulation's array shows that. This
        // fake holds the bridge's array, so here it can be read.
        const graph = await pathGraph(12);
        const fake = createFakeAccelerator({ moveBy: 40, settleAfter: 3 });
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph, "forceatlas2", { scalingFactor: 100, seed: 42 });
        for (let frame = 0; frame < 5; frame += 1) {
            rig.step();
            await drain(fake);
        }

        const target = graph.getDataManager().getNode("n5");
        const moved = graph.getDataManager().getNode("n9");
        const other = graph.getDataManager().getNode("n1");
        assert.isDefined(target);
        assert.isDefined(moved);
        assert.isDefined(other);

        const scene = rig.at(target.index);
        const simulation = rawAt(fake.simulations[0], target.index);

        // TWO UNIT SYSTEMS THAT ARE REALLY TWO, or the assertions below would hold with no map at
        // all. They differ by an offset -- the fake has slid every free row along x since the
        // load -- and by a scale, because the seeded arrangement is wider than the radius it is
        // published at.
        assert.isAbove(Math.abs(scene.x - simulation.x), 1, "the two systems are offset from each other");
        const otherScene = rig.at(other.index);
        const otherSim = rawAt(fake.simulations[0], other.index);
        const ratio =
            Math.hypot(scene.x - otherScene.x, scene.y - otherScene.y, scene.z - otherScene.z) /
            Math.hypot(simulation.x - otherSim.x, simulation.y - otherSim.y, simulation.z - otherSim.z);
        assert.isAbove(Math.abs(ratio - 1), 0.05, "and scaled against each other, not only offset");

        rig.engine.beginDrag(moved);
        rig.engine.setNodePosition(moved, scene);

        // The same scene point the element drew `target` at, so it must reach the simulation as
        // the same coordinate the element published `target` from.
        const written = rawAt(fake.simulations[0], moved.index);
        assert.closeTo(written.x, simulation.x, 1e-3, "a scene-unit write arrives in the simulation's units");
        assert.closeTo(written.y, simulation.y, 1e-3);
        assert.closeTo(written.z, simulation.z, 1e-3);
    });

    it("a freeze re-adopts the arrangement in the simulation's units and leaves it where it was", async () => {
        // THE OTHER WRITE-BACK. A freeze renumbers the rows, so the bridge rebuilds the
        // simulation's array from the element's -- through the same map, inverted. Read in scene
        // units instead, the arrangement would arrive at some other size and the forces, which
        // are absolute in the simulation's units, would take it apart and settle it again. The
        // published picture would not say so: the refit normalises it either way, which is why
        // this is read off the simulation's own array and not off a node's position.
        const graph = await pathGraph(8);
        const fake = createFakeAccelerator({ moveBy: 40, settleAfter: 3 });
        graph.acceleration.setAccelerator(fake);

        const rig = await bridge(graph, "forceatlas2", { scalingFactor: 100, seed: 42 });
        for (let frame = 0; frame < 5; frame += 1) {
            rig.step();
            await drain(fake);
        }

        // PUBLISHED FIRST, because the element's array is one batch behind: a `step()` publishes
        // and the batch it submitted lands after that. The freeze rebuilds the simulation's array
        // from the element's, which is the authority, so an unpublished batch is dropped at a
        // freeze -- by design, and not what this case is about.
        rig.engine.publishPositions();
        const ids = ["n0", "n3", "n7"];
        const before = ids.map((id) => rawAt(fake.simulations[0], rig.row(id)));

        await graph.addNodes([{ id: "late" }]);
        graph.getDataManager().getSnapshot();
        assert.strictEqual(fake.calls.load, 2, "the freeze reloaded the simulation");

        for (const [index, id] of ids.entries()) {
            const after = rawAt(fake.simulations[0], rig.row(id));
            assert.closeTo(after.x, before[index].x, 1e-2, `${id} is where it was, in the simulation's units`);
            assert.closeTo(after.y, before[index].y, 1e-2);
            assert.closeTo(after.z, before[index].z, 1e-2);
        }
    });
});
