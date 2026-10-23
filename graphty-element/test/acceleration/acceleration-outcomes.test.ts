/**
 * Every outcome of looking for the GPU package is visible: a code and its params on
 * `capabilities.acceleration`, and at most one console line per page per code.
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { resetUnavailableReports } from "../../src/acceleration/consoleReport";
import { checkPeerExports, classifyPeerLoadError } from "../../src/acceleration/peerLoad";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import type { AccelerationPolicy } from "../../src/acceleration/types";
import { GraphtyError, isGraphtyError } from "../../src/errors";

const PEER = "@graphty/webgpu-graph-algorithms";

/**
 * A controller over a registry holding one factory that fails the way the lazy loader does.
 * @param failure - What the factory throws.
 * @param policy - The policy.
 * @returns The controller.
 */
function controllerFailingWith(failure: unknown, policy: AccelerationPolicy = "auto"): AccelerationController {
    const registry = new AcceleratorRegistry();
    registry.register({
        name: "webgpu-graph-algorithms",
        backend: "webgpu",
        factory: () => Promise.reject(failure),
    });

    return new AccelerationController({ registry, policy });
}

/**
 * What the GPU package's probe throws on a browser with no usable GPU.
 * @param code - The probe's code.
 * @returns The error.
 */
function probeFailure(code: "E_NO_WEBGPU" | "E_NO_ADAPTER" | "E_SOFTWARE_ONLY" | "E_DEVICE_INCORRECT"): GraphtyError {
    return new GraphtyError({
        code,
        message: `probe said ${code}`,
        source: "acceleration",
        details: { accelerator: "webgpu-graph-algorithms", probe: "a sentence that is not published" },
    });
}

/**
 * The error the loader builds when the import throws, or when the module lacks its exports.
 * @returns The incompatible error.
 */
function incompatible(): unknown {
    try {
        checkPeerExports({}, {});
    } catch (error) {
        return error;
    }

    return null;
}

let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    resetUnavailableReports();
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    error = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("acceleration outcomes", () => {
    it("package not installed: unavailable, E_MISSING_PACKAGE with the package, and nothing printed", async () => {
        const missing = Object.assign(new Error(`Cannot find module '${PEER}'`), { code: "MODULE_NOT_FOUND" });
        const status = await controllerFailingWith(classifyPeerLoadError(missing)).start();

        assert.strictEqual(status.state, "unavailable");
        assert.strictEqual(status.code, "E_MISSING_PACKAGE");
        assert.deepEqual(status.params, { accelerator: "webgpu-graph-algorithms", package: PEER });
        assert.strictEqual(warn.mock.calls.length + error.mock.calls.length, 0);
    });

    it("package not installed under required: work throws E_NO_ACCELERATOR whose details carry E_MISSING_PACKAGE", async () => {
        const missing = new TypeError(`Failed to resolve module specifier "${PEER}".`);
        const controller = controllerFailingWith(classifyPeerLoadError(missing), "required");
        await controller.start();

        let thrown: unknown;
        try {
            controller.plan({ capability: "forceAtlas2", nodeCount: 10 });
        } catch (failure) {
            thrown = failure;
        }

        assert.isTrue(isGraphtyError(thrown));
        if (isGraphtyError(thrown)) {
            assert.strictEqual(thrown.code, "E_NO_ACCELERATOR");
            assert.strictEqual(thrown.details.acceleration, "E_MISSING_PACKAGE");
            assert.deepEqual(thrown.details.params, { accelerator: "webgpu-graph-algorithms", package: PEER });
        }
    });

    it("installed but fails to load: E_ACCELERATOR_FAILED and one console.error, once per page", async () => {
        const failure = classifyPeerLoadError(new Error("boom while evaluating"));
        const first = await controllerFailingWith(failure).start();
        await controllerFailingWith(failure).start();

        assert.strictEqual(first.state, "unavailable");
        assert.strictEqual(first.code, "E_ACCELERATOR_FAILED");
        assert.strictEqual(first.params?.package, PEER);
        assert.strictEqual(error.mock.calls.length, 1);
        assert.match(String(error.mock.calls[0]?.[0]), /^\[graphty-element\] E_ACCELERATOR_FAILED: /);
        assert.strictEqual(warn.mock.calls.length, 0);
    });

    it("installed but lacks an export: E_ACCELERATOR_INCOMPATIBLE naming the missing exports, and one console.error", async () => {
        const status = await controllerFailingWith(incompatible()).start();

        assert.strictEqual(status.code, "E_ACCELERATOR_INCOMPATIBLE");
        assert.deepEqual(status.params?.missing, ["EXACT_MAX_NODES", "acquireAccelerator"]);
        assert.strictEqual(error.mock.calls.length, 1);
    });

    it.each(["E_NO_WEBGPU", "E_NO_ADAPTER", "E_SOFTWARE_ONLY", "E_DEVICE_INCORRECT"] as const)(
        "installed, the browser cannot use it (%s): one console.warn per page, and no sentence in params",
        async (code) => {
            const status = await controllerFailingWith(probeFailure(code)).start();
            await controllerFailingWith(probeFailure(code)).start();

            assert.strictEqual(status.code, code);
            assert.deepEqual(status.params, { accelerator: "webgpu-graph-algorithms" });
            assert.strictEqual(warn.mock.calls.length, 1);
            assert.match(String(warn.mock.calls[0]?.[0]), new RegExp(`^\\[graphty-element\\] ${code}: `));
            assert.strictEqual(error.mock.calls.length, 0);
        },
    );

    it("off: never calls the factory and prints nothing", async () => {
        const registry = new AcceleratorRegistry();
        const factory = vi.fn(() => Promise.reject(probeFailure("E_NO_WEBGPU")));
        registry.register({ name: "webgpu-graph-algorithms", factory });

        const status = await new AccelerationController({ registry, policy: "off" }).start();

        assert.strictEqual(status.state, "off");
        assert.strictEqual(factory.mock.calls.length, 0);
        assert.strictEqual(warn.mock.calls.length + error.mock.calls.length, 0);
    });

    it("a status with no code carries no params", async () => {
        const status = await new AccelerationController({ registry: new AcceleratorRegistry(), policy: "off" }).start();

        assert.isUndefined(status.params);
    });
});
