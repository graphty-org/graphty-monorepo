/**
 * The root graph's own label (a DOT diagram's title) as text annotations, placed where Graphviz draws it
 * (lib/common/postproc.c `place_root_label`): at a stored `lp`, else against the side of the root `bb` that `labelloc`
 * (bottom by default) and `labeljust` (centered by default) name, in a region Graphviz adds to the drawing there, the
 * label's size plus its padding (4 GAP across, 2 GAP down). A graph with neither `lp` nor `bb` has no place for it
 * until it is laid out, so it gives none.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { TextAnnotation } from "../../styles/annotations.js";
import { canonColor } from "../../styles/canon/color.js";
import type { CanonSite } from "../../styles/canon/site.js";
import { dotLabelText, htmlLabelSpans } from "../../styles/canon/text.js";
import { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type { StyleColor } from "../../styles/types.js";
import { graphvizFont } from "./drawing.js";
import { DOT_FORMAT, LABEL_ATTRIBUTE } from "./names.js";
import { fontWidths, textWidth } from "./record.js";
import { htmlRunFont } from "./styles.js";

/** Graphviz's padding of a root label: 4 GAP across (8 a side) and 2 GAP down (4 above and below). */
const PAD = { x: 16, y: 8 } as const;
/** Graphviz's line height as a multiple of the font size. */
const LINE_SPACING = 1.2;
/** Graphviz's default root label font size. */
const DEFAULT_FONT_SIZE = 14;

/** A piece of a label line drawn in one font. */
interface Run {
    text: string;
    readonly fontFamily: string;
    readonly bold: boolean;
    readonly italic: boolean;
    readonly fontSize: number;
    readonly color: StyleColor;
    readonly opacity: number;
}

/**
 * The root graph's label as text annotations, one per line, or one per font run of an HTML-like label (Graphviz
 * draws each run as a text of its own, side by side), centered on their points, y up in the file's units.
 * @param snapshot - the graph the DOT importer read
 * @returns one entry per non-empty line or run; none when the graph is not DOT's, has no label or no place for it
 */
export function dotGraphLabel(snapshot: GraphSnapshot): TextAnnotation[] {
    const { graph } = snapshot;
    const column = graph.get(LABEL_ATTRIBUTE);
    if (column?.meta.origin?.format !== DOT_FORMAT) {
        return [];
    }
    const text = (name: string): string | null => {
        const v = graph.has(name) ? plainCell(graph.value(name, 0)) : null;
        return typeof v === "string" || typeof v === "number" ? String(v) : null;
    };
    const raw = text(LABEL_ATTRIBUTE) ?? "";
    const sizeRaw = Number(text("fontsize"));
    const fontSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? sizeRaw : DEFAULT_FONT_SIZE;
    const fontname = text("fontname");
    const font = graphvizFont(fontname ?? "Times-Roman");
    const scheme = text("colorscheme");
    const site = { notes: new StyleNotes(), target: "graph" as const, property: "labelColor" };
    const color = canonColor(text("fontcolor") ?? "black", "graphviz", site, { scheme, use: "text" }) ?? {
        color: "#000000",
        alpha: 1,
    };
    const own: Run = {
        text: "",
        fontFamily: font.family,
        bold: font.bold,
        italic: font.italic,
        fontSize,
        color: color.color,
        opacity: color.alpha,
    };
    const html = raw.length >= 2 && raw.startsWith("<") && raw.endsWith(">");
    const lines: Run[][] = html
        ? [htmlRuns(raw, own, scheme, site)]
        : dotLabelText(raw, { graph: snapshot.meta.name ?? "" })
              .split("\n")
              .map((line) => [{ ...own, text: line }]);
    if (lines.every((l) => l.every((r) => r.text.trim() === ""))) {
        return [];
    }
    // ponytail: every run measured in the label's own face, upright; read the run's face when a sample needs it
    const widths = fontWidths(fontname);
    const runWidth = (r: Run): number => textWidth(r.text, r.fontSize, widths);
    const lineWidth = (line: Run[]): number => line.reduce((w, r) => w + runWidth(r), 0);
    const width = Math.max(...lines.map(lineWidth));
    const lineHeight = fontSize * LINE_SPACING;
    const height = lines.length * lineHeight;
    const center = labelCenter(text, width + PAD.x, height + PAD.y);
    if (center === null) {
        return [];
    }
    // ponytail: every line centered in the label (Graphviz lines ending \l or \r sit against its sides)
    return lines.flatMap((line, i) => {
        const y = center.y + height / 2 - (i + 0.5) * lineHeight;
        let x = center.x - lineWidth(line) / 2;
        return line.flatMap((run, j) => {
            const w = runWidth(run);
            x += w;
            if (run.text.trim() === "") {
                return [];
            }
            const { text: words, ...style } = run;
            return [
                {
                    id: `graph-label-${String(i)}-${String(j)}`,
                    layer: "foreground" as const,
                    z: 0,
                    kind: "text" as const,
                    rotation: 0,
                    text: words,
                    anchor: "center" as const,
                    at: { x: x - w / 2, y },
                    ...style,
                },
            ];
        });
    });
}

