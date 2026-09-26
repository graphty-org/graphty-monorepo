/**
 * The input family against Figma (design/figma-spec.md 6), light and dark, and the AA option
 * where a field reads an AA token. Every expected value that a capture holds is read from the
 * capture (figma.ts); values the study never captured (outlined text input, textarea, pills) are
 * the spec's own numbers.
 *
 * Captures: dt/{light,dark}-number-input-x--{default,hover,focus} (#27 wrapper, #30 input);
 * bc/number-input-{disabled,invalid}--default (#25, #28); ii/select-trigger-{default,hover} (#27,
 * #29 label); dt/{light,dark}-select-prototype-device--{default,focus} (#26); ii/select-listbox-open
 * and -option-hover (#85 surface, #86 list, #87 option); dt/{light,dark}-combo-font-size--* (#37
 * field, #40 caret, #42 hover edge, #45 input); dt/{light,dark}-search-input-assets--focus (#23/24
 * field, #25/26 icon, #28/29 input); rs/apply-variable-radius-bound(-hover) (#68 pill, #75
 * detach); rs/fill-variable-bound(-hover) (#53 row, #55 chit, #58 name, #61 detach).
 */
import {
    MantineProvider,
    MultiSelect,
    NativeSelect,
    Select,
    Textarea,
    TextInput,
} from "@mantine/core";
import { render } from "@testing-library/react";
import { commands, page, userEvent } from "@vitest/browser/context";
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComboInput } from "../../src/components/inputs/ComboInput";
import { SearchInput } from "../../src/components/inputs/SearchInput";
import { VariablePill } from "../../src/components/inputs/VariablePill";
import { PanelField } from "../../src/components/rows/PanelField";
import { StyleNumberInput } from "../../src/components/StyleNumberInput";
import { createCompactTheme } from "../../src/theme";
import {
    computed,
    drive,
    expectMeasured,
    figmaAvailable,
    type FigmaElement,
    figmaElement,
    figmaSpec,
    hex,
    measure,
    normalise,
    part,
    renderFigma,
    resetHarness,
} from "./harness";

const available = await figmaAvailable();

beforeEach(async () => {
    await page.viewport(900, 700);
});
afterEach(resetHarness);

const SCHEMES = ["light", "dark"] as const;

/** Wait until the browser has laid out and floating-ui has placed any open list. */
async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
}

/**
 * The listbox on screen, if any. A Combobox keeps its dropdown mounted (hidden) while closed, so
 * "open" means rendered, not merely present.
 * @returns the visible listbox, or null
 */
function visibleListbox(): HTMLElement | null {
    return [...document.querySelectorAll<HTMLElement>(".cm-listbox")].find((el) => el.checkVisibility()) ?? null;
}

/** The open listbox, once it is placed. */
async function listbox(): Promise<HTMLElement> {
    await vi.waitFor(() => {
        expect(visibleListbox()).not.toBeNull();
    });
    await settle();
    return visibleListbox() as HTMLElement;
}

/** A box-shadow's layers, normalised and sorted (layer order does not change black shadows). */
function shadowSet(value: string): string[] {
    return normalise("boxShadow", value)
        .split(/,(?![^(]*\))/)
        .map((layer) => layer.trim())
        .sort();
}

/** A Figma capture's box-shadow with its layers in the same canonical form. */
function figmaShadow(el: FigmaElement): string[] {
    return shadowSet(el.style.boxShadow);
}

/** The field wrapper (Mantine's Input wrapper, the element that is Figma's field). */
function field(container: HTMLElement): HTMLElement {
    return part(container, ".cm-input-wrapper");
}

/** The x where the field's text starts, relative to the field. */
function textInset(container: HTMLElement): number {
    const input = part(container, ".cm-input-wrapper input");
    const wrapper = field(container);
    return input.getBoundingClientRect().left + parseFloat(computed(input).paddingLeft) - wrapper.getBoundingClientRect().left;
}

/** The number field under test: 88 wide, a 24px letter slot, value 40. */
function numberField(extra: Partial<React.ComponentProps<typeof PanelField>> = {}): React.JSX.Element {
    return (
        <PanelField
            label="X-position"
            glyph={<span>X</span>}
            kind="number"
            defaultValue={40}
            onChange={() => undefined}
            {...extra}
        />
    );
}

const FIELD = ["width", "height", "backgroundColor", "borderRadius", "outline", "outlineOffset"];
const TYPE = ["color", "fontSize", "lineHeight", "fontWeight", "letterSpacing"];

