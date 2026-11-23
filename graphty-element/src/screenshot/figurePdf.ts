/**
 * @file A vector figure as a one-page PDF (issue #819), written from the same drawing the SVG
 * figure is: lines, filled outlines and boxes as PDF paths, and every label and the key as PDF
 * text, so it can be selected and searched. One CSS pixel is one point. It needs no library: the
 * text is set in the fonts every PDF reader carries (Helvetica, Times, Courier), nearest to each
 * label's family.
 */

import type { Point2 } from "../meshes/shapeOutlines";
import { toColorValue } from "../session/styles/channels";
import { LEGEND_METRICS } from "./drawLegend";
import type { FigureDrawing, FigureGradient, FigureMark, FigurePicture, FigureShape, FigureText } from "./figure";

/** How far a cubic Bezier's handles sit from a quarter circle's ends, per unit of radius. */
const KAPPA = 0.5523;
/** Strips a color ramp is drawn in. */
const RAMP_STRIPS = 64;
/** A text's baseline below the middle of its line, per unit of font size. */
const BASELINE = 0.35;
/** The most pixels a picture is written at along either side. */
const PICTURE_MAX = 256;

/** A picture's pixels as a PDF image takes them: its color and its alpha, each as hex. */
export interface PicturePixels {
    width: number;
    height: number;
    rgb: string;
    alpha: string;
}

/** The standard PDF fonts, by family: plain, bold, italic, bold italic. */
const FONTS = {
    sans: ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique"],
    serif: ["Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic"],
    mono: ["Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique"],
} as const;

/** CSS families with the standard fonts' widths, to measure text by. */
const MEASURE = {
    sans: "Arial, Helvetica, sans-serif",
    serif: "'Times New Roman', Times, serif",
    mono: "'Courier New', Courier, monospace",
};

type Family = keyof typeof FONTS;

/**
 * A number for a content stream.
 * @param n - The number.
 * @returns Two decimals at most.
 */
function num(n: number): string {
    return String(Math.round(n * 100) / 100);
}

/**
 * The standard family nearest a CSS font family.
 * @param font - The CSS family list.
 * @returns The family.
 */
function familyOf(font: string): Family {
    const f = font.toLowerCase();
    if (/mono|courier|consol/.test(f)) {
        return "mono";
    }
    return /serif|times|georgia/.test(f) && !f.includes("sans") ? "serif" : "sans";
}

/**
 * Text as a PDF string in WinAnsi encoding.
 * @param text - Any text.
 * @returns `(text)`, escaped.
 */
function pdfString(text: string): string {
    // ponytail: the standard fonts hold Latin-1 only, so other characters print as "?"; embed a font for them.
    const latin = text.replaceAll(/[^\x20-\x7e\xa0-\xff]/gu, "?");
    const escaped = latin.replaceAll(/[\\()]/g, String.raw`\$&`);
    return `(${escaped})`;
}

let measurer: CanvasRenderingContext2D | null | undefined;

/**
 * How wide text is set, by the browser's metric twin of the standard font.
 * @param text - The text.
 * @param family - The family.
 * @param bold - Whether bold.
 * @param size - The font size.
 * @returns The width in points.
 */
function textWidth(text: string, family: Family, bold: boolean, size: number): number {
    measurer ??= typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
    if (!measurer) {
        return text.length * size * 0.55;
    }
    measurer.font = `${bold ? "bold " : ""}${String(size)}px ${MEASURE[family]}`;
    return measurer.measureText(text).width;
}

/** A content stream being written, and the fonts and opacities it uses. */
class Page {
    readonly ops: string[] = [];
    readonly fonts = new Map<string, string>();
    readonly alphas = new Map<number, string>();
    /** Each picture drawn, by its source, and the name the page calls it by. */
    readonly images = new Map<string, string>();

    /**
     * A blank page.
     * @param height - The page height, to turn screen y (down) into PDF y (up).
     */
    constructor(readonly height: number) {}

