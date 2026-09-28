# graphty-element extension contracts

Status: draft specification, written against graphty-element 2.6.1 (`origin/master`, 2026-09-27).

This directory specifies the contracts a third party implements to extend graphty-element, the
standalone web component that renders graphs. It is the formal counterpart of the how-to guides in
`graphty-element/docs/guide/extending/` and of the implementation design
`design/graphty-element/extension-points.md`. Where those documents and this one disagree, this one
is normative and the disagreement is listed under "Corrections this specification makes" below.

| Document | What it specifies |
| --- | --- |
| `README.md` (this file) | The model every extension point shares: packaging, registration, discovery, versioning, options, parity, lifecycle, isolation, errors, testing |
| `common.d.ts` | The shared TypeScript vocabulary (normative for shapes) |
| `descriptors.schema.json` | JSON Schema for every catalogue descriptor (normative for the serialised form) |
| `palette.md`, `palette.d.ts` | A named set of colours a style layer ramps through |
| `file-format.md`, `file-format.d.ts` | A reader, and a proposed writer, for a graph file format |
| `camera.md`, `camera.d.ts` | A named camera view computed from a bounding box |
| `layout.md`, `layout.d.ts` | An engine that places nodes, live or in one pass |
| `algorithm.md`, `algorithm.d.ts` | A computation over the graph that publishes a result |
| `logging.md`, `logging.d.ts` | A destination the element's log records are delivered to |
| `candidates.md` | Seams that are NOT official extension points, with a recommendation for each |

## 1. Conventions

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY and
OPTIONAL are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they
appear in capitals.

- **The element** is `@graphty/graphty-element`.
- **An extension** is one thing a third party registers at one extension point: one palette, one
  format, one camera view, one layout, one algorithm or one log destination.
- **A plugin package** is an npm package that ships one or more extensions.
- **A built-in** is an extension of the same kind that the element itself ships (for example the
  `viridis` palette or the `graphml` reader).
- **A consumer** is code that uses the element: an application, a page, the graphty app.
- **Published** means exported from a documented entry point of a released version. A published
  name or shape is a contract: changing it incompatibly is a breaking change.
- **One-way door** means a choice that is expensive to undo once released, because consumers or
  saved documents depend on it. Every such choice this specification does not settle is listed in
  section 12, "Open decisions", with a recommendation.

### Which text is normative

1. The TypeScript declaration files (`*.d.ts`) are normative for the SHAPE of every type they
   declare, in their "Published" sections. Their "Proposed" sections are not normative until the
   open decision they name is taken.
2. `descriptors.schema.json` is normative for the serialised (JSON) form of every descriptor. It
   is consistent with the declaration files; where the two could differ (a function-valued member,
   which JSON cannot hold) the declaration file governs the in-memory form and the schema governs
   what may be persisted or published.
3. The prose is normative for BEHAVIOUR: validation, errors, ordering, lifecycle, versioning.
4. Examples are informative.

Where this specification states a requirement that graphty-element 2.6.1 does not yet meet, the
requirement is marked **(not yet met)** and the gap is listed in the point's "Known gaps" section.
A requirement marked that way is still normative: a defect report against it is a bug report, not
a feature request.

## 2. Scope: the closed list

The owner of graphty-element fixed the supported extension points on 2026-09-21:

> the following are our current official extension points. the others may be added later but
> don't need to be supported now: Palette, File format, Camera, Layout, Algorithm, Logging.
> Extensions written for each of these must be able to do anything their built-in peer modules
> can do.

That statement is recorded in `graphty-element/CLAUDE.md` ("Extension Points") and in the header
of `graphty-element/extend.ts`. This specification keeps it.

| Point | What a third party brings | Registration | Specification |
| --- | --- | --- | --- |
| Palette | A named set of colour anchors | `registerPalette(descriptor)` | `palette.md` |
| File format | A reader for a graph file format (a writer is proposed, not built) | `DataSource.register(Class)` | `file-format.md` |
| Camera | A named view: where the viewer stands and what it looks at | `registerCameraView({ descriptor, compute })` | `camera.md` |
| Layout | An engine that decides where nodes sit | `LayoutEngine.register(Class)` | `layout.md` |
| Algorithm | A computation over the graph that publishes a result | `Algorithm.register(Class)` on a `DeclaredAlgorithm` subclass | `algorithm.md` |
| Logging | A destination for log records | `registerLogSink({ descriptor, create })` | `logging.md` |

