/**
 * One fidelity story: the source program's own picture of a sample on the left, graphty-element
 * importing the same file with its file styles in the middle, and on the right the per-property
 * scorecard the scored fidelity tests compute (graph-io's comparer against the committed reference
 * scenes, over the scene graphty-element's extractor reads off the renderer).
 *
 * The story root has `whenDone()`, which settles once the scorecard is drawn; visual-review waits
 * on it before the capture. A failure is printed as "fidelity story failed: <reason>", which the
 * capture treats as a failed story.
 */
import "../../../graphty-element/index.ts";

import type { StoryObj } from "@storybook/web-components-vite";

import {
    createSampleElement,
    drawnScene,
    importSample,
    nodeKeys,
    sampleData,
} from "../../../graphty-element/test/fidelity/load-sample";
import { compareSample, type SampleResult } from "../../test/fidelity/compare";
import { CORPUS_SAMPLES } from "../../test/fidelity/corpus-samples";
import { type FidelitySample, SAMPLES } from "../../test/fidelity/samples";
import { PROPERTIES, type Scene } from "../../test/fidelity/scene";

const WIDTH = 1200;
const HEIGHT = 900;
const PICTURE = 440;
const CAPTION = 40;

/** Every committed reference scene, by `<sample>/<route>`. */
const SCENES = import.meta.glob<string>("../../test/fidelity/scenes/*/*.ref.json", {
    query: "?url",
    import: "default",
    eager: true,
});

const sceneUrl = (id: string, route: string): string | undefined =>
    SCENES[`../../test/fidelity/scenes/${id}/${route}.ref.json`];

const esc = (s: unknown): string =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const COLORS: Record<string, string> = {
    pass: "#c8efd0",
    fail: "#f7c6c6",
    gap: "#f6ddb0",
    unjudged: "#eeeeee",
    degenerate: "#eeeeee",
};

/**
 * The scorecard: the fit and counts, then one row per property.
 * @param result - the comparer's result
 * @returns HTML
 */
function scorecard(result: SampleResult): string {
    const c = result.counts;
    const t = result.transform;
    const rows = PROPERTIES.map((p) => {
        const r = result.properties[p];
        const shown =
            r.status === "pass" || r.status === "fail" ? `${String(Math.round((r.passRate ?? 0) * 100))}%` : r.status;
        const worst = r.worst
            .slice(0, 3)
            .map((w) => `${w.id}: ref ${JSON.stringify(w.ref)}, drew ${JSON.stringify(w.got)}`)
            .join("\n");
        const title = [r.note, worst].filter(Boolean).join("\n");
        return `<tr title="${esc(title)}"><th>${p}</th><td style="background:${COLORS[r.status] ?? "#fff"}">${esc(shown)}</td><td>${String(r.n)}</td><td>${esc(r.judgedAgainst ?? "-")}</td></tr>`;
    }).join("");
    return `<p>Nodes ${String(c.matchedNodes)} of ${String(c.refNodes)} matched (drew ${String(c.subjectNodes)}); edges ${String(c.matchedEdges)} of ${String(c.refEdges)} (drew ${String(c.subjectEdges)}).
${t ? `Fit residual ${(t.rms * 100).toFixed(1)}% of the diagonal.` : "No fit."}</p>
<table><tr><th>property</th><th>pass</th><th>n</th><th>against</th></tr>${rows}</table>`;
}

/**
 * What drew a sample's reference picture (references/SOURCES.md has the details).
 * @param id - the sample
 * @returns the program
 */
function drawnBy(id: string): string {
    const kind = id.split("-")[0];
    if (id.startsWith("json-sigma") || id.startsWith("json-graphology")) {
        return "sigma 4.0.1";
    }
    if (id.startsWith("json-vis")) {
        return "vis-network 9.1.9";
    }
    const tools: Record<string, string> = {
        cx: "Cytoscape 3.10.5",
        cx2: "Cytoscape 3.10.5",
        cys: "Cytoscape 3.10.5",
        xgmml: "Cytoscape 3.10.5",
        dot: "Graphviz 14.1.2",
        gexf: "Gephi Toolkit 0.11.3",
        graphml: "draw.io 32.4.1 (yEd stand-in)",
        gml: "Graphviz gml2gv (yEd stand-in)",
        pajek: "a sketch of the file's values (not Pajek)",
        cyjs: "Cytoscape.js 3.34.3",
        json: "Cytoscape.js 3.34.3",
    };
    return tools[kind] ?? "unknown";
}

/**
 * Fetches JSON.
 * @param url - where
 * @returns the parsed body
 */
async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`${url}: HTTP ${String(res.status)}`);
    }
    return (await res.json()) as T;
}

