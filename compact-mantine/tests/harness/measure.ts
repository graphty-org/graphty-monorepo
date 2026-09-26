/**
 * The measurement harness for compact-mantine's browser tests (Vitest browser mode, Chromium via
 * Playwright): render a component under the theme in a chosen colour scheme and contrast mode,
 * drive it into a state with real input, read the computed style and box of its parts, and
 * compare them with a spec -- written by hand, or read from a Figma capture with ./figma.ts.
 *
 * Tolerances: box width / height / x / y within 0.5px; every other px length within 0.01px;
 * colours exact after normalising to hex (8-digit when translucent); font weight exact; any other
 * value exact after normalisation.
 *
 * @example
 * ```ts
 * const { container } = await renderThemed(createElement(Button, null, "Button"), { scheme: "dark" });
 * const button = part(container, "button");
 * await drive(button, "hover");
 * expectMeasured(button, { height: 24, backgroundColor: "#0a6dc2", fontWeight: "450" });
 * ```
 */
import { MantineProvider } from "@mantine/core";
import { cleanup, render, type RenderResult } from "@testing-library/react";
import { commands, userEvent } from "@vitest/browser/context";
import { createElement, type ReactElement } from "react";
import { expect } from "vitest";

import { createCompactTheme } from "../../src/theme";
import { ensureCompactStyles } from "../../src/theme/global-styles";

declare module "@vitest/browser/context" {
    interface BrowserCommands {
        figmaAvailable: () => Promise<boolean>;
        readFigmaCapture: (path: string) => Promise<unknown>;
        mouseAway: () => Promise<void>;
        mouseDown: () => Promise<void>;
        mouseUp: () => Promise<void>;
    }
}

/** How a component is rendered. */
interface ThemedOptions {
    /** Mantine colour scheme, forced. Default "light". */
    scheme?: "light" | "dark";
    /** The AA token set. Default false (exact Figma). */
    highContrast?: boolean;
}

/**
 * Render `ui` inside MantineProvider with the compact theme, the colour scheme forced, and wait
 * until the bundled Inter face is ready so text boxes measure in Inter. The pointer is parked in
 * the page's far corner first, so nothing renders already hovered.
 * @param ui - the element to render
 * @param options - scheme and contrast
 * @returns the testing-library render result
 */
export async function renderThemed(ui: ReactElement, options: ThemedOptions = {}): Promise<RenderResult> {
    const { scheme = "light", highContrast = false } = options;
    await commands.mouseAway();
    ensureCompactStyles({ highContrast });
    const theme = createCompactTheme({ highContrast });
    const result = render(createElement(MantineProvider, { theme, forceColorScheme: scheme }, ui));
    await document.fonts.load('450 11px "Inter Variable"');
    await document.fonts.ready;
    return result;
}

/** Unmount everything rendered, release a held mouse button and park the pointer. */
export async function resetHarness(): Promise<void> {
    await commands.mouseUp();
    await commands.mouseAway();
    cleanup();
}

/**
 * Find one part of a rendered component, failing loudly when it is missing.
 * @param root - where to search
 * @param selector - a CSS selector
 * @returns the element
 */
export function part(root: ParentNode, selector: string): HTMLElement {
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) {
        throw new Error(`no element matches ${selector}`);
    }
    return el;
}

/** The states the harness can drive a control into. */
export type DriveState = "rest" | "hover" | "focus" | "press" | "open";

/**
 * Put an element into a state with real input: `hover` moves the pointer onto it; `focus` presses
 * Tab until it (or something inside it) has keyboard focus, so `:focus-visible` matches; `press`
 * hovers then holds the mouse button down (release with resetHarness); `open` clicks it.
 * @param el - the element
 * @param state - the state
 */
export async function drive(el: HTMLElement, state: DriveState): Promise<void> {
    switch (state) {
        case "rest":
            return;
        case "hover":
            await userEvent.hover(el);
            return;
        case "press":
            await userEvent.hover(el);
            await commands.mouseDown();
            return;
        case "open":
            await userEvent.click(el);
            return;
        case "focus": {
            (document.activeElement as HTMLElement | null)?.blur();
            for (let i = 0; i < 50; i++) {
                await userEvent.tab();
                if (el === document.activeElement || el.contains(document.activeElement)) {
                    return;
                }
            }
            throw new Error("Tab never reached the element");
        }
        default:
            throw new Error(`unknown state ${String(state)}`);
    }
}

/**
 * A spec for one element. `width`, `height`, `x`, `y` are its border box in px (x / y relative
 * to `origin` when given); every other key is a camelCase CSS property with the expected computed
 * value (a number means px).
 */
export type MeasureSpec = Partial<Record<"width" | "height" | "x" | "y", number>> & Record<string, string | number>;

const BOX_KEYS = new Set(["width", "height", "x", "y"]);
const BOX_TOLERANCE = 0.5;
const LENGTH_TOLERANCE = 0.01;

const COLOR = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)|#[0-9a-f]{3,8}\b/gi;

function channel(n: number): string {
    return Math.round(n).toString(16).padStart(2, "0");
}

/**
 * Normalise one colour to hex: `#rrggbb` when opaque, `#rrggbbaa` when translucent.
 * Accepts `rgb()`, `rgba()` and 3/4/6/8-digit hex.
 * @param color - the colour
 * @returns the hex form
 */
