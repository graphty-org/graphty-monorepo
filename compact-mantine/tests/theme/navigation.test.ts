import { describe, expect, it } from "vitest";

import { navigationComponentExtensions } from "../../src/theme/components/navigation";

describe("navigationComponentExtensions", () => {
    it("exports Anchor extension", () => {
        expect(navigationComponentExtensions.Anchor).toBeDefined();
    });

    it("exports Burger extension", () => {
        expect(navigationComponentExtensions.Burger).toBeDefined();
    });

    it("exports NavLink extension", () => {
        expect(navigationComponentExtensions.NavLink).toBeDefined();
    });

    it("exports Pagination extension", () => {
        expect(navigationComponentExtensions.Pagination).toBeDefined();
    });

    it("exports Stepper extension", () => {
        expect(navigationComponentExtensions.Stepper).toBeDefined();
    });

    it("exports Tabs extension", () => {
        expect(navigationComponentExtensions.Tabs).toBeDefined();
    });

    it("exports TabsTab, the theme name Tabs.Tab reads its default props from", () => {
        expect(navigationComponentExtensions.TabsTab).toBeDefined();
    });

    it("exports exactly 7 navigation extensions", () => {
        const components = Object.keys(navigationComponentExtensions);
        expect(components).toHaveLength(7);
        expect(components).toContain("TabsTab");
        expect(components).toContain("Anchor");
        expect(components).toContain("Burger");
        expect(components).toContain("NavLink");
        expect(components).toContain("Pagination");
        expect(components).toContain("Stepper");
        expect(components).toContain("Tabs");
    });
});
