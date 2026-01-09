/**
 * Control Components - Comprehensive CSS Browser Tests
 *
 * Tests ALL CSS values set by compact-mantine control component extensions.
 * Covers: SegmentedControl, Checkbox, Switch, Slider, Radio, RangeSlider
 */
import {
    Checkbox,
    MantineProvider,
    Radio,
    RangeSlider,
    SegmentedControl,
    Slider,
    Switch,
} from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { compactTheme } from "../../src";

/**
 * Helper to render a component with the compact theme.
 */
function renderWithTheme(ui: React.ReactElement) {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Helper to get CSS variable value from an element
 */
function getCssVar(element: Element | null, varName: string): string {
    if (!element) return "";
    return getComputedStyle(element).getPropertyValue(varName).trim();
}

// ============================================================================
// SegmentedControl - Comprehensive Tests
// ============================================================================
describe("SegmentedControl - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--sc-font-size is 10px", () => {
                const { container } = renderWithTheme(
                    <SegmentedControl data={["A", "B", "C"]} />
                );
                const root = container.querySelector(".mantine-SegmentedControl-root");
                expect(getCssVar(root, "--sc-font-size")).toBe("10px");
            });

            it("--sc-padding is 4px 8px", () => {
                const { container } = renderWithTheme(
                    <SegmentedControl data={["A", "B", "C"]} />
                );
                const root = container.querySelector(".mantine-SegmentedControl-root");
                expect(getCssVar(root, "--sc-padding")).toBe("4px 8px");
            });
        });

        describe("label computed styles", () => {
            it("fontSize is 10px", () => {
                const { container } = renderWithTheme(
                    <SegmentedControl data={["A", "B", "C"]} />
                );
                const label = container.querySelector(".mantine-SegmentedControl-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.fontSize).toBe("10px");
            });

            it("paddingTop is 4px", () => {
                const { container } = renderWithTheme(
                    <SegmentedControl data={["A", "B", "C"]} />
                );
                const label = container.querySelector(".mantine-SegmentedControl-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.paddingTop).toBe("4px");
            });

            it("paddingBottom is 4px", () => {
                const { container } = renderWithTheme(
                    <SegmentedControl data={["A", "B", "C"]} />
                );
                const label = container.querySelector(".mantine-SegmentedControl-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.paddingBottom).toBe("4px");
            });

            it("paddingLeft is 8px", () => {
                const { container } = renderWithTheme(
                    <SegmentedControl data={["A", "B", "C"]} />
                );
                const label = container.querySelector(".mantine-SegmentedControl-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.paddingLeft).toBe("8px");
            });

            it("paddingRight is 8px", () => {
                const { container } = renderWithTheme(
                    <SegmentedControl data={["A", "B", "C"]} />
                );
                const label = container.querySelector(".mantine-SegmentedControl-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.paddingRight).toBe("8px");
            });
        });
    });
});

// ============================================================================
// Checkbox - Comprehensive Tests
// ============================================================================
describe("Checkbox - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--checkbox-size is 16px", () => {
                const { container } = renderWithTheme(<Checkbox label="Check" />);
                const root = container.querySelector(".mantine-Checkbox-root");
                expect(getCssVar(root, "--checkbox-size")).toBe("16px");
            });
        });

        describe("input computed styles", () => {
            it("width is 16px", () => {
                const { container } = renderWithTheme(<Checkbox label="Check" />);
                const input = container.querySelector(".mantine-Checkbox-input");
                const style = input ? getComputedStyle(input) : null;
                expect(style?.width).toBe("16px");
            });

            it("height is 16px", () => {
                const { container } = renderWithTheme(<Checkbox label="Check" />);
                const input = container.querySelector(".mantine-Checkbox-input");
                const style = input ? getComputedStyle(input) : null;
                expect(style?.height).toBe("16px");
            });

            it("borderRadius is 4px", () => {
                const { container } = renderWithTheme(<Checkbox label="Check" />);
                const input = container.querySelector(".mantine-Checkbox-input");
                const style = input ? getComputedStyle(input) : null;
                expect(style?.borderRadius).toBe("4px");
            });
        });

        describe("label computed styles", () => {
            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(<Checkbox label="Check" />);
                const label = container.querySelector(".mantine-Checkbox-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.fontSize).toBe("11px");
            });
        });
    });
});