describe.skipIf(!available)("6.1 scrubbable number input", () => {
    describe.each(SCHEMES)("%s", (scheme) => {
        const capture = (state: string): string => `dt/${scheme}-number-input-x--${state}`;

        it("rest: 88 x 24 filled field, transparent outline slot at -1px, value 11/16 450", async () => {
            const wrapper = await figmaElement(capture("default"), { index: 27 });
            const input = await figmaElement(capture("default"), { index: 30 });
            const { container } = await renderFigma(numberField(), { scheme });
            expectMeasured(field(container), figmaSpec(wrapper, FIELD));
            expectMeasured(part(container, "input"), figmaSpec(input, [...TYPE, "paddingRight"]));
            expect(textInset(container)).toBeCloseTo(input.box[0] - wrapper.box[0], 1);
        });

        it("hover: the outline takes --cm-border", async () => {
            const wrapper = await figmaElement(capture("hover"), { index: 27 });
            const { container } = await renderFigma(numberField(), { scheme });
            await drive(field(container), "hover");
            expectMeasured(field(container), figmaSpec(wrapper, FIELD));
        });

        it("keyboard focus: the outline takes --cm-border-selected", async () => {
            const wrapper = await figmaElement(capture("focus"), { index: 27 });
            const { container } = await renderFigma(numberField(), { scheme });
            await drive(part(container, "input"), "focus");
            expectMeasured(field(container), figmaSpec(wrapper, FIELD));
        });

        it("mouse focus rings too, and wins over hover", async () => {
            const wrapper = await figmaElement(capture("focus"), { index: 27 });
            const { container } = await renderFigma(numberField(), { scheme });
            await drive(part(container, "input"), "open");
            expectMeasured(field(container), figmaSpec(wrapper, ["outline"]));
        });
    });

    it("disabled: panel fill, disabled outline and text, no hover", async () => {
        const wrapper = await figmaElement("bc/number-input-disabled--default", { index: 25 });
        const input = await figmaElement("bc/number-input-disabled--default", { index: 28 });
        const { container } = await renderFigma(numberField({ disabled: true }));
        await drive(field(container), "hover");
        expectMeasured(field(container), figmaSpec(wrapper, ["backgroundColor", "outline", "outlineOffset"]));
        expectMeasured(part(container, "input"), figmaSpec(input, ["color"]));
    });

    it("invalid: --cm-border-danger-strong outline, which focus replaces", async () => {
        const wrapper = await figmaElement("bc/number-input-invalid--default", { index: 25 });
        const { container } = await renderFigma(
            <TextInput aria-label="X-position" error defaultValue="40" style={{ width: 120 }} />,
        );
        expectMeasured(field(container), figmaSpec(wrapper, ["backgroundColor", "outline"]));
        await drive(part(container, "input"), "focus");
        expectMeasured(field(container), { outlineColor: "#0d99ff" });
    });

    it.each([
        ["light", "#00000073", "#000000a6"],
        ["dark", "#ffffff59", "#ffffff80"],
    ] as const)("AA option (%s): a 3:1 inside edge at rest, a darker one on hover", async (scheme, rest, hover) => {
        const { container } = await renderFigma(numberField(), { highContrast: true, scheme });
        expectMeasured(field(container), { boxShadow: `${rest} 0px 0px 0px 1px inset`, outlineColor: "#00000000" });
        await drive(field(container), "hover");
        // The hover edge is the outline alone: an outline paints over a box-shadow, so a lighter
        // outline on top would hide the darker edge.
        expectMeasured(field(container), { boxShadow: "none", outlineColor: hover });
    });

    it.each(SCHEMES)("Figma look (%s): hovering a filled field paints the --cm-border outline", async (scheme) => {
        const { container } = await renderFigma(<TextInput aria-label="Name" />, { scheme });
        await drive(field(container), "hover");
        expectMeasured(field(container), {
            boxShadow: "none",
            outlineColor: scheme === "light" ? "#e6e6e6" : "#444444",
        });
    });

    it("the slot is the scrub handle: 0.5 per px, ew-resize on the page, one commit on release", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(numberField({ onChange }));
        const slot = part(container, "[data-testid=panel-field-slot]");
        expect(computed(slot).cursor).toBe("ew-resize");
        await userEvent.hover(slot, { position: { x: 12, y: 12 } });
        await drive(slot, "press");
        await userEvent.hover(slot, { position: { x: 32, y: 12 } });
        expect(part(container, "input")).toHaveValue("50");
        expect(computed(document.body).cursor).toBe("ew-resize");
        expect(computed(document.documentElement).cursor).toBe("ew-resize");
        expect(onChange).not.toHaveBeenCalled();
        const input = part(container, "input");
        expect(document.activeElement).not.toBe(input);
        await commands.mouseUp();
        // Focus is in the field after a scrub (flows.md 6), so the arrow keys then edit it.
        expect(document.activeElement).toBe(input);
        await userEvent.keyboard("{ArrowUp}");
        expect(onChange.mock.calls.map((call) => call[0] as number)).toEqual([50, 51]);
        expect(document.body.style.cursor).toBe("");
    });

    it("typing commits on Enter, evaluates arithmetic and keeps focus; a bad value reverts", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(numberField({ onChange }));
        const input = part(container, "input");
        await userEvent.click(input);
        await userEvent.keyboard("40*2");
        expect(onChange).not.toHaveBeenCalled();
        await userEvent.keyboard("{Enter}");
        expect(onChange).toHaveBeenLastCalledWith(80, expect.anything());
        expect(document.activeElement).toBe(input);
        await userEvent.keyboard("1+");
        await userEvent.tab();
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("no steppers, a spinbutton with the arrow hint", async () => {
        const { container } = await renderFigma(numberField());
        expect(container.querySelector(".mantine-NumberInput-controls")).toBeNull();
        const input = part(container, "input");
        expect(input.getAttribute("role")).toBe("spinbutton");
        expect(input.getAttribute("aria-valuenow")).toBe("40");
        expect(input.getAttribute("aria-description")).toBe("Use arrow keys to change the value");
    });

    it("Mixed reads in --cm-text", async () => {
        const { container } = await renderFigma(numberField({ mixed: true }));
        const input = part(container, "input");
        expect(input.getAttribute("placeholder")).toBe("Mixed");
        expectMeasured(input, { color: "#000000e5" }, { pseudo: "::placeholder" });
    });

    it("StyleNumberInput is the same filled field with the reset in the trailing slot", async () => {
        const wrapper = await figmaElement("dt/light-number-input-x--default", { index: 27 });
        const { container } = await renderFigma(
            <div style={{ width: 88 + 8 + 24 }}>
                <StyleNumberInput label="Size" value={20} defaultValue={10} onChange={() => undefined} />
            </div>,
        );
        expectMeasured(field(container), figmaSpec(wrapper, ["height", "backgroundColor", "borderRadius"]));
        const reset = part(container, "[data-testid=style-number-input-reset]");
        expectMeasured(reset, { width: 24, height: 24 });
        expect(reset.getBoundingClientRect().left - field(container).getBoundingClientRect().right).toBeCloseTo(8, 0);
        expect(reset.getBoundingClientRect().bottom).toBeCloseTo(field(container).getBoundingClientRect().bottom, 0);
    });
});

