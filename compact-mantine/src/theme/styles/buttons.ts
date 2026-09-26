/**
 * Per-size and per-variant CSS variables for the button family (design/figma-spec.md 4).
 *
 * Sizes are CompactSizeScale entries (see ./size-scale.ts for why a keyed scale and not one frozen
 * object). Colours are per VARIANT and come from the `--cm-*` tokens: each look below is written
 * into Mantine's own variables (`--button-bg`, `--ai-bg`, ...) by the vars resolvers in
 * ../components/buttons.ts, and the states Mantine has no variable for (pressed, the resting
 * outline, the disabled fill, the shortcut ink) go into `--cm-btn-*` / `--cm-ai-*` variables that
 * ../css/buttons.css.ts reads.
 */

import type { CompactSizeScale, CompactVars } from "./size-scale";

/**
 * Button sizes. sm is Figma's md (24 tall, label inset 8), md is Figma's lg (32 tall, inset 12).
 * `--button-padding-x` is the LABEL's inline margin: the button itself has no padding, as in
 * Figma (C7), so an icon section can sit 4px from the edge.
 */
export const compactButtonScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--button-height": "20px", "--button-fz": "11px", "--button-padding-x": "6px" },
        sm: { "--button-height": "24px", "--button-fz": "11px", "--button-padding-x": "8px" },
        md: { "--button-height": "32px", "--button-fz": "11px", "--button-padding-x": "12px" },
        lg: { "--button-height": "36px", "--button-fz": "13px", "--button-padding-x": "16px" },
        xl: { "--button-height": "44px", "--button-fz": "15px", "--button-padding-x": "20px" },
    },
};

/** ActionIcon sizes: 24 (Figma's workhorse) at sm, 32 at md with 0 4px padding (C11). */
export const compactActionIconScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--ai-size": "18px" },
        sm: { "--ai-size": "24px" },
        md: { "--ai-size": "32px", "--cm-ai-padding": "0 4px" },
        lg: { "--ai-size": "36px" },
        xl: { "--ai-size": "44px" },
    },
};

/**
 * CloseButton sizes: Figma's close is a 24 ghost icon button with a 10 x 10 X (C35), so sm (the
 * default) is 24 / 10; xs is the 16 / 10 inline clear inside a 24 field. InputClearButton reads
 * this scale too (the inputs package passes its own `size`).
 */
export const compactCloseButtonScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--cb-size": "16px", "--cb-icon-size": "10px" },
        sm: { "--cb-size": "24px", "--cb-icon-size": "10px" },
        md: { "--cb-size": "32px", "--cb-icon-size": "12px" },
        lg: { "--cb-size": "36px", "--cb-icon-size": "14px" },
        xl: { "--cb-size": "44px", "--cb-icon-size": "16px" },
    },
};

/** How a variant draws when disabled (C7-C9). */
type DisabledKind = "solid" | "outline" | "text";

/** One text-button look: every value is a CSS colour expression over the tokens. */
interface ButtonLook {
    bg: string;
    hover: string;
    pressed: string;
    color: string;
    pressedColor: string;
    /** the resting 1px outline at -1px (transparent when the look has none) */
    outline: string;
    /** the shortcut in the right section */
    shortcut: string;
    disabled: DisabledKind;
}

const T = "transparent";
const v = (token: string): string => `var(--cm-${token})`;

const GHOST = {
    bg: T,
    hover: v("bg-transparent-hover"),
    pressed: v("bg-transparent-pressed"),
    color: v("text"),
    pressedColor: v("text"),
    outline: T,
    shortcut: v("text-secondary"),
    disabled: "text",
} as const satisfies ButtonLook;

const SECONDARY: ButtonLook = { ...GHOST, outline: v("border-translucent"), disabled: "outline" };

function solid(bg: string, color = v("text-onbrand"), pressedColor = v("text-onbrand-secondary")): ButtonLook {
    return {
        bg: v(bg),
        hover: v(`${bg}-hover`),
        pressed: v(`${bg}-pressed`),
        color,
        pressedColor,
        outline: T,
        shortcut: pressedColor,
        disabled: "solid",
    };
}

