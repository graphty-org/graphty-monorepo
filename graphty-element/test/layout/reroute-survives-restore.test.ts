/**
 * A driver rebuild that an arrangement restore lands on is started over, never given up (issue #5670).
 *
 * An accelerator arriving moves the running force layout onto its accelerated driver. The rebuild
 * stops the layout first and is asynchronous, and a restore landing while it ran used to give the
 * rebuild up: the old driver stayed in and the layout stayed stopped. Here the rebuild is held in
 * the new engine's `init()` while the restore lands, so that ordering is the one tested -- once for
 * a rollback of another command's writes, which resumes the layout, and once for the reader's own
 * undo, which leaves it at rest.
 */
import "../../src/layout";

import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Styles } from "../../src/Styles";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";

const FORCE = { id: "force", engine: "ngraph", options: {}, dimension: "3d" } as const;

describe("a driver rebuild an arrangement restore lands on", () => {
    const teardown: (() => void)[] = [];

    afterEach(() => {
        vi.restoreAllMocks();
        for (const dispose of teardown.splice(0)) {
            dispose();
        }
    });

    /**
     * A layout manager running the force layout on ngraph over a small graph, with an acceleration
     * controller that insists on hardware, so an accelerator arriving reroutes it.
     * @returns The manager and its controller.
     */
    async function runningOnNgraph(): Promise<{ manager: LayoutManager; controller: AccelerationController }> {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const styles = Styles.default();
        const eventManager = new EventManager();
        const dataManager = new DataManager(eventManager, styles);
        const manager = new LayoutManager(eventManager, dataManager, styles);
        const controller = new AccelerationController({ policy: "required", registry: new AcceleratorRegistry() });
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

        dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        dataManager.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ]);
        await layoutManagerInternals.apply(manager, FORCE, { restoring: false });
        assert.instanceOf(manager.layoutEngine, NGraphEngine, "the force layout starts on the processor");
        assert.isTrue(manager.running, "and is running");

        return { manager, controller };
    }

    /**
     * Hold the accelerated engine's next `init()` until the returned function is called.
     * @returns Settles once `init()` has started; resolves to the function that lets it go on.
     */
    function holdAcceleratedInit(): Promise<() => void> {
        const { init } = SimulationLayoutEngine.prototype;
        let release = (): void => undefined;
        const open = new Promise<void>((resolve) => {
            release = resolve;
        });
        return new Promise((resolve) => {
            vi.spyOn(SimulationLayoutEngine.prototype, "init").mockImplementationOnce(async function (
                this: SimulationLayoutEngine,
            ) {
                resolve(release);
                await open;
                return init.call(this);
            });
        });
    }

    /**
     * Land a restore of the arrangement while the rebuild is held, as the element's arrangement
     * hook does, then let the rebuild go on and wait for every build queued behind it.
     * @param manager - The manager.
     * @param controller - Its controller.
     * @param byReader - Whether the reader asked for the restore.
     */
    async function restoreDuringReroute(
        manager: LayoutManager,
        controller: AccelerationController,
        byReader: boolean,
    ): Promise<void> {
        const held = holdAcceleratedInit();
        controller.setAccelerator(createFakeAccelerator());
        const release = await held;

        manager.loadArrangement(true, true, byReader);
        manager.running = false;
        release();

        // Queued behind the rebuild, and the layout already built: it only waits for its turn.
        await layoutManagerInternals.apply(manager, FORCE, { restoring: false });
    }

    it("resumes the layout on the accelerated driver when a rollback landed", async () => {
        const { manager, controller } = await runningOnNgraph();

        await restoreDuringReroute(manager, controller, false);

        assert.instanceOf(manager.layoutEngine, SimulationLayoutEngine, "the rebuild was not given up");
        assert.isTrue(manager.layoutEngine.isAccelerated, "it runs on the accelerator");
        assert.isTrue(manager.running, "the layout that was running runs again");
    });

    it("moves to the accelerated driver but stays at rest when the reader undid", async () => {
        const { manager, controller } = await runningOnNgraph();

        await restoreDuringReroute(manager, controller, true);

        assert.instanceOf(manager.layoutEngine, SimulationLayoutEngine, "the rebuild was not given up");
        assert.isTrue(manager.layoutEngine.isAccelerated, "it runs on the accelerator");
        assert.isFalse(manager.running, "the reader's undo leaves the layout at rest");
    });
});
