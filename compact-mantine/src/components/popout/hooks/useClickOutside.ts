import { useEffect } from "react";

/**
 * Selectors for Mantine floating UI elements that are rendered in portals.
 * Clicks on these elements should not be treated as clicks outside the popout.
 */
const MANTINE_FLOATING_SELECTORS = [
    // Mantine portal containers
    "[data-portal]",
    // Combobox/Select dropdowns
    "[data-combobox-dropdown]",
    // Menu dropdowns
    "[data-menu-dropdown]",
    // Popover dropdowns
    "[data-popover-dropdown]",
    // Tooltip content
    "[data-tooltip]",
    // HoverCard dropdown
    "[data-hovercard-dropdown]",
    // DatePicker dropdowns
    "[data-dates-dropdown]",
    // Modal (just in case)
    "[data-modal]",
].join(", ");

/**
 * Hook that calls a callback when clicking outside of any registered popout panels.
 * Uses data attributes to identify popout panels and their related elements.
 *
 * A click on an element marked `data-popout-keep` (or inside one) is not outside either.
 *
 * This hook is aware of Mantine's floating UI elements (Select dropdowns, Menu items,
 * Tooltips, etc.) which are rendered in portals. Clicks on these elements will NOT
 * trigger the outside click callback, allowing users to interact with form controls
 * inside popout panels without accidentally closing them.
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

            // Check if the click is inside a popout panel
            const clickedPopoutPanel = target.closest('[role="dialog"]');
            if (clickedPopoutPanel) {
                // Click is inside a popout panel, don't close
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

            // Check if the click is inside any Mantine floating UI element
            // These are rendered in portals outside the popout DOM tree but
            // should still be considered as "inside" for click-outside purposes
            const clickedMantineFloating = target.closest(MANTINE_FLOATING_SELECTORS);
            if (clickedMantineFloating) {
                // Click is on a Mantine floating element (dropdown option, menu item, etc.)
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
