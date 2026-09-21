/**
 * @file A third party's camera view, and whether the element treats it as one of its own.
 *
 * WHAT A CAMERA VIEW IS. A view is a named way of deciding where the viewer stands and what they
 * are looking at: a pure function handed the box around whatever is being framed, the drawing
 * mode, the viewport and where the camera is now, which answers with a camera state. That is
 * literally what the element's own five are -- "fit to graph", "from above", "from the side",
 * "from the front", "isometric" -- and anyone can register one more through `registerCameraView`
 * on `@graphty/graphty-element/extend`, then name it wherever a built-in name is accepted.
 *
 * WHAT A CAMERA VIEW IS NOT, AND WHY. The word "camera" also covers a Babylon camera plus an
 * input model -- the thing that turns a drag into a rotation. That is NOT the extension point and
 * this file does not pretend it is: its members are Babylon types, so it could never be published
 * from an entry point that has to resolve in Node, and the element decides what to do with one by
 * duck-typing its property names. A view is publishable, typeable and testable, and the element's
 * animation, easing, queueing, cancellation, state-changed event and screenshot framing are all
 * already built around naming one.
 *
 * WHAT THIS FILE PROVES. Registering is the easy half. What is being bought is that a view a
 * customer wrote does everything the element's own views do: that it is listed in the catalogue so
 * a picker can offer it, that naming it moves the camera to the state it computed, that it can
 * answer differently in 2D than in 3D from one registration, that it is refused -- before it is
 * called -- in a drawing mode it did not declare, that it can be animated to and cancelled part
 * way, that it can frame a SUBSET rather than the whole graph, that its options arrive resolved
 * against the defaults it declared, that a screenshot can be framed with it, and that every
 * refusal is a `GraphtyError` with a code rather than a string to match on. Each `it` below
 * asserts an OUTCOME -- where the camera ended up, what the catalogue lists, which code came back.
 * "It did not throw" is not evidence.
 *
 * TWO VIEWS ARE DEFINED HERE, both written the way a customer would write one, importing only
 * from the package's published entry points with no cast and no re-declared type. `acme-corner`
 * is three-dimensional only and stands off one corner of the box at a configurable distance;
 * `acme-flat` is valid in both modes and answers with an orthographic state in 2D and a
 * perspective one in 3D from a single registration. Neither is a good view. Both are arithmetic a
 * reader can check by eye, because what is under test is the element's treatment of them.
 */

import { afterAll, afterEach, assert, beforeEach, describe, it } from "vitest";

import { setCameraPosition, zoomToNodes } from "../../../ai";
import { CAMERA_DESCRIPTORS, cameraDescriptor, camerasForMode } from "../../../catalog";
import {
    type CameraState,
    type CameraViewInput,
    type CameraViewRegistration,
    clearRegisteredCamerasForTesting,
    isGraphtyError,
    registerCameraView,
} from "../../../extend";
import { Graph } from "../../../index.js";

/** Three nodes at known coordinates, so every box in this file can be checked by eye. */
const NODES = [
    { id: "n1", position: { x: 0, y: 0, z: 0 } },
    { id: "n2", position: { x: 100, y: 100, z: 100 } },
    { id: "n3", position: { x: -100, y: -100, z: -100 } },
];

/** A path through all three, so the graph has edges as well as nodes. */
const EDGES = [
    { src: "n1", dst: "n2" },
    { src: "n2", dst: "n3" },
];

/** How far a reported camera position may sit from the computed one and still be the same place. */
const PLACE_TOLERANCE = 0.5;

/** How long any wait here is allowed to take before it is called a failure. */
const PATIENCE_MS = 5000;

/** Roughly one animation frame. */
const FRAME_MS = 16;

/** Where the view registered after a snapshot already held its name puts the viewer. */
const LATECOMER_PLACE = { x: 321, y: 123, z: 213 };

/** A coordinate triple, which is what both the element and these views speak in. */
interface Coords {
    x: number;
    y: number;
    z: number;
}

