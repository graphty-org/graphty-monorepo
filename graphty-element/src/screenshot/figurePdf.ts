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
import type { FigureDrawing, FigureMark, FigureText } from "./figure";

/** How far a cubic Bezier's handles sit from a quarter circle's ends, per unit of radius. */
const KAPPA = 0.5523;
/** Strips a color ramp is drawn in. */
const RAMP_STRIPS = 64;
/** A text's baseline below the middle of its line, per unit of font size. */
const BASELINE = 0.35;

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
    return `(${latin.replaceAll(/[\\()]/g, (c) => `\\${c}`)})`;
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

    /**
     * A blank page.
     * @param height - The page height, to turn screen y (down) into PDF y (up).
     */
    constructor(private readonly height: number) {}

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
        const a = Math.round(c.a * opacity * 100) / 100;
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
    if (t.background !== undefined) {
        page.ops.push("q");
        page.paint(t.background.fill, false, t.background.opacity);
        page.box(t.background);
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
 * The PDF file for a drawing: background, edges, nodes, labels, then the key on top.
 * @param drawing - What to draw.
 * @param key - The key's marks.
 * @returns The file's bytes.
 */
export function figurePdf(drawing: FigureDrawing, key: readonly FigureMark[]): Uint8Array<ArrayBuffer> {
    const page = new Page(drawing.height);
    if (drawing.background !== undefined) {
        page.paint(drawing.background, false);
        page.ops.push(`0 0 ${num(drawing.width)} ${num(drawing.height)} re f`);
    }
    for (const e of drawing.edges) {
        page.ops.push("q", "1 J", `${num(e.width)} w`);
        page.paint(e.color, true, e.opacity);
        page.ops.push(`${page.at(e.x1, e.y1)} m ${page.at(e.x2, e.y2)} l S`, "Q");
    }
    for (const n of drawing.nodes) {
        page.ops.push("q");
        page.paint(n.fill, false, n.opacity);
        if ("circle" in n) {
            page.circle(n.circle.x, n.circle.y, n.circle.r);
        } else {
            page.polygon(n.points);
        }
        page.ops.push("f", "Q");
    }
    for (const t of drawing.texts) {
        drawText(page, t);
    }
    for (const mark of key) {
        drawMark(page, mark);
    }
    return pdfFile(drawing.width, drawing.height, page);
}

/**
 * The PDF file around a page's content.
 * @param width - The page width.
 * @param height - The page height.
 * @param page - The content.
 * @returns The bytes: every character is below 256, so one character is one byte.
 */
function pdfFile(width: number, height: number, page: Page): Uint8Array<ArrayBuffer> {
    const fonts = [...page.fonts].map(
        ([base, name]) => `/${name} << /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`,
    );
    const alphas = [...page.alphas].map(([a, name]) => `/${name} << /ca ${num(a)} /CA ${num(a)} >>`);
    const content = page.ops.join("\n");
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(width)} ${num(height)}] ` +
            `/Resources << /Font << ${fonts.join(" ")} >> /ExtGState << ${alphas.join(" ")} >> >> /Contents 4 0 R >>`,
        `<< /Length ${String(content.length)} >>\nstream\n${content}\nendstream`,
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
