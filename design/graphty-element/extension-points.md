# Extension points

How a third party brings a palette, a file format, a camera view, a layout, an algorithm or a log
destination to `@graphty/graphty-element`, and what the element owes each of them.

## The rule this document implements

Six things can be brought to the element from outside, and the list is closed: Palette, File
format, Camera, Layout, Algorithm, Logging.

**An extension must be able to do everything its built-in peer can.** Whatever the element's own
palettes, importers, cameras, layouts, algorithms and log sinks can do, a third party's must be
able to do by the same route, with the same reach, and with types it can import. A capability the
element keeps for its own modules is a defect in the extension point, not a design choice.

Parity is six things, not one registration call:

1. it appears in `session.catalog`, so a picker can offer it
2. it is addressable by the key a consumer types and a saved document records
3. it reports progress and honours cancellation wherever its built-in peer does
4. it is configurable through the same options mechanism the built-ins use
5. it reports failure as a `GraphtyError` carrying a code from `src/errors/codes.ts`
6. it can be written in TypeScript against a published entry point, with no cast, no
   re-declaration of a type the element already has, and no import from a deep `src/` path

Everything else that looks registrable -- scale plugins, node mesh shapes, lifecycle managers,
natural-language commands, hardware accelerators -- is internal and out of scope here. Nothing in
this design touches them, and none of them gains or loses a promise.

## What is wrong today, in one paragraph

A palette cannot be registered at all: the seventeen built-ins are a module-level array literal
and `requirePalette` throws for any other name. A file format's reader can be registered but the
format cannot: registration files a class in a `Map` and publishes no descriptor, no extensions,
no media types and no content sniffer, so a registered reader is invisible to every picker and to
detection. A camera has no seam of any kind: the five built-in views are a `switch` over five
string literals, and the one registration call that does exist takes Babylon.js types and is used
for two of the element's own three cameras. A layout engine registers and runs but reaches no
catalogue, declares no options a form can render, and implements five undeclared optional methods
none of the sixteen built-ins demonstrates. An algorithm is the one point that mostly works -- and
it still asks its author to name the class three times, declare its options twice in two
unrelated vocabularies, and re-declare two types the element has but does not publish. A log sink
can be attached only by holding a live JavaScript object: the element's own remote destination is
reachable by a string in a config object and a third party's is reachable by nothing, while the
element's primary destination, the console, is not a sink at all and cannot be removed.

## Decision 1: one registration idiom, chosen by whether the element constructs the thing

There are two shapes in the package already: a static `register()` on a base class (`Algorithm`,
`LayoutEngine`, `DataSource`) and a free function (`registerAccelerator`). Six points that each
register differently would be six things to learn. The rule that decides which shape each point
uses:

> **If the element constructs the extension, it is a class and it registers through a static
> `register` on the base class it extends. If the extension is a value the consumer constructs --
> plain data, or a closure over the consumer's own state -- it registers through a free
> `registerX` function exported from `./extend`.**

| Point | Unit | Registration |
|---|---|---|
| Algorithm | class extending `DeclaredAlgorithm` | `Algorithm.register(MyAlgorithm)` |
| Layout | class extending `LayoutEngine` or `SimpleLayoutEngine` | `LayoutEngine.register(MyLayout)` |
| File format | class extending `DataSource` | `DataSource.register(MyReader)` |
| Palette | a `PaletteDescriptor` | `registerPalette(descriptor)` |
| Camera | a descriptor plus one pure `compute` function | `registerCameraView({ descriptor, compute })` |
| Logging | a descriptor plus a `create(options)` factory | `registerLogSink({ descriptor, create })` |

A consumer learns two shapes, and which one applies is predictable from one question: does the
element build it for me? An algorithm is built once per run, a layout once per `setLayout`, a
reader once per load -- the element owns their lifetimes, so it owns their construction, and a
class is what lets it construct one. A palette has no code to run at all; a camera view is a pure
function of a bounding box; a sink is a destination the consumer already holds. Wrapping any of
those three in a class would be a data carrier wearing a constructor.

Two candidates were rejected on the record. A `registerFormat({ descriptor, source })` free
function would let the catalogue half be imported without the parser -- but it makes two
registrations possible where one act is meaningful, and a descriptor filed without its class is a
catalogue entry a consumer can see, select, and then be told does not exist. That is exactly the
failure `src/catalog/registry.ts` was written to prevent, and its reasoning applies unchanged. A
`PaletteDescriptor` plus an optional `color(position)` function would express a computed palette
-- an OKLCH ramp, colours read from a theme token -- but a function cannot travel in a
`StyleDocument`, cannot survive the `postMessage` the catalogue's contract promises, and puts a
per-element call back into the repaint loop the ramp table exists to remove (37 ms against 0.6 ms
at fifty thousand nodes). A consumer who wants a computed palette samples the function into
anchors once and registers the result.

### The registration contract every one of the six obeys

All six go through one implementation, `src/catalog/pluginRegistry.ts`, so the policy is written
once and cannot drift.

**Duplicates.** Registering the identical implementation under the same name again is a no-op,
because a module re-evaluated by a bundler or by hot module replacement must not become two
extensions. Registering a *different* implementation under a name already taken replaces it and
warns once on the console, unless the caller passed `{ strict: true }`, in which case it throws
`E_DUPLICATE_PLUGIN`. This is the accelerator registry's policy (`src/acceleration/registry.ts`),
which is the only duplicate policy in the package that is written down with a reason.

**Built-in names are reserved.** Registering anything under an id the element itself ships throws
`E_DUPLICATE_PLUGIN` regardless of `strict`. Replacing your own registration is a development
convenience; replacing a built-in changes what an existing saved document means, and a document
that painted with `viridis` yesterday must paint with `viridis` today.

**Registration is validated at the door.** A malformed registration throws `E_BAD_COMMAND` naming
the field, at the point the plugin author can see it, rather than inside somebody else's repaint
an hour later. What counts as malformed is listed per point below.

**Registration is global and there is no unregister.** It is global because
`session.catalog` is one shared answer and two sessions that disagreed about what the element can
do would be the bug the shared catalogue prevents. There is no unregister because a descriptor
becomes public API the moment something records it: a layer's source names the palette, a saved
document references the format, a run's result path is built from the algorithm key. Every
registry ships a `clearRegistered<Kind>ForTesting()` escape hatch, named so that nobody can
mistake it for part of the contract, so a suite leaves the registry as it found it.

### A registered extension cannot break a session that does not use it

This is a requirement, not a hope, and it is met by five specific properties.

- **Registration only adds.** The six built-in descriptor tables stay frozen module constants and
  are exactly what `./catalog` publishes. Nothing appends to them. Composition happens at the
  catalogue door, in `src/session/catalog.ts`.
- **The identity promise survives.** Each composed table returns the built-in array *itself* until
  something registers, so a page that imports no plugin gets the same object it got before the
  catalogue learned to carry plugins, and two sessions that agree still compare equal.
- **Built-in ids are reserved**, so no registration can change what an existing key means.
- **A plugin's code runs only when its key is named.** A registered layout lays nothing out, a
  registered palette paints nothing, a registered view moves no camera, and a registered reader
  reads no file until a consumer names it.
- **The two exceptions are contained and stated.** A registered log sink starts receiving records
  immediately, because that is what a sink is; a sink whose `write` throws is caught per sink and
  the other destinations still get the record. A registered format's `detect` runs on every
  detection; plugin detectors run strictly after every built-in detector, so a plugin can only
  claim a file the element could not already read, and a detector that throws is caught and
  treated as "no".

## Decision 2: how each point reaches `session.catalog`

`src/session/catalog.ts` already composes the built-in algorithm table with the registered one and
holds an identity promise its header states as a rule: the same array until something registers,
so two sessions that agree do not look like they disagree. That mechanism is generalised rather
than copied.

One helper replaces `composedAlgorithms`:

```ts
function compose<T>(builtIn: readonly T[], registered: readonly T[]): readonly T[];
```

It returns `builtIn` itself when `registered` is empty, and otherwise a frozen concatenation
cached on the *identity* of `registered` -- which each registry already guarantees is stable until
its map changes. Six tables use it: algorithms, formats, layouts, palettes, cameras and log sinks.
`scales` keeps returning its frozen table, because scales are internal.

`SESSION_CATALOG_TABLES` grows two members, `cameras()` and `logSinks()`, and `SessionCatalogApi`
widens to:

```ts
Pick<CatalogApi, "algorithms" | "cameras" | "formats" | "layouts" | "logSinks" | "metrics" | "palettes" | "scales">
```

**The static tables in `./catalog` keep meaning "what the element ships".** They stay frozen and
unchanged, which is what keeps `test/catalog/registries.test.ts` true without an edit: it asserts
`PALETTE_DESCRIPTORS` is exactly the seventeen built-ins in order, that `LAYOUT_DESCRIPTORS`
covers every registered engine, and that `FORMAT_DESCRIPTORS` and `DataSource.getRegisteredTypes()`
are a bijection. All three remain true.

**The lookup functions do change, and they must.** `requirePalette` calls `paletteDescriptor(id)`,
`Graph.loadFromFile` needs `formatsForExtension`, and `recommendLayout` calls `layoutDescriptor`.
A lookup that misses registered entries leaves the extension point half-built, with an entry
visible in a picker that fails when it is chosen. So `paletteDescriptor`, `formatDescriptor`,
`formatsForExtension`, `palettesOfKind`, `layoutDescriptor` and `layoutIdForEngine` search the
built-in table first and the registry second. With nothing registered their answers are
byte-identical to today's, which is why the existing assertions (`formatDescriptor("sif")` is
undefined, `formatsForExtension(".nope")` is empty, `layoutDescriptor("no-such-layout")` is
undefined) still hold.

## Decision 3: one options mechanism, and it is not Zod

Today an extension author faces three disagreeing mechanisms. Algorithms declare options twice --
as `OptionDescriptor[]` for the catalogue and as a deprecated `OptionDefinition` schema for the
constructor -- in two vocabularies that do not correspond (`select`/`nodeId` against
`enum`/`node-id`), with nothing cross-checking them. Layouts declare a Zod schema the catalogue
emitter reads for built-ins only. Formats hand-write descriptors in the catalogue and only the
JSON reader validates anything. Cameras have nothing.

**One mechanism: an extension declares `readonly OptionDescriptor[]`, the plain-JSON type the
catalogue already publishes, and the element validates the caller's values against it.**

- `OptionDescriptor` already carries everything a form needs and everything validation needs: a
  name, a plain name, a type, a default, a range, an enum list, a group, an advanced flag.
- It is already published from `./catalog` and is already what `session.catalog` hands a picker.
- It keeps Zod off the boundary, which `catalog.ts`'s own header says is the point: shipping Zod
  across a package boundary makes the consumer's Zod version part of this package's API.
- One validator means one failure vocabulary: `E_UNKNOWN_OPTION` with `details.available` and
  `details.candidates`, and `E_OPTION_RANGE` with the range and the value passed. The run path
  already does exactly this for algorithms; every other point joins it.

`optionsFromZod` stays published as a *convenience*: an author who prefers to write a Zod schema
calls it once and registers the descriptors it emits. Zod is one way to produce the contract, not
the contract. The element's own built-ins keep their internal Zod schemas and keep emitting
descriptors from them, unchanged.

