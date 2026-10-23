/**
 * The root entry's lazy loader, against the real GPU package (installed here as a dev
 * dependency). Node has no `navigator.gpu`, so a loaded package answers `E_NO_WEBGPU` -- a code
 * only the package's own probe can produce, which is what proves it was found and loaded.
 */

import "../../src/acceleration/autoload";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { resetUnavailableReports } from "../../src/acceleration/consoleReport";
import { AcceleratorRegistry, acceleratorRegistry, registerDefaultAccelerator } from "../../src/acceleration/registry";
import type { AcceleratorFactory } from "../../src/acceleration/types";

beforeEach(() => {
    resetUnavailableReports();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("the root entry's WebGPU loader", () => {
    it("registers under the name ./webgpu uses, and imports nothing until a probe", () => {
        assert.isTrue(acceleratorRegistry.has("webgpu-graph-algorithms"));
        assert.strictEqual(acceleratorRegistry.list()[0]?.backend, "webgpu");
    });

    it("loads the installed package with no consumer code, and reports the package's own probe code", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const status = await new AccelerationController().start();

        assert.strictEqual(status.state, "unavailable");
        assert.strictEqual(status.code, "E_NO_WEBGPU");
        assert.strictEqual(warn.mock.calls.length, 1);
    });
});

describe("a default registration", () => {
    const explicit: AcceleratorFactory = () => Promise.resolve(null);
    const lazy: AcceleratorFactory = () => Promise.resolve(null);

    it("is replaced by an explicit one without a warning, even a strict one", () => {
        const registry = new AcceleratorRegistry();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        registerDefaultAccelerator({ name: "gpu", factory: lazy }, registry);
        registry.register({ name: "gpu", factory: explicit }, { strict: true });

        assert.strictEqual(registry.list()[0]?.factory, explicit);
        assert.strictEqual(warn.mock.calls.length, 0);
    });

    it("never replaces an explicit registration made first", () => {
        const registry = new AcceleratorRegistry();

        registry.register({ name: "gpu", factory: explicit });
        registerDefaultAccelerator({ name: "gpu", factory: lazy }, registry);

        assert.strictEqual(registry.list()[0]?.factory, explicit);
    });
});
