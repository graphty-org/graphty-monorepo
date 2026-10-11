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

import type { AiEventType, InputPointerEvent } from "../../index";
import type { Graph } from "../../src/Graph";
import type { EventManager } from "../../src/managers/EventManager";

declare const events: EventManager;
declare const graph: Graph;

events.emit("graph-started", { timestamp: 0 });
events.emit("input:undo", {});
events.emit("ai-voice-start", {});

// @ts-expect-error -- an undeclared name does not compile at an internal emit site.
events.emit("custom-event", {});

// The deprecated public emitter still takes any name, as its published signature promises.
events.emitGraphEvent("custom-event", {});

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
