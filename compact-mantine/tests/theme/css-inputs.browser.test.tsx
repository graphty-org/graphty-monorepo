/**
 * Input Components - Comprehensive CSS Browser Tests
 *
 * The computed values of every input the theme extends, at the compact default, on Figma's field
 * (design/figma-spec.md 6): the wrapper is the field (24 tall, `--cm-bg-secondary`, radius 5, a
 * transparent 1px outline slot at -1px), the input inside it is borderless and transparent with
 * an 8px text inset, and the label is the field-row legend's text (a 9/14 500 0.27px caption in
 * a 16px band, 4px above the field).
 * Covers: TextInput, NumberInput, Select, NativeSelect, Textarea, PasswordInput, Autocomplete,
 * MultiSelect, TagsInput, PillsInput, FileInput, JsonInput, ColorInput, InputClearButton.
 *
 * The Figma-capture comparisons, states and interactions are in tests/figma/inputs.browser.test.tsx.
 */
import {
    Autocomplete,
    ColorInput,
    FileInput,
    Input,
    JsonInput,
    MantineProvider,
    MultiSelect,
    NativeSelect,
    NumberInput,
    PasswordInput,
    PillsInput,
    Select,
    TagsInput,
    Textarea,
    TextInput,
} from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";
import { hex } from "../harness/measure";

/**
 * Render a component with the compact theme, light scheme.
 * @param ui - the element
 * @returns the render result
 */
function renderWithTheme(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme} forceColorScheme="light">
            {ui}
        </MantineProvider>,
    );
}

/**
 * A CSS variable's value on an element.
 * @param element - the element
 * @param varName - the variable
 * @returns its trimmed value
 */
function getCssVar(element: Element | null, varName: string): string {
    if (!element) {
        return "";
    }
    return getComputedStyle(element).getPropertyValue(varName).trim();
}

/**
 * The computed style of the first element matching a selector.
 * @param container - where to search
 * @param selector - the selector
 * @returns the computed style
 */
function styleOf(container: HTMLElement, selector: string): CSSStyleDeclaration {
    const el = container.querySelector(selector);
    expect(el, selector).not.toBeNull();
    return getComputedStyle(el as Element);
}

/** The filled field's wrapper: 24 tall, #f5f5f5, radius 5, transparent outline slot at -1px. */
function expectFilledField(style: CSSStyleDeclaration, height = "24px"): void {
    expect(style.height).toBe(height);
    expect(hex(style.backgroundColor)).toBe("#f5f5f5");
    expect(style.borderTopLeftRadius).toBe("5px");
    expect(style.borderTopWidth).toBe("0px");
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineWidth).toBe("1px");
    expect(style.outlineOffset).toBe("-1px");
    expect(hex(style.outlineColor)).toBe("#00000000");
}

/** The outlined field's wrapper: 24 tall, #fff, 1px #e6e6e6 border, radius 5. */
function expectOutlinedField(style: CSSStyleDeclaration): void {
    expect(style.height).toBe("24px");
    expect(hex(style.backgroundColor)).toBe("#ffffff");
    expect(style.borderTopWidth).toBe("1px");
    expect(hex(style.borderTopColor)).toBe("#e6e6e6");
    expect(style.borderTopLeftRadius).toBe("5px");
}

/** The input inside a field: borderless, transparent, 11/16 450 0.055px. */
function expectBareInput(style: CSSStyleDeclaration): void {
    expect(style.borderTopWidth).toBe("0px");
    expect(hex(style.backgroundColor)).toBe("#00000000");
    expect(style.fontSize).toBe("11px");
    expect(style.lineHeight).toBe("16px");
    expect(style.fontWeight).toBe("450");
    expect(style.letterSpacing).toBe("0.055px");
}

/**
 * The field-row legend label (ii/number-input-default #24/#25): the text a 9/14 500 caption with
 * 0.27px tracking in the secondary ink, in a 16px band, 4px above the field.
 */
function expectLegendLabel(style: CSSStyleDeclaration): void {
    expect(style.fontSize).toBe("9px");
    expect(style.lineHeight).toBe("14px");
    expect(style.fontWeight).toBe("500");
    expect(style.letterSpacing).toBe("0.27px");
    expect(hex(style.color)).toBe("#00000080");
    expect(style.minHeight).toBe("16px");
    expect(style.alignItems).toBe("center");
    expect(style.marginBottom).toBe("4px");
}

