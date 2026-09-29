#!/usr/bin/env node
// Writes the figure files the Export dialog previews (screens/export-dialog.html), drawn as the
// written file would be: 174 mm wide (a two-column journal figure), white ground, every piece of
// text 8 pt at that size, the legend beside the drawing with its footer.
//   screens/img/export-figure-screen.svg      Look: Screen (the shipped red-to-blue palette)
//   screens/img/export-figure-print.svg       Look: Print (darkness = distance from 0, shape = sign)
//   screens/img/export-figure-print-gray.svg  the Print file as a gray printer renders it
//   screens/img/export-figure-screen-gray.svg the Screen file in gray (what the gray check reads)
//   screens/img/export-figure.json            the labels (top 10 by |log2 fold change|), which of them
//                                             overlap hides, the Print look's gray steps, the file's size
// The protein network is the kit's own (kit/gen-canvas.mjs, same seed): this script runs a copy of
// it with its file writes turned off and reads the 300 proteins, their layout and fold changes.
// Run from design/ui/prototype/:  node screens/export-dialog.gen.mjs
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = join(here, "..");
const fx = JSON.parse(readFileSync(join(proto, "kit/fixtures.json"), "utf8"));

// ---- the kit's protein network, read from a no-write copy of gen-canvas.mjs
const src = readFileSync(join(proto, "kit/gen-canvas.mjs"), "utf8")
    .replace('import { readFileSync, writeFileSync, mkdirSync } from "node:fs";', 'import { readFileSync } from "node:fs"; const writeFileSync = () => {}; const mkdirSync = () => {};')
    .replace('    emit("ppi-foldchange", ', '    globalThis.__ppi = { names, fc, deg, pos, edges, color: names.map((_, i) => fcColor(i)), r: names.map((_, i) => sizeByDeg(i)) };\n    emit("ppi-foldchange", ');
if (!src.includes("globalThis.__ppi")) throw new Error("gen-canvas.mjs changed: the protein block was not found");
const tmp = join(proto, "kit/.gen-canvas-export-copy.mjs");
writeFileSync(tmp, src);
try { await import(pathToFileURL(tmp).href); } finally { unlinkSync(tmp); }
const P = globalThis.__ppi;
const enc = fx.datasets.ppi.encodings.foldChange;
if (P.names.length !== fx.datasets.ppi.nodes || Math.min(...P.fc) !== enc.domain[0] || Math.max(...P.fc) !== enc.domain[1]) throw new Error("protein data differs from kit/fixtures.json");

// ---- geometry, in pt (1 pt = 1/72 in); 174 mm = 493.2 pt
const W = 493.2, DW = 318, DH = 212, LX = 330, FS = 8, PAD = 8;
const xs = P.pos.map((p) => p[0]), ys = P.pos.map((p) => p[1]);
const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
const s = Math.min((DW - 2 * PAD) / (x1 - x0), (DH - 2 * PAD) / (y1 - y0));
const ox = (DW - s * (x1 - x0)) / 2 - s * x0, oy = (DH - s * (y1 - y0)) / 2 - s * y0;
const X = (i) => ox + s * P.pos[i][0], Y = (i) => oy + s * P.pos[i][1];
const R = (i) => P.r[i] * 0.42; // 1.3 to 4.4 pt
const f1 = (v) => Math.round(v * 10) / 10;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ---- labels: top 10 by |value|, 8 pt, culled by collision (the larger change keeps its label)
const TOPN = 10;
const byAbs = [...P.fc.keys()].sort((a, b) => Math.abs(P.fc[b]) - Math.abs(P.fc[a]) || P.names[a].localeCompare(P.names[b]));
const top = byAbs.slice(0, TOPN);
const placed = [], shown = [], hidden = [];
const cw = (t) => t.length * 4.6; // Inter 8 pt, caps and digits
for (const i of top) {
    const w = cw(P.names[i]);
    let lx = X(i) + R(i) + 1.5;
    if (lx + w > DW - 2) lx = X(i) - R(i) - 1.5 - w;
    const box = { x: lx, y: Y(i) - 5.5, w, h: FS + 1, i };
    if (placed.some((b) => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h)) { hidden.push(i); continue; }
    placed.push(box); shown.push(i);
}

// ---- looks
const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const lerp = (a, b, t) => "#" + hex(a).map((v, k) => Math.round(v * (1 - t) + hex(b)[k] * t).toString(16).padStart(2, "0")).join("");
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gray = (h) => { const [r, g, b] = hex(h).map(lin); const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; const v = Math.round(255 * (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055)); return "#" + v.toString(16).padStart(2, "0").repeat(3); };
const MAXABS = Math.max(...P.fc.map(Math.abs)); // one scale for both sides: equal distance, equal darkness
// Print: no band. Shape is the sign (every value above 0 is up, every value below is down); darkness is the
// distance from 0 in a few gray steps, the same steps on both sides (hue kept: red below, blue above).
const STEP = 0.8, NSTEP = Math.ceil(MAXABS / STEP); // 0 to 0.8, 0.8 to 1.6, 1.6 to 2.4, 2.4 to 3.2
const stepOf = (v) => Math.min(NSTEP - 1, Math.floor(Math.abs(v) / STEP));
const stepFill = (sign, k) => { const t = NSTEP === 1 ? 1 : k / (NSTEP - 1); return sign < 0 ? lerp("#f6c3b4", "#67001f", t) : lerp("#c3dcee", "#08306b", t); };
const printFill = (v) => stepFill(v, stepOf(v));
const downN = P.fc.filter((v) => v < 0).length, upN = P.fc.filter((v) => v > 0).length;
if (downN !== enc.below0 || upN !== enc.above0) throw new Error("Print counts differ from the Screen legend's");

