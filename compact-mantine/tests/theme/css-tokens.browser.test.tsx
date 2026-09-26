/**
 * The tokens as Chromium resolves them: Mantine's scales on :root, and every --cm-* colour in
 * light, in dark, in the AA mode, and inside a dark-scoped surface in the light app
 * (design/figma-spec.md 2, 3.3).
 */
import { Box, Text } from "@mantine/core";
import { afterEach, describe, expect, it } from "vitest";

import { CM_COLORS, CM_HIGH_CONTRAST, type CmColorToken } from "../../src/theme/tokens";
import { hex, part, renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

function rootVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** The colour a token paints, read back through `color` on a probe element. */
function paint(token: string, within: HTMLElement): string {
    const probe = document.createElement("span");
    probe.style.color = `var(--cm-${token})`;
    within.appendChild(probe);
    const value = hex(getComputedStyle(probe).color);
    probe.remove();
    return value;
}

function expected(value: string): string {
    return value === "transparent" ? "#00000000" : hex(value);
}

const COLORS = Object.entries(CM_COLORS) as [string, CmColorToken][];

describe("Mantine scales on :root", () => {
    it("font sizes", async () => {
        await renderThemed(<Box />);
        expect(["xs", "sm", "md", "lg", "xl"].map((s) => rootVar(`--mantine-font-size-${s}`))).toEqual([
            "9px",
            "11px",
            "13px",
            "15px",
            "24px",
        ]);
    });

    it("line heights, spacing and radii", async () => {
        await renderThemed(<Box />);
        expect(rootVar("--mantine-line-height-sm")).toBe("16px");
        expect(rootVar("--mantine-spacing-sm")).toBe("8px");
        expect(rootVar("--mantine-radius-sm")).toBe("5px");
        expect(rootVar("--mantine-radius-lg")).toBe("13px");
    });

    it("the neutral dark ramp and the brand palette", async () => {
        await renderThemed(<Box />, { scheme: "dark" });
        expect(rootVar("--mantine-color-dark-7")).toBe("#2c2c2c");
        expect(rootVar("--mantine-color-dark-6")).toBe("#383838");
        expect(rootVar("--mantine-color-brand-6")).toBe("#0d99ff");
    });

    it("Text size=sm renders 11/16", async () => {
        const { container } = await renderThemed(<Text size="sm">Test</Text>);
        const style = getComputedStyle(part(container, ".mantine-Text-root"));
        expect([style.fontSize, style.lineHeight]).toEqual(["11px", "16px"]);
    });
});

describe.each(["light", "dark"] as const)("--cm-* colours resolve (%s)", (scheme) => {
    it.each(COLORS)("--cm-%s", async (name, token) => {
        const { container } = await renderThemed(<Box />, { scheme });
        expect(paint(name, container)).toBe(expected(token[scheme]));
    });
});

describe.each(["light", "dark"] as const)("the AA option (%s)", (scheme) => {
    it.each(Object.entries(CM_HIGH_CONTRAST))("--cm-%s", async (name, token) => {
        const { container } = await renderThemed(<Box />, { scheme, highContrast: true });
        expect(document.documentElement.getAttribute("data-cm-contrast")).toBe("high");
        expect(paint(name, container)).toBe(expected(token?.[scheme] ?? ""));
    });

    it("leaves every other token at Figma", async () => {
        const { container } = await renderThemed(<Box />, { scheme, highContrast: true });
        for (const [name, token] of COLORS.filter(([n]) => !(n in CM_HIGH_CONTRAST))) {
            expect(paint(name, container), name).toBe(expected(token[scheme]));
        }
    });
});

describe("a dark-scoped surface in the light app", () => {
    it("resolves every token dark (menus, tooltips, the toast)", async () => {
        const { container } = await renderThemed(<div className="cm-dark-surface" data-testid="dark" />);
        const dark = part(container, "[data-testid=dark]");
        expect(paint("bg-brand", dark)).toBe("#0c8ce9");
        expect(paint("text-secondary", dark)).toBe("#ffffffb2");
        expect(paint("bg", container)).toBe("#ffffff");
    });
});
