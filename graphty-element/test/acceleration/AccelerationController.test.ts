import { assert, describe, it, vi } from "vitest";

import { type AcceleratedWork, AccelerationController } from "../../src/acceleration/AccelerationController";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import {
    ACCELERATION_MIN_NODES_BY_CAPABILITY,
    ACCELERATION_MIN_NODES_DEFAULT,
    ACCELERATION_MIN_NODES_MEASUREMENT,
    type AccelerationPrecision,
    type AccelerationStatus,
    CPU_PRECISION,
    type FlooredCapability,
    type GraphAccelerator,
} from "../../src/acceleration/types";
import { GraphtyError, isGraphtyError } from "../../src/errors";
import { GraphtyLogger } from "../../src/logging/GraphtyLogger.js";
import { resetLoggingConfig } from "../../src/logging/LoggerConfig.js";
import { LogLevel, type LogRecord } from "../../src/logging/types.js";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";

/** A promise the test resolves when it wants to, for device loss and for work in flight. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((settle) => {
        resolve = settle;
    });

    return { promise, resolve };
}

/**
 * Polls until the controller has settled where the test expects it. Device loss, recovery and
 * the re-probe after a late registration all finish in their own microtasks.
 */
async function until(predicate: () => boolean, what: string): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
        if (predicate()) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1));
    }

    throw new Error(`timed out waiting for ${what}`);
}

/** How to build the fake accelerator a test injects or has a factory return. */
interface FakeOptions {
    name?: string;
    precision?: AccelerationPrecision;
    lost?: Promise<{ reason: string }>;
    members?: Record<string, () => unknown>;
    onDispose?: () => void;
}

/**
 * The accelerator every test here uses. It implements `forceAtlas2` and nothing else, which is
 * exactly what a third party is allowed to do.
 */
function fakeAccelerator(options: FakeOptions = {}): GraphAccelerator {
    return {
        name: options.name ?? "fake",
        backend: "webgpu",
        device: { vendor: "acme", architecture: "gen-1", description: "Acme Fake GPU" },
        dispose: options.onDispose ?? ((): void => undefined),
        ...(options.precision === undefined ? {} : { precision: options.precision }),
        ...(options.lost === undefined ? {} : { lost: options.lost }),
        ...(options.members ?? { forceAtlas2: (): string => "gpu" }),
    };
}

/** A registry holding one factory that always builds the given accelerator. */
function registryWith(accelerator: GraphAccelerator): AcceleratorRegistry {
    const registry = new AcceleratorRegistry();
    registry.register({ name: "fake", backend: "webgpu", factory: () => Promise.resolve(accelerator) });
    return registry;
}

/**
 * A factory on a host whose only adapter is a software renderer: it refuses with
 * `E_SOFTWARE_ONLY` unless software is acceptable, the way the `./webgpu` entry does.
 */
function softwareOnlyFactory(
    onDispose?: () => void,
): (options?: { acceptSoftware?: boolean }) => Promise<GraphAccelerator> {
    return (options) =>
        options?.acceptSoftware === true
            ? Promise.resolve(fakeAccelerator({ name: "software", onDispose }))
            : Promise.reject(
                  new GraphtyError({
                      code: "E_SOFTWARE_ONLY",
                      message: "the only adapter here is a software renderer",
                      source: "acceleration",
                  }),
              );
}

const LAYOUT: AcceleratedWork = { capability: "forceAtlas2", nodeCount: 10_000 };

