/**
 * @file What the `./webgpu` entry point TELLS the GPU package, with the package stubbed.
 *
 * Node has no `navigator.gpu`, so the real peer answers `E_NO_WEBGPU` before it ever looks at
 * the software policy. These cases stub the peer's `acquireAccelerator` and assert the ARGUMENT
 * the entry forwards: a software adapter is refused under `auto` and accepted under `required`.
 * The four cases that run against the real peer live in `webgpu-entry.test.ts`, which mocks
 * nothing.
 */

import "../../webgpu";

import { assert, beforeEach, describe, it, vi } from "vitest";

import { type AcceleratorFactory, acceleratorRegistry } from "../../src/acceleration";
import { isGraphtyError } from "../../src/errors";

const peer = vi.hoisted(() => {
    const acquireAccelerator = vi.fn((_options?: unknown) => ({
        current: (): Promise<unknown> =>
            Promise.resolve({
                ok: false,
                code: "E_SOFTWARE_ONLY" as const,
                reason: "swiftshader",
                fix: "pass acceptSoftware: true",
                adapter: null,
                check: null,
            }),
        dispose: (): void => undefined,
    }));

    return { acquireAccelerator };
});

vi.mock("@graphty/webgpu-graph-algorithms/browser", () => ({
    acquireAccelerator: peer.acquireAccelerator,
}));

/** The factory the entry point registered. */
function registeredFactory(): AcceleratorFactory {
    const entry = acceleratorRegistry.list().find((candidate) => candidate.name === "webgpu-graph-algorithms");
    if (entry === undefined) {
        throw new Error("the ./webgpu entry point registered nothing");
    }

    return entry.factory;
}

describe("the ./webgpu entry point: the software-adapter policy", () => {
    beforeEach(() => {
        peer.acquireAccelerator.mockClear();
    });

    it("refuses a software adapter under auto, because it is slower than the CPU path", async () => {
        const failure = await registeredFactory()({}).catch((error: unknown) => error);

        assert.deepStrictEqual(peer.acquireAccelerator.mock.calls[0], [
            { acceptSoftware: false, accelerator: undefined },
        ]);
        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.code, "E_SOFTWARE_ONLY");
        }
    });

    it("accepts a software adapter under required, because the consumer said no CPU path", async () => {
        const failure = await registeredFactory()({ acceptSoftware: true }).catch((error: unknown) => error);

        assert.deepStrictEqual(peer.acquireAccelerator.mock.calls[0], [
            { acceptSoftware: true, accelerator: undefined },
        ]);
        // This stub still declines, so what the case pins is the argument and that the code the
        // element publishes is the peer's own, not one the entry invented.
        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.code, "E_SOFTWARE_ONLY");
        }
    });
});
