/**
 * The tokens as Chromium resolves them: Mantine's scales on :root, and every --cm-* color in
 * light, in dark, in the AA mode, and inside a dark-scoped surface in the light app
 * (design/figma-spec.md 2, 3.3).
 */
import {
    Box,
    Button,
    Checkbox,
    createTheme,
    DEFAULT_THEME,
    MantineProvider,
    mergeThemeOverrides,
    Text,
} from "@mantine/core";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createCompactTheme } from "../../src/theme";
import { CM_COLORS, CM_GRAPHTY_ACCENT, CM_HIGH_CONTRAST, type CmColorName } from "../../src/theme/tokens";
import { hex, part, renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

function rootVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** The color a token paints, read back through `color` on a probe element. */
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

/**
 * A token's value in a scheme and contrast mode, following a token that is written as another
 * token (`var(--cm-text-brand)`) to that token's value.
 * @param name - the token
 * @param scheme - the color scheme
 * @param high - the AA mode
 * @returns the color
 */
function valueOf(name: CmColorName, scheme: "light" | "dark", high = false): string {
    const value = ((high ? CM_HIGH_CONTRAST[name] : undefined) ?? CM_COLORS[name])[scheme];
    const ref = /^var\(--cm-([a-z-]+)\)$/.exec(value);
    return ref ? valueOf(ref[1] as CmColorName, scheme, high) : value;
}

const NAMES = Object.keys(CM_COLORS) as CmColorName[];

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

describe.each(["light", "dark"] as const)("--cm-* colors resolve (%s)", (scheme) => {
    it.each(NAMES)("--cm-%s", async (name) => {
        const { container } = await renderThemed(<Box />, { scheme });
        expect(paint(name, container)).toBe(expected(valueOf(name, scheme)));
    });
});

describe.each(["light", "dark"] as const)("the AA option (%s)", (scheme) => {
    it.each(Object.keys(CM_HIGH_CONTRAST) as CmColorName[])("--cm-%s", async (name) => {
        const { container } = await renderThemed(<Box />, { scheme, highContrast: true });
        expect(document.documentElement.getAttribute("data-cm-contrast")).toBe("high");
        expect(paint(name, container)).toBe(expected(valueOf(name, scheme, true)));
    });

    it("leaves every other token at Figma", async () => {
        const { container } = await renderThemed(<Box />, { scheme, highContrast: true });
        for (const name of NAMES.filter((n) => !(n in CM_HIGH_CONTRAST))) {
            expect(paint(name, container), name).toBe(expected(valueOf(name, scheme, true)));
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

describe("the accent follows the theme's primaryColor", () => {
    /**
     * Render a filled Button (a themed component, which applies the theme's accent) under the
     * compact theme with `primaryColor` set, or the compact theme alone.
     * @param scheme - the color scheme
     * @param primaryColor - the consumer's primaryColor, or none
     * @returns the container
     */
    function renderAccent(scheme: "light" | "dark", primaryColor?: string): HTMLElement {
        const theme = primaryColor
            ? mergeThemeOverrides(createCompactTheme(), createTheme({ primaryColor }))
            : createCompactTheme();
        return render(
            <MantineProvider theme={theme} forceColorScheme={scheme}>
                <Button>Go</Button>
                <Checkbox aria-label="On" defaultChecked />
            </MantineProvider>,
        ).container;
    }

    it.each(["light", "dark"] as const)("the default stays Figma's #0d99ff accent (%s)", (scheme) => {
        const container = renderAccent(scheme);
        const accent = ["bg-brand", "bg-brand-hover", "border-selected", "text-brand", "bg-selected"] as const;
        expect(accent.map((name) => paint(name, container))).toEqual(
            accent.map((name) => expected(CM_COLORS[name][scheme])),
        );
        expect(hex(getComputedStyle(part(container, "button")).backgroundColor)).toBe(
            scheme === "light" ? "#0d99ff" : "#0c8ce9",
        );
    });

    it("a custom primaryColor recolors the accent (light)", () => {
        const container = renderAccent("light", "teal");
        const { teal } = DEFAULT_THEME.colors;
        expect(paint("bg-brand", container)).toBe(teal[6]);
        expect(paint("bg-brand-hover", container)).toBe(teal[7]);
        expect(paint("border-selected", container)).toBe(teal[6]);
        expect(paint("text-brand", container)).toBe(teal[7]);
        expect(paint("bg-selected", container)).toBe(teal[0]);
        expect(hex(getComputedStyle(part(container, "button")).backgroundColor)).toBe(teal[6]);
        expect(hex(getComputedStyle(part(container, "input[type=checkbox]")).backgroundColor)).toBe(teal[6]);
    });

    it("a custom primaryColor recolors the accent (dark)", () => {
        const container = renderAccent("dark", "teal");
        const { teal } = DEFAULT_THEME.colors;
        expect(paint("bg-brand", container)).toBe(teal[8]);
        expect(paint("bg-brand-hover", container)).toBe(teal[9]);
        expect(paint("border-selected", container)).toBe(teal[8]);
        expect(paint("text-brand", container)).toBe(teal[4]);
        expect(hex(getComputedStyle(part(container, "button")).backgroundColor)).toBe(teal[8]);
    });
});

describe.each(["light", "dark"] as const)("the graphty accent (%s)", (scheme) => {
    /**
     * Render a filled button, a danger button and an inverse (always dark) menu with one highlighted row under the
     * graphty accent in the AA mode, as the graphty app does.
     * @returns the container
     */
    function renderGraphty(): HTMLElement {
        return render(
            <MantineProvider
                theme={createCompactTheme({ highContrast: true, accent: "graphty" })}
                forceColorScheme={scheme}
            >
                <Button>Go</Button>
                <Button color="red">Delete</Button>
                <div className="cm-menu-surface cm-menu-inverse">
                    <div className="cm-menu-row" aria-selected="true" data-testid="lit">
                        Lit
                    </div>
                    <div className="cm-menu-row" data-testid="unlit">
                        Unlit
                    </div>
                </div>
            </MantineProvider>,
        ).container;
    }

    it("sets every accent token to its brand value", () => {
        const container = renderGraphty();
        expect(document.documentElement.getAttribute("data-cm-accent")).toBe("graphty");
        for (const [name, token] of Object.entries(CM_GRAPHTY_ACCENT)) {
            expect(paint(name, container), name).toBe(expected(token[scheme]));
        }
    });

    it("draws a filled button lime with a dark label and keeps the danger label white", () => {
        const container = renderGraphty();
        const [go, del] = Array.from(container.querySelectorAll("button"));
        expect(hex(getComputedStyle(go).backgroundColor)).toBe(CM_GRAPHTY_ACCENT["bg-brand"]?.[scheme]);
        expect(hex(getComputedStyle(go).color)).toBe(CM_GRAPHTY_ACCENT["text-onbrand"]?.[scheme]);
        expect(hex(getComputedStyle(del).color)).toBe("#ffffff");
    });

    it("gives the highlighted menu row the dark label and leaves the others white", () => {
        const container = renderGraphty();
        expect(hex(getComputedStyle(part(container, "[data-testid=lit]")).color)).toBe("#111111");
        expect(hex(getComputedStyle(part(container, "[data-testid=unlit]")).color)).toBe("#ffffff");
    });
});
