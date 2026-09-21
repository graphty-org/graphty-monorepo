/**
 * @file `@graphty/graphty-element/ai`: the natural-language layer, behind its own entry point.
 *
 * ```js
 * import { createAiManager } from "@graphty/graphty-element/ai";
 * ```
 *
 * Asking a graph a question in English needs a provider, an API key store, a system prompt
 * built from the data's own schema, a tool-call loop and a command registry. That is a
 * substantial stack with substantial dependencies -- three LLM provider SDKs and an encrypted
 * key store -- and none of it is needed to draw a graph.
 *
 * So it lives here rather than in the root barrel: a consumer who never imports this module
 * never pays for any of it, and a bundler can see that from the import graph alone. The root
 * entry point carried all of it until 2.0, which meant every application that drew a graph
 * shipped three LLM SDKs whether or not it ever asked a question.
 *
 * This entry point needs a DOM, so it is not Node-safe. What a coding agent actually needs in
 * order to drive the element -- the list of algorithms, layouts, formats, palettes and scales,
 * with every option each accepts -- is published as plain JSON by
 * `@graphty/graphty-element/catalog`, which is.
 */

// AI Status
export type {
    AiStage,
    AiState,
    AiStatus,
    StatusChangeCallback,
    ToolCallStatus,
    ToolCallStatusType,
} from "./src/ai/index";
export { AiStatusManager } from "./src/ai/index";

// AI Controller
export type { AiControllerOptions, AiEventEmitter, ExecutionResult } from "./src/ai/index";
export { AiController } from "./src/ai/index";

// AI Manager
export type { AiManagerConfig, KeyPersistenceConfig } from "./src/ai/index";
export { AiManager, createAiManager } from "./src/ai/index";

// AI Commands
export type { CommandContext, CommandExample, CommandResult, GraphCommand } from "./src/ai/index";
export {
    captureScreenshot,
    captureVideo,
    clearStyles,
    CommandRegistry,
    describeProperty,
    findAndStyleEdges,
    findAndStyleNodes,
    findNodes,
    listAlgorithms,
    queryGraph,
    runAlgorithm,
    sampleData,
    setCameraPosition,
    setDimension,
    setImmersiveMode,
    setLayout,
    zoomToNodes,
} from "./src/ai/index";

// AI Providers
export type {
    LlmProvider,
    LlmResponse,
    Message,
    ProgressCallback,
    ProviderOptions,
    ProviderType,
    StreamCallbacks,
    ToolCall,
    ToolDefinition,
    VercelProviderType,
    WebLlmModelInfo,
} from "./src/ai/index";
export {
    createProvider,
    // Async factory for WebLLM (Safari-compatible, loads module on demand)
    createWebLlmProvider,
    // Async getter for WebLlmProvider class (Safari-compatible, loads module on demand)
    getWebLlmProviderClass,
    MockLlmProvider,
    VercelAiProvider,
} from "./src/ai/index";

// AI Key Management
export type { PersistenceConfig } from "./src/ai/index";
export { ApiKeyManager } from "./src/ai/index";

// AI Prompt Builder
export type { SystemPromptOptions } from "./src/ai/index";
export { createSystemPromptBuilder, SystemPromptBuilder } from "./src/ai/index";

// AI Input Adapters
export type { InputAdapter, InputCallback, InputOptions } from "./src/ai/index";
export { TextInputAdapter, VoiceInputAdapter } from "./src/ai/index";
export type { VoiceStartCallback } from "./src/ai/input/VoiceInputAdapter";

// AI Schema Discovery
export type {
    HistogramBin,
    NumericStatistics,
    PropertySummary,
    PropertyType,
    SchemaExtractorOptions,
    SchemaSummary,
} from "./src/ai/index";
export { formatSchemaForPrompt, SchemaExtractor, SchemaManager } from "./src/ai/index";
