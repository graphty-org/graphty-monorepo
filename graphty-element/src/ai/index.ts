/**
 * AI Module - Natural language control interface for graphty-element.
 * @module ai
 */

// Status
export type { AiStage, AiState, AiStatus, StatusChangeCallback, ToolCallStatus, ToolCallStatusType } from "./AiStatus";
export { AiStatusManager } from "./AiStatus";

// Controller
export type {
    AiApprovalAnswer,
    AiApprovalsSetting,
    AiApprovalVerdict,
    AiCommandOptions,
    AiControllerOptions,
    AiEventEmitter,
    AiHistoryOptions,
    AiToolCallFacts,
    ExecutionResult,
} from "./AiController";
export { AiController } from "./AiController";

// Saved conversations, as an application reads them
export type {
    AiCallRecord,
    AiConversationMessage,
    AiConversationSnapshot,
    AiConversationSummary,
} from "./conversation/snapshot";

// Helpers, plans and their configuration errors
export type { AiAgentRole, AiAgentsSetting, AiPlan, AiRouter, AiTokenUsage } from "./agents";
export { MAX_AGENT_NAME_LENGTH, MAX_AGENT_PURPOSE_LENGTH, MAX_AGENTS, MAX_HELPERS_PER_TURN } from "./agents";
export { AiConfigError } from "./agents";

// Manager (Phase 3)
export type { AiManagerConfig, KeyPersistenceConfig } from "./AiManager";
export { AiManager, createAiManager } from "./AiManager";

/* eslint-disable @typescript-eslint/no-deprecated -- still published until the next major release for consumers that register the hand-written commands themselves */
// Commands
export {
    // Capture commands (Phase 7)
    captureScreenshot,
    captureVideo,
    // Style commands
    clearStyles,
    CommandRegistry,
    // Schema commands
    describeProperty,
    findAndStyleEdges,
    findAndStyleNodes,
    findNodes,
    // Algorithm commands
    listAlgorithms,
    // Query commands
    queryGraph,
    runAlgorithm,
    sampleData,
    // Camera commands
    setCameraPosition,
    setDimension,
    // Mode commands
    setImmersiveMode,
    // Layout commands
    setLayout,
    zoomToNodes,
} from "./commands";
/* eslint-enable @typescript-eslint/no-deprecated */
export type { CommandContext, CommandExample, CommandResult, GraphCommand } from "./commands/types";

// Providers
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
    WebLlmProviderOptions,
} from "./providers";
export {
    createProvider,
    // Async factory for WebLLM (Safari-compatible)
    createWebLlmProvider,
    // Async getter for WebLlmProvider class (Safari-compatible)
    getWebLlmProviderClass,
    MockLlmProvider,
    VercelAiProvider,
} from "./providers";

// Keys (Phase 7)
export type { ApiKeyManagerOptions, PassphrasePersistenceConfig, PersistenceConfig } from "./keys";
export { ApiKeyManager } from "./keys";

// Prompt Builder (Phase 3)
export type { SystemPromptOptions } from "./prompt/SystemPromptBuilder";
export { createSystemPromptBuilder, SystemPromptBuilder } from "./prompt/SystemPromptBuilder";

// Input Adapters (Phase 6)
export type { InputAdapter, InputCallback, InputOptions } from "./input";
export { TextInputAdapter, VoiceInputAdapter } from "./input";

// Schema Discovery (Phase 4-6)
export type {
    AttributeHistogramBin,
    NumericStatistics,
    PropertySummary,
    PropertyType,
    SchemaExtractorOptions,
    SchemaSummary,
} from "./schema";
export { formatSchemaForPrompt, SchemaExtractor, SchemaManager } from "./schema";
