import type { LabelStyle } from "@graphty/graphty-element/schema";

/**
 * The card look the app gives a label when the reader picks Card: a white rounded panel with a
 * border and a shadow, left-aligned text sized on screen, kept in view and over the graph, with
 * an x that clears the selection. The app's own choice of look; graphty-element only draws it.
 */
export const CARD_LOOK = {
    background: "#ffffff",
    color: "#14161f",
    cornerRadius: 24,
    borderWidth: 2,
    borderColor: "#c5cad6",
    padding: 16,
    textAlign: "left",
    sizeMode: "screen",
    sizePx: 14,
    panelShadow: true,
    keepInView: true,
    closeButton: true,
    onTop: true,
} as const satisfies LabelStyle;

/**
 * Whether a label is drawn as a card: it has a panel behind it.
 * @param style - the label's style.
 * @returns true for a card.
 */
export function isCard(style: LabelStyle): boolean {
    return style.background !== undefined;
}

/**
 * A label style with the card look taken off, everything else kept.
 * @param style - the label's style.
 * @returns the plain style.
 */
export function plainLook(style: LabelStyle): LabelStyle {
    return Object.fromEntries(Object.entries(style).filter(([key]) => !(key in CARD_LOOK)));
}