/**
 * Every input the two views below were handed, newest last.
 *
 * A plugin's own record of what it was asked, which is how the tests tell "the element refused
 * before calling" from "the view ran and returned something harmless", and how they check that a
 * scoped call really did hand over a smaller box.
 */
const seen: CameraViewInput[] = [];

/**
 * A view written by a third party: stand off one corner of the box and look at its middle.
 *
 * Three-dimensional only, and configurable -- how far out to stand, and which corner to stand at.
 * The arithmetic is deliberately trivial so that a failure names a real problem rather than a
 * rounding argument: the viewer sits `padding` times the longest side of the box away along each
 * axis, and looks at the centre.
 */
const CORNER_VIEW: CameraViewRegistration = {
    descriptor: {
        id: "acme-corner",
        plainName: "From the corner",
        description: "Stands off one corner of the graph and looks at the middle of it.",
        modes: ["3d"],
        options: [
            {
                name: "padding",
                plainName: "Distance",
                type: "number",
                default: 2,
                min: 1,
                max: 10,
                description: "How far out to stand, as a multiple of the longest side of the graph.",
            },
            {
                name: "corner",
                plainName: "Corner",
                type: "enum",
                default: "north-east",
                values: [
                    { value: "north-east", label: "North east" },
                    { value: "south-west", label: "South west" },
                ],
                description: "Which corner to stand at.",
            },
        ],
    },
    compute(input: CameraViewInput): CameraState {
        seen.push(input);

        const { padding, corner } = input.options;
        if (typeof padding !== "number" || typeof corner !== "string") {
            // The element fills in whatever the descriptor declared a default for, so a view is
            // entitled to find its options already there. Saying so loudly is what makes the
            // "defaults arrive" test below mean something.
            throw new Error(`acme-corner was handed options it did not declare: ${JSON.stringify(input.options)}`);
        }

        const offset = input.bounds.maxDimension * padding;
        const sign = corner === "south-west" ? -1 : 1;
        const { center } = input.bounds;

        return {
            type: "arcRotate",
            position: { x: center.x + sign * offset, y: center.y + offset, z: center.z + sign * offset },
            target: { x: center.x, y: center.y, z: center.z },
        };
    },
};

/** How many units of zoom `acme-flat` asks for per unit of graph, in two dimensions. */
const FLAT_ZOOM_SCALE = 100;

/**
 * A second view by the same third party, valid in both drawing modes from one registration.
 *
 * In two dimensions it answers with an orthographic state -- a zoom and a pan; in three it answers
 * with a position and a target along the z axis. One registration, two answers, which is exactly
 * what the element's own `fitToGraph` and `topView` do.
 */
const FLAT_VIEW: CameraViewRegistration = {
    descriptor: {
        id: "acme-flat",
        plainName: "Acme straight on",
        description: "Looks straight at the graph, flat or in three dimensions.",
        modes: ["2d", "3d"],
        options: [],
    },
    compute(input: CameraViewInput): CameraState {
        seen.push(input);

        const { center, maxDimension } = input.bounds;

        if (input.mode === "2d") {
            return {
                type: "orthographic",
                zoom: FLAT_ZOOM_SCALE / maxDimension,
                pan: { x: center.x, y: center.y },
            };
        }

        return {
            type: "arcRotate",
            position: { x: center.x, y: center.y, z: center.z + maxDimension },
            target: { x: center.x, y: center.y, z: center.z },
        };
    },
};

registerCameraView(CORNER_VIEW);
registerCameraView(FLAT_VIEW);

/**
 * The box around a set of points, computed the way the element computes it.
 *
 * The tests work out what they expect from the coordinates the element reports for its own nodes,
 * rather than from the numbers written at the top of the file, so a change to how the element
 * places a fixed layout does not turn into a camera failure.
 * @param points - Where the elements being framed are.
 * @returns The centre of the box and its longest side.
 */
