import { Badge, MantineProvider, Pill } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for compact display components.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 */
describe("Display Components Integration", () => {
    describe("Badge", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Badge size="compact">Compact Badge</Badge>
                </MantineProvider>,
            );
            expect(screen.getByText("Compact Badge")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Badge size="sm">Small Badge</Badge>
                </MantineProvider>,
            );
            expect(screen.getByText("Small Badge")).toBeInTheDocument();
        });
    });

    describe("Pill", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Pill size="compact">Compact Pill</Pill>
                </MantineProvider>,
            );
            expect(screen.getByText("Compact Pill")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Pill size="sm">Small Pill</Pill>
                </MantineProvider>,
            );
            expect(screen.getByText("Small Pill")).toBeInTheDocument();
        });
    });
});
