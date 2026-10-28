/**
 * The second signal: graphty's canvas, captured as pixels, against the rasterized oracle (resvg's
 * PNG of the program's SVG), after the oracle is drawn into graphty's frame through the inverse
 * of the fitted similarity. Differences are measured per region of graphty's drawing -- node
 * bodies, node outlines, edge lines, arrowheads, labels -- as the mean absolute RGB difference
 * there, so a missing outline or a fivefold arrowhead shows as a region that differs even when
 * the property comparison could not tell. Browser only (canvas 2D); deterministic for one
 * Chromium build, because both images are decoded and resampled by the same code every run.
 */
import { resample } from "../../../../graph-io/test/fidelity/compare";
import type { OracleReport } from "./compare-oracle";
import { compareIds, type PBox, type PScene, type Pt } from "./primitives";

export const RASTER_REGIONS = ["nodeBody", "nodeOutline", "edge", "arrowhead", "label", "canvas"] as const;
export type RasterRegion = (typeof RASTER_REGIONS)[number];

export interface RasterReport {
    width: number;
    height: number;
    /** Per region class: pixels compared and similarity (1 - mean absolute RGB difference, 0..1). */
    regions: Record<RasterRegion, { pixels: number; similarity: number | null }>;
    /** The elements whose regions differ most. */
    worst: { region: RasterRegion; id: string; similarity: number }[];
    /**
     * Ink in the label regions, graphty's over the oracle's: how far each pixel's luminance stands
     * out from the region's own median, summed. Over 1 draws heavier text (a bolder weight or a
     * larger size); null when the layouts are unrelated, so the regions do not correspond. Summed,
     * not counted past a cut: a glyph 2 px tall that is filtered from a larger texture spreads the
     * same ink over more, lighter pixels than one a vector renderer snaps to the pixel grid, and a
     * count past a cut read that as half the ink.
     */
    labelInkRatio: number | null;
    /** PNGs (base64) for the report page: graphty, the oracle aligned into graphty's frame, the two overlaid. */
    images: { graphty: string; oracleAligned: string; overlay: string };
}

const R = (v: number): number => Math.round(v * 10000) / 10000;

async function decode(src: string): Promise<HTMLImageElement> {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
}

function canvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (g === null) {
        throw new Error("no 2D canvas");
    }
    return { c, g };
}

/**
 * A PNG's pixels.
 * @param url - a URL the page can load
 * @returns its size and RGBA bytes
 */
export async function pngPixels(url: string): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
    const img = await decode(url).catch(async (e: unknown) => {
        // a checkout without Git LFS holds a pointer file where the picture should be
        const head = await fetch(url)
            .then(async (r) => (await r.text()).slice(0, 40))
            .catch(() => "");
        throw head.startsWith("version https://git-lfs")
            ? new Error(`${url} is a Git LFS pointer, not a picture: run git lfs pull`)
            : e;
    });
    const { c, g } = canvas(img.naturalWidth, img.naturalHeight);
    g.drawImage(img, 0, 0);
    return { width: c.width, height: c.height, data: g.getImageData(0, 0, c.width, c.height).data };
}

const pngOf = (c: HTMLCanvasElement): string => c.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");

/** Pixel masks of one element's region, as a list of pixel indices in graphty's frame. */
function boxPixels(b: PBox, w: number, h: number): number[] {
    const out: number[] = [];
    const x0 = Math.max(0, Math.floor(b.x0));
    const x1 = Math.min(w - 1, Math.ceil(b.x1));
    const y0 = Math.max(0, Math.floor(b.y0));
    const y1 = Math.min(h - 1, Math.ceil(b.y1));
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            out.push(y * w + x);
        }
    }
    return out;
}