One new published function does the work:

```ts
// src/catalog/options.ts
export function resolveOptionValues(
    declared: readonly OptionDescriptor[],
    passed: Readonly<Record<string, unknown>>,
    context: { kind: "algorithm" | "camera" | "format" | "layout" | "sink"; id: string },
): Record<string, unknown>;
```

It fills defaults, refuses an unknown name with `E_UNKNOWN_OPTION`, refuses an out-of-range or
non-enumerated value with `E_OPTION_RANGE`, and returns a plain record. It replaces
`resolveOptions` in `src/algorithms/types/OptionSchema.ts` as the element's validation path.

`src/algorithms/types/OptionSchema.ts` and its exports (`OptionsSchema`, `OptionDefinition`,
`OptionsFromSchema`, `defineOptionsSchema`, `resolveOptions`, `validateOption`,
`OptionValidationError`) stay exported from `./extend` for back-compat and are marked
`@deprecated` pointing at `OptionDescriptor` and `resolveOptionValues`. `OptionValidationError` in
particular stops being a failure path anything new produces: it is a plain `Error` with no code,
and the contract requires a coded one.

## Decision 4: how failure is reported

Three new codes. Adding a code is a minor-version addition, which `src/errors/codes.ts` states as
its own rule. Inventing an error class is not allowed, and two of these exist to retire one.

| Code | Meaning |
|---|---|
| `E_UNKNOWN_PALETTE` | A binding, an `encode` call or a document names a palette nothing registered. `details.available` lists the known palette ids, `details.candidates` the nearest few. |
| `E_UNKNOWN_CAMERA` | A camera view name nothing registered. `details.available` lists the known view ids. |
| `E_UNKNOWN_SINK` | A logging configuration names a log destination nothing registered. `details.available` lists the registered sink ids. |

They join the `E_UNKNOWN_*` family beside `E_UNKNOWN_ALGORITHM`, `E_UNKNOWN_LAYOUT` and
`E_UNKNOWN_FORMAT`, and they bucket as `unknown-name` in the error-model test's exhaustive switch.

Existing codes carry everything else. Nothing new is invented where a code already fits:

| Situation | Code |
|---|---|
| A malformed registration: no id, no colours, a non-function factory, a contradicting palette kind and capacity, an anchor that is not a colour, a format claiming `canExport`, an algorithm whose `descriptor.key` differs from its `static type` | `E_BAD_COMMAND`, `details.field` naming it |
| A different implementation under a taken name with `{ strict: true }`, or any registration under a built-in id | `E_DUPLICATE_PLUGIN`, `details` naming the kind and the name |
| An unknown option name | `E_UNKNOWN_OPTION` |
| An option value out of range or not one of the choices | `E_OPTION_RANGE` |
| A camera view asked for in a drawing mode it does not declare | `E_UNSUPPORTED`, `details.reason` and `details.modes` |
| A layout asked for in more dimensions than its `maxDimensions` | `E_UNSUPPORTED` |
| `saveCameraPreset` given a name a registered view already holds | `E_PROTECTED` |
| A categorical palette asked to name more groups than it has colours | `E_CAP_EXCEEDED` (unchanged) |
| An unknown layout name | `E_UNKNOWN_LAYOUT`, replacing a bare `TypeError` |
| An unknown format name, or detection that matched nothing | `E_UNKNOWN_FORMAT`, replacing two plain `Error`s |
| A file that will not parse | `E_PARSE_FAILED`, `details` carrying the format and the line |
| A source that will not fetch | `E_FETCH_FAILED`, `details` carrying the url and the status |

**`ScreenshotError` stops being a camera error family.** Its three camera codes convert:
`CAMERA_PRESET_NOT_FOUND` becomes `E_UNKNOWN_CAMERA`, `CAMERA_PRESET_NOT_AVAILABLE_IN_2D` becomes
`E_UNSUPPORTED`, and `CANNOT_OVERWRITE_BUILTIN_PRESET` becomes `E_PROTECTED`, whose own
documentation already reads "owned by the element and may not be removed or edited".
`ScreenshotError` keeps its non-camera codes and is otherwise untouched.

**The element's own importers must throw coded errors too.** Today every one of the seven throws a
plain `Error`, and `E_PARSE_FAILED`, `E_FETCH_FAILED` and `E_UNKNOWN_FORMAT` are defined and used
nowhere but the error-model unit test. A plugin cannot have parity with a built-in here because
the built-ins have nothing to be at parity *with*. The honest fix is to make the element's own
import path coded first, and then require the same of a plugin, so this design does both.

**A failing log sink is never reported through the logger.** Reporting a logging failure through
the logger re-enters the dispatch loop. A sink that throws from `write` or rejects from `flush` is
caught per sink and written to `console.error`, exactly as the write path does today; the flush
path joins it.

## Decision 5: the camera

This is the point with no existing seam and the least obvious unit. The word "camera" covers two
different things in this code and only one of them can honestly be an extension point.

### The two candidates

**(A) A named view that is computed.** This is what the five built-ins literally are:
`calculateFitToGraph`, `calculateTopView`, `calculateSideView`, `calculateFrontView`,
`calculateIsometric`, each reading a bounding box over the nodes and branching on 2D against 3D. A
consumer names one by string, and animation, easing, duration, queueing, cancellation, the
state-changed event and screenshot framing are all already built around that string. It is also
the sentence the contract itself uses for this point: "a way of *deciding* where the viewer is and
what they are looking at". Deciding, not owning pixels.

**(B) A camera controller.** A Babylon camera plus `zoomToBoundingBox(min, max)` plus a paired
input handler, registered under a key. This is what the element's own `CameraManager.registerCamera`
takes, and it is the only route to a new projection or a new interaction model -- a first-person
walk camera, a map camera, a VR rig.

### The decision: (A) is the extension point; (B) stays internal

Reasons, in the order they decide it.

1. **(B) cannot be published.** Its members are Babylon `Camera` and `Vector3`, so `./extend` can
   never export it without breaking Node-safety, and the plugin would have to depend on
   `@babylonjs/core` directly and match the element's version. Parity clause 6 fails outright.
2. **The element does not use (B) for its own third camera.** `XRPivotCameraController` is parked
   on `scene.metadata` and stepped from a render-loop callback, while `"xr"` sits unused in the key
   union. A seam the element routes around is not a seam.
3. **(B) is decided by duck-typing.** Six branches in `Graph.ts` recognise the two built-in
   controllers by property name (`"pivot" in controller`, `"velocity" in controller`). A third
   controller silently falls into a fallback that loses animation and every state field except
   position and target -- with no error and no warning. Publishing that is publishing a trap.
4. **(A) is reachable, typeable and testable**, slots into the catalogue and into a picker, and
   inherits the animation, easing, queueing and cancellation the element already built around a
   preset name.

Controllers are therefore internal, exactly as lifecycle managers are, and the duck-typed branches
stay as they are because only the element's own two controllers will ever reach them.

### What a camera view is

A plain object: a descriptor, and one pure function from a bounding box to a camera state.

```ts
// src/camera/types.ts -- Node-safe, plain data, no Babylon.js
export interface Vec3 { readonly x: number; readonly y: number; readonly z: number }

export type DrawingMode = "2d" | "3d";

/** An axis-aligned box around the elements a view is being asked to frame, in world units. */
export interface GraphBounds {
    readonly min: Vec3;
    readonly max: Vec3;
    readonly center: Vec3;
    readonly size: Vec3;
    /** The largest of the three sides. */
    readonly maxDimension: number;
    /** How many elements the box was measured over. Zero means it is the element's default box. */
    readonly measured: number;
}

/** Everything a view is told before it decides where the viewer stands. */
export interface CameraViewInput {
    readonly bounds: GraphBounds;
    readonly mode: DrawingMode;
    /** The viewport's width divided by its height. */
    readonly aspect: number;
    /** The vertical field of view in radians. Absent in 2D, which has no perspective. */
    readonly fov?: number;
    /** Where the camera is right now, so a view can be relative to it. */
    readonly current: CameraState;
    /** The view's own options, resolved against the defaults its descriptor declares. */
    readonly options: Readonly<Record<string, unknown>>;
}

export interface CameraViewRegistration {
    readonly descriptor: CameraDescriptor;
    compute(input: CameraViewInput): CameraState;
}
```

`CameraState` is today's type, unchanged in shape. **Its declaration moves** from
`src/screenshot/types.ts` to `src/camera/types.ts`, and `src/screenshot/types.ts` re-exports it, so
every existing importer and the root entry point keep working under one name. That move is what
makes the type importable from a Node-safe entry point, which a view that returns one needs.

The descriptor:

```ts
// src/catalog/types.ts
export interface CameraDescriptor {
    id: CameraId;
    plainName: string;
    description: string;
    /** The drawing modes this view can be computed in. The element refuses the others. */
    modes: readonly DrawingMode[];
    options: readonly OptionDescriptor[];
}
```

`modes` is what replaces the built-ins' current way of expressing availability, which is to throw
from inside a `switch`. A picker cannot read a throw. With `modes` on the descriptor the element
refuses *before* calling, with `E_UNSUPPORTED`, and a picker never offers a view it cannot use.

### What this changes about the five built-ins

They become five registrations of the same shape a plugin uses, in a new Node-safe module
`src/camera/builtins.ts`, computing from `GraphBounds` rather than from a `Graph` and a Babylon
`Camera`. The Babylon-dependent half -- measuring the bounding box, reading the field of view and
the render size -- moves to the caller in `Graph.ts`, which is where it belongs and where it
already is for `zoomToBoundingBox`. `src/camera/presets.ts` is deleted; `BUILTIN_PRESETS` survives
on the root entry point as the ids of `CAMERA_DESCRIPTORS`, so nothing published breaks.

`resolveCameraPreset`'s five-case `switch` becomes a registry lookup:

```ts
resolveCameraPreset(id: string, options?: { scope?: Scope; params?: Record<string, unknown> }): CameraState
```

and the element gains one genuinely new capability, because the design would be dishonest without
it: **a view can frame a subset.** `bounds` is an input rather than something the view computes,
so `graph.applyCameraView(id, { scope })` measures the box over the scope and hands it in. No
built-in frames a subset today -- `zoomToNodes` resolves the matching node ids and then frames the
whole graph anyway, with a comment admitting it -- so this is new capability rather than parity.
It is included because it is the most likely reason anyone writes a camera extension, and because
adding it after the fact would change `compute`'s signature, which is a breaking change to a
published contract.

### What stays where it is

**User presets stay per-graph.** `saveCameraPreset(name)` stores a snapshot of where *this*
graph's camera is. That is not a capability of the element, so it does not belong in a shared
catalogue that answers "what can the element do". `catalog.cameras()` lists registered views;
`getCameraPresets()` lists this graph's snapshots. `saveCameraPreset` now refuses a name any
registered view holds, not just a built-in one, with `E_PROTECTED`.

**Auto-framing during layout stays closed.** The minimum-steps, re-zoom-every-N, re-zoom-on-settle
policy in `UpdateManager` is the element's own and is out of scope. One cheap, independent fix
goes with this work because it is a bug rather than a design: `zoom-to-fit-complete` is emitted
but absent from `addListener`'s switch, so no consumer can subscribe to an event the element
sends. Add it.

