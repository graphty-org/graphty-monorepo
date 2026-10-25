/**
 * A histogram's range brush in a real browser: the body dragged with the real mouse, a bar
 * clicked, the thumbs' value text read from Chromium's accessibility tree, the thumbs measured
 * against the bars they sit on, and the bars' contrast in both schemes.
 */
import { screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { HistogramRow, RangeSlider } from "../../../src";
import type { HistogramBin } from "../../../src/components/rows/ChartRow";
import { renderThemed, resetHarness } from "../../harness/measure";
import { drag, press, release } from "../../harness/mouse";

afterEach(resetHarness);

const DAY = 86_400_000;
/** The middle of the brush row, the 16px line the thumbs ride on. */
const BRUSH_MIDDLE = 8;
const T0 = Date.UTC(2025, 0, 1);
/** Ten daily bins. */
const BINS: HistogramBin[] = Array.from({ length: 10 }, (_, index) => ({
    label: `Day ${String(index + 1)}`,
    count: index + 1,
    from: T0 + index * DAY,
    to: T0 + (index + 1) * DAY,
}));

/**
 * The day a value falls on, as words.
 * @param value - Epoch milliseconds.
 * @returns "Jan 3".
 */
function dayWords(value: number): string {
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(value);
}

/**
 * A histogram whose brush keeps its own range, as an application does.
 * @param props - Component props
 * @param props.onEnd - Called with every range a gesture ends on.
 * @param props.start - The first range.
 * @returns The row.
 */
function Brushed({
    onEnd,
    start = [T0 + 2 * DAY, T0 + 4 * DAY],
}: Readonly<{ onEnd?: (value: [number, number]) => void; start?: [number, number] }>): React.JSX.Element {
    const [value, setValue] = useState<[number, number]>(start);
    return (
        <div style={{ width: 400 }}>
            <HistogramRow
                label="Edges over time"
                bins={BINS.map((bin) => ({
                    ...bin,
                    highlighted: (bin.from ?? 0) < value[1] && (bin.to ?? 0) > value[0],
                    dimmed: !((bin.from ?? 0) < value[1] && (bin.to ?? 0) > value[0]),
                }))}
                minLabel=""
                maxLabel=""
                brush={{
                    min: T0,
                    max: T0 + 10 * DAY,
                    step: DAY,
                    value,
                    startLabel: "Window start",
                    endLabel: "Window end",
                    bodyLabel: "Window",
                    valueText: (at, thumb) => dayWords(thumb === 0 ? at : at - 1),
                    rangeText: (range) => `${dayWords(range[0])} - ${dayWords(range[1] - 1)}`,
                    onChangeEnd: (next) => {
                        setValue(next);
                        onEnd?.(next);
                    },
                }}
            />
        </div>
    );
}

/**
 * The WCAG contrast ratio of two opaque colors.
 * @param a - one computed color
 * @param b - the other
 * @returns the ratio
 */
function contrast(a: string, b: string): number {
    const lum = (color: string): number => {
        const [r, g, bl] = (color.match(/[\d.]+/g) ?? []).map(Number);
        const [lr, lg, lb] = [r, g, bl].map((c) => {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    };
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe("HistogramRow's range brush", () => {
    it("moves both ends by the same amount when its body is dragged", async () => {
        const onEnd = vi.fn();
        await renderThemed(<Brushed onEnd={onEnd} />);
        const body = screen.getByRole("slider", { name: "Window" });
        const plot = screen.getByTestId("histogram-plot");
        const dayWidth = plot.getBoundingClientRect().width / 10;

        await drag(body, { x: body.getBoundingClientRect().width / 2, y: 10 }, { x: 3 * dayWidth, y: 0 }, 6);

        expect(onEnd).toHaveBeenLastCalledWith([T0 + 5 * DAY, T0 + 7 * DAY]);
    });

    // The reader's "between the two dots": the row under the bars, where the thumbs' track runs.
    it("moves both ends when the row between the two thumbs is dragged with the mouse", async () => {
        const onEnd = vi.fn();
        await renderThemed(<Brushed onEnd={onEnd} start={[T0 + 4 * DAY, T0 + 6 * DAY]} />);
        const row = screen.getByTestId("histogram-brush");
        const dayWidth = screen.getByTestId("histogram-plot").getBoundingClientRect().width / 10;

        await drag(row, { x: row.getBoundingClientRect().width / 2, y: BRUSH_MIDDLE }, { x: 2 * dayWidth, y: 0 }, 6);

        expect(onEnd).toHaveBeenLastCalledWith([T0 + 6 * DAY, T0 + 8 * DAY]);
    });

    it("moves both ends when a finger drags the row between the two thumbs", async () => {
        const onEnd = vi.fn();
        await renderThemed(<Brushed onEnd={onEnd} start={[T0 + 4 * DAY, T0 + 6 * DAY]} />);
        const dayWidth = screen.getByTestId("histogram-plot").getBoundingClientRect().width / 10;

        await commands.touchDrag('[data-testid="histogram-brush"]', -2 * dayWidth);

        expect(onEnd).toHaveBeenLastCalledWith([T0 + 2 * DAY, T0 + 4 * DAY]);
    });

    it("moves both ends with the arrow keys on the window", async () => {
        const onEnd = vi.fn();
        await renderThemed(<Brushed onEnd={onEnd} start={[T0 + 4 * DAY, T0 + 6 * DAY]} />);
        screen.getByRole("slider", { name: "Window" }).focus();

        await userEvent.keyboard("{ArrowRight}{ArrowRight}");

        expect(onEnd).toHaveBeenLastCalledWith([T0 + 6 * DAY, T0 + 8 * DAY]);
    });

    it("jumps to a bar clicked outside the range, keeping its width", async () => {
        const onEnd = vi.fn();
        await renderThemed(<Brushed onEnd={onEnd} />);
        const plot = screen.getByTestId("histogram-plot");
        const { width, height } = plot.getBoundingClientRect();

        await press(plot, { x: width * 0.85, y: height / 2 });
        await release();

        expect(onEnd).toHaveBeenLastCalledWith([T0 + 8 * DAY, T0 + 10 * DAY]);
    });

    it("reads its thumbs as dates in the accessibility tree", async () => {
        await renderThemed(<Brushed />);
        const [start] = await commands.axNodes("Window start");
        const [end] = await commands.axNodes("Window end");
        expect(start.valueText).toBe("Jan 3");
        expect(end.valueText).toBe("Jan 4");
    });

    it("puts each thumb on its bin's edge", async () => {
        await renderThemed(<Brushed />);
        const bars = screen.getAllByTestId("histogram-bar");
        const plot = screen.getByTestId("histogram-plot").getBoundingClientRect();
        const centerOf = (element: Element): number => {
            const box = element.getBoundingClientRect();
            return box.left + box.width / 2;
        };
        // The bars sit inside their bins with a 1px gap either side.
        const edge = (index: number): number => plot.left + (plot.width / 10) * index;
        expect(Math.abs(bars[2].getBoundingClientRect().left - 1 - edge(2))).toBeLessThan(0.5);
        expect(Math.abs(centerOf(screen.getByRole("slider", { name: "Window start" })) - edge(2))).toBeLessThan(1);
        expect(Math.abs(centerOf(screen.getByRole("slider", { name: "Window end" })) - edge(4))).toBeLessThan(1);
    });

    it("gives each thumb a 44px target under a coarse pointer", () => {
        const rules = [...document.styleSheets].flatMap((sheet) => {
            try {
                return [...sheet.cssRules];
            } catch {
                return [];
            }
        });
        const coarse = rules.filter(
            (rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.conditionText === "(pointer: coarse)",
        );
        const target = coarse
            .flatMap((rule) => [...rule.cssRules])
            .find(
                (rule): rule is CSSStyleRule =>
                    rule instanceof CSSStyleRule && rule.selectorText.includes(".cm-slider-thumb::after"),
            );
        expect(target?.style.width).toBe("44px");
        expect(target?.style.height).toBe("44px");
    });

    for (const scheme of ["light", "dark"] as const) {
        it(`${scheme}: bars in the range and outside it differ at 3:1 or more`, async () => {
            await renderThemed(<Brushed />, { scheme });
            const bars = screen.getAllByTestId("histogram-bar");
            const inside = getComputedStyle(bars[2]).backgroundColor;
            const outside = getComputedStyle(bars[7]).backgroundColor;
            expect(contrast(inside, outside)).toBeGreaterThanOrEqual(3);
        });
    }

    it("puts the value text a range slider is given on its thumbs", async () => {
        await renderThemed(
            <RangeSlider
                defaultValue={[20, 60]}
                thumbFromLabel="From"
                thumbToLabel="To"
                thumbProps={(index) => ({ "aria-valuetext": index === 0 ? "twenty" : "sixty" })}
            />,
        );
        expect(screen.getByRole("slider", { name: "From" }).getAttribute("aria-valuetext")).toBe("twenty");
        const [from] = await commands.axNodes("From");
        const [to] = await commands.axNodes("To");
        expect(from.valueText).toBe("twenty");
        expect(to.valueText).toBe("sixty");
    });
});
