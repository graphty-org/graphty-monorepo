/**
 * @file The one policy that turns a finished run into a picture.
 *
 * A capability must not produce two pictures depending on which route the reader took. The Insights
 * card, the panel, the palette, the console, an agent's tool call and a bare `runs.start()` all end
 * at the same session, so the decision "does this run paint, and with what" is made HERE, once,
 * rather than at each of those doors. A consumer that wants the numbers without the picture says
 * `{ style: false }`; there is no second way in and therefore no second answer.
 *
 * THE RULES, ALL SIX OF THEM:
 *
 * - **A run paints on its FIRST completion, and never again.** A re-run keeps its id, so it keeps
 *   its layers too -- repainting would stack a second copy on the one already bound to it. Whether
 *   a run has had that moment is kept on its entry in the `runs` slice (`RunEntry.painted`), so an
 *   undo that takes the run away takes the moment with it, and a redo brings both back.
 * - **A layer somebody wrote by hand wins.** If an authored layer already drives the channel a
 *   suggestion would paint on EVERY element, the suggestion is dropped rather than painted over
 *   the decision. One that names only some elements -- a node coloured by hand -- is a decision
 *   about those elements alone: the suggestion still paints, placed beneath the lowest authored
 *   layer driving its channel, so last-writer-wins keeps the reader's choice where they made it
 *   and the run paints the rest. The element's own base layers are not authored and do not
 *   suppress anything, or nothing would ever paint.
 * - **A batch paints once, not once per member.** A sweep of six node metrics would otherwise add
 *   six colour layers, five of them invisible under the sixth and every one of them in the legend.
 *   Suggestions are held while a batch is in flight and coalesced per channel on release, keeping
 *   the one that would have ended up on top -- so the picture is the same as running the six by
 *   hand, without the five dead layers.
 * - **An explicit `encode()` replaces the derived layer rather than stacking on it.** That rule is
 *   `styles.encode()`'s own, which is exactly why a suggestion is applied as the same command a
 *   consumer's call dispatches (see {@link suggestionCommand}) instead of adding layers by another
 *   door: a stranger who runs an algorithm and then colours by it gets one layer and one legend
 *   block, in the place the derived layer already had.
 * - **A highlight is exclusive**, likewise enforced by `styles.highlight()`: a second route or
 *   chosen set replaces the first.
 * - **`{ style: false }` opts out**, and a run that failed, was cancelled or has nothing per
 *   element to paint suggests nothing in the first place.
 *
 * WHERE THE LAYERS GO. This policy only decides; the runs API plans what it decides into the run's
 * own step, in the synchronous tail that records the run, so the run, its result and its layers are
 * one step and one undo (design/undo/undo-design.md section 4.7). A batch's decisions are held and
 * planned into the batch's step when it is released.
 *
 * WHAT THIS DOES NOT DO. It never removes a layer, never disables one, and never paints an element
 * a run measured nothing about: what a suggestion becomes is decided by {@link suggestStyles} and
 * applied as an encoding or a highlight, both of which scope the layer to the elements carrying
 * that run's value. Dimming the rest is a reader's choice and is not made here.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, RunId } from "../../catalog/types";
import type { StyleCommand } from "../commands/style";
import type { RunRef } from "../results/types";
import type { RunPainting, RunStatus, RunStyle, SuggestionOutcome } from "../runs/types";
import { type StyleSuggestion, suggestStyles } from "./derive";
import type { EncodingRun } from "./EncodingSpec";
import type { Layer } from "./Layer";

// ---------------------------------------------------------------------------------------------
// What the policy talks to
// ---------------------------------------------------------------------------------------------

/** The stack, as the policy reads it: what is in it, so an authored layer can win. */
export interface AutoApplyStyles {
    /**
     * Every layer in the stack, bottom first.
     * @returns The layers.
     */
    list(): readonly Layer[];
}

/**
 * What the policy needs to know about a finished run: what it suggests, plus whether to listen.
 *
 * A `Run` satisfies this as it stands -- the policy asks what the run already publishes about
 * itself, and holds no opinion of its own about any algorithm.
 */
