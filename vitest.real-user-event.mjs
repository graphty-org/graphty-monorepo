/**
 * @file Real input for every story's play function when it runs as a test.
 *
 * Play functions press keys and click with `userEvent` from `storybook/test` (testing-library's
 * user-event), which dispatches untrusted events from the page's own script: no hit testing, no
 * pointer capture, no `:focus-visible` rules a real mouse or keyboard brings. A Storybook test
 * project's setup file mocks `storybook/test` (or `@storybook/test`) with this function, so the
 * same play function drives the browser itself through Vitest's Playwright-backed `userEvent`.
 *
 * Two cases keep Storybook's replay:
 * - Storybook's own UI, which never loads a test setup file.
 * - A visual capture (`chromatic=true`, set by visual-review's story-test setup before the stories
 *   load): the picture must be the built Storybook's, where the play replays its input.
 *
 * In a setup file:
 *
 * ```ts
 * vi.mock("storybook/test", async (importOriginal) => {
 *     const { withRealUserEvent } = await import("../../vitest.real-user-event.mjs");
 *     return withRealUserEvent(await importOriginal(), (await import("vitest/browser")).userEvent);
 * });
 * ```
 */

/**
 * `storybook/test`'s exports with `userEvent` driving real input, unless the page is a capture.
 * @template {{ userEvent: { paste: (text: string) => Promise<void> } }} T
 * @param storybookTest the module's own exports
 * @param real Vitest's `userEvent` (`vitest/browser`)
 * @returns the exports to use
 */
export function withRealUserEvent(storybookTest, real) {
    if (/[?&]chromatic=true/.test(globalThis.location?.search ?? "")) {
        return storybookTest;
    }
    return { ...storybookTest, userEvent: realFirst(storybookTest.userEvent, real) };
}

/**
 * Vitest's methods over testing-library's. A method Vitest has no counterpart for (`pointer`) keeps
 * the replay, and `setup()` gives an instance built the same way.
 * @param replay testing-library's `userEvent` (or an instance from its `setup()`)
 * @param real Vitest's `userEvent` (or an instance from its `setup()`)
 * @returns the merged `userEvent`
 */
function realFirst(replay, real) {
    return {
        ...replay,
        ...real,
        setup: (...options) => realFirst(replay.setup ? replay.setup(...options) : replay, real.setup()),
        // testing-library's paste(text) hands the text to the focused element as if pasted;
        // Vitest's paste() presses the paste key over whatever was copied. A text given was never
        // copied, so it is still handed over as testing-library does.
        paste: (text) => (text === undefined ? real.paste() : replay.paste(text)),
    };
}
