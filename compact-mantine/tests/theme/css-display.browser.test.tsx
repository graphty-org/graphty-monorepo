/**
 * Display components -- the CSS the compact theme sets on Text, Badge, Pill, Avatar, ThemeIcon,
 * Indicator and Kbd, read back from a real browser at the default size (sm). The values are
 * Figma's (design/figma-spec.md 11.6-11.10); tests/figma/shell.browser.test.tsx compares the same
 * components against the Figma captures themselves.
 */
import { Avatar, Badge, Indicator, Kbd, MantineProvider, Pill, Text, ThemeIcon } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

const IconPlaceholder = (): React.JSX.Element => <span style={{ width: 14, height: 14 }}>*</span>;

function renderWithTheme(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

function root(ui: React.ReactElement, selector: string): Element {
    const { container } = renderWithTheme(ui);
    const el = container.querySelector(selector);
    if (!el) {
        throw new Error(`no ${selector}`);
    }
    return el;
}

function cssVar(el: Element, name: string): string {
    return getComputedStyle(el).getPropertyValue(name).trim();
}

describe("Text - All CSS Values (Browser)", () => {
    it("sm is 11/16 through --text-fz", () => {
        const el = root(<Text size="sm">Hello</Text>, ".mantine-Text-root");
        expect(getComputedStyle(el).fontSize).toBe("11px");
        expect(getComputedStyle(el).lineHeight).toBe("16px");
        expect(cssVar(el, "--text-fz")).toBe("11px");
    });

    it("sm is the body role: weight 450, letter-spacing 0.055px", () => {
        const el = root(<Text size="sm">Hello</Text>, ".mantine-Text-root");
        expect(getComputedStyle(el).fontWeight).toBe("450");
        expect(getComputedStyle(el).letterSpacing).toBe("0.055px");
    });

    it("xs is the caption role: weight 450, letter-spacing 0.045px", () => {
        const el = root(<Text size="xs">Hello</Text>, ".mantine-Text-root");
        expect(getComputedStyle(el).fontWeight).toBe("450");
        expect(getComputedStyle(el).letterSpacing).toBe("0.045px");
    });

    it("fw still wins, other sizes keep the normal weight, inherit keeps the parent's", () => {
        expect(getComputedStyle(root(<Text size="sm" fw={600}>Hello</Text>, ".mantine-Text-root")).fontWeight).toBe("600");
        expect(getComputedStyle(root(<Text size="md">Hello</Text>, ".mantine-Text-root")).fontWeight).toBe("400");
        const inherited = root(
            <div style={{ fontWeight: 700 }}>
                <Text size="sm" inherit>
                    Hello
                </Text>
            </div>,
            ".mantine-Text-root",
        );
        expect(getComputedStyle(inherited).fontWeight).toBe("700");
    });

    it.each([
        ["xs", "9px", "14px"],
        ["md", "13px", "22px"],
        ["lg", "15px", "25px"],
        ["xl", "24px", "32px"],
    ] as const)("%s is %s / %s", (size, fontSize, lineHeight) => {
        const el = root(<Text size={size}>Hello</Text>, ".mantine-Text-root");
        expect(getComputedStyle(el).fontSize).toBe(fontSize);
        expect(getComputedStyle(el).lineHeight).toBe(lineHeight);
    });
});

describe("Badge - All CSS Values (Browser)", () => {
    const badge = (): Element => root(<Badge>Beta</Badge>, ".mantine-Badge-root");

    it("sets the size variables", () => {
        const el = badge();
        expect(cssVar(el, "--badge-height")).toBe("16px");
        expect(cssVar(el, "--badge-fz")).toBe("11px");
        expect(cssVar(el, "--badge-padding-x")).toBe("4px");
    });

    it("is 16 tall, 11/16 450, padding 0 4, radius 5, never uppercase", () => {
        const s = getComputedStyle(badge());
        expect(s.height).toBe("16px");
        expect(s.fontSize).toBe("11px");
        expect(s.lineHeight).toBe("16px");
        expect(s.fontWeight).toBe("450");
        expect(s.paddingLeft).toBe("4px");
        expect(s.paddingRight).toBe("4px");
        expect(s.borderRadius).toBe("5px");
        expect(s.textTransform).toBe("none");
    });

    it("draws the default look as a 1px inside outline on a transparent ground", () => {
        const s = getComputedStyle(badge());
        expect(s.backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(s.outlineStyle).toBe("solid");
        expect(s.outlineWidth).toBe("1px");
        expect(s.outlineOffset).toBe("-1px");
    });
});

describe("Pill - All CSS Values (Browser)", () => {
    const pill = (): Element => root(<Pill>Tag</Pill>, ".mantine-Pill-root");

    it("sets the size variables", () => {
        expect(cssVar(pill(), "--pill-height")).toBe("20px");
        expect(cssVar(pill(), "--pill-fz")).toBe("11px");
    });

    it("is the variable-pill shape: 20 tall, 11px, radius 5, a 1px border, padding 0 4", () => {
        const s = getComputedStyle(pill());
        expect(s.height).toBe("20px");
        expect(s.fontSize).toBe("11px");
        expect(s.borderRadius).toBe("5px");
        expect(s.borderTopWidth).toBe("1px");
        expect(s.paddingLeft).toBe("4px");
    });
});

describe("Avatar - All CSS Values (Browser)", () => {
    it("is 24 square", () => {
        const el = root(<Avatar>AB</Avatar>, ".mantine-Avatar-root");
        expect(cssVar(el, "--avatar-size")).toBe("24px");
        const s = getComputedStyle(el);
        expect(s.width).toBe("24px");
        expect(s.height).toBe("24px");
        expect(s.minWidth).toBe("24px");
    });

    it("draws the initial 12/24 400", () => {
        const el = root(<Avatar>A</Avatar>, ".mantine-Avatar-placeholder");
        const s = getComputedStyle(el);
        expect(s.fontSize).toBe("12px");
        expect(s.lineHeight).toBe("24px");
        expect(s.fontWeight).toBe("400");
    });
});

describe("ThemeIcon - All CSS Values (Browser)", () => {
    it("is a 24 box with radius 5", () => {
        const el = root(
            <ThemeIcon>
                <IconPlaceholder />
            </ThemeIcon>,
            ".mantine-ThemeIcon-root",
        );
        expect(cssVar(el, "--ti-size")).toBe("24px");
        const s = getComputedStyle(el);
        expect(s.width).toBe("24px");
        expect(s.height).toBe("24px");
        expect(s.minWidth).toBe("24px");
        expect(s.minHeight).toBe("24px");
        expect(s.borderRadius).toBe("5px");
    });
});

describe("Indicator - All CSS Values (Browser)", () => {
    const dot = (): Element =>
        root(
            <Indicator>
                <span>x</span>
            </Indicator>,
            ".mantine-Indicator-indicator",
        );

    it("sets --indicator-size to 9px on the root", () => {
        const el = root(
            <Indicator>
                <span>x</span>
            </Indicator>,
            ".mantine-Indicator-root",
        );
        expect(cssVar(el, "--indicator-size")).toBe("9px");
    });

    it("is a 9px dot: 5px of color in a 2px ring, round", () => {
        const s = getComputedStyle(dot());
        expect(s.width).toBe("9px");
        expect(s.height).toBe("9px");
        expect(s.minWidth).toBe("9px");
        expect(s.borderTopWidth).toBe("2px");
        expect(s.borderTopStyle).toBe("solid");
    });
});

describe("Kbd - All CSS Values (Browser)", () => {
    const cap = (): Element => root(<Kbd>Shift</Kbd>, ".mantine-Kbd-root");

    it("sets --kbd-fz to 11px", () => {
        expect(cssVar(cap(), "--kbd-fz")).toBe("11px");
    });

    it("is the list key cap: 25 tall, 11/16 400, padding 1 4 0, radius 2, a 1px border", () => {
        const s = getComputedStyle(cap());
        expect(s.fontSize).toBe("11px");
        expect(s.lineHeight).toBe("16px");
        expect(s.fontWeight).toBe("400");
        expect(s.height).toBe("25px");
        expect(s.paddingTop).toBe("1px");
        expect(s.paddingLeft).toBe("4px");
        expect(s.paddingBottom).toBe("0px");
        expect(s.borderRadius).toBe("2px");
        expect(s.borderBottomWidth).toBe("1px");
    });

    it("is at least 26 wide for a single character", () => {
        const el = root(<Kbd>V</Kbd>, ".mantine-Kbd-root");
        expect(el.getBoundingClientRect().width).toBe(26);
    });
});
