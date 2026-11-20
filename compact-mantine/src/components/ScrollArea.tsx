import { ScrollArea as MantineScrollArea, type ScrollAreaProps as MantineScrollAreaProps } from "@mantine/core";
import { useMergedRef } from "@mantine/hooks";
import React from "react";

/** Mantine's ScrollArea props, plus `focusableViewport` and `scrollCue`. */
export interface ScrollAreaProps extends MantineScrollAreaProps {
    /**
     * Make the viewport a Tab stop (`tabIndex={0}`), so a reader can scroll it with the arrow and
     * page keys. Turn it on when nothing inside the scroller can take focus: otherwise a keyboard
     * reader cannot reach the content below the fold (WCAG 2.1.1). Keyboard focus draws a 1px ring
     * inside the viewport and shows the thumb. Off by default, so the viewport stays out of the
     * Tab order exactly as in Mantine. A `tabIndex` passed in `viewportProps` wins.
     */
    focusableViewport?: boolean;
    /**
     * Show that the content scrolls before the reader tries: the thumb stays visible whenever the
     * content overflows (`type="auto"`, unless `type` is passed), and the content fades out over
     * 16px at the top or bottom edge while more of it lies beyond that edge. The root carries
     * `data-cue-top` and `data-cue-bottom` while it does. Off by default, so the scroller stays
     * exactly as without it.
     */
    scrollCue?: boolean;
}

/** Which edges of a viewport have content beyond them. */
interface Cue {
    readonly top: boolean;
    readonly bottom: boolean;
}

/**
 * The edges of a scroller with content beyond them, kept current as it scrolls and resizes.
 * @param on - whether to watch at all
 * @returns the viewport's ref, its scroll handler and the edges
 */
function useScrollCue(on: boolean): {
    readonly ref: React.RefObject<HTMLDivElement | null>;
    readonly measure: () => void;
    readonly cue: Cue;
} {
    const ref = React.useRef<HTMLDivElement>(null);
    const [cue, setCue] = React.useState<Cue>({ top: false, bottom: false });
    const measure = React.useCallback(() => {
        const el = ref.current;
        if (el === null) {
            return;
        }
        const top = el.scrollTop > 1;
        const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
        setCue((now) => (now.top === top && now.bottom === bottom ? now : { top, bottom }));
    }, []);
    React.useEffect(() => {
        const el = ref.current;
        if (!on || el === null) {
            return undefined;
        }
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        if (el.firstElementChild !== null) {
            observer.observe(el.firstElementChild);
        }
        return () => {
            observer.disconnect();
        };
    }, [on, measure]);
    return { ref, measure, cue };
}

/**
 * Mantine's ScrollArea with an opt-in keyboard stop on its viewport (`focusableViewport`) and an
 * opt-in cue that it scrolls (`scrollCue`). Without those props it is exactly Mantine's component,
 * themed by this package. `ScrollArea.Autosize` is Mantine's.
 * @param props - Mantine's ScrollArea props, plus `focusableViewport` and `scrollCue`
 * @param props.focusableViewport - make the viewport a Tab stop (default false)
 * @param props.scrollCue - show the thumb while the content overflows and fade a cut edge (default false)
 * @param props.viewportProps - Mantine's viewport props; a `tabIndex` here wins
 * @param props.viewportRef - Mantine's viewport ref
 * @param props.type - Mantine's scrollbar visibility; with `scrollCue`, "auto" unless given
 * @returns The scroll area
 * @example
 * ```tsx
 * <ScrollArea h={240} focusableViewport scrollCue>
 *     {rows}
 * </ScrollArea>
 * ```
 */
function CompactScrollArea({
    focusableViewport = false,
    scrollCue = false,
    viewportProps,
    viewportRef,
    type,
    ...props
}: Readonly<ScrollAreaProps>): React.JSX.Element {
    const { ref, measure, cue } = useScrollCue(scrollCue);
    const merged = useMergedRef(ref, viewportRef);
    const viewport = focusableViewport ? { tabIndex: 0, ...viewportProps } : viewportProps;
    if (!scrollCue) {
        return <MantineScrollArea {...props} type={type} viewportRef={viewportRef} viewportProps={viewport} />;
    }
    return (
        <MantineScrollArea
            {...props}
            type={type ?? "auto"}
            data-scroll-cue=""
            data-cue-top={cue.top || undefined}
            data-cue-bottom={cue.bottom || undefined}
            viewportRef={merged}
            viewportProps={{
                ...viewport,
                onScroll: (event) => {
                    viewport?.onScroll?.(event);
                    measure();
                },
            }}
        />
    );
}

/**
 * Mantine's ScrollArea, themed, with an opt-in keyboard stop on its viewport
 * (`focusableViewport`) and an opt-in cue that it scrolls (`scrollCue`). `ScrollArea.Autosize` is
 * Mantine's.
 */
export const ScrollArea = Object.assign(CompactScrollArea, { Autosize: MantineScrollArea.Autosize });
