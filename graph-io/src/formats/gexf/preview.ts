/**
 * Gephi's Preview settings: what Gephi keeps in its project, not in a GEXF file, and how each one changes the
 * drawing. Every rule here was measured on the Gephi Toolkit 0.11.3's SVG export of the GEXF specimen sheets
 * (`graph-io/test/fidelity/specimens/gexf/pages.json`, one Preview setting per page).
 */

import type { StyleValue } from "../../styles/types.js";

/**
 * Gephi's Preview defaults as the Gephi Toolkit 0.11.3 spells them (a fresh PreviewModel), with node labels shown,
 * as graph-io has always drawn a GEXF file.
 */
const GEPHI_PREVIEW: Readonly<Record<string, string>> = Object.freeze({
    "edge.show": "true",
    "edge.thickness": "1.0",
    "edge.use-weight": "true",
    "edge.rescale-weight": "false",
    "edge.rescale-weight.min": "0.4",
    "edge.rescale-weight.max": "8.0",
    "edge.color": "mixed",
    "edge.opacity": "100.0",
    "edge.curved": "true",
    "arrow.size": "3.0",
    "node.border.fixed": "false",
    "node.border.width": "1.0",
    "node.border.color": "darker",
    "node.opacity": "100.0",
    "node.per.node.opacity": "false",
    "node.label.show": "true",
    "node.label.customFont": "false",
    "node.label.font": "Dialog,plain,12",
    "node.label.proportinalSize": "true",
    "node.label.color": "#000000",
    "node.label.shorten": "false",
    "node.label.avoidOverlap": "true",
    "node.label.overlapGridSize": "10",
    "node.label.scale": "1.0",
    "node.label.max-char": "30",
    "node.label.outline.size": "0.0",
    "node.label.outline.color": "#ffffff",
    "node.label.outline.opacity": "80.0",
    "node.label.box": "false",
    "node.label.box.color": "parent",
    "node.label.box.opacity": "100.0",
    "edge.label.show": "false",
    "edge.label.customFont": "false",
    "edge.label.font": "Dialog,plain,10",
    "edge.label.color": "original",
    "edge.label.shorten": "false",
    "edge.label.max-char": "30",
    "edge.label.outline.size": "0.0",
    "edge.label.outline.color": "#ffffff",
    "edge.label.outline.opacity": "80.0",
});

/** A Java Font as Gephi's Preview writes it: `Family,style,size`. */
export interface GephiFont {
    readonly family: string;
    readonly bold: boolean;
    readonly italic: boolean;
    readonly size: number;
}

/** The Preview settings a drawing was made with: Gephi's defaults under the ones given. */
export class GephiPreview {
    private readonly values: Readonly<Record<string, string>>;

    /**
     * The settings: Gephi's defaults under the ones given.
     * @param given - the settings given, by Gephi's property names
     */
    constructor(given: Readonly<Record<string, string>> = {}) {
        this.values = { ...GEPHI_PREVIEW, ...given };
    }

    /**
     * A setting's text, trimmed and lower case.
     * @param name - the property
     * @returns the text
     */
    text(name: string): string {
        return (this.values[name] ?? "").trim().toLowerCase();
    }

    /**
     * A boolean setting.
     * @param name - the property
     * @returns its value
     */
    on(name: string): boolean {
        return this.text(name) === "true";
    }

    /**
     * A number setting; Gephi's default where the text is not a number.
     * @param name - the property
     * @returns its value
     */
    num(name: string): number {
        const v = Number(this.text(name));
        return Number.isFinite(v) ? v : Number(GEPHI_PREVIEW[name] ?? 0);
    }

    /**
     * The font of node or edge labels: the given font when `<target>.label.customFont` is on, else Gephi's.
     * @param target - "node" or "edge"
     * @returns the font
     */
    font(target: "node" | "edge"): GephiFont {
        const name = `${target}.label.font`;
        const raw = this.on(`${target}.label.customFont`) ? (this.values[name] ?? "") : (GEPHI_PREVIEW[name] ?? "");
        const [family = "Dialog", style = "plain", size = ""] = raw.split(",").map((s) => s.trim());
        const s = style.toLowerCase();
        const pt = Number(size);
        const fallback = target === "node" ? 12 : 10;
        return {
            family,
            bold: s.includes("bold"),
            italic: s.includes("italic"),
            size: Number.isFinite(pt) && pt > 0 ? pt : fallback,
        };
    }
}

