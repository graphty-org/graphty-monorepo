/**
 * @file What the `./webgpu` entry point does with the peer's device self-check, with the peer
 * stubbed.
 *
 * Node has no `navigator.gpu` and no device that computes wrong answers, so the only way to
 * reach this code is to answer for the peer. These cases stub `acquireAccelerator`, which runs
 * the check before it hands a device over, and pin what the entry point is responsible for: a
 * wrong word becomes `E_DEVICE_INCORRECT` with what disagreed attached, a check that could not
 * run is not called a lying device, and nothing the peer happens to put on its accelerator
 * becomes a second check.
 *
 * What this does NOT show is a real GPU refusing: no adapter reachable from here computes
 * incorrectly. See `docs/decisions/device-computes-incorrectly.md`.
 */

import "../../webgpu";

import { assert, beforeEach, describe, it, vi } from "vitest";

import { type AcceleratorFactory, acceleratorRegistry } from "../../src/acceleration";
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
    /** What the stubbed handle's `current()` answers. */
    current: vi.fn(),
    dispose: vi.fn(),
}));

/** A ready accelerator whose peer object carries a `verify` of its own, which must not be forwarded. */
function readyAccelerator(): unknown {
    return {
        ok: true,
        code: "OK",
        accelerator: {
            kind: "webgpu",
            ctx: {
                caps: { vendor: "acme", architecture: "gen-1", description: "Acme Fake GPU", device: "acme-1" },
                lost: new Promise(() => {
                    // a device that is never lost: this suite is about the check, not about loss
                }),
            },
            forceAtlas2: (): string => "simulation",
            verify: (): Promise<void> => Promise.reject(new Error("the peer's own verify must not be forwarded")),
            dispose: (): void => undefined,
        },
    };
}

/** The decline `acquireAccelerator` answers for a device that got the check wrong. */
function incorrect(mismatch: typeof WRONG_BLOCK_TOTAL.mismatch): unknown {
    return {
        ok: false,
        code: "E_DEVICE_INCORRECT",
        reason: "the acme device computed a known prefix sum incorrectly",
        fix: null,
        adapter: null,
        check: { ...WRONG_BLOCK_TOTAL, mismatch },
    };
}

vi.mock("@graphty/webgpu-graph-algorithms", () => ({ EXACT_MAX_NODES: 32_768 }));

vi.mock("@graphty/webgpu-graph-algorithms/browser", () => ({
    acquireAccelerator: () => ({ current: peer.current, dispose: peer.dispose }),
}));

/** The factory the entry point registered. */
function registeredFactory(): AcceleratorFactory {
    const entry = acceleratorRegistry.list().find((candidate) => candidate.name === "webgpu-graph-algorithms");
    if (entry === undefined) {
        throw new Error("the ./webgpu entry point registered nothing");
    }

    return entry.factory;
}

describe("the ./webgpu entry point: the device self-check", () => {
    beforeEach(() => {
        peer.current.mockReset();
        peer.dispose.mockReset();
    });

    it("attaches a checked device with no second check of its own, and releases it on dispose", async () => {
        peer.current.mockResolvedValue(readyAccelerator());

        const accelerator = await registeredFactory()({});

        assert.isNotNull(accelerator);
        assert.isUndefined(accelerator?.verify);
        assert.strictEqual(accelerator?.device?.description, "Acme Fake GPU");
        accelerator?.dispose?.();
        assert.strictEqual(peer.dispose.mock.calls.length, 1);
    });

    it("turns a wrong word into E_DEVICE_INCORRECT, carrying what disagreed", async () => {
        peer.current.mockResolvedValue(incorrect(WRONG_BLOCK_TOTAL.mismatch));

        const failure = await registeredFactory()({}).catch((error: unknown) => error);

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
        peer.current.mockResolvedValue(
            incorrect({ where: "out[512]", expected: 131_328, actual: 0xdeadbeef, poison: true }),
        );

        const failure = await registeredFactory()({}).catch((error: unknown) => error);

        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.details.poison, true);
            assert.match(failure.message, /never written at all/);
        }
    });

    it("leaves a check that could not RUN alone, so a dead device is not called a lying one", async () => {
        // A lost device, an allocation that failed: the peer rejects with its own code, and "this
        // driver computes incorrectly" must not be said about it.
        peer.current.mockRejectedValue(
            Object.assign(new Error("device lost during the check"), { code: "E_DEVICE_LOST" }),
        );

        const failure = await registeredFactory()({}).catch((error: unknown) => error);

        assert.instanceOf(failure, Error);
        assert.isFalse(isGraphtyError(failure));
        assert.isTrue(failure instanceof Error && "code" in failure && failure.code === "E_DEVICE_LOST");
    });
});