export interface AutoApplyRun extends EncodingRun {
    /** Where the run got to. Only a run that succeeded has anything to paint. */
    readonly status: RunStatus;
    /** Whether the caller let the element paint this run at all, and whether to size by it too. */
    readonly style: RunStyle;
}

/** Everything the policy is built from. */
export interface AutoApplySources {
    /**
     * The stack to paint into, read late.
     *
     * A thunk because the session builds its runs before its style stack, and because a session
     * with no stack at all is a legitimate thing: it answers with numbers and paints nothing.
     * @returns The stack, or undefined when this session has none.
     */
    readonly styles: () => AutoApplyStyles | undefined;
    /**
     * Called when applying a suggestion was refused.
     *
     * The defect this whole system replaces was silent: a style that failed to apply left the
     * picture looking like an answer. The run is still recorded without the refused layer, and
     * the refusal arrives here instead of at a caller who did not ask for the layer.
     * @param runId - The run whose suggestion was refused.
     * @param error - Why.
     */
    readonly onProblem?: (runId: RunId, error: unknown) => void;
}

/** What releasing a batch's hold decided. */
interface PaintRelease {
    /**
     * What to paint: one suggestion per channel, keeping the member that would have ended up on
     * top, minus what an authored layer already drives.
     */
    readonly paint: readonly StyleSuggestion[];
    /** What became of every other held suggestion: superseded by a sibling, or suppressed. */
    readonly settled: readonly SuggestionOutcome[];
    /** Every run whose decision waited on this hold, in the order they finished. */
    readonly members: readonly RunId[];
}

/** A batch's suggestions, held until the batch is released. */
export interface PaintHold {
    /**
     * Stop holding.
     * @returns What was decided; nothing on a second release.
     */
    release(): PaintRelease;
}

/** What the policy decided about one finished run. */
interface PaintDecision {
    /** Whether the run has now had its first-completion moment: `RunEntry.painted`. */
    readonly painted: boolean;
    /** What to plan into the run's step now; empty when held or when there is nothing to paint. */
    readonly paint: readonly StyleSuggestion[];
    /**
     * Where the decision stands, with the suggestions it held back. The caller adds an outcome
     * for each of `paint`. Undefined when the run had its moment already and keeps that decision.
     */
    readonly painting?: RunPainting;
}

/** The policy, as whoever records a finished run calls it. */
export interface AutoApplyPolicy {
    /**
     * A run reached the end of its life. Decide whether this is the moment it paints.
     * @param run - The run that finished.
     * @param painted - Whether it had its moment already: the `painted` flag of the entry its
     * record replaces.
     * @param hold - The batch holding it, whose release paints it instead.
     * @returns The decision.
     */
    completed(run: AutoApplyRun, painted: boolean, hold?: PaintHold): PaintDecision;
    /**
     * Hold a batch's painting until the hold is released.
     * @returns The hold.
     */
    hold(): PaintHold;
    /**
     * Report a suggestion the stack refused.
     * @param runId - The run.
     * @param error - Why.
     */
    refused(runId: RunId, error: unknown): void;
}

// ---------------------------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------------------------

/** The layer sources that are somebody's decision rather than the element's derivation. */
const AUTHORED: readonly string[] = Object.freeze(["user", "template", "plugin"]);

/** Nothing to paint. */
const NOTHING: readonly StyleSuggestion[] = Object.freeze([]);

/** No outcomes. */
const NO_OUTCOMES: readonly SuggestionOutcome[] = Object.freeze([]);

/** A second release of one hold. */
const RELEASED: PaintRelease = Object.freeze({ paint: NOTHING, settled: NO_OUTCOMES, members: Object.freeze([]) });

/**
 * A decision with no suggestions in it.
 * @param state - Where it stands.
 * @returns The decision.
 */
export function bare(state: RunPainting["state"]): RunPainting {
    return Object.freeze({ state, suggestions: NO_OUTCOMES });
}

