import { describe, expect, it } from "vitest";

import { buttonComponentExtensions } from "../../src/theme/components/buttons";

describe("buttonComponentExtensions", () => {
    it("exports Button extension", () => {
        expect(buttonComponentExtensions.Button).toBeDefined();
    });

    it("exports ActionIcon extension", () => {
        expect(buttonComponentExtensions.ActionIcon).toBeDefined();
    });

    it("exports CloseButton extension", () => {
        expect(buttonComponentExtensions.CloseButton).toBeDefined();
    });

    it("exports exactly 3 button components", () => {
        const components = Object.keys(buttonComponentExtensions);
        expect(components).toHaveLength(3);
        expect(components).toContain("Button");
        expect(components).toContain("ActionIcon");
        expect(components).toContain("CloseButton");
    });
});
