/**
 * The old name of `createCommandContext`, kept only for the two tests other open pull requests
 * are changing (selectors.test.ts, LayoutCommands.test.ts); delete this file once they import
 * `createCommandContext` from ./session-graph.
 * @module test/helpers/test-graph
 */
export { createCommandContext as createMockContext } from "./session-graph";
