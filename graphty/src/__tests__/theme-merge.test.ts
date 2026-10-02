import { compactThemeOverride, PANEL_GRID } from "@graphty/compact-mantine";
import { DEFAULT_THEME, mergeMantineTheme } from "@mantine/core";
import { describe, expect, it } from "vitest";

import { theme } from "../theme";

const resolvedTheme = mergeMantineTheme(DEFAULT_THEME, theme);

describe("theme", () => {
    // The regression this suite exists for: an app-side extension of a component the library
    // already extends REPLACES the library's `vars` / `styles` functions under
    // mergeThemeOverrides (its deepMerge does not recurse into functions), which once sent
    // fifteen controls back to Mantine's 36px box. The app now mounts the library's theme
    // itself, so there is nothing left to merge and nothing that can shadow it.
    it("is the library's theme with the AA option on, and nothing merged over it", () => {
        expect(theme.other?.compact).toEqual({ highContrast: true });
        expect(Object.keys(theme.components ?? {})).toEqual(Object.keys(compactThemeOverride.components ?? {}));
    });

    it("keeps every library component extension, NativeSelect and ColorInput included", () => {
        const library = compactThemeOverride.components ?? {};
        expect(Object.keys(library).length).toBeGreaterThan(20);
        for (const name of [...Object.keys(library), "NativeSelect", "ColorInput"]) {
            const merged = resolvedTheme.components[name];
            expect(merged, name).toBeDefined();
            expect(merged.styles, name).toBe(library[name]?.styles);
            expect(merged.classNames, name).toBe(library[name]?.classNames);
        }
    });

    it("draws the shell on Figma's neutral dark greys, not the old blue-grey ramp", () => {
        expect(resolvedTheme.colors.dark[7]).toBe("#2c2c2c");
        expect(resolvedTheme.colors.dark[6]).toBe("#383838");
    });

    it("switches the document to the AA tokens", () => {
        expect(document.documentElement.getAttribute("data-cm-contrast")).toBe("high");
    });

    it("keeps the library's panel grid on theme.other", () => {
        expect(resolvedTheme.other.panelGrid).toBe(PANEL_GRID);
        expect(resolvedTheme.other.panelGrid?.WIDTH).toBe(240);
        expect(resolvedTheme.other.panelGrid?.CONTROL_HEIGHT).toBe(24);
    });
});
