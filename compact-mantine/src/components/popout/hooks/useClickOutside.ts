import { useEffect } from "react";

/**
 * Mantine floating elements a press in which never closes a pop-out: a menu item, a tooltip.
 */
const MANTINE_FLOATING_SELECTORS = ["[data-menu-dropdown]", "[data-tooltip]"].join(", ");

/** An overlay surface: a dialog (a Mantine Modal or Drawer, an app's own) or a Mantine portal. */
const OVERLAY_SELECTOR = '[role="dialog"], [data-portal]';

/**
 * Whether the overlay a press landed in hosts an open pop-out: it holds the trigger of one, so the
 * pop-out was opened from inside it and a press on its empty space is outside the pop-out. An
 * overlay that holds no open trigger was opened over the pop-out -- a portalled Select dropdown, a
 * confirm Modal opened from a panel row -- and a press in it is inside.
 *
 * Mantine portals every overlay into one shared portal node, so a press under a portal node is
 * judged by the portal child it lies in (the Select's dropdown, not the Modal beside it).
 * @param target - What the press landed on
 * @param overlay - The nearest overlay surface around it
 * @returns True when that overlay hosts an open pop-out
 */
function hostsOpenPopout(target: Element, overlay: Element): boolean {
    let surface = target;
    if (overlay.matches("[data-portal]")) {
        while (surface.parentElement !== null && surface.parentElement !== overlay) {
            surface = surface.parentElement;
        }
    } else {
        surface = overlay;
    }
    return surface.querySelector('[data-popout-trigger][aria-expanded="true"]') !== null;
}

/**
 * Hook that calls a callback when clicking outside of any registered popout panels.
 * Uses data attributes to identify popout panels and their related elements.
 *
 * A click on an element marked `data-popout-keep` (or inside one) is not outside either.
 *
 * A press in an overlay opened over a pop-out (a portalled Select dropdown, a Menu, a Tooltip, a
 * confirm Modal) is not outside, so a reader can use form controls inside a panel. A press on the
 * empty space of the dialog or Modal that hosts the pop-out is outside and closes it, as in Figma.
 * @param callback - Function to call when clicking outside all popouts
 * @param enabled - Whether the listener should be active (default: true)
 */
export function useClickOutside(callback: () => void, enabled = true): void {
    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const handlePress = (event: MouseEvent): void => {
            const target = event.target as HTMLElement;

            // A press inside any pop-out panel (this manager's or a nested one's) is inside. Only
            // the panel itself counts: a dialog that merely hosts the pop-out, such as a full-screen
            // modal it was opened in, does not.
            if (target.closest("[data-popout-id]")) {
                return;
            }

            // Check if the click is on a trigger element
            // The trigger has data-popout-trigger attribute set by PopoutTrigger
            const clickedTrigger = target.closest("[data-popout-trigger]");
            if (clickedTrigger) {
                // Click is on a trigger, let the trigger handle it
                return;
            }

            // Check if the click is inside the portal container
            const clickedPortalContainer = target.closest("[data-popout-portal-container]");
            if (clickedPortalContainer) {
                // Click is in the portal container area but not on a panel,
                // this could be on empty space in the container
                return;
            }

            // A control that acts on what an open pop-out edits (an app's Undo and Redo) marks
            // itself with data-popout-keep: pressing it leaves the pop-outs open, so the reader
            // sees the change in the pop-out it was made in.
            if (target.closest("[data-popout-keep]")) {
                return;
            }

            // A menu item or tooltip, portalled outside the pop-out's DOM tree, is inside.
            if (target.closest(MANTINE_FLOATING_SELECTORS)) {
                return;
            }

            // An overlay opened over the pop-out (a portalled dropdown, a confirm Modal) is inside;
            // the overlay that hosts the pop-out is not.
            const overlay = target.closest(OVERLAY_SELECTOR);
            if (overlay && !hostsOpenPopout(target, overlay)) {
                return;
            }

            // Click is outside all popouts and triggers, close
            callback();
        };

        // A mouse or pen press is read at pointerdown: a control that cancels it (Mantine's
        // ScrollArea scrollbar does, so a drag selects no text) leaves no mousedown behind, and
        // pressing such a scrollbar outside the pop-out must still close it. A touch is read at its
        // mousedown, which a tap sends and a swipe that scrolls does not. Both run before click, so
        // the trigger's own toggle never races this.
        let pressHandled = false;
        const handlePointerDown = (event: PointerEvent): void => {
            pressHandled = event.pointerType !== "touch";
            if (pressHandled) {
                handlePress(event);
            }
        };
        const handleMouseDown = (event: MouseEvent): void => {
            if (pressHandled) {
                pressHandled = false;
                return;
            }
            handlePress(event);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("mousedown", handleMouseDown);

        return (): void => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [callback, enabled]);
}
