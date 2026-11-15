import { Box } from "@mantine/core";
import { useIsomorphicEffect } from "@mantine/hooks";
import {
    type KeyboardEvent,
    type ReactPortal,
    type SyntheticEvent,
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
} from "react";
import { createPortal, flushSync } from "react-dom";

import { POPOUT_NESTED_GAP } from "../../constants/popout";
import type { PopoutPanelProps, PopoutPosition } from "../../types/popout";
import { useDirection } from "../../utils/rtl";
import { capped, visualBand } from "../overlays/viewportCap";
import { useFloatingPanel } from "./hooks/useFloatingPanel";
import { usePopoutAnchorContext } from "./PopoutAnchor";
import { usePopoutContext, usePopoutManagerContext } from "./PopoutContext";
import { PopoutHeader } from "./PopoutHeader";
import { findPanelElement, type PopoutAnchorElements, resolveAnchorElement } from "./utils/anchor";
import { calculatePopoutPosition, measureContainingBlock, resolvePlacement } from "./utils/position";
import { tabId, tabPanelId } from "./utils/tabs";

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
//
// The look is Figma's light popover (design/figma-spec.md 8.4): the shared
// cm-popover-surface (--cm-bg, radius 13, --cm-elevation-400, no border) plus
// cm-popout for the panel's own layout, both in src/theme/css/overlays.css.ts.

/** How far a panel keeps off the window's bottom edge, in px (the overlays' viewport margin). */
const POPOUT_WINDOW_MARGIN = 6;

/** How far a contained panel keeps inside its anchor's edges, in px. */
const CONTAIN_INSET = 8;

/** Where a panel's top was last put, and the top of the row it was put beside. */
interface Placed {
    top: number;
    rowTop: number;
}

/**
 * Keeps a panel whole on screen, as Figma's popovers are. A panel beside its row that would pass
 * the window's bottom opens upward -- its bottom on the row's bottom -- when the room above holds
 * it; otherwise it moves up as far as it must, never above `boundaryTop`. Once placed beside a row
 * whose top has not moved since, it keeps its top: its own content, or the row's (a note the
 * change adds under it), growing or shrinking never re-places it.
 * @param next - The computed position, adjusted in place (viewport pixels)
 * @param size - The panel's rendered size
 * @param size.width - Its width
 * @param size.height - Its height
 * @param row - The rectangle the panel is aligned along
 * @param options - Whether the panel sits beside the row, the header boundary, the last placement,
 *   and the box it must stay across
 * @param options.within - The box the panel stays across (its anchor), or null for the window
 * @param options.beside - Whether the panel sits left or right of the row (not above or below)
 * @param options.boundaryTop - The highest the panel's top may sit
 * @param options.placed - Where the panel was last put, or null when it has just opened
 */
function fitInWindow(
    next: PopoutPosition,
    size: { width: number; height: number },
    row: DOMRect,
    options: { beside: boolean; boundaryTop: number; placed: Placed | null; within: DOMRect | null },
): void {
    const { beside, boundaryTop, placed, within } = options;
    // A margin off the bottom of the window, or of the visual viewport when an on-screen keyboard
    // or a zoom makes that shorter, so the last control is never drawn on its edge or under it.
    const maxTop = Math.min(window.innerHeight, visualBand().bottom) - POPOUT_WINDOW_MARGIN - size.height;
    if (beside && placed?.rowTop === row.top) {
        next.top = placed.top;
    } else if (beside && next.top > maxTop && row.bottom - size.height >= boundaryTop) {
        next.top = row.bottom - size.height;
    }
    next.top = Math.max(boundaryTop, Math.min(next.top, maxTop));
    const left = Math.max(0, within === null ? 0 : within.left + CONTAIN_INSET);
    const right = Math.min(window.innerWidth, within === null ? window.innerWidth : within.right - CONTAIN_INSET);
    next.left = Math.max(left, Math.min(next.left, right - size.width));
}

/** Everything that can take focus, before the checks `tabStops` makes. */
const FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex]";

