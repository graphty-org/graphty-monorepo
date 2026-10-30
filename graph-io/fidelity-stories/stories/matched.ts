/**
 * The position-matched fidelity story (`<sample>@matched`): graphty-element draws a sample with its nodes moved to
 * where the program drew them (the oracle tests' own `matchPositions`), so style is judged apart from layout, and the
 * elements failing there are shown on the pictures. Three panels share the oracle's frame and scale: the program's own
 * drawing, graphty-element's drawing carried into that frame by the comparison's fitted transform, and the two
 * overlaid (the oracle at 50%). Every element that fails a property the known failures do not list (the gate's own
 * judgement, `judgeKey`) is outlined on all three and listed below them with its property and a short reason;
 * hovering a list item picks its outline out, and clicking it zooms every panel onto that element. The outlines are this story's own SVG over the pictures: nothing in
 * graphty-element is restyled.
 *
 * The story root has `whenDone()`, which settles once the comparison and the pictures are done; the play function
 * waits on it. A failure is printed as "fidelity story failed: <reason>".
 */
import "../../../graphty-element/index.ts";

import type { StoryObj } from "@storybook/web-components-vite";

import { createSampleElement, importSample, sampleData } from "../../../graphty-element/test/fidelity/load-sample";
import type { OracleReport } from "../../../graphty-element/test/fidelity/oracle/compare-oracle";
import { judgeKey, type NewFailure } from "../../../graphty-element/test/fidelity/oracle/floors";
import { matchedKey, matchPositions } from "../../../graphty-element/test/fidelity/oracle/match-positions";
import {
    compareWithOracle,
    ORACLE_CANVAS,
    ORACLE_IDS,
    oracleFormatOptions,
    oracleGraphName,
    oracleMeta,
    oraclePngUrl,
} from "../../../graphty-element/test/fidelity/oracle/oracle-library";
import type { PBox, PScene, Pt } from "../../../graphty-element/test/fidelity/oracle/primitives";
import oracleFloors from "../../../graphty-element/test/fidelity/oracle-floors.json";
import oracleKnown from "../../../graphty-element/test/fidelity/oracle-known-failures.json";
import { CORPUS_SAMPLES } from "../../test/fidelity/corpus-samples";
import { type FidelitySample, SAMPLES } from "../../test/fidelity/samples";

const { width: W, height: H } = ORACLE_CANVAS;
const KNOWN: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = oracleKnown.known;
const FLOORS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
    ...oracleFloors.floors,
    ...oracleFloors.standInFloors,
};

const esc = (s: unknown): string =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const STYLE = `<style>
[data-fidelity]{box-sizing:border-box;width:100%;padding:8px 16px;background:#fff;color:#1a1a1a;font:12px/1.35 system-ui,sans-serif;overflow-x:hidden}
[data-fidelity] h2{font-size:14px;margin:0 0 4px}
[data-fidelity] p{margin:0 0 6px}
[data-fidelity] .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));margin-bottom:12px}
[data-fidelity] figure{margin:0;min-width:0;border:1px solid #ddd}
[data-fidelity] figure svg{display:block;width:100%;height:auto;background:#fff}
[data-fidelity] figcaption{padding:4px 6px;border-top:1px solid #ddd}
[data-fidelity] .host{position:absolute;left:-99999px;top:0;pointer-events:none}
[data-fidelity] .hl{vector-effect:non-scaling-stroke;fill:none;stroke:#00b4ff;stroke-opacity:.55;stroke-linecap:round;stroke-linejoin:round}
[data-fidelity] .tag{font:700 calc(40px * var(--k,1)) Arial,sans-serif;fill:#e0007a;stroke:#fff;stroke-width:calc(8px * var(--k,1));paint-order:stroke}
[data-fidelity].dim .mark{opacity:.15}
[data-fidelity].dim .mark.hot{opacity:1}
[data-fidelity] .mark.hot .hl{stroke:#e0007a;stroke-opacity:.8}
[data-fidelity] ol{margin:0;padding-left:28px}
[data-fidelity] li{padding:2px 4px;cursor:zoom-in}
[data-fidelity] li.zoomed{background:#fbc7e4;cursor:zoom-out}
[data-fidelity] li:hover{background:#fde3f1}
[data-fidelity] li code{font-size:11px}
</style>`;

