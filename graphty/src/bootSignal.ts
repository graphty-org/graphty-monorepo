/** What the app tells the loading screen drawn by index.html. */
interface BootSignal {
    /** A step that starts before the one above it has finished, by its name in the list. */
    readonly start?: string;
    readonly line?: string;
    readonly error?: boolean;
    readonly hold?: boolean;
    readonly done?: boolean;
}

/**
 * Tells the loading screen something. Nothing listens in a story or a test, and once the screen has
 * gone a line only reaches the console.
 * @param detail - a line for its log, or to hold it up, or that it can go.
 */
export function bootSignal(detail: BootSignal): void {
    document.dispatchEvent(new CustomEvent("graphty-boot", { detail }));
}
