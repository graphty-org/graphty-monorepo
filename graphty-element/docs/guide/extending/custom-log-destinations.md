# Custom log destinations

The element logs what it does -- data arriving, a layout settling, a run finishing, a failure --
and delivers every record to whatever destinations are attached. It ships two: the developer
console and a remote log server. A destination of your own is an in-page panel, a telemetry
client, an assertion collector in a test.

There are two ways to attach one, and you want both for different reasons.

Both use two import lines, the same as every other extension point here: the vocabulary -- the
logger, the levels, the record, the `Sink` type -- comes from
`@graphty/graphty-element/logging`, and the verb that registers your destination under a name
comes from `@graphty/graphty-element/extend`. Neither subpath needs a renderer, so a
destination works in a worker, a build step or a test with no page around it.

## Route one: a live object

Hand the element a `Sink` and it starts receiving records immediately.

```ts
import { GraphtyLogger, type LogRecord, type Sink } from "@graphty/graphty-element/logging";

const panel: Sink = {
    name: "acme-panel",
    write(record: LogRecord): void {
        // The whole record: when it happened, how bad it was, who said it, the facts attached,
        // and the Error itself on a failure -- not a stack rendered to a string.
        document.querySelector("#log")?.append(GraphtyLogger.formatRecord(record), "\n");
    },
};

GraphtyLogger.addSink(panel);
GraphtyLogger.removeSink("acme-panel");
```

## Route two: a name a configuration can record

This is the one that matters. Register a factory and your destination is turned on by a **string**
in a configuration object -- so a settings panel can store it, a saved configuration can bring it
back, and it can be switched on before the element is even created.

```ts
import { type LogSinkDescriptor, registerLogSink } from "@graphty/graphty-element/extend";
import { GraphtyLogger, LogLevel, type LogRecord, type Sink } from "@graphty/graphty-element/logging";

const ACME_COLLECTOR: LogSinkDescriptor = {
    id: "acme-collector",
    plainName: "Acme in-page collector",
    description: "Keeps the most recent records in memory so a page can show them.",
    options: [
        {
            name: "capacity",
            plainName: "Records kept",
            type: "integer",
            default: 20,
            min: 1,
            max: 500,
            description: "How many of the most recent records to hold on to.",
        },
        {
            name: "only",
            plainName: "What to keep",
            type: "enum",
            default: "everything",
            values: [
                { value: "everything", label: "Everything" },
                { value: "errors", label: "Failures only" },
            ],
            description: "Whether to keep every record or only the failures.",
        },
    ],
};

const kept: LogRecord[] = [];

registerLogSink({
    descriptor: ACME_COLLECTOR,
    // The values arrive already checked against the descriptor above and with every declared
    // default filled in, so a factory reads them and never validates them.
    create: (options): Sink => {
        const capacity = options.capacity as number;

        return {
            name: "acme-collector",
            // A NARROWING filter, applied after the global level gate: this destination can take
            // less than the configuration allows, never more.
            level: options.only === "errors" ? LogLevel.ERROR : undefined,
            write(record: LogRecord): void {
                kept.push(record);

                if (kept.length > capacity) {
                    kept.shift();
                }
            },
            async flush(): Promise<void> {
                await sendSomewhere(kept);
            },
            dispose(): void {
                kept.length = 0;
            },
        };
    },
});

// Turned on by NAME. This object is plain JSON: it survives a settings panel, a saved document
// and a page reload, none of which can hold a JavaScript object.
await GraphtyLogger.configure({
    enabled: true,
    level: LogLevel.DEBUG,
    sinks: [{ use: "acme-collector", options: { capacity: 100, only: "errors" } }],
});
```

`configure()` merges rather than resets, so turning a destination on does not silently put the
level and the module filter back to their defaults.

## What a record carries

```ts
interface LogRecord {
    /** When it happened. */
    timestamp: number;
    /** How bad it is: TRACE, DEBUG, INFO, WARN or ERROR. TRACE arrives as TRACE. */
    level: LogLevel;
    /** Who said it, as segments: ["graphty", "layout", "ngraph"]. */
    category: readonly string[];
    /** What they said, unformatted. */
    message: string;
    /** The facts attached, with any lazy values already resolved. */
    data?: Record<string, unknown>;
    /** The Error instance itself on an error record, not a stack rendered to a string. */
    error?: Error;
}
```

`GraphtyLogger.formatRecord(record)` -- also exported as `formatLogRecord` -- is the element's own
rendering of a record, and is what both built-in destinations use. Use it and your panel shows the
same line a developer sees in devtools.

## Writing to the log yourself

A plugin logs under its own category, and its records reach every destination including the
console:

```ts
import { GraphtyLogger, lazy } from "@graphty/graphty-element/logging";

const logger = GraphtyLogger.getLogger(["graphty", "acme"]);

logger.info("roster loaded", { people: 412 });

// A value that is expensive to compute is not computed when the level filters the record out.
logger.debug("roster detail", { profile: lazy(() => summarise(roster)) });
```

## Filtering

Two gates, in order. The global one is the configuration's `level`, its `modules` list and its
per-module `moduleLevels` overrides. The per-destination one is your sink's own `level` and
`categories`, which can only narrow further.

```ts
await GraphtyLogger.configure({
    level: LogLevel.WARN,
    modules: ["layout", "data"],
    moduleLevels: { layout: LogLevel.TRACE },
});
```

```ts
const layoutOnly: Sink = {
    name: "acme-layout-watch",
    categories: ["layout"],   // matched by segment: covers ["graphty", "layout", "ngraph"]
    write: (record) => console.log(record.message),
};
```

## Turning the element's own console off

The console is an ordinary destination now, registered under the name `"console"`. Detach it and
element records go only where you sent them:

```ts
GraphtyLogger.removeSink("console");
```

## Coexisting

One frozen record is handed to every destination, so a destination that tried to edit a field
cannot change what a later one sees. A `write` that throws is caught per destination and reported
to `console.error`, and the others still get the record. A `flush` that rejects is caught the same
way, so one destination's failed flush does not take down the caller's `flush()`.

`dispose` is called when the destination is removed and when the logger is reset, which is where a
timer, a socket or a batch queue is released.

## Finding it again

```ts
import { logSinkDescriptor } from "@graphty/graphty-element/catalog";

logSinkDescriptor("acme-collector")?.plainName;   // "Acme in-page collector"
session.catalog.logSinks();                        // every destination a settings panel may offer
```

## How it is refused

| What is wrong | Code |
| --- | --- |
| No descriptor, no id, no `options` list, or a `create` that is not a function | `E_BAD_COMMAND`, `details.field` naming it |
| An id the element itself ships (`console`, `remote`) | `E_DUPLICATE_PLUGIN` |
| A second, different registration under a name already taken, with `{ strict: true }` | `E_DUPLICATE_PLUGIN` |
| A configuration naming a destination nothing registered | `E_UNKNOWN_SINK`, with `details.available` |
| An option the descriptor does not declare | `E_UNKNOWN_OPTION`, with `details.candidates` |
| An option value outside the declared range | `E_OPTION_RANGE` |

## Deliberate limits

**`write` is synchronous and fire-and-forget.** A promise it returns is neither awaited nor
caught, so an `async write` that rejects becomes an unhandled rejection rather than the caught,
reported failure a synchronous throw gets. Buffer internally and expose `flush`, which is what the
element's own remote destination does.

**A destination cannot take more than the global level allows.** The per-sink filter narrows; it
does not widen. The element's own remote destination is behind the same gate.

**Records emitted before a destination is attached are not replayed.** The built-in console loses
them too. The fix is the factory registry: a named destination can be configured before the
element exists.