// ============================================================================
// TextInput
// ============================================================================
describe("TextInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-TextInput-wrapper"), "--input-height")).toBe("24px");
        });

        it("--input-size is 24px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-TextInput-wrapper"), "--input-size")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-TextInput-wrapper"), "--input-fz")).toBe("11px");
        });

        it("the wrapper is the filled field", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expectFilledField(styleOf(container, ".mantine-TextInput-wrapper"));
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expect(styleOf(container, ".mantine-TextInput-input").height).toBe("24px");
        });

        it("is borderless and transparent, 11/16 450", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expectBareInput(styleOf(container, ".mantine-TextInput-input"));
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expect(styleOf(container, ".mantine-TextInput-input").paddingLeft).toBe("8px");
        });

        it("paddingRight is 8px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expect(styleOf(container, ".mantine-TextInput-input").paddingRight).toBe("8px");
        });

        it("text color is --cm-text", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expect(hex(styleOf(container, ".mantine-TextInput-input").color)).toBe("#000000e5");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            expectLegendLabel(styleOf(container, ".mantine-TextInput-label"));
        });
    });

    describe("outlined variant", () => {
        it("is --cm-bg with a 1px --cm-border border, text 8 in", () => {
            const { container } = renderWithTheme(<TextInput label="Test" variant="outlined" />);
            expectOutlinedField(styleOf(container, ".mantine-TextInput-wrapper"));
            const input = styleOf(container, ".mantine-TextInput-input");
            expect(input.height).toBe("22px");
            expect(input.paddingLeft).toBe("7px");
        });
    });
});

// ============================================================================
// NumberInput
// ============================================================================
describe("NumberInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-NumberInput-wrapper"), "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-NumberInput-wrapper"), "--input-fz")).toBe("11px");
        });

        it("the wrapper is the filled field", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expectFilledField(styleOf(container, ".mantine-NumberInput-wrapper"));
        });
    });

    describe("controls", () => {
        it("draws no stepper chevrons by default", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expect(container.querySelector(".mantine-NumberInput-controls")).toBeNull();
        });

        it("still draws them for a caller who asks", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" hideControls={false} />);
            expect(container.querySelector(".mantine-NumberInput-controls")).not.toBeNull();
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expect(styleOf(container, ".mantine-NumberInput-input").height).toBe("24px");
        });

        it("is borderless and transparent, 11/16 450", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expectBareInput(styleOf(container, ".mantine-NumberInput-input"));
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expect(styleOf(container, ".mantine-NumberInput-input").paddingLeft).toBe("8px");
        });

        it("paddingRight is 8px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expect(styleOf(container, ".mantine-NumberInput-input").paddingRight).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            expectLegendLabel(styleOf(container, ".mantine-NumberInput-label"));
        });
    });
});

// ============================================================================
// Select
// ============================================================================
describe("Select - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            expect(getCssVar(container.querySelector(".mantine-Select-wrapper"), "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            expect(getCssVar(container.querySelector(".mantine-Select-wrapper"), "--input-fz")).toBe("11px");
        });

        it("the wrapper is the outlined trigger", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            expectOutlinedField(styleOf(container, ".mantine-Select-wrapper"));
        });
    });

    describe("input element computed styles", () => {
        it("height is 22px inside the 1px border", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-Select-input").height).toBe("22px");
        });

        it("is borderless and transparent, 11/16 450", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            expectBareInput(styleOf(container, ".mantine-Select-input"));
        });

        it("paddingLeft is 8px (text 9 in with the border)", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-Select-input").paddingLeft).toBe("8px");
        });

        it("reserves the 24px caret slot", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-Select-input").paddingRight).toBe("24px");
            expect(styleOf(container, ".mantine-Select-section").width).toBe("24px");
        });

        it("the caret is 5 x 3 in --cm-icon (the Figma path fill)", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            const caret = container.querySelector(".cm-field-caret path") as SVGPathElement;
            const box = caret.getBoundingClientRect();
            expect(box.width).toBeCloseTo(5, 0);
            expect(box.height).toBeCloseTo(3, 0);
            expect(hex(styleOf(container, ".cm-field-caret").color)).toBe("#000000e5");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            expectLegendLabel(styleOf(container, ".mantine-Select-label"));
        });
    });

    describe("filled variant", () => {
        it("is still available", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} variant="filled" />);
            expectFilledField(styleOf(container, ".mantine-Select-wrapper"));
        });
    });
});

