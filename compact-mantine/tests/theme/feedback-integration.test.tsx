import { Loader, MantineProvider, Progress, RingProgress } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for compact feedback components.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 */
describe("Feedback Components Integration", () => {
    describe("Loader", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Loader size="compact" data-testid="loader" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("loader")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Loader size="sm" data-testid="loader-sm" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("loader-sm")).toBeInTheDocument();
        });
    });

    describe("Progress", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Progress size="compact" value={50} data-testid="progress" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("progress")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Progress size="sm" value={50} data-testid="progress-sm" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("progress-sm")).toBeInTheDocument();
        });
    });

    describe("RingProgress", () => {
        // Note: RingProgress requires numeric sizes as it uses them directly in SVG calculations
        // Use size={48} for compact-equivalent sizing
        it("renders with compact-equivalent size (48px)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <RingProgress
                        size={48}
                        sections={[{ value: 40, color: "blue" }]}
                        data-testid="ring"
                    />
                </MantineProvider>,
            );
            expect(screen.getByTestId("ring")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <RingProgress
                        size={80}
                        sections={[{ value: 40, color: "blue" }]}
                        data-testid="ring-sm"
                    />
                </MantineProvider>,
            );
            expect(screen.getByTestId("ring-sm")).toBeInTheDocument();
        });
    });
});