/**
 * The Tab stops inside a container, in document order.
 * @param root - the container
 * @returns the stops
 */
function tabStops(root: ParentNode): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0,
    );
}

/**
 * Where Tab goes on leaving a panel: the stop after what opened it (Tab), or what opened it
 * (Shift+Tab) -- the order the page would have had if the panel sat beside its opener. The ends
 * of the page wrap.
 * @param origin - what opened the panel: its trigger, else the element it is anchored to
 * @param panel - the panel, whose own stops are passed over
 * @param back - Shift+Tab
 * @returns the element to focus, or undefined when the page has none
 */
function stopBeside(origin: HTMLElement, panel: HTMLElement, back: boolean): HTMLElement | undefined {
    const page = tabStops(document).filter((element) => !panel.contains(element));
    const after = (element: HTMLElement): boolean =>
        !origin.contains(element) && (origin.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    if (!back) {
        return page.find(after) ?? page[0];
    }
    if (page.includes(origin)) {
        return origin;
    }
    const before = page.filter((element) => !after(element));
    return before.at(-1) ?? page.at(-1);
}

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
 * @param props.anchorX - What the panel's horizontal position lines up with
 * @param props.anchorY - What the panel's vertical position lines up with
 * @param props.placement - Which side of the anchor the panel sits on
 * @param props.alignment - Alignment along the axis the panel is placed against
 * @param props.gap - Gap between the panel and the anchor in pixels; negative values overlap them
 * @param props.closeLabel - The close button's accessible name
 * @param props.actions - Action buttons to display in the header
 * @param props.manageFocus - Whether opening the panel moves focus into it and closing returns it
 * @param props.boundaryTop - The highest the panel's top may sit, in viewport pixels (below a header)
 * @param props.contained - Keep the panel across the Popout.Anchor around it, not only the window
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
        closeLabel,
        children,
        anchorX,
        anchorY,
        placement = "left",
        alignment = "start",
        gap,
        actions,
        manageFocus = true,
        boundaryTop = 0,
        contained = false,
        onDragStart,
        onDrag,
        onDragEnd,
    } = props;

    const { isOpen, close, triggerRef, id, parentId, region, exclusive = true } = usePopoutContext();
    // The context value is rebuilt whenever zIndexVersion changes, so this panel re-renders with
    // the z-index stack without reading it.
    const { getZIndex, portalContainer, register, unregister, bringToFront, closeDescendants } =
        usePopoutManagerContext();
    // Get anchor context if available (from PopoutAnchor wrapper)
    const anchorContext = usePopoutAnchorContext();
    const direction = useDirection();

    // Generate unique IDs for ARIA attributes
    const uniqueId = useId();
    const panelId = `popout-panel-${id}`;
    const titleId = `popout-title-${uniqueId}`;
    // The base id Mantine's Tabs derives each tab's id and aria-controls from,
    // shared with the tab panel below so the two point at each other.
    const tabsBaseId = `popout-tabs-${uniqueId}`;

    // Where the panel sits before any dragging. Null means "not measured yet",
    // and is set back to null on close so a reopen never paints one frame at
    // the position the panel had last time.
    const [position, setPosition] = useState<PopoutPosition | null>(null);
    // A contained panel narrows to fit inside its anchor; null until measured, or not contained.
    const [fitWidth, setFitWidth] = useState<number | null>(null);

    // Whether the panel was open on the previous commit, which is what
    // distinguishes a reopen from the first render.
    const openedBeforeRef = useRef(false);

    // Ref for the panel element, used both to measure it and to manage focus
    const panelRef = useRef<HTMLDivElement>(null);
    // An empty box at left 0, top 0 beside the panel: where it renders is the corner of the
    // frame the panel's left and top are measured in (see measureContainingBlock).
    const originRef = useRef<HTMLDivElement>(null);
    // Where the panel's top was last put, in viewport pixels, and the top of the row it was put
    // beside. While that top has not moved, a change in size (a switch that adds a row) keeps the
    // panel's top where it is, so an open panel never jumps under the pointer as its content grows.
    const placedRef = useRef<Placed | null>(null);

    // A press on the header raises the panel, whether or not it becomes a drag.
    const handlePress = useCallback(() => {
        bringToFront(id);
    }, [bringToFront, id]);

    // Use the floating panel hook for drag behavior
    const { dragTriggerProps, dragOffset, resetDragOffset, hasDragged, consumeDragClick } = useFloatingPanel({
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

    // Set when Tab leaves the panel: focus has already moved on, so closing does not take it back
    // to the trigger.
    const leftByTab = useRef(false);
    // The field a panel opened in when it is not the panel's first stop (data-autofocus), and every
    // stop focused since it opened: such a panel walks all its stops before Tab leaves it.
    const entryRef = useRef<HTMLElement | null>(null);
    const visitedRef = useRef(new Set<EventTarget>());

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
            register(id, closeForManager, parentId, region, exclusive);
        } else {
            unregister(id);
        }

        return () => {
            // Cleanup on unmount
            unregister(id);
        };
    }, [isOpen, id, register, unregister, closeForManager, parentId, region, exclusive]);

    // Which elements the two axes line up with, resolved fresh on every
    // measurement because a parent panel only exists in the DOM while it is open.
    const resolveAnchors = useCallback((): { inline: HTMLElement | null; block: HTMLElement | null } => {
        const elements: PopoutAnchorElements = {
            trigger: triggerRef.current,
            parent: findPanelElement(parentId),
            panel: anchorContext?.anchorRef.current ?? null,
        };

        return {
            inline: resolveAnchorElement(anchorX, "x", elements),
            block: resolveAnchorElement(anchorY, "y", elements),
        };
    }, [triggerRef, parentId, anchorContext, anchorX, anchorY]);

    // Tab past the panel's last stop (Shift+Tab before its first) closes it and moves on from
    // what opened it, as if the panel sat beside it in the page; a separator or the page itself
    // behind the panel never takes focus. Keys from a panel opened from this one reach here
    // through React; that panel handles its own.
    const handleTabOut = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            const panel = panelRef.current;
            if (
                event.key !== "Tab" ||
                event.defaultPrevented ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                panel === null ||
                !(event.target instanceof HTMLElement) ||
                !panel.contains(event.target)
            ) {
                return;
            }
            const stops = tabStops(panel);
            const edge = event.shiftKey ? (stops[0] ?? panel) : stops.at(-1);
            if (event.target !== edge && !(event.shiftKey && event.target === panel)) {
                return;
            }
            // Opened in its middle, a forward walk would never reach the stops above where it
            // started: past either end Tab wraps to the other end while a stop has not had focus.
            const entry = entryRef.current;
            if (entry !== null && entry !== stops[0] && stops.some((stop) => !visitedRef.current.has(stop))) {
                event.preventDefault();
                (event.shiftKey ? stops.at(-1) : stops[0])?.focus();
                return;
            }
            const { inline, block } = resolveAnchors();
            const origin = triggerRef.current ?? block ?? inline;
            const next = origin === null ? undefined : stopBeside(origin, panel, event.shiftKey);
            if (next === undefined) {
                return;
            }
            event.preventDefault();
            leftByTab.current = true;
            closeWithChildren(event);
            next.focus();
        },
        [resolveAnchors, triggerRef, closeWithChildren],
    );

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
        // The anchors are measured in viewport pixels, but left and top are applied in the
        // panel's containing block, which a transformed ancestor moves and scales.
        const frame = measureContainingBlock(originRef.current, panelRef.current);
        const within = contained ? (anchorContext?.anchorRef.current?.getBoundingClientRect() ?? null) : null;
        const room = within === null ? Infinity : within.width - 2 * CONTAIN_INSET;
        const narrowed = room < width * frame.scaleX;
        setFitWidth(narrowed ? room / frame.scaleX : null);
        // ponytail: a narrowed panel is placed at the width it fits in, so a child that cannot
        // wrap narrower than that runs past the inset; measure it here if one ever needs to.
        const renderedWidth = narrowed ? room : Math.max(width * frame.scaleX, measured?.width ?? 0);
        const renderedHeight = Math.max((height ?? 0) * frame.scaleY, measured?.height ?? 0);

        const physicalPlacement = resolvePlacement(placement, direction);
        const isBlockPlacement = physicalPlacement === "top" || physicalPlacement === "bottom";
        const placementAnchor = isBlockPlacement ? blockAnchor : inlineAnchor;
        const crossAnchor = isBlockPlacement ? inlineAnchor : blockAnchor;

        const next = calculatePopoutPosition(placementAnchor.getBoundingClientRect(), renderedWidth, effectiveGap, {
            placement: physicalPlacement,
            alignment,
            panelHeight: renderedHeight,
            crossAnchorRect: crossAnchor.getBoundingClientRect(),
            direction,
        });

        if (typeof window !== "undefined") {
            const row = crossAnchor.getBoundingClientRect();
            fitInWindow(next, { width: renderedWidth, height: renderedHeight }, row, {
                beside: !isBlockPlacement,
                boundaryTop,
                placed: placedRef.current,
                within,
            });
            placedRef.current = { top: next.top, rowTop: row.top };
        }

        // ponytail: the drag offset is still applied unscaled, so inside a scaled ancestor a
        // dragged panel moves by the scale times the pointer's travel; divide it by the frame's
        // scale if that matters.
        next.left = (next.left - frame.x) / frame.scaleX;
        next.top = (next.top - frame.y) / frame.scaleY;

        setPosition((previous) => {
            if (previous?.left === next.left && previous.top === next.top) {
                return previous;
            }
            return next;
        });
    }, [
        resolveAnchors,
        width,
        height,
        placement,
        alignment,
        effectiveGap,
        direction,
        boundaryTop,
        contained,
        anchorContext,
    ]);

    // Position the panel before the browser paints. useIsomorphicEffect is
    // useLayoutEffect in a browser and useEffect on a server, so the measure and
    // correct happen in the same frame the panel first appears in -- with a
    // passive effect the panel painted once at the wrong place first.
    useIsomorphicEffect(() => {
        if (!isOpen) {
            setPosition(null);
            placedRef.current = null;
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

        // Coalesce every source into one measurement per frame. While one is queued the panel
        // carries data-cm-repositioning, so a test or a screenshot can tell "has not moved yet"
        // from "will not move": its box stays the same until the frame runs. flushSync applies
        // the new place in that same frame, so the attribute goes when the panel has moved.
        let frame = 0;
        const schedule = (): void => {
            if (frame !== 0) {
                return;
            }
            panelRef.current?.setAttribute("data-cm-repositioning", "");
            frame = requestAnimationFrame(() => {
                frame = 0;
                flushSync(updatePosition);
                panelRef.current?.removeAttribute("data-cm-repositioning");
            });
        };

        const resizeObserver = new ResizeObserver(schedule);
        // A panel that is dragged reports its new place by changing its inline
        // style; nothing else tells a child that its parent has moved.
        const moveObserver = new MutationObserver(schedule);

        // A panel the person has deliberately dragged stays where they put it; only the panel it
        // opened from still moves it, so a nested stack stays attached while its parent is dragged.
        // A sidebar anchor, the trigger, the window, a scroll or a late font no longer does.
        const { inline, block } = resolveAnchors();
        const parent = hasDragged ? findPanelElement(parentId) : null;
        for (const element of new Set([inline, block].filter((el): el is HTMLElement => el !== null))) {
            if (hasDragged && element !== parent) {
                continue;
            }
            resizeObserver.observe(element);
            moveObserver.observe(element, { attributes: true, attributeFilter: ["style", "class"] });
        }

        const fonts = typeof document !== "undefined" ? document.fonts : undefined;
        if (!hasDragged) {
            // The panel's own size decides where its inline edge falls.
            if (panelRef.current) {
                resizeObserver.observe(panelRef.current);
            }
            window.addEventListener("resize", schedule);
            window.addEventListener("scroll", schedule, true);
            // A web font that finishes loading after the panel opened reflows the text beside its
            // anchor ("Resolution" before an InfoCircle), which moves the anchor without resizing
            // it, so neither observer fires and the panel stayed where the fallback font put it.
            fonts?.addEventListener("loadingdone", schedule);
        }

        return () => {
            if (frame !== 0) {
                cancelAnimationFrame(frame);
            }
            panelRef.current?.removeAttribute("data-cm-repositioning");
            resizeObserver.disconnect();
            moveObserver.disconnect();
            window.removeEventListener("resize", schedule);
            window.removeEventListener("scroll", schedule, true);
            fonts?.removeEventListener("loadingdone", schedule);
        };
    }, [isOpen, updatePosition, resolveAnchors, hasDragged, parentId]);

    // Focus management: move focus to panel on open, return to trigger on close.
    useEffect(() => {
        if (!manageFocus) {
            return undefined;
        }

        if (isOpen) {
            leftByTab.current = false;
            // Small timeout to ensure portal is rendered. A field marked
            // data-autofocus (Mantine's convention) takes focus instead of the
            // panel, which is how a settings panel starts in its first field.
            const timer = setTimeout(() => {
                const field = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? null;
                visitedRef.current = new Set();
                entryRef.current = field;
                (field ?? panelRef.current)?.focus();
            }, 0);
            return () => {
                clearTimeout(timer);
            };
        }

        // Only give focus back if this panel had it. Without the guard every
        // closed pop-out on the page focuses its own trigger on first render,
        // and whichever renders last steals the page's focus.
        if (openedBeforeRef.current && !leftByTab.current) {
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

    // The declared width is a minimum, so content can widen the panel; the
    // position is then computed from the width it renders at. width:
    // min-content with that minimum means prose wraps at the declared width
    // while a child too wide to fit still widens the panel. Leaving the width to
    // shrink-to-fit instead measured it against the space left on screen, so
    // the same panel came out a different width depending on where it opened.
    const panel = (
        <Box
            ref={panelRef}
            className="cm-popover-surface cm-popout"
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={header ? titleId : undefined}
            aria-label={header ? undefined : label}
            tabIndex={-1}
            onClick={handlePanelClick}
            onKeyDown={handleTabOut}
            onFocus={(event) => {
                visitedRef.current.add(event.target);
            }}
            data-testid="popout-panel"
            data-popout-id={id}
            {...(parentId && { "data-parent-id": parentId })}
            style={{
                position: "fixed",
                left: finalPosition.left,
                top: finalPosition.top,
                minWidth: fitWidth ?? width,
                width: "min-content",
                ...(height !== undefined && { minHeight: height }),
                ...(boundaryTop > 0 && {
                    maxHeight: capped(`calc(100vh - ${String(boundaryTop + POPOUT_WINDOW_MARGIN)}px)`),
                }),
                // Hidden for the one commit between mounting and being measured,
                // so the panel is never seen at an unmeasured position.
                ...(position === null && { visibility: "hidden" as const }),
                zIndex,
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
                    closeLabel={closeLabel}
                    titleId={titleId}
                    tabsId={tabsBaseId}
                />
            ) : null}
            {isTabs ? (
                <Box
                    className="cm-popout-body"
                    data-testid="popout-panel-content"
                    role="tabpanel"
                    id={tabPanelId(tabsBaseId, activeTab)}
                    aria-labelledby={tabId(tabsBaseId, activeTab)}
                >
                    {tabsConfig?.tabs.find((tab) => tab.id === activeTab)?.content}
                </Box>
            ) : (
                <Box className="cm-popout-body" data-testid="popout-panel-content">
                    {children}
                </Box>
            )}
        </Box>
    );

    // Render in a portal at the manager's container
    return createPortal(
        <>
            <div ref={originRef} aria-hidden="true" style={{ position: "fixed", left: 0, top: 0 }} />
            {panel}
        </>,
        portalContainer,
    );
}