// ============================================================================
// NativeSelect
// ============================================================================
describe("NativeSelect - All CSS Values (Browser)", () => {
    it("the wrapper is the outlined trigger", () => {
        const { container } = renderWithTheme(<NativeSelect label="Test" data={["A", "B"]} />);
        expectOutlinedField(styleOf(container, ".mantine-NativeSelect-wrapper"));
    });

    it("the select is borderless, 11/16 450, text 8 in", () => {
        const { container } = renderWithTheme(<NativeSelect label="Test" data={["A", "B"]} />);
        const style = styleOf(container, ".mantine-NativeSelect-input");
        expectBareInput(style);
        expect(style.paddingLeft).toBe("8px");
    });

    it("draws the caret", () => {
        const { container } = renderWithTheme(<NativeSelect label="Test" data={["A", "B"]} />);
        expect(container.querySelector(".cm-field-caret")).not.toBeNull();
    });

    it("the label is the field-row legend", () => {
        const { container } = renderWithTheme(<NativeSelect label="Test" data={["A", "B"]} />);
        expectLegendLabel(styleOf(container, ".mantine-NativeSelect-label"));
    });
});

// ============================================================================
// Textarea
// ============================================================================
describe("Textarea - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-Textarea-wrapper"), "--input-fz")).toBe("11px");
        });

        it("--input-height is the 56px minimum, not a fixed height (the field grows)", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const wrapper = container.querySelector(".mantine-Textarea-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("56px");
            expect(getCssVar(wrapper, "--input-size")).not.toBe("56px");
        });

        it("the wrapper is the filled field, 56 tall", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            expectFilledField(styleOf(container, ".mantine-Textarea-wrapper"), "56px");
        });
    });

    describe("input element computed styles", () => {
        it("is borderless and transparent, 11/16 450", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            expectBareInput(styleOf(container, ".mantine-Textarea-input"));
        });

        it("padding is 4px 8px", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const style = styleOf(container, ".mantine-Textarea-input");
            expect(style.paddingTop).toBe("4px");
            expect(style.paddingBottom).toBe("4px");
            expect(style.paddingLeft).toBe("8px");
            expect(style.paddingRight).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            expectLegendLabel(styleOf(container, ".mantine-Textarea-label"));
        });
    });
});

// ============================================================================
// PasswordInput
// ============================================================================
describe("PasswordInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-PasswordInput-wrapper"), "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-PasswordInput-wrapper"), "--input-fz")).toBe("11px");
        });

        it("the wrapper is the filled field", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            expectFilledField(styleOf(container, ".mantine-PasswordInput-wrapper"));
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            expect(styleOf(container, ".mantine-PasswordInput-input").height).toBe("24px");
        });
    });

    describe("innerInput element computed styles", () => {
        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            expect(styleOf(container, ".mantine-PasswordInput-innerInput").paddingLeft).toBe("8px");
        });

        it("paddingRight leaves the 24px toggle slot", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            expect(styleOf(container, ".mantine-PasswordInput-innerInput").paddingRight).toBe("24px");
        });

        it("text is 11px 450", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            const style = styleOf(container, ".mantine-PasswordInput-innerInput");
            expect(style.fontSize).toBe("11px");
            expect(style.fontWeight).toBe("450");
        });
    });

    describe("visibility toggle", () => {
        it("is a 24px button", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            const toggle = container.querySelector(".mantine-PasswordInput-visibilityToggle") as HTMLElement;
            expect(toggle.getBoundingClientRect().width).toBe(24);
            expect(toggle.getBoundingClientRect().height).toBe(24);
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            expectLegendLabel(styleOf(container, ".mantine-PasswordInput-label"));
        });
    });
});

// ============================================================================
// Autocomplete
// ============================================================================
describe("Autocomplete - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            expect(getCssVar(container.querySelector(".mantine-Autocomplete-wrapper"), "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            expect(getCssVar(container.querySelector(".mantine-Autocomplete-wrapper"), "--input-fz")).toBe("11px");
        });

        it("the wrapper is the filled field", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            expectFilledField(styleOf(container, ".mantine-Autocomplete-wrapper"));
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-Autocomplete-input").height).toBe("24px");
        });

        it("is borderless and transparent, 11/16 450", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            expectBareInput(styleOf(container, ".mantine-Autocomplete-input"));
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-Autocomplete-input").paddingLeft).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            expectLegendLabel(styleOf(container, ".mantine-Autocomplete-label"));
        });
    });
});

