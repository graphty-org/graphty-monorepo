import { assert, describe, it } from "vitest";

import { AccelerationController, type GraphAccelerator } from "../../src/acceleration";
import { DataConfig } from "../../src/config/DataConfig";
import { createGraphSession } from "../../src/session";
import { makeSession } from "./helpers";

describe("createGraphSession", () => {
    it("builds a usable graph with no store, no canvas and no configuration", () => {
        const session = createGraphSession();

        assert.strictEqual(session.status.ready, true);
        assert.strictEqual(session.status.counts.nodes, 0);
        assert.strictEqual(session.status.counts.edges, 0);
        assert.strictEqual(session.snapshot().nodeCount, 0);
        assert.strictEqual(session.data.statistics().directedness, "unknown", "nothing has settled the direction");
        session.dispose();
    });

    it("takes the element's own data defaults when it is given no configuration", () => {
        const session = createGraphSession();

        assert.strictEqual(session.config.data.knownFields.nodeIdPath, "id");
        assert.strictEqual(session.config.data.knownFields.edgeWeightPath, "weight");
        assert.strictEqual(session.config.data.directed, "auto");
        assert.strictEqual(session.config.acceleration.policy, "auto");
        session.dispose();
    });

    it("reads a configuration the host replaces, rather than the one it was built with", () => {
        // Applying a style template to the element replaces its configuration object outright, so
        // a session that captured the old one would go on reporting a graph as undirected after it
        // had been told otherwise.
        let live = DataConfig.parse({ directed: false });
        const session = createGraphSession({ config: { data: () => live } });

        assert.strictEqual(session.config.data.directed, false);

        live = DataConfig.parse({ directed: true, knownFields: { nodeIdPath: "name" } });

        assert.strictEqual(session.config.data.directed, true);
        assert.strictEqual(session.config.data.knownFields.nodeIdPath, "name");
        session.dispose();
    });

    it("reads the store it is handed rather than building a second one", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        assert.strictEqual(harness.session.status.counts.nodes, 2);
        assert.strictEqual(harness.session.status.counts.edges, 1);
        assert.strictEqual(harness.session.snapshot(), harness.store.getSnapshot(), "one store, one snapshot");
        harness.session.dispose();
    });

    it("hands back the live position array, not a copy of one", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        harness.session.snapshot();

        harness.session.positions.write(0, 1, 2, 3);
        const read = { x: 0, y: 0, z: 0 };
        harness.store.positions.read(0, read);

        assert.deepEqual(read, { x: 1, y: 2, z: 3 }, "the session and the store share one array");
        harness.session.dispose();
    });

    it("reports a node no layout has placed as unplaced rather than at the origin", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        harness.session.snapshot();

        assert.strictEqual(harness.session.positions.isPlaced(0), false);
        harness.session.dispose();
    });
});

describe("a session's ownership of what it holds", () => {
    it("disposes the store it built", () => {
        const session = createGraphSession();
        const {store} = session.data;

        assert.doesNotThrow(() => store.getSnapshot());
        session.dispose();
        assert.throws(() => store.getSnapshot(), /after dispose/);
    });

    it("leaves a store it was handed alone, because the renderer sharing it still needs the graph", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);

        harness.session.dispose();

        assert.strictEqual(harness.store.isDisposed, false);
        assert.strictEqual(harness.store.getSnapshot().nodeCount, 1, "the graph survived the session");
    });

    it("refuses a data verb once disposed, naming the code a consumer switches on", () => {
        const session = createGraphSession();
        session.dispose();

        assert.throws(() => session.snapshot(), /disposed/);
        try {
            session.data.statistics();
            assert.fail("a disposed session must not answer");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_DISPOSED");
        }
    });

    it("still answers status after disposal, because a teardown path is what asks", () => {
        const session = createGraphSession();
        session.dispose();

        assert.strictEqual(session.status.ready, false);
        assert.strictEqual(session.status.counts.nodes, 0);
    });

    it("can be disposed twice", () => {
        const session = createGraphSession();
        session.dispose();
        session.dispose();

        assert.strictEqual(session.status.ready, false);
    });
});

