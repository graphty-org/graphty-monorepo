import { describe, expect, it } from "vitest";

import { inputComponentExtensions } from "../../src/theme/components/inputs";

/**
 * Tests for the refactored input components.
 * These tests verify that input components use defaultProps for compact sizing
 * instead of conditional logic.
 */
describe("Input Component Extensions (Refactored)", () => {
    describe("defaultProps", () => {
        it("TextInput defaults to size sm", () => {
            const extension = inputComponentExtensions.TextInput;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("TextInput defaults to variant filled", () => {
            const extension = inputComponentExtensions.TextInput;
            expect(extension.defaultProps?.variant).toBe("filled");
        });

        it("all input components default to size sm", () => {
            const inputComponents = [
                "TextInput",
                "NumberInput",
                "Select",
                "Textarea",
                "PasswordInput",
                "Autocomplete",
                "MultiSelect",
                "TagsInput",
                "PillsInput",
                "FileInput",
                "JsonInput",
            ] as const;

            for (const name of inputComponents) {
                const ext =
                    inputComponentExtensions[
                        name as keyof typeof inputComponentExtensions
                    ];
                expect(ext.defaultProps?.size, `${name} should default to sm`).toBe(
                    "sm",
                );
            }
        });

        it("filled fields default to variant filled", () => {
            const inputComponents = [
                "TextInput",
                "NumberInput",
                "Textarea",
                "PasswordInput",
                "Autocomplete",
                "MultiSelect",
                "TagsInput",
                "PillsInput",
                "FileInput",
                "JsonInput",
                "ColorInput",
            ] as const;

            for (const name of inputComponents) {
                const ext = inputComponentExtensions[name];
                expect(ext.defaultProps?.variant, `${name} should default to filled`).toBe("filled");
            }
        });

        // Spec 6.4: the select trigger is Figma's one outlined field.
        it("Select and NativeSelect default to variant outlined", () => {
            expect(inputComponentExtensions.Select.defaultProps?.variant).toBe("outlined");
            expect(inputComponentExtensions.NativeSelect.defaultProps?.variant).toBe("outlined");
        });

        // Spec 6.1: no stepper chevrons.
        it("NumberInput hides its steppers by default", () => {
            expect(inputComponentExtensions.NumberInput.defaultProps?.hideControls).toBe(true);
        });

        it("InputClearButton defaults to size xs", () => {
            const extension = inputComponentExtensions.InputClearButton;
            expect(extension.defaultProps?.size).toBe("xs");
        });
    });

    // The look is the stylesheet (src/theme/css/inputs.css.ts), reached through
    // classNames; no extension writes inline styles that would beat it.
    describe("the look comes from the stylesheet", () => {
        const fields = [
            "TextInput",
            "NumberInput",
            "Select",
            "NativeSelect",
            "Textarea",
            "PasswordInput",
            "Autocomplete",
            "MultiSelect",
            "TagsInput",
            "PillsInput",
            "FileInput",
            "JsonInput",
            "ColorInput",
        ] as const;

        it.each(fields)("%s has no inline styles", (name) => {
            expect(inputComponentExtensions[name].styles).toBeUndefined();
        });

        it.each(fields)("%s puts the field classes on its wrapper and input", (name) => {
            const classNames = inputComponentExtensions[name].classNames as (
                theme: unknown,
                props: Record<string, unknown>,
            ) => Record<string, string>;
            const variant = inputComponentExtensions[name].defaultProps?.variant as string;
            const resolved = classNames({}, { variant });
            expect(resolved.wrapper).toContain("cm-field");
            expect(resolved.wrapper).toContain("cm-input-wrapper");
            expect(resolved.input).toBe("cm-input");
        });

        it("the outlined variant adds cm-field-outlined; unstyled opts out", () => {
            const classNames = inputComponentExtensions.TextInput.classNames as (
                theme: unknown,
                props: Record<string, unknown>,
            ) => Record<string, string>;
            expect(classNames({}, { variant: "outlined" }).wrapper).toContain("cm-field-outlined");
            expect(classNames({}, { variant: "filled" }).wrapper).not.toContain("cm-field-outlined");
            expect(classNames({}, { variant: "unstyled" })).toEqual({});
        });

        it.each(["Select", "Autocomplete", "MultiSelect", "TagsInput"] as const)(
            "%s draws its dropdown as the dark listbox",
            (name) => {
                const classNames = inputComponentExtensions[name].classNames as (
                    theme: unknown,
                    props: Record<string, unknown>,
                ) => Record<string, string>;
                const resolved = classNames({}, {});
                expect(resolved.dropdown).toContain("cm-menu-surface");
                expect(resolved.dropdown).toContain("cm-listbox");
                expect(resolved.option).toContain("cm-menu-row");
            },
        );
    });

    describe("z-index and motion defaults for dropdown components", () => {
        it.each(["Select", "Autocomplete", "MultiSelect", "TagsInput"] as const)(
            "%s opens its list with no animation",
            (name) => {
                expect(inputComponentExtensions[name].defaultProps?.comboboxProps?.transitionProps?.duration).toBe(0);
            },
        );

        it("Select has comboboxProps with zIndex", () => {
            const extension = inputComponentExtensions.Select;
            expect(extension.defaultProps?.comboboxProps).toBeDefined();
            expect(extension.defaultProps?.comboboxProps?.zIndex).toBeDefined();
        });

        it("Autocomplete has comboboxProps with zIndex", () => {
            const extension = inputComponentExtensions.Autocomplete;
            expect(extension.defaultProps?.comboboxProps).toBeDefined();
            expect(extension.defaultProps?.comboboxProps?.zIndex).toBeDefined();
        });

        it("MultiSelect has comboboxProps with zIndex", () => {
            const extension = inputComponentExtensions.MultiSelect;
            expect(extension.defaultProps?.comboboxProps).toBeDefined();
            expect(extension.defaultProps?.comboboxProps?.zIndex).toBeDefined();
        });

        it("TagsInput has comboboxProps with zIndex", () => {
            const extension = inputComponentExtensions.TagsInput;
            expect(extension.defaultProps?.comboboxProps).toBeDefined();
            expect(extension.defaultProps?.comboboxProps?.zIndex).toBeDefined();
        });
    });
});
