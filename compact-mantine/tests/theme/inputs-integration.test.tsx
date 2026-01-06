import {
    Autocomplete,
    ColorInput,
    MantineProvider,
    NativeSelect,
    NumberInput,
    PasswordInput,
    Select,
    Textarea,
    TextInput,
} from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for compact input components.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars and styles callback functions.
 */
describe("Input Components Integration", () => {
    // Ensure DOM is cleaned up between tests to prevent label collisions
    afterEach(() => {
        cleanup();
    });

    describe("TextInput", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" label="Text Compact" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Text Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="sm" label="Text Small" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Text Small")).toBeInTheDocument();
        });
    });

    describe("NumberInput", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput size="compact" label="Number Compact" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Number Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput size="sm" label="Number Small" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Number Small")).toBeInTheDocument();
        });
    });

    describe("NativeSelect", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NativeSelect size="compact" label="Native Compact" data={["A", "B"]} />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Native Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NativeSelect size="sm" label="Native Small" data={["A", "B"]} />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Native Small")).toBeInTheDocument();
        });
    });

    describe("Select", () => {
        it("renders with compact size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Select size="compact" label="Select Compact" data={["A", "B"]} />
                </MantineProvider>,
            );
            // Use container query to avoid issues with dropdown elements
            expect(container.querySelector(".mantine-Select-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Select size="sm" label="Select Small" data={["X", "Y"]} />
                </MantineProvider>,
            );
            expect(container.querySelector(".mantine-Select-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("Textarea", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Textarea size="compact" label="Textarea Compact" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Textarea Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Textarea size="sm" label="Textarea Small" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Textarea Small")).toBeInTheDocument();
        });
    });

    describe("PasswordInput", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <PasswordInput size="compact" label="Password Compact" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Password Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <PasswordInput size="sm" label="Password Small" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Password Small")).toBeInTheDocument();
        });
    });

    describe("Autocomplete", () => {
        it("renders with compact size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Autocomplete size="compact" label="Auto Compact" data={["A", "B"]} />
                </MantineProvider>,
            );
            // Use container query to avoid issues with dropdown elements
            expect(container.querySelector(".mantine-Autocomplete-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Autocomplete size="sm" label="Auto Small" data={["X", "Y"]} />
                </MantineProvider>,
            );
            expect(container.querySelector(".mantine-Autocomplete-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("ColorInput", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ColorInput size="compact" label="Color Compact" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Color Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ColorInput size="sm" label="Color Small" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Color Small")).toBeInTheDocument();
        });
    });
});
