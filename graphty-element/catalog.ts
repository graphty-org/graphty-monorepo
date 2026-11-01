/**
 * @file `@graphty/graphty-element/catalog`: what the element can do, published as plain JSON.
 *
 * ```js
 * import { BUILT_IN_ALGORITHMS, LAYOUT_DESCRIPTORS } from "@graphty/graphty-element/catalog";
 * ```
 *
 * Every algorithm, layout, file format, palette, camera view, log destination and scale the
 * element offers is described here as data: a plain name, a technical name, what it computes,
 * what it costs and what it can be configured with. An options form, a metrics panel, a file
 * picker, a camera menu and a cost gate can all be built from these tables without importing a
 * class, a renderer or a 3D engine -- which is the point, because the alternative is an
 * application that hard-codes its own list and falls silently out of step the first time the
 * element gains or loses a capability.
 *
 * Option schemas cross this boundary as {@link OptionDescriptor}, never as Zod objects. Shipping
 * Zod across a package boundary makes the consumer's Zod version part of this package's API and
 * forces it to read Zod internals to recover a type, a default and a range.
 *
 * The descriptor barrel is re-exported wholesale on purpose: the catalogue module's own public
 * list is the single declaration of what a descriptor is, and restating it here would guarantee
 * the two drift. The tables are listed by name, because a table is a thing a consumer asks for
 * by name.
 *
 * Node-safety is enforced by a test: `test/packaging/node-safe-entries.test.ts` resolves this
 * module's import graph and fails if Babylon.js, Lit or a DOM global appears in it.
 */

import type { RuleTree, SelectionDirection } from "./src/catalog/types";

export * from "./src/catalog/index";

// ---------------------------------------------------------------------------------------------
// The tables
// ---------------------------------------------------------------------------------------------

export type {
    AiKeyShape,
    AiKeyShapeCheck,
    AiKeyShapeCode,
    AiModelDescriptor,
    AiProviderDescriptor,
    AiProviderId,
    AiResultCode,
    AiResultParams,
} from "./src/catalog/ai";
export {
    AI_PROVIDER_DESCRIPTORS,
    AI_PROVIDER_IDS,
    AI_RESULT_CODES,
    AI_STAGES,
    AI_STATES,
    AI_TOOL_CALL_STATUSES,
    aiProviderDescriptor,
    checkApiKeyShape,
} from "./src/catalog/ai";
export type { BuiltInAlgorithmDescriptor, LegacyAlgorithmKey, LegacyAlgorithmMapping } from "./src/catalog/algorithms";
export { algorithmByKey, algorithmByLegacyKey, BUILT_IN_ALGORITHMS } from "./src/catalog/algorithms";
export type { BasemapSourceDescriptor } from "./src/catalog/basemaps";
export { BASEMAP_SOURCE_DESCRIPTORS } from "./src/catalog/basemaps";
export { CAMERA_DESCRIPTORS, cameraDescriptor, camerasForMode } from "./src/catalog/cameras";
export type { DetectionInput } from "./src/catalog/detect";
export { detectFormat, detectFormats } from "./src/catalog/detect";
export type {
    AssetKind,
    BuiltInModelFormat,
    ModelDetection,
    ModelDetectionInput,
    ModelFormat,
} from "./src/catalog/detectModel";
export { detectAssetKind, detectModelFormat } from "./src/catalog/detectModel";
export type { UnservedFormat } from "./src/catalog/formats";
export { FORMAT_DESCRIPTORS, formatDescriptor, formatsForExtension, UNSERVED_FORMAT_IDS } from "./src/catalog/formats";
export type {
    LayoutCatalogEntry,
    LayoutImplementation,
    LayoutImplementationCode,
    UnservedLayout,
} from "./src/catalog/layouts";
export {
    LAYOUT_CATALOG,
    LAYOUT_DESCRIPTORS,
    layoutDescriptor,
    layoutEntry,
    layoutIdForEngine,
    UNSERVED_LAYOUT_IDS,
} from "./src/catalog/layouts";
export { listGraphs } from "./src/catalog/listGraphs";
export { LOG_SINK_DESCRIPTORS, logSinkDescriptor } from "./src/catalog/logSinks";
// The sample 3D models a style layer names in `node.model` ("asset:sample/server") without adding
// a file, the same list `session.catalog.models()` returns, each with a thumbnail picture.
export type { ModelDescriptor } from "./src/catalog/models";
export { MODEL_DESCRIPTORS } from "./src/catalog/models";
export { PALETTE_DESCRIPTORS, paletteDescriptor, palettesOfKind } from "./src/catalog/palettes";
export { SCALE_DESCRIPTORS, scaleDescriptor, scalesForDomain } from "./src/catalog/scales";
// Shaders as catalog data: targets and places, the descriptor `session.catalog.shaders()` lists,
// the uses a layer lists, the channels a shader covers, the shader text format read and written
// with no DOM, and a working template for each place.
export type { ScreenshotPreset, ScreenshotPresetId } from "./src/catalog/screenshotPresets";
export { SCREENSHOT_PRESET_DESCRIPTORS } from "./src/catalog/screenshotPresets";
export type {
    ShaderClock,
    ShaderClockBinding,
    ShaderCost,
    ShaderDescriptor,
    ShaderGlyph,
    ShaderInput,
    ShaderMotion,
    ShaderMotionInput,
    ShaderOrigin,
    ShaderParamChoice,
    ShaderParamDescriptor,
    ShaderParams,
    ShaderParamValue,
    ShaderPlace,
    ShaderPreview,
    ShaderProblem,
    ShaderProblemCode,
    ShaderRegistration,
    ShaderRequirement,
    ShaderSource,
    ShaderTarget,
    ShaderText,
    ShaderTextResult,
    ShaderUse,
    ShaderWebGpu,
} from "./src/catalog/shaders";
export { shaderAnimates, shaderCovers } from "./src/catalog/shaders";
export { shaderTemplate, type ShaderTemplatePlace } from "./src/catalog/shaderTemplate";
export { formatShaderText, parseShaderText, type ShaderTextOptions } from "./src/catalog/shaderText";
export { sourceDescriptors } from "./src/catalog/sources";
export type { ShaderParamAddress } from "./src/catalog/types";
export type { CodedFact, CodedFactParam } from "./src/session/shared";
export type { SourceCatalogEntry, SourceFeatures } from "./src/session/sources/types";
export type { TransitionDescriptor, TransitionDrawable } from "./src/transitions/registry";
export type { SourceInfo } from "@graphty/graph-io";
export type { GraphListing } from "@graphty/graph-io";

