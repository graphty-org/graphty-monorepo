import { describe, expect, it } from "vitest";

import { displayComponentExtensions } from "../../src/theme/components/display";

describe("displayComponentExtensions", () => {
    it("exports Badge extension", () => {
        expect(displayComponentExtensions.Badge).toBeDefined();
    });

    it("exports Pill extension", () => {
        expect(displayComponentExtensions.Pill).toBeDefined();
    });

    it("exports exactly 2 display components", () => {
        const components = Object.keys(displayComponentExtensions);
        expect(components).toHaveLength(2);
        expect(components).toContain("Badge");
        expect(components).toContain("Pill");
    });
});
