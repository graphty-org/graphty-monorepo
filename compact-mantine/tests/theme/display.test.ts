import { describe, expect, it } from "vitest";

import { displayComponentExtensions } from "../../src/theme/components/display";

describe("displayComponentExtensions", () => {
    it("exports Text extension", () => {
        expect(displayComponentExtensions.Text).toBeDefined();
    });

    it("exports Badge extension", () => {
        expect(displayComponentExtensions.Badge).toBeDefined();
    });

    it("exports Pill extension", () => {
        expect(displayComponentExtensions.Pill).toBeDefined();
    });

    it("exports Avatar extension", () => {
        expect(displayComponentExtensions.Avatar).toBeDefined();
    });

    it("exports ThemeIcon extension", () => {
        expect(displayComponentExtensions.ThemeIcon).toBeDefined();
    });

    it("exports Indicator extension", () => {
        expect(displayComponentExtensions.Indicator).toBeDefined();
    });

    it("exports Kbd extension", () => {
        expect(displayComponentExtensions.Kbd).toBeDefined();
    });

    it("exports exactly 7 display components", () => {
        const components = Object.keys(displayComponentExtensions);
        expect(components).toHaveLength(7);
        expect(components).toContain("Text");
        expect(components).toContain("Badge");
        expect(components).toContain("Pill");
        expect(components).toContain("Avatar");
        expect(components).toContain("ThemeIcon");
        expect(components).toContain("Indicator");
        expect(components).toContain("Kbd");
    });
});
