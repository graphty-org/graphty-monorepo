import {
    defaultVariantColorsResolver,
    getAutoContrastValue,
    getPrimaryShade,
    type MantineTheme,
    parseThemeColor,
    type VariantColorsResolver,
} from "@mantine/core";

/**
 * Text and glyphs on a filled colour, decided per colour scheme.
 *
 * The compact theme's primaryShade is { light: 8, dark: 5 }: a dark fill that
 * carries white text in the light scheme and a light fill that carries black
 * text in the dark one. Mantine's autoContrast cannot express that. Its
 * components pick black or white once, in JavaScript, from the LIGHT-scheme
 * shade, so every filled control in the dark scheme got white on blue-5
 * (2.99:1). The fix is to hand the browser both answers and let it choose with
 * `light-dark()`, which follows the `color-scheme` Mantine sets on the root.
 *
 * The same black-or-white rule as Mantine (theme.luminanceThreshold) is used,
 * only evaluated once per scheme. A colour whose answer is the same in both
 * schemes gets a plain value.
 * @param color - A theme colour name, `name.shade`, or any CSS colour; absent means the primary colour.
 * @param theme - The resolved theme.
 * @returns The CSS colour to paint text or glyphs on that fill.
 */
function schemeContrastColor(color: string | undefined, theme: MantineTheme): string {
    const ink = (colorScheme: "light" | "dark"): string =>
        parseThemeColor({ color: color ?? theme.primaryColor, theme, colorScheme }).isLight
            ? "var(--mantine-color-black)"
            : "var(--mantine-color-white)";
    const light = ink("light");
    const dark = ink("dark");
    return light === dark ? light : `light-dark(${light}, ${dark})`;
}

interface ContrastProps {
    color?: string;
    autoContrast?: boolean;
}

/**
 * The scheme-aware contrast colour for a component's `vars`, or undefined
 * when autoContrast is off for it (Mantine then paints its own default).
 * `theme` is optional because the theme regression suites call `vars()` bare.
 * @param theme - The resolved theme, if any.
 * @param props - The component's color and autoContrast props.
 * @returns A CSS colour, or undefined to leave Mantine's value alone.
 */
export function contrastVar(theme: MantineTheme | undefined, props: ContrastProps | undefined): string | undefined {
    if (!theme || !getAutoContrastValue(props?.autoContrast, theme)) {
        return undefined;
    }
    return schemeContrastColor(props?.color, theme);
}

/**
 * The track colour for a checked Switch.
 *
 * Mantine paints the Switch thumb and its on-label white on every fill and
 * never reads autoContrast, so a light dark-scheme fill cannot be answered
 * with black text as the other controls are. Instead, where a colour needs
 * black text in the dark scheme but white in the light one, the checked track
 * keeps the light scheme's shade in both schemes (blue-8 by default: white
 * 5.02:1). The white thumb carries the on/off state.
 * @param theme - The resolved theme, if any.
 * @param color - The Switch's color prop; absent means the primary colour.
 * @returns A CSS colour for --switch-color, or undefined to keep Mantine's.
 */
export function switchTrackColor(theme: MantineTheme | undefined, color: string | undefined): string | undefined {
    if (!theme) {
        return undefined;
    }
    const name = color ?? theme.primaryColor;
    const parsed = parseThemeColor({ color: name, theme });
    if (!parsed.isThemeColor || parsed.shade !== undefined) {
        return undefined;
    }
    if (schemeContrastColor(name, theme) !== "light-dark(var(--mantine-color-white), var(--mantine-color-black))") {
        return undefined;
    }
    return `var(--mantine-color-${parsed.color}-${getPrimaryShade(theme, "light")})`;
}

/**
 * Mantine's variant resolver, with the text on a `filled` variant chosen per
 * scheme (see schemeContrastColor). Covers Button, ActionIcon, Badge,
 * ThemeIcon, Avatar, Alert, Chip, NavLink and every other component that
 * resolves its colours through theme.variantColorResolver.
 * @param input - Mantine's resolver input.
 * @returns The variant colours.
 */
export const compactVariantColorResolver: VariantColorsResolver = (input) => {
    const colors = defaultVariantColorsResolver(input);
    if (input.variant === "filled" && getAutoContrastValue(input.autoContrast, input.theme)) {
        return { ...colors, color: schemeContrastColor(input.color, input.theme) };
    }
    return colors;
};
