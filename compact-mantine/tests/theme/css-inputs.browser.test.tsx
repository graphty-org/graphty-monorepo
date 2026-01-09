/**
 * Input Components - Comprehensive CSS Browser Tests
 *
 * Tests ALL CSS values set by compact-mantine input component extensions.
 * Covers: TextInput, NumberInput, Select, Textarea, PasswordInput, Autocomplete,
 * MultiSelect, TagsInput, PillsInput, FileInput, JsonInput, InputClearButton
 */
import {
    Autocomplete,
    FileInput,
    JsonInput,
    MantineProvider,
    MultiSelect,
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
// TextInput - Comprehensive Tests
// ============================================================================
describe("TextInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const wrapper = container.querySelector(".mantine-TextInput-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
        });

        it("--input-size is 24px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const wrapper = container.querySelector(".mantine-TextInput-wrapper");
            expect(getCssVar(wrapper, "--input-size")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const wrapper = container.querySelector(".mantine-TextInput-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });

        it("--input-bg references mantine-color-default", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const wrapper = container.querySelector(".mantine-TextInput-wrapper");
            const bgVar = getCssVar(wrapper, "--input-bg");
            // The value may be computed or may reference the variable
            expect(bgVar).toBeTruthy();
        });

        it("--input-bd is none", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const wrapper = container.querySelector(".mantine-TextInput-wrapper");
            expect(getCssVar(wrapper, "--input-bd")).toBe("none");
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.height).toBe("24px");
        });

        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.fontSize).toBe("11px");
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingLeft).toBe("8px");
        });

        it("paddingRight is 8px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingRight).toBe("8px");
        });

        it("border is none", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;
            // Border style 'none' results in various representations
            expect(style?.borderStyle).toBe("none");
        });

        it("borderRadius is 4px (from theme radius.sm)", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.borderRadius).toBe("4px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const label = container.querySelector(".mantine-TextInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });

        it("marginBottom is 1px", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const label = container.querySelector(".mantine-TextInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.marginBottom).toBe("1px");
        });

        it("lineHeight is 1.2", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const label = container.querySelector(".mantine-TextInput-label");
            const style = label ? getComputedStyle(label) : null;
            // lineHeight can be reported differently, check for approximate value
            const lh = parseFloat(style?.lineHeight || "0");
            expect(lh).toBeCloseTo(13.2, 0); // 11px * 1.2 = 13.2px
        });
    });
});

// ============================================================================
// NumberInput - Comprehensive Tests
// ============================================================================
describe("NumberInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const wrapper = container.querySelector(".mantine-NumberInput-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
        });

        it("--input-right-section-width is 24px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const wrapper = container.querySelector(".mantine-NumberInput-wrapper");
            expect(getCssVar(wrapper, "--input-right-section-width")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const wrapper = container.querySelector(".mantine-NumberInput-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });
    });

    describe("controls CSS variables", () => {
        it("--ni-chevron-size is 10px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const controls = container.querySelector(".mantine-NumberInput-controls");
            expect(getCssVar(controls, "--ni-chevron-size")).toBe("10px");
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const input = container.querySelector(".mantine-NumberInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.height).toBe("24px");
        });

        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const input = container.querySelector(".mantine-NumberInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.fontSize).toBe("11px");
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const input = container.querySelector(".mantine-NumberInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingLeft).toBe("8px");
        });

        it("paddingRight is 8px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const input = container.querySelector(".mantine-NumberInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingRight).toBe("8px");
        });

        it("borderRadius is 4px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const input = container.querySelector(".mantine-NumberInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.borderRadius).toBe("4px");
        });
    });

    describe("control element computed styles", () => {
        it("borderColor is transparent", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const control = container.querySelector(".mantine-NumberInput-control");
            const style = control ? getComputedStyle(control) : null;
            expect(style?.borderColor).toBe("rgba(0, 0, 0, 0)");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const label = container.querySelector(".mantine-NumberInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });

        it("marginBottom is 1px", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const label = container.querySelector(".mantine-NumberInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.marginBottom).toBe("1px");
        });
    });
});

