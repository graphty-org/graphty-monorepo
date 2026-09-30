// Selection-ring and palette-versus-canvas contrast over every palette graphty-element ships.
// Run from graphty-element/: npx tsx ../design/ui/framework/research/scripts/ring-and-canvas-contrast.ts
// Reads the palettes through the element's catalogue, so it follows them if they change.
// WCAG 2 relative luminance and contrast ratio; the maths matches
// graphty-element/test/catalog/default-palette-quality.test.ts.
import { PALETTE_DESCRIPTORS } from "../../../../../graphty-element/src/catalog/palettes";
import { OTHER_GROUP_COLOR } from "../../../../../graphty-element/src/config/palettes/categorical";

const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const Y = (h: string): number => {
    const v = [0, 2, 4].map((i) => lin(parseInt(h.replace("#", "").slice(i, i + 2), 16) / 255));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const cr = (a: string, b: string): number => {
    const [hi, lo] = [Y(a), Y(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};
const f2 = (n: number): string => n.toFixed(2);

const CANVAS = { light: "#F5F5F5", dark: "#1E1E1E" } as const;
const ACCENT = { light: "#0D99FF", dark: "#0C8CE9" } as const;

// Every colour, with the palettes it belongs to.
const owners = new Map<string, string[]>();
for (const p of PALETTE_DESCRIPTORS) {
    for (const c of p.colors) {
        const k = c.toUpperCase();
        owners.set(k, [...(owners.get(k) ?? []), p.id]);
    }
}
owners.set(OTHER_GROUP_COLOR.toUpperCase(), [...(owners.get(OTHER_GROUP_COLOR.toUpperCase()) ?? []), "overflow grey"]);
const ALL = [...owners.keys()];
console.log(`palettes: ${PALETTE_DESCRIPTORS.length}; distinct colours (with overflow grey): ${ALL.length}`);

// ---- 1. Rings. outer band borders the canvas, inner band borders the node fill. ----
// "any-band" = the better band against the colour (the colour may sit behind either band when nodes overlap).
type Ring = { name: string; outer: (t: "light" | "dark") => string; inner: string };
const RINGS: Ring[] = [
    { name: "neutral black / white", outer: () => "#000000", inner: "#FFFFFF" },
    { name: "neutral #1A1A1A / white", outer: () => "#1A1A1A", inner: "#FFFFFF" },
    { name: "accent / white", outer: (t) => ACCENT[t], inner: "#FFFFFF" },
    { name: "accent / black", outer: (t) => ACCENT[t], inner: "#000000" },
    { name: "accent / #1A1A1A", outer: (t) => ACCENT[t], inner: "#1A1A1A" },
];
const FOCUS = ["#0072B2", "#56B4E9"];
console.log("\n== 1. rings ==");
for (const r of RINGS) {
    for (const t of ["light", "dark"] as const) {
        const o = r.outer(t), i = r.inner;
        const band = cr(o, i);
        const outerVsCanvas = cr(o, CANVAS[t]);
        const anyVsCanvas = Math.max(outerVsCanvas, cr(i, CANVAS[t]));
        const innerVsFill = ALL.map((c) => ({ c, v: cr(i, c) }));
        const anyVsFill = ALL.map((c) => ({ c, v: Math.max(cr(o, c), cr(i, c)) }));
        const innerFails = innerVsFill.filter((x) => x.v < 3).sort((a, b) => a.v - b.v);
        const anyFails = anyVsFill.filter((x) => x.v < 3).sort((a, b) => a.v - b.v);
        const worst = [...anyVsFill].sort((a, b) => a.v - b.v)[0];
        const focus = FOCUS.map((c) => `${c} inner ${f2(cr(i, c))} outer ${f2(cr(o, c))}`).join("; ");
        console.log(
            `${r.name.padEnd(24)} ${t.padEnd(5)} band ${f2(band)} C40 floor ${f2(Math.sqrt(band))} | outer vs canvas ${f2(outerVsCanvas)} any vs canvas ${f2(anyVsCanvas)}` +
                ` | inner<3 vs fill ${innerFails.length}/${ALL.length} | any-band<3 ${anyFails.length}/${ALL.length} worst ${worst.c} ${f2(worst.v)}` +
                ` | ${focus}`,
        );
        if (anyFails.length > 0 && anyFails.length <= 12) console.log(`    any-band fails: ${anyFails.map((x) => `${x.c} ${f2(x.v)}`).join(", ")}`);
    }
}

// ---- 2. Every palette colour against both canvases at 3:1 ----
console.log("\n== 2. palette colours under 3:1 per canvas ==");
let total = { light: 0, dark: 0 };
for (const p of PALETTE_DESCRIPTORS) {
    const row: string[] = [];
    for (const t of ["light", "dark"] as const) {
        const fails = p.colors.map((c) => ({ c: c.toUpperCase(), v: cr(c, CANVAS[t]) })).filter((x) => x.v < 3);
        total[t] += fails.length;
        row.push(`${t} ${fails.length}/${p.colors.length}${fails.length ? " [" + fails.map((x) => `${x.c} ${f2(x.v)}`).join(" ") + "]" : ""}`);
    }
    console.log(`${p.id.padEnd(16)} ${row.join(" | ")}`);
}
const both = ALL.filter((c) => cr(c, CANVAS.light) >= 3 && cr(c, CANVAS.dark) >= 3);
console.log(`slots under 3:1: light ${total.light}, dark ${total.dark}; distinct colours at 3:1 on BOTH canvases: ${both.length}/${ALL.length}: ${both.join(" ")}`);
console.log(`overflow grey ${OTHER_GROUP_COLOR}: light ${f2(cr(OTHER_GROUP_COLOR, CANVAS.light))} dark ${f2(cr(OTHER_GROUP_COLOR, CANVAS.dark))}`);

// ---- 3. menu at elevation 400 over the dark canvas (hairline composite) ----
const mix = (fg: number, bg: number, a: number): number => Math.round(fg * a + bg * (1 - a));
const hair = "#" + [0x1e, 0x1e, 0x1e].map((b) => mix(255, b, 0.35).toString(16).padStart(2, "0")).join("");
console.log(`\n== 3. menu #1E1E1E on canvas #1E1E1E: body 1.00; 35% white hairline ~${hair} vs canvas ${f2(cr(hair, "#1E1E1E"))}`);

// ---- 4. Outlined-band test: a ring reads as a mark apart from its node only if at least one band
// has 3:1 against BOTH of its neighbours (inside: the fill or the next band; outside: the next band
// or the canvas). Bands listed inside to outside.
console.log("\n== 4. outlined-band test (bands inside -> outside) ==");
const VARIANTS: { name: string; bands: (t: "light" | "dark") => string[] }[] = [
    { name: "white in, black out", bands: () => ["#FFFFFF", "#000000"] },
    { name: "white in, #1A1A1A out", bands: () => ["#FFFFFF", "#1A1A1A"] },
    { name: "black in, white out", bands: () => ["#000000", "#FFFFFF"] },
    { name: "dark band outermost on light, light band outermost on dark", bands: (t) => (t === "light" ? ["#FFFFFF", "#000000"] : ["#000000", "#FFFFFF"]) },
    { name: "white, black, white", bands: () => ["#FFFFFF", "#000000", "#FFFFFF"] },
    { name: "black, white, black", bands: () => ["#000000", "#FFFFFF", "#000000"] },
    { name: "white in, accent out", bands: (t) => ["#FFFFFF", ACCENT[t]] },
    { name: "black in, accent out", bands: (t) => ["#000000", ACCENT[t]] },
    { name: "neutral pair inside an accent outer band (white, black, accent)", bands: (t) => ["#FFFFFF", "#000000", ACCENT[t]] },
    { name: "neutral pair inside an accent outer band (black, white, accent)", bands: (t) => ["#000000", "#FFFFFF", ACCENT[t]] },
];
const outlined = (fill: string, bands: string[], canvas: string): boolean => {
    const seq = [fill, ...bands, canvas];
    for (let k = 1; k <= bands.length; k++) if (cr(seq[k], seq[k - 1]) >= 3 && cr(seq[k], seq[k + 1]) >= 3) return true;
    return false;
};
for (const v of VARIANTS) {
    const parts = (["light", "dark"] as const).map((t) => {
        const fails = ALL.filter((c) => !outlined(c, v.bands(t), CANVAS[t]));
        const f = FOCUS.map((c) => `${c} ${outlined(c, v.bands(t), CANVAS[t]) ? "ok" : "FAIL"}`).join(" ");
        return `${t} fails ${fails.length}/${ALL.length} (${f})`;
    });
    console.log(`${v.name.padEnd(66)} ${parts.join(" | ")}`);
}

// ---- 5. Two marks on one element: a highlight and the selection ring on the same node, and a
// highlighted edge inside a coloured edge set. Marks are listed inside to outside, each a list of
// bands. A combination passes for a colour when (a) every mark has a band with 3:1 against both of
// its neighbours in the whole sequence, and (b) the two bands where one mark meets the next are 3:1
// apart, otherwise they fuse into one wider band and two marks read as one.
console.log("\n== 5. two marks on one element ==");
const oklab = (h: string): number[] => {
    const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.replace("#", "").slice(i, i + 2), 16) / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const dE = (a: string, b: string): number => 100 * Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]));
