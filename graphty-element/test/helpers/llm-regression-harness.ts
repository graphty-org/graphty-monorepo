/**
 * LLM Regression Test Harness
 * @module test/helpers/llm-regression-harness
 *
 * Core harness class for running LLM regression tests.
 * Sends prompts to real LLM providers and captures tool calls for verification.
 */

import { Color3 } from "@babylonjs/core";
import { APICallError, RetryError } from "ai";

import { AiController } from "../../src/ai/AiController";
import { CommandRegistry } from "../../src/ai/commands";
import { BUILTIN_COMMANDS } from "../../src/ai/commands/builtin";
import type { CommandResult } from "../../src/ai/commands/types";
import type { ToolCall } from "../../src/ai/providers/types";
import { VercelAiProvider } from "../../src/ai/providers/VercelAiProvider";
import { SchemaManager } from "../../src/ai/schema";
import type { Graph } from "../../src/Graph";
import {
    getLlmRegressionApiKey,
    getLlmRegressionKeyVariable,
    getLlmRegressionModel,
    getLlmRegressionProvider,
} from "./llm-regression-env";
import { createMockGraphContext } from "./mock-graph-context";

/**
 * Test graph fixture interface
 */
export interface TestGraphFixture {
    nodes: { id: string; data: Record<string, unknown> }[];
    edges: { source: string; target: string; data: Record<string, unknown> }[];
}

/**
 * Result of a single LLM regression test
 */
export interface LlmRegressionResult {
    /** The original prompt sent to the LLM */
    prompt: string;
    /** Whether a tool was called */
    toolWasCalled: boolean;
    /**
     * Every tool call the model made for this prompt, across every turn, in order. The element
     * hands each tool's result back to the model, so a model may look first (findNodes) and act
     * after (zoomToNodes).
     */
    toolCalls: CapturedToolCall[];
    /** Name of the LAST tool the model called: the action it ended on (or null if no tool call) */
    toolName: string | null;
    /** Parameters of that last call (or null if no tool call) */
    toolParams: Record<string, unknown> | null;
    /** Result of executing the command (or null if no tool call or execution failed) */
    commandResult: CommandResult | null;
    /** Text response from the LLM (if any) */
    llmText: string | null;
    /** Time taken to get the LLM response in milliseconds */
    latencyMs: number;
    /** Token usage from the LLM response */
    tokenUsage?: { prompt: number; completion: number };
}

/**
 * Expected test outcomes for flexible matching
 */
export interface TestExpectations {
    /** Expected tool name (can be single tool or array of acceptable tools) */
    expectedTool?: string | string[];
    /** Expected parameters (partial matching) */
    expectedParams?: Record<string, unknown>;
    /** Custom validation function */
    validate?: (result: LlmRegressionResult) => boolean;
}

/**
 * Options for retry behavior when API calls fail
 */
export interface RetryOptions {
    /** Maximum number of retry attempts (default: 2) */
    maxRetries?: number;
    /** Delay between retry attempts in milliseconds (default: 1000) */
    retryDelayMs?: number;
    /** Custom function to determine if an error should trigger a retry */
    retryOn?: (error: Error) => boolean;
}

/**
 * The words a failed run prints when the provider refused the ACCOUNT -- a bad or revoked key, or
 * no credit or quota left -- rather than the request. The release job looks for them: such a
 * failure is the owner's to fix (fund the account, replace the key), not a code defect.
 */
export const ACCOUNT_REFUSED_MARKER = "[llm-regression] provider refused the account";

/**
 * Why the provider refused the account behind a request, or null when it refused only the request.
 * @param error - What the request failed with.
 * @returns A short reason, such as "HTTP 401", or null.
 */
