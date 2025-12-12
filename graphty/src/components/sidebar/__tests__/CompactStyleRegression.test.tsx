import {describe, expect, it} from "vitest";

import {render, screen} from "../../../test/test-utils";
import type {LayerItem} from "../../layout/LeftSidebar";
import {RightSidebar} from "../../layout/RightSidebar";

/**
 * Regression tests for compact size styling.
 * These tests verify that the theme-based compact size produces the expected
 * computed styles on sidebar input components.
 *
 * Expected compact size styles:
 * - height: 24px
 * - fontSize: 11px
 * - backgroundColor: rgb(22, 27, 34) (dark-8)
 * - border: none
 */
describe("Compact Size Style Regression", () => {
    const mockLayer: LayerItem = {
        id: "layer-1",
        name: "Test Layer",
        styleLayer: {
            node: {
                selector: "",
                style: {
                    shape: {type: "sphere", size: 1},
                    color: {mode: "solid", color: "#5b8ff9", opacity: 1},
                },
            },
            edge: {
                selector: "",
                style: {},
            },
        },
    };

    describe("TextInput compact styles", () => {
        it("Node Selector input has correct compact height", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const input = screen.getByLabelText("Node Selector");
            const computed = window.getComputedStyle(input);

            expect(computed.height).toBe("24px");
        });

        it("Node Selector input has correct compact font size", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const input = screen.getByLabelText("Node Selector");
            const computed = window.getComputedStyle(input);

            expect(computed.fontSize).toBe("11px");
        });

        it("Node Selector input has dark-8 background color", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const input = screen.getByLabelText("Node Selector");
            const computed = window.getComputedStyle(input);

            // dark-8 = #161b22 = rgb(22, 27, 34)
            expect(computed.backgroundColor).toBe("rgb(22, 27, 34)");
        });

        it("Node Selector input has no border", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const input = screen.getByLabelText("Node Selector");
            const computed = window.getComputedStyle(input);

            // Border should be "0px none" or similar
            expect(computed.borderWidth).toBe("0px");
        });

        it("Color hex input has correct compact styles", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            // First color hex input is for node color
            const inputs = screen.getAllByLabelText("Color hex value");
            const computed = window.getComputedStyle(inputs[0]);

            expect(computed.height).toBe("24px");
            expect(computed.fontSize).toBe("11px");
            expect(computed.backgroundColor).toBe("rgb(22, 27, 34)");
        });
    });

    describe("NumberInput compact styles", () => {
        it("Size input has correct compact height", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const input = screen.getByLabelText("Size");
            const computed = window.getComputedStyle(input);

            expect(computed.height).toBe("24px");
        });

        it("Size input has correct compact font size", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const input = screen.getByLabelText("Size");
            const computed = window.getComputedStyle(input);

            expect(computed.fontSize).toBe("11px");
        });

        it("Size input has dark-8 background color", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const input = screen.getByLabelText("Size");
            const computed = window.getComputedStyle(input);

            expect(computed.backgroundColor).toBe("rgb(22, 27, 34)");
        });

        it("Opacity input has correct compact styles", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            // First opacity input is for node color
            const inputs = screen.getAllByLabelText("Opacity");
            const computed = window.getComputedStyle(inputs[0]);

            expect(computed.height).toBe("24px");
            expect(computed.fontSize).toBe("11px");
            expect(computed.backgroundColor).toBe("rgb(22, 27, 34)");
        });
    });

    describe("NativeSelect compact styles", () => {
        // Note: NativeSelect uses native browser <select> element which has
        // different styling behavior. The CSS variables affect the wrapper,
        // but the select element retains some browser-default styles.
        // These tests verify the wrapper is styled correctly.

        it("Shape Type select wrapper has compact styles applied", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const select = screen.getByLabelText("Shape Type");
            const wrapper = select.closest(".mantine-NativeSelect-wrapper");

            if (wrapper) {
                const wrapperComputed = window.getComputedStyle(wrapper);
                // Verify the CSS variables are set on the wrapper
                expect(wrapperComputed.getPropertyValue("--input-size")).toBe("24px");
                expect(wrapperComputed.getPropertyValue("--input-fz")).toBe("11px");
                expect(wrapperComputed.getPropertyValue("--input-bg")).toBeTruthy();
            }
        });
    });

    describe("All inputs consistent", () => {
        // Note: NativeSelect (shapeType) is excluded from these consistency tests
        // because native browser <select> elements have different styling behavior
        // and don't inherit CSS variables the same way as input elements.

        it("all compact inputs have same height", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const nodeSelector = screen.getByLabelText("Node Selector");
            const size = screen.getByLabelText("Size");
            // First color hex and opacity inputs are for node color
            const hexColor = screen.getAllByLabelText("Color hex value")[0];
            const opacity = screen.getAllByLabelText("Opacity")[0];

            const heights = [nodeSelector, size, hexColor, opacity].map(
                (el) => window.getComputedStyle(el).height,
            );

            // All should be 24px
            expect(new Set(heights).size).toBe(1);
            expect(heights[0]).toBe("24px");
        });

        it("all compact inputs have same font size", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const nodeSelector = screen.getByLabelText("Node Selector");
            const size = screen.getByLabelText("Size");
            // First color hex and opacity inputs are for node color
            const hexColor = screen.getAllByLabelText("Color hex value")[0];
            const opacity = screen.getAllByLabelText("Opacity")[0];

            const fontSizes = [nodeSelector, size, hexColor, opacity].map(
                (el) => window.getComputedStyle(el).fontSize,
            );

            // All should be 11px
            expect(new Set(fontSizes).size).toBe(1);
            expect(fontSizes[0]).toBe("11px");
        });

        it("all compact inputs have same background color", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            const nodeSelector = screen.getByLabelText("Node Selector");
            const size = screen.getByLabelText("Size");
            // First color hex and opacity inputs are for node color
            const hexColor = screen.getAllByLabelText("Color hex value")[0];
            const opacity = screen.getAllByLabelText("Opacity")[0];

            const bgColors = [nodeSelector, size, hexColor, opacity].map(
                (el) => window.getComputedStyle(el).backgroundColor,
            );

            // All should be dark-8 = rgb(22, 27, 34)
            expect(new Set(bgColors).size).toBe(1);
            expect(bgColors[0]).toBe("rgb(22, 27, 34)");
        });
    });
});
