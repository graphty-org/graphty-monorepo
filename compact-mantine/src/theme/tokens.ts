/**
 * The design tokens: every colour, type role, spacing step, radius, elevation and duration the
 * package draws with, measured from the Figma editor (design/figma-spec.md section 2).
 *
 * Colours become CSS custom properties `--cm-<name>` written with `light-dark()`, so each one
 * resolves from the `color-scheme` of the element that USES it. Mantine sets `color-scheme` on
 * `:root`; a subtree that must render dark in the light app (menus, tooltips, the toast) sets
 * `color-scheme: dark` on a wrapper (`cm-dark-surface`) and every token inside it resolves dark.
 *
 * Components never write a raw colour: they read `var(--cm-*)` (or PANEL_INK, which resolves to
 * these tokens).
 */

/** A colour token: its light value, its dark value and the Figma variable it was read from. */
export interface CmColorToken {
    readonly light: string;
    readonly dark: string;
    /** the Figma variable in design/ui/figma/tokens/css-variables(-dark).json, when there is one */
    readonly figma?: string;
}

function t(light: string, dark: string, figma?: string): CmColorToken {
    return { light, dark, figma };
}

/**
 * The colour roles (spec 2.1). Keys are token names without the `--cm-` prefix.
 */
export const CM_COLORS = {
    bg: t("#ffffff", "#2c2c2c", "--color-bg"),
    "bg-secondary": t("#f5f5f5", "#383838", "--color-bg-secondary"),
    "bg-hover": t("#f5f5f5", "#383838", "--color-bg-hover"),
    "bg-pressed": t("#e6e6e6", "#444444", "--color-bg-pressed"),
    "bg-tertiary": t("#e6e6e6", "#444444", "--color-bg-tertiary"),
    "bg-secondary-hover": t("#e6e6e6", "#444444", "--color-bg-secondary-hover"),
    "bg-secondary-pressed": t("#d9d9d9", "#757575", "--color-bg-secondary-pressed"),
    "bg-transparent-hover": t("#0000000d", "#ffffff0d", "--color-bg-transparent-hover"),
    "bg-transparent-pressed": t("#0000001a", "#ffffff1a", "--color-bg-transparent-pressed"),
    "bg-selected": t("#e5f4ff", "#394360", "--color-bg-selected"),
    "bg-selected-hover": t("#bde3ff", "#4a5878", "--color-bg-selected-hover"),
    "bg-selected-secondary": t("#f2f9ff", "#32394d", "--color-bg-selected-secondary"),
    "bg-selected-pressed": t("#80caff", "#394360", "--color-bg-selected-pressed"),
    "bg-brand": t("#0d99ff", "#0c8ce9", "--color-bg-brand"),
    "bg-brand-hover": t("#007be5", "#0a6dc2", "--color-bg-brand-hover"),
    "bg-brand-pressed": t("#0768cf", "#105cad", "--color-bg-brand-pressed"),
    "bg-disabled": t("#d9d9d9", "#757575", "--color-bg-disabled"),
    "bg-menu": t("#1e1e1e", "#1e1e1e", "--color-bg-menu"),
    "bg-tooltip": t("#1e1e1e", "#1e1e1e", "--color-bg-tooltip"),
    "bg-toolbar": t("#2c2c2c", "#2c2c2c", "--color-bg-toolbar"),
    "bg-inverse": t("#2c2c2c", "#ffffff", "--color-bg-inverse"),
    "bg-inverse-hover": t("#383838", "#f5f5f5", "--color-bg-inverse-hover"),
    "bg-inverse-pressed": t("#444444", "#e6e6e6", "--color-bg-inverse-pressed"),
    "bg-danger": t("#f24822", "#e03e1a", "--color-bg-danger"),
    "bg-danger-hover": t("#dc3412", "#c4381c", "--color-bg-danger-hover"),
    "bg-danger-pressed": t("#bd2915", "#963323", "--color-bg-danger-pressed"),
    "bg-success": t("#14ae5c", "#198f51", "--color-bg-success"),
    "bg-success-hover": t("#009951", "#078348", "--color-bg-success-hover"),
    "bg-success-pressed": t("#008043", "#0a5c35", "--color-bg-success-pressed"),
    "bg-warning": t("#ffcd29", "#f3c11b", "--color-bg-warning"),
    "bg-component-tertiary": t("#f1e5ff", "#473956", "--color-bg-component-tertiary"),
    "bg-mode-switcher": t("#f5f5f5", "#444444", "--color-bgtoolbarmodeswitcher"),
    "bg-mode-switcher-hover": t("#e6e6e6", "#383838", "--color-bgtoolbarmodeswitcher-hover"),
    "bg-info": t("#e5f4ff", "#394360", "--color-bg-info"),
    text: t("#000000e5", "#ffffff", "--color-text"),
    "text-secondary": t("#00000080", "#ffffffb2", "--color-text-secondary"),
    "text-tertiary": t("#0000004d", "#ffffff66", "--color-text-tertiary"),
    "text-disabled": t("#0000004d", "#ffffff66", "--color-text-disabled"),
    "text-brand": t("#007be5", "#7cc4f8", "--color-text-brand"),
    "text-onbrand": t("#ffffff", "#ffffff", "--color-text-onbrand"),
    "text-onbrand-secondary": t("#ffffffcc", "#ffffffcc", "--color-text-onbrand-secondary"),
    "text-ondisabled": t("#ffffff", "#2c2c2c", "--color-text-ondisabled"),
    "text-oninverse": t("#ffffffe5", "#000000e5", "--color-text-oninverse"),
    "text-component": t("#8638e5", "#d1a8ff", "--color-text-component"),
    "text-danger": t("#dc3412", "#fca397", "--color-text-danger"),
    "text-menu": t("#ffffff", "#ffffff", "--color-text-menu"),
    "text-menu-secondary": t("#ffffffb2", "#ffffffb2", "--color-text-menu-secondary"),
    "text-menu-disabled": t("#ffffff66", "#ffffff66", "--color-text-menu-disabled"),
    icon: t("#000000e5", "#ffffff", "--color-icon"),
    "icon-secondary": t("#00000080", "#ffffffb2", "--color-icon-secondary"),
    "icon-tertiary": t("#0000004d", "#ffffff66", "--color-icon-tertiary"),
    "icon-brand": t("#007be5", "#7cc4f8", "--color-icon-brand"),
    "icon-disabled": t("#0000004d", "#ffffff66", "--color-icon-disabled"),
    "icon-ondisabled": t("#ffffff", "#2c2c2c", "--color-icon-ondisabled"),
    "icon-component-tertiary": t("#c5b2dc", "#7f699b", "--color-icon-component-tertiary"),
    border: t("#e6e6e6", "#444444", "--color-border"),
    "border-strong": t("#2c2c2c", "#ffffffe5", "--color-border-strong"),
    "border-selected": t("#0d99ff", "#0c8ce9", "--color-border-selected"),
    "border-selected-strong": t("#007be5", "#7cc4f8", "--color-border-selected-strong"),
    "border-disabled": t("#e6e6e6", "#444444", "--color-border-disabled"),
    "border-danger": t("#ffc7c2", "#864537", "--color-border-danger"),
    "border-danger-strong": t("#dc3412", "#fca397", "--color-border-danger-strong"),
    "border-translucent": t("#0000001a", "#ffffff1a", "--color-bordertranslucent"),
    "border-translucent-strong": t("#00000033", "#ffffff33", "--color-bordertranslucentstrong"),
    "control-icon-outline": t("#0000001a", "#0000001a", "--color-controliconoutline"),
    "control-knob-off-outline": t("#00000033", "#00000033", "--color-controlknoboffoutline"),
    "border-menu": t("#383838", "#383838", "--color-border-menu"),
    scrollbar: t("#b3b3b380", "#b3b3b380", "--color-scrollbar"),
    "text-highlight": t("#0d99ff66", "#0d99ff66", "--color-texthighlight"),
    "modal-backdrop": t("#00000080", "#00000080", "--color-modalbackdrop"),
    // Tokens Figma does not have. At the Figma default they draw nothing new; the AA option
    // (CM_HIGH_CONTRAST) gives them values.
    /** a field's 1px inside edge: transparent in Figma, a 3:1 edge in the AA mode */
    "field-edge": t("transparent", "transparent"),
    /** the field edge under the pointer: Figma's hover outline (= border) */
    "field-edge-hover": t("#e6e6e6", "#444444"),
    /** the selected segment's inset edge (= border) */
    "segment-edge": t("#e6e6e6", "#444444"),
} as const satisfies Record<string, CmColorToken>;