export function accountRefusalOf(error: unknown): string | null {
    const last = RetryError.isInstance(error) ? error.lastError : error;
    const cause = last instanceof Error && !APICallError.isInstance(last) ? last.cause : last;
    if (!APICallError.isInstance(cause)) {
        return null;
    }

    const status = cause.statusCode;
    if (status === 401 || status === 403) {
        return `HTTP ${status}`;
    }

    // Anthropic answers an empty balance with 400 ("credit balance is too low"), OpenAI with 429
    // insufficient_quota, Google with 429 RESOURCE_EXHAUSTED on a billing quota.
    const text = `${cause.message} ${cause.responseBody ?? ""}`.toLowerCase();
    if (/credit balance|insufficient_quota|no credits|billing|exceeded your current quota/.test(text)) {
        return `HTTP ${status ?? "?"}, out of credit or quota`;
    }

    return null;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "retryOn">> = {
    maxRetries: 2,
    retryDelayMs: 1000,
};

/**
 * Options for creating the LLM regression test harness
 */
export interface LlmRegressionTestHarnessOptions {
    /** Test graph fixture data */
    graphData?: TestGraphFixture;
    /** Model to use (defaults to VITE_LLM_REGRESSION_MODEL, else the provider's default) */
    model?: string;
    /** Temperature setting (defaults to 0 for determinism) */
    temperature?: number;
}

/**
 * Captured tool call information from the provider
 */
export interface CapturedToolCall {
    name: string;
    arguments: Record<string, unknown>;
}

/**
 * Custom provider wrapper that captures tool calls before execution
 */
class ToolCallCapturingProvider extends VercelAiProvider {
    capturedToolCalls: CapturedToolCall[] = [];
    capturedTokenUsage?: { prompt: number; completion: number };

    async generate(
        messages: Parameters<VercelAiProvider["generate"]>[0],
        tools: Parameters<VercelAiProvider["generate"]>[1],
        options?: Parameters<VercelAiProvider["generate"]>[2],
    ): ReturnType<VercelAiProvider["generate"]> {
        // Counted per test file and printed by setup.ts, so a run reports what it cost.
        const counter = globalThis as { __LLM_REGRESSION_API_CALLS__?: number };
        counter.__LLM_REGRESSION_API_CALLS__ = (counter.__LLM_REGRESSION_API_CALLS__ ?? 0) + 1;
        const result = await super.generate(messages, tools, options);

        // Every turn's tool calls, in order: one prompt may ask the model several times.
        this.capturedToolCalls.push(
            ...result.toolCalls.map((tc: ToolCall) => ({
                name: tc.name,
                arguments: tc.arguments,
            })),
        );

        // Token usage, summed over the prompt's turns
        if (result.usage) {
            this.capturedTokenUsage = {
                prompt: (this.capturedTokenUsage?.prompt ?? 0) + result.usage.promptTokens,
                completion: (this.capturedTokenUsage?.completion ?? 0) + result.usage.completionTokens,
            };
        }

        return result;
    }

    clearCaptured(): void {
        this.capturedToolCalls = [];
        this.capturedTokenUsage = undefined;
    }
}

/**
 * LLM Regression Test Harness
 *
 * Provides infrastructure for testing real LLM tool calling behavior.
 * Sends prompts to the selected provider's API and verifies correct tools are called.
 */
export class LlmRegressionTestHarness {
    private controller: AiController;
    private provider: ToolCallCapturingProvider;
    private graph: Graph;
    private disposed = false;

    private constructor(controller: AiController, provider: ToolCallCapturingProvider, graph: Graph) {
        this.controller = controller;
        this.provider = provider;
        this.graph = graph;
    }

    /**
     * Create a new harness instance.
     * @param options - Configuration options
     * @returns Promise resolving to the harness instance
     * @throws Error if API key is not available
     */
    static create(options: LlmRegressionTestHarnessOptions = {}): Promise<LlmRegressionTestHarness> {
        const apiKey = getLlmRegressionApiKey();
        if (!apiKey) {
            throw new Error(
                `${getLlmRegressionKeyVariable()} environment variable is required for LLM regression tests`,
            );
        }

        // The provider VITE_LLM_REGRESSION_PROVIDER names (anthropic by default)
        const provider = new ToolCallCapturingProvider(getLlmRegressionProvider());
        provider.configure({
            apiKey,
            model: options.model ?? getLlmRegressionModel(),
            temperature: options.temperature ?? 0,
        });

        // Create graph from fixture or default
        const graph = LlmRegressionTestHarness.createGraphFromFixture(options.graphData);

        // What AiManager hands the model, built the way AiManager builds it: its built-in
        // commands and the schema summary it adds to the system prompt. AiManager itself is not
        // used because it loads the browser-only key store, and this project runs in Node.
        const commandRegistry = new CommandRegistry();
        for (const command of BUILTIN_COMMANDS) {
            commandRegistry.register(command);
        }

        const schemaManager = new SchemaManager(graph);
        schemaManager.extract();
        const controller = new AiController({ provider, commandRegistry, graph, schemaManager });

        return Promise.resolve(new LlmRegressionTestHarness(controller, provider, graph));
    }

    /**
     * Create a mock graph from a test fixture. It is the mock every AI command test uses, so the
     * commands the model picks run against a real session, style stack, layout and camera
     * rather than failing on a graph that has none.
     */
    private static createGraphFromFixture(fixture?: TestGraphFixture): Graph {
        // The AI unit tests' mock graph: it has the session the controller runs each message in.
        if (!fixture) {
            return createMockGraphContext({
                nodeCount: 5,
                edgeCount: 4,
                nodeData: (i) => ({ type: i % 2 === 0 ? "server" : "database", name: `node-${i}`, status: "online" }),
                edgeData: () => ({ weight: 1.0 }),
            });
        }

        return createMockGraphContext({
            nodeCount: fixture.nodes.length,
            edgeCount: fixture.edges.length,
            nodeData: (i) => fixture.nodes[i].data,
            edgeData: (i) => fixture.edges[i].data,
        });
    }

    /**
     * Test a prompt and capture the results.
     * @param prompt - The natural language prompt to send
     * @param expectations - Optional expectations for validation
     * @param retryOptions - Optional retry configuration for handling transient errors
     * @returns Promise resolving to the test result
     */
    async testPrompt(
        prompt: string,
        expectations?: TestExpectations,
        retryOptions?: RetryOptions,
    ): Promise<LlmRegressionResult> {
        if (this.disposed) {
            throw new Error("Harness has been disposed");
        }

        const maxRetries = retryOptions?.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries;
        const retryDelayMs = retryOptions?.retryDelayMs ?? DEFAULT_RETRY_OPTIONS.retryDelayMs;
        const shouldRetry = retryOptions?.retryOn ?? this.defaultRetryCondition;
        const startTime = Date.now();

        for (let attempt = 0; ; attempt++) {
            this.provider.clearCaptured();
            const executionResult = await this.controller.execute(prompt);

            // The controller never throws: a message that failed outside its tools -- the API
            // refused the request, or the graph could not open the message's transaction --
            // comes back as an unsuccessful result and is kept as the controller's last error.
            // A test reading only `toolWasCalled` would see "no tool was called" and nothing
            // else, so such a failure throws here with its real cause. A tool that failed is
            // NOT this: it is part of what the model did, and stays in `commandResult`.
            const failure = this.controller.getLastError();
            if (failure) {
                const refusal = accountRefusalOf(failure);
                if (refusal !== null) {
                    // Retrying cannot help, and the message carries the marker the release job reads.
                    throw new Error(`${ACCOUNT_REFUSED_MARKER} (${refusal}): ${failure.message}`, { cause: failure });
                }

                if (attempt < maxRetries && shouldRetry(failure)) {
                    await this.delay(retryDelayMs);
                    continue;
                }

                throw new Error(`LLM regression request failed before any tool ran: ${failure.message}`, {
                    cause: failure,
                });
            }

            const toolCalls = [...this.provider.capturedToolCalls];
            const lastToolCall = toolCalls.at(-1) ?? null;
            const result: LlmRegressionResult = {
                prompt,
                toolWasCalled: toolCalls.length > 0,
                toolCalls,
                toolName: lastToolCall?.name ?? null,
                toolParams: lastToolCall?.arguments ?? null,
                commandResult: {
                    success: executionResult.success,
                    message: executionResult.message,
                    data: executionResult.data,
                    affectedNodes: executionResult.affectedNodes,
                    affectedEdges: executionResult.affectedEdges,
                },
                llmText: executionResult.llmText ?? null,
                latencyMs: Date.now() - startTime,
                tokenUsage: this.provider.capturedTokenUsage,
            };

            if (expectations) {
                this.validateExpectations(result, expectations);
            }

            return result;
        }
    }

    /**
     * Default retry condition - retries on rate limit and transient errors.
     */
    private defaultRetryCondition(error: Error): boolean {
        const message = error.message.toLowerCase();
        return (
            message.includes("rate") ||
            message.includes("429") ||
            message.includes("503") ||
            message.includes("timeout") ||
            message.includes("econnreset")
        );
    }

    /**
     * Delay helper for retry logic.
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Validate result against expectations.
     * Throws an error if expectations are not met.
     */
    private validateExpectations(result: LlmRegressionResult, expectations: TestExpectations): void {
        // Check expected tool
        if (expectations.expectedTool !== undefined) {
            const expectedTools = Array.isArray(expectations.expectedTool)
                ? expectations.expectedTool
                : [expectations.expectedTool];

            const call = assertCalled(result, expectedTools);

            // Check expected params (partial match) on that call
            for (const [key, value] of Object.entries(expectations.expectedParams ?? {})) {
                if (call.arguments[key] !== value) {
                    throw new Error(
                        `Expected param "${key}" to be ${JSON.stringify(value)} but got ${JSON.stringify(call.arguments[key])}`,
                    );
                }
            }
        }

        // Run custom validation
        if (expectations.validate !== undefined) {
            if (!expectations.validate(result)) {
                throw new Error("Custom validation failed");
            }
        }
    }

    /**
     * Get the current graph instance.
     */
    getGraph(): Graph {
        return this.graph;
    }

    /**
     * Dispose the harness and clean up resources.
     */
    dispose(): void {
        if (!this.disposed) {
            this.controller.dispose();
            this.disposed = true;
        }
    }
}

/**
 * The model's first call to a tool, asserting there is one. The model may look before it acts
 * and look again after, so a test asks whether the tool it is about was called, not whether it
 * was called first or last.
 * @param result - The prompt's result.
 * @param name - The tool, or the tools any one of which is acceptable.
 * @returns The first call to it.
 */
export function assertCalled(result: LlmRegressionResult, name: string | readonly string[]): CapturedToolCall {
    const names = typeof name === "string" ? [name] : name;
    const call = result.toolCalls.find((candidate) => names.includes(candidate.name));
    if (!call) {
        const made = result.toolCalls.map((candidate) => candidate.name).join(", ") || "none";
        throw new Error(`Expected a call to ${names.join(" or ")}; the model called: ${made}`);
    }

    return call;
}

/**
 * Named CSS colors mapping to their hex values.
 * Used for color normalization in isColorMatch.
 */
const CSS_COLOR_NAMES: Record<string, string> = {
    red: "#ff0000",
    green: "#00ff00",
    blue: "#0000ff",
    yellow: "#ffff00",
    orange: "#ffa500",
    purple: "#800080",
    pink: "#ffc0cb",
    black: "#000000",
    white: "#ffffff",
    gray: "#808080",
    grey: "#808080",
    cyan: "#00ffff",
    magenta: "#ff00ff",
    brown: "#a52a2a",
    lime: "#00ff00",
    navy: "#000080",
    teal: "#008080",
    aqua: "#00ffff",
    maroon: "#800000",
    olive: "#808000",
    silver: "#c0c0c0",
    fuchsia: "#ff00ff",
    crimson: "#dc143c",
    coral: "#ff7f50",
    gold: "#ffd700",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    salmon: "#fa8072",
    tomato: "#ff6347",
    turquoise: "#40e0d0",
    violet: "#ee82ee",
    indigo: "#4b0082",
};

/**
 * Normalize a color value to hex format for comparison.
 * Handles hex colors, CSS color names, and rgb/rgba values.
 *
 * @param color - The color value to normalize
 * @returns Normalized hex color in lowercase (e.g., "#ff0000") or null if invalid
 */
function normalizeColor(color: string): string | null {
    const trimmed = color.trim().toLowerCase();

    // Already hex format
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
        return trimmed.toLowerCase();
    }

    // Short hex format - expand to full
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
        const r = trimmed[1];
        const g = trimmed[2];
        const b = trimmed[3];
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    // Named color
    if (CSS_COLOR_NAMES[trimmed]) {
        return CSS_COLOR_NAMES[trimmed];
    }

    // Try to parse using Babylon.js Color3 (handles various formats)
    try {
        const color3 = Color3.FromHexString(trimmed);
        return color3.toHexString().toLowerCase();
    } catch {
        // Ignore parsing errors
    }

    // Try rgb/rgba format
    const rgbRegex = /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;
    const rgbMatch = rgbRegex.exec(trimmed);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, "0");
        const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, "0");
        const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, "0");
        return `#${r}${g}${b}`;
    }

    return null;
}