/** An element outlined on the pictures, in the oracle's pixels. */
type Shape = { line: Pt[] } | { box: { x0: number; y0: number; x1: number; y1: number } };

/**
 * How far a path bows from its chord, over the chord's length: positive to the left going source to target.
 * @param pts - the path
 * @returns the bow
 */
function bow(pts: readonly Pt[]): number {
    const [ax, ay] = pts[0];
    const [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let best = 0;
    for (const [x, y] of pts) {
        const d = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / len;
        if (Math.abs(d) > Math.abs(best)) {
            best = d;
        }
    }
    return best / len;
}

const bowText = (b: number): string =>
    Math.abs(b) < 0.005 ? "straight" : `${String(Math.round(Math.abs(b) * 100))}% ${b < 0 ? "left" : "right"}`;

/**
 * One element's outline on either side, in the oracle's pixels: the oracle's own, and graphty's carried through the
 * comparison's fit (by the pairing, or by its `graphty:` id for an element only graphty draws).
 * @param f - the failing element and property
 * @param report - the matched comparison
 * @param oracle - the oracle's drawing
 * @param graphty - graphty's drawing
 * @param toOracle - graphty's pixels into the oracle's
 * @returns each side's outline, where that side drew the element
 */
function shapesOf(
    f: NewFailure,
    report: OracleReport,
    oracle: PScene,
    graphty: PScene,
    toOracle: (p: Pt) => Pt,
): { o?: Shape; g?: Shape } {
    const base = f.id.replace(/@(source|target)$/, "");
    // the property names the kind of element (ids are only unique within a kind); a label's is its node's or edge's
    const prefix = f.property.split(".")[0];
    const kind = (want: string): boolean => prefix === want || !["edge", "node", "group"].includes(prefix);
    const box = (b: PBox, map: (p: Pt) => Pt): Shape => {
        const [p, q] = [map([b.x0, b.y0]), map([b.x1, b.y1])];
        return {
            box: {
                x0: Math.min(p[0], q[0]),
                y0: Math.min(p[1], q[1]),
                x1: Math.max(p[0], q[0]),
                y1: Math.max(p[1], q[1]),
            },
        };
    };
    const shape = (scene: PScene, key: string, map: (p: Pt) => Pt): Shape | undefined => {
        const e = kind("edge") ? scene.edges.find((x) => x.id === key) : undefined;
        if (e !== undefined && e.points.length > 1) {
            return { line: e.points.map(map) };
        }
        const n = kind("node") ? scene.nodes.find((x) => x.id === key) : undefined;
        if (n !== undefined) {
            return box({ x0: n.cx - n.w / 2, y0: n.cy - n.h / 2, x1: n.cx + n.w / 2, y1: n.cy + n.h / 2 }, map);
        }
        const g = kind("group") ? scene.groups.find((x) => x.id === key) : undefined;
        return g === undefined ? undefined : box(g.box, map);
    };
    if (base.startsWith("graphty:")) {
        return { g: shape(graphty, base.slice("graphty:".length), toOracle) };
    }
    const { nodes, edges, groups } = report.paired;
    const byKind: Record<string, Record<string, string>> = { group: groups, node: nodes, edge: edges };
    const paired = byKind[prefix] ?? { ...nodes, ...edges };
    const gKey = Object.entries(paired).find(([, o]) => o === base)?.[0];
    return {
        o: shape(oracle, base, (p) => p),
        g: gKey === undefined ? undefined : shape(graphty, gKey, toOracle),
    };
}

/**
 * Why an element fails, in a few words: for an edge's route or bow how far each side bows, else the comparator's
 * own values where it lists the element among the worst, else the property's tolerance.
 * @param f - the failure
 * @param shapes - its outlines
 * @param report - the matched comparison
 * @param program - the oracle program's name
 * @returns the reason
 */
function reasonOf(f: NewFailure, shapes: { o?: Shape; g?: Shape }, report: OracleReport, program: string): string {
    const r = report.properties[f.property as keyof OracleReport["properties"]];
    if (f.property.endsWith(".extra") || (shapes.o === undefined && shapes.g !== undefined)) {
        return `graphty draws this; ${program} draws nothing it pairs with`;
    }
    if (shapes.g === undefined) {
        return `${program} draws this; graphty draws nothing it pairs with`;
    }
    const lines =
        "line" in shapes.g && shapes.o !== undefined && "line" in shapes.o ? [shapes.o.line, shapes.g.line] : null;
    if (lines !== null && (f.property === "edge.route" || f.property === "edge.curve")) {
        return `bows ${bowText(bow(lines[0]))} in ${program}, ${bowText(bow(lines[1]))} in graphty (of its length)`;
    }
    const w = r?.worst.find((x) => x.id === f.id);
    if (w !== undefined) {
        return `${program} ${JSON.stringify(w.oracle)}, graphty ${JSON.stringify(w.graphty)}`;
    }
    return r?.tolerance ?? "beyond tolerance";
}

const svgOf = (shape: Shape, width: number, dash: boolean): string => {
    const d = dash ? ' stroke-dasharray="10 8"' : "";
    if ("line" in shape) {
        return `<polyline class="hl" points="${shape.line.map((p) => p.join(",")).join(" ")}" stroke-width="${String(width)}"${d}/>`;
    }
    const b = shape.box;
    return `<rect class="hl" x="${String(b.x0 - 4)}" y="${String(b.y0 - 4)}" width="${String(b.x1 - b.x0 + 8)}" height="${String(b.y1 - b.y0 + 8)}" stroke-width="${String(width / 2)}"${d}/>`;
};

const pointsOf = (s: Shape): Pt[] =>
    "line" in s
        ? s.line
        : [
              [s.box.x0, s.box.y0],
              [s.box.x1, s.box.y1],
          ];

const anchorOf = (s: Shape): Pt => ("line" in s ? s.line[Math.floor(s.line.length / 2)] : [s.box.x1 + 6, s.box.y0 - 6]);

/**
 * Draws one sample at the oracle's node positions, with its newly failing elements outlined and listed.
 * @param sample - the sample
 * @param fileUrl - where the build serves the sample file
 * @returns the story root
 */
function render(sample: FidelitySample, fileUrl: string): HTMLElement {
    const key = matchedKey(sample.id);
    const root = document.createElement("div");
    root.dataset.fidelity = key;
    root.innerHTML = `${STYLE}<h2>${esc(key)}</h2><p>${esc(sample.file)}: graphty-element drawn with its nodes at the program's own positions.</p>
<div class="grid"></div><p class="summary">Comparing...</p><ol></ol>`;
    const grid = root.querySelector(".grid") as HTMLElement;
    const summary = root.querySelector(".summary") as HTMLElement;
    const list = root.querySelector("ol") as HTMLElement;
    const host = document.createElement("div");
    host.className = "host";
    const element = createSampleElement(W, H);
    host.appendChild(element);
    root.appendChild(host);

    const done = (async (): Promise<void> => {
        try {
            const meta = oracleMeta(sample.id);
            const program = typeof meta.program === "string" ? meta.program : "the oracle";
            const pngUrl = await oraclePngUrl(sample.id);
            if (pngUrl === undefined) {
                throw new Error("the oracle library has no PNG of this sample");
            }
            const oracleHref = new URL(pngUrl, document.baseURI).href;
            const stored = new Uint8Array(await (await fetch(fileUrl)).arrayBuffer());
            const { sha256, data } = await sampleData(stored, stored[0] === 0x1f && stored[1] === 0x8b);
            const blobUrl = URL.createObjectURL(data);
            let loaded: string;
            try {
                loaded = await importSample(
                    element,
                    sample.format,
                    blobUrl,
                    oracleGraphName(meta),
                    oracleFormatOptions(meta, sample.format),
                );
            } finally {
                URL.revokeObjectURL(blobUrl);
            }
            const first = await compareWithOracle(sample.id, element, sha256, loaded);
            if (!(await matchPositions(element, first, meta.mirrored === true))) {
                throw new Error("fewer than two nodes pair with the oracle's: nothing to move");
            }
            const second = await compareWithOracle(sample.id, element, sha256, `${loaded}; nodes moved`);
            const { report } = second;
            const gate = judgeKey(
                key,
                { failures: report.failures, judged: report.judged, scores: second.scores },
                KNOWN[key],
                FLOORS[key],
            );
            const shot = await element.captureScreenshot({ format: "png", width: W, height: H });
            host.remove();
            const graphtyHref = URL.createObjectURL(shot.blob);

            const t = report.transform;
            if (t === null) {
                throw new Error("the matched comparison fitted no frame");
            }
            const th = (t.rotationDeg * Math.PI) / 180;
            const toOracle = ([x, y0]: Pt): Pt => {
                const y = t.reflect ? -y0 : y0;
                return [
                    t.scale * (Math.cos(th) * x - Math.sin(th) * y) + t.tx,
                    t.scale * (Math.sin(th) * x + Math.cos(th) * y) + t.ty,
                ];
            };
            const fitted = `translate(${String(t.tx)} ${String(t.ty)}) rotate(${String(t.rotationDeg)}) scale(${String(t.scale)} ${String(t.reflect ? -t.scale : t.scale)})`;
            const lineWidth = 7; // screen pixels: the outlines keep their width when a panel zooms

            const items = gate.newlyFailing.map((f, i) => {
                const shapes = shapesOf(f, report, second.association.scene, second.graphty, toOracle);
                return { f, n: i + 1, shapes, reason: reasonOf(f, shapes, report, program) };
            });
            const marks = (side: "o" | "g" | "both"): string =>
                items
                    .map(({ n, shapes }) => {
                        const own = side === "both" ? [shapes.o, shapes.g] : [shapes[side]];
                        // where this side drew nothing, the other side's outline, dashed, says where it would be
                        const other = side === "both" ? undefined : shapes[side === "o" ? "g" : "o"];
                        const drawn = own.filter((s): s is Shape => s !== undefined);
                        const parts = drawn.map((s) => svgOf(s, lineWidth, false));
                        if (drawn.length === 0 && other !== undefined) {
                            parts.push(svgOf(other, lineWidth, true));
                        }
                        const at = drawn[0] ?? other;
                        const tag =
                            at === undefined
                                ? ""
                                : `<text class="tag" x="${String(anchorOf(at)[0])}" y="${String(anchorOf(at)[1])}" dx="0.3em" dy="-0.3em">${String(n)}</text>`;
                        return `<g class="mark" data-fail="${String(n)}">${parts.join("")}${tag}</g>`;
                    })
                    .join("");
            const img = (href: string, extra = ""): string =>
                `<image href="${href}" x="0" y="0" width="${String(W)}" height="${String(H)}"${extra}/>`;
            const panel = (inner: string, caption: string): string =>
                `<figure><svg viewBox="0 0 ${String(W)} ${String(H)}" role="img">${inner}</svg><figcaption>${caption}</figcaption></figure>`;
            await Promise.all(
                [oracleHref, graphtyHref].map(async (href) => {
                    const probe = new Image();
                    probe.src = href;
                    await probe.decode();
                }),
            );
            grid.innerHTML = [
                panel(`${img(oracleHref)}${marks("o")}`, esc(`${program}'s own drawing`)),
                panel(
                    `<g transform="${fitted}">${img(graphtyHref)}</g>${marks("g")}`,
                    "graphty-element at the program's node positions, carried into its frame (dashed: where graphty drew nothing)",
                ),
                panel(
                    `<g transform="${fitted}">${img(graphtyHref)}</g>${img(oracleHref, ' opacity="0.5"')}${marks("both")}`,
                    esc(`Overlay: ${program} at 50% over graphty-element`),
                ),
            ].join("");
            const passing = Object.values(gate.nowPassing).reduce((s, ids) => s + ids.length, 0);
            summary.textContent = `${String(items.length)} element(s) newly failing (failing a property the known failures do not list); ${String(passing)} known failure(s) pass now. Fit residual ${(t.rms * 100).toFixed(1)}% of the diagonal.`;
            list.innerHTML = items
                .map(
                    ({ f, n, reason }) =>
                        `<li data-fail="${String(n)}"><code>${esc(f.id)}</code> <b>${esc(f.property)}</b>: ${esc(reason)}</li>`,
                )
                .join("");
            for (const li of list.querySelectorAll<HTMLElement>("li")) {
                const n = li.dataset.fail;
                const hot = (on: boolean): void => {
                    root.classList.toggle("dim", on);
                    for (const m of root.querySelectorAll(`.mark[data-fail="${String(n)}"]`)) {
                        m.classList.toggle("hot", on);
                    }
                };
                li.addEventListener("mouseenter", () => {
                    hot(true);
                });
                li.addEventListener("mouseleave", () => {
                    hot(false);
                });
                // a click zooms every panel onto the element (both sides' outlines); another click shows it whole
                li.addEventListener("click", () => {
                    const zoomed = li.classList.toggle("zoomed");
                    for (const other of list.querySelectorAll("li.zoomed")) {
                        if (other !== li) {
                            other.classList.remove("zoomed");
                        }
                    }
                    const item = items[Number(n) - 1];
                    const pts = [item.shapes.o, item.shapes.g]
                        .filter((x): x is Shape => x !== undefined)
                        .flatMap(pointsOf);
                    let box = `0 0 ${String(W)} ${String(H)}`;
                    if (zoomed && pts.length > 0) {
                        const xs = pts.map((p) => p[0]);
                        const ys = pts.map((p) => p[1]);
                        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
                        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
                        // the canvas's own shape, three times the element's extent and never under 120 px across
                        const w = Math.max(
                            120,
                            3 * (Math.max(...xs) - Math.min(...xs)),
                            (3 * (Math.max(...ys) - Math.min(...ys)) * W) / H,
                        );
                        const h = (w * H) / W;
                        box = `${String(cx - w / 2)} ${String(cy - h / 2)} ${String(w)} ${String(h)}`;
                    }
                    root.style.setProperty("--k", String(Number(box.split(" ")[2]) / W));
                    for (const svg of grid.querySelectorAll("svg")) {
                        svg.setAttribute("viewBox", box);
                    }
                });
            }
        } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            summary.insertAdjacentHTML(
                "beforeend",
                `<span class="failed" style="color:#b00"> Failed: ${esc(reason)}</span>`,
            );
            console.error(`fidelity story failed: ${key}: ${reason}`);
        }
    })();
    Object.assign(root, { whenDone: () => done });
    return root;
}

type Root = HTMLElement & { whenDone: () => Promise<void> };

/**
 * A matched story whose `sample` arg picks any of the given samples that has an oracle.
 * @param files - the samples' files by sample id, imported with `?url`
 * @param initial - the sample it opens on
 * @returns the story
 */
export function matchedStory(files: Readonly<Record<string, string>>, initial: string): StoryObj {
    const options = Object.keys(files).filter((id) => ORACLE_IDS.includes(id));
    return {
        args: { sample: initial },
        argTypes: { sample: { control: "select", options, description: "The sample, among those with an oracle" } },
        render: (args) => {
            const id = String(args.sample);
            const sample = [...SAMPLES, ...CORPUS_SAMPLES].find((s) => s.id === id);
            const url = files[id];
            if (sample === undefined || url === undefined) {
                throw new Error(`${id} is not a fidelity sample with a file here`);
            }
            return render(sample, url);
        },
        play: async ({ canvasElement }) => {
            const root = canvasElement.querySelector<Root>("[data-fidelity]");
            if (root === null) {
                throw new Error("the story drew no root");
            }
            await root.whenDone();
            const failed = root.querySelector(".failed");
            if (failed !== null) {
                throw new Error(failed.textContent ?? "failed");
            }
        },
    };
}
