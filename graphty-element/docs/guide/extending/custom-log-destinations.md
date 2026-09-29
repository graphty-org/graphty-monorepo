# Custom log destinations

The element logs what it does -- data arriving, a layout settling, a run finishing, a failure --
and delivers every record to whatever destinations are attached. It ships two: the developer
console and a remote log server. A destination of your own is an in-page panel, a telemetry
client, an assertion collector in a test.

## Start here: one function

Available from graphty-element 2.7.

Send the element's errors to your telemetry endpoint:

```ts
import { defineLogDestination } from "@graphty/graphty-element/extend";
import { GraphtyLogger } from "@graphty/graphty-element/logging";

// Send the element's errors to a telemetry endpoint.
defineLogDestination({
    id: "acme-telemetry",
    level: "error",
    write: (record) =>
        fetch("https://telemetry.acme.example/v1/errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
        }),
});

// Logging is off until the page turns it on, and until then no destination receives anything.
await GraphtyLogger.configure({ enabled: true });
```

That is the whole destination. `id` is the name it is known by -- lower-case words joined by
hyphens, led by your own prefix -- and `write` is your code: it receives one record at a time.
`level: "error"` means only errors reach it.

**Logging has to be on.** While logging is off, which is the default, no destination receives
anything: not yours, and not the element's own console either. The last line of the example turns
it on. It also turns on the developer console's output at the `info` level; to keep that quiet,
detach the console after turning logging on with `GraphtyLogger.removeSink("console")`. Every
`configure` call attaches the console again, so if other code on the page calls `configure`,
remove it after that call too.

### What the element does for you

- **It attaches the destination at once**, under its id. `defineLogDestination` returns a
  function; call it to stop the destination. Defining the same id again -- a hot reload running
  your setup twice -- replaces the earlier destination, so records are never sent twice, and the
  earlier call's stop function no longer stops anything. Pass `{ strict: true }` as the second
  argument to be refused instead.
- **It hands you a plain record.** `JSON.stringify(record)` keeps all of it:

    | Member     | What it holds                                                |
    | ---------- | ------------------------------------------------------------ |
    | `time`     | when it happened, a `Date` (an ISO string once serialised)   |
    | `level`    | `"error"`, `"warn"`, `"info"`, `"debug"` or `"trace"`        |
    | `category` | who said it, as one dotted string: `"graphty.layout.ngraph"` |
    | `message`  | what they said                                               |
    | `data`     | the facts attached, when there are any                       |
    | `error`    | on a failure, `{ name, message, stack }`                     |

- **It filters for you.** `level` is the least severe level delivered; leave it out and you get
  warnings and errors. `categories: ["layout"]` delivers only records whose category contains
  that word. A destination never receives more than the global logging level allows.
- **It sends for you.** When `write` returns a promise -- a `fetch` -- the element queues the
  records and sends them one at a time, in order. A rejected promise, or a response that is not
  `ok` (an HTTP 500), is a failed send: the element reports it on the console and tries again
  three times, after 1, 2 and 4 seconds. A 4xx response other than 408 and 429 is not retried,
  because sending the same request again changes nothing. At most 1000 records wait; past that
  the oldest are dropped, and the next send starts with one `warn` record in category
  `graphty.logging` saying how many were. `GraphtyLogger.flush()` waits for the queue, stopping
  the destination sends what is still waiting, and the element flushes every destination when the
  page is hidden.
