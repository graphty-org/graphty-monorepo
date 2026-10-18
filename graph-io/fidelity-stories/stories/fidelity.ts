/**
 * One fidelity story: on the left the source program's own drawing of a sample (its real SVG export, rasterized,
 * from the oracle library `graph-io/test/fidelity/oracles/`) with which program and version drew it and whether it
 * stands in for another program; in the middle graphty-element importing the same file with its file styles; on
 * the right the comparator's table, judging what graphty-element drew against that SVG property by property, with
 * each property's floor from `graphty-element/test/fidelity/oracle-floors.json`. The numbers are the oracle tests'
 * own: the story mounts the element at the oracle canvas size and runs the same comparison
 * (`graphty-element/test/fidelity/oracle/oracle-library.ts`).
 *
 * The story root has `whenDone()`, which settles once the table is drawn; visual-review waits on it before the
 * capture. A failure is printed as "fidelity story failed: <reason>", which the capture treats as a failed story.
 */
import "../../../graphty-element/index.ts";

import type { StoryObj } from "@storybook/web-components-vite";

import { createSampleElement, importSample, sampleData } from "../../../graphty-element/test/fidelity/load-sample";
import { ORACLE_PROPERTIES, type OracleReport } from "../../../graphty-element/test/fidelity/oracle/compare-oracle";
import {
    compareWithOracle,
    ORACLE_CANVAS,
    ORACLE_IDS,
    oracleGraphName,
    oracleMeta,
    oraclePngUrl,
} from "../../../graphty-element/test/fidelity/oracle/oracle-library";
import oracleFloors from "../../../graphty-element/test/fidelity/oracle-floors.json";
import { CORPUS_SAMPLES } from "../../test/fidelity/corpus-samples";
import { type FidelitySample, SAMPLES } from "../../test/fidelity/samples";

const { width: W, height: H } = ORACLE_CANVAS;
const TABLE = 560;
const CAPTION = 64;

const FLOORS: Readonly<Record<string, Readonly<Record<string, number>>>> = oracleFloors.floors;
const ALLOWED: Readonly<Record<string, string>> = oracleFloors.allowedDrops;

const esc = (s: unknown): string =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const COLORS = { pass: "#c8efd0", partial: "#f6ddb0", fail: "#f7c6c6", unjudged: "#eeeeee" } as const;

/**
 * Who drew the oracle, in one line: the program, its version, and whether it stands in for the program that wrote
 * the file.
 * @param meta - the oracle's metadata
 * @returns the line
 */
function provenance(meta: Record<string, unknown>): string {
    const program = typeof meta.program === "string" ? meta.program : "unknown program";
    const version = typeof meta.version === "string" ? ` ${meta.version}` : "";
    const standIn = meta.standIn === true ? "STAND-IN (not the program that wrote the file)" : "the file's own program";
    return `Oracle: ${program}${version}; ${standIn}.`;
}

/**
 * The comparator's table: the counts and the fit, then one row per property with its pass count, rate and floor.
 * @param id - the sample
 * @param report - the comparison
 * @param scored - false for a sketch no program drew, which is reported but never scored
 * @returns HTML
 */
