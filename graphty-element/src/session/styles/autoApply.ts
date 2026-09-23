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
 *   its layers too -- repainting would stack a second copy on the one already bound to it.
 * - **A layer somebody wrote by hand wins.** If an authored layer already drives the channel a
 *   suggestion would paint, the suggestion is dropped rather than painted over the decision. The
 *   element's own base layers are not authored and do not suppress anything, or nothing would ever
 *   paint.
 * - **A batch paints once, not once per member.** A sweep of six node metrics would otherwise add
 *   six colour layers, five of them invisible under the sixth and every one of them in the legend.
 *   Suggestions are held while a batch is in flight and coalesced per channel on release, keeping
 *   the one that would have ended up on top -- so the picture is the same as running the six by
 *   hand, without the five dead layers.
 * - **An explicit `encode()` replaces the derived layer rather than stacking on it.** That rule is
 *   `styles.encode()`'s own, which is exactly why this policy applies suggestions THROUGH the same
 *   verb a consumer calls instead of adding layers by another door: a stranger who runs an
 *   algorithm and then colours by it gets one layer and one legend block, in the place the derived
 *   layer already had.
 * - **A highlight is exclusive**, likewise enforced by `styles.highlight()`: a second route or
 *   chosen set replaces the first.
 * - **`{ style: false }` opts out**, and a run that failed, was cancelled or has nothing per
 *   element to paint suggests nothing in the first place.
 *
 * WHAT THIS DOES NOT DO. It never removes a layer, never disables one, and never paints an element
 * a run measured nothing about: what a suggestion becomes is decided by {@link suggestStyles} and
 * applied by the two verbs, both of which scope the layer to the elements carrying that run's
 * value. Dimming the rest is a reader's choice and is not made here.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, RunId } from "../../catalog/types";
import type { RunStatus, RunStyle } from "../runs/types";
import { type StyleSuggestion, suggestStyles } from "./derive";
import type { EncodingRun, EncodingSpec } from "./EncodingSpec";
import type { Layer } from "./Layer";
import type { HighlightSpec } from "./StylesApi";

// ---------------------------------------------------------------------------------------------
// What the policy talks to
// ---------------------------------------------------------------------------------------------

/**
 * The stack, as the policy needs it: what is in it, and the two verbs that bind a run to it.
 *
 * Narrow on purpose. A policy that held the whole styles API could add, move and remove layers,
 * and the reason it applies a suggestion through `encode()` rather than through `add()` is that
 * `encode()` carries the replacement rule and the generated selector. Taking only the two verbs is
 * what makes going around them impossible rather than merely discouraged.
 */
export interface AutoApplyStyles {
    /**
     * Every layer in the stack, bottom first.
     * @returns The layers.
     */
    list(): readonly Layer[];
    /**
     * Paint a run's measurement onto a channel.
     * @param spec - The run, the channel and the taste.
     * @returns A run that resolves with the layer.
     */
    encode(spec: EncodingSpec): PromiseLike<unknown>;
    /**
     * Paint the elements a run chose.
     * @param spec - The run, the field that says which elements it chose, and what they look like.
     * @returns A run that resolves with the layers it added.
     */
    highlight(spec: HighlightSpec): PromiseLike<unknown>;
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
     * Optional, and the reason it exists at all is that the defect this whole system replaces was
     * silent: a style that failed to apply left the picture looking like an answer. A host that
     * wires this can say so; a host that does not still never has a refusal reach a consumer's
     * click handler, because applying is fire-and-forget.
     * @param runId - The run whose suggestion was refused.
     * @param error - Why.
     */
    readonly onProblem?: (runId: RunId, error: unknown) => void;
}

/**
 * The policy, as whoever finishes a run calls it.
 *
 * Three verbs, and the middle two are a pair: everything between `hold()` and `release()` is one
 * piece of work as far as painting is concerned.
 */
export interface AutoApplyPolicy {
    /**
     * A run reached the end of its life. Paint it, if this is the moment to.
     * @param run - The run that finished.
     */
    completed(run: AutoApplyRun): void;
    /** Hold painting until the matching {@link AutoApplyPolicy.release}. Nests. */
    hold(): void;
    /** Release one hold, painting what was held once the last one is released. */
    release(): void;
    /**
     * Forget that a run has already painted, because the session no longer holds it.
     *
     * Starting the same work again after it was removed is a first completion again: the layers
     * that painted it went with it, so "never again" would leave a run that nothing can draw.
     * @param runId - The run that was removed.
     */
    forget(runId: RunId): void;
}

