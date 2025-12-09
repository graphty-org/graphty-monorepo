import {ColorInput} from "@mantine/core";
import {describe, expect, it} from "vitest";

import {render, screen} from "../../../test/test-utils";

/**
 * Regression tests for Phase 4 compact size styling.
 * This phase adds compact size support to ColorInput (used in GradientEditor)
 * and verifies the sidebar component integration.
 *
 * Expected compact size styles:
 * - ColorInput: 24px height, 11px font (same as TextInput)
 */

describe("Compact Phase 4 Style Regression", () => {
    describe("ColorInput compact styles", () => {
        it("ColorInput has correct compact height", () => {
            render(
                <ColorInput
                    label="Test color"
                    aria-label="Test color"
                    size="compact"
                />,
            );

            const input = screen.getByRole("textbox");
            const computed = window.getComputedStyle(input);

            expect(computed.height).toBe("24px");
        });

        it("ColorInput has correct compact font size", () => {
            render(
                <ColorInput
                    label="Test color"
                    aria-label="Test color"
                    size="compact"
                />,
            );

            const input = screen.getByRole("textbox");
            const computed = window.getComputedStyle(input);

            expect(computed.fontSize).toBe("11px");
        });

        it("ColorInput wrapper has correct compact CSS variables", () => {
            const {container} = render(
                <ColorInput
                    label="Test color"
                    aria-label="Test color"
                    size="compact"
                    value="#ff0000"
                />,
            );

            // Check the wrapper has the correct CSS variables set
            const wrapper = container.querySelector(".mantine-ColorInput-wrapper");
            expect(wrapper).not.toBeNull();

            if (wrapper) {
                const computed = window.getComputedStyle(wrapper);
                // Verify the compact CSS variables are set
                const inputSize = computed.getPropertyValue("--input-size");
                const inputFz = computed.getPropertyValue("--input-fz");
                expect(inputSize).toBe("24px");
                expect(inputFz).toBe("11px");
            }
        });
    });

    describe("ColorInput consistent with other compact inputs", () => {
        it("ColorInput height matches TextInput compact height", () => {
            const {container} = render(
                <>
                    <ColorInput
                        label="Color"
                        aria-label="Color"
                        size="compact"
                    />
                </>,
            );

            const colorInput = container.querySelector(".mantine-ColorInput-input");
            expect(colorInput).not.toBeNull();

            if (colorInput) {
                const computed = window.getComputedStyle(colorInput);
                // Should match TextInput compact height of 24px
                expect(computed.height).toBe("24px");
            }
        });

        it("ColorInput font size matches TextInput compact font size", () => {
            const {container} = render(
                <ColorInput
                    label="Color"
                    aria-label="Color"
                    size="compact"
                />,
            );

            const colorInput = container.querySelector(".mantine-ColorInput-input");
            expect(colorInput).not.toBeNull();

            if (colorInput) {
                const computed = window.getComputedStyle(colorInput);
                // Should match TextInput compact font size of 11px
                expect(computed.fontSize).toBe("11px");
            }
        });
    });
});
