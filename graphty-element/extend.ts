/**
 * @file `@graphty/graphty-element/extend`: the registration surface a third party writes against.
 *
 * ```js
 * import { LayoutEngine, registerPalette } from "@graphty/graphty-element/extend";
 * ```
 *
 * SIX THINGS CAN BE BROUGHT TO THE ELEMENT FROM OUTSIDE, and the list is closed: a palette, a
 * file format, a camera view, a layout, an algorithm and a log destination. Everything else that
 * looks registrable -- a scale, a node mesh shape, a lifecycle manager, a natural-language
 * command, a hardware accelerator -- is internal, and a consumer who finds one of those is not
 * promised it keeps working.
 *
 * THE RULE THE SIX ARE HELD TO: an extension must be able to do everything its built-in peer can.
 * It appears in `session.catalog` so a picker can offer it; it is addressable by the key a
 * consumer types and a saved document records; it reports progress and honours cancellation
 * wherever its built-in peer does; it is configured through the same options mechanism; it
 * reports failure as a `GraphtyError` carrying a code; and it can be written in TypeScript
 * against this entry point with no cast and no re-declaration of a type the element already has.
 *
 * TWO REGISTRATION SHAPES, and one question decides which applies: does the element construct
 * the thing?
 *
 * - IT DOES, so the extension is a CLASS registered through a static `register` on the base it
 *   extends -- an algorithm (`Algorithm.register`), a layout (`LayoutEngine.register`), a file
 *   format's reader (`DataSource.register`). An algorithm is built once per run, a layout once
 *   per `setLayout` and a reader once per load, so the element owns their lifetimes and a class
 *   is what lets it construct one.
 * - IT DOES NOT, so the extension is a VALUE the consumer constructs and registers through a free
 *   function here -- a palette (`registerPalette`), a camera view (`registerCameraView`), a log
 *   destination (`registerLogSink`). A palette has no code to run at all, a view is a pure
 *   function of a bounding box, and a sink is a destination the consumer already holds; wrapping
 *   any of those in a class would be a data carrier wearing a constructor.
 *
 * Registration is global and there is no unregister: a descriptor becomes public API the moment
 * something records it. Every registry ships a `clearRegistered<Kind>ForTesting()` so a suite can
 * leave the registries as it found them, named so nobody mistakes it for part of the contract.
 *
 * Node-safety is enforced by a test: `test/packaging/node-safe-entries.test.ts` resolves this
 * module's import graph and fails if Babylon.js, Lit or a DOM global appears in it. A plugin can
 * therefore be written, type-checked and published without a browser anywhere in the loop.
 */

// ---------------------------------------------------------------------------------------------
// Shared registration vocabulary: one duplicate policy, whichever point you register into
// ---------------------------------------------------------------------------------------------

export type { RegisterOptions } from "./src/catalog/pluginRegistry";

// ---------------------------------------------------------------------------------------------
// Options: one mechanism for all six points
// ---------------------------------------------------------------------------------------------

/*
 * AN EXTENSION DECLARES `readonly OptionDescriptor[]` AND THE ELEMENT VALIDATES AGAINST IT. One
 * declaration is what a form renders, what the catalogue publishes and what validation reads, so
 * the three cannot disagree -- which is what ended the algorithm double-declaration, where a
 * catalogue descriptor and a constructor schema said the same thing in two vocabularies that did
 * not correspond and nothing cross-checked them. `optionsFromZod` stays as a convenience for an
 * author who would rather write a Zod schema: it emits the descriptors, and the descriptors are
 * the contract.
 */
export type { OptionContext } from "./src/catalog/options";
export { resolveOptionValues } from "./src/catalog/options";
export type { OptionsFromZodOptions, OptionsSource, OptionUiMeta } from "./src/catalog/optionsFromZod";
export { optionsFromZod } from "./src/catalog/optionsFromZod";
export type { OptionBound, OptionChoice, OptionDescriptor, OptionType } from "./src/catalog/types";
export { isOptionType, OPTION_TYPES } from "./src/catalog/types";

// ---------------------------------------------------------------------------------------------
// Palette: a descriptor, registered as data
// ---------------------------------------------------------------------------------------------

/*
 * NOTHING IN THE ELEMENT EVER ASKS A PALETTE FOR BEHAVIOUR. The categorical index path, the
 * continuous interpolation, the step table, the over-subscription refusal, the legend and the
 * reversal flag are all implemented by code that reads six fields off a descriptor -- so the
 * descriptor is the whole unit. Anchors are normalised to six-digit hex at registration, so an
 * author may write `oklch(...)` or a CSS colour name and the renderer, the legend and a saved
 * document all read the same hexes.
 */
export { clearRegisteredPalettesForTesting, registeredPaletteDescriptors, registerPalette } from "./src/catalog/paletteRegistry";
export type { PaletteDescriptor, PaletteId } from "./src/catalog/types";
export { KNOWN_PALETTE_IDS } from "./src/catalog/types";

// ---------------------------------------------------------------------------------------------
// File format: a reader class carrying its own description
// ---------------------------------------------------------------------------------------------

