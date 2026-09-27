/**
 * @file The listener argument `graph.on` hands a callback is the event it subscribed to.
 *
 * `style-changed` carries `{ reason, layers, painted, unresolvedPaths }`, and a TypeScript consumer
 * used to read every one of them as `unknown`: the event was a member of the catch-all generic
 * event, and `on` typed every callback with the whole event union whatever it subscribed to. The
 * assertions are checked by `tsc`; the subscriptions below are never run.
 */

import { describe, expectTypeOf, it } from "vitest";

import type { StyleChangedEvent } from "../../index";
import type { RepaintReason, RepaintReport } from "../../session";
import type { GraphDataClearedEvent } from "../../src/events";
import type { Graph } from "../../src/Graph";

/**
 * Subscribes the way the events guide teaches. Type-checked, never called.
 * @param graph - any graph
 */
function subscribe(graph: Graph): void {
    graph.on("style-changed", (e) => {
        expectTypeOf(e).toEqualTypeOf<StyleChangedEvent>();
        expectTypeOf(e.reason).toEqualTypeOf<RepaintReason>();
        expectTypeOf(e.layers).toEqualTypeOf<number>();
        expectTypeOf(e.painted).toEqualTypeOf<RepaintReport | null>();
        expectTypeOf(e.unresolvedPaths).toEqualTypeOf<string[]>();
    });
    graph.addListener("data-cleared", (e) => {
        expectTypeOf(e).toEqualTypeOf<GraphDataClearedEvent>();
    });
}

describe("graph.on", () => {
    it("narrows the callback to the event it subscribed to", () => {
        expectTypeOf(subscribe).toBeFunction();
    });
});
