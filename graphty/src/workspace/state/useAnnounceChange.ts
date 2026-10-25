import { useEffect, useRef } from "react";

import { useWorkspace } from "./WorkspaceContext";

/**
 * Speaks a line of words through the workspace's status line each time they change, never for
 * the first words a control shows: a count shown as a pop-out opens is not news, and a region
 * that arrives already holding its words is not read by many screen readers. Pass null for a
 * state not worth saying (a count still being worked out, a count of nothing while a file is
 * loading); it is never said, and the words after it are said only when they differ from the
 * last words said, so a count recounted to the same number is said once.
 * @param words - the words on screen now, or null.
 * @param quietFirst - whether the first words after a null start are the control's first words
 *   (a count still loading when the control opened). Pass false where null at the start means the
 *   thing counted was not there yet, so its first count is news (a line just added).
 */
export function useAnnounceChange(words: string | null, quietFirst = true): void {
    const { store } = useWorkspace();
    const first = useRef(quietFirst && words === null);
    const said = useRef(words);
    useEffect(() => {
        if (words === null || words === said.current) {
            return;
        }
        said.current = words;
        if (first.current) {
            first.current = false;
            return;
        }
        store.set({ announcement: words });
    }, [words, store]);
}
