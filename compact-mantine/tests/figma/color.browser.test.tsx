/**
 * The colour package against the Figma study (design/figma-spec.md section 7): the paint field
 * (CompactColorInput), the chit (ColorSwatch), the picker body (ColorPickerPanel), the colour
 * sliders (HueSlider / AlphaSlider) and the gradient editor, in light and dark, at rest, hover,
 * focus and in the AA mode. Expected values are read from the captures wherever Figma measured
 * them; positions are compared relative to the component's own origin.
 */
import { DirectionProvider, HueSlider } from "@mantine/core";
import { commands, userEvent } from "@vitest/browser/context";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColorPickerPanel } from "../../src/components/color/ColorPickerPanel";
import { CompactColorInput } from "../../src/components/CompactColorInput";
import { GradientEditor } from "../../src/components/GradientEditor";
import { PopoutManager } from "../../src/components/popout";
import { FieldRow } from "../../src/components/rows/FieldRow";
import { SWATCH_COLORS_HEXA } from "../../src/constants/colors";
import { createColorStop } from "../../src/utils/color-stops";
import {
    computed,
    drive,
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

const TYPE = ["fontSize", "lineHeight", "fontWeight", "letterSpacing"];

/**
 * Where a captured element sits relative to another captured element.
 * @param el - the element
 * @param origin - the element whose top left is 0, 0
 * @returns x and y
 */
function offset(el: FigmaElement, origin: FigmaElement): { x: number; y: number } {
    return { x: el.box[0] - origin.box[0], y: el.box[1] - origin.box[1] };
}

/** The paint field captures, light and dark: Fill 3373E5 at 50%. */
const PAINT = {
    light: {
        rest: "rs/fill-opacity-default",
        hover: "rs/fill-opacity-hover",
        focus: "rs/fill-opacity-focus",
    },
    dark: {
        rest: "dt/dark-color-hex-input--default",
        hover: "dt/dark-color-hex-input--hover",
        focus: "dt/dark-color-hex-input--focus",
    },
} as const;

/**
 * The paint field as Figma's Fill row shows it.
 * @param scheme - light or dark
 * @param highContrast - the AA token set
 * @returns the rendered container
 */
async function renderPaint(scheme: "light" | "dark", highContrast = false): Promise<HTMLElement> {
    const { container } = await renderFigma(
        <PopoutManager>
            <CompactColorInput color="#3373E5" opacity={50} defaultColor="#000000" width={156} />
        </PopoutManager>,
        { scheme, highContrast },
    );
    return container;
}

describe.skipIf(!(await figmaAvailable()))("colour package against Figma", () => {
    describe.each(["light", "dark"] as const)("paint field (7.2), %s", (scheme) => {
        it("rest: field, chit, hex, opacity and the % handle", async () => {
            const cap = PAINT[scheme].rest;
            const field = await figmaElement(cap, { cls: "paintPanelColorValueContainer" });
            const chit = await figmaElement(cap, { tag: "button", aria: "Solid color hex" });
            const hexBox = await figmaElement(cap, { tag: "input", aria: "Color" });
            const opacityLabel = await figmaElement(cap, { cls: "opacityInputContainer" });
            const opacityInput = await figmaElement(cap, { tag: "input", cls: "raw_components--textInput" });
            // The dark capture stops before the "%" (it holds 43 elements); its values there are the
            // light geometry with the dark --cm-text-secondary.
            const suffixSpec =
                scheme === "light"
                    ? await figmaElement(cap, { cls: "inactiveLabel" }).then((suffix) => ({
                          ...figmaSpec(suffix, ["width", "height", "color", "cursor"]),
                          ...offset(suffix, field),
                      }))
                    : { width: 14, height: 24, color: "#ffffffb2", cursor: "ew-resize", x: 140, y: 0 };

            const container = await renderPaint(scheme);
            const mine = part(container, ".cm-paint-field");

            expectMeasured(
                mine,
                figmaSpec(field, [
                    "width",
                    "height",
                    "backgroundColor",
                    "borderTopColor",
                    "borderTopWidth",
                    "borderRadius",
                    ...TYPE,
                ]),
            );
            expectMeasured(
                part(mine, ".cm-paint-chit"),
                {
                    ...figmaSpec(chit, ["width", "height"]),
                    ...offset(chit, field),
                },
                { origin: mine },
            );
            expectMeasured(part(mine, ".cm-chit"), figmaSpec(chit, ["width", "height", "borderRadius"]));
            expectMeasured(part(mine, ".mantine-ColorSwatch-colorOverlay"), {
                backgroundColor: hex(chit.style.backgroundColor),
            });
            expectMeasured(
                part(mine, ".cm-paint-hex"),
                {
                    ...figmaSpec(hexBox, ["width", "height", "paddingLeft", "color", ...TYPE]),
                    ...offset(hexBox, field),
                },
                { origin: mine },
            );
            expectMeasured(
                part(mine, ".cm-paint-opacity"),
                { ...figmaSpec(opacityLabel, ["width", "height", "borderTopWidth"]), ...offset(opacityLabel, field) },
                { origin: mine },
            );
            expectMeasured(
                part(mine, ".cm-paint-opacity .cm-paint-input"),
                {
                    ...figmaSpec(opacityInput, ["width", "height", "paddingLeft", "color", ...TYPE]),
                    ...offset(opacityInput, field),
                },
                { origin: mine },
            );
            expectMeasured(part(mine, ".cm-paint-suffix"), suffixSpec, { origin: mine });
            // The seam: 1px of the panel colour, 22 tall, at the opacity part's start edge.
            const seam = computed(part(mine, ".cm-paint-opacity"), "::before");
            expect([seam.width, seam.height, hex(seam.backgroundColor)]).toEqual([
                "1px",
                "22px",
                scheme === "light" ? "#ffffff" : "#2c2c2c",
            ]);
            expect(part(mine, ".cm-paint-opacity .cm-paint-input")).toHaveValue("50");
            expect(part(mine, ".cm-paint-hex")).toHaveValue("3373E5");
        });

        it("hover paints the whole field's border", async () => {
            const field = await figmaElement(PAINT[scheme].hover, { cls: "paintPanelColorValueContainer" });
            const container = await renderPaint(scheme);
            const mine = part(container, ".cm-paint-field");
            await drive(mine, "hover");
            expectMeasured(mine, figmaSpec(field, ["borderTopColor", "backgroundColor"]));
        });

        it("focus (keyboard into the hex box) rings the whole field", async () => {
            const field = await figmaElement(PAINT[scheme].focus, { cls: "paintPanelColorValueContainer" });
            const container = await renderPaint(scheme);
            const mine = part(container, ".cm-paint-field");
            await drive(part(mine, ".cm-paint-hex"), "focus");
            expectMeasured(mine, figmaSpec(field, ["borderTopColor", "backgroundColor"]));
        });

        it("focus on the chit also rings the chit itself", async () => {
            const container = await renderPaint(scheme);
            const button = part(container, ".cm-paint-chit");
            await drive(button, "focus");
            expectMeasured(part(container, ".cm-paint-field"), {
                borderTopColor: scheme === "light" ? "#0d99ff" : "#0c8ce9",
            });
            expectMeasured(part(button, ".cm-chit"), {
                boxShadow: "none",
            });
            expect(computed(part(button, ".cm-chit"), "::after").boxShadow).toContain("2px inset");
        });
    });

    it("paint field, AA mode: a 3:1 field edge at rest", async () => {
        const container = await renderPaint("light", true);
        expectMeasured(part(container, ".cm-paint-field"), { boxShadow: "rgba(0, 0, 0, 0.45) 0px 0px 0px 1px inset" });
    });

    it("paint field, disabled: panel fill, disabled border and ink", async () => {
        const { container } = await renderFigma(
            <PopoutManager>
                <CompactColorInput color="#3373E5" defaultColor="#000000" disabled />
            </PopoutManager>,
        );
        expectMeasured(part(container, ".cm-paint-field"), {
            backgroundColor: "#ffffff",
            borderTopColor: "#e6e6e6",
        });
        expectMeasured(part(container, ".cm-paint-hex"), { color: "#0000004d" });
    });

    it("paint field mirrors under a right-to-left direction", async () => {
        const { container } = await renderFigma(
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <div dir="rtl">
                    <PopoutManager>
                        <CompactColorInput color="#3373E5" defaultColor="#000000" width={156} />
                    </PopoutManager>
                </div>
            </DirectionProvider>,
        );
        const field = part(container, ".cm-paint-field");
        const { right } = field.getBoundingClientRect();
        expect(right - part(field, ".cm-paint-chit").getBoundingClientRect().right).toBeCloseTo(5, 0);
        expect(
            part(field, ".cm-paint-opacity").getBoundingClientRect().left - field.getBoundingClientRect().left,
        ).toBeCloseTo(1, 0);
    });

    it("scrubbing the % changes the value live at 0.5 per px and commits once on release", async () => {
        const onOpacityChange = vi.fn();
        const { container } = await renderFigma(
            <PopoutManager>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <CompactColorInput
                        color="#3373E5"
                        opacity={50}
                        defaultColor="#000000"
                        onOpacityChange={onOpacityChange}
                    />
                    <div data-testid="far" style={{ width: 40, height: 24, marginInlineStart: 20 }} />
                </div>
            </PopoutManager>,
        );
        const suffix = part(container, ".cm-paint-suffix");
        const far = part(container, "[data-testid='far']");
        const dx =
            far.getBoundingClientRect().left +
            20 -
            (suffix.getBoundingClientRect().left + suffix.getBoundingClientRect().width / 2);
        await drive(suffix, "press");
        await userEvent.hover(far);
        const expected = Math.round(50 + dx * 0.5);
        expect(part(container, ".cm-paint-opacity .cm-paint-input")).toHaveValue(String(expected));
        expect(onOpacityChange).not.toHaveBeenCalled();
        await commands.mouseUp();
        expect(onOpacityChange).toHaveBeenCalledTimes(1);
        expect(onOpacityChange.mock.calls[0][0]).toBe(expected);
    });

    describe.each([
        ["light", "ii/colour-picker-solid"],
        ["dark", "dt/dark-color-picker"],
    ] as const)("colour picker (7.3) and sliders (7.4), %s", (scheme, cap) => {
        /**
         * The picker body on a panel-coloured surface, as Figma's solid picker shows it.
         * @returns the picker root
         */
        async function renderPicker(): Promise<HTMLElement> {
            const { container } = await renderFigma(
                <div style={{ background: "var(--cm-bg)", width: 240 }}>
                    <ColorPickerPanel value="#3373E5FF" onChange={() => undefined} swatches={SWATCH_COLORS_HEXA} />
                </div>,
                { scheme },
            );
            return part(container, ".cm-color-picker");
        }

        it("saturation field, reticle, sliders and value row sit where Figma draws them", async () => {
            const canvas = await figmaElement(cap, { tag: "canvas", cls: "_1t0vmmd4" });
            const reticle = await figmaElement(cap, { cls: "_1t0vmmd7" });
            const hueThumb = await figmaElement(cap, { cls: "_1byqy9f8", nth: 0 });
            const alphaThumb = await figmaElement(cap, { cls: "_1byqy9f8", nth: 1 });
            const hueSlider = await figmaElement(cap, { role: "slider", aria: "Hue" });
            // The hex wrapper (#195 light, #248 dark); the dark capture has another field before it.
            const hexWrap = await figmaElement(cap, { index: scheme === "light" ? 195 : 248 });
            const hexInput = await figmaElement(cap, { role: "spinbutton", aria: "Color" });
            const opacityWrap = await figmaElement(cap, {
                cls: "tokenizable_input--con",
                nth: scheme === "light" ? 0 : 1,
            });
            const opacityInput = await figmaElement(cap, { tag: "input", aria: "Opacity" });

            const picker = await renderPicker();
            const field = part(picker, ".cm-color-saturation");

            expectMeasured(field, figmaSpec(canvas, ["width", "height", "borderRadius", "outline", "outlineOffset"]));
            expectMeasured(
                part(field, ".cm-color-thumb"),
                {
                    ...figmaSpec(reticle, [
                        "width",
                        "height",
                        "borderTopWidth",
                        "borderTopColor",
                        "backgroundColor",
                        "boxShadow",
                        "borderRadius",
                    ]),
                    ...offset(reticle, canvas),
                },
                { origin: field },
            );

            const [hue, alpha] = [...picker.querySelectorAll<HTMLElement>(".cm-color-slider")];
            // Figma's role=slider is the 180 slot; ours is its middle 156 so the pointer maps onto
            // the thumb's centre. The slot, the track and the thumbs land on Figma's pixels.
            const hueSlot = offset(hueSlider, canvas);
            expectMeasured(hue, { width: 156, height: 24, x: hueSlot.x + 12, y: hueSlot.y }, { origin: field });
            const track = part(hue, ".cm-color-slider-track");
            expectMeasured(track, { width: 172, height: 16, x: hueSlot.x + 4, y: hueSlot.y + 4 }, { origin: field });
            // Figma's hue model puts 3373E5's thumb 0.75px right of a linear 0-360 mapping, so the
            // hue thumb's position is checked at hue 0 below (bc/slider-hue--default) and here only
            // its drawing is compared.
            expectMeasured(
                part(hue, ".cm-color-thumb"),
                figmaSpec(hueThumb, ["width", "height", "borderTopWidth", "borderTopColor", "boxShadow"]),
            );
            expectMeasured(
                part(alpha, ".cm-color-thumb"),
                { ...figmaSpec(alphaThumb, ["width", "height", "backgroundColor"]), ...offset(alphaThumb, canvas) },
                { origin: field },
            );
            // The 12px elevated layer under each thumb (--cm-elevation-300, page scheme).
            const under = computed(part(hue, ".cm-color-thumb"), "::before");
            expect([under.width, under.height]).toEqual(["12px", "12px"]);
            expect(under.boxShadow).not.toBe("none");
            // The opacity track's checkerboard follows the theme (dark: the panel greys).
            expect(computed(part(alpha, ".cm-color-slider-track")).backgroundImage).toContain(
                scheme === "light" ? "rgb(225, 225, 225)" : "rgb(56, 56, 56)",
            );
            // The track's outline.
            expect(hex(computed(hue, "::after").outlineColor)).toBe(scheme === "light" ? "#0000001a" : "#ffffff1a");

            expectMeasured(
                part(picker, ".cm-joined-field > .cm-paint-input"),
                {
                    ...figmaSpec(hexWrap, ["width", "height", "backgroundColor"]),
                    ...figmaSpec(hexInput, ["paddingLeft", "paddingRight", "color", ...TYPE]),
                    ...offset(hexWrap, canvas),
                },
                { origin: field },
            );
            expectMeasured(
                part(picker, ".cm-joined-field .cm-paint-opacity"),
                { ...figmaSpec(opacityWrap, ["width", "height", "backgroundColor"]), ...offset(opacityWrap, canvas) },
                { origin: field },
            );
            expectMeasured(
                part(picker, ".cm-joined-field .cm-paint-opacity .cm-paint-input"),
                { ...figmaSpec(opacityInput, ["width", "paddingLeft"]), ...offset(opacityInput, canvas) },
                { origin: field },
            );
            expect(part(picker, ".cm-joined-field > .cm-paint-input")).toHaveValue("3373E5");
        });

        it("swatches: 16px chits at a 24px pitch, 9 per row, a ring on near-white", async () => {
            const first = await figmaElement(cap, { tag: "button", aria: "Solid color hex: D9D9D" });
            const white = await figmaElement(cap, { tag: "button", aria: "Solid color hex: FFFFF" });
            const ringed = scheme === "light" ? await figmaElement(cap, { cls: "chitBorder", nth: 0 }) : undefined;

            const { container } = await renderFigma(
                <div style={{ width: 240 }}>
                    <ColorPickerPanel
                        value="#3373E5"
                        onChange={() => undefined}
                        swatches={["#D9D9D9", "#FFFFFF", ...Array.from({ length: 8 }, (_, i) => `#00000${i}`)]}
                    />
                </div>,
                { scheme },
            );
            const picker = part(container, ".cm-color-picker");
            const buttons = [...picker.querySelectorAll<HTMLElement>(".cm-color-swatch-button")];
            expectMeasured(
                buttons[0],
                { ...figmaSpec(first, ["width", "height", "borderRadius"]), x: 16 },
                { origin: picker },
            );
            expectMeasured(buttons[1], { x: 16 + (white.box[0] - first.box[0]) }, { origin: picker });
            expectMeasured(
                buttons[9],
                { x: 16, y: buttons[0].getBoundingClientRect().top - picker.getBoundingClientRect().top + 24 },
                { origin: picker },
            );
            expectMeasured(part(buttons[0], ".mantine-ColorSwatch-colorOverlay"), {
                backgroundColor: hex(first.style.backgroundColor),
            });
            if (ringed !== undefined) {
                expectMeasured(part(buttons[1], ".cm-chit-shadow"), figmaSpec(ringed, ["boxShadow"]));
            }
            expectMeasured(part(buttons[0], ".cm-chit-shadow"), { boxShadow: "none" });
            expect(buttons[0]).toHaveAccessibleName("#D9D9D9");
        });

        it("keyboard focus on a slider grows the thumb and rings it at -2px", async () => {
            const focused = await figmaElement("bc/slider-hue--focus", { cls: "_1byqy9f8" });
            const picker = await renderPicker();
            const hue = part(picker, ".cm-color-slider");
            await drive(hue, "focus");
            const ring = figmaSpec(focused, ["width", "height", "borderTopWidth", "outline", "outlineOffset"]);
            expectMeasured(
                part(hue, ".cm-color-thumb"),
                scheme === "light" ? ring : { ...ring, outline: "rgb(12, 140, 233) solid 1px" },
            );
        });
    });

    describe("colour picker behaviour", () => {
        it("the sliders step 1 unit with the arrows, 10 with Shift, and jump with Home / End", async () => {
            const onChange = vi.fn();
            const { container } = await renderFigma(<ColorPickerPanel value="#FF0000FF" onChange={onChange} />);
            const [hue, alpha] = [...container.querySelectorAll<HTMLElement>(".cm-color-slider")];
            await drive(hue, "focus");
            await userEvent.keyboard("{ArrowRight}");
            expect(hue).toHaveAttribute("aria-valuenow", "1");
            await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
            expect(hue).toHaveAttribute("aria-valuenow", "11");
            await userEvent.keyboard("{End}");
            expect(hue).toHaveAttribute("aria-valuenow", "360");
            await drive(alpha, "focus");
            await userEvent.keyboard("{ArrowLeft}");
            expect(onChange.mock.calls.at(-1)?.[0]).toMatch(/FC$/);
            await userEvent.keyboard("{Home}");
            expect(onChange.mock.calls.at(-1)?.[0]).toMatch(/00$/);
        });

        it("the saturation field moves 1% per arrow and 10% with Shift", async () => {
            const onChange = vi.fn();
            const { container } = await renderFigma(
                <ColorPickerPanel value="#808080" withAlpha={false} onChange={onChange} />,
            );
            const field = part(container, ".cm-color-saturation");
            await drive(field, "focus");
            await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
            expect(field).toHaveAttribute("aria-valuenow", "10");
            expect(onChange.mock.calls.at(-1)?.[0]).toMatch(/^#[0-9A-F]{6}$/);
        });

        it("typing a value in RGB commits it", async () => {
            const onChange = vi.fn();
            const { container } = await renderFigma(
                <ColorPickerPanel value="#000000FF" onChange={onChange} defaultFormat="rgb" />,
            );
            const input = part(container, ".cm-joined-field > .cm-paint-input");
            expect(input).toHaveValue("0, 0, 0");
            await userEvent.clear(input);
            await userEvent.type(input, "255, 0, 0{Enter}");
            expect(onChange.mock.calls.at(-1)?.[0]).toBe("#FF0000FF");
        });

        it("a standalone themed HueSlider takes the same track and thumb", async () => {
            const { container } = await renderFigma(
                <div style={{ width: 180 }}>
                    <HueSlider value={0} onChange={() => undefined} aria-label="Hue" />
                </div>,
            );
            const slot = await figmaElement("bc/slider-hue--default", { role: "slider", aria: "Hue" });
            const thumb = await figmaElement("bc/slider-hue--default", { cls: "_1byqy9f8" });
            const slider = part(container, ".cm-color-slider");
            expectMeasured(slider, { width: 156, height: 24 });
            // At hue 0 the thumb's start edge meets the track's start edge, 4px into the 180 slot.
            expectMeasured(
                part(slider, ".cm-color-thumb"),
                {
                    ...figmaSpec(thumb, ["width", "height", "borderTopWidth", "backgroundColor", "boxShadow"]),
                    x: thumb.box[0] - slot.box[0] - 12,
                    y: thumb.box[1] - slot.box[1],
                },
                { origin: slider },
            );
        });
    });

    describe("gradient editor (7.5)", () => {
        const cap = "pm/color-picker-gradient-existing";
        const stops = [createColorStop(0, "#FF4D4D"), createColorStop(1, "#4D4DFF")];

        it("bar, handles, header and rows sit where Figma draws them", async () => {
            const directionRow = await figmaElement(cap, { cls: "gradient_editor--gradientSettingsRow" });
            const header = await figmaElement(cap, { index: 182 });
            const stopChit = await figmaElement(cap, { index: 199 });
            const stopHex = await figmaElement(cap, { index: 205 });
            const bar = await figmaElement(cap, { cls: "gradient_control--canv" });
            const selectedHandle = await figmaElement(cap, { cls: "gradient_control--chit", nth: 0 });
            const otherHandle = await figmaElement(cap, { cls: "gradient_control--chit", nth: 1 });
            const handleChit = await figmaElement(cap, { index: 172 });
            const title = await figmaElement(cap, { text: "Stops" });
            const row = await figmaElement(cap, { index: 190 });
            const position = await figmaElement(cap, { index: 192 });
            const color = await figmaElement(cap, { index: 197 });
            const remove = await figmaElement(cap, { index: 213 });
            // The editor starts at the direction row (48 tall, controls at +12).
            const originY = directionRow.box[1];
            const originX = row.box[0];
            const at = (el: FigmaElement): { x: number; y: number } => ({
                x: el.box[0] - originX,
                y: el.box[1] - originY,
            });

            const { container } = await renderFigma(
                <PopoutManager>
                    <div style={{ width: 240, background: "var(--cm-bg)" }}>
                        <GradientEditor defaultStops={stops} defaultDirection={90} />
                    </div>
                </PopoutManager>,
            );
            const root = part(container, ".cm-gradient");
            expectMeasured(root, { width: 240, height: 216 });
            expectMeasured(
                part(root, ".cm-gradient-direction"),
                { height: directionRow.box[3], ...at(directionRow) },
                { origin: root },
            );
            expectMeasured(part(root, "[data-testid='gradient-editor-direction-input']"), { y: 12 }, { origin: root });
            expectMeasured(
                part(root, ".cm-gradient-header"),
                { height: header.box[3], y: at(header).y },
                { origin: root },
            );
            expectMeasured(
                part(root, ".cm-gradient-bar"),
                { ...figmaSpec(bar, ["width", "height", "borderRadius", "outline", "outlineOffset"]), ...at(bar) },
                { origin: root },
            );
            const handles = [...root.querySelectorAll<HTMLElement>(".cm-gradient-handle")];
            expectMeasured(
                handles[0],
                {
                    ...figmaSpec(selectedHandle, ["width", "height", "backgroundColor", "borderRadius"]),
                    ...at(selectedHandle),
                },
                { origin: root },
            );
            expectMeasured(
                handles[1],
                {
                    ...figmaSpec(otherHandle, ["width", "height", "backgroundColor", "boxShadow"]),
                    ...at(otherHandle),
                },
                { origin: root },
            );
            expectMeasured(
                part(handles[0], ".cm-gradient-handle-chit"),
                {
                    ...figmaSpec(handleChit, ["width", "height", "borderRadius", "borderTopWidth", "borderTopColor"]),
                    ...at(handleChit),
                },
                { origin: root },
            );
            expectMeasured(
                part(root, "[data-testid='gradient-editor-heading']"),
                { ...figmaSpec(title, ["fontSize", "lineHeight", "fontWeight", "color"]), ...at(title) },
                { origin: root },
            );
            const rows = [...root.querySelectorAll<HTMLElement>(".cm-gradient-stop")];
            expectMeasured(
                rows[0],
                { ...figmaSpec(row, ["width", "height", "backgroundColor"]), ...at(row) },
                { origin: root },
            );
            expectMeasured(
                part(rows[0], ".cm-gradient-position"),
                { ...figmaSpec(position, ["width", "height", "backgroundColor", "borderRadius"]), ...at(position) },
                { origin: root },
            );
            expectMeasured(
                part(rows[0], ".cm-paint-field"),
                { ...figmaSpec(color, ["width", "height", "backgroundColor", "borderRadius"]), ...at(color) },
                { origin: root },
            );
            expectMeasured(
                part(rows[0], ".cm-chit"),
                { ...figmaSpec(stopChit, ["width", "height", "borderRadius"]), ...at(stopChit) },
                { origin: root },
            );
            const hexBox = part(rows[0], ".cm-paint-hex");
            const hexTextX =
                hexBox.getBoundingClientRect().left -
                root.getBoundingClientRect().left +
                parseFloat(computed(hexBox).paddingLeft);
            expect(hexTextX).toBeCloseTo(at(stopHex).x + parseFloat(stopHex.style.paddingLeft), 0);
            expectMeasured(
                part(rows[0], "[data-testid='gradient-editor-remove-stop']"),
                { ...figmaSpec(remove, ["width", "height"]), ...at(remove) },
                { origin: root },
            );
            expect(part(rows[0], ".cm-gradient-position")).toHaveValue("0%");
        });

        it("dark: handles, rows and bar read the dark tokens", async () => {
            const { container } = await renderFigma(
                <PopoutManager>
                    <div style={{ width: 240 }}>
                        <GradientEditor defaultStops={stops} />
                    </div>
                </PopoutManager>,
                { scheme: "dark" },
            );
            const handles = [...container.querySelectorAll<HTMLElement>(".cm-gradient-handle")];
            expectMeasured(handles[0], { backgroundColor: "#0c8ce9" });
            expectMeasured(handles[1], { backgroundColor: "#383838" });
            expectMeasured(part(container, ".cm-gradient-stop[data-selected]"), { backgroundColor: "#394360" });
            expectMeasured(part(container, ".cm-gradient-bar"), { outline: "rgba(255, 255, 255, 0.1) solid 1px" });
        });

        it("dragging a handle moves its stop live and reports one start and one end", async () => {
            const onChange = vi.fn();
            const onChangeStart = vi.fn();
            const onChangeEnd = vi.fn();
            const { container } = await renderFigma(
                <PopoutManager>
                    <div style={{ width: 240 }}>
                        <GradientEditor
                            defaultStops={stops}
                            showDirection={false}
                            onChange={onChange}
                            onChangeStart={onChangeStart}
                            onChangeEnd={onChangeEnd}
                        />
                    </div>
                </PopoutManager>,
            );
            const handle = container.querySelectorAll<HTMLElement>(".cm-gradient-handle")[0];
            const bar = part(container, ".cm-gradient-bar");
            await drive(handle, "press");
            await userEvent.hover(bar);
            expect(onChangeStart).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls.at(-1)?.[0][0].offset).toBeCloseTo(0.5, 1);
            await commands.mouseUp();
            expect(onChangeEnd).toHaveBeenCalledTimes(1);
        });
    });

    describe.each([
        ["light", "ii/colour-picker-solid", 49, undefined],
        ["dark", "dt/dark-color-picker", 64, 66],
    ] as const)("picker open state, %s", (scheme, cap, rowIndex, fieldIndex) => {
        it("the field and the field row take --cm-bg-pressed while the picker is open", async () => {
            const row = await figmaElement(cap, { index: rowIndex });
            const { container } = await renderFigma(
                <PopoutManager>
                    <div style={{ background: "var(--cm-bg)", paddingInline: "16px 8px", width: 216 }}>
                        <FieldRow>
                            <CompactColorInput color="#3373E5" opacity={50} defaultColor="#000000" width={156} />
                        </FieldRow>
                    </div>
                </PopoutManager>,
                { scheme },
            );
            const pressed = hex(row.style.backgroundColor);
            const field = part(container, ".cm-paint-field");
            await drive(part(container, ".cm-paint-chit"), "open");
            expect(part(container, ".cm-paint-chit")).toHaveAttribute("aria-expanded", "true");
            const expectedField =
                fieldIndex === undefined
                    ? { backgroundColor: pressed, borderTopColor: pressed }
                    : figmaSpec(await figmaElement(cap, { index: fieldIndex }), ["backgroundColor", "borderTopColor"]);
            expectMeasured(field, expectedField);
            const fieldRow = part(container, "[data-testid='field-row']");
            const bleed = computed(fieldRow);
            expect(bleed.borderImageSource).toContain(pressed === "#e6e6e6" ? "rgb(230, 230, 230)" : "rgb(68, 68, 68)");
            expect(bleed.borderImageOutset).toBe("0 8px 0 16px");
        });
    });

    describe("keyboard and pointer behaviour of the text fields", () => {
        it("Escape reverts what was typed in the hex and opacity boxes and commits nothing", async () => {
            const onChange = vi.fn();
            const { container } = await renderFigma(
                <PopoutManager>
                    <CompactColorInput color="#3373E5" opacity={50} defaultColor="#000000" onChange={onChange} />
                </PopoutManager>,
            );
            const hexBox = part(container, ".cm-paint-hex") as HTMLInputElement;
            await userEvent.click(hexBox);
            await userEvent.keyboard("{Control>}a{/Control}123456{Escape}");
            expect(hexBox).toHaveValue("3373E5");
            expect(document.activeElement).not.toBe(hexBox);
            const opacity = part(container, ".cm-paint-opacity .cm-paint-input");
            await userEvent.click(opacity);
            await userEvent.keyboard("{Control>}a{/Control}12{Escape}");
            expect(opacity).toHaveValue("50");
            expect(onChange).not.toHaveBeenCalled();
        });

        it("Escape reverts the picker's value box", async () => {
            const onChange = vi.fn();
            const { container } = await renderFigma(
                <div style={{ width: 240 }}>
                    <ColorPickerPanel value="#3373E5FF" onChange={onChange} />
                </div>,
            );
            const value = part(container, "[data-testid='color-picker-value']");
            await userEvent.click(value);
            await userEvent.keyboard("{Control>}a{/Control}FF0000{Escape}");
            expect(value).toHaveValue("3373E5");
            expect(onChange).not.toHaveBeenCalled();
        });

        it("Escape in the picker's value box reverts but leaves the picker open; a second Escape closes it", async () => {
            const onChange = vi.fn();
            const { container } = await renderFigma(
                <PopoutManager>
                    <CompactColorInput color="#3373E5" opacity={50} defaultColor="#000000" onChange={onChange} />
                </PopoutManager>,
            );
            await drive(part(container, ".cm-paint-chit"), "open");
            const value = document.querySelector<HTMLInputElement>("[data-testid='color-picker-value']");
            expect(value).not.toBeNull();
            await userEvent.click(value as HTMLInputElement);
            await userEvent.keyboard("{Control>}a{/Control}FF0000{Escape}");
            expect(value).toHaveValue("3373E5");
            expect(document.querySelector("[data-testid='color-picker-value']")).not.toBeNull();
            expect(onChange).not.toHaveBeenCalled();
            await userEvent.keyboard("{Escape}");
            await vi.waitFor(() => {
                expect(document.querySelector("[data-testid='color-picker-value']")).toBeNull();
            });
        });

        it("Escape reverts the gradient angle field", async () => {
            const onChange = vi.fn();
            const { container } = await renderFigma(
                <PopoutManager>
                    <div style={{ width: 240 }}>
                        <GradientEditor
                            defaultStops={[createColorStop(0, "#3373E5"), createColorStop(1, "#FFFFFF")]}
                            onChange={onChange}
                        />
                    </div>
                </PopoutManager>,
            );
            const angle = part(container, "[data-testid='gradient-editor-direction-input']");
            await userEvent.click(angle);
            await userEvent.keyboard("{Control>}a{/Control}45{Escape}");
            expect(angle).toHaveValue("0\u00b0");
            expect(onChange).not.toHaveBeenCalled();
        });

        it("Delete on a handle moves focus to the neighbouring handle", async () => {
            const { container } = await renderFigma(
                <PopoutManager>
                    <div style={{ width: 240 }}>
                        <GradientEditor
                            defaultStops={[
                                createColorStop(0, "#FF0000"),
                                createColorStop(0.5, "#00FF00"),
                                createColorStop(1, "#0000FF"),
                            ]}
                        />
                    </div>
                </PopoutManager>,
            );
            let handles = container.querySelectorAll<HTMLElement>(".cm-gradient-handle");
            handles[2].focus();
            await userEvent.keyboard("{Delete}");
            handles = container.querySelectorAll<HTMLElement>(".cm-gradient-handle");
            expect(handles).toHaveLength(2);
            expect(document.activeElement).toBe(handles[1]);
        });

        it("scrubbing the % leaves focus in the opacity field, so the arrows edit it next", async () => {
            const onOpacityChange = vi.fn();
            const { container } = await renderFigma(
                <PopoutManager>
                    <CompactColorInput
                        color="#3373E5"
                        opacity={50}
                        defaultColor="#000000"
                        onOpacityChange={onOpacityChange}
                    />
                </PopoutManager>,
            );
            await drive(part(container, ".cm-paint-suffix"), "press");
            await commands.mouseUp();
            const opacity = part(container, ".cm-paint-opacity .cm-paint-input");
            expect(document.activeElement).toBe(opacity);
            await userEvent.keyboard("{ArrowUp}");
            expect(onOpacityChange.mock.calls.at(-1)?.[0]).toBe(51);
        });

        it("the opacity text starts at x+9 of its 54 box, as Figma's 1px border plus 7 padding", async () => {
            const container = await renderPaint("light");
            const box = part(container, ".cm-paint-field .cm-paint-opacity");
            const input = part(box, ".cm-paint-input");
            const textX =
                input.getBoundingClientRect().left -
                box.getBoundingClientRect().left +
                parseFloat(computed(input).borderLeftWidth) +
                parseFloat(computed(input).paddingLeft);
            expect(textX).toBe(9);
        });

        it("without opacity the picker's value field is rounded at both ends and the format reads in full", async () => {
            const { container } = await renderFigma(
                <div style={{ width: 240 }}>
                    <ColorPickerPanel
                        value="#3373E5"
                        withAlpha={false}
                        defaultFormat="rgb"
                        onChange={() => undefined}
                    />
                </div>,
            );
            const value = part(container, ".cm-joined-field > .cm-paint-input");
            expectMeasured(value, { borderRadius: "5px" });
            const format = part(container, ".cm-color-picker-format input") as HTMLInputElement;
            expect(format.scrollWidth).toBeLessThanOrEqual(format.clientWidth);
            expect(part(container, ".cm-color-picker-values").getBoundingClientRect().width).toBe(208);
            expect(
                part(container, ".cm-joined-field").getBoundingClientRect().right -
                    part(container, ".cm-color-picker-values").getBoundingClientRect().right,
            ).toBe(0);
        });

        it("the format menu opens over its trigger, current option on the field, every option inside it", async () => {
            const cap = "pm/color-picker-format-menu";
            const trigger = await figmaElement(cap, { index: 189 });
            const menu = await figmaElement(cap, { index: 298 });
            const current = await figmaElement(cap, { index: 299 });
            const { container } = await renderFigma(
                <div style={{ width: 240 }}>
                    <ColorPickerPanel value="#3373E5FF" onChange={() => undefined} />
                </div>,
            );
            const input = part(container, ".cm-color-picker-format input");
            await userEvent.click(input);
            const listbox = part(container, "[role='listbox']").getBoundingClientRect();
            const t = input.getBoundingClientRect();
            const options = [...container.querySelectorAll<HTMLElement>("[role='option']")];
            expect(options.length).toBeGreaterThan(1);
            for (const option of options) {
                const r = option.getBoundingClientRect();
                expect(r.left).toBeGreaterThanOrEqual(listbox.left - 0.5);
                expect(r.right).toBeLessThanOrEqual(listbox.right + 0.5);
            }
            const selected = part(container, "[role='option'][aria-selected='true']").getBoundingClientRect();
            expect(Math.abs(selected.top - t.top - (current.box[1] - trigger.box[1]))).toBeLessThanOrEqual(1);
            expect(Math.abs(listbox.left - t.left - (menu.box[0] - trigger.box[0]))).toBeLessThanOrEqual(1);
            // Figma's menu is 88.2 because it also offers "CSS", the widest word; this picker has no
            // CSS format, so the width is compared through the option padding instead.
            const option = await figmaElement(cap, { index: 299 });
            expectMeasured(options[0], figmaSpec(option, ["paddingLeft", "paddingRight", "height"]));
        });

        it("AA mode: the picker's joined value / opacity field gets the 3:1 field edge", async () => {
            const { container } = await renderFigma(
                <div style={{ width: 240 }}>
                    <ColorPickerPanel value="#3373E5FF" onChange={() => undefined} />
                </div>,
                { highContrast: true },
            );
            expectMeasured(part(container, ".cm-joined-field"), {
                boxShadow: "rgba(0, 0, 0, 0.45) 0px 0px 0px 1px inset",
            });
        });

        it("Figma mode: the joined field has no edge at rest", async () => {
            const { container } = await renderFigma(
                <div style={{ width: 240 }}>
                    <ColorPickerPanel value="#3373E5FF" onChange={() => undefined} />
                </div>,
            );
            expectMeasured(part(container, ".cm-joined-field"), { boxShadow: "none" });
        });

        it("the gradient flip and rotate buttons sit 4 apart, at Figma's x+180 and x+208", async () => {
            const cap = "pm/color-picker-gradient-existing";
            const directionRow = await figmaElement(cap, { cls: "gradient_editor--gradientSettingsRow" });
            const flipCap = await figmaElement(cap, { index: 160 });
            const rotateCap = await figmaElement(cap, { index: 164 });
            const { container } = await renderFigma(
                <PopoutManager>
                    <div style={{ width: 240 }}>
                        <GradientEditor defaultStops={[createColorStop(0, "#3373E5"), createColorStop(1, "#FFFFFF")]} />
                    </div>
                </PopoutManager>,
            );
            const row = part(container, ".cm-gradient-direction").getBoundingClientRect();
            const flip = part(container, "[data-testid='gradient-editor-flip']").getBoundingClientRect();
            const rotate = part(container, "[data-testid='gradient-editor-rotate']").getBoundingClientRect();
            expect(flip.left - row.left).toBe(flipCap.box[0] - directionRow.box[0]);
            expect(rotate.left - row.left).toBe(rotateCap.box[0] - directionRow.box[0]);
        });
    });
});
