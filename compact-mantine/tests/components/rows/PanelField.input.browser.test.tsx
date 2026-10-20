/**
 * Scrubbing a field with the real mouse: the press, each move and the release are made by the
 * browser (tests/harness/mouse.ts), so pointer capture and the coordinates are the browser's own.
 */
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

import { compactTheme } from "../../../src";
import { PanelField } from "../../../src/components/rows/PanelField";
import { moveBy, press, release } from "../../harness/mouse";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderField(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render with the text direction reversed, the way a right-to-left app consumes
 * the package.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRtl(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </DirectionProvider>,
    );
}

/**
 * The field's own input element.
 * @returns The input the field renders
 */
function fieldInput(): HTMLInputElement {
    return screen.getByTestId("panel-field").querySelector("input") as HTMLInputElement;
}

/**
 * Make the coarse-pointer query match, as on a touch screen. Chromium's touch emulation would do
 * it too, but switching it off leaves (hover: none) matching for every later test file.
 */
function coarsePointer(): void {
    const real = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
        const list = real(query);
        if (query !== "(pointer: coarse)") {
            return list;
        }
        // The real list's listeners, with the answer a touch screen gives.
        return Object.create(list, { matches: { value: true } }) as MediaQueryList;
    });
}

// A test frame small enough not to be scaled into the runner's window, so a move of 12 pixels
// arrives as exactly 12.
beforeAll(async () => {
    await page.viewport(400, 400);
});

afterEach(async () => {
    await release();
    vi.restoreAllMocks();
});

describe("PanelField scrubbing with the real mouse", () => {
    it("sends a positive delta as the pointer moves along the text direction", async () => {
        const onScrub = vi.fn();
        renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        await moveBy(12);

        expect(onScrub).toHaveBeenCalledWith(12, expect.anything());
    });

    it("sends a negative delta as the pointer moves against it", async () => {
        const onScrub = vi.fn();
        renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        await moveBy(-8);

        expect(onScrub).toHaveBeenCalledWith(-8, expect.anything());
    });

    it("follows the text direction rather than the screen when text runs right to left", async () => {
        const onScrub = vi.fn();
        renderRtl(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        await moveBy(12);

        expect(onScrub).toHaveBeenCalledWith(-12, expect.anything());
    });

    it("opens and closes the gesture exactly once around a drag", async () => {
        const onScrubStart = vi.fn();
        const onScrub = vi.fn();
        const onScrubEnd = vi.fn();
        renderField(
            <PanelField
                label="Smallest"
                glyph="sizeSmallest"
                value="1.0"
                onScrubStart={onScrubStart}
                onScrub={onScrub}
                onScrubEnd={onScrubEnd}
            />,
        );

        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        await moveBy(10);
        await moveBy(10);
        await release();

        expect(onScrubStart).toHaveBeenCalledTimes(1);
        expect(onScrub).toHaveBeenCalledTimes(2);
        expect(onScrubEnd).toHaveBeenCalledTimes(1);
    });

    it("does not open a gesture for a press that never moves", async () => {
        const onScrubStart = vi.fn();
        const onScrubEnd = vi.fn();
        renderField(
            <PanelField
                label="Smallest"
                glyph="sizeSmallest"
                value="1.0"
                onScrubStart={onScrubStart}
                onScrubEnd={onScrubEnd}
            />,
        );

        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        await release();

        expect(onScrubStart).not.toHaveBeenCalled();
        expect(onScrubEnd).not.toHaveBeenCalled();
    });

    it("stops reporting once the pointer is released", async () => {
        const onScrub = vi.fn();
        renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        await release();
        await moveBy(40);

        expect(onScrub).not.toHaveBeenCalled();
    });

    it("does not report a move of zero", async () => {
        const onScrub = vi.fn();
        renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        await moveBy(0);

        expect(onScrub).not.toHaveBeenCalled();
    });

    it("releases the drag when the field unmounts mid-scrub", async () => {
        const onScrub = vi.fn();
        const { unmount } = renderField(
            <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />,
        );

        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        unmount();
        await moveBy(40);

        expect(onScrub).not.toHaveBeenCalled();
    });

    it("does not scrub on a coarse pointer", async () => {
        coarsePointer();
        const onScrub = vi.fn();
        renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

        const slot = screen.getByTestId("panel-field-slot");
        expect(slot).not.toHaveAttribute("data-scrub");

        await press(slot);
        await moveBy(40);

        expect(onScrub).not.toHaveBeenCalled();
    });

    it("scrubs its own value at half a unit per pixel and commits once on release", async () => {
        const onChange = vi.fn();
        const onScrubStart = vi.fn();
        const onScrubEnd = vi.fn();
        renderField(
            <PanelField
                label="X"
                kind="number"
                defaultValue={40}
                onChange={onChange}
                onScrubStart={onScrubStart}
                onScrubEnd={onScrubEnd}
            />,
        );
        const slot = screen.getByTestId("panel-field-slot");
        expect(slot).toHaveAttribute("data-scrub", "true");
        await press(slot);
        await moveBy(6);
        await moveBy(14);
        expect(fieldInput()).toHaveValue("50");
        expect(document.body.style.cursor).toBe("ew-resize");
        expect(onChange).not.toHaveBeenCalled();
        await release();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toBe(50);
        expect(onScrubStart).toHaveBeenCalledTimes(1);
        expect(onScrubEnd).toHaveBeenCalledTimes(1);
        expect(document.body.style.cursor).toBe("");
    });

    it("leaves the value to a caller who handles onScrub", async () => {
        const onChange = vi.fn();
        const onScrub = vi.fn();
        renderField(<PanelField label="X" kind="number" defaultValue={40} onChange={onChange} onScrub={onScrub} />);
        const slot = screen.getByTestId("panel-field-slot");
        await press(slot);
        await moveBy(20);
        await release();
        expect(onScrub).toHaveBeenCalledWith(20, expect.anything());
        expect(onChange).not.toHaveBeenCalled();
    });
});
