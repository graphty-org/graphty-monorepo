/**
 * A pop-out's `onOpenChange` handler that calls `onClose` when the pop-out closes.
 * @param onClose - Called when the pop-out closes; opening it does nothing.
 * @returns The handler to pass as `onOpenChange`.
 */
export function closedBy(onClose: () => void): (next: boolean) => void {
    return (next) => {
        if (!next) {
            onClose();
        }
    };
}
