/**
 * The G4 vendor assertions (spec 11.1; P4-T15): on an NVIDIA adapter the device has `subgroups` with a 32 / 32
 * subgroup size, `timestamp-query` granted (the context's profiler is enabled) and the raised limits (maxBufferSize
 * at least 2^31, maxStorageBufferBindingSize above 128 MiB); on any other vendor the file prints the facts and asserts
 * only the shapes (the subgroup sizes are 0 iff the feature is absent, the profiler exists iff timestamp-query does).
 */

import { acquire, requireGpu } from "../setup/gpu.js";

const MIB = 2 ** 20;

describe("the adapter's features and raised limits (node-limits, spec 11.1)", () => {
    it("NVIDIA: subgroups 32 / 32, timestamp-query (the profiler enabled), maxBufferSize >= 2^31; elsewhere the shapes", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/vendor-features", limits: "raise" });
        try {
            const { caps, profiler } = ctx;
            const subgroups = caps.features.has("subgroups");
            const timestamps = caps.features.has("timestamp-query");
            console.warn(
                `[vendor-features] vendor=${caps.vendor} architecture=${caps.architecture} device=${caps.device} software=${caps.software} features=${[...caps.features].join(",")} subgroups=${caps.subgroupMinSize}-${caps.subgroupMaxSize} profiler=${profiler === null ? "null" : profiler.enabled} maxBufferSize=${caps.limits.maxBufferSize} maxStorageBufferBindingSize=${caps.limits.maxStorageBufferBindingSize} maxComputeWorkgroupsPerDimension=${caps.limits.maxComputeWorkgroupsPerDimension}`,
            );
            // the shapes, on every vendor
            expect(caps.subgroupMinSize === 0 && caps.subgroupMaxSize === 0).toBe(!subgroups);
            expect(caps.subgroupMinSize).toBeLessThanOrEqual(caps.subgroupMaxSize);
            expect(profiler === null).toBe(!timestamps);
            expect(profiler === null ? false : profiler.enabled).toBe(timestamps);
            expect(Number.isInteger(caps.limits.maxBufferSize) && caps.limits.maxBufferSize > 0).toBe(true);
            expect(caps.limits.maxStorageBufferBindingSize).toBeLessThanOrEqual(caps.limits.maxBufferSize);
            if (caps.vendor !== "nvidia") {
                return;
            }
            expect(caps.software).toBe(false);
            expect(subgroups).toBe(true);
            expect(caps.subgroupMinSize).toBe(32);
            expect(caps.subgroupMaxSize).toBe(32);
            expect(timestamps).toBe(true);
            expect(profiler?.enabled).toBe(true);
            expect(caps.limits.maxBufferSize).toBeGreaterThanOrEqual(2 ** 31);
            expect(caps.limits.maxStorageBufferBindingSize).toBeGreaterThan(128 * MIB);
        } finally {
            ctx.dispose();
        }
    });
});
