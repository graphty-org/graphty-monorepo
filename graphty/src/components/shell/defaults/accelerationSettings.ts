/**
 * What the reader chose about GPU acceleration, and nothing else.
 *
 * graphty-element takes the choice as its `acceleration` attribute -- "auto", "off" or
 * "required" -- and applies it the moment it is written, but it never remembers it: the
 * element's own `acceleration` accessor says so in as many words ("This is a session
 * setting and the element never persists it. Remembering that a reader switched
 * acceleration off, and restoring the choice on their next visit, is the host
 * application's storage", `graphty-element/src/graphty-element.ts`). This module is that
 * storage, and it is the whole of the app's part in acceleration: it decides nothing
 * about the GPU, it only remembers a word and hands it back.
 *
 * The read, the write and the resolve copy {@link readPersistedLabelSettings} and its two
 * neighbours field for field -- a versioned key so a shape change becomes a missing key
 * rather than a corrupt read, a try/catch round the store (private mode and disabled site
 * data throw), `JSON.parse` in its own try, non-objects and arrays refused, and the one
 * field validated on its own.
 *
 * The key is its own rather than a second field in `graphty.shell.labels.v1`, because
 * these two records are written by different owners at different moments -- the label
 * pane writes its own, the shell writes this one on every click of the acceleration
 * control -- and a shared record means one bad write costs both.
 *
 * The default is the ELEMENT's default, imported rather than spelled: an app-side "auto"
 * would be a copy of the element's initialiser, free to disagree with it the day the
 * element changes its mind.
 */

import {
    ACCELERATION_POLICY_DEFAULT,
    type AccelerationPolicy,
    isAccelerationPolicy,
} from "@graphty/graphty-element/session";

/**
 * Versioned local-storage key for the reader's acceleration policy.
 *
 * Separate from `graphty.shell.labels.v1`: see this module's header.
 */
export const ACCELERATION_SETTINGS_STORAGE_KEY = "graphty.shell.acceleration.v1";

/**
 * The acceleration setting Settings > Performance owns.
 * @public
 */
export interface PersistedAccelerationSettings {
    /** The policy written on the element's `acceleration` attribute. */
    readonly policy: AccelerationPolicy;
}

/** What a reader who has chosen nothing gets: the element's own default policy. */
export const DEFAULT_ACCELERATION_SETTINGS: PersistedAccelerationSettings = {
    policy: ACCELERATION_POLICY_DEFAULT,
};

/**
 * Reads the reader's acceleration policy, surviving an absent key, an unreadable store
 * (private mode, disabled site data), malformed JSON and a value of the wrong shape.
 *
 * A stored policy is kept only when the element still accepts it, so a word retired
 * between releases costs the field rather than the record.
 * @returns whatever of the stored settings could be trusted.
 */
export function readPersistedAccelerationSettings(): Partial<PersistedAccelerationSettings> {
    let raw: string | null = null;

    try {
        raw = window.localStorage.getItem(ACCELERATION_SETTINGS_STORAGE_KEY);
    } catch {
        return {};
    }

    if (raw === null || raw === "") {
        return {};
    }

    let parsed: unknown = null;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return {};
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
    }

    const record = parsed as Record<string, unknown>;

    if (!isAccelerationPolicy(record.policy)) {
        return {};
    }

    return { policy: record.policy };
}

/**
 * Writes the reader's acceleration policy. A full or unavailable store is not an error
 * the shell can act on: the choice simply does not survive the session.
 * @param settings - the settings to remember.
 */
export function writePersistedAccelerationSettings(settings: PersistedAccelerationSettings): void {
    try {
        window.localStorage.setItem(ACCELERATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Deliberately ignored: see the JSDoc above.
    }
}

/**
 * The settings to work from: whatever of the stored record the element still accepts, and
 * the default for everything else.
 *
 * Validated rather than spread over the defaults, unlike {@link resolveLabelSettings}:
 * object spread copies a key whose VALUE is `undefined`, so `{ ...DEFAULT, ...{ policy:
 * undefined } }` would be `{ policy: undefined }` and the element would be handed
 * nothing at all.
 * @param persisted - the result of {@link readPersistedAccelerationSettings}.
 * @returns a complete settings record.
 */
export function resolveAccelerationSettings(
    persisted: Partial<PersistedAccelerationSettings>,
): PersistedAccelerationSettings {
    return {
        policy: isAccelerationPolicy(persisted.policy) ? persisted.policy : DEFAULT_ACCELERATION_SETTINGS.policy,
    };
}
