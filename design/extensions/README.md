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
4. Examples are informative, but every TypeScript example MUST type-check against the published
   `./extend` and `./logging` of the version it names, under `strict` and `noImplicitOverride`, with
   no cast of an element type: `node design/extensions/check-examples.mjs` extracts and checks them.
   The checker types `session` and `graph` from the element's own `./session` and `Graph` types,
   so a consumer-side call in an example is checked too. **(not yet met)** It compiles against
   the element's SOURCE entry files, not the built `dist/*.d.ts` a plugin compiles against, and
   nothing checks that each "Published" declaration in this directory equals its `./extend`
   counterpart (the structural `Node` that `layout.d.ts` once declared as published did not). The
   checker SHOULD also run after a build against `dist/`, with library checking on for the
   element's declarations, and a type-equality test file SHOULD assert every "Published"
   declaration against `./extend`, so the two cannot drift.

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
   import from the Node-safe entry points `./session` and `./schema`, because 2.6.1 publishes some
   things a contract names only there: the types `RunProgressReport`, `RunDirection`,
   `WeightMeaning` and `ScopeInput` on `./session`, and the FUNCTION `isPaletteSafe` on `./schema`,
   which `palette.md` tells an author to call (so a value import from `./schema` is allowed). Those
   entry points are consumer API and change for consumer reasons, and no point's contract version
   covers them, so a change there can break a plugin while its `requiresApi` range still passes.
   The element SHOULD re-export from `./extend` every type and helper a contract names, these
   included, covered by the point versions of section 6.4 as `common.d.ts` is; a plugin then
   imports nothing from `./session` or `./schema`. It MUST take snapshot types (`GraphSnapshot`,
   `NodeMask`, `EdgeMask`) from `./extend`, not from its own copy of `@graphty/graph-format`
   (`algorithm.md` section 3.3 explains why). It MUST NOT import from any other path of the
   element (`/src/...`, `/dist/...`); the package `exports` map makes those paths unreachable, and
   anything reachable only through them is not a contract. Some types the declaration files name
   are not exported by name at all; each is marked "NOT EXPORTED BY NAME" and the element SHOULD
   export it from `./extend`.
