/**
 * The foundation's stylesheet in Chromium: the bundled Inter face, body type, the elevations,
 * the focus-ring classes and the shared field / menu / popover primitives every package builds
 * on (design/figma-spec.md 2, 13).
 */
import { Box } from "@mantine/core";
import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it } from "vitest";

import { drive, expectMeasured, normalize, part, renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

describe("type", () => {
    it("bundles Inter Variable and loads it with no consumer setup", async () => {
        await renderThemed(<Box>Inter</Box>);
        expect(document.fonts.check('450 11px "Inter Variable"')).toBe(true);
        const face = [...document.fonts].find((f) => f.family.replace(/"/g, "") === "Inter Variable");
        expect(face?.status).toBe("loaded");
        expect(face?.weight).toBe("100 900");
    });

    it("renders weight 450 and 550 as distinct variable-font instances", async () => {
        // Large text: headless Chromium rounds each advance to a whole pixel, which hides the
        // few-percent width change between neighboring weights at 11px.
        const { container } = await renderThemed(
            <div style={{ fontSize: 200, whiteSpace: "nowrap" }}>
                <span data-w="450" style={{ fontWeight: 450 }}>
                    Layer name Wide
                </span>
                <span data-w="550" style={{ fontWeight: 550 }}>
                    Layer name Wide
                </span>
            </div>,
        );
        const w450 = part(container, "[data-w='450']").getBoundingClientRect().width;
        const w550 = part(container, "[data-w='550']").getBoundingClientRect().width;
        expect(w550).toBeGreaterThan(w450);
    });

    it("sets the body to 11/16, weight 450, 0.055px, Inter first", async () => {
        await renderThemed(<Box />);
        expectMeasured(document.body, {
            fontSize: "11px",
            lineHeight: "16px",
            fontWeight: "450",
            letterSpacing: "0.055px",
        });
        expect(getComputedStyle(document.body).fontFamily.startsWith('"Inter Variable"')).toBe(true);
    });
});

describe("elevations", () => {
    it.each(["light", "dark"] as const)("--cm-elevation-400 draws only the %s layers", async (scheme) => {
        const { container } = await renderThemed(<div data-testid="s" style={{ boxShadow: "var(--cm-elevation-400)" }} />, {
            scheme,
        });
        const shadow = normalize("boxShadow", getComputedStyle(part(container, "[data-testid=s]")).boxShadow);
        const layers = shadow.split(/,\s(?![^(]*\))/);
        expect(layers).toHaveLength(scheme === "light" ? 3 : 4);
        expect(shadow.includes("inset")).toBe(scheme === "dark");
    });
});

describe("focus-ring classes", () => {
    it("cm-focus-outside: 1px #0d99ff at +1px on keyboard focus, transparent at rest", async () => {
        const { container } = await renderThemed(<button type="button" className="cm-focus-outside mantine-focus-never">x</button>);
        const button = part(container, "button");
        expectMeasured(button, { outlineStyle: "solid", outlineWidth: "1px", outlineColor: "#00000000" });
        await drive(button, "focus");
        expectMeasured(button, { outlineColor: "#0d99ff", outlineWidth: "1px", outlineOffset: "1px", outlineStyle: "solid" });
    });

    it("cm-focus-outside: a pointer click draws no ring", async () => {
        const { container } = await renderThemed(<button type="button" className="cm-focus-outside mantine-focus-never">x</button>);
        const button = part(container, "button");
        await userEvent.click(button);
        expect(document.activeElement).toBe(button);
        expect(getComputedStyle(button).outlineStyle === "none" || normalize("c", getComputedStyle(button).outlineColor) === "#00000000").toBe(true);
    });

    it("cm-focus-inside: the ring sits 1px inside, dark ring color in dark", async () => {
        const { container } = await renderThemed(<button type="button" className="cm-focus-inside">x</button>, { scheme: "dark" });
        const button = part(container, "button");
        await drive(button, "focus");
        expectMeasured(button, { outlineColor: "#0c8ce9", outlineOffset: "-1px" });
    });

    it("the AA option darkens the light ring to #007be5", async () => {
        const { container } = await renderThemed(<button type="button" className="cm-focus-outside">x</button>, { highContrast: true });
        const button = part(container, "button");
        await drive(button, "focus");
        expectMeasured(button, { outlineColor: "#007be5" });
    });
});

describe("cm-field", () => {
    const field = (
        <div className="cm-field" data-testid="f" style={{ width: 88, height: 24 }}>
            <input aria-label="x" style={{ all: "unset", width: "100%" }} />
        </div>
    );

    it("rests with no edge, outlines on hover, rings on any focus", async () => {
        const { container } = await renderThemed(field);
        const wrapper = part(container, "[data-testid=f]");
        expectMeasured(wrapper, {
            height: 24,
            backgroundColor: "#f5f5f5",
            borderRadius: "5px",
            outlineColor: "#00000000",
            outlineOffset: "-1px",
            boxShadow: "none",
        });
        await drive(wrapper, "hover");
        expectMeasured(wrapper, { outlineColor: "#e6e6e6" });
        await userEvent.click(part(wrapper, "input"));
        expectMeasured(wrapper, { outlineColor: "#0d99ff" });
    });

    it("in dark: #383838 fill, #444 hover", async () => {
        const { container } = await renderThemed(field, { scheme: "dark" });
        const wrapper = part(container, "[data-testid=f]");
        expectMeasured(wrapper, { backgroundColor: "#383838" });
        await drive(wrapper, "hover");
        expectMeasured(wrapper, { outlineColor: "#444444" });
    });

    it("the AA option gives the field a 1px inside edge at 3:1", async () => {
        const { container } = await renderThemed(field, { highContrast: true });
        expectMeasured(part(container, "[data-testid=f]"), { boxShadow: "#00000073 0px 0px 0px 1px inset" });
    });
});

describe("dark menu and light popover primitives", () => {
    const menu = (
        <div className="cm-menu-surface" data-testid="menu" style={{ width: 160 }}>
            <div className="cm-menu-row" data-testid="row1">
                One
            </div>
            <div className="cm-menu-row" aria-selected="true" data-testid="row2">
                Two
            </div>
        </div>
    );

    it("the menu is #1e1e1e in the light app, with the page's shadow", async () => {
        const { container } = await renderThemed(menu);
        expectMeasured(part(container, "[data-testid=menu]"), {
            backgroundColor: "#1e1e1e",
            borderRadius: "13px",
            paddingTop: "8px",
        });
        const shadow = normalize("boxShadow", getComputedStyle(part(container, "[data-testid=menu]")).boxShadow);
        expect(shadow.includes("inset")).toBe(false);
    });

    it("a row is 24 tall with a #0c8ce9 inset pill, and only one row is filled", async () => {
        const { container } = await renderThemed(menu);
        const row1 = part(container, "[data-testid=row1]");
        const row2 = part(container, "[data-testid=row2]");
        expectMeasured(row1, { height: 24, color: "#ffffff", fontSize: "11px", fontWeight: "450" });
        expectMeasured(row2, { backgroundColor: "#0c8ce9", left: "8px", right: "8px", borderTopLeftRadius: "5px" }, { pseudo: "::before" });
        await drive(row1, "hover");
        expectMeasured(row1, { backgroundColor: "#0c8ce9" }, { pseudo: "::before" });
        expectMeasured(row2, { backgroundColor: "#00000000" }, { pseudo: "::before" });
    });

    it("the popover shell is the page's own surface", async () => {
        const { container } = await renderThemed(<div className="cm-popover-surface" data-testid="p" />, { scheme: "dark" });
        expectMeasured(part(container, "[data-testid=p]"), { backgroundColor: "#2c2c2c", borderRadius: "13px" });
    });
});
