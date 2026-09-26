/**
 * The editor shell against the Figma study (design/figma-spec.md 11): the toolbar, tool buttons,
 * tool groups and their flyout, the secondary bar, the navigation rail, the help button, the key
 * caps and the shortcuts sheet, the quick actions palette, and the display components (Badge,
 * Indicator, Avatar, Kbd). Every expected value is read from a capture's styles.json, cited as
 * `folder/capture #n`, in light and (where Figma was captured dark) dark.
 *
 * Hover, press and focus are driven with real input through the harness.
 */
import { Avatar, Badge, Indicator, Kbd, Pill, Tooltip } from "@mantine/core";
import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it } from "vitest";

import {
    HelpButton,
    NavRail,
    QuickActions,
    RailButton,
    SecondaryToolbar,
    ShortcutSheet,
    Toolbar,
    ToolButton,
    ToolGroup,
    type ToolItem,
} from "../../src";
import {
    drive,
    expectMeasured,
    figmaAvailable,
    figmaElement,
    figmaSpec,
    type MeasureSpec,
    part,
    renderFigma,
    resetHarness,
} from "./harness";

afterEach(resetHarness);

const Glyph = (): React.JSX.Element => <svg width={18} height={18} aria-hidden="true" />;
const SHAPES: ToolItem[] = [
    { value: "rectangle", label: "Rectangle", icon: <Glyph />, shortcut: "R" },
    { value: "line", label: "Line", icon: <Glyph />, shortcut: "L" },
    { value: "arrow", label: "Arrow", icon: <Glyph />, shortcut: "Shift+L" },
];

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const openTooltip = (): HTMLElement | null => document.querySelector<HTMLElement>(".cm-tooltip");

const BOX = ["width", "height", "backgroundColor", "borderRadius"];

/**
 * A spec from a capture element, for the given properties.
 * @param path - the capture
 * @param index - the element index
 * @param props - the properties
 * @returns the spec
 */
async function fig(path: string, index: number, props: readonly string[]): Promise<MeasureSpec> {
    return figmaSpec(await figmaElement(path, { index }), props);
}

