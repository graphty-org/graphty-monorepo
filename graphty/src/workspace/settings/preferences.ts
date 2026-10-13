/**
 * The reader's own preferences from Settings, kept in this browser: never in a project file,
 * never sent anywhere. Each read falls back to its default when storage is blocked or holds
 * something unknown.
 */

import {
    AI_PROVIDER_IDS,
    AI_REASONING_EFFORTS,
    type AiProviderId,
    type AiReasoningEffort,
} from "@graphty/graphty-element/catalog";

/** Number format (Settings > General). */
export const NUMBER_FORMAT = {
    key: "graphty.numberFormat.v1",
    values: ["system", "period", "comma", "space"],
    fallback: "system",
} as const;

/** Single-key shortcuts, WCAG 2.1.4 (Settings > Accessibility and input). */
export const SINGLE_KEY_SHORTCUTS = {
    key: "graphty.singleKeyShortcuts.v1",
    values: ["on", "off"],
    fallback: "on",
} as const;

/** One preference: where it is kept, what it may hold, and its default. */
interface Preference<T extends string> {
    readonly key: string;
    readonly values: readonly T[];
    readonly fallback: T;
}

/**
 * Reads a preference.
 * @param preference - the preference.
 * @returns its stored value, or its default.
 */
export function readPreference<T extends string>(preference: Preference<T>): T {
    try {
        const stored = localStorage.getItem(preference.key);
        return preference.values.find((value) => value === stored) ?? preference.fallback;
    } catch {
        return preference.fallback;
    }
}

/**
 * Keeps a preference.
 * @param preference - the preference.
 * @param value - the new value.
 */
export function writePreference<T extends string>(preference: Preference<T>, value: T): void {
    try {
        localStorage.setItem(preference.key, value);
    } catch {
        // Storage blocked: the choice holds for this page view only.
    }
}

/** The assistant may search the web (Settings > AI providers). Off until the reader turns it on. */
export const AI_WEB_SEARCH = {
    key: "graphty.ai.webSearch.v1",
    values: ["off", "on"],
    fallback: "off",
} as const;

/** The assistant may read web pages (Settings > AI providers). */
export const AI_WEB_FETCH = {
    key: "graphty.ai.webFetch.v1",
    values: ["off", "on"],
    fallback: "off",
} as const;

/** The assistant may run code in this page (Settings > AI providers). */
export const AI_IN_PAGE_CODE = {
    key: "graphty.ai.inPageCode.v1",
    values: ["off", "on"],
    fallback: "off",
} as const;

/**
 * When the assistant speaks its answers (Settings > AI providers): never, only in an immersive
 * session, or always. Off until the reader turns it on.
 */
export const AI_SPEAK_ANSWERS = {
    key: "graphty.ai.speakAnswers.v1",
    values: ["off", "vr", "always"],
    fallback: "off",
} as const;

/**
 * How a press of the microphone talks to the assistant (Settings > AI providers): turn by turn, or
 * a live conversation where the provider has one. Turn by turn until the reader chooses live.
 */
export const AI_VOICE_MODE = {
    key: "graphty.ai.voiceMode.v1",
    values: ["turns", "live"],
    fallback: "turns",
} as const;

/**
 * The provider that turns the reader's speech into text when the chat provider cannot
 * (Settings > AI providers); `none` leaves it to the browser alone.
 */
export const AI_TRANSCRIPTION = {
    key: "graphty.ai.transcription.v1",
    values: ["none", "openai", "anthropic", "google", "webllm", "mock"],
    fallback: "none",
} as const;

/**
 * The model the assistant uses with one provider, and its options (Settings > AI providers). Each
 * absent field is the provider's own default, which graphty-element applies when nothing is set.
 */
export interface AiModelChoice {
    readonly model?: string;
    readonly temperature?: number;
    readonly reasoningEffort?: AiReasoningEffort;
    readonly thinkingBudgetTokens?: number;
}

/** Each provider's model choice, by provider id. */
export type AiModelChoices = Readonly<Partial<Record<AiProviderId, AiModelChoice>>>;

/** Where the model choices are kept. */
const AI_MODEL_CHOICES_KEY = "graphty.ai.modelChoices.v1";

/**
 * One stored choice, with every field that is not what it should be left out.
 * @param stored - what storage held for one provider.
 * @returns the choice.
 */
function modelChoiceFrom(stored: unknown): AiModelChoice {
    if (typeof stored !== "object" || stored === null) {
        return {};
    }

    const { model, temperature, reasoningEffort, thinkingBudgetTokens } = stored as Record<string, unknown>;
    const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
    return {
        ...(typeof model === "string" && model !== "" && { model }),
        ...(finite(temperature) && { temperature }),
        ...(AI_REASONING_EFFORTS.some((effort) => effort === reasoningEffort) && {
            reasoningEffort: reasoningEffort as AiReasoningEffort,
        }),
        ...(finite(thinkingBudgetTokens) && { thinkingBudgetTokens }),
    };
}

/**
 * Reads the reader's model choices.
 * @returns each provider's choice; none where storage is blocked or holds something unknown.
 */
export function readAiModelChoices(): AiModelChoices {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(AI_MODEL_CHOICES_KEY) ?? "{}");
        if (typeof stored !== "object" || stored === null) {
            return {};
        }

        return Object.fromEntries(
            AI_PROVIDER_IDS.flatMap((id) =>
                id in stored ? [[id, modelChoiceFrom((stored as Record<string, unknown>)[id])]] : [],
            ),
        );
    } catch {
        return {};
    }
}

/**
 * Keeps the reader's model choices.
 * @param choices - each provider's choice.
 */
export function writeAiModelChoices(choices: AiModelChoices): void {
    try {
        localStorage.setItem(AI_MODEL_CHOICES_KEY, JSON.stringify(choices));
    } catch {
        // Storage blocked: the choice holds for this page view only.
    }
}
