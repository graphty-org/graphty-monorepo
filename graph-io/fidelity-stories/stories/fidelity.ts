/**
 * One fidelity story, as still pictures that fit the screen: the source program's own drawing of a sample (its
 * real SVG export, rasterized, from the oracle library `graph-io/test/fidelity/oracles/`) with which program and
 * version drew it and whether it stands in for another program, beside graphty-element's drawing of the same file
 * with its file styles (side by side on a wide screen, stacked on a narrow one); below them the two overlaid, and
 * the comparator's table judging what graphty-element drew against that SVG property by property, with each
 * property's floor from `graphty-element/test/fidelity/oracle-floors.json`. The numbers are the oracle tests' own:
 * the story mounts the element off to the side at the oracle canvas size and runs the same comparison
 * (`graphty-element/test/fidelity/oracle/oracle-library.ts`). graphty-element's drawing is its own screenshot
 * (`captureScreenshot`) at the oracle canvas size, so touch and scroll cannot move the camera; the `live` arg
 * shows the interactive canvas instead.
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
    isStandIn,
    ORACLE_CANVAS,
    ORACLE_IDS,
    oracleFormatOptions,
    oracleGraphName,
    oracleMeta,
    oraclePngUrl,
} from "../../../graphty-element/test/fidelity/oracle/oracle-library";
import oracleFloors from "../../../graphty-element/test/fidelity/oracle-floors.json";
import { CORPUS_SAMPLES } from "../../test/fidelity/corpus-samples";
import { type FidelitySample, SAMPLES } from "../../test/fidelity/samples";
import { SPECIMEN_SAMPLES } from "../../test/fidelity/specimens/index";
import { categoryOf, type SpecimenFormat, specimenSampleId } from "../../test/fidelity/specimens/sheets";

const { width: W, height: H } = ORACLE_CANVAS;

const FLOORS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
    ...oracleFloors.floors,
    ...oracleFloors.standInFloors,
    ...oracleFloors.specificationFloors,
};

/** Who judged a sheet judged per setting, one line per reference (judges.json). */
const REFERENCE_TITLE: Readonly<Record<string, string>> = {
    oracle: "Judged by the sheet's oracle",
    "cytoscape-gml": "Judged by Cytoscape desktop's GML reader (STAND-IN, scored apart)",
    gml2gv: "Judged by gml2gv | neato -n2 (STAND-IN, scored apart)",
    specification: "Judged by the specification (not a program: each expectation cites its section in judges.json)",
};
const ALLOWED: Readonly<Record<string, unknown>> = oracleFloors.allowedDrops;

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
    const standIn = isStandIn(meta)
        ? "STAND-IN (not the program that wrote the file, or a raster of it): scored apart"
        : "the file's own program";
    return `Oracle: ${program}${version}; ${standIn}.`;
}

/**
 * The comparator's table: the counts and the fit, then one row per property with its pass count, rate and floor.
 * @param id - the sample
 * @param report - the comparison
 * @param scored - false for a sketch no program drew, which is reported but never scored
 * @param judgedOnly - list only the properties it judged (one reference's share of a sheet judged per setting)
 * @returns HTML
 */
function table(id: string, report: OracleReport, scored: boolean, judgedOnly = false): string {
    const c = report.counts;
    const t = report.transform;
    const floors = FLOORS[id] ?? {};
    const rows = ORACLE_PROPERTIES.filter((p) => !judgedOnly || report.properties[p].n > 0)
        .map((p) => {
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
        })
        .join("");
    const fit = t
        ? `Fit residual ${(t.rms * 100).toFixed(1)}% of the diagonal${t.unrelatedLayout ? " (unrelated layouts: positions and routes not judged)" : ""}.`
        : "No fit.";
    return `<p>Nodes ${String(c.matchedNodes)} of ${String(c.oracleNodes)} matched (graphty drew ${String(c.graphtyNodes)}); edges ${String(c.matchedEdges)} of ${String(c.oracleEdges)} (drew ${String(c.graphtyEdges)}). ${fit}${scored ? "" : " A sketch no program drew: reported, never scored."}</p>
<table><tr><th>property</th><th>passed</th><th>floor</th></tr>${rows}</table>`;
}