const twoMarks = (fill: string, marks: string[][], canvas: string): "ok" | "unoutlined" | "fused" => {
    const seq = [fill, ...marks.flat(), canvas];
    let at = 1;
    for (let k = 0; k < marks.length; k++) {
        const idx = marks[k].map((_, j) => at + j);
        if (!idx.some((i) => cr(seq[i], seq[i - 1]) >= 3 && cr(seq[i], seq[i + 1]) >= 3)) return "unoutlined";
        at += marks[k].length;
        if (k < marks.length - 1 && cr(seq[at - 1], seq[at]) < 3) return "fused";
    }
    return "ok";
};
const PAIR = (t: "light" | "dark"): string[] => (t === "light" ? ["#FFFFFF", "#000000"] : ["#000000", "#FFFFFF"]);
const HL = "#0072B2"; // the element's highlight colour today: blue-highlight's first colour (StylesApi.ts)
const COMBOS: { name: string; marks: (t: "light" | "dark") => string[][] }[] = [
    { name: "highlight as node.outline #0072B2, then selection pair (canvas order)", marks: (t) => [[HL], PAIR(t)] },
    { name: "selection pair, then highlight pair in the same order", marks: (t) => [PAIR(t), PAIR(t)] },
    { name: "selection pair, then highlight pair reversed", marks: (t) => [PAIR(t), [...PAIR(t)].reverse()] },
    { name: "selection pair, then a one-band #0072B2 highlight outline", marks: (t) => [PAIR(t), [HL]] },
    { name: "selection pair, then white, black, white highlight", marks: (t) => [PAIR(t), ["#FFFFFF", "#000000", "#FFFFFF"]] },
];
for (const c of COMBOS) {
    const parts = (["light", "dark"] as const).map((t) => {
        const res = ALL.map((f) => twoMarks(f, c.marks(t), CANVAS[t]));
        const un = res.filter((r) => r === "unoutlined").length, fu = res.filter((r) => r === "fused").length;
        return `${t} unoutlined ${un} fused ${fu} of ${ALL.length}`;
    });
    console.log(`${c.name.padEnd(72)} ${parts.join(" | ")}`);
}