/**
 * Check if two color values match, normalizing both to hex format.
 * Handles hex colors (#RGB, #RRGGBB), CSS color names, and rgb() values.
 *
 * @param actual - The actual color value from the LLM
 * @param expected - The expected color value (e.g., "red", "#ff0000")
 * @returns True if the colors match after normalization
 *
 * @example
 * isColorMatch("#FF0000", "red") // true
 * isColorMatch("rgb(255, 0, 0)", "#ff0000") // true
 * isColorMatch("#f00", "#FF0000") // true
 */
export function isColorMatch(actual: unknown, expected: string): boolean {
    if (typeof actual !== "string") {
        return false;
    }

    const normalizedActual = normalizeColor(actual);
    const normalizedExpected = normalizeColor(expected);

    if (!normalizedActual || !normalizedExpected) {
        return false;
    }

    return normalizedActual === normalizedExpected;
}

/**
 * Check if an object includes all expected parameters (partial matching).
 * Performs deep comparison for nested objects.
 *
 * @param actual - The actual parameters from the LLM response
 * @param expected - The expected parameters to match
 * @returns True if actual includes all expected key-value pairs
 *
 * @example
 * includesParams({a: 1, b: 2, c: 3}, {a: 1, b: 2}) // true
 * includesParams({style: {color: "red"}}, {style: {color: "red"}}) // true
 * includesParams({a: 1}, {a: 2}) // false
 */
export function includesParams(
    actual: Record<string, unknown> | null | undefined,
    expected: Partial<Record<string, unknown>>,
): boolean {
    if (!actual) {
        return false;
    }

    for (const [key, expectedValue] of Object.entries(expected)) {
        const actualValue = actual[key];

        if (expectedValue === undefined) {
            continue;
        }

        if (actualValue === undefined) {
            return false;
        }

        // Handle nested objects
        if (
            typeof expectedValue === "object" &&
            expectedValue !== null &&
            typeof actualValue === "object" &&
            actualValue !== null
        ) {
            if (!includesParams(actualValue as Record<string, unknown>, expectedValue)) {
                return false;
            }

            continue;
        }

        // Direct comparison
        if (actualValue !== expectedValue) {
            return false;
        }
    }

    return true;
}