/*
 * A FORMAT IS A CLASS WITH TWO STATICS: `type`, and `descriptor` -- plus an optional
 * `detect(sample)` content sniffer. `DataSource.register` files the class AND publishes the
 * descriptor, so one act is the only act: a descriptor filed without its reader would be a
 * catalogue entry a consumer can see, select, and then be told does not exist.
 *
 * Everything else is inherited and already works: fetching from a string, a `File` or a URL,
 * retries with backoff, chunking, per-record validation, error aggregation, and declaring the
 * direction the file states.
 */
export type { DetectionInput } from "./src/catalog/detect";
export { detectFormat, detectFormats } from "./src/catalog/detect";
export type { RegisteredFormat } from "./src/catalog/formatRegistry";
export { clearRegisteredFormatsForTesting, registeredFormatDescriptors } from "./src/catalog/formatRegistry";
export type { FormatDescriptor, FormatId } from "./src/catalog/types";
export { KNOWN_FORMAT_IDS } from "./src/catalog/types";
export type { AdHocData } from "./src/config/index";
export type { BaseDataSourceConfig, DataSourceChunk, DeclaredDirection } from "./src/data/DataSource";
export { DataSource } from "./src/data/DataSource";
export type { DataLoadingError, ErrorSummary } from "./src/data/ErrorAggregator";
export { ErrorAggregator } from "./src/data/ErrorAggregator";

// ---------------------------------------------------------------------------------------------
// Camera: a named view, computed from a bounding box
// ---------------------------------------------------------------------------------------------

/*
 * THE EXTENSION POINT IS THE VIEW, NOT THE CONTROLLER. A view decides where the viewer stands;
 * it is a pure function of a bounding box, and the element's animation, easing, queueing,
 * cancellation, state-changed event and screenshot framing are already built around naming one.
 * A camera CONTROLLER -- a Babylon camera plus an input model -- cannot be published without
 * Babylon types in its signature, so it stays internal.
 *
 * `bounds` is an input rather than something the view measures, which is what lets a view be
 * asked to frame a subset rather than the whole graph.
 */
export type { CameraState, CameraViewInput, CameraViewRegistration, DrawingMode, GraphBounds, Vec3 } from "./src/camera/types";
export { clearRegisteredCamerasForTesting, registerCameraView, registeredCameraDescriptors } from "./src/catalog/cameraRegistry";
export type { CameraDescriptor, CameraId } from "./src/catalog/types";
export { KNOWN_CAMERA_IDS } from "./src/catalog/types";

// ---------------------------------------------------------------------------------------------
// Layout: an engine the element steps, or an arrangement computed in one pass
// ---------------------------------------------------------------------------------------------

/*
 * `Node`, `Edge` and `NodeIdType` are published as TYPE-ONLY re-exports, which the emitter
 * erases, so a plugin's members can be typed without importing the renderer-laden root. Inside a
 * plugin's module `Node` shadows the DOM's `Node`, deliberately and normally: a second spelling
 * like `GraphNode` would be two names for one type, which is the drift this entry point exists
 * to remove.
 *
 * ONE KEY, NOT TWO: a layout's `descriptor.id` must equal its `static type`, so nothing is named
 * twice and `layoutIdForEngine` answers a plugin's own id.
 *
 * A plugin's `static descriptor` is an `AuthoredLayoutDescriptor`, which is the published
 * `LayoutDescriptor` minus `honoursWeights`. That one fact is declared on the class instead, as
 * `static honoursWeights`, and `LayoutEngine.register` copies it onto what the catalogue
 * publishes -- so whether an engine reads edge weights is written once, where it is true.
 */
export type { RegisteredLayout } from "./src/catalog/layoutRegistry";
export { clearRegisteredLayoutsForTesting, registeredLayoutDescriptors } from "./src/catalog/layoutRegistry";
export type { AuthoredLayoutDescriptor, LayoutDescriptor, LayoutId } from "./src/catalog/types";
export { KNOWN_LAYOUT_IDS } from "./src/catalog/types";
export type { Edge } from "./src/Edge";
export type { EdgePosition, LayoutEngineStatics, Position, SimpleLayoutConfigType, SimpleLayoutOpts } from "./src/layout/LayoutEngine";
export { LayoutEngine, SimpleLayoutConfig, SimpleLayoutEngine } from "./src/layout/LayoutEngine";
export type { Node, NodeIdType } from "./src/Node";

// ---------------------------------------------------------------------------------------------
// Algorithm: a class that computes something and publishes a result
// ---------------------------------------------------------------------------------------------

/*
 * `DeclaredAlgorithm` IS THE PUBLISHED BASE. `Algorithm` alone gets a class registered and
 * callable, and that was all it ever got: the run machinery resolves a key through the
 * catalogue, so a class the catalogue did not carry could not be started as a run, and
 * everything hanging off a run -- progress, cancellation, a cost estimate, a ranking, a summary,
 * a reading, the styling derived from a result's shape -- was out of reach. A `descriptor` on
 * the class is what puts it in the catalogue; `DeclaredAlgorithm` implements `publishResult`, so
 * a subclass returns a result instead of writing one.
 *
 * The field-spec builders and `metricField`/`nodeMetricFields` are published because the
 * alternative is hand-writing every field descriptor including its `results.$.<name>` path
 * string, which is a path format a plugin should never have to know.
 *
 * There is deliberately no edge-id helper here any more. An edge result is keyed by the element's
 * own `Edge.id`, which a plugin reads off the edge it is measuring; the pair string that used to
 * be published names a PAIR, and a pair cannot name one of two parallel edges.
 */
