/**
 * Real (browser-trusted) input for play functions.
 *
 * A page's own script can only dispatch untrusted events, which skip the browser's hit testing,
 * drag-and-drop handling and event ordering. The `storybook` test project's setup
 * (.storybook/vitest.setup.ts) hands Vitest's Playwright-backed input to every story as the
 * `realInput` parameter, so a play function run as a test drives the browser itself. Storybook's
 * own UI has no such input, so there `realInput` returns undefined and the play function replays
 * the events instead.
 */

/** What a play function can do with real input. */
export interface RealInput {
    /** Vitest's `userEvent`: Playwright input through the DevTools protocol. */
    userEvent: {
        click(element: Element): Promise<void>;
    };
    /**
     * Drag a file from outside the window over the middle of an element and hold it there. The
     * drag is cancelled when the test ends.
     */
    dragFileOver(element: Element): Promise<void>;
    /** Turn the mouse wheel over the middle of an element, by `deltaY` pixels (negative is away from the reader). */
    wheel(element: Element, deltaY: number): Promise<void>;
}

/**
 * Turns the wheel over the middle of an element: real input under the test runner, else one
 * replayed wheel event at the same point, as Storybook's own UI and the visual capture have no
 * real input to give. Resolves once the browser has drawn a frame after the wheel: a shot taken in
 * the frame the real wheel arrived in drew some icons with different edge pixels from one taken a
 * frame later, so two renders of a story that ends on the wheel disagreed (#6048).
 * @param parameters - the story context's parameters.
 * @param element - where the wheel turns.
 * @param deltaY - how far, in pixels; negative is away from the reader.
 */
export async function wheelOver(parameters: Record<string, unknown>, element: Element, deltaY: number): Promise<void> {
    const real = realInput(parameters);
    if (real !== undefined) {
        await real.wheel(element, deltaY);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return;
    }
    const box = element.getBoundingClientRect();
    element.dispatchEvent(
        new WheelEvent("wheel", {
            deltaY,
            clientX: box.left + box.width / 2,
            clientY: box.top + box.height / 2,
            bubbles: true,
            cancelable: true,
        }),
    );
}

/**
 * The real input the test runner supplied, if any.
 * @param parameters - the story context's parameters
 * @returns the real input, or undefined in Storybook's own UI
 */
export function realInput(parameters: Record<string, unknown>): RealInput | undefined {
    return parameters.realInput as RealInput | undefined;
}
