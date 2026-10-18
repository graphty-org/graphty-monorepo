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
 * Reports one overlay's box to the element as the view insets it owns, at once and on every
 * resize of the overlay or the canvas, and gives them back when it goes. Each overlay owns its
 * sides (the key's room its left or top, the toolbar the bottom), so two overlays never overwrite
 * each other's margin.
 *
 * A margin changing never moves the drawing: the element keeps clear of it at its next framing of
 * its own (a load, a layout). Two things frame the graph again, clear of every margin, and only
 * while the element frames on its own and the reader has not placed the camera since
 * (`cameraPlaced`): the canvas changing size -- the table opening under it, the window resized --
 * since the drawing the reader saw no longer fits the canvas it is drawn on; and the overlay
 * arriving over a drawn node, since it would hide that node.
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
        const write = (next: ViewInsets): void => {
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
            if ((["left", "top", "right", "bottom"] as const).some((side) => merged[side] !== now[side])) {
                store.set({ viewInsets: merged });
            }
        };
        const sizeOf = (): string => `${String(canvas.clientWidth)}x${String(canvas.clientHeight)}`;
        // The size the reader last saw the drawing at; none while a page hides the canvas.
        let size = canvas.getClientRects().length === 0 ? null : sizeOf();
        // Whether the overlay has been measured once: its first report is its arrival.
        let arrived = false;
        /**
         * Whether the overlay's box covers a node the element draws.
         * @param host - The element.
         * @returns True when a drawn node lies under the overlay.
         */
        const hidesNode = (host: NonNullable<typeof element>): boolean => {
            const at = host.getBoundingClientRect();
            const over = box.getBoundingClientRect();
            const rect = { x: over.left - at.left, y: over.top - at.top, width: over.width, height: over.height };
            return host.nodesInRect(rect).length > 0;
        };
        const report = (): void => {
            // A canvas hidden behind a page (no box at all) measures nothing: insets read off it
            // are not the overlay's, and its size coming back is not a resize.
            if (canvas.getClientRects().length === 0) {
                return;
            }
            write(sides(box, canvas));
            const resized = size !== null && sizeOf() !== size;
            const arriving = !arrived;
            arrived = true;
            size = sizeOf();
            if (
                element !== null &&
                element.autoFrame &&
                !element.cameraPlaced &&
                (resized || (arriving && hidesNode(element)))
            ) {
                // The margins reach the element before the fit it asks for.
                element.viewInsets = store.get().viewInsets;
                element.zoomToFit();
            }
        };
        const observer = new ResizeObserver(report);
        observer.observe(box);
        observer.observe(canvas);
        report();
        return () => {
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