/**
 * Draws one sample.
 * @param sample - the sample
 * @param fileUrl - where the build serves the sample file
 * @returns the story root
 */
function render(sample: FidelitySample, fileUrl: string): HTMLElement {
    const root = document.createElement("div");
    root.dataset.fidelity = sample.id;
    root.style.cssText = `display:grid;grid-template-columns:${String(PICTURE)}px ${String(PICTURE)}px 1fr;gap:0;width:${String(WIDTH)}px;height:${String(HEIGHT)}px;background:#fff;color:#1a1a1a;font:12px/1.35 system-ui,sans-serif;overflow:hidden`;
    const panel = (): HTMLElement => {
        const div = document.createElement("div");
        div.style.cssText = `position:relative;height:${String(HEIGHT)}px;border-right:1px solid #ddd;overflow:hidden`;
        root.appendChild(div);
        return div;
    };
    const caption = (parent: HTMLElement, text: string): void => {
        const p = document.createElement("p");
        p.style.cssText = `position:absolute;bottom:0;left:0;right:0;height:${String(CAPTION)}px;margin:0;padding:4px 6px;box-sizing:border-box;border-top:1px solid #ddd;overflow:hidden`;
        p.textContent = text;
        parent.appendChild(p);
    };

    const left = panel();
    const img = document.createElement("img");
    img.alt = `${sample.id}: the reference picture`;
    img.src = new URL(`references/${sample.id}.png`, document.baseURI).href;
    img.style.cssText = `display:block;width:${String(PICTURE)}px;height:${String(HEIGHT - CAPTION)}px;object-fit:contain`;
    left.appendChild(img);

    const middle = panel();
    const element = createSampleElement(PICTURE, HEIGHT - CAPTION);
    middle.appendChild(element);

    const right = panel();
    right.style.borderRight = "none";
    right.style.padding = "6px 8px";
    right.style.boxSizing = "border-box";
    right.innerHTML = `<style>[data-fidelity] table{border-collapse:collapse}[data-fidelity] td,[data-fidelity] th{border:1px solid #ddd;padding:1px 5px;text-align:left;font-weight:normal}[data-fidelity] p{margin:0 0 6px}</style><h2 style="font-size:14px;margin:0 0 4px">${esc(sample.id)}</h2><p>${esc(sample.file)} (${esc(sample.license)})</p><p>Scoring...</p>`;

    const done = (async (): Promise<void> => {
        try {
            const imgLoaded = img.decode();
            const refs = await Promise.all(
                sample.routes.map((route) => {
                    const url = sceneUrl(sample.id, route);
                    if (url === undefined) {
                        throw new Error(`no committed reference scene for ${route}`);
                    }
                    return fetchJson<Scene>(url);
                }),
            );
            caption(left, `Reference picture: ${drawnBy(sample.id)}. Scored against: ${sample.routes.join(", ")}.`);
            const stored = new Uint8Array(await (await fetch(fileUrl)).arrayBuffer());
            // By the gzip magic rather than the name: a server may already have unzipped a `.gz` in transit.
            const { sha256, data } = await sampleData(stored, stored[0] === 0x1f && stored[1] === 0x8b);
            const blobUrl = URL.createObjectURL(data);
            try {
                const loaded = await importSample(element, sample.format, blobUrl);
                const result = compareSample(sample.id, refs, drawnScene(element, sha256, loaded), nodeKeys(element));
                caption(middle, `graphty-element, file styles; ${loaded.slice(loaded.indexOf("; ") + 2)}`);
                right.lastElementChild?.remove();
                right.insertAdjacentHTML("beforeend", scorecard(result));
            } finally {
                URL.revokeObjectURL(blobUrl);
            }
            await imgLoaded;
        } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            right.insertAdjacentHTML("beforeend", `<p style="color:#b00">Failed: ${esc(reason)}</p>`);
            console.error(`fidelity story failed: ${sample.id}: ${reason}`);
        }
    })();
    Object.assign(root, { whenDone: () => done });
    return root;
}

const ALL: readonly FidelitySample[] = [...SAMPLES, ...CORPUS_SAMPLES];

/**
 * A story for one sample.
 * @param id - the sample's id (its directory under test/fidelity/scenes/)
 * @param fileUrl - the sample file, imported with `?url`
 * @returns the story
 */
export function fidelityStory(id: string, fileUrl: string): StoryObj {
    const sample = ALL.find((s) => s.id === id);
    if (sample === undefined) {
        throw new Error(`${id} is not a fidelity sample`);
    }
    return { name: id, render: () => render(sample, fileUrl) };
}