describe("AccelerationController: probing", () => {
    it("starts in probing, because an unfinished probe is not a missing GPU", () => {
        const controller = new AccelerationController({ registry: new AcceleratorRegistry() });

        assert.strictEqual(controller.state, "probing");
        assert.isUndefined(controller.status.code);
        controller.dispose();
    });

    it("never looks when the consumer switched acceleration off", async () => {
        const registry = registryWith(fakeAccelerator());
        const built = vi.fn(() => Promise.resolve(fakeAccelerator()));
        registry.register({ name: "watched", factory: built });
        const controller = new AccelerationController({ policy: "off", registry });

        const status = await controller.start();

        assert.strictEqual(status.state, "off");
        assert.strictEqual(built.mock.calls.length, 0);
        assert.deepStrictEqual(controller.plan(LAYOUT), { accelerated: false, reason: "acceleration is switched off" });
        controller.dispose();
    });

    it("says what to import when no factory is registered", async () => {
        const controller = new AccelerationController({ registry: new AcceleratorRegistry() });

        const status = await controller.start();

        assert.strictEqual(status.state, "unavailable");
        assert.include(status.reason, "@graphty/graphty-element/webgpu");
        assert.isUndefined(status.code);
        controller.dispose();
    });

    it("attaches the first accelerator a factory builds and rests at idle", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });

        const status = await controller.start();

        assert.strictEqual(status.state, "idle");
        assert.strictEqual(status.backend, "webgpu");
        assert.strictEqual(status.vendor, "acme");
        assert.strictEqual(status.architecture, "gen-1");
        assert.strictEqual(status.device, "Acme Fake GPU");
        assert.strictEqual(controller.accelerator?.name, "fake");
        controller.dispose();
    });

    it("omits a device fact the backend did not name, rather than publishing an empty string", async () => {
        /* A browser masks the device and the description for an ordinary origin, so an
           accelerator whose driver named a vendor and nothing else is the common case rather
           than a corner. `AcceleratorDeviceInfo` is always-present-may-be-empty and
           `AccelerationStatus` is present-only-when-named; this is where the two meet. Publishing
           the empty string handed a bare "" to every consumer that tests for `undefined`. */
        const masked = createFakeAccelerator({
            members: { device: { vendor: "nvidia", architecture: "", description: "" } },
        });
        const controller = new AccelerationController({ registry: registryWith(masked) });

        const status = await controller.start();

        assert.strictEqual(status.state, "idle");
        assert.strictEqual(status.backend, "webgpu");
        assert.strictEqual(status.vendor, "nvidia");
        assert.isFalse("architecture" in status, "an unnamed architecture must not be a key at all");
        assert.isFalse("device" in status, "an unnamed description must not be a key at all");
        controller.dispose();
    });

    it("publishes the code and the sentence a factory threw, so a chip can say why", async () => {
        const registry = new AcceleratorRegistry();
        registry.register({
            name: "webgpu-graph-algorithms",
            factory: () =>
                Promise.reject(
                    new GraphtyError({
                        code: "E_NO_WEBGPU",
                        message: "WebGPU requires a secure context (https or localhost)",
                        source: "acceleration",
                    }),
                ),
        });
        const controller = new AccelerationController({ registry });

        const status = await controller.start();

        assert.strictEqual(status.state, "unavailable");
        assert.strictEqual(status.code, "E_NO_WEBGPU");
        assert.include(status.reason, "secure context");
        controller.dispose();
    });

    it("tries every registered factory in order and keeps the last diagnosis", async () => {
        const registry = new AcceleratorRegistry();
        const second = vi.fn(() => Promise.resolve(fakeAccelerator({ name: "second" })));
        registry.register({ name: "first", factory: () => Promise.resolve(null) });
        registry.register({ name: "second", factory: second });
        const controller = new AccelerationController({ registry });

        await controller.start();

        assert.strictEqual(second.mock.calls.length, 1);
        assert.strictEqual(controller.accelerator?.name, "second");
        controller.dispose();
    });

    it("probes once, however many callers ask", async () => {
        const registry = new AcceleratorRegistry();
        const factory = vi.fn(() => Promise.resolve(fakeAccelerator()));
        registry.register({ name: "fake", factory });
        const controller = new AccelerationController({ registry });

        await Promise.all([controller.start(), controller.start(), controller.start()]);

        assert.strictEqual(factory.mock.calls.length, 1);
        controller.dispose();
    });

    it("hands the factory the ceiling it has to respect", async () => {
        const registry = new AcceleratorRegistry();
        const factory = vi.fn(() => Promise.resolve(fakeAccelerator()));
        registry.register({ name: "fake", factory });
        const controller = new AccelerationController({ registry, exactMaxNodes: 250_000 });

        await controller.start();

        assert.deepEqual(factory.mock.calls[0] as unknown[], [{ exactMaxNodes: 250_000, acceptSoftware: false }]);
        controller.dispose();
    });

    it("tells the factory whether a software adapter is acceptable, which only the policy knows", async () => {
        const auto = new AcceleratorRegistry();
        const autoFactory = vi.fn(() => Promise.resolve(fakeAccelerator()));
        auto.register({ name: "fake", factory: autoFactory });
        const required = new AcceleratorRegistry();
        const requiredFactory = vi.fn(softwareOnlyFactory());
        required.register({ name: "fake", factory: requiredFactory });
        const underAuto = new AccelerationController({ registry: auto });
        const underRequired = new AccelerationController({ policy: "required", registry: required });

        await Promise.all([underAuto.start(), underRequired.start()]);

        assert.deepEqual(autoFactory.mock.calls as unknown[], [[{ exactMaxNodes: undefined, acceptSoftware: false }]]);
        // Hardware first, and software only once the factory said software is all there is: that
        // refusal is how the controller knows the attachment is software.
        assert.deepEqual(requiredFactory.mock.calls as unknown[], [
            [{ exactMaxNodes: undefined, acceptSoftware: false }],
            [{ exactMaxNodes: undefined, acceptSoftware: true }],
        ]);
        assert.strictEqual(underRequired.state, "idle");
        underAuto.dispose();
        underRequired.dispose();
    });

    it("looks again when a factory is registered after it gave up", async () => {
        const registry = new AcceleratorRegistry();
        const controller = new AccelerationController({ registry });
        assert.strictEqual((await controller.start()).state, "unavailable");

        registry.register({ name: "late", factory: () => Promise.resolve(fakeAccelerator({ name: "late" })) });

        await until(() => controller.state === "idle", "the late registration to be probed");
        assert.strictEqual(controller.accelerator?.name, "late");
        controller.dispose();
    });
});

describe("AccelerationController: publishing", () => {
    it("announces every transition and nothing else", async () => {
        const registry = new AcceleratorRegistry();
        const controller = new AccelerationController({ registry });
        const seen: AccelerationStatus[] = [];
        controller.onChange((status) => {
            seen.push(status);
        });

        await controller.start();
        await controller.start();

        assert.deepStrictEqual(
            seen.map((status) => status.state),
            ["unavailable"],
        );
        controller.dispose();
    });

    it("walks off, probing and idle when the policy is switched back on", async () => {
        const controller = new AccelerationController({ policy: "off", registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const seen: string[] = [];
        controller.onChange((status) => {
            seen.push(status.state);
        });

        controller.setPolicy("auto");
        await until(() => controller.state === "idle", "the policy change to probe");

        assert.deepStrictEqual(seen, ["probing", "idle"]);
        controller.dispose();
    });

    it("releases the device when the consumer switches acceleration off", async () => {
        const disposed = vi.fn();
        const controller = new AccelerationController({
            registry: registryWith(fakeAccelerator({ onDispose: disposed })),
        });
        await controller.start();

        controller.setPolicy("off");

        assert.strictEqual(disposed.mock.calls.length, 1);
        assert.strictEqual(controller.state, "off");
        assert.isNull(controller.accelerator);
        controller.dispose();
    });

    it("publishes the capabilities subset the DOM event carries", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });

        await controller.start();

        assert.deepStrictEqual(controller.capabilities, { acceleration: controller.status });
        assert.isTrue(Object.isFrozen(controller.status));
        controller.dispose();
    });

    it("returns the same capabilities object until a transition", () => {
        const controller = new AccelerationController({ registry: new AcceleratorRegistry() });
        const first = controller.capabilities;

        assert.strictEqual(controller.capabilities, first, "a reader can cache it and compare by identity");

        controller.setPolicy("off");

        assert.notStrictEqual(controller.capabilities, first, "and a transition replaces it");
        assert.strictEqual(controller.capabilities.acceleration.state, "off");
        controller.dispose();
    });

    it("moves to active while work is on the accelerator and back to idle after it", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const gate = deferred<string>();

        const running = controller.run(LAYOUT, () => gate.promise);
        await until(() => controller.state === "active", "the work to reach the accelerator");
        gate.resolve("positions");

        assert.deepStrictEqual(await running, { accelerated: true, value: "positions", precision: "f32" });
        assert.strictEqual(controller.state, "idle");
        controller.dispose();
    });
});

