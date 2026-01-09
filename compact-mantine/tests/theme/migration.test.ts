import { MantineProvider, TextInput } from "@mantine/core";
import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Migration tests for the refactor from size="compact" to size="sm" default.
 *
 * These tests verify:
 * 1. Components work correctly without explicit size prop (using default sm)
 * 2. Legacy size="compact" usage is handled (renders with data-size="compact")
 * 3. All standard Mantine sizes continue to work
 *
 * MIGRATION GUIDE:
 * - Remove all size="compact" props from your code
 * - Components will now default to size="sm" automatically
 * - To use larger sizes, explicitly set size="md", size="lg", etc.
 */
describe("Migration from size='compact'", () => {
    describe("Legacy size='compact' handling", () => {
        it("size='compact' renders but is no longer recognized as a special size", () => {
            // After the refactor, "compact" is treated as a custom size string
            // Mantine will render data-size="compact" but won't apply special styling
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement(TextInput, {
                        // @ts-expect-error Testing legacy size value that is now invalid
                        size: "compact",
                        label: "Legacy",
                    }),
                ),
            );
            // Should render but with data-size="compact" (custom, not styled)
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("components render correctly without explicit size prop", () => {
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement(TextInput, { label: "New Default" }),
                ),
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("Standard sizes continue to work", () => {
        it("can use xs size", () => {
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement(TextInput, { size: "xs", label: "Extra Small" }),
                ),
            );
            expect(container.querySelector("[data-size='xs']")).toBeInTheDocument();
        });

        it("can use sm size (now the default)", () => {
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement(TextInput, { size: "sm", label: "Small" }),
                ),
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can use md size", () => {
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement(TextInput, { size: "md", label: "Medium" }),
                ),
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });

        it("can use lg size", () => {
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement(TextInput, { size: "lg", label: "Large" }),
                ),
            );
            expect(container.querySelector("[data-size='lg']")).toBeInTheDocument();
        });

        it("can use xl size", () => {
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement(TextInput, { size: "xl", label: "Extra Large" }),
                ),
            );
            expect(container.querySelector("[data-size='xl']")).toBeInTheDocument();
        });
    });

    describe("Migration verification", () => {
        it("no size prop results in sm size", () => {
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement(TextInput, { label: "No Size Prop" }),
                ),
            );
            // Without any size prop, should default to sm
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("multiple components without size prop all get sm size", () => {
            const { container } = render(
                React.createElement(
                    MantineProvider,
                    { theme: compactTheme },
                    React.createElement("div", null, [
                        React.createElement(TextInput, { key: "1", label: "First" }),
                        React.createElement(TextInput, { key: "2", label: "Second" }),
                        React.createElement(TextInput, { key: "3", label: "Third" }),
                    ]),
                ),
            );
            // Check that all 3 TextInput wrappers have data-size='sm'
            const textInputWrappers = container.querySelectorAll(".mantine-TextInput-wrapper[data-size='sm']");
            expect(textInputWrappers.length).toBe(3);
        });
    });
});
