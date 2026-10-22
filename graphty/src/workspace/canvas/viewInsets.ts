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
 * A margin changing never moves the drawing: the element keeps clear of it when it frames the
 * graph -- on open and when the reader asks for Frame. The drawing moves only when the reader asks.
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
    const { store } = useWorkspace();
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
        const report = (): void => {
            // A canvas hidden behind a page (no box at all) measures nothing: insets read off it
            // are not the overlay's.
            if (canvas.getClientRects().length > 0) {
                write(sides(box, canvas));
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
    }, [store, ref, owned, sides]);
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
