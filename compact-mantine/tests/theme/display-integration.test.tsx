import { Avatar, Badge, Indicator, Kbd, MantineProvider, Pill, Text, ThemeIcon } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { Settings } from "lucide-react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for display components with default compact styling.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 */
describe("Display Components Integration", () => {
    describe("Text", () => {
        it("renders with default size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Text>Default Text</Text>
                </MantineProvider>,
            );
            expect(screen.getByText("Default Text")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Text size="lg">Large Text</Text>
                </MantineProvider>,
            );
            expect(screen.getByText("Large Text")).toBeInTheDocument();
        });
    });

    describe("Badge", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Badge>Default Badge</Badge>
                </MantineProvider>,
            );
            expect(screen.getByText("Default Badge")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Badge size="lg">Large Badge</Badge>
                </MantineProvider>,
            );
            expect(screen.getByText("Large Badge")).toBeInTheDocument();
        });
    });

    describe("Pill", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Pill>Default Pill</Pill>
                </MantineProvider>,
            );
            expect(screen.getByText("Default Pill")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Pill size="lg">Large Pill</Pill>
                </MantineProvider>,
            );
            expect(screen.getByText("Large Pill")).toBeInTheDocument();
        });
    });

    describe("Avatar", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Avatar data-testid="avatar">
                        AB
                    </Avatar>
                </MantineProvider>,
            );
            expect(screen.getByTestId("avatar")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Avatar size="lg" data-testid="avatar-lg">
                        CD
                    </Avatar>
                </MantineProvider>,
            );
            expect(screen.getByTestId("avatar-lg")).toBeInTheDocument();
        });
    });

    describe("ThemeIcon", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ThemeIcon data-testid="theme-icon">
                        <Settings size={14} />
                    </ThemeIcon>
                </MantineProvider>,
            );
            expect(screen.getByTestId("theme-icon")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ThemeIcon size="lg" data-testid="theme-icon-lg">
                        <Settings size={14} />
                    </ThemeIcon>
                </MantineProvider>,
            );
            expect(screen.getByTestId("theme-icon-lg")).toBeInTheDocument();
        });
    });

    describe("Indicator", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Indicator data-testid="indicator">
                        <div>Content</div>
                    </Indicator>
                </MantineProvider>,
            );
            expect(screen.getByTestId("indicator")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Indicator size={20} data-testid="indicator-lg">
                        <div>Content</div>
                    </Indicator>
                </MantineProvider>,
            );
            expect(screen.getByTestId("indicator-lg")).toBeInTheDocument();
        });
    });

    describe("Kbd", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Kbd>Ctrl</Kbd>
                </MantineProvider>,
            );
            expect(screen.getByText("Ctrl")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Kbd size="lg">Alt</Kbd>
                </MantineProvider>,
            );
            expect(screen.getByText("Alt")).toBeInTheDocument();
        });
    });
});
