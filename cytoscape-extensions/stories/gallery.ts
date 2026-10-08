/**
 * A gallery: one small Cytoscape per tile, each running one layout, algorithm, generator, dataset or format on a
 * seeded graph, with the backend that ran and why under it. Tiles run one after another, and the root's whenDone()
 * resolves once every tile has finished, which is what a visual-review capture waits for. No tile shows a time:
 * the pictures are meant to be the same on every run.
 */

import type { Core } from "cytoscape";

import { markDone, newCore, type Outcome, reportFailure, retireAll } from "./demo.js";

export interface Tile {
    /** The heading, such as the method call. */
    title: string;
    /** Puts the graph into the empty core. */
    load(cy: Core): Promise<void> | void;
    /** The work; returns which backend ran. */
    run(cy: Core): Promise<Outcome>;
}

/**
 * Renders the tiles in a grid and runs them in order.
 * @param intro - one line above the grid saying what the gallery shows
 * @param tiles - the tiles
 * @returns the story root
 */
export function renderGallery(intro: string, tiles: Tile[]): HTMLElement {
    retireAll();
    const root = document.createElement("div");
    root.style.cssText = "padding:12px;font:12px system-ui,sans-serif;color:#333;";
    const head = document.createElement("div");
    head.style.cssText = "margin-bottom:8px;";
    head.textContent = intro;
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:8px;";
    root.append(head, grid);

    const cells = tiles.map((t) => {
        const cell = document.createElement("div");
        cell.style.cssText = "border:1px solid #ddd;border-radius:4px;overflow:hidden;";
        const title = document.createElement("div");
        title.style.cssText =
            "padding:4px 6px;font:600 11px ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        title.textContent = t.title;
        const canvas = document.createElement("div");
        canvas.style.cssText = "height:170px;";
        const status = document.createElement("div");
        status.dataset.testid = "status";
        // a fixed height, so a long line never moves the tiles below it
        status.style.cssText = "padding:4px 6px;height:56px;overflow:hidden;white-space:pre-wrap;font-size:11px;";
        status.textContent = "waiting...";
        cell.append(title, canvas, status);
        grid.append(cell);
        return { canvas, status };
    });

    const runAll = async (): Promise<void> => {
        for (const [i, t] of tiles.entries()) {
            const { canvas, status } = cells[i];
            try {
                const cy = newCore(canvas);
                await t.load(cy);
                const out = await t.run(cy);
                const why = out.detail ? ` (${out.detail})` : "";
                status.textContent = `${out.ran.toUpperCase()}${why}${out.note ? `\n${out.note}` : ""}`;
                status.style.color = "#14532d";
            } catch (e) {
                status.textContent = `failed: ${(e as Error).message}`;
                status.style.color = "#b00020";
                reportFailure(t.title, e);
            }
        }
    };
    // the canvases need their size before Cytoscape mounts
    const done = new Promise<void>((resolve) => requestAnimationFrame(() => resolve(runAll())));
    markDone(root, () => done);
    return root;
}