    /**
     * A screen point in PDF coordinates.
     * @param x - Screen x.
     * @param y - Screen y.
     * @returns `x y`.
     */
    at(x: number, y: number): string {
        return `${num(x)} ${num(this.height - y)}`;
    }

    /**
     * Sets a fill or stroke color and its opacity.
     * @param css - The CSS color.
     * @param stroke - Whether for strokes.
     * @param opacity - Opacity on top of the color's own.
     */
    paint(css: string, stroke: boolean, opacity = 1): void {
        const c = toColorValue(css) ?? { r: 0, g: 0, b: 0, a: 1 };
        this.ops.push(`${num(c.r / 255)} ${num(c.g / 255)} ${num(c.b / 255)} ${stroke ? "RG" : "rg"}`);
        this.alpha(c.a * opacity);
    }

    /**
     * Sets the opacity of what is drawn next, fills and strokes.
     * @param opacity - The opacity.
     */
    alpha(opacity: number): void {
        const a = Math.round(opacity * 100) / 100;
        if (a < 1) {
            const name = this.alphas.get(a) ?? `A${String(this.alphas.size)}`;
            this.alphas.set(a, name);
            this.ops.push(`/${name} gs`);
        }
    }

    /**
     * A closed outline as the current path.
     * @param points - Its corners.
     */
    polygon(points: readonly Point2[]): void {
        points.forEach(([x, y], i) => this.ops.push(`${this.at(x, y)} ${i === 0 ? "m" : "l"}`));
        this.ops.push("h");
    }

    /**
     * A box, rounded when it has a radius, as the current path.
     * @param box - The box.
     * @param box.x - Its left.
     * @param box.y - Its top.
     * @param box.w - Its width.
     * @param box.h - Its height.
     * @param box.radius - Its corner radius.
     */
    box(box: { x: number; y: number; w: number; h: number; radius?: number }): void {
        const { x, y, w, h } = box;
        const r = Math.min(box.radius ?? 0, w / 2, h / 2);
        if (r <= 0) {
            this.ops.push(`${this.at(x, y + h)} ${num(w)} ${num(h)} re`);
            return;
        }
        const k = r * (1 - KAPPA);
        this.ops.push(
            `${this.at(x + r, y)} m`,
            `${this.at(x + w - r, y)} l`,
            `${this.at(x + w - k, y)} ${this.at(x + w, y + k)} ${this.at(x + w, y + r)} c`,
            `${this.at(x + w, y + h - r)} l`,
            `${this.at(x + w, y + h - k)} ${this.at(x + w - k, y + h)} ${this.at(x + w - r, y + h)} c`,
            `${this.at(x + r, y + h)} l`,
            `${this.at(x + k, y + h)} ${this.at(x, y + h - k)} ${this.at(x, y + h - r)} c`,
            `${this.at(x, y + r)} l`,
            `${this.at(x, y + k)} ${this.at(x + k, y)} ${this.at(x + r, y)} c`,
            "h",
        );
    }

    /**
     * A circle as the current path.
     * @param x - Its centre's x.
     * @param y - Its centre's y.
     * @param r - Its radius.
     */
    circle(x: number, y: number, r: number): void {
        const k = r * KAPPA;
        this.ops.push(
            `${this.at(x + r, y)} m`,
            `${this.at(x + r, y + k)} ${this.at(x + k, y + r)} ${this.at(x, y + r)} c`,
            `${this.at(x - k, y + r)} ${this.at(x - r, y + k)} ${this.at(x - r, y)} c`,
            `${this.at(x - r, y - k)} ${this.at(x - k, y - r)} ${this.at(x, y - r)} c`,
            `${this.at(x + k, y - r)} ${this.at(x + r, y - k)} ${this.at(x + r, y)} c`,
            "h",
        );
    }

