/**
 * The overlays package against the Figma study (design/figma-spec.md section 8): the dark menu,
 * the context menu, the tooltip (look and timing), the light popover family, the modal, the
 * toast, the overlay scrollbar and the feedback components, in the light and the dark theme.
 *
 * Expected values are read from the captures (figmaElement / figmaSpec) wherever Figma measured
 * the element; the few values Figma has no capture for are the spec's, written as literals with
 * the spec section beside them.
 *
 * Box shadows are compared as SETS of layers: Figma lists the same layers in a different order
 * from the elevation tokens, and the order of equal-colour outer shadows does not change the
 * picture.
 */
import { Button, Loader, Menu, Modal, Popover, Progress, ScrollArea, Tooltip } from "@mantine/core";
import { commands, page, userEvent } from "@vitest/browser/context";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { InfoCircle } from "../../src/components/InfoCircle";
import { ContextMenu } from "../../src/components/overlays/ContextMenu";
import { MenuCheckItem } from "../../src/components/overlays/MenuCheckItem";
import { ModalFooter } from "../../src/components/overlays/ModalFooter";
import { Toast } from "../../src/components/overlays/Toast";
import { TooltipShortcut } from "../../src/components/overlays/TooltipShortcut";
import { Popout, PopoutManager } from "../../src/components/popout";
import {
    computed,
    drive,
    expectMeasured,
    figmaAvailable,
    figmaElement,
    figmaSpec,
    normalise,
    part,
    renderFigma,
    resetHarness,
} from "./harness";

afterEach(resetHarness);
// A desktop window, as Figma's captures were taken in: a modal and a popover are clamped to the
// viewport, so the default narrow test page would measure the clamp instead of the component.
beforeAll(async () => {
    await page.viewport(1280, 800);
});

const SCHEMES = ["light", "dark"] as const;

/** Every layer of a box-shadow, normalised, as a sorted list. */
function layers(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    const v = normalise("boxShadow", value);
    for (let i = 0; i < v.length; i++) {
        if (v[i] === "(") {
            depth++;
        } else if (v[i] === ")") {
            depth--;
        } else if (v[i] === "," && depth === 0) {
            out.push(v.slice(start, i).trim());
            start = i + 1;
        }
    }
    out.push(v.slice(start).trim());
    return out.filter((l) => l !== "none").sort();
}

function expectShadow(el: Element, expected: string, pseudo?: string): void {
    expect(layers(computed(el, pseudo).boxShadow)).toEqual(layers(expected));
}

/** The computed value of a token on the element, e.g. the page scheme's elevation. */
function tokenShadow(el: Element, token: string): string {
    const probe = document.createElement("div");
    probe.style.boxShadow = `var(${token})`;
    el.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
}

function box(el: Element): DOMRect {
    return el.getBoundingClientRect();
}

async function waitFor<T>(fn: () => T | null | undefined, timeout = 3000): Promise<T> {
    const start = performance.now();
    for (;;) {
        const value = fn();
        if (value) {
            return value;
        }
        if (performance.now() - start > timeout) {
            throw new Error("timed out");
        }
        await new Promise((r) => setTimeout(r, 10));
    }
}

const available = await figmaAvailable();

// ------------------------------------------------------------------ 8.1 dark menu

const MENU = "index-and-inventory/menu-v2-item-hover";

function OpenMenu(): React.JSX.Element {
    return (
        <Menu opened withinPortal={false} trapFocus={false} closeOnClickOutside={false}>
            <Menu.Target>
                <Button>Menu</Button>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item rightSection="Ctrl+K">Actions</Menu.Item>
                <Menu.Item>File</Menu.Item>
                <Menu.Divider />
                <Menu.Item rightSection="Ctrl+Y" disabled>
                    Redo
                </Menu.Item>
                <Menu.Label>View</Menu.Label>
                <MenuCheckItem checked>Rulers</MenuCheckItem>
                <MenuCheckItem checked={false}>Pixel grid</MenuCheckItem>
                <Menu.Item color="red">Delete</Menu.Item>
                <Menu.Sub>
                    <Menu.Sub.Target>
                        <Menu.Sub.Item>Copy as</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                        <Menu.Item>Copy as text</Menu.Item>
                    </Menu.Sub.Dropdown>
                </Menu.Sub>
            </Menu.Dropdown>
        </Menu>
    );
}

function row(container: ParentNode, text: string): HTMLElement {
    const found = [...container.querySelectorAll<HTMLElement>("[data-menu-item]")].find((el) =>
        el.textContent?.includes(text),
    );
    if (!found) {
        throw new Error(`no menu row ${text}`);
    }
    return found;
}

