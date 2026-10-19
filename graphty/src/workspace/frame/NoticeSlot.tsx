import React, { useEffect, useState } from "react";

import { NoticeView } from "../canvas/NoticeView";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/** How long a notice stays, in ms (tier1-design.md section 2.4). */
export const NOTICE_MS = 6000;

/**
 * The one notice slot (tier1-design.md section 2.4): one notice at a time, centered above the
 * lowest bar of the canvas, gone after 6 s, the timer paused while the pointer is on it. Any
 * package shows one with `store.set({ notice })`; a new notice replaces the old.
 * @returns The slot
 */
export function NoticeSlot(): React.JSX.Element | null {
    const { store } = useWorkspace();
    const notice = useWorkspaceState((state) => state.notice);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        if (notice === null || hovered) {
            return undefined;
        }
        const timer = setTimeout(() => {
            store.set((state) => (state.notice === notice ? { notice: null } : {}));
        }, NOTICE_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [notice, hovered, store]);

    if (notice === null) {
        return null;
    }
    return (
        <div
            className="ws-notice-slot"
            onPointerEnter={() => {
                setHovered(true);
            }}
            onPointerLeave={() => {
                setHovered(false);
            }}
        >
            <NoticeView
                notice={notice}
                onClose={() => {
                    store.set({ notice: null });
                }}
            />
        </div>
    );
}
