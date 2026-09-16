/**
 * Measures the live canvas rect and reports whether the two-line reflow has fired.
 *
 * The reflow threshold is a function of the canvas rect, not of the window: at 1280
 * with the panel and the inspector open the canvas is 672 wide and does not reflow,
 * while a 1440 window with both open and a dragged panel can. Build spec 01 section 5.
 *
 * WHAT THIS ELEMENT MEASURES IS THE LIVE CANVAS RECT, and the whole bottom stack --
 * the data table drawer, the time slider, the minimap, the legend and the canvas
 * toolbar -- is positioned against what comes out of here. For one release that
 * identity was false: the activity panel and the inspector became 280 px absolutely
 * positioned overlays below 1280 px over a canvas element that was deliberately not
 * resized under them (spec 01 section 7 item 7), so this hook honestly reported an
 * element that ran 560 px wider than the strip anybody could see, and all four overlays
 * drew themselves into the covered part. That layout was deleted whole on 2026-09-14;
 * both sidebars are docked flex columns at every width the shell lays out at, so the
 * element is the strip and no caller needs to correct what it returns.
 *
 * The one thing a caller must NOT do is take the correction on itself. If a region ever
 * covers the canvas again, the inset belongs in `canvasBottomStack`, where one
 * subtraction reaches every overlay, and not in four components separately.
 */

import { type RefObject, useEffect, useMemo, useState } from "react";

import { type CanvasToolbarProfile, canvasToolbarProfile, hasOverlayReflowed } from "../constants";

/**
 * The measured canvas rect and what the bottom stack reads off it.
 *
 * {@link useCanvasRect}'s return.
 * @public
 */
export interface CanvasRectState {
    /** The live canvas rect's width in CSS pixels; 0 before the first measurement. */
    readonly width: number;
    /** The live canvas rect's height in CSS pixels; 0 before the first measurement. */
    readonly height: number;
    /** The canvas toolbar size profile the viewport width puts in force. */
    readonly profile: CanvasToolbarProfile;
    /** Whether the minimap and the legend have risen onto a second line. */
    readonly reflowed: boolean;
}

/**
 * Measures the element the canvas region draws into, and re-measures it on every
 * resize -- a panel drag, an inspector toggle and a window resize all land here.
 *
 * A rect of width 0 is a canvas that has not been measured yet, not a narrow one, so
 * `reflowed` stays false until a real width arrives.
 * @param ref - a ref to the canvas element.
 * @param viewportWidth - the shell's measured width, which picks the toolbar profile.
 * @returns the measured rect, the profile in force and the reflow decision.
 */
export function useCanvasRect(ref: RefObject<HTMLElement | null>, viewportWidth: number): CanvasRectState {
    const [rect, setRect] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    useEffect(() => {
        const element = ref.current;

        if (element === null) {
            return undefined;
        }

        const measure = (): void => {
            const measured = element.getBoundingClientRect();

            setRect((current) =>
                current.width === measured.width && current.height === measured.height
                    ? current
                    : { width: measured.width, height: measured.height },
            );
        };

        measure();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", measure);

            return () => {
                window.removeEventListener("resize", measure);
            };
        }

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [ref]);

    return useMemo(() => {
        const profile = canvasToolbarProfile(viewportWidth);

        return {
            width: rect.width,
            height: rect.height,
            profile,
            reflowed: rect.width > 0 && hasOverlayReflowed(rect.width, profile),
        };
    }, [rect.height, rect.width, viewportWidth]);
}
