/**
 * @file Where the assistant gets its engine. This is the one module that may load the provider-API
 * adapter (`./tanstack/`), with `import()` on the first turn that needs it, so a page that never
 * asks the assistant anything downloads none of it.
 */

import type { LlmProvider } from "../providers/types";
import { LlmProviderEngine } from "./LlmProviderEngine";
import type { AiEngine, ProgramRunner, ProviderApiTurn } from "./types";

/**
 * An `AiController` option, keyed by this symbol, that runs a given engine instead of the
 * provider's: how the regression harness puts its recording decorator in. Internal: no entry point
 * exports it, so it is not part of `AiControllerOptions`.
 */
export const ENGINE_OVERRIDE: unique symbol = Symbol("graphty.ai.engine");

/**
 * The engine each built-in provider (`VercelAiProvider`) runs on, kept here rather than as a member
 * so that no declaration a consumer reads names it. The function may decline (a subclass that
 * overrides `generate`); a provider without an entry, or one that declines, runs through
 * `LlmProviderEngine`.
 */
const providerApiEngines = new WeakMap<LlmProvider, () => AiEngine | undefined>();

/**
 * Register the engine a built-in provider runs on.
 * @param provider - The provider.
 * @param engine - Answers its engine at each `engineFor`, or undefined to run through `generate`.
 */
export function registerProviderApiEngine(provider: LlmProvider, engine: () => AiEngine | undefined): void {
    providerApiEngines.set(provider, engine);
}

/**
 * The engine a provider runs on.
 * @param provider - The provider, which keeps its key, model and options.
 * @returns Its engine.
 */
export function engineFor(provider: LlmProvider): AiEngine {
    return providerApiEngines.get(provider)?.() ?? new LlmProviderEngine(provider);
}

/**
 * Load the provider-API adapter: TanStack AI's shared chunk, on the first turn that needs it. Each
 * provider's chunk is loaded by the adapter on that provider's first turn.
 * @returns The adapter's turn.
 */
export async function loadProviderApiTurn(): Promise<ProviderApiTurn> {
    return (await import("./tanstack/index")).providerApiTurn;
}

/** The in-page code sandbox, as its chunk exports it. */
export interface ProgramModule {
    readonly runProgram: ProgramRunner;
    /** How many sandboxes are open: 0 whenever no program runs. */
    readonly openProgramContexts: () => number;
}

/**
 * Load the in-page code sandbox (TanStack Code Mode's QuickJS driver and its WebAssembly), its own
 * chunk, on the first program. Not an engine method: code runs in the page whichever engine wrote
 * it. A seam of its own that lives in `./tanstack/` only for its driver (`./tanstack/UPSTREAM.md`):
 * replacing the provider engine leaves it in place.
 * @returns The sandbox.
 */
export async function loadProgramRunner(): Promise<ProgramModule> {
    const { runProgram, openProgramContexts } = await import("./tanstack/program");
    return { runProgram, openProgramContexts };
}
