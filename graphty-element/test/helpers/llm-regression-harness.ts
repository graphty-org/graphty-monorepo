/**
 * LLM Regression Test Harness
 * @module test/helpers/llm-regression-harness
 *
 * Core harness class for running LLM regression tests.
 * Sends prompts to real LLM providers and captures tool calls for verification.
 */

import { appendFileSync } from "node:fs";
import { basename } from "node:path";

import { Color3 } from "@babylonjs/core";
import { assert, expect } from "vitest";

import type { GraphSession } from "../../session";
import {
    type AiApprovalAnswer,
    AiController,
    type AiControllerOptions,
    type ExecutionResult,
} from "../../src/ai/AiController";
import { CommandRegistry } from "../../src/ai/commands";
import type { CommandResult } from "../../src/ai/commands/types";
import { ENGINE_OVERRIDE, engineFor } from "../../src/ai/engine/load";
import type { AiEngine, EngineCapabilities, EngineOutcome, TurnEvent, TurnRequest } from "../../src/ai/engine/types";
import { VercelAiProvider } from "../../src/ai/providers/VercelAiProvider";
import { installAssistantTools } from "../../src/ai/tools/install";
import type { AiResultCode, AiResultParams } from "../../src/catalog/ai";
import type { Graph } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assistantSession } from "./assistant";
import {
    getLlmRegressionApiKey,
    getLlmRegressionKeyVariable,
    getLlmRegressionModel,
    getLlmRegressionProvider,
} from "./llm-regression-env";

/** What only a renderer does, answered as one would: the camera, a capture, XR. */
export const STAND_IN_RENDERER = {
    applyCameraView: (): Promise<void> => Promise.resolve(),
    getCameraState: () => ({ position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } }),
    captureScreenshot: () =>
        Promise.resolve({ blob: new Blob(["png"]), metadata: { width: 800, height: 600, format: "png", byteSize: 3 } }),
    captureAnimation: () =>
        Promise.resolve({
            blob: new Blob(["webm"]),
            metadata: { width: 800, height: 600, format: "webm", duration: 1000 },
        }),
    cancelAnimationCapture: (): boolean => false,
    isVRSupported: (): Promise<boolean> => Promise.resolve(false),
    isARSupported: (): Promise<boolean> => Promise.resolve(false),
};

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
    /** The model turns the message took. */
    turns?: number;
    /** The message's last request to the model: the whole conversation, every tool result in it. */
    lastRequest?: TurnRequest | null;
    /** The message's result code. */
    code?: string;
    /** The facts behind the code (the approval request of a held message). */
    params?: ExecutionResult["params"];
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
 * A message that failed outside its tools, as the element reports it: its result code and facts,
 * and the cleaned error's message.
 */
export interface RequestFailure {
    code?: AiResultCode;
    params?: AiResultParams;
    message: string;
}

/**
 * Options for retry behavior when API calls fail
 */
export interface RetryOptions {
    /** Maximum number of retry attempts (default: 2) */
    maxRetries?: number;
    /** Delay between retry attempts in milliseconds (default: 1000) */
    retryDelayMs?: number;
    /** Custom function to determine if a failure should trigger a retry */
    retryOn?: (failure: RequestFailure) => boolean;
}

/**
 * The words a failed run prints when the provider refused the ACCOUNT -- a bad or revoked key, or
 * no credit or quota left -- rather than the request. The release job looks for them: such a
 * failure is the owner's to fix (fund the account, replace the key), not a code defect.
 */
export const ACCOUNT_REFUSED_MARKER = "[llm-regression] provider refused the account";

/**
 * Why the provider refused the account behind a request, or null when it refused only the request.
 * Read from the element's own codes: a rejected key is `AI_KEY_REJECTED`; an empty balance is a
 * provider error whose message says so.
 * @param failure - What the request failed with.
 * @returns A short reason, such as "HTTP 401", or null.
 */
