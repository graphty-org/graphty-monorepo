import { createContext, type JSX, type ReactNode, useContext, useMemo } from "react";

import type { PopoutAlignment, PopoutPlacement } from "../../types/popout";

/**
 * The region a pop-out belongs to and the side its pop-outs open on, or null
 * outside any region.
 */
interface PopoutRegionValue {
    id: string;
    placement?: PopoutPlacement;
    alignment?: PopoutAlignment;
}

const PopoutRegionContext = createContext<PopoutRegionValue | null>(null);

/**
 * Props for the PopoutRegion component.
 */
export interface PopoutRegionProps {
    /**
     * What to call this region. Any stable string; two regions are the same
     * region when their ids are equal.
     */
    id: string;
    /**
     * The side every pop-out in this region opens on, unless its
     * `Popout.Panel` sets `placement` itself. Inherited from an enclosing
     * region when left out; `"left"` outside any region.
     */
    placement?: PopoutPlacement;
    /**
     * The alignment every pop-out in this region uses, unless its
     * `Popout.Panel` sets `alignment` itself. Inherited from an enclosing
     * region when left out; `"start"` outside any region.
     */
    alignment?: PopoutAlignment;
    /** The part of the tree whose pop-outs belong to this region. */
    children: ReactNode;
}

/**
 * Which region the pop-outs beneath this point belong to.
 *
 * A shell is divided into regions -- a properties panel, an inspector, the
 * surface between them -- and each pop-out records the region its trigger sits
 * in, readable through `usePopoutRegion`.
 *
 * The region no longer decides which pop-outs may be open together. Figma
 * keeps ONE light popover open at a time: opening another replaces it, in any
 * region (design/figma-spec.md 8.4). Before the Figma restyle a reader could
 * hold one pop-out open per region; that rule is gone, and this component is
 * kept so existing markup and `usePopoutRegion` keep working. A pop-out opened
 * from inside an open one is its child and stays allowed.
 *
 * A region can also set the side its pop-outs open on, so the pop-outs of a
 * panel docked at the right edge all open to its left without each one
 * saying so. A `Popout.Panel` that sets `placement` or `alignment` itself
 * still wins.
 * @param props - Component props
 * @param props.id - What to call this region
 * @param props.placement - The side this region's pop-outs open on by default
 * @param props.alignment - The alignment this region's pop-outs use by default
 * @param props.children - The part of the tree whose pop-outs belong to it
 * @returns The provider the pop-outs inside it read their region from
 * @example
 * ```tsx
 * <PopoutManager>
 *     <PopoutRegion id="panel">{panel}</PopoutRegion>
 *     <PopoutRegion id="inspector" placement="right">{inspector}</PopoutRegion>
 * </PopoutManager>
 * ```
 */
export function PopoutRegion({ id, placement, alignment, children }: PopoutRegionProps): JSX.Element {
    const outer = useContext(PopoutRegionContext);
    const value = useMemo(
        () => ({ id, placement: placement ?? outer?.placement, alignment: alignment ?? outer?.alignment }),
        [id, placement, alignment, outer?.placement, outer?.alignment],
    );
    return <PopoutRegionContext.Provider value={value}>{children}</PopoutRegionContext.Provider>;
}

/**
 * The region the calling component sits in.
 * @returns The region's id, or null when there is no enclosing region.
 */
export function usePopoutRegion(): string | null {
    return useContext(PopoutRegionContext)?.id ?? null;
}

/**
 * The default side and alignment the enclosing regions give their pop-outs.
 * @returns The placement and alignment set by the nearest regions, each undefined when none set it.
 */
export function usePopoutRegionDefaults(): Pick<PopoutRegionValue, "placement" | "alignment"> {
    const region = useContext(PopoutRegionContext);
    return { placement: region?.placement, alignment: region?.alignment };
}
