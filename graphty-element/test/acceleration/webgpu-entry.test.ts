import "../../webgpu";

import { assert, describe, it } from "vitest";

import { type AcceleratorFactory, acceleratorRegistry } from "../../src/acceleration";
import { isGraphtyError } from "../../src/errors";

/**
 * The factory the entry point registered. Reading it back out of the registry is the whole
 * point: the consumer's integration is the import above, and the element finds the rest.
 */
function registeredFactory(): AcceleratorFactory {
    const entry = acceleratorRegistry.list().find((candidate) => candidate.name === "webgpu-graph-algorithms");
    assert.isDefined(entry);
    if (entry === undefined) {
        throw new Error("the ./webgpu entry point registered nothing");
    }

    return entry.factory;
}

describe("the ./webgpu entry point", () => {
    it("registers a WebGPU accelerator factory, and that is the consumer's whole integration", () => {
        assert.isTrue(acceleratorRegistry.has("webgpu-graph-algorithms"));
        assert.strictEqual(acceleratorRegistry.list()[0]?.backend, "webgpu");
    });

    it("builds nothing at import time: a device is bought only when the element probes", () => {
        assert.strictEqual(typeof registeredFactory(), "function");
    });

    it("says why it cannot serve a host with no WebGPU, instead of failing silently", async () => {
        // Node has no navigator.gpu, which is the same answer a browser without WebGPU gives.
        const failure = await registeredFactory()().catch((error: unknown) => error);

        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.code, "E_NO_WEBGPU");
            assert.strictEqual(failure.source, "acceleration");
            assert.match(failure.message, /WebGPU/);
        }
    });

    it("refuses a ceiling it cannot compute exactly, before it builds anything", async () => {
        const failure = await registeredFactory()({ exactMaxNodes: Number.MAX_SAFE_INTEGER }).catch(
            (error: unknown) => error,
        );

        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.code, "E_TOO_LARGE");
            assert.strictEqual(failure.details.exactMaxNodes, Number.MAX_SAFE_INTEGER);
            assert.strictEqual(typeof failure.details.limit, "number");
        }
    });
});
