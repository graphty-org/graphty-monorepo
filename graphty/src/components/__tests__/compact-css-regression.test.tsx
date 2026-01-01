/**
 * Compact CSS Regression Tests
 *
 * These tests verify that all compact-sized Mantine components have the correct
 * CSS values as defined in the compact design specification (commit 3a2f63f).
 *
 * Reference: tmp/compact-css-reference.md
 *
 * CSS Properties Tested:
 * - Dimensions: height, width, min-height, min-width
 * - Typography: font-size, line-height, font-family, font-style, text-transform
 * - Spacing: padding, margin
 * - Colors: background-color, color (text)
 * - Borders: border-width, border-radius, border-color
 */
import {
    ActionIcon,
    Autocomplete,
    Badge,
    Button,
    Checkbox,
    ColorInput,
    MantineProvider,
    NativeSelect,
    NumberInput,
    PasswordInput,
    Pill,
    Radio,
    SegmentedControl,
    Select,
    Slider,
    Switch,
    Textarea,
    TextInput,
} from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { theme } from "../../theme";
import { CompactColorInput } from "../sidebar/controls/CompactColorInput";
import { StyleColorInput } from "../sidebar/controls/StyleColorInput";

// Wrapper component with theme provider
function ThemeWrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <MantineProvider theme={theme} forceColorScheme="dark">
            {children}
        </MantineProvider>
    );
}

// Helper to safely get element and throw if not found
function getElement(selector: string): Element {
    const el = document.querySelector(selector);

    if (!el) {
        throw new Error(`Element not found: ${selector}`);
    }

    return el;
}