**The natural-language camera command reads the catalogue.** `src/ai/commands/CameraCommands.ts`
builds its preset parameter as a Zod enum spread from `BUILTIN_PRESETS` and re-validates against
the same array, so a registered view could never be named. It reads `catalog.cameras()` instead.

## The six points in detail

### Palette

**Unit.** A `PaletteDescriptor`: an id, a plain name, a kind, colour anchors, a capacity and a
colour-blindness claim. Nothing in the element ever asks a palette for behaviour -- every palette
capability is implemented by code that reads those six fields -- so the descriptor is the whole
unit and a class would be a data carrier wearing a constructor.

**Registration.** `registerPalette(descriptor, options?)` from `./extend`.

**Validated at the door, with reasons.**

- *An anchor that is not a colour is refused* with `E_BAD_COMMAND` naming the palette and the
  colour. Today the same check happens inside `prepareRamp`, one repaint after the mistake.
- *Anchors are normalised to six-digit hex at registration.* The parser the element already uses
  accepts three, four, six or eight hex digits, named colours, `rgb()`, `hsl()` and `oklch()`, but
  the interpolation path reads six digits only and returns magenta otherwise -- so a sequential
  palette written in named colours would pass validation, produce correct endpoints and a magenta
  middle. Normalising once at registration means an author may write `oklch(...)` and the
  renderer, the legend and every consumer read the same hexes. `src/catalog/color.ts` holds the
  one normaliser; `src/session/styles/channels.ts` calls it so there is one parse, not two.
- *`kind` is authoritative and `capacity` is derived.* Categorical gets `colors.length`,
  sequential and diverging get `null`. A descriptor whose `capacity` contradicts its `kind` is
  refused with `E_BAD_COMMAND`. The built-ins already keep the two in lockstep and a test pins it;
  this makes a plugin obey the same rule rather than being able to hand in `kind: "sequential"`
  with `capacity: 8`, which nothing cross-checks today.
- *A built-in palette id is refused* with `E_DUPLICATE_PLUGIN`.

**An unknown palette is refused at the edit, not at the repaint.** `checkBinding` already does
exactly this for scales -- `E_UNKNOWN_SCALE` with candidates, at `validate` and `add` time -- and
says nothing about palettes, so `styles.encode({ palette: "magma" })` succeeds today, writes the
id onto the layer, and fails one repaint later as a disabled layer. The palette check joins the
scale check, with `E_UNKNOWN_PALETTE` and a candidates list a picker can show.

**What a registered palette inherits with no further work**, because every one of these is
palette-agnostic once a descriptor resolves: the categorical index path and the continuous
interpolation path; the lazily built step table sized `512 * (anchors - 1)`; the `E_CAP_EXCEEDED`
refusal on over-subscription; the legend's block kind, its name, its reversal note and its
swatches; reversal by a binding; the missing-value policy; and a round trip through a saved
document's layer bindings.

**`StyleDocument.palettes` becomes a working save and a narrower refusal.** Today `toDocument()`
never writes the field and `checkDocument` refuses any document carrying one, with a message
asserting that "palettes travel with the element, not with a document" -- a declared, tested dead
end in both directions. Now: `toDocument()` writes the descriptor of every non-built-in palette
the layers name, so a saved look is self-describing and a consumer can see what it needs; and
`checkDocument` accepts a document whose carried palettes are already registered, and refuses one
naming a palette nothing registered with `E_UNKNOWN_PALETTE` and a message that says to register
it first. The refusal survives; the wrong sentence does not.

**Deliberate limits, stated rather than left to be discovered.**

- *A palette takes no options.* `PaletteDescriptor` is the only catalogue descriptor with no
  `options` field, because every knob -- scale, domain, clamp, midpoint, reverse, missing, bins --
  belongs to the binding. No built-in palette takes configuration, so nothing is withheld, and
  adding an options surface no built-in has would be inventing a parity gap rather than closing
  one.
- *A palette does no work over time*, so the progress-and-cancellation clause is satisfied
  vacuously. Preparing a ramp is synchronous and bounded by the anchor count; the progress and
  cancellation that exist belong to the layer edit, and a layer naming a plugin's palette gets
  them unchanged.
- *The element takes a `colorblindSafe` claim on trust*, exactly as it takes its own palettes'.
  `isPaletteSafe` can compute the answer and is already published, but computing it would have the
  element overrule an author about their own palette. A picker that wants to verify calls the
  published function itself.
- *The function-style helpers are legacy and closed.* `sequential.viridis(v)`,
  `categorical.okabeIto(id)`, `diverging.purpleGreen(v, mid)` and the binary pairs are a second,
  older palette vocabulary with no registration seam and no link to the catalogue, and they
  disagree with the descriptor path on over-subscription: the categorical helpers wrap by modulo
  where `prepareRamp` refuses with `E_CAP_EXCEEDED` and the catalogue's own header calls silent
  wrapping the defect that refusal exists to prevent. They are marked `@deprecated` pointing at
  `catalog.palettes()`; no registration seam is built for them.
- *The element's hard-coded palette choices stay hard-coded.* `DEFAULT_PALETTE` (`viridis`),
  `CATEGORICAL_PALETTE` (`okabe-ito`), `CONTINUOUS_PALETTE` (`viridis`) and `HIGHLIGHT_PALETTE`
  (`blue-highlight`) keep no hook. Parity does not require one -- not even a consumer choosing
  among built-ins can change them today -- and changing what `encode()` writes when no palette is
  named would change the meaning of every already-saved document. A caller who wants brand colours
  names them. Recorded as a follow-on, not as a defect in this extension point.
- *`'highlight'` is not a palette kind.* The three built-in highlight pairs are categorical
  palettes of two colours, and the legend's highlight block comes from the *layer's* kind. A
  plugin registering a two-colour categorical palette gets exactly what a built-in highlight pair
  gets.

**One unrelated fix that lands in the same file.** `KNOWN_PALETTE_IDS` lists four ids where the
catalogue has seventeen, so `PaletteId`'s autocomplete already fails to suggest most of the
element's own palettes. It is corrected to list all seventeen.

### File format

**Unit.** A class extending `DataSource`, carrying the format's description as statics:

```ts
class MyReader extends DataSource {
    static type = "mine";
    static descriptor: FormatDescriptor;          // required
    static detect?(sample: string): boolean;      // optional content sniffer
    protected getConfig(): BaseDataSourceConfig;
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk>;
}
DataSource.register(MyReader);
```

Everything else is inherited and already works: byte fetching from a string, a `File` or a URL,
three attempts with exponential backoff and a per-attempt timeout, chunking, per-record Zod
validation, error aggregation and the direction declaration. That is about forty lines of class
for a whole format, which the existing test already demonstrates.

**Why the descriptor is a static on the class rather than an argument or a second call.** It
mirrors `DeclaredAlgorithm`, which a consumer has already met, and it makes one registration the
only registration -- a descriptor and the class it describes cannot be filed separately, so there
can be no catalogue entry whose reader nothing registered. The cost is honest and worth naming: a
host that imports the plugin to get its descriptor also gets the parser. That is already true of
the element's own seven, which register at import time, and a picker that reads `catalog.formats()`
from `./catalog` still pays nothing, because that table imports no reader.

**What `DataSource.register` does now.** It files the class under `static type` as it always has,
and additionally publishes `static descriptor` and `static detect` to the format registry, which
is what puts the format into `catalog.formats()`, into `formatDescriptor`, into
`formatsForExtension` and into detection. It refuses:

- a class with no `static type` (today it registers under the string `"undefined"`)
- a class with no `static descriptor`
- a descriptor whose `id` differs from `static type`
- a descriptor with no extensions or no media types
- a descriptor with `canExport: true` -- see the deliberate limits
- a built-in format id

all with `E_BAD_COMMAND` naming the field, or `E_DUPLICATE_PLUGIN` for the last.

**Detection becomes registry-driven and published.** The tiered chain moves to
`src/catalog/detect.ts` (Node-safe, reads the composed descriptor list and the registry's
detectors) and `src/data/format-detection.ts` is deleted, with `Graph.ts`'s two dynamic imports
updated. Published from `./catalog` and `./extend`:

```ts
export function detectFormat(input: { filename?: string; sample?: string }): FormatId | null;
export function detectFormats(input: { filename?: string; sample?: string }): readonly FormatId[];
```

The order, which matters and is now stated rather than implied by an `if`-chain:

1. **Extension.** Every format whose descriptor claims the file's extension, built-ins first, then
   registrations in registration order.
2. **Disambiguation.** When more than one claims it, each claimant's `detect(sample)` is asked in
   that same order and the first `true` wins; if none says yes, the first claimant wins. This is
   what makes the `.xml` case -- GraphML against GEXF, by namespace -- expressible by a plugin
   instead of hard-coded in a module-private function.
3. **Content.** With no extension match, every built-in `detect` is asked in a fixed order (CSV
   last, because its regex is the loosest), then every plugin's.

**Plugin detectors run strictly after every built-in detector**, so a plugin can only claim a file
the element could not already read. A plugin that wants a file the element also claims does so by
extension, where the ambiguity is explicit and both formats are offered. A detector that throws is
caught and treated as "no". `detectFormats` returning a ranked list is what ends the disagreement
between `detectFormat` returning one answer and `formatsForExtension` returning an array.

Publishing detection also deletes a workaround: `@graphty/graphty` reimplements an extension table
and a content sniffer in two files because the function is module-private, which under the
monorepo's own rules is a bug report that was never filed.

**The import path gets a real error model.** `E_UNKNOWN_FORMAT` for a name nothing registers and
for detection that matched nothing; `E_PARSE_FAILED` from every importer, carrying the format and
the line; `E_FETCH_FAILED` from `fetchWithRetry` on a bad status and on exhaustion. The `TypeError`
at the unknown-format branch and the plain `Error`s in all seven built-ins go. Without this a
plugin cannot have parity, because the built-ins have nothing to be at parity with.

**Types a plugin needs, published.** `DeclaredDirection` is already on `./extend`.
`DataLoadingError`, `ErrorSummary` and `ErrorAggregator` move there from the root, so a plugin can
write a typed helper returning its own errors without importing the renderer. `AdHocData` is
published together with `toAdHocData(record)` and `toAdHocRecords(records)`, which is what removes
the double cast every reader writes today -- including the element's own, which use
`as unknown as AdHocData[]`. Two undocumented record conventions get written down in the
`DataSourceChunk` documentation rather than discovered by reading `ingest.ts`: a `position` key
(`{x, y, z}` or `[x, y]` or `[x, y, z]`) seeds node coordinates in file units, and an edge weight
is resolved through the configured weight path.

**Deliberate limits.**

- *Reading only.* `canExport` is false on all seven built-ins and there is no writer seam to
  register into, so a plugin setting it true would be lying to a "Save as" menu. Registration
  refuses it. Writers are a follow-on, and when one exists the same class carries it.
- *Imports cannot be cancelled.* No built-in can be either, so the contract's cancellation clause
  is satisfied vacuously -- but it is an absence nobody had decided about, so it is decided here:
  no signal is threaded through `BaseDataSourceConfig` in this design, and the limit is recorded
  rather than inherited.
