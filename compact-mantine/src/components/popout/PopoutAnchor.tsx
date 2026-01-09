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
 * Context value for PopoutAnchor.
 */
export interface PopoutAnchorContextValue {
    /** Ref to the anchor element */
    anchorRef: RefObject<HTMLElement | null>;
}

/**
 * Context for providing an anchor element to descendant Popouts.
 */
const PopoutAnchorContext = createContext<PopoutAnchorContextValue | null>(null);

/**
 * Hook to optionally access the PopoutAnchorContext.
 * Returns null if not inside a PopoutAnchor.
 * @returns The anchor context value or null
 */
export function usePopoutAnchorContext(): PopoutAnchorContextValue | null {
    return useContext(PopoutAnchorContext);
}

/**
 * Props for PopoutAnchor.
 */
export interface PopoutAnchorProps {
    /** The container element to use as anchor. Must accept a ref. */
    children: ReactNode;
}

/**
 * Provides an anchor element for descendant Popout panels to align to.
 *
 * When a Popout.Panel is inside a PopoutAnchor and doesn't have an explicit
 * `anchorRef` prop, it will automatically align to the anchor element.
 *
 * This is useful for sidebars, control panels, or any container where you
 * want popouts to align to the container edge rather than just the trigger.
 * @param props - Component props
 * @param props.children - The container element (must accept a ref)
 * @returns The PopoutAnchor component
 * @example
 * ```tsx
 * <Popout.Anchor>
 *     <Box style={{ width: 240, borderLeft: '1px solid gray' }}>
 *         <Popout>
 *             <Popout.Trigger>
 *                 <PopoutButton icon={<Settings />} aria-label="Settings" />
 *             </Popout.Trigger>
 *             <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
 *                 <Popout.Content>Content aligns to sidebar edge</Popout.Content>
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
