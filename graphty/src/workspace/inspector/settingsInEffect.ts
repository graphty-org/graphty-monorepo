import type { GraphSession, GraphSettingKey } from "@graphty/graphty-element/session";

/** The graph settings this panel draws a row for, by the element's key, with each row's name. */
export const SHOWN_SETTINGS: Readonly<Partial<Record<GraphSettingKey, string>>> = {
    lighting: "Lighting",
    "node.depthIndependentSize": "Same size at any depth",
    "node.outlineWidth": "Outline width",
};

/**
 * The settings this panel draws that change nothing in the current view, by the element's
 * `config.inEffect`: the app never decides on its own which view ignores a setting.
 * @param session - the element's session.
 * @returns the keys.
 */
export function settingsNotInEffect(session: GraphSession): GraphSettingKey[] {
    return (Object.keys(SHOWN_SETTINGS) as GraphSettingKey[]).filter((key) => !session.config.inEffect(key).inEffect);
}
