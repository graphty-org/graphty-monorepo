/**
 * @file Where the assistant gets its engine. This is the one module that may load the provider-API
 * adapter (`./tanstack/`) with `import()`, on the first turn that needs it, so a page that never
 * asks the assistant anything downloads none of it. Until that adapter lands, every provider runs
 * through `LlmProviderEngine`.
 */

import type { LlmProvider } from "../providers/types";
import { LlmProviderEngine } from "./LlmProviderEngine";
import type { AiEngine } from "./types";

/**
 * An `AiController` option, keyed by this symbol, that runs a given engine instead of the
 * provider's: how the regression harness puts its recording decorator in. Internal: no entry point
 * exports it, so it is not part of `AiControllerOptions`.
 */
export const ENGINE_OVERRIDE: unique symbol = Symbol("graphty.ai.engine");

/**
 * The engine a provider runs on.
 * @param provider - The provider, which keeps its key, model and options.
 * @returns Its engine.
 */
export function engineFor(provider: LlmProvider): AiEngine {
    return new LlmProviderEngine(provider);
}