    /**
     * One line of text, its middle at `y`.
     * @param words - The text.
     * @param x - Where it is anchored.
     * @param y - Its middle.
     * @param style - Its font, size, color and anchor.
     * @param style.font - The CSS family.
     * @param style.size - The size.
     * @param style.bold - Whether bold.
     * @param style.italic - Whether italic.
     * @param style.color - The CSS color.
     * @param style.anchor - Which end of it, or its middle, sits at `x`.
     */
    text(
        words: string,
        x: number,
        y: number,
        style: {
            font: string;
            size: number;
            bold: boolean;
            italic: boolean;
            color: string;
            anchor: "start" | "middle" | "end";
        },
    ): void {
        const family = familyOf(style.font);
        const base = FONTS[family][(style.bold ? 1 : 0) + (style.italic ? 2 : 0)];
        const name = this.fonts.get(base) ?? `F${String(this.fonts.size)}`;
        this.fonts.set(base, name);
        const width = style.anchor === "start" ? 0 : textWidth(words, family, style.bold, style.size);
        const left = x - (style.anchor === "end" ? width : width / 2);
        this.ops.push("q");
        this.paint(style.color, false);
        this.ops.push(
            `BT /${name} ${num(style.size)} Tf ${this.at(left, y + style.size * BASELINE)} Td ${pdfString(words)} Tj ET`,
            "Q",
        );
    }
}

/**
 * A label's lines, over its panel.
 * @param page - The page.
 * @param t - The label.
 */
function drawText(page: Page, t: FigureText): void {
    const bg = t.background;
    if (bg?.gradient !== undefined) {
        page.ops.push("q");
        page.box(bg);
        page.ops.push("W n");
        drawGradient(page, bg.gradient, bg, bg.opacity);
        page.ops.push("Q");
    } else if (bg !== undefined) {
        page.ops.push("q");
        page.paint(bg.fill, false, bg.opacity);
        page.box(bg);
        page.ops.push("f", "Q");
    }
    const bold = t.weight === "bold" || Number(t.weight) >= 600;
    const italic = t.style === "italic" || t.style === "oblique";
    const first = t.y - ((t.lines.length - 1) * t.size * 1.2) / 2;
    t.lines.forEach((line, i) => {
        page.text(line, t.x, first + i * t.size * 1.2, {
            font: t.font,
            size: t.size,
            bold,
            italic,
            color: t.color,
            anchor: "middle",
        });
    });
}

/**
 * A gradient's color at a fraction of its line: the stop before it blended into the one after, the
 * first color before the first stop and the last after the last.
 * @param g - The gradient.
 * @param t - The fraction.
 * @returns The color, `rgba(...)`.
 */
function gradientColorAt(g: FigureGradient, t: number): string {
    const colors = g.colors.map((c) => toColorValue(c) ?? { r: 0, g: 0, b: 0, a: 0 });
    let i = g.stops.findIndex((s) => s >= t);
    if (i === -1) {
        i = colors.length - 1;
    }
    const hi = colors[i];
    const lo = colors[Math.max(i - 1, 0)];
    const span = (g.stops[i] ?? 0) - (g.stops[i - 1] ?? 0);
    const f = i === 0 || span <= 0 ? 1 : Math.min(1, (t - g.stops[i - 1]) / span);
    const mix = (a: number, b: number): number => a + (b - a) * f;
    return `rgba(${num(mix(lo.r, hi.r))},${num(mix(lo.g, hi.g))},${num(mix(lo.b, hi.b))},${num(mix(lo.a, hi.a))})`;
}

/**
 * A gradient over a box, as strips across its line or rings round its middle, each one color,
 * reaching past the box on every side; the caller clips to the box.
 * @param page - The page.
 * @param g - The gradient.
 * @param box - The box it fills.
 * @param box.x - Its left.
 * @param box.y - Its top.
 * @param box.w - Its width.
 * @param box.h - Its height.
 * @param opacity - Its opacity.
 */