/** The name of a colour token, without the `--cm-` prefix. */
export type CmColorName = keyof typeof CM_COLORS;

/**
 * The WCAG 2.2 AA option (spec 2.9): the ONLY tokens `createCompactTheme({ highContrast: true })`
 * changes. Every value is a Figma palette colour, so the look stays inside Figma's palette.
 *
 * The first block is the owner's list. The second block is what AA also needs because Figma's
 * own values fail there; each line can be vetoed on its own.
 */
export const CM_HIGH_CONTRAST: Partial<Record<CmColorName, { light: string; dark: string }>> = {
    // Owner's list.
    "text-secondary": { light: "#0000008c", dark: "#ffffffb2" },
    "icon-secondary": { light: "#0000008c", dark: "#ffffffb2" },
    "border-translucent-strong": { light: "#00000073", dark: "#ffffff59" },
    "field-edge": { light: "#00000073", dark: "#ffffff59" },
    "field-edge-hover": { light: "#000000a6", dark: "#ffffff80" },
    "segment-edge": { light: "#00000073", dark: "#ffffff73" },
    // Also required for AA (awaiting the owner's approval; one line each).
    "text-tertiary": { light: "#0000008c", dark: "#ffffffb2" },
    "border-selected": { light: "#007be5", dark: "#0c8ce9" },
    "bg-brand": { light: "#0768cf", dark: "#0a6dc2" },
    "bg-brand-hover": { light: "#0768cf", dark: "#105cad" },
    "bg-brand-pressed": { light: "#105cad", dark: "#105cad" },
    "text-brand": { light: "#0768cf", dark: "#7cc4f8" },
    "icon-brand": { light: "#0768cf", dark: "#7cc4f8" },
    "bg-danger": { light: "#bd2915", dark: "#963323" },
    "bg-success": { light: "#008043", dark: "#0a5c35" },
};