// ============================================================================
// Switch - Comprehensive Tests
// ============================================================================
describe("Switch - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--switch-height is 16px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const root = container.querySelector(".mantine-Switch-root");
                expect(getCssVar(root, "--switch-height")).toBe("16px");
            });

            it("--switch-width is 28px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const root = container.querySelector(".mantine-Switch-root");
                expect(getCssVar(root, "--switch-width")).toBe("28px");
            });

            it("--switch-thumb-size is 12px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const root = container.querySelector(".mantine-Switch-root");
                expect(getCssVar(root, "--switch-thumb-size")).toBe("12px");
            });

            it("--switch-track-label-padding is 2px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const root = container.querySelector(".mantine-Switch-root");
                expect(getCssVar(root, "--switch-track-label-padding")).toBe("2px");
            });

            it("--switch-label-font-size is 5px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const root = container.querySelector(".mantine-Switch-root");
                expect(getCssVar(root, "--switch-label-font-size")).toBe("5px");
            });
        });

        describe("track computed styles", () => {
            it("height is 16px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const track = container.querySelector(".mantine-Switch-track");
                const style = track ? getComputedStyle(track) : null;
                expect(style?.height).toBe("16px");
            });

            it("width is 28px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const track = container.querySelector(".mantine-Switch-track");
                const style = track ? getComputedStyle(track) : null;
                expect(style?.width).toBe("28px");
            });

            it("minWidth is 28px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const track = container.querySelector(".mantine-Switch-track");
                const style = track ? getComputedStyle(track) : null;
                expect(style?.minWidth).toBe("28px");
            });
        });

        describe("thumb computed styles", () => {
            it("width is 12px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const thumb = container.querySelector(".mantine-Switch-thumb");
                const style = thumb ? getComputedStyle(thumb) : null;
                expect(style?.width).toBe("12px");
            });

            it("height is 12px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const thumb = container.querySelector(".mantine-Switch-thumb");
                const style = thumb ? getComputedStyle(thumb) : null;
                expect(style?.height).toBe("12px");
            });
        });

        describe("label computed styles", () => {
            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(<Switch label="Toggle" />);
                const label = container.querySelector(".mantine-Switch-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.fontSize).toBe("11px");
            });
        });
    });
});

// ============================================================================
// Slider - Comprehensive Tests
// ============================================================================
describe("Slider - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--slider-size is 4px", () => {
                const { container } = renderWithTheme(<Slider defaultValue={50} />);
                const root = container.querySelector(".mantine-Slider-root");
                expect(getCssVar(root, "--slider-size")).toBe("4px");
            });

            it("--slider-thumb-size is 12px", () => {
                const { container } = renderWithTheme(<Slider defaultValue={50} />);
                const root = container.querySelector(".mantine-Slider-root");
                expect(getCssVar(root, "--slider-thumb-size")).toBe("12px");
            });
        });

        describe("track computed styles", () => {
            it("height is 4px", () => {
                const { container } = renderWithTheme(<Slider defaultValue={50} />);
                const track = container.querySelector(".mantine-Slider-track");
                const style = track ? getComputedStyle(track) : null;
                expect(style?.height).toBe("4px");
            });
        });

        describe("thumb computed styles", () => {
            it("width is 12px", () => {
                const { container } = renderWithTheme(<Slider defaultValue={50} />);
                const thumb = container.querySelector(".mantine-Slider-thumb");
                const style = thumb ? getComputedStyle(thumb) : null;
                expect(style?.width).toBe("12px");
            });

            it("height is 12px", () => {
                const { container } = renderWithTheme(<Slider defaultValue={50} />);
                const thumb = container.querySelector(".mantine-Slider-thumb");
                const style = thumb ? getComputedStyle(thumb) : null;
                expect(style?.height).toBe("12px");
            });
        });

        describe("markLabel computed styles (with marks)", () => {
            it("fontSize is 10px", () => {
                const { container } = renderWithTheme(
                    <Slider
                        defaultValue={50}
                        marks={[
                            { value: 0, label: "0" },
                            { value: 100, label: "100" },
                        ]}
                    />
                );
                const markLabel = container.querySelector(".mantine-Slider-markLabel");
                const style = markLabel ? getComputedStyle(markLabel) : null;
                expect(style?.fontSize).toBe("10px");
            });

            it("marginTop is 2px", () => {
                const { container } = renderWithTheme(
                    <Slider
                        defaultValue={50}
                        marks={[
                            { value: 0, label: "0" },
                            { value: 100, label: "100" },
                        ]}
                    />
                );
                const markLabel = container.querySelector(".mantine-Slider-markLabel");
                const style = markLabel ? getComputedStyle(markLabel) : null;
                expect(style?.marginTop).toBe("2px");
            });
        });
    });
});