describe("Compact CSS Regression Tests", () => {
    beforeEach(() => {
        // Reset any cached styles
    });

    describe("Input Components", () => {
        describe("TextInput", () => {
            it("has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            });

            it("has no border (0px)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.borderWidth).toBe("0px");
            });

            it("has correct background color (#2a3035)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.backgroundColor).toBe("rgb(42, 48, 53)");
            });

            it("has correct text color (#d5d7da)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.color).toBe("rgb(213, 215, 218)");
            });

            it("has correct border radius (4px)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.borderRadius).toBe("4px");
            });

            it("has correct padding (0px 8px)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.paddingLeft).toBe("8px");
                expect(computed.paddingRight).toBe("8px");
            });

            describe("label", () => {
                it("has correct font size (11px)", () => {
                    render(
                        <ThemeWrapper>
                            <TextInput label="Test Label" aria-label="Test" size="compact" />
                        </ThemeWrapper>,
                    );
                    const label = getElement(".mantine-TextInput-label");
                    const computed = window.getComputedStyle(label);
                    expect(computed.fontSize).toBe("11px");
                });

                it("has correct dimmed color", () => {
                    render(
                        <ThemeWrapper>
                            <TextInput label="Test Label" aria-label="Test" size="compact" />
                        </ThemeWrapper>,
                    );
                    const label = getElement(".mantine-TextInput-label");
                    const computed = window.getComputedStyle(label);
                    // Dimmed color: #7a828e = rgb(122, 130, 142)
                    expect(computed.color).toBe("rgb(122, 130, 142)");
                });

                it("has correct margin-bottom (1px)", () => {
                    render(
                        <ThemeWrapper>
                            <TextInput label="Test Label" aria-label="Test" size="compact" />
                        </ThemeWrapper>,
                    );
                    const label = getElement(".mantine-TextInput-label");
                    const computed = window.getComputedStyle(label);
                    expect(computed.marginBottom).toBe("1px");
                });

                it("has correct line-height (1.2)", () => {
                    render(
                        <ThemeWrapper>
                            <TextInput label="Test Label" aria-label="Test" size="compact" />
                        </ThemeWrapper>,
                    );
                    const label = getElement(".mantine-TextInput-label");
                    const computed = window.getComputedStyle(label);
                    // lineHeight 1.2 with fontSize 11px = 13.2px
                    expect(computed.lineHeight).toBe("13.2px");
                });
            });
        });

        describe("NumberInput", () => {
            it("has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <NumberInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <NumberInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            });

            it("has no border (0px)", () => {
                render(
                    <ThemeWrapper>
                        <NumberInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.borderWidth).toBe("0px");
            });
        });

        describe("NativeSelect", () => {
            it("has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <NativeSelect label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <NativeSelect label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            });

            it("has no border (0px)", () => {
                render(
                    <ThemeWrapper>
                        <NativeSelect label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.borderWidth).toBe("0px");
            });
        });

        describe("ColorInput", () => {
            it("has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <ColorInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <ColorInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            });

            it("has no border (0px)", () => {
                render(
                    <ThemeWrapper>
                        <ColorInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.borderWidth).toBe("0px");
            });
        });

        describe("Textarea", () => {
            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Textarea label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            });

            it("has no border (0px)", () => {
                render(
                    <ThemeWrapper>
                        <Textarea label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.borderWidth).toBe("0px");
            });

            it("has correct background color (#2a3035)", () => {
                render(
                    <ThemeWrapper>
                        <Textarea label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.backgroundColor).toBe("rgb(42, 48, 53)");
            });

            it("has correct padding (0px 8px)", () => {
                render(
                    <ThemeWrapper>
                        <Textarea label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.paddingLeft).toBe("8px");
                expect(computed.paddingRight).toBe("8px");
            });
        });

        describe("Select", () => {
            it("has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <Select label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Select-input");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Select label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Select-input");
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            });

            it("has no border (0px)", () => {
                render(
                    <ThemeWrapper>
                        <Select label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Select-input");
                const computed = window.getComputedStyle(input);
                expect(computed.borderWidth).toBe("0px");
            });

            it("has correct background color (#2a3035)", () => {
                render(
                    <ThemeWrapper>
                        <Select label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Select-input");
                const computed = window.getComputedStyle(input);
                expect(computed.backgroundColor).toBe("rgb(42, 48, 53)");
            });
        });

        describe("PasswordInput", () => {
            it("has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <PasswordInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <PasswordInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            });

            it("has no border (0px)", () => {
                render(
                    <ThemeWrapper>
                        <PasswordInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.borderWidth).toBe("0px");
            });

            it("has correct innerInput padding (8px left and right)", () => {
                render(
                    <ThemeWrapper>
                        <PasswordInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                // PasswordInput has a complex DOM with innerInput element for actual text
                const innerInput = getElement(".mantine-PasswordInput-innerInput");
                const computed = window.getComputedStyle(innerInput);
                expect(computed.paddingLeft).toBe("8px");
                expect(computed.paddingRight).toBe("8px");
            });
        });

        describe("Autocomplete", () => {
            it("has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <Autocomplete label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Autocomplete-input");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("24px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Autocomplete label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Autocomplete-input");
                const computed = window.getComputedStyle(input);
                expect(computed.fontSize).toBe("11px");
            });

            it("has no border (0px)", () => {
                render(
                    <ThemeWrapper>
                        <Autocomplete label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Autocomplete-input");
                const computed = window.getComputedStyle(input);
                expect(computed.borderWidth).toBe("0px");
            });

            it("has correct background color (#2a3035)", () => {
                render(
                    <ThemeWrapper>
                        <Autocomplete label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Autocomplete-input");
                const computed = window.getComputedStyle(input);
                expect(computed.backgroundColor).toBe("rgb(42, 48, 53)");
            });
        });
    });

    describe("Button Components", () => {
        describe("Button", () => {
            it("has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <Button size="compact">Test</Button>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.height).toBe("24px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Button size="compact">Test</Button>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.fontSize).toBe("11px");
            });

            it("has correct compact padding (0px 8px)", () => {
                render(
                    <ThemeWrapper>
                        <Button size="compact">Test</Button>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.padding).toBe("0px 8px");
            });

            it("has correct border radius (4px)", () => {
                render(
                    <ThemeWrapper>
                        <Button size="compact">Test</Button>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.borderRadius).toBe("4px");
            });
        });

        describe("ActionIcon", () => {
            it("has correct compact size (24x24px)", () => {
                render(
                    <ThemeWrapper>
                        <ActionIcon size="compact" aria-label="Test">
                            X
                        </ActionIcon>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.height).toBe("24px");
                expect(computed.width).toBe("24px");
            });

            it("has correct min size (24x24px)", () => {
                render(
                    <ThemeWrapper>
                        <ActionIcon size="compact" aria-label="Test">
                            X
                        </ActionIcon>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.minHeight).toBe("24px");
                expect(computed.minWidth).toBe("24px");
            });

            it("has correct border radius (4px)", () => {
                render(
                    <ThemeWrapper>
                        <ActionIcon size="compact" aria-label="Test">
                            X
                        </ActionIcon>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.borderRadius).toBe("4px");
            });
        });
    });

    describe("Control Components", () => {
        describe("SegmentedControl", () => {
            it("has correct label font size (10px)", () => {
                render(
                    <ThemeWrapper>
                        <SegmentedControl size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-SegmentedControl-label");
                const computed = window.getComputedStyle(label);
                expect(computed.fontSize).toBe("10px");
            });

            it("has correct label padding (4px 8px)", () => {
                render(
                    <ThemeWrapper>
                        <SegmentedControl size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-SegmentedControl-label");
                const computed = window.getComputedStyle(label);
                expect(computed.padding).toBe("4px 8px");
            });

            it("has correct root padding (4px)", () => {
                render(
                    <ThemeWrapper>
                        <SegmentedControl size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const root = getElement(".mantine-SegmentedControl-root");
                const computed = window.getComputedStyle(root);
                expect(computed.padding).toBe("4px");
            });
        });

        describe("Checkbox", () => {
            it("has correct compact size (16x16px)", () => {
                render(
                    <ThemeWrapper>
                        <Checkbox label="Test" aria-label="Test" size="compact" defaultChecked />
                    </ThemeWrapper>,
                );
                const checkbox = getElement(".mantine-Checkbox-input");
                const computed = window.getComputedStyle(checkbox);
                expect(computed.height).toBe("16px");
                expect(computed.width).toBe("16px");
            });

            it("has correct label font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Checkbox label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-Checkbox-label");
                const computed = window.getComputedStyle(label);
                expect(computed.fontSize).toBe("11px");
            });

            it("has correct label padding-left (12px)", () => {
                render(
                    <ThemeWrapper>
                        <Checkbox label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-Checkbox-label");
                const computed = window.getComputedStyle(label);
                expect(computed.paddingLeft).toBe("12px");
            });
        });

        describe("Switch", () => {
            it("has correct track size (16x28px)", () => {
                render(
                    <ThemeWrapper>
                        <Switch label="Test" aria-label="Test" size="compact" defaultChecked />
                    </ThemeWrapper>,
                );
                const track = getElement(".mantine-Switch-track");
                const computed = window.getComputedStyle(track);
                expect(computed.height).toBe("16px");
                expect(computed.width).toBe("28px");
            });

            it("has correct thumb size (12x12px)", () => {
                render(
                    <ThemeWrapper>
                        <Switch label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const thumb = getElement(".mantine-Switch-thumb");
                const computed = window.getComputedStyle(thumb);
                expect(computed.height).toBe("12px");
                expect(computed.width).toBe("12px");
            });

            it("has correct label font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Switch label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-Switch-label");
                const computed = window.getComputedStyle(label);
                expect(computed.fontSize).toBe("11px");
            });

            it("has correct track label font size (5px) for on/off labels", () => {
                render(
                    <ThemeWrapper>
                        <Switch label="Test" aria-label="Test" size="compact" onLabel="ON" offLabel="OFF" />
                    </ThemeWrapper>,
                );
                const trackLabel = getElement(".mantine-Switch-trackLabel");
                const computed = window.getComputedStyle(trackLabel);
                expect(computed.fontSize).toBe("5px");
            });
        });

        describe("Radio", () => {
            it("has correct compact size (16x16px)", () => {
                render(
                    <ThemeWrapper>
                        <Radio label="Test" aria-label="Test" size="compact" value="test" />
                    </ThemeWrapper>,
                );
                const radio = getElement(".mantine-Radio-radio");
                const computed = window.getComputedStyle(radio);
                expect(computed.height).toBe("16px");
                expect(computed.width).toBe("16px");
            });

            it("has correct label font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Radio label="Test" aria-label="Test" size="compact" value="test" />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-Radio-label");
                const computed = window.getComputedStyle(label);
                expect(computed.fontSize).toBe("11px");
            });
        });

        describe("Slider", () => {
            it("has correct track height (4px)", () => {
                render(
                    <ThemeWrapper>
                        <Slider size="compact" aria-label="Test" />
                    </ThemeWrapper>,
                );
                const track = getElement(".mantine-Slider-track");
                const computed = window.getComputedStyle(track);
                expect(computed.height).toBe("4px");
            });

            it("has correct thumb size (12x12px)", () => {
                render(
                    <ThemeWrapper>
                        <Slider size="compact" aria-label="Test" />
                    </ThemeWrapper>,
                );
                const thumb = getElement(".mantine-Slider-thumb");
                const computed = window.getComputedStyle(thumb);
                expect(computed.height).toBe("12px");
                expect(computed.width).toBe("12px");
            });
        });
    });

    describe("Display Components", () => {
        describe("Badge", () => {
            it("has correct compact height (14px)", () => {
                render(
                    <ThemeWrapper>
                        <Badge size={"compact" as never}>Test</Badge>
                    </ThemeWrapper>,
                );
                const badge = getElement(".mantine-Badge-root");
                const computed = window.getComputedStyle(badge);
                expect(computed.height).toBe("14px");
            });

            it("has correct compact font size (9px)", () => {
                render(
                    <ThemeWrapper>
                        <Badge size={"compact" as never}>Test</Badge>
                    </ThemeWrapper>,
                );
                const badge = getElement(".mantine-Badge-root");
                const computed = window.getComputedStyle(badge);
                expect(computed.fontSize).toBe("9px");
            });

            it("has correct compact padding (0px 4px)", () => {
                render(
                    <ThemeWrapper>
                        <Badge size={"compact" as never}>Test</Badge>
                    </ThemeWrapper>,
                );
                const badge = getElement(".mantine-Badge-root");
                const computed = window.getComputedStyle(badge);
                expect(computed.padding).toBe("0px 4px");
            });
        });

        describe("Pill", () => {
            it("has correct compact height (16px)", () => {
                render(
                    <ThemeWrapper>
                        <Pill size={"compact" as never}>Test</Pill>
                    </ThemeWrapper>,
                );
                const pill = getElement(".mantine-Pill-root");
                const computed = window.getComputedStyle(pill);
                expect(computed.height).toBe("16px");
            });

            it("has correct compact font size (10px)", () => {
                render(
                    <ThemeWrapper>
                        <Pill size={"compact" as never}>Test</Pill>
                    </ThemeWrapper>,
                );
                const pill = getElement(".mantine-Pill-root");
                const computed = window.getComputedStyle(pill);
                expect(computed.fontSize).toBe("10px");
            });

            it("has correct pill border-radius (16000px)", () => {
                render(
                    <ThemeWrapper>
                        <Pill size={"compact" as never}>Test</Pill>
                    </ThemeWrapper>,
                );
                const pill = getElement(".mantine-Pill-root");
                const computed = window.getComputedStyle(pill);
                expect(computed.borderRadius).toBe("16000px");
            });

            it("has correct padding (0px 8px)", () => {
                render(
                    <ThemeWrapper>
                        <Pill size={"compact" as never}>Test</Pill>
                    </ThemeWrapper>,
                );
                const pill = getElement(".mantine-Pill-root");
                const computed = window.getComputedStyle(pill);
                expect(computed.padding).toBe("0px 8px");
            });
        });
    });

    describe("Sidebar Components", () => {
        describe("CompactColorInput", () => {
            const defaultProps = {
                color: "#5B8FF9",
                opacity: 100,
                onColorChange: vi.fn(),
                onOpacityChange: vi.fn(),
            };

            it("color swatch ActionIcon has correct size (24px)", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const actionIcon = screen.getByRole("button", { name: "Color swatch" });
                const computed = window.getComputedStyle(actionIcon);
                expect(computed.height).toBe("24px");
                expect(computed.width).toBe("24px");
            });

            it("color swatch has correct background color", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const actionIcon = screen.getByRole("button", { name: "Color swatch" });
                const computed = window.getComputedStyle(actionIcon);
                // Should use --mantine-color-default = rgb(42, 48, 53)
                expect(computed.backgroundColor).toBe("rgb(42, 48, 53)");
            });

            it("color swatch has correct left border-radius (4px 0 0 4px)", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const actionIcon = screen.getByRole("button", { name: "Color swatch" });
                const computed = window.getComputedStyle(actionIcon);
                expect(computed.borderRadius).toBe("4px 0px 0px 4px");
            });

            it("hex input has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                expect(computed.height).toBe("24px");
            });

            it("hex input has monospace font family", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                expect(computed.fontFamily).toBe("monospace");
            });

            it("hex input has uppercase text transform", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                expect(computed.textTransform).toBe("uppercase");
            });

            it("hex input has correct width (72px)", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const wrapper = hexInput.closest(".mantine-TextInput-wrapper");

                if (wrapper) {
                    const computed = window.getComputedStyle(wrapper);
                    expect(computed.width).toBe("72px");
                }
            });

            it("opacity input has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const opacityInput = screen.getByLabelText("Opacity");
                const computed = window.getComputedStyle(opacityInput);
                expect(computed.height).toBe("24px");
            });

            it("opacity input has right text-align", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const opacityInput = screen.getByLabelText("Opacity");
                const computed = window.getComputedStyle(opacityInput);
                expect(computed.textAlign).toBe("right");
            });

            it("opacity input has correct right border-radius (0 4px 4px 0)", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const opacityInput = screen.getByLabelText("Opacity");
                const computed = window.getComputedStyle(opacityInput);
                expect(computed.borderRadius).toBe("0px 4px 4px 0px");
            });

            it("color swatch inner ColorSwatch has correct size (14px)", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const colorSwatch = getElement(".mantine-ColorSwatch-root");
                const computed = window.getComputedStyle(colorSwatch);
                expect(computed.height).toBe("14px");
                expect(computed.width).toBe("14px");
            });

            it("with label shows label with correct styling", () => {
                render(
                    <ThemeWrapper>
                        <CompactColorInput {...defaultProps} label="Color" />
                    </ThemeWrapper>,
                );
                const label = screen.getByText("Color");
                const computed = window.getComputedStyle(label);
                // Uses Text size="xs" which is 12px in Mantine, but c="dimmed"
                expect(computed.color).toBe("rgb(122, 130, 142)");
            });
        });

        describe("StyleColorInput", () => {
            const defaultProps = {
                label: "Fill Color",
                value: undefined as string | undefined,
                defaultValue: "#5B8FF9",
                onChange: vi.fn(),
            };

            it("color swatch ActionIcon has correct size (24px)", () => {
                render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const actionIcon = screen.getByRole("button", { name: "Color swatch" });
                const computed = window.getComputedStyle(actionIcon);
                expect(computed.height).toBe("24px");
                expect(computed.width).toBe("24px");
            });

            it("hex input has correct compact height (24px)", () => {
                render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                expect(computed.height).toBe("24px");
            });

            it("hex input has monospace font family", () => {
                render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                expect(computed.fontFamily).toBe("monospace");
            });

            it("hex input has uppercase text transform", () => {
                render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                expect(computed.textTransform).toBe("uppercase");
            });

            it("when using default value, hex input has italic font-style", () => {
                render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} value={undefined} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                expect(computed.fontStyle).toBe("italic");
            });

            it("when using default value, hex input has dimmed color", () => {
                render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} value={undefined} />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                // Dimmed color: #7a828e = rgb(122, 130, 142)
                expect(computed.color).toBe("rgb(122, 130, 142)");
            });

            it("when explicit value is set, hex input has normal font-style", () => {
                render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} value="#FF0000" />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                expect(computed.fontStyle).toBe("normal");
            });

            it("when explicit value is set, hex input has normal text color", () => {
                render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} value="#FF0000" />
                    </ThemeWrapper>,
                );
                const hexInput = screen.getByLabelText("Color hex value");
                const computed = window.getComputedStyle(hexInput);
                // Normal text color: #d5d7da = rgb(213, 215, 218)
                expect(computed.color).toBe("rgb(213, 215, 218)");
            });

            it("shows reset button only when explicit value is set", () => {
                const { rerender } = render(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} value={undefined} />
                    </ThemeWrapper>,
                );
                // No reset button when using default
                expect(screen.queryByRole("button", { name: /Reset/ })).toBeNull();

                // Reset button appears when explicit value is set
                rerender(
                    <ThemeWrapper>
                        <StyleColorInput {...defaultProps} value="#FF0000" />
                    </ThemeWrapper>,
                );
                expect(screen.getByRole("button", { name: "Reset Fill Color to default" })).toBeDefined();
            });
        });
    });

    describe("Border Radius Consistency", () => {
        it("Badge has pill-shaped border-radius (1000px)", () => {
            render(
                <ThemeWrapper>
                    <Badge size={"compact" as never}>Test</Badge>
                </ThemeWrapper>,
            );
            const badge = getElement(".mantine-Badge-root");
            const computed = window.getComputedStyle(badge);
            expect(computed.borderRadius).toBe("1000px");
        });

        it("Switch track has pill-shaped border-radius (1000px)", () => {
            render(
                <ThemeWrapper>
                    <Switch label="Test" aria-label="Test" size="compact" />
                </ThemeWrapper>,
            );
            const track = getElement(".mantine-Switch-track");
            const computed = window.getComputedStyle(track);
            expect(computed.borderRadius).toBe("1000px");
        });

        it("Switch thumb has pill-shaped border-radius (1000px)", () => {
            render(
                <ThemeWrapper>
                    <Switch label="Test" aria-label="Test" size="compact" />
                </ThemeWrapper>,
            );
            const thumb = getElement(".mantine-Switch-thumb");
            const computed = window.getComputedStyle(thumb);
            expect(computed.borderRadius).toBe("1000px");
        });

        it("Checkbox has correct border-radius (4px)", () => {
            render(
                <ThemeWrapper>
                    <Checkbox label="Test" aria-label="Test" size="compact" />
                </ThemeWrapper>,
            );
            const checkbox = getElement(".mantine-Checkbox-input");
            const computed = window.getComputedStyle(checkbox);
            expect(computed.borderRadius).toBe("4px");
        });

        it("SegmentedControl root has correct border-radius (4px)", () => {
            render(
                <ThemeWrapper>
                    <SegmentedControl size="compact" data={["A", "B"]} />
                </ThemeWrapper>,
            );
            const root = getElement(".mantine-SegmentedControl-root");
            const computed = window.getComputedStyle(root);
            expect(computed.borderRadius).toBe("4px");
        });

        it("SegmentedControl label has correct border-radius (4px)", () => {
            render(
                <ThemeWrapper>
                    <SegmentedControl size="compact" data={["A", "B"]} />
                </ThemeWrapper>,
            );
            const label = getElement(".mantine-SegmentedControl-label");
            const computed = window.getComputedStyle(label);
            expect(computed.borderRadius).toBe("4px");
        });

        it("Slider thumb has correct border-radius (32px)", () => {
            render(
                <ThemeWrapper>
                    <Slider size="compact" aria-label="Test" />
                </ThemeWrapper>,
            );
            const thumb = getElement(".mantine-Slider-thumb");
            const computed = window.getComputedStyle(thumb);
            expect(computed.borderRadius).toBe("32px");
        });
    });

    describe("Color Theme Consistency", () => {
        it("all compact inputs use the same background color (#2a3035)", () => {
            render(
                <ThemeWrapper>
                    <TextInput label="Text" aria-label="Text" size="compact" />
                    <NumberInput label="Number" aria-label="Number" size="compact" />
                    <Textarea label="Textarea" aria-label="Textarea" size="compact" />
                </ThemeWrapper>,
            );
            const textInput = screen.getByLabelText("Text");
            const numberInput = screen.getByLabelText("Number");
            const textareaInput = screen.getByLabelText("Textarea");

            const bgColors = [textInput, numberInput, textareaInput].map(
                (el) => window.getComputedStyle(el).backgroundColor,
            );

            // All should have the same background color
            expect(new Set(bgColors).size).toBe(1);
            expect(bgColors[0]).toBe("rgb(42, 48, 53)");
        });

        it("all compact input labels use the same dimmed color (#7a828e)", () => {
            render(
                <ThemeWrapper>
                    <TextInput label="Text Label" aria-label="Text" size="compact" />
                    <NumberInput label="Number Label" aria-label="Number" size="compact" />
                </ThemeWrapper>,
            );
            const textLabel = getElement(".mantine-TextInput-label");
            const numberLabel = getElement(".mantine-NumberInput-label");

            const colors = [textLabel, numberLabel].map((el) => window.getComputedStyle(el).color);

            // All should have the same dimmed color
            expect(new Set(colors).size).toBe(1);
            expect(colors[0]).toBe("rgb(122, 130, 142)");
        });
    });
});