describe("AccelerationController: the whileRunning span", () => {
    /** A span opener that records how many spans are open right now. */
    function spanCounter(): { open: number; opened: number; whileRunning: () => () => void } {
        const counter = {
            open: 0,
            opened: 0,
            whileRunning: (): (() => void) => {
                counter.open += 1;
                counter.opened += 1;
                return (): void => {
                    counter.open -= 1;
                };
            },
        };

        return counter;
    }

    it("holds the span open for exactly the accelerated call", async () => {
        const spans = spanCounter();
        const controller = new AccelerationController({
            registry: registryWith(fakeAccelerator()),
            whileRunning: spans.whileRunning,
        });
        await controller.start();
        const gate = deferred<string>();
        let openDuring = -1;

        const running = controller.run(LAYOUT, async () => {
            openDuring = spans.open;
            return gate.promise;
        });
        await until(() => openDuring !== -1, "the work to reach the accelerator");
        assert.strictEqual(openDuring, 1, "the span is open while the work is on the accelerator");
        gate.resolve("positions");
        await running;

        assert.strictEqual(spans.open, 0, "and closed once it has come back");
        assert.strictEqual(spans.opened, 1);
        controller.dispose();
    });

    it("closes the span when the accelerated call throws", async () => {
        const spans = spanCounter();
        const controller = new AccelerationController({
            registry: registryWith(fakeAccelerator()),
            whileRunning: spans.whileRunning,
        });
        await controller.start();

        await controller
            .run(LAYOUT, (): string => {
                throw new Error("the kernel failed");
            })
            .catch(() => undefined);

        assert.strictEqual(spans.opened, 1);
        assert.strictEqual(spans.open, 0);
        controller.dispose();
    });

    it("never opens the span for work the decision sent to the CPU path", async () => {
        const spans = spanCounter();
        const controller = new AccelerationController({
            registry: registryWith(fakeAccelerator()),
            minNodes: 1_000_000,
            whileRunning: spans.whileRunning,
        });
        await controller.start();

        const outcome = await controller.run(LAYOUT, (): string => "gpu");

        assert.isFalse(outcome.accelerated);
        assert.strictEqual(spans.opened, 0, "the CPU path must not hold the host's frames");
        controller.dispose();
    });
});

describe("AccelerationController: the acceleration.minNodes threshold", () => {
    it("takes the CPU path just below the threshold and the accelerator at it", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()), minNodes: 1000 });
        await controller.start();

        const below = controller.plan({ capability: "forceAtlas2", nodeCount: 999 });
        const at = controller.plan({ capability: "forceAtlas2", nodeCount: 1000 });

        assert.isFalse(below.accelerated);
        assert.include(below.accelerated ? "" : below.reason, "acceleration.minNodes");
        assert.isTrue(at.accelerated);
        assert.strictEqual(controller.state, "idle");
        controller.dispose();
    });

    it("stays idle rather than unavailable below the threshold: the accelerator is fine", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()), minNodes: 1000 });
        await controller.start();

        const outcome = await controller.run({ capability: "forceAtlas2", nodeCount: 10 }, () => "gpu");

        assert.isFalse(outcome.accelerated);
        assert.strictEqual(controller.status.state, "idle");
        assert.isUndefined(controller.status.code);
        controller.dispose();
    });

    it("accelerates every graph at the default threshold of zero", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();

        assert.strictEqual(controller.minNodes, ACCELERATION_MIN_NODES_DEFAULT);
        assert.isTrue(controller.plan({ capability: "forceAtlas2", nodeCount: 0 }).accelerated);
        controller.dispose();
    });

    it("refuses a threshold that is not a whole count of nodes", () => {
        const controller = new AccelerationController({ registry: new AcceleratorRegistry() });

        try {
            controller.setMinNodes(-1);
            assert.fail("a negative threshold must be refused");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            if (isGraphtyError(error)) {
                assert.strictEqual(error.code, "E_OPTION_RANGE");
                assert.strictEqual(error.details.key, "acceleration.minNodes");
            }
        }

        assert.throws(() => {
            controller.setMinNodes(12.5);
        }, /acceleration\.minNodes/);
        controller.dispose();
    });

    it("feature-tests the capability instead of assuming the accelerator has it", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();

        const decision = controller.plan({ capability: "pageRank", nodeCount: 10_000 });

        assert.isFalse(decision.accelerated);
        assert.include(decision.accelerated ? "" : decision.reason, "pageRank");
        controller.dispose();
    });
});