describe.skipIf(!available)("8.1 dark menu", () => {
    for (const scheme of SCHEMES) {
        describe(scheme, () => {
            it("surface: #1e1e1e, radius 13, padding 8 0, shadow from the page's scheme", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const surface = part(container, ".mantine-Menu-dropdown");
                const figma = await figmaElement(`dark-theme/${scheme}-menu-blend-mode`, { index: 257 });
                expectMeasured(surface, figmaSpec(figma, ["backgroundColor", "borderRadius", "paddingTop", "paddingBottom"]));
                expectMeasured(surface, { paddingLeft: 0, paddingRight: 0, borderTopWidth: "0px" });
                if (scheme === "light") {
                    expectShadow(surface, figma.style.boxShadow);
                } else {
                    // The dark capture's insets are 0.5px where the elevation token (spec 2.6) says
                    // 1px; the surface must carry the page scheme's token either way.
                    expectShadow(surface, tokenShadow(surface.parentElement!, "--cm-elevation-400"));
                }
            });

            it("row: 24 tall, full width, 11/16 450 white, text 16px from the edge", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const surface = part(container, ".mantine-Menu-dropdown");
                const actions = row(container, "Actions");
                const figmaRow = await figmaElement(MENU, { index: 334 });
                expectMeasured(actions, {
                    ...figmaSpec(figmaRow, ["height", "color", "fontSize", "lineHeight", "fontWeight", "letterSpacing"]),
                    width: box(surface).width,
                });
                const label = part(actions, ".mantine-Menu-itemLabel");
                expect(box(label).left - box(surface).left).toBeCloseTo(16, 0);
                // the dropdown hugs its content with a 152px floor
                expect(box(surface).width).toBeGreaterThanOrEqual(152);
            });

            it("hover: the inset #0c8ce9 pill, radius 5, 8px in each side; shortcut #ffffffcc", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const surface = part(container, ".mantine-Menu-dropdown");
                const actions = row(container, "Actions");
                const shortcut = part(actions, '[data-position="right"]');
                const rest = await figmaElement(MENU, { index: 342 });
                expectMeasured(shortcut, figmaSpec(rest, ["color"]));
                await drive(actions, "hover");
                const pill = await figmaElement(MENU, { index: 352 });
                expectMeasured(actions, figmaSpec(pill, ["backgroundColor", "borderRadius"]), { pseudo: "::before" });
                const before = computed(actions, "::before");
                expect(parseFloat(before.left)).toBe(8);
                expect(parseFloat(before.right)).toBe(8);
                expect(parseFloat(before.width)).toBeCloseTo(box(surface).width - 16, 1);
                expectMeasured(shortcut, figmaSpec(await figmaElement(MENU, { index: 354 }), ["color"]));
            });

            it("keyboard highlight moves with the arrow keys and is the same pill", async () => {
                const { container } = await renderFigma(
                    <Menu>
                        <Menu.Target>
                            <Button>Menu</Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item>First</Menu.Item>
                            <Menu.Item>Second</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>,
                    { scheme },
                );
                await drive(part(container, "button"), "open");
                await waitFor(() => document.querySelector(".mantine-Menu-dropdown"));
                await userEvent.keyboard("{ArrowDown}");
                const first = row(document, "First");
                await waitFor(() => document.activeElement === first);
                const pill = await figmaElement(MENU, { index: 352 });
                expectMeasured(first, figmaSpec(pill, ["backgroundColor"]), { pseudo: "::before" });
                await userEvent.keyboard("{ArrowDown}");
                await waitFor(() => document.activeElement === row(document, "Second"));
                expectMeasured(first, { backgroundColor: "#00000000" }, { pseudo: "::before" });
                await userEvent.keyboard("{Escape}");
                await waitFor(() => !document.querySelector(".mantine-Menu-dropdown"));
                expect(document.activeElement).toBe(part(container, "button"));
            });

            it("disabled: label and shortcut #ffffff66, no highlight on hover", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const redo = row(container, "Redo");
                const figma = await figmaElement("popovers-and-menus/main-menu-disabled-item-hover", { index: 402 });
                const shortcut = await figmaElement("popovers-and-menus/main-menu-disabled-item-hover", { index: 404 });
                expectMeasured(part(redo, ".mantine-Menu-itemLabel"), figmaSpec(figma, ["color"]));
                expectMeasured(part(redo, '[data-position="right"]'), figmaSpec(shortcut, ["color"]));
                expectMeasured(redo, { opacity: "1" });
                await drive(redo, "hover");
                expectMeasured(redo, { backgroundColor: "#00000000" }, { pseudo: "::before" });
            });

            it("divider: full width, 1px #ffffff1a, 8px above and below (17px between rows)", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const surface = part(container, ".mantine-Menu-dropdown");
                const divider = part(container, ".mantine-Menu-divider");
                // Figma draws the line as the group's border-bottom (#328)
                const group = await figmaElement(MENU, { index: 328 });
                expectMeasured(divider, {
                    borderTopColor: group.style.borderBottomColor,
                    borderTopWidth: "1px",
                    marginTop: 8,
                    marginBottom: 8,
                    width: box(surface).width,
                });
                expect(box(row(container, "Redo")).top - box(row(container, "File")).bottom).toBeCloseTo(17, 0);
            });

            it("label row: 24 tall, secondary text", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const label = part(container, ".mantine-Menu-label");
                expectMeasured(label, { height: 24, color: "#ffffffb2", fontSize: "11px", fontWeight: "450" });
            });

            it("check column: a real menuitemcheckbox, labels 32px from the edge, check hidden when off", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const surface = part(container, ".mantine-Menu-dropdown");
                const on = row(container, "Rulers");
                const off = row(container, "Pixel grid");
                expect(on.getAttribute("role")).toBe("menuitemcheckbox");
                expect(on.getAttribute("aria-checked")).toBe("true");
                expect(off.getAttribute("aria-checked")).toBe("false");
                expect(box(part(on, ".mantine-Menu-itemLabel")).left - box(surface).left).toBeCloseTo(32, 0);
                expectMeasured(part(on, ".cm-menu-row-check"), { width: 16, height: 16, opacity: "1" });
                expectMeasured(part(off, ".cm-menu-row-check"), { opacity: "0" });
            });

            it("danger: text --cm-text-danger in the dark scope, highlight --cm-bg-danger", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const del = row(container, "Delete");
                expectMeasured(del, { color: "#fca397" });
                await drive(del, "hover");
                expectMeasured(del, { backgroundColor: "#e03e1a" }, { pseudo: "::before" });
                expectMeasured(del, { color: "#ffffff" });
            });

            it("submenu: 24px chevron box ending 8px from the edge; opens at once 4px beside, first row level", async () => {
                const { container } = await renderFigma(<OpenMenu />, { scheme });
                const surface = part(container, ".mantine-Menu-dropdown");
                const parent = row(container, "Copy as");
                const chevron = part(parent, ".cm-menu-chevron");
                expectMeasured(chevron, { width: 24, height: 24 });
                expect(box(surface).right - box(chevron).right).toBeCloseTo(8, 0);
                const glyph = await figmaElement(MENU, { index: 350 });
                const path = part(chevron, "svg path");
                expect(box(path).width).toBeCloseTo(glyph.box[2], 0);
                expect(box(path).height).toBeCloseTo(glyph.box[3], 0);
                await drive(parent, "hover");
                const sub = await waitFor(() => container.querySelectorAll<HTMLElement>("[data-menu-dropdown]")[1], 200);
                expect(box(sub).left - box(surface).right).toBeCloseTo(4, 0);
                expect(box(row(sub, "Copy as text")).top).toBeCloseTo(box(parent).top, 0);
                // the parent row stays highlighted while its submenu is open
                expect(parent.getAttribute("aria-expanded")).toBe("true");
                await drive(row(sub, "Copy as text"), "hover");
                expectMeasured(parent, { backgroundColor: "#0c8ce9" }, { pseudo: "::before" });
            });
        });
    }
});

