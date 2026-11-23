import { RangeSlider as MantineRangeSlider, Slider as MantineSlider } from "@mantine/core";
import { useMergedRef } from "@mantine/hooks";
import React, { forwardRef, useEffect, useLayoutEffect, useRef } from "react";

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

/** The element Mantine measures a pointer against: the track's container. */
const TRACK = ".mantine-Slider-trackContainer, .mantine-RangeSlider-trackContainer";

/** A slider's scale, as the pointer is read on it. */
interface Scale {
    min: number;
    max: number;
    step: number;
    minRange: number;
}

/**
 * A pointer gesture ends on the value under the pointer where it was let go. Mantine's `useMove`
 * applies each move one animation frame later, and a release on the track drops a move still
 * waiting for its frame (RangeSlider forgets the dragged thumb on mouseup), while the end is
 * reported with the last value drawn. When the release comes before that frame -- WebKit's frames
 * often run behind its events, a quick flick or click anywhere -- the end carried an earlier value
 * (often the one the gesture started from) and a late move could still draw the thumb elsewhere
 * after it (issue #8309). So the release is read here, from the pointer, and the end carries it;
 * a move Mantine applies after the release is dropped.
 * @param root - The slider's root element.
 * @param scale - The scale.
 * @param current - The value the slider holds now.
 * @param onChange - The caller's change handler, given the released value.
 * A key pressed on the slider ends that: Mantine handles the keys in the root's own key capture,
 * which replaces any given to it, so the key is heard on the document first, before React hands it
 * to Mantine. Without that, every arrow key after a click or a drag was dropped.
 * @returns A root `onPointerDownCapture`, a filter for Mantine's `onChange` (false drops the call)
 * and the value an end reports.
 */
function useRelease<T extends number | [number, number]>(
    root: React.RefObject<HTMLDivElement | null>,
    scale: Scale,
    current: () => T,
    onChange: ((value: T) => void) | undefined,
): {
    onPointerDownCapture: (event: React.PointerEvent) => void;
    keep: () => boolean;
    end: (value: T) => T;
} {
    const { min, max, step, minRange } = scale;
    // The released value, from the release until the next press or key.
    const released = useRef<T | null>(null);
    useEffect(() => {
        const key = (event: KeyboardEvent): void => {
            if (event.target instanceof Node && root.current?.contains(event.target) === true) {
                released.current = null;
            }
        };
        document.addEventListener("keydown", key, { capture: true });
        return () => {
            document.removeEventListener("keydown", key, { capture: true });
        };
    }, [root]);
    const at = (clientX: number): number | null => {
        const rect = root.current?.querySelector(TRACK)?.getBoundingClientRect();
        if (rect === undefined || rect.width === 0) {
            return null;
        }
        // Mantine's own reading (getChangeValue), left to right.
        const dx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * (max - min);
        const value = Math.max(min, (dx === 0 ? 0 : Math.round(dx / step) * step) + min);
        return snapToEnds(Number(value.toFixed(stepPrecision(step))), min, max, step);
    };
    return {
        onPointerDownCapture: (event) => {
            released.current = null;
            // Mantine moves a thumb only for a primary press on its track (thumbs included).
            const track = root.current?.querySelector(TRACK);
            if (event.button !== 0 || track?.contains(event.target as Node) !== true) {
                return;
            }
            const start = current();
            let thumb = 0;
            if (Array.isArray(start)) {
                // The thumb pressed, else the nearer one, as Mantine picks it.
                const thumbs = [...(root.current?.querySelectorAll('[role="slider"]') ?? [])];
                const hit = (event.target as Element).closest('[role="slider"]');
                const there = at(event.clientX) ?? start[0];
                thumb =
                    hit !== null && thumbs.includes(hit)
                        ? thumbs.indexOf(hit)
                        : Number(Math.abs(start[0] - there) > Math.abs(start[1] - there));
            }
            const stop = new AbortController();
            const finish = (up: PointerEvent): void => {
                stop.abort();
                const value = up.type === "pointerup" ? at(up.clientX) : null;
                if (value === null) {
                    return;
                }
                const now = current();
                let next: number | [number, number] = value;
                if (Array.isArray(now)) {
                    next = [now[0], now[1]];
                    next[thumb] =
                        thumb === 0
                            ? Math.max(min, Math.min(value, now[1] - minRange))
                            : Math.min(max, Math.max(value, now[0] + minRange));
                }
                released.current = next as T;
                onChange?.(next as T);
            };
            document.addEventListener("pointerup", finish, { capture: true, signal: stop.signal });
            document.addEventListener("pointercancel", finish, { capture: true, signal: stop.signal });
        },
        keep: () => released.current === null,
        end: (value) => released.current ?? value,
    };
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
        const shown = useRef<[number, number]>([min, max]);
        shown.current = props.value ?? shown.current;
        const release = useRelease(root, { min, max, step, minRange }, () => shown.current, props.onChange);

        return (
            <MantineRangeSlider
                precision={stepPrecision(step)}
                {...props}
                ref={merged}
                onPointerDownCapture={(event) => {
                    props.onPointerDownCapture?.(event);
                    if (props.disabled !== true) {
                        release.onPointerDownCapture(event);
                    }
                }}
                onChange={(value) => {
                    shown.current = ends(value);
                    if (release.keep()) {
                        props.onChange?.(ends(value));
                    }
                }}
                onChangeEnd={(value) => props.onChangeEnd?.(release.end(ends(value)))}
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
        const shown = useRef(min);
        shown.current = props.value ?? shown.current;
        const release = useRelease(root, { min, max, step, minRange: 0 }, () => shown.current, props.onChange);

        return (
            <MantineSlider
                precision={stepPrecision(step)}
                {...props}
                ref={merged}
                onPointerDownCapture={(event) => {
                    props.onPointerDownCapture?.(event);
                    if (props.disabled !== true) {
                        release.onPointerDownCapture(event);
                    }
                }}
                onChange={(value) => {
                    shown.current = snapToEnds(value, min, max, step);
                    if (release.keep()) {
                        props.onChange?.(snapToEnds(value, min, max, step));
                    }
                }}
                onChangeEnd={(value) => props.onChangeEnd?.(release.end(snapToEnds(value, min, max, step)))}
            />
        );
    },
);