describe.skipIf(!available)("6.2 text input and search", () => {
    it("TextInput: the filled field; label is the field-row legend", async () => {
        // The legend is a 16px band (#24) whose visible text is a 9/14 500 caption (#25), 4px
        // above the field (#26).
        const band = await figmaElement("ii/number-input-default", { index: 24 });
        const text = await figmaElement("ii/number-input-default", { index: 25 });
        const figmaField = await figmaElement("ii/number-input-default", { index: 26 });
        const { container } = await renderFigma(<TextInput label="Name" defaultValue="Frame" />);
        expectMeasured(field(container), {
            height: 24,
            backgroundColor: "#f5f5f5",
            borderTopLeftRadius: "5px",
            borderTopWidth: "0px",
        });
        expect(textInset(container)).toBeCloseTo(8, 1);
        expectMeasured(
            part(container, "label"),
            figmaSpec(text, ["color", "fontSize", "lineHeight", "fontWeight", "letterSpacing"]),
        );
        const label = part(container, "label").getBoundingClientRect();
        expect(label.height).toBeCloseTo(band.box[3], 0);
        expect(field(container).getBoundingClientRect().top - label.bottom).toBeCloseTo(
            figmaField.box[1] - (band.box[1] + band.box[3]),
            0,
        );
    });

    it.each(SCHEMES)("outlined TextInput (%s): --cm-bg, 1px --cm-border, text 8 in", async (scheme) => {
        const { container } = await renderFigma(<TextInput variant="outlined" aria-label="Name" defaultValue="Frame" />, {
            scheme,
        });
        expectMeasured(field(container), {
            height: 24,
            backgroundColor: scheme === "light" ? "#ffffff" : "#2c2c2c",
            borderTopWidth: "1px",
            borderTopColor: scheme === "light" ? "#e6e6e6" : "#444444",
            borderTopLeftRadius: "5px",
        });
        expect(textInset(container)).toBeCloseTo(8, 1);
        await drive(part(container, "input"), "focus");
        expectMeasured(field(container), { outlineColor: scheme === "light" ? "#0d99ff" : "#0c8ce9" });
    });

    it("placeholder is --cm-text-tertiary", async () => {
        const { container } = await renderFigma(<TextInput aria-label="Name" placeholder="Name" />);
        expectMeasured(part(container, "input"), { color: "#0000004d" }, { pseudo: "::placeholder" });
    });

    it("Textarea: at least 56 tall, text inset 4 8", async () => {
        const { container } = await renderFigma(<Textarea aria-label="Notes" />);
        expectMeasured(field(container), { height: 56, backgroundColor: "#f5f5f5" });
        expectMeasured(part(container, "textarea"), {
            paddingTop: "4px",
            paddingBottom: "4px",
            paddingLeft: "8px",
            lineHeight: "16px",
        });
    });

    describe.each(SCHEMES)("SearchInput %s", (scheme) => {
        const capture = `dt/${scheme}-search-input-assets--focus`;
        const [fieldIndex, iconIndex, inputIndex] = scheme === "light" ? [23, 25, 28] : [24, 26, 29];

        it("focus: filled, radius 5, a flush 1px ring; 24px icon slot; text from x+24", async () => {
            const figmaField = await figmaElement(capture, { index: fieldIndex });
            const figmaIcon = await figmaElement(capture, { index: iconIndex });
            const figmaInput = await figmaElement(capture, { index: inputIndex });
            const { container } = await renderFigma(<SearchInput placeholder="Search all libraries" style={{ width: 180 }} />, {
                scheme,
            });
            await drive(part(container, "input"), "focus");
            expectMeasured(
                field(container),
                figmaSpec(figmaField, ["width", "height", "backgroundColor", "borderRadius", "outline", "outlineOffset"]),
            );
            const icon = part(container, ".cm-input-section[data-position=left]");
            expectMeasured(icon, { width: figmaIcon.box[2], height: figmaIcon.box[3] });
            expect(textInset(container)).toBeCloseTo(figmaInput.box[0] - figmaField.box[0], 1);
            expectMeasured(part(container, "input"), figmaSpec(figmaInput, ["fontSize", "fontWeight", "letterSpacing"]));
        });
    });

    it.each(SCHEMES)("%s: hover paints no outline (left-sidebar/assets-search-hover #24)", async (scheme) => {
        const hovered = await figmaElement("left-sidebar/assets-search-hover", { index: 24 });
        const { container } = await renderFigma(<SearchInput style={{ width: 180 }} />, { scheme });
        await drive(field(container), "hover");
        // Figma's outline is style none; ours keeps the 1px slot, so it must be transparent.
        expect(hovered.style.outline).toContain("none");
        expectMeasured(field(container), {
            outlineColor: "#00000000",
            // The capture is the light theme.
            ...(scheme === "light" ? { backgroundColor: hovered.style.backgroundColor } : {}),
        });
    });

    it.each(SCHEMES)("%s: the clear button is transparent at rest and translucent on hover", async (scheme) => {
        const { container } = await renderFigma(<SearchInput defaultValue="abc" />, { scheme });
        const clear = part(container, "button");
        expectMeasured(clear, { backgroundColor: "#00000000" });
        await drive(clear, "hover");
        const hovered = hex(computed(clear).backgroundColor);
        expect(hovered).not.toBe("#00000000");
        // Translucent: the alpha channel is below ff.
        expect(hovered).toMatch(/^#[0-9a-f]{6}(?!ff)[0-9a-f]{2}$/);
    });

    it("the ring lingers 100ms after blur, then drops in one frame", async () => {
        const { container } = await renderFigma(<SearchInput />);
        const input = part(container, "input");
        await drive(input, "focus");
        input.blur();
        await settle();
        expectMeasured(field(container), { outlineColor: "#0d99ff" });
        await new Promise((resolve) => setTimeout(resolve, 150));
        expectMeasured(field(container), { outlineColor: "#00000000" });
    });

    it("a clear button appears with text; Escape clears, and bubbles once empty", async () => {
        const outer = vi.fn();
        const listen = (event: KeyboardEvent): void => {
            outer(event.key);
        };
        document.addEventListener("keydown", listen);
        try {
            const { container } = await renderFigma(<SearchInput defaultValue="" />);
            const input = part(container, "input");
            expect(container.querySelector("button")).toBeNull();
            await userEvent.click(input);
            await userEvent.keyboard("abc");
            const clear = part(container, "button");
            expectMeasured(clear, { width: 16, height: 16 });
            await userEvent.keyboard("{Escape}");
            expect(input).toHaveValue("");
            expect(outer).not.toHaveBeenCalledWith("Escape");
            await userEvent.keyboard("{Escape}");
            expect(outer).toHaveBeenCalledWith("Escape");
        } finally {
            document.removeEventListener("keydown", listen);
        }
    });

    it("size lg is the 32px quick-actions field with 13/24 text", async () => {
        const { container } = await renderFigma(<SearchInput size="lg" />);
        expectMeasured(field(container), { height: 32 });
        expectMeasured(part(container, "input"), { fontSize: "13px", lineHeight: "24px" });
    });

    it("joined: field 5px 0 0 5px, a 24 x 24 end 0 5px 5px 0, 1px apart", async () => {
        const { container } = await renderFigma(
            <div style={{ width: 200 }}>
                <SearchInput rightSection={<span>F</span>} />
            </div>,
        );
        expectMeasured(field(container), { borderTopRightRadius: "0px", borderTopLeftRadius: "5px" });
        const end = part(container, ".cm-search-joined-end");
        expectMeasured(end, { width: 24, height: 24, backgroundColor: "#f5f5f5", borderTopRightRadius: "5px" });
        expect(end.getBoundingClientRect().left - field(container).getBoundingClientRect().right).toBeCloseTo(1, 1);
    });
});

describe.skipIf(!available)("6.4 select trigger", () => {
    it("light: 76 wide outlined trigger, text 9 in, hover changes nothing", async () => {
        const trigger = await figmaElement("ii/select-trigger-default", { index: 27 });
        const label = await figmaElement("ii/select-trigger-default", { index: 29 });
        const { container } = await renderFigma(
            <Select aria-label="Stroke align" data={["Center", "Inside", "Outside"]} defaultValue="Inside" style={{ width: 76 }} />,
        );
        const spec = figmaSpec(trigger, [
            "width",
            "height",
            "backgroundColor",
            "borderTopWidth",
            "borderTopColor",
            "borderRadius",
        ]);
        expectMeasured(field(container), spec);
        expect(textInset(container)).toBeCloseTo(label.box[0] - trigger.box[0], 1);
        expectMeasured(part(container, "input"), figmaSpec(trigger, TYPE));
        const hover = await figmaElement("ii/select-trigger-hover", { index: 27 });
        await drive(field(container), "hover");
        expectMeasured(field(container), figmaSpec(hover, ["backgroundColor", "borderTopColor"]));
        expectMeasured(field(container), { outlineColor: "#00000000" });
    });

    it.each(SCHEMES)("%s: the 208 device trigger, a 24px caret slot, the caret in --cm-icon", async (scheme) => {
        const trigger = await figmaElement(`dt/${scheme}-select-prototype-device--default`, { index: 26 });
        // The caret's colour is its path fill (#30), not the wrapper's tertiary `color`.
        const caretPath = await figmaElement(`dt/${scheme}-select-prototype-device--default`, { index: 30 });
        const { container } = await renderFigma(
            <Select aria-label="Device" data={["No device", "iPhone 17"]} defaultValue="No device" style={{ width: 208 }} />,
            { scheme },
        );
        expectMeasured(
            field(container),
            figmaSpec(trigger, ["width", "height", "backgroundColor", "borderTopColor", "borderRadius"]),
        );
        const caretSlot = part(container, ".cm-input-section[data-position=right]");
        expectMeasured(caretSlot, { width: 24 });
        expectMeasured(part(container, ".cm-field-caret"), { width: 10, height: 10 });
        expect(hex(computed(part(container, ".cm-field-caret")).color)).toBe(hex(caretPath.style.fill));
    });

    it.each(SCHEMES)("%s: keyboard focus rings at -1px; a click does not", async (scheme) => {
        const focused = await figmaElement(`dt/${scheme}-select-prototype-device--focus`, { index: 26 });
        const { container } = await renderFigma(
            <Select aria-label="Device" data={["No device", "iPhone 17"]} defaultValue="No device" />,
            { scheme },
        );
        await drive(part(container, "input"), "focus");
        expectMeasured(field(container), figmaSpec(focused, ["outline", "outlineOffset"]));
        await resetHarness();
        // A mouse pick leaves focus in the trigger without a ring, as a clicked <button> would.
        const again = await renderFigma(
            <Select aria-label="Device" data={["No device", "iPhone 17"]} defaultValue="No device" />,
            { scheme },
        );
        await drive(part(again.container, "input"), "open");
        const dropdown = await listbox();
        await userEvent.click(part(dropdown, "[data-checked]"));
        await vi.waitFor(() => {
            expect(visibleListbox()).toBeNull();
        });
        expect(document.activeElement).toBe(part(again.container, "input"));
        expectMeasured(field(again.container), { outlineColor: "#00000000" });
    });

    it("disabled: text and caret --cm-text-disabled", async () => {
        const { container } = await renderFigma(
            <Select aria-label="Device" data={["No device"]} defaultValue="No device" disabled />,
        );
        expectMeasured(part(container, "input"), { color: "#0000004d" });
        expectMeasured(part(container, ".cm-field-caret"), { color: "#0000004d" });
    });

    it("AA option: the trigger border becomes the 3:1 field edge", async () => {
        const { container } = await renderFigma(
            <Select aria-label="Device" data={["No device"]} defaultValue="No device" />,
            { highContrast: true },
        );
        expectMeasured(field(container), { borderTopColor: "#00000073", boxShadow: "none" });
    });

    it("AA option: hovering an outlined field raises its edge, never paints a lighter outline over it", async () => {
        const { container } = await renderFigma(<TextInput variant="outlined" aria-label="Name" />, { highContrast: true });
        await drive(field(container), "hover");
        expectMeasured(field(container), { borderTopColor: "#000000a6", outlineColor: "#00000000" });
    });

    it("AA option: a disabled trigger keeps its border and paints no outline over it", async () => {
        const { container } = await renderFigma(
            <Select aria-label="Device" data={["No device"]} defaultValue="No device" disabled />,
            { highContrast: true },
        );
        expectMeasured(field(container), { borderTopColor: "#00000073", outlineColor: "#00000000" });
    });

    it("Figma look: hovering an outlined field changes nothing", async () => {
        const { container } = await renderFigma(<TextInput variant="outlined" aria-label="Name" />);
        await drive(field(container), "hover");
        expectMeasured(field(container), { borderTopColor: "#e6e6e6", outlineColor: "#00000000" });
    });

    it("NativeSelect is the same outlined trigger", async () => {
        const trigger = await figmaElement("dt/light-select-prototype-device--default", { index: 26 });
        const { container } = await renderFigma(<NativeSelect aria-label="Device" data={["No device"]} style={{ width: 208 }} />);
        expectMeasured(
            field(container),
            figmaSpec(trigger, ["width", "height", "backgroundColor", "borderTopColor", "borderRadius"]),
        );
        const select = part(container, "select");
        expect(
            select.getBoundingClientRect().left + parseFloat(computed(select).paddingLeft) - field(container).getBoundingClientRect().left,
        ).toBeCloseTo(9, 1);
    });

    it("PanelField kind=select is the outlined trigger with the caret", async () => {
        const { container } = await renderFigma(
            <PanelField label="Layout" kind="select" data={["Force", "Radial"]} value="Radial" onChange={() => undefined} />,
        );
        expectMeasured(field(container), { height: 24, backgroundColor: "#ffffff", borderTopColor: "#e6e6e6" });
        part(container, "[data-testid=panel-field-chevron] .cm-field-caret");
    });
});

describe.skipIf(!available)("6.5 dark listbox", () => {
    const DATA = ["Center", "Inside", "Outside"];

    it.each(SCHEMES)("%s: #1e1e1e surface, radius 13, elevation-400 of the page, padding 8 0", async (scheme) => {
        const surface = await figmaElement("ii/select-listbox-open", { index: 85 });
        const list = await figmaElement("ii/select-listbox-open", { index: 86 });
        const option = await figmaElement("ii/select-listbox-open", { index: 87 });
        const { container } = await renderFigma(
            <Select aria-label="Stroke align" data={DATA} defaultValue="Inside" style={{ width: 76 }} />,
            { scheme },
        );
        await drive(part(container, "input"), "open");
        const dropdown = await listbox();
        expectMeasured(dropdown, figmaSpec(surface, ["backgroundColor", "borderRadius"]));
        expectMeasured(dropdown, figmaSpec(list, ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]));
        if (scheme === "light") {
            expect(shadowSet(computed(dropdown).boxShadow)).toEqual(figmaShadow(surface));
        }
        const row = part(dropdown, ".cm-listbox-option");
        expectMeasured(row, figmaSpec(option, ["height", "paddingLeft", "paddingRight", ...TYPE]));
    });

    it("opens over the trigger: the selected option's box sits on the trigger within 1px, the list 8px before it", async () => {
        const { container } = await renderFigma(
            <div style={{ padding: "200px 100px" }}>
                <Select aria-label="Stroke align" data={DATA} defaultValue="Inside" style={{ width: 76 }} />
            </div>,
        );
        const trigger = field(container);
        await drive(part(container, "input"), "open");
        const dropdown = await listbox();
        const selected = part(dropdown, "[data-checked]");
        const t = trigger.getBoundingClientRect();
        const s = selected.getBoundingClientRect();
        const d = dropdown.getBoundingClientRect();
        expect(Math.abs(s.top - t.top)).toBeLessThanOrEqual(1);
        expect(Math.abs(s.bottom - t.bottom)).toBeLessThanOrEqual(1);
        expect(Math.abs(d.left - (t.left - 8))).toBeLessThanOrEqual(1);
        expect(d.width).toBeGreaterThanOrEqual(t.width + 16 - 0.5);
        const highlight = measure(selected, ["backgroundColor", "borderTopLeftRadius", "left", "right"], { pseudo: "::before" });
        expect(highlight.style.backgroundColor).toBe("#0c8ce9");
        expect(highlight.style.borderTopLeftRadius).toBe("5px");
        expect(highlight.style.left).toBe("8px");
        expect(highlight.style.right).toBe("8px");
        // The highlight pill's leading edge is the trigger's leading edge.
        expect(Math.abs(s.left + 8 - t.left)).toBeLessThanOrEqual(1);
    });

    it("clamps inside the viewport minus 6px", async () => {
        await page.viewport(600, 300);
        const data = Array.from({ length: 30 }, (_, i) => `Item ${String(i + 1)}`);
        const { container } = await renderFigma(
            <div style={{ position: "fixed", left: 20, bottom: 10 }}>
                <Select aria-label="Long" data={data} defaultValue="Item 3" style={{ width: 120 }} />
            </div>,
        );
        await drive(part(container, "input"), "open");
        const dropdown = await listbox();
        const d = dropdown.getBoundingClientRect();
        expect(d.top).toBeGreaterThanOrEqual(6 - 0.5);
        expect(d.bottom).toBeLessThanOrEqual(window.innerHeight - 6 + 0.5);
        expect(d.left).toBeGreaterThanOrEqual(6 - 0.5);
    });

    it("hovering another option moves the only fill to it", async () => {
        const hovered = await figmaElement("ii/select-listbox-option-hover", { index: 87 });
        const { container } = await renderFigma(
            <Select aria-label="Stroke align" data={DATA} defaultValue="Inside" style={{ width: 76 }} />,
        );
        await drive(part(container, "input"), "open");
        const dropdown = await listbox();
        const [center, inside] = [...dropdown.querySelectorAll<HTMLElement>(".cm-listbox-option")];
        await userEvent.hover(center);
        expectMeasured(center, { backgroundColor: "#0c8ce9" }, { pseudo: "::before" });
        expectMeasured(inside, { backgroundColor: "#00000000" }, { pseudo: "::before" });
        expectMeasured(center, figmaSpec(hovered, ["color"]));
        // The check stays with the value.
        expectMeasured(part(inside, ".cm-menu-row-check"), { opacity: "1" });
        expectMeasured(part(center, ".cm-menu-row-check"), { opacity: "0" });
    });

    it("keyboard: Enter opens on the selected option, arrows move, Enter commits, Escape closes in place", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(
            <Select aria-label="Stroke align" data={DATA} defaultValue="Inside" onChange={onChange} />,
        );
        const input = part(container, "input");
        await drive(input, "focus");
        await userEvent.keyboard("{Enter}");
        const dropdown = await listbox();
        // The only filled row is the selected one.
        const filled = [...dropdown.querySelectorAll(".cm-listbox-option")].filter(
            (row) => hex(computed(row, "::before").backgroundColor) === "#0c8ce9",
        );
        expect(filled.map((row) => row.textContent)).toEqual(["Inside"]);
        await userEvent.keyboard("{ArrowDown}{Enter}");
        expect(onChange).toHaveBeenCalledWith("Outside", expect.anything());
        await userEvent.keyboard("{Enter}");
        await listbox();
        await userEvent.keyboard("{Escape}");
        await vi.waitFor(() => {
            expect(visibleListbox()).toBeNull();
        });
        expect(document.activeElement).toBe(input);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("an APG combobox: role, aria-expanded and aria-activedescendant follow the list", async () => {
        const { container } = await renderFigma(<Select aria-label="Stroke align" data={DATA} defaultValue="Inside" />);
        const input = part(container, "input");
        expect(input.getAttribute("role")).toBe("combobox");
        expect(input.getAttribute("aria-expanded")).toBe("false");
        await drive(input, "focus");
        await userEvent.keyboard("{Enter}");
        await listbox();
        expect(input.getAttribute("aria-expanded")).toBe("true");
        await userEvent.keyboard("{ArrowDown}");
        const active = document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
        expect(active?.textContent).toBe("Outside");
    });

    it.each(["enter", "space", "click"] as const)(
        "opening (%s) makes the checked option the aria-activedescendant",
        async (how) => {
            const { container } = await renderFigma(<Select aria-label="Stroke align" data={DATA} defaultValue="Outside" />);
            const input = part(container, "input");
            if (how === "click") {
                await userEvent.click(input);
            } else {
                await drive(input, "focus");
                await userEvent.keyboard(how === "enter" ? "{Enter}" : " ");
            }
            const dropdown = await listbox();
            await vi.waitFor(() => {
                expect(document.getElementById(input.getAttribute("aria-activedescendant") ?? "")?.textContent).toBe(
                    "Outside",
                );
            });
            expect(dropdown.querySelector("[data-combobox-selected]")?.textContent).toBe("Outside");
            // The walk's synthetic presses are not the user's: a click open stays pointer modality.
            if (how === "click") {
                expect(document.documentElement.getAttribute("data-cm-modality")).toBe("pointer");
            }
            await userEvent.keyboard("{ArrowUp}");
            expect(document.getElementById(input.getAttribute("aria-activedescendant") ?? "")?.textContent).toBe(
                "Inside",
            );
        },
    );

    it("Home and End highlight the first and last option; Enter commits", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(
            <Select aria-label="Stroke align" data={DATA} defaultValue="Inside" onChange={onChange} />,
        );
        const input = part(container, "input");
        await drive(input, "focus");
        await userEvent.keyboard("{Enter}");
        const dropdown = await listbox();
        const active = (): string | undefined =>
            document.getElementById(input.getAttribute("aria-activedescendant") ?? "")?.textContent ?? undefined;
        await userEvent.keyboard("{End}");
        expect(active()).toBe(DATA[DATA.length - 1]);
        expect(dropdown.querySelector("[data-combobox-selected]")?.textContent).toBe(DATA[DATA.length - 1]);
        await userEvent.keyboard("{Home}");
        expect(active()).toBe(DATA[0]);
        await userEvent.keyboard("{Enter}");
        expect(onChange).toHaveBeenCalledWith(DATA[0], expect.anything());
    });

    it("letters type ahead in the open list; a repeated letter cycles", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(
            <Select
                aria-label="Align"
                data={["Center", "Inside", "Outside", "Overlap"]}
                defaultValue="Outside"
                onChange={onChange}
            />,
        );
        const input = part(container, "input");
        await drive(input, "focus");
        await userEvent.keyboard("{Enter}");
        const dropdown = await listbox();
        const highlighted = (): string | null | undefined =>
            dropdown.querySelector("[data-combobox-selected]")?.textContent;
        await userEvent.keyboard("c");
        expect(highlighted()).toBe("Center");
        expect(document.getElementById(input.getAttribute("aria-activedescendant") ?? "")?.textContent).toBe("Center");
        await new Promise((resolve) => setTimeout(resolve, 600));
        await userEvent.keyboard("o");
        expect(highlighted()).toBe("Outside");
        await userEvent.keyboard("o");
        expect(highlighted()).toBe("Overlap");
        await userEvent.keyboard("{Enter}");
        expect(onChange).toHaveBeenCalledWith("Overlap", expect.anything());
    });

    it("a long list scrolls itself and shows the 24px chevron rows; hovering one scrolls", async () => {
        await page.viewport(900, 300);
        const many = Array.from({ length: 40 }, (_, i) => `Option ${String(i + 1)}`);
        const { container } = await renderFigma(<Select aria-label="Many" data={many} />);
        await drive(part(container, "input"), "open");
        const dropdown = await listbox();
        expect(dropdown.getBoundingClientRect().bottom).toBeLessThanOrEqual(300 - 6 + 0.5);
        expect(dropdown.scrollHeight).toBeGreaterThan(dropdown.clientHeight);
        expect(dropdown.hasAttribute("data-cm-scroll-down")).toBe(true);
        expect(dropdown.hasAttribute("data-cm-scroll-up")).toBe(false);
        expectMeasured(dropdown, { backgroundColor: "#1e1e1e" }, { pseudo: "::after" });
        expect(computed(dropdown, "::after").height).toBe("24px");
        const box = dropdown.getBoundingClientRect();
        await userEvent.hover(dropdown, { position: { x: box.width / 2, y: box.height - 8 } });
        await vi.waitFor(() => {
            expect(dropdown.scrollTop).toBeGreaterThan(0);
        });
        await vi.waitFor(() => {
            expect(dropdown.hasAttribute("data-cm-scroll-up")).toBe(true);
        });
        expect(computed(dropdown).scrollbarWidth).toBe("none");
    });

    it("group labels, disabled options and the empty message", async () => {
        const { container } = await renderFigma(
            <Select
                aria-label="Grouped"
                data={[
                    { group: "Shapes", items: ["Rectangle", { value: "Ellipse", label: "Ellipse", disabled: true }] },
                    { group: "Text", items: ["Heading"] },
                ]}
            />,
        );
        await drive(part(container, "input"), "open");
        const dropdown = await listbox();
        expectMeasured(part(dropdown, ".cm-listbox-group-label"), { height: 24, color: "#ffffffb2" });
        expectMeasured(part(dropdown, "[data-combobox-disabled]"), { color: "#ffffff66", opacity: "1" });
        const groups = dropdown.querySelectorAll<HTMLElement>(".cm-listbox-group");
        expectMeasured(groups[1], { borderTopWidth: "1px", borderTopColor: "#ffffff1a", paddingTop: "8px", marginTop: "8px" });
    });

    it("MultiSelect: filled field, 20px variable-pill pills, list below", async () => {
        const { container } = await renderFigma(
            <MultiSelect aria-label="Tags" data={["Alpha", "Beta"]} defaultValue={["Alpha"]} style={{ width: 160 }} />,
        );
        expectMeasured(field(container), { height: 24, backgroundColor: "#f5f5f5" });
        expectMeasured(part(container, ".cm-input-pill"), {
            height: 20,
            backgroundColor: "#ffffff",
            borderTopColor: "#e6e6e6",
            borderTopLeftRadius: "5px",
            paddingLeft: "4px",
            fontSize: "11px",
        });
        await drive(part(container, ".cm-input"), "open");
        const dropdown = await listbox();
        expect(dropdown.getBoundingClientRect().top - field(container).getBoundingClientRect().bottom).toBeCloseTo(4, 0);
    });
});

