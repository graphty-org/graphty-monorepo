import "./views-place.css";

import React, { useEffect, useRef } from "react";

import { useSessionEvents, VIEWS_PLACE_EVENTS } from "../sessionEvents";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useViewsChanged } from "../toolbar/useViewsChanged";
import { CamerasSection } from "./CamerasSection";
import { ToursSection } from "./ToursSection";

/** Where a door's focus lands in each section: its first Go button else Save camera, and New tour. */
const FOCUS = {
    // The first camera's Go button, else (no cameras) Save camera: tried in this order, since one
    // selector list would match Save camera first, in the section's header.
    cameras: ['.vp-cameras [aria-label^="Go to "]', '.vp-cameras [aria-label="Save camera"]'],
    tours: ['.vp-tours [aria-label="New tour"]'],
} as const;

/**
 * The Views place (design/ui/camera-views-tours-and-capture.md, section 3.1): the graph's name,
 * then Cameras and Video tours, each a section the reader opens and closes, kept in the workspace
 * store. Every camera and tour is graphty-element's (`session.views`, `session.tours`); this only
 * arranges and words them. A door (Quick actions, the Export dialog) asks for focus on a section.
 * @returns The Views place
 */
export function ViewsPlace(): React.JSX.Element {
    const { session, element, store } = useWorkspace();
    // Draws again whenever what `viewProblem` and `planTour` read changes.
    useViewsChanged(element);
    // And whenever the graph gains or loses what is drawn.
    useSessionEvents(session, VIEWS_PLACE_EVENTS);
    const graphName = useWorkspaceState((state) => state.project?.name ?? "");
    const focus = useWorkspaceState((state) => state.viewsFocus);
    const root = useRef<HTMLElement>(null);
    useEffect(() => {
        if (focus === null) {
            return;
        }
        store.set({ viewsFocus: null });
        const target = FOCUS[focus]
            .map((selector) => root.current?.querySelector<HTMLElement>(selector))
            .find((each) => each !== null && each !== undefined);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ block: "nearest" });
    }, [focus, store]);

    return (
        <section className="vp" aria-label="Views place" ref={root}>
            <h2 className="vp-title">{graphName}</h2>
            {session === null ? null : (
                <>
                    <CamerasSection session={session} element={element} store={store} />
                    <ToursSection session={session} element={element} store={store} />
                </>
            )}
        </section>
    );
}
