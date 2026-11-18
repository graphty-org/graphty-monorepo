/**
 * What both Graph settings panels read: the lighting options' words, and the settings that change
 * nothing in the current view.
 */

import type { Lighting } from "@graphty/graphty-element/schema";
import type { GraphSession, GraphSettingKey } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

import { settingsNotInEffect } from "./settingsInEffect";

/** Lighting's options, in the app's words. */
export const LIGHTING_WORDS: Readonly<Record<Lighting, string>> = {
    studio: "Studio",
    headlight: "Headlight",
    matte: "Matte",
    flat: "Flat",
};

/**
 * The settings that change nothing in the current view, held in state and re-read on every
 * project change (the view is project state). Read during render instead, the answer changed only
 * when something else happened to re-render the panel: a render React threw away because its
 * state had not changed still recorded the new keys, so the focus keeper's effect never ran for
 * them and focus fell to the panel's last row.
 * @param session - the element's session, or null.
 * @returns the hidden settings' keys.
 */
export function useNotInEffect(session: GraphSession | null): readonly GraphSettingKey[] {
    const [hidden, setHidden] = useState(() => notInEffectKey(session));
    useEffect(() => {
        const update = (): void => {
            setHidden(notInEffectKey(session));
        };
        update();
        return session?.on("project:changed", update);
    }, [session]);
    return hidden === "" ? [] : (hidden.split(",") as GraphSettingKey[]);
}

/**
 * The hidden settings as one string, so an unchanged answer is an unchanged state.
 * @param session - the element's session, or null.
 * @returns the keys, comma-separated.
 */
function notInEffectKey(session: GraphSession | null): string {
    return session === null ? "" : settingsNotInEffect(session).join(",");
}
