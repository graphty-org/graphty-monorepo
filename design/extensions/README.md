# graphty-element extension contracts

Status: draft specification, written against graphty-element 2.6.1 (`origin/master`, 2026-09-27).
An open pull request releases graphty-element 3.0.0 and changes parts of the layout contract;
section 14 lists what it changes. Rejected review points are recorded in section 15.

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
   import TYPES from the Node-safe entry points `./session` and `./schema`, because 2.6.1 publishes
   some types a contract names only there (`RunProgressReport`, `RunDirection` and `WeightMeaning`
   on `./session`; `isPaletteSafe` on `./schema`). It MUST take snapshot types (`GraphSnapshot`,
   `NodeMask`, `EdgeMask`) from `./extend`, not from its own copy of `@graphty/graph-format`
   (`algorithm.md` section 3.3 explains why). It MUST NOT import from any other path of the
   element (`/src/...`, `/dist/...`); the package `exports` map makes those paths unreachable, and
   anything reachable only through them is not a contract. Some types the declaration files name
   are not exported by name at all; each is marked "NOT EXPORTED BY NAME" and the element SHOULD
   export it from `./extend`.
3. A plugin package MUST declare `@graphty/graphty-element` as a `peerDependency` with a
   major-version range covering the majors it was built and tested against, so that the
   consumer's single copy of the element is the one the plugin registers into and an element
   major produces an install-time signal. Every plugin extends or calls something on `./extend`,
   so no plugin can depend on `@graphty/graph-format` alone.
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
   is visible to every copy. The `v1` is the version of the stored shape; ANY change to the entry
   or descriptor shape, in either direction, MUST bump it, so the copies keep separate stores
   instead of misreading each other. **(not yet met)** Each copy checks built-in ids against its
   own table and validates with its own rules, and the frozen descriptor cache is shared, so an
   older copy can file an id a newer copy reserves, or publish descriptors without a member the
   newer copy derives. A conforming element MUST check a registration against the built-in ids
   of every copy sharing the store (the store records each copy's version and built-in ids),
   MUST re-validate an entry it did not register before using it, and MUST cache descriptors per
   copy. No test runs two versions together today; the parity suite needs one. The shared store
   is not a security boundary: any script on the page can write to it (section 9.2).

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
   `E_DUPLICATE_PLUGIN` with `details.builtIn === true`, whatever the options, and whatever the
   order in which modules evaluate. A saved document that named `viridis` yesterday has to mean the
   same thing today. **(not yet met)** For formats and layout engines 2.6.1 reserves a built-in id
   only once the element's own class is filed: `DataSource.register` refuses `"graphml"` only when
   the registry already holds it, and `LayoutEngine.register` does the same for a descriptor-less
   class named after a built-in engine. The built-in readers are filed by `src/data/index.ts`,
   which `./extend` does not import, so a plugin imported before the element's main entry takes
   the id silently, and the element's own module then throws `E_DUPLICATE_PLUGIN` while loading.
   The reservation MUST come from the static tables (`FORMAT_DESCRIPTORS`,
   `BUILT_IN_LAYOUT_ENGINES`) at the `./extend` boundary, and the element MUST file its own
   built-ins through a private path, not the public `register`.
4. **Re-registration of the same implementation** is a no-op. "The same" is decided per point: the
   class (algorithm, layout, reader), the `compute` function (camera), the `create` function (log
   destination), or the whole normalised descriptor (palette, compared by value because a palette
   is data). Hot module replacement and a bundler re-evaluating a module MUST NOT produce two
   extensions. **(not yet met)** 2.6.1 compares the descriptor OBJECT for algorithms, layouts and
   formats, so a subclass that inherits its parent's descriptor is treated as a re-import and is
   filed over the parent with no warning, even under `strict`; and its palette content key leaves
   out `plainName`, so re-registering a palette with a corrected name is a silent no-op.
5. **A different implementation under a taken id** replaces the earlier one and emits one console
   warning per id. With `{ strict: true }` it MUST instead throw `E_DUPLICATE_PLUGIN`. Replacement
   by default lets any later-loaded package take over a trusted plugin's id; whether the default
   becomes refusal, whether a page can lock its registries, and whether a replacement is reported
   as an event the embedder can observe are open decision 21.
6. **Malformed registration** MUST be refused at registration time with `E_BAD_COMMAND`, a
   `details.field` naming the member at fault, and `source: "registry"`. "At registration time"
   matters: a fault found at use time surfaces far from the code that caused it. One shared
   validator, run by every `register` verb, MUST check the descriptor against
   `descriptors.schema.json` and the option-array rules of section 7 item 3. **(not yet met)**
   2.6.1 validates unevenly: `registerLogSink` checks only that a descriptor object and `create`
   exist, so a descriptor with no `options` is accepted and fails later with an uncoded
   `TypeError` inside `configure`; `registerCameraView` checks that `modes` is an array but not its
   values; `DataSource.register` does not check `plainName`, `canImport` or `options`;
   `registerPalette` does not check `colorblindSafe` entries; and no registry validates an option
   array (unique names, a default that satisfies its own constraints, an `enum` with values).
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
   hyphen is recommended over `.`, `:` and `/` because a dot is a path separator in selector paths
   and URLs, a colon is the separator of the legacy algorithm address `namespace:type`, and a
   slash is a URL separator. (Result paths are `results.<runId>.<field>` and no longer carry the
   algorithm key, so the dot argument is weaker than it was, but selectors and URLs still need
   it.) Whether this becomes a MUST, and whether it applies retroactively, is open decision 4.
4. The element may add built-in ids in a minor release (the id lists are open unions), and a
   registration under a built-in id always throws. So adding a built-in whose id a conforming,
   unprefixed plugin already uses breaks that plugin at import, and silently changes what every
   document naming the id means. Open decision 4 also covers the element's side of this: which id
   space the element reserves for its own future built-ins.

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
6. Every descriptor string (`plainName`, `description`, `technicalName`, option labels, caveat
   notes, loss notes, error messages) is PLAIN TEXT. A consumer MUST render it as text, never as
   markup: some of it will come from documents a stranger wrote (open decision 10), and a picker
   built with `innerHTML` would run what it carries. The schema bounds no string length or array
   size today; bounds (for ids, names, descriptions, option and anchor arrays) SHOULD be added with
   the next schema version (open decision 12), so a descriptor cannot put megabytes into every
   menu.
7. **(not yet met)** 2.6.1 freezes and republishes a normalised copy only for palettes. The
   format, camera and log-destination registries publish the author's own object, so code holding
   it can change what the catalogue publishes after registration (for example set `canExport` to
   `true` past the refusal). Every registry MUST publish a frozen, normalised copy.

### 5.1 Scopes

Three points take a scope: an algorithm run, a camera view (`applyCameraView(id, { scope })`) and
a scoped layout (`setLayout(id, options, { scope })`). All three take the element's one scope type,
`ScopeInput` (`graphty-element/src/catalog/types.ts`): a named set, an inline set definition, or
the other forms that type lists. No extension point defines a scope shape of its own.

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

Each point's specification labels its types with one of these two kinds. Two further rules:

1. **A base class is both kinds at once.** For the three class-shaped points (`DataSource`,
   `LayoutEngine`, `DeclaredAlgorithm`), adding any member to the base class can collide with a
   member a plugin subclass already declares under that name: the plugin then fails to compile,
   or silently overrides the element's member and is called with a different meaning. So a new
   capability SHOULD reach a class-shaped extension as an argument (a context object handed to
   `init`, `compute` or the constructor, as algorithms already receive `context`), not as an
   inherited member. Adding an inherited member is treated as potentially breaking and needs a
   name unlikely to collide; the plugin guides SHOULD tell authors not to declare members whose
   names begin with `graphty`.
2. **Re-exported graph-format types** (`GraphSnapshot`, `NodeMask`, `EdgeMask`) are called by
   extensions. An element release that moves to a new graph-format major is therefore an element
   major, and a major of every point's contract version (section 6.4).

### 6.3 Unknown, missing and future values

Every union in the declaration files is either OPEN (the element MAY add values in a minor
release) or CLOSED (a new value is a major release). The table is the complete list, with the
value a reader uses for a value it does not know.

| Union | Open or closed | A reader meeting an unknown value |
| --- | --- | --- |
| `AlgorithmKey`, `LayoutId`, `FormatId`, `PaletteId`, `CameraId`, `LogSinkId` | open | treats it as an id nothing registered (`E_UNKNOWN_*` when used) |
| `OptionType` | open | renders the option as `"unknown"` |
| `OptionBound.from` | open | "no bound" |
| `AlgorithmDescriptor.category` | open | an ungrouped category |
| `AlgorithmDescriptor.scopeInput` | open | `"none"` |
| `ResultShape` | open | a `fact`: shows its graph values as a table and derives no layer |
| `CostClass` | open | `"unbounded"` |
| `LayoutDescriptor.sizeRating` | open | `"any"` |
| `LayoutDescriptor.structuralInputs` entries | open | ignored |
| `AttributeType` | open | `"mixed"` |
| `FieldDescriptor.type`, `ResultFieldSpec.type` | open | `"table"` (shown, never ranked or encoded) |
| `SimplifyPolicy` | open | refused with `E_UNSUPPORTED` naming the value |
| `PaletteDescriptor.kind` | closed | -- |
| `ColorVisionDeficiency` | closed | -- |
| `DrawingMode` (`CameraDescriptor.modes`) | closed | an unknown mode is unsupported |
| `LayoutDescriptor.kind`, `maxDimensions` | closed | -- |
| `Caveats.precision`, `RunDirection` | closed | -- |
| `LogLevel` | closed | -- |
| `GraphtyErrorSource` | closed | -- |
| `ExtensionErrorCode` (`GraphtyErrorCode`) | open for readers, closed for writers | a generic failure |

1. **Open unions for readers.** A reader (a consumer or an extension) MUST handle an unknown value
   of an open union without throwing, using the value in the table. The serialised schema
   (`descriptors.schema.json`) lists the known values of an open union as documentation and MUST
   NOT be used to refuse a descriptor over one; a consumer validating a newer catalogue against
   an older schema treats an enum failure on an open union as an unknown value.
2. **Values an extension writes.** An extension MUST NOT write a value outside the union published
   by the contract version it declares (`requiresApi`, section 6.4). An element that meets an
   unknown value in a registration -- an extension written for a newer element -- MUST refuse it
   with `E_UNSUPPORTED` and `details.value` naming it, never silently degrade it. Declaring
   `requiresApi` makes this refusal predictable: the newer extension says which contract it needs.
3. **Unknown descriptor members.** The element MUST ignore a descriptor member it does not know,
   and MUST NOT publish it in the catalogue. This lets an extension written for a newer contract
   run on an older element when the member is advisory. A member that RESTRICTS behaviour (a new
   precondition, an egress declaration) is not safe to ignore: an extension lists such members in
   `mustUnderstand` (section 6.4), and an element that does not know one refuses the registration.
   The schema's own description says a writer MUST NOT add members this version does not define;
   that sentence is superseded by this item. **(not yet met:** 2.6.1 publishes unknown members.)
4. **Missing optional members** take the default stated in the point's specification.
5. **Missing required members** MUST be refused at registration with `E_BAD_COMMAND` naming the
   member.
6. **Persisted descriptors and files naming extensions.** Every persisted descriptor, the
   catalogue file and every configuration file that names an extension carries a format version
   (a major that an older reader refuses, a minor that it reads with unknown members ignored). A
   `StyleDocument` today accepts only exactly `version: 1` and has no member for extension
   provenance; the rule and the member are part of open decision 26.

### 6.4 Host compatibility (proposed)

Prior art is unanimous that a plugin should state which host contract it targets and that the
host should refuse, loudly and early, an extension it cannot honour (VS Code `engines.vscode`,
Figma's manifest `api`, Cytoscape desktop's per-class compatibility promise). The recommended
design, which is open decision 3 (`ExtensionCompatibility` in `common.d.ts`):

1. The element exports `EXTENSION_API_VERSIONS`, one full semver string per point (starting at
   `"1.0.0"`; node-semver refuses a two-part version such as `"1.0"`), each versioned
   independently of the package. A point's major is bumped on ANY incompatible change to a type
   of that point on `./extend` or `./logging`, "called by extensions" types included: removing a
   protected helper such as `algorithmGraph` is a contract major, because a plugin that calls it
   breaks. One version per point, so a break in one contract does not refuse plugins of the other
   five.
2. Every descriptor MAY carry `requiresApi` (a node-semver range over its point's version, never
   `*` or empty), `version` (the extension's own semver version), `package` (the npm package that
   ships it) and `mustUnderstand`. A class-shaped extension carries them as statics of the same
   names. The member is `requiresApi`, not `requires`, on every point, because
   `AlgorithmDescriptor.requires` already holds graph preconditions.
3. At registration, a `requiresApi` range that excludes the point's version MUST be refused with
   `E_UNSUPPORTED`, `details.requiresApi` and `details.provided` set. An absent `requiresApi` is
   accepted (so every existing extension keeps working) and SHOULD produce one console warning in
   development builds. The conformance kit ships pairs of ranges and versions that must pass and
   fail.
4. `version` and `package` are recorded wherever the extension's key is recorded (a run record, a
   saved style document, a logging configuration, a view or recipe), so a document can say which
   version of which vendor's extension produced it. What a reader does when the recorded version
   differs from the installed one is open decision 26; the recommendation is that a different
   MAJOR (or a different package under the same id) is read as unresolved, naming both, and a
   different minor or patch is accepted and noted in the run record.

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
8. **Typed option values (proposed).** Camera, layout and log-destination options arrive as
   `Record<string, unknown>`, so reading one needs a cast, which parity clause 6 forbids. The
   proposed `OptionValues<typeof options>` helper (`common.d.ts`) derives the value types from a
   `const` option array, and the registration types become generic over it so options arrive
   typed. Additive.
