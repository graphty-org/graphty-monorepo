import {
    createContext,
    type JSX,
    type ReactNode,
    useContext,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";

import type { PopoutContextValue, PopoutManagerContextValue } from "../../types/popout";

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
 * @returns The PopoutContext value containing id, isOpen, open, close, toggle, and triggerRef
 */
export function usePopoutContext(): PopoutContextValue {
    const context = useContext(PopoutContext);
    if (!context) {
        throw new Error("usePopoutContext must be used within a Popout component");
    }
    return context;
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
}

/**
 * Provider for individual Popout instance state.
 * Manages open/close state and trigger ref for a single popout.
 * @param props - Component props
 * @param props.children - Child components wrapped by the provider
 * @returns The PopoutProvider component
 */
export function PopoutProvider({ children }: PopoutProviderProps): JSX.Element {
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
        }),
        [id, isOpen],
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
 * @param props - Component props
 * @param props.children - Child components wrapped by the provider
 * @returns The PopoutManagerProvider component
 */
export function PopoutManagerProvider({ children }: PopoutManagerProviderProps): JSX.Element {
    const [registeredPopouts] = useState<Set<string>>(new Set());
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    const value = useMemo<PopoutManagerContextValue>(
        () => ({
            register: (popoutId: string) => {
                registeredPopouts.add(popoutId);
            },
            unregister: (popoutId: string) => {
                registeredPopouts.delete(popoutId);
            },
            getZIndex: () => {
                // Phase 1: Simple z-index, will be enhanced in Phase 4
                return 1000;
            },
            portalContainer,
        }),
        [registeredPopouts, portalContainer],
    );

    return (
        <PopoutManagerContext.Provider value={value}>
            {children}
            <div ref={setPortalContainer} data-popout-portal-container />
        </PopoutManagerContext.Provider>
    );
}
