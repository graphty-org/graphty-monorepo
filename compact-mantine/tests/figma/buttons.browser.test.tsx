/**
 * TEXT WIDTHS. Figma renders its own Inter (an older cut); the bundled Inter Variable 4 sets some
 * words narrower ("Delete" 33.3 against Figma's 36.3, "Get started" 58.6 against 62.6, "Button"
 * identical). A box that holds text is therefore compared as its INSETS -- the button's width
 * less its label's -- except for "Button", whose width is compared outright.
 *
 * The button family against Figma (design/figma-spec.md 4.1, 4.3-4.7): every expected value is
 * read from the Figma study's captures with figmaElement / figmaSpec, except the few states Figma
 * was never captured in (open, highlighted, filled icon, AA), which read the token table.
 *
 * Captures (folder abbreviations of the spec, section 0):
 * - text buttons: bc/btn-<variant>-md|lg-enabled--default|hover|pressed|focus, -disabled--default,
 *   -icon, -shortcut, -loading; dt/dark-secondary-button-proto--*
 * - icon buttons: bc/icon24-add-fill--*, bc/icon-button-ghost-enabled|disabled--default,
 *   dt/dark-icon-button-add-fill--*
 * - toggle: bc/toggle-icon-off|on[-disabled]--*, dt/dark-toggle-aspect-lock--*
 * - joined group: bc/align-group, bc/align-left-button--*, dt/dark-align-left--*
 * - split: bc/split-chevron16-prototype-view--*, header-and-modes/present-dropdown-open
 */
import { ActionIcon, Box, Button, CloseButton, Menu } from "@mantine/core";
import { commands, userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it } from "vitest";

import { SplitButton } from "../../src/components/buttons/SplitButton";
import { ToggleIconButton } from "../../src/components/buttons/ToggleIconButton";
import { Popout, PopoutManager } from "../../src/components/popout";
import { PopoutButton } from "../../src/components/popout/PopoutButton";
import { AdvancedButton } from "../../src/components/rows/TrailingSlot";
import { UiGlyph } from "../../src/icons";
import { CM_COLORS, CM_HIGH_CONTRAST } from "../../src/theme/tokens";
import {
    drive,
    type DriveState,
    expectMeasured,
    figmaAvailable,
    type FigmaElement,
    figmaElement,
    figmaSpec,
    hex,
    part,
    renderFigma,
    resetHarness,
} from "./harness";

afterEach(resetHarness);