/**
 * What two suggestions have to agree on to be the same picture.
 *
 * Highlights share one key however many halves they paint, because the stack holds one highlight
 * at a time whatever produced it. An encoding is keyed by the channel it paints, so a run that
 * colours nodes and a run that colours edges both survive a batch while two runs that colour the
 * same nodes do not.
 * @param suggestion - The suggestion.
 * @returns The key.
 */
function coalesceKey(suggestion: StyleSuggestion): string {
    return suggestion.as === "highlight" ? "highlight" : suggestion.channels.join(",");
}

/**
 * Whether a layer somebody wrote is painting one of these channels.
 *
 * The element's own layers are excluded and so are the layers a run produced: the base layer
 * paints a colour on every node, so counting it would suppress every suggestion there will ever
 * be, and a layer derived from an earlier run is this policy's own work rather than a decision to
 * be protected. A disabled layer paints nothing and therefore drives nothing.
 * @param layer - The layer.
 * @param channels - The channels a suggestion would paint.
 * @returns True when it is authored, enabled and drives one of them.
 */
export function authoredDriving(layer: Layer, channels: readonly Channel[]): boolean {
    if (!layer.enabled || !AUTHORED.includes(layer.source.by)) {
        return false;
    }

    return channels.some((channel) => layer.encode?.[channel] !== undefined || layer.set?.[channel] !== undefined);
}

/**
 * The authored layer that already drives one of these channels on every element, so a
 * suggestion beneath it could never show.
 * @param layers - The stack.
 * @param channels - The channels the suggestion would paint.
 * @returns That layer, or undefined when the suggestion may paint.
 */
function authoredCovering(layers: readonly Layer[], channels: readonly Channel[]): Layer | undefined {
    return layers.find((layer) => layer.selector.match === "everything" && authoredDriving(layer, channels));
}

/**
 * Where an auto-applied layer goes: immediately beneath the lowest authored layer that drives
 * one of its channels, so a decision somebody made about some elements stays on top of the run's
 * picture of all of them. The top of the stack when no authored layer drives them.
 * @param layers - The stack, bottom first.
 * @param channels - The channels the new layer paints.
 * @returns The index to insert at, bottom first.
 */
export function beneathAuthored(layers: readonly Layer[], channels: readonly Channel[]): number {
    const at = layers.findIndex((layer) => authoredDriving(layer, channels));

    return at === -1 ? layers.length : at;
}

/**
 * A run reference as the id a command carries.
 * @param ref - The reference.
 * @returns The id.
 */
export function idOf(ref: RunRef): RunId {
    if (typeof ref === "string") {
        return ref;
    }

    return "runId" in ref ? ref.runId : ref.id;
}

/**
 * The command a suggestion is applied as: the one `styles.encode()` or `styles.highlight()`
 * dispatches for the same specification, so the replacement and exclusivity rules of those verbs
 * hold for it too.
 * @param suggestion - The suggestion.
 * @param auto - True when this policy decided it, which places it beneath authored layers (see
 *     {@link beneathAuthored}); false when a caller asked for it outright, which puts it on top.
 * @returns The style command.
 */
export function suggestionCommand(suggestion: StyleSuggestion, auto = false): StyleCommand {
    const placement = auto ? { beneathAuthored: true } : {};

    return suggestion.as === "highlight"
        ? {
              op: "style.patch",
              action: "highlight",
              spec: { ...suggestion.spec, run: idOf(suggestion.spec.run) },
              ...placement,
          }
        : { op: "style.encode", spec: { ...suggestion.spec, run: idOf(suggestion.spec.run) }, ...placement };
}

// ---------------------------------------------------------------------------------------------
// The policy
// ---------------------------------------------------------------------------------------------

/**
 * Build the policy one session decides its runs' styling with.
 * @param sources - The stack to read, and where a refusal is reported.
 * @returns The policy.
 */