const RED_BLUE = enc.palette;
const zeroAt = (0 - enc.domain[0]) / (enc.domain[1] - enc.domain[0]);
const bins = fx.datasets.ppi.encodings.sizeByDegree.bins;

function wrap(text, width) {
    const out = []; let line = "";
    for (const w of text.split(" ")) { if (line && (line + " " + w).length * 4.05 > width) { out.push(line); line = w; } else line = line ? line + " " + w : w; }
    return [...out, line];
}

function figure(look) {
    const print = look === "print";
    const node = (i) => {
        const x = X(i), y = Y(i), r = R(i), v = P.fc[i];
        if (!print) return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${P.color[i]}" stroke="#767676" stroke-width="0.4"/>`;
        const k = r * 1.25, up = v > 0;
        const pts = up ? [[x, y - k], [x + k * 0.95, y + k * 0.65], [x - k * 0.95, y + k * 0.65]] : [[x, y + k], [x + k * 0.95, y - k * 0.65], [x - k * 0.95, y - k * 0.65]];
        return `<polygon points="${pts.map((p) => p.map(f1).join(",")).join(" ")}" fill="${printFill(v)}" stroke="#4d4d4d" stroke-width="0.35"/>`;
    };
    const order = [...P.fc.keys()].sort((a, b) => Math.abs(P.fc[a]) - Math.abs(P.fc[b])); // the largest changes drawn last, on top
    const edges = P.edges.map(([a, b]) => `<line x1="${f1(X(a))}" y1="${f1(Y(a))}" x2="${f1(X(b))}" y2="${f1(Y(b))}"/>`).join("");
    const labels = placed.map((b) => `<text x="${f1(b.x)}" y="${f1(b.y + 6.5)}">${esc(P.names[b.i])}</text>`).join("");

    // legend, beside the drawing
    let y = 10; const L = [];
    const t = (txt, o = {}) => { const ls = wrap(txt, W - 4 - LX); ls.forEach((ln, k) => { L.push(`<text x="${LX}" y="${f1(y)}"${o.b ? ' font-weight="600"' : ""}${o.c ? ` fill="${o.c}"` : ""}>${esc(ln)}</text>`); y += k < ls.length - 1 ? 10 : o.gap ?? 10; }); };
    t("log2 fold change", { b: true });
    t(print ? "Shape is the sign; darker is a larger change." : "Red: down. Blue: up. White: 0.", { c: "#4d4d4d", gap: print ? 13 : 5 });
    if (!print) {
        const at = (u) => (u <= 0.5 ? (u / 0.5) * zeroAt : zeroAt + ((u - 0.5) / 0.5) * (1 - zeroAt)); // 0 sits where the data puts it
        const stops = RED_BLUE.map((c, k) => `<stop offset="${f1(at(k / (RED_BLUE.length - 1)) * 100)}%" stop-color="${c}"/>`).join("");
        L.push(`<defs><linearGradient id="rb"><stop offset="0%" stop-color="${RED_BLUE[0]}"/>${stops}</linearGradient></defs>`);
        L.push(`<rect x="${LX}" y="${y}" width="120" height="7" fill="url(#rb)" stroke="#767676" stroke-width="0.4"/>`);
        y += 15;
        L.push(`<text x="${LX}" y="${y}">${enc.domain[0]}</text><text x="${f1(LX + 120 * zeroAt)}" y="${y}" text-anchor="middle">0</text><text x="${LX + 120}" y="${y}" text-anchor="end">+${enc.domain[1]}</text>`);
        y += 11;
        t(`${enc.below0} below 0, ${enc.above0} above`, { c: "#4d4d4d", gap: 13 });
    } else {
        // one row per gray step: a down and an up triangle in that step's fill, and the values it holds
        const tri = (cx, up, fill) => { const p = up ? [[cx, y - 7], [cx + 4, y - 1], [cx - 4, y - 1]] : [[cx, y - 1], [cx + 4, y - 7], [cx - 4, y - 7]]; return `<polygon points="${p.map((q) => q.join(",")).join(" ")}" fill="${fill}" stroke="#4d4d4d" stroke-width="0.35"/>`; };
        L.push(`<text x="${LX + 26}" y="${y}" fill="#4d4d4d">|change|</text><text x="${W - 30}" y="${y}" text-anchor="end" fill="#4d4d4d">down</text><text x="${W - 4}" y="${y}" text-anchor="end" fill="#4d4d4d">up</text>`);
        y += 11;
        for (let k = NSTEP - 1; k >= 0; k--) {
            const lo = f1(k * STEP), hi = f1((k + 1) * STEP);
            const dn = P.fc.filter((v) => v < 0 && stepOf(v) === k).length, un = P.fc.filter((v) => v > 0 && stepOf(v) === k).length;
            L.push(tri(LX + 4, false, stepFill(-1, k)) + tri(LX + 14, true, stepFill(1, k)) + `<text x="${LX + 26}" y="${y}">${lo} to ${hi}</text><text x="${W - 30}" y="${y}" text-anchor="end">${dn}</text><text x="${W - 4}" y="${y}" text-anchor="end">${un}</text>`);
            y += 11;
        }
        L.push(`<text x="${LX + 26}" y="${y}">total</text><text x="${W - 30}" y="${y}" text-anchor="end">${downN}</text><text x="${W - 4}" y="${y}" text-anchor="end">${upN}</text>`);
        y += 15;
    }
    t("Degree", { b: true });
    t("node size: number of interactions", { c: "#4d4d4d", gap: 6 });
    const bx = [0, 24, 50, 80, 114];
    bins.forEach((b, k) => { const rr = b.radius * 0.42; L.push(`<circle cx="${LX + bx[k] + 5}" cy="${f1(y + 5 - rr)}" r="${f1(rr)}" fill="#9a9a9a"/>`); });
    y += 14;
    L.push(bins.map((b, k) => `<text x="${LX + bx[k] + 5}" y="${y}" text-anchor="middle">${b.from === b.to ? b.from : `${b.from}-${b.to}`}</text>`).join(""));
    y += 13;
    t(`Labeled: the ${TOPN} largest changes${hidden.length ? `, ${shown.length} shown` : ""}`, { gap: 12 });
    // the legend's footer: how each number was computed, and the weight answer
    L.push(`<line x1="${LX}" y1="${y - 7}" x2="${W - 4}" y2="${y - 7}" stroke="#bdbdbd" stroke-width="0.5"/>`);
    y += 2;
    const foot = ["Degree: exact, not normalized, on the full graph (300 proteins, 1,262 interactions).", "Weight: confidence, not used yet; no measure here reads a weight.", print ? "Look: Print. Gray-safe: sign is shape." : "Look: Screen."];
    for (const para of foot) t(para, { c: "#333333" });
    const H = Math.ceil(Math.max(DH, y)) + 4;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}pt" height="${H}pt" viewBox="0 0 ${W} ${H}" font-family="Inter, Arial, sans-serif" font-size="${FS}" fill="#1a1a1a">