const BOX = ["height", "borderRadius", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom"];
const TYPE = ["fontSize", "lineHeight", "fontWeight", "letterSpacing"];
const FILL = ["backgroundColor", "color"];
const RING = ["outline", "outlineOffset"];
const RING_LIGHT = { outline: `${CM_COLORS["border-selected"].light} solid 1px`, outlineOffset: "1px" };

type Variant = { figma: string; props: Record<string, string>; edged?: boolean };

/** Figma's text-button specimens and the props that render each one. */
const TEXT_VARIANTS: Variant[] = [
    { figma: "primary", props: {} },
    { figma: "secondary", props: { variant: "default" }, edged: true },
    { figma: "secondary", props: { variant: "outline" }, edged: true },
    { figma: "ghost", props: { variant: "subtle" } },
    { figma: "destructive", props: { variant: "danger" } },
    { figma: "destructive", props: { color: "red" } },
    { figma: "destructiveSecondary", props: { variant: "danger-outline" }, edged: true },
    { figma: "inverse", props: { variant: "inverse" } },
    { figma: "signup", props: { variant: "success" } },
];

const specimen = (path: string): Promise<FigmaElement> => figmaElement(path, { tag: "button", cls: "button__button" });
const specimenLabel = (path: string): Promise<FigmaElement> => figmaElement(path, { cls: "buttonContent" });

describe.skipIf(!(await figmaAvailable()))("buttons against Figma", () => {
    describe("Button (4.1)", () => {
        it.each(TEXT_VARIANTS)("rest geometry, type and fill: $figma $props", async (v) => {
            const path = `bc/btn-${v.figma}-md-enabled--default`;
            const [figma, figmaLabel] = await Promise.all([specimen(path), specimenLabel(path)]);
            const { container } = await renderFigma(<Button {...v.props}>{figmaLabel.text}</Button>);
            const button = part(container, "button");
            const label = part(button, ".cm-button-label");
            const exact = figmaLabel.text === "Button" ? ["width"] : [];
            expectMeasured(button, figmaSpec(figma, [...exact, ...BOX, ...TYPE, ...FILL, ...(v.edged ? RING : [])]));
            // The label carries the inset (margin 0 8px): it sits 8px in, and the button is the
            // label plus the two insets.
            expectMeasured(label, { ...figmaSpec(figmaLabel, [...exact, "color"]), x: figmaLabel.box[0] - figma.box[0] }, { origin: button });
            expect(button.getBoundingClientRect().width - label.getBoundingClientRect().width).toBeCloseTo(
                figma.box[2] - figmaLabel.box[2],
                1,
            );
        });

        it.each(TEXT_VARIANTS.flatMap((v) => (["hover", "press", "focus"] as const).map((state) => ({ ...v, state }))))(
            "$state: $figma $props",
            async (v) => {
                const capture = { hover: "hover", press: "pressed", focus: "focus" }[v.state];
                const figma = await specimen(`bc/btn-${v.figma}-md-enabled--${capture}`);
                const { container } = await renderFigma(<Button {...v.props}>Button</Button>);
                const button = part(container, "button");
                await drive(button, v.state as DriveState);
                expectMeasured(button, figmaSpec(figma, [...FILL, ...(v.state === "focus" || v.edged ? RING : [])]));
                if (v.state === "focus" && v.edged) {
                    // The gray edge stays on the element; the ring is drawn by ::before, 1px outside.
                    expectMeasured(button, RING_LIGHT, { pseudo: "::before" });
                }
            },
        );

        it.each(TEXT_VARIANTS)("disabled: $figma $props", async (v) => {
            const figma = await specimen(`bc/btn-${v.figma}-md-disabled--default`);
            const { container } = await renderFigma(
                <Button {...v.props} disabled>
                    Button
                </Button>,
            );
            const button = part(container, "button");
            const width = figma.box[2] === 52.3 ? ["width"] : []; // "Button" (see TEXT WIDTHS)
            expectMeasured(button, figmaSpec(figma, [...width, "height", ...FILL, ...(v.edged ? RING : [])]));
            await drive(button, "hover");
            expectMeasured(button, figmaSpec(figma, FILL));
        });

        it("size md is Figma's lg: 32 tall, the label inset 12", async () => {
            const path = "bc/btn-primary-lg-enabled--default";
            const [figma, label] = await Promise.all([specimen(path), specimenLabel(path)]);
            const { container } = await renderFigma(<Button size="md">Button</Button>);
            const button = part(container, "button");
            expectMeasured(button, figmaSpec(figma, ["width", ...BOX, ...TYPE, ...FILL]));
            expectMeasured(part(button, ".cm-button-label"), { x: label.box[0] - figma.box[0] }, { origin: button });
        });

        it("a leading icon sits in a 24 slot 4px from the edge", async () => {
            const path = "bc/btn-primary-md-icon--default";
            const [figma, slot] = await Promise.all([specimen(path), figmaElement(path, { cls: "button__icon" })]);
            const { container } = await renderFigma(<Button leftSection={<UiGlyph name="plus" />}>Button</Button>);
            const button = part(container, "button");
            expectMeasured(button, figmaSpec(figma, ["width", "height"]));
            expectMeasured(
                part(button, '.cm-button-section[data-position="left"]'),
                { ...figmaSpec(slot, ["width", "height"]), x: slot.box[0] - figma.box[0] },
                { origin: button },
            );
        });

        it("a shortcut follows the label 4px on, in the secondary ink", async () => {
            const path = "bc/btn-primary-md-shortcut--default";
            const [figma, shortcut] = await Promise.all([specimen(path), figmaElement(path, { cls: "button__shortcut" })]);
            const { container } = await renderFigma(<Button rightSection={shortcut.text}>Button</Button>);
            const button = part(container, "button");
            const section = part(button, '.cm-button-section[data-position="right"]');
            // "Ctrl+Enter" sets 1px narrower in Inter 4 (see TEXT WIDTHS): compare the geometry
            // around it -- where it starts and its 4px lead. Figma's specimen ends it flush with
            // the button's edge, its last letter touching the fill; it keeps the label's 8px inset.
            expectMeasured(button, figmaSpec(figma, ["height"]));
            expectMeasured(section, { ...figmaSpec(shortcut, ["color", "paddingLeft", ...TYPE]), x: shortcut.box[0] - figma.box[0] }, { origin: button });
            expect(button.getBoundingClientRect().right - section.getBoundingClientRect().right).toBeCloseTo(8, 1);
        });

        it.each(["secondary", "ghost", "destructiveSecondary", "inverse"])("the %s shortcut ink", async (figmaName) => {
            const v = TEXT_VARIANTS.find((t) => t.figma === figmaName) as Variant;
            const shortcut = await figmaElement(`bc/btn-${figmaName}-md-shortcut--default`, { cls: "button__shortcut" });
            const { container } = await renderFigma(
                <Button {...v.props} rightSection={shortcut.text}>
                    Button
                </Button>,
            );
            expectMeasured(part(container, '.cm-button-section[data-position="right"]'), figmaSpec(shortcut, ["color"]));
        });

        it("loading keeps the width, shows progress, and centers a 16px spinner", async () => {
            const path = "bc/btn-primary-md-loading--default";
            const [figma, spinner] = await Promise.all([specimen(path), figmaElement(path, { tag: "svg" })]);
            const { container } = await renderFigma(<Button loading>Button</Button>);
            const button = part(container, "button");
            expectMeasured(button, figmaSpec(figma, ["width", "height", "cursor", ...FILL]));
            await new Promise((r) => setTimeout(r, 300));
            const loader = part(button, ".mantine-Loader-root");
            expectMeasured(
                loader,
                { width: 16, height: 16, x: spinner.box[0] - figma.box[0], y: spinner.box[1] - figma.box[1] },
                { origin: button },
            );
            expectMeasured(part(button, ".cm-button-inner"), { opacity: "0" });
        });

        it.each(["default", "hover", "pressed", "focus"] as const)("dark secondary, full width: %s", async (state) => {
            const figma = await figmaElement(`dt/dark-secondary-button-proto--${state}`, { tag: "button" });
            const { container } = await renderFigma(
                <Box w={figma.box[2]}>
                    <Button variant="default" fullWidth>
                        Show prototype settings
                    </Button>
                </Box>,
                { scheme: "dark" },
            );
            const button = part(container, "button");
            const drives: Record<string, DriveState> = { default: "rest", hover: "hover", pressed: "press", focus: "focus" };
            await drive(button, drives[state]);
            expectMeasured(button, figmaSpec(figma, ["width", "height", "borderRadius", ...TYPE, ...FILL, ...RING]));
        });

        it("the dark primary fill is #0c8ce9 (dt/dark-panel-rect Share)", async () => {
            const figma = await figmaElement("dt/dark-panel-rect", { tag: "button", cls: "shareButton" });
            const { container } = await renderFigma(<Button size="md">Share</Button>, { scheme: "dark" });
            expectMeasured(part(container, "button"), figmaSpec(figma, ["height", "borderRadius", ...TYPE, ...FILL]));
        });

        it("the AA option darkens the primary fill to #0768cf", async () => {
            const { container } = await renderFigma(<Button>Button</Button>, { highContrast: true });
            expectMeasured(part(container, "button"), { backgroundColor: CM_HIGH_CONTRAST["bg-brand"]?.light ?? "" });
        });

        it("a mouse press draws no ring; the button is not a mouse-down control", async () => {
            let clicks = 0;
            const { container } = await renderFigma(<Button onClick={() => clicks++}>Button</Button>);
            const button = part(container, "button");
            await drive(button, "press");
            expect(clicks).toBe(0);
            await userEvent.click(button);
            expect(clicks).toBe(1);
            expectMeasured(button, { outlineColor: "#00000000" });
        });
    });

    describe("ActionIcon (4.3)", () => {
        const glyph = <UiGlyph name="plus" />;

        it.each([
            ["light", "bc/icon24-add-fill"],
            ["dark", "dt/dark-icon-button-add-fill"],
        ] as const)("ghost 24, %s: rest, hover, pressed, focus", async (scheme, base) => {
            for (const [capture, state] of [
                ["default", "rest"],
                ["hover", "hover"],
                ["pressed", "press"],
                ["focus", "focus"],
            ] as const) {
                const [figma, path] = await Promise.all([
                    figmaElement(`${base}--${capture}`, { tag: "button", aria: "Add fill" }),
                    figmaElement(`${base}--${capture}`, { tag: "path", nth: 0 }),
                ]);
                const { container, unmount } = await renderFigma(<ActionIcon aria-label="Add fill">{glyph}</ActionIcon>, {
                    scheme,
                });
                const button = part(container, "button");
                await drive(button, state);
                expectMeasured(button, {
                    ...figmaSpec(figma, ["width", "height", "borderRadius", "backgroundColor", ...RING]),
                    color: path.style.fill,
                });
                await resetHarness();
                unmount();
            }
        });

        it("size md is 32 with 0 4px padding (bc/icon-button-ghost-enabled)", async () => {
            const figma = await figmaElement("bc/icon-button-ghost-enabled--default", { tag: "button" });
            const { container } = await renderFigma(
                <ActionIcon size="md" aria-label="Present">
                    {glyph}
                </ActionIcon>,
            );
            expectMeasured(part(container, "button"), figmaSpec(figma, ["width", ...BOX, "backgroundColor", ...RING]));
        });

        it("disabled: no ground, the disabled glyph ink, no hover", async () => {
            const [figma, path] = await Promise.all([
                figmaElement("bc/icon-button-ghost-disabled--hover", { tag: "button" }),
                figmaElement("bc/icon-button-ghost-disabled--hover", { tag: "path" }),
            ]);
            const { container } = await renderFigma(
                <ActionIcon size="md" aria-label="Present" disabled>
                    {glyph}
                </ActionIcon>,
            );
            const button = part(container, "button");
            await drive(button, "hover");
            expectMeasured(button, { ...figmaSpec(figma, ["width", "height", "backgroundColor"]), color: path.style.fill });
        });

        it.each(["light", "dark"] as const)("secondary disabled takes the disabled edge, as the text button does, %s", async (scheme) => {
            const { container } = await renderFigma(
                <ActionIcon variant="default" aria-label="Present" disabled>
                    {glyph}
                </ActionIcon>,
                { scheme },
            );
            expectMeasured(part(container, "button"), { outline: `${CM_COLORS["border-disabled"][scheme]} solid 1px`, outlineOffset: "-1px" });
        });

        it.each(["light", "dark"] as const)("open (aria-expanded) and open + hover, %s", async (scheme) => {
            const { container } = await renderFigma(
                <ActionIcon aria-label="Effect settings" aria-haspopup="dialog" aria-expanded>
                    {glyph}
                </ActionIcon>,
                { scheme },
            );
            const button = part(container, "button");
            expectMeasured(button, { backgroundColor: CM_COLORS["bg-selected"][scheme], color: CM_COLORS["icon-brand"][scheme] });
            await drive(button, "hover");
            expectMeasured(button, { backgroundColor: CM_COLORS["bg-selected-secondary"][scheme] });
        });

        it("a popover trigger keeps its outline and rings on ::before", async () => {
            const { container } = await renderFigma(
                <ActionIcon aria-label="Effect settings" aria-haspopup="dialog">
                    {glyph}
                </ActionIcon>,
            );
            const button = part(container, "button");
            await drive(button, "focus");
            expectMeasured(button, { outlineColor: "#00000000", outlineOffset: "-1px" });
            expectMeasured(button, RING_LIGHT, { pseudo: "::before" });
        });

        it.each(["light", "dark"] as const)("light is the highlighted look, with no border, %s", async (scheme) => {
            const { container } = await renderFigma(
                <ActionIcon variant="light" aria-label="Highlighted">
                    {glyph}
                </ActionIcon>,
                { scheme },
            );
            const button = part(container, "button");
            expectMeasured(button, {
                backgroundColor: CM_COLORS["bg-selected"][scheme],
                color: CM_COLORS["icon-brand"][scheme],
                borderTopWidth: "0px",
                width: 24,
            });
            await drive(button, "hover");
            expectMeasured(button, { backgroundColor: CM_COLORS["bg-selected-hover"][scheme] });
            await drive(button, "press");
            expectMeasured(button, { backgroundColor: CM_COLORS["bg-selected-pressed"][scheme] });
        });

        it("filled is the brand fill with a white glyph; default is the secondary edge", async () => {
            const { container } = await renderFigma(
                <>
                    <ActionIcon variant="filled" aria-label="Filled">
                        {glyph}
                    </ActionIcon>
                    <ActionIcon variant="default" aria-label="Secondary">
                        {glyph}
                    </ActionIcon>
                </>,
            );
            const [filled, secondary] = container.querySelectorAll("button");
            expectMeasured(filled, { backgroundColor: CM_COLORS["bg-brand"].light, color: "#ffffff" });
            expectMeasured(secondary, {
                backgroundColor: "#00000000",
                outline: `${CM_COLORS["border-translucent"].light} solid 1px`,
                outlineOffset: "-1px",
            });
        });

        it("PopoutButton and AdvancedButton show the open look without a prop of their own", async () => {
            const { container } = await renderFigma(
                <PopoutManager>
                    <Popout>
                        <Popout.Trigger>
                            <PopoutButton size="sm" icon={glyph} aria-label="Stroke settings" />
                        </Popout.Trigger>
                        <Popout.Panel width={240} header={{ variant: "title", title: "Stroke" }}>
                            <Popout.Content>Body</Popout.Content>
                        </Popout.Panel>
                    </Popout>
                    <Popout>
                        <Popout.Trigger>
                            <AdvancedButton label="Range and scale" />
                        </Popout.Trigger>
                        <Popout.Panel width={240} header={{ variant: "title", title: "Range" }}>
                            <Popout.Content>Body</Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </PopoutManager>,
            );
            for (const selector of ['[data-testid="popout-button"]', '[data-testid="advanced-button"]']) {
                const button = part(container, selector);
                await userEvent.click(button);
                expect(button.getAttribute("aria-expanded")).toBe("true");
                await commands.mouseAway();
                expectMeasured(button, {
                    backgroundColor: CM_COLORS["bg-selected"].light,
                    color: CM_COLORS["icon-brand"].light,
                });
                await userEvent.keyboard("{Escape}");
            }
        });
    });

    describe("ToggleIconButton (4.4)", () => {
        const lock = <UiGlyph name="lock" />;

        it.each([
            ["off", false, false],
            ["on", true, false],
            ["off-disabled", false, true],
            ["on-disabled", true, true],
        ] as const)("%s: rest, hover, pressed", async (figmaName, checked, disabled) => {
            for (const [capture, state] of [
                ["default", "rest"],
                ["hover", "hover"],
                ["pressed", "press"],
            ] as const) {
                const base = `bc/toggle-icon-${figmaName}--${capture}`;
                const [label, icon] = await Promise.all([
                    figmaElement(base, { tag: "label" }).catch(() => null),
                    figmaElement(base, { tag: "svg" }),
                ]);
                const iconInk = await figmaElement(base, { cls: "base-icon-button__icon" });
                // Figma draws a disabled toggle exactly like an enabled one, pointer states included.
                const ink = iconInk.style.fill;
                const { container, unmount } = await renderFigma(
                    <ToggleIconButton label="Lock aspect ratio" icon={lock} checked={checked} disabled={disabled} withTooltip={false} />,
                );
                const button = part(container, "button");
                if (state === "press") {
                    // Held down without toggling, so the pressed ground of the same state shows.
                    button.addEventListener("pointerdown", (e) => e.stopImmediatePropagation(), { capture: true });
                }
                await drive(button, state);
                expectMeasured(button, {
                    ...figmaSpec(icon, ["width", "height"]),
                    backgroundColor: label ? label.style.backgroundColor : "#00000000",
                    borderRadius: "5px",
                    color: ink,
                });
                await resetHarness();
                unmount();
            }
        });

        it("focus draws the 1px ring 1px outside (bc/toggle-icon-off--focus)", async () => {
            const label = await figmaElement("bc/toggle-icon-off--focus", { tag: "label" });
            const { container } = await renderFigma(<ToggleIconButton label="Lock aspect ratio" icon={lock} withTooltip={false} />);
            const button = part(container, "button");
            await drive(button, "focus");
            expectMeasured(button, figmaSpec(label, RING));
        });

        it.each(["hover", "pressed"] as const)("dark off %s (dt/dark-toggle-aspect-lock)", async (capture) => {
            const label = await figmaElement(`dt/dark-toggle-aspect-lock--${capture}`, { tag: "label" });
            const { container } = await renderFigma(<ToggleIconButton label="Lock aspect ratio" icon={lock} withTooltip={false} />, {
                scheme: "dark",
            });
            const button = part(container, "button");
            button.addEventListener("pointerdown", (e) => e.stopImmediatePropagation(), { capture: true });
            await drive(button, capture === "hover" ? "hover" : "press");
            expectMeasured(button, figmaSpec(label, ["backgroundColor"]));
        });

        it("toggles on pointer DOWN, once per press, and from the keyboard with Space", async () => {
            const seen: boolean[] = [];
            const { container } = await renderFigma(
                <ToggleIconButton label="Lock aspect ratio" icon={lock} onChange={(c) => seen.push(c)} withTooltip={false} />,
            );
            const button = part(container, "button");
            await drive(button, "press");
            expect(seen).toEqual([true]);
            expect(button.getAttribute("aria-pressed")).toBe("true");
            await commands.mouseUp();
            expect(seen).toEqual([true]);
            button.focus();
            await userEvent.keyboard(" ");
            expect(seen).toEqual([true, false]);
            expect(button.getAttribute("aria-pressed")).toBe("false");
        });

        it("a disabled toggle ignores a press", async () => {
            const { container } = await renderFigma(<ToggleIconButton label="Lock aspect ratio" icon={lock} disabled withTooltip={false} />);
            const button = part(container, "button");
            await drive(button, "press");
            await commands.mouseUp();
            expect(button.getAttribute("aria-pressed")).toBe("false");
        });

        it("a press dragged down a column sets every toggle it crosses to the first one's new value", async () => {
            const { container } = await renderFigma(
                <Box style={{ display: "flex", flexDirection: "column" }}>
                    <ToggleIconButton label="Row 0" icon={lock} withTooltip={false} />
                    <ToggleIconButton label="Row 1" icon={lock} defaultChecked withTooltip={false} />
                    <ToggleIconButton label="Row 2" icon={lock} withTooltip={false} />
                    <ToggleIconButton label="Row 3" icon={lock} withTooltip={false} />
                </Box>,
            );
            const rows = Array.from(container.querySelectorAll("button"));
            const pressedStates = (): (string | null)[] => rows.map((b) => b.getAttribute("aria-pressed"));
            await userEvent.hover(rows[0]);
            await commands.mouseDown();
            await userEvent.hover(rows[1]);
            await userEvent.hover(rows[2]);
            await commands.mouseUp();
            // Row 1 was already on and stays on; row 3 was never entered.
            expect(pressedStates()).toEqual(["true", "true", "true", "false"]);
            // Once released, passing over a toggle changes nothing.
            await userEvent.hover(rows[3]);
            expect(pressedStates()).toEqual(["true", "true", "true", "false"]);
            // A drag that starts by turning a toggle off turns the crossed ones off.
            await userEvent.hover(rows[2]);
            await commands.mouseDown();
            await userEvent.hover(rows[1]);
            await userEvent.hover(rows[0]);
            await commands.mouseUp();
            expect(pressedStates()).toEqual(["false", "false", "false", "false"]);
        });

        it("the swap variant never fills; it swaps the glyph", async () => {
            const { container } = await renderFigma(
                <ToggleIconButton
                    label="Hide"
                    variant="swap"
                    icon={<UiGlyph name="eye" />}
                    checkedIcon={<UiGlyph name="eyeClosed" />}
                    defaultChecked
                    withTooltip={false}
                />,
            );
            const button = part(container, "button");
            expectMeasured(button, { backgroundColor: "#00000000", color: CM_COLORS.icon.light });
            expect(button.querySelector('[data-glyph="eyeClosed"]')).not.toBeNull();
        });
    });

    describe("SplitButton (4.5)", () => {
        const play = <UiGlyph name="caretRight" />;
        const split = (
            <SplitButton icon={play} label="Present" menuLabel="Prototype view">
                <Menu.Item>Present</Menu.Item>
                <Menu.Item>Preview</Menu.Item>
            </SplitButton>
        );

        it("geometry: a 32 main half, a 16 chevron, 1px apart", async () => {
            const base = "bc/split-chevron16-prototype-view--default";
            const [group, main, chevron] = await Promise.all([
                figmaElement(base, { role: "group" }),
                figmaElement(base, { tag: "button", aria: "Present" }),
                figmaElement(base, { tag: "button", aria: "Prototype view" }),
            ]);
            const { container } = await renderFigma(split);
            const root = part(container, '[role="group"]');
            const [m, c] = root.querySelectorAll("button");
            expectMeasured(root, figmaSpec(group, ["width", "height", "gap"]));
            expectMeasured(m, figmaSpec(main, ["width", ...BOX, "backgroundColor", ...RING]));
            expectMeasured(c, { ...figmaSpec(chevron, ["width", ...BOX, "backgroundColor"]), x: chevron.box[0] - group.box[0] }, { origin: root });
        });

        it.each([
            ["hover", "hover"],
            ["pressed", "press"],
        ] as const)("%s on the main half lights both halves", async (capture, state) => {
            const base = `bc/split-chevron16-prototype-view--${capture}`;
            const [main, chevron] = await Promise.all([
                figmaElement(base, { tag: "button", aria: "Present" }),
                figmaElement(base, { tag: "button", aria: "Prototype view" }),
            ]);
            const { container } = await renderFigma(split);
            const [m, c] = container.querySelectorAll<HTMLElement>('[role="group"] button');
            await drive(m, state);
            expectMeasured(m, figmaSpec(main, ["backgroundColor"]));
            expectMeasured(c, figmaSpec(chevron, ["backgroundColor"]));
        });

        it("the chevron shows the selected ground and a brand caret while its menu is open", async () => {
            const chevron = await figmaElement("header-and-modes/present-dropdown-open", { tag: "button", aria: "Prototype view" });
            const caret = await figmaElement("header-and-modes/present-dropdown-open", { cls: "_4enxrr5" });
            const { container } = await renderFigma(split);
            const [, c] = container.querySelectorAll<HTMLElement>('[role="group"] button');
            await userEvent.click(c);
            expect(c.getAttribute("aria-expanded")).toBe("true");
            await commands.mouseAway();
            expectMeasured(c, { ...figmaSpec(chevron, ["backgroundColor", "borderRadius"]), color: caret.style.fill });
            expect(document.querySelector('[role="menu"]')).not.toBeNull();
        });
    });

    describe("ActionIcon.Group, the joined bar (4.6)", () => {
        const bar = (
            <ActionIcon.Group>
                <ActionIcon variant="default" aria-label="Align left">
                    <UiGlyph name="alignLeft" />
                </ActionIcon>
                <ActionIcon variant="default" aria-label="Align horizontal centers">
                    <UiGlyph name="alignCenterH" />
                </ActionIcon>
                <ActionIcon variant="default" aria-label="Align right">
                    <UiGlyph name="alignRight" />
                </ActionIcon>
            </ActionIcon.Group>
        );

        it("three 28.7 x 24 segments on the secondary ground, outer corners only", async () => {
            const figma = await Promise.all(
                ["Align left", "Align horizontal centers", "Align right"].map((aria) =>
                    figmaElement("bc/align-group", { tag: "button", aria }),
                ),
            );
            const { container } = await renderFigma(bar);
            const group = container.firstElementChild?.querySelector(".cm-ai-group") ?? part(container, ".cm-ai-group");
            const buttons = group.querySelectorAll("button");
            figma.forEach((f, i) => {
                expectMeasured(
                    buttons[i],
                    { ...figmaSpec(f, ["width", "height", "borderRadius", "backgroundColor"]), x: f.box[0] - figma[0].box[0] },
                    { origin: group },
                );
            });
        });

        it.each([
            ["light", "bc/align-left-button"],
            ["dark", "dt/dark-align-left"],
        ] as const)("hover and pressed darken one segment, %s", async (scheme, base) => {
            for (const [capture, state] of [
                ["hover", "hover"],
                ["pressed", "press"],
            ] as const) {
                const figma = await figmaElement(`${base}--${capture}`, { tag: "button", aria: "Align left" });
                const { container, unmount } = await renderFigma(bar, { scheme });
                const [first, second] = container.querySelectorAll<HTMLElement>(".cm-ai-group button");
                await drive(first, state);
                expectMeasured(first, figmaSpec(figma, ["backgroundColor"]));
                expectMeasured(second, { backgroundColor: CM_COLORS["bg-secondary"][scheme] });
                await resetHarness();
                unmount();
            }
        });

        it("focus draws the ring inside", async () => {
            const figma = await figmaElement("bc/align-left-button--focus", { tag: "button", aria: "Align left" });
            const { container } = await renderFigma(bar);
            const first = part(container, ".cm-ai-group button");
            await drive(first, "focus");
            expectMeasured(first, figmaSpec(figma, [...RING, "backgroundColor"]));
        });
    });

    describe("CloseButton (4.7)", () => {
        it.each(["light", "dark"] as const)("a 24 ghost button with a 10 x 10 X, %s", async (scheme) => {
            const { container } = await renderFigma(<CloseButton aria-label="Close" />, { scheme });
            const button = part(container, "button");
            expectMeasured(button, { width: 24, height: 24, borderRadius: "5px", backgroundColor: "#00000000", color: CM_COLORS.icon[scheme] });
            expectMeasured(part(button, "svg"), { width: 10, height: 10 });
            await drive(button, "hover");
            expectMeasured(button, { backgroundColor: CM_COLORS["bg-transparent-hover"][scheme] });
            await drive(button, "press");
            expectMeasured(button, { backgroundColor: CM_COLORS["bg-transparent-pressed"][scheme] });
        });

        it("xs is the 16 inline clear with the same 10 X; focus rings outside", async () => {
            const { container } = await renderFigma(<CloseButton size="xs" aria-label="Clear" />);
            const button = part(container, "button");
            expectMeasured(button, { width: 16, height: 16 });
            expectMeasured(part(button, "svg"), { width: 10, height: 10 });
            await drive(button, "focus");
            expectMeasured(button, RING_LIGHT);
        });

        it("disabled draws the disabled ink at full opacity", async () => {
            const { container } = await renderFigma(<CloseButton aria-label="Close" disabled />);
            expectMeasured(part(container, "button"), { opacity: "1", color: hex(CM_COLORS["icon-disabled"].light) });
        });
    });
});
