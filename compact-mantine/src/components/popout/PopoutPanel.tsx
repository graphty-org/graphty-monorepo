import { Box, Paper } from "@mantine/core";
import { type ReactPortal, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { PopoutPanelProps, PopoutPosition } from "../../types/popout";
import { useFloatingPanel } from "./hooks/useFloatingPanel";
import { usePopoutAnchorContext } from "./PopoutAnchor";
import { usePopoutContext, usePopoutManagerContext } from "./PopoutContext";
import { PopoutHeader } from "./PopoutHeader";
import { calculatePopoutPosition } from "./utils/position";

/**
 * The floating panel component that appears when the trigger is clicked.
 * Renders in a portal to avoid z-index and overflow issues.
 * Supports dragging via the header area.
 * @param props - Component props
 * @param props.width - The width of the panel in pixels
 * @param props.height - Optional height of the panel in pixels (for alignment calculations)
 * @param props.header - Header configuration for the panel
 * @param props.children - Content to display in the panel
 * @param props.anchorRef - Optional ref to anchor element for positioning (defaults to trigger)
 * @param props.placement - Placement relative to anchor: left, right, top, bottom (default: left)
 * @param props.alignment - Alignment along placement axis: start, center, end (default: start)
 * @param props.gap - Gap between panel and anchor in pixels (default: 0 for pixel-perfect alignment)
 * @param props.actions - Action buttons to display in the header
 * @returns The PopoutPanel component or null when closed
 */
export function PopoutPanel({
    width,
    height,
    header,
    children,
    anchorRef,
    placement = "left",
    alignment = "start",
    gap = 0,
    actions,
}: PopoutPanelProps): ReactPortal | null {
    const { isOpen, close, triggerRef, id, parentId } = usePopoutContext();
    // Including zIndexVersion in destructuring ensures re-render when z-index stack changes
    const { getZIndex, portalContainer, register, unregister, bringToFront, zIndexVersion, closeWithDescendants, closeDescendants } = usePopoutManagerContext();
    // Reference zIndexVersion to prevent "unused variable" warning while still subscribing to changes
    void zIndexVersion;
    // Get anchor context if available (from PopoutAnchor wrapper)
    const anchorContext = usePopoutAnchorContext();

    // Generate unique IDs for ARIA attributes
    const uniqueId = useId();
    const panelId = `popout-panel-${id}`;
    const titleId = `popout-title-${uniqueId}`;

    // Track the initial position (calculated from trigger)
    const [initialPosition, setInitialPosition] = useState<PopoutPosition | null>(null);

    // Track previous open state to detect reopening
    const prevOpenRef = useRef(false);

    // Ref for the panel element to manage focus
    const panelRef = useRef<HTMLDivElement>(null);

    // Handler for drag start - brings panel to front
    const handleDragStart = useCallback(() => {
        bringToFront(id);
    }, [bringToFront, id]);

    // Use the floating panel hook for drag behavior
    const { dragTriggerProps, dragOffset, resetDragOffset } = useFloatingPanel({
        isOpen,
        onDragStart: handleDragStart,
    });

    // Tab state management for tabbed headers
    const isTabs = header.variant === "tabs";
    const tabsConfig = isTabs ? header : null;
    const defaultTabId = tabsConfig?.defaultTab ?? tabsConfig?.tabs[0]?.id;
    const [activeTab, setActiveTab] = useState<string | undefined>(defaultTabId);

    // Handler for tab changes - memoized to avoid recreating on each render
    const handleTabChange = useCallback(
        (tabId: string) => {
            setActiveTab(tabId);
            tabsConfig?.onTabChange?.(tabId);
        },
        [tabsConfig],
    );

    // Handler for panel click - close descendants and bring panel to front
    const handlePanelClick = useCallback(
        (event: React.MouseEvent) => {
            // Stop propagation to prevent parent panels from also handling this click
            event.stopPropagation();
            // Close any open child/descendant popouts (clicking on parent = clicking "outside" children)
            closeDescendants(id);
            bringToFront(id);
        },
        [closeDescendants, bringToFront, id],
    );

    // Create a close handler that also closes descendants
    const closeWithChildren = useCallback(() => {
        closeWithDescendants(id);
    }, [closeWithDescendants, id]);

    // Register/unregister panel with manager when open state changes
    useEffect(() => {
        if (isOpen) {
            register(id, close, parentId);
        } else {
            unregister(id);
        }

        return () => {
            // Cleanup on unmount
            unregister(id);
        };
    }, [isOpen, id, register, unregister, close, parentId]);

    // Calculate initial position when panel opens and reset drag offset on reopen
    useEffect(() => {
        if (isOpen) {
            // Determine anchor element (in priority order):
            // 1. Use explicit anchorRef if provided
            // 2. Use PopoutAnchor context if available (for sidebar/container alignment)
            // 3. For nested popouts (parentId set), use parent panel element
            // 4. Fall back to triggerRef
            let anchorElement: HTMLElement | null = anchorRef?.current ?? null;

            if (!anchorElement && anchorContext?.anchorRef.current) {
                // Use anchor from PopoutAnchor context
                anchorElement = anchorContext.anchorRef.current;
            }

            if (!anchorElement && parentId) {
                // For nested popouts, anchor to the parent panel's edge
                anchorElement = document.querySelector(`[data-popout-id="${parentId}"]`);
            }

            if (!anchorElement) {
                anchorElement = triggerRef.current;
            }

            if (anchorElement) {
                const anchorRect = anchorElement.getBoundingClientRect();
                const newPosition = calculatePopoutPosition(anchorRect, width, gap, {
                    placement,
                    alignment,
                    panelHeight: height,
                });
                setInitialPosition(newPosition);

                // Reset drag offset when reopening (was closed, now open)
                if (!prevOpenRef.current) {
                    resetDragOffset();
                    // Also reset tab state to default on reopen (R8 requirement)
                    if (isTabs) {
                        setActiveTab(defaultTabId);
                    }
                }
            }
        }
        prevOpenRef.current = isOpen;
    }, [isOpen, width, height, gap, triggerRef, anchorRef, placement, alignment, resetDragOffset, isTabs, defaultTabId, parentId, anchorContext]);

    // Focus management: move focus to panel on open, return to trigger on close
    useEffect(() => {
        if (isOpen && panelRef.current) {
            // Small timeout to ensure portal is rendered
            const timer = setTimeout(() => {
                panelRef.current?.focus();
            }, 0);
            return () => {
                clearTimeout(timer);
            };
        } else if (!isOpen && triggerRef.current) {
            // Return focus to trigger when panel closes
            triggerRef.current.focus();
        }
        return undefined;
    }, [isOpen, triggerRef]);

    // Don't render until we have a position and portal container
    if (!isOpen || !portalContainer || !initialPosition) {
        return null;
    }

    const zIndex = getZIndex(id);

    // Final position = initial position + drag offset
    const finalPosition: PopoutPosition = {
        left: initialPosition.left + dragOffset.left,
        top: initialPosition.top + dragOffset.top,
    };

    // Border styling - all popouts have full borders on all sides and rounded corners
    const borderColor = "light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.12))";
    const borderStyle = `1px solid ${borderColor}`;

    // Figma + Radix-inspired panel styling:
    // - Adaptive shadows: lighter in light mode, darker in dark mode (like Radix)
    // - Uses light-dark() CSS function for automatic color scheme adaptation
    // - 8px corner radius on all corners
    // - Full borders on all sides
    // - minWidth for flexible sizing (content can expand the panel)
    const panel = (
        <Paper
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            tabIndex={-1}
            radius={8}
            onClick={handlePanelClick}
            data-popout-id={id}
            {...(parentId && { "data-parent-id": parentId })}
            style={{
                position: "fixed",
                left: finalPosition.left,
                top: finalPosition.top,
                minWidth: width,
                ...(height !== undefined && { minHeight: height }),
                zIndex,
                backgroundColor: "var(--mantine-color-body)",
                border: borderStyle,
                // Figma-style shadows: tight, hard near edges, softer further out
                boxShadow: [
                    "0 1px 2px light-dark(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.4))", // Hard close shadow
                    "0 4px 8px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.35))", // Medium shadow
                    "0 8px 16px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.25))", // Soft far shadow
                ].join(", "),
                // Focus outline for keyboard navigation
                outline: "none",
            }}
        >
            <PopoutHeader
                config={header}
                onClose={closeWithChildren}
                dragTriggerProps={dragTriggerProps}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                actions={actions}
                titleId={titleId}
            />
            <Box>
                {isTabs
                    ? tabsConfig?.tabs.find((tab) => tab.id === activeTab)?.content
                    : children}
            </Box>
        </Paper>
    );

    // Render in a portal at the manager's container
    return createPortal(panel, portalContainer);
}
