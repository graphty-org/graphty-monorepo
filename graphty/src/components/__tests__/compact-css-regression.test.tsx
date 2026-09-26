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

            it("is borderless at rest; the focus ring is the field's 1px outline", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                // A compact input is borderless at rest. Since the Figma release the field
                // draws no border at all: hover and focus paint a 1px outline at -1px on
                // the field (compact-mantine's cm-field), so the box never grows.
                expect(computed.borderWidth).toBe("0px");
            });

            it("draws no fill on the inner input element (the field around it is filled)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.backgroundColor).toBe("rgba(0, 0, 0, 0)");
            });

            it("has the dark text colour (#fff)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.color).toBe("rgb(255, 255, 255)");
            });

            it("has correct border radius (5px)", () => {
                render(
                    <ThemeWrapper>
                        <TextInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.borderRadius).toBe("5px");
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
                // The label is Figma's 9/14 weight-500 field caption.
                it("has correct font size (9px)", () => {
                    render(
                        <ThemeWrapper>
                            <TextInput label="Test Label" aria-label="Test" size="compact" />
                        </ThemeWrapper>,
                    );
                    const label = getElement(".mantine-TextInput-label");
                    const computed = window.getComputedStyle(label);
                    expect(computed.fontSize).toBe("9px");
                });

                it("has the secondary panel ink", () => {
                    render(
                        <ThemeWrapper>
                            <TextInput label="Test Label" aria-label="Test" size="compact" />
                        </ThemeWrapper>,
                    );
                    const label = getElement(".mantine-TextInput-label");
                    const computed = window.getComputedStyle(label);
                    // Figma's secondary text (--cm-text-secondary), #ffffffb2 in the dark
                    // scheme: 7.7:1 on the #2c2c2c panel, so it passes AA without the
                    // library's highContrast option.
                    expect(computed.color).toBe("rgba(255, 255, 255, 0.698)");
                });

                it("has correct margin-bottom (4px)", () => {
                    render(
                        <ThemeWrapper>
                            <TextInput label="Test Label" aria-label="Test" size="compact" />
                        </ThemeWrapper>,
                    );
                    const label = getElement(".mantine-TextInput-label");
                    const computed = window.getComputedStyle(label);
                    expect(computed.marginBottom).toBe("4px");
                });

                it("has correct line-height (14px)", () => {
                    render(
                        <ThemeWrapper>
                            <TextInput label="Test Label" aria-label="Test" size="compact" />
                        </ThemeWrapper>,
                    );
                    const label = getElement(".mantine-TextInput-label");
                    const computed = window.getComputedStyle(label);
                    expect(computed.lineHeight).toBe("14px");
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

            it("is borderless at rest; the focus ring is the field's 1px outline", () => {
                render(
                    <ThemeWrapper>
                        <NumberInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                // A compact input is borderless at rest. Since the Figma release the field
                // draws no border at all: hover and focus paint a 1px outline at -1px on
                // the field (compact-mantine's cm-field), so the box never grows.
                expect(computed.borderWidth).toBe("0px");
            });
        });

        describe("NativeSelect", () => {
            it("has correct compact height (22px inside the 1px outlined border)", () => {
                render(
                    <ThemeWrapper>
                        <NativeSelect label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("22px");
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

            it("is borderless at rest; the focus ring is the field's 1px outline", () => {
                render(
                    <ThemeWrapper>
                        <NativeSelect label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                // A compact input is borderless at rest. Since the Figma release the field
                // draws no border at all: hover and focus paint a 1px outline at -1px on
                // the field (compact-mantine's cm-field), so the box never grows.
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

            it("is borderless at rest; the focus ring is the field's 1px outline", () => {
                render(
                    <ThemeWrapper>
                        <ColorInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                // A compact input is borderless at rest. Since the Figma release the field
                // draws no border at all: hover and focus paint a 1px outline at -1px on
                // the field (compact-mantine's cm-field), so the box never grows.
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

            it("is borderless at rest; the focus ring is the field's 1px outline", () => {
                render(
                    <ThemeWrapper>
                        <Textarea label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                // A compact input is borderless at rest. Since the Figma release the field
                // draws no border at all: hover and focus paint a 1px outline at -1px on
                // the field (compact-mantine's cm-field), so the box never grows.
                expect(computed.borderWidth).toBe("0px");
            });

            it("draws no fill on the inner input element (the field around it is filled)", () => {
                render(
                    <ThemeWrapper>
                        <Textarea label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const input = screen.getByLabelText("Test");
                const computed = window.getComputedStyle(input);
                expect(computed.backgroundColor).toBe("rgba(0, 0, 0, 0)");
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
            it("has correct compact height (22px inside the 1px outlined border)", () => {
                render(
                    <ThemeWrapper>
                        <Select label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Select-input");
                const computed = window.getComputedStyle(input);
                expect(computed.height).toBe("22px");
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

            it("is borderless at rest; the focus ring is the field's 1px outline", () => {
                render(
                    <ThemeWrapper>
                        <Select label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Select-input");
                const computed = window.getComputedStyle(input);
                // A compact input is borderless at rest. Since the Figma release the field
                // draws no border at all: hover and focus paint a 1px outline at -1px on
                // the field (compact-mantine's cm-field), so the box never grows.
                expect(computed.borderWidth).toBe("0px");
            });

            it("draws no fill on the inner input element (the field around it is filled)", () => {
                render(
                    <ThemeWrapper>
                        <Select label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Select-input");
                const computed = window.getComputedStyle(input);
                expect(computed.backgroundColor).toBe("rgba(0, 0, 0, 0)");
            });
        });

        describe("PasswordInput", () => {
            it("has correct compact height (24px on the field and inside it)", () => {
                const { container } = render(
                    <ThemeWrapper>
                        <PasswordInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const field = container.querySelector(".mantine-PasswordInput-input");
                const inner = screen.getByLabelText("Test");

                // The FIELD is 24. Its inner input is the 24 less the two 1px edges of
                // the transparent border that reserves room for the focus ring (see the
                // border assertions above), which is the library's own behaviour.
                expect(field === null ? "" : window.getComputedStyle(field).height).toBe("24px");
                expect(window.getComputedStyle(inner).height).toBe("24px");
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

            it("draws the border on the field, never on the inner input", () => {
                const { container } = render(
                    <ThemeWrapper>
                        <PasswordInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const field = container.querySelector(".mantine-PasswordInput-input");
                const inner = screen.getByLabelText("Test");

                // The field reserves the 1px the focus border paints in (see TextInput
                // above); the inner input sits inside it and has no border of its own.
                expect(field === null ? "" : window.getComputedStyle(field).borderWidth).toBe("0px");
                expect(window.getComputedStyle(inner).borderWidth).toBe("0px");
            });

            it("has correct innerInput padding (8px left, 24px right for the visibility toggle)", () => {
                render(
                    <ThemeWrapper>
                        <PasswordInput label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                // PasswordInput has a complex DOM with innerInput element for actual text
                const innerInput = getElement(".mantine-PasswordInput-innerInput");
                const computed = window.getComputedStyle(innerInput);
                expect(computed.paddingLeft).toBe("8px");
                expect(computed.paddingRight).toBe("24px");
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

            it("is borderless at rest; the focus ring is the field's 1px outline", () => {
                render(
                    <ThemeWrapper>
                        <Autocomplete label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Autocomplete-input");
                const computed = window.getComputedStyle(input);
                // A compact input is borderless at rest. Since the Figma release the field
                // draws no border at all: hover and focus paint a 1px outline at -1px on
                // the field (compact-mantine's cm-field), so the box never grows.
                expect(computed.borderWidth).toBe("0px");
            });

            it("draws no fill on the inner input element (the field around it is filled)", () => {
                render(
                    <ThemeWrapper>
                        <Autocomplete label="Test" aria-label="Test" size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const input = getElement(".mantine-Autocomplete-input");
                const computed = window.getComputedStyle(input);
                expect(computed.backgroundColor).toBe("rgba(0, 0, 0, 0)");
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

            it("has correct compact padding (0px)", () => {
                render(
                    <ThemeWrapper>
                        <Button size="compact">Test</Button>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.padding).toBe("0px");
            });

            it("has correct border radius (5px)", () => {
                render(
                    <ThemeWrapper>
                        <Button size="compact">Test</Button>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.borderRadius).toBe("5px");
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

            it("has correct border radius (5px)", () => {
                render(
                    <ThemeWrapper>
                        <ActionIcon size="compact" aria-label="Test">
                            X
                        </ActionIcon>
                    </ThemeWrapper>,
                );
                const button = screen.getByRole("button", { name: "Test" });
                const computed = window.getComputedStyle(button);
                expect(computed.borderRadius).toBe("5px");
            });
        });
    });

    describe("Control Components", () => {
        describe("SegmentedControl", () => {
            it("has correct label font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <SegmentedControl size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-SegmentedControl-label");
                const computed = window.getComputedStyle(label);
                expect(computed.fontSize).toBe("11px");
            });

            it("has correct label padding (0px 8px)", () => {
                render(
                    <ThemeWrapper>
                        <SegmentedControl size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-SegmentedControl-label");
                const computed = window.getComputedStyle(label);
                expect(computed.padding).toBe("0px 8px");
            });

            it("has correct root padding (0px)", () => {
                render(
                    <ThemeWrapper>
                        <SegmentedControl size="compact" data={["A", "B"]} />
                    </ThemeWrapper>,
                );
                const root = getElement(".mantine-SegmentedControl-root");
                const computed = window.getComputedStyle(root);
                expect(computed.padding).toBe("0px");
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

            it("has correct label padding-left (the compact spacing scale's sm)", () => {
                render(
                    <ThemeWrapper>
                        <Checkbox label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const label = getElement(".mantine-Checkbox-label");
                const computed = window.getComputedStyle(label);
                // `--checkbox-label-padding` resolves to `--mantine-spacing-sm`, and the
                // merged theme takes that scale from `@graphty/compact-mantine`, which
                // owns what a shipped control paints (CONTRAST-DIVERGENCE section 5).
                expect(computed.paddingLeft).toBe("8px");
            });
        });

        describe("Switch", () => {
            it("has correct track size (16x32px)", () => {
                render(
                    <ThemeWrapper>
                        <Switch label="Test" aria-label="Test" size="compact" defaultChecked />
                    </ThemeWrapper>,
                );
                const track = getElement(".mantine-Switch-track");
                const computed = window.getComputedStyle(track);
                expect(computed.height).toBe("16px");
                expect(computed.width).toBe("32px");
            });

            it("has correct thumb size (12x8px)", () => {
                render(
                    <ThemeWrapper>
                        <Switch label="Test" aria-label="Test" size="compact" />
                    </ThemeWrapper>,
                );
                const thumb = getElement(".mantine-Switch-thumb");
                const computed = window.getComputedStyle(thumb);
                expect(computed.height).toBe("8px");
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
            it("has correct track height (8px)", () => {
                render(
                    <ThemeWrapper>
                        <Slider size="compact" aria-label="Test" />
                    </ThemeWrapper>,
                );
                const track = getElement(".mantine-Slider-track");
                const computed = window.getComputedStyle(track);
                expect(computed.height).toBe("8px");
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
            it("has correct compact height (16px)", () => {
                render(
                    <ThemeWrapper>
                        <Badge size={"compact" as never}>Test</Badge>
                    </ThemeWrapper>,
                );
                const badge = getElement(".mantine-Badge-root");
                const computed = window.getComputedStyle(badge);
                expect(computed.height).toBe("16px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Badge size={"compact" as never}>Test</Badge>
                    </ThemeWrapper>,
                );
                const badge = getElement(".mantine-Badge-root");
                const computed = window.getComputedStyle(badge);
                expect(computed.fontSize).toBe("11px");
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
            it("has correct compact height (20px)", () => {
                render(
                    <ThemeWrapper>
                        <Pill size={"compact" as never}>Test</Pill>
                    </ThemeWrapper>,
                );
                const pill = getElement(".mantine-Pill-root");
                const computed = window.getComputedStyle(pill);
                expect(computed.height).toBe("20px");
            });

            it("has correct compact font size (11px)", () => {
                render(
                    <ThemeWrapper>
                        <Pill size={"compact" as never}>Test</Pill>
                    </ThemeWrapper>,
                );
                const pill = getElement(".mantine-Pill-root");
                const computed = window.getComputedStyle(pill);
                expect(computed.fontSize).toBe("11px");
            });

            it("has correct pill border-radius (5px)", () => {
                render(
                    <ThemeWrapper>
                        <Pill size={"compact" as never}>Test</Pill>
                    </ThemeWrapper>,
                );
                const pill = getElement(".mantine-Pill-root");
                const computed = window.getComputedStyle(pill);
                expect(computed.borderRadius).toBe("5px");
            });

            it("has correct padding (0px 4px)", () => {
                render(
                    <ThemeWrapper>
                        <Pill size={"compact" as never}>Test</Pill>
                    </ThemeWrapper>,
                );
                const pill = getElement(".mantine-Pill-root");
                const computed = window.getComputedStyle(pill);
                expect(computed.padding).toBe("0px 4px");
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
                expect(computed.backgroundColor).toBe("rgb(56, 56, 56)");
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
                expect(computed.color).toBe("rgb(140, 140, 140)");
            });
        });

        /* The `StyleColorInput` block that used to sit here is GONE with the component.
           It was the sidebar's own fork of a colour field, and after the style inspector
           was rebuilt on compact-mantine nothing rendered it but this file -- design 6.17
           check 1 forbids a call-site substitute for a library control, and a regression
           test is not a consumer. `CompactColorInput` above is the library's, and its own
           package tests cover the geometry this block was asserting. */
    });

    describe("Border Radius Consistency", () => {
        it("Badge has pill-shaped border-radius (5px)", () => {
            render(
                <ThemeWrapper>
                    <Badge size={"compact" as never}>Test</Badge>
                </ThemeWrapper>,
            );
            const badge = getElement(".mantine-Badge-root");
            const computed = window.getComputedStyle(badge);
            expect(computed.borderRadius).toBe("5px");
        });

        it("Switch track has pill-shaped border-radius (9999px)", () => {
            render(
                <ThemeWrapper>
                    <Switch label="Test" aria-label="Test" size="compact" />
                </ThemeWrapper>,
            );
            const track = getElement(".mantine-Switch-track");
            const computed = window.getComputedStyle(track);
            expect(computed.borderRadius).toBe("9999px");
        });

        it("Switch thumb has pill-shaped border-radius (9999px)", () => {
            render(
                <ThemeWrapper>
                    <Switch label="Test" aria-label="Test" size="compact" />
                </ThemeWrapper>,
            );
            const thumb = getElement(".mantine-Switch-thumb");
            const computed = window.getComputedStyle(thumb);
            expect(computed.borderRadius).toBe("9999px");
        });

        it("Checkbox has correct border-radius (2px)", () => {
            render(
                <ThemeWrapper>
                    <Checkbox label="Test" aria-label="Test" size="compact" />
                </ThemeWrapper>,
            );
            const checkbox = getElement(".mantine-Checkbox-input");
            const computed = window.getComputedStyle(checkbox);
            expect(computed.borderRadius).toBe("2px");
        });

        it("SegmentedControl root has correct border-radius (5px)", () => {
            render(
                <ThemeWrapper>
                    <SegmentedControl size="compact" data={["A", "B"]} />
                </ThemeWrapper>,
            );
            const root = getElement(".mantine-SegmentedControl-root");
            const computed = window.getComputedStyle(root);
            expect(computed.borderRadius).toBe("5px");
        });

        it("SegmentedControl label has correct border-radius (5px)", () => {
            render(
                <ThemeWrapper>
                    <SegmentedControl size="compact" data={["A", "B"]} />
                </ThemeWrapper>,
            );
            const label = getElement(".mantine-SegmentedControl-label");
            const computed = window.getComputedStyle(label);
            expect(computed.borderRadius).toBe("5px");
        });

        it("Slider thumb has correct border-radius (the compact radius scale)", () => {
            render(
                <ThemeWrapper>
                    <Slider size="compact" aria-label="Test" />
                </ThemeWrapper>,
            );
            const thumb = getElement(".mantine-Slider-thumb");
            const computed = window.getComputedStyle(thumb);
            // The radius scale is the library's in the merged theme, as above.
            expect(computed.borderRadius).toBe("13px");
        });
    });

    describe("Default size (no size prop)", () => {
        // The size the shell actually draws at, and the case this file had none of --
        // which is how a theme merge that deleted @graphty/compact-mantine's input
        // `vars`, leaving every default-size field at Mantine's stock 36px, shipped
        // green. The library's row types deliberately pass no `size`, so a control takes
        // the library theme's defaultProps `size="sm"`, and under that theme "sm" MEANS
        // the 24px compact box (VOCAB section 11: control height 24px, 11px value ink).
        //
        // min-height is asserted beside height because Mantine reads `height` from
        // `--input-size` but `min-height` from `--input-height`: a theme that sets only
        // one of the two leaves the other resolving against a variable that does not
        // exist, and min-height silently falls back to `auto`.
        it("Select draws 22px inside its 1px outlined border, a 24px box", () => {
            render(
                <ThemeWrapper>
                    <Select label="Test" aria-label="Test" data={["A", "B"]} />
                </ThemeWrapper>,
            );
            const computed = window.getComputedStyle(getElement(".mantine-Select-input"));

            expect(computed.height).toBe("22px");
            expect(computed.minHeight).toBe("0px");
            expect(computed.fontSize).toBe("11px");
        });

        it("TextInput draws at 24px", () => {
            render(
                <ThemeWrapper>
                    <TextInput label="Test" aria-label="Test" />
                </ThemeWrapper>,
            );
            const computed = window.getComputedStyle(getElement(".mantine-TextInput-input"));

            expect(computed.height).toBe("24px");
            expect(computed.minHeight).toBe("24px");
            expect(computed.fontSize).toBe("11px");
        });

        it("NumberInput draws at 24px", () => {
            render(
                <ThemeWrapper>
                    <NumberInput label="Test" aria-label="Test" />
                </ThemeWrapper>,
            );
            const computed = window.getComputedStyle(getElement(".mantine-NumberInput-input"));

            expect(computed.height).toBe("24px");
            expect(computed.minHeight).toBe("24px");
            expect(computed.fontSize).toBe("11px");
        });

        it("NativeSelect draws 22px inside its 1px outlined border, a 24px box", () => {
            render(
                <ThemeWrapper>
                    <NativeSelect label="Test" aria-label="Test" data={["A", "B"]} />
                </ThemeWrapper>,
            );
            const computed = window.getComputedStyle(getElement(".mantine-NativeSelect-input"));

            expect(computed.height).toBe("22px");
            expect(computed.minHeight).toBe("0px");
            expect(computed.fontSize).toBe("11px");
        });

        it("Switch draws its 32x16 track", () => {
            render(
                <ThemeWrapper>
                    <Switch label="Test" aria-label="Test" />
                </ThemeWrapper>,
            );
            const computed = window.getComputedStyle(getElement(".mantine-Switch-track"));

            expect(computed.width).toBe("32px");
            expect(computed.height).toBe("16px");
        });
    });

    describe("Color Theme Consistency", () => {
        it("all compact inputs leave the inner input unfilled", () => {
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
            expect(bgColors[0]).toBe("rgba(0, 0, 0, 0)");
        });

        it("all compact input labels use the same secondary ink (#ffffffb2)", () => {
            render(
                <ThemeWrapper>
                    <TextInput label="Text Label" aria-label="Text" size="compact" />
                    <NumberInput label="Number Label" aria-label="Number" size="compact" />
                    <NativeSelect label="Native Label" aria-label="Native" size="compact" data={["A", "B"]} />
                </ThemeWrapper>,
            );
            const textLabel = getElement(".mantine-TextInput-label");
            const numberLabel = getElement(".mantine-NumberInput-label");
            const nativeLabel = getElement(".mantine-NativeSelect-label");

            const colors = [textLabel, numberLabel, nativeLabel].map((el) => window.getComputedStyle(el).color);

            // NativeSelect is in this list on purpose: it is one of the two inputs the
            // app still extends itself (the library publishes no extension for it), so
            // it is the case that proves the app's own label ink still agrees with the
            // library's. PANEL_INK.CHROME = dark-1 = rgb(163, 168, 177); the former
            // dimmed dark-2 (#7a828e) failed WCAG AA at 11px.
            expect(new Set(colors).size).toBe(1);
            expect(colors[0]).toBe("rgba(255, 255, 255, 0.698)");
        });
    });
});
