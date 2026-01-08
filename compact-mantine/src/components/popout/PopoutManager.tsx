import type { JSX, ReactNode } from "react";

import { PopoutManagerProvider } from "./PopoutContext";

/**
 * Props for PopoutManager.
 */
interface PopoutManagerProps {
    /** Child components that may contain Popout instances */
    children: ReactNode;
}

/**
 * Manages coordination between multiple Popout instances.
 * Provides context for z-index management, click-outside handling,
 * Escape key behavior, and hierarchy tracking (Phase 6).
 * @param props - Component props
 * @param props.children - Child components that may contain Popout instances
 * @returns The PopoutManager component
 */
export function PopoutManager({ children }: PopoutManagerProps): JSX.Element {
    return <PopoutManagerProvider>{children}</PopoutManagerProvider>;
}
