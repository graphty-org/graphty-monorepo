import { describe, expect, it } from "vitest";

import { inputComponentExtensions } from "../../src/theme/components/inputs";

describe("inputComponentExtensions", () => {
    it("exports TextInput extension", () => {
        expect(inputComponentExtensions.TextInput).toBeDefined();
    });

    it("exports NumberInput extension", () => {
        expect(inputComponentExtensions.NumberInput).toBeDefined();
    });

    it("exports Select extension", () => {
        expect(inputComponentExtensions.Select).toBeDefined();
    });

    it("exports Textarea extension", () => {
        expect(inputComponentExtensions.Textarea).toBeDefined();
    });

    it("exports PasswordInput extension", () => {
        expect(inputComponentExtensions.PasswordInput).toBeDefined();
    });

    it("exports Autocomplete extension", () => {
        expect(inputComponentExtensions.Autocomplete).toBeDefined();
    });

    it("exports ColorInput extension", () => {
        expect(inputComponentExtensions.ColorInput).toBeDefined();
    });

    it("exports Checkbox extension", () => {
        expect(inputComponentExtensions.Checkbox).toBeDefined();
    });

    it("exports MultiSelect extension", () => {
        expect(inputComponentExtensions.MultiSelect).toBeDefined();
    });

    it("exports TagsInput extension", () => {
        expect(inputComponentExtensions.TagsInput).toBeDefined();
    });

    it("exports PillsInput extension", () => {
        expect(inputComponentExtensions.PillsInput).toBeDefined();
    });

    it("exports FileInput extension", () => {
        expect(inputComponentExtensions.FileInput).toBeDefined();
    });

    it("exports JsonInput extension", () => {
        expect(inputComponentExtensions.JsonInput).toBeDefined();
    });

    it("exports all 14 input components", () => {
        const components = Object.keys(inputComponentExtensions);
        expect(components).toHaveLength(14);
        expect(components).toContain("TextInput");
        expect(components).toContain("NumberInput");
        expect(components).toContain("Select");
        expect(components).toContain("Textarea");
        expect(components).toContain("PasswordInput");
        expect(components).toContain("Autocomplete");
        expect(components).toContain("ColorInput");
        expect(components).toContain("Checkbox");
        expect(components).toContain("MultiSelect");
        expect(components).toContain("TagsInput");
        expect(components).toContain("PillsInput");
        expect(components).toContain("FileInput");
        expect(components).toContain("JsonInput");
        expect(components).toContain("InputClearButton");
    });
});
