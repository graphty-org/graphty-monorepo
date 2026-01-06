import { Checkbox, MantineProvider, Radio, SegmentedControl, Slider, Switch } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for compact control components.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars and styles callback functions.
 */
describe("Control Components Integration", () => {
    describe("SegmentedControl", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <SegmentedControl size="compact" data={["A", "B"]} aria-label="segment" />
                </MantineProvider>,
            );
            expect(screen.getByRole("radio", { name: "A" })).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <SegmentedControl size="sm" data={["X", "Y"]} aria-label="segment small" />
                </MantineProvider>,
            );
            expect(screen.getByRole("radio", { name: "X" })).toBeInTheDocument();
        });
    });

    describe("Checkbox", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Checkbox size="compact" label="Compact Check" />
                </MantineProvider>,
            );
            expect(screen.getByRole("checkbox", { name: "Compact Check" })).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Checkbox size="sm" label="Small Check" />
                </MantineProvider>,
            );
            expect(screen.getByRole("checkbox", { name: "Small Check" })).toBeInTheDocument();
        });
    });

    describe("Switch", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Switch size="compact" label="Compact Switch" />
                </MantineProvider>,
            );
            expect(screen.getByRole("switch", { name: "Compact Switch" })).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Switch size="sm" label="Small Switch" />
                </MantineProvider>,
            );
            expect(screen.getByRole("switch", { name: "Small Switch" })).toBeInTheDocument();
        });
    });

    describe("Slider", () => {
        it("renders with compact size", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Slider size="compact" />
                </MantineProvider>,
            );
            // Slider role is on the thumb element
            expect(screen.getByRole("slider")).toBeInTheDocument();
            // Verify the compact size data attribute
            expect(container.querySelector("[data-size='compact']")).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Slider size="sm" />
                </MantineProvider>,
            );
            expect(screen.getByRole("slider")).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });

    describe("Radio", () => {
        it("renders with compact size", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Radio size="compact" label="Compact Radio" value="a" />
                </MantineProvider>,
            );
            expect(screen.getByRole("radio", { name: "Compact Radio" })).toBeInTheDocument();
        });

        it("renders with regular size (non-compact)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Radio size="sm" label="Small Radio" value="b" />
                </MantineProvider>,
            );
            expect(screen.getByRole("radio", { name: "Small Radio" })).toBeInTheDocument();
        });
    });
});
