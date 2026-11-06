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
 * Mantine's RangeSlider, with the `aria-valuetext` given through `thumbProps` on each thumb.
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

        return <MantineRangeSlider {...props} ref={merged} />;
    },
);

/**
 * Mantine's Slider, with the `aria-valuetext` given through `thumbProps` on its thumb.
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

        return <MantineSlider {...props} ref={merged} />;
    },
);
