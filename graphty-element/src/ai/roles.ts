/**
 * @file Checking the helpers a host configures (`AiManagerConfig.agents`) before anything is built:
 * `enableAiControl`, `AiManager.init` and `new AiController` reject a configuration that cannot run
 * with an `AiConfigError` naming the helper, the field and why.
 */

import { AI_PROVIDER_DESCRIPTORS } from "../catalog/ai";
import { ASSISTANT_TOOLS } from "../catalog/assistant";
import {
    type AiAgentRole,
    type AiAgentsSetting,
    AiConfigError,
    MAX_AGENT_NAME_LENGTH,
    MAX_AGENT_PURPOSE_LENGTH,
    MAX_AGENTS,
    rolesOf,
} from "./agents";
import { hostedToolLimits } from "./engine/types";
import { asksWebTools, RESEARCH } from "./tools/hosted";

/** Names a helper may not take: the main conversation, the reader and the built-in web helper. */
const RESERVED_NAMES: ReadonlySet<string> = new Set(["main", "reader", RESEARCH]);

/**
 * The assistant's own tools that only read: the only commands a helper with web tools may have,
 * so text read on the web never drives a change (`research.test.ts` checks every action of each).
 */
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set(["catalog", "query"]);

/**
 * The assistant's own tools a helper may be given: every profile's, not the loop's own.
 * ponytail: a consumer command cannot be named yet, since commands are registered after
 * `enableAiControl` resolves; check them against the registry when a host needs that.
 */
const KNOWN_COMMANDS: ReadonlySet<string> = new Set(
    ASSISTANT_TOOLS.filter((tool) => tool.profiles.length > 0).map((tool) => tool.name),
);

/** The providers a helper can run on: every one the element builds at once (not the in-browser model). */
const HELPER_PROVIDERS: ReadonlySet<string> = new Set(
    AI_PROVIDER_DESCRIPTORS.filter((provider) => !provider.runsLocally).map((provider) => provider.id),
);

/**
 * Check a helper configuration.
 * @param setting - The helpers.
 * @param main - The assistant's own provider, by name, when known: a role's `model` alone (or the
 *   classifier's) needs a second instance of it, which only the element's remote providers have.
 * @throws {AiConfigError} On too many helpers, an empty, too long, duplicate or reserved name, an
 *   empty or too long purpose, an unknown command, a provider a helper cannot run on, a model of its own
 *   on a provider the element cannot build a second of, web tools beside a command that changes
 *   the graph, or web tools beside any command on a provider that offers no function tools on a
 *   turn that searches (Google).
 */
export function checkAgents(setting: AiAgentsSetting, main?: string): void {
    const roles = rolesOf(setting);
    if (roles.length > MAX_AGENTS) {
        throw new AiConfigError({ field: "agents", reason: "too-many", limit: MAX_AGENTS });
    }

    const ownModel = main === undefined || HELPER_PROVIDERS.has(main);
    if (!ownModel && "roles" in setting && setting.router === "classifier" && setting.classifierModel !== undefined) {
        throw new AiConfigError({ field: "classifierModel", reason: "unsupported" });
    }

    const seen = new Set<string>();
    for (const role of roles) {
        const fail = (field: string, reason: string, extra: Record<string, string | number> = {}): never => {
            throw new AiConfigError({ agent: role.name, field, reason, ...extra });
        };
        checkName(role.name, seen, fail);
        seen.add(role.name);
        checkPurposeAndCommands(role, fail);
        checkProvider(role, main, ownModel, fail);
    }
}

/** Throws the `AiConfigError` of one helper's field. */
type Fail = (field: string, reason: string, extra?: Record<string, string | number>) => never;

/**
 * Check a helper's name: not empty, not too long, not reserved, not taken.
 * @param agent - The name.
 * @param seen - The names of the helpers before it.
 * @param fail - Throws for the field.
 */
function checkName(agent: string, seen: ReadonlySet<string>, fail: Fail): void {
    if (agent.trim() === "") {
        fail("name", "empty");
    }

    if (agent.length > MAX_AGENT_NAME_LENGTH) {
        fail("name", "too-long", { limit: MAX_AGENT_NAME_LENGTH });
    }

    if (RESERVED_NAMES.has(agent)) {
        fail("name", "reserved");
    }

    if (seen.has(agent)) {
        fail("name", "duplicate");
    }
}

/**
 * Check a helper's purpose (not empty, not too long) and that it names only known commands.
 * @param role - The helper.
 * @param fail - Throws for the field.
 */
function checkPurposeAndCommands(role: AiAgentRole, fail: Fail): void {
    if (role.purpose.trim() === "") {
        fail("purpose", "empty");
    }

    if (role.purpose.length > MAX_AGENT_PURPOSE_LENGTH) {
        fail("purpose", "too-long", { limit: MAX_AGENT_PURPOSE_LENGTH });
    }

    const unknown = role.commands.find((command) => !KNOWN_COMMANDS.has(command));
    if (unknown !== undefined) {
        fail("commands", "unknown-command", { command: unknown });
    }
}

/**
 * Check where a helper runs: a provider it can run on, a model of its own only where a second
 * instance can be built, and web tools only beside reading commands, on a provider that allows them.
 * @param role - The helper.
 * @param main - The assistant's own provider, when known.
 * @param ownModel - Whether a role may name a model of its own on the assistant's provider.
 * @param fail - Throws for the field.
 */
function checkProvider(role: AiAgentRole, main: string | undefined, ownModel: boolean, fail: Fail): void {
    if (role.provider !== undefined && !HELPER_PROVIDERS.has(role.provider)) {
        fail("provider", "unsupported");
    }

    if (role.provider === undefined && role.model !== undefined && !ownModel) {
        fail("model", "unsupported");
    }

    if (!asksWebTools(role.tools)) {
        return;
    }

    if (role.commands.some((command) => !READ_ONLY_TOOLS.has(command))) {
        fail("tools", "web-tools-with-writes");
    }

    const provider = role.provider ?? main;
    if (role.commands.length > 0 && provider !== undefined && !hostedToolLimits(provider).withFunctionTools) {
        fail("tools", "unsupported");
    }
}
