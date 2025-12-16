import {Autocomplete, Badge, MantineSize, PasswordInput, Pill, Radio, Select, Textarea} from "@mantine/core";
import {describe, expect, it} from "vitest";

import {render, screen} from "../../../test/test-utils";

/**
 * Regression tests for compact size styling on Phase 3 Mantine components.
 * These tests verify that the theme-based compact size produces the expected
 * computed styles on the remaining components.
 *
 * Expected compact size styles:
 * - Select/PasswordInput/Textarea/Autocomplete: 24px height, 11px font (same as TextInput)
 * - Radio: 16px size (same as Checkbox)
 * - Badge: 14px height, 9px font
 * - Pill: 16px height, 10px font
 */

describe("Compact Phase 3 Style Regression", () => {
    describe("Select compact styles", () => {
        it("Select has correct compact height", () => {
            render(
                <Select
                    label="Test select"
                    aria-label="Test select"
                    data={["Option 1", "Option 2"]}
                    size="compact"
                    data-testid="test-select"
                />,
            );

            const input = screen.getByRole("textbox");
            const computed = window.getComputedStyle(input);

            expect(computed.height).toBe("24px");
        });

        it("Select has correct compact font size", () => {
            render(
                <Select
                    label="Test select"
                    aria-label="Test select"
                    data={["Option 1", "Option 2"]}
                    size="compact"
                />,
            );

            const input = screen.getByRole("textbox");
            const computed = window.getComputedStyle(input);

            expect(computed.fontSize).toBe("11px");
        });
    });

    describe("PasswordInput compact styles", () => {
        it("PasswordInput has correct compact height", () => {
            render(
                <PasswordInput
                    label="Test password"
                    aria-label="Test password"
                    size="compact"
                />,
            );

            const input = screen.getByLabelText("Test password");
            const computed = window.getComputedStyle(input);

            expect(computed.height).toBe("24px");
        });

        it("PasswordInput has correct compact font size", () => {
            render(
                <PasswordInput
                    label="Test password"
                    aria-label="Test password"
                    size="compact"
                />,
            );

            const input = screen.getByLabelText("Test password");
            const computed = window.getComputedStyle(input);

            expect(computed.fontSize).toBe("11px");
        });
    });

    describe("Textarea compact styles", () => {
        it("Textarea has correct compact font size", () => {
            render(
                <Textarea
                    label="Test textarea"
                    aria-label="Test textarea"
                    size="compact"
                />,
            );

            const textarea = screen.getByRole("textbox");
            const computed = window.getComputedStyle(textarea);

            expect(computed.fontSize).toBe("11px");
        });

        // Note: Textarea height is content-dependent, so we only test font size
    });

    describe("Autocomplete compact styles", () => {
        it("Autocomplete has correct compact height", () => {
            render(
                <Autocomplete
                    label="Test autocomplete"
                    data={["Option 1", "Option 2"]}
                    size="compact"
                />,
            );

            // Autocomplete renders an input with role="combobox" (unlike what error said)
            // Use the Mantine class to find it
            const input = document.querySelector(".mantine-Autocomplete-input");
            expect(input).not.toBeNull();

            if (input) {
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            }
        });

        it("Autocomplete has correct compact font size", () => {
            render(
                <Autocomplete
                    label="Test autocomplete"
                    data={["Option 1", "Option 2"]}
                    size="compact"
                />,
            );

            const input = document.querySelector(".mantine-Autocomplete-input");
            expect(input).not.toBeNull();

            if (input) {
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            }
        });
    });

    describe("Radio compact styles", () => {
        it("Radio has correct compact size", () => {
            render(
                <Radio
                    label="Test radio"
                    aria-label="Test radio"
                    size="compact"
                />,
            );

            const radio = screen.getByRole("radio");
            const computed = window.getComputedStyle(radio);

            // Compact radio should be 16px (same as checkbox)
            expect(computed.width).toBe("16px");
            expect(computed.height).toBe("16px");
        });
    });

    describe("Badge compact styles", () => {
        it("Badge has correct compact height", () => {
            render(
                <Badge size="compact" data-testid="test-badge">
                    Test Badge
                </Badge>,
            );

            const badge = screen.getByTestId("test-badge");
            const computed = window.getComputedStyle(badge);

            expect(computed.height).toBe("14px");
        });

        it("Badge has correct compact font size", () => {
            render(
                <Badge size="compact" data-testid="test-badge">
                    Test Badge
                </Badge>,
            );

            const badge = screen.getByTestId("test-badge");
            const computed = window.getComputedStyle(badge);

            expect(computed.fontSize).toBe("9px");
        });
    });

    describe("Pill compact styles", () => {
        it("Pill has correct compact height", () => {
            render(
                <Pill size={"compact" as MantineSize} data-testid="test-pill">
                    Test Pill
                </Pill>,
            );

            const pill = screen.getByTestId("test-pill");
            const computed = window.getComputedStyle(pill);

            expect(computed.height).toBe("16px");
        });

        it("Pill has correct compact font size", () => {
            render(
                <Pill size={"compact" as MantineSize} data-testid="test-pill">
                    Test Pill
                </Pill>,
            );

            const pill = screen.getByTestId("test-pill");
            const computed = window.getComputedStyle(pill);

            expect(computed.fontSize).toBe("10px");
        });
    });

    describe("All Phase 3 input components consistent", () => {
        it("All compact input-based components have same height", () => {
            render(
                <>
                    <Select
                        label="Select"
                        data={["Option"]}
                        size="compact"
                    />
                    <PasswordInput
                        label="Password"
                        size="compact"
                    />
                    <Autocomplete
                        label="Autocomplete"
                        data={["Option"]}
                        size="compact"
                    />
                </>,
            );

            const selectInput = document.querySelector(".mantine-Select-input");
            const passwordInput = screen.getByLabelText("Password");
            const autocompleteInput = document.querySelector(".mantine-Autocomplete-input");

            expect(selectInput).not.toBeNull();
            expect(autocompleteInput).not.toBeNull();

            const heights = [selectInput, passwordInput, autocompleteInput]
                .filter((el): el is HTMLElement => el !== null)
                .map((el) => window.getComputedStyle(el).height);

            // All should be 24px
            expect(new Set(heights).size).toBe(1);
            expect(heights[0]).toBe("24px");
        });
    });
});
