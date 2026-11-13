import { assert } from "chai";
import { describe, test } from "vitest";

import { xrConfigSchema } from "../../src/config/xr-config-schema";

describe("XR Configuration Schema", () => {
    describe("Valid configurations", () => {
        test("should accept valid minimal config", () => {
            const config = { enabled: true };
            const result = xrConfigSchema.safeParse(config);
            assert.isTrue(result.success);
        });

        test("should accept empty config with defaults", () => {
            const config = {};
            const result = xrConfigSchema.safeParse(config);
            assert.isTrue(result.success);
        });

        test("should accept full config with all fields", () => {
            const config = {
                enabled: true,
                ui: {
                    enabled: true,
                    position: "bottom-right" as const,
                    unavailableMessageDuration: 5000,
                    showAvailabilityWarning: false,
                },
                vr: {
                    enabled: true,
                    referenceSpaceType: "local-floor" as const,
                    optionalFeatures: ["hand-tracking"],
                },
                ar: {
                    enabled: true,
                    referenceSpaceType: "local-floor" as const,
                    optionalFeatures: ["hit-test"],
                },
                input: {
                    handTracking: true,
                    nearInteraction: true,
                    zAxisAmplification: 10.0,
                    enableZAmplificationInDesktop: false,
                },
            };

            const result = xrConfigSchema.safeParse(config);
            assert.isTrue(result.success);
        });
    });

    describe("Default values", () => {
        test("should apply defaults for missing fields", () => {
            const config = { enabled: true };
            const parsed = xrConfigSchema.parse(config);

            assert.equal(parsed.enabled, true);
            assert.equal(parsed.ui.enabled, true);
            assert.equal(parsed.ui.position, "bottom-right");
            assert.equal(parsed.ui.unavailableMessageDuration, 5000);
            assert.equal(parsed.ui.showAvailabilityWarning, false);
            assert.equal(parsed.ui.vrLabel, "VR");
            assert.equal(parsed.ui.arLabel, "AR");
            assert.equal(parsed.ui.unavailableLabel, "VR / AR NOT AVAILABLE");
            assert.equal(parsed.vr.enabled, true);
            assert.equal(parsed.vr.referenceSpaceType, "local-floor");
            assert.equal(parsed.ar.enabled, true);
            assert.equal(parsed.ar.referenceSpaceType, "local-floor");
            assert.equal(parsed.input.handTracking, true);
            assert.equal(parsed.input.nearInteraction, true);
            assert.equal(parsed.input.zAxisAmplification, 10.0);
            assert.equal(parsed.input.enableZAmplificationInDesktop, false);
        });

        test("should preserve user-provided values", () => {
            const config = {
                enabled: false,
                ui: { position: "top-left" as const },
                input: { zAxisAmplification: 5.0 },
            };
            const parsed = xrConfigSchema.parse(config);

            assert.equal(parsed.enabled, false);
            assert.equal(parsed.ui.position, "top-left");
            assert.equal(parsed.input.zAxisAmplification, 5.0);
        });
    });

    describe("Validation rules", () => {
        test("should reject negative zAxisAmplification", () => {
            const config = {
                input: { zAxisAmplification: -5 },
            };
            const result = xrConfigSchema.safeParse(config);
            assert.isFalse(result.success);
        });

        test("should reject zero zAxisAmplification", () => {
            const config = {
                input: { zAxisAmplification: 0 },
            };
            const result = xrConfigSchema.safeParse(config);
            assert.isFalse(result.success);
        });

        test("should accept positive zAxisAmplification", () => {
            const config = {
                input: { zAxisAmplification: 15.5 },
            };
            const result = xrConfigSchema.safeParse(config);
            assert.isTrue(result.success);
        });

        test("should reject negative unavailableMessageDuration", () => {
            const config = {
                ui: { unavailableMessageDuration: -1000 },
            };
            const result = xrConfigSchema.safeParse(config);
            assert.isFalse(result.success);
        });

        test("should reject zero unavailableMessageDuration", () => {
            const config = {
                ui: { unavailableMessageDuration: 0 },
            };
            const result = xrConfigSchema.safeParse(config);
            assert.isFalse(result.success);
        });

        test("should reject invalid UI position", () => {
            const config = {
                ui: { position: "center" },
            };
            const result = xrConfigSchema.safeParse(config);
            assert.isFalse(result.success);
        });

        test("should accept all valid UI positions", () => {
            const positions = ["bottom-left", "bottom-right", "top-left", "top-right"];

            positions.forEach((position) => {
                const config = { ui: { position } };
                const result = xrConfigSchema.safeParse(config);
                assert.isTrue(result.success, `Position ${position} should be valid`);
            });
        });

        test("should reject invalid referenceSpaceType", () => {
            const config = {
                vr: { referenceSpaceType: "invalid" },
            };
            const result = xrConfigSchema.safeParse(config);
            assert.isFalse(result.success);
        });

        test("should accept all valid referenceSpaceTypes", () => {
            const types = ["local", "local-floor", "bounded-floor", "unbounded"];

            types.forEach((type) => {
                const config = { vr: { referenceSpaceType: type } };
                const result = xrConfigSchema.safeParse(config);
                assert.isTrue(result.success, `Type ${type} should be valid`);
            });
        });
    });

    describe("Type inference", () => {
        test("should infer correct types for parsed config", () => {
            const config = {};
            const parsed = xrConfigSchema.parse(config);

            // Type checks (these will fail at compile time if types are wrong)
            const { enabled } = parsed;
            const { position } = parsed.ui;
            const { zAxisAmplification } = parsed.input;

            assert.exists(enabled);
            assert.exists(position);
            assert.exists(zAxisAmplification);
        });
    });

    describe("Nested defaults", () => {
        test("should apply defaults for nested ui config", () => {
            const config = { ui: {} };
            const parsed = xrConfigSchema.parse(config);

            assert.equal(parsed.ui.enabled, true);
            assert.equal(parsed.ui.position, "bottom-right");
            assert.equal(parsed.ui.unavailableMessageDuration, 5000);
            assert.equal(parsed.ui.showAvailabilityWarning, false);
        });

        test("should apply defaults for nested input config", () => {
            const config = { input: {} };
            const parsed = xrConfigSchema.parse(config);

            assert.equal(parsed.input.handTracking, true);
            assert.equal(parsed.input.nearInteraction, true);
            assert.equal(parsed.input.zAxisAmplification, 10.0);
            assert.equal(parsed.input.enableZAmplificationInDesktop, false);
        });
    });

    describe("AR specific defaults", () => {
        test("requests no optional features by default, in AR or VR", () => {
            const parsed = xrConfigSchema.parse({});

            assert.deepEqual(parsed.ar.optionalFeatures, []);
            assert.deepEqual(parsed.vr.optionalFeatures, []);
        });

        test("should allow overriding AR optional features", () => {
            const config = {
                ar: { optionalFeatures: ["custom-feature"] },
            };
            const parsed = xrConfigSchema.parse(config);

            assert.deepEqual(parsed.ar.optionalFeatures, ["custom-feature"]);
        });
    });
});