function boxAround(points: readonly Coords[]): { center: Coords; maxDimension: number } {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const zs = points.map((point) => point.z);
    const span = (values: number[]): [number, number] => [Math.min(...values), Math.max(...values)];

    const [minX, maxX] = span(xs);
    const [minY, maxY] = span(ys);
    const [minZ, maxZ] = span(zs);

    return {
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
        maxDimension: Math.max(maxX - minX, maxY - minY, maxZ - minZ),
    };
}

/**
 * Pause for a while.
 * @param ms - How long to wait.
 * @returns A promise that resolves after the wait.
 */
function delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Poll until something becomes true, or give up loudly.
 * @param condition - What is being waited for.
 * @param what - How to describe it if the wait fails.
 */
async function waitFor(condition: () => boolean, what: string): Promise<void> {
    const deadline = Date.now() + PATIENCE_MS;

    while (Date.now() < deadline) {
        if (condition()) {
            return;
        }

        await delay(FRAME_MS);
    }

    throw new Error(`timed out waiting for ${what}`);
}

describe("a third party's camera view", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    /**
     * Where the element currently has every node, which is the box a view frames by default.
     * @returns The centre of the graph and its longest side.
     */
    function graphBox(): { center: Coords; maxDimension: number } {
        return boxAround(graph.getNodes().map((node) => node.getPosition()));
    }

    /**
     * Where the element has the named nodes, which is the box a scoped call frames.
     * @param ids - The nodes to measure over.
     * @returns The centre of that subset and its longest side.
     */
    function subsetBox(ids: readonly string[]): { center: Coords; maxDimension: number } {
        return boxAround(
            ids.map((id) => {
                const node = graph.getNode(id);
                if (!node) {
                    throw new Error(`the graph has no node "${id}"`);
                }

                return node.getPosition();
            }),
        );
    }

    beforeEach(async () => {
        seen.length = 0;

        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);

        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("3d");

        // A layout that puts every node exactly where its data says, so every box in this file is
        // the box written at the top of it and no test is waiting on a simulation.
        await graph.setLayout("fixed");
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.waitForSettled();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    afterAll(() => {
        clearRegisteredCamerasForTesting();
    });

    describe("being offered", () => {
        it("is listed in the element's catalogue beside the views it ships, so a picker can offer it", () => {
            const listed = graph.getSession().catalog.cameras();
            const ids = listed.map((descriptor) => descriptor.id);

            assert.includeMembers(ids, ["acme-corner", "acme-flat"], "the registered views are in the catalogue");
            assert.includeMembers(
                ids,
                CAMERA_DESCRIPTORS.map((descriptor) => descriptor.id),
                "and the element's own views are still all there",
            );

            const mine = listed.find((descriptor) => descriptor.id === "acme-corner");
            assert.strictEqual(mine?.plainName, "From the corner", "a picker gets the name a person reads");
            assert.deepEqual(mine?.modes, ["3d"], "and the modes it can be offered in");
        });

        it("is one of the names loadCameraPreset will answer to, so a menu built from that list has it", () => {
            // A picker built from this list used to be shown the element's own five views and
            // nothing else, so a registered view was invisible to it while being nameable
            // everywhere else.
            const named = graph.getCameraPresets();

            assert.deepEqual(named["acme-corner"], { builtin: true }, "the registered view is a computed view");
            assert.deepEqual(named.isometric, { builtin: true }, "so is the element's own");
            assert.isUndefined(named["acme-nothing"]);
        });

        it("is found by the name a consumer types and a saved document records", () => {
            assert.strictEqual(cameraDescriptor("acme-corner")?.plainName, "From the corner");
            assert.strictEqual(cameraDescriptor("acme-flat")?.plainName, "Acme straight on");
            assert.isUndefined(cameraDescriptor("acme-nothing"), "and nothing answers for a name nobody registered");
        });

        it("is offered only in the drawing modes it declares, rather than failing once it is picked", () => {
            const flat = camerasForMode("2d").map((descriptor) => descriptor.id);
            const solid = camerasForMode("3d").map((descriptor) => descriptor.id);

            assert.include(flat, "acme-flat", "the view that works flat is offered flat");
            assert.notInclude(flat, "acme-corner", "the view that does not is never offered there");
            assert.includeMembers(solid, ["acme-corner", "acme-flat"], "both are offered in three dimensions");
        });

        it("is refused at the door when it declares no options list, naming the field", () => {
            // Registration is checked where the plugin author can see it, rather than inside
            // somebody else's repaint an hour later. A view that takes no configuration declares
            // an empty list, which is what a form renders and what a caller's values are checked
            // against. The cast below is the only one in this file and it is the point of the
            // test: TypeScript already stops an author writing this, so the refusal is what
            // catches the same mistake made in JavaScript.
            const malformed = {
                descriptor: { ...FLAT_VIEW.descriptor, id: "acme-unlisted", options: undefined },
                compute: FLAT_VIEW.compute,
            } as unknown as CameraViewRegistration;

            try {
                registerCameraView(malformed);
                assert.fail("a view with no options list should have been refused");
            } catch (error) {
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_BAD_COMMAND");
                assert.strictEqual(error.details?.field, "options");
            }

            assert.isUndefined(cameraDescriptor("acme-unlisted"), "and nothing was filed under its name");
        });

        it("cannot take the name of a view the element ships", () => {
            try {
                registerCameraView({ ...CORNER_VIEW, descriptor: { ...CORNER_VIEW.descriptor, id: "isometric" } });
                assert.fail("registering under a built-in name should have been refused");
            } catch (error) {
                // A saved document that named "isometric" yesterday has to mean the same thing
                // today, which is why this is refused whether or not the caller asked for strict.
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_DUPLICATE_PLUGIN");
                assert.strictEqual(error.details?.name, "isometric");
            }
        });
    });

    describe("being applied", () => {
        it("moves the camera to the state it computed, once a consumer names it", async () => {
            const { center, maxDimension } = graphBox();
            const offset = maxDimension * 2;

            await graph.applyCameraView("acme-corner", { animate: false });

            const state = graph.getCameraState();
            assert.ok(state.position, "the element reports where the camera ended up");
            assert.closeTo(state.position.x, center.x + offset, PLACE_TOLERANCE);
            assert.closeTo(state.position.y, center.y + offset, PLACE_TOLERANCE);
            assert.closeTo(state.position.z, center.z + offset, PLACE_TOLERANCE);
            assert.ok(state.target, "and what it is looking at");
            assert.closeTo(state.target.x, center.x, PLACE_TOLERANCE);
            assert.closeTo(state.target.y, center.y, PLACE_TOLERANCE);
            assert.closeTo(state.target.z, center.z, PLACE_TOLERANCE);
        });

        it("is reached by every route a built-in view is, not only by its own", async () => {
            const { center, maxDimension } = graphBox();
            const expected = { x: center.x, y: center.y, z: center.z + maxDimension };

            await graph.setCameraPosition({ x: 5, y: 5, z: 5 });
            await graph.loadCameraPreset("acme-flat", { animate: false });

            const viaPreset = graph.getCameraState();
            assert.ok(viaPreset.position);
            assert.closeTo(viaPreset.position.z, expected.z, PLACE_TOLERANCE, "loadCameraPreset reached the plugin");

            await graph.setCameraPosition({ x: 5, y: 5, z: 5 });
            await graph.setCameraState({ preset: "acme-flat" });

            const viaState = graph.getCameraState();
            assert.ok(viaState.position);
            assert.closeTo(viaState.position.z, expected.z, PLACE_TOLERANCE, "so did setCameraState");
        });

        it("tells anyone listening what state the camera moved to", async () => {
            const announced: CameraState[] = [];
            graph.on("camera-state-changed", (event) => {
                announced.push((event as unknown as { state: CameraState }).state);
            });

            const { center, maxDimension } = graphBox();
            await graph.applyCameraView("acme-flat", { animate: false });

            assert.isAbove(announced.length, 0, "the element announced the change");
            const last = announced[announced.length - 1];
            assert.closeTo(last?.position?.z ?? 0, center.z + maxDimension, 0.01, "and it announced what the view computed");
        });

        it("computes a different view in two dimensions than in three, from one registration", async () => {
            await graph.applyCameraView("acme-flat", { animate: false });
            const solid = graph.getCameraState();
            assert.ok(solid.position, "in three dimensions the view answered with a position");
            assert.isUndefined(solid.zoom, "and no orthographic zoom");

            await graph.setViewMode("2d");
            await graph.waitForSettled();

            const flatBox = graphBox();
            await graph.applyCameraView("acme-flat", { animate: false });

            const flat = graph.getCameraState();
            assert.ok(flat.zoom !== undefined, "in two dimensions the same view answered with a zoom");
            assert.closeTo(flat.zoom, FLAT_ZOOM_SCALE / flatBox.maxDimension, 0.01, "the zoom it computed");
            assert.ok(flat.pan);
            assert.closeTo(flat.pan.x, flatBox.center.x, PLACE_TOLERANCE);
            assert.closeTo(flat.pan.y, flatBox.center.y, PLACE_TOLERANCE);

            const modes = seen.map((input) => input.mode);
            assert.includeMembers(modes, ["2d", "3d"], "the element told the view which mode it was drawing in");
        });

        it("is refused in a drawing mode it did not declare, before it is asked to compute anything", async () => {
            await graph.setViewMode("2d");
            await graph.waitForSettled();
            seen.length = 0;

            try {
                await graph.applyCameraView("acme-corner", { animate: false });
                assert.fail("a 3D-only view should have been refused in 2D");
            } catch (error) {
                // The modes are data on the descriptor, so the element can refuse before calling
                // and a picker can read what is available. A throw from inside the view could do
                // neither.
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_UNSUPPORTED");
                assert.deepEqual(error.details?.modes, ["3d"]);
            }

            assert.lengthOf(seen, 0, "the view was never called");
        });

        it("gets the same refusal a built-in view gets when nothing answers to the name", async () => {
            try {
                await graph.applyCameraView("acme-nothing", { animate: false });
                assert.fail("an unregistered name should have been refused");
            } catch (error) {
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_UNKNOWN_CAMERA");
                const available = error.details?.available as string[];
                assert.includeMembers(available, ["isometric", "acme-corner"], "the refusal lists what would have worked");
            }
        });
    });

    describe("framing something other than the whole graph", () => {
        it("frames a named subset, and is handed a box covering only those elements", async () => {
            const subset = subsetBox(["n1", "n2"]);
            const whole = graphBox();
            assert.isAbove(
                Math.abs(subset.center.x - whole.center.x),
                1,
                "the subset sits somewhere else than the whole graph, so this test can fail",
            );

            seen.length = 0;
            await graph.applyCameraView("acme-corner", { scope: { nodes: ["n1", "n2"] }, animate: false });

            assert.lengthOf(seen, 1, "the view was asked once");
            const handed = seen[0]?.bounds;
            assert.strictEqual(handed?.measured, 2, "it was told the box covers two elements");
            assert.closeTo(handed.center.x, subset.center.x, 0.01, "and the box was the subset's");
            assert.closeTo(handed.maxDimension, subset.maxDimension, 0.01);

            const state = graph.getCameraState();
            assert.ok(state.target);
            assert.closeTo(state.target.x, subset.center.x, PLACE_TOLERANCE, "the camera looks at the subset");
            assert.closeTo(state.target.y, subset.center.y, PLACE_TOLERANCE);
        });

        it("frames the whole graph when nothing narrows it", async () => {
            const whole = graphBox();

            seen.length = 0;
            await graph.applyCameraView("acme-corner", { animate: false });

            assert.strictEqual(seen[0]?.bounds.measured, NODES.length, "the box covered every node");
            assert.closeTo(seen[0].bounds.center.x, whole.center.x, 0.01);
        });
    });

    describe("being configured", () => {
        it("receives its options already filled in from the defaults its descriptor declares", async () => {
            seen.length = 0;
            await graph.applyCameraView("acme-corner", { animate: false });

            assert.deepEqual(
                seen[0]?.options,
                { padding: 2, corner: "north-east" },
                "the element filled in both declared defaults",
            );
        });

        it("receives the values the consumer chose, and moves accordingly", async () => {
            const { center, maxDimension } = graphBox();

            await graph.applyCameraView("acme-corner", { params: { padding: 3, corner: "south-west" }, animate: false });

            const state = graph.getCameraState();
            assert.ok(state.position);
            assert.closeTo(state.position.x, center.x - maxDimension * 3, PLACE_TOLERANCE);
            assert.closeTo(state.position.y, center.y + maxDimension * 3, PLACE_TOLERANCE);
            assert.closeTo(state.position.z, center.z - maxDimension * 3, PLACE_TOLERANCE);
        });

        it("has a value outside the range it declared refused, rather than acted on", async () => {
            try {
                await graph.applyCameraView("acme-corner", { params: { padding: 99 }, animate: false });
                assert.fail("a padding of 99 should have been refused");
            } catch (error) {
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_OPTION_RANGE");
                assert.strictEqual(error.details?.option, "padding");
                assert.strictEqual(error.details.max, 10);
            }
        });

        it("has a value outside the choices it declared refused", async () => {
            try {
                await graph.applyCameraView("acme-corner", { params: { corner: "underneath" }, animate: false });
                assert.fail("a corner it does not offer should have been refused");
            } catch (error) {
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_OPTION_RANGE");
                assert.deepEqual(error.details?.values, ["north-east", "south-west"]);
            }
        });

        it("has an option it never declared refused, with the nearest name it does offer", async () => {
            try {
                await graph.applyCameraView("acme-corner", { params: { paddign: 3 }, animate: false });
                assert.fail("a misspelled option should have been refused");
            } catch (error) {
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_UNKNOWN_OPTION");
                assert.include(error.details?.candidates as string[], "padding", "and it says what was probably meant");
            }
        });
    });

    describe("being animated to", () => {
        it("animates to the state it computed, and the wait ends when the camera has arrived", async () => {
            const { center, maxDimension } = graphBox();
            const offset = maxDimension * 2;
            const destination = { x: center.x + offset, y: center.y + offset, z: center.z + offset };

            await graph.setCameraPosition({ x: 1, y: 1, z: 1 });

            // A long duration and a sample taken early, because "it ended up in the right place"
            // is also true of a move that jumped there instantly, and a plugin's view is supposed
            // to inherit the element's travel between two views rather than only its destination.
            const travelling = graph.applyCameraView("acme-corner", {
                animate: true,
                duration: 1200,
                easing: "easeInOut",
            });
            await waitFor(() => graph.operationQueue.getActiveOperations().length > 0, "the camera animation to start");
            await delay(FRAME_MS * 4);

            const midFlight = graph.getCameraState();
            assert.ok(midFlight.position, "the element reports where the camera is part way");
            const remaining = Math.hypot(
                midFlight.position.x - destination.x,
                midFlight.position.y - destination.y,
                midFlight.position.z - destination.z,
            );
            assert.isAbove(remaining, PLACE_TOLERANCE, "the camera was still travelling rather than already there");

            await travelling;

            const state = graph.getCameraState();
            assert.ok(state.position);
            assert.closeTo(state.position.x, destination.x, PLACE_TOLERANCE, "the animation finished at the view's state");
            assert.closeTo(state.position.y, destination.y, PLACE_TOLERANCE);
            assert.closeTo(state.position.z, destination.z, PLACE_TOLERANCE);
        });

        it("settles rather than failing when the animation is cancelled part way", async () => {
            const { center, maxDimension } = graphBox();
            const offset = maxDimension * 2;
            const destination = { x: center.x + offset, y: center.y + offset, z: center.z + offset };

            await graph.setCameraPosition({ x: 1, y: 1, z: 1 });

            const travelling = graph.applyCameraView("acme-corner", { animate: true, duration: 4000 });
            await waitFor(() => graph.operationQueue.getActiveOperations().length > 0, "the camera animation to start");
            await delay(FRAME_MS * 4);

            for (const id of graph.operationQueue.getActiveOperations()) {
                graph.operationQueue.cancelOperation(id);
            }

            // Cancelling a camera move is not a failure: the element stops the animation where it
            // is and the caller's await finishes. Rejecting would make every cancelled move an
            // error a consumer had to catch.
            await travelling;

            const state = graph.getCameraState();
            assert.ok(state.position);
            const travelled = Math.hypot(
                state.position.x - destination.x,
                state.position.y - destination.y,
                state.position.z - destination.z,
            );
            assert.isAbove(travelled, offset, "the camera stopped short rather than arriving");
        });
    });

    describe("being used for the things views are used for", () => {
        it("can be the view a screenshot is framed from, with the camera put back afterwards", async () => {
            const { center, maxDimension } = graphBox();
            const offset = maxDimension * 2;

            await graph.setCameraPosition({ x: 40, y: 40, z: 40 });
            const before = graph.getCameraState();

            // Where the camera went WHILE the shot was being taken. That moment is the only one
            // in which the framing is observable, because the element puts the camera back before
            // the promise settles -- so a test that looked only at what came back could not tell
            // a screenshot framed from this view from one that ignored the name entirely and shot
            // whatever happened to be on screen.
            const announced: CameraState[] = [];
            graph.on("camera-state-changed", (event) => {
                announced.push((event as unknown as { state: CameraState }).state);
            });

            seen.length = 0;
            const result = await graph.captureScreenshot({
                camera: { preset: "acme-corner" },
                timing: { waitForSettle: false, waitForOperations: false },
            });

            assert.ok(result.blob instanceof Blob, "the screenshot was taken");
            assert.isAbove(seen.length, 0, "the view was asked where the viewer should stand");

            const framedFromTheView = announced.some(
                (state) =>
                    state.position !== undefined &&
                    Math.abs(state.position.x - (center.x + offset)) < PLACE_TOLERANCE &&
                    Math.abs(state.position.y - (center.y + offset)) < PLACE_TOLERANCE &&
                    Math.abs(state.position.z - (center.z + offset)) < PLACE_TOLERANCE,
            );
            assert.isTrue(framedFromTheView, "the camera stood where the view said before the shot was taken");

            const after = graph.getCameraState();
            assert.closeTo(after.position?.x ?? 0, before.position?.x ?? 0, PLACE_TOLERANCE, "the camera was put back");
            assert.closeTo(after.position?.z ?? 0, before.position?.z ?? 0, PLACE_TOLERANCE);
        });

        it("cannot have its name taken by a saved snapshot of wherever the camera happens to be", () => {
            try {
                graph.saveCameraPreset("acme-corner");
                assert.fail("saving over a registered view should have been refused");
            } catch (error) {
                // A snapshot is a fixed position; a view is a rule that recomputes itself for the
                // graph on screen. Letting the first shadow the second loses the rule silently.
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_PROTECTED");
                assert.include(error.message, "acme-corner");
            }
        });

        it("takes a name back from a snapshot that was saved before the view was registered", async () => {
            /* THE ONE ORDER OF EVENTS `saveCameraPreset` CANNOT REFUSE. It checks the views at
               the moment of saving, so a consumer who saves "acme-latecomer" on Monday and
               registers a view under that name on Tuesday used to be left with a fixed position
               where a rule was intended -- silently, for the life of the graph. A built-in name
               is reserved from process start and can never be shadowed this way, so a registered
               view has to be reached first too. */
            await graph.setCameraPosition({ x: 7, y: 7, z: 7 });
            graph.saveCameraPreset("acme-latecomer");

            registerCameraView({
                descriptor: {
                    id: "acme-latecomer",
                    plainName: "Registered after the snapshot",
                    description: "Exists to be asked for after a snapshot already had its name.",
                    modes: ["2d", "3d"],
                    options: [],
                },
                compute: () => ({ type: "arcRotate", position: LATECOMER_PLACE, target: { x: 0, y: 0, z: 0 } }),
            });

            const resolved = graph.resolveCameraPreset("acme-latecomer");

            assert.ok(resolved.position, "the name resolved to something with a position");
            assert.closeTo(resolved.position.x, LATECOMER_PLACE.x, PLACE_TOLERANCE, "the view answered, not the snapshot");
            assert.closeTo(resolved.position.y, LATECOMER_PLACE.y, PLACE_TOLERANCE);
            assert.closeTo(resolved.position.z, LATECOMER_PLACE.z, PLACE_TOLERANCE);
        });

        it("can be named in a consumer's command, the way a built-in view can", async () => {
            const { center, maxDimension } = graphBox();

            const result = await setCameraPosition.execute(graph, { preset: "acme-corner", animate: false });

            assert.isTrue(result.success, result.message);

            const state = graph.getCameraState();
            assert.ok(state.position);
            assert.closeTo(state.position.y, center.y + maxDimension * 2, PLACE_TOLERANCE);
        });

        it("frames only the nodes a consumer's command matched, rather than the whole graph", async () => {
            // The command used to resolve the matching ids and then frame everything anyway, with
            // a comment admitting it. A view is handed the box rather than measuring one, so
            // scoping the box is the whole of the fix -- and it is a built-in view being scoped
            // here, which is what makes it parity rather than a favour to plugins.
            const subset = subsetBox(["n1", "n2"]);
            const whole = graphBox();
            assert.isAbove(
                Math.abs(subset.center.x - whole.center.x),
                1,
                "the matched nodes sit somewhere else than the whole graph, so this test can fail",
            );

            const result = await zoomToNodes.execute(graph, {
                selector: "id == 'n1' || id == 'n2'",
                animate: false,
            });

            assert.isTrue(result.success, result.message);
            assert.deepEqual(result.affectedNodes, ["n1", "n2"], "the command matched the two nodes");

            const state = graph.getCameraState();
            assert.ok(state.target);
            assert.closeTo(state.target.x, subset.center.x, PLACE_TOLERANCE, "the camera looks at what was matched");
            assert.closeTo(state.target.y, subset.center.y, PLACE_TOLERANCE);
            assert.closeTo(state.target.z, subset.center.z, PLACE_TOLERANCE);
        });
    });

    describe("the views the element ships", () => {
        it("still answer exactly as they did, through the same lookup a plugin's view uses", async () => {
            const { center, maxDimension } = graphBox();

            const isometric = graph.resolveCameraPreset("isometric");
            assert.strictEqual(isometric.type, "arcRotate");
            assert.closeTo(isometric.alpha ?? 0, Math.PI / 4, 0.001);
            assert.closeTo(isometric.beta ?? 0, 0.615, 0.001);
            assert.closeTo(isometric.radius ?? 0, maxDimension * 1.5, 0.001);

            const side = graph.resolveCameraPreset("sideView");
            assert.closeTo(side.position?.x ?? 0, center.x + maxDimension * 1.5, 0.001);
            assert.closeTo(side.position?.y ?? 0, center.y, 0.001);

            await graph.applyCameraView("topView", { animate: false });
            const state = graph.getCameraState();
            assert.isAbove(state.position?.y ?? 0, state.target?.y ?? 0, "the element's own view still looks down");
        });

        it("can be framed on a subset too, which is new capability the point brought with it", async () => {
            const subset = subsetBox(["n1", "n2"]);

            await graph.applyCameraView("isometric", { scope: { nodes: ["n1", "n2"] }, animate: false });

            const state = graph.getCameraState();
            assert.ok(state.target);
            assert.closeTo(state.target.x, subset.center.x, PLACE_TOLERANCE, "a built-in view framed the subset");
            assert.closeTo(state.target.y, subset.center.y, PLACE_TOLERANCE);
        });
    });
});