- *Progress is at parity and partly fictional.* A registered format's per-chunk progress reaches
  the consumer automatically under its own name with running node and edge counts, exactly like a
  built-in's. The byte figure in that event is `chunksProcessed * 64 * 1024` for every format
  alike, and `totalBytes` arrives only from a `File`'s size. Parity holds; the number is an
  invention for everyone, and saying so here is better than a plugin author trusting it.
- *Media types are advisory.* Nothing reads them at run time; detection looks at the name and the
  content. A registered format inherits the same advisory status rather than a third detection
  tier that does not exist.

**A behaviour change worth watching.** `test/catalog/registries.test.ts` asserts a bijection
between `DataSource.getRegisteredTypes()` and `FORMAT_DESCRIPTORS`. Requiring a descriptor at
registration turns that test into a forcing function: a reader registered without one now fails at
registration rather than at the test. That is the intended pressure and it is a behaviour change
for the one-argument `register` -- which is why the refusal names the missing field.

### Camera

Decided in full above. The mechanics, restated as an implementation list:

**Unit.** `{ descriptor: CameraDescriptor; compute(input: CameraViewInput): CameraState }`.

**Registration.** `registerCameraView(registration, options?)` from `./extend`. Refuses a
descriptor with no id, an empty `modes`, a non-function `compute` (`E_BAD_COMMAND`), or a built-in
view id (`E_DUPLICATE_PLUGIN`).

**Catalogue.** A sixth table. `CAMERA_DESCRIPTORS` and `cameraDescriptor(id)` and
`camerasForMode(mode)` in `src/catalog/cameras.ts`, published from `./catalog`;
`catalog.cameras()` composes built-ins with registrations.

**Addressability.** `graph.applyCameraView(id, options?)` and the existing
`loadCameraPreset(name, options?)` and `setCameraState({ preset }, options?)` all resolve through
the registry, so a registered view is named exactly the way a built-in is, from the element's
public API, from a screenshot's `{ preset }` option, and from the natural-language layer.

**Progress and cancellation.** A view computes a state synchronously and has nothing to report
progress about. The *animated apply* already honours the operation queue's `AbortSignal` and stops
the Babylon animatable rather than rejecting; a registered view inherits that unchanged, because
the animation belongs to the apply and not to the view. Parity means cancellation only, and it is
already met.

**Options.** `CameraDescriptor.options` are `OptionDescriptor[]` like everything else, resolved by
`resolveOptionValues` and handed to `compute` as `input.options`. This is more than the built-in
controllers have -- their rotation speeds, damping and zoom limits are plain interfaces hard-wired
with literals at construction -- and it costs nothing to give the new point the shared mechanism
from the start.

**Two disagreements the builders must not average.** The orbit controller pads a framing by 5
percent and clamps to the configured zoom limits; the 2D controller pads by 10 percent and clamps
nothing; `fitToGraph` pads 5 percent in 2D and 10 percent times a 0.65 isometric factor in 3D. The
built-in views keep their current numbers exactly, so no picture changes; a plugin picks its own.
Separately, the 2D controller is constructed twice with different `zoomMax` (500 for the
controller, 100 for its input controller) -- a real bug, noted here, fixed separately.

### Layout

**Unit.** A class extending `LayoutEngine` (a simulation the element steps every frame) or
`SimpleLayoutEngine` (an arrangement computed in one pass), with `static type`,
`static maxDimensions`, and now `static descriptor: LayoutDescriptor`. The shape is settled and
already works end to end; what changes is what else the class declares and what the element does
with it.

**Registration.** `LayoutEngine.register(MyLayout)`, which now also publishes the descriptor,
refuses a class with no `static type` or no `static descriptor`, refuses a descriptor whose `id`
differs from `static type`, and refuses a built-in layout id.

**One key, not two.** The element has two keys for a layout: the *engine* name (`ngraph`,
`circular`), which `setLayout` takes, and the *arrangement* name (`force`, `circular`), which the
catalogue uses -- and `recommendLayout` has to hand a consumer `layout.engine` to act on. A plugin
declares one key and its descriptor's `id` must equal it, so `layoutIdForEngine` answers a
plugin's own id and nothing has to be named twice. A plugin cannot add an engine to an existing
arrangement -- a third ForceAtlas2 implementation behind `force`, say -- and that is deliberate:
the arrangement table encodes the element's editorial judgement about which of its own engines to
prefer and why, which is not a judgement a third party can make on the element's behalf.

`LAYOUT_DESCRIPTORS` keeps meaning "the twelve arrangements the element ships", so
`test/catalog/registries.test.ts`'s three invariants over it stay true with no edit.

**The five optional methods become declared, with working defaults on the base class.** Today
`dispose`, `removeNode`, `removeEdge`, `updatePositions` and `getEdgePath` are duck-typed by the
managers, declared nowhere, and implemented by none of the sixteen built-ins -- so an author
learns of them only by reading `DataManager`, and gets no worked example.

- `dispose(): void` -- default no-op. `LayoutManager` calls it directly.
- `removeNode(n: Node): void`, `removeEdge(e: Edge): void` -- default no-op. `DataManager` calls
  them directly. (That the built-ins leak every removed node into their own lists forever is a
  separate defect, named here and fixed separately.)
- `updatePositions(nodes: Node[]): void` -- **the default does the ten blind steps** the manager
  does today, so the fallback lives on the base class where a plugin overrides it, and the manager
  stops having to tell "not implemented" from "implemented as a no-op".
- `getEdgePath` is **deleted**, along with its guard and its accessor. Nothing in the element ever
  calls `LayoutManager.getEdgePath` -- the only matches for the name are its own declaration and
  its two wrappers -- so an engine that implemented it changed nothing on screen. A seam that
  silently does nothing is worse than no seam.

**`publishPositions()` becomes the element's job.** `LayoutManager` calls it after the pre-steps
and after each step batch, and the two live built-ins stop calling it at the end of their own
step, so the work happens once and a plugin cannot forget. Forgetting it today renders perfectly
and leaves `session.positions` unplaced for every node -- a failure with no symptom until a drag,
a re-freeze or an accelerator reads the array.

**`this.config` stops being an undocumented obligation.** A 2D/3D switch rebuilds the engine from
`this.layoutEngine.config`, which `NGraphLayoutEngine` and `D3GraphLayoutEngine` never set -- so
the element's own default layout silently discards every option on a view-mode change. The manager
already holds the same options in `currentLayoutOptions`; it rebuilds from those instead. One
change fixes a built-in bug and removes an obligation from plugins.

**`maxDimensions` is enforced.** A layout asked for in more dimensions than it declares is refused
with `E_UNSUPPORTED` rather than run anyway. The declaration is read by a picker through the
descriptor and by the element as a backstop. This is a behaviour change for the 2D-only built-ins
if anything currently asks for one in 3D, and is the one change in this design most likely to have
test fallout; it is kept because a declaration nothing reads is worse than no declaration.

**Errors.** `E_UNKNOWN_LAYOUT` -- defined and used nowhere today -- replaces the bare `TypeError`.
The message string-sniffing that decides whether an error has already been wrapped goes, and a
constructor failure emits the graph error event like an `init` failure does.

**Types a plugin needs, published from `./extend`.** `Node`, `Edge` and `NodeIdType` are published
as type-only re-exports, which the emitter erases, so a plugin's abstract members can be typed
without importing the renderer-laden root. These shadow the DOM's `Node` inside a plugin's module,
deliberately and normally; the alternative -- a second spelling like `GraphNode` -- would be two
names for one type, which is the drift this design exists to remove. `LayoutDescriptor`,
`LayoutId` and `LayoutEngineStatics` are published beside them.

**The published documentation is rewritten.** `docs/guide/extending/custom-layouts.md` teaches an
interface the element does not have -- `initialize(nodes, edges)`, `step(): boolean`,
`getPosition(nodeId): Vector3` -- and tells the author to import from the root rather than
`/extend`. Following it produces a class that does not compile. The same is true of
`docs/guide/extending/custom-data-sources.md`, which documents an abstract `load(config)` that
does not exist, imports three types no entry point exports, and calls a `graph.loadFromDataSource`
that exists nowhere in `src/`. Both are rewritten from the tests, which are the only description
of these seams that is checked.

**One note for the test authors.** `./extend` imports `src/layout/LayoutEngine.ts` directly and
not `src/layout/index.ts`, so in a Node-only context `LayoutEngine.getRegisteredTypes()` lists the
plugins and none of the built-ins.

### Algorithm

This is the point closest to working, and the design's job is to remove the three ways it asks an
author to say the same thing twice.

**Unit.** A class extending `DeclaredAlgorithm`, registered by `Algorithm.register`.

**`DeclaredAlgorithm` is the published base, and `MetricAlgorithm` stays internal.** The element
ships two incompatible pipelines: `MetricAlgorithm` (seven built-in centralities) implements
`measure()`/`resultFields()`, is hard-wired to the node-metric shape, cannot publish edges, and is
the only path that supplies node labels; `DeclaredAlgorithm` (sixteen built-ins) implements
`compute()`, can publish any shape and both halves, and supplies no labels. Publishing both would
freeze two pipelines as public API; publishing `MetricAlgorithm` would publish the narrower one.
So `DeclaredAlgorithm` is the unit, **and the label gap is closed inside it**: `computeRun` passes
`labelOf` exactly as `measureRun` does, read from the configured node label attribute. Without
that, a third party subclassing the only published base gets printed ids where a built-in
centrality gets names -- which is a capability the element keeps for its own modules, and
therefore a defect.

**One name, not three.** `Algorithm.register` refuses when `descriptor.key !== cls.type` with
`E_BAD_COMMAND`. The legacy `namespace:type` address lookup assumes the two are equal, and when
they are not the algorithm runs correctly and then finds no suggested styling, silently. (The
builder checks the twenty built-ins against this rule first; any that disagree are corrected,
because the refusal throws at import time.)

**One option list, not two.** Per decision 3: `descriptor.options` is the declaration, and the
element validates against it with `resolveOptionValues`. `static optionsSchema` is deprecated. The
two-vocabulary problem -- `select`/`nodeId` against `enum`/`node-id`, cross-checked by nothing --
ends, and so does `resolveOptions` silently dropping a key the run path refuses with
`E_UNKNOWN_OPTION`.

**Duplicates are refused.** `Algorithm.register` currently overwrites silently, including a
built-in's, while `src/catalog/registry.ts` asserts in a comment that the collision is refused. A
plugin declaring a key a built-in already uses today produces two entries with that key in
`catalog.algorithms()`, and both the descriptor lookup and the executor pick the built-in -- so the
plugin appears twice in a picker and never runs. The shared policy fixes it.

**`publishResult` receives the whole context.** `AlgorithmManager` forwards only `signal`, `report`
and `yieldNow`, dropping `scope`, `seed`, `exact`, `sample` and `timeBox` that the run already
resolved. That single omission is what makes scoped analysis, reproducible seeding, declared
approximation and time-boxed partial results unavailable -- to the built-ins as much as to a
plugin. `AlgorithmRunContext` gains those five members and the manager forwards them. It is an
additive interface change, so no existing algorithm breaks, and it is the largest single parity
win available here.