3. A plugin package MUST declare `@graphty/graphty-element` as a `peerDependency`, so that the
   consumer's single copy of the element is the one the plugin registers into. Two version checks
   then exist and answer different questions: the peer range says which element PACKAGE versions
   the plugin installs beside; `requiresApi` (section 6.4, proposed) says which version of its
   POINT's contract it needs. They must not be allowed to disagree:
   - Until the element enforces `requiresApi` -- in 2.6.1 and every release before the first one
     that does (section 6.4 item 3) -- the peer range is the ONLY guard, and a plugin SHOULD declare
     a range covering only the majors it was built and tested against. A `requiresApi` or
     `mustUnderstand` a plugin declares is an unknown member to those elements and is ignored.
   - Once the element enforces `requiresApi`, a plugin SHOULD declare a broad peer range (for
     example `>=2`) and let `requiresApi` be the gate. An element major usually breaks one or two
     points; a narrow peer range would make npm refuse (`ERESOLVE`) every palette or camera plugin
     at install time when only the algorithm contract changed.
   Every plugin extends or calls something on `./extend`, so no plugin can depend on
   `@graphty/graph-format` alone.
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
   is visible to every copy. The `v1` is the version of the stored shape. An INCOMPATIBLE change to
   the stored entry shape (the trigger of a contract major, section 6.4) MUST bump it, so the
   copies keep separate stores instead of misreading each other. An additive change (a new
   optional descriptor member) MUST NOT: a new key splits copies on different minors into separate
   registries, and a plugin registered through one copy then silently vanishes from the other
   copy's catalogue (`setLayout` answers `E_UNKNOWN_LAYOUT` with no warning). Copies that share a
   key rely on the rules that follow instead. **(not yet met)** Each copy checks built-in ids against its
   own table and validates with its own rules, and the frozen descriptor cache is shared, so an
   older copy can file an id a newer copy reserves, or publish descriptors without a member the
   newer copy derives. A conforming element MUST check a registration against the built-in ids
   of every copy sharing the store (the store records each copy's version and built-in ids),
   MUST re-validate an entry it did not register before using it, and MUST cache descriptors per
   copy. Re-validation is the full registration check against THIS copy's contract version for the
   point (`requiresApi`, `mustUnderstand`, union values); an entry that fails it is left out of this
   copy's catalogue, and using it answers `E_UNSUPPORTED` with `details` naming the registering
   copy's version. When the key is bumped for a contract major, the new copy MUST read the old
   key's store and emit one coded warning per entry it cannot adopt, so a plugin registered
   through an older copy never vanishes without a word. No test runs two versions together today; the parity suite needs one. The shared store
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
   extensions. **(not yet met)** 2.6.1 compares the descriptor OBJECT for algorithms and formats, so
   a subclass that inherits its parent's descriptor is treated as a re-import and is filed over
   the parent with no warning, even under `strict` (layouts differ: `LayoutEngine.register` returns
   early only for the identical class and otherwise publishes a fresh descriptor object every time,
   so a subclass under a taken id always gets the replacement warning); and its palette content key leaves
   out `plainName`, so re-registering a palette with a corrected name is a silent no-op.
5. **A different implementation under a taken id** replaces the earlier one and emits one console
   warning per id. With `{ strict: true }` it MUST instead throw `E_DUPLICATE_PLUGIN`. Replacement
   by default lets any later-loaded package take over a trusted plugin's id; whether the default
   becomes refusal, whether a page can lock its registries, and whether a replacement is reported
   as an event the embedder can observe are open decision 21.
6. **Malformed registration** MUST be refused at registration time with `E_BAD_COMMAND`, a
   `details.field` naming the member at fault, and `source: "registry"`. A value outside a CLOSED
   union (a palette `kind` of `"cyclic"`, a layout `maxDimensions` of 4) is malformed. An unknown
   value of an OPEN union (`costClass: "quadratic"`), or an unknown restricting member, is
   ambiguous: the element cannot tell a typo from a value a newer contract defines. It is refused
   with `E_UNSUPPORTED` (`details.field`, `details.value`) when the extension's `requiresApi` has a
   lower bound above this element's contract version for the point -- it says it was written for a
   newer contract -- and with `E_BAD_COMMAND` otherwise (section 6.3 item 2), so an author can tell
   "too new" from "wrong". "At registration time"
   matters: a fault found at use time surfaces far from the code that caused it. One shared
   validator, run by every `register` verb, MUST check the descriptor against
   `descriptors.schema.json` and the option-array rules of section 7 item 3. **(not yet met)**
   2.6.1 validates unevenly: `registerLogSink` checks only that a descriptor object and `create`
   exist, so a descriptor with no `options` is accepted and fails later with an uncoded
   `TypeError` inside `configure`; `registerCameraView` checks that `modes` is an array but not its
   values; `DataSource.register` does not check `plainName`, `canImport` or `options`;
   `registerPalette` does not check `colorblindSafe` entries or the TYPE of `id`, `plainName` or
   `description` (any non-empty value passes, so an object or a number reaches every picker's text),
   and `registerPalette(null)` passes its `typeof` check and then throws an uncoded `TypeError`;
   and no registry validates an option array (unique names, a default that satisfies its own constraints, an `enum` with values).
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
2. An id is recorded in saved documents, in run records (and every run id the element derives is
   computed from the algorithm key, section 4.4), in logging configurations and in URLs. An
   extension MUST therefore treat its id as permanent: renaming it is a breaking change for
   everyone who saved something that names it.
3. Two vendors can choose the same id; the second registration replaces the first (4.2 item 5). No
   namespacing rule exists today. A third-party id SHOULD begin with a vendor prefix followed by a
   hyphen (`acme-hop-reach`, `acme-heat`), and SHOULD match `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`. A
   hyphen is recommended over `.`, `:` and `/` because a dot is a path separator in selector paths
   and URLs, a colon is the separator of the legacy algorithm address `namespace:type`, and a
   slash is a URL separator. (Result paths are `results.<runId>.<field>`; the key appears in them
   only through a derived run id, section 4.4, but selectors and URLs still need the rule.)
   Whether this becomes a MUST, and whether it applies retroactively, is open decision 4.
4. The element may add built-in ids in a minor release (the id lists are open unions), and a
   registration under a built-in id always throws. So adding a built-in whose id a conforming,
   unprefixed plugin already uses breaks that plugin at import, and silently changes what every
   document naming the id means. Open decision 4 also covers the element's side of this: which id
   space the element reserves for its own future built-ins.
5. Ids compare EXACTLY: case-sensitive, no normalisation. `Acme-Turtle` and `acme-turtle` are two
   ids, and a document naming one does not resolve to the other.

### 4.4 Result paths and run ids

A published result value lives at `results.<runId>.<field>`, which is what a style selector, a
legend and a saved layer read. How the run id is formed is therefore part of every saved style's
meaning (`graphty-element/src/session/runs/runId.ts`):

1. When the caller names the run (`{ as: "clusters" }`), the run id IS that name.
2. Otherwise the element DERIVES it from the result the run answers, as
   `<slug>_<digest>` (`runId.ts`, `deriveResultId`): the slug is the algorithm key lower-cased
   (`algorithmSlug`), and the digest (`stableDigest`) is taken over exactly four inputs -- the
   algorithm key; the caller's `exact` option AS GIVEN (`true`, `false` or absent, so `{ exact:
   true }` and no `exact` give DIFFERENT ids although both runs are exact); the requested sample
   SIZE (`sample`, or null), so a run sampled at 100 and one sampled at 200 get different ids; and
   the scope SPECIFICATION (with the live keywords `"visible"` and `"selection"` replaced by the
   definition in force). The parameters and the seed are NOT part of it, and neither is the
   resolved scope membership. Whether `exact` should become a plain "sampled or not" flag before
   the derivation is frozen is part of open decision 23.
3. Consequences a style or recipe author can rely on: re-running with different parameters keeps
   the same path, so every layer bound to it repaints; the same key over the same scope
   specification gets the same derived id in another session, after a reload and on another
   network; renaming an algorithm key changes every derived id; two runs of one key that differ
   only in parameters cannot coexist without `as` names.
4. A style, recipe or template meant to be reused across runs and networks SHOULD bind to an `as`
   name, which the author controls, rather than to a derived id.
5. The derivation is part of the contract: changing it is a breaking change for every saved
   selector, whatever the release says. The conformance kit SHOULD ship golden vectors (a call and
   the id it derives) so a change fails a test.
6. **Future run options.** A run option that changes WHICH graph is computed (the proposed
   `exclude` of open decision 23) MUST enter the derivation, or a what-if run would overwrite the
   baseline's path. It enters through the scope specification in a way that leaves the id of a
   call WITHOUT the option byte-identical (an absent member is not hashed), so adding the option is
   not a change of every existing id.
7. A run that a later run of the same id supersedes (`E_SUPERSEDED`) repaints every layer bound to
   the path. Whether its run record and result survive in the analysis history is open decision 26.

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
   **(not yet met)** No algorithm constant is published: `KNOWN_ALGORITHMS` exists only in
   `src/catalog/types.ts`, on no entry point, so for algorithms this rule cannot be followed yet.
   Exporting one from `./extend` is additive; its name (for example `KNOWN_ALGORITHM_KEYS`) is a
   published name the owner confirms.
   **(not yet met)** `KNOWN_LAYOUT_IDS` omits `spiral` and `planar`, which the layout catalogue
   publishes as built-ins, so this comparison labels them third-party. The constant MUST list
   every built-in the catalogue publishes (additive), and a test should hold the two together.
5. `graphty-catalog.json`, the static catalogue file the package publishes, lists built-ins only
   by construction, and 2.6.1 omits cameras and log destinations from it. See open decision 12.
6. Every descriptor string (`plainName`, `description`, `technicalName`, option labels, caveat
   notes, loss notes, error messages) is PLAIN TEXT. A consumer MUST render it as text, never as
   markup: some of it will come from documents a stranger wrote (open decision 10), and a picker
   built with `innerHTML` would run what it carries. The same holds for every string the element
   hands a log destination or a consumer: `LogRecord.message`, `LogRecord.data`, `error.message`
   and `GraphtyError.details` carry file-authored text (node ids, attribute keys, parse snippets),
   and a diagnostics panel MUST NOT render them as markup. **(not yet met)** `formatLogRecord`
   passes control characters through, so a node id carrying a terminal escape sequence reaches a
   terminal or CI log intact; it SHOULD replace C0 and C1 control characters other than tab in
   interpolated values, and `checkLogSink` SHOULD feed a record containing markup and escapes. The schema bounds no string length or array
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
   inherited member. Adding an inherited member with an ordinary name is a contract MAJOR (a
   plugin may already declare `getBytes` or `heldPosition` with another meaning); it is a minor
   only when the name carries the reserved `graphty` prefix, and the plugin guides SHOULD tell
   authors not to declare members whose names begin with `graphty`. The proposals of open
   decisions 20 and 27 follow this rule (`layout.md` section 7 item 1 is corrected to match).
2. **Re-exported graph-format types** (`GraphSnapshot`, `NodeMask`, `EdgeMask`) are called by
   extensions. An element release that moves to a new graph-format major is therefore an element
   major, and a major of the contract version of every point whose called-by types include a
   snapshot type (Algorithm today; File format once writers or a snapshot reader land; Layout once
   it moves onto snapshots) -- not of Palette, Camera or Logging, which never touch one, so their
   plugins keep loading (section 6.4).
3. **Records and returned values an extension WRITES** (a reader's `AdHocData` records, a
   `CameraState`, an `AlgorithmOutput`) are implemented by extensions even where section 2 of a
   point lists the type as called by them. Giving a new meaning to a key an existing extension may
   already write -- a new reserved record key such as `time` or `label` -- reinterprets data every
   existing extension emits, so it is a contract major, or it arrives only by opt-in: a
   declaration (`declareSchema`) or a key under a reserved prefix no earlier extension can have
   written (for example `$time`).

### 6.3 Unknown, missing and future values

Every union in the declaration files is either OPEN (the element MAY add values in a minor
release) or CLOSED (a new value is a major release). The table lists each with the value a reader
uses for a value it does not know. A union in a published declaration file that the table does NOT
list is OPEN for readers, and a reader treats an unknown value as "not understood" (shown as text,
never acted on); a union MIRRORED from graph-format (`ImportReport.policy`, graph-format's
`DuplicatePolicy`) is always open for readers, because graph-format is a regular dependency whose
minor releases can extend it without an element major.

| Union | Open or closed | A reader meeting an unknown value |
| --- | --- | --- |
| `AlgorithmKey`, `LayoutId`, `FormatId`, `PaletteId`, `CameraId`, `LogSinkId` | open | treats it as an id nothing registered (`E_UNKNOWN_*` when used) |
| `OptionType` | open | renders the option as `"unknown"` |
| `OptionBound.from` | open | at registration, refused with `E_UNSUPPORTED` naming the value (an unknown bound fails closed, never "no bound"); a reader shows it as "a bound this version cannot check" |
| `AlgorithmDescriptor.category` | open | an ungrouped category |
| `AlgorithmDescriptor.scopeInput` | open | "unknown: may compute on the scope" (never read as `"none"`, which would understate what the extension does) |
| `ResultShape` | open | a `fact`: shows its graph values as a table and derives no layer |
| `CostClass` | open | `"unbounded"` |
| `LayoutDescriptor.sizeRating` | open | `500`, the most restrictive known value, shown as "unrated" (never `"any"`, which would offer the layout for every graph) |
| `LayoutDescriptor.structuralInputs` entries | open | ignored |
| `AttributeType` | open | `"mixed"` |
| `FieldDescriptor.type`, `ResultFieldSpec.type` | open | `"table"` (shown, never ranked or encoded) |
| `SimplifyPolicy` | open | refused with `E_UNSUPPORTED` naming the value |
| `FieldDescriptor.kind`, `WeightMeaning.meaning`, `Caveats.componentScope`, the input orientation, `ImportReport.policy`, `ImportReport.weights.resolvedFrom`, `LogRedaction` | open for readers | "not understood": shown as text, never acted on |
| `PaletteDescriptor.kind` | closed | -- |
| `ColorVisionDeficiency` | closed | -- |
| `DrawingMode` (`CameraDescriptor.modes`) | closed for writers, open for readers | an unknown entry in `modes` is ignored; the view is listed for the modes the reader knows (the schema marks it `x-open-union`) |
| `LayoutDescriptor.kind`, `maxDimensions` | closed | -- |
| `Caveats.precision`, `RunDirection` | closed | -- |
| `LogLevel` | closed | -- |
| `GraphtyErrorSource` | closed | -- |
| `ExtensionErrorCode` (`GraphtyErrorCode`) | open for readers, closed for writers | a generic failure |

1. **Open unions for readers.** A reader (a consumer or an extension) MUST handle an unknown value
   of an open union without throwing, using the value in the table. The serialised schema
   (`descriptors.schema.json`) lists the known values of an open union as documentation, marks
   the property `"x-open-union": true`, and MUST NOT be used to refuse a descriptor over one; a
   consumer validating a newer catalogue against an older schema treats an enum failure on a
   property so marked as an unknown value. A consumer MUST NOT switch exhaustively over an open
   union (an `assertNever` default), including one the table does not list. The declaration files type several open unions as closed
   literal unions (`OptionType`, `CostClass`, `sizeRating`, `ResultShape`), because the same types
   are what an extension WRITES and must stay closed for writing; so the type checker will not
   stop an exhaustive switch, and the rule is the only guard.
2. **Values an extension writes.** An extension MUST NOT write a value outside the union published
   by the contract version it declares (`requiresApi`, section 6.4), EXCEPT where the table's
   union is open for writers too: `AlgorithmDescriptor.category` takes a new string, which a reader
   shows ungrouped. An element that meets an unknown value in a registration MUST refuse it, never silently
   degrade it: with `E_UNSUPPORTED` and `details.value` naming it when the extension's
   `requiresApi` says it was written for a newer contract, and with `E_BAD_COMMAND` otherwise
   (section 4.2 item 6). Declaring `requiresApi` makes this refusal predictable: the newer
   extension says which contract it needs.
3. **Unknown descriptor members.** The element MUST ignore a descriptor member it does not know,
   and MUST NOT publish it in the catalogue. This lets an extension written for a newer contract
   run on an older element when the member is advisory. A member that RESTRICTS behaviour (a new
   precondition, an egress declaration) is not safe to ignore: an extension lists such members in
   `mustUnderstand` (section 6.4), and an element that does not know one refuses the registration.
   `mustUnderstand` names TOP-LEVEL members only, so every restricting member nested inside
   another (the proposed `required` on an option descriptor, open decision 22) MUST be introduced
   together with a top-level marker member that `mustUnderstand` can list (for example
   `optionFeatures: ["required"]`); for a class-shaped point `mustUnderstand` may also name a
   STATIC, so a new restricting static is covered the same way. `mustUnderstand`
   is itself a proposed member: every element that predates it ignores it like any other unknown
   member, so an extension relying on it MUST also set `requiresApi` to at least the contract
   minor that introduced it, and on elements older than that the peer range is the only guard
   (section 3 item 3). **(not yet met:** 2.6.1 publishes unknown members.) The conformance kit
   SHOULD check that a registration whose restricting member is unknown to the host is refused,
   not ignored.
4. **Missing optional members** take the default stated in the point's specification.
5. **Missing required members** MUST be refused at registration with `E_BAD_COMMAND` naming the
   member.
6. **Persisted descriptors and files naming extensions.** Every file and record the element
   persists -- the catalogue file, a style document, a run record, a load record, a view or
   layout record, every configuration file that names an extension -- carries a format version
   of two parts, a major and a minor. A descriptor is persisted only inside such a versioned
   container, never bare. The rules:
   - a reader reads a newer MINOR with unknown members ignored;
   - a reader refuses a newer MAJOR with a coded error naming both versions;
   - a reader MUST read every earlier major the element has shipped, migrating it on read, or
     refuse it with a coded error that names a migration path; a new major never orphans the files
     already saved.
   A `StyleDocument` today carries one integer, accepts only exactly `version: 1`
   (`StylesApi.ts`, `checkDocument`) and has no member for extension provenance, so the first
   additive change would have to be a major and would refuse every saved document. None of the
   proposed records (`RunRecord`, `LoadReport`, `CameraViewReference`) has a version member yet,
   and `graphty-catalog.json` has none. The rule and the members are part of open decision 26;
   the conformance kit then ships a v1 file for a newer reader and a v1.1 file for a v1.0
   reader. Two more rules for every persisted file:
   - a WRITER MUST stamp the lowest format version that can represent the content it writes, so
     a document that uses no new member or value stays readable by older readers;
   - for every CLOSED union that appears in a persisted file (a palette `kind`, a
     `ColorVisionDeficiency`), an older reader that meets an unknown value refuses the containing
     object with a coded error naming the value and the version that introduced it, and reads the
     rest of the file; the kit ships a fixture for it.
   `descriptors.schema.json` has a one-part `$id` (`descriptors-1.json`), so it also carries the
   two-part version of the container it validates (`x-format-version`), and a reader
   validates a newer minor against its own schema with the open-union and unknown-member
   exemptions of items 1 and 3.
7. **Values an extension RETURNS** (a `CameraState` from `compute`, an `AlgorithmOutput`, a layout
   report) follow item 3 for unknown members: the element ignores an unknown member only when it
   is advisory. A returned member that changes the outcome (a camera `up` vector) MUST be paired
   with a descriptor-level declaration the extension lists in `mustUnderstand` (for example
   `returnsUp: true`), so an element that predates it refuses the registration instead of
   rendering wrong. The kit ships a fixture for it.

### 6.4 Host compatibility (proposed)

Prior art is unanimous that a plugin should state which host contract it targets and that the
host should refuse, loudly and early, an extension it cannot honour (VS Code `engines.vscode`,
Figma's manifest `api`, Cytoscape desktop's per-class compatibility promise). The recommended
design, which is open decision 3 (`ExtensionCompatibility` in `common.d.ts`):

1. The element exports `EXTENSION_API_VERSIONS`, one full semver string per point (starting at
   `"1.0.0"`; node-semver refuses a two-part version such as `"1.0"`), each versioned
   independently of the package. One version per point, so a break in one contract does not
   refuse plugins of the other five. The bump rules:
   - **Minor.** Every additive change an extension of the point can use -- a member, a union value
     it may write, an error code the point lists -- bumps the point's MINOR. An extension's
     `requiresApi` lower bound MUST be at least the minor that introduced every member and value
     it writes; otherwise an older element passes the range check and then refuses the value,
     which is the failure the range exists to predict. So that the MUST can be checked, the
     element SHOULD publish, beside `EXTENSION_API_VERSIONS`, a per-point "introduced in" table
     (member path or union value to contract version, generated from `@since` tags in the
     declarations), and the conformance kit computes the minimum range from the registered
     descriptor and fails a `requiresApi` whose lower bound is below it.
   - **Major.** Only a change that can break an EXISTING extension of that point: removing or
     retyping a member an extension calls, adding a required member an extension implements, or
     delivering a value an existing extension could not have been written to handle. A value the
     element delivers only to extensions that declared it is NOT such a change: adding a
     `DrawingMode` is a camera MINOR, because a view that did not declare the new mode is never
     called in it (`camera.md` section 7). Adding a value to a closed union that only READERS see
     (a new palette `kind` in the catalogue) is versioned on the catalogue and document formats
     (section 6.3 item 6), not on `requiresApi`.
   - **Deprecation before removal.** A contract major MAY only remove what an earlier minor marked
     `@deprecated` with its replacement named. A new REQUIRED member (the planned `static version`
     of open decision 26, `package` of open decision 4) is introduced the same way: first optional,
     with a development warning when absent, for at least one full minor, and required only at the
     following major.
   - **No declaring a major in advance.** A major can also add a required member or deliver a
     value an existing extension was not written for, so a plugin cannot know it is compatible
     with a major that has not shipped. A `requiresApi` MUST NOT name a major that had not been
     released when the plugin was published, and the conformance kit refuses such a range. A
     plugin that followed a deprecation widens its range after testing against the new major.
   - **The shared vocabulary.** `common.d.ts` (`OptionType`, `OptionDescriptor`,
     `GraphtyErrorCode`) is used by every point, so a change to it bumps EVERY point's version, by
     the same rules.
2. Every descriptor MAY carry `requiresApi` (a node-semver range over its point's version, never
   `*` or empty), `version` (the extension's own version, which MUST be valid semver when present),
   `package` (the npm package that ships it) and `mustUnderstand`. A class-shaped extension
   carries them as statics of the same names; the static is authoritative, and a descriptor
   member that disagrees with it is refused with `E_BAD_COMMAND`. The member is `requiresApi`, not
   `requires`, on every point, because `AlgorithmDescriptor.requires` already holds graph
   preconditions. The declaration files intersect the descriptor types with
   `ExtensionCompatibility` only once this decision is taken (`WithCompatibility` in
   `common.d.ts`); until then a palette author cannot write `requiresApi` without a cast.
   **`version` and `package` are CLAIMS the extension makes about itself.** Nothing checks them
   against the module that registered: a malicious plugin can claim a trusted vendor's package
   name. They are provenance, usable to say what a document was made with, and never identity,
   never a trust decision, and never an install instruction (section 9.2 item 2).
3. At registration, a `requiresApi` range that excludes the point's version MUST be refused with
   `E_UNSUPPORTED`, `details.requiresApi` and `details.provided` set. How that refusal surfaces is
   part of open decision 3, because section 3 item 1 lets a plugin package register itself when
   its module is imported: a throw during module evaluation fails that module and every module
   that imports it, so one outdated plugin would blank the whole page instead of being refused.
   Recommended there: a compatibility refusal (`E_UNSUPPORTED` for `requiresApi`, and
   `E_DUPLICATE_PLUGIN` for an id the element reserved after the plugin shipped) does NOT throw by
   default; the element files the extension as refused, lists it in the catalogue as refused with
   the reason, and emits a coded event, while `{ strict: true }` keeps the throw; and the plugin
   guide teaches plugin packages to export a `register()` function rather than registering at
   import time. The kit then checks that importing an incompatible plugin does not throw. An absent `requiresApi` is
   accepted (so every existing extension keeps working) and SHOULD produce one console warning in
   development builds. The release notes of the first element version that enforces
   `requiresApi` MUST say so, and this specification then names that version: below it, the peer
   range is the only guard (section 3 item 3). The conformance kit ships pairs of ranges and
   versions that must pass and fail, including a v1 camera view registering on an element that
   knows an extra drawing mode.
4. `version` and `package` are recorded wherever the extension's key is recorded (a run record, a
   saved style document, a logging configuration, a view or recipe), so a document can say which
   version of which vendor's extension produced it, as the file author's claim. What a reader does
   when the recorded version differs from the installed one is open decision 26.

## 7. Options

Every point that takes configuration uses one mechanism: a `readonly OptionDescriptor[]` on the
descriptor (`common.d.ts`, `descriptors.schema.json#/$defs/OptionDescriptor`).

1. The declared options are, at once, what a form renders, what the catalogue publishes and what
   the element validates a caller's values against. An extension MUST NOT validate the same values
   a second way with different results.
2. The element MUST resolve a caller's values with `resolveOptionValues` before the extension sees
   them: defaults filled, an undeclared name refused with `E_UNKNOWN_OPTION`, a value of the wrong
   type or outside `min`/`max`/`values` refused with `E_OPTION_RANGE`. Every `OptionType` has a
   normative value shape the element checks: `string` and `attribute` a string, `seed` an integer
   in the seed domain (open decision 16), `node-id` a string or finite number, `node-set` an array
   of those, and each string and array under an element-owned length ceiling (with `maxLength` and
   `maxItems` members to tighten it, open decision 22); a value of type `unknown` coming from a
   stored or file-derived configuration is refused. Every `min` and `max` is enforced, a
   data-dependent bound (`{ from: "graph.nodeCount" }`) resolved against the loaded graph or the
   scope before the check. The extension therefore receives plain, validated data and SHOULD NOT
   re-validate it. **(not yet met)** 2.6.1's `checkValue` (`src/catalog/options.ts`) checks only
   `enum`, `number`, `integer` and `boolean`: `string`, `seed`, `node-id`, `node-set`,
   `attribute`, `partition`, `ordering` and `unknown` accept any value of any size, and
   `fixedBound` ignores every data-dependent bound, so such an option is unbounded. Until that is
   fixed an extension MUST validate every option whose type the element does not check, and a
   work-multiplying option MUST declare a FIXED numeric `max`. An option with NO `default` that
   the caller omits is simply ABSENT from the resolved values: nothing refuses the omission
   (`graphty-element/src/catalog/options.ts`). An extension MUST handle that absence, or fail the
   call itself with `E_OPTION_RANGE` naming the option. A declared `required` flag the element
   checks is part of open decision 22.
3. Option names MUST be unique within one descriptor, and MUST NOT be `__proto__`, `constructor`
   or `prototype` (section 9.2 item 6; the schema refuses them), nor any other member of
   `Object.prototype` (`toString`, `valueOf`, `hasOwnProperty`, ...). The root cause is in the
   element: `resolveOptionValues` reads `passed[option.name]` with no own-property check, so an
   omitted option named `toString` resolves to the inherited function instead of its default.
   **(not yet met)** The element MUST read a value only when `Object.hasOwn(passed, name)`; the
   name ban then only protects extensions that copy options into plain objects. The kit declares
   and omits options named `toString`, `valueOf` and `hasOwnProperty`. A default MUST satisfy the
   option's own constraints. An `enum` option MUST carry at least one `values` entry, and its
   default MUST be one of them.
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
   typed. It types an option with no default as OPTIONAL (item 2) and an `enum` as the union of
   its declared values, so a typed value cannot hide a missing or invalid one. Additive.
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
11. **An `"attribute"` option is checked as a string only (not yet met).** A misspelt column, or a
   column loaded as text where `attributeType` says `"integer"`, is accepted, and the extension
   computes a wrong answer with no error. The element SHOULD refuse a column that no element
   carries with `E_OPTION_RANGE` listing the nearest column names, and report a column whose type
   does not match; part of open decision 22.

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
   as unresolved, naming the missing id, and never fetches code. The element MUST NOT present a
   package name taken from a file as something to install: the file's author controls it, and a
   shared recipe naming a typosquatted package would turn "files never load code" into "files
   tell a person which code to load". It MAY show the file's claimed package labelled as the file
   author's claim ("this file says it was made with ..."). A mapping from extension ids to
   installable packages comes only from the embedder (an allowlist or catalogue it supplies), and
   only a package on that list is shown as an install suggestion.
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
6. **Untrusted strings are never object keys.** Node ids, attribute keys, option names and run
   names come from files a stranger wrote. The element and every extension MUST NOT use them as
   keys of a plain object: use a `Map`, or an object made with `Object.create(null)`, and
   `Object.hasOwn` for lookups. A node whose id is `__proto__` written as `positions[id] = ...`
   replaces the object's prototype instead of storing a row. **(not yet met)**
   `SimpleLayoutEngine.positions` is such an object (`layout.md` section 11), and
   `resolveOptionValues` reads `passed[option.name]` without an own-property check, which is why
   option names `__proto__`, `constructor` and `prototype` are forbidden (section 7 item 3). The
   conformance kits run a graph whose ids include `__proto__`, `constructor` and `toString`.
7. **URLs are recorded without credentials, everywhere.** Every URL the element writes into a
   log record, an error (its `message` as well as its `details`), a load record, a run record or
   a saved file MUST have its query string and user information removed. Until a `secret` option
   type exists (open decision 22), a token in a query string is the only way to authenticate a
   URL load, so without this rule it spreads into every record and every log destination.
   **(not yet met:** `DataSource` builds "Failed to fetch from <url>" with the full URL.**)** The
   conformance kit loads a URL carrying a query token and checks that no destination and no
   record receives it.
8. **In Node, an extension has the process's privileges.** The conformance kit's Node checks and
   the proposed headless session (open decision 9) run plugins in Node, where there is no
   Content-Security-Policy and a plugin can read the filesystem and environment variables (for
   example `NPM_TOKEN`), start processes and open sockets. The kit and the headless session SHOULD
   run plugins in a child process or worker with a scrubbed environment; the Node "makes no network
   request" trap list MUST include `node:http`, `node:https`, `node:net`, `node:tls`, `node:dns`,
   `undici`, `child_process` and `worker_threads` besides the browser APIs of section 9.4 item 2;
   the origin allowlist of open decision 13 applies to the headless session, with no default
   permission for link-local or private addresses (a replayed file naming
   `http://169.254.169.254/...` would otherwise read cloud credentials into a graph); and a saved
   file replayed headless is untrusted input exactly as in the browser.
9. **Saved hunts, filters and classifications.** Workflows such as
   `design/designloom/workflows/W07.yaml` and `W12.yaml` need a saved filter, a hunt or recipe
   record with its conclusion ("no threat found"), and classification labels, in shareable files.
   The configuration-file specifications (styles, recipes, annotations, views), written
   separately from this directory, own those files; before they are frozen they MUST cover these
   records, and every reference they make to a plugin's result path MUST follow the unresolved
   reference rule of item 2.

### 9.3 Error containment

What the element does when an extension misbehaves at use time, per point:

| Point | Extension throws or rejects | Element's obligation |
| --- | --- | --- |
| Palette | cannot (data) | n/a |
| Format `detect` | treated as "does not claim this file" | MUST NOT fail the detection or the load |
| Format reader | the load fails | MUST emit the load failure the built-ins emit; a non-`GraphtyError` MUST be wrapped as `E_PARSE_FAILED` (or `E_FETCH_FAILED` when fetching failed) with the original as `cause`. A load with `replace: true` MUST leave the previous graph as it was. A default (adding) load that fails part-way keeps, unmarked, the rows that arrived before the failure, for built-ins too; that is a DEFECT, not a parity promise, and open decision 20 recommends staged loads committed only on success (`file-format.md` section 7 item 3) |
| Camera `compute` | the view fails | MUST reject the call that asked for the view with a `GraphtyError` (`E_INTERNAL`, `source: "view"`, when it is not already one); MUST NOT leave the camera partly moved **(not yet met:** 2.6.1 returns `compute(input)` unguarded, so the caller receives the plain error**)** |
| Layout engine | the layout fails | MUST report it once as a `GraphtyError` (wrapping as `E_INTERNAL` with `source: "layout"` when needed); MUST stop stepping that engine; nodes keep their last published positions. **(not yet met:** `LayoutManager.step()` calls `step()` and `publishPositions()` unguarded; the throw reaches the render loop's catch, which skips drawing that frame, emits an uncoded error in category `"other"`, and leaves the engine running, so it repeats every frame. The fix wraps both calls in `LayoutManager`, sets the engine stopped and emits one coded error.**)** |
| Algorithm | the run fails | MUST settle the run as failed with the error's code (wrapping as `E_INTERNAL` with `source: "run"` when needed); MUST NOT publish anything from a FAILED run; other runs continue. A run that stops at a limit the caller set MAY publish a partial result marked as such (`algorithm.md` section 2.2 item 9) |
| Log destination `write` | swallowed | MUST catch it, MUST still deliver the record to every other destination, and MUST NOT recurse (a failure while reporting a destination's failure is dropped) |

In every row, a failure in one extension MUST NOT prevent the use of any other extension or
built-in, and MUST NOT affect a session that never uses the failing extension.

An extension SHOULD throw `GraphtyError` with the codes its point lists. It MAY also throw any
other published `GraphtyErrorCode` that its built-in peer can raise (for example `E_DISPOSED` when
the element was torn down while it worked), and MUST NOT invent a code. An extension never raises
the GPU device codes: the element owns the device (`algorithm.md` section 5.1 item 4).
"Wrapping when needed" means exactly: a thrown value that is not a `GraphtyError` is wrapped; a
`GraphtyError` passes through unchanged -- its code (known or not), `source`, `recoverable`,
`details` and `target` -- including one whose code this element version does not know (an
extension built against a newer element), which a consumer reads as a generic failure. **(not yet
met)** "Is a `GraphtyError`" is decided by `instanceof` this copy's class (`isGraphtyError` and
`GraphtyError.wrap`, `graphty-element/src/errors/GraphtyError.ts`). An error built by ANOTHER copy
of the element on the same page -- the case section 3 item 6 supports, a plugin bundling a newer
`./extend` -- is not recognised: it is wrapped, its code replaced by the caller's default
(`E_PARSE_FAILED`, `E_INTERNAL`) and kept only in `details.sourceCode`, and its `recoverable`
flag and details lost. The fix brands the class with a `Symbol.for` key (for example
`Symbol.for("graphty.error.v1")`) and tests the brand; the two-copy parity test needs a case.

### 9.4 Containing code extensions with a Content-Security-Policy

The page's Content-Security-Policy is the one boundary a page can enforce against its own code,
so it is the recommended containment for code extensions -- but only a PARTIAL one, and an earlier
draft of this section overstated it. `connect-src` governs `fetch`, `XMLHttpRequest`, `WebSocket`,
`EventSource` and `sendBeacon`, and nothing else. It does not govern an image load
(`new Image().src = "https://x.example/?d=" + ids`), a style, font or media fetch, a frame, a form
submission, a dynamic `import()` of a remote module, or a worker's URL; and no directive contains
top-level navigation (`location.href = ...`, `window.open`) or WebRTC, which can send data over a
data channel or leak through ICE candidates.

1. The element MUST work under a policy with `default-src 'none'` (or `'self'`) and explicit
   `connect-src`, `img-src`, `style-src`, `font-src`, `media-src`, `frame-src`, `form-action`,
   `worker-src` and `script-src` limited to the embedder's origins, with no `unsafe-eval`, and
   its documentation MUST state the minimum it needs of each (including for its WebGPU path and
   its workers). **(not yet met:** not tested today.) The embedder's documentation MUST say that
   navigation and WebRTC cannot be contained this way, so a code extension that uses them can
   still send data off the page.
2. Every point's conformance kit includes "makes no network request": the extension is run with
   `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, `WebTransport`,
   `RTCPeerConnection`, image loads (`Image` and `HTMLImageElement.src`), `link` prefetch and
   preload, a dynamically created `script`, dynamic `import()`, `Worker` construction from a URL,
   `form.submit`, `window.open` and assignment to `location` trapped, and any call it did not
   declare fails the check. This is mistake detection only (section 9.2 item 5).
3. The snapshot-only algorithm contract and the proposed headless host (`algorithm.md` section 10)
   make a stronger mode possible later: running a plugin's `compute` in a dedicated worker with
   its own policy. It is a candidate isolation mode, not a promise of this version, and it cannot
   be built on the current registration shape: a class-shaped extension is registered as a live
   class object, which cannot be posted to a worker and does not reveal the module it came from.
   Worker isolation needs a module-specifier form of registration (open decision 9); choosing the
   registration shape therefore decides whether isolation can ever exist.

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
4. **The seed.** The migration plan keeps a fixed element default seed of 42 for label
   propagation and routes every call that carries a `randomSeed` to the CPU port. In the element,
   `randomSeed` has `.default(42)` in its option schema and descriptor
   (`LabelPropagationAlgorithm.ts`), so EVERY run carries a seed, and under the plan's routing rule
   no element label propagation run reaches the GPU whichever seed rule is chosen, fixed or drawn.
   The loss of the GPU route follows from any rule that always fills the seed option. Open
   decision 16 must therefore decide whether an element-supplied seed counts as "set" for routing
   (for example, forward only a caller-given seed to the dispatcher), write one rule into both
   documents, and make the run record which route it took (open decision 26).
5. **Built-in output changes in a minor release.** The plan changes seeded built-in results in a
   graphty-element minor ("Label Propagation communities change for existing seeds"; Floyd-Warshall
   eccentricity on graphs with parallel edges). A built-in's run record carries the element
   version today, so a replay across that minor is accepted with only a note while the partition
   differs. Open decision 26 recommends a version per built-in algorithm whose major moves with
   its output.
6. **The export API carries less than the owner decided.** The plan's `element-export-api` item
   builds its snapshot from "the data bags and current positions" only. The owner's decision
   (item 3 above) includes algorithm results and style; the item's scope and its "Done when"
   check must say so, and must say how graph-level result tables leave the element
   (`file-format.md` section 8.1).
7. **A layout helper deleted in a minor.** The plan's static-layout item deletes
   `LayoutEngine.pairWeights` and `pairWeightKey`, the only route a weighted plugin layout has to
   weights (`layout.md` section 2). By section 6.2 that is a contract major; item 2 above applies
   to it too.
8. **`algorithmGraph` removed early.** The plan's `element-plugin-seam` item says to delete
   `toAlgorithmGraph` and its file "when nothing internal calls it", and its "Done when" requires
   that nothing in `graphty-element/src` constructs a legacy `Graph`. But `Algorithm.algorithmGraph`
   is itself implemented by calling `toAlgorithmGraph`, and `./extend` exports `AlgorithmGraphMode`
   and `AlgorithmGraphView` from that same file. Meeting that check in 3.x removes the deprecated
   API in a minor, against the owner's decision to remove it in 4.0. In 3.x the item MUST keep
   `toAlgorithmGraph`, the file's type exports and `algorithmGraph()` behind `@deprecated`; its
   "nothing constructs a legacy Graph" check applies to the element's own adapters only, and the
   deletion moves to the 4.0 removal item.
9. **CSV formula neutralisation is missing in the writer the element will use.** `file-format.md`
   section 8.1 item 4 holds every CSV and TSV writer to neutralising cells that begin with `=`,
   `+`, `-`, `@`, tab or carriage return. graph-io's CSV writer, which option A of open decision 1
   and the plan's `element-export-api` item make the element's own export code, quotes cells per
   RFC 4180 and neutralises nothing (`graph-io/src/common/escape.ts`, `quoteCsvCell`). The rule
   belongs in graph-io's shared cell writer, and the `element-export-api` "Done when" check must
   test it.

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
   A count it checks (nodes and edges from a reader) is a count AFTER the element's ingestion, not
   of records yielded, so the Node checks need the element's ingestion in the headless session of
   open decision 9.
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
5. The kit MUST isolate its registrations WITHOUT disturbing anyone else's. Clearing is wrong:
   `clearRegistered<Kind>ForTesting()` empties the whole shared registry of that kind, across every
   copy of the element on the page, including the registration the plugin module made when it was
   imported and any companion plugin's, and ES modules do not re-evaluate to restore them. The kit
   records the registry state before a check and restores it afterwards, through a snapshot and
   restore pair the element publishes for tests; registrations made outside the kit are left
   exactly as they were.

6. The kit ships graphs at the scale the design studio names, not only small ones -- a
   100,000-node event graph with several million edges, as `design/designloom/workflows/W07.yaml`
   starts from -- so "large graph" is tested rather than assumed, and degree-skewed graphs (two
   hubs joined to many leaves) that expose a cost model blind to degree.
7. No check passes or fails on wall-clock time. A check that is about responsiveness measures
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
   item 24. Option A also requires `./extend` to re-export graph-io's writer vocabulary
   (`GraphExporter`, `ExportCapabilities`, `LossNote`, `CommonExportOptions`) bound to the
   element's own graph-format and graph-io, because an exporter typed from the author's own
   graph-io names the author's graph-format snapshot (`file-format.md` section 8.4); graph-io's
   peer range then becomes part of the compatibility promise. Until this is taken, no third party
   can ship a writer, so CX2 export for NDEx (`design/designloom/workflows/W25.yaml`) cannot be
   produced at all (`file-format.md` section 14). Take it, with item 24, before the migration's
   `element-export-api` item ships, whose scope section 10 item 6 already requires to widen.
2. **Which reader contract a third party implements after the migration, and how detection
   ranks.** Options: (A) keep the element's `DataSource` subclass yielding records as the only
   third-party reader contract, and add an element adapter `DataSource.fromImporter(importer,
   descriptor)` so an author who already has a graph-io `GraphImporter` registers it without
   rewriting; (B) make graph-io's `GraphImporter` the contract and wrap it. **Recommended: A**,
   because it keeps every existing plugin working and gives both authors one registration verb.
   Detection is part of the same decision: today a plugin sniffer can never outrank a built-in, so
   a tab-separated plugin format loses to the CSV sniffer (`file-format.md` section 4).
   **Recommended:** adopt graph-io's confidence model for plugins (`sniff(head)` returning 0 to 1,
   over bytes), let a plugin outrank a built-in only with a strictly higher confidence -- AMONG THE
   FORMATS THAT CLAIM A FILE'S EXTENSION as well as in content detection, so a JSON-LD reader can
   win a `.json` file whose sample carries `@context` -- and return the ranked list with
   confidences so a dialog can show "JSON (0.5) / JSON-LD (0.95)". Detection also takes a media
   type (the response `Content-Type`, `File.type`), which ranks a format whose `mimeTypes` match
   above content sniffing, and strips a URL's query and fragment before taking its extension
   (`file-format.md` section 4 items 2, 9 and 10). The media-type rule needs three more parts, or
   it hands every `.txt` file and `text/plain` response to whichever plugin claims `text/plain`
   (formats with no registered type -- SIF, GMT, most lab TSVs -- can claim nothing else, and raw
   file hosts serve Turtle as `text/plain`): matching strips parameters and compares
   case-insensitively; a match on a GENERIC type (`text/plain`, `text/csv`,
   `application/octet-stream`, `application/json` for a JSON dialect) never outranks a positive
   content sniff; and `mimeTypes` may be empty, or its entries marked generic, for a format with
   no specific type. Compound extensions (`.nt.gz`) are matched by the longest declared suffix
   once element decompression lands (item 20); until then a multi-dot extension is refused at
   registration.
3. **Host compatibility check.** Whether descriptors carry `requiresApi`, `version`, `package` and
   `mustUnderstand`, what `requiresApi` is checked against, and whether an absent range is
   accepted. **Recommended:** section 6.4 -- one full-semver contract version per point; a minor
   for every additive change an extension can use, a major only for a change that can break an
   existing extension of that point, and only after a deprecation; the shared vocabulary bumping
   every point; `requiresApi` optional with a warning when absent; refusal with `E_UNSUPPORTED`
   when excluded; the member named `requiresApi` on every point so it never collides with
   `AlgorithmDescriptor.requires`; a broad peer range once `requiresApi` is enforced (section 3
   item 3). Also part of it: whether a compatibility refusal throws. Recommended: it does not by
   default -- the element files the extension as refused, lists it in the catalogue with the
   reason and emits a coded event, and `{ strict: true }` keeps the throw -- and plugin packages
   export a `register()` function rather than registering on import, which the guide teaches
   (section 6.4 item 3). A throwing default would make one incompatible plugin blank the page.
4. **Identifier grammar, vendor prefix and the element's own id space.** Whether section 4.3's
   grammar becomes a MUST, whether the design-studio proposal of `package:kind` keys (framework
   `conceptual-model.md` section 9) is adopted instead, and which ids the element may take for
   future built-ins in a minor release. **Recommended:** a vendor prefix is a MUST for every NEW
   third-party registration now (the conformance kit fails an unprefixed id), and a MUST for all at
   the next major; the element promises that a built-in id added in a minor release begins with
   `graphty-`, which third parties MUST NOT use, and that any other new built-in id is a major
   release; reject `package:kind` because a colon collides with the legacy algorithm address
   `namespace:type`. A vendor prefix is not collision-proof (nothing allocates prefixes), and the
   grammar cannot be parsed back into vendor and name (`acme-kg-turtle` could be vendor `acme` or
   `acme-kg`). So `package` becomes REQUIRED on every third-party registration at the same time
   the prefix becomes a MUST, and every document that records an id records the `package` with
   it. Ids compare exactly (section 4.3 item 5). The recorded `package` is still only the
   extension's claim (section 6.4 item 2): it lets an honest document say which vendor it meant,
   and it cannot catch a plugin that lies.
5. **The public edge identity accessor for algorithms.** `ScopedInput` has no public way to turn
   an edge row into the element's `Edge.id`, so a plugin that reads only the snapshot cannot
   publish an edge-shaped result once `algorithmGraph` is removed. The migration plan specifies the
   accessor as "the scoped input's snapshot plus the edge remap"; this specification proposes
   `edgeId(row)` and `subgraphEdgeIds(row)`. **Recommended:** `edgeId(row: number): string` on
   `ScopedInput` (rows of `graph`) and `subgraphEdgeIds(row)` for the subgraph, with the edge remap
   kept internal; update the migration plan to match. This is a BLOCKER for the whole algorithm
   contract, not only for the deprecation: `algorithmGraph()` supplies no edge ids either, so no
   conforming plugin can publish an edge-shaped result today, on any graph (`algorithm.md` section
   3.1 item 4). The decision must also say what a value published for a subgraph row that merged
   several parallel edges means (copied to every id behind it, or refused). The accessor MUST ship
   before the `@deprecated` tag on `algorithmGraph`. It costs little: the snapshot handed to plugins
   already carries an element-internal edge column `graphty.edgeId` (u32), and `Edge.id` is its
   value printed as a string (`src/data/edgeIdentity.ts`); the element's own `scopeEdges` derives
   ids exactly so. `edgeId(row)` is a thin wrapper over that column, and the decision must say
   whether the column survives the subgraph's edge remap. Until then a plugin MUST NOT read the
   column itself (`algorithm.md` section 3.1 item 6).
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
   A layout and the camera view framed on it are saved together as ONE view record, because a
   camera view alone does not reproduce a figure. Restoring recorded positions instead of
   recomputing also closes a hang: a batch `doLayout` runs on the main thread with no size gate,
   so a project whose saved layout is recomputed on open can freeze the page on every open.
   Decide it together with the view and recipe file formats. Two members the recommended records
   lack: the drawing MODE (`mode` on `CameraViewReference`, `dimensions` on the layout record),
   because a 3D state holds position and target and a 2D state zoom and pan, and restoring one
   in the other mode frames nothing -- on restore the element switches to the recorded mode or
   reports the view unresolved in this mode; and a serialised SCOPE rule: a live keyword
   (`"selection"`, `"visible"`, `"largest-component"`) is replaced by its definition, or its member
   ids, when the record is saved, as run ids already do (section 4.4 item 2), so a saved
   "APAC chokepoints" view frames the same twelve suppliers when the deck is reopened. Whether a
   project holds several networks (a parent and derived subnetworks, each with its own runs,
   layouts and views) is decided here too, because every record would then name its network
   (`candidates.md` section 19).
9. **The conformance kit's name and home, and headless hosts.** **Recommended:** the entry point
   `@graphty/graphty-element/conformance` described in section 11.2, rather than a separate
   package, so the kit's version always equals the element's. The same decision covers the
   headless hosts the kit needs and batch users want: `runAlgorithmHeadless`
   (`algorithm.md` section 10), a headless layout driver (`layout.md` section 9), graph-format
   exporting its structural `GraphSnapshotContract` interface, whether the element may run a
   plugin's `compute` in a worker, and a Node-safe session that loads through readers (with the
   element's own ingestion and edge-id assignment), runs registered algorithms, replays a run
   record from a saved file and exports through writers, so a pipeline others cite can run in CI
   without a browser. **Recommended additions** (`extend-snapshot.d.ts`): `./extend` re-exports
   every type a proposed member returns (`Column`); a snapshot builder bound to the element's
   graph-format copy (`snapshotFromEdgeList`), for a plugin's Node tests and for derived graphs; a
   worker transfer pair (`toTransferable`, `fromTransferable`); `runAlgorithmHeadless` taking the
   structural contract, an edge scope and an exclusion; and a `context.run(key, snapshot, params)`
   so a plugin can compute a null model with the element's own algorithms instead of
   reimplementing them. Found in review, all part of the same decision:
   - the headless host returns the DERIVED result -- values, `rank`, `percentile`, the summary,
     caveats and the result paths it would publish, computed by the same statistics module the
     session uses (or a Node-safe `deriveResult(output)` on `./extend` that the element itself
     uses) -- because otherwise a Node pipeline must reimplement the tie and percentile rules, the
     disagreement `algorithm.md` section 2 exists to prevent;
   - `snapshotFromEdgeList`, or a sibling builder, accepts named node and edge columns with their
     `AttributeType`, so an attribute- or partition-driven plugin can be tested headless;
   - a module-specifier form of registration for algorithms (for example
     `registerAlgorithmModule({ descriptor, module: new URL("./score.js", import.meta.url) })`),
     without which neither worker isolation (section 9.4 item 3) nor an OBSERVED module identity
     (item 21) can be built;
   - a `context.worker(url | Worker)` helper that forwards the abort signal, relays progress into
     `report` and counts work units the worker reports, so a worker-based plugin neither rebuilds
     that protocol nor fails the kit's "yields" check (`algorithm.md` section 5.1 item 6);
   - a `forEachChunked` overload taking a count (`step(index)`) or any `ArrayLike`, so a plugin
     over tens of millions of rows does not first allocate an array of row numbers;
   - whether a plugin may call `@graphty/algorithms`' snapshot functions on the element's
     snapshot: recommended, the algorithms package accepts the structural
     `GraphSnapshotContract` rather than the class, so any copy's snapshot is accepted without a
     cast, while `context.run(key, snapshot, params)` covers registered algorithms.
10. **Palettes carried by a style document.** Today a document that carries a palette descriptor
    is refused unless that palette was registered first. The owner wants communities to share
    style and recipe files without sharing data, which argues for self-contained documents. But
    registering a document's palettes into the page-global, permanent registry lets untrusted data
    squat on an id (every later genuine document is refused), put false colour-blind-safety claims
    and misleading names into every picker beside reviewed palettes, and fill memory for the
    page's lifetime. **Recommended:** a document's palettes resolve in a scope OWNED BY THE
    DOCUMENT -- they paint that document's layers and shadow no registered palette elsewhere; the
    document is open from being applied until its last layer is removed, a load with
    `replace: true` does not close it, and while it is open the picker lists its palettes marked
    as the document's; a carried built-in id is refused and a carried id registered by code with
    other colours is refused or shown under a document-local name; a palette gains an optional
    `version` so a document can say which revision it carries; within a document the carried
    anchors win, so a document always paints the colours it was saved with; a document's palette
    is compared by kind and anchors only; bounds on palettes per document, anchors per palette and
    string lengths are part of the schema. See `palette.md` section 5.
11. **Supported and internal exports on `./extend`.** The accelerator seam (`registerAccelerator`,
    `AcceleratorRegistry`, `GraphAccelerator`, ...) and the deprecated option schema are exported
    from the same entry point as the six contracts. **Recommended:** mark every export in the API
    report as `@public` (one of the six) or `@internal`, and move the accelerator exports to an
    `./internal` path at the next major.
12. **`graphty-catalog.json`.** A published data file with no format version and two of the six
    tables missing. **Recommended:** add `cameras` and `logSinks`, add a top-level two-part
    `formatVersion` (`{ "major": 1, "minor": 0 }`, with the rules of section 6.3 item 6: a reader
    refuses an unknown major and ignores unknown tables and members), and validate it against
    `descriptors.schema.json`.
13. **Where records may leave the page, and who decides.** A log destination's own claim about
    where it sends data (`destinations`, `forwardsData`) is unverified, and the element redacts
    nothing. **Recommended:** (a) the descriptor members, shown by a settings panel as the author's
    claim; (b) an element-level redaction setting, settable from code only, that by default strips
    `data`, `error.stack`, `error.cause` and `GraphtyError.details` before the `write` of EVERY
    destination that sends records off the page, the built-in `remote` first among them, with the
    element's own log sites keeping graph values out of message text; (c) an element-level origin
    allowlist the embedder sets (`session.policy.allowedOrigins` or equivalent), checked by every
    fetch the element makes -- reader URL loads, a data source, the `remote` log destination --
    and never widened by a document; (d) `parseLoggingURLParams` refuses to enable `remote` unless
    the embedder has opted in; (e) a stored or URL-derived configuration may not change redaction
    or raise the level an egress destination receives. See `logging.md` section 7. Review
    inverted the default of (b): the only thing that tells the element a destination "sends records
    off the page" is the destination's own claim, which may be absent (every 2.6.1 plugin) or
    wrong, a live `Sink` attached with `addSink` has no descriptor at all, and the built-in
    `console` destination is read by error trackers, remote devtools and browser extensions.
    **Recommended instead:** redaction and the allowlist gate apply to EVERY destination, `console`
    and `addSink` objects included, except destinations the embedder marks as in-page IN CODE
    (for example `GraphtyLogger.trustInPage(id)`), never on the destination's own claim; a missing
    or empty declaration is treated as egress; redaction also covers `error.message` of errors
    raised outside the element, or extension errors carry no input content in their message (it
    goes to `details`); and `lockRegistrations()` (item 21) also refuses `addSink` and
    `configure({ sinks: [liveObject] })`. A URL is recorded by default as its origin plus a digest
    of the full URL, with the path kept only when the embedder opts in, because an internal host
    name and an incident path (`/api/cases/INC-4411/export`) are themselves sensitive.
14. **A snapshot-based layout contract.** The layout contract names the element's render classes
    (`Node`, `Edge`). The element's own layouts are moving onto graph-format snapshots. A successor
    contract -- a batch layout as an async function from a snapshot, options, fixed rows, a signal
    and a progress channel to a coordinate array (`layout.d.ts`, "Proposed") -- would give layouts
    progress, cancellation, Node testing and acceleration. It would also AMEND section 4.1: for a
    deprecation window, the Layout point would have two registration forms. **Recommended:** adopt
    it in a minor release beside `LayoutEngine`, deprecate `LayoutEngine` for plugins at the
    following major, and ship it before the migration changes `SimpleLayoutEngine` (section 10).
    Two points to settle in it: what a SCOPED layout is given -- the draft said `graph` is the
    scope's compact subgraph and `fixed` masks rows "outside the scope", which a subgraph has none
    of, so a scoped re-layout could not see the nodes it must sit beside. Recommended: `graph` is
    the WHOLE snapshot, with a `scope` mask and a `fixed` mask over the same rows (`layout.d.ts`);
    and an element-owned attribute accessor (`column(optionName)`), resolving an `"attribute"`
    option's PATH exactly as styles and filters do, so `location.lat` means the same to a layout
    as to a filter (`layout.md` section 5 item 5).
15. **Data sources as a seventh extension point.** Service queries (STRING, BioGRID, Neo4j,
    SPARQL), live feeds and lazy expansion do not fit a file reader, and today the only route is
    for a consumer to fetch and pass the text as `data`, which is the consumer-side integration
    the architectural principles forbid. **Recommended:** decide it before the file-format contract
    is frozen, as a seventh point with its own descriptor declaring the hosts it contacts, the
    service release it queried and the query parameters (both recorded as provenance), a
    credential slot whose values the element keeps and never logs or serialises, cancellation by
    `AbortSignal`, a found and not-found identifier report, a push mode for feeds beside polling,
    and rate limiting and caching owned by the element. A publish direction (uploading to a
    repository such as NDEx) belongs to the same decision. Also part of it: an `ambiguous`
    identifier category with the candidates and a recorded resolution that replay reuses; a
    service `release` option pinned by default, a different release reading as unresolved on
    replay; for live feeds, an element-owned retention policy (a time window on a declared
    timestamp, a maximum count) and removal records, with evicted elements that runs, sets and
    annotations name reported as unresolved; and a source that hands a body and its media type to
    the format registry rather than parse the same format a second way. Retention and removal
    shape the project and load-record formats, so they are one-way too. Also: a source-reported
    `truncated` flag with the limit hit (SPARQL endpoints and paged APIs cut a result at a row cap
    and still answer success), surfaced in the load report as a warning; paging owned by the element
    (a continuation token or offset loop under its rate limit); and a conformance check against a
    capped fake endpoint. See `candidates.md` section 1.
16. **Forwarding run options to `compute`.** `seed`, `exact`, `sample` and `timeBox` are resolved by
    a run and not forwarded, so a stochastic plugin cannot be reproduced from the run's seed.
    **Recommended:** forward them on the run context (`AlgorithmRunContextParameters` in
    `algorithm.d.ts`), additively, for built-ins and plugins alike, with the seed rule and the
    options-aware cost model of `algorithm.md` section 5.1 item 3, and an element-enforced hard
    deadline for `timeBox`. Until then, refuse those options for an algorithm that does not receive
    them rather than record them. The same decision covers a per-run cap override the reader
    confirms explicitly, for a heavy run the reader knowingly accepts. Further:
    - **One seed rule for the element and the migration.** Whether the element DRAWS a seed per run
      or uses a FIXED default (the migration plan keeps 42 for label propagation), and that
      forwarding a seed never silently changes the CPU or accelerator route (section 10 item 4).
      Recommended: a drawn seed, recorded, with the route recorded too.
    - **Layouts.** The same rule for every layout that declares a `"seed"` option: the element
      supplies and records a seed the caller left empty, and the conformance kit fails a
      stochastic layout that declares none. The layout record of open decision 8 carries it.
    - **A run budget the element owns.** The cost cap compares an estimate the AUTHOR supplies;
      nothing measures the run, and the proposed deadline applies only when the caller passes
      `timeBox`. The element already meters work through `forEachChunked` and `yieldNow`, so it
      can enforce an operation or wall-clock ceiling per run and per document or recipe execution,
      ending the run as partial or with `E_CAP_EXCEEDED`, whatever the estimate said. The cost
      model is also handed graph statistics (`maxDegree`, the sum of squared degrees) beside `n`
      and `m`, because `(n, m)` cannot express degree-dependent cost; and a pair-list or other
      table result carries a declared top-k bound.
    - **The accelerator verdict.** A read-only `context.acceleration` (available, policy,
      precision) for plugins (`algorithm.md` section 5.1 item 4), with the device limits
      (`maxBufferSize`, `maxStorageBufferBindingSize`) so a plugin can tell "too large" from "no
      accelerator".
    - **Work inside a step.** `forEachChunked` checks every 1,024 items and yields only once 16 ms
      have passed, and the kit counts items, so neither the kit nor the run budget sees work done
      inside one step (a hub's neighbourhood on a star). A `context.work(units)` channel, or a
      `forEachChunked` weighted by declared work, makes that work visible to both.
    - **The seed domain.** A seed is an unsigned integer in `[0, 2^32)` (or `[0, 2^53)`, the owner
      picks), refused with `E_OPTION_RANGE` outside it and drawn uniformly from it by the element,
      so a seed from numpy or R (up to 2^64) is refused rather than rounded into a seed that was
      never used. `common.d.ts` and the schema then state it.
17. **Attribute, weight and result columns in the algorithm input.** Whether `ScopedInput.graph`
    carries the loaded attributes, which attribute fills the weights and what it means, how a
    declared `"attribute"` or `"partition"` option reaches its values, and whether other runs'
    results are readable. **Recommended:** `ScopedInputColumns.column(optionName)` and
    `ScopedInputWeightOption` (`algorithm.d.ts`); results readable as columns under their result
    paths and listed as run inputs; `subgraph()` keeps named columns, merging them by the
    `simplify` policy. The same resolution SHOULD serve a layout option of type `"attribute"`
    naming a result path (`layout.md` section 5). This is what combined hub scores, per-cluster
    profiles, weighted clustering and attribute-driven layouts need. Take it BEFORE the algorithm
    contract is frozen: until it is, a plugin sees topology plus an unpromised weights array (see
    below) and no attribute columns, and the cores of `design/designloom/workflows/W21.yaml`
    (weighted MCL by the published protocol), `W08.yaml` (ranking by centrality and druggability)
    and `W12.yaml` (anomalies over edge attributes) cannot be written as conforming plugins.
    **As built, weights already reach a plugin.** 2.6.1 fills the snapshot's `weights` from the
    configured `data.knownFields.edgeWeightPath`, then the legacy `value` key, else 1
    (`src/data/ingest.ts`, `resolveEdgeWeight`), merges them under the repeated-edge policy, and
    `ScopedInput` merges them again by `simplify` (`simplified({ weights: simplify })`), so
    `input.graph.weights` and `subgraph().weights` are populated arrays reachable through the
    published `GraphSnapshot` type. What is missing is the PROMISE: what the numbers mean (a
    strength, not a distance), that a plugin may rely on them, and `caveats.weight`.
    **Recommended:** publish `graph.weights` as the strength from that key as part of the contract
    now, and narrow the rest of this decision to attribute columns, weight meaning and other runs'
    results. `design/designloom/workflows/W13.yaml` (validating a knowledge graph against its
    ontology: every Person has a label, every `worksFor` ends at an Organization) is one more
    reason to take it before the contract freezes: a validator must read `rdf:type`.
    Also part of it: per-EDGE columns under `simplify: "none"`, and a merge policy per column
    (sum, max, min, first, list) for the other policies, because per-event values are otherwise
    summed or lost; merging a collapsed reciprocal pair's STRENGTH by `max`, not `sum`, so a
    STRING edge list that lists every interaction twice does not double every weight; and an edge
    column usable as a condition partition, so a differential analysis of two conditions loaded
    into one graph can be a plugin.
18. **Result shapes and value types beyond the eleven.** **Recommended, each additive but each a
    published shape:** (a) a `vector` field type with its dimension and an `embedding` shape with no
    ranking and no default layer, held in the columnar form of (e) from the start (one
    `Float32Array` of n times d, not per-node JSON arrays), exported as a list attribute where the
    format has lists and as dimension-indexed columns (`<run>_<field>_0` ..) where it has not;
    (b) a `match-list` shape, rows of `{ matchId, score, bindings: role -> node or edge id }`, for
    pattern search; (c) a per-group TABLE on `community` and `layered-grouping` -- a label, a
    score, a seed node and, for enrichment, rows of terms with their statistics -- which legends,
    readings and the cluster table read, and OVERLAPPING membership (a list-valued group, or a
    membership edge set) with a stated rule for how the derived layer paints a node in two groups;
    (d) no derived-network shape: a pair list stays a table, and turning it into a network is an
    explicit "apply as edges" operation the element owns, listed in `candidates.md` (no
    export-and-reimport route exists); (e) a columnar result form (typed arrays over snapshot rows,
    structured-cloneable) beside the object form, for results of tens of millions of elements,
    decided before 3.x hardens the object form, and covering pair tables too (parallel typed
    arrays of source row, target row and score); (f) a declared row schema (columns, type, unit)
    for every table field -- `pairs` and its extra members, `steps`, `series`, `rates`,
    `categories`, `sizes` -- plus, for pair lists, a flag for whether connected pairs are excluded
    and an optional grouping key so the element can rank per source. Further, found in review:
    - (a) needs a fixed-width vector dtype in graph-format (for example `vector` with `itemDtype`
      f32 and `dim` d, backed by one typed array). graph-format's `Dtype` union has none -- a `list`
      column holds a JS array per node -- so the element has nowhere to keep an n-by-d
      `Float32Array` for export or for another plugin's `column()`. That is a graph-format minor
      and a wire-format change, both one-way doors owned by the graph-format contract, and it
      should land before the element publishes a vector field;
    - (b) a binding of one role to ONE id cannot hold the patterns threat hunting uses: a
      variable-length chain, a burst of hundreds of parallel logon edges, an optional or negated
      role. Recommended: a binding value is an ordered list of ids, each role declares its
      cardinality in the descriptor (`one`, `optional`, `sequence`, `set`), each match lists the
      edges it used, the result carries a declared top-k bound and a partial marker, and the pattern
      definition is recorded as a versioned option or dataset so a negative hunt can be replayed.
      An "every attack path to this target" result needs the same list form for `path`;
    - (c) a `community` convention for nodes a clustering leaves alone (MCL and MCODE leave many
      singletons): recommended, every node the method assigns is published, singletons included,
      and a node the method leaves unassigned gets no entry with a graph field counting it; plus a
      binding-level `minGroupSize`, or a palette capacity counted only over groups inside the
      layer's selection, so hiding small clusters stays the reader's choice. The kit adds a graph
      that yields singletons. Item 32 covers how groups are numbered;
    - (f) the pair ORIENTATION: for an undirected method nothing says which endpoint is `source`,
      so on a bipartite user-item graph the user lands in either column row by row, and both
      "rank per source" and the scope rule of item 23 break. Recommended: a pair-list MAY declare
      `orientBy: <partition option>`, and when it does `source` is always on the declared side;
      otherwise the smaller id (by string form) comes first. The "connected pairs excluded" flag is
      defined against the graph the run COMPUTED over (after `exclude`), and the run record carries
      both the flag and the exclusion, or a held-out evaluation reports precision zero by
      construction. Ties in a pair-list are ordered by (source, target) string form, and the
      ELEMENT applies any top-k cut after that sort (`algorithm.md` section 2.2.2);
    - a list-valued per-node field, or a violation table keyed by node id, for results such as
      "three violations on this node, each with a message" (`design/designloom/workflows/W13.yaml`).

19. **How loads combine, and what a load reports.** A load ADDS to the graph by default and
    replaces it with `{ replace: true }` (2.6.1). Unspecified: what happens when two sources use the
    same node id (a string `"1"` against a number `1`, or two systems' `1234`), whether a load can
    JOIN an attribute table onto existing nodes by a key column, what provenance each element
    keeps, whether element-assigned edge ids are stable across reloads, and what survives an added
    load (runs, sets, annotations, positions). As built, a node id that arrives again is IGNORED,
    attributes included (`file-format.md` section 2.2 item 8), so a second condition's values for
    the same genes (`design/designloom/workflows/W24.yaml`) are silently dropped today.
    **Recommended**, and to be taken before the file-format contract is frozen:
    - load modes `add` (default), `replace` and `join` (by a key column, with a case policy);
    - no silent overwrite in either direction. A per-load COLUMN policy for attribute names that
      collide with existing ones -- a suffix or prefix (`logFC` becomes `logFC_normal`), or refusal
      with a coded error naming the columns -- and a per-load VALUE conflict policy (`first`,
      `last`, `collect`, `namespace`), both recorded in the load record, with the conflicts listed
      in the load report and persisted with the project;
    - a caller-chosen SOURCE KEY per load, kept with every element and attribute value it
      asserted, and a load mode that replaces one source's contribution (retracting what only that
      source asserted, keeping what others also assert), so refreshing one of twelve integrated
      systems (`design/designloom/workflows/W13.yaml`) neither leaves stale facts nor drops the
      other eleven;
    - identity: ids matched by value and type as today; a per-load token handed to readers
      (`ReaderContext.loadToken`) and a way for a record to mark its id document-local, so blank
      nodes from two files never merge; a per-endpoint namespace option for readers
      (`sourceNamespace`, `targetNamespace`), so a bipartite `user_id,item_id` file whose ids are
      both integers does not merge user 42 with item 42, with a warning when one id is used on
      both sides of a file declared bipartite; an optional id namespace per load (not the default:
      two sources that name the same genes must match);
    - dangling endpoints: a load option `danglingEndpoints: "create" | "report" | "refuse"`,
      defaulting to `"create"` for compatibility, with the created ids listed;
    - element-assigned edge ids a deterministic function of source, target, relation attribute and
      ordinal; runs marked stale after an added or joined load;
    - a LOAD REPORT (`LoadReport` in `file-format.d.ts`) that EXTENDS the `ImportReport` 2.6.1
      already publishes -- adding per-record errors with line and severity, the created endpoint
      ids, repeated node ids, conflicts, matched and unmatched keys and the graph's nodes that got
      no row, the limit reached, and the source's identity (kind, file name or credential-free
      URL, byte length, sha256 of the raw input, time loaded) -- delivered by the `data-loaded`
      event and returned by the load call, for built-in and plugin readers alike and for a FAILED
      load too. The element keeps it as the load record beside the run records, and a run record
      names the loads it computed over.
    Found in review, all part of the same decision and all recorded in load records:
    - **The join.** `{ tableKey, nodeKey, casePolicy, typePolicy, missingValues }`, where
      `nodeKey` is an attribute PATH (default the node id): a STRING network keyed by protein id
      carries the gene symbol in an attribute, so a join matched against ids matches nothing. The
      match report also lists node-side ambiguity: a key that matches several nodes, with their ids.
    - **Id types.** Identifiers such as Entrez gene ids arrive as numbers from one reader and as
      strings from another, and the value-and-type rule then makes the same gene two nodes or
      matches no row. Recommended: a `typePolicy` per load and per join key -- `"exact"` (today),
      `"string"` (compare by canonical string form) or `"refuse-mixed"` (a coded error when a load
      would put `"1"` and `1` in one graph) -- with `"string"` the default for join keys; for an
      added load, `"exact"` stays the default but the load report warns whenever a load's ids equal
      existing ids after string normalisation while differing in type; every coerced match is
      listed. Readers SHOULD emit ids as the source spells them, as strings, unless the format
      itself types them (`file-format.md` section 2.2 item 9). Making `"string"` the default for
      every load was not adopted (section 15).
    - **Edge record ids.** As built, an edge record's `id` is read only when the consumer has set
      the GLOBAL `data.knownFields.edgeIdPath` (default null), and once set, record ids are matched
      across the WHOLE graph, every load, regardless of endpoints (`DataManager.knownEdgeFor`).
      Recommended: the reserved key `id` on an edge record identifies the edge by default for every
      reader (or the reader declares its edge id key per load, in `declareSchema`), with
      `edgeIdPath` kept as a consumer override; record ids are scoped to their load (qualified by
      the per-load token); and a repeated record id whose endpoints differ is a reported conflict,
      never a repeat.
    - **A relation role.** The repeat test keys on the ordered pair alone, so `first` folds
      `worksFor`, `founded` and `investsIn` between the same two entities into one edge.
      Recommended: a declared relation attribute (a reserved key or `declareSchema`'s
      `relationAttribute`); the repeat test keys on (source, target, relation) when one is declared;
      the repeat policy becomes an option of each load, recorded in the load report.
    - **Partial records.** A streaming triple reader meets a subject's statements scattered through
      the file, and a second record for a node already seen is ignored. Recommended: a reader
      declares `partialRecords: true`; a later record for a node already seen in the same load then
      merges its attributes, repeated values of a multi-valued attribute collect into a list, and
      the merges are reported.
    - **Per-value source.** The per-value source key may be supplied per RECORD, not only per load,
      so an N-Quads statement's graph name maps onto it and two systems' disagreeing values for one
      attribute can both be shown.
    - **Namespaces are an id component, never a rewrite.** `sourceNamespace` and `targetNamespace`
      keep a raw id plus a namespace: a pair-list row gains `sourceNamespace` and
      `targetNamespace`, `session.data.node` exposes it, and an export writes the raw id plus a
      namespace column, with the id's type recorded where the format has types and a loss note
      where it has not.
    - **Parallel-edge ordinals.** An ordinal among the edges of one pair depends on record order,
      which contradicts item 26's order-independent input identity and the kit's order check.
      Recommended: order parallel edges by a declared stable key (a timestamp or event-id column),
      falling back to record order only with a load-report warning.
    - **The field mapping used.** The load record carries the element's mapping for that load --
      `nodeIdPath`, `edgeSource`, `edgeTarget`, `edgeWeightPath`, the repeated-edge policy -- and it
      is part of the replay input identity, so a methods section can say which column was the id.
    - **Read-side losses and foreign styles.** `LoadReport` carries `lossNotes` of the same
      `LossNote` type a writer uses, so a CX2 or XGMML reader can say that the file's visual style,
      title and description were dropped. Whether a reader may also hand the element a data-only
      `StyleDocument` and graph metadata, which the element applies under the document-scope
      palette rule of item 10 and shows for the reader to accept, is part of this decision; if not,
      `candidates.md` must say foreign style files (a Cytoscape `styles.xml`) have no route and name
      the owner of that route.
20. **Reader input beyond one string.** `getContent()` returns the whole input as one string: no
    binary format can be read from a URL, a compressed or multi-gigabyte file cannot be read at
    all, a load cannot be cancelled, and no element-owned limit bounds a body. **Recommended:**
    protected `getBytes()` and `getStream()` under the same retry policy; element-owned gzip and
    zip decompression by magic bytes and compound extensions (`.nt.gz`); an `AbortSignal` on every
    load, in the base class; element limits on bytes (refused with `E_TOO_LARGE`), body time, node
    and edge counts and nesting depth; `detect` given at most a fixed sample (4 KiB) as text AND
    bytes; a `declareSchema(...)` helper so a reader can state its label attribute, attribute
    types (the element's `AttributeType`, with the format's own type kept verbatim as
    `sourceType` for writers) and graph-level metadata, with records checked against the declared
    types and mismatches reported; a typed timestamp column, so a time-aware algorithm gets
    numbers rather than strings; a decision on whether intervals and spells are in scope (if not,
    they raise a loss note); and a progress channel (`ReaderContext.progress`), the element
    reporting download bytes itself. Passed as arguments where possible (section 6.2 item 1): an
    inherited `getBytes()` or `getStream()` with an ordinary name would be a contract major under
    section 6.2 item 1, so they arrive on a reader context (`context.bytes()`, `context.stream()`)
    or carry the `graphty` prefix. Also part of it: DECODING is the element's job -- the charset
    from the `Content-Type` or a byte-order mark, a caller `encoding` load option the element owns,
    and a load-report count of replacement characters as a warning, for built-in and plugin
    readers alike (today `getContent()` decodes everything as UTF-8, so a Windows-1252 export loads
    with replacement characters and no warning); and MISSING-VALUE tokens -- a token list per
    reader and per join (default `""`, `"NA"`, `"NaN"`, `"null"`) read as null so a numeric column
    keeps its type, their count in the load report, and a `missingValues` member in
    `declareSchema`.
    Three rules the first draft lacked:
    - **Staged loads.** A load is staged and committed only when it succeeds, so a failed,
      cancelled or error-limited load in ANY mode leaves the graph as it was, and its report says
      `partial: true, committed: "none"`. If the owner prefers streamed commits for memory, every
      row carries its load id, the report says what was committed, dependent runs are marked stale,
      and a load can be removed by id.
    - **Decompression limits.** The byte limit applies to the DECOMPRESSED output, enforced while
      streaming, with an expansion-ratio ceiling; a zip must hold exactly one entry, chosen by
      extension, with no nested archive; a declared type that disagrees with the sniffed
      compression is refused unless the caller opts in. Otherwise element-owned decompression is a
      decompression-bomb path into every reader.
    - **Cancellation leaves no trace.** The kit checks that a load cancelled in add mode leaves the
      graph byte-identical.
    - **Ordering.** This decision, the columnar results of decision 18(e) and the run budget of
      decision 16 are taken before the reader and algorithm contracts are frozen: at the
      100,000-node, multi-million-edge scale of `design/designloom/workflows/W07.yaml` the whole
      chain (one string, per-element JSON results, a cap with no confirmed override) fails.
21. **Registration trust.** Replacement by default lets any package loaded later take over a vetted
    plugin's id, with one console warning as the only signal. **Recommended:** refuse replacement
    by default outside development (`{ replace: true }` for hot module replacement); a
    `lockRegistrations()` an embedder calls once its plugins are in, after which every registration
    is refused, and which also freezes the logger policy (the egress allowlist, redaction and the
    most verbose level an egress destination receives); every replacement reported as a coded
    event. The declared `package` cannot detect a different vendor under the same id, because a
    hostile plugin declares what it likes (section 6.4 item 2); the run record therefore also
    records something the element OBSERVES -- the module URL the class came from, or a stable
    identity of the class -- beside the declared version. Changing the default later breaks
    plugins that rely on replacement, so decide it before any third-party point ships. Where the
    lock LIVES must be stated too: every registry keeps its state on `globalThis` under
    `Symbol.for`, shared by every copy of the element, and any script can write to it (section 3
    item 6). A lock held in one copy's module state does not bind another copy, and a copy older
    than the lock (a plugin bundling an older `./bundle`) registers freely. Recommended: the lock
    state is kept IN the shared store and honoured by every copy that knows it; on lock the store
    is frozen and redefined as a non-writable, non-configurable property holding frozen maps; the
    specification states plainly that older copies and arbitrary scripts can still bypass it, so
    the lock is a guard against mistakes, not a security boundary; and it is paired with the
    observed module identity above, recorded and checked when the key is used, so a replacement
    made through another copy is detected at use. The two-copy case gets a test.
22. **Option evolution and new option types.** **Recommended:** `OptionDescriptor.deprecatedNames`
    (aliases the element rewrites) and `deprecated: { since, replacement }`; a stored option the
    installed extension lacks is kept, reported as unresolved and not applied, rather than failing
    the whole configuration; a `secret` option type, resolved and passed to the extension but
    never serialised into a catalogue, configuration, recipe, run record, log record or error
    `details` (written as `{ "$secret": "<name>" }` and supplied again by the embedder); and new
    input types -- `edge-set`, `pair-list` (validated node-id pairs), `dataset` (a loaded,
    versioned non-graph table such as a gene-set file or an IOC list, recorded by name and version
    in the run record) and `result-field`. Also: a `required` flag the element checks for an
    option with no default (`OptionDescriptorEvolution` in `common.d.ts`); an `"attribute"` option
    checked against the loaded columns (section 7 item 11); and the option names `__proto__`,
    `constructor` and `prototype` refused. `OptionType` is closed for writers, so each new type is
    an element release, and a change to it bumps every point's contract (section 6.4 item 1).
    Found in review: an optional `unit` (plain text) on `OptionDescriptor`, as result fields
    already have, and an optional `citation` (plain text: a DOI or URL) on every descriptor, both
    carried into run and load records, so the element can generate a methods paragraph ("MCL (van
    Dongen 2000), inflation 2.5; STRING combined score >= 0.4, scale 0-1") instead of every
    consumer hand-writing units and references; `maxLength` and `maxItems` for string and array
    options (section 7 item 2); and `required`, introduced with a top-level marker `mustUnderstand`
    can list (section 6.3 item 3).
23. **Scope roles.** A scope today means "report for these" for a whole-graph algorithm and
    "compute on these" only for `scopeInput = "subgraph"`. A what-if run needs "compute without
    these". **Recommended**, to be taken before the algorithm contract is frozen: a run option
    `exclude: { nodes, edges }`, each naming a set, a rule (`region == "APAC"`) or ids, that every
    algorithm receives as a subgraph, and refusal with `E_UNSUPPORTED` (not a caveat) when a caller
    asks an algorithm to compute on a scope it cannot honour. The same decision states what a scope
    means for a pair-list: recommended, a row is kept when its SOURCE is in scope and the target is
    unrestricted ("score these users against the whole catalogue"), recorded in the caveats.
    Found in review, part of the same decision:
    - `exclude` enters the derived run id as its DEFINITION (the set name, rule or ids, with live
      keywords replaced as for scopes), under the rule of section 4.4 item 6, or a what-if or
      held-out run overwrites the baseline's result path; `RunRecord` gains
      `exclude: { definition, membersDigest } | null` beside `scope`;
    - an EDGE rule in a scope or an exclusion is always "computed without", whatever the plugin's
      `scopeInput`: hiding STRING edges below a confidence cutoff and running a whole-graph MCL
      must not cluster over the hidden edges while the run record shows the filter. The run record
      separates "computed over" from "reported for", and a run whose scope excludes edges on an
      algorithm that cannot honour it is refused with `E_UNSUPPORTED`, never kept with a caveat;
    - whether `exact` in the derivation stays the caller's tri-state (section 4.4 item 2) or
      becomes a plain "sampled" flag before the derivation is frozen.
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
    reader. Graph-level result TABLES get their own route: an element-owned "export result table"
    that writes one run's table field as CSV or TSV with the run record as a header or JSON
    sidecar, and `W_RESULT_TABLE_DROPPED` from a writer whose format has no place for one. Derived
    fields (`rank`, `percentile`, `groupSize`) are exported with the rest. A vector field becomes
    dimension-indexed columns where the format has no lists. CSV and TSV formula neutralisation
    applies to string cells only, with an option to switch it off (`file-format.md` section 8.1).
    Three of these go beyond the owner's words "whatever the format supports" and need his
    confirmation: whether style MAPPINGS (not only resolved colours) must be written; whether a
    caller may export less than everything -- a scope, excluded columns, pseudonymised ids, each
    reported as a `W_EXCLUDED_BY_CALLER` loss note so nothing is dropped silently, which an
    outside incident-response partner requires; and whether run provenance is written by DEFAULT
    or only when the caller asks, because provenance written into a shared file reveals the hunt
    (the indicators and target accounts given as options). This specification records the last
    two as a conflict between the owner's export decision and operational security, and
    recommends allowing both, with provenance an explicit export option whose default the owner
    sets. Found in review, part of the same decision:
    - an UNMEASURED value is written as the format's absent value (no data element, an empty cell,
      JSON null), never a default or sentinel; a writer MUST NOT declare a key default for a result
      column; a format that cannot express absence raises `W_UNMEASURED_AS_DEFAULT`
      (`file-format.md` section 8.1 item 6);
    - a field's `normalization` travels with its column (`<run>_value_log10`, or a mandatory
      header or sidecar line), independent of the provenance default, so a log10 MCC column is not
      read as cytoHubba's raw score;
    - `LossNote` gains a kind or severity that includes `required-missing`, `ExportCapabilities`
      declares the graph attributes a format REQUIRES (NDEx needs name, description, version,
      author, reference and rights), and the element owns a user-settable graph METADATA record
      (Dublin Core style) on the session API, filled by readers and handed to writers, so an
      export can be validated before upload;
    - a "share without provenance" mode that removes or pseudonymises load and run records (URLs
      are already reduced to origin plus digest by default, item 13), each removal a
      `W_EXCLUDED_BY_CALLER` loss note.
25. **A plugin reader answering a deprecated built-in id.** `sif` and `cx2` are reserved, unserved
    built-in ids; a saved document naming `cx2` fails even when a CX2 reader is installed under a
    vendor id. **Recommended:** an optional `serves: ["cx2"]` descriptor member letting one
    registered reader answer a deprecated, unserved built-in id.
26. **The run record, replay and document versioning.** **Recommended:** the `RunRecord` shape in
    `algorithm.d.ts` -- run id and name, key, claimed package, extension version, element version,
    resolved options, seed actually used, orientation and simplify policy, the route (CPU or
    accelerator), the scope's DEFINITION at run time with a digest of its resolved members (so a
    named set widened later is detected on replay rather than silently used), the loads it
    computed over, the result paths it read, an input identity, caveats, partial -- and:
    - `static version` REQUIRED for plugins at the next major, and valid semver when present; an
      unversioned plugin is recorded as `null`, never as the element version, reads as unresolved
      on replay, and makes the conformance kit warn;
    - every BUILT-IN algorithm gets its own semver version, recorded instead of the element
      version, whose major moves whenever its output changes for the same input and seed (the
      migration changes label propagation's partitions in an element minor, section 10 item 5);
    - replay: a different MAJOR or a different claimed package reads as unresolved, naming both; a
      minor or patch difference is accepted and noted; an absent version or package on either side
      means "unknown provenance", accepted and noted; a run record handed back to the run API is
      accepted as it stands (the seed may appear in both the options and the parameters with the
      same value);
    - the input identity is defined normatively: an order-independent digest over node ids, edge
      endpoints and ids, and every column the run read, the weight column included -- so two
      releases of a network with equal topology but different scores differ, and the same file
      loaded in another record order does not; the element hands plugins snapshots in a canonical
      row order (by id), or a plugin's output SHOULD NOT depend on row order (the kits check it);
    - every persisted file and record carries a two-part format version with the rules of section
      6.3 item 6, and a member for extension provenance.
    Found in review, part of the same decision:
    - **Route and precision.** A replay on a different route (CPU against accelerator) or precision
      (f32 against f64) reads as "different computation", named in the replay report, never
      accepted silently; `RunRecord` gains `accelerator: { package, version }` when the route is
      the accelerator; and a built-in's own version takes a major bump when a kernel change in the
      accelerator package changes its output for the same input and seed.
    - **Superseded runs.** A run a later run of the same id supersedes keeps its record, and its
      result or a retrievable digest, in the analysis history, so a methods section citing it
      stays resolvable. Also: forms built from the catalogue default to an `as` name that includes
      a changed parameter, or the derived id gains a parameter digest with a stable alias for
      "latest" -- one of the two, picked before the derivation is frozen.
    - **Digests are specified.** Each digest (input identity, scope members, source bytes) is
      defined normatively -- for example sha256 over a documented canonical encoding (ids sorted by
      string form, a fixed number format, columns ordered by name) -- and its algorithm is
      versioned inside the record, because changing any part later turns every saved record into
      apparent drift. `LoadReport.source.sha256` is over the bytes AS RECEIVED, before
      decompression, with a second digest after it, so it can be compared with a release's
      published checksum. An exported run record embeds each load's format, reader version and
      digest, not only a session-local `loadId`.
    - **Undeclared nondeterminism.** A stochastic plugin that declares no seed passes every
      seed-based check; the kit adds "undeclared nondeterminism" (`algorithm.md` section 11), and a
      run the element cannot seed is marked nondeterministic in its caveats.
27. **Layout contract additions.** **Recommended, all additive:** the current coordinates of
    every node handed to an engine before `init` (a warm start, so successive slices of a changing
    graph move only what changed); a protected `heldPosition(index)` so a scoped layout can place
    its scope next to the held nodes; a notification when an attribute named by one of the
    layout's `"attribute"` options changes; a layout report (`notes`, `unplaced`) published with
    the settled event, so a layout that could not place a node says so; a published scene
    convention (axes, which way y points, how `scalingFactor` applies) and an optional descriptor
    `frame` (for example `"geographic-lonlat"`) a camera view can check; and a stated rule for what
    a filter does to the nodes a layout is given and the bounds a view frames. Also, all found in
    review: (a) "unplaced" as a first-class outcome -- a batch engine leaves a node out of
    `positions`, the element draws unplaced nodes one element-defined way, leaves them out of camera
    bounds and reports them -- replacing any need for a layout to invent a position (2.6.1 already
    leaves such a row unplaced, but still draws its edges to the origin); (b) the existing
    `readNodePosition` either documented as the held-position route or deprecated in favour of
    `heldPosition`; (c) an optional `up` vector on `CameraState` and stated units for `zoom` (CSS
    pixels per scene unit) and `pan` (the scene coordinates of the viewport centre); (d) when
    `setLayout` resolves -- recommended: after the first publish for a batch layout, with the
    settled event named as what a caller waits for with a live one, and a wait-for-settled option
    on `applyCameraView` and `captureScreenshot`; (e) a coded warning event when a carried layout
    scope is dropped under an unscoped engine; (f) `sizeRating` as an open number the element
    compares against the loaded node count, refusing a larger graph with `E_CAP_EXCEEDED` unless
    the caller confirms, and a per-frame time budget for `step`; (g) the active layout's id and
    `frame` on `CameraViewInput`, and the frames a camera descriptor supports, so a map view is
    refused or marked on a tiers layout; (h) whether `SimpleLayoutOpts` are element-owned options a
    descriptor-bearing batch engine receives without declaring them; (i) for each built-in
    stochastic layout, whether it takes a seed. Corrections from review: for (c), `CameraState`
    already has `pivotRotation { x, y, z }`, applied to the orbit controller as yaw, pitch and roll
    (`Graph.ts`, `setCameraState`), so a view CAN fix its orientation today; the decision is to
    document `pivotRotation` (axis convention, orbit controller only, precedence over `position`
    and `target`) as the orientation route OR deprecate it for `up` -- not to add a second member
    with no stated precedence (`camera.md` section 3 item 5); and the new inherited members
    (`heldPosition`) follow section 6.2 item 1: they arrive on an init context
    (`LayoutInitContext`), not as ordinary-named protected members. Also: an element-owned
    `attributeValue(node, optionName)` for the current contract, resolving an `"attribute"` option
    as a path exactly as styles and filters do (`layout.md` section 5 item 5).
28. **Camera view names against saved camera snapshots.** A registered view takes a name back from
    a snapshot the reader saved, so a bookmark becomes unreachable when a later release or plugin
    adds a view of that name. **Recommended:** separate namespaces (`{ preset: id }` for views,
    `{ snapshot: name }` for saved snapshots) in every route and document, adopted BEFORE any
    document persists a bookmark, since saved documents record the names.
29. **Attribute keys: grammar and escaping.** A reader may emit any string as an attribute key, but
    the element resolves every attribute path by splitting on `.` (style bindings, legends,
    selectors, `"attribute"` options), so a key containing a dot -- every RDF predicate IRI, many
    CURIEs -- loads and can never be bound. Saved styles record attribute paths, so this is a
    one-way door. The routes do not agree today: bindings, legends and options split on `.`, but
    selector expressions (`{ match: "expression" }`) and the field-mapping paths (`nodeIdPath` and
    the others) are evaluated as JMESPath, where `data["http://..."]` is a MULTISELECT that yields a
    one-element list, not the value. **Recommended:** JMESPath's own quoted-identifier grammar
    (`data."http://schema.org/name"`) on EVERY path route -- bindings, legends, `"attribute"`
    options, sets, field mapping -- so one spelling means the same thing everywhere and the source
    key survives unchanged; the
    alternative is a grammar readers must emit plus a declared mapping from each safe column name
    back to the source key (`declareSchema`'s `sourceKey`), handed to writers so a round trip
    restores the IRI. The reserved record keys (`file-format.md` section 2.2 item 1) are part of
    the same decision.
30. **Colour-vision claims.** `ColorVisionDeficiency` is a closed union of the three dichromacies,
    so a grayscale or print-safety claim cannot be recorded, and every document written until
    the union changes carries only those three. **Recommended:** add `"achromatopsia"` (grayscale
    legibility) now, in the same release that defines what the element's `isPaletteSafe` checks
    for it, and make the union open for readers so a later claim is a minor change.
31. **Rank direction and the derived statistics.** The element always ranks descending (rank 1 is
    the highest value), and no descriptor member can say that LOWER is notable: for a p-value, an
    eccentricity, a mean distance or a "lower means riskier" score, the derived rank, percentile,
    top-N reading and default colour ramp all come out inverted, and saved styles and readings
    record ranks, so adding a direction later changes what saved documents mean. The derived
    statistics also stop at min, max, lower median, mean, measured and tiedAtMin, with nothing for
    "more than three standard deviations out". **Recommended**, before the algorithm contract is
    frozen: an optional `order: "descending" | "ascending"` (default descending) on
    `FieldDescriptor` and `ResultFieldSpec`, used for rank, percentile, `tiedAtMin` (renamed
    `tiedAtWorst` at the next major) and the default ramp direction, and recorded in the run
    record; and `stddev` (population, Kahan-summed), `q1`, `q3` and `mad` as derived graph
    fields, with a derived per-element `zscore` or robust z. The change to what a percentile means
    is recorded with the run-record rules of item 26.
32. **How groups and categories get their colours.** Nothing specifies how a categorical value or a
    community group is assigned to a palette anchor, and group numbers are whatever the plugin
    chose. So a lab style mapping Up, Down and Unchanged shifts colours on a dataset with no
    Unchanged genes; the same module is cluster 3 in one condition and cluster 7 in the other; and
    re-running a clustering on a file listed in another row order renumbers the clusters, moving
    colours, legends and any label bound to a group number onto different members with no error.
    Style documents record these assignments, so this is a one-way door for them. **Recommended:**
    the element renumbers community groups canonically before deriving the layer -- by size
    descending, ties broken by the smallest member id's string form -- and records the rule in the
    run record; attribute categories take a documented sorted order; and a categorical binding
    may carry an explicit value-to-anchor (or value-to-colour) map, so a shared style pins its
    categories. `palette.md` section 4 states the gap.

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
| `design/graph-format/migration-plan.md`, item "element-export-api" | builds the export snapshot from "the data bags and current positions" | Must also carry algorithm results, derived fields and style where the format has a place for them, and a route for graph-level result tables (section 10 item 6; `file-format.md` section 8.1) |
| same, the label propagation seed | a fixed element default of 42, and a `randomSeed` routing every call to the CPU port | One seed rule for both documents, with the route recorded (section 10 item 4; open decision 16) |
| same, the static-layout item | deletes `LayoutEngine.pairWeights` and `pairWeightKey` in the dual-API window | A protected helper a plugin can call; keep it through an adapter until the next major (section 10 item 7) |
| `graphty-element/docs/guide/extending/custom-algorithms.md` | edge results through the `edgeIdsByPair` helper, which reads `this.graph.getSession()` | That breaks the snapshot-only rule and cannot name a parallel edge; the guide must say plainly that no conforming edge-shaped plugin exists until the edge identity accessor ships, and what the snapshot's weights hold and that attribute columns do not reach a plugin (`algorithm.md` section 3.1) |
| `design/graph-format/migration-plan.md`, item "element-plugin-seam" | delete `toAlgorithmGraph` and its file when nothing internal calls it; nothing in `src` constructs a legacy `Graph` | `algorithmGraph()` is implemented by `toAlgorithmGraph`, and `./extend` exports its types from that file; in 3.x keep all three behind `@deprecated` and move the deletion to the 4.0 removal item (section 10 item 8) |
| same, item "element-export-api" | exports through graph-io's CSV writer | That writer neutralises no formula cell; add the rule to graph-io's shared cell writer and to the item's "Done when" check (section 10 item 9) |
| `design/extensions/candidates.md`, section 8 (earlier draft) | a registered accelerator implements `AlgorithmAccelerator` | It returns the element's own `GraphAccelerator`, narrowed internally; corrected there |
| `graphty-element/test/browser/extensions/layout-extension.test.ts`, the live engine's `getEdgePosition` | reads `e.srcNode` and `e.dstNode` | Outside the layout contract's member list; look endpoints up by `srcId` and `dstId`, so the reference engine conforms (`layout.md` section 2) |

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
| Add `override` to the algorithm example's `static version` and `static costUnits`, which fail under `noImplicitOverride` | The base class declares neither: `register` reads `version`, `cost` and `costUnits` from the class as `AlgorithmStatics`, so `override` there is itself an error. Checked by type-checking the example against 2.6.1's `./extend` with `noImplicitOverride`. The error came from `algorithm.d.ts`, which wrongly declared them on the class; the declaration file is corrected and `algorithm.md` section 8 item 3 says to declare them without `override` |
| Implement now, as a bug fix, the rule that a run refuses `seed`, `exact`, `sample` and `timeBox` rather than record options that never reached `compute` | Already a normative requirement, marked not yet met, in `algorithm.md` section 5.1 item 3; nothing to add but the seed-rule conflict with the migration plan, which is now section 10 item 4 and part of open decision 16 |
| Make an id namespace per load the DEFAULT whenever a second source is added, so unrelated ids from two systems never merge | Two sources that name the same genes, suppliers or hosts must match, which is the point of the joins in `design/designloom/workflows/W20.yaml` and `W24.yaml`. Open decision 19 keeps a per-load namespace as an option, adds document-local ids, per-endpoint namespaces and a per-load token, and leaves matching as the default |
| Type every reader-open union in the declaration files with a `(string & {})` tail | The same types are what an extension WRITES, which must stay closed; a tail would let a writer put an unknown value in without a type error. Section 6.3 item 1 instead forbids an exhaustive switch over an open union, and the schema marks open unions with `x-open-union` |
| Tie each point's contract major to the element's package major | That would refuse every palette and camera plugin whenever only the algorithm contract changes. Section 3 item 3 instead recommends a broad peer range once `requiresApi` is enforced, and says the peer range is the only guard before then |
| Publish the removal of `algorithmGraph` as a separate capability flag instead of a contract major | Section 6.4 item 1 requires a deprecation before any removal. An earlier draft also let a plugin declare the next major in advance; that was withdrawn, because a major can add a required member as well as remove a deprecated one, so a plugin widens its range after testing against the released major |
| Restrict a contract major to removals of deprecated members, so pre-declaring the next major stays safe | The planned majors (a required `static version`, a required `package`, refusing a descriptor-less class) are not removals, and forbidding them would freeze the contracts. Section 6.4 item 1 instead phases each new required member in through an optional minor and forbids naming an unreleased major |
| Make comparison by canonical string form the default for EVERY id match across loads | It silently merges two nodes an existing document keeps apart (`"1"` and `1` loaded on purpose from two sources). Open decision 19 recommends it as the default for join keys only, keeps exact matching for added loads with a warning whenever ids differ only in type, and asks readers to emit ids as strings |
| Decide now that a STRING or BioGRID query from a gene list is served, before the file-format contract is frozen | Open decision 15 already recommends a data-source point with a pinned release, recorded query parameters and an identifier report with an ambiguous category, to be taken before the file-format contract is frozen; the review adds nothing to decide beyond it |
| Type `CameraViewReference.scope` as the element's `ScopeInput` in `camera.d.ts` | `ScopeInput` is declared in the element, not in these files, and the reference is proposed; the declaration now states the serialisation rule (a live keyword replaced by its definition or members when saved), and open decision 8 carries it |
| Rewrite the worked hub-score example to chunk over neighbour pairs, so a hub cannot freeze the page inside one step | Chunking inside a step needs the work channel proposed in open decision 16; without it the rewrite would hand-roll yielding and lose the kit's counting. The example now states the limit, and the "yields" and "cost is honest" checks are defined structurally so they do not pass it by accident |
| Let a reader declare which records are duplicates, or merge reciprocal pairs when a load declares the graph undirected | What happens to repeated edges is the CONSUMER's choice, through the element's repeated-edge policy (`keep` by default); a reader that merged would override it. `file-format.md` section 2.2 item 8 now documents the policy and forbids a reader to merge, and `ImportReport.repeated` already counts what the policy did |
| Replace `SimpleLayoutEngine.positions` with a `Map` now, because a node id `__proto__` corrupts it | `positions` is a published member plugins write; changing its type breaks every batch plugin. It is recorded as a known gap (`layout.md` section 11) and the rule of section 9.2 item 6, to be fixed with the snapshot layout contract or the next major |
| `KNOWN_LAYOUT_IDS` in `layout.d.ts` should list `spiral` and `planar` | The Published section describes the constant as 2.6.1 builds it, which omits them. The omission is recorded as not yet met (section 5 item 4) and the fix belongs in the element; the declaration file notes it |
| Loosen `LayoutEngine.register`'s bound so the tiers example compiles | The example is changed instead (its options interface no longer extends the index-signature `SimpleLayoutOpts`), and it now compiles against 2.6.1's `./extend`; the published bound needs no change for a plugin to be written without a cast |
| Recommend that an export write run provenance only when the caller opts in | Reproducibility (`design/designloom/workflows/W25.yaml`) wants provenance by default and operational security (`design/designloom/workflows/W07.yaml`) wants it off; which default wins is the owner's reading of his own export decision. Open decision 24 records the conflict and recommends an explicit export option whose default he sets |