function drawGradient(
    page: Page,
    g: FigureGradient,
    box: { x: number; y: number; w: number; h: number },
    opacity: number,
): void {
    // ponytail: RAMP_STRIPS bands of flat color, not a PDF shading; a smooth shading if a figure shows banding.
    const reach = Math.hypot(box.w, box.h) * 2;
    const band = (t: number, path: () => void, evenOdd: boolean): void => {
        // Each band in its own state: `paint` sets an opacity only below 1, so one would leak into the next.
        page.ops.push("q");
        page.paint(gradientColorAt(g, t), false, opacity);
        path();
        page.ops.push(evenOdd ? "f*" : "f", "Q");
    };
    if (g.kind === "radial") {
        const far = reach + Math.hypot(g.cx - box.x, g.cy - box.y);
        band(
            1,
            () => {
                page.circle(g.cx, g.cy, far);
                page.circle(g.cx, g.cy, g.r);
            },
            true,
        );
        for (let i = RAMP_STRIPS - 1; i >= 0; i--) {
            const inner = (g.r * i) / RAMP_STRIPS;
            // Each ring a hair wider than its share, so no seam shows between them.
            const outer = Math.min((g.r * (i + 1)) / RAMP_STRIPS + 0.5, g.r);
            band(
                (i + 0.5) / RAMP_STRIPS,
                () => {
                    page.circle(g.cx, g.cy, outer);
                    if (inner > 0) {
                        page.circle(g.cx, g.cy, inner);
                    }
                },
                true,
            );
        }
        return;
    }
    const length = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
    if (length <= 0) {
        band(
            1,
            () => {
                page.box(box);
            },
            false,
        );
        return;
    }
    const [ux, uy] = [(g.x2 - g.x1) / length, (g.y2 - g.y1) / length];
    const strip = (from: number, to: number): void => {
        const [ax, ay] = [g.x1 + ux * from * length, g.y1 + uy * from * length];
        const [bx, by] = [g.x1 + ux * to * length, g.y1 + uy * to * length];
        page.polygon([
            [ax - uy * reach, ay + ux * reach],
            [bx - uy * reach, by + ux * reach],
            [bx + uy * reach, by - ux * reach],
            [ax + uy * reach, ay - ux * reach],
        ]);
    };
    const past = (reach + Math.hypot(g.x1 - box.x, g.y1 - box.y)) / length;
    band(
        0,
        () => {
            strip(-past, 0);
        },
        false,
    );
    band(
        1,
        () => {
            strip(1, 1 + past);
        },
        false,
    );
    for (let i = 0; i < RAMP_STRIPS; i++) {
        const hair = 0.5 / length;
        band(
            (i + 0.5) / RAMP_STRIPS,
            () => {
                strip(i / RAMP_STRIPS, (i + 1) / RAMP_STRIPS + hair);
            },
            false,
        );
    }
}

/**
 * A color ramp, as thin strips each the color between its two neighboring stops.
 * @param page - The page.
 * @param mark - The ramp.
 */
function drawRamp(page: Page, mark: Extract<FigureMark, { ramp: unknown }>): void {
    const stops = mark.colors.map((c) => toColorValue(c) ?? { r: 0, g: 0, b: 0, a: 1 });
    const { x, y, w, h } = mark.ramp;
    for (let i = 0; i < RAMP_STRIPS; i++) {
        const t = ((i + 0.5) / RAMP_STRIPS) * Math.max(stops.length - 1, 0);
        const lo = stops[Math.floor(t)] ?? stops[0];
        const hi = stops[Math.min(Math.floor(t) + 1, stops.length - 1)] ?? lo;
        const f = t - Math.floor(t);
        const mix = (a: number, b: number): number => Math.round(a + (b - a) * f);
        page.ops.push("q");
        page.paint(`rgb(${String(mix(lo.r, hi.r))},${String(mix(lo.g, hi.g))},${String(mix(lo.b, hi.b))})`, false);
        // Each strip a hair wider than its share, so no seam shows between them.
        page.box({ x: x + (i * w) / RAMP_STRIPS, y, w: w / RAMP_STRIPS + 0.5, h });
        page.ops.push("f", "Q");
    }
}

/**
 * One mark of the key.
 * @param page - The page.
 * @param mark - The mark.
 */