describe("8.1 dark menu keyboard and scroll", () => {
    it("type-ahead moves focus to the next enabled row starting with the key, and wraps", async () => {
        const { getByRole } = await renderFigma(
            <Menu>
                <Menu.Target>
                    <Button>Main menu</Button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item rightSection="Ctrl+K">Actions...</Menu.Item>
                    <Menu.Item>View</Menu.Item>
                    <Menu.Item disabled>Vector</Menu.Item>
                    <Menu.Item>Libraries</Menu.Item>
                    <Menu.Item>Variables</Menu.Item>
                </Menu.Dropdown>
            </Menu>,
        );
        await userEvent.click(getByRole("button", { name: "Main menu" }));
        await waitFor(() => document.querySelector(".cm-menu"));
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => (document.activeElement?.textContent?.startsWith("Actions") ? true : null));
        const focused = (): string => document.activeElement?.textContent ?? "";
        await userEvent.keyboard("l");
        expect(focused()).toBe("Libraries");
        await userEvent.keyboard("v");
        expect(focused()).toBe("Variables");
        await userEvent.keyboard("v");
        expect(focused()).toBe("View");
        await userEvent.keyboard("{Escape}");
    });

    it("a clamped menu shows 24px chevron rows at the ends it can scroll to; hovering one scrolls", async () => {
        await renderFigma(
            <Menu opened trapFocus={false} closeOnClickOutside={false}>
                <Menu.Target>
                    <Button>Long</Button>
                </Menu.Target>
                <Menu.Dropdown>
                    {Array.from({ length: 60 }, (_, i) => (
                        <Menu.Item key={i}>Row {i}</Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>,
        );
        const menu = await waitFor(() => document.querySelector<HTMLElement>(".cm-menu[data-cm-scroll-down]"));
        expect(menu.hasAttribute("data-cm-scroll-up")).toBe(false);
        expect(box(menu).bottom).toBeLessThanOrEqual(window.innerHeight - 6 + 0.5);
        const after = computed(menu, "::after");
        expect(after.height).toBe("24px");
        expect(normalise("backgroundColor", after.backgroundColor)).toBe(normalise("backgroundColor", computed(menu).backgroundColor));
        // Hovering the bottom chevron scrolls the menu down; the top chevron then appears.
        await userEvent.hover(menu, { position: { x: 40, y: box(menu).height - 10 } });
        await waitFor(() => (menu.scrollTop > 40 ? true : null), 2000);
        await waitFor(() => (menu.hasAttribute("data-cm-scroll-up") ? true : null));
        expect(computed(menu, "::before").height).toBe("24px");
        // The top chevron row sits flush with the top of the menu.
        await commands.mouseAway();
        menu.scrollTop = menu.scrollHeight;
        await waitFor(() => (menu.hasAttribute("data-cm-scroll-down") ? null : true));
    });
});

// ------------------------------------------------------------------ 8.2 context menu

describe.skipIf(!available)("8.2 context menu", () => {
    function Ctx(): React.JSX.Element {
        const [last, setLast] = useState("none");
        return (
            <ContextMenu
                target={
                    <button type="button" data-testid="area" style={{ width: 300, height: 200, margin: 40, border: 0 }}>
                        {last}
                    </button>
                }
            >
                <Menu.Item disabled>Disabled first</Menu.Item>
                <Menu.Item onClick={() => setLast("Copy")}>Copy</Menu.Item>
                <Menu.Item>Paste</Menu.Item>
            </ContextMenu>
        );
    }

    it("opens at the pointer, 3px right and 5px up, first enabled row highlighted", async () => {
        const { getByTestId } = await renderFigma(<Ctx />);
        const area = getByTestId("area");
        const r = box(area);
        await userEvent.click(area, { button: "right", position: { x: 50, y: 60 } });
        const dropdown = await waitFor(() => document.querySelector<HTMLElement>(".mantine-Menu-dropdown"));
        const copy = row(document, "Copy");
        await waitFor(() => document.activeElement === copy);
        expect(box(dropdown).left).toBeCloseTo(r.left + 50 + 3, 0);
        expect(box(dropdown).top).toBeCloseTo(r.top + 60 - 5, 0);
        expectMeasured(copy, { backgroundColor: "#0c8ce9" }, { pseudo: "::before" });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => !document.querySelector(".mantine-Menu-dropdown"));
        expect(area.textContent).toBe("Copy");
    });

    it("also opens from the keyboard (Shift+F10) at the focused element, and Escape returns focus", async () => {
        const { getByTestId } = await renderFigma(<Ctx />);
        const area = getByTestId("area");
        area.focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        const dropdown = await waitFor(() => document.querySelector<HTMLElement>(".mantine-Menu-dropdown"));
        await waitFor(() => document.activeElement === row(document, "Copy"));
        expect(box(dropdown).left).toBeCloseTo(box(area).left, 0);
        expect(box(dropdown).top).toBeCloseTo(box(area).bottom, 0);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => !document.querySelector(".mantine-Menu-dropdown"));
        expect(document.activeElement).toBe(area);
    });
});

