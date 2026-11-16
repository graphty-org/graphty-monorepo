/**
 * A slider released before the browser draws the frame of its last move (a quick click on the
 * track, a flick, WebKit, whose frames often run behind its events) ends where the pointer let go
 * (issue #8309).
 */
import { screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RangeSlider, Slider } from "../../src";
import { renderThemed, resetHarness } from "../harness/measure";
import { quickClick } from "../harness/mouse";

afterEach(resetHarness);

/**
 * A quick click at 80% of a slider's track.
 * @param name - a thumb's name, whose track is clicked
 */
async function clickAtEighty(name: string): Promise<void> {
    const thumb = screen.getByRole("slider", { name });
    const track = thumb.closest(".mantine-RangeSlider-track, .mantine-Slider-track") as HTMLElement;
    const box = track.getBoundingClientRect();
    const middle = thumb.getBoundingClientRect();
    await quickClick(track, { x: box.width * 0.8, y: middle.top + middle.height / 2 - box.top });
}

describe("a slider released before the frame of its last move", () => {
    it("RangeSlider ends on the value it was released on", async () => {
        const onEnd = vi.fn();
        /**
         * A range slider whose range the caller keeps.
         * @returns the slider
         */
        function Ranged(): React.JSX.Element {
            const [value, setValue] = useState<[number, number]>([0, 50]);
            return (
                <div style={{ width: 400, padding: 20 }}>
                    <RangeSlider
                        min={0}
                        max={100}
                        step={1}
                        minRange={0}
                        label={null}
                        thumbFromLabel="From"
                        thumbToLabel="To"
                        value={value}
                        onChange={setValue}
                        onChangeEnd={(next) => {
                            setValue(next);
                            onEnd(next);
                        }}
                    />
                </div>
            );
        }
        await renderThemed(<Ranged />);

        await clickAtEighty("To");
        await vi.waitFor(() => {
            expect(onEnd).toHaveBeenCalledTimes(1);
        });

        const [ended] = onEnd.mock.lastCall as [[number, number]];
        expect(ended[1]).toBeGreaterThan(70);
        // The thumb is drawn on the value kept.
        await vi.waitFor(() => {
            expect(screen.getByRole("slider", { name: "To" }).getAttribute("aria-valuenow")).toBe(String(ended[1]));
        });
    });

    it("Slider ends on the value it was released on", async () => {
        const onEnd = vi.fn();
        /**
         * A slider whose value the caller keeps.
         * @returns the slider
         */
        function Single(): React.JSX.Element {
            const [value, setValue] = useState(0);
            return (
                <div style={{ width: 400, padding: 20 }}>
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        label={null}
                        thumbLabel="Amount"
                        value={value}
                        onChange={setValue}
                        onChangeEnd={onEnd}
                    />
                </div>
            );
        }
        await renderThemed(<Single />);

        await clickAtEighty("Amount");
        await vi.waitFor(() => {
            expect(onEnd).toHaveBeenCalledTimes(1);
        });

        expect(onEnd.mock.lastCall?.[0]).toBeGreaterThan(70);
    });
});
