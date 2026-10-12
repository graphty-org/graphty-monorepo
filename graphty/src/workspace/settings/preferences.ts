/**
 * The reader's own preferences from Settings, kept in this browser: never in a project file,
 * never sent anywhere. Each read falls back to its default when storage is blocked or holds
 * something unknown.
 */

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
