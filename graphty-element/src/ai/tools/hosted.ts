/**
 * @file The tools a provider runs itself (web search, web fetch): which of those the configuration
 * asks for the provider and model can use, resolved once when the assistant is enabled; the
 * built-in read-only `research` helper that alone is given them; and what one turn of it is
 * offered -- the hosts web fetch may reach and the uses left.
 */

import {
    AI_PROVIDER_IDS,
    type AiCapabilities,
    type AiCapabilityStatus,
    type AiHostedToolId,
    aiHostedToolStatus,
    aiProviderDescriptor,
    type AiProviderId,
    type AiResultParams,
} from "../../catalog/ai";
import type { AiAgentRole, AiHostedToolOptions, AiToolOptions } from "../agents";
import { PROGRAM_IN_BUILD } from "../engine/programBuild";
import {
    type EngineCapabilities,
    type EngineHostedTool,
    hostedToolLimits,
    type HostedToolRequest,
} from "../engine/types";
import { readerUrls } from "./readerUrls";

/** The built-in helper that alone runs the web tools: a reserved role name. */
export const RESEARCH = "research";

/** Each web tool and the option that asks for it. */
const WEB_TOOLS: readonly (readonly [EngineHostedTool, "webSearch" | "webFetch"])[] = [
    ["web-search", "webSearch"],
    ["web-fetch", "webFetch"],
];

/** A web tool the configuration asked for that the provider can run, with its limits. */
export interface HostedToolSetting {
    readonly tool: EngineHostedTool;
    readonly maxUses?: number;
    readonly allowedDomains?: readonly string[];
}

/** A tool asked for that cannot be used: left out, and reported. */
export interface UnavailableTool {
    readonly tool: AiHostedToolId;
    /** `AI_HOSTED_TOOL_UNSUPPORTED`'s `{ provider, model, tool }`. */
    readonly params: AiResultParams;
    /** The configuration marked it `required`: every command fails instead. */
    readonly required: boolean;
}

/** The tools a configuration asked for, resolved. */
export interface ResolvedTools {
    readonly offered: readonly HostedToolSetting[];
    readonly unavailable: readonly UnavailableTool[];
    /** In-page code was asked for and can run: the loop offers `run_code`. */
    readonly inPageCode: boolean;
}

let programProbe: boolean | undefined;

/**
 * Whether this page can run in-page code: the build carries the sandbox (`./bundle` does not), and
 * the page may compile WebAssembly. A content security policy without `'wasm-unsafe-eval'` makes a
 * synchronous compile throw. Probed once.
 * @returns True when it can.
 */
export function programSupported(): boolean {
    programProbe ??= PROGRAM_IN_BUILD && canCompileWasm();
    return programProbe;
}

/**
 * Compile the smallest WebAssembly module, synchronously.
 * @returns False when the page may not.
 */
function canCompileWasm(): boolean {
    try {
        // The empty module: the magic number and version 1.
        new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
        return true;
    } catch {
        return false;
    }
}

/**
 * A provider's name as one of the element's provider ids.
 * @param name - The name.
 * @returns The id, or undefined for a provider instance of the consumer's own.
 */
function providerId(name: string): AiProviderId | undefined {
    return AI_PROVIDER_IDS.find((id) => id === name);
}

/**
 * The model a provider runs when none was configured.
 * @param provider - The provider's name.
 * @returns Its default model, or "" for a provider instance of the consumer's own.
 */
export function defaultModelOf(provider: string): string {
    const id = providerId(provider);
    return id === undefined ? "" : aiProviderDescriptor(id).defaultModel;
}

/**
 * What the assistant can use with a provider and model: the engine decides which web tools it
 * can offer, the catalog says why one cannot (`"results-not-returned"` rather than plain
 * `"unsupported"`), and in-page code is the catalog's.
 * @param provider - The provider's name.
 * @param model - The model.
 * @param hosted - The engine's web tools; absent, the catalog's alone (a helper's own provider).
 * @returns The capabilities.
 */
export function capabilitiesOf(
    provider: string,
    model: string,
    hosted?: EngineCapabilities["hostedTools"],
): AiCapabilities {
    const id = providerId(provider);
    const status = (tool: AiHostedToolId): AiCapabilityStatus => {
        const listed = id === undefined ? undefined : aiHostedToolStatus(id, model, tool);
        if (tool === "in-page-code") {
            return programSupported() ? (listed ?? "available") : "unsupported";
        }

        const engine = hosted?.[tool] ?? (listed === "available" ? "available" : "unsupported");
        if (engine === "available") {
            return "available";
        }

        return listed === undefined || listed === "available" ? "unsupported" : listed;
    };
    return {
        provider,
        model,
        tools: {
            "web-search": status("web-search"),
            "web-fetch": status("web-fetch"),
            "in-page-code": status("in-page-code"),
        },
    };
}