**The list is closed.** An element release MUST NOT make any other registration seam a supported
extension point without an explicit owner decision; promoting one is a one-way door. Seams that
exist but are not supported -- scales, node mesh shapes, lifecycle managers, AI commands,
accelerators, themes, expression functions -- are internal. A consumer who uses one gets no
compatibility promise, and a bug report about one is a feature request. `candidates.md` evaluates
each of them.

**A correction to the design-studio documents.** `design/ui/framework/conceptual-model.md`
section 9 (in the main checkout; not yet committed to master) lists "data source" as its own
extension point, calls the log destination internal, and says export formats are not offered. The
owner's list governs: Logging is a supported point, a data source is covered by the File format
point (with the live and service cases evaluated in `candidates.md`), and whether third parties may
register writers is open (section 12). That section needs to be corrected to match.

## 3. Packaging

1. An extension MUST be importable as ordinary ECMAScript module code. The element publishes no
   loader, manifest file or marketplace; an extension reaches the element by being imported and
   registered by the consumer's code (or by the plugin package's own module, when the consumer
   imports it).
2. A plugin package MUST import the element only from the published entry points
   `@graphty/graphty-element/extend` (registration verbs, base classes, descriptor types) and
   `@graphty/graphty-element/logging` (the logger vocabulary a log destination needs). It MAY also
   import `@graphty/graph-format` for snapshot types. It MUST NOT import from any other path of the
   element (`/src/...`, `/dist/...`); the package `exports` map makes those paths unreachable, and
   anything reachable only through them is not a contract.
3. A plugin package SHOULD declare `@graphty/graphty-element` as a `peerDependency` with a
   major-version range (for example `"^2.0.0"`), so that the consumer's single copy of the element
   is the one the plugin registers into. A plugin that uses only types from
   `@graphty/graph-format` (an algorithm written purely against the snapshot, section 6 of
   `algorithm.md`) MAY declare only that package as its peer.
4. A plugin package SHOULD NOT have install scripts (`preinstall`, `install`, `postinstall`). A
   plugin is code that runs with the page's full privileges (section 9); an install script widens
   that to the developer's machine and has been the vector of real npm compromises.
5. The `./extend` and `./logging` entry points are Node-safe: they MUST NOT pull in Babylon.js, Lit
   or a DOM global. `graphty-element/test/packaging/node-safe-entries.test.ts` enforces this. A
   plugin can therefore be written, type-checked and unit-tested (where its point allows, section
   11) without a browser.
6. Two copies of the element on one page (the self-contained `./bundle` beside an `./extend`
   import, two installed versions) share one registry per point: every registry keeps its state on
   `globalThis` under `Symbol.for("graphty.registry.v1.<kind>")`. A registration through any copy
   is visible to every copy. The `v1` is the version of the stored shape; a change to an entry or
   descriptor shape that an older copy cannot read MUST bump it, so the copies keep separate stores
   instead of misreading each other.

## 4. Registration

### 4.1 Two shapes, one question

The registration shape of each point is decided by one question: does the element construct the
thing?

- **Yes** (Algorithm, Layout, File format reader): the extension is a CLASS, registered through a
  static `register` on the base class it extends. The element constructs an instance per run, per
  `setLayout`, per load.
- **No** (Palette, Camera, Logging): the extension is a VALUE the consumer builds, registered
  through a free function on `./extend`.

Both shapes are published and MUST remain. Converging on one shape would break every existing
plugin of the other shape for no capability gain; prior art (the Babylon.js move from a static
`SceneLoader.RegisterPlugin` to a module function) argues for module functions, but the cost here
is a breaking change to six published verbs. This specification therefore documents exactly one
canonical form per point and no alternatives.

### 4.2 The registration policy

All six registries obey one policy, implemented once in
`graphty-element/src/catalog/pluginRegistry.ts`. A conforming element MUST behave as follows, and
an extension MAY rely on it:

1. **Identity.** Every extension has an id: the descriptor's `id` (palette, format, camera,
   layout, log destination) or `key` (algorithm). For class-shaped points the id MUST equal the
   class's `static type`; a registration where they differ MUST be refused with `E_BAD_COMMAND`.
2. **Empty id.** A missing or empty id MUST be refused with `E_BAD_COMMAND`,
   `details.field === "id"` (or the descriptor member that carries it).
3. **Built-in ids are reserved.** Registering under an id the element ships MUST throw
   `E_DUPLICATE_PLUGIN` with `details.builtIn === true`, whatever the options. A saved document
   that named `viridis` yesterday has to mean the same thing today.