// ============================================================================
// Radio - Comprehensive Tests
// ============================================================================
describe("Radio - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--radio-size is 16px", () => {
                const { container } = renderWithTheme(
                    <Radio label="Option" value="a" />
                );
                const root = container.querySelector(".mantine-Radio-root");
                expect(getCssVar(root, "--radio-size")).toBe("16px");
            });

            it("--radio-icon-size is 6px", () => {
                const { container } = renderWithTheme(
                    <Radio label="Option" value="a" />
                );
                const root = container.querySelector(".mantine-Radio-root");
                expect(getCssVar(root, "--radio-icon-size")).toBe("6px");
            });
        });

        describe("radio computed styles", () => {
            it("width is 16px", () => {
                const { container } = renderWithTheme(
                    <Radio label="Option" value="a" />
                );
                const radio = container.querySelector(".mantine-Radio-radio");
                const style = radio ? getComputedStyle(radio) : null;
                expect(style?.width).toBe("16px");
            });

            it("height is 16px", () => {
                const { container } = renderWithTheme(
                    <Radio label="Option" value="a" />
                );
                const radio = container.querySelector(".mantine-Radio-radio");
                const style = radio ? getComputedStyle(radio) : null;
                expect(style?.height).toBe("16px");
            });
        });

        describe("icon computed styles (when checked)", () => {
            it("icon uses --radio-icon-size", () => {
                const { container } = renderWithTheme(
                    <Radio label="Option" value="a" checked onChange={() => {}} />
                );
                const icon = container.querySelector(".mantine-Radio-icon");
                const style = icon ? getComputedStyle(icon) : null;
                // Icon size is controlled by CSS variable
                expect(style?.width).toBe("6px");
            });
        });

        describe("label computed styles", () => {
            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(
                    <Radio label="Option" value="a" />
                );
                const label = container.querySelector(".mantine-Radio-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.fontSize).toBe("11px");
            });
        });
    });
});

// ============================================================================
// RangeSlider - Comprehensive Tests
// Note: RangeSlider uses .mantine-Slider-* class names (shared with Slider)
// ============================================================================
describe("RangeSlider - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--slider-size is 4px", () => {
                const { container } = renderWithTheme(
                    <RangeSlider defaultValue={[20, 80]} />
                );
                // RangeSlider uses Slider class names
                const root = container.querySelector(".mantine-Slider-root");
                expect(getCssVar(root, "--slider-size")).toBe("4px");
            });

            it("--slider-thumb-size is 12px", () => {
                const { container } = renderWithTheme(
                    <RangeSlider defaultValue={[20, 80]} />
                );
                const root = container.querySelector(".mantine-Slider-root");
                expect(getCssVar(root, "--slider-thumb-size")).toBe("12px");
            });
        });

        describe("track computed styles", () => {
            it("height is 4px", () => {
                const { container } = renderWithTheme(
                    <RangeSlider defaultValue={[20, 80]} />
                );
                const track = container.querySelector(".mantine-Slider-track");
                const style = track ? getComputedStyle(track) : null;
                expect(style?.height).toBe("4px");
            });
        });

        describe("thumb computed styles", () => {
            it("width is 12px", () => {
                const { container } = renderWithTheme(
                    <RangeSlider defaultValue={[20, 80]} />
                );
                const thumb = container.querySelector(".mantine-Slider-thumb");
                const style = thumb ? getComputedStyle(thumb) : null;
                expect(style?.width).toBe("12px");
            });

            it("height is 12px", () => {
                const { container } = renderWithTheme(
                    <RangeSlider defaultValue={[20, 80]} />
                );
                const thumb = container.querySelector(".mantine-Slider-thumb");
                const style = thumb ? getComputedStyle(thumb) : null;
                expect(style?.height).toBe("12px");
            });
        });

        describe("markLabel computed styles (with marks)", () => {
            it("fontSize is 10px", () => {
                const { container } = renderWithTheme(
                    <RangeSlider
                        defaultValue={[20, 80]}
                        marks={[
                            { value: 0, label: "0" },
                            { value: 100, label: "100" },
                        ]}
                    />
                );
                const markLabel = container.querySelector(".mantine-Slider-markLabel");
                const style = markLabel ? getComputedStyle(markLabel) : null;
                expect(style?.fontSize).toBe("10px");
            });

            it("marginTop is 2px", () => {
                const { container } = renderWithTheme(
                    <RangeSlider
                        defaultValue={[20, 80]}
                        marks={[
                            { value: 0, label: "0" },
                            { value: 100, label: "100" },
                        ]}
                    />
                );
                const markLabel = container.querySelector(".mantine-Slider-markLabel");
                const style = markLabel ? getComputedStyle(markLabel) : null;
                expect(style?.marginTop).toBe("2px");
            });
        });
    });
});