/**
 * Elevations (spec 2.6). Each is written for both schemes; `elevationValue` merges the two into
 * one `box-shadow` whose colour stops use `light-dark()`, with `transparent` for a layer that
 * exists in only one scheme. A computed box-shadow therefore carries both layer lists, and the
 * other scheme's layers are fully transparent (the test harness drops them before comparing).
 */
export const CM_ELEVATIONS = {
    "100": {
        light: ["0 0 .5px rgba(0,0,0,.3)", "0 1px 3px rgba(0,0,0,.15)"],
        dark: [
            "0 0 .5px rgba(0,0,0,.5)",
            "0 1px 3px rgba(0,0,0,.4)",
            "inset 0 .5px 0 rgba(255,255,255,.1)",
            "inset 0 0 .5px rgba(255,255,255,.3)",
        ],
    },
    "200": {
        light: ["0 0 .5px rgba(0,0,0,.18)", "0 3px 8px rgba(0,0,0,.1)", "0 1px 3px rgba(0,0,0,.1)"],
        dark: [
            "0 3px 8px rgba(0,0,0,.35)",
            "0 1px 3px rgba(0,0,0,.5)",
            "inset 0 .5px 0 rgba(255,255,255,.08)",
            "inset 0 0 .5px rgba(255,255,255,.3)",
        ],
    },
    "300": {
        light: ["0 0 .5px rgba(0,0,0,.15)", "0 5px 12px rgba(0,0,0,.13)", "0 1px 3px rgba(0,0,0,.1)"],
        dark: [
            "0 5px 12px rgba(0,0,0,.35)",
            "0 1px 3px rgba(0,0,0,.5)",
            "inset 0 .5px 0 rgba(255,255,255,.08)",
            "inset 0 0 .5px rgba(255,255,255,.3)",
        ],
    },
    "400": {
        light: ["0 0 .5px rgba(0,0,0,.12)", "0 10px 16px rgba(0,0,0,.12)", "0 2px 5px rgba(0,0,0,.15)"],
        dark: [
            "0 10px 16px rgba(0,0,0,.35)",
            "0 2px 5px rgba(0,0,0,.35)",
            "inset 0 .5px 0 rgba(255,255,255,.08)",
            "inset 0 0 .5px rgba(255,255,255,.35)",
        ],
    },
    "500": {
        light: ["0 0 .5px rgba(0,0,0,.08)", "0 10px 24px rgba(0,0,0,.18)", "0 2px 5px rgba(0,0,0,.15)"],
        dark: [
            "0 10px 24px rgba(0,0,0,.45)",
            "0 3px 5px rgba(0,0,0,.35)",
            "inset 0 .5px 0 rgba(255,255,255,.08)",
            "inset 0 0 .5px rgba(255,255,255,.35)",
        ],
    },
} as const;

