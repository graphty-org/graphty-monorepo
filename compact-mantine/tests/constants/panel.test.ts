import { defaultCssVariablesResolver } from "@mantine/core";
import { describe, expect, it } from "vitest";

import { PANEL_INK } from "../../src/constants/panel";
import { compactTheme } from "../../src/theme";

// These tests resolve PANEL_INK through Mantine's own CSS variable resolver and
// measure WCAG 2.x contrast on the result, so a token that is moved below the
// ratio its role needs fails here rather than in a consumer's product.

type Scheme = "light" | "dark";

const resolved = defaultCssVariablesResolver(compactTheme);

const VARS: Record<Scheme, Record<string, string>> = {
    light: { ...resolved.variables, ...resolved.light },
    dark: { ...resolved.variables, ...resolved.dark },
};

function splitLightDark(input: string): [string, string] {
    let depth = 0;
    for (let i = 0; i < input.length; i++) {
        const character = input[i];
        if (character === "(") {
            depth++;
        } else if (character === ")") {
            depth--;
        } else if (character === "," && depth === 0) {
            return [input.slice(0, i).trim(), input.slice(i + 1).trim()];
        }
    }

    throw new Error(`not a two-argument expression: ${input}`);
}

function variableName(input: string): string {
    const comma = input.indexOf(",");
    return (comma === -1 ? input : input.slice(0, comma)).trim();
}

function resolveInk(expression: string, scheme: Scheme, seen = 0): string {
    if (seen > 20) {
        throw new Error(`cycle resolving ${expression}`);
    }

    const value = expression.trim();

    if (value.startsWith("light-dark(")) {
        const [light, dark] = splitLightDark(value.slice("light-dark(".length, -1));
        return resolveInk(scheme === "light" ? light : dark, scheme, seen + 1);
    }

    if (value.startsWith("var(")) {
        const name = variableName(value.slice(4, -1));
        const next = VARS[scheme][name];
        if (next === undefined) {
            throw new Error(`undefined variable ${name} (${scheme})`);
        }

        return resolveInk(next, scheme, seen + 1);
    }

    return value;
}

function toRgb(color: string): [number, number, number] {
    const hex = color.slice(1);
    const full = hex.length === 3 ? [...hex].map((character) => character + character).join("") : hex;
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

function luminance(color: string): number {
    const [red, green, blue] = toRgb(color).map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: keyof typeof PANEL_INK, background: keyof typeof PANEL_INK, scheme: Scheme): number {
    const [high, low] = [
        luminance(resolveInk(PANEL_INK[foreground], scheme)),
        luminance(resolveInk(PANEL_INK[background], scheme)),
    ].sort((a, b) => b - a);
    return (high + 0.05) / (low + 0.05);
}

const SCHEMES: Scheme[] = ["light", "dark"];

describe("PANEL_INK role split", () => {
    it("gives a selected item its own ground, separate from the raised surface", () => {
        expect(PANEL_INK.SELECTED).toBeDefined();
        expect(PANEL_INK.SELECTED).not.toBe(PANEL_INK.RAISED);
    });

    it("gives a selected item its own ink", () => {
        expect(PANEL_INK.ON_SELECTED).toBeDefined();
        expect(PANEL_INK.ON_SELECTED).not.toBe(PANEL_INK.VALUE);
    });

    it("gives an inoperable control its own ink, separate from placeholder text", () => {
        expect(PANEL_INK.DISABLED).toBeDefined();
        expect(PANEL_INK.DISABLED).not.toBe(PANEL_INK.PLACEHOLDER);
    });
});

describe.each(SCHEMES)("PANEL_INK measured contrast (%s scheme)", (scheme) => {
    it("separates a selected item from the track it sits in (WCAG 1.4.11, 3:1)", () => {
        expect(contrast("SELECTED", "SURFACE", scheme)).toBeGreaterThanOrEqual(3);
    });

    it("separates a selected item from the panel (WCAG 1.4.11, 3:1)", () => {
        expect(contrast("SELECTED", "PANEL", scheme)).toBeGreaterThanOrEqual(3);
    });

    it("keeps a selected item's label readable on it (WCAG 1.4.3, 4.5:1)", () => {
        expect(contrast("ON_SELECTED", "SELECTED", scheme)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps placeholder text at the minimum for ordinary text (WCAG 1.4.3, 4.5:1)", () => {
        // Placeholder text gets no exemption, which is why it could not stay at
        // the dim step and why the disabled ink had to become its own token.
        expect(contrast("PLACEHOLDER", "SURFACE", scheme)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps a disabled control visibly dimmer than a live one", () => {
        // WCAG 2.2 exempts an inactive control from 1.4.3, so this asserts the
        // opposite of a minimum: the disabled ink has to stay well below the
        // placeholder it was split from, or a disabled control reads as usable.
        const disabled = contrast("DISABLED", "SURFACE", scheme);
        const placeholder = contrast("PLACEHOLDER", "SURFACE", scheme);

        expect(disabled).toBeLessThanOrEqual(placeholder / 2);
        // ...and still be visible enough to read as present rather than absent.
        expect(disabled).toBeGreaterThan(1.5);
    });
});