// ------------------------------------------------------------------ 8.3 tooltip

const TIP = "index-and-inventory/tooltip-with-shortcut";
const ARROW_BELOW = "dark-theme/dark-tooltip-effect-row-icon";

describe.skipIf(!available)("8.3 tooltip", () => {
    for (const scheme of SCHEMES) {
        it(`${scheme}: bubble and shortcut match Figma's "Align left  Alt+A"`, async () => {
            const { getByRole } = await renderFigma(
                <div style={{ padding: 80 }}>
                    <Tooltip label={<TooltipShortcut label="Align left" shortcut="Alt+A" />} opened>
                        <button type="button" style={{ width: 24, height: 24 }}>
                            A
                        </button>
                    </Tooltip>
                </div>,
                { scheme },
            );
            const trigger = getByRole("button");
            // wait until floating-ui has placed it (it mounts at 0, 0 first)
            const bubble = await waitFor(() => {
                const el = document.querySelector<HTMLElement>(".mantine-Tooltip-tooltip");
                return el && box(el).top > 0 ? el : null;
            });
            const figma = await figmaElement(TIP, { index: 63 });
            expectMeasured(
                bubble,
                figmaSpec(figma, [
                    "height",
                    "paddingTop",
                    "paddingRight",
                    "paddingBottom",
                    "paddingLeft",
                    "backgroundColor",
                    "color",
                    "fontSize",
                    "lineHeight",
                    "fontWeight",
                    "letterSpacing",
                    "borderRadius",
                ]),
            );
            if (scheme === "light") {
                expectShadow(bubble, figma.style.boxShadow);
            } else {
                expectShadow(bubble, tokenShadow(bubble.parentElement!, "--cm-elevation-300"));
            }
            expectMeasured(part(bubble, ".cm-tooltip-shortcut"), figmaSpec(await figmaElement(TIP, { index: 66 }), ["color", "marginLeft"]));
            // Width: Figma's 109 is 16 of padding around 93 of text; our text is within 3px of it
            // (the bundled Inter Variable 4 sets these glyphs slightly narrower than Figma's Inter).
            expect(Math.abs(box(bubble).width - figma.box[2])).toBeLessThan(3);
            // below, 6px from the trigger, centred, with an arrow filling the gap
            expect(box(bubble).top - box(trigger).bottom).toBeCloseTo(6, 0);
            expect(box(bubble).left + box(bubble).width / 2).toBeCloseTo(box(trigger).left + box(trigger).width / 2, 0);
            // Figma's arrow element below the trigger is 14 x 7 but overlaps the bubble by 1px
            // (tooltip--arrowInset), so the triangle outside the bubble is 12 x 6, its tip on the
            // trigger's edge. Ours is the same triangle: a rotated square whose outside half is
            // 12 x 6.
            const arrow = part(bubble, ".mantine-Tooltip-arrow");
            const figmaArrow = await figmaElement(ARROW_BELOW, { index: 49 });
            const figmaBubble = await figmaElement(ARROW_BELOW, { index: 50 });
            const outside = figmaBubble.box[1] - figmaArrow.box[1];
            expect(outside).toBe(6);
            expect(box(arrow).top).toBeCloseTo(box(trigger).bottom, 0);
            expect(box(bubble).top - box(arrow).top).toBeCloseTo(outside, 0);
            expect(box(arrow).width).toBeCloseTo((figmaArrow.box[2] * outside) / figmaArrow.box[3], 0);
            // the accessible description stays (owner decision)
            expect(trigger.getAttribute("aria-describedby")).toBe(bubble.id);
            expect(computed(bubble).pointerEvents).toBe("none");
        });
    }

    it("wraps at 180px", async () => {
        await renderFigma(
            <Tooltip label="Variable names must be unique within a collection" opened>
                <button type="button">A</button>
            </Tooltip>,
        );
        const bubble = await waitFor(() => document.querySelector<HTMLElement>(".mantine-Tooltip-tooltip"));
        expectMeasured(bubble, { width: 180, height: 40 });
    });

    it("timing: 1000 ms cold, immediate warm hand-off inside Tooltip.Group, 300 ms hide", async () => {
        const { getByRole } = await renderFigma(
            <Tooltip.Group>
                <div style={{ display: "flex", gap: 8, padding: 40 }}>
                    <Tooltip label="One">
                        <button type="button">1</button>
                    </Tooltip>
                    <Tooltip label="Two">
                        <button type="button">2</button>
                    </Tooltip>
                </div>
            </Tooltip.Group>,
        );
        const tip = (): HTMLElement | null => document.querySelector<HTMLElement>(".mantine-Tooltip-tooltip");

        const t0 = performance.now();
        await userEvent.hover(getByRole("button", { name: "1" }));
        await waitFor(tip, 3000);
        const cold = performance.now() - t0;
        expect(cold).toBeGreaterThan(900);
        expect(cold).toBeLessThan(1400);

        const t1 = performance.now();
        await userEvent.hover(getByRole("button", { name: "2" }));
        await waitFor(() => tip()?.textContent === "Two" ? tip() : null, 1000);
        expect(performance.now() - t1).toBeLessThan(250);

        const t2 = performance.now();
        await commands.mouseAway();
        await new Promise((r) => setTimeout(r, 150));
        expect(tip()).not.toBeNull();
        await waitFor(() => (tip() ? null : true), 1000);
        const hide = performance.now() - t2;
        expect(hide).toBeGreaterThan(250);
        expect(hide).toBeLessThan(600);
    });
});

