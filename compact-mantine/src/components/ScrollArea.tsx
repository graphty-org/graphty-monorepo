import { ScrollArea as MantineScrollArea, type ScrollAreaProps as MantineScrollAreaProps } from "@mantine/core";
import React from "react";

/** Mantine's ScrollArea props, plus `focusableViewport`. */
export interface ScrollAreaProps extends MantineScrollAreaProps {
    /**
     * Make the viewport a Tab stop (`tabIndex={0}`), so a reader can scroll it with the arrow and
     * page keys. Turn it on when nothing inside the scroller can take focus: otherwise a keyboard
     * reader cannot reach the content below the fold (WCAG 2.1.1). Keyboard focus draws a 1px ring
     * inside the viewport and shows the thumb. Off by default, so the viewport stays out of the
     * Tab order exactly as in Mantine. A `tabIndex` passed in `viewportProps` wins.
     */
    focusableViewport?: boolean;
}

/**
 * Mantine's ScrollArea with an opt-in keyboard stop on its viewport (`focusableViewport`). Without
 * that prop it is exactly Mantine's component, themed by this package. `ScrollArea.Autosize` is
 * Mantine's.
 * @param props - Mantine's ScrollArea props, plus `focusableViewport`
 * @param props.focusableViewport - make the viewport a Tab stop (default false)
 * @param props.viewportProps - Mantine's viewport props; a `tabIndex` here wins
 * @returns The scroll area
 * @example
 * ```tsx
 * <ScrollArea h={240} focusableViewport>
 *     {rows}
 * </ScrollArea>
 * ```
 */
function CompactScrollArea({
    focusableViewport = false,
    viewportProps,
    ...props
}: Readonly<ScrollAreaProps>): React.JSX.Element {
    return (
        <MantineScrollArea
            {...props}
            viewportProps={focusableViewport ? { tabIndex: 0, ...viewportProps } : viewportProps}
        />
    );
}

export const ScrollArea = Object.assign(CompactScrollArea, { Autosize: MantineScrollArea.Autosize });
