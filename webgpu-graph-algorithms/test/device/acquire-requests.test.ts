/**
 * The adapter and device requests of src/device/acquire.ts (spec 2.2 steps 1 and 3) on a stub adapter, so each
 * refusal is reached without a GPU: requestAdapter's E_NO_ADAPTER, an explicit limit above the adapter, a missing
 * required feature, and requestDevice's E_NO_DEVICE for a consumed adapter and for any other rejection.
 */

import { describe, expect, it } from "vitest";

import {
    buildRequiredFeatures,
    buildRequiredLimits,
    requestAdapter,
    requestDevice,
    summarizeAdapter,
} from "../../src/device/acquire.js";
import { WebGpuGraphError } from "../../src/errors.js";

interface StubAdapterOptions {
    readonly limits?: Readonly<Record<string, number>>;
    readonly features?: readonly string[];
    readonly requestDevice?: () => Promise<GPUDevice>;
}

/** An adapter with the members acquire.ts reads: info, features, limits and requestDevice. */
function stubAdapter(options: StubAdapterOptions = {}): GPUAdapter {
    return {
        info: { vendor: "stub", architecture: "stub-arch", device: "", description: "a stub adapter" },
        features: new Set(options.features ?? []),
        limits: { maxBufferSize: 1024, maxStorageBufferBindingSize: 512, ...options.limits },
        requestDevice: options.requestDevice ?? ((): Promise<GPUDevice> => Promise.resolve({} as GPUDevice)),
    } as unknown as GPUAdapter;
}

async function errorOf(p: Promise<unknown>): Promise<WebGpuGraphError> {
    const error: unknown = await p.then(
        () => null,
        (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(WebGpuGraphError);
    return error as WebGpuGraphError;
}

function thrownBy(fn: () => unknown): WebGpuGraphError {
    try {
        fn();
    } catch (err) {
        expect(err).toBeInstanceOf(WebGpuGraphError);
        return err as WebGpuGraphError;
    }
    throw new Error("expected a throw");
}

describe("requestAdapter (spec 2.2 step 1)", () => {
    it("a throwing or a null requestAdapter() is E_NO_ADAPTER with the reason", async () => {
        const throwing = { requestAdapter: (): Promise<null> => Promise.reject(new Error("GPU process gone")) };
        const thrown = await errorOf(requestAdapter(throwing as unknown as GPU, "high-performance"));
        expect(thrown.code).toBe("E_NO_ADAPTER");
        expect(thrown.details.reason).toBe("requestAdapter() threw: GPU process gone");

        const empty = { requestAdapter: (): Promise<null> => Promise.resolve(null) };
        const none = await errorOf(requestAdapter(empty as unknown as GPU, "high-performance"));
        expect(none.code).toBe("E_NO_ADAPTER");
        expect(String(none.details.reason)).toContain("returned null");
    });
});

describe("buildRequiredLimits and buildRequiredFeatures (spec 2.2 step 3)", () => {
    it("an explicit policy passes what it names, skips what it does not, and refuses a value above the adapter", () => {
        const adapter = stubAdapter();
        expect(buildRequiredLimits(adapter, { maxBufferSize: 256 })).toEqual({ maxBufferSize: 256 });
        expect(buildRequiredLimits(adapter, {})).toEqual({});

        const over = thrownBy(() => buildRequiredLimits(adapter, { maxStorageBufferBindingSize: 4096 }));
        expect(over.code).toBe("E_NO_DEVICE");
        expect(over.details).toMatchObject({
            reason: "limit",
            limit: "maxStorageBufferBindingSize",
            requested: 4096,
            available: 512,
        });
        expect(over.details.adapter).toEqual(summarizeAdapter(adapter));
    });

    it("required features come first and once; optional ones only when the adapter has them; a missing required one is refused", () => {
        const adapter = stubAdapter({ features: ["subgroups", "timestamp-query"] });
        expect(
            buildRequiredFeatures(
                adapter,
                ["timestamp-query", "timestamp-query"],
                ["subgroups", "timestamp-query", "shader-f16"],
            ),
        ).toEqual(["timestamp-query", "subgroups"]);

        const missing = thrownBy(() => buildRequiredFeatures(adapter, ["shader-f16"], []));
        expect(missing.code).toBe("E_NO_DEVICE");
        expect(missing.details).toMatchObject({ reason: "feature", requested: "shader-f16" });
    });
});

describe("requestDevice (spec 2.2 step 3)", () => {
    it("a second request on an adapter this package already used is E_NO_DEVICE 'consumed' without a round trip", async () => {
        let calls = 0;
        const adapter = stubAdapter({
            requestDevice: () => {
                calls += 1;
                return Promise.resolve({} as GPUDevice);
            },
        });
        await requestDevice(adapter, {});
        const second = await errorOf(requestDevice(adapter, {}));
        expect(second.code).toBe("E_NO_DEVICE");
        expect(second.details.reason).toBe("consumed");
        expect(second.message).toContain("recorded by this package");
        expect(calls).toBe(1);
    });

    it("the runtime's 'consumed' rejection is E_NO_DEVICE 'consumed'; any other rejection is 'requestDevice'", async () => {
        const used = stubAdapter({
            requestDevice: () => Promise.reject(new Error("OperationError: adapter has already been used")),
        });
        const consumed = await errorOf(requestDevice(used, {}));
        expect(consumed.details.reason).toBe("consumed");
        expect(consumed.message).toContain("already been used");

        const broken = stubAdapter({ requestDevice: () => Promise.reject(new Error("out of device memory")) });
        const rejected = await errorOf(requestDevice(broken, {}));
        expect(rejected.code).toBe("E_NO_DEVICE");
        expect(rejected.details.reason).toBe("requestDevice");
        expect(rejected.message).toBe("requestDevice() rejected: out of device memory");
        // a rejected request does not consume the adapter: the next request reaches the runtime again
        const again = await errorOf(requestDevice(broken, {}));
        expect(again.details.reason).toBe("requestDevice");
    });
});
