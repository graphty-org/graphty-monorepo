import {ActionIcon, Button, Checkbox, SegmentedControl, Slider, Switch} from "@mantine/core";
import {Check} from "lucide-react";
import {describe, expect, it} from "vitest";

import {render, screen} from "../../../test/test-utils";

/**
 * Regression tests for compact size styling on additional Mantine components.
 * These tests verify that the theme-based compact size produces the expected
 * computed styles on control components.
 *
 * Expected compact size styles:
 * - SegmentedControl: 10px font, 4px 8px padding
 * - Checkbox: 16px size
 * - Switch: 16px height, 28px width
 * - Slider: 4px track height
 * - Button: 24px height, 11px font
 * - ActionIcon: 24px size
 */

describe("Compact Controls Style Regression", () => {
    describe("SegmentedControl compact styles", () => {
        it("SegmentedControl has correct compact CSS variables", () => {
            render(
                <SegmentedControl
                    size="compact"
                    data={["Option 1", "Option 2", "Option 3"]}
                    data-testid="test-segmented"
                />,
            );

            // Find the root element which has the CSS variables
            const root = document.querySelector(".mantine-SegmentedControl-root");
            expect(root).not.toBeNull();

            if (root) {
                const computed = window.getComputedStyle(root);
                // Verify CSS variables are set correctly
                expect(computed.getPropertyValue("--sc-font-size")).toBe("10px");
                expect(computed.getPropertyValue("--sc-padding")).toBe("4px 8px");
            }
        });

        it("SegmentedControl label has correct compact font size", () => {
            render(
                <SegmentedControl
                    size="compact"
                    data={["Option 1", "Option 2", "Option 3"]}
                />,
            );

            // Find a label element
            const label = document.querySelector(".mantine-SegmentedControl-label");
            expect(label).not.toBeNull();

            if (label) {
                const computed = window.getComputedStyle(label);
                expect(computed.fontSize).toBe("10px");
            }
        });
    });

    describe("Checkbox compact styles", () => {
        it("Checkbox has correct compact size", () => {
            render(
                <Checkbox
                    label="Test checkbox"
                    aria-label="Test checkbox"
                    size="compact"
                />,
            );

            const checkbox = screen.getByRole("checkbox");
            const computed = window.getComputedStyle(checkbox);

            // Compact checkbox should be 16px
            expect(computed.width).toBe("16px");
            expect(computed.height).toBe("16px");
        });

        // Note: Mantine's Checkbox label font size is not customizable via CSS variables.
        // The label is rendered by InlineInput which uses its own sizing system.
        // If label styling is needed, use the styles prop or classNames.
    });

    describe("Switch compact styles", () => {
        it("Switch has correct compact CSS variables", () => {
            render(
                <Switch
                    label="Test switch"
                    aria-label="Test switch"
                    size="compact"
                    data-testid="test-switch"
                />,
            );

            // Find the root element which has the CSS variables
            const root = document.querySelector(".mantine-Switch-root");
            expect(root).not.toBeNull();

            if (root) {
                const computed = window.getComputedStyle(root);
                // Verify CSS variables are set correctly
                expect(computed.getPropertyValue("--switch-height")).toBe("16px");
                expect(computed.getPropertyValue("--switch-width")).toBe("28px");
                expect(computed.getPropertyValue("--switch-thumb-size")).toBe("12px");
            }
        });

        // Note: Mantine's Switch label font size is not customizable via CSS variables.
        // The label is rendered by InlineInput which uses its own sizing system.
        // If label styling is needed, use the styles prop or classNames.
    });

    describe("Slider compact styles", () => {
        it("Slider track has correct compact height", () => {
            render(
                <Slider
                    aria-label="Test slider"
                    defaultValue={50}
                    size="compact"
                />,
            );

            const slider = screen.getByRole("slider");
            const track = slider.closest(".mantine-Slider-root")?.querySelector(".mantine-Slider-track");

            if (track) {
                const computed = window.getComputedStyle(track);
                // Compact slider should have 4px track height
                expect(computed.height).toBe("4px");
            }
        });

        it("Slider thumb has correct compact size", () => {
            render(
                <Slider
                    aria-label="Test slider"
                    defaultValue={50}
                    size="compact"
                />,
            );

            const slider = screen.getByRole("slider");
            const thumb = slider.closest(".mantine-Slider-root")?.querySelector(".mantine-Slider-thumb");

            if (thumb) {
                const computed = window.getComputedStyle(thumb);
                // Compact thumb should be 12px
                expect(computed.width).toBe("12px");
                expect(computed.height).toBe("12px");
            }
        });
    });

    describe("Button compact styles", () => {
        it("Button has correct compact height", () => {
            render(
                <Button size="compact" data-testid="test-button">
                    Test Button
                </Button>,
            );

            const button = screen.getByTestId("test-button");
            const computed = window.getComputedStyle(button);

            expect(computed.height).toBe("24px");
        });

        it("Button has correct compact font size", () => {
            render(
                <Button size="compact" data-testid="test-button">
                    Test Button
                </Button>,
            );

            const button = screen.getByTestId("test-button");
            const computed = window.getComputedStyle(button);

            expect(computed.fontSize).toBe("11px");
        });

        it("Button has correct compact padding", () => {
            render(
                <Button size="compact" data-testid="test-button">
                    Test Button
                </Button>,
            );

            const button = screen.getByTestId("test-button");
            const computed = window.getComputedStyle(button);

            expect(computed.paddingLeft).toBe("8px");
            expect(computed.paddingRight).toBe("8px");
        });
    });

    describe("ActionIcon compact styles", () => {
        it("ActionIcon has correct compact size", () => {
            render(
                <ActionIcon size="compact" aria-label="Test action" data-testid="test-action-icon">
                    <Check size={14} />
                </ActionIcon>,
            );

            const actionIcon = screen.getByTestId("test-action-icon");
            const computed = window.getComputedStyle(actionIcon);

            expect(computed.width).toBe("24px");
            expect(computed.height).toBe("24px");
        });
    });

    describe("All compact controls consistent", () => {
        // Note: Checkbox and Switch labels use Mantine's InlineInput which doesn't
        // expose font size via CSS variables. Only Button supports custom font sizes.

        it("All compact height-based controls have consistent 24px height", () => {
            render(
                <>
                    <Button size="compact" data-testid="button">Button</Button>
                    <ActionIcon size="compact" aria-label="Action" data-testid="action">
                        <Check size={14} />
                    </ActionIcon>
                </>,
            );

            const button = screen.getByTestId("button");
            const actionIcon = screen.getByTestId("action");

            const heights = [button, actionIcon].map(
                (el) => window.getComputedStyle(el).height,
            );

            // All should be 24px
            expect(new Set(heights).size).toBe(1);
            expect(heights[0]).toBe("24px");
        });
    });
});
