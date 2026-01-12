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
 * - Default size="sm" is applied automatically
 *
 * Full CSS regression testing should be done in a browser environment
 * (e.g., via Storybook visual tests or Playwright).
 */
describe("Compact CSS Regression", () => {
    describe("TextInput with default compact size", () => {
        it("renders without error", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders with label", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput label="Test Label" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
        });

        it("has default size sm applied", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TextInput aria-label="test" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("has semantic background color applied (CSS variable or RGB)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            const bg = getComputedStyle(input).backgroundColor;
            // JSDOM may return CSS variables or computed RGB values depending on the context
            // We just verify it's not completely transparent or empty
            expect(bg).not.toBe("rgba(0, 0, 0, 0)");
            expect(bg).not.toBe("transparent");
            expect(bg).not.toBe("");
            // Either a CSS variable or RGB value is acceptable
            expect(bg).toMatch(/^(rgb|var\()/);
        });
    });

    describe("NumberInput with default compact size", () => {
        it("renders without error", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders with label", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput label="Number Label" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Number Label")).toBeInTheDocument();
        });

        it("has default size sm applied", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput aria-label="test" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("Multiple compact inputs", () => {
        it("renders multiple inputs together", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput aria-label="text" />
                    <NumberInput aria-label="number" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox", { name: "text" })).toBeInTheDocument();
            expect(screen.getByRole("textbox", { name: "number" })).toBeInTheDocument();
        });

        it("all inputs default to sm size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TextInput aria-label="text" />
                    <NumberInput aria-label="number" />
                </MantineProvider>,
            );
            const smElements = container.querySelectorAll("[data-size='sm']");
            expect(smElements.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("Theme applies to components", () => {
        it("renders with dark color scheme", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme="dark">
                    <TextInput aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders with light color scheme", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme="light">
                    <TextInput aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });
    });

    describe("Size overrides", () => {
        it("can override to larger sizes", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="md" aria-label="medium" />
                    <TextInput size="lg" aria-label="large" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
            expect(container.querySelector("[data-size='lg']")).toBeInTheDocument();
        });

        it("can use xs size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="xs" aria-label="extra-small" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='xs']")).toBeInTheDocument();
        });
    });
});