describe("AccelerationController: the built-in floor of a traversal", () => {
    /** An accelerator that walks, so the floor and not the feature test is what decides. */
    const walker = (): GraphAccelerator =>
        fakeAccelerator({
            members: {
                forceAtlas2: (): string => "gpu",
                breadthFirstSearch: (): string => "gpu",
                sssp: (): string => "gpu",
            },
        });
    // The table is partial by design -- a capability with no measured floor has no entry -- so a
    // reader of it is `number | undefined`, and the cases below want the number. This is the one
    // place that asserts the traversal entries exist, so it is the one place that narrows.
    const floorOf = (capability: FlooredCapability): number => {
        const measured = ACCELERATION_MIN_NODES_BY_CAPABILITY[capability];

        if (measured === undefined) {
            throw new Error(`${capability} has no measured floor`);
        }

        return measured;
    };
    const floor = floorOf("breadthFirstSearch");

    it("has a measured floor for each traversal the adapters route, and none for the layout", () => {
        assert.isAbove(floor, 0);
        assert.isAbove(floorOf("sssp"), 0);
        // The layout has no floor, and cannot be given one by accident: the table's keys are the
        // seam's ALGORITHM members, so naming a layout capability here would not compile. This
        // asserts the intent for a reader who has only the runtime value in front of them.
        assert.notInclude(Object.keys(ACCELERATION_MIN_NODES_BY_CAPABILITY), "forceAtlas2");
    });

    it("takes the CPU path below the floor and the accelerator at it, and says what was measured", async () => {
        const controller = new AccelerationController({ registry: registryWith(walker()) });
        await controller.start();

        const below = controller.plan({ capability: "breadthFirstSearch", nodeCount: floor - 1 });
        const at = controller.plan({ capability: "breadthFirstSearch", nodeCount: floor });

        assert.isFalse(below.accelerated);
        const reason = below.accelerated ? "" : below.reason;
        assert.include(reason, String(floor));
        assert.include(reason, "breadthFirstSearch");
        assert.include(reason, ACCELERATION_MIN_NODES_MEASUREMENT);
        assert.include(reason, "acceleration.minNodes");
        assert.isTrue(at.accelerated);
        assert.strictEqual(controller.state, "idle");
        controller.dispose();
    });

    it("leaves the layout on the accelerator at every size: the zero was measured for it", async () => {
        const controller = new AccelerationController({ registry: registryWith(walker()) });
        await controller.start();

        assert.isTrue(controller.plan({ capability: "forceAtlas2", nodeCount: 1 }).accelerated);
        assert.isFalse(controller.plan({ capability: "breadthFirstSearch", nodeCount: 1 }).accelerated);
        controller.dispose();
    });

    it("does not apply under required, so a benchmark of the small end can reach the device", async () => {
        const controller = new AccelerationController({ policy: "required", registry: registryWith(walker()) });
        await controller.ready();

        assert.isTrue(controller.plan({ capability: "breadthFirstSearch", nodeCount: 1 }).accelerated);
        controller.dispose();
    });

    it("is replaced by a threshold the consumer set, even a zero", async () => {
        const built = new AccelerationController({ registry: registryWith(walker()), minNodes: 0 });
        await built.start();
        assert.isTrue(built.plan({ capability: "breadthFirstSearch", nodeCount: 1 }).accelerated);
        built.dispose();

        const set = new AccelerationController({ registry: registryWith(walker()) });
        await set.start();
        assert.isFalse(set.plan({ capability: "breadthFirstSearch", nodeCount: 1 }).accelerated);
        set.setMinNodes(0);
        assert.isTrue(set.plan({ capability: "breadthFirstSearch", nodeCount: 1 }).accelerated);
        set.setMinNodes(floor + 1000);
        assert.isFalse(set.plan({ capability: "breadthFirstSearch", nodeCount: floor + 999 }).accelerated);
        set.dispose();
    });

    it("reports a missing member as missing, not as too small", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();

        const decision = controller.plan({ capability: "breadthFirstSearch", nodeCount: 1 });

        assert.isFalse(decision.accelerated);
        assert.include(decision.accelerated ? "" : decision.reason, "does not implement");
        controller.dispose();
    });
});

describe("AccelerationController: acceleration=required", () => {
    it("rejects rather than quietly running on the CPU when there is nothing to run on", async () => {
        const controller = new AccelerationController({ policy: "required", registry: new AcceleratorRegistry() });
        const work = vi.fn(() => "gpu");

        const refusal = await controller.ready().catch((error: unknown) => error);
        assert.instanceOf(refusal, Error);
        assert.match(refusal.message, /acceleration is required/);
        const failure = await controller.run(LAYOUT, work).catch((error: unknown) => error);
        assert.instanceOf(failure, GraphtyError);
        assert.strictEqual(work.mock.calls.length, 0);

        try {
            controller.plan(LAYOUT);
            assert.fail("required acceleration must not plan a CPU path");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            if (isGraphtyError(error)) {
                assert.strictEqual(error.code, "E_NO_ACCELERATOR");
                assert.strictEqual(error.source, "acceleration");
                assert.strictEqual(error.details.policy, "required");
            }
        }

        controller.dispose();
    });

    it("rejects when the accelerator does not implement what the work needs", async () => {
        const controller = new AccelerationController({
            policy: "required",
            registry: registryWith(fakeAccelerator()),
        });
        await controller.ready();

        const refusal = await controller
            .run({ capability: "pageRank", nodeCount: 10_000 }, () => "gpu")
            .catch((error: unknown) => error);
        assert.instanceOf(refusal, Error);
        assert.match(refusal.message, /acceleration is required/);
        controller.dispose();
    });

    it("still honours the threshold, because a threshold is about what pays, not what is possible", async () => {
        const controller = new AccelerationController({
            policy: "required",
            registry: registryWith(fakeAccelerator()),
            minNodes: 1000,
        });
        await controller.ready();

        const decision = controller.plan({ capability: "forceAtlas2", nodeCount: 10 });

        assert.isFalse(decision.accelerated);
        assert.strictEqual(controller.state, "idle");
        controller.dispose();
    });

    it("accelerates once an accelerator is there", async () => {
        const controller = new AccelerationController({
            policy: "required",
            registry: registryWith(fakeAccelerator()),
        });

        const status = await controller.ready();

        assert.strictEqual(status.state, "idle");
        assert.isTrue(controller.plan(LAYOUT).accelerated);
        controller.dispose();
    });
});

