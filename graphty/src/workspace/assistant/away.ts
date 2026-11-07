import type { Graphty as GraphtyElement } from "@graphty/graphty-element";

import { goToComposer } from "../assistant-door/commands";
import type { WorkspaceStore } from "../state/store";
import { approvalWords, awayWords, WORDS } from "./words";

/**
 * Whether the reader is away from the Assistant's panel.
 * @param store - the workspace store.
 * @returns true with another place or page open.
 */
export function isAway(store: WorkspaceStore): boolean {
    const { page, place } = store.get();
    return page !== "panels" || place !== "assistant";
}

/** The elements already followed, so setting one up again keeps one watcher. */
const watched = new WeakSet<GraphtyElement>();

/**
 * Follows what waits on the reader, whether or not the panel is open: the rail's dot reads the count,
 * and each new request is spoken, or with the panel closed raises a lasting notice with Open.
 * @param element - the element.
 * @param store - the workspace store.
 */
export function watchWaiting(element: GraphtyElement, store: WorkspaceStore): void {
    if (watched.has(element)) {
        return;
    }
    watched.add(element);
    let said = "";
    let wasAway = isAway(store);
    const sync = (): void => {
        const approval = element.getPendingAiApprovals().at(0);
        const question = element.getPendingAiQuestions().at(0);
        const count = element.getPendingAiApprovals().length + element.getPendingAiQuestions().length;
        const away = isAway(store);
        const state = store.get();
        if (state.assistantWaiting !== count) {
            store.set({ assistantWaiting: count });
        }
        if (state.notice?.lasting === true && (count === 0 || !away)) {
            store.set({ notice: null });
        }
        const id = approval?.id ?? question?.id;
        const key = id === undefined ? "" : `${id}:${String(away)}`;
        if (key === said) {
            return;
        }
        said = key;
        if (id === undefined) {
            return;
        }
        const title = approval === undefined ? null : approvalWords(approval).title;
        if (away) {
            store.set({
                notice: {
                    message: awayWords(title),
                    lasting: true,
                    action: {
                        label: WORDS["assistant.notice.open"],
                        run: () => {
                            goToComposer(store);
                        },
                    },
                },
            });
        } else {
            store.set({
                announcement:
                    title === null
                        ? WORDS["assistant.status.waiting-answer"]
                        : `${WORDS["assistant.status.waiting-approval"]}: ${title}`,
            });
        }
    };
    const stopStore = store.subscribe(() => {
        if (!element.isConnected) {
            stopStore();
            return;
        }
        const away = isAway(store);
        if (away !== wasAway) {
            wasAway = away;
            // A failure the reader saw is old news once they leave the panel.
            const ended = store.get().assistantEnded;
            if (away && ended?.news === true) {
                store.set({ assistantEnded: { ...ended, news: false } });
            }
            sync();
        }
    });
    for (const type of ["ai-approval-requested", "ai-question-asked", "ai-pending-resolved"] as const) {
        element.addEventListener(type, sync);
    }
    sync();
}