describe("what a session publishes without being asked to compute", () => {
    it("carries the catalogue, whose tables are the same data for every session", () => {
        const first = createGraphSession();
        const second = createGraphSession();

        assert.isAbove(first.catalog.algorithms().length, 0);
        assert.isAbove(first.catalog.layouts().length, 0);
        assert.isAbove(first.catalog.formats().length, 0);
        assert.isAbove(first.catalog.palettes().length, 0);
        assert.isAbove(first.catalog.scales().length, 0);

        // THE TABLES, not the catalogue object. What the element CAN do does not depend on which
        // graph is loaded, so all five are the same frozen arrays for both sessions, and two
        // sessions that disagreed about which algorithms exist would be a bug. The catalogue
        // itself is per session because `metrics()` is about THIS graph -- see metrics.test.ts,
        // which pins both halves of that.
        assert.strictEqual(first.catalog.algorithms(), second.catalog.algorithms());
        assert.strictEqual(first.catalog.layouts(), second.catalog.layouts());
        assert.strictEqual(first.catalog.formats(), second.catalog.formats());
        assert.strictEqual(first.catalog.palettes(), second.catalog.palettes());
        assert.strictEqual(first.catalog.scales(), second.catalog.scales());

        first.dispose();
        second.dispose();
    });

    it("keeps the catalogue plain enough to serialise, which is what a worker and a saved document need", () => {
        const session = createGraphSession();
        const round = JSON.parse(JSON.stringify(session.catalog.algorithms())) as { key: string }[];

        assert.strictEqual(round.length, session.catalog.algorithms().length);
        assert.isString(round[0].key);
        session.dispose();
    });

    it("publishes the acceleration capability document, and states an unfinished probe as such", () => {
        const session = createGraphSession({ config: { acceleration: { policy: "off" } } });

        assert.strictEqual(session.capabilities.acceleration.state, "off");
        assert.strictEqual(session.config.acceleration.policy, "off");
        session.dispose();
    });

    it("does not measure the hardware until something asks what the machine can do", async () => {
        const session = createGraphSession();

        // A renderer builds a session on its way up, and reaching for a GPU adapter on the way to
        // drawing a thirty-node graph is a cost nobody asked for. Reading the capability document
        // IS the request, so that is what starts the measurement.
        assert.strictEqual(session.capabilities.acceleration.state, "probing", "the answer is not known yet");

        await new Promise((resolve) => setTimeout(resolve, 0));

        assert.strictEqual(session.capabilities.acceleration.state, "unavailable", "nothing registered an accelerator");
        assert.isString(session.capabilities.acceleration.reason, "and it says why in a sentence");
        session.dispose();
    });

    it("does not start a probe on a session that has been disposed", async () => {
        const session = createGraphSession();
        session.dispose();

        assert.doesNotThrow(() => session.capabilities);
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.strictEqual(session.capabilities.acceleration.state, "probing", "nothing went looking");
    });

    it("lets a host that already owns a controller hand it in instead of ending up with two", () => {
        const injected = {
            capabilities: { acceleration: { state: "idle", backend: "webgpu" } } as const,
            policy: "required" as const,
            minNodes: 5_000,
            disposed: false,
            setPolicy(): void {
                // A fixed document: this double publishes one answer and never moves.
            },
            setAccelerator(): void {
                // Likewise.
            },
            onChange(): () => void {
                return (): void => undefined;
            },
            dispose(): void {
                this.disposed = true;
            },
        };
        const session = createGraphSession({ acceleration: injected });

        assert.strictEqual(session.capabilities.acceleration.state, "idle");
        assert.strictEqual(session.config.acceleration.policy, "required", "the live controller is the authority");
        assert.strictEqual(session.config.acceleration.minNodes, 5_000);

        session.dispose();
        assert.strictEqual(injected.disposed, false, "a controller it did not build is not its to release");
    });

    it("injects a fake through setAccelerator and reports it as idle on capabilities:changed", () => {
        const session = createGraphSession();
        const seen: string[] = [];

        session.on("capabilities:changed", (detail) => {
            seen.push(detail.capabilities.acceleration.state);
        });
        session.setAccelerator(fakeAccelerator());

        assert.strictEqual(session.capabilities.acceleration.state, "idle", "attached, with nothing running on it");
        assert.strictEqual(session.capabilities.acceleration.backend, "webgpu");
        assert.deepStrictEqual(seen, ["idle"], "one event, for the one transition");
        session.dispose();
    });

    it("applies a policy written to session.acceleration at once, and publishes the transition", () => {
        const session = createGraphSession();
        let events = 0;

        session.on("capabilities:changed", () => {
            events += 1;
        });
        session.acceleration = "off";

        assert.strictEqual(session.acceleration, "off");
        assert.strictEqual(session.config.acceleration.policy, "off", "and the configuration says the same");
        assert.strictEqual(session.capabilities.acceleration.state, "off");
        assert.strictEqual(events, 1);
        session.dispose();
    });

    it("publishes from the controller it was handed, not from a second one it built", () => {
        const controller = new AccelerationController({ policy: "off" });
        const session = createGraphSession({ acceleration: controller });

        assert.strictEqual(session.capabilities, controller.capabilities, "one document, not a copy of one");

        session.dispose();
        controller.dispose();
    });

    it("carries the document capabilities returns in the event payload", () => {
        const controller = new AccelerationController({ policy: "off" });
        const session = createGraphSession({ acceleration: controller });
        let carried: unknown = null;

        session.on("capabilities:changed", (detail) => {
            carried = detail.capabilities;
            assert.strictEqual(detail.capabilities, session.capabilities, "the same object the getter returns");
        });
        session.setAccelerator(fakeAccelerator());

        assert.strictEqual(carried, session.capabilities);
        session.dispose();
        controller.dispose();
    });
});

/** The accelerator these cases inject: a name, a backend and one member, which is all a third party owes. */
function fakeAccelerator(): GraphAccelerator {
    return {
        name: "fake",
        backend: "webgpu",
        device: { vendor: "acme", architecture: "gen-1", description: "Acme Fake GPU" },
        forceAtlas2: (): string => "gpu",
        dispose: (): void => undefined,
    };
}
