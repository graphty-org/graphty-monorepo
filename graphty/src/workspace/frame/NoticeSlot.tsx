import React, { type RefObject, useEffect, useRef, useState } from "react";

import { NoticeView } from "../canvas/NoticeView";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/** How long a notice stays, in ms (tier1-design.md section 2.4). */
export const NOTICE_MS = 6000;

/**
 * The one notice slot (tier1-design.md section 2.4): one notice at a time, centered above the
 * lowest bar of the canvas (or the foot of the start screen), gone after 6 s, the timer paused
 * while the pointer or the focus is on it. An error notice stays until it is dismissed. Any
 * package shows one with `store.set({ notice })`; a new notice replaces the old. Closing it from
 * the keyboard (its x or its action) takes the focused button away, so focus goes to `returnFocus`,
 * or to the drawing when none is given.
 * @param props - Component props
 * @param props.returnFocus - Where focus goes when the notice is closed from inside it
 * @returns The slot
 */
export function NoticeSlot({
    returnFocus,
}: Readonly<{ returnFocus?: RefObject<HTMLElement | null> }>): React.JSX.Element | null {
    const { store, element } = useWorkspace();
    const slot = useRef<HTMLDivElement>(null);
    const notice = useWorkspaceState((state) => state.notice);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (notice === null || notice.error === true || hovered || focused) {
            return undefined;
        }
        const timer = setTimeout(() => {
            store.set((state) => (state.notice === notice ? { notice: null } : {}));
        }, NOTICE_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [notice, hovered, focused, store]);

    if (notice === null) {
        return null;
    }
    return (
        <div
            ref={slot}
            className="ws-notice-slot"
            onPointerEnter={() => {
                setHovered(true);
            }}
            onPointerLeave={() => {
                setHovered(false);
            }}
            onFocus={() => {
                setFocused(true);
            }}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setFocused(false);
                }
            }}
        >
            <NoticeView
                notice={notice}
                onClose={() => {
                    const hadFocus = slot.current?.contains(document.activeElement) === true;
                    store.set({ notice: null });
                    if (hadFocus) {
                        (returnFocus?.current ?? element)?.focus();
                    }
                }}
            />
        </div>
    );
}
