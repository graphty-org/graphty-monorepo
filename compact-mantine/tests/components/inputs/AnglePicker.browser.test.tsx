/**
 * AnglePicker in a real browser: presses and drags on the dial with the real mouse (pointer
 * capture, Shift snapping, Escape putting the angle back), the dial's keys, and typing in the
 * number field.
 */
import { screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { AnglePicker, type AnglePickerProps } from "../../../src/components/inputs/AnglePicker";
import { renderThemed, resetHarness } from "../../harness/measure";
import { type Offset, press, release, resetMouse, send, toPage } from "../../harness/mouse";

afterEach(async () => {
    await resetMouse();
    await resetHarness();
});

/**
 * A picker that keeps its own angle, inside a 192px slot.
 * @param props - the picker's props, less the value
 * @returns the picker
 */
function Held(props: Omit<AnglePickerProps, "value" | "label"> & { start?: number }): React.JSX.Element {
    const { start = 0, onChange, ...rest } = props;
    const [angle, setAngle] = useState(start);
    return (
        <div style={{ width: 192, padding: 40 }}>
            <AnglePicker
                label="Rotation"
                {...rest}
                value={angle}
                onChange={(next, event) => {
                    setAngle(next);
                    onChange?.(next, event);
                }}
            />
        </div>
    );
}

/**
 * The dial.
 * @returns the slider element
 */
function dial(): HTMLElement {
    return screen.getByRole("slider", { name: "Rotation" });
}

/**
 * A point on the dial's rim, at an angle clockwise from the top of the screen.
 * @param degrees - the screen angle
 * @returns the point, from the dial's top-left corner
 */
function rim(degrees: number): Offset {
    const box = dial().getBoundingClientRect();
    const r = box.width / 2 - 2;
    const radians = (degrees * Math.PI) / 180;
    return { x: box.width / 2 + r * Math.sin(radians), y: box.height / 2 - r * Math.cos(radians) };
}

/**
 * Move the held mouse to a point on the dial, with Shift held or not.
 * @param at - the point, from the dial's top-left corner
 * @param shift - whether Shift is held during the move
 */
async function moveOnDial(at: Offset, shift = false): Promise<void> {
    const box = dial().getBoundingClientRect();
    const { x, y } = toPage({ x: box.left + at.x, y: box.top + at.y });
    await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
        button: "left",
        buttons: 1,
        modifiers: shift ? 8 : 0,
    });
}

describe("AnglePicker", () => {
    it("a press at the right-hand rim gives 90, or 0 with zero at the right", async () => {
        const onChange = vi.fn();
        await renderThemed(<Held onChange={onChange} />);
        await press(dial(), rim(90));
        await release();
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("90");
        await resetHarness();

        await renderThemed(<Held zeroAt="right" />);
        await press(dial(), rim(90));
        await release();
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("0");
    });

    it("with zero at the right counting counterclockwise, the top is 90", async () => {
        await renderThemed(<Held zeroAt="right" direction="counterclockwise" />);
        await press(dial(), rim(0));
        await release();
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("90");
    });

    it("a drag from the top to the right reports every move and ends once on 90", async () => {
        const onChange = vi.fn();
        const onChangeEnd = vi.fn();
        await renderThemed(<Held onChange={onChange} onChangeEnd={onChangeEnd} />);
        await press(dial(), rim(0));
        for (const degrees of [20, 45, 70, 90]) {
            await moveOnDial(rim(degrees));
        }
        // Steering goes on outside the dial: the pointer is captured.
        const box = dial().getBoundingClientRect();
        await moveOnDial({ x: box.width + 60, y: box.height / 2 });
        await release();
        await expect.poll(() => onChangeEnd.mock.calls.length).toBe(1);
        assert.equal(onChangeEnd.mock.calls[0][0], 90);
        assert.isAtLeast(onChange.mock.calls.length, 3);
    });

    it("Shift during a drag snaps to the step", async () => {
        const onChangeEnd = vi.fn();
        await renderThemed(<Held onChangeEnd={onChangeEnd} />);
        await press(dial(), rim(0));
        await moveOnDial(rim(37), true);
        await release();
        await expect.poll(() => onChangeEnd.mock.calls.length).toBe(1);
        assert.equal(onChangeEnd.mock.calls[0][0], 30);
    });

    it("Escape during a drag puts the starting angle back and ends nothing", async () => {
        const onChangeEnd = vi.fn();
        await renderThemed(<Held start={20} onChangeEnd={onChangeEnd} />);
        await press(dial(), rim(180));
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("180");
        await userEvent.keyboard("{Escape}");
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("20");
        await moveOnDial(rim(270));
        await release();
        assert.equal(dial().getAttribute("aria-valuenow"), "20");
        assert.equal(onChangeEnd.mock.calls.length, 0);
    });

    it("the dial's keys step, snap, wrap and go home", async () => {
        const onChangeEnd = vi.fn();
        await renderThemed(<Held start={359} onChangeEnd={onChangeEnd} />);
        await userEvent.tab();
        assert.equal(document.activeElement, dial());
        await userEvent.keyboard("{ArrowRight}");
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("0");
        await userEvent.keyboard("{Home}");
        await userEvent.keyboard("{PageUp}");
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("15");
        await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}");
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("10");
        await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("25");
        assert.equal(dial().getAttribute("aria-valuetext"), "25 degrees");
        assert.equal(onChangeEnd.mock.calls.at(-1)?.[0], 25);
        await userEvent.keyboard("{Home}");
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("0");
    });

    it("typing 400 in the field wraps to 40 and turns the hand", async () => {
        const onChangeEnd = vi.fn();
        await renderThemed(<Held onChangeEnd={onChangeEnd} />);
        const field = screen.getByRole("spinbutton", { name: "Rotation, degrees" });
        await userEvent.click(field);
        await userEvent.keyboard("{Control>}a{/Control}400{Enter}");
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("40");
        assert.equal(onChangeEnd.mock.calls.at(-1)?.[0], 40);
        const hand = screen.getByTestId("angle-picker-hand");
        // rotate(40deg) as a matrix: cos 40 and sin 40.
        const matrix = new DOMMatrix(getComputedStyle(hand).transform);
        assert.closeTo(matrix.a, Math.cos((40 * Math.PI) / 180), 1e-3);
        assert.closeTo(matrix.b, Math.sin((40 * Math.PI) / 180), 1e-3);
    });

    it("under dir=rtl a press at the physical right rim still gives 90", async () => {
        await renderThemed(
            <div dir="rtl">
                <Held />
            </div>,
        );
        await press(dial(), rim(90));
        await release();
        await expect.poll(() => dial().getAttribute("aria-valuenow")).toBe("90");
    });

    it("disabled, neither part takes a press or focus", async () => {
        await renderThemed(<Held disabled disabledReason="Load data first" />);
        await press(dial(), rim(90));
        await release();
        assert.equal(dial().getAttribute("aria-valuenow"), "0");
        assert.equal(dial().getAttribute("aria-disabled"), "true");
        assert.isTrue((screen.getByRole("spinbutton", { name: "Rotation, degrees" }) as HTMLInputElement).disabled);
    });
});