describe("AccelerationController: device loss", () => {
    it("reports a lost device as an error with a code, then comes back", async () => {
        const lost = deferred<{ reason: string }>();
        const first = fakeAccelerator({ name: "first", lost: lost.promise });
        const second = fakeAccelerator({ name: "second" });
        const registry = new AcceleratorRegistry();
        let built = 0;
        registry.register({
            name: "fake",
            factory: () => {
                built += 1;
                return Promise.resolve(built === 1 ? first : second);
            },
        });
        const controller = new AccelerationController({ registry });
        const seen: AccelerationStatus[] = [];
        await controller.start();
        controller.onChange((status) => {
            seen.push(status);
        });

        lost.resolve({ reason: "the GPU process crashed" });

        // Two transitions, not one: the loss is reported first and recovery happens after it,
        // so waiting for "idle" alone would pass on the idle the controller is already in.
        await until(() => seen.length === 2, "the loss and the recovery");
        assert.deepStrictEqual(
            seen.map((status) => status.state),
            ["error", "idle"],
        );
        assert.strictEqual(seen[0]?.code, "E_DEVICE_LOST");
        assert.include(seen[0]?.reason, "the GPU process crashed");
        assert.strictEqual(controller.accelerator?.name, "second");
        assert.isUndefined(controller.status.code);
        controller.dispose();
    });

    it("stays in error, not unavailable, when it cannot come back", async () => {
        const lost = deferred<{ reason: string }>();
        const first = fakeAccelerator({ name: "first", lost: lost.promise });
        const registry = new AcceleratorRegistry();
        let built = 0;
        registry.register({
            name: "fake",
            factory: () => {
                built += 1;
                return Promise.resolve(built === 1 ? first : null);
            },
        });
        const controller = new AccelerationController({ registry });
        await controller.start();

        lost.resolve({ reason: "device removed" });

        await until(() => (controller.status.reason ?? "").includes("reattaching failed"), "the failed recovery");
        assert.strictEqual(controller.state, "error");
        assert.strictEqual(controller.status.code, "E_DEVICE_LOST");
        assert.isFalse(controller.plan(LAYOUT).accelerated);
        controller.dispose();
    });

    it("leaves recovery alone when the caller asked it to", async () => {
        const lost = deferred<{ reason: string }>();
        const registry = registryWith(fakeAccelerator({ lost: lost.promise }));
        const controller = new AccelerationController({ registry, recoverOnDeviceLoss: false });
        await controller.start();

        lost.resolve({ reason: "device removed" });

        await until(() => controller.state === "error", "the loss to be reported");
        assert.notInclude(controller.status.reason, "reattaching");
        controller.dispose();
    });

    it("disposes the dead accelerator so its resources are not stranded", async () => {
        const lost = deferred<{ reason: string }>();
        const disposed = vi.fn();
        const registry = registryWith(fakeAccelerator({ lost: lost.promise, onDispose: disposed }));
        const controller = new AccelerationController({ registry, recoverOnDeviceLoss: false });
        await controller.start();

        lost.resolve({ reason: "device removed" });

        await until(() => disposed.mock.calls.length === 1, "the dead accelerator to be disposed");
        controller.dispose();
    });

    it("does not report a loss for an accelerator it had already released", async () => {
        const lost = deferred<{ reason: string }>();
        const controller = new AccelerationController({ registry: new AcceleratorRegistry() });
        controller.setAccelerator(fakeAccelerator({ lost: lost.promise }));
        controller.setAccelerator(null);

        lost.resolve({ reason: "destroyed" });
        await Promise.resolve();
        await Promise.resolve();

        assert.strictEqual(controller.state, "unavailable");
        assert.isUndefined(controller.status.code);
        controller.dispose();
    });
});

describe("AccelerationController: a failure on the accelerator is never a CPU result", () => {
    it("throws what the accelerated work threw, wrapped, and returns no value", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();

        const outcome = await controller
            .run(LAYOUT, (): string => {
                throw new Error("the kernel failed");
            })
            .catch((error: unknown) => error);

        assert.instanceOf(outcome, GraphtyError);
        if (isGraphtyError(outcome)) {
            assert.strictEqual(outcome.source, "acceleration");
            assert.strictEqual(outcome.code, "E_INTERNAL");
            assert.strictEqual(outcome.message, "the kernel failed");
            assert.strictEqual(outcome.details.capability, "forceAtlas2");
        }

        controller.dispose();
    });

    it("keeps the backend's code, so a consumer switches on it", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const tooLarge = Object.assign(new Error("the graph does not fit in one buffer"), { code: "E_TOO_LARGE" });

        const outcome = await controller
            .run(LAYOUT, (): string => {
                throw tooLarge;
            })
            .catch((error: unknown) => error);

        assert.strictEqual(isGraphtyError(outcome) && outcome.code, "E_TOO_LARGE");
        assert.strictEqual(isGraphtyError(outcome) && outcome.cause, tooLarge);
        controller.dispose();
    });

    it("says the device is gone when a run reports it, rather than waiting for the lost promise", async () => {
        const controller = new AccelerationController({
            registry: registryWith(fakeAccelerator()),
            recoverOnDeviceLoss: false,
        });
        await controller.start();
        const deviceLost = Object.assign(new Error("device lost during dispatch"), { code: "E_DEVICE_LOST" });

        const failure = await controller
            .run(LAYOUT, (): string => {
                throw deviceLost;
            })
            .catch((error: unknown) => error);
        assert.instanceOf(failure, GraphtyError);

        assert.strictEqual(controller.state, "error");
        assert.strictEqual(controller.status.code, "E_DEVICE_LOST");
        controller.dispose();
    });

    it("never answers accelerated:false once the accelerated work has started", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const failures: unknown[] = [
            new Error("plain"),
            Object.assign(new Error("coded"), { code: "E_DEVICE_LOST" }),
            Object.assign(new Error("foreign"), { code: "E_WGSL_COMPILE" }),
            "a thrown string",
        ];

        for (const failure of failures) {
            const outcome = await controller
                .run(LAYOUT, (): string => {
                    throw failure;
                })
                .catch((error: unknown) => error);

            assert.notProperty(outcome, "accelerated");
            assert.instanceOf(outcome, Error);
        }

        controller.dispose();
    });

    it("lets a cancellation through untouched, because aborting is not a failure", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });

        const failure = await controller
            .run(LAYOUT, (): string => {
                throw aborted;
            })
            .catch((error: unknown) => error);
        assert.strictEqual(failure, aborted);

        assert.strictEqual(controller.state, "idle");
        controller.dispose();
    });
});

