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
    /** A text panel beside the graph, filled from the outcome's `file`. */
    panel?: boolean;
    /** Puts the graph into the empty core. */
    load(cy: Core): Promise<void> | void;
    /** The work; returns which backend ran ("" when no backend is involved) and the panel's text. */
    run(cy: Core): Promise<Outcome & { file?: string }>;
}

/**
 * Renders the tiles in a grid and runs them in order.
 * @param intro - one line above the grid saying what the gallery shows
 * @param tiles - the tiles
 * @param full - one tile filling the window instead of a grid of small ones
 * @returns the story root
 */
export function renderGallery(intro: string, tiles: Tile[], full = false): HTMLElement {
    retireAll();
    const root = document.createElement("div");
    root.style.cssText = "padding:12px;font:12px system-ui,sans-serif;color:#333;";
    const head = document.createElement("div");
    head.style.cssText = "margin-bottom:8px;";
    head.textContent = intro;
    const grid = document.createElement("div");
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${full ? 1 : 4},1fr);gap:8px;`;
    root.append(head, grid);

    const cells = tiles.map((t) => {
        const cell = document.createElement("div");
        cell.style.cssText = "border:1px solid #ddd;border-radius:4px;overflow:hidden;";
        const title = document.createElement("div");
        title.style.cssText =
            "padding:4px 6px;font:600 11px ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        title.textContent = t.title;
        const body = document.createElement("div");
        // a full tile leaves room for the line above it, its heading and its status line
        body.style.cssText = `display:flex;${full ? "height:calc(100vh - 140px);" : "height:170px;"}`;
        const canvas = document.createElement("div");
        canvas.style.cssText = "flex:1;min-width:0;position:relative;";
        body.append(canvas);
        const file = document.createElement("pre");
        if (t.panel === true) {
            file.dataset.testid = "file";
            file.style.cssText = `flex:none;width:42%;margin:0;padding:6px;overflow:hidden;border-left:1px solid #ddd;background:#fafafa;font:${full ? 11 : 7}px ui-monospace,monospace;`;
            body.append(file);
        }
        const status = document.createElement("div");
        status.dataset.testid = "status";
        // a fixed height, so a long line never moves the tiles below it
        status.style.cssText = "padding:4px 6px;height:56px;overflow:hidden;white-space:pre-wrap;font-size:11px;";
        status.textContent = "waiting...";
        cell.append(title, body, status);
        grid.append(cell);
        return { canvas, status, file };
    });

    const runAll = async (): Promise<void> => {
        for (const [i, t] of tiles.entries()) {
            const { canvas, status, file } = cells[i];
            try {
                const cy = newCore(canvas);
                await t.load(cy);
                const out = await t.run(cy);
                const why = out.detail ? ` (${out.detail})` : "";
                file.textContent = out.file ?? "";
                const ran = out.ran === "" ? "" : `${out.ran.toUpperCase()}${why}`;
                status.textContent = [ran, out.note].filter((line) => line).join("\n");
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