9. **Options are part of the extension's own contract.** Saved documents record an extension's
   option values, so removing or renaming an option, narrowing its range or changing its default
   is a major release of the EXTENSION. A saved value the installed extension no longer declares
   is a hard `E_UNKNOWN_OPTION` today, and a stored logging configuration that carries one fails
   as a whole. Aliases for renamed options, deprecation marks, and reading an unknown stored
   option as unresolved instead of failing are open decision 22.
10. **No secrets in options.** Options are plain JSON that is published, stored in configurations
   and recipes, and replayed; an API token or credential passed as an option is written into all
   of them. An extension MUST NOT ask for a secret as an option. A `secret` option type that the
   element resolves but never serialises is open decision 22.

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
   as unresolved, naming what to install (by the `package` recorded with the key, section 6.4),
   and never fetches code.
3. **Configuration files never enable egress.** No field of a style, recipe, annotation, view or
   project file may start a network request to a host the embedder has not allowed, and none of
   them may carry a logging configuration at all. "Files never load code" is not enough: a stored
   logging configuration that turns on the built-in `remote` destination sends every record to
   the URL it names without loading any code (`logging.md` section 7).
4. The Logging point is the most likely route for graph data to leave the page, because a
   destination receives every record's `data`. `logging.md` section "Security" states what the
   element promises and what it does not.