// The inverse button's pressed text was measured in light only (#ffffffcc); in dark the fill turns
// white, so the dimmed ink follows the scheme instead of staying white.
const INVERSE_DIM = `light-dark(${v("text-onbrand-secondary")}, ${v("text-oninverse")})`;

/**
 * The Figma text-button looks, by variant (C7, C8, C9). `danger`, `danger-outline`, `inverse`
 * and `success` are new variants; `outline` draws as the secondary; `light` is the toggle-on look.
 */
const BUTTON_LOOKS: Readonly<Record<string, ButtonLook>> = {
    filled: solid("bg-brand"),
    danger: solid("bg-danger"),
    success: solid("bg-success"),
    inverse: { ...solid("bg-inverse", v("text-oninverse"), INVERSE_DIM) },
    default: SECONDARY,
    outline: SECONDARY,
    subtle: GHOST,
    "danger-outline": {
        ...GHOST,
        color: v("text-danger"),
        pressedColor: v("text-danger"),
        outline: v("border-danger"),
        shortcut: v("text-danger"),
        disabled: "outline",
    },
    light: {
        bg: v("bg-selected"),
        hover: v("bg-selected-hover"),
        pressed: v("bg-selected-pressed"),
        color: v("text-brand"),
        pressedColor: v("text-brand"),
        outline: T,
        shortcut: v("text-brand"),
        disabled: "text",
    },
};

/** Variants whose look does not depend on the `color` prop. */
const COLORLESS = new Set(["danger", "danger-outline", "inverse", "success", "default", "outline", "subtle"]);

/**
 * Whether a `color` prop leaves the primary look in place: no colour, or the primary palette.
 * @param color - the color prop
 * @param primary - the theme's primary colour name
 * @returns true when the Figma look applies
 */
function isPrimary(color: unknown, primary: string | undefined): boolean {
    return color === undefined || color === null || color === primary || color === "brand";
}

/**
 * The look a Button renders with, or undefined to leave Mantine's own derivation (a coloured
 * `light`, `gradient`, `white`, `transparent`, or a non-primary filled colour).
 * `color="red"` on a filled button is the danger look (spec 4.1).
 * @param variant - the variant prop (theme default: filled)
 * @param color - the color prop
 * @param primary - the theme's primary colour name
 * @returns the look, or undefined
 */
function buttonLook(variant: string | undefined, color: unknown, primary?: string): ButtonLook | undefined {
    const name = variant ?? "filled";
    if (name === "filled" && color === "red") {
        return BUTTON_LOOKS.danger;
    }
    const look = BUTTON_LOOKS[name] as ButtonLook | undefined;
    if (!look) {
        return undefined;
    }
    return COLORLESS.has(name) || isPrimary(color, primary) ? look : undefined;
}

const DISABLED: Record<DisabledKind, { bg: string; color: string; outline: string }> = {
    solid: { bg: v("bg-disabled"), color: v("text-ondisabled"), outline: T },
    outline: { bg: T, color: v("text-disabled"), outline: v("border-disabled") },
    text: { bg: T, color: v("text-disabled"), outline: T },
};

/**
 * The Button colour variables for one variant / colour pair.
 * @param variant - the variant prop
 * @param color - the color prop
 * @param primary - the theme's primary colour name
 * @returns Mantine's `--button-*` colour variables plus the `--cm-btn-*` state variables, or
 *   nothing when Mantine's derivation is kept
 */
export function compactButtonVariantVars(variant?: string, color?: unknown, primary?: string): CompactVars {
    const look = buttonLook(variant, color, primary);
    if (!look) {
        return {};
    }
    const off = DISABLED[look.disabled];
    return {
        "--button-bg": look.bg,
        "--button-hover": look.hover,
        "--button-color": look.color,
        "--button-hover-color": "var(--button-color)",
        "--button-bd": "none",
        "--cm-btn-pressed": look.pressed,
        "--cm-btn-pressed-color": look.pressedColor,
        "--cm-btn-outline": look.outline,
        "--cm-btn-shortcut": look.shortcut,
        "--cm-btn-disabled-bg": off.bg,
        "--cm-btn-disabled-color": off.color,
        "--cm-btn-disabled-outline": off.outline,
    };
}