/**
 * The web tools a configuration asks for, each kept when the provider and model can use it as
 * asked, else left out and reported. A search limited to some domains on a provider whose search
 * has no domain filter (Google) cannot be used as asked.
 * @param options - The tool options.
 * @param capabilities - What the provider and model can use.
 * @returns The tools offered and the ones left out.
 */
export function resolveTools(options: AiToolOptions | undefined, capabilities: AiCapabilities): ResolvedTools {
    const offered: HostedToolSetting[] = [];
    const unavailable: UnavailableTool[] = [];
    for (const [tool, key] of WEB_TOOLS) {
        const asked = options?.[key];
        if (asked === undefined || asked === false) {
            continue;
        }

        const { maxUses, allowedDomains, required = false }: AiHostedToolOptions = asked === true ? {} : asked;
        const unfiltered =
            tool === "web-search" &&
            allowedDomains !== undefined &&
            !hostedToolLimits(capabilities.provider).searchDomainFilter;
        if (capabilities.tools[tool] === "available" && !unfiltered) {
            offered.push({
                tool,
                ...(maxUses === undefined ? {} : { maxUses }),
                ...(allowedDomains === undefined ? {} : { allowedDomains }),
            });
        } else {
            unavailable.push({
                tool,
                params: { provider: capabilities.provider, model: capabilities.model, tool },
                required,
            });
        }
    }

    let inPageCode = false;
    if (options?.inPageCode !== undefined && options.inPageCode !== false) {
        const required = options.inPageCode !== true && options.inPageCode.required === true;
        inPageCode = capabilities.tools["in-page-code"] === "available";
        if (!inPageCode) {
            const params = { provider: capabilities.provider, model: capabilities.model, tool: "in-page-code" };
            unavailable.push({ tool: "in-page-code", params, required });
        }
    }

    return { offered, unavailable, inPageCode };
}

/**
 * Whether a configuration asks for any web tool.
 * @param options - The tool options.
 * @returns True when it does.
 */
export function asksWebTools(options: AiToolOptions | undefined): boolean {
    return WEB_TOOLS.some(([, key]) => options?.[key] !== undefined && options[key] !== false);
}

/**
 * The built-in helper that searches and reads the web for the main model: no commands, only the
 * web tools, so web text never reaches a turn that can change the graph.
 * @param tools - The web tools it is given.
 * @returns The role.
 */
export function researchRole(tools: AiToolOptions): AiAgentRole {
    return {
        name: RESEARCH,
        purpose: "Searches the web and reads web pages; answers with what it found. It cannot see or change the graph.",
        commands: [],
        tools,
    };
}

/**
 * The web tools one turn offers: each until its `maxUses` is spent in the message (the uses left
 * go to a provider that caps them itself), and web fetch only to the configured hosts and the
 * hosts of URLs in the reader's own text of this message -- never one the model wrote. With no
 * such host, web fetch is not offered.
 * ponytail: a provider without its own cap (OpenAI, Google) may still use a tool several times in
 * one turn past `maxUses`; a per-turn ceiling needs the provider to offer one.
 * @param settings - The tools the helper has.
 * @param readerText - The reader's request.
 * @param uses - How often each was used in the message so far.
 * @returns The turn's requests.
 */
export function turnHostedTools(
    settings: readonly HostedToolSetting[],
    readerText: string,
    uses: Readonly<Record<string, number>>,
): HostedToolRequest[] {
    return settings.flatMap((setting): HostedToolRequest[] => {
        const left = setting.maxUses === undefined ? undefined : setting.maxUses - (uses[setting.tool] ?? 0);
        if (left !== undefined && left <= 0) {
            return [];
        }

        const domains =
            setting.tool === "web-fetch"
                ? [
                      ...new Set([
                          ...(setting.allowedDomains ?? []),
                          ...readerUrls(readerText).map((url) => url.hostname),
                      ]),
                  ]
                : setting.allowedDomains;
        if (setting.tool === "web-fetch" && domains?.length === 0) {
            return [];
        }

        return [
            {
                tool: setting.tool,
                ...(left === undefined ? {} : { maxUses: left }),
                ...(domains === undefined ? {} : { allowedDomains: domains }),
            },
        ];
    });
}