describe("AccelerationController: the policy, the threshold and the listeners in use", () => {
    it("reports the policy it was built with and ignores a set to the same one", async () => {
        const registry = new AcceleratorRegistry();
        const factory = vi.fn(() => Promise.resolve(fakeAccelerator()));
        registry.register({ name: "fake", factory });
        const controller = new AccelerationController({ registry });
        await controller.start();

        assert.strictEqual(controller.policy, "auto");
        controller.setPolicy("auto");

        assert.strictEqual(factory.mock.calls.length, 1);
        controller.dispose();
    });

    it("keeps the attached accelerator when the policy tightens from auto to required", async () => {
        const registry = new AcceleratorRegistry();
        const factory = vi.fn(() => Promise.resolve(fakeAccelerator()));
        registry.register({ name: "fake", factory });
        const controller = new AccelerationController({ registry });
        await controller.start();

        controller.setPolicy("required");

        assert.strictEqual(controller.policy, "required");
        assert.strictEqual(controller.state, "idle");
        assert.strictEqual(factory.mock.calls.length, 1);
        controller.dispose();
    });

    it("moves the threshold, and the decision moves with it", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();

        controller.setMinNodes(5000);

        assert.strictEqual(controller.minNodes, 5000);
        assert.isFalse(controller.plan({ capability: "forceAtlas2", nodeCount: 4999 }).accelerated);
        assert.isTrue(controller.plan({ capability: "forceAtlas2", nodeCount: 5000 }).accelerated);
        controller.dispose();
    });

    it("stops telling a listener that unsubscribed", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        const listener = vi.fn();
        const unsubscribe = controller.onChange(listener);

        unsubscribe();
        await controller.start();

        assert.strictEqual(listener.mock.calls.length, 0);
        controller.dispose();
    });

    it("hands the CPU path the code as well as the sentence, when the probe had one", async () => {
        const registry = new AcceleratorRegistry();
        registry.register({
            name: "webgpu-graph-algorithms",
            factory: () =>
                Promise.reject(
                    new GraphtyError({ code: "E_NO_ADAPTER", message: "no adapter answered", source: "acceleration" }),
                ),
        });
        const controller = new AccelerationController({ registry });
        await controller.start();

        const outcome = await controller.run(LAYOUT, () => "gpu");

        assert.deepStrictEqual(outcome, {
            accelerated: false,
            reason: "webgpu-graph-algorithms: no adapter answered",
            code: "E_NO_ADAPTER",
        });
        controller.dispose();
    });

    it("does not re-probe when a factory is registered while it already has one", async () => {
        const registry = new AcceleratorRegistry();
        registry.register({ name: "first", factory: () => Promise.resolve(fakeAccelerator({ name: "first" })) });
        const controller = new AccelerationController({ registry });
        await controller.start();

        const second = vi.fn(() => Promise.resolve(fakeAccelerator({ name: "second" })));
        registry.register({ name: "second", factory: second });
        await new Promise((resolve) => setTimeout(resolve, 1));

        assert.strictEqual(second.mock.calls.length, 0);
        assert.strictEqual(controller.accelerator?.name, "first");
        controller.dispose();
    });
});

describe("AccelerationController: awkward accelerators", () => {
    it("treats a rejected lost promise as a lost device, not as an unhandled rejection", async () => {
        const registry = registryWith(fakeAccelerator({ lost: Promise.reject(new Error("the driver crashed")) }));
        const controller = new AccelerationController({ registry, recoverOnDeviceLoss: false });

        await controller.start();

        await until(() => controller.state === "error", "the rejected lost promise to be handled");
        assert.strictEqual(controller.status.code, "E_DEVICE_LOST");
        assert.include(controller.status.reason, "the driver crashed");
        controller.dispose();
    });

    it("survives an accelerator that throws while being disposed", async () => {
        const controller = new AccelerationController({
            registry: registryWith(
                fakeAccelerator({
                    onDispose: () => {
                        throw new Error("dispose exploded");
                    },
                }),
            ),
        });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        await controller.start();

        controller.dispose();

        assert.strictEqual(warn.mock.calls.length, 1);
        warn.mockRestore();
    });

    it("releases an accelerator that arrived after the controller was disposed", async () => {
        const registry = new AcceleratorRegistry();
        const controller = new AccelerationController({ registry });
        const disposed = vi.fn();
        registry.register({
            name: "late",
            factory: () => {
                controller.dispose();
                return Promise.resolve(fakeAccelerator({ onDispose: disposed }));
            },
        });

        await controller.start();

        assert.strictEqual(disposed.mock.calls.length, 1);
        assert.isNull(controller.accelerator);
    });
});

