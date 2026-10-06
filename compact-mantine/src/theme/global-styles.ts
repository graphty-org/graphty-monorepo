/**
 * The package's one stylesheet and its injection (design/figma-spec.md 3.2).
 *
 * `compactGlobalCss()` joins every `./css/*.css.ts` module's default-exported string in filename
 * order (the foundation's `00-foundation.css.ts` first), so a package adds its CSS by adding a
 * file. `ensureCompactStyles()` puts that stylesheet into `document.head` once and records the
 * contrast mode on `<html>`; `createCompactTheme` calls it when it creates the theme and again
 * from every themed component's render, so consumers write no setup.
 */
import { highContrastBlock } from "./css/00-foundation.css";

/** The options the theme and its stylesheet take. */
export interface CompactThemeOptions {
    /**
     * Apply the WCAG 2.2 AA token set (spec 2.9). Default false: exact Figma.
     */
    highContrast?: boolean;
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

/**
 * The whole stylesheet, for SSR or a shadow root. With `highContrast` the AA tokens are also
 * applied unconditionally, so the result needs no `data-cm-contrast` attribute.
 * @param options - the theme options
 * @returns the CSS text
 */
export function compactGlobalCss(options: CompactThemeOptions = {}): string {
    return options.highContrast ? `${sheet}\n${highContrastBlock(":root, :host")}` : sheet;
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