**`cost` moves off the descriptor.** `AlgorithmDescriptor.cost` is a closure the estimator calls,
and the built-in table deliberately never sets it so the catalogue survives `JSON.stringify` and a
`postMessage` -- an invariant a plugin could break silently by setting it. It moves to the
registration (`static cost` on the class, held beside the class reference in `RegisteredAlgorithm`)
and the estimator reads it from there. The composed catalogue becomes plain JSON *by type* rather
than by discipline, and a plugin still supplies real arithmetic.

**A run records the plugin's version.** `EngineVersions` has three fixed slots -- element,
algorithms, layout -- so a saved run of a third party's algorithm carries nothing identifying the
code that produced its numbers, which is the field's whole purpose. It gains
`plugins?: Readonly<Record<string, string>>`, filled from an optional `static version` on each
registered class.

**Helpers a plugin currently reimplements, published from `./extend`.** `metricField`,
`nodeMetricFields`, `metricFieldSpecs`, `communityFieldSpecs`, `LAYERED_GROUPING_FIELD_SPECS`,
`PATH_FIELD_SPECS`, `setFieldSpecs`, `declaredCaveats`, `checkShapeContract`, and a new
`edgeResultId(source, target)` so the `${src}:${dst}` edge key stops being a doc comment every
built-in retypes inline. The existing extension test hand-writes all eleven field descriptors,
including the `results.$.<name>` path strings; after this it calls one function.

**One chunking helper, one yield.** The two shipped helpers disagree: `forEachChunked` uses 1024
and reports at zero, `walkInChunks` uses 2048 and does not -- and worse, the two detached contexts
disagree about what yielding *means*, one using `setTimeout` and the other returning
`Promise.resolve()`, a microtask that hands the frame back to nobody and contradicts the argument
the element makes in its own manager. `forEachChunked` is the survivor, published, at 1024 with an
opening report; `walkInChunks` is deleted; both detached contexts yield the way the manager does.

**Types a plugin currently re-declares, published.** `ResultElementValues` (the existing test
re-declares it inline, which the contract forbids), `Caveats`, `Progress`, `RunId`,
`AlgorithmDescriptor`, `FieldDescriptor`, `ResultShape`, `AlgorithmGraphMode`, and
`AlgorithmGraphView` -- an element-owned read interface over the input graph, so a plugin names
the type of `this.algorithmGraph(mode)` without adding `@graphty/algorithms` as a dependency of
its own. The existing test declares a structural `{ neighbors(id): IterableIterator<...> }` to work
around exactly this.

**One rule the design has to settle, because two built-ins and the test disagree.** Dijkstra
publishes `onPath: false` for every node and edge and MinCut publishes `in: false` for every edge,
so the derived layer's selector reaches the whole graph even though the algorithm chose a handful
of elements. The test's own dummy metric takes the opposite position and omits unmeasured nodes
entirely. **The rule is: a result carries a row only for an element the algorithm has something to
say about.** It follows directly from the algorithm-styling rule the repository already enforces --
an element the algorithm has nothing to say about is not the algorithm's to paint, not even to a
default -- and a row saying "false" is what turns "not in my result" into a paint instruction.
Dijkstra and MinCut are corrected.

**Deliberate limits.**

- *A plugin cannot be unit-tested in Node.* `Algorithm`'s constructor takes the Babylon-backed
  `Graph` and every documented input route reads through it, so `./extend` being Node-safe buys a
  plugin type-checking rather than a headless test. No built-in can be tested headlessly either,
  so this is parity by shared absence; it is recorded here and named as a follow-on (a
  session-backed input the constructor accepts) rather than solved.
- *`algorithmsOnLoad` still demands a `namespace:type` address*, not a catalogue key, and calls
  `run()` directly -- no run record, no progress, no cancel, no published result for anybody. A
  shared gap, not a withheld capability; named as a follow-on.

### Logging

**Unit.** Two things, because the built-in destinations are reachable two ways and a third party
must have both.

1. A `Sink` -- `{ name, write(record), flush?, dispose?, level?, categories? }` -- handed to
   `GraphtyLogger.addSink(sink)`. This is the live-object route and it already works.
2. A **named factory**, `registerLogSink({ descriptor, create(options) })`, which is what makes a
   third party's destination addressable by a *value* rather than by an object reference.

The second is the sharpest inequality in the whole audit. The element's built-in remote
destination is turned on by a string in a config object (`remoteLogUrl`); a third party's is
reachable only by holding a live JavaScript object and calling a function. No key, no config
field, nothing a saved settings panel could record. With a factory registry, a configuration can
say `{ sinks: [{ use: "acme-collector", options: { url: "..." } }] }`, the stored logging
configuration can round-trip it, and `E_UNKNOWN_SINK` names it when nothing registered it.

**The console becomes a real sink.** Today the element's primary destination is a LogTape sink
wired behind a one-shot latch: it never enters the sink registry, `getSinks()` does not list it,
and `removeSink("console")` does not affect it -- so a consumer who wants element logs to go
*only* to their collector cannot detach the element's own output. The element already ships the
piece that fixes this: `createConsoleSink` is a proper `Sink`, is exported, and is registered by
nothing. It is registered under the name `"console"` during `configure()`, and the LogTape console
path is retired as a destination. Two consequences worth stating: `removeSink("console")` now
works, and **TRACE prints as TRACE**, because the collapse of trace onto LogTape's debug goes with
the LogTape path.

**Three published descriptors and a sixth catalogue table.** `LOG_SINK_DESCRIPTORS` carries
`console` and `remote`; `catalog.logSinks()` composes it with registrations. The alternative was to
write into `CLAUDE.md` that Logging is exempt from the catalogue clause. It is not exempt: once a
destination has a name and a plain name -- which the factory registry requires anyway -- the table
costs one file and a settings panel can be built from it.

**`Sink` grows three optional members**, all additive:

- `level?: LogLevel` and `categories?: readonly string[]` -- a *narrowing* filter applied after the
  global gate, so one destination can take everything the element emits while another takes only
  errors. Neither built-in has a per-sink filter today, so this is a capability nobody had rather
  than one withheld; it is added because "filter inside `write`" is the obvious workaround and the
  obvious workaround should be the API.
- `dispose?(): void | Promise<void>` -- called by `removeSink` and by `GraphtyLogger.reset()`. This
  fixes a live leak in the element's own remote sink: `RemoteLogClient.close()` flushes and stops
  the batch timer, and nothing ever calls it, so `removeSink("remote")` leaves the timer running.

**Isolation fixes, both small.** `flushSinks` gets the per-sink `try/catch` the write path already
has, so one third-party flush rejection no longer takes down the caller's whole `flush()` and hide
whether the built-in remote sink flushed. And `dispatchToSinks` freezes the record and its `data`
before dispatch: one object is handed to every sink, and a sink that mutates a field changes what
every later sink sees. The built-ins happen not to mutate, which is why the element has never
tripped over it.

**One published formatter.** `ConsoleSink`'s default formatter, `RemoteSink`'s `formatRecord` and
the console line's module-private `formatLogMessage` are three different formats, and a third party
writing a collector has to invent a fourth. `formatLogRecord(record, options)` is published from
`./extend` and both built-in sinks call it.

**`lazy` is published.** A plugin can produce lazy values in its own logging the way the element
can, so an expensive field is not computed when the level filters it out. Today the only importer
outside `src/logging` is a test reaching into `src/`.

**Three dead routes are fixed rather than left documented-but-false.**

- The URL remote-log parameter is parsed into `remoteLogUrl` and then dropped, because the element
  passes only `enabled`, `modules`, `level` and `format` to `configure`. It is passed through. With
  the factory registry the same URL vocabulary extends to a registered sink by name.
- Per-module level overrides are parsed into a `Map` that `LoggerConfig` has no field for, so the
  documented `?graphty-element-logging=layout:debug,xr:info` syntax does not do what it says.
  `LoggerConfig` gains `moduleLevels?: Readonly<Record<string, LogLevel>>` and the filter reads it.
- The sessionStorage persistence functions are exported and called by nothing, and `StoredConfig`
  had no room for a sink of any kind. With sinks nameable, a stored `sinks: [{ use, options }]` is
  storable, so the file header's promise -- that a developer need not re-add URL parameters on
  every page load -- is finally kept.

**`configure()` merges rather than resets.** It currently rebuilds the config from defaults, so
`configure({ sinks: [mine] })` silently resets the level to INFO and the modules to `"*"`. Since
that call is the declarative registration route, it must not have side effects on unrelated
settings.

**Deliberate limits.**

- *No replay.* Records emitted before a sink is attached are dropped, and so are records emitted
  before `configure({ enabled: true })` runs. The built-in console loses the same records, so this
  is parity -- but it is decided here rather than inherited: a bounded backlog would separate when
  a record is timestamped from when it is delivered, and a consumer that needs startup records now
  has a way to configure logging by name *before* creating the element, which is what the factory
  registry buys.
- *A sink cannot take more than the global level allows.* The per-sink filter narrows; it does not
  widen. Widening would change what every existing sink sees, and the built-in remote sink is
  behind the same gate, so parity holds. Named as a follow-on.
- *`write` stays synchronous and fire-and-forget.* A returned promise is neither awaited nor
  caught, so an `async write` that rejects becomes an unhandled rejection rather than the caught,
  reported failure a synchronous throw gets. The built-in remote sink solves this by buffering
  internally and exposing `flush`, which a third party copies. The trap is documented on `Sink`
  rather than papered over.

**Which door.** `./extend`, not a new `./logging` entry point. One registration surface is the
point of decision 1, and nothing in `src/logging` imports Babylon, Lit or an unguarded DOM global
-- its two DOM touches are already `typeof`-guarded and `@graphty/remote-logger`'s client has none
-- so the module is already Node-safe as written. The root entry point keeps re-exporting
everything it exports today.

## The single up-front pass: exactly which shared files change

Six builders editing the shared files at the same time would collide, so one pass writes all of
this first. Every export, every code, every composition change and every module path is named
here. A builder who finds something missing from this list has found a gap in the design, not a
decision to make alone.

### 1. `src/errors/codes.ts`

Add three members to the `GraphtyErrorCode` union, each with the doc comment style the file uses,
placed after `E_UNKNOWN_FORMAT` and before `E_UNKNOWN_RUN`:

```
| "E_UNKNOWN_PALETTE"
| "E_UNKNOWN_CAMERA"
| "E_UNKNOWN_SINK"
```

Add the same three keys to `CODE_TABLE` in the same position. Nothing else in the file changes.

**Three companion edits the compiler and the tests force:**

- `test/errors/errors.test.ts`: add the three strings to `CODES_FROM_THE_DESIGN`, and add three
  `case` labels to `bucketOf`'s `unknown-name` group. The `never` in its default branch is a
  compile-time proof, so omitting either fails the build.
- `design/element-api/element-api-design.md`, the `GraphtyErrorCode` union around line 2944: add
  the three codes, because the test's name is "names every code the API design names".
- `graphty-element/CLAUDE.md`: the error-model line reads "38 codes"; it becomes 41.

### 2. `src/catalog/pluginRegistry.ts` (new)

The one registry implementation all six points use.