// ============================================================================
// MultiSelect
// ============================================================================
describe("MultiSelect - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is the 24px minimum", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expect(getCssVar(container.querySelector(".mantine-MultiSelect-wrapper"), "--input-height")).toBe("24px");
        });

        it("the wrapper is the filled field", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expectFilledField(styleOf(container, ".mantine-MultiSelect-wrapper"));
        });

        it("draws the caret", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expect(container.querySelector(".cm-field-caret")).not.toBeNull();
        });
    });

    describe("input element computed styles", () => {
        it("minHeight is 24px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-MultiSelect-input").minHeight).toBe("24px");
        });

        it("display is flex", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-MultiSelect-input").display).toBe("flex");
        });

        it("alignItems is center", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-MultiSelect-input").alignItems).toBe("center");
        });

        it("paddingTop is 2px (a 20px pill in the 24px field)", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-MultiSelect-input").paddingTop).toBe("2px");
        });

        it("paddingBottom is 2px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expect(styleOf(container, ".mantine-MultiSelect-input").paddingBottom).toBe("2px");
        });
    });

    describe("pillsList element computed styles", () => {
        it("columnGap is 4px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} value={["A"]} />);
            expect(styleOf(container, ".mantine-MultiSelect-pillsList").columnGap).toBe("4px");
        });

        it("rowGap is 2px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} value={["A"]} />);
            expect(styleOf(container, ".mantine-MultiSelect-pillsList").rowGap).toBe("2px");
        });
    });

    /**
     * REGRESSION TEST: Pill text vertical centering
     *
     * Pills inside MultiSelect must NOT have extra paddingTop/paddingBottom: that reduced the
     * height available to the pill label and clipped descenders (the 'g' of "burger"). The pill is
     * now Figma's variable pill (20 tall, 1px --cm-border edge), so its label has 18px inside the
     * edges and its line height fills them.
     */
    describe("pill element - text centering regression test", () => {
        it("pill has margin 0 (no extra margins)", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} value={["A"]} />);
            expect(styleOf(container, ".mantine-Pill-root").margin).toBe("0px");
        });

        it("pill does NOT have extra paddingTop (would break text centering)", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} value={["A"]} />);
            expect(styleOf(container, ".mantine-Pill-root").paddingTop).toBe("0px");
        });

        it("pill does NOT have extra paddingBottom (would break text centering)", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} value={["A"]} />);
            expect(styleOf(container, ".mantine-Pill-root").paddingBottom).toBe("0px");
        });

        it("pill is the 20px variable pill: --cm-bg, 1px --cm-border, radius 5, padding 0 4", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} value={["A"]} />);
            const style = styleOf(container, ".mantine-Pill-root");
            expect(style.height).toBe("20px");
            expect(hex(style.backgroundColor)).toBe("#ffffff");
            expect(hex(style.borderTopColor)).toBe("#e6e6e6");
            expect(style.borderTopLeftRadius).toBe("5px");
            expect(style.paddingLeft).toBe("4px");
        });

        it("pill label has the full 18px inside the edges", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} value={["A"]} />);
            expect(styleOf(container, ".mantine-Pill-label").height).toBe("18px");
        });

        it("pill label lineHeight matches its height for vertical centering", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} value={["A"]} />);
            expect(styleOf(container, ".mantine-Pill-label").lineHeight).toBe("18px");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            expectLegendLabel(styleOf(container, ".mantine-MultiSelect-label"));
        });
    });
});

// ============================================================================
// TagsInput
// ============================================================================
describe("TagsInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-TagsInput-wrapper"), "--input-fz")).toBe("11px");
        });

        it("--input-height is the 24px minimum, not a fixed height", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            const wrapper = container.querySelector(".mantine-TagsInput-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
            expect(getCssVar(wrapper, "--input-size")).not.toBe("24px");
        });

        it("the wrapper is the filled field", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            expectFilledField(styleOf(container, ".mantine-TagsInput-wrapper"));
        });
    });

    describe("inputField element computed styles", () => {
        it("text is 11/16 450", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            const style = styleOf(container, ".mantine-TagsInput-inputField");
            expect(style.fontSize).toBe("11px");
            expect(style.fontWeight).toBe("450");
        });

        it("pills are the 20px variable pill", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" defaultValue={["One"]} />);
            expect(styleOf(container, ".mantine-TagsInput-pill").height).toBe("20px");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            expectLegendLabel(styleOf(container, ".mantine-TagsInput-label"));
        });
    });
});

