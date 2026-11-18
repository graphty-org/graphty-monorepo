import type { GraphSession, SessionEventMap } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/** The element's events that change what the inspector and the Data place read. */
export const INSPECTOR_EVENTS = [
    "project:changed",
    "run:changed",
    "selection:changed",
    "style:changed",
    "visibility:changed",
    "note:changed",
    "source:refreshed",
] as const;

/** The element's events that change what the Graph place reads, undo and redo included. */
export const GRAPH_PLACE_EVENTS = [
    "project:changed",
    "run:changed",
    "style:changed",
    "selection:changed",
    "selection:origin-changed",
    "history:changed",
] as const;

/**
 * The element's events that change what the toolbar, Analyze and Layout read: the project, the
 * runs, the selection, and the device facts (whether VR or AR can be entered, or is presenting).
 */
export const TOOLBAR_EVENTS = [
    "project:changed",
    "run:changed",
    "selection:changed",
    "capabilities:changed",
    "time:field",
] as const;

/** The element's events that change what the table reads: records, runs and the selection. */
export const TABLE_EVENTS = ["project:changed", "run:changed", "selection:changed"] as const;

/** The element's events after which the timeline's controls read the session again. */
export const TIME_EVENTS = [
    "time:field",
    "time:ready",
    "time:step",
    "time:play",
    "time:pause",
    "time:end",
    "visibility:changed",
    "selection:changed",
    "project:changed",
] as const;

/**
 * The events after which a panel that shows the time field and its settings, and not the window,
 * reads the session again: not each step of a play, nor the visibility and selection every step
 * moves. Re-rendered on every step, the Data place's Fields and time card read every column's
 * values again for each frame a play drew (#4196).
 */
export const TIME_FIELD_EVENTS = [
    "time:field",
    "time:ready",
    "time:play",
    "time:pause",
    "time:end",
    "project:changed",
] as const;

/**
 * Re-renders the caller after each of the element's events named, so what it reads from the
 * session is read fresh.
 * @param session - the element's session, or null.
 * @param events - the events; pass a module-level list, since a new array re-subscribes.
 * @returns a number that changes with each reported event.
 */
export function useSessionEvents(session: GraphSession | null, events: readonly (keyof SessionEventMap)[]): number {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = events.map((event) => session.on(event, bump));
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session, events]);
    return version;
}

/**
 * The element's events after which a count over what is shown is read again: visibility, data,
 * and every history step (a filter card that only selects changes no visibility, and its count is
 * read again then).
 */
export const VISIBILITY_EVENTS = ["visibility:changed", "project:changed", "history:changed"] as const;

/** The element's events after which the shader settings read again: a shader's status, the render quality. */
export const SHADER_EVENTS = ["shader:status", "render:quality"] as const;
