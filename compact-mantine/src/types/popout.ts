import type { ReactNode } from "react";

/**
 * Header configuration for Popout panel.
 * Phase 1 supports "title" variant only. "tabs" variant added in Phase 3.
 */
export interface PopoutHeaderConfig {
    /** Header variant - title shows a simple text header */
    variant: "title";
    /** Title text displayed in the header */
    title: string;
}

/**
 * Props for the PopoutPanel component.
 */
export interface PopoutPanelProps {
    /** Width of the panel in pixels */
    width: number;
    /** Header configuration */
    header: PopoutHeaderConfig;
    /** Panel content */
    children: ReactNode;
}

/**
 * Props for the PopoutTrigger component.
 */
export interface PopoutTriggerProps {
    /** Trigger element (typically a button or icon) */
    children: ReactNode;
}

/**
 * Props for the PopoutContent component.
 */
export interface PopoutContentProps {
    /** Content to display in the panel */
    children: ReactNode;
}

/**
 * Props for the PopoutHeader component.
 */
export interface PopoutHeaderProps {
    /** Header configuration */
    config: PopoutHeaderConfig;
    /** Called when close button is clicked */
    onClose: () => void;
}

/**
 * Position for a popout panel relative to its trigger.
 */
export interface PopoutPosition {
    /** Left position in pixels */
    left: number;
    /** Top position in pixels */
    top: number;
}

/**
 * Context value for a single Popout instance.
 */
export interface PopoutContextValue {
    /** Unique identifier for this popout */
    id: string;
    /** Whether the panel is currently open */
    isOpen: boolean;
    /** Opens the panel */
    open: () => void;
    /** Closes the panel */
    close: () => void;
    /** Toggles the panel open/closed */
    toggle: () => void;
    /** Reference to the trigger element for positioning */
    triggerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Context value for the PopoutManager.
 */
export interface PopoutManagerContextValue {
    /** Register a popout with the manager */
    register: (id: string) => void;
    /** Unregister a popout from the manager */
    unregister: (id: string) => void;
    /** Get the current z-index for a popout */
    getZIndex: (id: string) => number;
    /** Container element for portals - avoids assuming document.body */
    portalContainer: HTMLElement | null;
}