// ---------------------------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------------------------

/** The layer sources that are somebody's decision rather than the element's derivation. */
const AUTHORED: readonly string[] = Object.freeze(["user", "template", "plugin"]);

/** One suggestion waiting to be painted, and the run it came from. */
interface Pending {
    /** The run that suggested it, for a refusal that has to name something. */
    readonly runId: RunId;
    /** What it suggests. */
    readonly suggestion: StyleSuggestion;
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
 * Whether a layer somebody wrote is already painting one of these channels.
 *
 * The element's own layers are excluded and so are the layers a run produced: the base layer
 * paints a colour on every node, so counting it would suppress every suggestion there will ever
 * be, and a layer derived from an earlier run is this policy's own work rather than a decision to
 * be protected. A disabled layer paints nothing and therefore drives nothing.
 * @param layers - The stack.
 * @param channels - The channels the suggestion would paint.
 * @returns True when an authored layer already drives one of them.
 */
function authoredDrives(layers: readonly Layer[], channels: readonly Channel[]): boolean {
    return layers.some((layer) => {
        if (!layer.enabled || !AUTHORED.includes(layer.source.by)) {
            return false;
        }

        return channels.some((channel) => {
            const encoded = layer.encode?.[channel];
            const literal = layer.set?.[channel];

            return encoded !== undefined || literal !== undefined;
        });
    });
}

// ---------------------------------------------------------------------------------------------
// The policy
// ---------------------------------------------------------------------------------------------

/**
 * Build the policy one session applies its runs' styling through.
 * @param sources - The stack to paint into, and where a refusal is reported.
 * @returns The policy.
 */
export function createAutoApplyPolicy(sources: AutoApplySources): AutoApplyPolicy {
    /** The runs that have already had their moment, whether or not anything was painted. */
    const painted = new Set<RunId>();
    /** What is waiting for the last hold to be released, newest last. */
    const pending = new Map<string, Pending>();
    let holds = 0;

    /**
     * Apply one suggestion, through the same verb a consumer would have called.
     * @param styles - The stack to paint into.
     * @param entry - The suggestion and the run it came from.
     */
    const apply = (styles: AutoApplyStyles, entry: Pending): void => {
        const { suggestion } = entry;
        const report = (error: unknown): void => {
            sources.onProblem?.(entry.runId, error);
        };
        const edit =
            suggestion.as === "highlight" ? styles.highlight(suggestion.spec) : styles.encode(suggestion.spec);

        // Fire and forget, with the refusal caught: a style edit is a queued run, and the element
        // must not make a consumer await the picture in order to have started the work.
        void edit.then(() => undefined, report);
    };

    /** Paint everything that was held, one edit per channel. */
    const flush = (): void => {
        const entries = [...pending.values()];
        pending.clear();

        const styles = sources.styles();

        if (entries.length === 0 || styles === undefined) {
            return;
        }

        // Read once, before any of these edits lands: a suggestion is suppressed by a decision
        // somebody had already made, never by the layer the entry beside it is about to add.
        const stack = styles.list();

        for (const entry of entries) {
            if (!authoredDrives(stack, entry.suggestion.channels)) {
                apply(styles, entry);
            }
        }
    };

    return {
        completed(run: AutoApplyRun): void {
            // A cancel and a failure have no result to paint, and a re-run keeps its id -- so a
            // run that already had its moment keeps the layers it already has.
            if (run.status !== "succeeded" || !run.style || painted.has(run.id)) {
                return;
            }

            // Marked whether or not anything is painted. The moment a run first completes is the
            // moment the policy had, and coming back to it later -- after a reader has arranged
            // the stack -- would repaint a picture they had already decided about.
            painted.add(run.id);

            for (const suggestion of suggestStyles(run, run.style)) {
                pending.set(coalesceKey(suggestion), { runId: run.id, suggestion });
            }

            if (holds === 0) {
                flush();
            }
        },

        hold(): void {
            holds++;
        },

        release(): void {
            if (holds === 0) {
                return;
            }

            holds--;

            if (holds === 0) {
                flush();
            }
        },

        forget(runId: RunId): void {
            painted.delete(runId);
        },
    };
}
