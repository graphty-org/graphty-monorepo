/**
 * @file Checking the helpers a host configures (`AiManagerConfig.agents`) before anything is built:
 * `enableAiControl`, `AiManager.init` and `new AiController` reject a configuration that cannot run
 * with an `AiConfigError` naming the helper, the field and why.
 */

import { AI_PROVIDER_DESCRIPTORS } from "../catalog/ai";
import { ASSISTANT_TOOLS } from "../catalog/assistant";
import {
    type AiAgentsSetting,
    AiConfigError,
    MAX_AGENT_NAME_LENGTH,
    MAX_AGENT_PURPOSE_LENGTH,
    MAX_AGENTS,
    rolesOf,
} from "./agents";

/** Names a helper may not take: the main conversation and the reader. */
const RESERVED_NAMES: ReadonlySet<string> = new Set(["main", "reader"]);

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
 *   empty or too long purpose, an unknown command, a provider a helper cannot run on, or a model of its own
 *   on a provider the element cannot build a second of.
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
        const agent = role.name;
        const fail = (field: string, reason: string, extra: Record<string, string | number> = {}): never => {
            throw new AiConfigError({ agent, field, reason, ...extra });
        };

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

        seen.add(agent);
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

        if (role.provider !== undefined && !HELPER_PROVIDERS.has(role.provider)) {
            fail("provider", "unsupported");
        }

        if (role.provider === undefined && role.model !== undefined && !ownModel) {
            fail("model", "unsupported");
        }
    }
}