describe("8.3 tooltip dismiss and focus delay", () => {
    function Tips(): React.JSX.Element {
        return (
            <div style={{ display: "flex", gap: 8, padding: 40 }}>
                <Tooltip label="One" openDelay={0}>
                    <button type="button">1</button>
                </Tooltip>
                <Tooltip label="Two">
                    <button type="button">2</button>
                </Tooltip>
            </div>
        );
    }
    const visibleTip = (): HTMLElement | null => {
        const el = document.querySelector<HTMLElement>(".mantine-Tooltip-tooltip");
        return el && computed(el).visibility === "visible" ? el : null;
    };
    const hiddenTip = (): true | null => (visibleTip() ? null : true);

    it("hides at once on pointer-down and stays hidden while the pointer rests on the trigger", async () => {
        const { getByRole } = await renderFigma(<Tips />);
        const one = getByRole("button", { name: "1" });
        await userEvent.hover(one);
        await waitFor(visibleTip);
        await userEvent.click(one);
        await waitFor(hiddenTip, 50);
        await new Promise((r) => setTimeout(r, 400));
        expect(visibleTip()).toBeNull();
    });

    it("hides at once on a key press but not on a modifier", async () => {
        const { getByRole } = await renderFigma(<Tips />);
        await userEvent.hover(getByRole("button", { name: "1" }));
        await waitFor(visibleTip);
        await userEvent.keyboard("{Shift}");
        expect(visibleTip()).not.toBeNull();
        await userEvent.keyboard("a");
        await waitFor(hiddenTip, 50);
    });

    it("hides at once on the wheel", async () => {
        const { getByRole } = await renderFigma(<Tips />);
        const one = getByRole("button", { name: "1" });
        await userEvent.hover(one);
        await waitFor(visibleTip);
        one.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 10 }));
        await waitFor(hiddenTip, 50);
    });

    it("a held-open tooltip (opened prop) is left alone", async () => {
        await renderFigma(
            <Tooltip label="Held" opened>
                <button type="button">H</button>
            </Tooltip>,
        );
        await waitFor(visibleTip);
        await userEvent.keyboard("a");
        document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        expect(visibleTip()).not.toBeNull();
    });

    it("keyboard focus shows the tooltip after the same 1000 ms delay", async () => {
        const { getByRole } = await renderFigma(<Tips />);
        await commands.mouseAway();
        // Cold: no tooltip visible within the last 300 ms (the previous test showed one).
        await new Promise((r) => setTimeout(r, 400));
        getByRole("button", { name: "1" }).focus();
        const t0 = performance.now();
        await userEvent.keyboard("{Tab}");
        expect(document.activeElement?.textContent).toBe("2");
        await new Promise((r) => setTimeout(r, 300));
        expect(document.querySelector(".mantine-Tooltip-tooltip")).not.toBeNull();
        expect(visibleTip()).toBeNull();
        await waitFor(visibleTip, 2000);
        const shown = performance.now() - t0;
        expect(shown).toBeGreaterThan(900);
        expect(shown).toBeLessThan(1400);
    });

    it("Tab from a visible tooltip's trigger hands off at once (warm), as the pointer does", async () => {
        const { getByRole } = await renderFigma(<Tips />);
        await commands.mouseAway();
        getByRole("button", { name: "1" }).focus();
        await waitFor(visibleTip, 2000);
        const t0 = performance.now();
        await userEvent.keyboard("{Tab}");
        expect(document.activeElement?.textContent).toBe("2");
        await waitFor(() => (visibleTip()?.textContent === "Two" ? true : null), 1000);
        expect(performance.now() - t0).toBeLessThan(250);
    });
});

// ------------------------------------------------------------------ 8.4 light popover

