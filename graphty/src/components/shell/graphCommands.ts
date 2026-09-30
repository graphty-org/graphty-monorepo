/**
 * The camera, selection and XR calls the shell makes on graphty-element.
 *
 * The canvas toolbar, the Views menu and the key dispatcher all name actions the SHELL
 * owns -- zoom, the view presets, Reset view, Zoom to selection -- and every one of them is
 * one public member of the element. None of them is an undoable step: the camera, the
 * selection and the XR buttons are not saved in a project. They are gathered here so AppShell
 * wires handlers instead of repeating the two things every call needs: the element is null
 * until it has mounted, and a camera move that fails (a preset a 2D scene cannot satisfy)
 * rejects, which is reported rather than left unhandled.
 *
 * Nothing here computes a camera move. The zoom step, the box around the selection and the
 * named views are the element's own.
 */

import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { CameraId } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";

/**
 * Reports a camera move that failed, rather than leaving its rejection unhandled.
 * @param name - the element member that was called.
 * @param move - what it returned.
 */
function report(name: string, move: Promise<unknown>): void {
    move.catch((error: unknown) => {
        console.error(`[shell] element.${name}() failed:`, error);
    });
}

/**
 * Zoom to fit.
 * @param element - the element, or null before it has mounted.
 */
export function graphZoomToFit(element: GraphtyElement | null): void {
    element?.zoomToFit();
}

/**
 * Steps the camera nearer or further, by the element's own step.
 * @param element - the element, or null before it has mounted.
 * @param direction - "in" to approach, "out" to withdraw.
 */
export function graphZoomStep(element: GraphtyElement | null, direction: "in" | "out"): void {
    if (element !== null) {
        report("zoomStep", element.zoomStep(direction));
    }
}

/**
 * Centres the camera on what is selected; with nothing selected the camera stays.
 * @param element - the element, or null before it has mounted.
 */
export function graphZoomToSelection(element: GraphtyElement | null): void {
    if (element !== null) {
        report("zoomToSelection", element.zoomToSelection());
    }
}

/**
 * Reset view: back to the camera state the session opened with.
 * @param element - the element, or null before it has mounted.
 */
export function graphResetView(element: GraphtyElement | null): void {
    if (element !== null) {
        report("resetCamera", element.resetCamera());
    }
}

/**
 * Moves the camera to one of the element's named views.
 * @param element - the element, or null before it has mounted.
 * @param preset - the view, such as "topView".
 */
export function graphViewPreset(element: GraphtyElement | null, preset: CameraId): void {
    if (element !== null) {
        report("loadCameraPreset", element.loadCameraPreset(preset));
    }
}

/**
 * Selects one node on the canvas, which is what fills the inspector.
 *
 * Either spelling of an integer id works. The element looks a node up by the id its file
 * carried and retries the other spelling when the exact key misses, so a row that has
 * already printed its id as text selects the node a GML file numbered.
 * @param element - the element, or null before it has mounted.
 * @param nodeId - the node to select.
 */
export function graphSelectNode(element: GraphtyElement | null, nodeId: string | number): void {
    element?.selectNode(nodeId);
}

/**
 * Clears the canvas selection. The Escape ladder's last rung.
 * @param element - the element, or null before it has mounted.
 */
export function graphDeselectNode(element: GraphtyElement | null): void {
    element?.deselectNode();
}

/**
 * Turns graphty-element's own XR buttons off.
 *
 * Spec 01 section 2: the built-in buttons are disabled so the legend owns the canvas's
 * bottom right corner, and XR entry belongs to the Views menu.
 * @param element - the element, or null before it has mounted.
 */
export function graphDisableBuiltInXrButtons(element: GraphtyElement | null): void {
    element?.setXRConfig({ ui: { enabled: false } });
}

/**
 * Calls back whenever the graph's data changes: a load, an edit, an undo or a redo of one.
 *
 * The counts are the status bar's own fact (spec 01, One fact one region), so they are read
 * when the element says the graph moved, never at a moment the shell guesses.
 * @param session - the element's session.
 * @param onChange - called after each change, with no arguments.
 * @returns stops listening.
 */
export function graphOnDataChanged(session: GraphSession, onChange: () => void): () => void {
    return session.on("project:changed", ({ slices }) => {
        if (slices.includes("graph")) {
            onChange();
        }
    });
}
