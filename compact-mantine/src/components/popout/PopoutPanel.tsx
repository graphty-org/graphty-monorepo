import { Box, Paper } from "@mantine/core";
import { useIsomorphicEffect } from "@mantine/hooks";
import {
    type ReactPortal,
    type RefObject,
    type SyntheticEvent,
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";

import { POPOUT_NESTED_GAP } from "../../constants/popout";
import type { PopoutPanelProps, PopoutPosition } from "../../types/popout";
import { useDirection } from "../../utils/rtl";
import { useFloatingPanel } from "./hooks/useFloatingPanel";
import { usePopoutAnchorContext } from "./PopoutAnchor";
import { usePopoutContext, usePopoutManagerContext } from "./PopoutContext";
import { PopoutHeader } from "./PopoutHeader";
import { findPanelElement, type PopoutAnchorElements, resolveAnchorElement } from "./utils/anchor";
import { calculatePopoutPosition, resolvePlacement } from "./utils/position";

// Accessibility: the APG "Dialog (Modal)" pattern, made non-modal -- role
// dialog with aria-modal="false", an accessible name from the header title (or
// from the label prop when there is no header), focus moved into the panel on
// open and back to the trigger on close, and Escape handled by the manager so
// the innermost panel closes first. The panel deliberately does not trap focus:
// it is a floating inspector, and the page behind it stays usable.
//
// The panel does not set outline: none. The theme's focus ring is the library's
// only focus indicator (WCAG 2.4.7), and suppressing it here would put this one
// component back below AA.

/**
 * The floating panel that appears when the pop-out's trigger is activated.
 *
 * Renders into a portal so it is never clipped by an ancestor's overflow, and
 * positions itself against two anchors that are chosen independently: `anchorX`
 * decides which edge it lines up with, `anchorY` how far down it opens. The
 * position is measured from the box the panel actually renders at, so a panel
 * that content has widened still meets the edge it is aligned to instead of
 * growing over it.
 *
 * The panel follows what it is anchored to: it re-positions when that element
 * moves or is resized -- which is how a nested panel stays attached to the panel
 * it opened from while that one is dragged -- and when the window is resized or
 * scrolled. Once the person has dragged the panel themselves, it stays where
 * they put it and only keeps following the panel it opened from.
 * @param props - Component props
 * @param props.width - The panel's minimum width in pixels; content may widen it
 * @param props.height - Optional height of the panel in pixels
 * @param props.header - The panel's title or tab strip, which is also its drag handle
 * @param props.label - The panel's accessible name, used when it has no header
 * @param props.children - Content to display in the panel
 * @param props.anchorRef - Superseded by anchorX and anchorY; aligns both axes to one element
 * @param props.anchorX - What the panel's horizontal position lines up with
 * @param props.anchorY - What the panel's vertical position lines up with
 * @param props.placement - Which side of the anchor the panel sits on
 * @param props.alignment - Alignment along the axis the panel is placed against
 * @param props.gap - Gap between the panel and the anchor in pixels; negative values overlap them
 * @param props.actions - Action buttons to display in the header
 * @param props.manageFocus - Whether opening the panel moves focus into it and closing returns it
 * @param props.onDragStart - Called when the person starts dragging the panel
 * @param props.onDrag - Called on every movement of a drag, with the offset from where the panel opened
 * @param props.onDragEnd - Called when the drag finishes
 * @returns The panel, rendered into the manager's portal, or null when closed
 */
export function PopoutPanel(props: PopoutPanelProps): ReactPortal | null {
    const {
        width,
        height,
        header,
        label,
        children,
        anchorX,
        anchorY,
        placement = "left",
        alignment = "start",
        gap,
        actions,
        manageFocus = true,
        onDragStart,
        onDrag,
        onDragEnd,
    } = props;

    // The superseded anchorRef still works and still aligns both axes to one
    // element. It is read through a plain object type rather than destructured
    // by name, so that supporting it here does not itself count as using a
    // deprecated API.
    const legacyAnchorRef = (props as { anchorRef?: RefObject<HTMLElement | null> }).anchorRef;

    const {
        isOpen, close, triggerRef, id, parentId,
    } = usePopoutContext();
    // Including zIndexVersion in destructuring ensures re-render when z-index stack changes
    const {
        getZIndex, portalContainer, register, unregister, bringToFront, zIndexVersion, closeDescendants,
    } = usePopoutManagerContext();
    // Reference zIndexVersion to prevent "unused variable" warning while still subscribing to changes
    void zIndexVersion;
    // Get anchor context if available (from PopoutAnchor wrapper)
    const anchorContext = usePopoutAnchorContext();
    const direction = useDirection();

    // Generate unique IDs for ARIA attributes
    const uniqueId = useId();
    const panelId = `popout-panel-${id}`;
    const titleId = `popout-title-${uniqueId}`;

    // Where the panel sits before any dragging. Null means "not measured yet",
    // and is set back to null on close so a reopen never paints one frame at
    // the position the panel had last time.
    const [position, setPosition] = useState<PopoutPosition | null>(null);

    // Whether the panel was open on the previous commit, which is what
    // distinguishes a reopen from the first render.
    const openedBeforeRef = useRef(false);

    // Ref for the panel element, used both to measure it and to manage focus
    const panelRef = useRef<HTMLDivElement>(null);

    // A press on the header raises the panel, whether or not it becomes a drag.
    const handlePress = useCallback(() => {
        bringToFront(id);
    }, [bringToFront, id]);

    // Use the floating panel hook for drag behavior
    const {
        dragTriggerProps, dragOffset, resetDragOffset, hasDragged, consumeDragClick,
    } = useFloatingPanel({
        isOpen,
        onPress: handlePress,
        onDragStart,
        onDrag,
        onDragEnd,
    });

    // Tab state management for tabbed headers
    const isTabs = header?.variant === "tabs";
    const tabsConfig = header?.variant === "tabs" ? header : null;
    const defaultTabId = tabsConfig?.defaultTab ?? tabsConfig?.tabs[0]?.id;
    const [activeTab, setActiveTab] = useState<string | undefined>(defaultTabId);

    // A panel opened from inside another panel steps out by the nested gap, so
    // a stack of them reads as a stack.
    const effectiveGap = gap ?? (parentId === null ? 0 : POPOUT_NESTED_GAP);

    // The panel holds the selection and reports it, value first with the event
    // second, which is the shape every change in this package takes.
    const handleTabChange = useCallback(
        (tabId: string, event?: React.SyntheticEvent) => {
            setActiveTab(tabId);
            tabsConfig?.onTabChange?.(tabId, event);
        },
        [tabsConfig],
    );

    // Handler for panel click - close descendants and bring panel to front
    const handlePanelClick = useCallback(
        (event: React.MouseEvent) => {
            // Stop propagation to prevent parent panels from also handling this click
            event.stopPropagation();
            bringToFront(id);
            // Releasing the pointer at the end of a drag produces a click. That
            // click is part of the drag, not a click on the panel, so it must
            // not close what the panel opened.
            if (consumeDragClick()) {
                return;
            }
            // Close any open child/descendant popouts (clicking on parent = clicking "outside" children)
            closeDescendants(id);
        },
        [closeDescendants, bringToFront, consumeDragClick, id],
    );

    // Close this panel and everything opened from it, deepest first, carrying
    // the event so a controlled consumer can see what caused the close.
    const closeWithChildren = useCallback(
        (event?: SyntheticEvent) => {
            closeDescendants(id);
            close(event);
        },
        [closeDescendants, close, id],
    );

    // The manager is handed a close callback that never changes identity, and
    // reads the current one through a ref. Registration would otherwise be torn
    // down and rebuilt whenever the callback changed, and since unregistering
    // re-renders every panel, a callback that changed on every render would spin
    // forever.
    const closeRef = useRef(close);
    useEffect(() => {
        closeRef.current = close;
    });
    const closeForManager = useCallback(() => {
        closeRef.current();
    }, []);

    // Register/unregister panel with manager when open state changes
    useEffect(() => {
        if (isOpen) {
            register(id, closeForManager, parentId);
        } else {
            unregister(id);
        }

        return () => {
            // Cleanup on unmount
            unregister(id);
        };
    }, [isOpen, id, register, unregister, closeForManager, parentId]);

    // Which elements the two axes line up with, resolved fresh on every
    // measurement because a parent panel only exists in the DOM while it is open.
    const resolveAnchors = useCallback((): { inline: HTMLElement | null; block: HTMLElement | null } => {
        const elements: PopoutAnchorElements = {
            trigger: triggerRef.current,
            parent: findPanelElement(parentId),
            panel: anchorContext?.anchorRef.current ?? null,
            explicit: legacyAnchorRef?.current ?? null,
        };

        return {
            inline: resolveAnchorElement(anchorX, "x", elements),
            block: resolveAnchorElement(anchorY, "y", elements),
        };
    }, [triggerRef, parentId, anchorContext, legacyAnchorRef, anchorX, anchorY]);

    const updatePosition = useCallback((): void => {
        const { inline, block } = resolveAnchors();
        const inlineAnchor = inline ?? block;
        const blockAnchor = block ?? inline;

        if (!inlineAnchor || !blockAnchor) {
            return;
        }

        // Measure the box the panel actually renders at. `width` is a minimum,
        // so a panel that content has widened would otherwise be positioned as
        // if it were still the declared width and would grow over its anchor.
        const measured = panelRef.current?.getBoundingClientRect();
        const renderedWidth = Math.max(width, measured?.width ?? 0);
        const renderedHeight = Math.max(height ?? 0, measured?.height ?? 0);

        const physicalPlacement = resolvePlacement(placement, direction);
        const isBlockPlacement = physicalPlacement === "top" || physicalPlacement === "bottom";
        const placementAnchor = isBlockPlacement ? blockAnchor : inlineAnchor;
        const crossAnchor = isBlockPlacement ? inlineAnchor : blockAnchor;

        const next = calculatePopoutPosition(
            placementAnchor.getBoundingClientRect(),
            renderedWidth,
            effectiveGap,
            {
                placement: physicalPlacement,
                alignment,
                panelHeight: renderedHeight,
                crossAnchorRect: crossAnchor.getBoundingClientRect(),
                direction,
            },
        );

        setPosition((previous) => {
            if (previous && previous.left === next.left && previous.top === next.top) {
                return previous;
            }
            return next;
        });
    }, [resolveAnchors, width, height, placement, alignment, effectiveGap, direction]);

    // Position the panel before the browser paints. useIsomorphicEffect is
    // useLayoutEffect in a browser and useEffect on a server, so the measure and
    // correct happen in the same frame the panel first appears in -- with a
    // passive effect the panel painted once at the wrong place first.
    useIsomorphicEffect(() => {
        if (!isOpen) {
            setPosition(null);
            return;
        }

        if (!openedBeforeRef.current) {
            // Reopening starts from the anchor again rather than from wherever
            // the panel was last dragged to, and on the first tab.
            resetDragOffset();
            if (isTabs) {
                setActiveTab(defaultTabId);
            }
        }

        updatePosition();
    }, [isOpen, updatePosition, resetDragOffset, isTabs, defaultTabId]);

    // Keep the panel attached to what it is anchored to.
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        // Coalesce every source into one measurement per frame.
        let frame = 0;
        const schedule = (): void => {
            if (frame !== 0) {
                return;
            }
            frame = requestAnimationFrame(() => {
                frame = 0;
                updatePosition();
            });
        };

        const resizeObserver = new ResizeObserver(schedule);
        // A panel that is dragged reports its new place by changing its inline
        // style; nothing else tells a child that its parent has moved.
        const moveObserver = new MutationObserver(schedule);

        const { inline, block } = resolveAnchors();
        for (const element of new Set([inline, block].filter((el): el is HTMLElement => el !== null))) {
            resizeObserver.observe(element);
            moveObserver.observe(element, { attributes: true, attributeFilter: ["style", "class"] });
        }

        // The panel's own size decides where its inline edge falls.
        if (panelRef.current) {
            resizeObserver.observe(panelRef.current);
        }

        const handleViewportChange = (): void => {
            // A panel the person has deliberately dragged stays where they put
            // it; only a change to what it is anchored to still moves it.
            if (hasDragged) {
                return;
            }
            schedule();
        };

        window.addEventListener("resize", handleViewportChange);
        window.addEventListener("scroll", handleViewportChange, true);

        return () => {
            if (frame !== 0) {
                cancelAnimationFrame(frame);
            }
            resizeObserver.disconnect();
            moveObserver.disconnect();
            window.removeEventListener("resize", handleViewportChange);
            window.removeEventListener("scroll", handleViewportChange, true);
        };
    }, [isOpen, updatePosition, resolveAnchors, hasDragged]);

    // Focus management: move focus to panel on open, return to trigger on close.
    useEffect(() => {
        if (!manageFocus) {
            return undefined;
        }

        if (isOpen) {
            // Small timeout to ensure portal is rendered
            const timer = setTimeout(() => {
                panelRef.current?.focus();
            }, 0);
            return () => {
                clearTimeout(timer);
            };
        }

        // Only give focus back if this panel had it. Without the guard every
        // closed pop-out on the page focuses its own trigger on first render,
        // and whichever renders last steals the page's focus.
        if (openedBeforeRef.current) {
            triggerRef.current?.focus();
        }

        return undefined;
    }, [isOpen, manageFocus, triggerRef]);

    // Declared after the effects that read it, so they still see the previous
    // value on the commit that opens or closes the panel.
    useEffect(() => {
        openedBeforeRef.current = isOpen;
    }, [isOpen]);

    if (!isOpen || !portalContainer) {
        return null;
    }

    const zIndex = getZIndex(id);

    // Final position = initial position + drag offset
    const finalPosition: PopoutPosition = {
        left: (position?.left ?? 0) + dragOffset.left,
        top: (position?.top ?? 0) + dragOffset.top,
    };

    // Border styling - all popouts have full borders on all sides and rounded corners
    const borderColor = "light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.12))";
    const borderStyle = `1px solid ${borderColor}`;

    // Panel styling:
    // - adaptive shadows via light-dark(), lighter in light mode
    // - 8px corner radius and a full border on every side
    // - the declared width is a minimum, so content can widen the panel; the
    //   position is then computed from the width it renders at
    // - width: min-content with that minimum means prose wraps at the declared
    //   width while a child too wide to fit still widens the panel. Leaving the
    //   width to shrink-to-fit instead measured it against the space left on
    //   screen, so the same panel came out a different width depending on where
    //   it opened, and a paragraph ran out to a single long line.
    const panel = (
        <Paper
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={header ? titleId : undefined}
            aria-label={header ? undefined : label}
            tabIndex={-1}
            radius={8}
            onClick={handlePanelClick}
            data-testid="popout-panel"
            data-popout-id={id}
            {...(parentId && { "data-parent-id": parentId })}
            style={{
                position: "fixed",
                left: finalPosition.left,
                top: finalPosition.top,
                minWidth: width,
                width: "min-content",
                ...(height !== undefined && { minHeight: height }),
                // Hidden for the one commit between mounting and being measured,
                // so the panel is never seen at an unmeasured position.
                ...(position === null && { visibility: "hidden" as const }),
                zIndex,
                backgroundColor: "var(--mantine-color-body)",
                border: borderStyle,
                // Tight, hard near the edges and softer further out
                boxShadow: [
                    "0 1px 2px light-dark(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.4))",
                    "0 4px 8px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.35))",
                    "0 8px 16px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.25))",
                ].join(", "),
            }}
        >
            {header ? (
                <PopoutHeader
                    config={header}
                    onClose={closeWithChildren}
                    dragTriggerProps={dragTriggerProps}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    actions={actions}
                    titleId={titleId}
                />
            ) : null}
            <Box data-testid="popout-panel-content">
                {isTabs
                    ? tabsConfig?.tabs.find((tab) => tab.id === activeTab)?.content
                    : children}
            </Box>
        </Paper>
    );

    // Render in a portal at the manager's container
    return createPortal(panel, portalContainer);
}
