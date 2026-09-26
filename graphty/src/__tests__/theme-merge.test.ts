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
    it("is the library's theme, with nothing merged over it", () => {
        expect(theme).toBe(compactThemeOverride);
    });

    it("keeps every library component extension", () => {
        const library = Object.keys(compactThemeOverride.components ?? {});
        expect(library.length).toBeGreaterThan(20);
        for (const name of library) {
            expect(resolvedTheme.components[name], name).toBe((compactThemeOverride.components ?? {})[name]);
        }
    });

    it("takes NativeSelect and ColorInput from the library, which now themes both", () => {
        expect(resolvedTheme.components.NativeSelect).toBe(compactThemeOverride.components?.NativeSelect);
        expect(resolvedTheme.components.ColorInput).toBe(compactThemeOverride.components?.ColorInput);
    });

    it("draws the shell on Figma's neutral dark greys, not the old blue-grey ramp", () => {
        expect(resolvedTheme.colors.dark[7]).toBe("#2c2c2c");
        expect(resolvedTheme.colors.dark[6]).toBe("#383838");
    });

    it("keeps the library's panel grid on theme.other", () => {
        expect(resolvedTheme.other.panelGrid).toBe(PANEL_GRID);
        expect(resolvedTheme.other.panelGrid?.WIDTH).toBe(240);
        expect(resolvedTheme.other.panelGrid?.CONTROL_HEIGHT).toBe(24);
    });
});
