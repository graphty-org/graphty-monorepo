import { describe, expect, it } from "vitest";

import { theme } from "../../theme";

describe("theme compliance", () => {
    describe("semantic color variables", () => {
        it("should not use hardcoded dark-8 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-8");
        });

        it("should not use hardcoded dark-7 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-7");
        });

        it("should not use hardcoded dark-2 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-2");
        });

        it("should use semantic color variables instead of hardcoded dark colors", () => {
            // The rule is "no colour that only works in dark mode". A `dark-N` PAIRED
            // inside `light-dark(light, dark)` is not that -- it is the correct way to
            // write both modes at once, and it is how `@graphty/compact-mantine`'s
            // PANEL_INK is written -- so the pairs are removed before the check and
            // what is left is the dark-only usage this guards against.
            const themeStr = JSON.stringify(theme).replace(/light-dark\((?:[^()]|\([^()]*\))*\)/g, "");

            expect(themeStr).not.toMatch(/--mantine-color-dark-[0-9]/);
        });
    });
});