// The sample datasets `session.data.loadDataset` downloads and the graph generators
// `session.data.generate` runs, the same lists `session.catalog.datasets()` and
// `session.catalog.generators()` return, for a page that lists them before any graph exists.
// `DEFAULT_DATASET_BASE_URL` is where a dataset's file and its `thumbnail` picture are read from
// when `loadDataset` is given no `baseUrl`.
export type { DatasetMeta, GeneratorDescriptor, GeneratorParamDescriptor } from "@graphty/graph-samples";
export {
    DATASETS as DATASET_DESCRIPTORS,
    DEFAULT_DATASET_BASE_URL,
    GENERATOR_CATALOG as GENERATOR_DESCRIPTORS,
} from "@graphty/graph-samples";
export type { GeneratorParams } from "@graphty/graph-samples/generators";

// The style channels a layer can paint, described as data: the plain name, the kind of value
// each accepts, its enum values or numeric bounds, where it lands in a parsed style, and whether
// the renderer draws it. A style inspector reads these the way a picker reads the tables above,
// instead of copying the facts into the application where they drift the first time a channel's
// bounds or values change. `CHANNEL_DESCRIPTORS` is defined beside the channel value types in
// `src/session/styles/channels.ts`; it is plain data and carries no renderer.
export type {
    ChannelCaveatCode,
    ChannelDescriptor,
    ChannelGroup,
    ChannelValueKind,
} from "./src/session/styles/channels";
export { CHANNEL_DESCRIPTORS, channelDescriptor, CHANNELS, channelsFor } from "./src/session/styles/channels";
// What a shader parameter declared `varies` is bound as, by its encode address: the descriptor an
// editor's vary picker and `styles.proposeEncoding` read for it.
export { shaderParamChannel } from "./src/session/styles/encoding";
// The one color reader a channel uses: a hex string, any CSS color the element understands, or
// Rgba components in, a clamped and rounded color with its `#rrggbb[aa]` hex out (null when the
// value is not a color). A color control reads a layer's value through this rather than
// building hex by hand.
export type { ColorValue } from "./src/session/styles/channels";
export { toColorValue } from "./src/session/styles/channels";

// ---------------------------------------------------------------------------------------------
// Sets: what a kept set holds, and the one validator for it
//
// `parseSetDefinition` checks any value -- from a form, a file or an assistant -- and returns the
// canonical definition, or refuses it with `E_BAD_COMMAND`. `parseScope` does the same for a scope,
// which may carry a definition inline. Neither reaches a graph.
// ---------------------------------------------------------------------------------------------

export { parseScope, parseSetDefinition } from "./src/catalog/sets/parse";
export type {
    AttributeLeafNodes,
    BySizeLeaf,
    EdgeMember,
    EdgeReading,
    EdgeRef,
    HopsLeaf,
    ItemKey,
    MeasureLeaf,
    MeasureTest,
    MissingValues,
    NonemptyLeaf,
    PathKind,
    ResultId,
    ResultItem,
    RuleSide,
    RuleTree,
    SameValueLeaf,
    Scope,
    ScopeId,
    ScopeInput,
    SelectionDirection,
    SetCombine,
    SetCreatedFrom,
    SetDefinition,
    SetDefinitionInput,
    SetId,
    SetOperand,
    SourceKey,
    StepReference,
    TextMatchMode,
    TopTies,
    TouchingLeaf,
    UnionBranch,
    UnionLeaf,
    UnionStep,
} from "./src/catalog/types";

/**
 * A rule tree: what the visibility filter keeps.
 * @deprecated Use {@link RuleTree}, the same type under the name the rule grammar uses: a rule
 * tree is also what a rule set holds, not only what the visibility filter keeps. Removed in the
 * major version that ships the project file.
 */
export type Filter = RuleTree;

/**
 * Which arcs a degree filter counts.
 * @deprecated Use {@link SelectionDirection}, the same type under the name the rule grammar uses.
 * Removed in the major version that ships the project file.
 */
export type FilterDirection = SelectionDirection;
