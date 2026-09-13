import { createContext, type JSX, type ReactNode, useContext } from "react";

/**
 * The region a pop-out belongs to, or null outside any region.
 */
const PopoutRegionContext = createContext<string | null>(null);

/**
 * Props for the PopoutRegion component.
 */
export interface PopoutRegionProps {
    /**
     * What to call this region. Any stable string; two regions are the same
     * region when their ids are equal.
     */
    id: string;
    /** The part of the tree whose pop-outs belong to this region. */
    children: ReactNode;
}

/**
 * Which region the pop-outs beneath this point belong to.
 *
 * A shell is divided into regions -- a properties panel, an inspector, the
 * surface between them, a dialog, a dock -- and a reader may hold one pop-out
 * open in each, because two pop-outs describing two different objects are not
 * competing for the same answer. What they may not do is stack up inside ONE
 * region: opening a second there closes the first, because both describe the
 * same object and the second is the reader changing their mind.
 *
 * Without a region, every pop-out opened straight from the page is a sibling of
 * every other, so an inspector pop-out closes a panel pop-out that has nothing
 * to do with it. That is the behaviour this component exists to divide up, and
 * it is why the default -- no region at all -- keeps the older whole-page rule:
 * an application that never mentions regions is unaffected.
 *
 * The region is the OPENER's, not the surface's screen position. Wrap the
 * region's own markup, and a pop-out that slides out over neighbouring space
 * still counts against the region whose control opened it.
 *
 * Nesting is unaffected either way. A pop-out opened from another pop-out is
 * grouped by its parent, as it always was, and inherits this region only for
 * the benefit of anything it opens in turn.
 * @param props - Component props
 * @param props.id - What to call this region
 * @param props.children - The part of the tree whose pop-outs belong to it
 * @returns The provider the pop-outs inside it read their region from
 * @example
 * ```tsx
 * <PopoutManager>
 *     <PopoutRegion id="panel">{panel}</PopoutRegion>
 *     <PopoutRegion id="inspector">{inspector}</PopoutRegion>
 * </PopoutManager>
 * ```
 */
export function PopoutRegion({ id, children }: PopoutRegionProps): JSX.Element {
    return <PopoutRegionContext.Provider value={id}>{children}</PopoutRegionContext.Provider>;
}

/**
 * The region the calling component sits in.
 * @returns The region's id, or null when there is no enclosing region.
 */
export function usePopoutRegion(): string | null {
    return useContext(PopoutRegionContext);
}