describe.skipIf(!available)("6.3 combo input", () => {
    const SIZES = ["10", "11", "12", "13", "14", "16", "20", "24", "32"].map((value) => ({ value }));

    describe.each(SCHEMES)("%s", (scheme) => {
        it("rest: 88 x 24 filled, text 7 in, 24px caret slot, the caret in --cm-icon", async () => {
            const figmaField = await figmaElement(`dt/${scheme}-combo-font-size--default`, { index: 37 });
            const figmaCaret = await figmaElement(`dt/${scheme}-combo-font-size--default`, { index: 40 });
            const figmaCaretPath = await figmaElement(`dt/${scheme}-combo-font-size--default`, { index: 41 });
            const figmaInput = await figmaElement(`dt/${scheme}-combo-font-size--default`, { index: 45 });
            const { container } = await renderFigma(<ComboInput label="Font size" numeric defaultValue={24} options={SIZES} />, {
                scheme,
            });
            expectMeasured(field(container), figmaSpec(figmaField, ["width", "height", "backgroundColor", "borderRadius"]));
            expect(textInset(container)).toBeCloseTo(7, 1);
            expectMeasured(part(container, "input"), figmaSpec(figmaInput, [...TYPE, "paddingRight"]));
            expectMeasured(part(container, ".cm-combo-chevron"), { width: figmaCaret.box[2] });
            expect(hex(computed(part(container, ".cm-field-caret")).color)).toBe(hex(figmaCaretPath.style.fill));
        });

        it("hover: a 1px --cm-border edge", async () => {
            const figmaEdge = await figmaElement(`dt/${scheme}-combo-font-size--hover`, { index: 42 });
            const { container } = await renderFigma(<ComboInput label="Font size" numeric defaultValue={24} options={SIZES} />, {
                scheme,
            });
            await drive(field(container), "hover");
            expect(hex(computed(field(container)).outlineColor)).toBe(hex(figmaEdge.style.borderTopColor));
        });
    });

    it("the chevron opens the list with the current value exactly on the field", async () => {
        const { container } = await renderFigma(
            <div style={{ padding: "300px 100px" }}>
                <ComboInput label="Font size" numeric defaultValue={24} options={SIZES} />
            </div>,
        );
        await userEvent.click(part(container, ".cm-combo-chevron"));
        const dropdown = await listbox();
        const selected = part(dropdown, "[data-checked]");
        expect(selected.textContent).toBe("24");
        expect(Math.abs(selected.getBoundingClientRect().top - field(container).getBoundingClientRect().top)).toBeLessThanOrEqual(1);
        expect(document.activeElement).toBe(part(container, "input"));
    });

    it("Control+ArrowDown opens, arrows move, Enter applies; Escape closes without a change", async () => {
        const onChange = vi.fn();
        const { container } = await renderFigma(
            <ComboInput label="Font size" numeric defaultValue={24} options={SIZES} onChange={onChange} />,
        );
        const input = part(container, "input");
        await drive(input, "focus");
        await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
        const dropdown = await listbox();
        await vi.waitFor(() => {
            expect(dropdown.querySelector("[data-combobox-selected]")?.textContent).toBe("24");
        });
        expect(input.getAttribute("aria-expanded")).toBe("true");
        await userEvent.keyboard("{ArrowDown}{Enter}");
        expect(onChange).toHaveBeenLastCalledWith(32, undefined);
        await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
        await listbox();
        await userEvent.keyboard("{ArrowUp}{Escape}");
        await vi.waitFor(() => {
            expect(visibleListbox()).toBeNull();
        });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(input);
    });

    it("typing still edits the value; closed, the arrows step it", async () => {
        const Controlled = (): React.JSX.Element => {
            const [size, setSize] = useState<string | number>(24);
            return <ComboInput label="Font size" numeric value={size} onChange={setSize} options={SIZES} />;
        };
        const { container } = await renderFigma(<Controlled />);
        const input = part(container, "input");
        await userEvent.click(input);
        await userEvent.keyboard("{Control>}a{/Control}12*2{Enter}");
        expect(input).toHaveValue("24");
        await userEvent.keyboard("{ArrowUp}");
        expect(input).toHaveValue("25");
    });

    it("suffix and the divided chevron", async () => {
        const { container } = await renderFigma(
            <ComboInput label="Width" defaultValue="Hug" suffix="Hug" divided options={[{ value: "Hug" }]} />,
        );
        expectMeasured(part(container, ".cm-combo-suffix"), { color: "#00000080", fontSize: "11px" });
        expectMeasured(part(container, ".cm-combo-chevron"), {
            width: 25,
            borderLeftWidth: "1px",
            borderLeftColor: "#ffffff",
        });
    });
});

