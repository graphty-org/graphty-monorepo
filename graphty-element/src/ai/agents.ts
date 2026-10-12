/**
 * @file Helpers the assistant hands parts of a message to (`AiManagerConfig.agents`), the plans
 * that order them, and the error a configuration of them that cannot run is rejected with.
 */

import type { AiProviderId, AiResultParams } from "../catalog/ai";

/** Tokens a model used, as its provider reported them; zero when it reports none. */
export interface AiTokenUsage {
    /** Tokens sent to the model. */
    readonly inputTokens: number;
    /** Tokens the model wrote. */
    readonly outputTokens: number;
}

/** How the assistant may use one tool the provider runs (`AiToolOptions.webSearch`, `webFetch`). */
export interface AiHostedToolOptions {
    /** The most times one message may use it. */
    readonly maxUses?: number;
    /**
     * The only hosts it may reach, such as `"example.org"`. A provider that cannot keep to them
     * does not get the tool.
     */
    readonly allowedDomains?: readonly string[];
    /**
     * Fail every command with `AI_HOSTED_TOOL_UNSUPPORTED`, sending nothing, when the provider and
     * model cannot use it. Default false: the tool is left out and the command runs.
     */
    readonly required?: boolean;
}

/**
 * Tools beyond the assistant's own commands, each off by default. A tool the provider and model
 * cannot use is left out and reported on `ai-capability-unavailable` (`getAiCapabilities()` says
 * which can).
 */
export interface AiToolOptions {
    /** Search the web, at the provider and on the reader's key. */
    readonly webSearch?: boolean | AiHostedToolOptions;
    /** Read web pages the reader gave or `allowedDomains` admits, at the provider. */
    readonly webFetch?: boolean | AiHostedToolOptions;
    /**
     * Run a program the model writes (`run_code`), in a sandbox in the page, calling only commands
     * that read. Needs a page whose content security policy allows `'wasm-unsafe-eval'`; not in
     * `./bundle`. `{ required: true }`: when it cannot run, every command fails instead.
     */
    readonly inPageCode?: boolean | Pick<AiHostedToolOptions, "required">;
    /**
     * Let commands that change the graph run while the message holds web content. Default false:
     * they wait for the reader's approval, or are refused when approvals are off.
     */
    readonly webContentMayWrite?: boolean;
}

/** One helper the assistant may hand a task to. */
export interface AiAgentRole {
    /**
     * The helper's name, unique among the roles; the model names it when it delegates. At most
     * `MAX_AGENT_NAME_LENGTH` characters.
     */
    readonly name: string;
    /**
     * What the helper is for, in the model's language: the main model reads it to choose a helper.
     * At most `MAX_AGENT_PURPOSE_LENGTH` characters.
     */
    readonly purpose: string;
    /**
     * The assistant's own tools the helper may call, by name (`ASSISTANT_TOOLS` with a profile);
     * it gets no others.
     */
    readonly commands: readonly string[];
    /** The tools beyond the commands the helper may use. A helper with web tools may only read. */
    readonly tools?: AiToolOptions;
    /** The provider it runs on, when not the assistant's own. */
    readonly provider?: AiProviderId;
    /**
     * The model it runs on, when not its provider's configured one. Without `provider`, it applies
     * only when the assistant runs on one of the element's remote providers (not `"webllm"`, not a
     * `providerInstance` of your own): `enableAiControl` rejects it otherwise.
     */
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
 * The most helpers one model turn, or one step of a plan, starts; the turn's further `delegate`
 * calls do not run (`AI_TOOL_NOT_RUN` with `reason: "limit"`).
 */
export const MAX_HELPERS_PER_TURN = 4;

/** The most helpers `AiManagerConfig.agents` may name. */
export const MAX_AGENTS = 8;

/** The longest a helper's `purpose` may be, in characters: every main turn's instructions carry them all. */
export const MAX_AGENT_PURPOSE_LENGTH = 200;

/** The longest a helper's `name` may be, in characters: every main turn's tools name them all. */
export const MAX_AGENT_NAME_LENGTH = 20;

/**
 * The helpers of `AiManagerConfig.agents`: the roles alone, or the roles with how a message is
 * handed to them. The main model is offered a `delegate` tool naming the roles, and hands each a
 * task as it chooses; with a `"classifier"` or function `router`, the plan's steps run first.
 */
export type AiAgentsSetting =
    | readonly AiAgentRole[]
    | {
          /** The helpers. */
          readonly roles: readonly AiAgentRole[];
          /** How a message is handed to them. Default `"model"`. */
          readonly router?: AiRouter;
          /**
           * The model the `"classifier"` router's one turn runs on, on the assistant's provider; its
           * own when absent. As a role's `model`: only on the element's remote providers.
           */
          readonly classifierModel?: string;
          /**
           * Ask the reader before every hand-off to a helper (`ai-approval-requested` with gate
           * `"plan"`): a plan's step is one request, and a denial reaches the main model as
           * `AI_APPROVAL_DENIED`. Default false.
           */
          readonly confirmPlans?: boolean;
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
 * duplicate or reserved name, an empty or too long purpose, too many helpers. `enableAiControl` rejects with it and builds
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