// ============================================================================
// PillsInput
// ============================================================================
describe("PillsInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(
                <PillsInput label="Test">
                    <PillsInput.Field />
                </PillsInput>,
            );
            expect(getCssVar(container.querySelector(".mantine-PillsInput-wrapper"), "--input-fz")).toBe("11px");
        });

        it("--input-height is the 24px minimum, not a fixed height", () => {
            const { container } = renderWithTheme(
                <PillsInput label="Test">
                    <PillsInput.Field />
                </PillsInput>,
            );
            const wrapper = container.querySelector(".mantine-PillsInput-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
            expect(getCssVar(wrapper, "--input-size")).not.toBe("24px");
        });

        it("the wrapper is the filled field", () => {
            const { container } = renderWithTheme(
                <PillsInput label="Test">
                    <PillsInput.Field />
                </PillsInput>,
            );
            expectFilledField(styleOf(container, ".mantine-PillsInput-wrapper"));
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(
                <PillsInput label="Test">
                    <PillsInput.Field />
                </PillsInput>,
            );
            expectLegendLabel(styleOf(container, ".mantine-PillsInput-label"));
        });
    });
});

// ============================================================================
// FileInput
// ============================================================================
describe("FileInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-FileInput-wrapper"), "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-FileInput-wrapper"), "--input-fz")).toBe("11px");
        });

        it("the wrapper is the filled field", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            expectFilledField(styleOf(container, ".mantine-FileInput-wrapper"));
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            expect(styleOf(container, ".mantine-FileInput-input").height).toBe("24px");
        });

        it("is borderless and transparent, 11/16 450", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            expectBareInput(styleOf(container, ".mantine-FileInput-input"));
        });

        it("the placeholder is --cm-text-tertiary", () => {
            const { container } = renderWithTheme(<FileInput label="Test" placeholder="Pick a file" />);
            expect(hex(styleOf(container, ".mantine-FileInput-placeholder").color)).toBe("#0000004d");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            expectLegendLabel(styleOf(container, ".mantine-FileInput-label"));
        });
    });
});

// ============================================================================
// JsonInput
// ============================================================================
describe("JsonInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            expect(getCssVar(container.querySelector(".mantine-JsonInput-wrapper"), "--input-fz")).toBe("11px");
        });

        it("--input-height is the 56px minimum, not a fixed height", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            const wrapper = container.querySelector(".mantine-JsonInput-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("56px");
            expect(getCssVar(wrapper, "--input-size")).not.toBe("56px");
        });
    });

    describe("input element computed styles", () => {
        it("is borderless and transparent", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            const style = styleOf(container, ".mantine-JsonInput-input");
            expect(style.borderTopWidth).toBe("0px");
            expect(hex(style.backgroundColor)).toBe("#00000000");
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            expect(styleOf(container, ".mantine-JsonInput-input").paddingLeft).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("is the field-row legend", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            expectLegendLabel(styleOf(container, ".mantine-JsonInput-label"));
        });
    });
});

// ============================================================================
// ColorInput
// ============================================================================
describe("ColorInput - All CSS Values (Browser)", () => {
    it("the wrapper is the filled field", () => {
        const { container } = renderWithTheme(<ColorInput label="Test" defaultValue="#1a1a1a" />);
        expectFilledField(styleOf(container, ".mantine-ColorInput-wrapper"));
    });

    it("the chit is 14px, radius 2, in a 24px slot; the text starts at 24", () => {
        const { container } = renderWithTheme(<ColorInput label="Test" defaultValue="#1a1a1a" />);
        const chit = styleOf(container, ".mantine-ColorInput-colorPreview");
        expect(chit.width).toBe("14px");
        expect(chit.borderTopLeftRadius).toBe("2px");
        expect(styleOf(container, ".mantine-ColorInput-input").paddingLeft).toBe("24px");
    });

    it("the label is the field-row legend", () => {
        const { container } = renderWithTheme(<ColorInput label="Test" />);
        expectLegendLabel(styleOf(container, ".mantine-ColorInput-label"));
    });
});

// ============================================================================
// InputClearButton
// ============================================================================
describe("InputClearButton - All CSS Values (Browser)", () => {
    it("is 16px with a 10px cross", () => {
        const { container } = renderWithTheme(<Input.ClearButton aria-label="Clear" />);
        const button = container.querySelector("button") as HTMLElement;
        expect(button.getBoundingClientRect().width).toBe(16);
        expect(getCssVar(button, "--cb-icon-size")).toBe("10px");
    });
});
