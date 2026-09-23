import type { AccelerationStatus } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { ACCELERATION_CHIP_PREFIX, formatAcceleration } from "../formatAcceleration";

describe("formatAcceleration", () => {
    it("draws nothing while the element is still probing", () => {
        expect(formatAcceleration({ state: "probing" })).toBeNull();
    });

    it("names the hardware when an accelerator is attached, at rest or at work", () => {
        const attached: AccelerationStatus = {
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
        expect(formatAcceleration({ state: "active", backend: "webgpu" })).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: on`,
            title: "webgpu. Layouts and algorithms with a GPU path run on it.",
            active: true,
        });
    });

    it("says where the reader switched it off, and diagnoses nothing", () => {
        expect(formatAcceleration({ state: "off" })).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: off`,
            title: "Switched off in Settings > Performance.",
            active: false,
        });
    });

    it("carries the element's reason when no accelerator is available", () => {
        expect(formatAcceleration({ state: "unavailable", code: "E_NO_WEBGPU", reason: "this browser has no WebGPU" })).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: off`,
            title: "this browser has no WebGPU",
            active: false,
        });
    });

    it("carries the element's reason when an attached accelerator failed", () => {
        expect(
            formatAcceleration({ state: "error", code: "E_DEVICE_LOST", reason: "the accelerator's device was lost: reset" }),
        ).toEqual({
            label: `${ACCELERATION_CHIP_PREFIX}: off`,
            title: "the accelerator's device was lost: reset",
            active: false,
        });
    });

    it("falls back from reason to code to the fixed sentence", () => {
        expect(formatAcceleration({ state: "unavailable", code: "E_NO_ADAPTER" })?.title).toBe("E_NO_ADAPTER");
        expect(formatAcceleration({ state: "unavailable" })?.title).toBe("No accelerator is available.");
    });
});
