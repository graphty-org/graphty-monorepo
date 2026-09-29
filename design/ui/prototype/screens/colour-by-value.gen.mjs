#!/usr/bin/env node
// Writes the drawings the color-or-size screen (screens/colour-by-value.html) needs beyond the kit's:
//   screens/img/ppi-foldchange-topup-{light,dark}.svg   fold change color, degree size, labels on the
//                                                        top 5 by largest increase (state 9)
//   screens/img/ppi-louvain-black-{light,dark}.svg      Louvain color with the element's own palette
//                                                        (Community 7 black), Community 8 picked dark gold
// and prints the color distances the too-close check reports (states 7 and 8).
// The protein network is the kit's own (kit/gen-canvas.mjs, same seed): this script runs a copy of it
// with its file writes turned off, the way screens/export-dialog.gen.mjs does.
// Run from design/ui/prototype/:  node screens/colour-by-value.gen.mjs
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = join(here, "..");

// ---- the top-5 increase drawing, from a no-write copy of gen-canvas.mjs
const hook = '    emit("ppi-foldchange-degree", ';
const src = readFileSync(join(proto, "kit/gen-canvas.mjs"), "utf8")
    .replace('import { readFileSync, writeFileSync, mkdirSync } from "node:fs";', 'import { readFileSync } from "node:fs"; const writeFileSync = () => {}; const mkdirSync = () => {};')
    .replace(hook, `    { const up = [...fc.keys()].filter((i) => fc[i] > 0).sort((a, b) => fc[b] - fc[a]).slice(0, 5);
      globalThis.__topup = { ids: up.map((i) => [names[i], fc[i]]), svg: Object.fromEntries(["light", "dark"].map((t) => [t, drawEncoded(t, { size: sizeByDeg, labels: up, title: "Colored by log2 fold change, sized by degree, the 5 largest increases labeled" })])) }; }\n${hook}`);
if (!src.includes("__topup")) throw new Error("gen-canvas.mjs changed: the fold-change block was not found");
const tmp = join(proto, "kit/.gen-canvas-cbv-copy.mjs");
writeFileSync(tmp, src);
try { await import(pathToFileURL(tmp).href); } finally { unlinkSync(tmp); }
const T = globalThis.__topup;
for (const t of ["light", "dark"]) writeFileSync(join(here, `img/ppi-foldchange-topup-${t}.svg`), T.svg[t]);
console.log("top 5 by largest increase:", T.ids.map(([n, v]) => `${n} ${v}`).join(", "));

// ---- Louvain with the element's palette: Community 7 is black, not an invented purple
for (const t of ["light", "dark"]) {
    const svg = readFileSync(join(here, `img/ppi-louvain-picked-${t}.svg`), "utf8").replaceAll("#6929C4", "#000000");
    writeFileSync(join(here, `img/ppi-louvain-black-${t}.svg`), svg);
}

// ---- the too-close check: deuteranopia (Machado 2009, severity 1), then CIEDE2000; close under 13
const M = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]];
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgb = (h) => [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
const sim = (l) => M.map((r) => Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2])));
const lab = ([r, g, b]) => {
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
function de2000([L1, a1, b1], [L2, a2, b2]) {
    const rad = Math.PI / 180, Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2, G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
    const a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1 = Math.hypot(a1p, b1), C2 = Math.hypot(a2p, b2);
    const hue = (a, b) => { const x = Math.atan2(b, a) / rad; return x < 0 ? x + 360 : x; };
    const h1 = hue(a1p, b1), h2 = hue(a2p, b2);
    let dh = h2 - h1; if (C1 * C2 === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
    const dH = 2 * Math.sqrt(C1 * C2) * Math.sin((dh * rad) / 2), Lb = (L1 + L2) / 2, Cp = (C1 + C2) / 2;
    let hb = h1 + h2; if (C1 * C2 !== 0) { hb = Math.abs(h1 - h2) > 180 ? (h1 + h2 + 360) / 2 : (h1 + h2) / 2; if (hb >= 360) hb -= 360; }
    const Tt = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
    const RC = 2 * Math.sqrt(Cp ** 7 / (Cp ** 7 + 25 ** 7)), SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cp, SH = 1 + 0.015 * Cp * Tt;
    const RT = -Math.sin(2 * 30 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad) * RC;
    return Math.sqrt((L2 - L1) ** 2 / SL ** 2 + (dH / SH) ** 2 + (C2 - C1) ** 2 / SC ** 2 + RT * ((C2 - C1) / SC) * (dH / SH));
}
const deut = (x, y) => de2000(lab(sim(rgb(x))), lab(sim(rgb(y))));
const CLOSE = 13;
const layers = {
    "Module color": { Ribosome: "56B4E9", Proteasome: "E69F00", "Complex I": "009E73", Spliceosome: "0072B2", "MAPK signaling": "000000", "DNA repair": "D55E00", "Cell cycle": "CC79A7", "TGF-beta": "F0E442", Other: "BDBDBD" },
    "Louvain color": { "Community 1": "E69F00", "Community 2": "56B4E9", "Community 3": "009E73", "Community 4": "0072B2", "Community 5": "D55E00", "Community 6": "CC79A7", "Community 7": "000000", "Community 8": "B8860B", Other: "BDBDBD" },
};
for (const [name, vals] of Object.entries(layers)) {
    const e = Object.entries(vals);
    for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) {
        const d = deut(e[i][1], e[j][1]);
        if (d < CLOSE) console.log(`${name}: ${e[i][0]} #${e[i][1]} and ${e[j][0]} #${e[j][1]} too close, ${d.toFixed(1)}`);
    }
}
// Suggestions for DNA repair: every color must clear all the others in the layer
const others = Object.entries(layers["Module color"]).filter(([k]) => k !== "DNA repair").map(([, v]) => v);
for (const c of ["882255", "8C510A", "332288"]) {
    const min = Math.min(...others.map((o) => deut(c, o)));
    if (min < CLOSE) throw new Error(`suggestion #${c} does not clear every neighbor (${min.toFixed(1)})`);
    console.log(`suggestion #${c}: nearest neighbor ${min.toFixed(1)}`);
}
