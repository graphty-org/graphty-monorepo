import { RangeSlider as MantineRangeSlider, Slider as MantineSlider } from "@mantine/core";
import { useMergedRef } from "@mantine/hooks";
import React, { forwardRef, useLayoutEffect, useRef } from "react";

/** What a thumb is given through `thumbProps`. */
type ThumbProps = ((index: 0 | 1) => Record<string, unknown>) | Record<string, unknown> | undefined;

/**
 * Put each thumb's `aria-valuetext` on its node. Mantine 8.3 builds its thumbs from a fixed list of
 * props and drops the rest of `thumbProps`, so a value text given there never reached the
 * accessibility tree: a date slider read its epoch milliseconds.
 * @param root - The slider's root element.
 * @param thumbProps - What the caller gave each thumb.
 */
function applyValueText(root: HTMLElement | null, thumbProps: ThumbProps): void {
    if (root === null) {
        return;
    }

    root.querySelectorAll<HTMLElement>('[role="slider"]').forEach((thumb, index) => {
        const which = index === 0 ? 0 : 1;
        const props = typeof thumbProps === "function" ? thumbProps(which) : thumbProps;
        const text = props?.["aria-valuetext"];
        if (typeof text === "string" || typeof text === "number") {
            thumb.setAttribute("aria-valuetext", String(text));
        } else {
            thumb.removeAttribute("aria-valuetext");
        }
    });
}

/**
 * How many decimals a step holds, exponent notation included: Mantine reads "3.293e-10" as seven
 * decimals and rounds every value of a column of tiny numbers to 0.
 * @param step - The step.
 * @returns Its decimals, at most 100 (what `toFixed` takes).
 */
function stepPrecision(step: number): number {
    const [mantissa = "", exponent = "0"] = String(Math.abs(step)).split("e");
    const decimals = mantissa.split(".")[1]?.length ?? 0;
    return Math.min(100, Math.max(0, decimals - Number(exponent)));
}

/**
 * A value at an end of the scale when it is within half a step of it. The pointer and the keys
 * move a thumb in whole steps from `min`, so when the scale is not a whole number of steps, or the
 * steps add up a hair short in floating point (100 x 2.31 is not 231.07), the last step stops short
 * of `max` and a value there could never be picked.
 * @param value - The value.
 * @param min - The scale's start.
 * @param max - The scale's end.
 * @param step - The step.
 * @returns The value, or the end it is next to.
 */
function snapToEnds(value: number, min: number, max: number, step: number): number {
    const near = Math.abs(step) / 2;
    if (max - value < near) {
        return max;
    }
    return value - min < near ? min : value;
}

/** Mantine's defaults, which the ends are read from when a prop is not given. */
const DEFAULTS = { min: 0, max: 100, step: 1 };

/**
 * Mantine's RangeSlider, with the `aria-valuetext` given through `thumbProps` on each thumb. Both
 * ends of the scale can always be reached: a thumb within half a step of an end lands on it, the
 * values keep the step's own decimals however small it is, and Home and End move the focused thumb
 * as far as it goes, which Mantine's RangeSlider does not.
 * @param props - Mantine's RangeSlider props
 * @returns The range slider
 * @example
 * ```tsx
 * <RangeSlider
 *     min={0}
 *     max={100}
 *     thumbProps={(index) => ({ "aria-valuetext": index === 0 ? "Jan 5" : "Feb 3" })}
 * />
 * ```
 */
export const RangeSlider = forwardRef<HTMLDivElement, React.ComponentProps<typeof MantineRangeSlider>>(
    function RangeSlider(props, ref) {
        const root = useRef<HTMLDivElement>(null);
        const merged = useMergedRef(ref, root);
        useLayoutEffect(() => {
            applyValueText(root.current, props.thumbProps);
        });
        const { min = DEFAULTS.min, max = DEFAULTS.max, step = DEFAULTS.step, minRange = 10 } = props;
        const ends = (value: [number, number]): [number, number] => [
            snapToEnds(value[0], min, max, step),
            snapToEnds(value[1], min, max, step),
        ];

        return (
            <MantineRangeSlider
                precision={stepPrecision(step)}
                {...props}
                ref={merged}
                onChange={(value) => props.onChange?.(ends(value))}
                onChangeEnd={(value) => props.onChangeEnd?.(ends(value))}
                onKeyDown={(event) => {
                    props.onKeyDown?.(event);
                    const current = props.value;
                    if ((event.key !== "Home" && event.key !== "End") || current === undefined) {
                        return;
                    }
                    event.preventDefault();
                    // A key on the slider itself (focused by a press on a thumb) moves the start
                    // thumb, as Mantine's arrow keys do.
                    const thumbs = [...(root.current?.querySelectorAll<HTMLElement>('[role="slider"]') ?? [])];
                    const thumb = Math.max(0, thumbs.indexOf(event.target as HTMLElement));
                    thumbs[thumb]?.focus();
                    // A thumb goes as far as the other thumb lets it.
                    const next: [number, number] =
                        thumb === 0
                            ? [event.key === "Home" ? min : current[1] - minRange, current[1]]
                            : [current[0], event.key === "End" ? max : current[0] + minRange];
                    props.onChange?.(next);
                    props.onChangeEnd?.(next);
                }}
            />
        );
    },
);

/**
 * Mantine's Slider, with the `aria-valuetext` given through `thumbProps` on its thumb, and both
 * ends reachable as RangeSlider's are.
 * @param props - Mantine's Slider props
 * @returns The slider
 */
export const Slider = forwardRef<HTMLDivElement, React.ComponentProps<typeof MantineSlider>>(
    function Slider(props, ref) {
        const root = useRef<HTMLDivElement>(null);
        const merged = useMergedRef(ref, root);
        useLayoutEffect(() => {
            applyValueText(root.current, props.thumbProps);
        });
        const { min = DEFAULTS.min, max = DEFAULTS.max, step = DEFAULTS.step } = props;

        return (
            <MantineSlider
                precision={stepPrecision(step)}
                {...props}
                ref={merged}
                onChange={(value) => props.onChange?.(snapToEnds(value, min, max, step))}
                onChangeEnd={(value) => props.onChangeEnd?.(snapToEnds(value, min, max, step))}
            />
        );
    },
);