/**
 * A label as Gephi's shorten setting cuts it: only a label of at least max-char + 3 characters, to its first max-char
 * characters and "..." (`gexf-specimen-labels-p7`, `-p8`).
 * @param label - the label
 * @param max - max-char
 * @returns the label drawn
 */
function shortened(label: string, max: number): string {
    return label.length >= max + 3 ? `${label.slice(0, max)}...` : label;
}

/**
 * A color derived from another as Gephi's DependantColor modes derive it: `darker` halves each channel, `lighter`
 * raises each by half (to 255 at most), `parent` (and `original`) is the color itself, `#rrggbb` is that color.
 * @param mode - the mode, lower case
 * @param parent - the color it derives from, r, g and b 0..255
 * @returns the color as r, g and b, or null for a mode Gephi does not have
 */
export function dependantColor(mode: string, parent: readonly number[]): number[] | null {
    switch (mode) {
        case "darker":
            return parent.slice(0, 3).map((v) => Math.floor(v / 2));
        case "lighter":
            return parent.slice(0, 3).map((v) => Math.min(255, Math.floor(v * 1.5)));
        case "parent":
        case "original":
            return parent.slice(0, 3);
        default: {
            const m = /^#([0-9a-f]{6})$/.exec(mode);
            if (m === null) {
                return null;
            }
            const n = Number.parseInt(m[1], 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
    }
}

/**
 * The labels drawn: none when `<target>.label.show` is off, each cut when `<target>.label.shorten` is on, and, unless
 * the file keeps its own values, with its line breaks left out, as Java's `drawString` draws a label on one line with
 * nothing for a break ("line one\nline two" is drawn "line oneline two": Gephi Toolkit 0.11.3's preview and PNG
 * export, `gexf-specimen-labels`).
 * @param labels - each element's label, or undefined when none has one
 * @param preview - the settings
 * @param target - "node" or "edge"
 * @param kept - whether the file keeps its own values (a `graphty.styles` block): its line breaks are drawn
 * @returns the labels drawn, or undefined for none
 */
export function drawnLabels(
    labels: readonly (StyleValue | null)[] | undefined,
    preview: GephiPreview,
    target: "node" | "edge",
    kept = false,
): (StyleValue | null)[] | undefined {
    if (labels === undefined || !preview.on(`${target}.label.show`)) {
        return undefined;
    }
    const max = preview.on(`${target}.label.shorten`) ? preview.num(`${target}.label.max-char`) : Infinity;
    const drawn = (l: string): string => (kept ? l : l.replaceAll(/[\r\n]/g, ""));
    return labels.map((l) => (typeof l === "string" ? drawn(shortened(l, max)) : l));
}

/**
 * Each edge's weight as Gephi draws its thickness: with `edge.use-weight` off, `edge.thickness`; else the weight,
 * rescaled linearly from the smallest and largest drawn weights to `edge.rescale-weight.min` .. `.max` when
 * `edge.rescale-weight` is on, times `edge.thickness` (`gexf-specimen-edges-lines-p8` .. `-p11`).
 * @param weights - each edge's weight
 * @param drawn - whether each edge is drawn
 * @param preview - the settings
 * @returns each edge's thickness
 */
export function edgeThickness(weights: readonly number[], drawn: readonly boolean[], preview: GephiPreview): number[] {
    const thickness = preview.num("edge.thickness");
    if (!preview.on("edge.use-weight")) {
        return weights.map(() => thickness);
    }
    if (!preview.on("edge.rescale-weight")) {
        return weights.map((w) => w * thickness);
    }
    // loops, not Math.min(...): a spread of every edge overflows the call stack on a large graph
    let lo = Infinity;
    let hi = -Infinity;
    weights.forEach((w, e) => {
        if (drawn[e]) {
            lo = Math.min(lo, w);
            hi = Math.max(hi, w);
        }
    });
    const min = preview.num("edge.rescale-weight.min");
    const max = preview.num("edge.rescale-weight.max");
    return weights.map((w) => (hi > lo ? min + ((w - lo) / (hi - lo)) * (max - min) : min) * thickness);
}