function drawMark(page: Page, mark: FigureMark): void {
    if ("ramp" in mark) {
        drawRamp(page, mark);
        return;
    }
    if ("text" in mark) {
        const bold = mark.weight !== undefined && Number(mark.weight) >= 600;
        page.text(mark.text, mark.x, mark.y, {
            font: "sans-serif",
            size: LEGEND_METRICS.FONT_SIZE,
            bold,
            italic: false,
            color: mark.color,
            anchor: mark.anchor,
        });
        return;
    }
    page.ops.push("q");
    if ("rect" in mark) {
        page.paint(mark.fill, false, mark.opacity);
        page.box(mark.rect);
        if (mark.stroke === undefined) {
            page.ops.push("f");
        } else {
            page.paint(mark.stroke, true);
            page.ops.push("1 w", "B");
        }
    } else {
        page.paint(mark.fill, false);
        page.polygon(mark.polygon);
        page.ops.push("f");
    }
    page.ops.push("Q");
}

/**
 * A filled shape: a mesh's triangles are filled as one path, nonzero, so no seam shows between them.
 * @param page - The page.
 * @param shape - The shape.
 */
function drawShape(page: Page, shape: FigureShape | FigurePicture): void {
    if ("picture" in shape) {
        drawPicture(page, shape);
        return;
    }
    page.ops.push("q");
    page.paint(shape.fill, false, shape.opacity);
    if ("circle" in shape) {
        page.circle(shape.circle.x, shape.circle.y, shape.circle.r);
    } else if ("points" in shape) {
        page.polygon(shape.points);
    } else {
        for (const t of shape.triangles) {
            page.polygon(t);
        }
    }
    page.ops.push("f", "Q");
}

/**
 * A picture, its image's unit square mapped onto its corners on screen.
 * @param page - The page.
 * @param shape - The picture.
 */
function drawPicture(page: Page, shape: FigurePicture): void {
    const { src, corners } = shape.picture;
    const name = page.images.get(src) ?? `Im${String(page.images.size)}`;
    page.images.set(src, name);
    // PDF's image space has the picture's top-left at (0, 1) and its bottom-left at the origin.
    const [[tx, ty], [rx, ry], [bx, by]] = corners.map(([x, y]) => [x, page.height - y]);
    const matrix = [rx - tx, ry - ty, tx - bx, ty - by, bx, by].map((n) => num(n)).join(" ");
    page.ops.push("q");
    page.alpha(shape.opacity);
    page.ops.push(`${matrix} cm`, `/${name} Do`, "Q");
}

/**
 * Bytes as hex, as `ASCIIHexDecode` reads them.
 * @param bytes - The bytes.
 * @returns Two hex digits a byte, and `>` to end them.
 */
function hex(bytes: Iterable<number>): string {
    let out = "";
    for (const b of bytes) {
        out += b.toString(16).padStart(2, "0");
    }
    return `${out}>`;
}

/**
 * The pixels of every picture a drawing shows, read from each picture's source once.
 * @param drawing - The drawing.
 * @returns The pixels by source; a source that cannot be read (another site's picture without CORS) is missing.
 */
