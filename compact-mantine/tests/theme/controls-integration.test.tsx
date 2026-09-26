import { Checkbox, MantineProvider, Radio, RangeSlider, SegmentedControl, Slider, Switch } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for control components with default compact styling.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars and styles callback functions.
 *
 * The "size scale" block is regression cover for the product owner's 2026-09-13
 * report, "sizes aren't varying anymore": it renders each control at every size
 * token and asserts the sizing variables actually differ. Mantine writes a
 * resolved vars object onto the root element as inline custom properties, so
 * reading them back off the DOM measures what the browser would paint.
 */

/** Read one resolved CSS custom property off a rendered element. */
function cssVar(element: Element | null, name: string): string {
    return (element as HTMLElement | null)?.style.getPropertyValue(name).trim() ?? "";
}

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

    describe("size scale", () => {
        const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

        /** Render one control at every size token and collect a sizing variable. */
        function varAcrossSizes(
            renderAtSize: (size: string) => ReactElement,
            rootSelector: string,
            varName: string,
        ): string[] {
            return SIZES.map((size) => {
                const { container } = render(
                    <MantineProvider theme={compactTheme}>{renderAtSize(size)}</MantineProvider>,
                );
                return cssVar(container.querySelector(rootSelector), varName);
            });
        }

        it("gives Slider a different track size at every size token", () => {
            const values = varAcrossSizes(
                (size) => <Slider size={size} defaultValue={40} />,
                ".mantine-Slider-root",
                "--slider-size",
            );
            expect(values).toEqual(["6px", "8px", "10px", "12px", "16px"]);
        });

        it("gives Slider a different thumb size at every size token", () => {
            const values = varAcrossSizes(
                (size) => <Slider size={size} defaultValue={40} />,
                ".mantine-Slider-root",
                "--slider-thumb-size",
            );
            expect(values).toEqual(["10px", "12px", "16px", "20px", "24px"]);
        });

        it("gives RangeSlider the same scale as Slider", () => {
            // RangeSlider shares the Slider class names and the Slider scale.
            const values = varAcrossSizes(
                (size) => <RangeSlider size={size} defaultValue={[20, 80]} />,
                ".mantine-Slider-root",
                "--slider-size",
            );
            expect(values).toEqual(["6px", "8px", "10px", "12px", "16px"]);
        });

        it("gives Checkbox, Radio and Switch a different size at every size token", () => {
            expect(
                varAcrossSizes((size) => <Checkbox size={size} label="c" />, ".mantine-Checkbox-root", "--checkbox-size"),
            ).toEqual(["12px", "16px", "20px", "24px", "28px"]);
            expect(
                varAcrossSizes((size) => <Radio size={size} value="a" label="r" />, ".mantine-Radio-root", "--radio-size"),
            ).toEqual(["12px", "16px", "20px", "24px", "28px"]);
            expect(
                varAcrossSizes((size) => <Switch size={size} label="s" />, ".mantine-Switch-root", "--switch-height"),
            ).toEqual(["12px", "16px", "20px", "24px", "28px"]);
        });

        it("gives SegmentedControl a different font size at every size token", () => {
            const values = varAcrossSizes(
                (size) => <SegmentedControl size={size} data={["A", "B"]} />,
                ".mantine-SegmentedControl-root",
                "--sc-font-size",
            );
            expect(values).toEqual(["9px", "11px", "13px", "15px", "17px"]);
        });

        it("renders the legacy size name 'compact' exactly like the sm default", () => {
            // graphty still passes size="compact" at several hundred call sites.
            const { container: legacy } = render(
                <MantineProvider theme={compactTheme}>
                    <Slider size="compact" defaultValue={40} />
                </MantineProvider>,
            );
            const { container: current } = render(
                <MantineProvider theme={compactTheme}>
                    <Slider defaultValue={40} />
                </MantineProvider>,
            );
            const legacyRoot = legacy.querySelector(".mantine-Slider-root");
            const currentRoot = current.querySelector(".mantine-Slider-root");
            expect(cssVar(legacyRoot, "--slider-size")).toBe("8px");
            expect(cssVar(legacyRoot, "--slider-size")).toBe(cssVar(currentRoot, "--slider-size"));
            expect(cssVar(legacyRoot, "--slider-thumb-size")).toBe(cssVar(currentRoot, "--slider-thumb-size"));
        });
    });
});