function StrokeSettings({ children }: { children?: React.ReactNode }): React.JSX.Element {
    return (
        <PopoutManager>
            <div style={{ position: "fixed", right: 0, top: 100, width: 240 }}>
                <Popout>
                    <Popout.Trigger>
                        <button type="button">Stroke</button>
                    </Popout.Trigger>
                    <Popout.Panel width={240} header={{ variant: "title", title: "Stroke settings" }}>
                        <Popout.Content>
                            <div style={{ height: 32 }}>row</div>
                            {children}
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
                <Popout>
                    <Popout.Trigger>
                        <button type="button">Fill</button>
                    </Popout.Trigger>
                    <Popout.Panel width={240} header={{ variant: "title", title: "Fill settings" }}>
                        <Popout.Content>fill</Popout.Content>
                    </Popout.Panel>
                </Popout>
            </div>
        </PopoutManager>
    );
}

describe.skipIf(!available)("8.4 light popover", () => {
    for (const scheme of SCHEMES) {
        it(`${scheme}: shell, header, title and close match Figma's stroke settings`, async () => {
            const { getByRole } = await renderFigma(<StrokeSettings />, { scheme });
            await drive(getByRole("button", { name: "Stroke" }), "open");
            const panel = await waitFor(() => document.querySelector<HTMLElement>('[role="dialog"]'));
            const cap = scheme === "light" ? "index-and-inventory/light-popover-stroke-settings" : "dark-theme/dark-effect-settings-popover";
            const shell = await figmaElement(cap, { index: 65 });
            const header = await figmaElement(cap, { index: 66 });
            const close = await figmaElement(cap, { tag: "button", aria: "Close" });
            expectMeasured(panel, figmaSpec(shell, ["width", "backgroundColor", "borderRadius"]));
            expectMeasured(panel, { borderTopWidth: "0px" });
            if (scheme === "light") {
                expectShadow(panel, shell.style.boxShadow);
            } else {
                expectShadow(panel, tokenShadow(panel.parentElement!, "--cm-elevation-400"));
            }
            const bar = part(panel, '[data-testid="popout-header"]');
            expectMeasured(bar, figmaSpec(header, ["height", "paddingLeft", "paddingRight", "boxShadow"]));
            const title = part(panel, "h2");
            const figmaTitle = await figmaElement("index-and-inventory/light-popover-stroke-settings", { index: 67 });
            expectMeasured(title, figmaSpec(figmaTitle, ["fontSize", "lineHeight", "fontWeight", "letterSpacing", "paddingLeft", "color"].filter((p) => scheme === "light" || p !== "color")));
            expect(box(title).left - box(panel).left).toBeCloseTo(figmaTitle.box[0] - 1120, 0);
            const x = part(panel, '[data-testid="popout-header-close"]');
            expectMeasured(x, { width: close.box[2], height: close.box[3] });
            expect(box(x).left - box(panel).left).toBeCloseTo(close.box[0] - shell.box[0], 0);
            expect(box(x).top - box(panel).top).toBeCloseTo(close.box[1] - shell.box[1], 0);
            // docked flush against what it opened from (POPOUT_GAP 0)
            const trigger = getByRole("button", { name: "Stroke" });
            expect(box(panel).right).toBeCloseTo(box(trigger).left, 0);
            // the body: 16px from the divider to the first 24px control of a 32px row
            const content = part(panel, ".cm-popout-content");
            expectMeasured(content, { paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16 });
        });
    }

    it("one root popover at a time; a child docks flush and stays; the trigger shows its open state", async () => {
        const child = (
            <Popout>
                <Popout.Trigger>
                    <button type="button">Create style</button>
                </Popout.Trigger>
                <Popout.Panel width={240} header={{ variant: "title", title: "Create style" }}>
                    <Popout.Content>child</Popout.Content>
                </Popout.Panel>
            </Popout>
        );
        const { getByRole } = await renderFigma(<StrokeSettings>{child}</StrokeSettings>);
        const stroke = getByRole("button", { name: "Stroke" });
        await drive(stroke, "open");
        await waitFor(() => document.querySelector('[role="dialog"]'));
        expect(stroke.getAttribute("aria-expanded")).toBe("true");
        await drive(getByRole("button", { name: "Create style" }), "open");
        const dialogs = await waitFor(() => {
            const all = document.querySelectorAll<HTMLElement>('[role="dialog"]');
            return all.length === 2 ? all : null;
        });
        const [parent, kid] = [...dialogs].sort((a, b) => box(b).left - box(a).left);
        expect(box(kid).right).toBeCloseTo(box(parent).left, 0);
        await drive(getByRole("button", { name: "Fill" }), "open");
        await waitFor(() => (document.querySelectorAll('[role="dialog"]').length === 1 ? true : null));
        expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Fill settings");
        expect(stroke.getAttribute("aria-expanded")).toBe("false");
    });

    it("a menu opened inside a popover keeps it; a menu opened outside closes it", async () => {
        const inside = (
            <Menu>
                <Menu.Target>
                    <button type="button">Inner menu</button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item>Inner item</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        );
        const { getByRole } = await renderFigma(
            <>
                <StrokeSettings>{inside}</StrokeSettings>
                <Menu>
                    <Menu.Target>
                        <button type="button">Outer menu</button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item>Outer item</Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </>,
        );
        await drive(getByRole("button", { name: "Stroke" }), "open");
        await waitFor(() => document.querySelector('[role="dialog"]'));
        await drive(getByRole("button", { name: "Inner menu" }), "open");
        await waitFor(() => document.querySelector(".mantine-Menu-dropdown"));
        await userEvent.click(row(document, "Inner item"));
        expect(document.querySelector('[role="dialog"]')).not.toBeNull();
        await drive(getByRole("button", { name: "Outer menu" }), "open");
        await waitFor(() => (document.querySelector('[role="dialog"]') ? null : true));
    });

    it("Escape closes and returns focus to the trigger", async () => {
        const { getByRole } = await renderFigma(<StrokeSettings />);
        const stroke = getByRole("button", { name: "Stroke" });
        await drive(stroke, "open");
        await waitFor(() => document.querySelector('[role="dialog"]'));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => (document.querySelector('[role="dialog"]') ? null : true));
        await waitFor(() => document.activeElement === stroke);
    });

    for (const scheme of SCHEMES) {
        it(`${scheme}: InfoCircle is a 24 ghost button with a 240 light-popover bubble in secondary text`, async () => {
            const { getByRole } = await renderFigma(<InfoCircle label="Resolution">Explanation</InfoCircle>, { scheme });
            const trigger = getByRole("button", { name: /Resolution/ });
            expectMeasured(trigger, { width: 24, height: 24 });
            await drive(trigger, "hover");
            const bubble = await waitFor(() => document.querySelector<HTMLElement>('[role="dialog"]'));
            expectMeasured(bubble, { width: 240, borderRadius: "13px", borderTopWidth: "0px" });
            expectMeasured(part(bubble, ".cm-info-bubble"), {
                color: scheme === "light" ? "#00000080" : "#ffffffb2",
                fontSize: "11px",
                lineHeight: "16px",
                fontWeight: "450",
            });
        });
    }

    it("Mantine Popover and HoverCard dropdowns get the same shell, padding 8", async () => {
        const figma = await figmaElement("index-and-inventory/light-popover-stroke-settings", { index: 65 });
        await renderFigma(
            <Popover opened withinPortal={false}>
                <Popover.Target>
                    <button type="button">P</button>
                </Popover.Target>
                <Popover.Dropdown>content</Popover.Dropdown>
            </Popover>,
        );
        const dropdown = await waitFor(() => document.querySelector<HTMLElement>(".mantine-Popover-dropdown"));
        expectMeasured(dropdown, { ...figmaSpec(figma, ["backgroundColor", "borderRadius"]), padding: "8px", borderTopWidth: "0px" });
        expectShadow(dropdown, figma.style.boxShadow);
    });
});

