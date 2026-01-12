import {
    Autocomplete,
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
 * to verify that default props apply compact sizing automatically.
 */
describe("Input Components Integration", () => {
    // Ensure DOM is cleaned up between tests to prevent label collisions
    afterEach(() => {
        cleanup();
    });

    describe("TextInput with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TextInput label="Default Size" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="md" label="Medium Size" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });

        it("can override to large size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="lg" label="Large Size" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='lg']")).toBeInTheDocument();
        });
    });

    describe("NumberInput with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput label="Number Default" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput size="md" label="Number Medium" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("Select with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Select label="Select Default" data={["A", "B"]} />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Select size="md" label="Select Medium" data={["A", "B"]} />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("Textarea with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Textarea label="Textarea Default" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Textarea size="md" label="Textarea Medium" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("PasswordInput with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <PasswordInput label="Password Default" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <PasswordInput size="md" label="Password Medium" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("Autocomplete with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Autocomplete label="Auto Default" data={["A", "B"]} />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Autocomplete size="md" label="Auto Medium" data={["A", "B"]} />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("MultiSelect with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <MultiSelect label="Multi Default" data={["A", "B", "C"]} />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <MultiSelect size="md" label="Multi Medium" data={["A", "B", "C"]} />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("TagsInput with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TagsInput label="Tags Default" data={["tag1", "tag2"]} />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <TagsInput size="md" label="Tags Medium" data={["tag1", "tag2"]} />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("PillsInput with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <PillsInput label="Pills Default">
                        <PillsInput.Field placeholder="Enter value" />
                    </PillsInput>
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <PillsInput size="md" label="Pills Medium">
                        <PillsInput.Field placeholder="Enter value" />
                    </PillsInput>
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("FileInput with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <FileInput label="File Default" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <FileInput size="md" label="File Medium" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("JsonInput with default size", () => {
        it("renders with sm size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <JsonInput label="Json Default" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("can override to medium size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <JsonInput size="md" label="Json Medium" />
                </MantineProvider>,
            );
            expect(container.querySelector("[data-size='md']")).toBeInTheDocument();
        });
    });

    describe("InputClearButton with default size", () => {
        it("renders with xs size when no size prop provided", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <InputClearButton aria-label="Clear input" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Clear input" })).toBeInTheDocument();
            // InputClearButton has defaultProps size="xs" in our theme
            expect(container.querySelector("[data-size='xs']")).toBeInTheDocument();
        });

        it("can override to sm size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <InputClearButton size="sm" aria-label="Clear small" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Clear small" })).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("NativeSelect with default size", () => {
        it("renders with native Mantine behavior", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NativeSelect label="Native Default" data={["A", "B"]} />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Native Default")).toBeInTheDocument();
        });
    });
});
