/**
 * Whether the legend CAN be drawn at all, and the one sentence that says why it cannot.
 *
 * THE DEFECT THIS MODULE CLOSES. The owner's report was "the legend doesn't show up,
 * even when checked". It was not a rendering bug: legend VISIBILITY and legend CONTENT
 * are two independent facts, and only one of them had a control.
 *
 * - `canvasLayout.isLegendDrawn(visible, encodedChannelCount, state)` (canvasLayout.ts:297)
 *   requires `encodedChannelCount > 0`, and `Legend.tsx` returns `null` outright on
 *   `channels.length === 0`.
 * - The channel count comes from the shell's `legendChannels`, which is empty until a
 *   `colourChannel` exists, and `colourChannel` starts null and is set ONLY by an
 *   algorithm run that actually PAINTED an encoding. Nothing about LOADING a graph paints
 *   a colour encoding -- the 7.2 size-and-colour load defaults were reverted on
 *   2026-09-13 in favour of the element's own defaults, as `legendChannels.ts` records in
 *   full.
 * - Meanwhile the control was a plain remembered boolean defaulting to `true`
 *   (`canvasMemory.ts`), drawn checked in the Views menu and as a "Show legend" switch in
 *   the Style panel, with L bound to flip it.
 *
 * So across the whole novice path -- load a graph, open Views -- three controls reported
 * "on" while the legend could not exist. That is a 6.14 violation ("whether a control
 * shows the state it is in", design line 6633), and the reader's only reading of it is
 * "the app is broken".
 *
 * WHY THE FIX IS ON THE CONTROL AND NOT AN EMPTY LEGEND BOX. Drawing a legend that says
 * "nothing is encoded" was the obvious alternative and it is forbidden twice over: design
 * lines 206-213 (floor item 5, 6.10) and build spec 01 section 9 both say a channel with
 * no encoding renders NO block and with nothing encoded the legend does not render at
 * all, and 6.2 forbids the empty surface. The honest fix is the pattern the design
 * catalogue already fixes at line 6641 for a disabled control: it keeps its place and its
 * word, drops to DISABLED ink, and carries its ONE reason appended to its own title after
 * a full stop -- exactly as "Export. Load data first" and "Note. Select something first"
 * already do in this shell.
 *
 * THE SIX CONDITIONS where the box is checked and the legend still does not appear. Every
 * one of them is a state a reader can reach, which is why the reason has to be a real
 * control state rather than a comment:
 *
 * (a) Any time before the session's FIRST painting run -- the common case straight after
 *     a load, and the one the owner hit.
 * (b) After a dataset boundary: loading another graph clears `colourChannel`, because the
 *     encoding described the nodes that just left.
 * (c) After "Undo the layers" or "Remove result", both of which remove the very layers
 *     the legend was describing.
 * (d) After a run whose encoding was NOT applied, because a hand-authored style layer
 *     already drives node colour: `legendChannels.ts` has both builders return `null` on
 *     `encodingApplied === false`, so the result card draws its un-applied form, the
 *     canvas paints nothing and the legend names nothing. A run happened and there is
 *     still no encoding.
 * (e) With the data table drawer maximised to Table, by design -- `isLegendDrawn` refuses
 *     while `drawerMaximised`, because there is no canvas left to annotate.
 * (f) Below 1280 px. HISTORICALLY the legend rendered there and was painted over by the
 *     inspector overlay (both region overlays sit in the body row's own stacking context
 *     at z-index 8 and 15, above the legend's 6). Under the product owner's decision of
 *     2026-09-14 the shell does not lay out below 1280 px at all -- it renders a "screen
 *     too small" state -- so there is no canvas and no legend to cover. Either way the
 *     box is checked and no legend reaches the reader's eye.
 *
 * Conditions (a) to (d) are what {@link legendAvailable} reports. (e) and (f) are layout
 * facts that `canvasLayout` and the shell decide, and they are deliberately NOT folded in
 * here: this module answers "is there anything to draw", not "is there room to draw it",
 * and mixing the two would have the Views row blame an empty encoding for a maximised
 * drawer.
 *
 * ONE constant for the sentence, because the Views menu row, the Style panel switch and
 * that switch's title all print it. Three copies would drift the moment one of them is
 * reworded, and the reader would then get two different explanations for one state.
 */

/**
 * The one reason a legend control gives when nothing is encoded.
 *
 * No trailing full stop: floor item 4 has the reason appended to a control's own title
 * AFTER a full stop ("Show legend (L). Nothing is encoded yet"), so the caller supplies
 * the stop that precedes it and a stop here would end the title with two. In the Views
 * menu it is drawn as the row's second line, where a sentence fragment is the house form
 * (the XR readiness line beside it carries no stop either).
 *
 * ASCII only, per the house rule: no ellipsis character, no curly apostrophe.
 * @public
 */
export const LEGEND_EMPTY_REASON = "Nothing is encoded yet";

/**
 * Whether the legend has anything to draw.
 *
 * Pure and trivial on purpose. The value of it is not the comparison -- it is that the
 * Views menu row, the Style panel switch and the shell's L binding all ask ONE function,
 * so they cannot disagree about whether the legend exists. Before this, each of the three
 * simply read the remembered boolean and reported "on" independently of the encoding.
 *
 * A count of zero, a negative count and `NaN` all answer `false`, so a caller that has
 * not measured its channels yet is told "not available" rather than promising a legend
 * that will not appear.
 * @param encodedChannelCount - how many channels the shell actually painted, i.e. the
 * length of the legend's channel list. Zero whenever no algorithm run has applied an
 * encoding, which is conditions (a) to (d) in this module's own header.
 * @returns true when at least one channel is encoded and the legend can therefore render.
 * @public
 */
export function legendAvailable(encodedChannelCount: number): boolean {
    return encodedChannelCount > 0;
}
