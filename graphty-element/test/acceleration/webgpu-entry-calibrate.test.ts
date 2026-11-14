/**
 * @file How the `./webgpu` entry point measures the exact-tier ceiling, with the peer stubbed.
 *
 * The peer's `calibrateLayout` times this device and suggests an `exactMaxNodes`; the entry point
 * hands that number to the peer's `createAccelerator` as `layout.exactMaxNodes`, caches it per
 * device, and reports which number an accelerator uses. The controller runs the measurement once,
 * after the first accelerated work goes idle, and republishes the status. The real device is
 * exercised in `test/browser/webgpu-layout.test.ts` (the GPU lane).
 */

import "../../webgpu";

import { assert, beforeEach, describe, it, vi } from "vitest";

import {
    AccelerationController,
    type AccelerationStatus,
    type AcceleratorFactory,
    AcceleratorRegistry,
    acceleratorRegistry,
    type GraphAccelerator,
} from "../../src/acceleration";

const peer = vi.hoisted(() => ({
    calibrateLayout: vi.fn(),
    createAccelerator: vi.fn(),
    current: vi.fn(),
}));

vi.mock("@graphty/webgpu-graph-algorithms", () => ({
    EXACT_MAX_NODES: 32_768,
    calibrateLayout: peer.calibrateLayout,
    createAccelerator: peer.createAccelerator,
}));

vi.mock("@graphty/webgpu-graph-algorithms/browser", () => ({
    acquireAccelerator: () => ({ current: peer.current, dispose: (): void => undefined }),
}));

/**
 * A ready peer accelerator on a device described as `description`.
 * @param description - The device description, which keys the cache.
 * @param layout - The layout tuning it was built with.
 * @returns The acquisition result.
 */
function ready(description: string, layout: Record<string, unknown> = {}): unknown {
    const ctx = {
        caps: { vendor: "acme", architecture: "gen-1", description, device: "acme-1" },
        lost: new Promise(() => {
            // never lost: this suite is about calibration
        }),
    };
    return {
        ok: true,
        code: "OK",
        accelerator: { kind: "webgpu", ctx, options: { layout }, forceAtlas2: (): string => "default tier" },
    };
}

/** The factory the entry point registered. */
function registeredFactory(): AcceleratorFactory {
    const entry = acceleratorRegistry.list().find((candidate) => candidate.name === "webgpu-graph-algorithms");
    if (entry === undefined) {
        throw new Error("the ./webgpu entry point registered nothing");
    }

    return entry.factory;
}

/**
 * Builds an accelerator through the registered factory, failing loudly when it declines.
 * @param options - The factory options.
 * @returns The accelerator.
 */
async function build(options: { exactMaxNodes?: number } = {}): Promise<GraphAccelerator> {
    const accelerator = await registeredFactory()(options);
    if (accelerator === null) {
        throw new Error("the factory built nothing");
    }

    return accelerator;
}

