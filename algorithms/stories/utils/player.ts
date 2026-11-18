/**
 * The play and pause of a story's step-by-step animation: `play` runs `step` every `delay` milliseconds until it
 * returns false, `pause` is called, or `root` (the story's element) has left the document.
 * @param root - the story's root element; the timer stops once it is unmounted
 * @param step - runs one step and says whether more remain
 * @param delay - milliseconds between steps
 * @returns play and pause, for createAnimationControls
 */
export function createPlayer(
    root: HTMLElement,
    step: () => boolean,
    delay: number,
): { play: () => void; pause: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function tick(): void {
        timeoutId = null;
        if (step() && root.isConnected) {
            timeoutId = setTimeout(tick, delay);
        }
    }

    return {
        play: () => {
            if (timeoutId === null) {
                tick();
            }
        },
        pause: () => {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        },
    };
}
