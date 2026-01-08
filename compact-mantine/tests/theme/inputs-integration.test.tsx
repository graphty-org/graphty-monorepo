import {
    Autocomplete,
    Checkbox,
    ColorInput,
    FileInput,
    InputClearButton,
    JsonInput,
    MantineProvider,
    MultiSelect,
    NativeSelect,
    NumberInput,
    PasswordInput,
    PillsInput,
    Select,
    TagsInput,
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

    describe("Checkbox", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Checkbox size="compact" label="Checkbox Compact" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Checkbox Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Checkbox size="sm" label="Checkbox Small" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Checkbox Small")).toBeInTheDocument();
        });
    });

    describe("MultiSelect", () => {
        it("renders with compact size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <MultiSelect size="compact" label="Multi Compact" data={["A", "B", "C"]} />
                </MantineProvider>,
            );
            expect(container.querySelector(".mantine-MultiSelect-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <MultiSelect size="sm" label="Multi Small" data={["X", "Y", "Z"]} />
                </MantineProvider>,
            );
            expect(container.querySelector(".mantine-MultiSelect-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("TagsInput", () => {
        it("renders with compact size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TagsInput size="compact" label="Tags Compact" data={["tag1", "tag2"]} />
                </MantineProvider>,
            );
            expect(container.querySelector(".mantine-TagsInput-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TagsInput size="sm" label="Tags Small" data={["tagA", "tagB"]} />
                </MantineProvider>,
            );
            expect(container.querySelector(".mantine-TagsInput-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("PillsInput", () => {
        it("renders with compact size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <PillsInput size="compact" label="Pills Compact">
                        <PillsInput.Field placeholder="Enter value" />
                    </PillsInput>
                </MantineProvider>,
            );
            expect(container.querySelector(".mantine-PillsInput-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <PillsInput size="sm" label="Pills Small">
                        <PillsInput.Field placeholder="Enter value" />
                    </PillsInput>
                </MantineProvider>,
            );
            expect(container.querySelector(".mantine-PillsInput-input")).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("FileInput", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <FileInput size="compact" label="File Compact" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("File Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <FileInput size="sm" label="File Small" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("File Small")).toBeInTheDocument();
        });
    });

    describe("JsonInput", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <JsonInput size="compact" label="Json Compact" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Json Compact")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <JsonInput size="sm" label="Json Small" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Json Small")).toBeInTheDocument();
        });
    });

    describe("InputClearButton", () => {
        it("renders with compact size (default)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <InputClearButton aria-label="Clear input" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Clear input" })).toBeInTheDocument();
            // InputClearButton has defaultProps size="compact" in our theme
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("renders with explicit compact size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <InputClearButton size="compact" aria-label="Clear explicit" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Clear explicit" })).toBeInTheDocument();
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <InputClearButton size="sm" aria-label="Clear small" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Clear small" })).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });
});
