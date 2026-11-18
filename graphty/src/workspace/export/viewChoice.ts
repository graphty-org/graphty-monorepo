/**
 * The Export dialog's View list, shared by Image and Video: the current camera, then the camera
 * views, then the saved views (the order the element resolves a name), each judged by the
 * element's `viewProblem` and worded here.
 */

import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";

import { cameraViewName, viewProblemWords } from "../toolbar/viewWords";

/** The View list's entry for the reader's own camera. */
export const CURRENT = "current";

/** One entry of the View list: a value, its words, and why it cannot be used now. */
interface ViewEntry {
    readonly value: string;
    readonly label: string;
    /** Null for the reader's camera, else a view name. */
    readonly view: string | null;
    readonly reason: string | null;
}

/** The View list's entries and the chosen one. */
export interface ViewChoice {
    readonly chosen: ViewEntry;
    readonly current: ViewEntry;
    readonly cameras: readonly ViewEntry[];
    /** The saved views, and a chosen view that is gone at the end. */
    readonly saved: readonly ViewEntry[];
}

/**
 * The View list for a choice. A chosen view that is gone (removed, renamed, another project) stays
 * chosen and shows the element's reason, so the field says why the capture would fail instead of
 * hiding the choice.
 * @param element - the element, or null.
 * @param session - the session, or null.
 * @param view - the chosen view name, or null for the reader's camera.
 * @returns the entries and the chosen one.
 */
export function viewChoice(
    element: GraphtyElement | null,
    session: GraphSession | null,
    view: string | null,
): ViewChoice {
    const current: ViewEntry = { value: CURRENT, label: "Current camera", view: null, reason: null };
    const cameras = (session?.catalog.cameras() ?? []).map(({ id, plainName }) => ({
        value: `camera:${id}`,
        label: cameraViewName(id, plainName),
        view: id,
        reason: viewProblemWords(element?.viewProblem(id) ?? null),
    }));
    const saved = [...(session?.views.keys() ?? [])].map((name) => ({
        value: `saved:${name}`,
        label: name,
        view: name,
        reason: viewProblemWords(element?.viewProblem(name, { saved: true }) ?? null, true),
    }));
    if (view === null) {
        return { chosen: current, current, cameras, saved };
    }
    const found = cameras.find((entry) => entry.view === view) ?? saved.find((entry) => entry.view === view);
    if (found !== undefined) {
        return { chosen: found, current, cameras, saved };
    }
    const missing: ViewEntry = {
        value: `missing:${view}`,
        label: view,
        view,
        reason: viewProblemWords(element?.viewProblem(view, { saved: true }) ?? null, true),
    };
    return { chosen: missing, current, cameras, saved: [...saved, missing] };
}