const STYLE = `<style>
[data-fidelity]{box-sizing:border-box;width:100%;max-width:100%;padding:8px 16px;background:#fff;color:#1a1a1a;font:12px/1.35 system-ui,sans-serif;overflow-x:hidden}
[data-fidelity] *{box-sizing:border-box}
[data-fidelity] h2{font-size:14px;margin:0 0 4px}
[data-fidelity] p{margin:0 0 6px}
[data-fidelity] .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));margin-bottom:12px}
[data-fidelity] figure{margin:0;min-width:0;border:1px solid #ddd}
[data-fidelity] .frame{position:relative;width:100%;aspect-ratio:${String(W)}/${String(H)};overflow:hidden;touch-action:pan-y}
[data-fidelity] .frame>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;user-select:none}
[data-fidelity] .frame>img[hidden]{display:none}
[data-fidelity] figcaption{padding:4px 6px;border-top:1px solid #ddd}
[data-fidelity] .host{position:absolute;left:-99999px;top:0;pointer-events:none}
[data-fidelity] .host.live{position:absolute;inset:0;left:0;pointer-events:auto}
[data-fidelity] .host.live graphty-element{width:100%!important;height:100%!important}
[data-fidelity] .tablebox{min-width:0;overflow-x:auto}
[data-fidelity] table{border-collapse:collapse}
[data-fidelity] td,[data-fidelity] th{border:1px solid #ddd;padding:1px 4px;text-align:left;font-weight:normal;white-space:nowrap;font-size:11px}
</style>`;

interface Figure {
    frame: HTMLElement;
    caption: HTMLElement;
}

/**
 * Draws one sample: the oracle and graphty-element's drawing side by side (stacked on a narrow screen), then
 * the two overlaid and the comparator's table. graphty-element draws off to the side at the oracle canvas size,
 * as the oracle tests mount it, so the table holds the tests' own numbers; what it drew is shown as its own
 * screenshot, a still picture touch cannot move, unless `live` asks for the interactive canvas.
 * @param sample - the sample
 * @param fileUrl - where the build serves the sample file
 * @param live - show the interactive canvas instead of its screenshot
 * @returns the story root
 */
