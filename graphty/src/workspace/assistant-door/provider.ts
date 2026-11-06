import type { AiStatus } from "@graphty/graphty-element/ai";
import {
    AI_PROVIDER_DESCRIPTORS,
    type AiProviderDescriptor,
    type AiProviderId,
} from "@graphty/graphty-element/catalog";
import { useMemo, useSyncExternalStore } from "react";

/**
 * A message in progress. Here, not in the panel's chunk, so the canvas can ask it too.
 * @param status - the assistant's status.
 * @returns true while a message runs.
 */
export function isRunning(status: AiStatus | null): boolean {
    return status !== null && status.state !== "ready" && status.state !== "error";
}

/** The reader's AI provider and model, kept beside the key and for as long. */
export interface AssistantChoice {
    readonly provider: AiProviderId;
    readonly model: string;
    /** Whether the key stays on this device (localStorage) rather than for this tab. */
    readonly remember: boolean;
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
        const { provider, model } = JSON.parse(raw.text) as { provider?: unknown; model?: unknown };
        const known = AI_PROVIDER_DESCRIPTORS.find((entry) => entry.id === provider);
        return known === undefined || typeof model !== "string"
            ? null
            : { provider: known.id, model, remember: raw.remember };
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