4. **Re-registration of the same implementation** is a no-op. "The same" is decided per point: the
   class (algorithm, layout, reader), the `compute` function (camera), the `create` function (log
   destination), or the normalised content (palette, compared by value because a palette is data).
   Hot module replacement and a bundler re-evaluating a module MUST NOT produce two extensions.
5. **A different implementation under a taken id** replaces the earlier one and emits one console
   warning per id. With `{ strict: true }` it MUST instead throw `E_DUPLICATE_PLUGIN`.
6. **Malformed registration** MUST be refused at registration time with `E_BAD_COMMAND`, a
   `details.field` naming the member at fault, and `source: "registry"`. "At registration time"
   matters: a fault found at use time surfaces far from the code that caused it.
7. **No unregister.** Registration is global and permanent for the life of the page. A descriptor
   becomes public API the moment something records it -- a layer names the palette, a document
   names the format, a result path is built from the algorithm key. Each registry ships a
   `clearRegistered<Kind>ForTesting()` function; it exists only so a test suite can leave the
   registry as it found it, and a conforming extension or consumer MUST NOT call it outside tests.
8. **Registration is synchronous** and completes before the call returns. A registration made
   after an element exists is visible to that element's next catalogue read and next use; nothing
   needs to be re-created.
9. **The catalogue identity promise.** `registered<Kind>Descriptors()` returns the same frozen
   array until something registers. `session.catalog.<kind>()` composes the built-in table with the
   registered one and returns the built-in array itself while nothing is registered.

**(not yet met)** `Algorithm.register(cls)` and `LayoutEngine.register(cls)` take no
`RegisterOptions`, so `{ strict: true }` is reachable only for palettes, formats, cameras and log
destinations, while the guide (`docs/guide/extending/index.md`) promises it for every point. See
open decision 6.

### 4.3 Identifiers

1. An id MUST be a non-empty string. This is the only rule 2.6.1 enforces.
2. An id is recorded in saved documents, in result paths (`results.<runId>` records the algorithm
   key), in logging configurations and in URLs. An extension MUST therefore treat its id as
   permanent: renaming it is a breaking change for everyone who saved something that names it.
3. Two vendors can choose the same id; the second registration replaces the first (4.2 item 5). No
   namespacing rule exists today. A third-party id SHOULD begin with a vendor prefix followed by a
   hyphen (`acme-hop-reach`, `acme-heat`), and SHOULD match `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`. A
   hyphen is recommended over `.`, `:` and `/` because a dot is a path separator in result and
   selector paths, a colon is the separator of the legacy algorithm address `namespace:type`, and a
   slash is a URL separator. Whether this becomes a MUST, and whether it applies retroactively, is
   open decision 4.

## 5. Discovery: the catalogue

Every registered extension MUST be discoverable exactly as its built-in peers are:

| Point | Catalogue read | Registry read (Node-safe) |
| --- | --- | --- |
| Palette | `session.catalog.palettes()` | `registeredPaletteDescriptors()` |
| File format | `session.catalog.formats()` | `registeredFormatDescriptors()` |
| Camera | `session.catalog.cameras()` | `registeredCameraDescriptors()` |
| Layout | `session.catalog.layouts()` | `registeredLayoutDescriptors()` |
| Algorithm | `session.catalog.algorithms()`, `session.catalog.metrics()` | `registeredAlgorithmDescriptors()` |
| Logging | `session.catalog.logSinks()` | `registeredLogSinkDescriptors()` |

1. A descriptor MUST be plain JSON: it MUST survive `JSON.stringify` and `structuredClone`
   unchanged. Function-valued members are not descriptors; where a point needs a function (an
   algorithm's cost model, a camera's `compute`) it lives beside the descriptor in the registration,
   never inside it.
2. A descriptor MUST validate against its definition in `descriptors.schema.json`.
3. Built-ins come first, in the element's order; registered extensions follow in registration
   order.
4. A picker built from the catalogue MUST NOT need to know whether an entry is built-in. A
   consumer that needs to know compares the id against the point's `KNOWN_<KIND>_IDS` constant.
5. `graphty-catalog.json`, the static catalogue file the package publishes, lists built-ins only
   by construction, and 2.6.1 omits cameras and log destinations from it. See open decision 12.

## 6. Versioning and compatibility

### 6.1 What is versioned today

- The element package follows semantic versioning. Error codes are part of the contract; adding a
  code is a minor release, removing or renaming one is a major release.
