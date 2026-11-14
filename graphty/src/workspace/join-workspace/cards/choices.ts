/**
 * Small edits to a step's join choices, as the card's controls make them: each returns new
 * choices, an `undefined` value taking a choice out so graphty-element's default applies.
 */

import type { JoinChoices, JoinKey, JoinStepEntry } from "@graphty/graphty-element/session";

import type { JoinWorkspaceApi } from "../context";

/** A change to some of a step's choices; `undefined` takes a choice out. */
export type ChoicesPatch = { -readonly [K in keyof JoinChoices]?: JoinChoices[K] | undefined };

/**
 * The choices with a patch applied.
 * @param choices - the choices now.
 * @param patch - the change.
 * @returns the new choices.
 */
export function patched(choices: JoinChoices, patch: ChoicesPatch): JoinChoices {
    const next = Object.entries({ ...choices, ...patch }).filter(([, value]) => value !== undefined);
    return Object.fromEntries(next) as unknown as JoinChoices;
}

/**
 * Changes a step's choices in the recipe, as one edit of its history.
 * @param api - the workspace.
 * @param step - the step.
 * @param patch - the change.
 */
export function changeStep(api: JoinWorkspaceApi, step: JoinStepEntry, patch: ChoicesPatch): void {
    api.edit((draft) => {
        draft.change(step.id, { from: step.from, choices: patched(step.choices, patch) });
    });
}

/**
 * A step's keys with one pair replaced.
 * @param keys - the keys now.
 * @param at - the pair's position.
 * @param key - the new pair.
 * @returns the keys.
 */
export function withKey(keys: readonly JoinKey[], at: number, key: JoinKey): readonly JoinKey[] {
    const next = [...keys];
    next[at] = key;
    return next;
}
