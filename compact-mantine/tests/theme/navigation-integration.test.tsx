import {
    Anchor,
    Burger,
    MantineProvider,
    NavLink,
    Pagination,
    Stepper,
    Tabs,
} from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { Home } from "lucide-react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for navigation components with default compact styling.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 */
describe("Navigation Components Integration", () => {
    describe("Anchor", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Anchor href="#">
                        Default Link
                    </Anchor>
                </MantineProvider>,
            );
            expect(screen.getByText("Default Link")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Anchor size="lg" href="#">
                        Large Link
                    </Anchor>
                </MantineProvider>,
            );
            expect(screen.getByText("Large Link")).toBeInTheDocument();
        });
    });

    describe("Burger", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Burger opened={false} aria-label="Toggle menu" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Burger size="lg" opened={false} aria-label="Toggle menu lg" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Toggle menu lg")).toBeInTheDocument();
        });
    });

    describe("NavLink", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NavLink label="Home" leftSection={<Home size={14} />} />
                </MantineProvider>,
            );
            expect(screen.getByText("Home")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NavLink size="lg" label="Settings" />
                </MantineProvider>,
            );
            expect(screen.getByText("Settings")).toBeInTheDocument();
        });
    });

    describe("Pagination", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Pagination total={10} data-testid="pagination" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("pagination")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Pagination size="lg" total={10} data-testid="pagination-lg" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("pagination-lg")).toBeInTheDocument();
        });
    });

    describe("Stepper", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Stepper active={1} data-testid="stepper">
                        <Stepper.Step label="Step 1" />
                        <Stepper.Step label="Step 2" />
                    </Stepper>
                </MantineProvider>,
            );
            expect(screen.getByTestId("stepper")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Stepper size="lg" active={1} data-testid="stepper-lg">
                        <Stepper.Step label="Step 1" />
                        <Stepper.Step label="Step 2" />
                    </Stepper>
                </MantineProvider>,
            );
            expect(screen.getByTestId("stepper-lg")).toBeInTheDocument();
        });
    });

    describe("Tabs", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Tabs defaultValue="first" data-testid="tabs">
                        <Tabs.List>
                            <Tabs.Tab value="first">First</Tabs.Tab>
                            <Tabs.Tab value="second">Second</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                </MantineProvider>,
            );
            expect(screen.getByTestId("tabs")).toBeInTheDocument();
            expect(screen.getByText("First")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Tabs size="lg" defaultValue="first" data-testid="tabs-lg">
                        <Tabs.List>
                            <Tabs.Tab value="first">Tab A</Tabs.Tab>
                            <Tabs.Tab value="second">Tab B</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                </MantineProvider>,
            );
            expect(screen.getByTestId("tabs-lg")).toBeInTheDocument();
            expect(screen.getByText("Tab A")).toBeInTheDocument();
        });
    });
});