- The shared registry store is versioned by the `v1` in its `Symbol.for` key (section 3 item 6).
- An algorithm MAY declare `static version`; it is recorded on each run as provenance.
- No extension declares which element or contract version it was written for, and the element
  checks nothing at registration time. See 6.4 and open decision 3.

### 6.2 Two kinds of exported type

Every type on `./extend` and `./logging` is one of two kinds, and the kind governs how it may
change:

- **Implemented by extensions** (a descriptor an author writes, a base class an author extends, a
  `Sink` an author returns). Adding a REQUIRED member, removing a member, or narrowing a member's
  type is a major release. Adding an OPTIONAL member with a default that preserves existing
  behaviour is a minor release.
- **Called by extensions** (`AlgorithmRunContext`, `ScopedInput`, `CameraViewInput`, `LogRecord`,
  the protected helpers of a base class). Adding a member is a minor release. Removing a member or
  changing its type is a major release, preceded by at least one minor release in which it is
  marked `@deprecated` with its replacement named.

Each point's specification labels its types with one of these two kinds.

### 6.3 Unknown, missing and future values

1. **Open unions.** `AlgorithmKey`, `LayoutId`, `FormatId`, `PaletteId`, `CameraId`, `LogSinkId`,
   `OptionBound.from`, `AlgorithmDescriptor.category`, `AlgorithmDescriptor.scopeInput` and
   `ResultShape` MAY gain values in a minor release. A reader (a consumer or an extension) MUST
   handle an unknown value without throwing, using the default each point states (for example an
   unknown `scopeInput` is read as `"none"`; an unknown `OptionType` is rendered as `"unknown"`).
2. **Closed unions for writers.** An extension MUST NOT write a value outside the union published
   by the element version it declares compatibility with. A registration that does MUST be refused
   with `E_BAD_COMMAND`.