/** One icon-button look (C11). */
interface IconLook {
    bg: string;
    hover: string;
    pressed: string;
    color: string;
    outline: string;
    /** the disabled ground and glyph, when they are not transparent / `--cm-icon-disabled` */
    disabledBg?: string;
    disabledColor?: string;
    /** the disabled edge, when it differs from the resting one */
    disabledOutline?: string;
}

const ICON_GHOST: IconLook = {
    bg: T,
    hover: v("bg-transparent-hover"),
    pressed: v("bg-transparent-pressed"),
    color: v("icon"),
    outline: T,
};

/**
 * The Figma icon-button looks, by variant. `subtle` is the ghost (the default); `default` the
 * secondary; `light` the "highlighted" look (it REPLACES the 1px accent border older releases drew
 * on light, spec 15 item 8); `filled` the brand fill; `joined` a segment of the joined group (C14).
 */
const ACTION_ICON_LOOKS: Readonly<Record<string, IconLook>> = {
    subtle: ICON_GHOST,
    // Disabled takes the disabled edge, as the secondary text button does (btn-secondary-md-disabled).
    default: { ...ICON_GHOST, outline: v("border-translucent"), disabledOutline: v("border-disabled") },
    light: {
        bg: v("bg-selected"),
        hover: v("bg-selected-hover"),
        pressed: v("bg-selected-pressed"),
        color: v("icon-brand"),
        outline: T,
    },
    filled: {
        bg: v("bg-brand"),
        hover: v("bg-brand-hover"),
        pressed: v("bg-brand-pressed"),
        color: v("text-onbrand"),
        outline: T,
        disabledBg: v("bg-disabled"),
        disabledColor: v("icon-ondisabled"),
    },
    joined: {
        bg: v("bg-secondary"),
        hover: v("bg-pressed"),
        pressed: v("bg-pressed"),
        color: v("icon"),
        outline: T,
        disabledBg: v("bg-secondary"),
    },
};

/** Neutral palettes that keep the ghost look (AdvancedButton passes gray and sets its own ink). */
const NEUTRAL = new Set(["gray", "dark"]);

/**
 * The ActionIcon colour variables for one variant / colour pair.
 * @param variant - the variant prop (theme default: subtle)
 * @param color - the color prop
 * @param primary - the theme's primary colour name
 * @returns Mantine's `--ai-*` colour variables plus `--cm-ai-pressed` / `--cm-ai-outline`, or
 *   nothing when Mantine's derivation is kept (a coloured non-neutral look, outline, transparent,
 *   white, gradient)
 */
export function compactActionIconVariantVars(variant?: string | null, color?: unknown, primary?: string): CompactVars {
    const name = variant ?? "subtle";
    const look = ACTION_ICON_LOOKS[name] as IconLook | undefined;
    const neutralOk = name === "subtle" || name === "default" || name === "joined";
    if (!look || !(isPrimary(color, primary) || (neutralOk && NEUTRAL.has(String(color))))) {
        return {};
    }
    return {
        "--ai-bg": look.bg,
        "--ai-hover": look.hover,
        "--ai-color": look.color,
        "--ai-hover-color": "var(--ai-color)",
        "--ai-bd": "none",
        "--cm-ai-pressed": look.pressed,
        "--cm-ai-outline": look.outline,
        ...(look.disabledBg ? { "--cm-ai-disabled-bg": look.disabledBg } : {}),
        ...(look.disabledColor ? { "--cm-ai-disabled-color": look.disabledColor } : {}),
        ...(look.disabledOutline ? { "--cm-ai-disabled-outline": look.disabledOutline } : {}),
    };
}
