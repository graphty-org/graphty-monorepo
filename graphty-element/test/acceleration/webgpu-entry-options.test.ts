/**
 * @file What the `./webgpu` entry point TELLS the GPU package, with the package stubbed.
 *
 * Node has no `navigator.gpu`, so the real probe answers `E_NO_WEBGPU` before it ever looks at
 * the software policy. These cases stub the peer's browser entry and assert the ARGUMENT the
 * entry forwards: a software adapter is refused under `auto` and accepted under `required`.
 * The four cases that run against the real peer live in `webgpu-entry.test.ts`, which mocks
 * nothing.
 */

import "../../webgpu";

import { assert, beforeEach, describe, it, vi } from "vitest";

import { type AcceleratorFactory, acceleratorRegistry } from "../../src/acceleration";
import { isGraphtyError } from "../../src/errors";

const peer = vi.hoisted(() => {
    const probeBrowserWebGpu = vi.fn(() =>
        Promise.resolve({
            ok: false,
            code: "E_SOFTWARE_ONLY" as const,
            reason: "swiftshader",
            adapter: null,
            summary: null,
        }),
    );

    return { probeBrowserWebGpu };
});

vi.mock("@graphty/webgpu-graph-algorithms/browser", () => ({
    probeBrowserWebGpu: peer.probeBrowserWebGpu,
    requestGpuContext: (): Promise<never> =>
        Promise.reject(new Error("a context must not be requested after the probe declined")),
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
        peer.probeBrowserWebGpu.mockClear();
    });

    it("refuses a software adapter under auto, because it is slower than the CPU path", async () => {
        const failure = await registeredFactory()({}).catch((error: unknown) => error);

        assert.deepStrictEqual(peer.probeBrowserWebGpu.mock.calls[0], [{ rejectSoftware: true }]);
        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.code, "E_SOFTWARE_ONLY");
        }
    });

    it("accepts a software adapter under required, because the consumer said no CPU path", async () => {
        const failure = await registeredFactory()({ acceptSoftware: true }).catch((error: unknown) => error);

        assert.deepStrictEqual(peer.probeBrowserWebGpu.mock.calls[0], [{ rejectSoftware: false }]);
        // This stub still declines, so what the case pins is the argument and that the code the
        // element publishes is the peer's own, not one the entry invented.
        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.code, "E_SOFTWARE_ONLY");
        }
    });
});
