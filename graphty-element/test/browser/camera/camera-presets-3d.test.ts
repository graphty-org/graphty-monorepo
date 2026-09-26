import { assert } from "chai";
import { afterAll, afterEach, beforeEach, describe, test } from "vitest";

import { clearRegisteredCamerasForTesting, registerCameraView } from "../../../extend";
import type { AdHocData } from "../../../src/config/index.js";
import { Graph } from "../../../src/Graph.js";
import { setBehavior } from "../../helpers/testSetup.js";

describe("Camera Presets - 3D", () => {
    let graph: Graph;
    let container: HTMLElement;

    beforeEach(async () => {
        // Create a container element
        container = document.createElement("div");
        container.id = "test-container";
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);

        // Create graph instance - engine creation handled automatically
        graph = new Graph(container);

        // Initialize
        await graph.init();

        // The document the graph is configured from, one setting at a time. It used to arrive as
        // one style template; each of these is its own verb now.
        graph.setBackground({ backgroundType: "color", color: "#f0f0f0" });
        await graph.setViewMode("3d");
        await graph.setLayout("fixed");
        setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 } });

        // Wait for camera to be activated
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Wait for all operations to settle
        await graph.waitForSettled();
    });

    afterEach(() => {
        graph.dispose();
        document.body.removeChild(container);
    });

    test("fitToGraph preset calculates 3D position based on node bounds", async () => {
        // Set up graph with known bounds
        await graph.addNode({ id: "n1", position: { x: 0, y: 0, z: 0 } } as unknown as AdHocData);
        await graph.addNode({ id: "n2", position: { x: 100, y: 100, z: 100 } } as unknown as AdHocData);
        await graph.addNode({ id: "n3", position: { x: -50, y: -50, z: -50 } } as unknown as AdHocData);
        await graph.waitForSettled();

        const presetState = graph.resolveCameraPreset("fitToGraph");

        assert.equal(presetState.type, "arcRotate");
        assert.ok(presetState.position);
        assert.ok(presetState.target);

        // Camera should be positioned to see all nodes
        // Target should be at center of bounding box
        const expectedCenter = { x: 25, y: 25, z: 25 }; // Center of [-50, 100]
        assert.approximately(presetState.target.x, expectedCenter.x, 1);
        assert.approximately(presetState.target.y, expectedCenter.y, 1);
        assert.approximately(presetState.target.z, expectedCenter.z, 1);
    });

    test("topView preset looks down from above in 3D mode", async () => {
        // Add some nodes to establish bounds
        await graph.addNode({ id: "n1", position: { x: 0, y: 0, z: 0 } } as unknown as AdHocData);
        await graph.addNode({ id: "n2", position: { x: 100, y: 100, z: 100 } } as unknown as AdHocData);
        await graph.waitForSettled();

        const presetState = graph.resolveCameraPreset("topView");

        assert.equal(presetState.type, "arcRotate");
        assert.ok(presetState.position);
        assert.ok(presetState.target);

        // Position should be above the target
        assert.ok(presetState.position.y > presetState.target.y);
        // X and Z should match target (looking straight down)
        assert.approximately(presetState.position.x, presetState.target.x, 0.1);
        assert.approximately(presetState.position.z, presetState.target.z, 0.1);
    });

    test("sideView preset positions camera to the side", async () => {
        // Add some nodes to establish bounds
        await graph.addNode({ id: "n1", position: { x: 0, y: 0, z: 0 } } as unknown as AdHocData);
        await graph.addNode({ id: "n2", position: { x: 100, y: 100, z: 100 } } as unknown as AdHocData);
        await graph.waitForSettled();

        const presetState = graph.resolveCameraPreset("sideView");

        assert.equal(presetState.type, "arcRotate");
        assert.ok(presetState.position);
        assert.ok(presetState.target);

        // X should be offset from target
        assert.notEqual(presetState.position.x, presetState.target.x);
    });

    test("frontView preset positions camera in front", async () => {
        // Add some nodes to establish bounds
        await graph.addNode({ id: "n1", position: { x: 0, y: 0, z: 0 } } as unknown as AdHocData);
        await graph.addNode({ id: "n2", position: { x: 100, y: 100, z: 100 } } as unknown as AdHocData);
        await graph.waitForSettled();

        const presetState = graph.resolveCameraPreset("frontView");

        assert.equal(presetState.type, "arcRotate");
        assert.ok(presetState.position);
        assert.ok(presetState.target);

        // Z should be offset from target
        assert.notEqual(presetState.position.z, presetState.target.z);
    });

    test("isometric preset creates classic 3D isometric angle", async () => {
        // Add some nodes to establish bounds
        await graph.addNode({ id: "n1", position: { x: 0, y: 0, z: 0 } } as unknown as AdHocData);
        await graph.addNode({ id: "n2", position: { x: 100, y: 100, z: 100 } } as unknown as AdHocData);
        await graph.waitForSettled();

        const presetState = graph.resolveCameraPreset("isometric");

        assert.equal(presetState.type, "arcRotate");
        assert.ok(presetState.alpha !== undefined);
        assert.ok(presetState.beta !== undefined);

        // Classic isometric: alpha = 45 deg around, and beta measured down from +y (the
        // ArcRotate convention) = acos(1/sqrt(3)) ~= 54.7 deg, which is 35.264 deg above the
        // horizon.
        assert.approximately(presetState.alpha, Math.PI / 4, 1e-9);
        assert.approximately(presetState.beta, Math.acos(1 / Math.sqrt(3)), 1e-9);
    });

    describe("an orbit state given as alpha, beta and radius", () => {
        afterAll(() => {
            clearRegisteredCamerasForTesting();
        });

        /** Where the camera looks from, as a unit vector from the target, and how far away. */
        function viewFromTarget(): { direction: [number, number, number]; distance: number } {
            const state = graph.getCameraState();
            assert.ok(state.position);
            assert.ok(state.target);
            const d: [number, number, number] = [
                state.position.x - state.target.x,
                state.position.y - state.target.y,
                state.position.z - state.target.z,
            ];
            const distance = Math.hypot(...d);

            return { direction: [d[0] / distance, d[1] / distance, d[2] / distance], distance };
        }

        /** Babylon's ArcRotate placement: alpha around +y from +x, beta down from +y. */
        function arcRotateDirection(alpha: number, beta: number): [number, number, number] {
            return [Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta)];
        }

        async function addNodes(): Promise<void> {
            await graph.addNode({ id: "n1", position: { x: 0, y: 0, z: 0 } } as unknown as AdHocData);
            await graph.addNode({ id: "n2", position: { x: 100, y: 100, z: 100 } } as unknown as AdHocData);
            await graph.waitForSettled();
        }

        /** Two starting orientations that share nothing, so a view that ignores the angles shows. */
        const STARTS = [
            { position: { x: 0, y: 0, z: -300 }, target: { x: 0, y: 0, z: 0 } },
            { position: { x: 200, y: -150, z: 100 }, target: { x: 10, y: 20, z: 30 } },
        ];

        for (const animate of [false, true]) {
            test(`isometric lands on the same direction and distance from any start (animate: ${animate})`, async () => {
                await addNodes();
                const expected = graph.resolveCameraPreset("isometric");
                assert.ok(expected.alpha !== undefined && expected.beta !== undefined && expected.radius);
                const want = arcRotateDirection(expected.alpha, expected.beta);

                for (const start of STARTS) {
                    await graph.setCameraState(start);
                    await graph.applyCameraView("isometric", animate ? { animate: true, duration: 100 } : {});

                    const { direction, distance } = viewFromTarget();
                    assert.approximately(direction[0], want[0], 1e-3, "x of the view direction");
                    assert.approximately(direction[1], want[1], 1e-3, "y of the view direction");
                    assert.approximately(direction[2], want[2], 1e-3, "z of the view direction");
                    assert.approximately(distance, expected.radius, 1e-3);
                }
            });
        }

        test("a registered view that answers with alpha, beta and radius is honoured", async () => {
            registerCameraView({
                descriptor: {
                    id: "test-orbit-angles",
                    plainName: "Orbit angles",
                    description: "Answers with orbit angles rather than a position.",
                    modes: ["3d"],
                    options: [],
                },
                compute: (input) => ({
                    type: "arcRotate",
                    alpha: 1,
                    beta: 0.5,
                    radius: 400,
                    target: input.bounds.center,
                }),
            });
            await addNodes();

            await graph.applyCameraView("test-orbit-angles");

            const { direction, distance } = viewFromTarget();
            const want = arcRotateDirection(1, 0.5);
            assert.approximately(direction[0], want[0], 1e-3);
            assert.approximately(direction[1], want[1], 1e-3);
            assert.approximately(direction[2], want[2], 1e-3);
            assert.approximately(distance, 400, 1e-3);
        });
    });
});
