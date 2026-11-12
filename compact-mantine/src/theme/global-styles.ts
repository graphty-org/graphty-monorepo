/**
 * The package's one stylesheet and its injection (design/figma-spec.md 3.2).
 *
 * `compactGlobalCss()` joins every `./css/*.css.ts` module's default-exported string in filename
 * order (the foundation's `00-foundation.css.ts` first), so a package adds its CSS by adding a
 * file. `ensureCompactStyles()` puts that stylesheet into `document.head` once and records the
 * contrast mode on `<html>`; `createCompactTheme` calls it when it creates the theme and again
 * from every themed component's render, so consumers write no setup.
 */
import { graphtyAccentBlock, highContrastBlock } from "./css/00-foundation.css";

/** The accents the theme ships: Figma's blue, or the graphty brand lime and ink. */
export type CompactAccent = "figma" | "graphty";

/** The options the theme and its stylesheet take. */
export interface CompactThemeOptions {
    /**
     * Apply the WCAG 2.2 AA token set (spec 2.9). Default false: exact Figma.
     */
    highContrast?: boolean;
    /**
     * The accent: `"figma"` (default) is Figma's blue; `"graphty"` is the graphty brand lime,
     * with ink labels on lime fills and olive text on light, which meets AA in both contrast
     * modes. It sets the theme's `primaryColor` to `"graphty"`.
     */
    accent?: CompactAccent;
}

const modules = import.meta.glob<{ default: string }>("./css/*.css.ts", { eager: true });

const sheet = Object.keys(modules)
    .sort()
    .map((path) => modules[path].default)
    .join("\n");

/** The attribute on `<style>` that marks the injected stylesheet. */
const STYLE_ATTRIBUTE = "data-compact-mantine";

/** The attribute on `<html>` that switches the AA token block on. */
const CONTRAST_ATTRIBUTE = "data-cm-contrast";

/** The attribute on `<html>` that makes the accent tokens follow the theme's primaryColor. */
const ACCENT_ATTRIBUTE = "data-cm-accent";

/**
 * The whole stylesheet, for SSR or a shadow root. With `highContrast` the AA tokens, and with
 * `accent: "graphty"` the graphty accent tokens, are also applied unconditionally, so the result
 * needs no `data-cm-contrast` or `data-cm-accent` attribute.
 * @param options - the theme options
 * @returns the CSS text
 */
export function compactGlobalCss(options: CompactThemeOptions = {}): string {
    const contrast = options.highContrast ? `\n${highContrastBlock(":root, :host")}` : "";
    const accent = options.accent === "graphty" ? `\n${graphtyAccentBlock(":root, :host")}` : "";
    return `${sheet}${contrast}${accent}`;
}

let injected: HTMLStyleElement | null = null;

/**
 * Inject the stylesheet into `document.head` (once) and set `data-cm-contrast` on `<html>` to
 * `"high"` or `"figma"`. Does nothing without a DOM.
 *
 * ponytail: one contrast attribute per document, so the last theme rendered wins; two providers
 * with different `highContrast` on one page are not supported. Scope the attribute to the
 * provider's root if that is ever needed.
 * @param options - the theme options
 */
export function ensureCompactStyles(options: CompactThemeOptions = {}): void {
    if (typeof document === "undefined") {
        return;
    }
    if (!injected?.isConnected) {
        injected = document.head.querySelector<HTMLStyleElement>(`style[${STYLE_ATTRIBUTE}]`);
        if (!injected) {
            injected = document.createElement("style");
            injected.setAttribute(STYLE_ATTRIBUTE, "");
            injected.textContent = compactGlobalCss();
            document.head.appendChild(injected);
        }
    }
    const mode = options.highContrast ? "high" : "figma";
    const root = document.documentElement;
    if (root.getAttribute(CONTRAST_ATTRIBUTE) !== mode) {
        root.setAttribute(CONTRAST_ATTRIBUTE, mode);
    }
}

/**
 * Make the accent tokens follow the theme's `primaryColor`: set `data-cm-accent` on
 * `<html>` when it is not this package's own `brand` (to `"graphty"` for the graphty accent,
 * whose tokens are fixed brand values, else empty), and remove it when it is, so the default
 * accent is Figma's exactly. Does nothing without a DOM.
 *
 * ponytail: one accent attribute per document, like the contrast one; the last theme rendered
 * wins.
 * @param primaryColor - the theme's primaryColor
 */
export function followPrimaryColor(primaryColor: string): void {
    if (typeof document === "undefined") {
        return;
    }
    const root = document.documentElement;
    if (primaryColor === "brand") {
        root.removeAttribute(ACCENT_ATTRIBUTE);
        return;
    }
    const value = primaryColor === "graphty" ? "graphty" : "";
    if (root.getAttribute(ACCENT_ATTRIBUTE) !== value) {
        root.setAttribute(ACCENT_ATTRIBUTE, value);
    }
}
