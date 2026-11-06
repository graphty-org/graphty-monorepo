/**
 * The slider wrappers reach both ends of their scale, with the real mouse and keys: a thumb dragged
 * past an end lands exactly on it even when the steps do not add up to it, a scale of tiny numbers
 * keeps its values, and Home and End move a range slider's focused thumb as far as it goes.
 */
import { screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { HistogramRow, RangeSlider, Slider } from "../../src";
import { renderThemed, resetHarness } from "../harness/measure";
import { moveBy, press, release } from "../harness/mouse";

afterEach(resetHarness);

/** Zachary's karate club's highest betweenness, which 100 steps of a hundredth fall a hair short of. */
const KARATE_MAX = 231.0714285714286;

/**
 * A range slider whose range the caller keeps, as an application does.
 * @param props - Component props
 * @param props.min - the scale's start
 * @param props.max - the scale's end
 * @param props.step - the step
 * @param props.onEnd - every range a gesture ends on
 * @returns the slider
 */
function Ranged({
    min,
    max,
    step,
    onEnd,
}: Readonly<{ min: number; max: number; step: number; onEnd: (value: [number, number]) => void }>): React.JSX.Element {
    const [value, setValue] = useState<[number, number]>([min, max]);
    return (
        <div style={{ width: 400, padding: 20 }}>
            <RangeSlider
                min={min}
                max={max}
                step={step}
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

/**
 * Drag a thumb left, then back past the scale's right end, and let go.
 * @param name - the thumb's name
 */
async function leftThenPastTheEnd(name: string): Promise<void> {
    await press(screen.getByRole("slider", { name }));
    await moveBy(-150);
    await moveBy(400);
    await release();
}

describe("RangeSlider's ends", () => {
    it("lands exactly on max when the end thumb is dragged back past it", async () => {
        const onEnd = vi.fn();
        await renderThemed(<Ranged min={0} max={KARATE_MAX} step={KARATE_MAX / 100} onEnd={onEnd} />);

        await leftThenPastTheEnd("To");

        expect(onEnd).toHaveBeenLastCalledWith([0, KARATE_MAX]);
    });

    it("lands on max when the scale is not a whole number of steps", async () => {
        const onEnd = vi.fn();
        await renderThemed(<Ranged min={0} max={10} step={3} onEnd={onEnd} />);

        await leftThenPastTheEnd("To");

        expect(onEnd).toHaveBeenLastCalledWith([0, 10]);
    });

    it("keeps a scale of tiny numbers instead of rounding every value to 0", async () => {
        const onEnd = vi.fn();
        const [min, max] = [1e-9, 3.393e-8];
        await renderThemed(<Ranged min={min} max={max} step={(max - min) / 100} onEnd={onEnd} />);

        await press(screen.getByRole("slider", { name: "To" }));
        await moveBy(-150);
        await release();

        const [from, to] = onEnd.mock.lastCall?.[0] as [number, number];
        expect(from).toBe(min);
        expect(to).toBeGreaterThan(min);
        expect(to).toBeLessThan(max);
    });

    it("moves the focused thumb as far as it goes with Home and End", async () => {
        const onEnd = vi.fn();
        await renderThemed(<Ranged min={0} max={KARATE_MAX} step={KARATE_MAX / 100} onEnd={onEnd} />);

        await userEvent.click(screen.getByRole("slider", { name: "From" }));
        await userEvent.keyboard("{End}");
        expect(onEnd).toHaveBeenLastCalledWith([KARATE_MAX, KARATE_MAX]);

        await userEvent.keyboard("{Home}");
        expect(onEnd).toHaveBeenLastCalledWith([0, KARATE_MAX]);
    });
});

describe("Slider's ends", () => {
    it("lands on max when the scale is not a whole number of steps", async () => {
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
                        max={10}
                        step={3}
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

        await press(screen.getByRole("slider", { name: "Amount" }));
        await moveBy(500);
        await release();

        expect(onEnd).toHaveBeenLastCalledWith(10);
    });
});

describe("HistogramRow's brush ends", () => {
    it("lets the start thumb reach the last value, so the range can hold it alone", async () => {
        const onEnd = vi.fn();
        /**
         * A histogram whose brush keeps its own range.
         * @returns the row
         */
        function Brushed(): React.JSX.Element {
            const [value, setValue] = useState<[number, number]>([0, KARATE_MAX]);
            return (
                <div style={{ width: 400 }}>
                    <HistogramRow
                        label="Betweenness"
                        bins={[
                            { label: "low", count: 33, from: 0, to: KARATE_MAX / 2 },
                            { label: "high", count: 1, from: KARATE_MAX / 2, to: KARATE_MAX },
                        ]}
                        minLabel=""
                        maxLabel=""
                        brush={{
                            min: 0,
                            max: KARATE_MAX,
                            step: KARATE_MAX / 100,
                            value,
                            startLabel: "From",
                            endLabel: "To",
                            bodyLabel: "Range",
                            onChangeEnd: (next) => {
                                setValue(next);
                                onEnd(next);
                            },
                        }}
                    />
                </div>
            );
        }
        await renderThemed(<Brushed />);

        await press(screen.getByRole("slider", { name: "From" }));
        await moveBy(600);
        await release();

        expect(onEnd).toHaveBeenLastCalledWith([KARATE_MAX, KARATE_MAX]);
    });
});