describe("the ./webgpu entry point: measuring the exact-tier ceiling", () => {
    beforeEach(() => {
        peer.calibrateLayout.mockReset();
        peer.createAccelerator.mockReset();
        peer.current.mockReset();
        peer.calibrateLayout.mockResolvedValue({ suggestedExactMaxNodes: 2048 });
        peer.createAccelerator.mockImplementation((ctx: unknown, options: unknown) => ({
            kind: "webgpu",
            ctx,
            options,
            forceAtlas2: (): string => "measured tier",
        }));
    });

    it("starts on the shipped default and builds nothing extra", async () => {
        peer.current.mockResolvedValue(ready("first"));

        const accelerator = await build();

        assert.deepStrictEqual(accelerator.exactMaxNodes, { value: 32_768, basis: "default" });
        assert.strictEqual(peer.createAccelerator.mock.calls.length, 0);
        assert.strictEqual((accelerator.forceAtlas2 as () => string)(), "default tier");
    });

    it("hands the measured value to createAccelerator and re-tunes the same accelerator", async () => {
        peer.current.mockResolvedValue(ready("second", { iterationsPerStep: 4 }));
        const accelerator = await build();

        await accelerator.calibrate?.();

        const [ctx, options] = peer.calibrateLayout.mock.calls[0] as [{ caps: unknown }, { sizes: number[] }];
        assert.deepStrictEqual(options.sizes, [1024, 2048, 4096, 8192, 16_384, 32_768]);
        assert.deepStrictEqual(peer.createAccelerator.mock.calls[0], [
            ctx,
            { layout: { iterationsPerStep: 4, exactMaxNodes: 2048 } },
        ]);
        assert.deepStrictEqual(accelerator.exactMaxNodes, { value: 2048, basis: "measured" });
        assert.strictEqual((accelerator.forceAtlas2 as () => string)(), "measured tier");
    });

    it("builds the next accelerator on a measured device with the cached value, and no other device", async () => {
        peer.current.mockResolvedValue(ready("third"));
        await (await build()).calibrate?.();
        peer.createAccelerator.mockClear();

        const again = await build();

        assert.deepStrictEqual(again.exactMaxNodes, { value: 2048, basis: "measured" });
        assert.deepStrictEqual(peer.createAccelerator.mock.calls[0]?.[1], { layout: { exactMaxNodes: 2048 } });

        peer.current.mockResolvedValue(ready("an unmeasured device"));
        assert.deepStrictEqual((await build()).exactMaxNodes, { value: 32_768, basis: "default" });
    });

    it("keeps a configured ceiling when it measures", async () => {
        peer.current.mockResolvedValue(ready("fourth"));
        const accelerator = await build({ exactMaxNodes: 1000 });

        await accelerator.calibrate?.();

        assert.deepStrictEqual(accelerator.exactMaxNodes, { value: 1000, basis: "configured" });
        assert.strictEqual(peer.createAccelerator.mock.calls.length, 0);
    });
});

describe("the acceleration controller: measuring once the first work is done", () => {
    /**
     * A controller over one fake accelerator whose `calibrate` is counted.
     * @param basis - Where the fake's ceiling came from.
     * @returns The controller, the calibrate spy and a promise of the next status change.
     */
    function setup(basis: "default" | "configured"): {
        controller: AccelerationController;
        calibrate: ReturnType<typeof vi.fn>;
    } {
        let exactMaxNodes = { value: 32_768, basis: basis as "default" | "configured" | "measured" };
        const calibrate = vi.fn(() => {
            exactMaxNodes = { value: 4096, basis: "measured" };
            return Promise.resolve();
        });
        const accelerator: GraphAccelerator = {
            name: "fake",
            backend: "webgpu",
            get exactMaxNodes() {
                return exactMaxNodes;
            },
            calibrate,
        };
        const registry = new AcceleratorRegistry();
        registry.register({ name: "fake", backend: "webgpu", factory: () => Promise.resolve(accelerator) });
        return { controller: new AccelerationController({ registry }), calibrate };
    }

    it("publishes the default, measures after the first work goes idle, and publishes the measurement", async () => {
        const { controller, calibrate } = setup("default");
        const attached = await controller.start();
        assert.strictEqual(attached.exactMaxNodes, 32_768);
        assert.strictEqual(attached.exactMaxNodesBasis, "default");
        assert.strictEqual(calibrate.mock.calls.length, 0, "nothing is measured before any work");

        const measured = new Promise<AccelerationStatus>((resolve) => {
            controller.onChange((status) => {
                if (status.exactMaxNodesBasis === "measured") {
                    resolve(status);
                }
            });
        });
        controller.beginWork()();
        const status = await measured;

        assert.strictEqual(status.exactMaxNodes, 4096);
        assert.strictEqual(status.state, "idle");
        controller.beginWork()();
        assert.strictEqual(calibrate.mock.calls.length, 1, "measured once per accelerator");
        controller.dispose();
    });

    it("never measures an accelerator whose ceiling was configured", async () => {
        const { controller, calibrate } = setup("configured");
        await controller.start();

        controller.beginWork()();

        assert.strictEqual(calibrate.mock.calls.length, 0);
        assert.strictEqual(controller.status.exactMaxNodesBasis, "configured");
        controller.dispose();
    });
});
