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

    it("exports NativeSelect extension (spec 6.7: the outlined trigger)", () => {
        expect(inputComponentExtensions.NativeSelect).toBeDefined();
    });

    it("exports ColorInput extension (spec 6.7: a filled field with a chit)", () => {
        expect(inputComponentExtensions.ColorInput).toBeDefined();
    });

    it("exports all 15 input components", () => {
        const components = Object.keys(inputComponentExtensions);
        expect(components).toHaveLength(15);
        expect(components).toContain("NativeSelect");
        expect(components).toContain("ColorInput");
        expect(components).toContain("TextInput");
        expect(components).toContain("NumberInput");
        expect(components).toContain("Select");
        expect(components).toContain("Textarea");
        expect(components).toContain("PasswordInput");
        expect(components).toContain("Autocomplete");
        expect(components).toContain("MultiSelect");
        expect(components).toContain("TagsInput");
        expect(components).toContain("PillsInput");
        expect(components).toContain("FileInput");
        expect(components).toContain("JsonInput");
        expect(components).toContain("InputClearButton");
        expect(components).toContain("ComboboxTarget");
    });
});

describe("Textarea autosize floor", () => {
    const vars = inputComponentExtensions.Textarea.vars as unknown as (
        theme: unknown,
        props: Record<string, unknown>,
    ) => { wrapper: Record<string, string> };

    it("keeps the fixed 56px floor without autosize", () => {
        expect(vars({}, { size: "sm" }).wrapper["--input-height"]).toBe("56px");
    });

    it("floors an autosize field at its minRows lines", () => {
        expect(vars({}, { size: "sm", autosize: true, minRows: 2 }).wrapper["--input-height"]).toBe(
            "calc(2 * var(--input-line-height) + 2 * var(--input-padding-y))",
        );
        expect(vars({}, { autosize: true }).wrapper["--input-height"]).toContain("calc(1 *");
        // What Mantine's Textarea actually hands the styles API while autosizing.
        expect(vars({}, { maxRows: 4 }).wrapper["--input-height"]).toContain("calc(1 *");
    });
});
