/**
 * @file The minimap `<graphty-element minimap>` draws: a canvas in the shadow root, exposed as
 * `::part(minimap)`, drawn from `getOverview()` and redrawn on `overview-changed`. A click centres
 * the view there, a drag scrubs, and the arrow keys step the view (issue #293). Its colors come
 * from CSS: points and the viewport rectangle in the part's `color`, the backdrop its `background`.
 */

import type { GraphOverview } from "../camera/overview";

/** What the minimap needs from the element: its public overview API and its events. */
export interface MinimapHost extends EventTarget {
    getOverview(): GraphOverview;
    centerOnOverview(point: { x: number; y: number }): Promise<void>;
}

/** The keys that step the view, and the direction each steps it in frame units of the viewport. */
const STEPS: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};

/** How far one arrow key moves the view: this share of the viewport's own size. */
const STEP_SHARE = 0.25;

/** The square the unit frame is drawn in, inside a canvas of any shape: centred, as big as fits. */
interface Square {
    left: number;
    top: number;
    size: number;
}

/**
 * The minimap overlay. Built once per element; attached while `minimap` is on.
 */
export class Minimap {
    readonly canvas: HTMLCanvasElement;
    private readonly redraw = (): void => {
        this.draw();
    };
    private readonly resizer = new ResizeObserver(this.redraw);
    private dragging = false;

    /**
     * Build the canvas and its pointer and key handlers; nothing is shown until {@link Minimap.attach}.
     * @param host - The element.
     */
    constructor(private readonly host: MinimapHost) {
        const canvas = document.createElement("canvas");
        canvas.setAttribute("part", "minimap");
        canvas.setAttribute("role", "group");
        canvas.tabIndex = 0;
        canvas.addEventListener("pointerdown", (event) => {
            this.dragging = true;
            canvas.setPointerCapture(event.pointerId);
            event.preventDefault();
            event.stopPropagation();
            this.centreAt(event);
        });
        canvas.addEventListener("pointermove", (event) => {
            if (this.dragging) {
                event.stopPropagation();
                this.centreAt(event);
            }
        });
        const stop = (event: PointerEvent): void => {
            this.dragging = false;
            if (canvas.hasPointerCapture(event.pointerId)) {
                canvas.releasePointerCapture(event.pointerId);
            }
        };
        canvas.addEventListener("pointerup", stop);
        canvas.addEventListener("pointercancel", stop);
        canvas.addEventListener("keydown", (event) => {
            this.step(event);
        });
        this.canvas = canvas;
    }

    /**
     * Show it in a root and start following the overview.
     * @param root - The element's shadow root.
     */
    attach(root: Node): void {
        if (this.canvas.parentNode === root) {
            return;
        }

        root.appendChild(this.canvas);
        this.host.addEventListener("overview-changed", this.redraw);
        this.resizer.observe(this.canvas);
        this.draw();
    }

    /** Hide it and stop following the overview. */
    detach(): void {
        this.canvas.remove();
        this.host.removeEventListener("overview-changed", this.redraw);
        this.resizer.disconnect();
        this.dragging = false;
    }

    /**
     * The accessible name, which the consumer chooses.
     * @param label - The name.
     */
    setLabel(label: string): void {
        this.canvas.setAttribute("aria-label", label);
    }

    /** Draw the overview at the canvas's current CSS size. */
    draw(): void {
        const { canvas } = this;
        const ratio = globalThis.devicePixelRatio || 1;
        const width = Math.round(canvas.clientWidth * ratio);
        const height = Math.round(canvas.clientHeight * ratio);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, width, height);
        const { left, top, size } = this.square(width, height);
        const overview = this.host.getOverview();
        ctx.fillStyle = ctx.strokeStyle = getComputedStyle(canvas).color;
        if (overview.density) {
            const { size: cells, counts } = overview.density;
            const most = Math.max(1, ...counts);
            const cell = size / cells;
            for (let i = 0; i < counts.length; i++) {
                if (counts[i] > 0) {
                    ctx.globalAlpha = counts[i] / most;
                    ctx.fillRect(left + (i % cells) * cell, top + Math.floor(i / cells) * cell, cell, cell);
                }
            }

            ctx.globalAlpha = 1;
        } else {
            const dot = Math.max(1, Math.round(2 * ratio));
            const { points } = overview;
            for (let i = 0; i < points.length; i += 2) {
                ctx.fillRect(left + points[i] * size - dot / 2, top + points[i + 1] * size - dot / 2, dot, dot);
            }
        }

        const view = overview.viewport;
        if (view.width > 0 || view.height > 0) {
            ctx.lineWidth = ratio;
            ctx.strokeRect(left + view.x * size, top + view.y * size, view.width * size, view.height * size);
        }
    }

    private square(width: number, height: number): Square {
        const size = Math.min(width, height);
        return { left: (width - size) / 2, top: (height - size) / 2, size };
    }

    private centreAt(event: PointerEvent): void {
        const { left, top, size } = this.square(this.canvas.clientWidth, this.canvas.clientHeight);
        if (size <= 0) {
            return;
        }

        void this.host.centerOnOverview({ x: (event.offsetX - left) / size, y: (event.offsetY - top) / size });
    }

    private step(event: KeyboardEvent): void {
        const direction = STEPS[event.key];
        if (direction === undefined) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const view = this.host.getOverview().viewport;
        if (view.width <= 0 && view.height <= 0) {
            return;
        }

        void this.host.centerOnOverview({
            x: view.x + view.width / 2 + direction[0] * view.width * STEP_SHARE,
            y: view.y + view.height / 2 + direction[1] * view.height * STEP_SHARE,
        });
    }
}
