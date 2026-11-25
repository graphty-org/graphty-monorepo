/**
 * @file The canvas placement every near-full-screen workspace shares (the selection workspace and
 * the join workspace): while one is open, graphty-element's canvas takes the box of its preview
 * cell, so the canvas stays the one frame (the owner's rule, 2026-10-24) and no second element is
 * mounted.
 */

import { isGraphtyError } from "@graphty/graphty-element/session";
import { type RefObject, useLayoutEffect } from "react";

import { useWorkspace } from "../state/WorkspaceContext";

/**
 * Leave the camera where it is when the element refuses a move: the drawing mode changed (2D and
 * 3D, or a headset) since the move was asked for. Anything else is a real failure.
 * @param error - Why the move was rejected.
 */
export function cameraRefused(error: unknown): void {
    if (!isGraphtyError(error) || error.code !== "E_UNSUPPORTED") {
        throw error;
    }
}

/**
 * Place graphty-element's canvas over a workspace's `.sel-ws-preview` cell while `active`: it
 * frames the graph there once the element has taken the cell's size, follows the cell as it
 * resizes, and on close puts the camera back (or frames again when it was framing a load).
 * @param active - Whether the workspace is open and its cell is laid out.
 * @param root - The workspace's box, holding the `.sel-ws-preview` cell.
 * @param frame - The canvas column, holding `.ws-canvas`.
 * @param changed - Whether the workspace changed the graph, which is then framed on close: the camera from
 *   before was placed for another graph.
 */
export function usePreviewCanvas(
    active: boolean,
    root: RefObject<HTMLElement | null>,
    frame: HTMLElement | null,
    changed?: () => boolean,
): void {
    const { element } = useWorkspace();
    useLayoutEffect(() => {
        const cell = root.current?.querySelector<HTMLElement>(".sel-ws-preview");
        const canvas = frame?.querySelector<HTMLElement>(".ws-canvas");
        if (!active || cell === null || cell === undefined || canvas === null || canvas === undefined) {
            return undefined;
        }
        const camera = element?.getCameraState();
        // Opened while the element is still framing a load: that camera is not where it would have
        // ended, so the drawing is framed again on close rather than put back mid-way.
        const framing = element?.framing === true;
        // The graph is framed in the preview cell once the element has taken the cell's size.
        const fit = (): void => {
            void element?.waitForPainted().then(() => {
                element.zoomToFit();
            });
        };
        // The drawing lies fixed over the modal's preview cell, wherever the canvas column is.
        const placeCanvas = (): void => {
            const inner = cell.getBoundingClientRect();
            canvas.style.setProperty("--sel-preview-top", `${String(inner.top)}px`);
            canvas.style.setProperty("--sel-preview-left", `${String(inner.left)}px`);
            canvas.style.setProperty("--sel-preview-width", `${String(inner.width)}px`);
            canvas.style.setProperty("--sel-preview-height", `${String(inner.height)}px`);
        };
        placeCanvas();
        canvas.dataset.selPreview = "";
        // Placed on the next frame: resizing the canvas inside the observer's own delivery would
        // loop the page's resize observers (graphty-element's follows the canvas).
        const observer = new ResizeObserver(() => {
            requestAnimationFrame(placeCanvas);
        });
        observer.observe(cell);
        observer.observe(canvas);
        // The element resizes its canvas on its own observer; the framing reads the new size after it.
        let frameId = requestAnimationFrame(() => {
            frameId = requestAnimationFrame(fit);
        });
        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
            delete canvas.dataset.selPreview;
            for (const each of ["top", "left", "width", "height"]) {
                canvas.style.removeProperty(`--sel-preview-${each}`);
            }
            if (framing || changed?.() === true) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(fit);
                });
            } else if (camera !== undefined) {
                // Switched to 2D or 3D, or into a headset, while open: the old camera no longer fits.
                void element?.setCameraState(camera).catch(cameraRefused);
            }
        };
        // The canvas is placed once per opening; its observer follows the cell from there.
    }, [active, root, frame, element, changed]);
}