```ts
export interface RegisterOptions { readonly strict?: boolean }

export interface PluginRegistry<TEntry, TDescriptor> {
    register(entry: TEntry, options?: RegisterOptions): void;
    entries(): readonly TEntry[];
    descriptors(): readonly TDescriptor[];
    byId(id: string): TEntry | undefined;
    clearForTesting(): void;
}

export function createPluginRegistry<TEntry, TDescriptor>(spec: {
    kind: "algorithm" | "camera" | "format" | "layout" | "palette" | "sink";
    idOf(entry: TEntry): string;
    descriptorOf(entry: TEntry): TDescriptor;
    implementationOf(entry: TEntry): unknown;
    builtInIds(): readonly string[];
}): PluginRegistry<TEntry, TDescriptor>;
```

It implements: the identity promise on `descriptors()` (the same frozen array until the map
changes), the duplicate policy (identical implementation is a no-op, different replaces and warns
once, `strict` throws `E_DUPLICATE_PLUGIN`), the reserved built-in ids (always
`E_DUPLICATE_PLUGIN`), and an empty-id refusal (`E_BAD_COMMAND`). Per-point validation happens in
each point's own registration function before it calls `register`.

### 3. `src/catalog/registry.ts` (algorithms, rewritten over the generic)

Keep every exported name and signature -- `RegisteredAlgorithm`, `publishAlgorithmDescriptor`,
`registeredAlgorithms`, `registeredAlgorithmDescriptors`, `registeredAlgorithmByKey`,
`clearRegisteredAlgorithmsForTesting` -- and reimplement the body over `createPluginRegistry`, so
the duplicate policy is shared rather than absent. `RegisteredAlgorithm` gains two optional
members: `cost?: (n: number, m: number) => number` and `version?: string`.

### 4. Five new registry modules, each about ten lines over the generic

| File | Exports |
|---|---|
| `src/catalog/paletteRegistry.ts` | `registerPalette(descriptor, options?)`, `registeredPalettes()`, `registeredPaletteDescriptors()`, `registeredPaletteById(id)`, `clearRegisteredPalettesForTesting()` |
| `src/catalog/formatRegistry.ts` | `interface RegisteredFormat { descriptor, type, detect? }`, `publishFormatDescriptor(entry)`, `registeredFormats()`, `registeredFormatDescriptors()`, `registeredFormatById(id)`, `clearRegisteredFormatsForTesting()` |
| `src/catalog/layoutRegistry.ts` | `interface RegisteredLayout { descriptor, type }`, `publishLayoutDescriptor(entry)`, `registeredLayouts()`, `registeredLayoutDescriptors()`, `registeredLayoutById(id)`, `clearRegisteredLayoutsForTesting()` |
| `src/catalog/cameraRegistry.ts` | `interface RegisteredCameraView { descriptor, compute }`, `registerCameraView(registration, options?)`, `registeredCameras()`, `registeredCameraDescriptors()`, `registeredCameraById(id)`, `clearRegisteredCamerasForTesting()` |
| `src/catalog/logSinkRegistry.ts` | `interface LogSinkRegistration { descriptor, create }`, `registerLogSink(registration, options?)`, `registeredLogSinks()`, `registeredLogSinkDescriptors()`, `registeredLogSinkById(id)`, `clearRegisteredLogSinksForTesting()` |

All five are data and functions only. None imports a class, a reader, an engine or a renderer:
they hold whatever is handed to them at run time, which is what keeps `./catalog` Node-safe.

### 5. `src/catalog/types.ts`

- Add `export const KNOWN_CAMERA_IDS = ["fitToGraph", "topView", "sideView", "frontView", "isometric"] as const;`
  and `export type CameraId = (typeof KNOWN_CAMERA_IDS)[number] | (string & {});`
- Add `export const KNOWN_LOG_SINK_IDS = ["console", "remote"] as const;` and
  `export type LogSinkId = (typeof KNOWN_LOG_SINK_IDS)[number] | (string & {});`
- Add `interface CameraDescriptor` as specified in decision 5.
- Add `interface LogSinkDescriptor { id: LogSinkId; plainName: string; description: string; options: readonly OptionDescriptor[] }`.
- Widen `CatalogApi` with `cameras(): readonly CameraDescriptor[]` and
  `logSinks(): readonly LogSinkDescriptor[]`.
- Remove `cost` from `AlgorithmDescriptor` (it moves to `RegisteredAlgorithm`).
- Correct `KNOWN_PALETTE_IDS` to list all seventeen built-in palette ids.
- Re-export `DrawingMode` from `../camera/types` as a type, so `CameraDescriptor.modes` is nameable
  from `./catalog`.

### 6. `src/catalog/index.ts`

Add to the type export list: `CameraDescriptor`, `CameraId`, `DrawingMode`, `LogSinkDescriptor`,
`LogSinkId`. Add to the value export list: `KNOWN_CAMERA_IDS`, `KNOWN_LOG_SINK_IDS`.

### 7. Two new catalogue tables and one new helper module

- `src/catalog/cameras.ts`: `CAMERA_DESCRIPTORS` (the five built-in views, frozen),
  `cameraDescriptor(id)` (built-ins then registry), `camerasForMode(mode)`.
- `src/catalog/logSinks.ts`: `LOG_SINK_DESCRIPTORS` (console and remote, frozen),
  `logSinkDescriptor(id)` (built-ins then registry).
- `src/catalog/detect.ts`: `detectFormat(input)`, `detectFormats(input)`, implementing the three
  tiers. `src/data/format-detection.ts` is deleted and `Graph.ts`'s two dynamic imports of it point
  here.
- `src/catalog/options.ts`: `resolveOptionValues(declared, passed, context)`.
- `src/catalog/color.ts`: `normalizeHexAnchor(color: string): string | null`, used by
  `registerPalette` and by `src/session/styles/channels.ts` so there is one parse.

### 8. Three existing catalogue tables: lookups only

- `src/catalog/palettes.ts`: `paletteDescriptor` and `palettesOfKind` consult the registry after
  the built-in table. `PALETTE_DESCRIPTORS` is unchanged and gains `Object.freeze`.
- `src/catalog/formats.ts`: `formatDescriptor` and `formatsForExtension` consult the registry after
  the built-in table. `FORMAT_DESCRIPTORS` is unchanged.
- `src/catalog/layouts.ts`: `layoutDescriptor` and `layoutIdForEngine` consult the registry after
  the built-in table. `LAYOUT_DESCRIPTORS` and `LAYOUT_CATALOG` are unchanged.

### 9. `src/session/catalog.ts`

- Replace `composedAlgorithms` with the generic `compose(builtIn, registered)` described in
  decision 2, and use it for six tables.
- `SESSION_CATALOG_TABLES` becomes:
  `algorithms`, `cameras` (new), `formats` (now composed), `layouts` (now composed), `logSinks`
  (new), `palettes` (now composed), `scales` (unchanged, static).
- Add the imports: `CAMERA_DESCRIPTORS` from `../catalog/cameras`, `LOG_SINK_DESCRIPTORS` from
  `../catalog/logSinks`, and `registeredCameraDescriptors`, `registeredFormatDescriptors`,
  `registeredLayoutDescriptors`, `registeredLogSinkDescriptors`, `registeredPaletteDescriptors`
  from their registries.
- Rewrite the file header. Its "five of the six tables are static" sentence becomes false; the new
  statement is that every table but `scales` composes the element's own with whatever was
  registered, and that each returns the built-in array itself until something registers.

### 10. `src/session/types.ts`

`SessionCatalogApi` widens to
`Pick<CatalogApi, "algorithms" | "cameras" | "formats" | "layouts" | "logSinks" | "metrics" | "palettes" | "scales">`,
and its doc comment updated to match.

### 11. `src/camera/types.ts` (new) and `src/screenshot/types.ts`

`Vec3`, `DrawingMode`, `GraphBounds`, `CameraViewInput`, `CameraViewRegistration` and the moved
`CameraState` declaration go into `src/camera/types.ts`. `src/screenshot/types.ts` re-exports
`CameraState` so every existing importer and the root entry point are unaffected.

### 12. `extend.ts` -- the complete export list

Sections, in file order. Everything not marked as a value is a type-only export.

**Shared registration vocabulary**
- `type RegisterOptions` from `./src/catalog/pluginRegistry`

**Options, one mechanism for all six points**
- `type OptionBound`, `OptionChoice`, `OptionDescriptor`, `OptionType` from `./src/catalog/types`
- value `OPTION_TYPES`, `isOptionType` from `./src/catalog/types`
- value `optionsFromZod` from `./src/catalog/optionsFromZod`
- value `resolveOptionValues` from `./src/catalog/options`

**Palette**
- `type PaletteDescriptor`, `PaletteId` from `./src/catalog/types`
- value `KNOWN_PALETTE_IDS` from `./src/catalog/types`
- value `registerPalette`, `registeredPaletteDescriptors`, `clearRegisteredPalettesForTesting`
  from `./src/catalog/paletteRegistry`

**File format**
- `type BaseDataSourceConfig`, `DataSourceChunk`, `DeclaredDirection`, `AdHocData` from
  `./src/data/DataSource` (`DeclaredDirection` is already published)
- value `DataSource`, `toAdHocData`, `toAdHocRecords` from `./src/data/DataSource`
- `type DataLoadingError`, `ErrorSummary` from `./src/data/ErrorAggregator`
- value `ErrorAggregator` from `./src/data/ErrorAggregator`
- `type FormatDescriptor`, `FormatId` from `./src/catalog/types`
- value `KNOWN_FORMAT_IDS` from `./src/catalog/types`
- `type RegisteredFormat` from `./src/catalog/formatRegistry`
- value `registeredFormatDescriptors`, `clearRegisteredFormatsForTesting` from
  `./src/catalog/formatRegistry`
- value `detectFormat`, `detectFormats` from `./src/catalog/detect`

**Camera**
- `type CameraDescriptor`, `CameraId` from `./src/catalog/types`
- value `KNOWN_CAMERA_IDS` from `./src/catalog/types`
- `type CameraState`, `CameraViewInput`, `CameraViewRegistration`, `DrawingMode`, `GraphBounds`,
  `Vec3` from `./src/camera/types`
- `type RegisteredCameraView` from `./src/catalog/cameraRegistry`
- value `registerCameraView`, `registeredCameraDescriptors`, `clearRegisteredCamerasForTesting`
  from `./src/catalog/cameraRegistry`

**Layout**
- `type Node`, `NodeIdType` from `./src/Node`; `type Edge` from `./src/Edge` (type-only, erased)
- `type EdgePosition`, `LayoutEngineStatics`, `Position`, `SimpleLayoutConfigType`,
  `SimpleLayoutOpts` from `./src/layout/LayoutEngine`
- value `LayoutEngine`, `SimpleLayoutConfig`, `SimpleLayoutEngine` from `./src/layout/LayoutEngine`
- `type LayoutDescriptor`, `LayoutId` from `./src/catalog/types`
- value `KNOWN_LAYOUT_IDS` from `./src/catalog/types`
- `type RegisteredLayout` from `./src/catalog/layoutRegistry`
- value `registeredLayoutDescriptors`, `clearRegisteredLayoutsForTesting` from
  `./src/catalog/layoutRegistry`

**Algorithm**
- `type AlgorithmStatics` from `./src/algorithms/Algorithm`; value `Algorithm`
- value `DeclaredAlgorithm` from `./src/algorithms/results/DeclaredAlgorithm`
- `type AlgorithmOutput`, `AlgorithmRunContext`, `ResultElementValues`, `ResultFieldSpec` from
  `./src/algorithms/results/types`