export function createAutoApplyPolicy(sources: AutoApplySources): AutoApplyPolicy {
    /** Every hold still open: each suggestion handed to it in order, and the runs that waited. */
    const held = new WeakMap<PaintHold, { suggestions: StyleSuggestion[]; members: RunId[] }>();

    /**
     * Drop what an authored layer already drives on every element, reading the stack once: a
     * suggestion is suppressed by a decision somebody had already made, never by a layer the
     * suggestion beside it is about to add.
     * @param suggestions - The candidates.
     * @returns What to paint, and an outcome for each suggestion dropped.
     */
    const unsuppressed = (
        suggestions: readonly StyleSuggestion[],
    ): { paint: readonly StyleSuggestion[]; suppressed: SuggestionOutcome[] } => {
        const styles = sources.styles();

        if (suggestions.length === 0 || styles === undefined) {
            return { paint: NOTHING, suppressed: [] };
        }

        const stack = styles.list();
        const paint: StyleSuggestion[] = [];
        const suppressed: SuggestionOutcome[] = [];

        for (const suggestion of suggestions) {
            const holder = authoredCovering(stack, suggestion.channels);

            if (holder === undefined) {
                paint.push(suggestion);
            } else {
                suppressed.push(Object.freeze({ outcome: "suppressed", suggestion, byLayerId: holder.id }));
            }
        }

        return { paint: Object.freeze(paint), suppressed };
    };

    return {
        completed(run: AutoApplyRun, painted: boolean, hold?: PaintHold): PaintDecision {
            // A re-run keeps its id -- so a run that already had its moment keeps the layers it
            // already has, and the decision that made them.
            if (painted) {
                return { painted, paint: NOTHING };
            }

            // A cancel and a failure have no result to paint.
            if (run.status !== "succeeded") {
                return { painted, paint: NOTHING, painting: bare("not-succeeded") };
            }

            if (!run.style) {
                return { painted, paint: NOTHING, painting: bare("opted-out") };
            }

            if (sources.styles() === undefined) {
                return { painted: true, paint: NOTHING, painting: bare("no-styles") };
            }

            // Had whether or not anything is painted. The moment a run first completes is the
            // moment the policy had, and coming back to it later -- after a reader has arranged
            // the stack -- would repaint a picture they had already decided about.
            const suggestions = suggestStyles(run, run.style);
            const pending = hold === undefined ? undefined : held.get(hold);

            if (pending === undefined) {
                const { paint, suppressed } = unsuppressed(suggestions);

                return {
                    painted: true,
                    paint,
                    painting: Object.freeze({ state: "decided", suggestions: Object.freeze(suppressed) }),
                };
            }

            pending.suggestions.push(...suggestions);
            pending.members.push(run.id);

            return { painted: true, paint: NOTHING, painting: bare("pending") };
        },

        hold(): PaintHold {
            const hold: PaintHold = {
                release: () => {
                    const pending = held.get(hold);
                    held.delete(hold);

                    if (pending === undefined) {
                        return RELEASED;
                    }

                    // The member that finished last replaces the one before it on the same channel.
                    const top = new Map<string, StyleSuggestion>();

                    for (const suggestion of pending.suggestions) {
                        top.set(coalesceKey(suggestion), suggestion);
                    }

                    const winners = new Set(top.values());
                    const superseded: SuggestionOutcome[] = pending.suggestions
                        .filter((suggestion) => !winners.has(suggestion))
                        .map((suggestion) =>
                            Object.freeze({
                                outcome: "superseded",
                                suggestion,
                                byRunId: idOf((top.get(coalesceKey(suggestion)) ?? suggestion).spec.run),
                            }),
                        );
                    const { paint, suppressed } = unsuppressed([...winners]);

                    return Object.freeze({
                        paint,
                        settled: Object.freeze([...superseded, ...suppressed]),
                        members: Object.freeze([...pending.members]),
                    });
                },
            };
            held.set(hold, { suggestions: [], members: [] });

            return hold;
        },

        refused(runId: RunId, error: unknown): void {
            sources.onProblem?.(runId, error);
        },
    };
}
