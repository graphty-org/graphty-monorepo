/**
 * The writer the Which pickers use: one undo step per finished change to a style layer.
 */

import type { GraphSession, HistoryStepId, LayerPatch } from "@graphty/graphty-element/session";
import { useRef } from "react";

import { hasPendingEdit, isTypingTarget } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";

/** The notice a layer's refused rule leaves. */
const RULE_REFUSED = "That rule could not be used for this layer";

/**
 * Writes several layers, one undo step per finished change: a number typed and committed, a handle
 * dragged, a match picked. Typing that writes as it goes (a text card's words) is one step while
 * focus stays in that box: each keystroke merges into the step its first one recorded
 * (`TransactionOptions.after`) while it is still the newest. Writes go one at a time, and a write
 * waiting behind another is replaced by a newer one.
 * @param session - the element's session.
 * @param label - the step's label.
 * @param landed - called after each write has landed (or been refused).
 * @returns the writer, and whether a write is on its way.
 */
export function useStepWriter(
    session: GraphSession,
    label: string,
    landed: () => void,
): { write: (patches: readonly LayerPatch[]) => void; busy: () => boolean } {
    const { store } = useWorkspace();
    const step = useRef<HistoryStepId | undefined>(undefined);
    const chain = useRef<Promise<void>>(Promise.resolve());
    const waiting = useRef<{ patches: readonly LayerPatch[]; merge: boolean } | null>(null);
    const pending = useRef(0);
    // The box whose typing the last step holds: typing on in it merges, anything else starts a step.
    const typingIn = useRef<Element | null>(null);
    return {
        busy: () => pending.current > 0,
        write: (patches) => {
            const active = document.activeElement;
            const typing = isTypingTarget(active) && hasPendingEdit(active) ? active : null;
            const merge = typing !== null && typing === typingIn.current;
            typingIn.current = typing;
            const queued = waiting.current;
            // A write that replaces a queued one starts a step when either would have.
            waiting.current = { patches, merge: merge && (queued?.merge ?? true) };
            if (queued !== null) {
                return;
            }
            pending.current += 1;
            chain.current = chain.current
                .then(async () => {
                    const next = waiting.current;
                    waiting.current = null;
                    if (next === null) {
                        return;
                    }
                    const after = next.merge ? step.current : undefined;
                    await session.transaction(
                        label,
                        (tx) => tx.styles.updateMany(next.patches),
                        after === undefined ? {} : { after },
                    );
                    step.current = after ?? session.history.steps[session.history.position - 1]?.id;
                })
                .then(() => {
                    // A rule the layer took clears the notice a refused one left.
                    if (store.get().notice?.message === RULE_REFUSED) {
                        store.set({ notice: null });
                    }
                })
                .catch(() => {
                    store.set({ notice: { message: RULE_REFUSED, error: true } });
                })
                .finally(() => {
                    landed();
                    pending.current -= 1;
                });
        },
    };
}