function render(sample: FidelitySample, fileUrl: string, live: boolean): HTMLElement {
    const root = document.createElement("div");
    root.dataset.fidelity = sample.id;
    root.innerHTML = `${STYLE}<h2>${esc(sample.id)}</h2><p>${esc(sample.file)} (${esc(sample.license)})</p>`;
    const grid = (): HTMLElement => {
        const div = document.createElement("div");
        div.className = "grid";
        root.appendChild(div);
        return div;
    };
    const figure = (parent: HTMLElement, text: string): Figure => {
        const fig = document.createElement("figure");
        const frame = document.createElement("div");
        frame.className = "frame";
        const caption = document.createElement("figcaption");
        caption.textContent = text;
        fig.append(frame, caption);
        parent.appendChild(fig);
        return { frame, caption };
    };
    const image = (frame: HTMLElement, alt: string): HTMLImageElement => {
        const img = document.createElement("img");
        img.alt = alt;
        img.draggable = false;
        frame.appendChild(img);
        return img;
    };

    const hasOracle = ORACLE_IDS.includes(sample.id);
    const pair = grid();
    const left = figure(pair, "Oracle: loading...");
    const oracleImg = image(left.frame, `${sample.id}: the program's own drawing`);
    if (!hasOracle) {
        oracleImg.hidden = true;
        left.caption.textContent = `No oracle: ${NO_ORACLE[sample.id] ?? "no program has drawn this file yet."}`;
    }
    const middle = figure(pair, "graphty-element: loading...");
    const graphtyImg = image(middle.frame, `${sample.id}: graphty-element's drawing`);
    const host = document.createElement("div");
    host.className = "host";
    const element = createSampleElement(W, H);
    host.appendChild(element);
    middle.frame.appendChild(host);

    const below = grid();
    const overlay = hasOracle
        ? figure(below, "Overlay: the oracle at 50% opacity over graphty-element's drawing.")
        : undefined;
    const overGraphty = overlay ? image(overlay.frame, `${sample.id}: graphty-element's drawing`) : undefined;
    const overOracle = overlay
        ? image(overlay.frame, `${sample.id}: the program's own drawing, half transparent`)
        : undefined;
    if (overOracle) {
        overOracle.style.opacity = "0.5";
    }
    const right = document.createElement("div");
    right.className = "tablebox";
    right.innerHTML = "<p>Comparing...</p>";
    below.appendChild(right);

    const done = (async (): Promise<void> => {
        try {
            const meta = oracleMeta(sample.id);
            const decoded: Promise<void>[] = [];
            if (hasOracle) {
                const url = await oraclePngUrl(sample.id);
                if (url === undefined) {
                    throw new Error("the oracle library has no PNG of this sample");
                }
                const { href } = new URL(url, document.baseURI);
                oracleImg.src = href;
                decoded.push(oracleImg.decode());
                if (overOracle) {
                    overOracle.src = href;
                    decoded.push(overOracle.decode());
                }
                left.caption.textContent = provenance(meta);
            }
            const stored = new Uint8Array(await (await fetch(fileUrl)).arrayBuffer());
            // By the gzip magic rather than the name: a server may already have unzipped a `.gz` in transit.
            const { sha256, data } = await sampleData(stored, stored[0] === 0x1f && stored[1] === 0x8b);
            const blobUrl = URL.createObjectURL(data);
            try {
                const loaded = await importSample(
                    element,
                    sample.format,
                    blobUrl,
                    oracleGraphName(meta),
                    oracleFormatOptions(meta, sample.format),
                );
                const how = live ? "live canvas" : "its own screenshot";
                middle.caption.textContent = `graphty-element, file styles (${how}); ${loaded.slice(loaded.indexOf("; ") + 2)}`;
                right.lastElementChild?.remove();
                if (hasOracle) {
                    const { report, scores, references } = await compareWithOracle(sample.id, element, sha256, loaded);
                    if (references.length === 0) {
                        right.insertAdjacentHTML("beforeend", table(sample.id, report, Object.keys(scores).length > 0));
                    }
                    // a sheet judged per setting: each reference's share, with the floors of its own key
                    for (const r of references) {
                        const key = r.reference === "oracle" ? sample.id : `${sample.id}~${r.reference}`;
                        right.insertAdjacentHTML(
                            "beforeend",
                            `<h2>${esc(REFERENCE_TITLE[r.reference] ?? r.reference)}</h2>${table(key, r.report, true, true)}`,
                        );
                    }
                } else {
                    right.insertAdjacentHTML("beforeend", "<p>Nothing to compare against.</p>");
                }
            } finally {
                URL.revokeObjectURL(blobUrl);
            }
            // After the comparison, so the screenshot cannot disturb the numbers.
            const shot = await element.captureScreenshot({ format: "png", width: W, height: H });
            const shotUrl = URL.createObjectURL(shot.blob);
            for (const img of [graphtyImg, overGraphty]) {
                if (img) {
                    img.src = shotUrl;
                    decoded.push(img.decode());
                }
            }
            if (live) {
                graphtyImg.hidden = true;
                host.classList.add("live");
            }
            await Promise.all(decoded);
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

const ALL: readonly FidelitySample[] = [...SAMPLES, ...CORPUS_SAMPLES, ...SPECIMEN_SAMPLES];

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
    return {
        args: { live: false },
        argTypes: {
            live: {
                control: "boolean",
                description: "Show graphty-element's interactive canvas instead of its screenshot",
            },
        },
        render: (args) => render(sample, fileUrl, args.live === true),
    };
}

/**
 * A story with nothing to draw: one short paragraph saying why (a format with no such setting, a sheet not built
 * yet), so every format's folder lists the same stories.
 * @param id - what the root is marked with
 * @param html - the paragraph, as HTML
 * @returns the story
 */
function placeholderStory(id: string, html: string): StoryObj {
    return {
        render: () => {
            const root = document.createElement("div");
            root.dataset.fidelity = id;
            root.innerHTML = `${STYLE}<h2>${esc(id)}</h2><p>${html}</p>`;
            Object.assign(root, { whenDone: () => Promise.resolve() });
            return root;
        },
    };
}

/**
 * The story of one specimen sheet of a format: the sheet side by side with its oracle when the format's registry
 * lists it, else a placeholder saying the format has no such setting (with the documentation) or that the sheet is
 * not built yet.
 * @param format - the format's registry
 * @param sheetId - the sheet (`specimen-node-shapes`, `specimen-node-shapes-p2`)
 * @param files - the format's sheet files by path, imported with `?url` (`import.meta.glob`)
 * @returns the story
 */
export function specimenStory(format: SpecimenFormat, sheetId: string, files: Record<string, string>): StoryObj {
    const id = specimenSampleId(format.id, sheetId);
    const sheet = format.sheets.find((s) => s.id === sheetId);
    if (sheet !== undefined) {
        const url = Object.entries(files).find(([path]) => path.endsWith(`/${sheet.file}`))?.[1];
        if (url === undefined) {
            throw new Error(`${id}: the build serves no file ${sheet.file}`);
        }
        return fidelityStory(id, url);
    }
    const category = categoryOf(sheetId);
    const absent = category === undefined ? undefined : format.absent[category];
    if (absent !== undefined) {
        return placeholderStory(
            id,
            `${esc(format.title)} has no such setting: ${esc(absent.reason)} See <a href="${esc(absent.doc)}">${esc(absent.doc)}</a>.`,
        );
    }
    return placeholderStory(id, `This ${esc(format.title)} specimen sheet is not built yet.`);
}