function ringPixels(b: PBox, band: number, w: number, h: number): number[] {
    const outer = boxPixels({ x0: b.x0 - band, y0: b.y0 - band, x1: b.x1 + band, y1: b.y1 + band }, w, h);
    const inner = new Set(boxPixels({ x0: b.x0 + band, y0: b.y0 + band, x1: b.x1 - band, y1: b.y1 - band }, w, h));
    return outer.filter((i) => !inner.has(i));
}

function diskPixels(pts: readonly Pt[], r: number, w: number, h: number): number[] {
    const set = new Set<number>();
    for (const [px, py] of pts) {
        for (let y = Math.max(0, Math.floor(py - r)); y <= Math.min(h - 1, Math.ceil(py + r)); y++) {
            for (let x = Math.max(0, Math.floor(px - r)); x <= Math.min(w - 1, Math.ceil(px + r)); x++) {
                if ((x - px) ** 2 + (y - py) ** 2 <= r * r) {
                    set.add(y * w + x);
                }
            }
        }
    }
    return [...set].sort((a, b) => a - b);
}

/**
 * Compares graphty's captured canvas with the rasterized oracle.
 * @param graphtyPng - graphty's canvas as a PNG (base64)
 * @param oraclePngUrl - the rasterized oracle (a URL the page can load)
 * @param oracleSize - the oracle SVG's rendered size, so the PNG's own scale is known
 * @param graphty - graphty's primitive scene (its regions)
 * @param report - the property report (its fitted transform)
 * @returns the raster report
 */
