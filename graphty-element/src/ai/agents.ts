/**
 * @file Helpers the assistant hands parts of a message to (`AiManagerConfig.agents`), the plans
 * that order them, and the error a configuration of them that cannot run is rejected with.
 */

import type { AiProviderId, AiResultParams } from "../catalog/ai";

/** One helper the assistant may hand a task to. */
export interface AiAgentRole {
    /** The helper's name, unique among the roles; the model names it when it delegates. */
    readonly name: string;
    /** What the helper is for, in the model's language: the main model reads it to choose a helper. */
    readonly purpose: string;
    /** The assistant tools and consumer commands the helper may call, by name; it gets no others. */
    readonly commands: readonly string[];
    /** The provider it runs on, when not the assistant's own. */
    readonly provider?: AiProviderId;
    /** The model it runs on, when not its provider's configured one. */
    readonly model?: string;
}

/**
 * A plan: steps run one after another, each handing its task to one or more helpers. A step's
 * helpers run at once (`"parallel"`, the default) or one after another (`"sequence"`), and each
 * step sees the answers of the steps before it.
 */
export interface AiPlan {
    /** The steps, in order. */
    readonly steps: readonly {
        /** The helpers of the step, by role name. */
        readonly agents: readonly string[];
        /** How its helpers run. */
        readonly order?: "parallel" | "sequence";
    }[];
}

/**
 * How a message is handed to helpers: `"model"` (default) lets the main model delegate as it
 * chooses; `"classifier"` asks one short turn first which helpers fit; a function returns the plan
 * for the reader's text itself.
 */
export type AiRouter = "model" | "classifier" | ((input: string) => AiPlan);

/**
 * The helpers of `AiManagerConfig.agents`: the roles alone, or the roles with how a message is
 * handed to them. With `router: "model"` (the default) the main model is offered a `delegate` tool
 * naming the roles, and hands each a task as it chooses.
 */
export type AiAgentsSetting =
    | readonly AiAgentRole[]
    | {
          /** The helpers. */
          readonly roles: readonly AiAgentRole[];
          /** How a message is handed to them. Default `"model"`. */
          readonly router?: "model";
      };

/**
 * The roles a setting names.
 * @param setting - The setting.
 * @returns Its roles.
 */
export function rolesOf(setting: AiAgentsSetting): readonly AiAgentRole[] {
    return "roles" in setting ? setting.roles : setting;
}

/**
 * The assistant's configuration names something it cannot use: an unknown command or helper, a
 * duplicate or reserved name, an empty purpose. `enableAiControl` rejects with it and builds
 * nothing. `message` is the code, for a log; read `code` and `params`.
 */
export class AiConfigError extends Error {
    /** Always `AI_CONFIG_INVALID`. */
    readonly code = "AI_CONFIG_INVALID";
    /** `{ agent, field, reason }`, as `AI_RESULT_CODES` documents for `AI_CONFIG_INVALID`. */
    readonly params: AiResultParams;

    /**
     * Make the error.
     * @param params - The helper, the field and why.
     */
    constructor(params: AiResultParams) {
        super("AI_CONFIG_INVALID");
        this.name = "AiConfigError";
        this.params = params;
    }
}