- value `declaredCaveats`, `edgeResultId`, `forEachChunked` from `./src/algorithms/results/types`
- value `communityFieldSpecs`, `LAYERED_GROUPING_FIELD_SPECS`, `metricFieldSpecs`,
  `PATH_FIELD_SPECS`, `setFieldSpecs` from `./src/algorithms/results/fields`
- value `metricField`, `nodeMetricFields` from `./src/algorithms/metrics/fields`
- `type AlgorithmGraphMode`, `AlgorithmGraphView` from `./src/algorithms/utils/snapshotGraph`
- `type AlgorithmDescriptor`, `AlgorithmKey`, `FieldDescriptor`, `ResultShape` from
  `./src/catalog/types`
- value `checkShapeContract` from `./src/session/results/types`
- `type Caveats`, `Progress`, `RunId` from `./src/session/runs/types` (point at the declaring
  module, not the barrel, so the emitted declaration stays narrow)
- `type RegisteredAlgorithm` from `./src/catalog/registry`
- value `registeredAlgorithmDescriptors`, `clearRegisteredAlgorithmsForTesting` from
  `./src/catalog/registry`
- Kept and marked `@deprecated`: `type OptionDefinition`, `OptionsFromSchema`, `OptionsSchema` and
  value `defineOptionsSchema`, `OptionValidationError`, `resolveOptions`, `validateOption` from
  `./src/algorithms/types/OptionSchema`

**Logging**
- `type LoggerConfig`, `LogRecord`, `Sink` from `./src/logging/types`
- value `LogLevel` from `./src/logging/types` (an enum, so a value)
- `type GraphtyLoggerConfig`, `Logger` from `./src/logging/GraphtyLogger`
- value `GraphtyLogger`, `formatLogRecord` from `./src/logging/GraphtyLogger`
- value `lazy` from `./src/logging/LazyEval`
- value `createConsoleSink` from `./src/logging/sinks/ConsoleSink`; value `createRemoteSink` from
  `./src/logging/sinks/RemoteSink`
- `type ConsoleSinkOptions` from `./src/logging/sinks/ConsoleSink`; `type RemoteSinkOptions` from
  `./src/logging/sinks/RemoteSink`
- `type LogSinkDescriptor`, `LogSinkId` from `./src/catalog/types`
- value `KNOWN_LOG_SINK_IDS` from `./src/catalog/types`
- `type LogSinkRegistration` from `./src/catalog/logSinkRegistry`
- value `registerLogSink`, `registeredLogSinkDescriptors`, `clearRegisteredLogSinksForTesting`
  from `./src/catalog/logSinkRegistry`

**Errors** (unchanged)
- `type GraphtyErrorCode`, `GraphtyErrorInit`, `GraphtyErrorSource`, `GraphtyErrorTarget`; value
  `GraphtyError`, `isGraphtyError`

**Acceleration** (unchanged, and still the internal seam it is today)

The file header is rewritten: "four things can be brought to the element from outside" becomes the
six, with the two registration shapes and the rule that decides which applies.

### 13. `catalog.ts`

Add two lines:

```ts
export { CAMERA_DESCRIPTORS, cameraDescriptor, camerasForMode } from "./src/catalog/cameras";
export { LOG_SINK_DESCRIPTORS, logSinkDescriptor } from "./src/catalog/logSinks";
export { detectFormat, detectFormats } from "./src/catalog/detect";
```

`export * from "./src/catalog/index"` already carries the new descriptor types and id constants.

### 14. `index.ts`

- `CameraState` and `CameraAnimationOptions` keep their names; `CameraState`'s re-export path
  follows the declaration to `./src/camera/types`.
- `BUILTIN_PRESETS` stays exported, now derived from `CAMERA_DESCRIPTORS`, and marked
  `@deprecated` pointing at `catalog.cameras()`.
- Logging exports are unchanged; everything the root exports today it still exports.

### 15. Consumers of the changed shapes, which the compiler will find