function table(id: string, report: OracleReport, scored: boolean): string {
    const c = report.counts;
    const t = report.transform;
    const floors = FLOORS[id] ?? {};
    const rows = ORACLE_PROPERTIES.map((p) => {
        const r = report.properties[p];
        const floor = floors[p];
        let color: string = COLORS.unjudged;
        let shown = "not judged";
        if (r.passRate !== null) {
            const below = floor !== undefined && r.passRate < floor - 1e-9 && !(`${id}/${p}` in ALLOWED);
            if (below) {
                color = COLORS.fail;
            } else {
                color = r.passRate >= 1 ? COLORS.pass : COLORS.partial;
            }
            shown = `${String(r.pass)}/${String(r.n)} (${String(Math.round(r.passRate * 100))}%)`;
        }
        const worst = r.worst
            .slice(0, 3)
            .map((w) => `${w.id}: oracle ${JSON.stringify(w.oracle)}, graphty ${JSON.stringify(w.graphty)}`)
            .join("\n");
        const title = [r.tolerance, worst].filter(Boolean).join("\n");
        const floorText = floor === undefined ? "-" : `${String(Math.round(floor * 100))}%`;
        return `<tr title="${esc(title)}"><th>${p}</th><td style="background:${color}">${esc(shown)}</td><td>${floorText}</td></tr>`;
    }).join("");
    const fit = t
        ? `Fit residual ${(t.rms * 100).toFixed(1)}% of the diagonal${t.unrelatedLayout ? " (unrelated layouts: positions and routes not judged)" : ""}.`
        : "No fit.";
    return `<p>Nodes ${String(c.matchedNodes)} of ${String(c.oracleNodes)} matched (graphty drew ${String(c.graphtyNodes)}); edges ${String(c.matchedEdges)} of ${String(c.oracleEdges)} (drew ${String(c.graphtyEdges)}). ${fit}${scored ? "" : " A sketch no program drew: reported, never scored."}</p>
<table><tr><th>property</th><th>passed</th><th>floor</th></tr>${rows}</table>`;
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
    root.style.cssText = `display:grid;grid-template-columns:${String(W)}px ${String(W)}px ${String(TABLE)}px;width:${String(2 * W + TABLE)}px;height:${String(H + CAPTION)}px;background:#fff;color:#1a1a1a;font:12px/1.35 system-ui,sans-serif;overflow:hidden`;
    const panel = (): HTMLElement => {
        const div = document.createElement("div");
        div.style.cssText = `position:relative;height:${String(H + CAPTION)}px;border-right:1px solid #ddd;overflow:hidden`;
        root.appendChild(div);
        return div;
    };
    const caption = (parent: HTMLElement, text: string): void => {
        const p = document.createElement("p");
        p.style.cssText = `position:absolute;top:${String(H)}px;left:0;right:0;height:${String(CAPTION)}px;margin:0;padding:4px 6px;box-sizing:border-box;border-top:1px solid #ddd;overflow:hidden`;
        p.textContent = text;
        parent.appendChild(p);
    };

    const hasOracle = ORACLE_IDS.includes(sample.id);
    const left = panel();
    const img = document.createElement("img");
    if (hasOracle) {
        img.alt = `${sample.id}: the program's own drawing`;
        img.style.cssText = `display:block;width:${String(W)}px;height:${String(H)}px;object-fit:contain`;
        left.appendChild(img);
    } else {
        left.insertAdjacentHTML(
            "beforeend",
            `<p style="margin:16px">No oracle: ${esc(NO_ORACLE[sample.id] ?? "no program has drawn this file yet.")}</p>`,
        );
    }

    // At the oracle canvas size, as the oracle tests mount it, so the table holds the tests' own numbers.
    const middle = panel();
    const element = createSampleElement(W, H);
    middle.appendChild(element);

    const right = panel();
    right.style.borderRight = "none";
    right.style.padding = "6px 8px";
    right.style.boxSizing = "border-box";
    right.innerHTML = `<style>[data-fidelity] table{border-collapse:collapse}[data-fidelity] td,[data-fidelity] th{border:1px solid #ddd;padding:1px 4px;text-align:left;font-weight:normal;white-space:nowrap;font-size:11px}[data-fidelity] p{margin:0 0 6px}</style><h2 style="font-size:14px;margin:0 0 4px">${esc(sample.id)}</h2><p>${esc(sample.file)} (${esc(sample.license)})</p><p>Comparing...</p>`;

    const done = (async (): Promise<void> => {
        try {
            const meta = oracleMeta(sample.id);
            let imgLoaded: Promise<void> = Promise.resolve();
            if (hasOracle) {
                const url = await oraclePngUrl(sample.id);
                if (url === undefined) {
                    throw new Error("the oracle library has no PNG of this sample");
                }
                img.src = new URL(url, document.baseURI).href;
                imgLoaded = img.decode();
                caption(left, provenance(meta));
            }
            const stored = new Uint8Array(await (await fetch(fileUrl)).arrayBuffer());
            // By the gzip magic rather than the name: a server may already have unzipped a `.gz` in transit.
            const { sha256, data } = await sampleData(stored, stored[0] === 0x1f && stored[1] === 0x8b);
            const blobUrl = URL.createObjectURL(data);
            try {
                const loaded = await importSample(element, sample.format, blobUrl, oracleGraphName(meta));
                caption(middle, `graphty-element, file styles; ${loaded.slice(loaded.indexOf("; ") + 2)}`);
                right.lastElementChild?.remove();
                if (hasOracle) {
                    const { report, scores } = await compareWithOracle(sample.id, element, sha256, loaded);
                    right.insertAdjacentHTML("beforeend", table(sample.id, report, Object.keys(scores).length > 0));
                } else {
                    right.insertAdjacentHTML("beforeend", "<p>Nothing to compare against.</p>");
                }
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

/** Samples with a story but no oracle, and why. */
const NO_ORACLE: Readonly<Record<string, string>> = {
    "pajek-iliad":
        "the file stores no coordinates and Pajek itself never ran, so there is no drawing of it to compare against.",
    "cx2-imatinib-smpdb":
        'Cytoscape 3.10.5\'s CX2 reader fails on this file every time ("Network view is null"), so there is no drawing to compare against.',
};

const ALL: readonly FidelitySample[] = [...SAMPLES, ...CORPUS_SAMPLES];

/**
 * A story for one sample; its stories file names it, without the format its folder already says.
 * @param id - the sample's id
 * @param fileUrl - the sample file, imported with `?url`
 * @returns the story
 */
export function fidelityStory(id: string, fileUrl: string): StoryObj {
    const sample = ALL.find((s) => s.id === id);
    if (sample === undefined) {
        throw new Error(`${id} is not a fidelity sample`);
    }
    return { render: () => render(sample, fileUrl) };
}