- **It lists the destination beside the built-ins.** The catalogue offers it
  (`session.catalog.logSinks()`) with its name derived from the id ("acme-telemetry" reads "Acme
  telemetry"), and a stored configuration can turn it on by id:
  `GraphtyLogger.configure({ sinks: [{ use: "acme-telemetry" }] })`. Pass `attach: false` to
  register it for that without attaching it now.

### A second example: records on the page

A panel beside the graph that shows what the element says about its layouts:

```ts
import { defineLogDestination } from "@graphty/graphty-element/extend";
import { GraphtyLogger } from "@graphty/graphty-element/logging";

/**
 * Show what the element says about its layouts, one line per record, in a panel on the page.
 * @param panel - Where the lines go.
 * @returns A function that stops it.
 */
export async function showLayoutLog(panel: HTMLElement): Promise<() => void> {
    const stop = defineLogDestination({
        id: "acme-layout-panel",
        level: "info",
        categories: ["layout"],
        write: (record) => {
            panel.append(`${record.level}: ${record.message}\n`);
        },
    });

    await GraphtyLogger.configure({ enabled: true });
    return stop;
}
```

`showLayoutLog(document.querySelector("pre"))` before the element is created, and the panel fills
with lines such as `info: Setting layout`. Records made before a destination is attached are not
replayed, so define it first.

### How to run it

With a bundler, install `@graphty/graphty-element` and import exactly as the examples do: the
verb from `@graphty/graphty-element/extend`, the logger from `@graphty/graphty-element/logging`.
Neither needs a renderer, so the same code runs in a test or a worker.

On a page with no build step, import both from the self-contained bundle:

```html
<script type="module">
    import {
        defineLogDestination,
        GraphtyLogger,
    } from "https://cdn.jsdelivr.net/npm/@graphty/graphty-element@2/dist/graphty.bundle.js";

    defineLogDestination({ id: "acme-page-log", write: (record) => console.log(record.message) });
    await GraphtyLogger.configure({ enabled: true });
</script>
```

To test a destination, call `write` yourself: it is a plain function. Hand it a record such as
`{ time: new Date(), level: "error", category: "graphty.data", message: "Data source loading failed" }`
with `fetch` stubbed, and check what it sent.

### What leaves the page

`data` and `error.stack` can hold graph content: node ids, attribute values, labels, file names
and URLs. The element removes none of it. A destination that sends records to another party and
handles sensitive graphs leaves them out itself, and adds what it wants every record to carry --
a session id, the app's name -- in the same place:

```ts
write: (record) =>
    fetch(url, {
        method: "POST",
        body: JSON.stringify({ ...record, data: undefined, error: record.error?.name, sessionId }),
    }),
```

`JSON.stringify` drops a member that is `undefined`, so `data` is not sent, and only the error's
name is.

### When it goes wrong

A malformed definition is refused by `defineLogDestination` itself, before anything is attached,
with `E_BAD_COMMAND` and a message that names the member:

```text
defineLogDestination("acme-telemetry"): "write" must be a function; got undefined.
```

| What you wrote                                        | What you get                                   |
| ----------------------------------------------------- | ---------------------------------------------- |
| no `write`, or one that is not a function             | `E_BAD_COMMAND`, `details.field: "write"`      |
| an id with capitals, spaces, dots, colons or slashes  | `E_BAD_COMMAND`, `details.field: "id"`         |
| a `level` that is not one of the five words           | `E_BAD_COMMAND`, `details.field: "level"`      |
| `categories` that is not a list of words              | `E_BAD_COMMAND`, `details.field: "categories"` |
| the id `console` or `remote`, which the element keeps | `E_DUPLICATE_PLUGIN`                           |

A misspelt member is caught by TypeScript before the page runs:

```text
error TS2561: Object literal may only specify known properties, but 'levle' does not exist in
  type 'LogDestinationDefinition'. Did you mean to write 'level'?
```

A `write` that throws is caught and reported on the console, and every other destination still
gets the record. If nothing arrives at all, check in this order: logging is on
(`GraphtyLogger.isEnabled()`), the record is at your `level` or more severe, and the destination
was defined before the records were made.

### When you need more

Move to the advanced tier below, under the same id, when you need options a settings panel can
set, your own `flush` or `dispose`, a synchronous `write` with buffering of your own, or the full
record with the numeric level, the category as a list of segments and the `Error` object itself.

## The advanced tier

There are two ways to attach an advanced destination, and you want both for different reasons.

Both use two import lines, the same as every other extension point here: the vocabulary -- the
logger, the levels, the record, the `Sink` type -- comes from
`@graphty/graphty-element/logging`, and the verb that registers your destination under a name
comes from `@graphty/graphty-element/extend`. Neither subpath needs a renderer, so a
destination works in a worker, a build step or a test with no page around it.

### Route one: a live object

Hand the element a `Sink` and it receives every record made from then on, once logging is on --
while logging is off, which is the default, no destination receives anything.

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

await GraphtyLogger.configure({ enabled: true });
GraphtyLogger.addSink(panel);

// ...and later, to detach it:
GraphtyLogger.removeSink("acme-panel");
```

### Route two: a name a configuration can record

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

registerLogSink({
    descriptor: ACME_COLLECTOR,
    // The values arrive already checked against the descriptor above and with every declared
    // default filled in, so a factory reads them and never validates them.
    create: (options): Sink => {
        const capacity = options.capacity as number;
        // Inside create, not at module level: each configuration that names this destination
        // gets its own buffer, so two of them never mix their records.
        const kept: LogRecord[] = [];

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

### What a record carries

```ts
interface LogRecord {
    /** When it happened. */
    timestamp: Date;
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

### Writing to the log yourself

A plugin logs under its own category, and its records reach every destination including the
console:

```ts
import { GraphtyLogger, lazy } from "@graphty/graphty-element/logging";

const logger = GraphtyLogger.getLogger(["graphty", "acme"]);

logger.info("roster loaded", { people: 412 });

// A value that is expensive to compute is not computed when the level filters the record out.
logger.debug("roster detail", { profile: lazy(() => summarise(roster)) });
```

### Filtering

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
    categories: ["layout"], // matched by segment: covers ["graphty", "layout", "ngraph"]
    write: (record) => console.log(record.message),
};
```

### Turning the element's own console off

The console is an ordinary destination now, registered under the name `"console"`. Detach it and
element records go only where you sent them:

```ts
GraphtyLogger.removeSink("console");
```

### Coexisting

One frozen record is handed to every destination, so a destination that tried to edit a field
cannot change what a later one sees. A `write` that throws is caught per destination and reported
to `console.error`, and the others still get the record. A `flush` that rejects is caught the same
way, so one destination's failed flush does not take down the caller's `flush()`.

`dispose` is called when the destination is removed and when the logger is reset, which is where a
timer, a socket or a batch queue is released.

### Finding it again

```ts
import { logSinkDescriptor } from "@graphty/graphty-element/catalog";

logSinkDescriptor("acme-collector")?.plainName; // "Acme in-page collector"
session.catalog.logSinks(); // every destination a settings panel may offer
```

### How it is refused

| What is wrong                                                                        | Code                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------- |
| No descriptor, no id, no `options` list, or a `create` that is not a function        | `E_BAD_COMMAND`, `details.field` naming it    |
| An id the element itself ships (`console`, `remote`)                                 | `E_DUPLICATE_PLUGIN`                          |
| A second, different registration under a name already taken, with `{ strict: true }` | `E_DUPLICATE_PLUGIN`                          |
| A configuration naming a destination nothing registered                              | `E_UNKNOWN_SINK`, with `details.available`    |
| An option the descriptor does not declare                                            | `E_UNKNOWN_OPTION`, with `details.candidates` |
| An option value outside the declared range                                           | `E_OPTION_RANGE`                              |

### Deliberate limits

**`write` is synchronous and fire-and-forget.** A promise it returns is neither awaited nor
caught, so an `async write` that rejects becomes an unhandled rejection rather than the caught,
reported failure a synchronous throw gets. Buffer internally and expose `flush`, which is what the
element's own remote destination does. (A destination defined with
`defineLogDestination` does not have this limit: the element queues and retries its promises.)

**A destination cannot take more than the global level allows.** The per-sink filter narrows; it
does not widen. The element's own remote destination is behind the same gate. So is the global switch:
while logging is off, no destination receives anything, whichever tier defined it.

**Records emitted before a destination is attached are not replayed.** The built-in console loses
them too. The fix is the factory registry: a named destination can be configured before the
element exists.
