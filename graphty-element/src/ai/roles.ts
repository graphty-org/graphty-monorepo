/**
 * @file Checking the helpers a host configures (`AiManagerConfig.agents`) before anything is built:
 * `enableAiControl` rejects a configuration that cannot run with an `AiConfigError` naming the
 * helper, the field and why. Loaded with `import()` only when `agents` is set.
 */

import { AI_PROVIDER_DESCRIPTORS } from "../../catalog/ai";
import { ASSISTANT_TOOLS } from "../../catalog/assistant";
import { type AiAgentsSetting, AiConfigError, rolesOf } from "../agents";

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
 * @param commands - The commands a helper may name besides the assistant's own tools.
 * @throws {AiConfigError} On an empty, duplicate or reserved name, an empty purpose, an unknown
 *   command, or a provider a helper cannot run on.
 */
export function checkAgents(setting: AiAgentsSetting, commands: Iterable<string> = []): void {
    const known = new Set([...KNOWN_COMMANDS, ...commands]);
    const seen = new Set<string>();
    for (const role of rolesOf(setting)) {
        const agent = role.name;
        const fail = (field: string, reason: string, extra: Record<string, string> = {}): never => {
            throw new AiConfigError({ agent, field, reason, ...extra });
        };

        if (agent.trim() === "") {
            fail("name", "empty");
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

        const unknown = role.commands.find((command) => !known.has(command));
        if (unknown !== undefined) {
            fail("commands", "unknown-command", { command: unknown });
        }

        if (role.provider !== undefined && !HELPER_PROVIDERS.has(role.provider)) {
            fail("provider", "unsupported");
        }
    }
}
