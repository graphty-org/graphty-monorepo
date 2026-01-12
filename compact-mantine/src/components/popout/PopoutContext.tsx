import {
    createContext,
    type JSX,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";

import { POPOUT_Z_INDEX_BASE } from "../../constants/popout";
import type { PopoutContextValue, PopoutManagerContextValue } from "../../types/popout";
import { useClickOutside } from "./hooks/useClickOutside";
import { useEscapeKey } from "./hooks/useEscapeKey";

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
 * Props for PopoutProvider.
 */
interface PopoutProviderProps {
    children: ReactNode;
    /** ID of the parent popout (if nested) */
    parentId?: string | null;
}

/**
 * Provider for individual Popout instance state.
 * Manages open/close state and trigger ref for a single popout.
 * Tracks parent ID for hierarchy management when nested.
 * @param props - Component props
 * @param props.children - Child components wrapped by the provider
 * @param props.parentId - ID of the parent popout if this is a nested popout
 * @returns The PopoutProvider component
 */
export function PopoutProvider({ children, parentId = null }: PopoutProviderProps): JSX.Element {
    const id = useId();
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLElement | null>(null);

    const value = useMemo<PopoutContextValue>(
        () => ({
            id,
            isOpen,
            open: () => {
                setIsOpen(true);
            },
            close: () => {
                setIsOpen(false);
            },
            toggle: () => {
                setIsOpen((prev) => !prev);
            },
            triggerRef,
            parentId,
        }),
        [id, isOpen, parentId],
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
 * Tracks parent-child hierarchy for cascading close behavior (Phase 6).
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
    // Counter that changes when z-index stack changes, for triggering re-renders in consumers
    const [zIndexVersion, setZIndexVersion] = useState(0);

    /**
     * Find all sibling popouts (popouts with the same parent)
     * @param targetParentId - The parent ID to match (null for root-level popouts)
     * @returns Array of sibling popout IDs
     */
    const findSiblings = useCallback((targetParentId: string | null): string[] => {
        const siblings: string[] = [];
        for (const id of zIndexStackRef.current) {
            const idParent = parentMapRef.current.get(id) ?? null;
            if (idParent === targetParentId) {
                siblings.push(id);
            }
        }
        return siblings;
    }, []);

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

    const register = useCallback((popoutId: string, closeCallback: () => void, parentId?: string | null) => {
        // Skip if already registered
        if (zIndexStackRef.current.includes(popoutId)) {
            return;
        }

        const normalizedParentId = parentId ?? null;

        // Find sibling popouts (exclusive behavior: only one sibling can be open)
        const siblings = findSiblings(normalizedParentId);

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
        setZIndexVersion((v) => v + 1);
    }, [findSiblings, findDescendantsInRegister, closePopoutsDepthFirst]);

    const unregister = useCallback((popoutId: string) => {
        zIndexStackRef.current = zIndexStackRef.current.filter((id) => id !== popoutId);
        closeCallbacksRef.current.delete(popoutId);
        parentMapRef.current.delete(popoutId);
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
        // Find all siblings (popouts with the same parent)
        const stack = zIndexStackRef.current;
        for (const id of stack) {
            if (id === popoutId) {continue;} // Don't close self
            const otherParent = parentMapRef.current.get(id);
            // Same parent (or both root-level with null parent)
            if (otherParent === parentId) {
                // Close sibling and its descendants
                closeWithDescendants(id);
            }
        }
    }, [closeWithDescendants]);

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
            <div ref={setPortalContainer} data-popout-portal-container />
        </PopoutManagerContext.Provider>
    );
}
