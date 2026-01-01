import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../test/test-utils";
import { GradientEditor } from "../controls/GradientEditor";
import { NodeColorControl } from "../node-controls/NodeColorControl";
import { NodeShapeControl } from "../node-controls/NodeShapeControl";

// Noop function for onChange handlers
const noop = vi.fn();

/**
 * Integration regression tests for Phase 4 compact size styling.
 * These tests verify that the actual sidebar components render with
 * correct compact sizing after migration from inline styles to
 * size="compact" prop usage.
 *
 * This ensures:
 * 1. Components correctly use the theme's compact size
 * 2. No regression in visual appearance
 * 3. Consistent sizing across all sidebar controls
 */

describe("Sidebar Compact Integration", () => {
    describe("NodeShapeControl compact styles", () => {
        const defaultShape = { type: "sphere", size: 1.0 };

        it("NativeSelect in NodeShapeControl has compact height", () => {
            render(<NodeShapeControl value={defaultShape} onChange={noop} />);

            // NativeSelect renders a select element
            const select = screen.getByLabelText("Shape Type");
            const computed = window.getComputedStyle(select);

            expect(computed.height).toBe("24px");
        });

        it("NumberInput in NodeShapeControl has compact height", () => {
            render(<NodeShapeControl value={defaultShape} onChange={noop} />);

            // NumberInput for size
            const input = screen.getByLabelText("Size");
            const computed = window.getComputedStyle(input);

            expect(computed.height).toBe("24px");
        });

        it("NativeSelect in NodeShapeControl has compact font size", () => {
            render(<NodeShapeControl value={defaultShape} onChange={noop} />);

            const select = screen.getByLabelText("Shape Type");
            const computed = window.getComputedStyle(select);

            expect(computed.fontSize).toBe("11px");
        });

        it("NumberInput in NodeShapeControl has compact font size", () => {
            render(<NodeShapeControl value={defaultShape} onChange={noop} />);

            const input = screen.getByLabelText("Size");
            const computed = window.getComputedStyle(input);

            expect(computed.fontSize).toBe("11px");
        });
    });

    describe("NodeColorControl compact styles", () => {
        const defaultSolidColor = {
            mode: "solid" as const,
            color: "#5b8ff9",
            opacity: 1.0,
        };

        it("SegmentedControl in NodeColorControl uses compact styles", () => {
            render(<NodeColorControl value={defaultSolidColor} onChange={noop} />);

            // Find the segmented control root element
            const segmentedControl = document.querySelector(".mantine-SegmentedControl-root");
            expect(segmentedControl).not.toBeNull();

            if (segmentedControl) {
                const computed = window.getComputedStyle(segmentedControl);
                // Check the CSS variable is set for compact
                const fontSize = computed.getPropertyValue("--sc-font-size");
                expect(fontSize).toBe("10px");
            }
        });

        it("TextInput for hex value has compact height", () => {
            render(<NodeColorControl value={defaultSolidColor} onChange={noop} />);

            // The hex input
            const hexInput = screen.getByLabelText("Color hex value");
            const computed = window.getComputedStyle(hexInput);

            expect(computed.height).toBe("24px");
        });

        it("NumberInput for opacity has compact height", () => {
            render(<NodeColorControl value={defaultSolidColor} onChange={noop} />);

            // The opacity input
            const opacityInput = screen.getByLabelText("Opacity");
            const computed = window.getComputedStyle(opacityInput);

            expect(computed.height).toBe("24px");
        });
    });

    describe("GradientEditor compact styles", () => {
        const defaultStops = [
            { id: "stop-1", offset: 0, color: "#ff0000" },
            { id: "stop-2", offset: 1, color: "#0000ff" },
        ];

        it("ActionIcon for add stop has compact size", () => {
            render(<GradientEditor stops={defaultStops} onChange={noop} />);

            const addButton = screen.getByLabelText("Add color stop");
            const computed = window.getComputedStyle(addButton);

            // ActionIcon compact size is 24px
            expect(computed.width).toBe("24px");
            expect(computed.height).toBe("24px");
        });

        it("ColorInput in GradientEditor has compact height", () => {
            render(<GradientEditor stops={defaultStops} onChange={noop} />);

            // Find the ColorInput inputs
            const colorInputs = document.querySelectorAll(".mantine-ColorInput-input");
            expect(colorInputs.length).toBeGreaterThan(0);

            colorInputs.forEach((input) => {
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            });
        });

        it("Slider in GradientEditor has compact styles", () => {
            render(<GradientEditor stops={defaultStops} onChange={noop} />);

            // Find the slider root elements
            const sliders = document.querySelectorAll(".mantine-Slider-root");
            expect(sliders.length).toBeGreaterThan(0);

            sliders.forEach((slider) => {
                const computed = window.getComputedStyle(slider);
                // Check the CSS variable for compact slider size
                const size = computed.getPropertyValue("--slider-size");
                expect(size).toBe("4px");
            });
        });

        it("Remove stop ActionIcon has compact size", () => {
            render(<GradientEditor stops={defaultStops} onChange={noop} />);

            const removeButtons = screen.getAllByLabelText(/Remove color stop/);
            expect(removeButtons.length).toBeGreaterThan(0);

            removeButtons.forEach((button) => {
                const computed = window.getComputedStyle(button);
                expect(computed.width).toBe("24px");
                expect(computed.height).toBe("24px");
            });
        });

        it("Direction slider has compact styles when shown", () => {
            render(<GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={noop} />);

            const directionSlider = screen.getByLabelText("Gradient direction");
            expect(directionSlider).not.toBeNull();

            // Find the parent slider root
            const sliderRoot = directionSlider.closest(".mantine-Slider-root");
            if (sliderRoot) {
                const computed = window.getComputedStyle(sliderRoot);
                const size = computed.getPropertyValue("--slider-size");
                expect(size).toBe("4px");
            }
        });
    });

    describe("Consistent compact sizing across controls", () => {
        it("All input controls have the same compact height (24px)", () => {
            const defaultShape = { type: "sphere", size: 1.0 };
            const defaultColor = { mode: "solid" as const, color: "#5b8ff9", opacity: 1.0 };

            render(
                <>
                    <NodeShapeControl value={defaultShape} onChange={noop} />
                    <NodeColorControl value={defaultColor} onChange={noop} />
                </>,
            );

            // Gather all input-like elements
            const shapeSelect = screen.getByLabelText("Shape Type");
            const sizeInput = screen.getByLabelText("Size");
            const hexInput = screen.getByLabelText("Color hex value");
            const opacityInput = screen.getByLabelText("Opacity");

            const heights = [shapeSelect, sizeInput, hexInput, opacityInput].map(
                (el) => window.getComputedStyle(el).height,
            );

            // All should be 24px
            expect(new Set(heights).size).toBe(1);
            expect(heights[0]).toBe("24px");
        });

        it("All input controls have the same compact font size (11px)", () => {
            const defaultShape = { type: "sphere", size: 1.0 };
            const defaultColor = { mode: "solid" as const, color: "#5b8ff9", opacity: 1.0 };

            render(
                <>
                    <NodeShapeControl value={defaultShape} onChange={noop} />
                    <NodeColorControl value={defaultColor} onChange={noop} />
                </>,
            );

            const shapeSelect = screen.getByLabelText("Shape Type");
            const sizeInput = screen.getByLabelText("Size");
            const hexInput = screen.getByLabelText("Color hex value");
            const opacityInput = screen.getByLabelText("Opacity");

            const fontSizes = [shapeSelect, sizeInput, hexInput, opacityInput].map(
                (el) => window.getComputedStyle(el).fontSize,
            );

            // All should be 11px
            expect(new Set(fontSizes).size).toBe(1);
            expect(fontSizes[0]).toBe("11px");
        });
    });
});
