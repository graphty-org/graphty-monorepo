/**
 * The `timeout` option for a `findBy*` or `waitFor` that waits for a themed tooltip to open. The
 * theme opens a tooltip 1000 ms after the hover or focus, so a fixed deadline of a few seconds
 * fails whenever a busy machine stalls past it, though the tooltip still opens (#3380). The wait
 * has no deadline of its own (the longest `setTimeout` accepts, about 24.8 days): the test's own
 * timeout is the backstop.
 */
export const TOOLTIP_WAIT = { timeout: 2 ** 31 - 1 };
