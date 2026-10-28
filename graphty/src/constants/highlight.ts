/**
 * The color of the element's highlight layers (`session.styles.highlight`). Handed to
 * graphty-element once per session with `session.styles.setHighlightColor`; the element's own
 * default stays its neutral indigo. A finished run's route or chosen set is not a highlight: the
 * element paints it as ordinary layers in its own result color, so algorithm pictures stack.
 *
 * Deep aubergine, chosen to belong to no palette the element offers, so a route never reads as
 * one more group. Measured in OKLab (Delta E x100) on a lit node's three tones (0.55, 0.875 and
 * 1.2 times the color): 22, 31 and 37 from the default node #6366F1 (the element's #0000AA: 17,
 * 24 and 28, which study participants took for ordinary nodes) and 20, 27 and 33 from the
 * default group palette's black, which the earlier black route matched exactly. Flat, it is 29
 * from the nearest default group color, 26 under protanopia and deuteranopia, and 15:1 against
 * the background.
 */
export const APP_HIGHLIGHT_COLOR = "#330055";