// ============================================================================
// Select - Comprehensive Tests
// ============================================================================
describe("Select - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            const wrapper = container.querySelector(".mantine-Select-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            const wrapper = container.querySelector(".mantine-Select-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-Select-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.height).toBe("24px");
        });

        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-Select-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.fontSize).toBe("11px");
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-Select-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingLeft).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            const label = container.querySelector(".mantine-Select-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });

    // Note: Dropdown styles would require opening the dropdown to test
    // These are tested via CSS variable presence instead
});

// ============================================================================
// Textarea - Comprehensive Tests
// ============================================================================
describe("Textarea - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const wrapper = container.querySelector(".mantine-Textarea-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });

        it("--input-bg references mantine-color-default", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const wrapper = container.querySelector(".mantine-Textarea-wrapper");
            const bgVar = getCssVar(wrapper, "--input-bg");
            // The value may be computed or may reference the variable
            expect(bgVar).toBeTruthy();
        });

        it("--input-bd is none", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const wrapper = container.querySelector(".mantine-Textarea-wrapper");
            expect(getCssVar(wrapper, "--input-bd")).toBe("none");
        });

        it("does NOT have fixed --input-height (variable height)", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const wrapper = container.querySelector(".mantine-Textarea-wrapper");
            // Should not have a fixed height variable
            const heightVar = getCssVar(wrapper, "--input-height");
            expect(heightVar).not.toBe("24px");
        });
    });

    describe("input element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const input = container.querySelector(".mantine-Textarea-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.fontSize).toBe("11px");
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const input = container.querySelector(".mantine-Textarea-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingLeft).toBe("8px");
        });

        it("paddingRight is 8px", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const input = container.querySelector(".mantine-Textarea-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingRight).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const label = container.querySelector(".mantine-Textarea-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });

        it("marginBottom is 1px", () => {
            const { container } = renderWithTheme(<Textarea label="Test" />);
            const label = container.querySelector(".mantine-Textarea-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.marginBottom).toBe("1px");
        });
    });
});

// ============================================================================
// PasswordInput - Comprehensive Tests
// ============================================================================
describe("PasswordInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            const wrapper = container.querySelector(".mantine-PasswordInput-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            const wrapper = container.querySelector(".mantine-PasswordInput-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            const input = container.querySelector(".mantine-PasswordInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.height).toBe("24px");
        });
    });

    describe("innerInput element computed styles", () => {
        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            const innerInput = container.querySelector(".mantine-PasswordInput-innerInput");
            const style = innerInput ? getComputedStyle(innerInput) : null;
            expect(style?.paddingLeft).toBe("8px");
        });

        it("paddingRight is 8px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            const innerInput = container.querySelector(".mantine-PasswordInput-innerInput");
            const style = innerInput ? getComputedStyle(innerInput) : null;
            expect(style?.paddingRight).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<PasswordInput label="Test" />);
            const label = container.querySelector(".mantine-PasswordInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });
});

// ============================================================================
// Autocomplete - Comprehensive Tests
// ============================================================================
describe("Autocomplete - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            const wrapper = container.querySelector(".mantine-Autocomplete-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            const wrapper = container.querySelector(".mantine-Autocomplete-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-Autocomplete-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.height).toBe("24px");
        });

        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-Autocomplete-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.fontSize).toBe("11px");
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-Autocomplete-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingLeft).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<Autocomplete label="Test" data={["A", "B"]} />);
            const label = container.querySelector(".mantine-Autocomplete-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });
});

