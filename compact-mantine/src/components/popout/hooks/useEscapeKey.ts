import { useEffect } from "react";

/**
 * Hook that calls a callback when the Escape key is pressed.
 * Used to close the focused popout panel.
 * @param callback - Function to call when Escape key is pressed
 * @param enabled - Whether the listener should be active (default: true)
 */
export function useEscapeKey(callback: () => void, enabled = true): void {
    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
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
