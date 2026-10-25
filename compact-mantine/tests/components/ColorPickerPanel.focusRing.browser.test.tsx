/**
 * The pop-out color picker's value field (hex box and opacity box joined) is ringed as one control
 * when it takes focus: the ring is drawn all the way round, over the opacity part as well as the
 * hex part. Read from the pixels the browser paints, after opening the picker by click and by key.
 * The picker opens on itself, as Figma's does, so the reader then moves into the value field.
 */
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { CompactColorInput, compactTheme, PopoutManager } from "../../src";

/** Render a color field with opacity. */
function renderField(): void {
    render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>
                <CompactColorInput label="Fill" color="#6366F1" defaultColor="#6366F1" opacity={80} />
            </PopoutManager>
        </MantineProvider>,
    );
}

/**
 * Parse a computed `rgb(r, g, b)` color.
 * @param css - the computed color
 * @returns its channels
 */
function channels(css: string): number[] {
    return (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
}

/**
 * How much of the ring's color a pixel holds, against the field's own fill: 0 is the fill, 1 the
 * ring. The test page is drawn scaled, so a 1px ring arrives blended into its neighbors.
 * @param pixel - the pixel's channels
 * @param fill - the fill's channels
 * @param ring - the ring's channels
 * @returns the share of the ring's color
 */
function ringShare(pixel: number[], fill: number[], ring: number[]): number {
    const towards = ring.map((c, k) => c - (fill[k] ?? 0));
    const moved = pixel.map((c, k) => c - (fill[k] ?? 0));
    const length = towards.reduce((sum, d) => sum + d * d, 0);
    return moved.reduce((sum, d, k) => sum + d * (towards[k] ?? 0), 0) / length;
}

/**
 * Which parts of the focused value field the browser drew the ring over: the top and bottom edges
 * above the hex box and above the opacity box, and the opacity box's far end.
 * @returns a map of edge name to whether the ring is painted there
 */
async function ringedEdges(): Promise<Record<string, boolean>> {
    const field = document.querySelector<HTMLElement>(".cm-joined-field");
    const hex = page.getByTestId("color-picker-value").element();
    const opacity = page.getByTestId("color-picker-opacity").element().closest(".cm-paint-opacity");
    if (field === null || opacity === null) {
        throw new Error("the picker's value field is not drawn");
    }
    const ring = channels(getComputedStyle(field).outlineColor);
    const base64 = await page.screenshot({ element: field, base64: true, save: false });
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("no 2d canvas");
    }
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    const box = field.getBoundingClientRect();
    const scale = width / box.width;
    const pixel = (x: number, y: number): number[] => {
        const i = (Math.round(y) * width + Math.round(x)) * 4;
        return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
    };
    const middleOf = (el: Element): number => {
        const r = el.getBoundingClientRect();
        return (r.left + r.width / 2 - box.left) * scale;
    };
    /**
     * Whether the ring is painted at a point on the field's edge: in its first two pixel rows (or
     * columns) inward, against the fill three CSS pixels in, between the ring and the text.
     * @param x - column on the edge
     * @param y - row on the edge
     * @param dx - inward step across columns
     * @param dy - inward step across rows
     * @returns true when one of them is mostly the ring's color
     */
    const ringed = (x: number, y: number, dx: number, dy: number): boolean => {
        const fill = pixel(x + dx * 3 * scale, y + dy * 3 * scale);
        return [0, 1].some((step) => ringShare(pixel(x + dx * step, y + dy * step), fill, ring) >= 0.5);
    };
    const hexX = middleOf(hex);
    const opacityX = middleOf(opacity);
    return {
        hexTop: ringed(hexX, 0, 0, 1),
        hexBottom: ringed(hexX, height - 1, 0, -1),
        opacityTop: ringed(opacityX, 0, 0, 1),
        opacityBottom: ringed(opacityX, height - 1, 0, -1),
        opacityEnd: ringed(width - 1, height / 2, -1, 0),
    };
}

const ALL_RINGED = {
    hexTop: true,
    hexBottom: true,
    opacityTop: true,
    opacityBottom: true,
    opacityEnd: true,
};

describe("ColorPickerPanel value field focus ring", () => {
    it("rings the hex and the opacity parts together when the pop-out is opened by a click", async () => {
        renderField();
        await userEvent.click(page.getByRole("button", { name: "Pick fill color" }));
        await userEvent.click(page.getByRole("textbox", { name: "Color value" }));
        await expect.element(page.getByRole("textbox", { name: "Color value" })).toHaveFocus();

        expect(await ringedEdges()).toEqual(ALL_RINGED);
    });

    it("rings the hex and the opacity parts together when the pop-out is opened from the keyboard", async () => {
        renderField();
        const chit = page.getByRole("button", { name: "Pick fill color" }).element();
        for (let step = 0; step < 10 && document.activeElement !== chit; step += 1) {
            await userEvent.tab();
        }
        expect(document.activeElement).toBe(chit);
        await userEvent.keyboard("{Enter}");
        await expect.element(page.getByTestId("popout-panel")).toBeInTheDocument();
        const value = page.getByRole("textbox", { name: "Color value" }).element();
        for (let step = 0; step < 20 && document.activeElement !== value; step += 1) {
            await userEvent.tab();
        }
        expect(document.activeElement).toBe(value);

        expect(await ringedEdges()).toEqual(ALL_RINGED);
    });

    it("keeps the ring round the whole field when focus moves to the opacity box", async () => {
        renderField();
        await userEvent.click(page.getByRole("button", { name: "Pick fill color" }));
        await userEvent.click(page.getByRole("textbox", { name: "Color value" }));
        await expect.element(page.getByRole("textbox", { name: "Color value" })).toHaveFocus();
        await userEvent.tab();
        await expect.element(page.getByTestId("color-picker-opacity")).toHaveFocus();

        expect(await ringedEdges()).toEqual(ALL_RINGED);
    });
});
