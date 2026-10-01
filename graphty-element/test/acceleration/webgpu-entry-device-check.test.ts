/**
 * @file What the `./webgpu` entry point does with the peer's device self-check, with the peer
 * stubbed.
 *
 * Node has no `navigator.gpu` and no device that computes wrong answers, so the only way to
 * reach this code is to answer for the peer. These cases stub both halves of it -- the browser
 * probe so a context is handed over, and `verifyDevice` so the check has a verdict to report --
 * and pin the three things the entry point is responsible for: the check runs while the
 * accelerator is being vouched for rather than during a run, a wrong word becomes
 * `E_DEVICE_INCORRECT` with what disagreed attached, and the member the element calls is the
 * entry point's own and not whatever the peer happened to put on its accelerator.
 *
 * What this does NOT show is a real GPU refusing: no adapter reachable from here computes
 * incorrectly. See `docs/decisions/device-computes-incorrectly.md`.
 */

import "../../webgpu";

import { assert, beforeEach, describe, it, vi } from "vitest";

import { type AcceleratorFactory, acceleratorRegistry, type GraphAccelerator } from "../../src/acceleration";
import { isGraphtyError } from "../../src/errors";

/** A device check that found nothing wrong, which is every adapter available to this suite. */
const CLEAN_CHECK = {
    check: "exclusive-scan" as const,
    ok: true,
    workgroupSize: 256,
    count: 8193,
    blocks: 32,
    ms: 17,
    vendor: "acme",
    architecture: "gen-1",
    description: "Acme Fake GPU",
    mismatch: null,
};

/** The block total the Windows software renderer returned where 32,896 belonged. */
const WRONG_BLOCK_TOTAL = {
    ...CLEAN_CHECK,
    ok: false,
    mismatch: { where: "out[256]", expected: 32_896, actual: 1, poison: false },
};

const peer = vi.hoisted(() => ({
    verifyDevice: vi.fn(),
    /** The context `requestGpuContext` hands over: only what `toGraphAccelerator` reads. */
    ctx: {
        caps: { vendor: "acme", architecture: "gen-1", description: "Acme Fake GPU", device: "acme-1" },
        lost: new Promise<{ reason: string; message: string }>(() => {
            // a device that is never lost: this suite is about the check, not about loss
        }),
        dispose: vi.fn(),
    },
}));

vi.mock("@graphty/webgpu-graph-algorithms", () => ({
    EXACT_MAX_NODES: 32_768,
    verifyDevice: peer.verifyDevice,
    // A peer accelerator that carries a `verify` of its own, which is the case the entry point
    // has to survive: forwarding runs after the wrapper is built, and a member of that name
    // reporting something other than the element's code would be worse than no check at all.
    createAccelerator: () => ({
        kind: "webgpu",
        forceAtlas2: (): string => "simulation",
        verify: (): Promise<void> => Promise.reject(new Error("the peer's own verify must not be forwarded")),
        dispose: (): void => undefined,
    }),
}));

vi.mock("@graphty/webgpu-graph-algorithms/browser", () => ({
    probeBrowserWebGpu: () => Promise.resolve({ ok: true, code: "OK" as const, reason: null, adapter: null, summary: null }),
    requestGpuContext: () => Promise.resolve(peer.ctx),
}));

/** The factory the entry point registered. */
function registeredFactory(): AcceleratorFactory {
    const entry = acceleratorRegistry.list().find((candidate) => candidate.name === "webgpu-graph-algorithms");
    if (entry === undefined) {
        throw new Error("the ./webgpu entry point registered nothing");
    }

    return entry.factory;
}

/** Builds the accelerator the entry point wraps, failing the test if the factory declined. */
async function build(): Promise<GraphAccelerator> {
    const accelerator = await registeredFactory()({});
    assert.isNotNull(accelerator);
    if (accelerator === null) {
        throw new Error("the factory declined");
    }

    return accelerator;
}

describe("the ./webgpu entry point: the device self-check", () => {
    beforeEach(() => {
        peer.verifyDevice.mockReset();
    });

    it("does not run the check while it is building: a device is vouched for when it is attached", async () => {
        peer.verifyDevice.mockResolvedValue(CLEAN_CHECK);

        const accelerator = await build();

        assert.strictEqual(peer.verifyDevice.mock.calls.length, 0);
        assert.strictEqual(typeof accelerator.verify, "function");
    });

    it("runs the peer's check on its own context and resolves when the device computed correctly", async () => {
        peer.verifyDevice.mockResolvedValue(CLEAN_CHECK);
        const accelerator = await build();

        await accelerator.verify?.();

        assert.deepStrictEqual(peer.verifyDevice.mock.calls[0], [peer.ctx]);
    });

    it("turns a wrong word into E_DEVICE_INCORRECT, carrying what disagreed", async () => {
        peer.verifyDevice.mockResolvedValue(WRONG_BLOCK_TOTAL);
        const accelerator = await build();

        const failure = await (accelerator.verify?.() ?? Promise.resolve()).catch((error: unknown) => error);

        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.code, "E_DEVICE_INCORRECT");
            assert.strictEqual(failure.source, "acceleration");
            assert.strictEqual(failure.recoverable, false);
            assert.strictEqual(failure.details.where, "out[256]");
            assert.strictEqual(failure.details.expected, 32_896);
            assert.strictEqual(failure.details.actual, 1);
            assert.strictEqual(failure.details.count, 8193);
            assert.deepStrictEqual(failure.details.adapter, {
                vendor: "acme",
                architecture: "gen-1",
                description: "Acme Fake GPU",
            });
            assert.match(failure.message, /computes multi-workgroup shaders incorrectly/);
        }
    });

    it("says a word was never written when the poison survived, rather than calling it a wrong value", async () => {
        peer.verifyDevice.mockResolvedValue({
            ...WRONG_BLOCK_TOTAL,
            mismatch: { where: "out[512]", expected: 131_328, actual: 0xdeadbeef, poison: true },
        });
        const accelerator = await build();

        const failure = await (accelerator.verify?.() ?? Promise.resolve()).catch((error: unknown) => error);

        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.details.poison, true);
            assert.match(failure.message, /never written at all/);
        }
    });

    it("leaves a check that could not RUN alone, so a dead device is not called a lying one", async () => {
        // A lost device, an allocation that failed: the peer throws its own code out of
        // verifyDevice, and "this driver computes incorrectly" must not be said about it.
        peer.verifyDevice.mockRejectedValue(Object.assign(new Error("device lost during the check"), {
            code: "E_DEVICE_LOST",
        }));
        const accelerator = await build();

        const failure = await (accelerator.verify?.() ?? Promise.resolve()).catch((error: unknown) => error);

        assert.instanceOf(failure, Error);
        assert.isFalse(isGraphtyError(failure));
        assert.isTrue(failure instanceof Error && "code" in failure && failure.code === "E_DEVICE_LOST");
    });
});
