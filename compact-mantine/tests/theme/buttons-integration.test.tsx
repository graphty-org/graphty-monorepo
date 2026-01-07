import { ActionIcon, Button, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for compact button components.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 */
describe("Button Components Integration", () => {
    describe("Button", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Button size="compact">Compact Button</Button>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Compact Button" })).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Button size="sm">Small Button</Button>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Small Button" })).toBeInTheDocument();
        });
    });

    describe("ActionIcon", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon size="compact" aria-label="action">
                        X
                    </ActionIcon>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "action" })).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon size="sm" aria-label="action small">
                        X
                    </ActionIcon>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "action small" })).toBeInTheDocument();
        });
    });
});
