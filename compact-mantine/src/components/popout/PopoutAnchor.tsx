import {
    cloneElement,
    createContext,
    isValidElement,
    type JSX,
    type ReactElement,
    type ReactNode,
    type Ref,
    type RefObject,
    useContext,
    useRef,
} from "react";

/**
 * What a marked container publishes to the pop-outs opened inside it.
 */
interface PopoutAnchorContextValue {
    /** The container element, which a panel inside it measures its edge against. */
    anchorRef: RefObject<HTMLElement | null>;
}

// The container is published as context rather than passed down, so that a
// pop-out at any depth inside it finds the edge to line up with without every
// layer in between having to forward a ref.
const PopoutAnchorContext = createContext<PopoutAnchorContextValue | null>(null);

/**
 * Reads the marked container a pop-out should line its edge up with.
 * @returns The container, or null when there is no `Popout.Anchor` above
 */
export function usePopoutAnchorContext(): PopoutAnchorContextValue | null {
    return useContext(PopoutAnchorContext);
}

/**
 * Props for the PopoutAnchor component.
 */
export interface PopoutAnchorProps {
    /**
     * The container the pop-outs inside it line up with. Pass exactly one
     * element, and one that accepts a ref: the anchor measures it.
     */
    children: ReactNode;
}

/**
 * Marks a container that pop-outs opened inside it line their edge up with.
 *
 * Wrap a sidebar or a control panel in it and every pop-out inside opens flush
 * with that container's edge instead of with its own trigger, which is what
 * makes a column of triggers open one tidy stack of panels rather than a
 * staircase. Panels keep opening level with the row that opened them: the
 * container decides the horizontal edge only.
 *
 * A panel opened from inside another panel lines up with that panel instead, so
 * that a nested stack still steps out one level at a time. Name `anchorX` on
 * the panel to override either choice.
 * @param props - Component props
 * @param props.children - The container element, which must accept a ref
 * @returns The container, with its position published to the pop-outs inside it
 * @example
 * ```tsx
 * <Popout.Anchor>
 *     <Box style={{width: 240, borderInlineStart: "1px solid gray"}}>
 *         <Popout>
 *             <Popout.Trigger>
 *                 <PopoutButton icon={<UiGlyph name="gear" />} aria-label="Settings" />
 *             </Popout.Trigger>
 *             <Popout.Panel width={280} header={{variant: "title", title: "Settings"}}>
 *                 <Popout.Content>Opens flush with the sidebar edge</Popout.Content>
 *             </Popout.Panel>
 *         </Popout>
 *     </Box>
 * </Popout.Anchor>
 * ```
 */
export function PopoutAnchor({ children }: PopoutAnchorProps): JSX.Element {
    const anchorRef = useRef<HTMLElement | null>(null);

    if (!isValidElement(children)) {
        throw new Error("PopoutAnchor requires a single valid React element as its child");
    }

    const child = children as ReactElement<{ ref?: Ref<HTMLElement> }>;

    // Clone the child to attach our ref
    const childWithRef = cloneElement(child, {
        ref: anchorRef as Ref<HTMLElement>,
    });

    return (
        <PopoutAnchorContext.Provider value={{ anchorRef }}>
            {childWithRef}
        </PopoutAnchorContext.Provider>
    );
}