describe.skipIf(!available)("6.6 variable pill", () => {
    it("bound number field: a 20px pill at x+24; hover fills it and shows the 16px Detach at the end", async () => {
        const pill = await figmaElement("rs/apply-variable-radius-bound", { index: 68 });
        const pillHover = await figmaElement("rs/apply-variable-radius-bound-hover", { index: 68 });
        const detach = await figmaElement("rs/apply-variable-radius-bound-hover", { index: 75 });
        const fieldBox = await figmaElement("rs/apply-variable-radius-bound", { index: 57 });
        const { container } = await renderFigma(
            <VariablePill glyph="R" name="rsu/radius-sm" value="4" onDetach={() => undefined} onClick={() => undefined} />,
        );
        const root = part(container, ".cm-var-field");
        const p = part(container, ".cm-var-pill");
        expectMeasured(
            p,
            figmaSpec(pill, ["height", "backgroundColor", "borderTopColor", "borderTopWidth", "borderRadius", "paddingLeft", "cursor"]),
        );
        expect(p.getBoundingClientRect().left - root.getBoundingClientRect().left).toBeCloseTo(pill.box[0] - fieldBox.box[0], 0);
        expect(p.getBoundingClientRect().top - root.getBoundingClientRect().top).toBeCloseTo(pill.box[1] - fieldBox.box[1], 0);
        expectMeasured(part(container, ".cm-var-detach"), { opacity: "0" });
        await drive(p, "hover");
        expectMeasured(p, figmaSpec(pillHover, ["backgroundColor"]));
        const d = part(container, ".cm-var-detach");
        expectMeasured(d, { width: detach.box[2], height: detach.box[3], opacity: "1" });
        expect(root.getBoundingClientRect().right - d.getBoundingClientRect().right).toBeCloseTo(
            fieldBox.box[0] + fieldBox.box[2] - (detach.box[0] + detach.box[2]),
            0,
        );
    });

    it("bound fill row: 156 x 24, 1px --cm-border outline, 14px chit at 5,5, name at x+24; hover adds Detach", async () => {
        const row = await figmaElement("rs/fill-variable-bound", { index: 53 });
        const chit = await figmaElement("rs/fill-variable-bound", { index: 55 });
        const name = await figmaElement("rs/fill-variable-bound", { index: 58 });
        const rowHover = await figmaElement("rs/fill-variable-bound-hover", { index: 53 });
        const detach = await figmaElement("rs/fill-variable-bound-hover", { index: 61 });
        const { container } = await renderFigma(
            <VariablePill swatch="#0d99ff" name="rsu/brand" onDetach={() => undefined} onClick={() => undefined} />,
        );
        const button = part(container, ".cm-var-fill-button");
        expectMeasured(button, figmaSpec(row, ["width", "height", "outline", "outlineOffset", "borderRadius"]));
        expectMeasured(part(container, ".cm-var-detach"), { width: 0, opacity: "0" });
        const c = part(container, ".cm-var-chit");
        expectMeasured(c, figmaSpec(chit, ["width", "height", "borderRadius"]));
        expect(c.getBoundingClientRect().left - button.getBoundingClientRect().left).toBeCloseTo(chit.box[0] - row.box[0], 0);
        expect(part(container, ".cm-var-name").getBoundingClientRect().left - button.getBoundingClientRect().left).toBeCloseTo(
            name.box[0] - row.box[0],
            0,
        );
        await drive(button, "hover");
        expectMeasured(button, figmaSpec(rowHover, ["width", "backgroundColor"]));
        const d = part(container, ".cm-var-detach");
        expectMeasured(d, { width: detach.box[2], height: detach.box[3] });
        expect(d.getBoundingClientRect().left - button.getBoundingClientRect().left).toBeCloseTo(detach.box[0] - rowHover.box[0], 0);
    });

    it("bound number field: the rest of the field is an input flush after the pill (#73)", async () => {
        const figmaInput = await figmaElement("rs/apply-variable-radius-bound", { index: 73 });
        const figmaPill = await figmaElement("rs/apply-variable-radius-bound", { index: 68 });
        const onValueCommit = vi.fn();
        const { container } = await renderFigma(
            <VariablePill glyph="R" name="rsu/radius-sm" value="4" onDetach={() => undefined} onValueCommit={onValueCommit} />,
        );
        const input = part(container, ".cm-var-input");
        const pill = part(container, ".cm-var-pill");
        expectMeasured(input, figmaSpec(figmaInput, ["height", "backgroundColor", "fontSize", "paddingLeft"]));
        expect(input.getBoundingClientRect().left - pill.getBoundingClientRect().right).toBeCloseTo(
            figmaInput.box[0] - (figmaPill.box[0] + figmaPill.box[2]),
            0,
        );
        await userEvent.click(input);
        expectMeasured(part(container, ".cm-var-field"), { outlineColor: "#0d99ff" });
        await userEvent.keyboard("8{Enter}");
        expect(onValueCommit).toHaveBeenCalledWith("8", expect.anything());
    });

    it("Detach is reachable from the keyboard, and shows when it has focus", async () => {
        const { container } = await renderFigma(
            <VariablePill swatch="#0d99ff" name="rsu/brand" onDetach={() => undefined} onClick={() => undefined} />,
        );
        const d = part(container, ".cm-var-detach");
        await drive(d, "focus");
        expectMeasured(d, { width: 24, opacity: "1", outlineColor: "#0d99ff" });
    });

    it("component-property chip on the component tint", async () => {
        const { container } = await renderFigma(<VariablePill kind="property" name="Label" />);
        expectMeasured(part(container, ".cm-var-fill-button"), { width: 156, height: 24, backgroundColor: "#f1e5ff" });
    });
});