/** The toast's shadow, the same in both schemes (C37). */
const CM_ELEVATION_TOAST =
    "0 1px 3px rgba(0,0,0,.4), inset 0 0 .5px rgba(255,255,255,.3), inset 0 .5px 0 rgba(255,255,255,.1), 0 0 .5px rgba(0,0,0,.5)";

const RGBA_IN_LAYER = /rgba\([^)]*\)/;

/**
 * One `box-shadow` value holding both schemes' layers, each colour stop wrapped in
 * `light-dark()` so the layers of the scheme not in use are transparent.
 * @param level - the elevation level
 * @returns the CSS value
 */
export function elevationValue(level: keyof typeof CM_ELEVATIONS): string {
    const { light, dark } = CM_ELEVATIONS[level];
    const only = (layer: string, scheme: "light" | "dark"): string =>
        layer.replace(RGBA_IN_LAYER, (color) =>
            scheme === "light" ? `light-dark(${color}, transparent)` : `light-dark(transparent, ${color})`,
        );
    return [...light.map((l) => only(l, "light")), ...dark.map((l) => only(l, "dark"))].join(", ");
}

/** Motion (spec 2.8). Overlays, rows and inputs change in one frame; only these move. */
const CM_MOTION = {
    "duration-sm": "100ms",
    "duration-md": "200ms",
    "ease-out": "ease-out",
    "ease-in-out": "cubic-bezier(.645,.045,.355,1)",
    "ease-loading": "cubic-bezier(.65,0,.35,1)",
} as const;

/** The type family: the bundled Inter Variable first, then Figma's own stack (spec 2.3). */
export const CM_FONT_FAMILY =
    '"Inter Variable", "Inter", ui-sans-serif, system-ui, -apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif';

/** Monospace: Figma's stack, not bundled. */
export const CM_FONT_FAMILY_MONO = '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

/** One type role: size and line-height in px, a variable-font weight, and letter-spacing. */
interface CmTypeRole {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly fontWeight: number;
    readonly letterSpacing: string;
}

/** The type roles (spec 2.3). Emphasis is weight, never size or colour. */
export const CM_TYPE = {
    body: { fontSize: 11, lineHeight: 16, fontWeight: 450, letterSpacing: "0.055px" },
    bodyStrong: { fontSize: 11, lineHeight: 16, fontWeight: 550, letterSpacing: "0.055px" },
    headingSmall: { fontSize: 13, lineHeight: 22, fontWeight: 550, letterSpacing: "-0.032px" },
    headingMedium: { fontSize: 15, lineHeight: 25, fontWeight: 550, letterSpacing: "-0.075px" },
    captionStrong: { fontSize: 9, lineHeight: 14, fontWeight: 500, letterSpacing: "0.27px" },
    caption: { fontSize: 9, lineHeight: 14, fontWeight: 450, letterSpacing: "0.045px" },
    layerTop: { fontSize: 11, lineHeight: 32, fontWeight: 600, letterSpacing: "0.055px" },
    layerNested: { fontSize: 11, lineHeight: 32, fontWeight: 400, letterSpacing: "0.055px" },
    legend: { fontSize: 11, lineHeight: 16, fontWeight: 400, letterSpacing: "normal" },
    largeRow: { fontSize: 13, lineHeight: 24, fontWeight: 400, letterSpacing: "-0.003px" },
    sheet: { fontSize: 12, lineHeight: 16, fontWeight: 400, letterSpacing: "normal" },
    keyCap: { fontSize: 14, lineHeight: 24, fontWeight: 400, letterSpacing: "normal" },
} as const satisfies Record<string, CmTypeRole>;