3. **Unknown descriptor members.** The element MUST ignore a descriptor member it does not know,
   and MUST NOT publish it in the catalogue. (This lets an extension written for a newer contract
   run on an older element when it declares nothing the older element needs.) **(not yet met:**
   2.6.1 freezes and republishes the author's descriptor object, unknown members included.)
4. **Missing optional members** take the default stated in the point's specification.
5. **Missing required members** MUST be refused at registration with `E_BAD_COMMAND` naming the
   member.

### 6.4 Host compatibility (proposed)

Prior art is unanimous that a plugin should state which host contract it targets and that the
host should refuse, loudly and early, an extension it cannot honour (VS Code `engines.vscode`,
Figma's manifest `api`, Cytoscape desktop's per-class compatibility promise). The recommended
design, which is open decision 3:

1. The element exports `EXTENSION_API_VERSION` (a `major.minor` string, starting at `"1.0"`),
   versioned independently of the package, bumped in major only when an "implemented by
   extensions" type changes incompatibly.
2. Every descriptor MAY carry `requires` (a semver range over that version) and `version` (the
   extension's own version). A class-shaped extension carries them as statics.
3. At registration, a `requires` range that excludes `EXTENSION_API_VERSION` MUST be refused with
   `E_UNSUPPORTED`, `details.requires` and `details.provided` set. An absent `requires` is accepted
   (so every existing extension keeps working) and SHOULD produce one console warning in
   development builds.
4. `version` is recorded wherever the extension's key is recorded (a run record, a saved style
   document, a logging configuration), so a document can say which version produced it.

## 7. Options

Every point that takes configuration uses one mechanism: a `readonly OptionDescriptor[]` on the
descriptor (`common.d.ts`, `descriptors.schema.json#/$defs/OptionDescriptor`).

1. The declared options are, at once, what a form renders, what the catalogue publishes and what
   the element validates a caller's values against. An extension MUST NOT validate the same values
   a second way with different results.
2. The element MUST resolve a caller's values with `resolveOptionValues` before the extension sees
   them: defaults filled, an undeclared name refused with `E_UNKNOWN_OPTION`, a value of the wrong
   type or outside `min`/`max`/`values` refused with `E_OPTION_RANGE`. The extension therefore
   receives plain, validated data and SHOULD NOT re-validate it.
3. Option names MUST be unique within one descriptor. A default MUST satisfy the option's own
   constraints. An `enum` option MUST carry at least one `values` entry, and its default MUST be
   one of them.
4. `optionsFromZod(schema)` is a published convenience that emits descriptors from a Zod schema.
   The descriptors it emits are the contract; the Zod schema is not. A construct it cannot classify
   is emitted with `type: "unknown"` and an `unsupportedReason`, never dropped.
5. The older `defineOptionsSchema` / `OptionsSchema` vocabulary on `./extend` is deprecated. A new
   extension MUST NOT use it; it throws uncoded errors and names types differently (`select` where
   the catalogue says `enum`).
6. The element does not accept Standard Schema, JSON Schema or arbitrary validators as option
   declarations. The option set is deliberately a closed, serialisable subset (close to Vega's
   transform parameter definitions), so every option can be rendered, published and persisted.
7. A palette takes no options (`palette.md` explains why). Every other descriptor carries an
   `options` array, which MAY be empty.

**(not yet met)** The element's own readers do not route through `resolveOptionValues`, and
`CSVDataSource` accepts options its descriptor does not declare. A plugin reader is held to a
stricter door than the built-ins here; the fix is in the built-ins, not in the rule.

## 8. Parity

The owner's rule: **an extension must be able to do everything its built-in peer can.** The rule
is broader than registration. For every point, parity means all of the following, and each point's
specification enumerates what its built-ins actually do so that each clause can be tested:

1. **Discoverable**: it appears in `session.catalog` beside the built-ins (section 5).
2. **Addressable**: it is reachable by the key a consumer types, through every route that reaches
   a built-in of the same kind, and by the key a saved document records wherever the element reads
   one back.
3. **Observable and stoppable**: it reports progress and honours cancellation wherever its built-in
   peer does.
4. **Configurable**: it is configured through the same options mechanism (section 7).
5. **Failing the same way**: its failures reach the consumer as a `GraphtyError` with a code from
   `graphty-element/src/errors/codes.ts`, by the same event or rejection a built-in's failure does.
6. **Typeable**: it can be written in TypeScript against `./extend` (and `./logging`) with no cast
   and no re-declaration of a type the element already has.

A capability the element keeps for its own modules is a defect in the extension point, not a
design choice. Where parity is VACUOUS (no built-in has the capability either -- an import cannot
be cancelled, a layout reports no progress) the point's specification says so under "Known gaps",
because a plugin author would otherwise assume it.

**Conformance of the element to this rule** is pinned by seven test files in
`graphty-element/test/browser/extensions/`: one per point plus `all-extension-points.test.ts`,
which registers one extension of every kind against a single graph. A capability not exercised
there is not promised. `all-extension-points.test.ts` also pins the list of registration surfaces,
so a new `register*` export fails the build until it is listed as a supported point or an explicit
exclusion.

## 9. Lifecycle, isolation and error containment

### 9.1 Lifecycle

| Point | Constructed | Lives | Disposed |
| --- | --- | --- | --- |
| Palette | never (data) | from registration for the page's life | never |
| Camera view | never (pure function) | from registration for the page's life | never |
| Log destination | `create(options)` when a configuration names it | until removed or replaced | `dispose()` on removal or replacement |
| File format reader | once per load | for one load | garbage-collected after the load ends |
| Layout engine | once per `setLayout` | until the next `setLayout` or the element is disconnected | `dispose()` |
| Algorithm | once per run | for one run | garbage-collected after the run settles |

An extension MUST NOT keep references to element internals (a node, an edge, a snapshot, a
session) beyond the lifetime in this table. A snapshot handed to an algorithm is immutable and MAY
be retained, but retaining it keeps its memory alive.

### 9.2 Isolation: there is none

A code extension is ordinary JavaScript running in the page's realm, with the page's full
privileges: it can read the DOM, the network, storage and every graph the page loads. The element
does not sandbox it and this specification does not pretend otherwise. In-page sandboxes have a
history of escapes (Figma abandoned its Realms-based sandbox after a disclosed escape), and a web
component cannot own a separate JavaScript VM.

Consequences:

1. A consumer MUST treat registering a code extension (reader, layout, algorithm, log destination,
   camera view) as running that vendor's code with the page's privileges, and SHOULD apply the
   same supply-chain review as to any other dependency.
2. Data-only extensions MUST stay data-only. A palette is a descriptor with no code, and loading a
   palette from a document MUST NOT execute anything. The configuration files the element reads
   and writes (styles, recipes, annotations, views, projects) MUST NOT be able to register or load
   a code extension; a file that names a code extension this installation lacks is kept and read
   as unresolved, naming what to install, and never fetches code.
3. The Logging point is the most likely route for graph data to leave the page, because a
   destination receives every record's `data`. `logging.md` section "Security" states what the
   element promises and what it does not.

### 9.3 Error containment

What the element does when an extension misbehaves at use time, per point:

| Point | Extension throws or rejects | Element's obligation |
| --- | --- | --- |
| Palette | cannot (data) | n/a |
| Format `detect` | treated as "does not claim this file" | MUST NOT fail the detection or the load |
| Format reader | the load fails | MUST emit the load failure the built-ins emit; a non-`GraphtyError` MUST be wrapped as `E_PARSE_FAILED` (or `E_FETCH_FAILED` when fetching failed) with the original as `cause`; the previously loaded graph MUST be kept |
| Camera `compute` | the view fails | MUST reject the call that asked for the view; MUST NOT leave the camera partly moved |
| Layout engine | the layout fails | MUST report it as a `GraphtyError` (wrapping as `E_INTERNAL` with `source: "layout"` when needed); MUST stop stepping that engine; nodes keep their last published positions |
| Algorithm | the run fails | MUST settle the run as failed with the error's code (wrapping as `E_INTERNAL` with `source: "run"` when needed); MUST NOT publish a partial result; other runs continue |
| Log destination `write` | swallowed | MUST catch it, MUST still deliver the record to every other destination, and MUST NOT recurse (a failure while reporting a destination's failure is dropped) |

In every row, a failure in one extension MUST NOT prevent the use of any other extension or
built-in, and MUST NOT affect a session that never uses the failing extension.

An extension SHOULD throw `GraphtyError` with the codes its point lists. It MUST NOT throw a
`GraphtyError` with a code outside `ExtensionErrorCode` (`common.d.ts`) unless its point lists it.

## 10. The relation to the graph-format migration

The migration of the element onto `@graphty/graph-format` snapshots and `@graphty/graph-io`
importers is in progress on branch `feat/graph-format-migration` (plan:
`design/graph-format/migration-plan.md` on that branch). The owner decided three things on
2026-09-28 that bind this specification:

1. **`Algorithm.algorithmGraph()` and the `AlgorithmGraphView` export are deprecated** in favour
   of a documented snapshot accessor, deprecated in a 3.x minor and removed in graphty-element 4.0
   together with algorithms 3.0. `algorithm.md` is written against the snapshot accessor
   (`context.input(...)`), which 2.6.1 already publishes, and treats `algorithmGraph` as deprecated.
   The accessor lacks a public way to name an edge by its element id; see open decision 5.
2. **graph-format and graph-io become regular dependencies** of the element, not peers. A plugin
   may therefore hold a `GraphSnapshot` type from a different copy of graph-format than the
   element's. Snapshot types are structural, so this is safe as long as the plugin reads only
   the published members; `algorithm.md` states the rule.
3. **An export carries whatever the chosen format can represent**: nodes, edges, attributes,
   positions, algorithm results as attributes, and style where the format has a place for it, with
   every omission reported as a loss note. `file-format.md` specifies the writer contract to match.
   The owner did NOT decide where third-party writers register. A workflow script summarising the
   decision added "third-party writers register through graph-io's existing registry"; that
   clause was not the owner's. It is open decision 1.

Where this specification is not yet consistent with the migration: after the migration the
element's built-in readers are graph-io importers wrapped in `DataSource` classes, while a
third-party reader is a `DataSource` subclass that yields records. The two are still the same kind
of thing from the consumer's side (both registered classes, both in the catalogue), but they are
different contracts from the author's side. Open decision 2 asks which one a third party writes.

## 11. Testing and conformance

### 11.1 What exists

The element's own parity suite (`graphty-element/test/browser/extensions/`) runs inside the
element's repository only. It is the executable form of the parity clauses, but a third party
cannot run it against their own extension.

### 11.2 The conformance kit (proposed)

Each point's specification defines a list of conformance checks a third party can run against
their extension. The recommended harness, open decision 9, is a published entry point
`@graphty/graphty-element/conformance`, modelled on ESLint's `RuleTester`:

```ts
import { checkPalette, checkFormat, checkCameraView, checkLayout, checkAlgorithm, checkLogSink }
    from "@graphty/graphty-element/conformance";

// Each returns a report; each also has a `describe*` form that emits one test per check into
// the caller's Vitest, Jest or Mocha run.
const report = await checkFormat(RosterDataSource, { samples: [{ text, expect: { nodes: 3, edges: 2 } }] });
if (!report.passed) throw new Error(report.failures.map((f) => f.check + ": " + f.message).join("\n"));
```

Requirements on the kit:

1. It MUST run the extension against the real element code of the installed version, not a mock.
2. Checks that need no renderer (registration, descriptor validity, option resolution, Node-safety
   of the plugin module, a camera view's `compute`, a log destination's `write`, a palette's
   normalisation, a reader's records and errors, an algorithm's output shape over a snapshot) MUST
   run in Node.
3. Checks that need a renderer (a layout placing real nodes, a palette painting real meshes, a
   camera view moving a real camera) MUST run in a headless browser through a documented Vitest
   browser-mode configuration the kit ships.
4. Every check has a stable name (the check names in each point's specification). A report lists
   each check with `passed`, `skipped` (with the reason: "not applicable to this extension's
   declared capabilities") or `failed` (with a message).
5. The kit MUST isolate its registrations: it registers the extension, runs the checks and calls
   the point's `clearRegistered<Kind>ForTesting()` afterwards.

An extension **conforms** to this specification when every check its point lists passes or is
skipped for a stated reason.

## 12. Open decisions

Each item below is a one-way door: a published name, shape, file format or behaviour that
consumers and saved documents would come to depend on. None is decided by this specification. Each
carries a recommendation.

1. **Where third-party file WRITERS register.** The owner decided what an export contains
   ("whatever the format supports"), not where writers register. Options: (A) an element-owned
   `registerFormatWriter({ descriptor, exporter })` that wraps a graph-io `GraphExporter`, so the
   writing code is graph-io's contract but the catalogue entry, the reserved ids, the options and
   the error mapping are the element's; (B) third parties call graph-io's
   `FormatRegistry.registerExporter` directly and the element lists what it finds; (C) the
   element's `DataSource` class also carries the writer, as the current guide and
   `design/graphty-element/extension-points.md` promise. **Recommended: A.** B fails four parity
   clauses (no catalogue entry, no reserved ids, no option descriptors, graph-io errors instead of
   `GraphtyError`) and makes the consumer write the integration, which the architectural
   principles forbid. C couples writing to a class built around async record generation, which a
   writer does not do. Details in `file-format.md`.
2. **Which reader contract a third party implements after the migration.** Options: (A) keep the
   element's `DataSource` subclass yielding records as the only third-party reader contract, and
   add an element adapter `DataSource.fromImporter(importer, descriptor)` so an author who already
   has a graph-io `GraphImporter` registers it without rewriting; (B) make graph-io's
   `GraphImporter` the contract and wrap it. **Recommended: A**, because it keeps every existing
   plugin working and gives both authors one registration verb.
3. **Host compatibility check.** Whether descriptors carry `requires` and `version`, what they are
   checked against (a separate `EXTENSION_API_VERSION` or the package version), and whether an
   absent `requires` is accepted. **Recommended:** section 6.4 -- a separate contract version,
   `requires` optional with a warning when absent, refusal with `E_UNSUPPORTED` when excluded.
4. **Identifier grammar and vendor prefix.** Whether section 4.3's recommended grammar becomes a
   MUST, and whether the design-studio proposal of `package:kind` keys (framework
   `conceptual-model.md` section 9) is adopted instead. **Recommended:** a hyphenated vendor prefix
   as a SHOULD now, a MUST at the next major; reject `package:kind` because a colon collides with
   the legacy algorithm address `namespace:type`.
5. **The public edge identity accessor for algorithms.** `ScopedInput` has no public way to turn
   an edge row into the element's `Edge.id`, so a plugin that reads only the snapshot cannot
   publish an edge-shaped result once `algorithmGraph` is removed. **Recommended:** add
   `edgeId(row: number): string` to `ScopedInput` (rows of `graph`) and to the snapshot returned by
   `subgraph()` via `subgraphEdgeId(row)`; see `algorithm.md`.
6. **`RegisterOptions` on the class-shaped verbs.** Add the optional second parameter to
   `Algorithm.register` and `LayoutEngine.register`, so `{ strict: true }` is uniform.
   **Recommended: yes** (additive).
7. **Refusing a descriptor-less algorithm class.** `Algorithm.register` today accepts a class with
   no `static descriptor` and files it under `namespace:type` with no built-in check, so a
   descriptor-less class declaring namespace `graphty` and type `degree` silently replaces the
   built-in implementation. **Recommended:** refuse a built-in `namespace:type` always (a bug fix),
   and refuse a missing descriptor from the next major (a breaking change).
8. **Persisting camera views and layout choices.** A camera view and a layout choice are recorded
   in no saved document that the element reads back, for built-ins and plugins alike, so the
   "addressable from a saved document" parity clause is vacuous for these two points. The design
   studio wants saved views to capture the camera and recipes to carry layout settings.
   **Recommended:** record `{ id, options, version }` for both in the view and recipe files that
   the configuration-file specifications define, and read them back through the same registries.
   This must be decided together with those file formats.
9. **The conformance kit's name and home.** **Recommended:** the entry point
   `@graphty/graphty-element/conformance` described in section 11.2, rather than a separate package,
   so the kit's version always equals the element's.
10. **Palettes carried by a style document.** Today a document that carries a palette descriptor
    is refused unless that palette was registered first. The owner wants communities to share
    style and recipe files without sharing data, which argues for self-contained documents.
    **Recommended:** a document's palettes are registered when the document is applied, under the
    ordinary policy (a built-in id is still refused; a different palette under a taken id is
    refused rather than replacing, because a document must not silently change another document's
    colours). See `palette.md`.
11. **Supported and internal exports on `./extend`.** The accelerator seam (`registerAccelerator`,
    `AcceleratorRegistry`, `GraphAccelerator`, ...) and the deprecated option schema are exported
    from the same entry point as the six contracts. **Recommended:** mark every export in the API
    report as `@public` (one of the six) or `@internal`, and move the accelerator exports to an
    `./internal` path at the next major.
12. **`graphty-catalog.json`.** A published data file with no format version and two of the six
    tables missing. **Recommended:** add `cameras` and `logSinks`, add a top-level `formatVersion:
    1`, and validate it against `descriptors.schema.json`.
13. **Whether a log destination declares where it sends data.** **Recommended:** an optional
    `LogSinkDescriptor.destinations: string[]` (origins), shown by a settings panel before the
    destination is enabled. See `logging.md`.

14. **A snapshot-based layout contract.** The layout contract names the element's render classes
    (`Node`, `Edge`). The element's own layouts are moving onto graph-format snapshots. A successor
    contract -- a batch layout as an async function from a snapshot, options, fixed rows, a signal
    and a progress channel to a coordinate array (`layout.d.ts`, "Proposed") -- would give layouts
    progress, cancellation, Node testing and acceleration. **Recommended:** adopt it in a minor
    release beside `LayoutEngine`, deprecate `LayoutEngine` for plugins at the following major.
15. **Data sources as a seventh extension point.** Service queries (STRING, BioGRID, Neo4j), live
    feeds and lazy expansion do not fit a file reader. **Recommended:** a seventh point with its
    own descriptor declaring the hosts it contacts; see `candidates.md` section 1.
16. **Forwarding run options to `compute`.** `seed`, `exact`, `sample` and `timeBox` are resolved by
    a run and not forwarded, so a stochastic plugin cannot be reproduced from the run's seed.
    **Recommended:** forward them on the run context (`AlgorithmRunParameters` in
    `algorithm.d.ts`), additively, for built-ins and plugins alike.

## 13. Corrections this specification makes to existing documents

These documents state something false or superseded. Each needs the edit named; none is a one-way
door.

| Document | Statement | Correction |
| --- | --- | --- |
| `graphty-element/docs/guide/extending/index.md` | a registered log destination "starts receiving records immediately" | It does not: registration files a factory; records flow only once a configuration names it (`GraphtyLogger.configure({ sinks: [{ use }] })`) or a live sink is added with `addSink` |
| same | "pass `{ strict: true }`" for every point | True for four points; see open decision 6 |
| `graphty-element/docs/guide/extending/custom-algorithms.md` | reads input through `this.algorithmGraph("undirected")` | Rewrite around `context.input(...)`; mark `algorithmGraph` deprecated |
| `graphty-element/docs/guide/extending/custom-data-sources.md` and `design/graphty-element/extension-points.md` | "when writing exists the same class will carry it" | Writer registration is undecided (open decision 1) |
| `design/graphty-element/extension-points.md`, "Still open" | `scope` does not reach `compute` | It does, through `context.input`; `seed`, `exact`, `sample` and `timeBox` do not |
| same, Algorithm section | an `edgeResultId(source, target)` helper is published | It was withdrawn: a pair cannot name one of two parallel edges |
| `design/element-api/element-api-design.md` section 4.14 and its `./extend` row | one `use()` verb, `createRegistry()`, ten plugin kinds | Superseded by `design/graphty-element/extension-points.md` and this directory; the unbuilt kinds are evaluated in `candidates.md` |
| root `CLAUDE.md`, "Plugin System" | `LayoutRegistry.register`, `DataSourceRegistry.register`, `AlgorithmRegistry.register` | None exists; the verbs are the six in section 2 |
| `design/ui/framework/conceptual-model.md` section 9 (uncommitted) | data source is an extension point; the log destination is internal; exporters are not offered | See section 2 |
