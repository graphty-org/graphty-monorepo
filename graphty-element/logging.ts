/**
 * @file `@graphty/graphty-element/logging`: the records the element writes, and where they go.
 *
 * ```js
 * import { GraphtyLogger, LogLevel, lazy } from "@graphty/graphty-element/logging";
 * ```
 *
 * The element writes down what it is doing -- data arriving, a layout settling, a run finishing,
 * a failure -- and hands every record to whatever destinations are attached. This entry point is
 * the whole vocabulary for that: the logger, the levels, the record type, the two destinations
 * the element ships, the formatter both of them render through, the stored configuration, the
 * `{use, options}` reference a saved configuration names a destination with, the URL-parameter
 * parser, and `lazy` for a message whose data is expensive to compute.
 *
 * It resolves in Node with no renderer anywhere in its import graph, which is the reason it is
 * an entry point of its own rather than part of the root barrel. A destination's headline claim
 * is that it works with no canvas and no custom element -- a build script, a worker, a
 * server-side check, a unit test -- and the root barrel defines `<graphty-element>` and pulls in
 * Babylon.js and Lit on import, so reaching a logger through it costs a 3D engine.
 *
 * **Where the registration verb lives.** Writing a destination uses two entry points, the same
 * way every other extension point in this package does: the types and the logger come from here,
 * and `registerLogSink` -- plus `LogSinkDescriptor`, `LogSinkId`, `KNOWN_LOG_SINK_IDS` and
 * `registeredLogSinkDescriptors` -- comes from `@graphty/graphty-element/extend`. Publishing one
 * symbol from two addresses is what this split removes: a consumer who reads two different
 * import lines for `GraphtyLogger` has no way to know they are the same object.
 *
 * **The element does not read the URL.** `parseLoggingURLParams` is published here because a
 * page that wants `?graphty-element-logging=layout:debug` to mean something can still have it --
 * by calling the parser and handing the answer to `GraphtyLogger.configure`. What changed in 2.0
 * is that the element stopped doing that for you on connect: a component that reconfigures
 * global logging because of something in its host page's query string is surprising, untestable
 * and impossible to opt out of.
 */

export * from "./src/logging/index";
