import { ActionIcon, Button, CloseButton, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for button components with default compact styling.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 */
describe("Button Components Integration", () => {
    describe("Button", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Button>Default Button</Button>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Default Button" })).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Button size="lg">Large Button</Button>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Large Button" })).toBeInTheDocument();
        });
    });

    describe("ActionIcon", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon aria-label="action">
                        X
                    </ActionIcon>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "action" })).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon size="lg" aria-label="action large">
                        X
                    </ActionIcon>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "action large" })).toBeInTheDocument();
        });
    });

    describe("CloseButton", () => {
        it("renders with xs size (default via defaultProps)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <CloseButton aria-label="close default" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "close default" })).toBeInTheDocument();
            // CloseButton has defaultProps size="xs" in our theme
            expect(container.querySelector("[data-size='xs']")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <CloseButton size="lg" aria-label="close large" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "close large" })).toBeInTheDocument();
            expect(container.querySelector("[data-size='lg']")).toBeInTheDocument();
        });
    });
});
