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
}

/**
 * The real input the test runner supplied, if any.
 * @param parameters - the story context's parameters
 * @returns the real input, or undefined in Storybook's own UI
 */
export function realInput(parameters: Record<string, unknown>): RealInput | undefined {
    return parameters.realInput as RealInput | undefined;
}