/**
 * The CSS declarations for one type role, for a `.css.ts` template:
 * `.cm-x { ${cmFont("bodyStrong")} }`.
 * @param role - the type role
 * @returns `font-size`, `line-height`, `font-weight` and `letter-spacing` declarations
 */
export function cmFont(role: keyof typeof CM_TYPE): string {
    const r: CmTypeRole = CM_TYPE[role];
    return `font-size: ${r.fontSize}px; line-height: ${r.lineHeight}px; font-weight: ${r.fontWeight}; letter-spacing: ${r.letterSpacing};`;
}

/**
 * Mantine font sizes (spec 2.3). sm (11px) is the compact default.
 */
export const compactFontSizes = {
    xs: "9px",
    sm: "11px",
    md: "13px",
    lg: "15px",
    xl: "24px",
};

/** Mantine line heights, px, paired with compactFontSizes (spec 2.3). */
export const compactLineHeights = {
    xs: "14px",
    sm: "16px",
    md: "22px",
    lg: "25px",
    xl: "32px",
};

/**
 * Mantine spacing (spec 2.4): `sm` moves 6 -> 8 onto Figma's grid; `md` stays 8 so existing
 * `gap="md"` layouts do not move.
 */
export const compactSpacing = {
    xs: "4px",
    sm: "8px",
    md: "8px",
    lg: "12px",
    xl: "16px",
};

/** Mantine radii (spec 2.5): small 2, medium 5, large 13. */
export const compactRadius = {
    xs: "2px",
    sm: "5px",
    md: "5px",
    lg: "13px",
    xl: "13px",
};

/** Mantine shadows mapped onto the elevations, so `shadow="..."` props keep working (spec 2.6). */
export const compactShadows = {
    xs: "var(--cm-elevation-100)",
    sm: "var(--cm-elevation-200)",
    md: "var(--cm-elevation-300)",
    lg: "var(--cm-elevation-400)",
    xl: "var(--cm-elevation-500)",
};

/**
 * The declarations of a token block: every colour token as `light-dark()`, the elevations and
 * the motion values.
 * @returns CSS declarations, one per line
 */
export function tokenDeclarations(): string {
    const lines: string[] = [];
    for (const [name, token] of Object.entries(CM_COLORS)) {
        lines.push(`--cm-${name}: ${colorValue(token)};`);
    }
    for (const level of Object.keys(CM_ELEVATIONS) as (keyof typeof CM_ELEVATIONS)[]) {
        lines.push(`--cm-elevation-${level}: ${elevationValue(level)};`);
    }
    lines.push(`--cm-elevation-toast: ${CM_ELEVATION_TOAST};`);
    for (const [name, value] of Object.entries(CM_MOTION)) {
        lines.push(`--cm-${name}: ${value};`);
    }
    lines.push(`--cm-font-family: ${CM_FONT_FAMILY};`);
    lines.push(`--cm-font-family-mono: ${CM_FONT_FAMILY_MONO};`);
    return lines.join("\n    ");
}

/**
 * The declarations the AA option overrides.
 * @returns CSS declarations, one per line
 */
export function highContrastDeclarations(): string {
    return Object.entries(CM_HIGH_CONTRAST)
        .map(([name, token]) => `--cm-${name}: ${colorValue(token as CmColorToken)};`)
        .join("\n    ");
}

function colorValue({ light, dark }: { light: string; dark: string }): string {
    return light === dark ? light : `light-dark(${light}, ${dark})`;
}