Listed so nobody has to rediscover them: `src/session/GraphSession.ts` (three
`SESSION_CATALOG_TABLES` reads), `src/session/cost/estimate.ts` (`descriptor.cost` becomes the
registration's `cost`), `src/session/styles/Layer.ts` (`checkBinding` gains the palette check),
`src/session/styles/StylesApi.ts` (`checkDocument`, `toDocument`, `encode`),
`src/session/styles/palettes.ts` (`requirePalette` reports `E_UNKNOWN_PALETTE`),
`src/managers/LayoutManager.ts` (coded errors, `publishPositions`, `currentLayoutOptions`, the
declared optional protocol, `getEdgePath` deleted), `src/managers/DataManager.ts` (declared
`removeNode`/`removeEdge`, coded import errors),
`src/managers/AlgorithmManager.ts` (context forwarding),
`src/managers/EventManager.ts` (`zoom-to-fit-complete` added to the listener switch),
`src/Graph.ts` (camera registry lookup, `applyCameraView`, detection import),
`src/ai/commands/CameraCommands.ts` (reads `catalog.cameras()`),
`src/graphty-element.ts` (`remoteLogUrl` passed through).

### 16. Two pinned tests that change, and how

- `test/session/styles/StylesApi.test.ts` around lines 904 and 912 passes `"magma"` -- not a
  built-in -- to `styles.encode({ palette })` and asserts it lands on the layer unvalidated. It is
  **replaced**, not removed: the same assertion runs against a built-in palette name, and a new
  assertion pins that an unregistered name is refused with `E_UNKNOWN_PALETTE` carrying
  `details.available`.
- `test/session/styles/StylesApi.test.ts` around lines 1277 to 1297 pins the refusal of a document
  carrying `palettes`. It is **narrowed**, not removed: a document carrying a palette that is
  registered is accepted; one carrying a palette nothing registered is still refused, now with
  `E_UNKNOWN_PALETTE` and a message that says to register it first.

No other existing assertion is weakened, loosened, skipped or deleted.

## The six parity tests

One file per point, under `test/browser/extensions/`. Each registers a dummy extension written the
way a third party would -- importing only from published entry points, with no cast and no
re-declaration -- and drives it through everything the built-in equivalent does. A capability not
exercised here is not promised.

Every file calls its registry's `clearRegistered<Kind>ForTesting()` in an `afterAll`, so a suite
leaves the registries as it found them. House style: `import { assert, describe, it } from "vitest"`.

### `palette-extension.test.ts` (new)

**The dummy.** Two palettes registered from one file: `acme-heat`, a five-anchor sequential ramp
written in a mix of six-digit hex and `oklch()` to exercise normalisation; and `acme-teams`, a
four-colour categorical palette declaring safety for deuteranopia only.

**Must be driven through.** Registration; appearing in `session.catalog.palettes()` beside the
built-ins, with the built-in array's identity preserved before anything registered; being found by
`paletteDescriptor` and filtered by `palettesOfKind`; being named in a colour binding and actually
painting a node the expected colour; the categorical path placing a value by indexing one anchor;
the sequential path interpolating between anchors, with the `oklch()` anchor normalised so the
middle of the ramp is not magenta; the capacity refusal (`E_CAP_EXCEEDED`) when the categorical
palette is asked for more groups than it has colours; anchors parsed once at registration, with a
bad anchor refused at the door with `E_BAD_COMMAND`; a contradicting `kind`/`capacity` refused with
`E_BAD_COMMAND`; a built-in id refused with `E_DUPLICATE_PLUGIN`; an unregistered palette name
refused at `styles.validate`/`styles.add`/`styles.encode` with `E_UNKNOWN_PALETTE` and a candidates
list; the legend reporting the right block kind, the palette's name, the reversal flag and the
right swatches; reversal by a binding; the missing-value policy leaving an unmeasured element
whatever the layers below it painted; a round trip through `toDocument`/`applyTemplate` carrying
the descriptor; and a saved document naming an unregistered palette refused with
`E_UNKNOWN_PALETTE`.

### `format-extension.test.ts` (the existing `data-source-extension.test.ts`, renamed and extended)

**The rename is part of the work.** The point is "File format", and the file now covers the
descriptor and detection halves as well as the reader.

**The dummy.** The existing forty-line reader class, plus a `static descriptor` and a
`static detect`, and a second reader registered under an extension the first also claims, so the
disambiguation tier has something to disambiguate.

**Already covered, keep passing.** Registration under a name; construction by name with the host's
options; appearing in the registered-type list; selection from the `data-source` attribute and
imperatively; loading from a `File` and a URL with an explicit format; chunked delivery with the
graph growing while the file is read; per-record schema validation; error aggregation and the
summary event; the completion event; a malformed file rejecting the awaited call and firing
`data-loading-error`.

**Added.** The descriptor reaching `session.catalog.formats()` and `formatDescriptor` and
`formatsForExtension`; detection from the extension with no format argument; detection from the
first bytes for an extensionless input; two formats claiming one extension disambiguated by
`detect`, with `detectFormats` returning both ranked; a plugin detector never stealing a file a
built-in claims; a detector that throws treated as "no"; publishing configurable options as
`OptionDescriptor[]` and having a bad option value refused with `E_OPTION_RANGE` and an unknown one
with `E_UNKNOWN_OPTION`; a parse failure arriving as `E_PARSE_FAILED` with the format and the line;
a fetch failure as `E_FETCH_FAILED`; an unknown format name as `E_UNKNOWN_FORMAT`; declaring the
direction the file states and having the graph counted as that kind; seeding node coordinates from
a `position` key; carrying an edge weight; producing records with `toAdHocData` and no cast;
registration refused for a missing `static type`, a missing descriptor, an id that disagrees with
`static type`, `canExport: true`, and a built-in format id.

### `camera-extension.test.ts` (new)

**The dummy.** Two views: `acme-corner`, valid in 3D only, which frames the bounding box from a
declared corner with a configurable padding option; and `acme-flat`, valid in both modes, which
returns an orthographic state in 2D and an arcRotate state in 3D from the same registration.

**Must be driven through.** Registration; appearing in `session.catalog.cameras()` and
`cameraDescriptor` and `camerasForMode`; being applied by name through the element's public API
and moving the camera to the computed state; computing a different state in 2D than in 3D from one
registration; being refused in a mode it does not declare, with `E_UNSUPPORTED` carrying the modes;
an unregistered name refused with `E_UNKNOWN_CAMERA` carrying `details.available`; being applied
with animation and easing and resolving when the animation completes; honouring cancellation
mid-animation by settling rather than rejecting; emitting `camera-state-changed` with the state it
computed; framing a named subset rather than the whole graph, with the bounds it was handed
covering only those elements; receiving its options resolved against the defaults its descriptor
declares, with a bad value refused by `E_OPTION_RANGE`; being usable as a screenshot's
`{ preset }`; `saveCameraPreset` refusing its id with `E_PROTECTED`; a built-in view id refused at
registration with `E_DUPLICATE_PLUGIN`; and the five built-in views still producing exactly the
states they produce today.

### `layout-extension.test.ts` (exists; extended)

**The dummy.** The two existing engines -- one live, one on `SimpleLayoutEngine` -- plus a
`static descriptor` on each, and a third registered only to exercise the refusals.

**Already covered, keep passing.** Being the engine the element lays out with once named; placing
every node where the element draws it; publishing into the element's position array; drawing every
edge between the two reported ends; being built with the consumer's options; reporting itself
settled and having the element stop stepping and announce it; receiving nodes and edges that
arrive later; being told about removals; holding a pinned node and releasing it; being disposed on
a layout switch; being told the drawing mode; the single-pass engine placing everything in one
pass; scaling by the consumer's factor.

**Added.** The descriptor reaching `session.catalog.layouts()` and `layoutDescriptor` and
`layoutIdForEngine`, with the built-in `LAYOUT_DESCRIPTORS` array unchanged; publishing options as
`OptionDescriptor[]` that a form could render, with an unknown option refused with
`E_UNKNOWN_OPTION` and an out-of-range one with `E_OPTION_RANGE`; keeping its options across a
2D/3D switch without setting `this.config`; being refused in more dimensions than its
`maxDimensions` with `E_UNSUPPORTED`; an unknown layout name reported as `E_UNKNOWN_LAYOUT` rather
than a `TypeError`; a failure thrown from the constructor and from `init()` arriving as a
`GraphtyError` and emitting the graph error event; the element calling `publishPositions` so an
engine that never calls it still fills `session.positions`; the declared optional protocol --
`dispose`, `removeNode`, `removeEdge` and an overridden `updatePositions` -- each being called by
name; being recommended by `recommendLayout` for a graph shape its descriptor fits; and
registration refused for a missing descriptor, an id that disagrees with `static type`, and a
built-in layout id.

### `algorithm-extension.test.ts` (exists; extended)

**The dummy.** The existing metric, rewritten to use `nodeMetricFields` instead of eleven
hand-written field descriptors and `ResultElementValues` instead of an inline re-declaration, plus
a second algorithm publishing a path shape so the edge half and the edge id helper are exercised.

**Already covered, keep passing.** Appearing in the catalogue; being offered as a metric with a
cost; being asked what it would cost; running by name and answering with its own numbers;
reporting progress; stopping when cancelled; reading the caller's option; having parameters
checked before work starts; the derived ranking, distribution, summary and plain-language reading;
carrying its caveats; painting from its result with no styling of its own; painting only what it
measured; publishing values a reader's own layer can select on; running through the older
namespace and type address; being re-runnable in place.

**Added.** Labels appearing in its ranking rows and its reading, read from the configured label
attribute -- the capability the seven built-in centralities have and the sixteen declared
algorithms do not; publishing per-edge values keyed by `edgeResultId`; receiving `scope`, `seed`,
`exact`, `sample` and `timeBox` on its run context, and honouring the scope so a run over a
selection measures only the selection; supplying its own `cost` function and having the estimator
use it, with `catalog.algorithms()` still surviving `JSON.stringify`; recording its
`static version` on the run's engine versions; being one member of a batch run sharing one progress
stream and one cancel; declaring options once as `OptionDescriptor[]` with no second vocabulary;
registration refused when `descriptor.key` disagrees with `static type`; a key already taken by a
built-in refused with `E_DUPLICATE_PLUGIN`; the identical class registered twice being a no-op; and
a result carrying no row for an element the algorithm has nothing to say about.

### `logging-extension.test.ts` (new)

**The dummy.** A collector sink registered two ways: directly as an object through
`GraphtyLogger.addSink`, and by name through `registerLogSink` plus a configuration that says
`{ use: "acme-collector", options: { ... } }`.

**Must be driven through.** Receiving every record the element emits, at every level, from every
category; receiving the full record -- timestamp, level, category, message, data and the `Error`
instance on error records; seeing TRACE as TRACE; receiving lazy values already resolved, and
producing them with the published `lazy`; being filtered by the global level and module settings;
narrowing further with its own `level` and `categories`; being added and removed at run time and
enumerated by `getSinks`; being attached declaratively at configure time without configure
resetting the level and modules; coexisting with other destinations, with a thrown `write` caught
so the others still receive the record; being unable to see another sink's mutation, because the
record is frozen; flushing on demand, with one rejecting flush not taking down the others;
`dispose` being called on removal; **being turned on by a name in a configuration rather than by a
live object reference**; appearing in `session.catalog.logSinks()`; a configuration naming an
unregistered sink refused with `E_UNKNOWN_SINK`; a duplicate name refused with
`E_DUPLICATE_PLUGIN` under `strict`; removing the console destination so element logs go only to
the collector; the element's own console line and the collector's line coming from one published
formatter; and logging under the plugin's own category reaching both the collector and the
console.

**One companion in the `default` project**, `test/logging/sink-extension.test.ts`: the same
collector attached through the published entry point with no element, no canvas and no renderer
anywhere, receiving a record. Logging's headline claim is that a destination works without a
renderer, and only a non-browser project can prove it.

## Deliberate limits and named follow-on work

Written down so a reader finds a decision rather than an absence.

| Limit | Why it is not in this design |
|---|---|
| An import cannot be cancelled | No built-in can be either; parity is vacuous. Threading a signal through `BaseDataSourceConfig` and `addDataFromSource` is its own change. |
| The File format point reads, it does not write | There is no writer seam to register into. `canExport: true` is refused so a "Save as" menu is never lied to. |
| An algorithm plugin cannot be unit-tested in Node | `Algorithm`'s constructor takes the renderer-backed `Graph`, as it does for every built-in. Needs a headless algorithm host. |
| Camera controllers stay internal | They cannot be published without Babylon.js in their signature, and six duck-typed branches decide their behaviour silently. |
| A plugin cannot claim the element's default palettes | Not withheld from a plugin -- not even a consumer choosing among built-ins can change them -- and changing them changes every saved document's meaning. |
| A log sink cannot take more than the global level allows | The built-in remote sink is behind the same gate, so parity holds. Widening changes what every existing sink sees. |
| Log records emitted before a sink is attached are not replayed | The built-in console loses them too. A named sink can now be configured before the element exists, which is the real fix. |
| A palette carried by a document is not scoped to that document | Requires a per-document palette lookup threaded through the repaint. Registration plus a self-describing document covers the parity clause. |
| A layout plugin cannot add an engine to an existing arrangement | The arrangement table is the element's editorial judgement about its own engines. |
| `StoredConfig` persists a sink by name, never a live object | An object reference cannot be serialised, which is exactly why the factory registry exists. |

Independent bugs found during this work, fixed alongside because they are cheap and each has a
single cause: `zoom-to-fit-complete` emitted but unsubscribable; the 2D camera controller built
twice with different `zoomMax`; `graph.startingCameraDistance` read by nothing; the built-in layout
engines leaking every removed node into their own lists forever; `applyTemplateLayout` existing
with no caller, so `graph.layout` in a saved document is inert for built-ins and plugins alike.

## As built: where the implementation differs from this design, and why

Recorded here rather than left for a reader to discover by diffing. Each of these was a decision
taken while building, and each is deliberate.

**`CameraViewInput` carries a `viewport`.** The block in decision 5 does not list one. The flat
framing is a pixels-per-world-unit ratio, so a view drawing in two dimensions needs the render
size and not only the aspect ratio. Added, and a view that ignores it is unaffected.

**`getCameraPresets()` lists registered views as well as this graph's snapshots.** The design says
it lists snapshots. It now returns every registered view under `{ builtin: true }` beside them,
for the same reason `saveCameraPreset` refuses a view's name: a consumer offering "camera presets"
in a menu has to see everything that name can resolve to, or it offers a list a reader's own
saved name is missing from.

**`src/camera/presets.ts` survives.** The design says it is deleted. It is now a 25-line module
that derives `BUILTIN_PRESETS` from `CAMERA_DESCRIPTORS`, so the root entry point keeps publishing
the name it always has. Nothing else is left in it.

**`resolveCameraPreset` asks the views before the saved snapshots.** The design does not say which
comes first. It has to be the views: `saveCameraPreset` refuses a name a view holds at the moment
of saving, which leaves one order of events open -- a snapshot saved on Monday, a plugin
registering that name on Tuesday -- and a built-in name is reserved from process start and can
never be shadowed that way. Asking the views first gives a registered view the same protection.

**The two live layout engines still call `publishPositions()` at the end of their own `step()`.**
The design says they stop, because `LayoutManager` now publishes after every step batch. They are
also driven DIRECTLY, with no manager, by `test/layout/layout-positions.test.ts`, which is what
pins that a simulation's coordinates reach the shared array at all. Removing the call would mean
deleting or rewriting those assertions to buy nothing but one fewer array copy per frame. The
design's actual requirement -- that an engine which never publishes still fills the array -- is met
by the manager and is pinned from the other side by the layout extension suite.

**`AdHocData` is published from `./schema`, and records are built with `DataSource.toRecord`.**
The design names `toAdHocData` and `toAdHocRecords` on `./extend`. The statics on `DataSource` do
the same job at the place an author is already looking, and `./extend` re-exports the `AdHocData`
type so a format author needs no second entry point for it.

**`AlgorithmGraphView` is an alias, not a narrowed interface.** The design describes "an
element-owned read interface over the input graph". A structural subset written by hand would
drift from what `algorithmGraph` actually returns, and the first method a plugin needed that the
subset omitted would be a bug report. It is published as a type-only alias, so a plugin names the
type without taking `@graphty/algorithms` as a dependency of its own.

**Logging has its own entry point.** The design says the registration verb goes on `./extend` and
nothing else. `./logging` now publishes the logger vocabulary -- `GraphtyLogger`, `LogLevel`,
`LogRecord`, `Sink`, the formatter, the stored configuration -- and `./extend` keeps
`registerLogSink` and the descriptor types. Two import lines for one extension point, which is
what every other point here already does.

### Still open

- **`E_CAP_EXCEEDED` is unobservable to a consumer.** `RepaintEngine.problems()` is wired onto
  `paint`, which `./session` does not publish, and `StyleChange` carries no problems. So "your
  categorical palette was over-subscribed" and "your selector matched nothing" are the same
  observation. Parity holds -- a built-in palette is no better off -- and the palette suite can
  only assert the consequence.
- **A screenshot cannot configure a plugin view.** `ScreenshotCapture` resolves
  `options.camera.preset` with no options and no scope, so a view that declares options finds them
  unreachable from the route that most obviously wants them. No built-in declares any, so nothing
  is lost today.
- **The one options mechanism is not yet one for the element's own readers.** No built-in
  `DataSource` calls `resolveOptions`, and `CSVDataSource` accepts `nodeFile`, `edgeFile`,
  `nodeURL` and `edgeURL` while `csvOptions` declares none of them. A registered format therefore
  goes through a stricter door than the built-ins: parity is inverted here rather than unmet.
- **`configure()` re-attaches a console the consumer detached.** `removeSink("console")` holds only
  until the next `configure`. The obvious fix -- a detach latch cleared by `addSink` -- breaks
  `test/logging/api/ProgrammaticAPI.test.ts`, whose teardown relies on the next `configure`
  rebuilding the console. Two green files disagree about the intent, so it is a decision rather
  than a defect to fix in passing.
- **`scope`, `seed`, `exact`, `sample` and `timeBox` still do not reach `compute`.** The run
  resolves all five and `AlgorithmManager` forwards only the signal, the progress channel and the
  yield -- to the element's own algorithms as much as to a plugin's.
