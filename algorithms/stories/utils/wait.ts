/**
 * The longest delay `setTimeout` accepts (about 24.8 days): in effect, no deadline.
 */
const NO_DEADLINE_MS = 2 ** 31 - 1;

/**
 * Options for a play function's `waitFor` or `findBy*`: no deadline of their own under a test
 * runner (the Storybook vitest project, the visual capture), so the runner's own test timeout is
 * the only backstop; `interactiveMs` in the interactive Storybook, so a hang still shows an error
 * there. A fixed deadline under a runner fails a story whenever a stalled machine outlasts it,
 * though the work it waits on still finishes inside the test's own timeout (#2864).
 * @param interactiveMs - the deadline in the interactive Storybook
 * @returns the `timeout` option to pass to `waitFor` or `findBy*`
 */
export function storyWaitOptions(interactiveMs: number): { timeout: number } {
    return { timeout: navigator.webdriver ? NO_DEADLINE_MS : interactiveMs };
}