<title>Protein interactions, colored by log2 fold change (${print ? "Print look" : "Screen look"})</title>
<rect width="${W}" height="${H}" fill="#ffffff"/>
<g stroke="#808080" stroke-width="0.35" stroke-opacity="0.35">${edges}</g>
<g>${order.map(node).join("")}</g>
<g stroke="#ffffff" stroke-width="2" stroke-linejoin="round" paint-order="stroke">${labels}</g>
<g>${L.join("")}</g>
</svg>
`;
}
const toGray = (svg) => svg.replace(/#[0-9a-fA-F]{6}\b/g, (h) => gray(h)).replaceAll('id="rb"', 'id="rb-gray"').replaceAll("url(#rb)", "url(#rb-gray)").replace("(Print look)", "(Print look, as printed in gray)").replace("(Screen look)", "(Screen look, as printed in gray)");
const out = (n, t) => writeFileSync(join(here, "img", n), t);
const screen = figure("screen"), print = figure("print");
out("export-figure-screen.svg", screen);
out("export-figure-screen-gray.svg", toGray(screen));
out("export-figure-print.svg", print);
out("export-figure-print-gray.svg", toGray(print));
const hOf = (svg) => Number(svg.match(/height="([\d.]+)pt"/)[1]);
const data = {
    note: "written by screens/export-dialog.gen.mjs; the figure files the Export dialog previews",
    widthMm: 174, widthPt: W, heightPt: { screen: hOf(screen), print: hOf(print) }, fontPt: FS,
    labels: { rule: `top ${TOPN} by |log2FoldChange|`, n: TOPN, shown: shown.map((i) => ({ id: P.names[i], log2FoldChange: P.fc[i] })), hidden: hidden.map((i) => ({ id: P.names[i], log2FoldChange: P.fc[i] })) },
    up: upN, down: downN,
    // the Print look's gray steps, darkest first: the values each holds, its counts, and the gray each side prints as
    steps: [...Array(NSTEP).keys()].reverse().map((k) => ({ from: f1(k * STEP), to: f1((k + 1) * STEP),
        down: P.fc.filter((v) => v < 0 && stepOf(v) === k).length, up: P.fc.filter((v) => v > 0 && stepOf(v) === k).length,
        grayDown: gray(stepFill(-1, k)), grayUp: gray(stepFill(1, k)) })),
};
out("export-figure.json", JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify(data));
