/**
 * The canvas margins the overlays cover -- the key card, the toolbar -- told to the element as its
 * view insets, so no fit puts a node under them.
 */

import type { ViewInsets } from "@graphty/graphty-element";
import { type RefObject, useLayoutEffect } from "react";

import { useWorkspace } from "../state/WorkspaceContext";

/** One side of the canvas. */
type Side = keyof ViewInsets;

/** Room left between an overlay and the nearest node, in CSS pixels. */
export const OVERLAY_GAP = 12;

/**
 * Reports one overlay's box to the element as the view insets it owns, on mount and on every
 * resize of the overlay or the canvas, and gives them back when it goes. Each overlay owns its
 * sides (the key card its left or top, the toolbar the bottom), so two overlays never overwrite
 * each other's margin.
 *
 * When the overlay now covers a node -- a key that appeared or grew, a canvas that shrank under
 * the toolbar as the table opened -- the graph is framed again clear of every margin, unless the
 * reader placed the camera since the element last framed it (`cameraPlaced`) or the element's own
 * framing is off. A box that covers no node moves nothing.
 * @param ref - The overlay.
 * @param owned - The sides it owns; a module constant, so the report is set up once.
 * @param sides - A module function: its margins from its box and the canvas's, the owned sides only; a side left out
 *   is given back.
 */
export function useOverlayInset(
    ref: RefObject<HTMLElement | null>,
    owned: readonly Side[],
    sides: (box: HTMLElement, canvas: HTMLElement) => ViewInsets,
): void {
    const { store, element } = useWorkspace();
    useLayoutEffect(() => {
        const box = ref.current;
        const canvas = box?.parentElement?.closest<HTMLElement>(".ws-canvas-overlays") ?? box?.parentElement;
        if (!box || !canvas) {
            return undefined;
        }
        const write = (next: ViewInsets): ViewInsets | null => {
            const now = store.get().viewInsets;
            const merged: Record<string, number> = {};
            for (const [side, value] of Object.entries(now)) {
                if (!owned.includes(side as Side) && value !== undefined) {
                    merged[side] = value;
                }
            }
            for (const side of owned) {
                const value = next[side];
                if (value !== undefined) {
                    merged[side] = value;
                }
            }
            const changed = (["left", "top", "right", "bottom"] as const).some((side) => merged[side] !== now[side]);
            if (!changed) {
                return null;
            }
            store.set({ viewInsets: merged });
            return merged;
        };
        const report = (): void => {
            // A canvas hidden behind a page (no box at all) measures nothing: insets read off it
            // are not the overlay's, and handed to the element they moved the drawing once the
            // canvas came back.
            if (canvas.getClientRects().length === 0) {
                return;
            }
            const merged = write(sides(box, canvas));
            if (merged === null || element === null || !element.autoFrame || element.cameraPlaced) {
                return;
            }
            const outer = canvas.getBoundingClientRect();
            const own = box.getBoundingClientRect();
            const rect = { x: own.left - outer.left, y: own.top - outer.top, width: own.width, height: own.height };
            if (element.nodesInRect(rect).length > 0) {
                // The new margins reach the element before the fit it asks for.
                element.viewInsets = merged;
                element.zoomToFit();
            }
        };
        // An overlay that comes up with the graph (a project opening) waits for the element's own
        // framing of it to land first: an inset set before that framing shrinks it, so the
        // reopened project would be framed smaller than it was saved.
        const reportWhenFramed = (): void => {
            if (element !== null && !element.isFrameStable) {
                element.addEventListener("graph-frame-stable", report, { once: true });
                return;
            }
            report();
        };
        const observer = new ResizeObserver(reportWhenFramed);
        observer.observe(box);
        observer.observe(canvas);
        reportWhenFramed();
        return () => {
            element?.removeEventListener("graph-frame-stable", report);
            observer.disconnect();
            write({});
        };
    }, [store, element, ref, owned, sides]);
}

/** The side the canvas toolbar owns. */
export const TOOLBAR_SIDES = ["bottom"] as const;

/**
 * The canvas toolbar's margin: the canvas below its top edge.
 * @param dock - The toolbar's dock.
 * @param canvas - The canvas it sits over.
 * @returns Its margin.
 */
export function toolbarInsets(dock: HTMLElement, canvas: HTMLElement): ViewInsets {
    return { bottom: canvas.clientHeight - dock.offsetTop + OVERLAY_GAP };
}
