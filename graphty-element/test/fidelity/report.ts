/**
 * The style fidelity report: one static HTML page (`out/report.html`) with an index of every
 * sample by property, then per sample the reference drawing beside graphty-element's canvas, the
 * per-property table (status, pass rate, the route judged against, the worst elements), how each
 * further reference route agrees with the direct one, and the API gaps. Served locally only.
 */
import type { PropertyResult, SampleResult, Status } from "../../../graph-io/test/fidelity/compare";
import { PROPERTIES, type Scene } from "../../../graph-io/test/fidelity/scene";

const esc = (s: unknown): string =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const pct = (r: PropertyResult): string => (r.passRate === null ? "-" : `${String(Math.round(r.passRate * 100))}%`);

const cell = (r: PropertyResult, title = ""): string =>
    `<td class="${r.status}" title="${esc(title || r.note || r.status)}">${esc(r.status === "pass" || r.status === "fail" ? pct(r) : r.status)}</td>`;

/**
 * Draws a scene as SVG in its own units: edges as polylines, nodes as their shape class, labels
 * inside. A sketch to recognize the reference drawing by, not a renderer to compare against.
 * @param scene - the scene
 * @returns an `<svg>` element
 */
export function sceneToSvg(scene: Scene): string {
    const xs = scene.nodes.flatMap((n) => [n.x - n.w / 2, n.x + n.w / 2]);
    const ys = scene.nodes.flatMap((n) => [n.y - n.h / 2, n.y + n.h / 2]);
    if (xs.length === 0) {
        return "<p>(empty scene)</p>";
    }
    const pad = 10;
    const x0 = Math.min(...xs) - pad;
    const y0 = Math.min(...ys) - pad;
    const w = Math.max(...xs) + pad - x0;
    const h = Math.max(...ys) + pad - y0;
    const parts: string[] = [];
    for (const g of scene.groups) {
        parts.push(
            `<rect x="${String(g.bbox.x)}" y="${String(g.bbox.y)}" width="${String(g.bbox.w)}" height="${String(g.bbox.h)}" fill="${g.fill ?? "none"}" fill-opacity="0.3" stroke="${g.border ?? "#888"}"/>`,
        );
    }
    for (const e of scene.edges) {
        const pts = e.points.map((p) => `${String(p[0])},${String(p[1])}`).join(" ");
        const dash = e.style === "dashed" ? ` stroke-dasharray="${String(4 * e.width)}"` : "";
        parts.push(
            `<polyline points="${pts}" fill="none" stroke="${e.color}" stroke-opacity="${String(e.opacity)}" stroke-width="${String(e.width)}"${dash}/>`,
        );
    }
    for (const n of [...scene.nodes].sort((a, b) => a.z - b.z)) {
        if (!n.visible) {
            continue;
        }
        const paint = `fill="${n.fill ?? "none"}" fill-opacity="${String(n.fillOpacity)}" stroke="${n.border.color ?? "none"}" stroke-width="${String(n.border.width)}"`;
        const { x, y } = n;
        const rx = n.w / 2;
        const ry = n.h / 2;
        if (n.shape === "ellipse") {
            parts.push(`<ellipse cx="${String(x)}" cy="${String(y)}" rx="${String(rx)}" ry="${String(ry)}" ${paint}/>`);
        } else if (n.shape === "diamond") {
            parts.push(
                `<polygon points="${String(x)},${String(y - ry)} ${String(x + rx)},${String(y)} ${String(x)},${String(y + ry)} ${String(x - rx)},${String(y)}" ${paint}/>`,
            );
        } else {
            const round = n.shape === "roundrect" ? ` rx="${String(Math.min(rx, ry) / 3)}"` : "";
            parts.push(
                `<rect x="${String(x - rx)}" y="${String(y - ry)}" width="${String(n.w)}" height="${String(n.h)}"${round} ${paint}/>`,
            );
        }
        if (n.label?.visible === true && n.label.position === "inside") {
            parts.push(
                `<text x="${String(x)}" y="${String(y)}" font-size="${String(n.label.fontSize)}" fill="${n.label.color}" text-anchor="middle" dominant-baseline="central">${esc(n.label.text.split("\n")[0])}</text>`,
            );
        }
    }
    const bg = scene.background ?? "#ffffff";
    return `<svg viewBox="${String(x0)} ${String(y0)} ${String(w)} ${String(h)}" style="background:${bg}">${parts.join("")}</svg>`;
}

/** One sample's inputs to the report. */
export interface ReportSample {
    result: SampleResult;
    /** The direct reference scene, drawn beside the canvas. */
    reference: Scene;
    /** The graphty canvas PNG, relative to the report. */
    png: string;
    file: string;
}

const STATUS_HELP: Record<Status, string> = {
    pass: "every judged element within threshold",
    fail: "some judged element outside threshold",
    gap: "graphty-element's public API cannot report it as drawn; counts as a fail",
    unjudged: "no reference route carries it, or nothing to compare",
    degenerate: "no alignment possible (all nodes at one point, or fewer than 2 matched)",
};

/**
 * Renders the report.
 * @param samples - every sample with a result
 * @param generatedAt - when
 * @returns the HTML document
 */