/**
 * An HTML-like label's font runs, as Graphviz draws them on one line: each piece in the font its tags give it
 * (`htmlRunFont`), neighbours in the same font joined, the blanks at the ends dropped.
 * @param raw - the label, with its outer brackets
 * @param own - the label's own font
 * @param scheme - the graph's color scheme
 * @param site - where a bad color is noted
 * @returns the runs
 */
function htmlRuns(raw: string, own: Run, scheme: string | null, site: CanonSite): Run[] {
    const runs: Run[] = [];
    for (const span of htmlLabelSpans(raw)) {
        const f = htmlRunFont(span.tags, scheme, own.fontSize, site);
        const run: Run = {
            text: span.text,
            fontFamily: typeof f.font === "string" ? f.font : own.fontFamily,
            bold: f.weight === "bold" || own.bold,
            italic: f.italic === true || own.italic,
            fontSize: typeof f.size === "number" ? f.size : own.fontSize,
            color: typeof f.color === "string" && f.color.startsWith("#") ? (f.color as StyleColor) : own.color,
            opacity: own.opacity,
        };
        const last = runs.at(-1);
        if (last !== undefined && JSON.stringify({ ...last, text: "" }) === JSON.stringify({ ...run, text: "" })) {
            last.text += run.text;
        } else {
            runs.push(run);
        }
    }
    const first = runs.at(0);
    if (first !== undefined) {
        first.text = first.text.trimStart();
    }
    const end = runs.at(-1);
    if (end !== undefined) {
        end.text = end.text.trimEnd();
    }
    return runs;
}

/**
 * Where the label's center goes: a stored `lp`, else inside the region Graphviz adds beside the root `bb`.
 * @param text - reads a graph attribute
 * @param dx - the label's width with its padding
 * @param dy - its height with its padding
 * @returns the center, or null without `lp` and `bb`
 */
function labelCenter(text: (name: string) => string | null, dx: number, dy: number): { x: number; y: number } | null {
    const numbers = (name: string): number[] | null => {
        const parts = (text(name) ?? "").split(",").map(Number);
        return parts.every(Number.isFinite) ? parts : null;
    };
    const lp = numbers("lp");
    if (lp?.length === 2) {
        return { x: lp[0], y: lp[1] };
    }
    const bb = numbers("bb");
    if (bb?.length !== 4) {
        return null;
    }
    const [x0, y0, x1, y1] = bb;
    const just = (text("labeljust") ?? "").trim().toLowerCase();
    const top = (text("labelloc") ?? "").trim().toLowerCase().startsWith("t");
    let x = (x0 + x1) / 2;
    if (just.startsWith("l")) {
        x = x0 + dx / 2;
    } else if (just.startsWith("r")) {
        x = x1 - dx / 2;
    }
    return { x, y: top ? y1 + dy / 2 : y0 - dy / 2 };
}
