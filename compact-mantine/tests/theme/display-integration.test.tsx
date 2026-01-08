import { Avatar, Badge, Indicator, Kbd, MantineProvider, Pill, Text, ThemeIcon } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { Settings } from "lucide-react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for compact display components.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 */
describe("Display Components Integration", () => {
    describe("Text", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Text size="compact">Compact Text</Text>
                </MantineProvider>,
            );
            expect(screen.getByText("Compact Text")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Text size="sm">Small Text</Text>
                </MantineProvider>,
            );
            expect(screen.getByText("Small Text")).toBeInTheDocument();
        });
    });

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

    describe("Avatar", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Avatar size="compact" data-testid="avatar">
                        AB
                    </Avatar>
                </MantineProvider>,
            );
            expect(screen.getByTestId("avatar")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Avatar size="sm" data-testid="avatar-sm">
                        CD
                    </Avatar>
                </MantineProvider>,
            );
            expect(screen.getByTestId("avatar-sm")).toBeInTheDocument();
        });
    });

    describe("ThemeIcon", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ThemeIcon size="compact" data-testid="theme-icon">
                        <Settings size={14} />
                    </ThemeIcon>
                </MantineProvider>,
            );
            expect(screen.getByTestId("theme-icon")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ThemeIcon size="sm" data-testid="theme-icon-sm">
                        <Settings size={14} />
                    </ThemeIcon>
                </MantineProvider>,
            );
            expect(screen.getByTestId("theme-icon-sm")).toBeInTheDocument();
        });
    });

    describe("Indicator", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Indicator size="compact" data-testid="indicator">
                        <div>Content</div>
                    </Indicator>
                </MantineProvider>,
            );
            expect(screen.getByTestId("indicator")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Indicator size={10} data-testid="indicator-sm">
                        <div>Content</div>
                    </Indicator>
                </MantineProvider>,
            );
            expect(screen.getByTestId("indicator-sm")).toBeInTheDocument();
        });
    });

    describe("Kbd", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Kbd size="compact">Ctrl</Kbd>
                </MantineProvider>,
            );
            expect(screen.getByText("Ctrl")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Kbd size="sm">Alt</Kbd>
                </MantineProvider>,
            );
            expect(screen.getByText("Alt")).toBeInTheDocument();
        });
    });
});
