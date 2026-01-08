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
 * Integration tests for compact navigation components.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 */
describe("Navigation Components Integration", () => {
    describe("Anchor", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Anchor size="compact" href="#">
                        Compact Link
                    </Anchor>
                </MantineProvider>,
            );
            expect(screen.getByText("Compact Link")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Anchor size="sm" href="#">
                        Small Link
                    </Anchor>
                </MantineProvider>,
            );
            expect(screen.getByText("Small Link")).toBeInTheDocument();
        });
    });

    describe("Burger", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Burger size="compact" opened={false} aria-label="Toggle menu" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Burger size="sm" opened={false} aria-label="Toggle menu sm" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Toggle menu sm")).toBeInTheDocument();
        });
    });

    describe("NavLink", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NavLink size="compact" label="Home" leftSection={<Home size={14} />} />
                </MantineProvider>,
            );
            expect(screen.getByText("Home")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NavLink size="sm" label="Settings" />
                </MantineProvider>,
            );
            expect(screen.getByText("Settings")).toBeInTheDocument();
        });
    });

    describe("Pagination", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Pagination size="compact" total={10} data-testid="pagination" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("pagination")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Pagination size="sm" total={10} data-testid="pagination-sm" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("pagination-sm")).toBeInTheDocument();
        });
    });

    describe("Stepper", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Stepper size="compact" active={1} data-testid="stepper">
                        <Stepper.Step label="Step 1" />
                        <Stepper.Step label="Step 2" />
                    </Stepper>
                </MantineProvider>,
            );
            expect(screen.getByTestId("stepper")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Stepper size="sm" active={1} data-testid="stepper-sm">
                        <Stepper.Step label="Step 1" />
                        <Stepper.Step label="Step 2" />
                    </Stepper>
                </MantineProvider>,
            );
            expect(screen.getByTestId("stepper-sm")).toBeInTheDocument();
        });
    });

    describe("Tabs", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Tabs size="compact" defaultValue="first" data-testid="tabs">
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

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Tabs size="sm" defaultValue="first" data-testid="tabs-sm">
                        <Tabs.List>
                            <Tabs.Tab value="first">Tab A</Tabs.Tab>
                            <Tabs.Tab value="second">Tab B</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                </MantineProvider>,
            );
            expect(screen.getByTestId("tabs-sm")).toBeInTheDocument();
            expect(screen.getByText("Tab A")).toBeInTheDocument();
        });
    });
});
