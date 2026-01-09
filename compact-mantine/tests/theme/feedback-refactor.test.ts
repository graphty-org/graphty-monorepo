import { describe, expect, it } from "vitest";

import { feedbackComponentExtensions } from "../../src/theme/components/feedback";

/**
 * Tests for the refactored feedback components.
 * These tests verify that feedback components use defaultProps for compact sizing
 * instead of conditional logic.
 */
describe("Feedback Component Extensions (Refactored)", () => {
    describe("defaultProps", () => {
        it("Loader defaults to size sm", () => {
            const extension = feedbackComponentExtensions.Loader;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Progress defaults to size sm", () => {
            const extension = feedbackComponentExtensions.Progress;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("RingProgress does not set default size (uses numeric size prop)", () => {
            const extension = feedbackComponentExtensions.RingProgress;
            // RingProgress uses numeric size - no string size default
            expect(extension.defaultProps?.size).toBeUndefined();
        });

        it("all feedback components with size prop default to sm", () => {
            const sizedComponents = ["Loader", "Progress"] as const;

            for (const name of sizedComponents) {
                const ext =
                    feedbackComponentExtensions[
                        name as keyof typeof feedbackComponentExtensions
                    ];
                expect(ext.defaultProps?.size, `${name} should default to sm`).toBe(
                    "sm",
                );
            }
        });
    });

    describe("CSS variables via vars", () => {
        it("Loader has vars function that returns loader variables", () => {
            const extension = feedbackComponentExtensions.Loader;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--loader-size"]).toBe("18px");
        });

        it("Progress has vars function that returns progress variables", () => {
            const extension = feedbackComponentExtensions.Progress;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--progress-size"]).toBe("4px");
        });

        it("RingProgress does not have vars (uses numeric size prop)", () => {
            const extension = feedbackComponentExtensions.RingProgress;
            // RingProgress requires numeric size - no vars override
            expect(extension.vars).toBeUndefined();
        });
    });

    describe("styles", () => {
        it("Progress has styles function for label styling", () => {
            const extension = feedbackComponentExtensions.Progress;
            expect(extension.styles).toBeDefined();
            expect(typeof extension.styles).toBe("object");
            const styles = extension.styles as Record<
                string,
                Record<string, unknown>
            >;
            expect(styles.label).toBeDefined();
            expect(styles.label.fontSize).toBe(9);
        });
    });
});