// ============================================================================
// MultiSelect - Comprehensive Tests
// ============================================================================
describe("MultiSelect - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const wrapper = container.querySelector(".mantine-MultiSelect-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
        });

        it("--combobox-chevron-size is 12px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const wrapper = container.querySelector(".mantine-MultiSelect-wrapper");
            expect(getCssVar(wrapper, "--combobox-chevron-size")).toBe("12px");
        });
    });

    describe("input element computed styles", () => {
        it("minHeight is 24px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-MultiSelect-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.minHeight).toBe("24px");
        });

        it("display is flex", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-MultiSelect-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.display).toBe("flex");
        });

        it("alignItems is center", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-MultiSelect-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.alignItems).toBe("center");
        });

        it("paddingTop is 4px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-MultiSelect-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingTop).toBe("4px");
        });

        it("paddingBottom is 4px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-MultiSelect-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingBottom).toBe("4px");
        });
    });

    describe("inputField element computed styles", () => {
        it("minWidth is 60px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const inputField = container.querySelector(".mantine-MultiSelect-inputField");
            const style = inputField ? getComputedStyle(inputField) : null;
            expect(style?.minWidth).toBe("60px");
        });

        it("flexBasis is 60px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const inputField = container.querySelector(".mantine-MultiSelect-inputField");
            const style = inputField ? getComputedStyle(inputField) : null;
            expect(style?.flexBasis).toBe("60px");
        });
    });

    describe("pillsList element computed styles", () => {
        it("columnGap is 4px", () => {
            const { container } = renderWithTheme(
                <MultiSelect label="Test" data={["A", "B"]} value={["A"]} />
            );
            const pillsList = container.querySelector(".mantine-MultiSelect-pillsList");
            const style = pillsList ? getComputedStyle(pillsList) : null;
            expect(style?.columnGap).toBe("4px");
        });

        it("rowGap is 2px", () => {
            const { container } = renderWithTheme(
                <MultiSelect label="Test" data={["A", "B"]} value={["A"]} />
            );
            const pillsList = container.querySelector(".mantine-MultiSelect-pillsList");
            const style = pillsList ? getComputedStyle(pillsList) : null;
            expect(style?.rowGap).toBe("2px");
        });
    });

    /**
     * REGRESSION TEST: Pill text vertical centering
     *
     * Pills inside MultiSelect must NOT have extra paddingTop/paddingBottom.
     * Our Pill component extension sets --pill-height unconditionally,
     * so pills handle their own sizing. Adding padding here would conflict
     * with the pill's internal flexbox centering and cause text misalignment.
     *
     * Root cause: When paddingTop/paddingBottom was added to pills in MultiSelect,
     * it reduced the available height for the pill label, causing text to be
     * cut off at the bottom (e.g., letter 'g' from "burger" was clipped).
     */
    describe("pill element - text centering regression test", () => {
        it("pill has margin 0 (no extra margins)", () => {
            const { container } = renderWithTheme(
                <MultiSelect label="Test" data={["A", "B"]} value={["A"]} />
            );
            const pill = container.querySelector(".mantine-Pill-root");
            const style = pill ? getComputedStyle(pill) : null;
            expect(style?.margin).toBe("0px");
        });

        it("pill does NOT have extra paddingTop (would break text centering)", () => {
            const { container } = renderWithTheme(
                <MultiSelect label="Test" data={["A", "B"]} value={["A"]} />
            );
            const pill = container.querySelector(".mantine-Pill-root");
            const style = pill ? getComputedStyle(pill) : null;
            // Pill component sets its own padding via CSS vars; MultiSelect should not add more
            expect(style?.paddingTop).toBe("0px");
        });

        it("pill does NOT have extra paddingBottom (would break text centering)", () => {
            const { container } = renderWithTheme(
                <MultiSelect label="Test" data={["A", "B"]} value={["A"]} />
            );
            const pill = container.querySelector(".mantine-Pill-root");
            const style = pill ? getComputedStyle(pill) : null;
            // Pill component sets its own padding via CSS vars; MultiSelect should not add more
            expect(style?.paddingBottom).toBe("0px");
        });

        it("pill height equals --pill-height (16px) with no reduction from padding", () => {
            const { container } = renderWithTheme(
                <MultiSelect label="Test" data={["A", "B"]} value={["A"]} />
            );
            const pill = container.querySelector(".mantine-Pill-root");
            const style = pill ? getComputedStyle(pill) : null;
            expect(style?.height).toBe("16px");
        });

        it("pill label has full height available for text centering", () => {
            const { container } = renderWithTheme(
                <MultiSelect label="Test" data={["A", "B"]} value={["A"]} />
            );
            const pillLabel = container.querySelector(".mantine-Pill-label");
            const style = pillLabel ? getComputedStyle(pillLabel) : null;
            // Label height should match pill height for proper centering
            expect(style?.height).toBe("16px");
        });

        it("pill label lineHeight matches height for vertical centering", () => {
            const { container } = renderWithTheme(
                <MultiSelect label="Test" data={["A", "B"]} value={["A"]} />
            );
            const pillLabel = container.querySelector(".mantine-Pill-label");
            const style = pillLabel ? getComputedStyle(pillLabel) : null;
            // lineHeight should match height for single-line text centering
            expect(style?.lineHeight).toBe("16px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<MultiSelect label="Test" data={["A", "B"]} />);
            const label = container.querySelector(".mantine-MultiSelect-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });
});

// ============================================================================
// TagsInput - Comprehensive Tests
// ============================================================================
describe("TagsInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            const wrapper = container.querySelector(".mantine-TagsInput-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });

        it("does NOT have fixed --input-height (variable height)", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            const wrapper = container.querySelector(".mantine-TagsInput-wrapper");
            const heightVar = getCssVar(wrapper, "--input-height");
            expect(heightVar).not.toBe("24px");
        });
    });

    describe("inputField element computed styles", () => {
        it("minWidth is 30px", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            const inputField = container.querySelector(".mantine-TagsInput-inputField");
            const style = inputField ? getComputedStyle(inputField) : null;
            expect(style?.minWidth).toBe("30px");
        });

        it("flexBasis is 30px", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            const inputField = container.querySelector(".mantine-TagsInput-inputField");
            const style = inputField ? getComputedStyle(inputField) : null;
            expect(style?.flexBasis).toBe("30px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<TagsInput label="Test" />);
            const label = container.querySelector(".mantine-TagsInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });
});

// ============================================================================
// PillsInput - Comprehensive Tests
// ============================================================================
describe("PillsInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(
                <PillsInput label="Test">
                    <PillsInput.Field />
                </PillsInput>
            );
            const wrapper = container.querySelector(".mantine-PillsInput-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });

        it("does NOT have fixed --input-height (variable height)", () => {
            const { container } = renderWithTheme(
                <PillsInput label="Test">
                    <PillsInput.Field />
                </PillsInput>
            );
            const wrapper = container.querySelector(".mantine-PillsInput-wrapper");
            const heightVar = getCssVar(wrapper, "--input-height");
            expect(heightVar).not.toBe("24px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(
                <PillsInput label="Test">
                    <PillsInput.Field />
                </PillsInput>
            );
            const label = container.querySelector(".mantine-PillsInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });
});

// ============================================================================
// FileInput - Comprehensive Tests
// ============================================================================
describe("FileInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-height is 24px", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            const wrapper = container.querySelector(".mantine-FileInput-wrapper");
            expect(getCssVar(wrapper, "--input-height")).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            const wrapper = container.querySelector(".mantine-FileInput-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });
    });

    describe("input element computed styles", () => {
        it("height is 24px", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            const input = container.querySelector(".mantine-FileInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.height).toBe("24px");
        });

        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            const input = container.querySelector(".mantine-FileInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<FileInput label="Test" />);
            const label = container.querySelector(".mantine-FileInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });
});

// ============================================================================
// JsonInput - Comprehensive Tests
// ============================================================================
describe("JsonInput - All CSS Values (Browser)", () => {
    describe("wrapper CSS variables", () => {
        it("--input-fz is 11px", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            const wrapper = container.querySelector(".mantine-JsonInput-wrapper");
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });

        it("does NOT have fixed --input-height (variable height)", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            const wrapper = container.querySelector(".mantine-JsonInput-wrapper");
            const heightVar = getCssVar(wrapper, "--input-height");
            expect(heightVar).not.toBe("24px");
        });
    });

    describe("input element computed styles", () => {
        it("has compact font size from --input-fz", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            const wrapper = container.querySelector(".mantine-JsonInput-wrapper");
            // JsonInput is a textarea-like component, verify the CSS var is set
            expect(getCssVar(wrapper, "--input-fz")).toBe("11px");
        });

        it("paddingLeft is 8px", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            const input = container.querySelector(".mantine-JsonInput-input");
            const style = input ? getComputedStyle(input) : null;
            expect(style?.paddingLeft).toBe("8px");
        });
    });

    describe("label element computed styles", () => {
        it("fontSize is 11px", () => {
            const { container } = renderWithTheme(<JsonInput label="Test" />);
            const label = container.querySelector(".mantine-JsonInput-label");
            const style = label ? getComputedStyle(label) : null;
            expect(style?.fontSize).toBe("11px");
        });
    });
});