// ------------------------------------------------------------------ 8.5 modal

const DIALOG = "popovers-and-menus/dialog-file--save-to-version-history";

describe.skipIf(!available)("8.5 modal", () => {
    for (const scheme of SCHEMES) {
        it(`${scheme}: frame, header, close and footer match Figma's Save to version history`, async () => {
            await renderFigma(
                <Modal opened onClose={() => undefined} title="Save to version history">
                    <input data-autofocus aria-label="Title" />
                    <ModalFooter>
                        <Button variant="default">Cancel</Button>
                        <Button>Save</Button>
                    </ModalFooter>
                </Modal>,
                { scheme },
            );
            const content = await waitFor(() => document.querySelector<HTMLElement>(".mantine-Modal-content"));
            const frame = await figmaElement(DIALOG, { index: 24 });
            const header = await figmaElement(DIALOG, { index: 25 });
            const close = await figmaElement(DIALOG, { index: 47 });
            const footer = await figmaElement(DIALOG, { index: 36 });
            expectMeasured(content, figmaSpec(frame, ["width", "borderRadius", ...(scheme === "light" ? ["backgroundColor"] : [])]));
            if (scheme === "light") {
                expectShadow(content, frame.style.boxShadow);
            } else {
                expectMeasured(content, { backgroundColor: "#2c2c2c" });
                expectShadow(content, tokenShadow(content.parentElement!, "--cm-elevation-500"));
            }
            const bar = part(content, ".mantine-Modal-header");
            expectMeasured(bar, figmaSpec(header, ["height", "paddingRight", ...(scheme === "light" ? ["boxShadow"] : [])]));
            const title = part(content, ".mantine-Modal-title");
            expect(box(title).left - box(content).left).toBeCloseTo(16, 0);
            expectMeasured(title, figmaSpec(await figmaElement(DIALOG, { index: 26 }), ["fontSize", "lineHeight", "fontWeight", "letterSpacing"]));
            const x = part(content, ".mantine-Modal-close");
            expectMeasured(x, { width: close.box[2], height: close.box[3] });
            expect(box(x).left - box(content).left).toBeCloseTo(close.box[0] - frame.box[0], 0);
            expect(box(x).top - box(content).top).toBeCloseTo(close.box[1] - frame.box[1], 0);
            const body = part(content, ".mantine-Modal-body");
            expectMeasured(body, figmaSpec(await figmaElement(DIALOG, { index: 29 }), ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]));
            // Figma: header ends at y 420, the Title input starts at y 428.
            const field = part(content, 'input[aria-label="Title"]');
            expect(box(field).top - box(bar).bottom).toBeCloseTo(8, 0);
            const bottom = part(content, ".cm-modal-footer");
            expect(box(bottom).top - box(field).bottom).toBeCloseTo(8, 0);
            expectMeasured(bottom, {
                ...figmaSpec(footer, ["height", "paddingLeft", "paddingRight", ...(scheme === "light" ? ["boxShadow"] : [])]),
                width: frame.box[2],
            });
            expect(box(content).bottom - box(bottom).bottom).toBeCloseTo(0, 0);
            const buttons = bottom.querySelectorAll("button");
            expect(box(buttons[1]).left - box(buttons[0]).right).toBeCloseTo(8, 0);
            expect(box(bottom).right - box(buttons[1]).right).toBeCloseTo(8, 0);
            // centred, no backdrop by default, focus in the first field
            expect(document.querySelector(".mantine-Modal-overlay")).toBeNull();
            await waitFor(() => (document.activeElement?.getAttribute("aria-label") === "Title" ? true : null));
        });
    }
});

