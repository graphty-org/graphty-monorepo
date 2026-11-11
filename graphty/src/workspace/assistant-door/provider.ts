import {
    AI_PROVIDER_DESCRIPTORS,
    AI_REASONING_EFFORTS,
    type AiProviderDescriptor,
    type AiProviderId,
    type AiReasoningEffort,
} from "@graphty/graphty-element/catalog";
import { useMemo, useSyncExternalStore } from "react";

/** The reader's AI provider and model, kept beside the key and for as long. */
export interface AssistantChoice {
    readonly provider: AiProviderId;
    readonly model: string;
    /** Whether the key stays on this device (localStorage) rather than for this tab. */
    readonly remember: boolean;
    /** How hard the model thinks before it answers; absent, the lowest the model takes (`effortLevels`). */
    readonly effort?: EffortLevel;
    /** Whether what Talk heard is sent when the press ends, rather than waiting in the composer; absent, true. */
    readonly sendSpoken?: boolean;
}

/** How hard a model thinks: a reasoning effort, or "off" for a model whose thinking is a budget it may skip. */
export type EffortLevel = "off" | AiReasoningEffort;

/**
 * The thinking budget each level asks of a model that takes one, as a multiple of its least.
 * An app choice: the element only says the least a budget may be.
 */
const BUDGET_STEPS: Readonly<Partial<Record<EffortLevel, number>>> = { low: 1, medium: 4, high: 16 };

/**
 * The levels a model takes, lowest first, from the element's catalog: its efforts, or Off and
 * three budgets for a model that thinks on a budget. Empty for a model that takes no setting.
 * @param choice - the provider and model.
 * @returns the levels.
 */
export function effortLevels(choice: Pick<AssistantChoice, "provider" | "model">): readonly EffortLevel[] {
    const reasoning = providerDescriptor(choice.provider).models.find((model) => model.id === choice.model)?.reasoning;
    if (reasoning === undefined) {
        return [];
    }
    if ("efforts" in reasoning) {
        return AI_REASONING_EFFORTS.filter((effort) => reasoning.efforts.includes(effort));
    }
    return ["off", "low", "medium", "high"];
}

/**
 * The level a choice runs at: its own when the model takes it, else the model's lowest (the app's
 * default, picked because it answers fastest).
 * @param choice - the choice.
 * @returns the level, or undefined for a model that takes none.
 */
export function effortOf(choice: Pick<AssistantChoice, "provider" | "model" | "effort">): EffortLevel | undefined {
    const levels = effortLevels(choice);
    return choice.effort !== undefined && levels.includes(choice.effort) ? choice.effort : levels[0];
}

/**
 * What a choice's level asks of the element.
 * @param choice - the choice.
 * @returns the element's reasoning options.
 */
export function effortConfig(choice: AssistantChoice): {
    reasoningEffort?: AiReasoningEffort;
    thinkingBudgetTokens?: number;
} {
    const level = effortOf(choice);
    const reasoning = providerDescriptor(choice.provider).models.find((model) => model.id === choice.model)?.reasoning;
    if (level === undefined || reasoning === undefined || level === "off") {
        return {};
    }
    if ("efforts" in reasoning) {
        return { reasoningEffort: level };
    }
    return { thinkingBudgetTokens: reasoning.budgetTokens.min * (BUDGET_STEPS[level] ?? 1) };
}

const KEY = "app.graphty.assistant.provider";
const listeners = new Set<() => void>();

/**
 * The saved choice's text. A choice lives where its key lives, so one that outlasted its key
 * cannot name a provider nothing can reach.
 * @returns the text and whether it is the remembered one, or null with none saved.
 */
function readRaw(): { readonly text: string; readonly remember: boolean } | null {
    try {
        const remembered = localStorage.getItem(KEY);
        if (remembered !== null) {
            return { text: remembered, remember: true };
        }
        const forTab = sessionStorage.getItem(KEY);
        return forTab === null ? null : { text: forTab, remember: false };
    } catch {
        return null;
    }
}

/**
 * Parses a saved choice.
 * @param raw - what `readRaw` found.
 * @returns the choice, or null when there is none or its provider no longer exists.
 */
function parseChoice(raw: ReturnType<typeof readRaw>): AssistantChoice | null {
    if (raw === null) {
        return null;
    }
    try {
        const { provider, model, effort, sendSpoken } = JSON.parse(raw.text) as {
            provider?: unknown;
            model?: unknown;
            effort?: unknown;
            sendSpoken?: unknown;
        };
        const known = AI_PROVIDER_DESCRIPTORS.find((entry) => entry.id === provider);
        const level = ["off", ...AI_REASONING_EFFORTS].find((each) => each === effort) as EffortLevel | undefined;
        return known === undefined || typeof model !== "string"
            ? null
            : {
                  provider: known.id,
                  model,
                  remember: raw.remember,
                  ...(level === undefined ? {} : { effort: level }),
                  ...(sendSpoken === false ? { sendSpoken } : {}),
              };
    } catch {
        return null;
    }
}

/**
 * The saved choice.
 * @returns the choice, or null with no provider set up.
 */
export function readAssistantChoice(): AssistantChoice | null {
    return parseChoice(readRaw());
}

/**
 * Saves the choice, or with null forgets it.
 * @param choice - the choice.
 */
export function writeAssistantChoice(choice: AssistantChoice | null): void {
    try {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
        if (choice !== null) {
            const { remember, ...saved } = choice;
            (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(saved));
        }
    } catch {
        // Storage blocked: the assistant works for this page and asks again on the next.
    }
    for (const listener of listeners) {
        listener();
    }
}

/**
 * Listens for a saved choice changing.
 * @param changed - called on each change.
 * @returns a function that stops listening.
 */
function subscribe(changed: () => void): () => void {
    listeners.add(changed);
    return () => {
        listeners.delete(changed);
    };
}

/**
 * The saved choice, kept current.
 * @returns the choice, or null.
 */
export function useAssistantChoice(): AssistantChoice | null {
    const text = useSyncExternalStore(subscribe, () => {
        const raw = readRaw();
        return raw === null ? null : JSON.stringify(raw);
    });
    return useMemo(() => (text === null ? null : parseChoice(JSON.parse(text) as ReturnType<typeof readRaw>)), [text]);
}

/**
 * What a saved provider receives: the AI provider section and Settings' Privacy say the same words.
 * @param provider - its name.
 * @returns the sentences.
 */
export const providerDisclosure = (provider: string): string =>
    `Your messages and what the assistant reads from the graph (column names, node ids, labels and ` +
    `values) go straight to ${provider}. ${provider} charges your key.`;

/**
 * A provider's catalog entry.
 * @param provider - its id.
 * @returns the entry.
 */
export function providerDescriptor(provider: AiProviderId): AiProviderDescriptor {
    return AI_PROVIDER_DESCRIPTORS.find((entry) => entry.id === provider) ?? AI_PROVIDER_DESCRIPTORS[0];
}