describe("AccelerationController: injection, precision and disposal", () => {
    it("attaches an accelerator the caller built, which is how a test and a third party do it", () => {
        const controller = new AccelerationController({ registry: new AcceleratorRegistry() });

        controller.setAccelerator(fakeAccelerator({ name: "injected" }));

        assert.strictEqual(controller.state, "idle");
        assert.strictEqual(controller.accelerator?.name, "injected");
        controller.dispose();
    });

    it("never replaces an injected accelerator with a probed one", async () => {
        const registry = new AcceleratorRegistry();
        const controller = new AccelerationController({ registry });
        controller.setAccelerator(fakeAccelerator({ name: "injected" }));

        registry.register({ name: "fake", factory: () => Promise.resolve(fakeAccelerator({ name: "probed" })) });
        await controller.start();

        assert.strictEqual(controller.accelerator?.name, "injected");
        controller.dispose();
    });

    it("labels a result f32 unless the accelerator says otherwise, and the CPU path f64", async () => {
        const single = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        const double = new AccelerationController({ registry: registryWith(fakeAccelerator({ precision: "f64" })) });
        await Promise.all([single.start(), double.start()]);

        const from32 = await single.run(LAYOUT, () => "positions");
        const from64 = await double.run(LAYOUT, () => "positions");

        assert.strictEqual(from32.accelerated && from32.precision, "f32");
        assert.strictEqual(from64.accelerated && from64.precision, "f64");
        assert.strictEqual(CPU_PRECISION, "f64");
        single.dispose();
        double.dispose();
    });

    it("releases the accelerator and refuses to answer once disposed", async () => {
        const disposed = vi.fn();
        const controller = new AccelerationController({
            registry: registryWith(fakeAccelerator({ onDispose: disposed })),
        });
        await controller.start();

        controller.dispose();
        controller.dispose();

        assert.strictEqual(disposed.mock.calls.length, 1);
        assert.throws(() => controller.plan(LAYOUT), /disposed/);
        const refusal = await controller.ready().catch((error: unknown) => error);
        assert.instanceOf(refusal, Error);
        assert.match(refusal.message, /disposed/);
    });
});

describe("AccelerationController: a device that computes the wrong answer", () => {
    it("turns down an accelerator that fails its own self-check, and says which device it was", async () => {
        const controller = new AccelerationController({
            registry: registryWith(createFakeAccelerator({ verify: "E_DEVICE_INCORRECT" })),
        });

        const status = await controller.start();

        assert.strictEqual(status.state, "unavailable");
        assert.strictEqual(status.code, "E_DEVICE_INCORRECT");
        assert.include(status.reason, "self-check");
        assert.isNull(controller.accelerator);
        controller.dispose();
    });

    it("publishes it on the capabilities document a consumer reads, and announces the change", async () => {
        const seen: AccelerationStatus[] = [];
        const controller = new AccelerationController({
            registry: registryWith(createFakeAccelerator({ verify: "E_DEVICE_INCORRECT" })),
        });
        controller.onChange((status) => seen.push(status));

        await controller.start();

        assert.strictEqual(controller.capabilities.acceleration.code, "E_DEVICE_INCORRECT");
        assert.strictEqual(seen.at(-1)?.code, "E_DEVICE_INCORRECT");
        assert.strictEqual(seen.at(-1), controller.capabilities.acceleration);
        controller.dispose();
    });

    it("releases the device it built rather than leaving one nobody holds", async () => {
        const fake = createFakeAccelerator({ verify: "E_DEVICE_INCORRECT" });
        const controller = new AccelerationController({ registry: registryWith(fake) });

        await controller.start();

        assert.strictEqual(fake.calls.dispose, 1);
        controller.dispose();
    });

    it("plans the work onto the CPU carrying the reason, and throws nothing at the consumer", async () => {
        const controller = new AccelerationController({
            registry: registryWith(createFakeAccelerator({ verify: "E_DEVICE_INCORRECT" })),
        });
        await controller.start();

        const outcome = await controller.run(LAYOUT, (): string => "gpu");

        assert.isFalse(outcome.accelerated);
        assert.strictEqual(!outcome.accelerated && outcome.code, "E_DEVICE_INCORRECT");
        assert.strictEqual(!outcome.accelerated && outcome.reason.includes("self-check"), true);
        controller.dispose();
    });

    it("attaches an accelerator whose self-check passes, so the check is not a refusal of everything", async () => {
        const controller = new AccelerationController({
            registry: registryWith(createFakeAccelerator({ verify: "ok" })),
        });

        const status = await controller.start();

        assert.strictEqual(status.state, "idle");
        assert.strictEqual(controller.accelerator?.name, "fake");
        controller.dispose();
    });

    it("does not ask an accelerator that cannot check itself, which is every one of them today", async () => {
        const fake = createFakeAccelerator();
        const controller = new AccelerationController({ registry: registryWith(fake) });

        const status = await controller.start();

        assert.isUndefined(fake.verify);
        assert.strictEqual(status.state, "idle");
        controller.dispose();
    });

    it("makes required say so, with the reason the device was turned down", async () => {
        const controller = new AccelerationController({
            policy: "required",
            registry: registryWith(createFakeAccelerator({ verify: "E_DEVICE_INCORRECT" })),
        });

        const refusal = await controller.ready().catch((error: unknown) => error);

        assert.strictEqual(isGraphtyError(refusal) && refusal.code, "E_NO_ACCELERATOR");
        assert.strictEqual(isGraphtyError(refusal) && refusal.details.acceleration, "E_DEVICE_INCORRECT");
        controller.dispose();
    });

    it("stops using a device caught mid-run, having thrown the failure rather than answering", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const incorrect = Object.assign(new Error("the scan came back wrong"), { code: "E_DEVICE_INCORRECT" });

        const failure = await controller
            .run(LAYOUT, (): string => {
                throw incorrect;
            })
            .catch((error: unknown) => error);

        assert.strictEqual(isGraphtyError(failure) && failure.code, "E_DEVICE_INCORRECT");
        assert.strictEqual(controller.state, "unavailable");
        assert.strictEqual(controller.status.code, "E_DEVICE_INCORRECT");
        assert.isNull(controller.accelerator);
        const next = controller.plan(LAYOUT);
        assert.isFalse(next.accelerated);
        controller.dispose();
    });
});

