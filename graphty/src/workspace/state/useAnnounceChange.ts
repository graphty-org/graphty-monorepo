import { useEffect, useRef } from "react";

import { useWorkspace } from "./WorkspaceContext";

/**
 * Speaks a line of words through the workspace's status line each time they change, never for
 * the first words a control shows: a count shown as a pop-out opens is not news, and a region
 * that arrives already holding its words is not read by many screen readers. Pass null for a
 * state not worth saying (a count still being worked out, a count of nothing while a file is
 * loading); it is never said, and the first words after it are the control's first words.
 * @param words - the words on screen now, or null.
 */
export function useAnnounceChange(words: string | null): void {
    const { store } = useWorkspace();
    const seen = useRef(words !== null);
    const last = useRef(words);
    useEffect(() => {
        if (words === last.current) {
            return;
        }
        last.current = words;
        if (words === null) {
            return;
        }
        if (seen.current) {
            store.set({ announcement: words });
        }
        seen.current = true;
    }, [words, store]);
}