export type { AlgorithmStatics } from "./src/algorithms/Algorithm";
export { Algorithm } from "./src/algorithms/Algorithm";
export { metricField, nodeMetricFields } from "./src/algorithms/metrics/fields";
export { DeclaredAlgorithm } from "./src/algorithms/results/DeclaredAlgorithm";
export { communityFieldSpecs, LAYERED_GROUPING_FIELD_SPECS, metricFieldSpecs, PATH_FIELD_SPECS, setFieldSpecs } from "./src/algorithms/results/fields";
export type { AlgorithmOutput, AlgorithmRunContext, ResultFieldSpec } from "./src/algorithms/results/types";
export { declaredCaveats, forEachChunked } from "./src/algorithms/results/types";
export type { AlgorithmGraphMode, AlgorithmGraphView } from "./src/algorithms/utils/snapshotGraph";
export type { RegisteredAlgorithm } from "./src/catalog/registry";
export { clearRegisteredAlgorithmsForTesting, registeredAlgorithmDescriptors } from "./src/catalog/registry";
export type { AlgorithmDescriptor, AlgorithmKey, FieldDescriptor, ResultShape } from "./src/catalog/types";
export type { RunId } from "./src/catalog/types";
export type { ResultElementValues } from "./src/session/results/RunResult";
export { checkShapeContract } from "./src/session/results/types";
export type { Caveats, Progress } from "./src/session/runs/types";

/*
 * THE OLDER OPTION SCHEMA, KEPT FOR BACK-COMPAT AND DEPRECATED. It is a second vocabulary for the
 * same declaration -- `select`/`nodeId` where the catalogue says `enum`/`node-id` -- and its
 * failure type is a plain `Error` with no code, where the contract asks for a coded one. Declare
 * `descriptor.options` as `OptionDescriptor[]` and validate with `resolveOptionValues` instead.
 */
export type { OptionDefinition, OptionsFromSchema, OptionsSchema } from "./src/algorithms/types/OptionSchema";
export { defineOptionsSchema, OptionValidationError, resolveOptions, validateOption } from "./src/algorithms/types/OptionSchema";

// ---------------------------------------------------------------------------------------------
// Logging: a destination, as a live object or as a name a configuration can record
// ---------------------------------------------------------------------------------------------

/*
 * THE REGISTRATION HALF ONLY. `registerLogSink({ descriptor, create })` is what makes a third
 * party's destination reachable by a NAME rather than by holding a live JavaScript object: the
 * element's own remote destination is turned on by a string in a config object, so a settings
 * panel can record it and a stored configuration can bring it back, while an object reference has
 * no key, no config field and nothing a saved panel could write down.
 *
 * THE LOGGER'S OWN VOCABULARY IS AT `./logging`, NOT HERE. `GraphtyLogger`, `LogLevel`,
 * `LogRecord`, `Sink`, `formatLogRecord`, `lazy`, the two built-in destinations and the stored
 * configuration all live at one address. Publishing one symbol from two addresses is what that
 * split removes: a consumer reading two different import lines for `GraphtyLogger` has no way to
 * know they are the same object. Writing a destination therefore takes two import lines, exactly
 * as every other extension point here does -- its types from one entry point, the verb that
 * registers it from this one.
 */
export type { LogSinkRegistration } from "./src/catalog/logSinkRegistry";
export { clearRegisteredLogSinksForTesting, registeredLogSinkDescriptors, registerLogSink } from "./src/catalog/logSinkRegistry";
export type { LogSinkDescriptor, LogSinkId } from "./src/catalog/types";
export { KNOWN_LOG_SINK_IDS } from "./src/catalog/types";

// ---------------------------------------------------------------------------------------------
// How a plugin reports a failure
// ---------------------------------------------------------------------------------------------

export type { GraphtyErrorCode, GraphtyErrorInit, GraphtyErrorSource, GraphtyErrorTarget } from "./src/errors";
export { GraphtyError, isGraphtyError } from "./src/errors";

// ---------------------------------------------------------------------------------------------
// Acceleration: internal, and not one of the six. A factory, registered by name, called with the
// ceiling it must respect.
// ---------------------------------------------------------------------------------------------

export type {
    AccelerationPrecision,
    AcceleratorDeviceInfo,
    AcceleratorFactory,
    AcceleratorFactoryOptions,
    AcceleratorRegistration,
    GraphAccelerator,
    RegisterAcceleratorOptions,
} from "./src/acceleration";
export { AcceleratorRegistry, acceleratorRegistry, DEFAULT_ACCELERATOR_PRECISION, registerAccelerator } from "./src/acceleration";
