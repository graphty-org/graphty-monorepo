import { useUncontrolled } from "@mantine/hooks";
import {
    createContext,
    type JSX,
    type ReactNode,
    type SyntheticEvent,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";

import { POPOUT_Z_INDEX_BASE } from "../../constants/popout";
import type { OpenChangeHandler } from "../../types/events";
import type { PopoutContextValue, PopoutManagerContextValue } from "../../types/popout";
import { useClickOutside } from "./hooks/useClickOutside";
import { useEscapeKey } from "./hooks/useEscapeKey";
import { usePopoutRegion } from "./PopoutRegion";

/**
 * Context for individual Popout instance state.
 */
const PopoutContext = createContext<PopoutContextValue | null>(null);

/**
 * Context for PopoutManager coordination.
 */
const PopoutManagerContext = createContext<PopoutManagerContextValue | null>(null);

/**
 * Hook to access the PopoutContext.
 * Throws an error if used outside of a Popout component.
 * @returns The PopoutContext value containing id, isOpen, open, close, toggle, triggerRef, and parentId
 */
export function usePopoutContext(): PopoutContextValue {
    const context = useContext(PopoutContext);
    if (!context) {
        throw new Error("usePopoutContext must be used within a Popout component");
    }
    return context;
}

/**
 * Hook to optionally access the PopoutContext without throwing.
 * Used to detect if a Popout is nested inside another Popout.
 * @returns The PopoutContext value if inside a Popout, or null otherwise
 */
export function useOptionalPopoutContext(): PopoutContextValue | null {
    return useContext(PopoutContext);
}

/**
 * Hook to access the PopoutManagerContext.
 * Throws an error if used outside of a PopoutManager.
 * @returns The PopoutManagerContext value containing register, unregister, and getZIndex functions
 */
export function usePopoutManagerContext(): PopoutManagerContextValue {
    const context = useContext(PopoutManagerContext);
    if (!context) {
        throw new Error("usePopoutManagerContext must be used within a PopoutManager");
    }
    return context;
}

/**
 * Hook to check whether a PopoutManager is present, without throwing.
 *
 * Used by components that carry their own manager when they are not already
 * inside one, so that they work standalone and still join the page's single
 * floating layer when there is one.
 * @returns The PopoutManagerContext value if inside a PopoutManager, or null otherwise
 */
export function useOptionalPopoutManagerContext(): PopoutManagerContextValue | null {
    return useContext(PopoutManagerContext);
}

/**
 * Props for PopoutProvider.
 */
interface PopoutProviderProps {
    children: ReactNode;
    /** ID of the parent popout (if nested) */
    parentId?: string | null;
    /** Whether the pop-out is open, when the consumer drives it from their own state */
    opened?: boolean;
    /** Whether the pop-out starts open, when it keeps its own state */
    defaultOpened?: boolean;
    /** Called when the pop-out opens or closes */
    onOpenChange?: OpenChangeHandler;
}

/**
 * Provider for individual Popout instance state.
 * Manages open/close state and trigger ref for a single popout.
 * Tracks parent ID for hierarchy management when nested.
 *
 * The open state is controlled when `opened` is supplied and self-managed
 * otherwise, and every change is reported to `onOpenChange` either way.
 * @param props - Component props
 * @param props.children - Child components wrapped by the provider
 * @param props.parentId - ID of the parent popout if this is a nested popout
 * @param props.opened - Whether the pop-out is open, when driven from the consumer's state
 * @param props.defaultOpened - Whether the pop-out starts open, when it keeps its own state
 * @param props.onOpenChange - Called when the pop-out opens or closes
 * @returns The PopoutProvider component
 */
export function PopoutProvider({
    children,
    parentId = null,
    opened,
    defaultOpened,
    onOpenChange,
}: PopoutProviderProps): JSX.Element {
    const id = useId();
    const triggerRef = useRef<HTMLElement | null>(null);
    // The region this pop-out was OPENED in, which is where its trigger sits and
    // not where the panel ends up on screen. It decides which other pop-outs it
    // competes with; see PopoutRegion.
    const region = usePopoutRegion();

    const [isOpen, setIsOpen] = useUncontrolled<boolean>({
        value: opened,
        defaultValue: defaultOpened,
        finalValue: false,
        onChange: onOpenChange,
    });

    // useUncontrolled hands back a new setter on every render. Reading it
    // through a ref is what keeps open, close and toggle stable, so the context
    // value changes only when the pop-out actually opens or closes. Without
    // that, everything inside a pop-out re-renders on every keystroke elsewhere
    // -- and the panel's registration effect, which depends on close, tore its
    // own registration down and built it again on every render.
    const setIsOpenRef = useRef(setIsOpen);
    useEffect(() => {
        setIsOpenRef.current = setIsOpen;
    });

    // A change made in code carries no event, and onOpenChange is then called
    // with the new state alone rather than with an explicit undefined.
    const setOpenState = useCallback(
        (next: boolean, event?: SyntheticEvent) => {
            if (event) {
                setIsOpenRef.current(next, event);
                return;
            }
            setIsOpenRef.current(next);
        },
        [],
    );

    const open = useCallback(
        (event?: SyntheticEvent) => {
            setOpenState(true, event);
        },
        [setOpenState],
    );

    const close = useCallback(
        (event?: SyntheticEvent) => {
            setOpenState(false, event);
        },
        [setOpenState],
    );

    const toggle = useCallback(
        (event?: SyntheticEvent) => {
            setOpenState(!isOpen, event);
        },
        [isOpen, setOpenState],
    );

    const value = useMemo<PopoutContextValue>(
        () => ({
            id,
            isOpen,
            open,
            close,
            toggle,
            triggerRef,
            parentId,
            region,
        }),
        [id, isOpen, open, close, toggle, parentId, region],
    );

    return <PopoutContext.Provider value={value}>{children}</PopoutContext.Provider>;
}

/**
 * Props for PopoutManagerProvider.
 */
interface PopoutManagerProviderProps {
    children: ReactNode;
}

/**
 * Provider for PopoutManager coordination.
 * Manages z-index, registration of multiple popouts, and portal container.
 * Handles global escape key and click-outside behavior.
 * Tracks which pop-out was opened from which, so that closing one closes
 * everything opened from it and Escape closes the innermost one first.
 * @param props - Component props
 * @param props.children - Child components wrapped by the provider
 * @returns The PopoutManagerProvider component
 */
export function PopoutManagerProvider({ children }: PopoutManagerProviderProps): JSX.Element {
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    // Track z-index stack order. Array index represents stack order (last = top).
    // Using useRef to avoid unnecessary re-renders when stack changes.
    const zIndexStackRef = useRef<string[]>([]);
    // Map of popout IDs to their close callbacks
    const closeCallbacksRef = useRef<Map<string, () => void>>(new Map());
    // Map of popout IDs to their parent IDs (for hierarchy tracking)
    const parentMapRef = useRef<Map<string, string | null>>(new Map());
    // Map of popout IDs to the region they were opened in, which decides which
    // root-level pop-outs compete with each other (PopoutRegion)
    const regionMapRef = useRef<Map<string, string | null>>(new Map());
    // Counter that changes when z-index stack changes, for triggering re-renders in consumers
    const [zIndexVersion, setZIndexVersion] = useState(0);

    /**
     * Find all sibling popouts: the ones that compete with this one for the
     * single open slot.
     *
     * A nested pop-out competes with the others opened from the same parent. A
     * root-level one competes only within its own region, so a panel pop-out and
     * an inspector pop-out can both be open while two panel pop-outs cannot.
     * With no region in the tree every root-level pop-out shares one group,
     * which is the whole-page rule this layer had before regions existed.
     * @param targetParentId - The parent ID to match (null for root-level popouts)
     * @param targetRegion - The region to match, for root-level popouts
     * @returns Array of sibling popout IDs
     */
    const isSibling = useCallback(
        (candidateId: string, targetParentId: string | null, targetRegion: string | null): boolean => {
            if ((parentMapRef.current.get(candidateId) ?? null) !== targetParentId) {
                return false;
            }

            // Region separates root-level pop-outs only. Below the root the
            // parent has already done the separating, and two children of one
            // parent are siblings whatever region they inherited.
            if (targetParentId !== null) {
                return true;
            }

            return (regionMapRef.current.get(candidateId) ?? null) === targetRegion;
        },
        [],
    );

    const findSiblings = useCallback((targetParentId: string | null, targetRegion: string | null): string[] => {
        return zIndexStackRef.current.filter((id) => isSibling(id, targetParentId, targetRegion));
    }, [isSibling]);

    /**
     * Find all descendants of a popout using the parent map
     * @param popoutId - The popout ID to find descendants for
     * @returns Array of descendant popout IDs
     */
    const findDescendantsInRegister = useCallback((popoutId: string): string[] => {
        const descendants: string[] = [];
        for (const id of zIndexStackRef.current) {
            // Check if this id is a descendant of popoutId
            let currentId: string | null = id;
            while (currentId) {
                const parent: string | null = parentMapRef.current.get(currentId) ?? null;
                if (parent === popoutId) {
                    descendants.push(id);
                    break;
                }
                currentId = parent;
            }
        }
        return descendants;
    }, []);

    /**
     * Get the depth of a popout in the hierarchy
     * @param popoutId - The popout ID
     * @returns The depth (0 for root-level popouts)
     */
    const getDepth = useCallback((popoutId: string): number => {
        let depth = 0;
        let currentId: string | null = popoutId;
        while (currentId) {
            const parent: string | null = parentMapRef.current.get(currentId) ?? null;
            if (!parent) {
                break;
            }
            depth++;
            currentId = parent;
        }
        return depth;
    }, []);

    /**
     * Close multiple popouts in depth-first order (deepest first)
     * @param ids - Array of popout IDs to close
     */
    const closePopoutsDepthFirst = useCallback((ids: string[]): void => {
        // Sort by depth (deepest first)
        const sorted = [...ids].sort((a, b) => getDepth(b) - getDepth(a));
        for (const id of sorted) {
            closeCallbacksRef.current.get(id)?.();
        }
    }, [getDepth]);

    const register = useCallback((
        popoutId: string,
        closeCallback: () => void,
        parentId?: string | null,
        region?: string | null,
    ) => {
        if (zIndexStackRef.current.includes(popoutId)) {
            // Already in the stack: keep the close callback fresh -- a pop-out
            // whose consumer drives it hands over a new one on every render --
            // without disturbing the stacking order, and without publishing a
            // new version, which would re-render every panel on the page.
            closeCallbacksRef.current.set(popoutId, closeCallback);
            return;
        }

        const normalizedParentId = parentId ?? null;
        const normalizedRegion = region ?? null;

        // Find sibling popouts (exclusive behavior: only one sibling can be open)
        const siblings = findSiblings(normalizedParentId, normalizedRegion);

        // Collect all IDs to close (siblings and their descendants)
        const idsToClose: string[] = [];
        for (const siblingId of siblings) {
            idsToClose.push(siblingId);
            idsToClose.push(...findDescendantsInRegister(siblingId));
        }

        // Close siblings and descendants in depth-first order
        closePopoutsDepthFirst(idsToClose);

        // Remove closed popouts from the stack
        const closedSet = new Set(idsToClose);
        zIndexStackRef.current = zIndexStackRef.current.filter((id) => !closedSet.has(id));

        // Register the new popout
        zIndexStackRef.current.push(popoutId);
        closeCallbacksRef.current.set(popoutId, closeCallback);
        parentMapRef.current.set(popoutId, normalizedParentId);
        regionMapRef.current.set(popoutId, normalizedRegion);
        setZIndexVersion((v) => v + 1);
    }, [findSiblings, findDescendantsInRegister, closePopoutsDepthFirst]);

    const unregister = useCallback((popoutId: string) => {
        if (!zIndexStackRef.current.includes(popoutId)) {
            // Nothing to remove. Publishing a version anyway would re-render
            // every panel, which re-runs this effect, which publishes again:
            // a closed pop-out inside an open panel used to spin forever that
            // way.
            closeCallbacksRef.current.delete(popoutId);
            parentMapRef.current.delete(popoutId);
            regionMapRef.current.delete(popoutId);
            return;
        }

        zIndexStackRef.current = zIndexStackRef.current.filter((id) => id !== popoutId);
        closeCallbacksRef.current.delete(popoutId);
        parentMapRef.current.delete(popoutId);
        regionMapRef.current.delete(popoutId);
        setZIndexVersion((v) => v + 1);
    }, []);

    const getZIndex = useCallback((popoutId: string): number => {
        const index = zIndexStackRef.current.indexOf(popoutId);
        // Base z-index + position in stack
        return index >= 0 ? POPOUT_Z_INDEX_BASE + index : POPOUT_Z_INDEX_BASE;
    }, []);

    const bringToFront = useCallback((popoutId: string) => {
        const currentStack = zIndexStackRef.current;
        const currentIndex = currentStack.indexOf(popoutId);

        // If already at top or not registered, nothing to do
        if (currentIndex === -1 || currentIndex === currentStack.length - 1) {
            return;
        }

        // Move to end of array (top of stack)
        zIndexStackRef.current = [
            ...currentStack.filter((id) => id !== popoutId),
            popoutId,
        ];
        setZIndexVersion((v) => v + 1);
    }, []);

    const getParentId = useCallback((popoutId: string): string | null => {
        return parentMapRef.current.get(popoutId) ?? null;
    }, []);

    const isAncestor = useCallback((ancestorId: string, descendantId: string): boolean => {
        let currentId: string | null = descendantId;
        while (currentId) {
            const parentId = parentMapRef.current.get(currentId);
            if (parentId === ancestorId) {
                return true;
            }
            currentId = parentId ?? null;
        }
        return false;
    }, []);

    /**
     * Get all descendants of a popout (children, grandchildren, etc.)
     * @param popoutId - The ID of the popout to find descendants for
     * @returns Array of descendant popout IDs
     */
    const getDescendants = useCallback((popoutId: string): string[] => {
        const descendants: string[] = [];
        const stack = zIndexStackRef.current;

        for (const id of stack) {
            if (isAncestor(popoutId, id)) {
                descendants.push(id);
            }
        }

        return descendants;
    }, [isAncestor]);

    const closeDescendants = useCallback((popoutId: string) => {
        // Find all descendants
        const descendants = getDescendants(popoutId);

        // Close descendants in reverse order (deepest first)
        for (const descendantId of [...descendants].reverse()) {
            const closeCallback = closeCallbacksRef.current.get(descendantId);
            closeCallback?.();
        }
    }, [getDescendants]);

    const closeWithDescendants = useCallback((popoutId: string) => {
        // Close descendants first
        closeDescendants(popoutId);

        // Then close the target popout
        const closeCallback = closeCallbacksRef.current.get(popoutId);
        closeCallback?.();
    }, [closeDescendants]);

    const closeSiblings = useCallback((popoutId: string, parentId: string | null) => {
        // Siblings are decided by the same predicate `register` uses, and the
        // region comes from the registry rather than from the caller: this is
        // the one public entry point that could otherwise reach across regions
        // and close a pop-out that never competed with this one.
        const region = regionMapRef.current.get(popoutId) ?? null;

        for (const id of zIndexStackRef.current) {
            if (id === popoutId) {continue;} // Don't close self

            if (isSibling(id, parentId, region)) {
                // Close sibling and its descendants
                closeWithDescendants(id);
            }
        }
    }, [closeWithDescendants, isSibling]);

    const closeFocused = useCallback(() => {
        const stack = zIndexStackRef.current;
        if (stack.length === 0) {
            return;
        }

        // The focused popout is the last one in the stack (highest z-index)
        const focusedId = stack[stack.length - 1];
        const closeCallback = closeCallbacksRef.current.get(focusedId);
        closeCallback?.();
    }, []);

    const closeAll = useCallback(() => {
        // Close all popouts by calling their close callbacks
        // Make a copy of the stack since closing will modify it
        const stack = [...zIndexStackRef.current];
        for (const popoutId of stack) {
            const closeCallback = closeCallbacksRef.current.get(popoutId);
            closeCallback?.();
        }
    }, []);

    const hasOpenPopouts = useCallback(() => {
        return zIndexStackRef.current.length > 0;
    }, []);

    // Wire up escape key and click-outside hooks
    // These are enabled when there are open popouts
    const [hasPopouts, setHasPopouts] = useState(false);

    // Update hasPopouts state when z-index stack changes
    // Using a separate effect to track this avoids stale closures
    useEffect(() => {
        setHasPopouts(zIndexStackRef.current.length > 0);
    }, [zIndexVersion]);

    // Close focused popout on Escape key
    useEscapeKey(closeFocused, hasPopouts);

    // Close all popouts when clicking outside
    useClickOutside(closeAll, hasPopouts);

    const value = useMemo<PopoutManagerContextValue>(
        () => ({
            register,
            unregister,
            getZIndex,
            bringToFront,
            portalContainer,
            zIndexVersion,
            closeFocused,
            closeAll,
            hasOpenPopouts,
            closeWithDescendants,
            closeDescendants,
            closeSiblings,
            getParentId,
            isAncestor,
        }),
        [register, unregister, getZIndex, bringToFront, portalContainer, zIndexVersion, closeFocused, closeAll, hasOpenPopouts, closeWithDescendants, closeDescendants, closeSiblings, getParentId, isAncestor],
    );

    return (
        <PopoutManagerContext.Provider value={value}>
            {children}
            {/* The panels inside are position: fixed, so this element only has
                to exist. display: contents keeps it from taking part in the
                layout of whatever the manager was placed inside. */}
            <div ref={setPortalContainer} data-popout-portal-container style={{ display: "contents" }} />
        </PopoutManagerContext.Provider>
    );
}
