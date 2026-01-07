import { MantineProvider, NumberInput, TextInput } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Regression tests for compact size styling.
 *
 * Note: JSDOM does not fully process CSS variables and stylesheets,
 * so these tests verify:
 * - Components render without error
 * - Theme is applied correctly via MantineProvider
 * - DOM structure is as expected
 *
 * Full CSS regression testing should be done in a browser environment
 * (e.g., via Storybook visual tests or Playwright).
 */
describe("Compact CSS Regression", () => {
    describe("TextInput with compact size", () => {
        it("renders without error", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders with label", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" label="Test Label" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
        });

        it("has semantic background color applied (not transparent)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            const bg = getComputedStyle(input).backgroundColor;
            // JSDOM does resolve some styles - verify it's not completely transparent
            // Note: In JSDOM this may be rgb from the CSS loaded
            expect(bg).not.toBe("rgba(0, 0, 0, 0)");
            expect(bg).not.toBe("transparent");
            expect(bg).toMatch(/^rgb/);
        });
    });

    describe("NumberInput with compact size", () => {
        it("renders without error", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders with label", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput size="compact" label="Number Label" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Number Label")).toBeInTheDocument();
        });
    });

    describe("Multiple compact inputs", () => {
        it("renders multiple inputs together", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="text" />
                    <NumberInput size="compact" aria-label="number" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox", { name: "text" })).toBeInTheDocument();
            expect(screen.getByRole("textbox", { name: "number" })).toBeInTheDocument();
        });
    });

    describe("Theme applies to components", () => {
        it("renders with dark color scheme", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme="dark">
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders with light color scheme", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme="light">
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });
    });
});
