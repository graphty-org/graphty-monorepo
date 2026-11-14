/**
 * @file Compile-only checks that event names are checked where they are emitted and subscribed
 * (checked by `tsc` in `npm run lint`).
 *
 * The element's own emit sites go through `EventManager.emit`, which takes only a name the
 * `GraphEvent` or `AiEvent` union declares, so an event cannot be emitted without being declared.
 * `graph.on` takes the same names, including the four lifecycle events it used to reject at run
 * time.
 */

import { expectTypeOf } from "vitest";

import type { AiEventType, InputPointerEvent, LayoutUpdatedEvent } from "../../index";
import type { GraphtyForwardedEventMap } from "../../src/events";
import type { Graph } from "../../src/Graph";
import type { EventManager } from "../../src/managers/EventManager";

declare const events: EventManager;
declare const graph: Graph;

events.emit("graph-started", { timestamp: 0 });
events.emit("input:undo", {});
events.emit("ai-voice-start", {});

// @ts-expect-error -- an undeclared name does not compile at an internal emit site.
events.emit("custom-event", {});

// The deprecated public emitter takes only declared names too.
events.emitGraphEvent("graph-started", { timestamp: 0 });
// @ts-expect-error -- an undeclared name does not compile at the deprecated emitter either.
events.emitGraphEvent("custom-event", {});

// The input manager's bookkeeping events are declared, and kept off the DOM event map.
events.emit("input-initialized", {});
// @ts-expect-error -- an element-internal event has no DOM event type.
expectTypeOf<"input-initialized">().toExtend<keyof GraphtyForwardedEventMap>();

// layout-updated arrives under its own name, with the count of nodes added.
graph.on("layout-updated", (e) => {
    expectTypeOf(e).toEqualTypeOf<LayoutUpdatedEvent>();
});

expectTypeOf<"ai-status-change">().toExtend<AiEventType>();

graph.on("render-initialized", (e) => {
    expectTypeOf(e.type).toExtend<string>();
});
graph.on("manager-initialized", () => undefined);
graph.on("lifecycle-initialized", () => undefined);
graph.on("lifecycle-disposed", () => undefined);
graph.on("input:pointer-down", (e) => {
    expectTypeOf(e).toEqualTypeOf<InputPointerEvent>();
});

// @ts-expect-error -- an undeclared name cannot be subscribed either.
graph.on("custom-event", () => undefined);
