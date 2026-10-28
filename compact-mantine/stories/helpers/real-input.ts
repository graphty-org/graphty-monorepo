/**
 * Real (browser-trusted) pointer and keyboard input for play functions.
 *
 * A page's own script can only dispatch untrusted events, which skip the browser's pointer
 * capture, hit testing and event ordering. The story test runner (tests/stories/play.storybook.test.tsx)
 * hands Vitest's Playwright-backed input to every story as the `realInput` parameter, so a play
 * function run as a test drives the browser itself. Storybook's own UI has no such input, so
 * there `realInput` returns undefined and the play function falls back to Storybook's `userEvent`.
 */

/** The subset of Vitest browser mode's `userEvent` and `commands` a play function uses. */
export interface RealInput {
    /** Vitest's `userEvent`: Playwright input through the DevTools protocol. */
    userEvent: {
        hover(element: Element, options?: { position?: { x: number; y: number } }): Promise<void>;
        click(element: Element): Promise<void>;
        keyboard(text: string): Promise<void>;
    };
    /** The package's browser commands (vitest.config.ts). */
    commands: {
        mouseDown(): Promise<void>;
        mouseUp(): Promise<void>;
    };
}

/**
 * The real input the test runner supplied, if any.
 * @param parameters - the story context's parameters
 * @returns the real input, or undefined in Storybook's own UI
 */
export function realInput(parameters: Record<string, unknown>): RealInput | undefined {
    return parameters.realInput as RealInput | undefined;
}
