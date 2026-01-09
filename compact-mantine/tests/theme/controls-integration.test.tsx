import { Checkbox, MantineProvider, Radio, RangeSlider, SegmentedControl, Slider, Switch } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for control components with default compact styling.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars and styles callback functions.
 */
describe("Control Components Integration", () => {
    describe("SegmentedControl", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <SegmentedControl data={["A", "B"]} aria-label="segment" />
                </MantineProvider>,
            );
            expect(screen.getByRole("radio", { name: "A" })).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <SegmentedControl size="lg" data={["X", "Y"]} aria-label="segment large" />
                </MantineProvider>,
            );
            expect(screen.getByRole("radio", { name: "X" })).toBeInTheDocument();
        });
    });

    describe("Checkbox", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Checkbox label="Default Check" />
                </MantineProvider>,
            );
            expect(screen.getByRole("checkbox", { name: "Default Check" })).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Checkbox size="lg" label="Large Check" />
                </MantineProvider>,
            );
            expect(screen.getByRole("checkbox", { name: "Large Check" })).toBeInTheDocument();
        });
    });

    describe("Switch", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Switch label="Default Switch" />
                </MantineProvider>,
            );
            expect(screen.getByRole("switch", { name: "Default Switch" })).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Switch size="lg" label="Large Switch" />
                </MantineProvider>,
            );
            expect(screen.getByRole("switch", { name: "Large Switch" })).toBeInTheDocument();
        });
    });

    describe("Slider", () => {
        it("renders with default size (sm)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Slider />
                </MantineProvider>,
            );
            // Slider role is on the thumb element
            expect(screen.getByRole("slider")).toBeInTheDocument();
            // Verify the default size data attribute
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <Slider size="lg" />
                </MantineProvider>,
            );
            expect(screen.getByRole("slider")).toBeInTheDocument();
            expect(container.querySelector("[data-size='lg']")).toBeInTheDocument();
        });
    });

    describe("Radio", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Radio label="Default Radio" value="a" />
                </MantineProvider>,
            );
            expect(screen.getByRole("radio", { name: "Default Radio" })).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Radio size="lg" label="Large Radio" value="b" />
                </MantineProvider>,
            );
            expect(screen.getByRole("radio", { name: "Large Radio" })).toBeInTheDocument();
        });
    });

    describe("RangeSlider", () => {
        it("renders with default size (sm)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <RangeSlider />
                </MantineProvider>,
            );
            // RangeSlider has two sliders (thumbs)
            const sliders = screen.getAllByRole("slider");
            expect(sliders).toHaveLength(2);
            // Verify the default size data attribute
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <RangeSlider size="lg" />
                </MantineProvider>,
            );
            const sliders = screen.getAllByRole("slider");
            expect(sliders).toHaveLength(2);
            expect(container.querySelector("[data-size='lg']")).toBeInTheDocument();
        });
    });
});