5. The conformance kit is not a security review. Its checks (a camera view's purity, "makes no
   network request") run in a trapped environment a hostile extension can detect; they catch
   mistakes, not malice.

### 9.3 Error containment

What the element does when an extension misbehaves at use time, per point:

| Point | Extension throws or rejects | Element's obligation |
| --- | --- | --- |
| Palette | cannot (data) | n/a |
| Format `detect` | treated as "does not claim this file" | MUST NOT fail the detection or the load |
| Format reader | the load fails | MUST emit the load failure the built-ins emit; a non-`GraphtyError` MUST be wrapped as `E_PARSE_FAILED` (or `E_FETCH_FAILED` when fetching failed) with the original as `cause`. A load with `replace: true` MUST leave the previous graph as it was; a default (adding) load keeps the rows that arrived before the failure, as 2.6.1 does for built-ins (`file-format.md` section 7) |
| Camera `compute` | the view fails | MUST reject the call that asked for the view with a `GraphtyError` (`E_INTERNAL`, `source: "view"`, when it is not already one); MUST NOT leave the camera partly moved **(not yet met:** 2.6.1 returns `compute(input)` unguarded, so the caller receives the plain error**)** |
| Layout engine | the layout fails | MUST report it once as a `GraphtyError` (wrapping as `E_INTERNAL` with `source: "layout"` when needed); MUST stop stepping that engine; nodes keep their last published positions. **(not yet met:** `LayoutManager.step()` calls `step()` and `publishPositions()` unguarded; the throw reaches the render loop's catch, which skips drawing that frame, emits an uncoded error in category `"other"`, and leaves the engine running, so it repeats every frame. The fix wraps both calls in `LayoutManager`, sets the engine stopped and emits one coded error.**)** |
| Algorithm | the run fails | MUST settle the run as failed with the error's code (wrapping as `E_INTERNAL` with `source: "run"` when needed); MUST NOT publish anything from a FAILED run; other runs continue. A run that stops at a limit the caller set MAY publish a partial result marked as such (`algorithm.md` section 2.2 item 9) |
| Log destination `write` | swallowed | MUST catch it, MUST still deliver the record to every other destination, and MUST NOT recurse (a failure while reporting a destination's failure is dropped) |

In every row, a failure in one extension MUST NOT prevent the use of any other extension or
built-in, and MUST NOT affect a session that never uses the failing extension.

An extension SHOULD throw `GraphtyError` with the codes its point lists. It MUST NOT throw a
`GraphtyError` with a code outside `ExtensionErrorCode` (`common.d.ts`) unless its point lists it.
"Wrapping when needed" means exactly: a thrown value that is not a `GraphtyError` is wrapped; a
`GraphtyError` passes through unchanged, including one whose code this element version does not
know (an extension built against a newer element), which a consumer reads as a generic failure.

### 9.4 Containing code extensions with a Content-Security-Policy

The page's Content-Security-Policy is the one boundary a page can enforce against its own code,
so it is the recommended containment for code extensions: a `connect-src` limited to the
embedder's own origins stops a reader, layout, algorithm or log destination from sending data
anywhere else, whatever it claims.

1. The element MUST work under a policy with no `unsafe-eval` and a `connect-src` limited to the
   embedder's origins, and its documentation MUST state the minimum `script-src` and `worker-src`
   it needs (including for its WebGPU path and its workers). **(not yet met:** not tested today.)
2. Every point's conformance kit includes "makes no network request": the extension is run with
   `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `navigator.sendBeacon` trapped, and
   any call it did not declare fails the check.
3. The snapshot-only algorithm contract and the proposed headless host (`algorithm.md` section 10)
   make a stronger mode possible later: running a plugin's `compute` in a dedicated worker with
   its own policy. It is a candidate isolation mode, not a promise of this version.

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
   may therefore have a different installed copy of graph-format than the element's. That is NOT
   safe for types taken from the plugin's own copy: `GraphSnapshot` is a class with a private
   member, which TypeScript compares by declaration, so a snapshot typed with one copy is not
   assignable to the other. A plugin therefore takes every snapshot type from `./extend`
   (`algorithm.md` section 3.3), and an element release that moves to a new graph-format major
   is an element major (section 6.2).
3. **An export carries whatever the chosen format can represent**: nodes, edges, attributes,
   positions, algorithm results as attributes, and style where the format has a place for it, with
   every omission reported as a loss note. `file-format.md` specifies the writer contract to match.
   The owner did NOT decide where third-party writers register. A workflow script summarising the
   decision added "third-party writers register through graph-io's existing registry"; that
   clause was not the owner's. It is open decision 1.

The three decisions were given as answers to the migration's owner questions on 2026-09-28 and
are recorded in the file below. The migration plan on its branch
(`design/graph-format/migration-plan.md`, section 6, "Decisions only the owner can make") still
lists all three as open; it needs updating to mark them decided, and until it is, this
specification and the decision record are authoritative for them.

See `design/decisions/2026-09-28-graph-format-migration-owner-decisions.md`.

Where this specification is not yet consistent with the migration:

1. After the migration the element's built-in readers are graph-io importers wrapped in
   `DataSource` classes, while a third-party reader is a `DataSource` subclass that yields
   records. The two are still the same kind of thing from the consumer's side (both registered
   classes, both in the catalogue), but they are different contracts from the author's side. Open
   decision 2 asks which one a third party writes.
2. The migration moves the element's static layout engines onto the snapshot: `SimpleLayoutEngine`
   loads the snapshot and the position array, and the per-call `{ nodes, edges }` objects go. A
   plugin extends `SimpleLayoutEngine` and reads `_nodes`, `_edges`, `positions` and `Node.data`
   (`layout.md`, including its worked example). That migration item MUST either keep those members
   working for plugins through an adapter until the next element major, or ship the snapshot
   layout contract (open decision 14) first. Changing them in a minor release breaks every batch
   layout plugin.
3. The edge identity accessor is specified two ways: this specification proposes
   `edgeId(row)`, the migration plan "the scoped input's snapshot plus the edge remap" (open
   decision 5 must pick one).

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
   normalisation, a reader's records and errors, an algorithm's output shape over a snapshot, a
   layout's placement, pins, holds and determinism through the proposed headless layout driver of
   `layout.md` section 9) MUST run in Node.
3. Checks that need a renderer (a layout placing real nodes, a palette painting real meshes, a
   camera view moving a real camera) MUST run in a headless browser through a documented Vitest
   browser-mode configuration the kit ships.
4. Every check has a stable name (the check names in each point's specification). A report lists
   each check with `passed`, `skipped` (with the reason: "not applicable to this extension's
   declared capabilities") or `failed` (with a message).
5. The kit MUST isolate its registrations: it registers the extension, runs the checks and calls
   the point's `clearRegistered<Kind>ForTesting()` afterwards.

6. No check passes or fails on wall-clock time. A check that is about responsiveness measures
   something structural (how often the extension yields, how large a sample a sniffer is given)
   and reports any timing it takes as a measurement or a warning, because a correct extension can
   miss a time budget on a slow CI runner and a bad one can meet it on a fast workstation. The one
   exception is a generous hang timeout (30 seconds), which detects an operation that never
   settles.

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
   writer does not do. Details in `file-format.md`; the writer's remaining one-way details are
   item 24. Until this is taken, no third party can ship a writer, so CX2 export for NDEx
   (`design/designloom/workflows/W25.yaml`) cannot be produced at all (`file-format.md` section
   14).
2. **Which reader contract a third party implements after the migration, and how detection
   ranks.** Options: (A) keep the element's `DataSource` subclass yielding records as the only
   third-party reader contract, and add an element adapter `DataSource.fromImporter(importer,
   descriptor)` so an author who already has a graph-io `GraphImporter` registers it without
   rewriting; (B) make graph-io's `GraphImporter` the contract and wrap it. **Recommended: A**,
   because it keeps every existing plugin working and gives both authors one registration verb.
   Detection is part of the same decision: today a plugin sniffer can never outrank a built-in, so
   a tab-separated plugin format loses to the CSV sniffer (`file-format.md` section 4).
   **Recommended:** adopt graph-io's confidence model for plugins (`sniff(head)` returning 0 to 1,
   over bytes), let a plugin outrank a built-in only with a strictly higher confidence, and return
   the ranked list with confidences so a dialog can show both.
3. **Host compatibility check.** Whether descriptors carry `requiresApi`, `version`, `package` and
   `mustUnderstand`, what `requiresApi` is checked against, and whether an absent range is
   accepted. **Recommended:** section 6.4 -- one full-semver contract version per point, bumped on
   any incompatible change to either kind of type; `requiresApi` optional with a warning when
   absent; refusal with `E_UNSUPPORTED` when excluded; the member named `requiresApi` on every
   point so it never collides with `AlgorithmDescriptor.requires`.
4. **Identifier grammar, vendor prefix and the element's own id space.** Whether section 4.3's
   grammar becomes a MUST, whether the design-studio proposal of `package:kind` keys (framework
   `conceptual-model.md` section 9) is adopted instead, and which ids the element may take for
   future built-ins in a minor release. **Recommended:** a vendor prefix is a MUST for every NEW
   third-party registration now (the conformance kit fails an unprefixed id), and a MUST for all at
   the next major; the element promises that a built-in id added in a minor release begins with
   `graphty-`, which third parties MUST NOT use, and that any other new built-in id is a major
   release; reject `package:kind` because a colon collides with the legacy algorithm address
   `namespace:type`. A vendor prefix is not collision-proof (nothing allocates prefixes); the
   `package` recorded with a key (section 6.4) is what tells two vendors apart in a document.
5. **The public edge identity accessor for algorithms.** `ScopedInput` has no public way to turn
   an edge row into the element's `Edge.id`, so a plugin that reads only the snapshot cannot
   publish an edge-shaped result once `algorithmGraph` is removed. The migration plan specifies the
   accessor as "the scoped input's snapshot plus the edge remap"; this specification proposes
   `edgeId(row)` and `subgraphEdgeIds(row)`. **Recommended:** `edgeId(row: number): string` on
   `ScopedInput` (rows of `graph`) and `subgraphEdgeIds(row)` for the subgraph, with the edge remap
   kept internal; update the migration plan to match. The accessor MUST ship before the
   `@deprecated` tag on `algorithmGraph` (`algorithm.md` section 3.1 item 4).
6. **`RegisterOptions` on the class-shaped verbs.** Add the optional second parameter to
   `Algorithm.register` and `LayoutEngine.register`, so `{ strict: true }` is uniform.
   **Recommended: yes** (additive).
7. **Refusing a descriptor-less algorithm class.** `Algorithm.register` today accepts a class with
   no `static descriptor` and files it under `namespace:type` with no built-in check, so a
   descriptor-less class declaring namespace `graphty` and type `degree` silently replaces the
   built-in implementation. **Recommended:** refuse a built-in `namespace:type` always (a bug fix),
   and refuse a missing descriptor from the next major (a breaking change).
8. **Persisting camera views and layout choices.** A camera view and a layout choice are recorded
   in no saved document that the element reads back in 2.6.1, for built-ins and plugins alike, so
   the "addressable from a saved document" parity clause is vacuous for these two points. The open
   graphty-element 3.0 pull request (section 14) already persists a `LayoutChoice { id, engine,
   options, dimension, scope }` in the project, with no extension version, which pre-empts this
   decision. **Recommended, and to settle before that pull request merges:** a layout record
   `{ id, package, version, options, seed, scope }` plus the resolved positions (or a pointer to the
   positions saved with the data), and a view record `CameraViewReference` (`camera.d.ts`) with
   `scope` and the resolved `CameraState`. When the plugin is installed but now computes
   something different, reopening restores the RECORDED outcome; recomputing is an explicit act.
   Decide it together with the view and recipe file formats.
9. **The conformance kit's name and home, and headless hosts.** **Recommended:** the entry point
   `@graphty/graphty-element/conformance` described in section 11.2, rather than a separate
   package, so the kit's version always equals the element's. The same decision covers the
   headless hosts the kit needs and batch users want: `runAlgorithmHeadless`
   (`algorithm.md` section 10), a headless layout driver (`layout.md` section 9), graph-format
   exporting its structural `GraphSnapshotContract` interface, whether the element may run a
   plugin's `compute` in a worker, and a Node-safe session that loads through readers, runs
   registered algorithms and exports through writers, so a pipeline can run without a browser.
10. **Palettes carried by a style document.** Today a document that carries a palette descriptor
    is refused unless that palette was registered first. The owner wants communities to share
    style and recipe files without sharing data, which argues for self-contained documents. But
    registering a document's palettes into the page-global, permanent registry lets untrusted data
    squat on an id (every later genuine document is refused), put false colour-blind-safety claims
    and misleading names into every picker beside reviewed palettes, and fill memory for the
    page's lifetime. **Recommended:** a document's palettes resolve in a scope OWNED BY THE
    DOCUMENT -- they paint that document's layers, shadow no registered palette elsewhere, are
    not listed in the page catalogue, and are dropped when the document is closed; a palette gains
    an optional `version` so a document can say which revision it carries; within a document the
    carried anchors win, so a document always paints the colours it was saved with; bounds on
    palettes per document, anchors per palette and string lengths are part of the schema. See
    `palette.md` section 5.
11. **Supported and internal exports on `./extend`.** The accelerator seam (`registerAccelerator`,
    `AcceleratorRegistry`, `GraphAccelerator`, ...) and the deprecated option schema are exported
    from the same entry point as the six contracts. **Recommended:** mark every export in the API
    report as `@public` (one of the six) or `@internal`, and move the accelerator exports to an
    `./internal` path at the next major.
12. **`graphty-catalog.json`.** A published data file with no format version and two of the six
    tables missing. **Recommended:** add `cameras` and `logSinks`, add a top-level `formatVersion:
    1` (a reader refuses an unknown major and ignores unknown tables), and validate it against
    `descriptors.schema.json`.
13. **Where records may leave the page, and who decides.** A log destination's own claim about
    where it sends data (`destinations`, `forwardsData`) is unverified, and the element redacts
    nothing. **Recommended:** (a) the descriptor members, shown by a settings panel as the author's
    claim; (b) an element-level redaction setting (`GraphtyLogger.configure({ redact })`) that by
    default strips `data` and error stacks before any non-built-in destination's `write` is
    called; (c) an element-level origin allowlist the embedder sets (`session.policy.allowedOrigins`
    or equivalent), checked by every fetch the element makes -- reader URL loads, a data source,
    the `remote` log destination -- and never widened by a document; (d) `parseLoggingURLParams`
    refuses to enable `remote` unless the embedder has opted in. See `logging.md` section 7.
14. **A snapshot-based layout contract.** The layout contract names the element's render classes
    (`Node`, `Edge`). The element's own layouts are moving onto graph-format snapshots. A successor
    contract -- a batch layout as an async function from a snapshot, options, fixed rows, a signal
    and a progress channel to a coordinate array (`layout.d.ts`, "Proposed") -- would give layouts
    progress, cancellation, Node testing and acceleration. It would also AMEND section 4.1: for a
    deprecation window, the Layout point would have two registration forms. **Recommended:** adopt
    it in a minor release beside `LayoutEngine`, deprecate `LayoutEngine` for plugins at the
    following major, and ship it before the migration changes `SimpleLayoutEngine` (section 10).
15. **Data sources as a seventh extension point.** Service queries (STRING, BioGRID, Neo4j,
    SPARQL), live feeds and lazy expansion do not fit a file reader, and today the only route is
    for a consumer to fetch and pass the text as `data`, which is the consumer-side integration
    the architectural principles forbid. **Recommended:** decide it before the file-format contract
    is frozen, as a seventh point with its own descriptor declaring the hosts it contacts, the
    service release it queried and the query parameters (both recorded as provenance), a
    credential slot whose values the element keeps and never logs or serialises, cancellation by
    `AbortSignal`, a found and not-found identifier report, a push mode for feeds beside polling,
    and rate limiting and caching owned by the element. A publish direction (uploading to a
    repository such as NDEx) belongs to the same decision. See `candidates.md` section 1.
16. **Forwarding run options to `compute`.** `seed`, `exact`, `sample` and `timeBox` are resolved by
    a run and not forwarded, so a stochastic plugin cannot be reproduced from the run's seed.
    **Recommended:** forward them on the run context (`AlgorithmRunContextParameters` in
    `algorithm.d.ts`), additively, for built-ins and plugins alike, with the seed rule and the
    options-aware cost model of `algorithm.md` section 5.1 item 3, and an element-enforced hard
    deadline for `timeBox`. Until then, refuse those options for an algorithm that does not receive
    them rather than record them. The same decision covers a per-run cap override the reader
    confirms explicitly, for a heavy run the reader knowingly accepts.
17. **Attribute, weight and result columns in the algorithm input.** Whether `ScopedInput.graph`
    carries the loaded attributes, which attribute fills the weights and what it means, how a
    declared `"attribute"` or `"partition"` option reaches its values, and whether other runs'
    results are readable. **Recommended:** `ScopedInputColumns.column(optionName)` and
    `ScopedInputWeightOption` (`algorithm.d.ts`); results readable as columns under their result
    paths and listed as run inputs; `subgraph()` keeps named columns, merging them by the
    `simplify` policy. The same resolution SHOULD serve a layout option of type `"attribute"`
    naming a result path (`layout.md` section 5). This is what combined hub scores, per-cluster
    profiles, weighted clustering and attribute-driven layouts need.
18. **Result shapes and value types beyond the eleven.** **Recommended, each additive but each a
    published shape:** (a) a `vector` field type with its dimension and an `embedding` shape with no
    ranking and no default layer, exported as a list attribute where the format has lists and as a
    loss note otherwise; (b) a `match-list` shape, rows of `{ matchId, score, bindings: role -> node
    or edge id }`, for pattern search; (c) an optional per-group label table on `community` and
    `layered-grouping`, used by legends and readings; (d) no derived-network shape: a pair list
    stays a table, and turning it into a network is an explicit "apply as edges" operation the
    element owns (or an export and re-import), listed in `candidates.md`; (e) a columnar result form
    (typed arrays over snapshot rows, structured-cloneable) beside the object form, for results of
    tens of millions of elements, decided before 3.x hardens the object form.
19. **How loads combine, and what a load reports.** A load ADDS to the graph by default and
    replaces it with `{ replace: true }` (2.6.1). Unspecified: what happens when two sources use the
    same node id (a string `"1"` against a number `1`, or two systems' `1234`), whether a load can
    JOIN an attribute table onto existing nodes by a key column, what provenance each element
    keeps, whether element-assigned edge ids are stable across reloads, and what survives an added
    load (runs, sets, annotations, positions). **Recommended:** load modes `add` (default),
    `replace` and `join` (by a key column, with a case policy); ids matched as strings, attribute
    conflicts last-writer-wins and listed; an optional id namespace per load; element-assigned edge
    ids a deterministic function of source, target, relation attribute and ordinal; runs marked
    stale after an added or joined load; and a LOAD REPORT (`LoadReport` in `file-format.d.ts`) --
    counts, per-record errors with line and severity, dangling endpoints, matched and unmatched
    keys, the limit reached -- delivered by the `data-loaded` event and returned by the load call,
    the same for built-in and plugin readers. The element also keeps a load record (format id,
    reader version, resolved options, declared direction, counts) beside the run records.
20. **Reader input beyond one string.** `getContent()` returns the whole input as one string: no
    binary format can be read from a URL, a compressed or multi-gigabyte file cannot be read at
    all, a load cannot be cancelled, and no element-owned limit bounds a body. **Recommended:**
    protected `getBytes()` and `getStream()` under the same retry policy; element-owned gzip and
    zip decompression by magic bytes and compound extensions (`.nt.gz`); an `AbortSignal` on every
    load, in the base class; element limits on bytes (refused with `E_TOO_LARGE`), body time, node
    and edge counts and nesting depth; `detect` given at most a fixed sample (4 KiB) as text AND
    bytes; a `declareSchema(...)` helper so a reader can state its label attribute, attribute
    types and graph-level metadata. Passed as arguments where possible (section 6.2 item 1).
21. **Registration trust.** Replacement by default lets any package loaded later take over a vetted
    plugin's id, with one console warning as the only signal. **Recommended:** refuse replacement
    by default outside development (`{ replace: true }` for hot module replacement); a
    `lockRegistrations()` an embedder calls once its plugins are in, after which every registration
    is refused; every replacement reported as a coded event; the `package` of each registration
    recorded (section 6.4) so a document can detect a different vendor under the same id.
    Changing the default later breaks plugins that rely on replacement, so decide it early.
22. **Option evolution and new option types.** **Recommended:** `OptionDescriptor.deprecatedNames`
    (aliases the element rewrites) and `deprecated: { since, replacement }`; a stored option the
    installed extension lacks is kept, reported as unresolved and not applied, rather than failing
    the whole configuration; a `secret` option type, resolved and passed to the extension but
    never serialised into a catalogue, configuration, recipe, run record, log record or error
    `details` (written as `{ "$secret": "<name>" }` and supplied again by the embedder); and new
    input types -- `edge-set`, `pair-list` (validated node-id pairs), `dataset` (a loaded,
    versioned non-graph table such as a gene-set file, recorded in the run record) and
    `result-field`. `OptionType` is closed for writers, so each is an element release.
23. **Scope roles.** A scope today means "report for these" for a whole-graph algorithm and
    "compute on these" only for `scopeInput = "subgraph"`. A what-if run needs "compute without
    these". **Recommended:** a run option `exclude: { nodes, edges }` that every algorithm receives
    as a subgraph, and refusal with `E_UNSUPPORTED` (not a caveat) when a caller asks an algorithm
    to compute on a scope it cannot honour.
24. **Export details.** **Recommended:** exported result columns are named `<run name>_<field>`
    (the run's `as` name, format-safe); run records are written as graph attributes wherever the
    format has them, with a `W_RUN_PROVENANCE_DROPPED` loss note otherwise; the writer receives the
    declarative style bindings (channel, source column, palette anchors, domain, midpoint, missing
    colour) beside the resolved values and raises `W_STYLE_MAPPING_RESOLVED` when it flattens a
    mapping; an export takes a caller-chosen scope and column list, each deliberate omission a
    loss note of its own (`W_EXCLUDED_BY_CALLER`); `ExportResult` carries bytes or a stream, not
    only text; `FormatDescriptor` gains `writerOptions` so an export dialog can be built from the
    catalogue; a writer may declare a subset of its reader's extensions; an older element
    publishes `canExport: false` for a descriptor that claims export rather than refusing the
    reader. Two of these go beyond the owner's words "whatever the format supports" and need his
    confirmation: whether style MAPPINGS (not only resolved colours) must be written, and whether a
    caller may export less than everything.
25. **A plugin reader answering a deprecated built-in id.** `sif` and `cx2` are reserved, unserved
    built-in ids; a saved document naming `cx2` fails even when a CX2 reader is installed under a
    vendor id. **Recommended:** an optional `serves: ["cx2"]` descriptor member letting one
    registered reader answer a deprecated, unserved built-in id.
26. **The run record, replay and document versioning.** **Recommended:** the `RunRecord` shape in
    `algorithm.d.ts` (key, package, extension version, element version, resolved options, seed
    actually used, scope, inputs, an input identity, caveats, partial); `static version` REQUIRED
    for plugins at the next major; replay of a record whose major version or package differs from
    what is installed reads as unresolved, naming both, and a minor difference is accepted and
    noted; every file that names an extension carries a format version with the rule of section 6.3
    item 6 and a member for extension provenance.
27. **Layout contract additions.** **Recommended, all additive:** the current coordinates of
    every node handed to an engine before `init` (a warm start, so successive slices of a changing
    graph move only what changed); a protected `heldPosition(index)` so a scoped layout can place
    its scope next to the held nodes; a notification when an attribute named by one of the
    layout's `"attribute"` options changes; a layout report (`notes`, `unplaced`) published with
    the settled event, so a layout that could not place a node says so; a published scene
    convention (axes, which way y points, how `scalingFactor` applies) and an optional descriptor
    `frame` (for example `"geographic-lonlat"`) a camera view can check; and a stated rule for what
    a filter does to the nodes a layout is given and the bounds a view frames.
28. **Camera view names against saved camera snapshots.** A registered view takes a name back from
    a snapshot the reader saved, so a bookmark becomes unreachable when a later release or plugin
    adds a view of that name. **Recommended:** separate namespaces (`{ preset: id }` for views,
    `{ snapshot: name }` for saved snapshots) in every route and document, since saved documents
    record the names.

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
| `design/graph-format/migration-plan.md` section 6 (branch `feat/graph-format-migration`) | the plugin seam, the dependency declaration and the export contents are open owner decisions | Decided on 2026-09-28; see `design/decisions/2026-09-28-graph-format-migration-owner-decisions.md` |
| same, item "element-plugin-seam" | the accessor is "the scoped input's snapshot plus the edge remap" | Differs from this specification's `edgeId(row)`; open decision 5 picks one |
| same, the static-layout item | `SimpleLayoutEngine` moves onto the snapshot | Must keep the plugin members working or ship the successor first (section 10 item 2) |
| `design/designloom/workflows/W25.yaml`, adoption note | the share menu exports CX2 | No built-in serves `cx2` and no writer seam exists; the note is wrong until open decision 1 is taken and a CX2 writer ships |

## 14. What graphty-element 3.0 changes (open pull request)

An open pull request (`feat/element-undo`, "undo and redo for every change a project saves")
releases graphty-element 3.0.0. As its description states, for these contracts it:

1. makes the layout engine's `addNode`, `addEdge`, `addNodes`, `addEdges`, `removeNode`,
   `removeEdge` and `attachPositions` protected, and `LayoutEngine.nodePositions` read-only. The
   element still calls them; a plugin overrides them as before, but no consumer can call them.
   `layout.md` section 3 lists them as methods the element calls and is unaffected in substance;
2. persists a `LayoutChoice { id, engine, options, dimension, scope }` in the project, with no
   extension version -- which pre-empts open decision 8 and should be settled before it merges;
3. adds `session.views` and `session.data.source()` with `ImportOptions` (`mode`), which bear on
   open decisions 8 and 19.

A plugin that follows section 3 item 3 declares the majors it was built against; a plugin built
against 2.x must widen its peer range after testing against 3.0. The rest of this specification
describes 2.6.1 and is updated when 3.0 is released.

## 15. Review record

Points raised in review and not adopted, with the reason.

| Raised | Why it was not adopted |
| --- | --- |
| The deprecated built-in ids `sif` and `cx2` claim `.sif` and `.cx2` in detection, so a dropped `.sif` file resolves to the unserved built-in | They claim nothing: they are listed in `UNSERVED_FORMAT_IDS`, not in the descriptor table detection reads, so `.sif` resolves to a registered reader. The related point, that a document naming `cx2` fails even with a CX2 reader installed, was adopted as open decision 25 |
| Add a `"keep"` value to `simplify` so a subgraph keeps parallel edges | `simplify: "none"` already keeps every parallel edge as its own row; `algorithm.md` section 3.1 now says so |
| Reserve every unhyphenated id for built-ins, so a hyphen means a vendor id | Built-ins already use hyphenated ids (`okabe-ito`, `force-2d`, `tol-vibrant`), so the rule cannot hold. Open decision 4 recommends a `graphty-` prefix for future built-ins instead |
| Rebase the whole specification on the 3.0 surface | 3.0 is an unmerged pull request; the specification describes the released element and section 14 lists what 3.0 changes, to be folded in when it ships |
| Treat a load as always replacing the graph | 2.6.1 adds by default and replaces only with `{ replace: true }`; the specification now says so and open decision 19 covers how loads combine |
| Declare a scope type in `common.d.ts` | The element already publishes one scope type, `ScopeInput`; section 5.1 names it rather than duplicating it |
| Narrow the built-in CSV sniffer so it no longer claims tab-separated text | Narrowing a built-in sniffer changes which format existing files are read as. The confidence model (open decision 2) solves the plugin case without that |
| Unknown values in an extension's descriptor should degrade (an unknown option type read as `"unknown"`) | Degrading hides the mismatch until use time. Section 6.3 item 2 refuses with `E_UNSUPPORTED` at registration, and `requiresApi` makes the refusal predictable |