describe("AccelerationController: a software adapter outlives only the policy that accepted it", () => {
    it("lets go of a software accelerator when required relaxes to auto, and says why", async () => {
        const disposed = vi.fn();
        const registry = new AcceleratorRegistry();
        registry.register({ name: "fake", factory: softwareOnlyFactory(disposed) });
        const controller = new AccelerationController({ policy: "required", registry });
        assert.strictEqual((await controller.start()).state, "idle");
        assert.strictEqual(controller.accelerator?.name, "software");

        controller.setPolicy("auto");
        await until(() => controller.state === "unavailable", "the re-probe under auto");

        assert.isNull(controller.accelerator);
        assert.strictEqual(controller.status.code, "E_SOFTWARE_ONLY");
        assert.strictEqual(disposed.mock.calls.length, 1);
        controller.dispose();
    });

    it("keeps a hardware accelerator attached through the same change, having built it once", async () => {
        const registry = new AcceleratorRegistry();
        const factory = vi.fn(() => Promise.resolve(fakeAccelerator({ name: "hardware" })));
        registry.register({ name: "fake", factory });
        const controller = new AccelerationController({ policy: "required", registry });
        await controller.start();

        controller.setPolicy("auto");
        await new Promise((resolve) => setTimeout(resolve, 1));

        assert.strictEqual(controller.state, "idle");
        assert.strictEqual(controller.accelerator?.name, "hardware");
        assert.strictEqual(factory.mock.calls.length, 1);
        controller.dispose();
    });

    it("leaves an injected accelerator alone, because only a probe knows what it found", () => {
        const controller = new AccelerationController({ policy: "required", registry: new AcceleratorRegistry() });
        controller.setAccelerator(fakeAccelerator({ name: "injected" }));

        controller.setPolicy("auto");

        assert.strictEqual(controller.accelerator?.name, "injected");
        controller.dispose();
    });
});

describe("AccelerationController: a policy set after dispose", () => {
    it("is ignored, and never reaches a factory", async () => {
        const registry = new AcceleratorRegistry();
        const factory = vi.fn(() => Promise.resolve(fakeAccelerator()));
        registry.register({ name: "fake", factory });
        const controller = new AccelerationController({ policy: "off", registry });
        await controller.start();
        controller.dispose();

        assert.doesNotThrow(() => {
            controller.setPolicy("required");
        });
        await new Promise((resolve) => setTimeout(resolve, 5));

        assert.strictEqual(factory.mock.calls.length, 0);
        assert.strictEqual(controller.policy, "off");
        assert.strictEqual(controller.state, "off");
    });
});

describe("AccelerationController: the policy is part of the published status", () => {
    it("carries the policy, so a consumer reading capabilities sees what was asked for", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });

        assert.strictEqual(controller.status.policy, "auto");
        await controller.start();
        assert.strictEqual(controller.capabilities.acceleration.policy, "auto");
        controller.dispose();
    });

    it("announces a change of policy exactly once even when the state does not move", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const seen: AccelerationStatus[] = [];
        controller.onChange((status) => seen.push(status));

        controller.setPolicy("required");

        assert.deepStrictEqual(
            seen.map((status) => [status.policy, status.state]),
            [["required", "idle"]],
        );
        assert.strictEqual(controller.status.policy, "required");
        controller.dispose();
    });

    it("reports a throwing listener through the element's logger and still tells the others", async () => {
        resetLoggingConfig();
        await GraphtyLogger.configure({ enabled: true, level: LogLevel.ERROR, modules: ["acceleration"] });
        const records: LogRecord[] = [];
        GraphtyLogger.addSink({ name: "acceleration-test", write: (record) => records.push(record) });
        const silence = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const controller = new AccelerationController({ registry: new AcceleratorRegistry() });
        const heard = vi.fn();
        controller.onChange(() => {
            throw new Error("the chip broke");
        });
        controller.onChange(heard);

        try {
            await controller.start();

            assert.strictEqual(heard.mock.calls.length, 1);
            const logged = records.find((record) => record.message.includes("listener threw"));
            assert.isDefined(logged);
            assert.strictEqual(logged?.level, LogLevel.ERROR);
            assert.deepStrictEqual(logged?.category, ["graphty", "acceleration"]);
            assert.strictEqual(logged?.error?.message, "the chip broke");
        } finally {
            GraphtyLogger.removeSink("acceleration-test");
            silence.mockRestore();
            resetLoggingConfig();
            controller.dispose();
        }
    });
});

describe("AccelerationController: beginWork, the span a simulation opens", () => {
    it("moves idle to active and back when the span ends", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();

        const end = controller.beginWork();
        assert.strictEqual(controller.state, "active");
        end();
        assert.strictEqual(controller.state, "idle");
        controller.dispose();
    });

    it("counts out once however many times the span is ended", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const first = controller.beginWork();
        const second = controller.beginWork();

        first();
        first();

        assert.strictEqual(controller.state, "active", "the second span is still open");
        second();
        assert.strictEqual(controller.state, "idle");
        controller.dispose();
    });

    it("stays active until the last of two overlapping spans ends", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const seen: string[] = [];
        controller.onChange((status) => seen.push(status.state));

        const layout = controller.beginWork();
        const algorithm = controller.beginWork();
        layout();
        assert.strictEqual(controller.state, "active");
        algorithm();

        assert.deepStrictEqual(seen, ["active", "idle"]);
        controller.dispose();
    });

    it("is a no-op after dispose: it neither throws nor publishes", async () => {
        const controller = new AccelerationController({ registry: registryWith(fakeAccelerator()) });
        await controller.start();
        const listener = vi.fn();
        controller.onChange(listener);
        controller.dispose();

        const end = controller.beginWork();
        end();

        assert.strictEqual(listener.mock.calls.length, 0);
    });
});