export function accountRefusalOf(failure: RequestFailure): string | null {
    const status = failure.params?.status;
    if (failure.code === "AI_KEY_REJECTED") {
        return `HTTP ${status ?? "?"}`;
    }

    // Anthropic answers an empty balance with 400 ("credit balance is too low"), OpenAI with 429
    // insufficient_quota, Google with 429 RESOURCE_EXHAUSTED on a billing quota.
    const text = failure.message.toLowerCase();
    if (
        failure.code === "AI_PROVIDER_ERROR" &&
        /credit balance|insufficient_quota|no credits|billing|exceeded your current quota/.test(text)
    ) {
        return `HTTP ${status ?? "?"}, out of credit or quota`;
    }

    return null;
}

/**
 * Whether a failure is worth asking again: the provider was rate limited (429) or failed on its
 * side (5xx). A failure with no status is retried only when its message names a network failure;
 * any other (a response that failed validation, say) fails the same way every time, and a retry
 * would only spend the paid key and hide the failure from the pass counts.
 * @param failure - What the request failed with.
 * @returns True for a transient failure.
 */
export function isTransientFailure(failure: RequestFailure): boolean {
    if (failure.code !== "AI_PROVIDER_ERROR") {
        return false;
    }

    const { status } = failure.params ?? {};
    if (status === undefined) {
        return /fetch failed|econnreset|etimedout|socket/i.test(failure.message);
    }

    return status === 429 || (typeof status === "number" && status >= 500);
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
    /** A session to work on instead of one built from `graphData`: a task's dataset. */
    session?: GraphSession;
    /** Whether the assistant keeps one conversation across prompts; none, as the element's default, when absent. */
    history?: AiControllerOptions["history"];
    /** Which calls wait for an approval; none, as the element's default, when absent. */
    approvals?: AiControllerOptions["approvals"];
}

/**
 * Captured tool call information from the provider
 */
export interface CapturedToolCall {
    name: string;
    arguments: Record<string, unknown>;
}

/** One model turn as the transcript records it: what the model wrote and called, and how it ended. */
export interface TranscriptTurn {
    text: string;
    toolCalls: (CapturedToolCall & { invalidArguments?: true })[];
    /** The finish reason, or the error code the turn ended with; "none" when it ended with neither. */
    end: string;
    /** How long the turn took, retries and waits included, in milliseconds. */
    ms: number;
    /** Each HTTP request the turn made: its status (or the error it threw) and the wait it asked for. */
    requests: { status: number | string; retryAfter?: string }[];
}

/** The turn whose HTTP requests are being recorded, while one runs. */
let recordingTurn: TranscriptTurn | undefined;

/**
 * Record each HTTP request a provider's API gets into the turn that made it, for the transcript:
 * a retry, a rate limit or a refused request is otherwise invisible in it. Installed once.
 */
function recordRequests(): void {
    const marker = globalThis as { __LLM_REGRESSION_FETCH__?: true };
    if (marker.__LLM_REGRESSION_FETCH__) {
        return;
    }

    marker.__LLM_REGRESSION_FETCH__ = true;
    const inner = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        const request: TranscriptTurn["requests"][number] = { status: "pending" };
        recordingTurn?.requests.push(request);
        try {
            const response = await inner(input, init);
            request.status = response.status;
            const wait = response.headers.get("retry-after-ms") ?? response.headers.get("retry-after");
            if (wait !== null) {
                request.retryAfter = wait;
            }

            return response;
        } catch (error) {
            request.status = error instanceof Error ? error.name : "error";
            throw error;
        }
    };
}

/**
 * An engine decorator that records what the model did on every turn -- its tool calls, in order,
 * and its token usage -- and counts the requests, without changing anything that passes through.
 */
export class RecordingEngine implements AiEngine {
    readonly kind: AiEngine["kind"];
    readonly providerName: string;
    capturedToolCalls: CapturedToolCall[] = [];
    capturedTokenUsage?: { prompt: number; completion: number };
    /** Every turn of the current prompt, for the transcript. */
    capturedTurns: TranscriptTurn[] = [];
    /** The current prompt's last request. */
    lastRequest: TurnRequest | null = null;

    constructor(private readonly inner: AiEngine) {
        this.kind = inner.kind;
        this.providerName = inner.providerName;
    }

    capabilities(model: string): EngineCapabilities {
        return this.inner.capabilities(model);
    }

