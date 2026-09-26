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
 * surface between them -- and each pop-out records the region its trigger sits
 * in, readable through `usePopoutRegion`.
 *
 * The region no longer decides which pop-outs may be open together. Figma
 * keeps ONE light popover open at a time: opening another replaces it, in any
 * region (design/figma-spec.md 8.4). Before the Figma restyle a reader could
 * hold one pop-out open per region; that rule is gone, and this component is
 * kept so existing markup and `usePopoutRegion` keep working. A pop-out opened
 * from inside an open one is its child and stays allowed.
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
