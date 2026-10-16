import { useEffect } from "react";

/**
 * Hook that calls a callback when the Escape key is pressed.
 * Used to close the focused popout panel. An Escape something inside already used up (a menu
 * closing itself marks its Escape handled) is left alone, so it closes only the innermost thing.
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

        document.addEventListener("keydown", handleKeyDown);

        return (): void => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [callback, enabled]);
}
