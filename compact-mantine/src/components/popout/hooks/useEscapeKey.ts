import { useEffect } from "react";

/**
 * Whether a control has a tooltip open on it (Mantine names the tooltip on its trigger while it is
 * open).
 * @param target - the element the key went to
 * @returns true when one of the elements describing it is a tooltip
 */
function hasOpenTooltip(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
        return false;
    }
    const ids = target.getAttribute("aria-describedby")?.split(/\s+/) ?? [];
    return ids.some((id) => id !== "" && document.getElementById(id)?.getAttribute("role") === "tooltip");
}

/**
 * Hook that calls a callback when the Escape key is pressed.
 * Used to close the focused popout panel. An Escape something inside already used up (a menu
 * closing itself marks its Escape handled) is left alone, so it closes only the innermost thing.
 *
 * A tooltip is not such a thing: the reader did not open it, and often cannot see it (a tooltip
 * opened by focus waits before it shows). Mantine's tooltip closes on Escape and stops the key on
 * its trigger, so the Escape would never get here and the reader would have to press it again. So
 * an Escape on a control with an open tooltip is seen on its way in and, once every handler has had
 * it, closes the pop-out unless one of them used it up.
 * @param callback - Function to call when Escape key is pressed
 * @param enabled - Whether the listener should be active (default: true)
 */
export function useEscapeKey(callback: () => void, enabled = true): void {
    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && !event.defaultPrevented) {
                event.preventDefault();
                callback();
            }
        };
        const pending = new Set<ReturnType<typeof setTimeout>>();
        const seeTooltipEscape = (event: KeyboardEvent): void => {
            if (event.key !== "Escape" || !hasOpenTooltip(event.target)) {
                return;
            }
            // After the dispatch: handled above (or used up by a field) it is defaultPrevented.
            const later = setTimeout(() => {
                pending.delete(later);
                if (!event.defaultPrevented) {
                    callback();
                }
            });
            pending.add(later);
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keydown", seeTooltipEscape, true);

        return (): void => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keydown", seeTooltipEscape, true);
            for (const later of pending) {
                clearTimeout(later);
            }
        };
    }, [callback, enabled]);
}
