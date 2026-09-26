import { DirectionProvider, MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { ResizeHandle, type ResizeHandleProps } from "../../../src/components/chrome/ResizeHandle";

/**
 * Render a handle in the compact theme.
 * @param props - The handle's props
 * @param rtl - Render right to left
 * @returns The handle element
 */
function renderHandle(props: Partial<ResizeHandleProps> = {}, rtl = false): HTMLElement {
    render(
        <DirectionProvider initialDirection={rtl ? "rtl" : "ltr"} detectDirection={false}>
            <MantineProvider theme={compactTheme}>
                <ResizeHandle min={240} max={500} {...props} />
            </MantineProvider>
        </DirectionProvider>,
    );
    return screen.getByRole("separator");
}

// jsdom has no pointer capture.
Object.assign(HTMLElement.prototype, {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
});

describe("ResizeHandle", () => {
    describe("the window splitter pattern", () => {
        it("is a focusable, named separator carrying its value", () => {
            const handle = renderHandle({ defaultValue: 300 });
            expect(handle).toHaveAttribute("tabindex", "0");
            expect(handle).toHaveAccessibleName("Resize panel");
            expect(handle).toHaveAttribute("aria-orientation", "vertical");
            expect(handle).toHaveAttribute("aria-valuenow", "300");
            expect(handle).toHaveAttribute("aria-valuemin", "240");
            expect(handle).toHaveAttribute("aria-valuemax", "500");
            expect(handle).toHaveAttribute("aria-valuetext", "300 pixels");
        });

        it("reads the ends of the range the way Figma does", () => {
            expect(renderHandle()).toHaveAttribute("aria-valuetext", "240 pixels (min)");
        });

        it("takes its name and its reading from props, for translation", () => {
            const handle = renderHandle({
                label: "Largeur du panneau",
                valueText: (v) => `${String(v)} pixels de large`,
            });
            expect(handle).toHaveAccessibleName("Largeur du panneau");
            expect(handle).toHaveAttribute("aria-valuetext", "240 pixels de large");
        });

        it("is a horizontal separator on a split", () => {
            expect(renderHandle({ edge: "bottom" })).toHaveAttribute("aria-orientation", "horizontal");
        });
    });

    describe("the keyboard", () => {
        it("grows a leading panel with ArrowRight and shrinks it with ArrowLeft, 1px a press", async () => {
            const onChange = vi.fn();
            const onChangeEnd = vi.fn();
            const handle = renderHandle({ defaultValue: 300, onChange, onChangeEnd });
            handle.focus();
            await userEvent.keyboard("{ArrowRight}");
            expect(handle).toHaveAttribute("aria-valuenow", "301");
            await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
            expect(handle).toHaveAttribute("aria-valuenow", "299");
            expect(onChange).toHaveBeenLastCalledWith(299);
            expect(onChangeEnd).toHaveBeenLastCalledWith(299);
        });

        it("moves 10px with Shift", async () => {
            const handle = renderHandle({ defaultValue: 300 });
            handle.focus();
            await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
            expect(handle).toHaveAttribute("aria-valuenow", "310");
        });

        it("jumps to the ends with Home and End, and never past them", async () => {
            const handle = renderHandle({ defaultValue: 300 });
            handle.focus();
            await userEvent.keyboard("{End}{ArrowRight}");
            expect(handle).toHaveAttribute("aria-valuetext", "500 pixels (max)");
            await userEvent.keyboard("{Home}{ArrowLeft}");
            expect(handle).toHaveAttribute("aria-valuenow", "240");
        });

        it("follows the edge: a trailing-side panel grows with ArrowLeft", async () => {
            const handle = renderHandle({ edge: "start", defaultValue: 300 });
            handle.focus();
            await userEvent.keyboard("{ArrowLeft}");
            expect(handle).toHaveAttribute("aria-valuenow", "301");
        });

        it("mirrors under right-to-left text: a leading panel grows with ArrowLeft", async () => {
            const handle = renderHandle({ edge: "end", defaultValue: 300 }, true);
            handle.focus();
            await userEvent.keyboard("{ArrowLeft}");
            expect(handle).toHaveAttribute("aria-valuenow", "301");
        });

        it("uses the vertical arrows on a split", async () => {
            const handle = renderHandle({ edge: "bottom", min: 48, max: 400, defaultValue: 100 });
            handle.focus();
            await userEvent.keyboard("{ArrowDown}");
            expect(handle).toHaveAttribute("aria-valuenow", "101");
            await userEvent.keyboard("{ArrowRight}");
            expect(handle).toHaveAttribute("aria-valuenow", "101");
        });
    });

    describe("the pointer", () => {
        // The drag itself is measured with a real pointer in tests/figma/chrome.browser.test.tsx:
        // jsdom's pointer events carry no coordinates.
        it("ignores a move with no press", () => {
            const onChange = vi.fn();
            const handle = renderHandle({ defaultValue: 300, onChange });
            fireEvent.pointerMove(handle, { clientX: 140, pointerId: 1 });
            expect(onChange).not.toHaveBeenCalled();
        });

        it("resets to its default size on a double-click", () => {
            const onChangeEnd = vi.fn();
            const handle = renderHandle({ value: 420, defaultValue: 240, onChangeEnd });
            fireEvent.doubleClick(handle);
            expect(onChangeEnd).toHaveBeenCalledWith(240);
        });
    });

    describe("the cursor", () => {
        it("says which ways the edge can still move", () => {
            expect(renderHandle({ value: 240 }).style.cursor).toBe("e-resize");
        });

        it("is ew-resize between the ends and w-resize at the maximum", () => {
            const { rerender } = render(
                <MantineProvider theme={compactTheme}>
                    <ResizeHandle min={240} max={500} value={300} />
                </MantineProvider>,
            );
            expect(screen.getByRole("separator").style.cursor).toBe("ew-resize");
            rerender(
                <MantineProvider theme={compactTheme}>
                    <ResizeHandle min={240} max={500} value={500} />
                </MantineProvider>,
            );
            expect(screen.getByRole("separator").style.cursor).toBe("w-resize");
        });

        it("is ns-resize on a split", () => {
            expect(renderHandle({ edge: "top" }).style.cursor).toBe("ns-resize");
        });
    });
});