// ------------------------------------------------------------------ 8.6 toast

const TOAST = "popovers-and-menus/toast-action-copy-png";

describe.skipIf(!available)("8.6 toast", () => {
    for (const scheme of SCHEMES) {
        it(`${scheme}: pill, message and action match Figma's "Large PNG ready for copy"`, async () => {
            const { getByTestId } = await renderFigma(
                <Toast message="Large PNG ready for copy" action={{ label: "Copy to clipboard", onClick: () => undefined }} />,
                { scheme },
            );
            const pill = getByTestId("toast");
            const figma = await figmaElement(TOAST, { index: 35 });
            const message = await figmaElement(TOAST, { index: 36 });
            const action = await figmaElement(TOAST, { index: 41 });
            expectMeasured(pill, figmaSpec(figma, ["height", "backgroundColor", "borderRadius", "paddingLeft", "paddingRight"]));
            expectShadow(pill, figma.style.boxShadow);
            const msg = part(pill, '[role="alert"]');
            expectMeasured(
                msg,
                figmaSpec(message, ["height", "color", "fontSize", "lineHeight", "fontWeight", "letterSpacing", "paddingLeft", "paddingTop"]),
            );
            // The pill's width is its chrome plus the message text; the bundled Inter Variable sets
            // the text a few px narrower than Figma's Inter, so compare the chrome only.
            const btn = part(pill, "button");
            const textDelta = message.box[2] - box(msg).width + (action.box[2] - box(btn).width);
            expect(box(pill).width).toBeCloseTo(figma.box[2] - textDelta, 0);
            expectMeasured(btn, figmaSpec(action, ["height", "color", "borderRadius", "outline", "outlineOffset", "fontWeight"]));
            expect(box(btn).left - box(msg).right).toBeCloseTo(action.box[0] - (message.box[0] + message.box[2]), 0);
            // text 8px in from each side (the label is narrower than Figma's by the font delta)
            const label = part(btn, ".mantine-Button-label");
            expect(box(label).left - box(btn).left).toBeCloseTo(8, 0);
            expect(box(btn).right - box(label).right).toBeCloseTo(8, 0);
            await drive(btn, "hover");
            expectMeasured(btn, { backgroundColor: "#ffffff0d" });
        });
    }
});

// ------------------------------------------------------------------ 8.7 scrollbar

describe.skipIf(!available)("8.7 overlay scrollbar", () => {
    it("10px track, a 6px pill 4px shorter than its thumb, shown only while hovered", async () => {
        const { container } = await renderFigma(
            <ScrollArea h={200} w={240}>
                <div style={{ height: 1000 }}>long</div>
            </ScrollArea>,
        );
        const root = part(container, ".mantine-ScrollArea-root");
        expect(container.querySelector('.mantine-ScrollArea-scrollbar[data-state="visible"]')).toBeNull();
        await drive(root, "hover");
        const track = await waitFor(() => container.querySelector<HTMLElement>('.mantine-ScrollArea-scrollbar[data-orientation="vertical"]'));
        expectMeasured(track, { width: 10, paddingLeft: 2, paddingRight: 2, backgroundColor: "#00000000" });
        const thumb = await waitFor(() => track.querySelector<HTMLElement>(".mantine-ScrollArea-thumb"));
        expectMeasured(thumb, { width: 6, backgroundColor: "#00000000" });
        const pill = computed(thumb, "::after");
        expect(pill.backgroundColor).toBe("rgba(179, 179, 179, 0.5)");
        expect(pill.borderRadius).toBe("6px");
        expect(parseFloat(pill.height)).toBeCloseTo(box(thumb).height - 4, 1);
        await drive(track, "hover");
        expectMeasured(track, { boxShadow: "rgb(230, 230, 230) 1px 0px 0px 0px inset" });
        await commands.mouseAway();
        await waitFor(() => (container.querySelector('.mantine-ScrollArea-scrollbar[data-state="visible"]') ? null : true), 500);
    });
});

// ------------------------------------------------------------------ 8.8 feedback

describe.skipIf(!available)("8.8 feedback", () => {
    for (const scheme of SCHEMES) {
        it(`${scheme}: Loader 16 in --cm-icon; Progress 4px, full radius, track and fill on tokens`, async () => {
            const { container } = await renderFigma(
                <>
                    <Loader data-testid="loader" />
                    <Progress value={50} />
                </>,
                { scheme },
            );
            const loader = part(container, ".mantine-Loader-root");
            expectMeasured(loader, { width: 16, height: 16 });
            expect(computed(loader, "::after").borderTopColor).toBe(scheme === "light" ? "rgba(0, 0, 0, 0.898)" : "rgb(255, 255, 255)");
            const bar = part(container, ".mantine-Progress-root");
            expectMeasured(bar, {
                height: 4,
                borderRadius: "9999px",
                backgroundColor: scheme === "light" ? "#f5f5f5" : "#383838",
            });
            expectMeasured(part(bar, ".mantine-Progress-section"), {
                backgroundColor: scheme === "light" ? "#0d99ff" : "#0c8ce9",
            });
        });
    }
});
