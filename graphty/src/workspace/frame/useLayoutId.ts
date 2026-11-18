import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/**
 * The layout the session draws, by its catalog id, re-read whenever the project's layout changes
 * (the layout form, the assistant, opening a project, undo or redo).
 * @param session - the element's session, or null.
 * @returns the layout's id, or null with no session.
 */
export function useLayoutId(session: GraphSession | null): string | null {
    const [id, setId] = useState<string | null>(session?.layout.id ?? null);
    useEffect(() => {
        if (session === null) {
            setId(null);
            return undefined;
        }
        setId(session.layout.id);
        return session.on("project:changed", ({ slices }) => {
            if (slices.includes("layout")) {
                setId(session.layout.id);
            }
        });
    }, [session]);
    return id;
}