export function hex(color: string): string {
    const c = color.trim().toLowerCase();
    if (c === "transparent") {
        return "#00000000";
    }
    let r: number;
    let g: number;
    let b: number;
    let a = 1;
    if (c.startsWith("#")) {
        const h = c.slice(1);
        const full = h.length <= 4 ? [...h].map((d) => d + d).join("") : h;
        r = parseInt(full.slice(0, 2), 16);
        g = parseInt(full.slice(2, 4), 16);
        b = parseInt(full.slice(4, 6), 16);
        if (full.length === 8) {
            a = parseInt(full.slice(6, 8), 16) / 255;
        }
    } else {
        const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(c);
        if (!m) {
            throw new Error(`not a colour: ${color}`);
        }
        [r, g, b] = [m[1], m[2], m[3]].map(Number);
        if (m[4] !== undefined) {
            a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
        }
    }
    const alpha = Math.round(a * 255);
    return `#${channel(r)}${channel(g)}${channel(b)}${alpha === 255 ? "" : channel(alpha)}`;
}

/**
 * Normalise a computed value for comparison: every colour inside it becomes hex, and a
 * `box-shadow` loses its fully transparent layers (the elevation tokens carry the other colour
 * scheme's layers as transparent ones).
 * @param property - the camelCase property name
 * @param value - the computed value
 * @returns the normalised value
 */
export function normalise(property: string, value: string): string {
    let v = value.trim().replace(COLOR, (c) => hex(c));
    if (property === "boxShadow" && v !== "none") {
        const layers = splitLayers(v).filter((layer) => !/#[0-9a-f]{6}00\b/.test(layer));
        v = layers.length ? layers.join(", ") : "none";
    }
    return v.replace(/\s+/g, " ");
}

function splitLayers(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i++) {
        if (value[i] === "(") {
            depth++;
        } else if (value[i] === ")") {
            depth--;
        } else if (value[i] === "," && depth === 0) {
            out.push(value.slice(start, i).trim());
            start = i + 1;
        }
    }
    out.push(value.slice(start).trim());
    return out;
}

/**
 * The computed style of an element (or one of its pseudo elements).
 * @param el - the element
 * @param pseudo - `::before`, `::after`, `::placeholder`, ...
 * @returns the live computed style
 */
export function computed(el: Element, pseudo?: string): CSSStyleDeclaration {
    return getComputedStyle(el, pseudo);
}

/** What `measure` reads: the border box and the requested computed properties, normalised. */
interface Measured {
    box: { x: number; y: number; width: number; height: number };
    style: Record<string, string>;
}

/**
 * Read an element's box and the named computed properties, normalised.
 * @param el - the element
 * @param properties - camelCase CSS properties
 * @param options - `pseudo` element, `origin` element for x / y
 * @param options.pseudo - a pseudo element to read the style of
 * @param options.origin - x / y are measured from this element's top left
 * @returns the measurement
 */
export function measure(
    el: Element,
    properties: readonly string[],
    options: { pseudo?: string; origin?: Element } = {},
): Measured {
    const r = el.getBoundingClientRect();
    const o = options.origin?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const cs = computed(el, options.pseudo);
    const style: Record<string, string> = {};
    for (const p of properties) {
        style[p] = normalise(p, String(cs[p as keyof CSSStyleDeclaration] ?? ""));
    }
    return { box: { x: r.left - o.left, y: r.top - o.top, width: r.width, height: r.height }, style };
}

function matches(property: string, actual: string | number, expected: string | number): boolean {
    if (typeof actual === "number" && typeof expected === "number") {
        return Math.abs(actual - expected) <= BOX_TOLERANCE;
    }
    const want = typeof expected === "number" ? `${expected}px` : normalise(property, expected);
    const got = String(actual);
    if (want === got) {
        return true;
    }
    // Lengths: every px number in the two values must agree within LENGTH_TOLERANCE.
    const numbers = (s: string): number[] => [...s.matchAll(/-?[\d.]+(?=px)/g)].map((m) => parseFloat(m[0]));
    const strip = (s: string): string => s.replace(/-?[\d.]+px/g, "#");
    const [wn, gn] = [numbers(want), numbers(got)];
    return (
        wn.length > 0 &&
        wn.length === gn.length &&
        strip(want) === strip(got) &&
        wn.every((n, i) => Math.abs(n - gn[i]) <= LENGTH_TOLERANCE)
    );
}

/**
 * Compare an element with a spec and return every difference (empty when it matches).
 * @param el - the element
 * @param spec - the expected values
 * @param options - `pseudo`, `origin` (see measure)
 * @param options.pseudo - a pseudo element to compare
 * @param options.origin - x / y are measured from this element's top left
 * @returns one line per mismatching property
 */
function differences(
    el: Element,
    spec: MeasureSpec,
    options: { pseudo?: string; origin?: Element } = {},
): string[] {
    const props = Object.keys(spec).filter((k) => !BOX_KEYS.has(k));
    const m = measure(el, props, options);
    const out: string[] = [];
    for (const [key, expected] of Object.entries(spec)) {
        const actual = BOX_KEYS.has(key) ? m.box[key as keyof Measured["box"]] : m.style[key];
        if (!matches(key, actual, expected)) {
            out.push(`${key}: expected ${String(expected)}, got ${String(actual)}`);
        }
    }
    return out;
}

/**
 * Assert that an element matches a spec, listing every mismatching property in the failure.
 * @param el - the element
 * @param spec - the expected values
 * @param options - `pseudo`, `origin` (see measure)
 * @param options.pseudo - a pseudo element to compare
 * @param options.origin - x / y are measured from this element's top left
 */
export function expectMeasured(
    el: Element,
    spec: MeasureSpec,
    options: { pseudo?: string; origin?: Element } = {},
): void {
    expect(differences(el, spec, options), describeEl(el)).toEqual([]);
}

function describeEl(el: Element): string {
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(".") : "";
    return `<${el.tagName.toLowerCase()}${cls ? ` .${cls}` : ""}>`;
}