export async function readPictures(drawing: FigureDrawing): Promise<Map<string, PicturePixels>> {
    const sources = new Set(drawing.caps.flatMap((c) => ("picture" in c ? [c.picture.src] : [])));
    const out = new Map<string, PicturePixels>();
    for (const src of sources) {
        // ponytail: a picture the browser will not read back is left out of the PDF; the SVG still links it.
        try {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.src = src;
            await image.decode();
            const scale = Math.min(1, PICTURE_MAX / Math.max(image.naturalWidth, image.naturalHeight, 1));
            const width = Math.max(1, Math.round((image.naturalWidth || PICTURE_MAX) * scale));
            const height = Math.max(1, Math.round((image.naturalHeight || PICTURE_MAX) * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            if (context === null) {
                continue;
            }
            context.drawImage(image, 0, 0, width, height);
            const { data } = context.getImageData(0, 0, width, height);
            out.set(src, {
                width,
                height,
                rgb: hex(data.filter((_, i) => i % 4 !== 3)),
                alpha: hex(data.filter((_, i) => i % 4 === 3)),
            });
        } catch {
            continue;
        }
    }
    return out;
}

/**
 * The PDF file for a drawing: background, edges, nodes, arrow caps, labels, then the key on top.
 * @param drawing - What to draw.
 * @param key - The key's marks.
 * @param pictures - The pixels of its pictures, by source ({@link readPictures}); a picture missing here is left out.
 * @returns The file's bytes.
 */
export function figurePdf(
    drawing: FigureDrawing,
    key: readonly FigureMark[],
    pictures: ReadonlyMap<string, PicturePixels> = new Map(),
): Uint8Array<ArrayBuffer> {
    const page = new Page(drawing.height);
    if (drawing.background !== undefined) {
        page.paint(drawing.background, false);
        page.ops.push(`0 0 ${num(drawing.width)} ${num(drawing.height)} re f`);
    }
    for (const e of drawing.edges) {
        page.ops.push("q", "1 J", "1 j", `${num(e.width)} w`);
        page.paint(e.color, true, e.opacity);
        e.points.forEach(([x, y], i) => page.ops.push(`${page.at(x, y)} ${i === 0 ? "m" : "l"}`));
        page.ops.push("S", "Q");
    }
    for (const shape of [...drawing.nodes, ...drawing.caps]) {
        if (!("picture" in shape) || pictures.has(shape.picture.src)) {
            drawShape(page, shape);
        }
    }
    for (const t of drawing.texts) {
        drawText(page, t);
    }
    for (const mark of key) {
        drawMark(page, mark);
    }
    return pdfFile(drawing.width, drawing.height, page, pictures);
}

/**
 * The PDF file around a page's content.
 * @param width - The page width.
 * @param height - The page height.
 * @param page - The content.
 * @param pictures - The pixels of the pictures it draws.
 * @returns The bytes: every character is below 256, so one character is one byte.
 */
function pdfFile(
    width: number,
    height: number,
    page: Page,
    pictures: ReadonlyMap<string, PicturePixels>,
): Uint8Array<ArrayBuffer> {
    const fonts = [...page.fonts].map(
        ([base, name]) => `/${name} << /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`,
    );
    const alphas = [...page.alphas].map(([a, name]) => `/${name} << /ca ${num(a)} /CA ${num(a)} >>`);
    const content = page.ops.join("\n");
    // Each picture is two objects after the four below: its color, then its alpha as the color's soft mask.
    const images: string[] = [];
    const xobjects: string[] = [];
    for (const [src, name] of page.images) {
        const px = pictures.get(src);
        if (px === undefined) {
            continue;
        }
        const id = 5 + images.length;
        const head = `/Type /XObject /Subtype /Image /Width ${String(px.width)} /Height ${String(px.height)} /BitsPerComponent 8`;
        images.push(
            `<< ${head} /ColorSpace /DeviceRGB /SMask ${String(id + 1)} 0 R /Filter /ASCIIHexDecode /Length ${String(px.rgb.length)} >>\nstream\n${px.rgb}\nendstream`,
            `<< ${head} /ColorSpace /DeviceGray /Filter /ASCIIHexDecode /Length ${String(px.alpha.length)} >>\nstream\n${px.alpha}\nendstream`,
        );
        xobjects.push(`/${name} ${String(id)} 0 R`);
    }
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(width)} ${num(height)}] ` +
            `/Resources << /Font << ${fonts.join(" ")} >> /ExtGState << ${alphas.join(" ")} >> ` +
            `/XObject << ${xobjects.join(" ")} >> >> /Contents 4 0 R >>`,
        `<< /Length ${String(content.length)} >>\nstream\n${content}\nendstream`,
        ...images,
    ];
    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    objects.forEach((body, i) => {
        offsets.push(out.length);
        out += `${String(i + 1)} 0 obj\n${body}\nendobj\n`;
    });
    const xref = out.length;
    out += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n${offsets
        .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
        .join("")}trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF\n`;
    return Uint8Array.from(out, (c) => c.codePointAt(0) ?? 63);
}