export function renderReport(samples: readonly ReportSample[], generatedAt: string): string {
    const index = samples
        .map(
            ({ result }) =>
                `<tr><th><a href="#${esc(result.sample)}">${esc(result.sample)}</a></th>${PROPERTIES.map((p) => cell(result.properties[p], `${p}: ${result.properties[p].judgedAgainst ?? "no reference"}; ${result.properties[p].note ?? ""}`)).join("")}</tr>`,
        )
        .join("");
    const sections = samples.map(({ result, reference, png, file }) => {
        const c = result.counts;
        const t = result.transform;
        const rows = PROPERTIES.map((p) => {
            const r = result.properties[p];
            const worst = r.worst
                .map(
                    (w) =>
                        `${esc(w.id)}: ${esc(JSON.stringify(w.value))} (ref ${esc(JSON.stringify(w.ref))}, got ${esc(JSON.stringify(w.got))})`,
                )
                .join("<br>");
            return `<tr><th>${p}</th>${cell(r)}<td>${String(r.n)}</td><td>${esc(r.judgedAgainst ?? "-")}</td><td class="small">${esc(r.note ?? "")}${worst ? `<br>${worst}` : ""}</td></tr>`;
        }).join("");
        const checks = Object.entries(result.routeChecks)
            .map(
                ([route, rc]) =>
                    `<tr><th>${esc(route)} vs ${esc(rc.against)}</th>${PROPERTIES.map((p) => cell(rc.properties[p], `${p}${rc.ledger[p] ? ` (ledger: ${rc.ledger[p]})` : ""}: ${rc.properties[p].note ?? ""}`)).join("")}</tr>`,
            )
            .join("");
        const gaps = result.gaps.map((g) => `<li><b>${esc(g.property)}</b>: ${esc(g.reason)}</li>`).join("");
        return `<section id="${esc(result.sample)}">
<h2>${esc(result.sample)}</h2>
<p class="small">${esc(file)} -- references: ${esc(result.references.join(", "))}.
Nodes ${String(c.matchedNodes)} matched of ${String(c.refNodes)} (graphty ${String(c.subjectNodes)}); edges ${String(c.matchedEdges)} of ${String(c.refEdges)} (graphty ${String(c.subjectEdges)}, ${String(c.reversedEdges)} reversed, ${String(c.extraSubjectEdges)} extra).
${t ? `Fit: scale ${t.scale.toPrecision(4)}, rotation ${(t.rotation * 57.2958).toFixed(1)} deg${t.reflect ? ", reflected" : ""}, residual ${(t.rms * 100).toFixed(2)}% of the diagonal.` : "No fit."}
${c.unmatchedRefNodes.length > 0 ? `Unmatched reference nodes, first ones: ${esc(c.unmatchedRefNodes.join(", "))}.` : ""}</p>
<div class="pair"><figure>${sceneToSvg(reference)}<figcaption>Reference: ${esc(reference.provenance.route)} (${esc(reference.provenance.tool)} ${esc(reference.provenance.version)})</figcaption></figure>
<figure><img src="${esc(png)}" alt="graphty-element canvas"><figcaption>graphty-element canvas</figcaption></figure></div>
<table><tr><th>property</th><th>status</th><th>n</th><th>judged against</th><th>note and worst elements</th></tr>${rows}</table>
${checks ? `<h3>Reference routes against the direct one</h3><div class="scroll"><table class="grid"><tr><th></th>${PROPERTIES.map((p) => `<th class="v">${p}</th>`).join("")}</tr>${checks}</table></div>` : ""}
<h3>graphty-element API gaps</h3><ul>${gaps}</ul>
</section>`;
    });
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Style Fidelity Report</title>
<style>
:root { --bg: #fff; --fg: #1a1a1a; --line: #ddd; --pass: #c8efd0; --fail: #f7c6c6; --gap: #f6ddb0; --muted: #eee; }
@media (prefers-color-scheme: dark) { :root { --bg: #161616; --fg: #e8e8e8; --line: #444; --pass: #1f4d2a; --fail: #5c2323; --gap: #5a4517; --muted: #2a2a2a; } }
body { background: var(--bg); color: var(--fg); font: 14px/1.4 system-ui, sans-serif; margin: 0 16px 48px; }
table { border-collapse: collapse; margin: 8px 0; }
td, th { border: 1px solid var(--line); padding: 2px 6px; text-align: left; vertical-align: top; }
.pass { background: var(--pass); } .fail { background: var(--fail); } .gap { background: var(--gap); }
.unjudged, .degenerate { background: var(--muted); }
.small { font-size: 12px; } .scroll { overflow-x: auto; }
th.v { writing-mode: vertical-rl; transform: rotate(180deg); font-weight: normal; }
.pair { display: flex; flex-wrap: wrap; gap: 12px; }
figure { margin: 0; flex: 1 1 380px; max-width: 800px; } figure svg, figure img { width: 100%; height: auto; border: 1px solid var(--line); }
</style></head><body>
<h1>Style fidelity</h1>
<p class="small">Generated ${esc(generatedAt)}. Each property is judged against the highest-ranked reference route that carries it.
${(Object.keys(STATUS_HELP) as Status[]).map((s) => `<span class="${s}">&nbsp;${s}&nbsp;</span> ${STATUS_HELP[s]}`).join("; ")}.</p>
<div class="scroll"><table class="grid"><tr><th>sample</th>${PROPERTIES.map((p) => `<th class="v">${p}</th>`).join("")}</tr>${index}</table></div>
${sections.join("\n")}
</body></html>
`;
}
