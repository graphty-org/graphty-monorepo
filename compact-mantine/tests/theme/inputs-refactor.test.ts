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

        it("all input components default to variant filled", () => {
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
                expect(
                    ext.defaultProps?.variant,
                    `${name} should default to filled`,
                ).toBe("filled");
            }
        });

        it("InputClearButton defaults to size xs", () => {
            const extension = inputComponentExtensions.InputClearButton;
            expect(extension.defaultProps?.size).toBe("xs");
        });
    });

    describe("styles are static", () => {
        it("TextInput uses static styles (not function)", () => {
            const extension = inputComponentExtensions.TextInput;
            // After refactor, styles should be an object, not a function
            expect(typeof extension.styles).toBe("object");
        });

        it("NumberInput uses static styles (not function)", () => {
            const extension = inputComponentExtensions.NumberInput;
            expect(typeof extension.styles).toBe("object");
        });

        it("Select uses static styles (not function)", () => {
            const extension = inputComponentExtensions.Select;
            expect(typeof extension.styles).toBe("object");
        });

        it("Textarea uses static styles (not function)", () => {
            const extension = inputComponentExtensions.Textarea;
            expect(typeof extension.styles).toBe("object");
        });

        it("PasswordInput uses static styles (not function)", () => {
            const extension = inputComponentExtensions.PasswordInput;
            expect(typeof extension.styles).toBe("object");
        });

        it("Autocomplete uses static styles (not function)", () => {
            const extension = inputComponentExtensions.Autocomplete;
            expect(typeof extension.styles).toBe("object");
        });

        it("MultiSelect uses static styles (not function)", () => {
            const extension = inputComponentExtensions.MultiSelect;
            expect(typeof extension.styles).toBe("object");
        });

        it("TagsInput uses static styles (not function)", () => {
            const extension = inputComponentExtensions.TagsInput;
            expect(typeof extension.styles).toBe("object");
        });

        it("PillsInput uses static styles (not function)", () => {
            const extension = inputComponentExtensions.PillsInput;
            expect(typeof extension.styles).toBe("object");
        });

        it("FileInput uses static styles (not function)", () => {
            const extension = inputComponentExtensions.FileInput;
            expect(typeof extension.styles).toBe("object");
        });

        it("JsonInput uses static styles (not function)", () => {
            const extension = inputComponentExtensions.JsonInput;
            expect(typeof extension.styles).toBe("object");
        });
    });

    describe("z-index defaults for dropdown components", () => {
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
