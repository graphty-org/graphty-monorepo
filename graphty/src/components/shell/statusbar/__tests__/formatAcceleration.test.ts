import type { AccelerationStatus } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { ACCELERATION_CHIP_PREFIX, formatAcceleration } from "../formatAcceleration";

describe("formatAcceleration", () => {
    it("draws nothing while the element is still probing", () => {
        expect(formatAcceleration({ policy: "auto", state: "probing" })).toBeNull();
    });

    it("names the hardware when an accelerator is attached, at rest or at work", () => {
        const attached: AccelerationStatus = {
            policy: "auto",
            state: "active",
            backend: "webgpu",
            vendor: "nvidia",
            architecture: "ampere",
            device: "NVIDIA ampere",
        };

        expect(formatAcceleration(attached)).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: on (nvidia ampere)`,
            title: "NVIDIA ampere. Layouts and algorithms with a GPU path run on it.",
            active: true,
        });

        // `idle` is a working accelerator with nothing to do, not a degraded one.
        expect(formatAcceleration({ ...attached, state: "idle" })).toEqual(formatAcceleration(attached));
    });

    it("omits the parenthesis when the backend reported no vendor and no architecture", () => {
        expect(formatAcceleration({ policy: "auto", state: "active", backend: "webgpu" })).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: on`,
            title: "webgpu. Layouts and algorithms with a GPU path run on it.",
            active: true,
        });
    });

    it("reads as a sentence when the backend named no device description", () => {
        /* What graphty-element publishes on a browser that masks the device string: the vendor
           and the family, and no `device` key at all. It used to publish `device: ""`, and `??`
           does not catch an empty string, so this tooltip came out as ". Layouts and algorithms
           with a GPU path run on it." -- read off the running app on 2026-09-23. The fix is the
           element's, and the test that fails without it is the element's own
           `test/acceleration/AccelerationController.test.ts`; this pins what the chip then says. */
        expect(
            formatAcceleration({ policy: "auto", state: "idle", backend: "webgpu", vendor: "nvidia", architecture: "lovelace" }),
        ).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: on (nvidia lovelace)`,
            title: "webgpu. Layouts and algorithms with a GPU path run on it.",
            active: true,
        });
    });

    it("says where the reader switched it off, and diagnoses nothing", () => {
        expect(formatAcceleration({ policy: "auto", state: "off" })).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: off`,
            title: "Switched off in Settings > Performance.",
            active: false,
        });
    });

    it("carries the element's reason when no accelerator is available", () => {
        expect(formatAcceleration({ policy: "auto", state: "unavailable", code: "E_NO_WEBGPU", reason: "this browser has no WebGPU" })).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: off`,
            title: "this browser has no WebGPU",
            active: false,
        });
    });

    it("carries the element's reason when an attached accelerator failed", () => {
        expect(
            formatAcceleration({ policy: "auto", state: "error", code: "E_DEVICE_LOST", reason: "the accelerator's device was lost: reset" }),
        ).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: off`,
            title: "the accelerator's device was lost: reset",
            active: false,
        });
    });

    it("carries the element's reason when the GPU computes incorrectly, rather than a generic failure", () => {
        expect(
            formatAcceleration({
                policy: "auto",
                state: "unavailable",
                code: "E_DEVICE_INCORRECT",
                reason:
                    "webgpu-graph-algorithms: this device computes multi-workgroup shaders incorrectly, " +
                    "so every number computed here would be unreliable",
            }),
        ).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: off`,
            title:
                "webgpu-graph-algorithms: this device computes multi-workgroup shaders incorrectly, " +
                "so every number computed here would be unreliable",
            active: false,
        });
    });

    it("falls back from reason to code to the fixed sentence", () => {
        expect(formatAcceleration({ policy: "auto", state: "unavailable", code: "E_NO_ADAPTER" })?.title).toBe("E_NO_ADAPTER");
        expect(formatAcceleration({ policy: "auto", state: "unavailable" })?.title).toBe("No accelerator is available.");
    });
});
