/**
 * @file The rectangle and lasso gesture: Shift and a drag that starts on empty canvas draws a region,
 * and releasing adds the drawn nodes inside it to the selection (design/rendering/row-renderer.md 4.4).
 *
 * Off by default (`layoutBehavior.selection.region` is `"off"`), so a Shift-drag does what it always
 * did. On, the camera is given no part of the drag, and the region is resolved by the selection's
 * own `{ region }` target, so the gesture and a script select the same nodes.
 */

import { PointerEventTypes, type PointerInfoPre } from "@babylonjs/core/Events/pointerEvents.js";
import type { Observer } from "@babylonjs/core/Misc/observable.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { CanvasPoint } from "../render/PickService";

/** Which region a Shift-drag draws, or `"off"` for none. */
export type RegionShape = "off" | "rectangle" | "lasso";

/** A drag shorter than this, in CSS pixels, is a click and is left to the click handlers. */
const REGION_MIN_DRAG_PX = 5;

/** What the gesture reads from and does to its graph. */
export interface RegionGestureHost {
    readonly scene: Scene;
    /** The shape in effect, read at each press. */
    shape(): RegionShape;
    /** Whether a press at a canvas point is on a node, which a drag there moves instead. */
    onNode(x: number, y: number): boolean;
    /** Hold or give back the camera's input. */
    holdCamera(held: boolean): void;
    /** Add what a polygon covers to the selection. */
    select(polygon: readonly CanvasPoint[]): void;
}

/**
 * The polygon a drag drew.
 * @param shape - The shape.
 * @param points - The pointer's places, the press first.
 * @returns The polygon's corners.
 */
export function regionPolygon(shape: Exclude<RegionShape, "off">, points: readonly CanvasPoint[]): CanvasPoint[] {
    if (shape === "lasso") {
        return [...points];
    }

    const from = points[0];
    const to = points.at(-1) ?? from;
    return [from, { x: to.x, y: from.y }, to, { x: from.x, y: to.y }];
}

/**
 * The outline drawn over the canvas while the pointer is held: neutral gray, dashed, and never
 * in the way of the pointer.
 * @param canvas - The canvas it is drawn over.
 * @returns The outline, and a function that updates it.
 */
function outlineOver(canvas: HTMLCanvasElement): { remove(): void; draw(polygon: readonly CanvasPoint[]): void } {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    const rect = canvas.getBoundingClientRect();
    svg.setAttribute(
        "style",
        `position: fixed; left: ${String(rect.left)}px; top: ${String(rect.top)}px; ` +
            `width: ${String(rect.width)}px; height: ${String(rect.height)}px; pointer-events: none; overflow: hidden;`,
    );
    const shape = document.createElementNS(ns, "polygon");
    shape.setAttribute("fill", "rgba(128, 128, 128, 0.12)");
    shape.setAttribute("stroke", "rgb(128, 128, 128)");
    shape.setAttribute("stroke-dasharray", "4 3");
    svg.appendChild(shape);
    (canvas.parentElement ?? document.body).appendChild(svg);
    return {
        remove: () => {
            svg.remove();
        },
        draw: (polygon) => {
            shape.setAttribute("points", polygon.map(({ x, y }) => `${String(x)},${String(y)}`).join(" "));
        },
    };
}

/**
 * Listen for the gesture on a scene.
 * @param host - The graph.
 * @returns A function that stops listening.
 */
export function attachRegionGesture(host: RegionGestureHost): () => void {
    const { scene } = host;
    let shape: Exclude<RegionShape, "off"> | null = null;
    let points: CanvasPoint[] = [];
    let moved = false;
    let outline: ReturnType<typeof outlineOver> | null = null;

    const end = (): void => {
        shape = null;
        points = [];
        moved = false;
        outline?.remove();
        outline = null;
        host.holdCamera(false);
    };

    const observer: Observer<PointerInfoPre> = scene.onPrePointerObservable.add((info) => {
        const event = info.event as PointerEvent;
        const at = { x: scene.pointerX, y: scene.pointerY };
        if (info.type === PointerEventTypes.POINTERDOWN) {
            const wanted = host.shape();
            if (wanted === "off" || !event.shiftKey || event.button !== 0 || host.onNode(at.x, at.y)) {
                return;
            }

            shape = wanted;
            points = [at];
            host.holdCamera(true);
            return;
        }

        if (shape === null) {
            return;
        }

        if (info.type === PointerEventTypes.POINTERMOVE) {
            moved ||= Math.hypot(at.x - points[0].x, at.y - points[0].y) >= REGION_MIN_DRAG_PX;
            points = shape === "lasso" ? [...points, at] : [points[0], at];
            const canvas = scene.getEngine().getRenderingCanvas();
            if (outline === null && canvas !== null) {
                outline = outlineOver(canvas);
            }

            outline?.draw(regionPolygon(shape, points));
        } else if (info.type === PointerEventTypes.POINTERUP) {
            const polygon = regionPolygon(shape, shape === "lasso" ? [...points, at] : [points[0], at]);
            const drew = moved || Math.hypot(at.x - points[0].x, at.y - points[0].y) >= REGION_MIN_DRAG_PX;
            end();
            if (drew) {
                host.select(polygon);
            }
        }
    });

    return () => {
        if (shape !== null) {
            end();
        }

        scene.onPrePointerObservable.remove(observer);
    };
}