describe.skipIf(!available)("6.7 other inputs", () => {
    it("PasswordInput: filled field, 24px visibility toggle in the trailing slot", async () => {
        const { PasswordInput } = await import("@mantine/core");
        const { container } = await renderFigma(<PasswordInput aria-label="Secret" defaultValue="abc" />);
        expectMeasured(field(container), { height: 24, backgroundColor: "#f5f5f5" });
        expectMeasured(part(container, "button"), { width: 24, height: 24 });
    });

    it("ColorInput: filled field, 14px chit at x+5, text at x+24", async () => {
        const { ColorInput } = await import("@mantine/core");
        const { container } = await renderFigma(<ColorInput aria-label="Fill" defaultValue="#1a1a1a" />);
        expectMeasured(field(container), { height: 24, backgroundColor: "#f5f5f5" });
        const chit = part(container, ".cm-color-field-chit");
        expectMeasured(chit, { width: 14, height: 14, borderTopLeftRadius: "2px" });
        expect(chit.getBoundingClientRect().left - field(container).getBoundingClientRect().left).toBeCloseTo(5, 0);
        expect(textInset(container)).toBeCloseTo(24, 1);
    });

    it("no field animates (no transition on the field or its input)", async () => {
        const { container } = await renderFigma(<TextInput aria-label="Name" />);
        expect(computed(part(container, "input")).transitionDuration).toBe("0s");
    });
});

describe.skipIf(!available)("a field stays a field inside a second provider", () => {
    it("renders the same with a theme created separately", () => {
        const { container } = render(
            <MantineProvider theme={createCompactTheme()} forceColorScheme="light">
                <TextInput aria-label="Name" />
            </MantineProvider>,
        );
        expectMeasured(field(container), { backgroundColor: "#f5f5f5" });
    });
});
