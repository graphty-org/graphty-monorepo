import { compactThemeOverride } from "@graphty/compact-mantine";
import { DEFAULT_THEME, type MantineTheme, mergeMantineTheme } from "@mantine/core";
import { describe, expect, it } from "vitest";

import { theme } from "../theme";

/**
 * The shape of the one thing this suite pokes at: a component entry on a theme
 * override. Mantine types `vars` and `styles` as `any` on `MantineThemeComponent`,
 * which would make every call below an unsafe-call lint error, so they are narrowed
 * to the two call signatures the library actually uses.
 */
interface ComponentEntry {
    vars?: (
        componentTheme: MantineTheme,
        props: Record<string, unknown>,
        ctx: Record<string, unknown>,
    ) => Record<string, Record<string, string>>;
    styles?: unknown;
    defaultProps?: Record<string, unknown>;
}

const resolvedTheme = mergeMantineTheme(DEFAULT_THEME, theme);

/**
 * Reads a component entry off the merged theme, failing loudly rather than
 * returning undefined -- a missing entry is the regression these tests exist for.
 */
function entry(name: string): ComponentEntry {
    const component = resolvedTheme.components[name] as ComponentEntry | undefined;
    expect(component, `theme.components.${name} is missing`).toBeTruthy();
    return component!;
}

/**
 * Resolves a component's theme-level `vars` at its DEFAULT size, which is the size
 * every compact-mantine row type renders its controls at.
 */
function varsAtDefaultSize(name: string): Record<string, Record<string, string>> {
    const component = entry(name);
    expect(component.vars, `theme.components.${name}.vars is missing`).toBeTypeOf("function");
    return component.vars!(resolvedTheme, {}, {});
}

describe("theme merge", () => {
    describe("library component extensions survive the merge", () => {
        // The regression guard. mergeThemeOverrides -> deepMerge recurses into plain
        // objects only (`isObject()` is false for a function), so an app-side `vars` or
        // `styles` function REPLACES the library's instead of composing with it. An app
        // extension for a component the library already extends therefore deletes the
        // library's compact treatment, which is how the shell's inputs silently went
        // back to Mantine's 36px box. Reference equality is the cheapest way to prove
        // no app extension has shadowed a library one.
        const libraryComponents = Object.keys(compactThemeOverride.components ?? {});

        it("covers the components the library extends", () => {
            expect(libraryComponents.length).toBeGreaterThan(20);
        });

        it.each(libraryComponents)("keeps @graphty/compact-mantine's vars and styles for %s", (name) => {
            const library = (compactThemeOverride.components ?? {})[name] as ComponentEntry;
            const merged = entry(name);

            expect(merged.vars).toBe(library.vars);
            expect(merged.styles).toBe(library.styles);
        });
    });

    describe("default-size inputs draw at the 24px control height", () => {
        // VOCAB section 11: control height 24px, 11px value ink. Both --input-height and
        // --input-size must be present -- Mantine reads `height` from the latter and
        // `min-height` from the former, so setting one alone leaves the other unresolved.
        it.each(["Select", "TextInput", "NumberInput", "PasswordInput", "Autocomplete"])(
            "%s resolves a 24px box",
            (name) => {
                const {wrapper} = varsAtDefaultSize(name);

                expect(wrapper["--input-height"]).toBe("24px");
                expect(wrapper["--input-size"]).toBe("24px");
                expect(wrapper["--input-fz"]).toBe("11px");
            },
        );

        it("gives Select the library's compact dropdown styles", () => {
            const styles = entry("Select").styles as Record<string, Record<string, unknown>>;

            expect(styles.option.fontSize).toBe(11);
            expect(styles.dropdown.padding).toBe(4);
        });
    });

    describe("controls the library sizes keep their compact metrics", () => {
        it("Switch is 28x16", () => {
            const {root} = varsAtDefaultSize("Switch");

            expect(root["--switch-width"]).toBe("28px");
            expect(root["--switch-height"]).toBe("16px");
        });

        it("Button is 24px tall at 11px", () => {
            const {root} = varsAtDefaultSize("Button");

            expect(root["--button-height"]).toBe("24px");
            expect(root["--button-fz"]).toBe("11px");
        });

        it("ActionIcon is 24px square", () => {
            expect(varsAtDefaultSize("ActionIcon").root["--ai-size"]).toBe("24px");
        });

        it.each([
            ["Checkbox", "--checkbox-size"],
            ["Radio", "--radio-size"],
        ] as const)("%s is 16px", (name, variable) => {
            expect(varsAtDefaultSize(name).root[variable]).toBe("16px");
        });

        it("Badge is 14px tall and Pill 16px", () => {
            expect(varsAtDefaultSize("Badge").root["--badge-height"]).toBe("14px");
            expect(varsAtDefaultSize("Pill").root["--pill-height"]).toBe("16px");
        });

        it("Slider has a 4px track", () => {
            expect(varsAtDefaultSize("Slider").root["--slider-size"]).toBe("4px");
        });

        it("SegmentedControl labels at 10px", () => {
            expect(varsAtDefaultSize("SegmentedControl").root["--sc-font-size"]).toBe("10px");
        });
    });

    describe("the two inputs the app still extends itself", () => {
        // NativeSelect and ColorInput are the only inputs the library publishes no
        // extension for, so they are the app's job -- and unconditional, so a call site
        // that passes no size gets the same 24px box as everything else.
        it.each(["NativeSelect", "ColorInput"])("%s resolves a 24px box with both height vars", (name) => {
            const {wrapper} = varsAtDefaultSize(name);

            expect(wrapper["--input-height"]).toBe("24px");
            expect(wrapper["--input-size"]).toBe("24px");
            expect(wrapper["--input-fz"]).toBe("11px");
            expect(wrapper["--input-bd"]).toBe("transparent");
        });

        it.each(["NativeSelect", "ColorInput"])("%s keeps a paintable focus border", (name) => {
            // `transparent`, never `none`: `1px solid none` is an invalid declaration, so
            // the focus border could not paint at all.
            const {wrapper} = varsAtDefaultSize(name);

            expect(wrapper["--input-bd"]).not.toBe("none");
            expect(wrapper["--input-bd-focus"]).toContain("primary-color");
        });
    });

    it("keeps the app's dark ramp", () => {
        // The panel ground the whole shell is drawn on (#2a3035 field on #1f2428 panel).
        expect(resolvedTheme.colors.dark[6]).toBe("#2a3035");
        expect(resolvedTheme.colors.dark[7]).toBe("#1f2428");
    });

    it("keeps the library's panel grid on theme.other", () => {
        expect(resolvedTheme.other.panelGrid?.CONTROL_HEIGHT).toBe(24);
    });
});