// Edges. A highlight that only widens an edge (edge.width) keeps the edge's colour, so the wider
// stroke reads only where the edge itself has 3:1 against the canvas. A highlight that recolours
// the edge to #0072B2 collides with any set colour closer than 15 (OKLab x100) and overwrites it.
console.log("\n-- edges --");
for (const t of ["light", "dark"] as const) {
    const thin = ALL.filter((c) => cr(c, CANVAS[t]) < 3);
    console.log(`edge.width-only highlight, ${t}: ${thin.length}/${ALL.length} edge colours under 3:1 against the canvas, so the added width is not seen`);
}
const near = ALL.filter((c) => c !== HL && dE(c, HL) < 15).map((c) => `${c} ${f2(dE(c, HL))}`);
console.log(`edge.color ${HL} highlight: ${near.length}/${ALL.length - 1} set colours within 15 of it: ${near.join(", ")}`);
console.log(`${HL} vs canvas: light ${f2(cr(HL, CANVAS.light))} dark ${f2(cr(HL, CANVAS.dark))}`);
for (const t of ["light", "dark"] as const) {
    const casing = ALL.filter((c) => twoMarks(c, [PAIR(t)], CANVAS[t]) !== "ok").length;
    const both = ALL.filter((c) => twoMarks(c, [PAIR(t), PAIR(t)], CANVAS[t]) !== "ok").length;
    console.log(`two-tone casing around a coloured edge, ${t}: fails ${casing}; selection casing plus highlight casing: fails ${both}`);
}
