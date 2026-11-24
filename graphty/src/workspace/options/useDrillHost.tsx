/**
 * A pop-over that hosts drill-in (Drill.tsx): the views drilled into it, the newest shown in place of its own
 * content, and its header's title and back button while one is.
 */

import React, { createContext, useCallback, useMemo, useState } from "react";

import { GLYPHS } from "../glyphs";

/** A view drilled into the pop-over: its title, and what going back does. */
interface DrillEntry {
    readonly id: string;
    readonly title: string;
    /** The pop-out's width while it shows: a view with longer names asks for more (the Advanced view's 312). */
    readonly width?: number;
    readonly back: () => void;
}

/** What a pop-over hosting drill-in offers the views drilled into it. */
interface DrillHostValue {
    /** Where drilled views are drawn: after the pop-over's own content, inside its panel. */
    readonly target: HTMLElement | null;
    /** The view on top, the one shown, by id. */
    readonly top: string | undefined;
    readonly push: (entry: DrillEntry) => void;
    readonly drop: (id: string) => void;
}

/** The pop-over hosting drill-in that a view is drawn in, if any. */
export const DrillHostContext = createContext<DrillHostValue | null>(null);

/**
 * A pop-over's drill-in: its content, hidden while a view is drilled into it, and the place drilled views draw.
 * @param title - the pop-over's own title.
 * @returns the header's title, actions and width (undefined: its own), and the body to draw in the panel.
 */
export function useDrillHost(title: string): {
    title: string;
    width: number | undefined;
    actions: { id: string; icon: React.ReactNode; label: string; onClick: () => void }[] | undefined;
    body: (children: React.ReactNode) => React.JSX.Element;
} {
    const [stack, setStack] = useState<readonly DrillEntry[]>([]);
    const [target, setTarget] = useState<HTMLElement | null>(null);
    const push = useCallback((entry: DrillEntry) => {
        setStack((now) => [...now.filter((each) => each.id !== entry.id), entry]);
    }, []);
    const drop = useCallback((id: string) => {
        setStack((now) => now.filter((each) => each.id !== id));
    }, []);
    const top = stack.at(-1);
    const value = useMemo(() => ({ target, top: top?.id, push, drop }), [target, top?.id, push, drop]);
    const under = stack.at(-2)?.title ?? title;
    return {
        title: top?.title ?? title,
        width: top?.width,
        actions:
            top === undefined
                ? undefined
                : [
                      {
                          id: "back",
                          icon: <GLYPHS.back size={14} aria-hidden />,
                          label: `Back to ${under}`,
                          onClick: top.back,
                      },
                  ],
        body: (children) => (
            <DrillHostContext.Provider value={value}>
                <div hidden={top !== undefined}>{children}</div>
                <div ref={setTarget} data-drill-target="" />
            </DrillHostContext.Provider>
        ),
    };
}
