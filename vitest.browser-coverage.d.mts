/**
 * The browser commands to spread into a browser project's `test.browser.commands`: they restart V8
 * precise coverage, with a garbage collection in between, as each test file starts, so a finished
 * file's iframe can be freed (see vitest.browser-coverage.mjs). The context is @vitest/browser's
 * command context; the command reads its internal CDP handle, which vitest's types do not name.
 */
export declare const browserCoverageCommands: { __vitest_startV8Coverage(context: object): Promise<void> };