export async function rasterCompare(
    graphtyPng: string,
    oraclePngUrl: string,
    oracleSize: { width: number; height: number },
    graphty: PScene,
    report: OracleReport,
): Promise<RasterReport | null> {
    const t = report.transform;
    if (t === null) {
        return null;
    }
    const gImg = await decode(`data:image/png;base64,${graphtyPng}`);
    const oImg = await decode(oraclePngUrl);
    const w = gImg.naturalWidth;
    const h = gImg.naturalHeight;
    // graphty's scene is in render pixels; the capture may be at another device scale
    const k = w / graphty.width;
    const G = canvas(w, h);
    G.g.drawImage(gImg, 0, 0);
    // oracle PNG pixel = s * T(graphty px / k); draw the PNG through the inverse
    const s = oImg.naturalWidth / oracleSize.width;
    const rot = (t.rotationDeg * Math.PI) / 180;
    const c = t.scale * Math.cos(rot);
    const sn = t.scale * Math.sin(rot);
    const f = t.reflect ? -1 : 1;
    const toPng = new DOMMatrix([s * c, s * sn, -s * sn * f, s * c * f, s * t.tx, s * t.ty]).multiply(
        new DOMMatrix().scale(1 / k),
    );
    const O = canvas(w, h);
    O.g.fillStyle = "#ffffff";
    O.g.fillRect(0, 0, w, h);
    O.g.setTransform(toPng.inverse());
    O.g.drawImage(oImg, 0, 0);
    O.g.setTransform(1, 0, 0, 1, 0, 0);
    const gd = G.g.getImageData(0, 0, w, h).data;
    const od = O.g.getImageData(0, 0, w, h).data;
    const diff = (idx: readonly number[]): number => {
        if (idx.length === 0) {
            return 0;
        }
        let sum = 0;
        for (const i of idx) {
            const p = i * 4;
            sum += Math.abs(gd[p] - od[p]) + Math.abs(gd[p + 1] - od[p + 1]) + Math.abs(gd[p + 2] - od[p + 2]);
        }
        return sum / (idx.length * 3 * 255);
    };
    const scaleBox = (b: PBox, shrink = 1): PBox => {
        const cx = ((b.x0 + b.x1) / 2) * k;
        const cy = ((b.y0 + b.y1) / 2) * k;
        const hw = ((b.x1 - b.x0) / 2) * k * shrink;
        const hh = ((b.y1 - b.y0) / 2) * k * shrink;
        return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
    };
    const per: { region: RasterRegion; id: string; idx: number[] }[] = [];
    for (const n of graphty.nodes) {
        const box: PBox = { x0: n.cx - n.w / 2, y0: n.cy - n.h / 2, x1: n.cx + n.w / 2, y1: n.cy + n.h / 2 };
        per.push({ region: "nodeBody", id: n.id, idx: boxPixels(scaleBox(box, 0.6), w, h) });
        per.push({
            region: "nodeOutline",
            id: n.id,
            idx: ringPixels(scaleBox(box), Math.max(2, (n.stroke?.width ?? 0) * k), w, h),
        });
        if (n.label !== null) {
            per.push({ region: "label", id: n.id, idx: boxPixels(scaleBox(n.label.box), w, h) });
        }
    }
    for (const e of graphty.edges) {
        const pts = resample(e.points, 32).map(([x, y]): Pt => [x * k, y * k]);
        per.push({
            region: "edge",
            id: e.id,
            idx: diskPixels(pts.slice(3, -3), Math.max(1.5, ((e.stroke?.width ?? 1) * k) / 2 + 1), w, h),
        });
        for (const a of e.arrows) {
            const at = a.end === "target" ? pts.at(-1) : pts[0];
            if (at !== undefined) {
                per.push({
                    region: "arrowhead",
                    id: `${e.id}@${a.end}`,
                    idx: diskPixels([at], Math.max(3, a.length * k * 0.75), w, h),
                });
            }
        }
        if (e.label !== null) {
            per.push({ region: "label", id: e.id, idx: boxPixels(scaleBox(e.label.box), w, h) });
        }
    }
    const mask = new Uint8Array(w * h);
    const regions = Object.fromEntries(
        RASTER_REGIONS.map((r) => {
            mask.fill(r === "canvas" ? 1 : 0);
            for (const p of per) {
                if (p.region === r) {
                    for (const i of p.idx) {
                        mask[i] = 1;
                    }
                }
            }
            let n = 0;
            let sum = 0;
            for (let i = 0; i < mask.length; i++) {
                if (mask[i] === 1) {
                    const q = i * 4;
                    n++;
                    sum += Math.abs(gd[q] - od[q]) + Math.abs(gd[q + 1] - od[q + 1]) + Math.abs(gd[q + 2] - od[q + 2]);
                }
            }
            return [r, { pixels: n, similarity: n === 0 ? null : R(1 - sum / (n * 3 * 255)) }];
        }),
    ) as RasterReport["regions"];
    const worst = per
        .filter((p) => p.idx.length > 0)
        .map((p) => ({ region: p.region, id: p.id, similarity: R(1 - diff(p.idx)) }))
        .sort((a, b) => a.similarity - b.similarity || compareIds(a.id, b.id))
        .slice(0, 10);
    const lum = (d: Uint8ClampedArray, i: number): number =>
        0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    const ink = (d: Uint8ClampedArray, idx: readonly number[]): number => {
        const ls = idx.map((i) => lum(d, i)).sort((a, b) => a - b);
        const mid = ls[Math.floor(ls.length / 2)] ?? 0;
        return ls.reduce((sum, l) => sum + Math.abs(l - mid), 0);
    };
    let inkG = 0;
    let inkO = 0;
    for (const p of per) {
        if (p.region === "label" && p.idx.length > 0) {
            inkG += ink(gd, p.idx);
            inkO += ink(od, p.idx);
        }
    }
    const labelInkRatio = t.unrelatedLayout || inkO === 0 ? null : R(inkG / inkO);
    const V = canvas(w, h);
    V.g.drawImage(G.c, 0, 0);
    V.g.globalAlpha = 0.5;
    V.g.drawImage(O.c, 0, 0);
    return {
        width: w,
        height: h,
        regions,
        worst,
        labelInkRatio,
        images: { graphty: graphtyPng, oracleAligned: pngOf(O.c), overlay: pngOf(V.c) },
    };
}
