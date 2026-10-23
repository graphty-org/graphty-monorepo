/**
 * A gallery: one small Cytoscape per tile, each running one layout, algorithm, generator, dataset or format on a
 * seeded graph, with one line under it saying what the picture shows (and, where a GPU could have run, one more saying
 * which backend ran and why); the explanation is the story's description, on its Docs page. Tiles run one after another, and the root's whenDone()
 * resolves once every tile has finished, which is what a visual-review capture waits for. No tile shows a time:
 * the pictures are meant to be the same on every run.
 */

import type { Core } from "cytoscape";

import {
    CAPTURE,
    fadeManyEdges,
    failureWords,
    fitToContainer,
    markDone,
    newCore,
    NO_GPU,
    type Outcome,
    reportFailure,
    retireAll,
} from "./demo.js";

/**
 * The backend line of a tile: which backend ran and why, or why nothing ran; nothing when the run has no backend to
 * report (a one-shot layout, a generator, a dataset).
 * @param out - the outcome
 * @returns the line, or ""
 */
function statusLine(out: Outcome): string {
    if (out.ran === "not run") {
        return out.detail ?? "";
    }
    // only where a GPU could have run: an algorithm with no GPU implementation always runs on the CPU
    if (out.ran === "" || !out.detail || out.detail === NO_GPU) {
        return "";
    }
    return `Ran on the ${out.ran.toUpperCase()}: ${out.detail}`;
}

export interface Tile {
    /** The heading, such as the method call. */
    title: string;
    /**
     * A panel beside the graph: the outcome's `summary` on top, and under it the outcome's `file` in full, in a box
     * that scrolls (shown scrolled to its start, so a capture is the same on every run).
     */
    panel?: boolean;
    /** Puts the graph into the empty core. */
    load(cy: Core): Promise<void> | void;
    /** The work; returns which backend ran ("" when no backend is involved) and the panel's text. */
    run(cy: Core): Promise<Outcome & { summary?: string; file?: string }>;
}

/**
 * Renders the tiles in a grid and runs them in order.
 * @param intro - one line above the grid saying what the gallery shows
 * @param tiles - the tiles
 * @param full - one tile filling the window instead of a grid of small ones, with a "Run again" button and, outside
 *   a capture, the run's time and how many nodes lie outside the view
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
        if (full && !CAPTURE) {
            // left out of a capture, so the picture is the same as the gallery's
            title.style.cssText += "position:relative;padding-right:90px;";
            const again = document.createElement("button");
            again.textContent = "Run again";
            again.style.cssText = "position:absolute;right:4px;top:1px;font:11px system-ui,sans-serif;";
            again.onclick = () => {
                again.disabled = true;
                retireAll();
                done = runAll().finally(() => {
                    again.disabled = false;
                });
            };
            title.append(again);
        }
        const body = document.createElement("div");
        // a full tile leaves room for the line above it, its heading and its status lines; a small tile with a panel is
        // taller, so the panel's summary fits whole with room for the file under it
        const small = t.panel === true ? "300px" : "170px";
        body.style.cssText = `display:flex;height:${full ? "calc(100vh - 128px)" : small};`;
        const canvas = document.createElement("div");
        canvas.style.cssText = "flex:1;min-width:0;position:relative;";
        body.append(canvas);
        const summary = document.createElement("div");
        const lineCount = document.createElement("div");
        const file = document.createElement("pre");
        if (t.panel === true) {
            const panel = document.createElement("div");
            panel.style.cssText = `flex:none;width:42%;display:flex;flex-direction:column;border-left:1px solid #ddd;background:#fafafa;font:${full ? 11 : 7}px ui-monospace,monospace;`;
            summary.dataset.testid = "summary";
            // always whole: a long attribute list wraps
            summary.style.cssText = "flex:none;padding:6px;white-space:pre-wrap;overflow-wrap:anywhere;";
            // says how long the file is, and that it scrolls, so its cut-off edge does not read as a fault
            lineCount.style.cssText = "flex:none;padding:2px 6px;border-top:1px solid #ddd;color:#666;";
            file.dataset.testid = "file";
            // the whole file, lines unwrapped: it scrolls both ways inside the panel
            file.style.cssText =
                "flex:1;min-height:0;margin:0;padding:6px;overflow:auto;white-space:pre;background:#fff;font:inherit;";
            panel.append(summary, lineCount, file);
            body.append(panel);
        }
        const status = document.createElement("div");
        status.dataset.testid = "status";
        // room for three lines (the caption, wrapped in a small tile, and the backend line); more grows the tile
        // instead of being cut off
        status.style.cssText =
            "padding:4px 6px;min-height:44px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;";
        status.textContent = "waiting...";
        cell.append(title, body, status);
        grid.append(cell);
        return { canvas, status, summary, lineCount, file };
    });

    const runAll = async (): Promise<void> => {
        for (const [i, t] of tiles.entries()) {
            const { canvas, status, summary, lineCount, file } = cells[i];
            try {
                const cy = newCore(canvas);
                await t.load(cy);
                fadeManyEdges(cy);
                status.textContent = "running...";
                status.style.color = "#333";
                const t0 = performance.now();
                const out = await t.run(cy);
                const ms = Math.round(out.ms ?? performance.now() - t0);
                // fitted to the main graph, not to far-flung isolated nodes; what the picture shows first, the backend after
                const outside = fitToContainer(cy);
                summary.textContent = out.summary ?? "";
                summary.hidden = summary.textContent === "";
                file.textContent = out.file ?? "";
                // a run again starts at the top too
                file.scrollTop = 0;
                file.scrollLeft = 0;
                const n = file.textContent === "" ? 0 : file.textContent.split("\n").length;
                const scrolls = file.scrollHeight > file.clientHeight || file.scrollWidth > file.clientWidth;
                lineCount.textContent = `${n.toLocaleString("en-US")} line${n === 1 ? "" : "s"}${scrolls ? "; scroll for the rest" : ""}`;
                lineCount.hidden = n === 0;
                const lines = [out.note, statusLine(out)];
                if (full && !CAPTURE && out.ran !== "not run") {
                    // the time differs on every run, so a capture leaves it out
                    // the backend once: in the line above when it gives a reason, else here
                    const on = out.ran === "" || statusLine(out) !== "" ? "" : ` on the ${out.ran.toUpperCase()}`;
                    lines.push(`${on === "" ? "Took" : `Ran${on} in`} ${ms.toLocaleString()} ms.`);
                }
                if (full && !CAPTURE && outside > 0) {
                    lines.push(
                        `${outside.toLocaleString()} node${outside === 1 ? " lies" : "s lie"} outside the view; zoom out to see ${outside === 1 ? "it" : "them"}.`,
                    );
                }
                status.textContent = lines.filter(Boolean).join("\n");
                status.style.color = "#14532d";
            } catch (e) {
                status.textContent = `failed: ${failureWords(e)}`;
                status.style.color = "#b00020";
                reportFailure(t.title, e);
            }
        }
    };
    // the canvases need their size before Cytoscape mounts
    let done = new Promise<void>((resolve) => requestAnimationFrame(() => resolve(runAll())));
    markDone(root, () => done);
    return root;
}
