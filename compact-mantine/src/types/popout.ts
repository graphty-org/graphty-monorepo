import type { ReactNode, RefObject } from "react";

/**
 * Individual tab configuration for tabbed header variant.
 */
export interface PopoutTab {
    /** Unique identifier for the tab */
    id: string;
    /** Label displayed on the tab button */
    label: string;
    /** Content to display when this tab is active */
    content: ReactNode;
}

/**
 * Action button configuration for header actions.
 */
export interface PopoutHeaderAction {
    /** Unique identifier for the action */
    id: string;
    /** Icon element to display */
    icon: ReactNode;
    /** Accessible label for the action button */
    label: string;
    /** Callback when the action is clicked */
    onClick: () => void;
}

/**
 * Title header configuration.
 */
export interface PopoutTitleHeaderConfig {
    /** Header variant - title shows a simple text header */
    variant: "title";
    /** Title text displayed in the header */
    title: string;
}

/**
 * Tabbed header configuration.
 */
export interface PopoutTabbedHeaderConfig {
    /** Header variant - tabs shows a tabbed interface */
    variant: "tabs";
    /** Array of tab configurations */
    tabs: PopoutTab[];
    /** ID of the default active tab (defaults to first tab) */
    defaultTab?: string;
    /** Callback when tab changes */
    onTabChange?: (tabId: string) => void;
}

/**
 * Header configuration for Popout panel.
 * Supports "title" variant (simple text header) and "tabs" variant (tabbed interface).
 */
export type PopoutHeaderConfig = PopoutTitleHeaderConfig | PopoutTabbedHeaderConfig;

/**
 * Placement of the popout panel relative to the anchor element.
 */
export type PopoutPlacement = "left" | "right" | "top" | "bottom";

/**
 * Alignment of the popout panel along the placement axis.
 * - "start": Align to the start (top for left/right, left for top/bottom)
 * - "center": Center along the axis
 * - "end": Align to the end (bottom for left/right, right for top/bottom)
 */
export type PopoutAlignment = "start" | "center" | "end";

/**
 * Props for the PopoutPanel component.
 */
export interface PopoutPanelProps {
    /** Width of the panel in pixels */
    width: number;
    /** Height of the panel in pixels (optional, for top/bottom placement alignment) */
    height?: number;
    /** Header configuration */
    header: PopoutHeaderConfig;
    /** Panel content */
    children?: ReactNode;
    /**
     * Optional ref to an anchor element for positioning.
     * If not provided, the panel positions relative to the trigger.
     */
    anchorRef?: RefObject<HTMLElement | null>;
    /**
     * Placement of the panel relative to the anchor.
     * @default "left"
     */
    placement?: PopoutPlacement;
    /**
     * Alignment along the placement axis.
     * @default "start"
     */
    alignment?: PopoutAlignment;
    /**
     * Gap between the panel and anchor element in pixels.
     * Set to 0 for pixel-perfect edge alignment.
     * @default 0
     */
    gap?: number;
    /**
     * Action buttons to display in the header.
     */
    actions?: PopoutHeaderAction[];
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
    /** Props to apply to the drag handle area (Phase 2) */
    dragTriggerProps?: Record<string, unknown>;
    /** Action buttons to display in the header */
    actions?: PopoutHeaderAction[];
    /** Currently active tab ID (controlled by PopoutPanel for tabs variant) */
    activeTab?: string;
    /** Callback when active tab changes (controlled by PopoutPanel for tabs variant) */
    onTabChange?: (tabId: string) => void;
    /** ID for the title element (used for aria-labelledby) */
    titleId?: string;
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
    /** ID of the parent popout (if nested inside another popout) */
    parentId: string | null;
}

/**
 * Context value for the PopoutManager.
 */
export interface PopoutManagerContextValue {
    /** Register a popout with the manager, providing a close callback and optional parent ID */
    register: (id: string, closeCallback: () => void, parentId?: string | null) => void;
    /** Unregister a popout from the manager */
    unregister: (id: string) => void;
    /** Get the current z-index for a popout */
    getZIndex: (id: string) => number;
    /** Bring a popout to the front (highest z-index) */
    bringToFront: (id: string) => void;
    /** Container element for portals - avoids assuming document.body */
    portalContainer: HTMLElement | null;
    /** Version counter that changes when z-index stack changes, for triggering re-renders */
    zIndexVersion: number;
    /** Close the focused (topmost) popout */
    closeFocused: () => void;
    /** Close all open popouts */
    closeAll: () => void;
    /** Check if there are any open popouts */
    hasOpenPopouts: () => boolean;
    /** Close a specific popout and all its descendants */
    closeWithDescendants: (id: string) => void;
    /** Close only descendants of a popout (not the popout itself) */
    closeDescendants: (id: string) => void;
    /** Close all siblings of a popout (same parent or both root-level). Also closes their descendants. */
    closeSiblings: (id: string, parentId: string | null) => void;
    /** Get the parent ID of a popout (null if root-level) */
    getParentId: (id: string) => string | null;
    /** Check if a popout is an ancestor of another popout */
    isAncestor: (ancestorId: string, descendantId: string) => boolean;
}