describe.skipIf(!(await figmaAvailable()))("editor shell against Figma", () => {
    describe("Toolbar (bt/toolbar-default)", () => {
        const toolbar = (): React.JSX.Element => (
            <Toolbar aria-label="Editor">
                <ToolGroup label="Shape tools" tools={SHAPES} activeTool="rectangle" />
                <ToolButton label="Frame" icon={<Glyph />} />
                <Toolbar.Divider />
                <ToolButton label="Actions" icon={<Glyph />} />
            </Toolbar>
        );

        it("light: the bar is 48 tall, white, radius 13", async () => {
            const { container } = await renderFigma(toolbar(), { scheme: "light" });
            expectMeasured(
                part(container, ".cm-toolbar"),
                await fig("bt/toolbar-default", 24, ["height", "backgroundColor", "borderRadius", "color", "boxShadow"]),
            );
        });

        it("dark: the bar is #2c2c2c", async () => {
            const { container } = await renderFigma(toolbar(), { scheme: "dark" });
            expectMeasured(
                part(container, ".cm-toolbar"),
                await fig("dt/dark-dialog-quick-actions", 25, ["height", "backgroundColor", "borderRadius", "color", "boxShadow"]),
            );
        });

        it("light and dark: the divider is 1 x 48 in the border colour", async () => {
            const light = await renderFigma(toolbar(), { scheme: "light" });
            expectMeasured(part(light.container, ".cm-toolbar-divider"), await fig("bt/toolbar-default", 82, BOX));
            await resetHarness();
            const dark = await renderFigma(toolbar(), { scheme: "dark" });
            expectMeasured(part(dark.container, ".cm-toolbar-divider"), await fig("dt/dark-dialog-quick-actions", 31, BOX));
        });

        it("the tool group is 49 x 32 with a 1px gap, the selected tool 32 x 32 brand, the chevron 16 x 32", async () => {
            const { container } = await renderFigma(toolbar(), { scheme: "light" });
            expectMeasured(part(container, ".cm-tool-group"), await fig("bt/toolbar-default", 31, ["width", "height", "gap"]));
            expectMeasured(
                part(container, ".cm-tool[aria-pressed='true']"),
                await fig("bt/toolbar-default", 32, [...BOX, "paddingTop", "paddingLeft", "color"]),
            );
            expectMeasured(
                part(container, ".cm-tool-chevron"),
                await fig("bt/toolbar-default", 35, [...BOX, "paddingTop", "paddingLeft"]),
            );
        });

        it("AA option: the selected tool's fill is the darker brand (white on it passes 4.5:1)", async () => {
            const { container } = await renderFigma(toolbar(), { scheme: "light", highContrast: true });
            expectMeasured(part(container, ".cm-tool[aria-pressed='true']"), { backgroundColor: "#0768cf", color: "#ffffff" });
        });

        it("the first tool sits 8px in from the bar", async () => {
            const { container } = await renderFigma(toolbar(), { scheme: "light" });
            const bar = part(container, ".cm-toolbar");
            expectMeasured(part(container, ".cm-tool-group"), { x: 8, y: 8 }, { origin: bar });
        });
    });

    describe("ToolButton states (bc/tool-rectangle--*)", () => {
        it.each([
            ["hover", "bc/tool-rectangle--hover", 34],
            ["press", "bc/tool-rectangle--pressed", 34],
        ] as const)("%s fills --cm-bg-hover", async (state, capture, index) => {
            const { container } = await renderFigma(
                <Toolbar>
                    <ToolButton label="Rectangle" icon={<Glyph />} />
                </Toolbar>,
            );
            const button = part(container, ".cm-tool");
            await drive(button, state);
            expectMeasured(button, await fig(capture, index, BOX));
        });

        it("keyboard focus draws a 1px ring inside", async () => {
            const { container } = await renderFigma(
                <Toolbar>
                    <ToolButton label="Rectangle" icon={<Glyph />} />
                </Toolbar>,
            );
            const button = part(container, ".cm-tool");
            await drive(button, "focus");
            expectMeasured(button, await fig("bc/tool-rectangle--focus", 34, ["outline", "outlineOffset"]));
        });

        it("the selected tool's focus is the double ring", async () => {
            const { container } = await renderFigma(
                <Toolbar>
                    <ToolButton label="Move" icon={<Glyph />} selected />
                </Toolbar>,
            );
            const button = part(container, ".cm-tool");
            await drive(button, "focus");
            expectMeasured(button, {
                boxShadow: "rgb(255, 255, 255) 0px 0px 0px 1px inset, rgb(255, 255, 255) 0px 0px 0px 1px, rgb(13, 153, 255) 0px 0px 0px 2px",
            });
        });
    });

    describe("Chevron and flyout (bc/tool-chevron--*, bt/flyout-ShapeTools-chevron)", () => {
        const group = (): React.JSX.Element => (
            <div style={{ paddingTop: 200 }}>
                <Toolbar>
                    <ToolGroup label="Shape tools" tools={SHAPES} activeTool="rectangle" />
                </Toolbar>
            </div>
        );

        it("hover fills --cm-bg-hover, press --cm-bg-pressed", async () => {
            const { container } = await renderFigma(group());
            const chevron = part(container, ".cm-tool-chevron");
            await drive(chevron, "hover");
            expectMeasured(chevron, await fig("bc/tool-chevron--hover", 34, BOX));
            await drive(chevron, "press");
            expectMeasured(chevron, await fig("bc/tool-chevron--pressed", 34, BOX));
        });

        it("keyboard focus draws a 1px ring inside", async () => {
            const { container } = await renderFigma(group());
            const chevron = part(container, ".cm-tool-chevron");
            // One Tab stop: Tab lands on the selected tool, ArrowRight moves to its chevron.
            await drive(part(container, ".cm-tool"), "focus");
            await userEvent.keyboard("{ArrowRight}");
            expect(chevron).toHaveFocus();
            expectMeasured(chevron, await fig("bc/tool-chevron--focus", 34, ["outline", "outlineOffset"]));
        });

        it("opens a dark menu 4px above, start-aligned, with radio rows; the chevron stays pressed", async () => {
            const { container } = await renderFigma(group());
            const chevron = part(container, ".cm-tool-chevron");
            await drive(chevron, "open");
            const menu = part(document.body, "[role='menu']");
            expectMeasured(
                menu,
                await fig("bt/flyout-ShapeTools-chevron", 115, ["backgroundColor", "borderRadius", "paddingTop", "paddingBottom"]),
            );
            const c = chevron.getBoundingClientRect();
            const m = menu.getBoundingClientRect();
            expect(c.top - m.bottom).toBeCloseTo(4, 0);
            expect(m.left).toBeCloseTo(c.left, 0);
            expectMeasured(chevron, { backgroundColor: "#e6e6e6" });

            const row = part(menu, "[role='menuitemradio'][aria-checked='true']");
            expectMeasured(row, await fig("bt/flyout-ShapeTools-chevron", 119, ["height", "color", "fontSize", "lineHeight", "fontWeight"]));
            const check = part(row, ".cm-tool-flyout-check");
            const label = part(row, "[class*='itemLabel']");
            expectMeasured(check, { x: 12, width: 16, height: 16, opacity: "1" }, { origin: row });
            expectMeasured(label, { x: 60 }, { origin: row });
            expectMeasured(part(menu, "[role='menuitemradio'][aria-checked='false'] .cm-tool-flyout-check"), { opacity: "0" });
        });

        it("picking a row makes it the face and closes the flyout", async () => {
            const { container } = await renderFigma(
                <div style={{ paddingTop: 200 }}>
                    <Toolbar>
                        <ToolGroup label="Shape tools" tools={SHAPES} />
                    </Toolbar>
                </div>,
            );
            await drive(part(container, ".cm-tool-chevron"), "open");
            await userEvent.click(document.body.querySelectorAll<HTMLElement>("[role='menuitemradio']")[1]);
            expect(document.body.querySelector("[role='menu']")).toBeNull();
            expect(part(container, ".cm-tool").getAttribute("aria-label")).toBe("Line");
        });

        it("after a pick the picked tool is focused and is the toolbar's Tab stop (spec 11.1)", async () => {
            const { container } = await renderFigma(
                <div style={{ paddingTop: 200 }}>
                    <Toolbar>
                        <ToolGroup label="Shape tools" tools={SHAPES} activeTool="rectangle" />
                    </Toolbar>
                </div>,
            );
            const chevron = part(container, ".cm-tool-chevron");
            await drive(part(container, ".cm-tool"), "focus");
            await userEvent.keyboard("{ArrowRight}");
            expect(chevron).toHaveFocus();
            await userEvent.keyboard("{Enter}");
            await expect.poll(() => document.body.querySelector("[role='menuitemradio']")).not.toBeNull();
            await userEvent.keyboard("{ArrowDown}{Enter}");
            expect(document.body.querySelector("[role='menu']")).toBeNull();
            const face = part(container, ".cm-tool");
            await expect.poll(() => document.activeElement).toBe(face);
            expect(face.tabIndex).toBe(0);
            expect(chevron.tabIndex).toBe(-1);
        });

        it("Escape closes the flyout and returns focus to the chevron", async () => {
            const { container } = await renderFigma(
                <div style={{ paddingTop: 200 }}>
                    <Toolbar>
                        <ToolGroup label="Shape tools" tools={SHAPES} activeTool="rectangle" />
                    </Toolbar>
                </div>,
            );
            const chevron = part(container, ".cm-tool-chevron");
            await drive(part(container, ".cm-tool"), "focus");
            await userEvent.keyboard("{ArrowRight}{Enter}");
            await expect.poll(() => document.body.querySelector("[role='menuitemradio']")).not.toBeNull();
            await userEvent.keyboard("{Escape}");
            await expect.poll(() => document.activeElement).toBe(chevron);
        });
    });

    describe("SecondaryToolbar (bt/secondary-vector-bar)", () => {
        it("the bar is 40 tall with 8px padding and a gap of 8; the selected item is brand", async () => {
            const { container } = await renderFigma(
                <SecondaryToolbar aria-label="Vector editing">
                    <SecondaryToolbar.Button icon={<Glyph />} selected>
                        Move
                    </SecondaryToolbar.Button>
                    <SecondaryToolbar.Divider />
                    <SecondaryToolbar.Button icon={<Glyph />}>Lasso</SecondaryToolbar.Button>
                </SecondaryToolbar>,
            );
            expectMeasured(
                part(container, ".cm-secondary-toolbar"),
                await fig("bt/secondary-vector-bar", 25, ["height", "backgroundColor", "borderRadius", "paddingTop", "paddingLeft", "gap"]),
            );
            expectMeasured(
                part(container, ".cm-secondary-item[aria-pressed='true']"),
                // Height, not width: text-hugging widths differ by a pixel or two between Figma's
                // Inter and the bundled Inter 4 (see the report).
                await fig("bt/secondary-vector-bar", 26, ["height", "backgroundColor", "borderRadius"]),
            );
            expectMeasured(part(container, ".cm-secondary-divider"), await fig("bt/secondary-vector-bar", 34, ["width", "height", "backgroundColor"]));
            expectMeasured(
                part(container, ".cm-secondary-item-label"),
                await fig("bt/secondary-vector-bar", 29, ["fontSize", "lineHeight", "fontWeight", "paddingRight", "color"]),
            );
        });
    });

    describe("Label ink (bt/secondary-vector-bar, dt/*-dialog-quick-actions)", () => {
        it("a bar label is pure black in light and white in dark; its glyph keeps --cm-icon", async () => {
            const bar = (
                <SecondaryToolbar aria-label="Vector editing">
                    <SecondaryToolbar.Button icon={<Glyph />}>Lasso</SecondaryToolbar.Button>
                </SecondaryToolbar>
            );
            const light = await renderFigma(bar, { scheme: "light" });
            expectMeasured(part(light.container, ".cm-secondary-item-label"), { color: "#000000" });
            expectMeasured(part(light.container, ".cm-secondary-item"), { color: "#000000e5" });
            await resetHarness();
            const dark = await renderFigma(bar, { scheme: "dark" });
            expectMeasured(part(dark.container, ".cm-secondary-item-label"), { color: "#ffffff" });
        });

        it("a palette row's text is pure black in light (dt/light-dialog-quick-actions)", async () => {
            const { container } = await renderFigma(
                <QuickActions actions={[{ value: "a", label: "Nudge amount", section: "Recents" }]} onRun={() => undefined} />,
                { scheme: "light" },
            );
            expectMeasured(part(container, ".cm-qa-row-label"), { color: "#000000" });
        });
    });

    describe("SecondaryToolbar dropdown button (bt/secondary-vector-bar #53-#55)", () => {
        it("'More': the label at x+8, a 16px chevron, 4px end padding, the canvas shadow on the bar", async () => {
            const { container } = await renderFigma(
                <SecondaryToolbar aria-label="Vector editing">
                    <SecondaryToolbar.Button dropdown>More</SecondaryToolbar.Button>
                </SecondaryToolbar>,
            );
            const more = part(container, ".cm-secondary-item");
            // Figma puts the 8 / 4 insets on an inner wrapper, so the geometry is asserted, not paddings.
            expectMeasured(more, await fig("bt/secondary-vector-bar", 53, ["height"]));
            // The text starts at x+8: the label box sits at 0 with 8px of start padding.
            expectMeasured(part(more, ".cm-secondary-item-label"), { x: 0, paddingLeft: 8 }, { origin: more });
            expectMeasured(part(more, ".cm-secondary-item-chevron"), await fig("bt/secondary-vector-bar", 55, ["width", "height"]));
            const chevron = part(more, ".cm-secondary-item-chevron").getBoundingClientRect();
            expect(more.getBoundingClientRect().right - chevron.right).toBeCloseTo(4, 1);
            expectMeasured(part(container, ".cm-secondary-toolbar"), await fig("bt/secondary-vector-bar", 25, ["boxShadow"]));
        });
    });

    describe("NavRail and RailButton (ls/rail-*)", () => {
        const rail = (): React.JSX.Element => (
            <div style={{ height: 400 }}>
                <NavRail aria-label="Navigation Bar">
                    <NavRail.Separator />
                    <RailButton icon={<Glyph />} label="File" active />
                    <RailButton icon={<Glyph />} label="Assets" />
                </NavRail>
            </div>
        );

        it("light: the rail, the button, the active pill and the caption", async () => {
            const { container } = await renderFigma(rail(), { scheme: "light" });
            expectMeasured(
                part(container, ".cm-nav-rail"),
                await fig("ls/rail-default", 14, ["width", "backgroundColor", "paddingTop", "paddingBottom"]),
            );
            expectMeasured(part(container, ".cm-nav-rail-separator"), await fig("ls/rail-default", 19, ["width", "height"]));
            expectMeasured(
                part(container, ".cm-rail-button[data-active]"),
                await fig("ls/rail-default", 20, ["width", "height", "paddingTop", "paddingBottom", "gap"]),
            );
            expectMeasured(
                part(container, ".cm-rail-button[data-active] .cm-rail-pill"),
                await fig("ls/rail-default", 21, [...BOX, "outlineOffset"]),
            );
            expectMeasured(
                part(container, ".cm-rail-label"),
                await fig("ls/rail-default", 24, ["width", "height", "color", "fontSize", "lineHeight", "fontWeight"]),
            );
        });

        it("dark: the rail is #2c2c2c and the active pill #394360", async () => {
            const { container } = await renderFigma(rail(), { scheme: "dark" });
            expectMeasured(part(container, ".cm-nav-rail"), await fig("dt/dark-dialog-keyboard-shortcuts", 24, ["width", "backgroundColor"]));
            expectMeasured(
                part(container, ".cm-rail-button[data-active] .cm-rail-pill"),
                await fig("dt/dark-dialog-keyboard-shortcuts", 27, BOX),
            );
            expectMeasured(part(container, ".cm-rail-label"), await fig("dt/dark-dialog-keyboard-shortcuts", 30, ["color"]));
        });

        it("hover fills the pill --cm-bg-hover", async () => {
            const { container } = await renderFigma(rail());
            const button = part(container, ".cm-rail-button:not([data-active])");
            await drive(button, "hover");
            expectMeasured(part(button, ".cm-rail-pill"), await fig("ls/rail-assets-hover", 18, BOX));
        });

        it("keyboard focus rings the inactive pill at offset 0", async () => {
            const { container } = await renderFigma(rail());
            await drive(part(container, ".cm-rail-button[data-active]"), "focus");
            await userEvent.keyboard("{ArrowDown}");
            const pill = part(container, ".cm-rail-button:not([data-active]) .cm-rail-pill");
            expectMeasured(pill, await fig("ls/rail-focus-ring-inactive", 38, ["outline", "outlineOffset"]));
        });
    });

    describe("Rail and help tooltips (flows.md 211, spec 8.3)", () => {
        const railIn = (content: React.ReactNode): React.JSX.Element => (
            <div style={{ height: 400 }}>
                <NavRail>
                    <RailButton icon={<Glyph />} label="File" active />
                    <RailButton icon={<Glyph />} label="Assets" />
                    {content}
                </NavRail>
            </div>
        );

        it("a rail tooltip opens after 500ms, 6px past the button, its arrow outside the rail, centred on the pill", async () => {
            const { container } = await renderFigma(railIn(null));
            const button = part(container, ".cm-rail-button:not([data-active])");
            await drive(button, "hover");
            await sleep(350);
            expect(openTooltip()).toBeNull();
            await sleep(350);
            const tip = openTooltip();
            expect(tip).not.toBeNull();
            const t = (tip as HTMLElement).getBoundingClientRect();
            const b = button.getBoundingClientRect();
            const pill = part(button, ".cm-rail-pill").getBoundingClientRect();
            // ls/state-rail-button-hover-tooltip #70: bubble at x=62 for a button ending at 56,
            // arrow box [56, 6 wide]; the tooltip centre is the pill centre.
            expect(t.left - b.right).toBeCloseTo(6, 1);
            const arrow = part(tip as HTMLElement, "[class*='arrow']").getBoundingClientRect();
            expect(arrow.left).toBeGreaterThanOrEqual(b.right - 0.5);
            expect(t.top + t.height / 2).toBeCloseTo(pill.top + pill.height / 2, 0);
        });

        it("inside the app's Tooltip.Group the rail joins it: a warm hand-off from a toolbar tooltip is instant", async () => {
            const { container } = await renderFigma(
                <Tooltip.Group>
                    <Toolbar aria-label="Editor">
                        <ToolButton label="Frame" icon={<Glyph />} />
                    </Toolbar>
                    {railIn(null)}
                </Tooltip.Group>,
            );
            await drive(part(container, ".cm-tool"), "hover");
            await expect.poll(openTooltip, { timeout: 2000 }).not.toBeNull();
            await drive(part(container, ".cm-rail-button:not([data-active])"), "hover");
            await sleep(100);
            expect(openTooltip()?.textContent).toBe("Assets");
        });

        it("the help tooltip shows and hides at once", async () => {
            const { container } = await renderFigma(<HelpButton />);
            const button = part(container, ".cm-help-button");
            await drive(button, "hover");
            await sleep(100);
            expect(openTooltip()).not.toBeNull();
            await userEvent.unhover(button);
            await sleep(100);
            expect(openTooltip()).toBeNull();
        });
    });

    describe("HelpButton (bc/help-button--*)", () => {
        it("rest: a 32 circle on the panel colour with a transparent border", async () => {
            const { container } = await renderFigma(<HelpButton />);
            expectMeasured(
                part(container, ".cm-help-button"),
                await fig("bc/help-button--default", 24, [...BOX, "borderTopWidth", "borderTopColor", "boxShadow"]),
            );
            // The bare question mark: a 30 x 32 svg whose mark is 8.5 x 15.8 (#25 #26).
            expectMeasured(part(container, ".cm-help-button svg"), await fig("bc/help-button--default", 25, ["width", "height"]));
            expectMeasured(part(container, ".cm-help-button path"), await fig("bc/help-button--default", 26, ["width", "height"]));
        });

        it("focus: a 1px ring at -2px and a brand border", async () => {
            const { container } = await renderFigma(<HelpButton />);
            const button = part(container, ".cm-help-button");
            await drive(button, "focus");
            await new Promise((r) => setTimeout(r, 250));
            expectMeasured(
                button,
                await fig("bc/help-button--focus", 24, ["outline", "outlineOffset", "borderTopColor"]),
            );
        });
    });

    describe("Display components", () => {
        it("Badge: the outlined Beta badge (bt/mode-metronome-full #296)", async () => {
            const { container } = await renderFigma(<Badge>Beta</Badge>);
            expectMeasured(
                part(container, ".mantine-Badge-root"),
                // No width: "Beta" sets 3px narrower in the bundled Inter 4 than in Figma's Inter;
                // the padding (0 4) that hugs it matches.
                await fig("bt/mode-metronome-full", 296, [
                    "height",
                    "backgroundColor",
                    "color",
                    "borderRadius",
                    "paddingLeft",
                    "paddingRight",
                    "fontSize",
                    "lineHeight",
                    "fontWeight",
                    "letterSpacing",
                    "outline",
                    "outlineOffset",
                ]),
            );
        });

        it("Pill: a disabled pill dims its text (spec 6.7)", async () => {
            const { container } = await renderFigma(
                <>
                    <Pill>rest</Pill>
                    <Pill disabled>disabled</Pill>
                </>,
            );
            const [rest, disabled] = container.querySelectorAll<HTMLElement>(".cm-pill");
            expect(getComputedStyle(disabled).color).not.toBe(getComputedStyle(rest).color);
            expectMeasured(disabled, { color: "rgba(0, 0, 0, 0.3)" });
        });

        it("Indicator: a 9px brand dot with a 2px panel-colour ring (ls/rail-default #56)", async () => {
            const { container } = await renderFigma(
                <Indicator>
                    <span style={{ display: "block", width: 32, height: 32 }} />
                </Indicator>,
            );
            expectMeasured(
                part(container, ".mantine-Indicator-indicator"),
                await fig("ls/rail-default", 56, [...BOX, "borderTopWidth", "borderTopColor"]),
            );
        });

        it("Avatar: 24 with a 12/24 initial; in a stack 28 with a 2px ring, 21px apart (hm/header-right-default)", async () => {
            const single = await renderFigma(<Avatar color="pink">A</Avatar>);
            expectMeasured(part(single.container, ".mantine-Avatar-root"), await fig("hm/header-right-default", 59, ["width", "height"]));
            expectMeasured(
                part(single.container, ".mantine-Avatar-placeholder"),
                await fig("hm/header-right-default", 59, ["fontSize", "lineHeight", "fontWeight", "color"]),
            );
            await resetHarness();
            const stack = await renderFigma(
                <Avatar.Group>
                    <Avatar color="pink">A</Avatar>
                    <Avatar color="pink">A</Avatar>
                </Avatar.Group>,
            );
            const [a, b] = stack.container.querySelectorAll<HTMLElement>(".mantine-Avatar-root");
            expectMeasured(a, await fig("hm/header-right-default", 39, ["width", "height", "borderTopWidth", "borderTopColor"]));
            expect(b.getBoundingClientRect().left - a.getBoundingClientRect().left).toBe(21);
        });

        it("Kbd: the list caps (pm/keyboard-shortcuts-tab-tools #114, #141)", async () => {
            const { container } = await renderFigma(
                <>
                    <Kbd>V</Kbd>
                    <Kbd>Shift</Kbd>
                </>,
            );
            const [single, word] = container.querySelectorAll<HTMLElement>(".mantine-Kbd-root");
            const props = ["width", "height", "backgroundColor", "color", "borderTopColor", "borderTopWidth", "borderRadius", "fontSize", "lineHeight", "fontWeight"];
            expectMeasured(single, await fig("pm/keyboard-shortcuts-tab-tools", 114, props));
            expectMeasured(
                word,
                await fig("pm/keyboard-shortcuts-tab-tools", 141, [...props.filter((p) => p !== "width"), "paddingLeft", "paddingRight", "paddingTop"]),
            );
        });

        it("Kbd md: the essential caps, plain and lit (ma/keyboard-shortcuts-essential #128, #147)", async () => {
            const { container } = await renderFigma(
                <>
                    <Kbd size="md">Ctrl</Kbd>
                    <Kbd size="md" mod={{ active: true }}>
                        Ctrl
                    </Kbd>
                </>,
                { scheme: "dark" },
            );
            const [plain, lit] = container.querySelectorAll<HTMLElement>(".mantine-Kbd-root");
            const props = ["width", "height", "backgroundColor", "color", "borderTopColor", "fontSize", "lineHeight"];
            expectMeasured(plain, await fig("ma/keyboard-shortcuts-essential", 128, props));
            expectMeasured(lit, await fig("ma/keyboard-shortcuts-essential", 147, props));
        });
    });

    describe("ShortcutSheet (pm/keyboard-shortcuts-tab-tools)", () => {
        const TABS = [
            { value: "essential", label: "Essential", groups: [] },
            {
                value: "tools",
                label: "Tools",
                groups: [{ shortcuts: [{ label: "Move tool", keys: ["V"], icon: <Glyph /> }] }],
            },
            { value: "view", label: "View", groups: [] },
            { value: "zoom", label: "Zoom", groups: [] },
        ];
        const sheet = (): React.JSX.Element => <ShortcutSheet tabs={TABS} defaultValue="tools" onClose={() => undefined} />;

        it("light: #1e1e1e, a transparent top border, the folder-tab strip and the close button", async () => {
            const { container } = await renderFigma(sheet(), { scheme: "light" });
            const root = part(container, ".cm-shortcut-sheet");
            expectMeasured(root, await fig("pm/keyboard-shortcuts-tab-tools", 80, ["backgroundColor", "borderTopWidth", "fontSize", "lineHeight"]));
            // Figma's light edge is transparent white; ours transparent black. Both draw nothing.
            expect(getComputedStyle(root).borderTopColor).toBe("rgba(0, 0, 0, 0)");
            const tab = (name: string): HTMLElement => part(container, `[role='tab'][id$='-${TABS.findIndex((t) => t.label === name)}']`);
            // Tabs hug their text, which sets a pixel or two narrower in the bundled Inter 4, so the
            // widths are left out and the paddings asserted.
            const tabProps = ["height", "color", "fontSize", "lineHeight", "paddingLeft", "paddingRight"];
            expectMeasured(tab("Essential"), await fig("pm/keyboard-shortcuts-tab-tools", 83, [...tabProps, "borderRightWidth", "borderBottomWidth", "borderBottomColor", "borderRadius"]));
            expectMeasured(tab("Tools"), await fig("pm/keyboard-shortcuts-tab-tools", 84, tabProps));
            expectMeasured(tab("View"), await fig("pm/keyboard-shortcuts-tab-tools", 85, [...tabProps, "borderLeftWidth", "borderRadius"]));
            expectMeasured(tab("Zoom"), await fig("pm/keyboard-shortcuts-tab-tools", 86, tabProps));
            expectMeasured(part(container, ".cm-sheet-close"), await fig("pm/keyboard-shortcuts-tab-tools", 97, ["width", "height", "color", "borderBottomWidth"]));
            expectMeasured(
                part(container, ".cm-sheet-row-label"),
                await fig("pm/keyboard-shortcuts-tab-tools", 111, ["color", "fontSize", "lineHeight", "paddingRight"]),
            );
            expectMeasured(part(container, ".cm-sheet-row"), { height: 37 });
            // The strip is 38 tall; its 39px tabs overflow it by 1px (#81).
            expectMeasured(part(container, ".cm-sheet-strip"), await fig("pm/keyboard-shortcuts-tab-tools", 81, ["height"]));
        });

        it("dark: a 1px #444 top border", async () => {
            const { container } = await renderFigma(sheet(), { scheme: "dark" });
            expectMeasured(
                part(container, ".cm-shortcut-sheet"),
                await fig("dt/dark-dialog-keyboard-shortcuts", 590, ["backgroundColor", "borderTopWidth", "borderTopColor"]),
            );
        });
    });

    describe("ShortcutSheet essential tab (ma/keyboard-shortcuts-essential)", () => {
        const ESSENTIAL = [
            {
                value: "essential",
                label: "Essential",
                variant: "essential" as const,
                caption: "Essential keyboard shortcuts",
                groups: [
                    { shortcuts: [{ label: "Show/Hide UI", description: "Press it now to quickly hide the panes and focus on your work", keys: ["Ctrl", "\\"] }] },
                    { shortcuts: [{ label: "Pick color", description: "Grab a color from elsewhere without losing your flow", keys: ["I"] }] },
                ],
            },
            { value: "tools", label: "Tools", groups: [] },
        ];

        it("the caption, the numbered column, the 68px row, its label, description and caps", async () => {
            const { container } = await renderFigma(<ShortcutSheet tabs={ESSENTIAL} onClose={() => undefined} />, { scheme: "light" });
            const path = "ma/keyboard-shortcuts-essential";
            expectMeasured(part(container, ".cm-sheet-body"), await fig(path, 117, ["paddingTop"]));
            expectMeasured(part(container, ".cm-sheet-caption"), await fig(path, 118, ["height", "fontSize", "lineHeight", "color", "paddingBottom", "marginTop"]));
            const column = part(container, ".cm-sheet-column");
            expectMeasured(column, await fig(path, 120, ["width"]));
            // The row starts 33px into the column, under the 23px step circle (#120 #123).
            expectMeasured(part(column, ".cm-sheet-row"), { x: 0, y: 33, height: 68 }, { origin: column });
            const row = part(column, ".cm-sheet-row");
            expectMeasured(part(row, ".cm-sheet-row-label"), await fig(path, 124, ["fontSize", "lineHeight", "color", "paddingRight"]));
            expectMeasured(part(row, ".cm-sheet-row-description"), await fig(path, 125, ["fontSize", "lineHeight", "color", "paddingTop"]));
            // Label text 10px down, caps 6px down (#124 text at y+10, #128 at y+6).
            expectMeasured(part(row, ".cm-sheet-row-description"), { y: 34 }, { origin: row });
            const caps = row.querySelectorAll<HTMLElement>(".mantine-Kbd-root");
            expectMeasured(caps[0], { y: 6, ...(await fig(path, 128, ["height", "fontSize", "lineHeight", "color", "backgroundColor"])) }, { origin: row });
            expectMeasured(caps[1], await fig(path, 129, ["width", "height"]));
            // Columns 302 wide, 46 apart (#120 at 301, #130 at 649).
            const [first, second] = container.querySelectorAll<HTMLElement>(".cm-sheet-column");
            expectMeasured(second, { x: 348 }, { origin: first });
        });
    });

    describe("QuickActions (pm/quick-actions-open)", () => {
        const ACTIONS = [
            { value: "wire", label: "Ink Wireframe", section: "Recents", icon: <Glyph /> },
            { value: "image", label: "Make an image", section: "Image editing", icon: <Glyph /> },
        ];

        it("light: the panel, the search, a heading, the highlighted and a plain row", async () => {
            const { container } = await renderFigma(<QuickActions actions={ACTIONS} onRun={() => undefined} />, { scheme: "light" });
            const panel = part(container, ".cm-quick-actions");
            expectMeasured(
                panel,
                await fig("pm/quick-actions-open", 33, ["width", "height", "backgroundColor", "borderRadius", "fontSize", "lineHeight", "letterSpacing"]),
            );
            const search = part(container, ".cm-qa-search");
            expectMeasured(search, await fig("pm/quick-actions-open", 37, BOX));
            expectMeasured(search, { x: 8, y: 8 }, { origin: panel });
            expectMeasured(part(container, ".cm-qa-input"), await fig("pm/quick-actions-open", 41, ["height", "fontSize", "lineHeight", "color"]));
            expectMeasured(part(container, ".cm-qa-input"), { x: 44 }, { origin: panel });
            const heading = part(container, ".cm-qa-group-title");
            expectMeasured(heading, await fig("pm/quick-actions-open", 78, ["height", "color", "fontSize", "lineHeight", "fontWeight"]));
            expectMeasured(heading, { x: 16 }, { origin: panel });
            expectMeasured(
                part(container, ".cm-qa-row[data-highlighted]"),
                await fig("pm/quick-actions-open", 79, [...BOX, "paddingTop", "paddingLeft"]),
            );
            expectMeasured(part(container, ".cm-qa-row:not([data-highlighted])"), await fig("pm/quick-actions-open", 88, BOX));
        });

        it("the search glyph is Figma's 32 x 32 svg with a 15 x 15 lens (dt/light-dialog-quick-actions #39, #40)", async () => {
            const { container } = await renderFigma(<QuickActions actions={ACTIONS} onRun={() => undefined} />, { scheme: "light" });
            expectMeasured(part(container, ".cm-qa-search-icon svg"), await fig("dt/light-dialog-quick-actions", 39, ["width", "height", "color"]));
            expectMeasured(part(container, ".cm-qa-search-icon path"), await fig("dt/light-dialog-quick-actions", 40, ["width", "height"]));
        });

        it("AA option: the always-focused search keeps its 3:1 field edge", async () => {
            const { container } = await renderFigma(<QuickActions actions={ACTIONS} onRun={() => undefined} />, {
                scheme: "light",
                highContrast: true,
            });
            expect(part(container, ".cm-qa-input")).toHaveFocus();
            expect(getComputedStyle(part(container, ".cm-qa-search")).boxShadow).toBe("rgba(0, 0, 0, 0.45) 0px 0px 0px 1px inset");
        });

        it("dark: the panel's canvas shadow has 0.5px inset hairlines (dt/dark-dialog-quick-actions #34)", async () => {
            const { container } = await renderFigma(<QuickActions actions={ACTIONS} onRun={() => undefined} />, { scheme: "dark" });
            expectMeasured(part(container, ".cm-quick-actions"), await fig("dt/dark-dialog-quick-actions", 34, ["boxShadow"]));
        });

        it("dark: #2c2c2c panel, #383838 search and highlight", async () => {
            const { container } = await renderFigma(<QuickActions actions={ACTIONS} onRun={() => undefined} />, { scheme: "dark" });
            expectMeasured(part(container, ".cm-quick-actions"), await fig("dt/dark-dialog-quick-actions", 34, BOX));
            expectMeasured(part(container, ".cm-qa-search"), await fig("dt/dark-dialog-quick-actions", 38, BOX));
            expectMeasured(part(container, ".cm-qa-row[data-highlighted]"), await fig("dt/dark-dialog-quick-actions", 80, BOX));
        });

        it("ArrowDown moves the highlight while focus stays in the search", async () => {
            const { container } = await renderFigma(<QuickActions actions={ACTIONS} onRun={() => undefined} />);
            const input = part(container, ".cm-qa-input");
            expect(input).toHaveFocus();
            await userEvent.keyboard("{ArrowDown}");
            expect(input).toHaveFocus();
            expect(part(container, ".cm-qa-row[data-highlighted]").textContent).toBe("Make an image");
        });
    });
});