    async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        // Counted per test file and printed by setup.ts, so a run reports what it cost.
        const counter = globalThis as { __LLM_REGRESSION_API_CALLS__?: number };
        counter.__LLM_REGRESSION_API_CALLS__ = (counter.__LLM_REGRESSION_API_CALLS__ ?? 0) + 1;
        const turn: TranscriptTurn = { text: "", toolCalls: [], end: "none", ms: 0, requests: [] };
        this.capturedTurns.push(turn);
        this.lastRequest = request;
        recordingTurn = turn;
        const start = Date.now();
        try {
            yield* this.recordTurn(turn, this.inner.turn(request, signal));
        } finally {
            turn.ms = Date.now() - start;
            recordingTurn = undefined;
        }
    }

    /**
     * Pass a turn's events on, recording them.
     * @param turn - Where the turn is recorded.
     * @param events - The inner engine's events.
     * @yields Each event, unchanged.
     */
    private async *recordTurn(turn: TranscriptTurn, events: AsyncIterable<TurnEvent>): AsyncIterable<TurnEvent> {
        for await (const event of events) {
            if (event.type === "text") {
                turn.text += event.delta;
            } else if (event.type === "finish") {
                turn.end = event.reason;
            } else if (event.type === "error") {
                turn.end = event.code;
            } else if (event.type === "tool-call") {
                // Every turn's tool calls, in order: one prompt may ask the model several times.
                this.capturedToolCalls.push({ name: event.name, arguments: { ...event.arguments } });
                turn.toolCalls.push({
                    name: event.name,
                    arguments: { ...event.arguments },
                    ...(event.invalidArguments && { invalidArguments: true }),
                });
            } else if (event.type === "usage") {
                // Token usage, summed over the prompt's turns
                this.capturedTokenUsage = {
                    prompt: (this.capturedTokenUsage?.prompt ?? 0) + event.inputTokens,
                    completion: (this.capturedTokenUsage?.completion ?? 0) + event.outputTokens,
                };
            }

            yield event;
        }
    }

    checkKey(signal: AbortSignal): Promise<EngineOutcome> {
        return this.inner.checkKey(signal);
    }

    dispose(): void {
        this.inner.dispose();
    }

    clearCaptured(): void {
        this.capturedToolCalls = [];
        this.capturedTokenUsage = undefined;
        this.capturedTurns = [];
        this.lastRequest = null;
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
    private engine: RecordingEngine;
    private graph: Graph;
    private disposed = false;

    private constructor(controller: AiController, engine: RecordingEngine, graph: Graph) {
        this.controller = controller;
        this.engine = engine;
        this.graph = graph;
    }

    /**
     * Create a new harness instance.
     * @param options - Configuration options
     * @returns Promise resolving to the harness instance
     * @throws Error if API key is not available
     */
    static async create(options: LlmRegressionTestHarnessOptions = {}): Promise<LlmRegressionTestHarness> {
        const apiKey = getLlmRegressionApiKey();
        if (!apiKey) {
            throw new Error(
                `${getLlmRegressionKeyVariable()} environment variable is required for LLM regression tests`,
            );
        }

        if (process.env.LLM_REGRESSION_TRANSCRIPT) {
            recordRequests();
        }

        // The provider VITE_LLM_REGRESSION_PROVIDER names (google by default)
        const provider = new VercelAiProvider(getLlmRegressionProvider());
        provider.configure({
            apiKey,
            model: options.model ?? getLlmRegressionModel(),
            temperature: options.temperature ?? 0,
        });

        // A real session from the fixture, with the stand-in algorithm executor, and a stand-in
        // renderer for what only a renderer does (the camera, a capture, XR).
        const session =
            options.session ?? (await assistantSession(LlmRegressionTestHarness.recordsOf(options.graphData)));
        const graph = { getSession: () => session, ...STAND_IN_RENDERER } as unknown as Graph;
        // The renderer's camera, as the element installs it: a view.camera call arrives at once.
        dispatcherOf(session).services.camera = { move: () => Promise.resolve() };

        // What AiManager hands the model, built the way AiManager builds it: the generated tools,
        // the profile AiManager would pick, and the instructions and facts the controller writes.
        // AiManager itself is not used because it loads the browser-only key store, and this
        // project runs in Node.
        const commandRegistry = new CommandRegistry();
        installAssistantTools(commandRegistry, session);
        // The provider's own engine, wrapped so every turn is recorded.
        const engine = new RecordingEngine(engineFor(provider));
        const controllerOptions: AiControllerOptions & { [ENGINE_OVERRIDE]: AiEngine } = {
            provider,
            commandRegistry,
            graph,
            toolProfile: process.env.LLM_REGRESSION_TOOL_PROFILE === "small" ? "small" : "standard",
            ...(options.history === undefined ? {} : { history: options.history }),
            ...(options.approvals === undefined ? {} : { approvals: options.approvals }),
            [ENGINE_OVERRIDE]: engine,
        };
        const controller = new AiController(controllerOptions);

        return new LlmRegressionTestHarness(controller, engine, graph);
    }

    /**
     * The fixture's records, as a session takes them; five servers and databases when none is given.
     * @param fixture - The fixture.
     * @returns The node and edge records.
     */
    private static recordsOf(fixture?: TestGraphFixture): {
        nodes: Record<string, unknown>[];
        edges: Record<string, unknown>[];
    } {
        if (!fixture) {
            return {
                nodes: Array.from({ length: 5 }, (_, i) => ({
                    id: `node-${String(i)}`,
                    type: i % 2 === 0 ? "server" : "database",
                    name: `node-${String(i)}`,
                    status: "online",
                })),
                edges: Array.from({ length: 4 }, (_, i) => ({
                    source: `node-${String(i)}`,
                    target: `node-${String(i + 1)}`,
                    weight: 1.0,
                })),
            };
        }

        return {
            nodes: fixture.nodes.map((node) => ({ ...node.data, id: node.id })),
            edges: fixture.edges.map((edge) => ({ ...edge.data, source: edge.source, target: edge.target })),
        };
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
        const shouldRetry = retryOptions?.retryOn ?? isTransientFailure;
        const startTime = Date.now();

        for (let attempt = 0; ; attempt++) {
            this.engine.clearCaptured();
            const executionResult = await this.controller.execute(prompt);
            this.writeTranscript(prompt, attempt, executionResult);

            // The controller never throws: a message that failed outside its tools -- the API
            // refused the request, or the graph could not open the message's transaction --
            // comes back as an unsuccessful result and is kept as the controller's last error.
            // A test reading only `toolWasCalled` would see "no tool was called" and nothing
            // else, so such a failure throws here with its real cause. A tool that failed is
            // NOT this: it is part of what the model did, and stays in `commandResult`.
            const error = this.controller.getLastError();
            if (error) {
                const failure: RequestFailure = {
                    code: executionResult.code,
                    params: executionResult.params,
                    message: error.message,
                };
                const refusal = accountRefusalOf(failure);
                if (refusal !== null) {
                    // Retrying cannot help, and the message carries the marker the release job reads.
                    throw new Error(`${ACCOUNT_REFUSED_MARKER} (${refusal}): ${failure.message}`, { cause: error });
                }

                if (attempt < maxRetries && shouldRetry(failure)) {
                    await this.delay(retryDelayMs);
                    continue;
                }

                throw new Error(`LLM regression request failed before any tool ran: ${failure.message}`, {
                    cause: error,
                });
            }

            const toolCalls = [...this.engine.capturedToolCalls];
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
                tokenUsage: this.engine.capturedTokenUsage,
                turns: this.engine.capturedTurns.length,
                lastRequest: this.engine.lastRequest,
                code: executionResult.code,
                params: executionResult.params,
            };

            if (expectations) {
                this.validateExpectations(result, expectations);
            }

            return result;
        }
    }

    /**
     * Answer an approval request, as a reader would, and let the message continue.
     * @param id - The request's id (`params.request` of an `AI_CONFIRMATION_NEEDED` result).
     * @param answer - The answer.
     * @returns The message's final result and the calls the model made after the answer.
     */
    async resolveApproval(
        id: string,
        answer: AiApprovalAnswer,
    ): Promise<{ result: ExecutionResult; toolCalls: CapturedToolCall[] }> {
        this.engine.clearCaptured();
        const result = await this.controller.resolveAiApproval(id, answer);
        return { result, toolCalls: [...this.engine.capturedToolCalls] };
    }

    /**
     * Append one attempt of one prompt to the JSONL transcript `LLM_REGRESSION_TRANSCRIPT` names, so
     * two runs (two engines, two commits) can be compared case by case. Off when it is unset.
     * @param prompt - The prompt.
     * @param attempt - The harness's attempt, from 0.
     * @param result - What the controller returned.
     */
    private writeTranscript(prompt: string, attempt: number, result: ExecutionResult): void {
        const path = process.env.LLM_REGRESSION_TRANSCRIPT;
        if (path === undefined || path === "") {
            return;
        }

        const { testPath, currentTestName } = expect.getState();
        const line = {
            file: basename(testPath ?? ""),
            test: currentTestName,
            prompt,
            attempt,
            code: result.code,
            params: result.params,
            success: result.success,
            turns: this.engine.capturedTurns,
            llmText: result.llmText ?? null,
        };
        appendFileSync(path, `${JSON.stringify(line)}\n`);
    }

    /**
     * Delay helper for retry logic.
     */
    private delay(ms: number): Promise<void> {
        // eslint-disable-next-line local/no-test-timing -- backoff before calling a remote LLM provider again after a rate limit or transient error; the provider offers no condition to wait on, tracked in #1636
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
/**
 * A call's action, or "" when it names none.
 * @param call - The call.
 * @returns The action.
 */
export function actionOf(call: CapturedToolCall): string {
    return typeof call.arguments.action === "string" ? call.arguments.action : "";
}

/**
 * The calls a prompt made, with the small profile's `call` replaced by the call it stands for.
 * @param result - The prompt's result.
 * @returns The calls, each as the tool it reached and its arguments.
 */
export function reachedCalls(result: LlmRegressionResult): CapturedToolCall[] {
    return result.toolCalls.map((call) => {
        if (call.name !== "call") {
            return call;
        }

        const inner =
            typeof call.arguments.args === "string"
                ? (JSON.parse(call.arguments.args) as Record<string, unknown>)
                : ((call.arguments.args ?? {}) as Record<string, unknown>);
        return {
            name: String(call.arguments.tool),
            arguments: { ...inner, ...(call.arguments.action === undefined ? {} : { action: call.arguments.action }) },
        };
    });
}

/**
 * The first call of a tool, and of one of its actions when named.
 * @param result - The prompt's result.
 * @param tool - The tool, or tools.
 * @param actions - The actions any of which will do; any when absent.
 * @returns The call.
 * @throws When the model made no such call, naming the calls it made.
 */
export function assertAction(
    result: LlmRegressionResult,
    tool: string | readonly string[],
    actions?: string | readonly string[],
): CapturedToolCall {
    const tools = typeof tool === "string" ? [tool] : tool;
    let wanted: readonly string[] | undefined;
    if (actions !== undefined) {
        wanted = typeof actions === "string" ? [actions] : actions;
    }

    const calls = reachedCalls(result);
    // The last such call: when the model corrects a refused call, the correction is what took effect.
    const call = [...calls]
        .reverse()
        .find(
            (candidate) =>
                tools.includes(candidate.name) && (wanted === undefined || wanted.includes(actionOf(candidate))),
        );
    if (!call) {
        const made = calls.map((candidate) => `${candidate.name}.${actionOf(candidate)}`).join(", ") || "none";
        throw new Error(
            `Expected a call to ${tools.join(" or ")}${wanted === undefined ? "" : ` (${wanted.join(" or ")})`}; the model called: ${made}`,
        );
    }

    return call;
}

/**
 * Assert a question was answered: by a call of one of the tools, or in the answer itself, which
 * the facts the model is handed may already hold.
 * @param result - The prompt's result.
 * @param tools - Tools a call to which answers it.
 * @param answer - Text the answer must hold when no such call was made.
 */
export function assertAnswered(result: LlmRegressionResult, tools: readonly string[], answer: RegExp): void {
    const called = reachedCalls(result).some((call) => tools.includes(call.name));
    if (!called) {
        assert.match(
            result.llmText ?? "",
            answer,
            `Expected a call to ${tools.join(" or ")}, or an answer matching ${String(answer)}`,
        );
    }
}

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
