/**
 * Compares graphty's drawing of a sample directly with the program's own SVG drawing of it, both
 * read into the primitive model (`primitives.ts`). Elements are matched by id (the oracle's ids
 * come from the program's markup or from the association guided by graphty's drawing), one
 * similarity transform taking graphty's pixels onto the oracle's is fitted on the matched node
 * centers (Umeyama; a reflection only where the program's drawing is known to be mirrored) and its residual reported, and every property of every
 * matched element is judged against an explicit tolerance. Lengths are judged in oracle pixels
 * (graphty's times the fitted scale); when the residual says the two layouts are unrelated, the
 * scale comes from the node sizes instead so sizes can still be judged.
 *
 * Deterministic: everything is sorted by id and every number in the report is rounded, so the
 * same inputs give a byte-identical report. Pure: no DOM.
 */
import { apply, deltaE, fitSimilarity, frechet, iou, resample } from "../../../../graph-io/test/fidelity/compare";
import {
    boxOfPoints,
    compareIds,
    type DashClass,
    dashClassOf,
    isPattern,
    type PArrow,
    type PBox,
    type PEdge,
    type PFill,
    type PGradient,
    type PGroup,
    type PNode,
    type PScene,
    type PStray,
    type PStroke,
    type Pt,
    type PText,
} from "./primitives";

/** Every property the oracle comparison judges, in report order. */
export const ORACLE_PROPERTIES = [
    "node.present",
    "node.extra",
    "node.position",
    "node.width",
    "node.height",
    "node.sizeToSpacing",
    "node.sizeToExtent",
    "node.shape",
    "node.fill",
    "node.fillOpacity",
    "node.gradient",
    "node.stroke",
    "node.strokeWidth",
    "node.strokeDash",
    "node.ring",
    "label.present",
    "label.text",
    "label.size",
    "label.weight",
    "label.style",
    "label.color",
    "label.rotation",
    "label.offset",
    "label.opacity",
    "label.family",
    "label.lines",
    "label.align",
    "label.anchor",
    "label.alongLine",
    "label.offLine",
    "label.outline",
    "label.background",
    "label.backgroundBox",
    "label.backgroundBorder",
    "edge.present",
    "edge.extra",
    "edge.route",
    "edge.curve",
    "edge.wiggle",
    "edge.color",
    "edge.width",
    "edge.opacity",
    "edge.dash",
    "edge.dashPeriod",
    "edge.gradient",
    "edge.outline",
    "edge.overlay",
    "edge.arrow",
    "edge.arrowShape",
    "edge.arrowParts",
    "edge.arrowPlace",
    "edge.arrowFill",
    "edge.arrowColor",
    "edge.arrowLength",
    "edge.arrowWidth",
    "edge.arrowToSpacing",
    "edge.label",
    "group.present",
    "group.extra",
    "group.box",
    "group.fill",
    "group.fillOpacity",
    "group.stroke",
    "group.strokeWidth",
    "group.strokeDash",
    "group.label",
    "stray.present",
    "stray.extra",
    "frame.mirror",
    "frame.rotation",
    "frame.zoom",
    "background",
] as const;

export type OracleProperty = (typeof ORACLE_PROPERTIES)[number];

/**
 * The tolerances. Ratios are graphty's value (in oracle pixels) over the oracle's; colors are CIEDE2000. Distances are
 * judged against the element they belong to (a node's size, a label's font size, an edge's length), never against the
 * drawing's diagonal, so a large canvas or a spread-out drawing does not loosen them, with one graphty render pixel
 * or so as the least any of them allows.
 */
export const ORACLE_TOLERANCES = {
    /** A node's center within this share of its own smaller outer side. */
    positionOfSize: 0.25,
    /** The least a distance tolerance allows, in graphty render pixels (anti-aliasing and rounding). */
    pixel: 1.5,
    /** A fit residual over this share of the diagonal relates unrelated layouts; sizes then use a size-fitted scale. */
    unrelatedLayout: 0.1,
    sizeRatio: [0.85, 1.18],
    /**
     * A size against the drawing's own node spacing or extent, graphty's over the program's: where the two layouts are
     * unrelated the spacing a force layout settles at differs between programs, but not by half or double. One band,
     * where each program lays the file out itself too (`ownLayouts`): a wider one there ([1/3, 3], fitted to the corpus's
     * 0.66 to 2.3) let every node drawn 2.5 times, or 0.4 times, the program's size beside the spacing pass.
     */
    layoutSizeRatio: [0.5, 2],
    colorDeltaE: 3,
    /**
     * A whole canvas is told apart at a smaller difference than one small mark: white against
     * whitesmoke (#f5f5f5) is 2.0.
     */
    backgroundDeltaE: 1,
    opacity: 0.1,
    /**
     * And at most this far apart as a ratio, where either is over 0.05: a fill at 0.2 drawn at 0.1 is half as strong,
     * though only 0.1 apart.
     */
    opacityRatio: [0.75, 1.33],
    strokeWidthRatio: [0.9, 1.1],
    /** An outline under this many oracle pixels and none at all are the same to a reader. */
    hairline: 0.25,
    /** Font sizes are declared on both sides, not measured: 12 px against 14 px (0.857) is a different size to a reader. */
    fontSizeRatio: [0.9, 1.11],
    /** A label whose font is under this many render pixels is not shown (extract-scene.ts drops graphty's alike). */
    legibleFontPx: 1,
    /**
     * A node within this share of its label's node-size rule at the oracle's scale may show the label or not: the
     * fitted scale is good to about this, and sigma's grid puts a label's rule exactly at its first framing.
     */
    labelRuleShare: 0.01,
    /** CSS weight difference; 400 against 700 fails. */
    fontWeight: 150,
    rotationDeg: 5,
    /** A label's center relative to its node within this share of the label's font size. */
    labelOffsetOfSize: 0.5,
    /**
     * Where along its edge a label sits (its middle's nearest point on the line, by arc length), within this share of
     * the edge's length or one font size, whichever is larger.
     */
    labelAlongOfLength: 0.05,
    /** How far a label sits off its edge's line, on which side, within this share of its font size. */
    labelOffLineOfSize: 0.5,
    /**
     * A label's place against its node or group box, told apart per axis (before, start, center, end, after) within
     * this share of its font size.
     */
    labelAnchorOfSize: 0.25,
    /** A label's lines told apart as aligned left, centered or right when their widths differ by this share of the font size. */
    lineAlignOfSize: 0.5,
    /**
     * An outline's width outside the letters, a label background's border width, and how far a node's outer ring
     * reaches out from the node, within this ratio.
     */
    labelOutlineRatio: [0.67, 1.5],
    /** A group box's every side within this share of its smaller side (at least one render pixel) after the fit. */
    groupSideOfSize: 0.05,
    /**
     * An edge's route, each side's drawn between the outlines of its own nodes and seen in its own chord's frame (its
     * start at 0, its end at 1): the Frechet distance between the two within this share of the chord (of the route's
     * length, for a loop, whose chord is next to nothing).
     */
    edgePathOfLength: 0.05,
    pathSamples: 128,
    /**
     * How far a route bends: its farthest point from its chord, over the chord. The two sides' within this much of
     * each other, or within `curveShare` of the oracle's, whichever is larger.
     */
    curvature: 0.04,
    curveShare: 0.25,
    /**
     * Where each program lays the file out itself, how far a line bends between two nodes is each layout's, but whether
     * the program draws its lines curved is its style (vis-network's smooth type, Gephi's curved edges): the share of
     * edges bent over `curvature`, graphty's within this of the oracle's.
     */
    curvedShare: 0.15,
    /**
     * How often a route turns back the other way, its turns over `wiggleTurnDeg` counted where the next one turns the
     * other way: graphty's within this many of the oracle's. A zigzag a few percent of a long chord high stays within
     * the route's allowance and its bend's (cx-syn-bypass edge 0, 26 px high on 884 px), and turns back at every tooth.
     */
    wiggleReversals: 2,
    /** ...or within this share of the oracle's, for a route that turns back often (dot-real-depcruise's splines). */
    wiggleShare: 0.5,
    wiggleTurnDeg: 10,
    edgeWidthRatio: [0.9, 1.1],
    /** A linear gradient's direction (an edge's against its own chord) within this many degrees. */
    gradientAngleDeg: 15,
    /**
     * An arrowhead's length and width: their ratio in this range, as a node's size, or within `pixel` of the
     * oracle's, which a rounding on a small head moves by more than the ratio allows.
     */
    arrowRatio: [0.85, 1.18],
    /** A dash pattern's period and the share of it drawn, graphty's over the oracle's. */
    dashRatio: [0.67, 1.5],
    groupIoU: 0.8,
    strayIoU: 0.5,
    /** A mirrored fit is the drawing's when it leaves under this share of the unmirrored fit's squared residual. */
    mirrorResidual: 0.5,
} as const;

/**
 * A node's width and height out to the outer edge of its outline, as a reader sees its size: an SVG
 * stroke runs along the outline, half of it outside, where graphty's border ring lies wholly outside
 * its fill. Judging the outlines themselves would fault a program that draws its border inside the
 * node's size (Cytoscape desktop) for exactly the drawing it makes.
 * @param n - the node
 * @param side - whose drawing it is
 * @returns the outer width and height, in the side's pixels
 */
export function outerOf(n: PNode, side: "oracle" | "graphty"): [number, number] {
    // an outline painted as a fill of its own (a dotted, zigzag, sine-wave or double border) is already part of the
    // node's box, out to its outer edge, and the width of a sine wave or a double line is not read at all
    const { stroke: s } = n;
    const stroke =
        s === null || s.painted === true || !Number.isFinite(s.width) ? 0 : s.width * (side === "oracle" ? 1 : 2);
    return [n.w + stroke, n.h + stroke];
}

/**
 * A node's fill as a reader sees it: none where the program's outline is no wider than its stroke, whose inner half
 * then covers all of it but under half a pixel (Cytoscape desktop draws a node no larger than twice its border so, its fill path under it).
 * @param n - the oracle's node
 * @returns the fill, or null when none shows
 */
function shownFill(n: PNode): PNode["fill"] {
    const stroke = n.stroke === null || n.stroke.opacity < 1 ? 0 : n.stroke.width;
    // what is left between the stroke's inner edges, under half a pixel, shows nothing
    return stroke > 0 && Math.min(n.w, n.h) - stroke < 0.5 ? null : n.fill;
}

/**
 * A node's stroke as wide as a reader sees it, measured in from the outline's outer edge: the whole stroke, except
 * where the outline is narrower than the stroke and its two halves meet in the middle (a node no larger than twice
 * its border), where the band is half the outline and half the stroke.
 * @param n - the oracle's node
 * @returns the stroke, or null when it has none
 */
function shownStroke(n: PNode): PNode["stroke"] {
    if (n.stroke === null) {
        return null;
    }
    const band = Math.min(n.stroke.width, (Math.min(n.w, n.h) + n.stroke.width) / 2);
    return band === n.stroke.width ? n.stroke : { ...n.stroke, width: band };
}

/** One judged element. */
export interface OracleJudged {
    id: string;
    pass: boolean;
    /** How far from passing (0 when it passes); the worst list is sorted by it. */
    miss: number;
    oracle: unknown;
    graphty: unknown;
}

export interface OraclePropertyResult {
    n: number;
    pass: number;
    /** Share judged within tolerance; null when nothing could be judged. */
    passRate: number | null;
    tolerance: string;
    worst: OracleJudged[];
}

export interface OracleReport {
    sample: string;
    /**
     * Whether the oracle stands in for the program that wrote the file (draw.io for yEd, sigma.js's raster for a
     * graphology file): its numbers say how close graphty is to that program, and are kept apart from the rest.
     */
    standIn: boolean;
    /**
     * The sample's verdict, element by element: it fails when any element fails any property beyond its tolerance, and
     * `failures` names every such element (not a sample of them), by property.
     */
    verdict: { pass: boolean; failing: number };
    failures: Partial<Record<OracleProperty, string[]>>;
    /**
     * Every element judged, by property, passing or failing: an element a property no longer judges (no oracle element
     * to compare it with) is not measurable there, which is never a failure.
     */
    judged: Partial<Record<OracleProperty, string[]>>;
    association: unknown;
    transform: {
        scale: number;
        rotationDeg: number;
        reflect: boolean;
        tx: number;
        ty: number;
        /** Root mean square residual of matched node centers, over the oracle diagonal. */
        rms: number;
        matched: number;
        unrelatedLayout: boolean;
        /** The scale lengths are judged by. */
        lengthScale: number;
        /** Each side's median distance from a node to its nearest neighbor, in its own pixels; null under 3 nodes. */
        spacing: { oracle: number; graphty: number } | null;
        /** The share of its canvas each side's nodes fill along the tighter axis. */
        fill: { oracle: number; graphty: number };
    } | null;
    counts: {
        oracleNodes: number;
        graphtyNodes: number;
        matchedNodes: number;
        oracleEdges: number;
        graphtyEdges: number;
        matchedEdges: number;
        oracleGroups: number;
        graphtyGroups: number;
        oracleStrays: number;
        oracleTexts: number;
        /**
         * Share of graphty's node labels whose words the oracle draws anywhere: low when the two
         * drew different graphs (a session's other network), whatever the layout.
         */
        labelOverlap: number | null;
    };
    properties: Record<OracleProperty, OraclePropertyResult>;
    /** Per element, per property: the judged value pairs, for the report's table. */
    elements: { kind: "node" | "edge" | "group" | "stray" | "graph"; id: string; failed: OracleProperty[] }[];
    unmatched: { oracleNodes: string[]; graphtyNodes: string[]; oracleEdges: string[]; graphtyEdges: string[] };
    /** The oracle element each of graphty's matched elements was judged against, by graphty id. */
    paired: { nodes: Record<string, string>; edges: Record<string, string>; groups: Record<string, string> };
    /** Oracle primitives associated with no element, and free oracle text. */
    strays: {
        tag: string;
        box: PBox;
        fill: string | null;
        stroke: string | null;
        text: string | null;
        matched: boolean;
    }[];
}

/**
 * The graphty shape annotation drawn over an oracle box, the best overlap of at least the stray IoU.
 * @param box - the oracle's box
 * @param shapes - graphty's shape annotations, in the oracle's frame
 * @returns the annotation, or undefined when none overlaps enough
 */
function annotationOver<T extends { box: PBox }>(box: PBox, shapes: readonly T[]): T | undefined {
    let best: T | undefined;
    let bestV = ORACLE_TOLERANCES.strayIoU;
    for (const s of shapes) {
        const v = iou(toBox(s.box), toBox(box));
        if (v >= bestV) {
            best = s;
            bestV = v + 1e-12;
        }
    }
    return best;
}

/**
 * Whether graphty draws these words there: in a text of its own holding them, whose box holds
 * the oracle text's center, give or take the text's height (a line of a label the program wrapped
 * is part of the label graphty draws on fewer lines).
 * @param words - the oracle text's words
 * @param box - the oracle text's box
 * @param texts - graphty's texts, in the oracle's frame
 * @returns true when graphty draws them
 */
function textDrawn(words: string, box: PBox, texts: readonly { words: string; box: PBox }[]): boolean {
    const want = norm(words);
    if (want === "") {
        return false;
    }
    const x = (box.x0 + box.x1) / 2;
    const y = (box.y0 + box.y1) / 2;
    const slack = box.y1 - box.y0;
    return texts.some(
        (t) =>
            t.words.includes(want) &&
            x >= t.box.x0 - slack &&
            x <= t.box.x1 + slack &&
            y >= t.box.y0 - slack &&
            y <= t.box.y1 + slack,
    );
}

const R = (v: number, d = 3): number => {
    const k = 10 ** d;
    const r = Math.round(v * k) / k;
    return Object.is(r, -0) ? 0 : r;
};
/** Rounds every number in a value, recursively. */
function rounded<T>(v: T): T {
    if (typeof v === "number") {
        return (Number.isFinite(v) ? R(v) : v) as T;
    }
    if (Array.isArray(v)) {
        return v.map(rounded) as T;
    }
    if (v !== null && typeof v === "object") {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rounded(x)])) as T;
    }
    return v;
}

const cmp = compareIds;
// a zero-width space or joiner draws nothing: Cytoscape.js's SVG folds them out of "HSPA8:\u200bSubstrate" and graphty
// draws the label as the file spells it (json-cyjs-sbgn-sciluna's complex captions, #5118), so both sides drop them
const norm = (s: string): string =>
    s
        .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
        .replace(/\s+/g, " ")
        .trim();

/** A font's class, as a reader tells faces apart at a glance. */
export type FontClass = "sans-serif" | "serif" | "monospace" | "cursive" | "fantasy" | "system-ui";

/**
 * Font families by class: the faces the pinned fonts (`visual-fonts/`) carry, the families its fontconfig
 * (`conf.d/30-metric-aliases.conf`) answers with one of them, and the generic names (`conf.d/45-latin.conf`).
 */
const PINNED_FONTS: Readonly<Record<string, FontClass>> = {
    "dejavu sans": "sans-serif",
    "dejavu sans condensed": "sans-serif",
    "dejavu sans light": "sans-serif",
    "dejavu serif": "serif",
    "dejavu serif condensed": "serif",
    "dejavu sans mono": "monospace",
    "liberation sans": "sans-serif",
    "liberation sans narrow": "sans-serif",
    "liberation serif": "serif",
    "liberation mono": "monospace",
    freesans: "sans-serif",
    freeserif: "serif",
    freemono: "monospace",
    lato: "sans-serif",
    loma: "sans-serif",
    // metric aliases of the Liberation faces, which fontconfig and Chromium accept for them
    arial: "sans-serif",
    arimo: "sans-serif",
    helvetica: "sans-serif",
    "times new roman": "serif",
    times: "serif",
    tinos: "serif",
    "courier new": "monospace",
    courier: "monospace",
    cousine: "monospace",
    // graphty's tests register their pinned label face under this name (test/helpers/pin-label-font.ts)
    verdana: "sans-serif",
    "sans-serif": "sans-serif",
    serif: "serif",
    monospace: "monospace",
    cursive: "cursive",
    fantasy: "fantasy",
    "system-ui": "system-ui",
};

/**
 * Families a program names that the pinned fonts do not carry, by the class fontconfig gives them
 * (`conf.d/45-latin.conf`), and the logical fonts of a Java program (yEd, Cytoscape desktop, Gephi), which Java
 * resolves itself before any font library sees them.
 */
const PROGRAM_FONTS: Readonly<Record<string, FontClass>> = {
    ...PINNED_FONTS,
    ...Object.fromEntries(
        [
            "bitstream vera serif|cambria|constantia|elephant|garamond|georgia|luxi serif|ms serif|nimbus roman|nimbus roman no9 l|palatino linotype|palatino|thorndale|times-roman|book antiqua|century schoolbook",
            "albany|arial unicode ms|bitstream vera sans|britannic|calibri|candara|century gothic|corbel|helvetica lt std|haettenschweiler|ms sans serif|nimbus sans|nimbus sans l|luxi sans|tahoma|trebuchet ms|twentieth century|segoe ui|open sans|roboto|noto sans|inter|dialog|sansserif|sans|default",
            "andale mono|bitstream vera sans mono|consolas|courier std|cumberland|fixedsys|inconsolata|luxi mono|nimbus mono|nimbus mono l|nimbus mono ps|terminal|monospaced|dialoginput|lucida console|monaco|menlo",
            "comic sans ms|itc zapf chancery std|zapfino|urw chancery l|apple chancery|brush script mt",
            "bauhaus std|cooper std|copperplate gothic std|impact",
        ].flatMap((names, i) =>
            names
                .split("|")
                .map((n): [string, FontClass] => [
                    n,
                    (["serif", "sans-serif", "monospace", "cursive", "fantasy"] as const)[i],
                ]),
        ),
    ),
};

/** The names a CSS family list holds, in order, lowercased and unquoted. */
const familyNames = (family: string): string[] =>
    family
        .split(",")
        .map((f) => f.replace(/["']/g, "").trim().toLowerCase())
        .filter((f) => f !== "");

/**
 * The names a program's family list holds, as `familyNames`, a name carrying its style as words after it (`DejaVu Sans
 * Bold`, a full font name a program writes as a family, which its font library resolves) followed by the family it
 * names. A browser resolves no such name, so graphty's side is read by `familyNames` alone.
 */
const programFamilyNames = (family: string): string[] =>
    familyNames(family).flatMap((f) => {
        const bare = f.replace(/(\s+(bold|italic|oblique|book|regular))+$/, "");
        return bare === f || bare === "" ? [f] : [f, bare];
    });

/**
 * The class of the face a program drew a family in: its first name a pinned font or fontconfig knows, a Java font
 * name's style suffix (`Dialog.bold`) and a PostScript name's (`Calibri-Bold`, `ArialMT`) set aside.
 * @param family - the family the program's SVG names
 * @returns the class, or null where no name is known (what the program drew is then not told)
 */
export function programFontClass(family: string): FontClass | null {
    for (const name of programFamilyNames(family)) {
        const bare = name.replace(/\.(plain|bold|italic|bolditalic)$/, "");
        for (const k of [bare, bare.replace(/-[a-z]+$/, ""), bare.replace(/mt$/, "").trim()]) {
            const c = PROGRAM_FONTS[k];
            if (c !== undefined) {
                return c;
            }
        }
    }
    return null;
}

/**
 * The class of the face graphty's browser draws a family in under the pinned fonts: its first name a pinned font
 * answers to; a name none answers to (a Java logical font, a face not installed) falls through to the next, and at
 * last to the browser's default face, a serif.
 * @param family - the family graphty's label asks for
 * @returns the class
 */
export function browserFontClass(family: string): FontClass {
    for (const name of familyNames(family)) {
        const c = PINNED_FONTS[name];
        if (c !== undefined) {
            return c;
        }
    }
    return "serif";
}

/** The faces the pinned fonts carry, by family name: a program that names one draws that face and no other. */
const PINNED_FACES: ReadonlySet<string> = new Set(
    Object.keys(PINNED_FONTS).filter((f) => /^(dejavu|liberation|free|lato|loma)/.test(f)),
);

/**
 * The face each name the browser accepts draws in, under the pinned fonts: a pinned face itself, a metric alias its
 * Liberation face (`conf.d/30-metric-aliases.conf`), a generic name the face fontconfig picks for it (`fc-match`), and
 * "Verdana" the face graphty's tests register under it (`test/helpers/pin-label-font.ts`).
 */
const BROWSER_FACE: Readonly<Record<string, string>> = {
    ...Object.fromEntries([...PINNED_FACES].map((f) => [f, f])),
    arial: "liberation sans",
    arimo: "liberation sans",
    helvetica: "liberation sans",
    "times new roman": "liberation serif",
    times: "liberation serif",
    tinos: "liberation serif",
    "courier new": "liberation mono",
    courier: "liberation mono",
    cousine: "liberation mono",
    verdana: "inter (graphty's pinned label face)",
    "sans-serif": "dejavu sans",
    serif: "dejavu serif",
    monospace: "dejavu sans mono",
    cursive: "dejavu sans",
    fantasy: "dejavu sans",
    "system-ui": "dejavu sans",
};

/**
 * The pinned face a program's family names by its own name (DejaVu Sans, Liberation Serif, Lato): what the program
 * drew, whoever reads its SVG. An alias, a generic or a Java logical font says only a class (`programFontClass`).
 * @param family - the family the program's SVG names
 * @returns the face, lowercased, or null where the family names none
 */
export function programFace(family: string): string | null {
    return programFamilyNames(family).find((n) => PINNED_FACES.has(n)) ?? null;
}

/**
 * The face graphty's browser draws a family in under the pinned fonts: its first name the browser accepts, at last
 * the browser's default face (Times New Roman, so Liberation Serif).
 * @param family - the family graphty's label asks for
 * @returns the face, lowercased
 */
export function browserFace(family: string): string {
    for (const name of familyNames(family)) {
        const f = BROWSER_FACE[name];
        if (f !== undefined) {
            return f;
        }
    }
    return "liberation serif";
}

function ratioMiss(ratio: number, [lo, hi]: readonly [number, number] | readonly number[]): number {
    if (!Number.isFinite(ratio)) {
        return 1e6;
    }
    if (ratio >= lo && ratio <= hi) {
        return 0;
    }
    return Math.abs(Math.log(ratio / (ratio < lo ? lo : hi)));
}

/** A size under this many pixels covers no pixel's center: nothing is drawn. */
const UNDRAWN_SIZE = 0.25;

/**
 * How far one drawn size is from another, by their ratio; two sizes too small to draw anything (a size-0 node one
 * program skips and the other draws a hundredth of a pixel across) are alike, since neither shows.
 * @param o - the oracle's size, in oracle pixels
 * @param g - graphty's, in oracle pixels
 * @param range - the ratio allowed
 * @returns the miss, 0 when alike
 */
function sizeMiss(o: number, g: number, range: readonly number[]): number {
    return o < UNDRAWN_SIZE && g < UNDRAWN_SIZE ? 0 : ratioMiss(g / Math.max(o, 1e-9), range);
}

/**
 * How many times a route turns back the other way: resampled every `step` pixels along it (64 samples at most), its
 * turns over `wiggleTurnDeg`, each counted where it turns the other way from the last. A bend or a loop turns one
 * way; a smooth S, or a line that bends round a node and back, once back; a zigzag at every tooth.
 * @param pts - the route
 * @param step - the least distance between samples, so a rounding of a pixel is no turn
 * @returns the count
 */
export function reversalsOf(pts: readonly Pt[], step: number): number {
    const n = Math.min(64, Math.floor(pathLength(pts) / Math.max(step, 1e-9)));
    if (n < 3) {
        return 0;
    }
    const q = resample(pts, n + 1);
    const limit = (ORACLE_TOLERANCES.wiggleTurnDeg * Math.PI) / 180;
    let last = 0;
    let count = 0;
    for (let i = 1; i < q.length - 1; i++) {
        const a = Math.atan2(q[i][1] - q[i - 1][1], q[i][0] - q[i - 1][0]);
        const b = Math.atan2(q[i + 1][1] - q[i][1], q[i + 1][0] - q[i][0]);
        const turn = Math.atan2(Math.sin(b - a), Math.cos(b - a));
        // a path drawn back over itself (Cytoscape desktop's line retraced at its start, cx-syn-bypass 2106 -> 2112)
        // shows as one line, not a tooth: its next sample lies on the run it came along. Every turn over 150 degrees
        // was taken for one, and a zigzag 30% of its chord high or more counted no reversal at all (#4272)
        if (Math.abs(turn) >= limit && !retraced(q[i - 1], q[i], q[i + 1], step / 8)) {
            const sign = Math.sign(turn);
            count += last !== 0 && sign !== last ? 1 : 0;
            last = sign;
        }
    }
    return count;
}

/**
 * Whether a path turns back over the run it came along at a point: the next point lies on that run's line, within a
 * distance, behind the turning point.
 * @param a - the point before
 * @param b - the turning point
 * @param c - the point after
 * @param tol - how far off the line the next point may lie
 * @returns true for a path drawn back over itself
 */
function retraced(a: Pt, b: Pt, c: Pt, tol: number): boolean {
    const [ux, uy] = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(ux, uy);
    const [vx, vy] = [c[0] - b[0], c[1] - b[1]];
    return len > 0 && ux * vx + uy * vy < 0 && Math.abs(ux * vy - uy * vx) / len <= tol;
}

/**
 * How far along its line an arrowhead's middle sits from the end it caps: in pixels, and as a share of the line. From
 * the line's nearer end instead, a head mirrored about the middle (0.3 from the target against 0.3 from the source)
 * passed, and so did graphty's Pajek heads on short lines, drawn a head's length nearer the source than Pajek's
 * (pajek-graphstream-b: Pajek draws `ap 0.5` with the head's back at the middle, graphty with its tip there).
 */
const fromOwnEnd = (line: readonly Pt[], q: Pt, end: "source" | "target"): { px: number; share: number } => {
    const { s, length } = placeOnLine(line, q);
    const px = end === "source" ? s : length - s;
    return { px, share: length > 0 ? px / length : 0 };
};

/**
 * Whether graphty's end arrowhead sits where the program's does. Most programs draw it at the line's end, and graphty's
 * is judged there (`capPlaceMiss`, its `misplaced`); one the program draws part-way along the line (Pajek's
 * `arrowPosition`, at the middle of every line on pajek-graphstream-b) is judged by how far along each line its middle
 * sits from the end it caps instead, each on its own line, as a share of the line's length; so is one graphty's style
 * draws part-way (`partWay`), wherever the program draws its own, and one graphty draws part-way against a program's
 * head with no place of its own is not judged at all (it passed). Part-way is a quarter of the line or more from its
 * own end and over two of its own lengths: a head at the end of a short line between its nodes' outlines sits a third
 * along it (the specimen sheets' short lines).
 * @param oLine - the oracle's line, between its nodes' outlines
 * @param oa - the oracle's arrowhead
 * @param gLine - graphty's line, between its nodes' outlines
 * @param ga - graphty's arrowhead, in the same frame
 * @returns the miss and what each side measured, or null where nothing can be judged
 */
function arrowPlaceMiss(
    oLine: readonly Pt[],
    oa: PArrow,
    gLine: readonly Pt[],
    ga: PArrow,
): { miss: number; oracle: number | null; graphty: number } | null {
    if (oa.end === "middle") {
        return { miss: ga.misplaced ?? 0, oracle: null, graphty: ga.misplaced ?? 0 };
    }
    const o = oa.at === undefined ? null : fromOwnEnd(oLine, oa.at, oa.end);
    if (o === null && ga.partWay === true) {
        return null;
    }
    const oPartWay = o !== null && o.share >= ARROW_PART_WAY && o.px > 2 * oa.length;
    if (o === null || ga.at === undefined || (!oPartWay && ga.partWay !== true)) {
        return { miss: ga.misplaced ?? 0, oracle: null, graphty: ga.misplaced ?? 0 };
    }
    const along = o.share;
    const mine = fromOwnEnd(gLine, ga.at, oa.end).share;
    return {
        miss: Math.max(0, Math.abs(mine - along) - ARROW_ALONG_SHARE) / ARROW_ALONG_SHARE,
        oracle: R(along),
        graphty: R(mine),
    };
}

/** An arrowhead whose middle sits this share of its line's length or more from either end is drawn part-way along. */
const ARROW_PART_WAY = 0.25;
/** How far along its line a part-way arrowhead may sit from the program's, as a share of the line's length. */
const ARROW_ALONG_SHARE = 0.05;

/** The least a route's allowance is capped at (`edge.route`), in render pixels. */
const ROUTE_CAP_PIXELS = 10;

/**
 * How far an arrowhead's size is from the oracle's: by their ratio (`arrowRatio`), but alike within a pixel, which a
 * rounding on a head a few pixels long moves by more than the ratio allows.
 * @param o - the oracle's size, in oracle pixels
 * @param g - graphty's, in oracle pixels
 * @param pixel - a render pixel, in oracle pixels
 * @returns the miss, 0 when alike
 */
function arrowMiss(o: number, g: number, pixel: number): number {
    return Math.abs(g - o) <= pixel ? 0 : ratioMiss(g / Math.max(o, 1e-9), ORACLE_TOLERANCES.arrowRatio);
}

/**
 * How many parts in a row a head at one end has: its arrows apart by more than a third of the larger one's length are
 * two parts (Graphviz's boxdotnormal), those at one place are one (Cytoscape's hollow head, its fill and its outline),
 * and one of another color or size is no part of it.
 * @param heads - the arrows at one end
 * @returns the count
 */
function headParts(heads: readonly PArrow[]): number {
    const placed: PArrow[] = [];
    for (const h of heads) {
        const apart = (q: PArrow): boolean =>
            h.at === undefined ||
            q.at === undefined ||
            Math.hypot(h.at[0] - q.at[0], h.at[1] - q.at[1]) > Math.max(h.length, q.length) / 3;
        // a part of the same head is drawn in the head's color at about its size: a neighbor's head read onto this
        // end (a diamond of another color beside a Cytoscape desktop head) is not one
        const first = placed[0];
        const kin =
            first === undefined ||
            (h.color === first.color && h.length <= 2 * first.length && first.length <= 2 * h.length);
        if (kin && placed.every(apart)) {
            placed.push(h);
        }
    }
    return placed.length;
}

/** A line's usual advance, in its font box's heights (CSS's `line-height: normal`, Graphviz's LINESPACING). */
const LINE_ADVANCE = 1.2;

/**
 * Whether the program draws most of a text's words near it: half its words or more among the program's texts whose
 * middles lie within the text's box, give or take a line's advance, or anywhere where no place relates the two
 * drawings. A text graphty draws on several lines the program draws one line a text (xgmml-wp4271-cy3-export's
 * "Absorption and transport"), and wraps where it wraps.
 * @param words - the text's words, normalized
 * @param box - its box in the oracle's frame, or null to look anywhere
 * @param texts - the program's texts, words normalized
 * @returns whether they are drawn
 */
function wordsDrawnNear(words: string, box: PBox | null, texts: readonly { words: string; box: PBox }[]): boolean {
    const near = (b: PBox): boolean => {
        if (box === null) {
            return true;
        }
        // graphty's box is its letters' font box (#5322), no longer the line box 1.2 times as tall that this slack
        // was set by
        const slack = LINE_ADVANCE * (box.y1 - box.y0);
        const [x, y] = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
        return x >= box.x0 - slack && x <= box.x1 + slack && y >= box.y0 - slack && y <= box.y1 + slack;
    };
    const theirs = new Set(texts.filter((t) => near(t.box)).flatMap((t) => norm(t.words).split(" ")));
    const mine = norm(words)
        .split(" ")
        .filter((w) => w !== "");
    return mine.length > 0 && mine.filter((w) => theirs.has(w)).length >= mine.length / 2;
}

/**
 * How far graphty's dash pattern is from the oracle's, where both read one: the period (a dash and the gap after it,
 * each the mean of its kind) and the share of it drawn, each by its ratio (`dashRatio`). Only the class was judged, so
 * Graphviz's sparse dots drawn nearly solid and Cytoscape's long dashes drawn as equal ones passed.
 * @param o - the oracle's dash array, in oracle pixels
 * @param g - graphty's, in graphty pixels
 * @param scale - graphty pixels to oracle pixels
 * @returns the miss and each side's period and share, or null where a side reads none
 */
function dashMiss(
    o: readonly number[] | null,
    g: readonly number[] | null,
    scale: number,
): { miss: number; oracle: string; graphty: string } | null {
    const read = (d: readonly number[] | null, k: number): { period: number; on: number } | null => {
        if (d === null || d.length < 2) {
            return null;
        }
        const mean = (xs: readonly number[]): number => xs.reduce((t, x) => t + x, 0) / xs.length;
        const on = mean(d.filter((_, i) => i % 2 === 0)) * k;
        const off = mean(d.filter((_, i) => i % 2 === 1)) * k;
        return on + off > 0 ? { period: on + off, on: on / (on + off) } : null;
    };
    const [a, b] = [read(o, 1), read(g, scale)];
    if (a === null || b === null) {
        return null;
    }
    const R = ORACLE_TOLERANCES.dashRatio;
    const show = (x: { period: number; on: number }): string => `${x.period.toFixed(1)} px, ${x.on.toFixed(2)} on`;
    return { miss: ratioMiss(b.period / a.period, R) + ratioMiss(b.on / a.on, R), oracle: show(a), graphty: show(b) };
}

/**
 * How far one opacity is from another: past the opacity tolerance apart, or past its ratio where either shows (where
 * both had to, a faint tint halved to under 0.05 passed: xgmml-wp4271-cy3-export's group fills, 0.098 drawn at 0.049).
 * @param o - the oracle's
 * @param g - graphty's
 * @returns the miss, 0 when alike
 */
function opacityMiss(o: number, g: number): number {
    const T = ORACLE_TOLERANCES;
    const ratio = Math.max(o, g) > 0.05 ? ratioMiss(Math.max(g, 1e-9) / Math.max(o, 1e-9), T.opacityRatio) : 0;
    return Math.max(0, Math.abs(o - g) - T.opacity) + ratio;
}

/** The length of an open path. */
const pathLength = (pts: readonly Pt[]): number =>
    pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

/** Farthest point from the chord over the chord's length. */
export function curvatureOf(pts: readonly Pt[]): number {
    const a = pts[0];
    const b = pts.at(-1);
    if (a === undefined || b === undefined) {
        return 0;
    }
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (closedRing(pts)) {
        // a loop: every point is off its zero-length chord, also where the ends miss by a rounding (vis-network's
        // ring, drawn by an arc from 0 to 2 pi: 2078 chords off its chord of 0.02 px)
        return pts.length > 2 ? 1 : 0;
    }
    let m = 0;
    for (const [x, y] of pts) {
        m = Math.max(m, Math.abs((b[0] - a[0]) * (a[1] - y) - (a[0] - x) * (b[1] - a[1])) / L);
    }
    return m / L;
}

/** Whether a point is inside a node: its box for a rectangle, else the ellipse its box holds. */
const insideNode = (n: PNode, [x, y]: Pt): boolean => {
    const [u, v] = [Math.abs(x - n.cx) / (n.w / 2), Math.abs(y - n.cy) / (n.h / 2)];
    if (!(n.w > 0 && n.h > 0)) {
        return false;
    }
    return n.shape === "rect" || n.shape === "roundrect" ? u < 1 && v < 1 : u * u + v * v < 1;
};

/**
 * A path without its ends inside a node: from where it first leaves the start node to where it last enters the
 * end node, each crossing found on its segment. One program draws an edge from border to border and another from
 * center to center under opaque nodes; a reader sees the same line, so a route is judged on the part between the
 * nodes. A path that never leaves its nodes is kept as it is.
 * @param pts - the path
 * @param start - the node it starts in
 * @param end - the node it ends in
 * @returns the visible path
 */
export function clipToNodes(pts: readonly Pt[], start: PNode | undefined, end: PNode | undefined): Pt[] {
    return shownPart(pts, start, end) ?? [...pts];
}

/**
 * The part of a path between its nodes' outlines (`clipToNodes`), or null where none of it shows: it never leaves its
 * nodes, or what is left lies wholly under them.
 * @param pts - the path
 * @param start - the node it starts in
 * @param end - the node it ends in
 * @returns the part, or null
 */
export function shownPart(pts: readonly Pt[], start: PNode | undefined, end: PNode | undefined): Pt[] | null {
    const crossing = (a: Pt, b: Pt, n: PNode): Pt => {
        // a is inside, b outside: bisect for the border
        let lo = 0;
        let hi = 1;
        for (let k = 0; k < 24; k++) {
            const t = (lo + hi) / 2;
            if (insideNode(n, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) {
                lo = t;
            } else {
                hi = t;
            }
        }
        return [a[0] + (b[0] - a[0]) * hi, a[1] + (b[1] - a[1]) * hi];
    };
    // A line that starts on its node's outline and runs across the node first (Cytoscape.js `source-endpoint: -50%
    // 0%`) is cut where it leaves the node again: its start, on the outline, one side rounds inside and the other
    // outside (cytoscapejs-specimen-edges-lines-p2). A line that starts outside and only later passes a node is kept.
    const trimStart = (path: Pt[], n: PNode | undefined): Pt[] => {
        if (n === undefined || path.length < 2) {
            return path;
        }
        // a straight line is two points: the stretch across the node holds none of them
        const { dense, of } = finer(path, Math.min(n.w, n.h) / 4);
        // A line that ends on its node's outline from across the node (Graphviz's `headport=n`, `ne` from the left)
        // ends a hair inside the outline on one side and a hair outside on the other: it starts on the node while every
        // point before it runs in lies within a pixel of the node (dot-specimen-edges-lines headport-n). And it leaves
        // the node where it goes on out past that pixel: a hair's step out past a corner and back in is the same corner.
        const near = { ...n, w: n.w + 2 * ORACLE_TOLERANCES.pixel, h: n.h + 2 * ORACLE_TOLERANCES.pixel };
        const into = dense.findIndex((q) => insideNode(n, q));
        if (into < 0 || (into > 1 && !dense.slice(0, into).every((q) => insideNode(near, q)))) {
            return path;
        }
        const leaves = (k: number): boolean => {
            const back = dense.findIndex((q, j) => j >= k && (insideNode(n, q) || !insideNode(near, q)));
            return back < 0 || !insideNode(n, dense[back]);
        };
        const i = dense.findIndex((q, k) => k > into && !insideNode(n, q) && leaves(k));
        return i < 1 ? path : [crossing(dense[i - 1], dense[i], n), ...path.slice(of[i])];
    };
    // a ring drawn round a loop's node (vis-network's loop, behind its node) shows only the arc outside the node: it is
    // read from inside the node, wherever the program started stroking it (json-vis-synth 55 -> 55)
    const head = trimStart(start !== undefined && start === end ? fromInside(pts, start) : [...pts], start);
    const out = trimStart([...head].reverse(), end).reverse();
    // what is left wholly under its nodes (two nodes drawn over one another, the line between their centers) shows no
    // part between them: a sliver cut from it would be judged as the route (pajek-synth-vertices 32->41)
    const under = (a: Pt, b: Pt): boolean => {
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        return [start, end].some((n) => n !== undefined && insideNode(n, mid));
    };
    const hidden = out.slice(1).every((q, i) => under(out[i], q));
    return out.length >= 2 && !hidden ? out : null;
}

/**
 * How far one route is from another: where its two ends are, and its shape, each route seen in its own chord's frame
 * (its start at the origin, its end at (1, 0), across in chord lengths), so the shape is judged relative to its own
 * ends: an arc against a sine wave between the same two nodes is as far apart as the arc's height and the wave's
 * together. A loop's chord is next to nothing; it is judged as drawn, against its length instead.
 * @param o - the oracle's route
 * @param g - graphty's, in the oracle's frame and direction
 * @param shift - how far graphty's source and target nodes sit from the oracle's, each end's own: an end is judged
 *     where it sits on its node, and where the node sits is node.position's to judge (dot-synth-nodes n_alpha ->
 *     n_hsv: two straight lines, 10 px apart because their nodes are)
 * @returns the larger of the ends' distance and the shapes' Frechet distance over `pathSamples` samples, as a share
 *     of `unit` oracle pixels
 */
export function routeShape(
    o: readonly Pt[],
    g: readonly Pt[],
    shift: readonly [Pt, Pt] = [
        [0, 0],
        [0, 0],
    ],
): { gap: number; unit: number } {
    const N = ORACLE_TOLERANCES.pathSamples;
    const length = pathLength(o);
    if (o.length > 2 && g.length > 2 && closedRing(o) && closedRing(g)) {
        // two rings are the same ring wherever each starts and whichever way it runs (vis-network strokes its loop
        // from the circle's right, graph-io writes it from the side facing the node)
        const unit = Math.max(length, 1e-9);
        return { gap: ringGap(resample(o, N), resample(g, N)) / unit, unit };
    }
    const chordOf = (pts: readonly Pt[]): number => {
        const b = pts.at(-1) ?? pts[0];
        return Math.hypot(b[0] - pts[0][0], b[1] - pts[0][1]);
    };
    const chord = chordOf(o);
    if (o.length < 2 || g.length < 2 || chord < 0.25 * length || chordOf(g) < 1e-9) {
        const unit = Math.max(length, 1e-9);
        return { gap: frechet(resample(o, N), resample(g, N)) / unit, unit };
    }
    const own = (pts: readonly Pt[]): Pt[] => {
        const [a, b] = [pts[0], pts.at(-1) ?? pts[0]];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const [ux, uy] = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
        return pts.map(([x, y]): Pt => [
            ((x - a[0]) * ux + (y - a[1]) * uy) / L,
            (-(x - a[0]) * uy + (y - a[1]) * ux) / L,
        ]);
    };
    const [gs, gt] = [g[0], g.at(-1) ?? g[0]];
    const [os, ot] = [o[0], o.at(-1) ?? o[0]];
    const ends = Math.max(
        Math.hypot(gs[0] - shift[0][0] - os[0], gs[1] - shift[0][1] - os[1]),
        Math.hypot(gt[0] - shift[1][0] - ot[0], gt[1] - shift[1][1] - ot[1]),
    );
    return { gap: Math.max(ends / chord, frechet(resample(own(o), N), resample(own(g), N))), unit: chord };
}

/**
 * A closed ring started again at its first point inside a node, closed there; any other path, or a ring with no point
 * inside the node, as it is.
 * @param pts - the path
 * @param n - the node
 * @returns the path
 */
function fromInside(pts: readonly Pt[], n: PNode): Pt[] {
    if (pts.length < 4 || !closedRing(pts) || insideNode(n, pts[0])) {
        return [...pts];
    }
    const round = pts.slice(0, -1);
    const k = round.findIndex((q) => insideNode(n, q));
    return k < 0 ? [...pts] : [...round.slice(k), ...round.slice(0, k), round[k]];
}

/**
 * A path with points added along each segment longer than a step, so no stretch of it longer than the step goes
 * unsampled.
 * @param pts - the path
 * @param step - the longest segment kept, at least a hundredth of a pixel
 * @returns the points, and for each the index of the path's point that ends the segment it lies on
 */
function finer(pts: readonly Pt[], step: number): { dense: Pt[]; of: number[] } {
    const dense: Pt[] = pts.slice(0, 1);
    const of = [0];
    const at = Math.max(step, 0.01);
    for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const k = Math.max(1, Math.min(1000, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / at)));
        for (let j = 1; j <= k; j++) {
            dense.push(j === k ? b : [a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
            of.push(i);
        }
    }
    return { dense, of };
}

/**
 * Whether a path closes on itself: its ends within a thousandth of its length of each other.
 * @param pts - the path
 * @returns true for a ring
 */
function closedRing(pts: readonly Pt[]): boolean {
    const [a, b] = [pts[0], pts.at(-1)];
    if (a === undefined || b === undefined) {
        return false;
    }
    const gap = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return gap < 1e-9 || gap < 1e-3 * pathLength(pts);
}

/**
 * The Frechet distance between two closed rings, at the start and the way round that brings them closest.
 * @param o - one ring, its last point its first
 * @param g - the other, as many points
 * @returns the distance
 */
function ringGap(o: readonly Pt[], g: readonly Pt[]): number {
    const round = g.slice(0, -1);
    let best = Infinity;
    for (const way of [round, [...round].reverse()]) {
        for (let k = 0; k < way.length; k++) {
            const turned = [...way.slice(k), ...way.slice(0, k)];
            best = Math.min(best, frechet(o, [...turned, turned[0]]));
        }
    }
    return best;
}

/**
 * Whether two line classes are the same: a pattern no class names ("other") matches nothing, not even itself.
 * @param a - one class
 * @param b - the other
 * @returns true when they match
 */
const sameLine = (a: DashClass, b: DashClass): boolean => a === b && a !== "other";

/**
 * graphty's line class at the oracle's scale: a dash array graphty drew (its measured elements and gaps) is read again
 * with its lengths in oracle pixels, so the pixel floor under which a dash is a dot is the same on both sides however
 * much smaller or larger graphty drew the graph.
 * @param s - graphty's stroke
 * @param scale - graphty pixels to oracle pixels
 * @returns the class
 */
function lineClassAt(s: PStroke, scale: number): DashClass {
    return s.dash !== null && s.dash.length >= 2 && !isPattern(s.dashClass)
        ? dashClassOf(
              s.dash.map((d) => d * scale),
              s.width * scale,
          )
        : s.dashClass;
}

/** A band along an edge's line: its outline under it or its overlay over it. */
type EdgeBand = { color: string; opacity: number; width: number; dashClass?: DashClass } | null | undefined;

/**
 * Judges a band along an edge's line (`edge.outline`, `edge.overlay`) wherever either side draws one that shows.
 * @param j - the judge
 * @param property - the property it is judged as
 * @param id - the edge's id
 * @param bands - the oracle's band and graphty's
 * @param lengthScale - graphty pixels to oracle pixels
 */
function judgeBand(
    j: Judge,
    property: "edge.outline" | "edge.overlay",
    id: string,
    bands: readonly [EdgeBand, EdgeBand],
    lengthScale: number,
): void {
    const T = ORACLE_TOLERANCES;
    const [ob, gb] = bands.map((b) => (b !== undefined && b !== null && b.opacity > 0.05 ? b : null));
    if (ob === null && gb === null) {
        return;
    }
    // its line class shown only where it is not solid, as the band's own dashes (vis-network's background.dashes)
    const show = (b: EdgeBand, k: number): unknown =>
        b === null || b === undefined
            ? null
            : [b.color, R(b.opacity), R(b.width * k), ...(b.dashClass === undefined ? [] : [b.dashClass])];
    const miss =
        ob === null || gb === null
            ? 1
            : Math.max(0, deltaE(ob.color, gb.color) - T.colorDeltaE) +
              ratioMiss((gb.width * lengthScale) / Math.max(ob.width, 1e-9), T.edgeWidthRatio) +
              opacityMiss(ob.opacity, gb.opacity) +
              (sameLine(ob.dashClass ?? "solid", gb.dashClass ?? "solid") ? 0 : 1);
    j.add(property, "edge", id, miss, show(ob, 1), show(gb, lengthScale));
}

/** The places along a gradient its colors are compared at. */
const RAMP_AT = [0, 0.25, 0.5, 0.75, 1] as const;

/**
 * A gradient's color at a place along it, mixed between its stops in RGB.
 * @param g - the gradient
 * @param t - 0 at its start, 1 at its end
 * @returns `#rrggbb`
 */
export function rampColor(g: PGradient, t: number): string {
    const stops = [...g.stops].sort((a, b) => a.offset - b.offset);
    const first = stops[0];
    const last = stops.at(-1);
    if (first === undefined || last === undefined) {
        return "#000000";
    }
    if (t <= first.offset) {
        return first.color;
    }
    const k = stops.findIndex((s) => s.offset >= t);
    if (k < 0) {
        return last.color;
    }
    const [a, b] = [stops[k - 1], stops[k]];
    const f = b.offset > a.offset ? (t - a.offset) / (b.offset - a.offset) : 0;
    const rgb = (h: string, i: number): number => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
    return `#${[0, 1, 2]
        .map((i) =>
            Math.round(rgb(a.color, i) + f * (rgb(b.color, i) - rgb(a.color, i)))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

/** The difference between two directions, in degrees, -180 to 180. */
const turnOf = (deg: number): number => (((deg % 360) + 540) % 360) - 180;

/**
 * How far two gradients are from alike: one on each side or on neither; the same kind; their colors at five places
 * along them within the color tolerance; a linear one's direction within its tolerance.
 * @param o - the oracle's gradient, or null
 * @param g - graphty's, or null
 * @param angles - each linear gradient's direction as judged (in the oracle's frame, or against its edge's chord)
 * @param angles.o - the oracle's
 * @param angles.g - graphty's
 * @returns the miss (0 when alike) and what each side shows
 */
function gradientMiss(
    o: PGradient | null,
    g: PGradient | null,
    angles: { o: number | null; g: number | null },
): { miss: number; oracle: unknown; graphty: unknown } {
    const show = (x: PGradient | null, angle: number | null): unknown =>
        x === null
            ? null
            : { kind: x.kind, angle: angle === null ? null : R(angle, 1), colors: RAMP_AT.map((t) => rampColor(x, t)) };
    const out = { oracle: show(o, angles.o), graphty: show(g, angles.g) };
    if (o === null || g === null) {
        return { miss: (o === null) === (g === null) ? 0 : 1, ...out };
    }
    if (o.kind !== g.kind) {
        return { miss: 1, ...out };
    }
    const colors = Math.max(...RAMP_AT.map((t) => deltaE(rampColor(o, t), rampColor(g, t))));
    let miss = Math.max(0, colors - ORACLE_TOLERANCES.colorDeltaE);
    // a ramp of one color looks the same run either way (Pajek's gradient between two vertices of one color), so it
    // has no direction to judge
    const changes = (x: PGradient): boolean =>
        RAMP_AT.some((t) => deltaE(rampColor(x, t), rampColor(x, RAMP_AT[0])) > ORACLE_TOLERANCES.colorDeltaE);
    if (o.kind === "linear" && angles.o !== null && angles.g !== null && (changes(o) || changes(g))) {
        miss += Math.max(0, Math.abs(turnOf(angles.g - angles.o)) - ORACLE_TOLERANCES.gradientAngleDeg) / 90;
    }
    return { miss, ...out };
}

/** The direction of a route's chord, in degrees on screen. */
const chordAngle = (pts: readonly Pt[]): number => {
    const b = pts.at(-1) ?? pts[0];
    return (Math.atan2(b[1] - pts[0][1], b[0] - pts[0][0]) * 180) / Math.PI;
};

/**
 * Which judgments a comparison keeps: a property of an element this oracle is the reference for, by the element's id,
 * or by `subject` where the id does not name the element's ends (an extra edge: its graphty id, its ends' node ids).
 */
export type OracleJudges = (property: OracleProperty, id: string, subject?: string) => boolean;

class Judge {
    readonly results = new Map<OracleProperty, OracleJudged[]>();
    readonly failed = new Map<string, Set<OracleProperty>>();

    constructor(private readonly judges: OracleJudges = () => true) {}

    add(
        p: OracleProperty,
        kind: string,
        id: string,
        miss: number,
        oracle: unknown,
        graphty: unknown,
        subject?: string,
    ): void {
        if (!this.judges(p, id, subject)) {
            return;
        }
        const pass = miss <= 0;
        const list = this.results.get(p) ?? [];
        list.push({ id, pass, miss: pass ? 0 : miss, oracle, graphty });
        this.results.set(p, list);
        if (!pass) {
            const key = `${kind}\u0000${id}`;
            const set = this.failed.get(key) ?? new Set();
            set.add(p);
            this.failed.set(key, set);
        }
    }
}

const TOLERANCE_TEXT: Record<OracleProperty, string> = {
    "node.present": "every oracle node is drawn by graphty",
    "node.extra": "every node graphty draws is one the oracle draws (no extra, hidden or duplicate node)",
    "node.position": `center within ${String(ORACLE_TOLERANCES.positionOfSize)} of the node's smaller side (at least ${String(ORACLE_TOLERANCES.pixel)} render px) after the fit`,
    "node.width": `ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    "node.height": `ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    "node.sizeToSpacing": `size over the drawing's median nearest-node spacing, ratio in [${ORACLE_TOLERANCES.layoutSizeRatio.join(", ")}]`,
    "node.sizeToExtent": `size over the diagonal of the drawing's extent, ratio in [${ORACLE_TOLERANCES.layoutSizeRatio.join(", ")}]`,
    "node.shape": "same shape class, where the oracle's can be told",
    "node.fill": `both unfilled, or both filled within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "node.fillOpacity": `within ${String(ORACLE_TOLERANCES.opacity)}, and a ratio in [${ORACLE_TOLERANCES.opacityRatio.join(", ")}] where either is over 0.05`,
    "node.gradient": `a gradient on both sides or on neither; alike, the same kind, colors within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} at five places along it, a linear one's direction within ${String(ORACLE_TOLERANCES.gradientAngleDeg)} degrees`,
    "node.stroke": `both outlined within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} and at an opacity as a fill's, or neither (under ${String(ORACLE_TOLERANCES.hairline)} px is none)`,
    "node.strokeWidth": `ratio in [${ORACLE_TOLERANCES.strokeWidthRatio.join(", ")}]`,
    "node.ring": `a ring clear outside the outline (an outline ring, a second periphery) on both sides or neither; alike, its color within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}, its opacity as a fill's, its width ratio in [${ORACLE_TOLERANCES.strokeWidthRatio.join(", ")}], the same line class, and how far it reaches out from the node in [${ORACLE_TOLERANCES.labelOutlineRatio.join(", ")}]`,
    "node.strokeDash":
        "same line class (solid, dashed, dotted, dash-dot from the dashes and gaps against the width; double, zigzag, sine wave, slashes, arrows from a pattern's geometry); a pattern no class names matches nothing",
    "label.present": "a label on both sides or on neither",
    "label.text": "same words (whitespace folded)",
    "label.size": `font size ratio in [${ORACLE_TOLERANCES.fontSizeRatio.join(", ")}]`,
    "label.weight": `CSS weight within ${String(ORACLE_TOLERANCES.fontWeight)}`,
    "label.style": "same style (normal / italic)",
    "label.color": `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "label.rotation": `within ${String(ORACLE_TOLERANCES.rotationDeg)} degrees (an edge label's against its own line where the layouts are unrelated)`,
    "label.offset": `label center relative to its node (its group's box) within ${String(ORACLE_TOLERANCES.labelOffsetOfSize)} of its font size (at least ${String(ORACLE_TOLERANCES.pixel)} render px)`,
    "label.opacity": `the words' opacity (their color's alpha times every opacity above them) within ${String(ORACLE_TOLERANCES.opacity)}, and a ratio in [${ORACLE_TOLERANCES.opacityRatio.join(", ")}] where either is over 0.05`,
    "label.family":
        "the same face where the program names a pinned face (DejaVu, Liberation, Free, Lato), else the same font class (sans-serif, serif, monospace, cursive, fantasy), once each side's family is resolved as the pinned fonts resolve it; graphty's in a browser, where a name no pinned font answers to falls through to the next and at last to serif",
    "label.lines": "the same number of lines (a label wrapped at its width, or broken at a newline)",
    "label.align": `lines aligned the same way (left, centered, right), where the oracle's lines differ in width by ${String(ORACLE_TOLERANCES.lineAlignOfSize)} of the font size`,
    "label.anchor": `the same place against its node (its group's box) on each axis: before it, inside at its start, centered, inside at its end, after it (within ${String(ORACLE_TOLERANCES.labelAnchorOfSize)} of the font size)`,
    "label.alongLine": `an edge label's middle at the same place along its line, within ${String(ORACLE_TOLERANCES.labelAlongOfLength)} of the edge's length or one font size`,
    "label.offLine": `an edge label's middle as far off its line, on the same side, within ${String(ORACLE_TOLERANCES.labelOffLineOfSize)} of its font size (at least ${String(ORACLE_TOLERANCES.pixel)} render px)`,
    "label.outline": `an outline round the letters on both sides or neither; alike, its color within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}, its opacity within ${String(ORACLE_TOLERANCES.opacity)} (and a ratio in [${ORACLE_TOLERANCES.opacityRatio.join(", ")}] where either is over 0.05) and its width outside the letters in [${ORACLE_TOLERANCES.labelOutlineRatio.join(", ")}]`,
    "label.background": `a box behind the words on both sides or neither; alike, its fill within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} and opacity within ${String(ORACLE_TOLERANCES.opacity)} (and a ratio in [${ORACLE_TOLERANCES.opacityRatio.join(", ")}] where either is over 0.05)`,
    "label.backgroundBox": `the box behind the words the same shape (rectangle, rounded, ellipse), its width and height ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    "label.backgroundBorder": `a border round the box behind the words on both sides or neither; alike, its color within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}, its opacity as a fill's and its width in [${ORACLE_TOLERANCES.labelOutlineRatio.join(", ")}]`,
    "edge.present": "every oracle edge is drawn by graphty",
    "edge.extra": "every edge graphty draws is one the oracle draws (no extra, hidden or duplicate edge)",
    "edge.route": `each route between its own nodes' outlines, in its own chord's frame (${String(ORACLE_TOLERANCES.pathSamples)} samples): its ends where they sit on their own nodes: Frechet distance within ${String(ORACLE_TOLERANCES.edgePathOfLength)} of the chord (of the length, for a loop), but no more than its end nodes' smaller side (or ten render px), and at least ${String(ORACLE_TOLERANCES.pixel)} render px`,
    "edge.curve": `farthest point from the chord over the chord, within ${String(ORACLE_TOLERANCES.curvature)} or ${String(ORACLE_TOLERANCES.curveShare)} of the oracle's, or a pixel deep over the shorter chord; where each program lays the file out itself, the share of edges bent over ${String(ORACLE_TOLERANCES.curvature)}, within ${String(ORACLE_TOLERANCES.curvedShare)} of the oracle's`,
    "edge.wiggle": `how often the route turns back the other way (turns over ${String(ORACLE_TOLERANCES.wiggleTurnDeg)} degrees that do not run back over the line, every two render pixels along it), within ${String(ORACLE_TOLERANCES.wiggleReversals)} or ${String(ORACLE_TOLERANCES.wiggleShare)} of the oracle's`,
    "edge.color": `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "edge.width": `ratio in [${ORACLE_TOLERANCES.edgeWidthRatio.join(", ")}]`,
    "edge.opacity": `within ${String(ORACLE_TOLERANCES.opacity)}, and a ratio in [${ORACLE_TOLERANCES.opacityRatio.join(", ")}] where either is over 0.05`,
    "edge.dash":
        "same line class (solid, dashed, dotted, dash-dot from the dashes and gaps against the width; double, zigzag, sine wave, slashes, arrows, a taper to a point from a pattern's geometry); a pattern no class names matches nothing",
    "edge.gradient": `a gradient on both sides or on neither; alike, the same kind, colors within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} at five places along it, a linear one's direction against the edge's chord within ${String(ORACLE_TOLERANCES.gradientAngleDeg)} degrees`,
    "edge.outline": `a band under the line (a line outline, an edge background) on both sides or neither; alike, its color within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}, its whole width ratio in [${ORACLE_TOLERANCES.edgeWidthRatio.join(", ")}] and its opacity within ${String(ORACLE_TOLERANCES.opacity)}`,
    "edge.overlay": `a band over the line (Cytoscape.js's overlay) on both sides or neither; alike, its color within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}, its whole width ratio in [${ORACLE_TOLERANCES.edgeWidthRatio.join(", ")}] and its opacity within ${String(ORACLE_TOLERANCES.opacity)}`,
    "edge.arrow": "an arrowhead at the same ends",
    "edge.arrowShape":
        "the same shape class at each end (triangle, inverted, vee, crow, diamond, circle, box, tee, half); one no class names matches nothing",
    "edge.arrowParts": "as many arrowhead parts in a row at each end",
    "edge.dashPeriod": `where both sides read a dash array: its period (a dash and a gap) and the share of it drawn, each ratio in [${ORACLE_TOLERANCES.dashRatio.join(", ")}]`,
    "edge.arrowPlace": `graphty's arrowhead on its line's end: no gap ahead of it, not wholly back along the line, its middle on the line within a quarter of its width, each within ${String(2)} render pixels`,
    "edge.arrowFill": "filled on both or hollow on both, at each end",
    "edge.arrowColor": `deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} at each end`,
    "edge.arrowLength": `ratio in [${ORACLE_TOLERANCES.arrowRatio.join(", ")}], or within ${String(ORACLE_TOLERANCES.pixel)} render pixels`,
    "edge.arrowWidth": `ratio in [${ORACLE_TOLERANCES.arrowRatio.join(", ")}], or within ${String(ORACLE_TOLERANCES.pixel)} render pixels`,
    "edge.arrowToSpacing": `arrowhead length over the drawing's median nearest-node spacing, ratio in [${ORACLE_TOLERANCES.layoutSizeRatio.join(", ")}]`,
    "edge.label": "same words",
    "group.present": "every oracle group box is drawn by graphty",
    "group.extra": "every group box graphty draws is one the oracle draws",
    "group.box": `intersection over union at least ${String(ORACLE_TOLERANCES.groupIoU)}, and every side within ${String(ORACLE_TOLERANCES.groupSideOfSize)} of the box's smaller side (at least ${String(ORACLE_TOLERANCES.pixel)} render px)`,
    "group.fill": `both unfilled, or deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)}`,
    "group.fillOpacity": `within ${String(ORACLE_TOLERANCES.opacity)}, and a ratio in [${ORACLE_TOLERANCES.opacityRatio.join(", ")}] where either is over 0.05`,
    "group.stroke": `both outlined within deltaE ${String(ORACLE_TOLERANCES.colorDeltaE)} and at an opacity as a fill's, or neither (under ${String(ORACLE_TOLERANCES.hairline)} px is none)`,
    "group.strokeWidth": `ratio in [${ORACLE_TOLERANCES.strokeWidthRatio.join(", ")}]`,
    "group.strokeDash": "same line class",
    "group.label": "same words",
    "stray.present": `every unassociated oracle shape or text has a graphty annotation over it (IoU ${String(ORACLE_TOLERANCES.strayIoU)})`,
    "stray.extra": `every annotation graphty draws has an oracle shape or text under it (IoU ${String(ORACLE_TOLERANCES.strayIoU)})`,
    "frame.mirror": "graphty's drawing is not the program's mirrored (unless the program is known to mirror)",
    "frame.rotation": `the fitted frame turns graphty's drawing by at most ${String(ORACLE_TOLERANCES.rotationDeg)} degrees`,
    "frame.zoom": `the share of its canvas the drawing fills (along its tighter axis), ratio in [${ORACLE_TOLERANCES.sizeRatio.join(", ")}]`,
    background: `deltaE ${String(ORACLE_TOLERANCES.backgroundDeltaE)}`,
};

const boxW = (b: PBox): number => b.x1 - b.x0;
const boxMiddle = (b: PBox): Pt => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
const boxH = (b: PBox): number => b.y1 - b.y0;
const toBox = (b: PBox): { x: number; y: number; w: number; h: number } => ({
    x: b.x0,
    y: b.y0,
    w: boxW(b),
    h: boxH(b),
});

/**
 * How thick a line drawn as a stray (an annotation's line, a chart's axis) is taken to be when two strays' boxes are
 * overlapped, in render px: a straight line's box has no height (or width), so two identical lines overlapped by their
 * bare boxes share no area at all.
 */
const STRAY_LINE_PX = 2;

/**
 * The overlap of two strays' boxes, each thin axis widened to `STRAY_LINE_PX` about its middle.
 * @param a - one box
 * @param b - the other
 * @returns their IoU
 */
export function strayIou(a: PBox, b: PBox): number {
    const thick = (box: PBox): PBox => {
        const [mx, my] = boxMiddle(box);
        const hw = Math.max(boxW(box), STRAY_LINE_PX) / 2;
        const hh = Math.max(boxH(box), STRAY_LINE_PX) / 2;
        return { x0: mx - hw, y0: my - hh, x1: mx + hw, y1: my + hh };
    };
    return iou(toBox(thick(a)), toBox(thick(b)));
}

/** A specimen sheet's corner anchor node (`anchor-nw` and so on), which fixes the frame. */
const isAnchor = (id: string): boolean => id.startsWith("anchor-");

/** A specimen sheet's caption words in a scene: its `cap-*` nodes' labels, and the texts of those drawn as text only. */
const captionWordsOf = (scene: PScene): string[] => [
    ...scene.nodes.filter((n) => n.id.startsWith("cap-")).flatMap((n) => (n.label ? [norm(n.label.content)] : [])),
    ...scene.texts.filter((t) => t.owner?.startsWith("cap-") === true).map((t) => norm(t.content)),
];

/**
 * A scene whose nodes graphty draws no body for (`faceless`) are the texts they draw instead, their label and glyph:
 * no node, as the program's text-only and icon-only nodes are no node on its side. One the other side does draw a
 * node for stays a node, judged as one.
 * @param scene - either side
 * @param other - the other side, or null
 * @returns the scene, those nodes as texts
 */
export function facelessAsTexts(scene: PScene, other: PScene | null = null): PScene {
    const drawn = new Set(other?.nodes.map((n) => n.id) ?? []);
    const asTexts = (n: PNode): boolean => n.faceless !== undefined && !drawn.has(n.id);
    if (!scene.nodes.some(asTexts)) {
        return scene;
    }
    return {
        ...scene,
        nodes: scene.nodes.filter((n) => !asTexts(n)),
        texts: [...scene.texts, ...scene.nodes.flatMap((n) => (asTexts(n) ? (n.faceless ?? []) : []))],
    };
}

/**
 * A scene without a specimen sheet's caption nodes (`cap-*`, text "<property>=<value>" under each specimen): they
 * describe the sheet and are not judged. A caption's words left as free text are dropped too, and so are the lines of
 * a caption the program wrapped (two to four lines stacked one under another, whose words run together are a
 * caption's).
 * @param scene - either side
 * @param other - the other side, whose captions name the words to drop where this side's markup names none (an SVG)
 * @returns the scene without them
 */
export function withoutCaptions(scene: PScene, other: PScene | null = null): PScene {
    const ids = new Set(scene.nodes.filter((n) => n.id.startsWith("cap-")).map((n) => n.id));
    const squash = (w: string): string => w.replace(/\s+/g, "");
    const theirs = other === null ? [] : captionWordsOf(other);
    const own = new Set(captionWordsOf(scene).map(squash));
    const words = new Set([...own, ...theirs.map(squash)]);
    if (ids.size === 0 && words.size === 0) {
        return facelessAsTexts(scene, other);
    }
    const { texts } = scene;
    const below = (a: PText): PText | undefined =>
        texts.find(
            (b) =>
                (Math.abs(b.x - a.x) <= 0.5 * a.sizePx ||
                    Math.abs(boxMiddle(b.box)[0] - boxMiddle(a.box)[0]) <= a.sizePx) &&
                Math.abs(b.sizePx - a.sizePx) <= 0.1 * a.sizePx &&
                b.y - a.y > 0.5 * a.sizePx &&
                b.y - a.y <= 1.6 * a.sizePx,
        );
    const dropped = new Set<PText>();
    for (const t of texts) {
        if (t.owner?.startsWith("cap-") === true || words.has(squash(t.content))) {
            dropped.add(t);
            if (t.owner?.startsWith("cap-") === true) {
                continue;
            }
        }
        // a line that is a caption's words on its own may also be the first line of a longer caption wrapped under it
        // ("font.strokeWidth=3" over "strokeColor")
        const run = [t];
        for (let next = below(t); next !== undefined && run.length < 4; next = below(next)) {
            run.push(next);
            if (words.has(squash(run.map((x) => x.content).join("")))) {
                run.forEach((x) => dropped.add(x));
                break;
            }
        }
    }
    // a caption's own body: a shape drawn tight around its words (a program that ignores the file's "no fill" on
    // a caption node still draws the box), part of the caption and left out with it
    const inside = (b: PBox, t: PText): boolean => {
        const [x, y] = boxMiddle(t.box);
        return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
    };
    const bodyOf = (s: PStray): boolean =>
        s.kind !== "text" &&
        [...dropped].some(
            (t) => inside(s.box, t) && s.box.y1 - s.box.y0 <= 2 * Math.max(t.box.y1 - t.box.y0, t.sizePx),
        );
    // a caption's words the association gave a specimen beside it as its label (a tall node reaching down to its
    // caption) are the caption's, not the specimen's. A caption this side names (a `cap-*` node, a text it owns) is
    // left out at its own place, by id, so its words on a specimen are the specimen's own: a DOT sheet's `default`
    // node, labeled `default` by Graphviz's \N, under its caption `default`.
    // ponytail: on a side that names no caption (an SVG of free texts) a specimen labeled as a caption is still
    // dropped; place it by the fitted frame if a sheet needs that judged
    const captionLabel = (n: PNode): boolean =>
        n.label !== null && words.has(squash(n.label.content)) && !own.has(squash(n.label.content));
    // a node graphty draws no body for is the texts it draws instead (its label, its glyph), as the program's
    // text-only and icon-only nodes are free texts on its side
    return facelessAsTexts(
        {
            ...scene,
            nodes: scene.nodes.filter((n) => !ids.has(n.id)).map((n) => (captionLabel(n) ? { ...n, label: null } : n)),
            edges: scene.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
            texts: texts.filter((t) => !dropped.has(t)),
            strays: scene.strays.filter((s) => !bodyOf(s)),
        },
        other,
    );
}

/**
 * The specimen sheet nodes a format ids otherwise (Cytoscape desktop by SUID, GML by number) that keep their role in
 * an attribute (`name`, GML's `comment` or `template`): each caption (`cap-*`) and corner anchor (`anchor-*`) by id,
 * with that name, for `namedCaptions`.
 * @param rows - the nodes' data rows, each with its `id`
 * @returns each such node's id and its name
 */
export function specimenRoleNames(rows: readonly Record<string, unknown>[]): Map<string, string> {
    return new Map(
        rows.flatMap((r) => {
            const name = Object.values(r).find(
                (v): v is string => typeof v === "string" && (v.startsWith("cap-") || v.startsWith("anchor-")),
            );
            return name === undefined ? [] : [[String(r.id), name] as const];
        }),
    );
}

/**
 * Every node of a GML specimen sheet by its setting id: GML ids its nodes by number, and the same number is another
 * setting on every page, so a report's rows name the setting the sheet keeps in each node's `comment` (or OGDF's
 * `template`). A name two nodes share is left out, so no two nodes take one id; captions and corner anchors are
 * `specimenRoleNames`' (named before the association, which must know them as such).
 * @param rows - the nodes' data rows, each with its `id`
 * @returns each named node's id and its setting id
 */
export function specimenSettingNames(rows: readonly Record<string, unknown>[]): Map<string, string> {
    const named = rows.flatMap((r) => {
        const name = [r.comment, r.template].find(
            (v): v is string =>
                typeof v === "string" &&
                /^[a-z0-9][a-z0-9-]*$/.test(v) &&
                !v.startsWith("cap-") &&
                !v.startsWith("anchor-"),
        );
        return name === undefined || name === String(r.id) ? [] : [[String(r.id), name] as const];
    });
    const count = new Map<string, number>();
    for (const [, name] of named) {
        count.set(name, (count.get(name) ?? 0) + 1);
    }
    return new Map(named.filter(([, name]) => count.get(name) === 1));
}

/**
 * A scene whose caption nodes are named as captions: a specimen sheet whose format ids its nodes otherwise (Cytoscape
 * desktop by SUID, GML and Pajek by number) keeps `cap-*` in another attribute, so its caption nodes, their edges and
 * the texts they own take that name, and `withoutCaptions` leaves them out on whichever side drew them as nodes.
 * @param scene - either side
 * @param captionOf - each caption node's id and its `cap-*` name
 * @returns the scene with the captions renamed
 */
export function namedCaptions(scene: PScene, captionOf: ReadonlyMap<string, string>): PScene {
    if (captionOf.size === 0) {
        return scene;
    }
    const name = (id: string): string => captionOf.get(id) ?? id;
    // an edge named by its ends (`1->2#0`, a Pajek line by its vertex numbers) is named by theirs too, so a failure
    // names the settings it runs between
    const edgeId = (id: string): string => {
        const m = /^(.+?)->(.+?)(#g?\d+)?$/.exec(id);
        return m !== null && (captionOf.has(m[1]) || captionOf.has(m[2]))
            ? `${name(m[1])}->${name(m[2])}${m[3] ?? ""}`
            : id;
    };
    return {
        ...scene,
        nodes: scene.nodes.map((n) => (captionOf.has(n.id) ? { ...n, id: name(n.id) } : n)),
        edges: scene.edges.map((e) => ({ ...e, id: edgeId(e.id), source: name(e.source), target: name(e.target) })),
        texts: scene.texts.map((t) => (t.owner === undefined ? t : { ...t, owner: name(t.owner) })),
    };
}

/**
 * Pairs the oracle's nodes with graphty's: by id, then by unique label text for the rest. A specimen sheet's caption
 * nodes are left out on both sides first.
 * @param oracleScene - the oracle scene
 * @param graphtyScene - graphty's scene
 * @returns the pairs in oracle id order, and the nodes of each side left unpaired
 */
export function pairNodes(
    oracleScene: PScene,
    graphtyScene: PScene,
): { pairs: [PNode, PNode][]; oracleLeft: PNode[]; graphtyLeft: PNode[] } {
    const oracle = withoutCaptions(oracleScene, graphtyScene);
    const graphty = withoutCaptions(graphtyScene, oracleScene);
    const gById = new Map(graphty.nodes.map((n) => [n.id, n]));
    const pairs: [PNode, PNode][] = [];
    const unmatchedOracle: PNode[] = [];
    for (const o of oracle.nodes) {
        const g = gById.get(o.id);
        if (g === undefined) {
            unmatchedOracle.push(o);
        } else {
            pairs.push([o, g]);
            gById.delete(o.id);
        }
    }
    const labelKey = (n: PNode): string | null => (n.label ? norm(n.label.content) : null);
    const freeG = new Map<string, PNode[]>();
    for (const g of gById.values()) {
        const k = labelKey(g);
        if (k !== null && k !== "") {
            freeG.set(k, [...(freeG.get(k) ?? []), g]);
        }
    }
    const oracleLeft: PNode[] = [];
    for (const o of unmatchedOracle) {
        const k = labelKey(o);
        const gs = k === null ? undefined : freeG.get(k);
        if (gs?.length === 1 && unmatchedOracle.filter((x) => labelKey(x) === k).length === 1) {
            pairs.push([o, gs[0]]);
            gById.delete(gs[0].id);
            freeG.delete(k ?? "");
        } else {
            oracleLeft.push(o);
        }
    }
    pairs.sort(([a], [b]) => cmp(a.id, b.id));
    return { pairs, oracleLeft, graphtyLeft: [...gById.values()].sort((a, b) => cmp(a.id, b.id)) };
}

/**
 * The median distance from a point to its nearest neighbor: a drawing's own spacing, which a size is measured against
 * where the two layouts are unrelated.
 * @param pts - the points
 * @returns the median, or null under three points or when every point sits on another
 */
export function medianSpacing(pts: readonly Pt[]): number | null {
    if (pts.length < 3) {
        return null;
    }
    const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const nearest = sorted.map(([x, y], i) => {
        let best = Infinity;
        for (const step of [-1, 1]) {
            for (let k = i + step; k >= 0 && k < sorted.length && Math.abs(sorted[k][0] - x) < best; k += step) {
                const d = Math.hypot(sorted[k][0] - x, sorted[k][1] - y);
                if (d > 0 && d < best) {
                    best = d;
                }
            }
        }
        return best;
    });
    const finite = nearest.filter(Number.isFinite).sort((a, b) => a - b);
    return finite.length === 0 ? null : finite[Math.floor(finite.length / 2)];
}

/** The box round nodes, out to their outlines' outer edges. */
function extentOf(nodes: readonly PNode[], side: "oracle" | "graphty"): PBox {
    const box: PBox = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const n of nodes) {
        const [w, h] = outerOf(n, side);
        box.x0 = Math.min(box.x0, n.cx - w / 2);
        box.y0 = Math.min(box.y0, n.cy - h / 2);
        box.x1 = Math.max(box.x1, n.cx + w / 2);
        box.y1 = Math.max(box.y1, n.cy + h / 2);
    }
    return box;
}

/**
 * A box grown to hold the group boxes a side draws that the other side draws too (by id): a cluster drawn round
 * its members, and the room it keeps for its label and the edges inside it, is part of the drawing either
 * program frames.
 * @param box - the box round the nodes
 * @param groups - the side's groups
 * @param ids - the ids of the other side's groups
 * @returns the grown box
 */
function withGroups(box: PBox, groups: readonly PGroup[], ids: ReadonlySet<string>): PBox {
    const out = { ...box };
    for (const { id, box: g } of groups) {
        if (ids.has(id)) {
            out.x0 = Math.min(out.x0, g.x0);
            out.y0 = Math.min(out.y0, g.y0);
            out.x1 = Math.max(out.x1, g.x1);
            out.y1 = Math.max(out.y1, g.y1);
        }
    }
    return out;
}

/** The share of a canvas a box fills along its tighter axis: 1 when it fits the canvas exactly one way. */
const fillOf = (b: PBox, width: number, height: number): number =>
    Math.max(boxW(b) / Math.max(width, 1e-9), boxH(b) / Math.max(height, 1e-9));

/**
 * Compares graphty's drawing with the oracle's.
 * @param sample - the sample id
 * @param oracle - the oracle scene (`associate().scene`)
 * @param graphty - graphty's scene (`drawnPrimitives`)
 * @param association - how the oracle was associated, carried into the report
 * @param options - how the frames may differ
 * @param options.mirror - the program's drawing is known to be the file mirrored (a converter
 *     that copies y-down coordinates into a y-up space), so the fit may reflect; otherwise both
 *     sides are y-down screen drawings and a mirror is a difference to report, never to fit away
 * @param options.standIn - the oracle is another program's drawing standing in for the file's own
 * @param options.ownLayouts - the file stores no positions and each side laid it out by its own algorithm (Gephi's
 *     random placement, Cytoscape desktop's load layout, vis-network's physics against graphty's force layout): where
 *     those layouts are unrelated, where a node sits and how large the nodes are beside the spacing are each
 *     program's layout and not the file's, and are not judged
 * @param options.judges - which judgments to keep (default: all): a sheet judged per setting keeps, against each
 *     reference, only the properties of the settings that reference draws (`judges.ts`)
 * @returns the report, rounded
 */
export function compareOracle(
    sample: string,
    oracleScene: PScene,
    graphtyScene: PScene,
    association: unknown = null,
    options: { mirror?: boolean; standIn?: boolean; ownLayouts?: boolean; judges?: OracleJudges } = {},
): OracleReport {
    const oracle = withoutCaptions(oracleScene, graphtyScene);
    const graphty = withoutCaptions(graphtyScene, oracleScene);
    const T = ORACLE_TOLERANCES;
    const diag = Math.hypot(oracle.width, oracle.height);
    const j = new Judge(options.judges);

    // ---- nodes: by id, then by unique label text for the rest
    const { pairs, oracleLeft: stillOracle, graphtyLeft } = pairNodes(oracle, graphty);
    const idMap = new Map(pairs.map(([o, g]) => [g.id, o.id]));

    // ---- the frame
    // A specimen sheet's corner anchors fix the frame: the fit is taken on them alone, so a misplaced specimen
    // cannot pull the frame towards itself, and the layouts are related by construction.
    const anchors = pairs.filter(([o]) => isAnchor(o.id));
    const framePairs = anchors.length >= 2 ? anchors : pairs;
    const frameG = framePairs.map(([, g]): Pt => [g.cx, g.cy]);
    const frameO = framePairs.map(([o]): Pt => [o.cx, o.cy]);
    const fit = framePairs.length >= 2 ? fitSimilarity(frameG, frameO, { reflect: options.mirror === true }) : null;
    // the best fit either way, mirrored or not: a mirror it finds that the program is not known to draw is reported,
    // never fitted away
    const free = framePairs.length >= 3 && options.mirror !== true ? fitSimilarity(frameG, frameO) : null;
    let transform: OracleReport["transform"] = null;
    let lengthScale = 1;
    // each side's spacing and extent, over the nodes both draw
    const spacingO = medianSpacing(pairs.map(([o]): Pt => [o.cx, o.cy]));
    const spacingG = medianSpacing(pairs.map(([, g]): Pt => [g.cx, g.cy]));
    const spacing = spacingO !== null && spacingG !== null ? { oracle: spacingO, graphty: spacingG } : null;
    const extentO = extentOf(
        pairs.map(([o]) => o),
        "oracle",
    );
    const extentG = extentOf(
        pairs.map(([, g]) => g),
        "graphty",
    );
    const groupIds = (scene: PScene): Set<string> => new Set(scene.groups.map((g) => g.id));
    const filled = {
        oracle: fillOf(withGroups(extentO, oracle.groups, groupIds(graphty)), oracle.width, oracle.height),
        graphty: fillOf(withGroups(extentG, graphty.groups, groupIds(oracle)), graphty.width, graphty.height),
    };
    if (fit !== null) {
        const sse = pairs.reduce((sum, [o, g]) => {
            const [x, y] = apply(fit, [g.cx, g.cy]);
            return sum + (x - o.cx) ** 2 + (y - o.cy) ** 2;
        }, 0);
        const rms = Math.sqrt(sse / pairs.length) / diag;
        const unrelated = framePairs === pairs && rms > T.unrelatedLayout;
        lengthScale = fit.scale;
        if (unrelated) {
            const ratios = pairs
                .map(([o, g]) => Math.max(...outerOf(o, "oracle")) / Math.max(...outerOf(g, "graphty"), 1e-9))
                .filter((r) => Number.isFinite(r) && r > 0)
                .sort((a, b) => a - b);
            lengthScale = ratios.length > 0 ? ratios[Math.floor(ratios.length / 2)] : fit.scale;
        }
        transform = {
            scale: fit.scale,
            rotationDeg: (fit.rotation * 180) / Math.PI,
            reflect: fit.reflect,
            tx: fit.tx,
            ty: fit.ty,
            rms,
            matched: pairs.length,
            unrelatedLayout: unrelated,
            lengthScale,
            spacing,
            fill: filled,
        };
        // What the fit must not absorb: a mirror, a turn, a zoom. Between unrelated layouts a fitted turn or mirror is
        // noise, and only the zoom (how much of its canvas each drawing fills) is told.
        // a mirror that relates layouts the unmirrored fit cannot is reported too
        const mirrored =
            free !== null &&
            free.reflect &&
            free.sse < T.mirrorResidual * fit.sse &&
            Math.sqrt(free.sse / framePairs.length) / diag <= T.unrelatedLayout;
        if (!unrelated || mirrored) {
            j.add("frame.mirror", "graph", "frame", mirrored ? 1 : 0, false, mirrored);
        }
        if (!unrelated) {
            const turn = (((transform.rotationDeg % 360) + 540) % 360) - 180;
            j.add("frame.rotation", "graph", "frame", Math.max(0, Math.abs(turn) - T.rotationDeg), 0, R(turn));
        }
        j.add(
            "frame.zoom",
            "graph",
            "frame",
            ratioMiss(filled.graphty / Math.max(filled.oracle, 1e-9), T.sizeRatio),
            R(filled.oracle),
            R(filled.graphty),
        );
    }
    const toOracle = (p: Pt): Pt => (fit === null ? p : apply(fit, p));
    /** A graphty screen angle in the oracle's frame: a reflection turns it round before the rotation. */
    // Between unrelated layouts the fitted turn is noise: local measures (a label's turn and its
    // place beside its node) are then taken unturned, at the size-fitted scale.
    const local = fit !== null && !(transform?.unrelatedLayout ?? false) ? fit : null;
    const angleToOracle = (deg: number): number =>
        local === null ? deg : (local.reflect ? -deg : deg) + (local.rotation * 180) / Math.PI;
    /** A graphty vector (an offset) into the oracle frame, without the translation. */
    const vecToOracle = (v: Pt): Pt => {
        if (local === null) {
            return [v[0] * lengthScale, v[1] * lengthScale];
        }
        const a = apply(local, [0, 0]);
        const b = apply(local, v);
        return [b[0] - a[0], b[1] - a[1]];
    };
    // One graphty render pixel or so in oracle pixels: the least any distance tolerance allows. Between unrelated
    // layouts the size-fitted scale says how much larger the program draws its nodes, not how large a render pixel is:
    // a drawing at a ninth of the program's size made a render pixel 14 oracle pixels (cx-radiation-bibliography), and
    // an arrowhead twice the program's size passed. There both drawings fill a canvas, and a render pixel is no larger
    // than the canvases' ratio.
    const canvasRatio = Math.max(
        oracle.width / Math.max(graphty.width, 1e-9),
        oracle.height / Math.max(graphty.height, 1e-9),
    );
    const pixel = T.pixel * (transform?.unrelatedLayout === true ? Math.min(lengthScale, canvasRatio) : lengthScale);
    // the layout's own extent, over the node centers: a node's size against it says how large the node is beside
    // the whole drawing, which node sizes themselves must not inflate
    const centersO = boxOfPoints(pairs.map(([o]): Pt => [o.cx, o.cy]));
    const centersG = boxOfPoints(pairs.map(([, g]): Pt => [g.cx, g.cy]));
    const extentDiagO = Math.hypot(boxW(centersO), boxH(centersO));
    const extentDiagG = Math.hypot(boxW(centersG), boxH(centersG));
    // Two layouts of a file that stores no positions, each its program's own and unrelated: neither where a node sits
    // nor its size beside the spacing is the file's
    const layoutJudged = !(options.ownLayouts === true && (transform?.unrelatedLayout ?? false));
    /** A size judged against each side's own spacing and extent, which the fitted scale cannot hide. */
    const layoutRelative = (p: "node.sizeToSpacing" | "node.sizeToExtent" | "edge.arrowToSpacing"): number | null => {
        // each program's own layout settles at its own spacing, so the extent and an arrowhead beside the spacing are
        // its layout's; a node's size beside the spacing is still judged, in the same band (`layoutSizeRatio`): the
        // size-fitted scale absorbs any size the whole drawing is drawn at
        if (!layoutJudged && p !== "node.sizeToSpacing") {
            return null;
        }
        if (p === "node.sizeToExtent") {
            return pairs.length >= 3 && extentDiagO > 0 && extentDiagG > 0 ? extentDiagO / extentDiagG : null;
        }
        return spacing === null ? null : spacing.oracle / spacing.graphty;
    };
    const spacingScale = layoutRelative("node.sizeToSpacing");
    const extentScale = layoutRelative("node.sizeToExtent");

    for (const o of [...oracle.nodes].sort((a, b) => cmp(a.id, b.id))) {
        const g = pairs.find(([x]) => x === o)?.[1];
        j.add("node.present", "node", o.id, g === undefined ? 1 : 0, o.id, g?.id ?? null);
    }
    // what graphty draws that the oracle does not: an extra, hidden or duplicate node is an import defect
    for (const [o, g] of pairs) {
        j.add("node.extra", "node", `graphty:${g.id}`, 0, o.id, g.id);
    }
    for (const g of graphtyLeft) {
        j.add("node.extra", "node", `graphty:${g.id}`, 1, null, g.id);
    }
    for (const [o, g] of pairs) {
        const { id } = o;
        const c = toOracle([g.cx, g.cy]);
        const [ow, oh] = outerOf(o, "oracle");
        const off = Math.hypot(c[0] - o.cx, c[1] - o.cy);
        const near = Math.max(T.positionOfSize * Math.min(ow, oh), pixel);
        if (layoutJudged) {
            j.add("node.position", "node", id, Math.max(0, off / near - 1), [o.cx, o.cy], c);
        }
        const [gw0, gh0] = outerOf(g, "graphty");
        const [gw, gh] = [gw0 * lengthScale, gh0 * lengthScale];
        j.add("node.width", "node", id, sizeMiss(ow, gw, T.sizeRatio), ow, gw);
        j.add("node.height", "node", id, sizeMiss(oh, gh, T.sizeRatio), oh, gh);
        const oSize = Math.max(ow, oh);
        if (oSize > 0) {
            for (const [p, scale] of [
                ["node.sizeToSpacing", spacingScale],
                ["node.sizeToExtent", extentScale],
            ] as const) {
                if (scale !== null) {
                    const gSize = Math.max(gw0, gh0) * scale;
                    j.add(p, "node", id, ratioMiss(gSize / oSize, T.layoutSizeRatio), R(oSize), R(gSize));
                }
            }
        }
        if (o.shape !== null) {
            j.add("node.shape", "node", id, o.shape === g.shape ? 0 : 1, o.shape, g.shape);
        }
        const oFill = shownFill(o);
        // graphty's fill as a reader of the oracle's drawing would see it: none under half an oracle pixel across
        const gFill = Math.min(g.w, g.h) * lengthScale < 0.5 ? null : g.fill;
        judgeFill(j, "node.fill", "node", id, oFill, gFill);
        if (oFill !== null && gFill !== null) {
            j.add(
                "node.fillOpacity",
                "node",
                id,
                opacityMiss(oFill.opacity, gFill.opacity),
                oFill.opacity,
                gFill.opacity,
            );
            const gAngle = gFill.gradient?.angle ?? null;
            const grad = gradientMiss(oFill.gradient, gFill.gradient, {
                o: oFill.gradient?.angle ?? null,
                g: gAngle === null ? null : angleToOracle(gAngle),
            });
            j.add("node.gradient", "node", id, grad.miss, grad.oracle, grad.graphty);
        }
        // A stroke under the hairline is none, unless the other side draws one of a width within the
        // tolerance of it: two thin outlines either side of the line are the same outline.
        const oStroke = shownStroke(o);
        // A width in screen pixels (vis-network's borders) is the same on screen whatever the frame's length scale.
        const strokeScale = g.stroke?.screen === true ? 1 : lengthScale;
        const close =
            oStroke !== null &&
            g.stroke !== null &&
            oStroke.width > 0 &&
            ratioMiss((g.stroke.width * strokeScale) / oStroke.width, T.strokeWidthRatio) === 0;
        // a patterned line read off a filled outline is an outline whatever its width
        const os =
            oStroke !== null && (close || oStroke.width >= T.hairline || oStroke.patterned === true) ? oStroke : null;
        const gs = g.stroke !== null && (close || g.stroke.width * strokeScale >= T.hairline) ? g.stroke : null;
        if (os === null || gs === null) {
            j.add("node.stroke", "node", id, os === gs ? 0 : 1, os?.color ?? null, gs?.color ?? null);
        } else {
            // a see-through outline is another line to a reader than an opaque one of its color
            const dE = deltaE(os.color, gs.color);
            j.add(
                "node.stroke",
                "node",
                id,
                Math.max(0, dE - T.colorDeltaE) + opacityMiss(os.opacity, gs.opacity),
                [os.color, os.opacity],
                [gs.color, R(gs.opacity)],
            );
            if (Number.isFinite(os.width)) {
                // a line waving in a ring is as wide as the line, not the ring
                const gWidth = (gs.line ?? gs.width) * strokeScale;
                j.add(
                    "node.strokeWidth",
                    "node",
                    id,
                    ratioMiss(gWidth / os.width, T.strokeWidthRatio),
                    os.width,
                    gWidth,
                );
            }
            j.add(
                "node.strokeDash",
                "node",
                id,
                sameLine(os.dashClass, gs.dashClass) ? 0 : 1,
                os.dashClass,
                gs.dashClass,
            );
        }
        judgeRing(j, id, o.ring ?? null, g.ring ?? null, lengthScale);
        const outerBox = (n: PNode, w: number, h: number): PBox => ({
            x0: n.cx - w / 2,
            y0: n.cy - h / 2,
            x1: n.cx + w / 2,
            y1: n.cy + h / 2,
        });
        judgeLabel(
            j,
            "node",
            id,
            o.label,
            labelAtScale(g, lengthScale, o.label),
            lengthScale,
            angleToOracle,
            fit === null
                ? null
                : { kind: "box", o: outerBox(o, ow, oh), g: outerBox(g, gw0, gh0), vec: vecToOracle, pixel },
            oracle.labelGeometry !== false,
        );
    }

    // ---- edges: by endpoint pair (unordered), in id order within a pair
    const pairKey = (a: string, b: string): string => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
    // an end at no node of graphty's (a group's box) keeps its id, which the oracle's association takes from graphty
    const graphtyNodeIds = new Set(graphty.nodes.map((n) => n.id));
    // so does a node of graphty's the oracle draws nothing for, whose lines' ends the association names after it
    // (pajek-1crn 27, drawn wholly under 28)
    const oracleNodeIds = new Set(oracle.nodes.map((n) => n.id));
    const undrawnEnds = new Set(
        oracle.edges.flatMap((e) => [e.source, e.target]).filter((id) => !oracleNodeIds.has(id)),
    );
    const oid = (id: string): string =>
        idMap.get(id) ?? (graphtyNodeIds.has(id) && !undrawnEnds.has(id) ? `g:${id}` : id);
    // graphty's edges not yet paired, in its order
    const gRemaining = new Set(graphty.edges);
    // an edge's ends as each side names them: the nodes its file names, or the nodes a reader sees it end at (`ownEnds`)
    type EndsKey = (e: PEdge, side: "oracle" | "graphty") => string;
    const keyOf = (source: string, target: string, side: "oracle" | "graphty"): string =>
        side === "graphty" ? pairKey(oid(source), oid(target)) : pairKey(source, target);
    // the ends a file names, where they differ from the ends seen; an edge seen where its file says is in no such pass
    const ownKey: EndsKey = (e, side) =>
        e.ownEnds === undefined ? "" : keyOf(e.ownEnds.source, e.ownEnds.target, side);
    const shownKey: EndsKey = (e, side) => keyOf(e.source, e.target, side);
    const edgePairs: [PEdge, PEdge][] = [];
    const oById = new Map(oracle.nodes.map((n) => [n.id, n]));
    const unmatchedOracleEdges: string[] = [];
    // graphty's path in the oracle's frame, source end first the oracle's way
    // the edges paired by where they are drawn (below), each with whether graphty runs it the other way
    const drawnFlip = new Map<PEdge, boolean>();
    // run the oracle's way where either its file's ends or its seen ends start alike
    const flips = (o: PEdge, g: PEdge): boolean =>
        drawnFlip.get(g) ??
        (oid(g.source) !== o.source && oid(g.ownEnds?.source ?? g.source) !== (o.ownEnds?.source ?? o.source));
    // Between unrelated layouts the fit relates no place to the oracle's, and its scale is the layouts' spread, not
    // the drawing's: graphty's routes and the nodes that cut them are taken at the size-fitted scale instead, so a
    // route is cut by nodes of its own drawing's size (json-vis-lesmiserables: routes carried at the fit's 0.207 and
    // nodes at 0.838 left 11 px of a 116 px line, and its bend was judged on that sliver)
    const edgeFrame = (p: Pt): Pt =>
        transform?.unrelatedLayout === true ? [p[0] * lengthScale, p[1] * lengthScale] : toOracle(p);
    const routeOf = (o: PEdge, g: PEdge): Pt[] => {
        const gp = g.points.map((p) => edgeFrame(p));
        return flips(o, g) ? [...gp].reverse() : gp;
    };
    // Parallel edges are paired in id order, except that an edge whose route would fail goes to one whose route
    // passes (the fanned one to the fanned one) where the layouts agree; routes drawn alike (two straight edges
    // over one another) say nothing about which is which, and then the edge with the same label words is its pair.
    // Each route is judged between its own nodes' outlines, cut there by one rule on both sides: one program starts
    // its line at the node's center under the node and another at its border, and a reader sees the same line. Each
    // side's own nodes cut its own route, so a route is cut where its own drawing's node ends.
    const gById = new Map(graphty.nodes.map((n) => [n.id, n]));
    const oOuter = (n: PNode | undefined): PNode | undefined => {
        if (n === undefined) {
            return undefined;
        }
        const [w, h] = outerOf(n, "oracle");
        return { ...n, w, h };
    };
    const gOuter = (id: string): PNode | undefined => {
        const n = gById.get(id);
        if (n === undefined) {
            return undefined;
        }
        const [w, h] = outerOf(n, "graphty");
        const [cx, cy] = edgeFrame([n.cx, n.cy]);
        return { ...n, cx, cy, w: w * lengthScale, h: h * lengthScale };
    };
    // a node with no body (graphty's faceless node, the oracle's node found only by its label or by its lines' ends)
    // has no outline to cut a line at
    const bodied = (n: PNode | undefined): n is PNode =>
        n !== undefined &&
        n.faceless === undefined &&
        (n.fill !== null || n.stroke !== null || (n.pictures?.length ?? 0) > 0);
    /** An end's outline on each side, or none on either where one side draws none there. */
    const cutAt = (on: PNode | undefined, at: PNode | undefined): [PNode | undefined, PNode | undefined] =>
        bodied(on) && bodied(at) ? [on, at] : [undefined, undefined];
    /** Both routes between their own nodes, graphty's in the oracle's frame and direction. */
    const visible = (o: PEdge, g: PEdge): [Pt[], Pt[]] => {
        const [vo, vg] = shownParts(o, g);
        return [vo ?? [...o.points], vg ?? routeOf(o, g)];
    };
    /** Each route's part between its own nodes, or null where none of it shows (`shownPart`). */
    const shownParts = (o: PEdge, g: PEdge): [Pt[] | null, Pt[] | null] => {
        const [gs, gt] = flips(o, g) ? [g.target, g.source] : [g.source, g.target];
        const [os, gsAt] = cutAt(oOuter(oById.get(o.source)), gOuter(gs));
        const [ot, gtAt] = cutAt(oOuter(oById.get(o.target)), gOuter(gt));
        return [shownPart(o.points, os, ot), shownPart(routeOf(o, g), gsAt, gtAt)];
    };
    /** How far graphty's route's shape is from the oracle's (`routeShape`), and the least gap that fails. */
    const routeGap = (o: PEdge, g: PEdge): { gap: number; near: number } => {
        // none, or under a pixel, left between the outlines on both sides is no route a reader sees on either, only two
        // roundings of nodes that nearly touch: alike (json-graphology-synth n0 -> n1, n1's center on n0's outline)
        if (shownParts(o, g).every((pts) => pts === null || pathLength(pts) < pixel)) {
            return { gap: 0, near: T.edgePathOfLength };
        }
        const [gs, gt] = flips(o, g) ? [g.target, g.source] : [g.source, g.target];
        const shiftOf = (gId: string, oId: string): Pt => {
            const [at, on] = [gOuter(gId), oById.get(oId)];
            return at === undefined || on === undefined ? [0, 0] : [at.cx - on.cx, at.cy - on.cy];
        };
        const [vo, vg] = visible(o, g);
        const { gap, unit } = routeShape(vo, vg, [shiftOf(gs, o.source), shiftOf(gt, o.target)]);
        // a share of a long chord is more than a node: a line sent through another node on the way passed
        // (dot-synth-nodes n_html3 -> n_unfilled, 1044 px long, through the middle of a 33 x 22 node). The allowance
        // is no more than the smaller side of the smaller of its two end nodes
        const ends = [oById.get(o.source), oById.get(o.target)].flatMap((n) =>
            n === undefined ? [] : [Math.min(n.w, n.h)],
        );
        // and no less than ten render pixels: an anchor drawn as a point (xgmml-wp4271-cy3-export) or a node a few
        // pixels across in a large drawing leaves no allowance a reader would grant
        const cap = ends.length === 2 ? Math.max(Math.min(...ends), ROUTE_CAP_PIXELS * pixel) / unit : Infinity;
        return { gap, near: Math.max(Math.min(T.edgePathOfLength, cap), pixel / unit) };
    };
    const curved = (pts: readonly Pt[]): boolean => curvatureOf(pts) > T.curvature;
    const sameWords = (o: PEdge, list: readonly PEdge[]): number => {
        const words = (e: PEdge): string => norm(e.label?.content ?? "");
        const k = list.findIndex((g) => words(g) === words(o));
        return Math.max(k, 0);
    };
    /**
     * Whether graphty's node `gId` is drawn on the oracle's node `oId`: centered on it within the node position
     * tolerance, as two nodes stacked one on the other are. One merely overlapping it is another node a reader tells
     * apart (json-cyjs-perf's n523 beside n421), whose line ends elsewhere.
     */
    const drawnOn = (gId: string, oId: string): boolean => {
        const on = oOuter(oById.get(oId));
        const at = gOuter(gId);
        if (on === undefined || at === undefined) {
            return false;
        }
        return Math.hypot(at.cx - on.cx, at.cy - on.cy) <= Math.max(T.positionOfSize * Math.min(on.w, on.h), pixel);
    };
    /** Of the leftover edges graphty draws, the one drawn between the oracle edge's nodes, nearest its route. */
    const drawnAlike = (o: PEdge, list: readonly PEdge[]): PEdge | undefined => {
        let best: { g: PEdge; gap: number } | undefined;
        for (const g of list) {
            const ahead = drawnOn(g.source, o.source) && drawnOn(g.target, o.target);
            if (!ahead && !(drawnOn(g.target, o.source) && drawnOn(g.source, o.target))) {
                continue;
            }
            drawnFlip.set(g, !ahead);
            const { gap, near } = routeGap(o, g);
            drawnFlip.delete(g);
            if (best === undefined || gap / near < best.gap) {
                best = { g, gap: gap / near };
            }
        }
        if (best !== undefined) {
            drawnFlip.set(best.g, !(drawnOn(best.g.source, o.source) && drawnOn(best.g.target, o.target)));
        }
        return best?.g;
    };
    /** The ends an edge draws an arrowhead at, named the oracle edge's way round. */
    const arrowEnds = (e: PEdge, flipped: boolean): string => {
        const turn = (end: string): string => {
            if (!flipped || end === "middle") {
                return end;
            }
            return end === "source" ? "target" : "source";
        };
        return [...new Set(e.arrows.map((x) => turn(x.end)))].sort().join(",");
    };
    /**
     * How unlike an oracle edge found by its geometry a graphty edge between the same nodes is drawn, 0 for alike: in
     * another color or with other words, then another line class, then its route failing, then curved otherwise, then
     * arrowheads at other ends, then running the other way. Between two parallel or antiparallel edges only the look
     * tells them apart: drawn over one another, or each program bowing them its own way (cx2-signor-aml 27->68, a blue
     * dashed line bowed and a purple solid one, each paired with the other's look by its route).
     */
    const likeness = (o: PEdge, g: PEdge, routePasses: boolean): number => {
        const dressed =
            (o.stroke === null || g.stroke === null || deltaE(o.stroke.color, g.stroke.color) <= T.colorDeltaE) &&
            norm(o.label?.content ?? "") === norm(g.label?.content ?? "");
        const lined = o.stroke === null || g.stroke === null || o.stroke.dashClass === g.stroke.dashClass;
        return (
            (dressed ? 0 : 32) +
            (lined ? 0 : 16) +
            (routePasses ? 0 : 8) +
            (curved(routeOf(o, g)) === curved(o.points) ? 0 : 4) +
            (arrowEnds(o, false) === arrowEnds(g, flips(o, g)) ? 0 : 2) +
            (idMap.get(g.source) === o.source ? 0 : 1)
        );
    };
    const closest = (o: PEdge, list: PEdge[]): number => {
        if (list.length < 2) {
            return 0;
        }
        // without a frame the routes say nothing, and every route counts as passing
        const framed = fit !== null && !(transform?.unrelatedLayout ?? false);
        const routes = list.map((g) => (framed ? routeGap(o, g) : { gap: 0, near: 1 }));
        const gaps = routes.map((r) => r.gap / r.near);
        const passes = (k: number): boolean => gaps[k] <= 1;
        const best = gaps.indexOf(Math.min(...gaps));
        // An edge found by its geometry alone (a `#g` id) has no id to keep: it is the edge drawn most like it
        // (`likeness`), the nearest of those
        if (o.id.includes("#g")) {
            const rank = (k: number): number => likeness(o, list[k], passes(k));
            return gaps
                .map((_, k) => k)
                .reduce((x, y) => (rank(y) < rank(x) || (rank(y) === rank(x) && gaps[y] < gaps[x]) ? y : x));
        }
        // the order holds unless its edge's route fails where another's passes
        if (framed && !passes(0) && passes(best)) {
            return best;
        }
        // among the edges whose routes pass as well as the first's, the one with the same words; of a mutual pair, one
        // with its arrowheads at the same ends: two arcs bowed apart are each other's route run backwards, within the
        // tolerance on a long chord (pajek-synth-lines 6 -> 26 and 26 -> 6, each judged with the other's arrowhead).
        // Not by the ends the markup names: Gephi names an edge by its two nodes in no order (gexf-graphology-rio)
        const alike = list.map((_, k) => k).filter((k) => passes(k) === passes(0));
        const candidates = alike.map((k) => list[k]);
        const worded = alike[sameWords(o, candidates)];
        const words = norm(list[worded].label?.content ?? "");
        const headed = alike.filter(
            (k) =>
                norm(list[k].label?.content ?? "") === words &&
                arrowEnds(o, false) === arrowEnds(list[k], flips(o, list[k])),
        );
        return headed.includes(worded) || headed.length === 0 ? worded : headed[0];
    };
    /**
     * Pairs the oracle edges found by geometry between one pair of nodes with graphty's between them all at once: the
     * pairing that leaves the fewest unpaired, then draws the pairs most alike (`likeness`), then nearest. One at a
     * time, the first edge took the one most like it, and the next was left the other's look (cx2-signor-aml: two
     * edges between 26 and 27, each judged with the other's dash and arrowhead), or the first took graphty's only edge
     * there whatever it looked like (cys-annotation-example: a black annotation arrow over the gray edge 169421 ->
     * 169409 took it). Over six a side, one at a time.
     * @param group - the oracle's edges
     * @param list - graphty's, from which the paired are removed
     * @returns each oracle edge with its pair, or undefined for none
     */
    const jointly = (group: readonly PEdge[], list: PEdge[]): [PEdge, PEdge | undefined][] => {
        const framed = fit !== null && !(transform?.unrelatedLayout ?? false);
        const cost = group.map((o) =>
            list.map((g) => {
                const r = framed ? routeGap(o, g) : { gap: 0, near: 1 };
                return 1000 * likeness(o, g, r.gap <= r.near) + Math.min(r.gap / r.near, 999);
            }),
        );
        let best: { total: number; pick: number[] } = { total: Infinity, pick: [] };
        const search = (i: number, pick: number[], total: number): void => {
            if (total >= best.total) {
                return;
            }
            if (i === group.length) {
                best = { total, pick: [...pick] };
                return;
            }
            for (let k = 0; k < list.length; k++) {
                if (!pick.includes(k)) {
                    search(i + 1, [...pick, k], total + cost[i][k]);
                }
            }
            // left unpaired only when graphty has fewer
            if (group.length - i > list.length - pick.filter((k) => k >= 0).length) {
                search(i + 1, [...pick, -1], total + 1e9);
            }
        };
        search(0, [], 0);
        const chosen = best.pick.map((k) => (k < 0 ? undefined : list[k]));
        for (const g of chosen) {
            if (g !== undefined) {
                list.splice(list.indexOf(g), 1);
            }
        }
        return group.map((o, i) => [o, chosen[i]]);
    };
    /** Pairs each oracle edge with a graphty edge between the same nodes, by `key`; returns the oracle's left over. */
    const pairBy = (os: readonly PEdge[], key: EndsKey): PEdge[] => {
        const byKey = new Map<string, PEdge[]>();
        for (const g of gRemaining) {
            const k = key(g, "graphty");
            byKey.set(k, [...(byKey.get(k) ?? []), g]);
        }
        // the oracle's edges found by geometry, by the pair they run between
        const found = new Map<string, PEdge[]>();
        for (const o of os) {
            const k = key(o, "oracle");
            if (k !== "" && o.id.includes("#g")) {
                found.set(k, [...(found.get(k) ?? []), o]);
            }
        }
        const left: PEdge[] = [];
        const settle = (o: PEdge, g: PEdge | undefined): void => {
            if (g === undefined) {
                left.push(o);
            } else {
                gRemaining.delete(g);
                edgePairs.push([o, g]);
            }
        };
        const done = new Set<PEdge>();
        for (const o of os) {
            if (done.has(o)) {
                continue;
            }
            const k = key(o, "oracle");
            const list = k === "" ? undefined : byKey.get(k);
            const group = found.get(k) ?? [];
            if (list !== undefined && list.length > 0 && group.length > 1 && group.length <= 6 && list.length <= 6) {
                for (const [x, g] of jointly(group, list)) {
                    done.add(x);
                    settle(x, g);
                }
                continue;
            }
            settle(o, list === undefined || list.length === 0 ? undefined : list.splice(closest(o, list), 1)[0]);
        }
        return left;
    };
    // by the nodes the files name first, where both sides moved the ends to a node drawn over them (two edges of nodes
    // stacked on one keep apart, gexf-cns-wos n5 and n100 under n109), then all the rest by the nodes a reader sees
    // them end at, where the words decide among parallel ones (json-cyjs-tokyo's lines between stacked stations)
    const oracleLeft = pairBy(
        pairBy(
            [...oracle.edges].sort((a, b) => cmp(a.id, b.id)),
            ownKey,
        ),
        shownKey,
    );
    // An edge whose ends the two sides name differently is still the same edge where graphty draws it between the
    // nodes the oracle's runs between: nodes drawn on one another (json-cyjs-tokyo's stations of two lines at one
    // place, which the oracle's reader names by one of them) leave a reader no way to tell which one a line ends at.
    // In the fitted frame, each end of graphty's edge is at a node centered on the oracle's end node; among those, the
    // route nearest the oracle's.
    const framedEdges = fit !== null && !(transform?.unrelatedLayout ?? false);
    /** Each routed edge's bend, the oracle's and graphty's, where how far each bends is not judged edge by edge. */
    const bends: [number, number][] = [];
    for (const o of oracleLeft) {
        const gLeft = framedEdges ? [...gRemaining].sort((a, b) => cmp(a.id, b.id)) : [];
        const g = gLeft.length === 0 ? undefined : drawnAlike(o, gLeft);
        if (g === undefined) {
            unmatchedOracleEdges.push(o.id);
        } else {
            gRemaining.delete(g);
            edgePairs.push([o, g]);
        }
    }
    const pairedTo = new Map(edgePairs.map(([o, g]) => [o, g]));
    for (const o of [...oracle.edges].sort((a, b) => cmp(a.id, b.id))) {
        const g = pairedTo.get(o);
        j.add("edge.present", "edge", o.id, g === undefined ? 1 : 0, `${o.source} - ${o.target}`, g?.id ?? null);
    }
    const unmatchedGraphtyEdges = [...gRemaining].map((e) => e.id).sort(cmp);
    // what graphty draws that the oracle does not: an extra, hidden or duplicate edge is an import defect
    const extraEdges = new Set(unmatchedGraphtyEdges);
    for (const e of oracle.nodesOnly === true ? [] : [...graphty.edges].sort((a, b) => cmp(a.id, b.id))) {
        j.add(
            "edge.extra",
            "edge",
            `graphty:${e.id}`,
            extraEdges.has(e.id) ? 1 : 0,
            null,
            e.id,
            `${e.source}->${e.target}`,
        );
    }
    for (const [o, g] of edgePairs) {
        const { id } = o;
        const flipped = flips(o, g);
        const framed = fit !== null && !(transform?.unrelatedLayout ?? false);
        const [vo, vg] = visible(o, g);
        // a route of no length is no route: a raster oracle records a self-loop by its one node, not the loop it drew
        const routed = pathLength(o.points) > 0;
        if (framed && routed) {
            const { gap, near } = routeGap(o, g);
            j.add("edge.route", "edge", id, Math.max(0, gap / near - 1), R(near), R(gap));
        }
        // how far each route bends between its own nodes, a ratio no frame changes
        const oc = curvatureOf(vo);
        const gc = curvatureOf(vg);
        // and no difference under a pixel deep over the shorter of the two chords, which no reader sees: a line
        // between two nodes that nearly touch (gexf-sigma-ediaspora's 63 -> 66, 9 px long, bent under a pixel off
        // straight; 141 -> 112, a squiggle under a pixel long). A loop's chord is next to nothing: judged as it is.
        const chord = (pts: readonly Pt[]): number =>
            closedRing(pts)
                ? Infinity
                : Math.hypot((pts.at(-1) ?? pts[0])[0] - pts[0][0], (pts.at(-1) ?? pts[0])[1] - pts[0][1]);
        const seen = Math.min(chord(vo), chord(vg));
        const bend = Math.max(T.curvature, T.curveShare * oc, pixel / Math.max(seen, 1e-9));
        // how far a line bends between two programs' own unrelated layouts of a file with no positions is each
        // layout's (vis-network's dynamic curve bends with its physics), not a setting of the file: not judged there,
        // as node.position is not (json-vis-lesmiserables: graphty's bends of 0.3 against vis-network's 0.01, and
        // json-vis-siblings the other way round, edge by edge)
        if (routed && layoutJudged) {
            j.add("edge.curve", "edge", id, Math.max(0, Math.abs(gc - oc) - bend) / bend, R(oc), R(gc));
        } else if (routed) {
            bends.push([oc, gc]);
        }
        // how often each route turns back the other way, a count no frame or layout changes
        if (routed) {
            const [ro, rg] = [reversalsOf(vo, 2 * pixel), reversalsOf(vg, 2 * pixel)];
            // a long spline round many clusters turns back often, and sampled a little apart counts a few more or fewer
            const allowed = Math.max(T.wiggleReversals, T.wiggleShare * ro);
            j.add("edge.wiggle", "edge", id, Math.max(0, Math.abs(rg - ro) - allowed), ro, rg);
        }
        if (o.stroke !== null && g.stroke !== null) {
            j.add(
                "edge.color",
                "edge",
                id,
                Math.max(0, deltaE(o.stroke.color, g.stroke.color) - T.colorDeltaE),
                o.stroke.color,
                g.stroke.color,
            );
            // a pattern drawn as a fill of its own (slashes, arrows, a double line) has no width to read; a width in
            // screen pixels (a line at its screen floor, sigma's minEdgeThickness) is the same whatever the frame's scale
            if (Number.isFinite(o.stroke.width)) {
                const gWidth = g.stroke.width * (g.stroke.screen === true ? 1 : lengthScale);
                j.add(
                    "edge.width",
                    "edge",
                    id,
                    ratioMiss(gWidth / Math.max(o.stroke.width, 1e-9), T.edgeWidthRatio),
                    o.stroke.width,
                    gWidth,
                );
            }
            j.add(
                "edge.opacity",
                "edge",
                id,
                opacityMiss(o.stroke.opacity, g.stroke.opacity),
                o.stroke.opacity,
                g.stroke.opacity,
            );
            j.add(
                "edge.dash",
                "edge",
                id,
                sameLine(o.stroke.dashClass, lineClassAt(g.stroke, lengthScale)) ? 0 : 1,
                o.stroke.dashClass,
                lineClassAt(g.stroke, lengthScale),
            );
            const dashes = dashMiss(o.stroke.dash, g.stroke.dash, lengthScale);
            if (dashes !== null) {
                j.add("edge.dashPeriod", "edge", id, dashes.miss, dashes.oracle, dashes.graphty);
            }
            // a gradient along an edge runs against its own line: its direction is judged against its chord
            const og = o.stroke.gradient ?? null;
            const gg = g.stroke.gradient ?? null;
            const [oAngle, gAngle] = [og?.angle ?? null, gg?.angle ?? null];
            const grad = gradientMiss(og, gg, {
                o: oAngle === null ? null : turnOf(oAngle - chordAngle(vo)),
                g: gAngle === null ? null : turnOf(angleToOracle(gAngle) - chordAngle(vg)),
            });
            j.add("edge.gradient", "edge", id, grad.miss, grad.oracle, grad.graphty);
        }
        // a band under the line and one over it, each judged wherever either side draws one
        judgeBand(j, "edge.outline", id, [o.outline, g.outline], lengthScale);
        judgeBand(j, "edge.overlay", id, [o.overlay, g.overlay], lengthScale);
        const swap = { source: "target", target: "source", middle: "middle" } as const;
        const flip = (a: PArrow): PArrow => (flipped ? { ...a, end: swap[a.end] } : a);
        const ga = g.arrows.map(flip);
        for (const end of ["source", "target", "middle"] as const) {
            const oa = o.arrows.find((a) => a.end === end);
            const gg = ga.find((a) => a.end === end);
            const at = `${id}@${end}`;
            j.add(
                "edge.arrow",
                "edge",
                at,
                (oa === undefined) === (gg === undefined) ? 0 : 1,
                oa !== undefined,
                gg !== undefined,
            );
            if (oa === undefined || gg === undefined) {
                continue;
            }
            // a head of several parts in a row (Graphviz's boxdotnormal, crowtee) is read one arrow a part
            const parts = (list: readonly PArrow[]): number => headParts(list.filter((a) => a.end === end));
            j.add("edge.arrowParts", "edge", at, parts(o.arrows) === parts(ga) ? 0 : 1, parts(o.arrows), parts(ga));
            j.add(
                "edge.arrowShape",
                "edge",
                at,
                oa.shape === gg.shape && oa.shape !== "other" ? 0 : 1,
                oa.shape,
                gg.shape,
            );
            const place = arrowPlaceMiss(vo, oa, vg, gg.at === undefined ? gg : { ...gg, at: edgeFrame(gg.at) });
            if (place !== null) {
                j.add("edge.arrowPlace", "edge", at, place.miss, place.oracle, place.graphty);
            }
            j.add("edge.arrowFill", "edge", at, oa.filled === gg.filled ? 0 : 1, oa.filled, gg.filled);
            if (oa.color !== null && gg.color !== null) {
                j.add(
                    "edge.arrowColor",
                    "edge",
                    at,
                    Math.max(0, deltaE(oa.color, gg.color) - T.colorDeltaE),
                    oa.color,
                    gg.color,
                );
            }
            j.add(
                "edge.arrowLength",
                "edge",
                at,
                arrowMiss(oa.length, gg.length * lengthScale, pixel),
                oa.length,
                gg.length * lengthScale,
            );
            j.add(
                "edge.arrowWidth",
                "edge",
                at,
                arrowMiss(oa.width, gg.width * lengthScale, pixel),
                oa.width,
                gg.width * lengthScale,
            );
            const arrowScale = layoutRelative("edge.arrowToSpacing");
            if (arrowScale !== null) {
                j.add(
                    "edge.arrowToSpacing",
                    "edge",
                    at,
                    ratioMiss((gg.length * arrowScale) / Math.max(oa.length, 1e-9), T.layoutSizeRatio),
                    oa.length,
                    R(gg.length * arrowScale),
                );
            }
        }
        if (o.label !== null || g.label !== null) {
            j.add(
                "edge.label",
                "edge",
                id,
                norm(o.label?.content ?? "") === norm(g.label?.content ?? "") ? 0 : 1,
                o.label?.content ?? null,
                g.label?.content ?? null,
            );
            // how it is drawn, and where along and off its line: in the oracle's frame where the layouts relate, else
            // each on its own line, graphty's lengths at the frame's scale
            const own = flipped ? [...g.points].reverse() : g.points;
            judgeLabel(
                j,
                "edge",
                `edge:${id}`,
                o.label,
                g.label,
                lengthScale,
                angleToOracle,
                framed
                    ? {
                          kind: "line",
                          o: vo,
                          g: vg,
                          gAt: (t) => toOracle(boxMiddle(t.box)),
                          scale: 1,
                          pixel,
                          relative: false,
                      }
                    : {
                          kind: "line",
                          o: vo,
                          g: own,
                          gAt: (t) => boxMiddle(t.box),
                          scale: lengthScale,
                          pixel,
                          relative: true,
                      },
                oracle.labelGeometry !== false,
                false,
            );
        }
    }

    // Where each program lays the file out itself, whether it draws its lines curved is its style, though how far one
    // line bends is its layout's: the share of lines bent, one judgment for the drawing (json-vis-siblings, 59 of 284
    // edges bent in vis-network's drawing and 3 in graphty's, was judged on no edge)
    if (bends.length > 0) {
        const share = (k: 0 | 1): number => bends.filter((b) => b[k] > T.curvature).length / bends.length;
        const [so, sg] = [share(0), share(1)];
        j.add(
            "edge.curve",
            "graph",
            "edges",
            Math.max(0, Math.abs(sg - so) - T.curvedShare) / T.curvedShare,
            R(so),
            R(sg),
        );
    }

    // ---- groups: by id, else by box overlap after the fit
    const toO = (box: PBox): PBox => {
        const a = toOracle([box.x0, box.y0]);
        const b = toOracle([box.x1, box.y1]);
        return {
            x0: Math.min(a[0], b[0]),
            y0: Math.min(a[1], b[1]),
            x1: Math.max(a[0], b[0]),
            y1: Math.max(a[1], b[1]),
        };
    };
    /**
     * How far a box graphty draws is from the program's: its overlap at least the group overlap, and every side where
     * the program drew it (a box an eighth too wide on one side passes an overlap of 0.8), within its share of the
     * box's smaller side.
     */
    const boxMiss = (gBox: PBox, oBox: PBox): number => {
        const sideNear = Math.max(T.groupSideOfSize * Math.min(boxW(oBox), boxH(oBox)), pixel);
        const sides = Math.max(
            Math.abs(gBox.x0 - oBox.x0),
            Math.abs(gBox.y0 - oBox.y0),
            Math.abs(gBox.x1 - oBox.x1),
            Math.abs(gBox.y1 - oBox.y1),
        );
        return Math.max(0, T.groupIoU - iou(toBox(gBox), toBox(oBox))) + Math.max(0, sides / sideNear - 1);
    };
    /**
     * A group's box out to the outer edge of its outline, as a node's size is judged (`outerOf`): an SVG stroke runs
     * along the program's box, half of it outside, where graphty's border ring lies wholly outside its fill (SIGNOR's
     * complexes, 8 px borders, read as boxes 9 px too small all round).
     */
    const outerBox = (g: PGroup, side: "oracle" | "graphty"): PBox => {
        const s = g.stroke;
        const reach =
            s === null || s.painted === true || !Number.isFinite(s.width) ? 0 : s.width / (side === "oracle" ? 2 : 1);
        return { x0: g.box.x0 - reach, y0: g.box.y0 - reach, x1: g.box.x1 + reach, y1: g.box.y1 + reach };
    };
    const gGroups = [...graphty.groups];
    const pairedGroups: Record<string, string> = {};
    /** graphty's annotations the oracle draws as a group box. */
    const shapesDrawn = new Set<number>();
    // graphty's shape annotations, in the oracle's frame: a box the program draws around nodes is drawn by graphty
    // when graphty draws the file's annotation there (a Cytoscape shape annotation behind a few nodes)
    const gShapes = graphty.strays.filter((s) => s.kind === "shape").map((s) => ({ s, box: toO(s.box) }));
    // the words of a group that is graphty's annotation are judged with the other free words
    const annotatedTexts: PText[] = [];
    for (const o of [...oracle.groups].sort((a, b) => cmp(a.id, b.id))) {
        let k = gGroups.findIndex((g) => g.id === o.id);
        if (k < 0) {
            let best = 0;
            gGroups.forEach((g, i) => {
                const v = iou(toBox(toO(g.box)), toBox(o.box));
                if (v > best + 1e-12) {
                    best = v;
                    k = i;
                }
            });
            // a box overlapping under half is another box, not this one drawn a little off
            if (best < T.strayIoU) {
                k = -1;
            }
        }
        const g = k >= 0 ? gGroups.splice(k, 1)[0] : undefined;
        const shape = g === undefined ? annotationOver(o.box, gShapes) : undefined;
        if (shape !== undefined) {
            shapesDrawn.add(shape.s.index);
            j.add("group.present", "group", o.id, 0, o.id, shape.s.tag);
            j.add(
                "group.box",
                "group",
                o.id,
                boxMiss(shape.box, o.box),
                [o.box.x0, o.box.y0, o.box.x1, o.box.y1],
                [
                    R(shape.box.x0),
                    R(shape.box.y0),
                    R(shape.box.x1),
                    R(shape.box.y1),
                    R(iou(toBox(shape.box), toBox(o.box))),
                ],
            );
            if (o.label !== null) {
                annotatedTexts.push(o.label);
            }
            continue;
        }
        j.add("group.present", "group", o.id, g === undefined ? 1 : 0, o.id, g?.id ?? null);
        if (g === undefined) {
            continue;
        }
        pairedGroups[g.id] = o.id;
        const gBox = toO(outerBox(g, "graphty"));
        const oBox = outerBox(o, "oracle");
        const v = iou(toBox(gBox), toBox(oBox));
        j.add(
            "group.box",
            "group",
            o.id,
            boxMiss(gBox, oBox),
            [R(oBox.x0), R(oBox.y0), R(oBox.x1), R(oBox.y1)],
            [R(gBox.x0), R(gBox.y0), R(gBox.x1), R(gBox.y1), R(v)],
        );
        judgeFill(j, "group.fill", "group", o.id, o.fill, g.fill);
        if (o.fill !== null && g.fill !== null) {
            j.add(
                "group.fillOpacity",
                "group",
                o.id,
                opacityMiss(o.fill.opacity, g.fill.opacity),
                o.fill.opacity,
                g.fill.opacity,
            );
        }
        // the same outline rule as a node's: under the hairline is none unless the other side draws one of a width
        // within the tolerance of it, a patterned line read off a fill is an outline whatever its width, and a width
        // is judged only where both outlines show and the program's can be read
        const gScale = g.stroke?.screen === true ? 1 : lengthScale;
        const near =
            o.stroke !== null &&
            g.stroke !== null &&
            o.stroke.width > 0 &&
            ratioMiss((g.stroke.width * gScale) / o.stroke.width, T.strokeWidthRatio) === 0;
        const os =
            o.stroke !== null && (near || o.stroke.width >= T.hairline || o.stroke.patterned === true)
                ? o.stroke
                : null;
        const gs = g.stroke !== null && (near || g.stroke.width * gScale >= T.hairline) ? g.stroke : null;
        if (os === null || gs === null) {
            j.add(
                "group.stroke",
                "group",
                o.id,
                (os === null) === (gs === null) ? 0 : 1,
                os?.color ?? null,
                gs?.color ?? null,
            );
        } else {
            // a see-through outline is another line to a reader than an opaque one of its color
            j.add(
                "group.stroke",
                "group",
                o.id,
                Math.max(0, deltaE(os.color, gs.color) - T.colorDeltaE) + opacityMiss(os.opacity, gs.opacity),
                [os.color, os.opacity],
                [gs.color, R(gs.opacity)],
            );
            j.add(
                "group.strokeDash",
                "group",
                o.id,
                sameLine(os.dashClass, gs.dashClass) ? 0 : 1,
                os.dashClass,
                gs.dashClass,
            );
            if (Number.isFinite(os.width)) {
                j.add(
                    "group.strokeWidth",
                    "group",
                    o.id,
                    ratioMiss((gs.width * gScale) / os.width, T.strokeWidthRatio),
                    os.width,
                    gs.width * gScale,
                );
            }
        }
        if (o.label !== null || g.label !== null) {
            j.add(
                "group.label",
                "group",
                o.id,
                norm(o.label?.content ?? "") === norm(g.label?.content ?? "") ? 0 : 1,
                o.label?.content ?? null,
                g.label?.content ?? null,
            );
            // how it is drawn and where against its box
            judgeLabel(
                j,
                "group",
                `group:${o.id}`,
                o.label,
                g.label,
                lengthScale,
                angleToOracle,
                fit === null ? null : { kind: "box", o: o.box, g: g.box, vec: vecToOracle, pixel },
                oracle.labelGeometry !== false,
                false,
            );
        }
    }

    // a group box graphty draws that the oracle does not
    const extraGroups = new Set(gGroups);
    for (const g of oracle.nodesOnly === true ? [] : [...graphty.groups].sort((a, b) => cmp(a.id, b.id))) {
        j.add("group.extra", "group", `graphty:${g.id}`, extraGroups.has(g) ? 1 : 0, null, g.id);
    }

    // ---- strays and free text: a finding unless graphty drew an annotation over it
    const gAnn = graphty.strays.map((s) => toO(s.box));
    // the image a node with no body draws as itself is a picture drawn there too (vis-network's image nodes)
    const gPictures = graphty.nodes.flatMap((n) => (n.pictures ?? []).map((b) => toO(b)));
    // every text graphty draws, in the oracle's frame: a node's or an edge's label the association did not pair
    // with its element (an edge it did not find, a node drawn with no body) is still drawn
    const gTexts = [
        ...graphty.nodes.map((n) => n.label),
        ...graphty.edges.map((e) => e.label),
        ...graphty.groups.map((g) => g.label),
        ...graphty.texts,
    ].flatMap((t) => (t === null || t.content === "" ? [] : [{ words: norm(t.content), box: toO(t.box) }]));
    // what the program drew off its canvas is drawn nowhere a reader sees (vis-network's edge label in a text font,
    // drawn beyond the canvas's right edge)
    const onCanvas = (b: PBox): boolean => b.x1 >= 0 && b.y1 >= 0 && b.x0 <= oracle.width && b.y0 <= oracle.height;
    // a text under one render pixel is no text to a reader, as judgeLabel and extract-scene.ts drop graphty's: the
    // further lines of a wrapped node label Cytoscape draws at 0.15 px (cx-ddram, node 6907), which the association
    // leaves as free text when it drops the first line with its node
    const legibleText = (t: PText): boolean => t.sizePx === 0 || t.sizePx / lengthScale >= T.legibleFontPx;
    // Words a program drew as glyph outlines (Cytoscape desktop's labels on cx-polygenic-sle, each a white halo and
    // the black glyphs over it) say no words: one stray per place, drawn where graphty draws any text over it
    const glyphs = new Map<string, PBox>();
    for (const s of oracle.strays.filter((x) => x.lettering === true)) {
        glyphs.set([s.box.x0, s.box.y0, s.box.x1, s.box.y1].map((v) => Math.round(v * 2)).join(","), s.box);
    }
    const lettered = [...glyphs.values()].map((box) => ({
        tag: "lettering",
        box,
        fill: null,
        stroke: null,
        text: null,
    }));
    const overlaps = (a: PBox, b: PBox): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const strays = [
        ...oracle.strays
            .filter((s) => s.lettering !== true)
            .map((s) => ({ tag: s.tag, box: s.box, fill: s.fill, stroke: s.stroke, text: s.text })),
        ...lettered,
        ...[...oracle.texts, ...annotatedTexts].filter(legibleText).map((t) => ({
            tag: "text",
            box: t.box,
            fill: null,
            stroke: null,
            text: t.content,
        })),
        // a picture the program draws as part of a node (vis-network's image nodes) is one graphty draws over the
        // node's face as an annotation: it must be drawn. Only the other way round was judged (an annotation of
        // graphty's over a program's picture is no extra), so a picture graphty left out passed (json-vis-synth).
        // Last, so every other stray keeps its id
        ...oracle.nodes.flatMap((n) =>
            (n.pictures ?? []).map((box) => ({ tag: "picture", box, fill: null, stroke: null, text: null })),
        ),
    ]
        .filter((s) => onCanvas(s.box))
        .map((s, i) => {
            const matched =
                gAnn.some((b) => strayIou(b, s.box) >= T.strayIoU) ||
                (s.tag === "picture" && gPictures.some((b) => strayIou(b, s.box) >= T.strayIoU)) ||
                (s.text !== null && textDrawn(s.text, s.box, gTexts)) ||
                (s.tag === "lettering" && gTexts.some((t) => overlaps(t.box, s.box)));
            j.add(
                "stray.present",
                "stray",
                `${s.tag}#${String(i)}`,
                matched ? 0 : 1,
                s.text ?? s.fill ?? s.stroke,
                matched,
            );
            return { ...s, matched };
        });
    // an annotation graphty draws where the oracle draws nothing like it: a box, or words the oracle draws nowhere near;
    // a picture graphty draws over a node's face is drawn where the program draws one as part of a node
    const oBoxes = [
        ...oracle.strays.map((s) => s.box),
        ...oracle.nodes.flatMap((n) => n.pictures ?? []),
        ...oracle.texts.map((t) => t.box),
        ...oracle.groups.map((g) => g.box),
    ];
    const oTexts = [
        ...oracle.nodes.map((n) => n.label),
        ...oracle.edges.map((e) => e.label),
        ...oracle.groups.map((g) => g.label),
        ...oracle.texts,
    ].flatMap((t) => (t === null || t.content === "" ? [] : [{ words: norm(t.content), box: t.box }]));
    for (const s of oracle.nodesOnly === true ? [] : [...graphty.strays].sort((a, b) => a.index - b.index)) {
        const box = toO(s.box);
        const drawn =
            shapesDrawn.has(s.index) ||
            oBoxes.some((b) => strayIou(b, box) >= T.strayIoU) ||
            (s.text !== null && textDrawn(s.text, box, oTexts));
        j.add("stray.extra", "stray", `graphty:${s.tag}#${String(s.index)}`, drawn ? 0 : 1, null, s.text ?? s.tag);
    }
    // free text graphty draws (a caption's words aside, which withoutCaptions dropped), the label of a node it draws
    // with no body among them: extra where the oracle draws those words nowhere near, or, between unrelated layouts,
    // which relate no place, nowhere at all
    const anywhere = transform?.unrelatedLayout === true;
    const gFree = oracle.nodesOnly === true ? [] : graphty.texts.filter((t) => norm(t.content) !== "");
    for (const [i, t] of [...gFree].sort((a, b) => cmp(a.content, b.content) || a.x - b.x || a.y - b.y).entries()) {
        const drawn = wordsDrawnNear(norm(t.content), anywhere ? null : toO(t.box), oTexts);
        j.add("stray.extra", "stray", `graphty:text#${String(i)}`, drawn ? 0 : 1, null, t.content);
    }

    if (oracle.background !== null && graphty.background !== null) {
        j.add(
            "background",
            "graph",
            "background",
            Math.max(0, deltaE(oracle.background, graphty.background) - T.backgroundDeltaE),
            oracle.background,
            graphty.background,
        );
    }

    const properties = Object.fromEntries(
        ORACLE_PROPERTIES.map((p) => {
            const list = j.results.get(p) ?? [];
            const pass = list.filter((x) => x.pass).length;
            const worst = list
                .filter((x) => !x.pass)
                .sort((a, b) => b.miss - a.miss || cmp(a.id, b.id))
                .slice(0, 8);
            return [
                p,
                {
                    n: list.length,
                    pass,
                    passRate: list.length === 0 ? null : pass / list.length,
                    tolerance: TOLERANCE_TEXT[p],
                    worst,
                },
            ];
        }),
    ) as Record<OracleProperty, OraclePropertyResult>;

    const elements = [...j.failed]
        .map(([key, set]) => {
            const [kind, id] = key.split("\u0000");
            return {
                kind: kind as OracleReport["elements"][number]["kind"],
                id,
                failed: ORACLE_PROPERTIES.filter((p) => set.has(p)),
            };
        })
        .sort((a, b) => b.failed.length - a.failed.length || cmp(a.kind, b.kind) || cmp(a.id, b.id));

    // every failing element by property: one wrong element fails its sample, however many others pass
    const failures: OracleReport["failures"] = {};
    const judged: OracleReport["judged"] = {};
    for (const p of ORACLE_PROPERTIES) {
        const list = j.results.get(p) ?? [];
        const ids = list.filter((x) => !x.pass).map((x) => x.id);
        if (ids.length > 0) {
            failures[p] = [...new Set(ids)].sort(cmp);
        }
        if (list.length > 0) {
            judged[p] = [...new Set(list.map((x) => x.id))].sort(cmp);
        }
    }

    return rounded({
        sample,
        standIn: options.standIn === true,
        verdict: { pass: elements.length === 0, failing: elements.length },
        failures,
        judged,
        association,
        transform,
        counts: {
            oracleNodes: oracle.nodes.length,
            graphtyNodes: graphty.nodes.length,
            matchedNodes: pairs.length,
            oracleEdges: oracle.edges.length,
            graphtyEdges: graphty.edges.length,
            matchedEdges: edgePairs.length,
            oracleGroups: oracle.groups.length,
            graphtyGroups: graphty.groups.length,
            oracleStrays: oracle.strays.length,
            oracleTexts: oracle.texts.length,
            labelOverlap: labelOverlap(oracle, graphty),
        },
        properties,
        elements,
        unmatched: {
            oracleNodes: stillOracle.map((n) => n.id).sort(cmp),
            graphtyNodes: graphtyLeft.map((n) => n.id),
            oracleEdges: unmatchedOracleEdges,
            graphtyEdges: unmatchedGraphtyEdges,
        },
        paired: {
            nodes: Object.fromEntries(pairs.map(([o, g]) => [g.id, o.id])),
            edges: Object.fromEntries(edgePairs.map(([o, g]) => [g.id, o.id])),
            groups: pairedGroups,
        },
        strays,
    });
}

function labelOverlap(oracle: PScene, graphty: PScene): number | null {
    // each line, and a label as one text (a label wrapped at other words is read whole)
    const words = new Set(
        [
            ...oracle.nodes.flatMap((n) => (n.label ? [...n.label.content.split("\n"), n.label.content] : [])),
            ...oracle.texts.map((t) => t.content),
        ].map(norm),
    );
    const labels = graphty.nodes.flatMap((n) => (n.label && n.label.content !== "" ? [n.label.content] : []));
    return labels.length === 0
        ? null
        : labels.filter((l) => words.has(norm(l.split("\n")[0])) || words.has(norm(l))).length / labels.length;
}

/**
 * Judges a node's ring outside its outline, wherever either side draws one that shows.
 * @param j - the judge
 * @param id - the node
 * @param o - the oracle's ring
 * @param g - graphty's
 * @param scale - graphty's pixels to the oracle's
 */
function judgeRing(j: Judge, id: string, o: PNode["ring"], g: PNode["ring"], scale: number): void {
    const T = ORACLE_TOLERANCES;
    const shown = (r: PNode["ring"], k: number): PNode["ring"] =>
        r !== null && r !== undefined && r.opacity > 0.05 && r.width * k >= T.hairline ? r : null;
    const [or, gr] = [shown(o, 1), shown(g, scale)];
    if (or === null && gr === null) {
        return;
    }
    const show = (r: PNode["ring"], k: number): unknown =>
        r === null || r === undefined ? null : [r.color, R(r.opacity), R(r.width * k), r.dashClass, R(r.reach * k)];
    const miss =
        or === null || gr === null || or === undefined || gr === undefined
            ? 1
            : Math.max(0, deltaE(or.color, gr.color) - T.colorDeltaE) +
              opacityMiss(or.opacity, gr.opacity) +
              ratioMiss((gr.width * scale) / Math.max(or.width, 1e-9), T.strokeWidthRatio) +
              (sameLine(or.dashClass, gr.dashClass) ? 0 : 1) +
              ratioMiss((gr.reach * scale) / Math.max(or.reach, 1e-9), T.labelOutlineRatio);
    j.add("node.ring", "node", id, miss, show(or, 1), show(gr, scale));
}

function judgeFill(j: Judge, p: OracleProperty, kind: string, id: string, o: PNode["fill"], g: PNode["fill"]): void {
    if (o === null || g === null) {
        j.add(p, kind, id, (o === null) === (g === null) ? 0 : 1, o?.color ?? null, g?.color ?? null);
        return;
    }
    j.add(p, kind, id, Math.max(0, deltaE(o.color, g.color) - ORACLE_TOLERANCES.colorDeltaE), o.color, g.color);
}

/** Where a label is placed: against its node's or group's box, or along its edge's line. */
type LabelPlace =
    | {
          kind: "box";
          /** The oracle's box and graphty's (in graphty's pixels). */
          o: PBox;
          g: PBox;
          vec: (v: Pt) => Pt;
          pixel: number;
      }
    | {
          kind: "line";
          /** Each side's route, the oracle's way; graphty's in `frame` pixels. */
          o: readonly Pt[];
          g: readonly Pt[];
          /** Graphty's label middle in the same pixels as its route. */
          gAt: (t: PText) => Pt;
          /** Graphty's lengths in oracle pixels. */
          scale: number;
          pixel: number;
          /** Each route in its own frame (unrelated layouts): a label's turn is judged against its own line. */
          relative: boolean;
      };

/** Which side of a box, along one axis, a label sits at: before it, inside at its start, centered, at its end, after it. */
type Side = "before" | "start" | "center" | "end" | "after";

function sideOn(l0: number, l1: number, b0: number, b1: number, tol: number): Side {
    if (l1 <= b0 + tol) {
        return "before";
    }
    if (l0 >= b1 - tol) {
        return "after";
    }
    const [dl, dr] = [l0 - b0, b1 - l1];
    // a label wider than its box on both sides sits across it, whatever its measured box's half a letter of drift: how
    // far its middle is off the box's is the offset's to judge
    if (Math.abs(dl - dr) <= 2 * tol || (dl < -tol && dr < -tol)) {
        return "center";
    }
    return dl < dr ? "start" : "end";
}

/**
 * A label's place against a box, per axis.
 * @param t - the label
 * @param b - the box
 * @returns `<x side>/<y side>`
 */
export function labelAnchor(t: PText, b: PBox): string {
    const tol = Math.max(ORACLE_TOLERANCES.labelAnchorOfSize * t.sizePx, 0.5);
    return `${sideOn(t.box.x0, t.box.x1, b.x0, b.x1, tol)}/${sideOn(t.box.y0, t.box.y1, b.y0, b.y1, tol)}`;
}

/**
 * How a label's lines are aligned, read off their boxes: the edge they share (left, right) or their middles.
 * @param t - the label
 * @returns the alignment, or null under two lines or where the lines are too alike in width to tell
 */
export function lineAlign(t: PText): "start" | "middle" | "end" | null {
    // a table's cells side by side are read apart: a cell's lines overlap across, the cell beside them does not
    // (dot-specimen-labels-p2 html-td-balign-left); the cell with the most lines decides
    const cells: PBox[][] = [];
    for (const b of [...(t.lines ?? [])].sort((p, q) => p.x0 - q.x0)) {
        const last = cells.at(-1);
        if (last !== undefined && b.x0 < Math.max(...last.map((l) => l.x1))) {
            last.push(b);
        } else {
            cells.push([b]);
        }
    }
    const most = [...cells].sort((p, q) => q.length - p.length)[0];
    return most === undefined ? null : alignOfLines(most, t.sizePx);
}

/**
 * How lines of one cell are aligned.
 * @param lines - the lines' boxes
 * @param sizePx - their font size
 * @returns the alignment, or null under two lines or where they are too alike in width to tell
 */
function alignOfLines(lines: readonly PBox[], sizePx: number): "start" | "middle" | "end" | null {
    if (lines.length < 2) {
        return null;
    }
    const widths = lines.map((b) => b.x1 - b.x0);
    if (Math.max(...widths) - Math.min(...widths) < ORACLE_TOLERANCES.lineAlignOfSize * sizePx) {
        return null;
    }
    const spread = (xs: number[]): number => Math.max(...xs) - Math.min(...xs);
    const by: ["start" | "middle" | "end", number][] = [
        ["start", spread(lines.map((b) => b.x0))],
        ["middle", spread(lines.map((b) => (b.x0 + b.x1) / 2))],
        ["end", spread(lines.map((b) => b.x1))],
    ];
    return by.sort((a, b) => a[1] - b[1])[0][0];
}

/** How much of the shorter of two texts' heights they share to be on one row. */
const SAME_ROW = 0.7;

/**
 * How many lines a label is drawn on: its rows, so words drawn side by side as separate texts are one line however far
 * apart they are (Graphviz's HTML table cells a and b on one row, a `<SUB>` run set a little lower than the words round
 * it: dot-specimen-labels-p2 html-table, html-sub), and a text sharing less than `SAME_ROW` of its height with a row
 * is a line of its own (a record's field set half a line down between another field's two lines: record-escapes).
 * @param t - the label
 * @returns the number of rows
 */
function lineCount(t: PText): number {
    if (t.lines === undefined) {
        return t.content.split("\n").filter((l) => l.trim() !== "").length;
    }
    const rows: PBox[] = [];
    for (const b of [...t.lines].sort((p, q) => p.y0 - q.y0)) {
        const shared = (r: PBox): number => Math.min(r.y1, b.y1) - Math.max(r.y0, b.y0);
        if (!rows.some((r) => shared(r) >= SAME_ROW * Math.min(r.y1 - r.y0, b.y1 - b.y0))) {
            rows.push(b);
        }
    }
    return rows.length;
}

/**
 * Where a point lies along a polyline: the arc length to its nearest point, the line's length, and its signed distance
 * off the line (positive to the right of the line's way on screen, y down).
 * @param pts - the line
 * @param q - the point
 * @returns the place
 */
export function placeOnLine(pts: readonly Pt[], q: Pt): { s: number; length: number; d: number } {
    let best = { dist: Infinity, s: 0, d: 0 };
    let run = 0;
    for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
        const L = Math.hypot(dx, dy);
        const t = L < 1e-9 ? 0 : Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (L * L)));
        const [px, py] = [a[0] + t * dx, a[1] + t * dy];
        const dist = Math.hypot(q[0] - px, q[1] - py);
        if (dist < best.dist - 1e-9) {
            const side = L < 1e-9 ? 0 : (dx * (q[1] - a[1]) - dy * (q[0] - a[0])) / L;
            best = { dist, s: run + t * L, d: side };
        }
        run += L;
    }
    return { s: best.s, length: run, d: best.d };
}

/**
 * The direction a polyline runs in at its point nearest a point, in degrees on screen.
 * @param pts - the line
 * @param q - the point
 * @returns the direction of the nearest segment
 */
export function lineAngleAt(pts: readonly Pt[], q: Pt): number {
    let best = { dist: Infinity, angle: 0 };
    for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
        const L2 = dx * dx + dy * dy;
        if (L2 < 1e-18) {
            continue;
        }
        const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2));
        const dist = Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy);
        if (dist < best.dist - 1e-9) {
            best = { dist, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
        }
    }
    return best.angle;
}

/**
 * graphty's node label as the oracle's framing would show it. A label under a node-size rule (sigma's
 * labelRenderedSizeThreshold, `node.labelMinNodeScreenSize`) shows while its node is drawn at least so many px
 * across, which depends on how large each side frames the graph, a camera choice judged apart (frame.zoom): it is
 * shown here where its node, at the oracle's scale, meets the rule (json-gephi-worldcup: 8 labels sigma shows on
 * nodes 12.22 px across, which graphty's framing draws 11.02 px across and hides). ponytail: only the node's own
 * label; a node with further texts under such a rule would lose them here, and no format draws one yet.
 * @param g - graphty's node
 * @param scale - oracle px per graphty px
 * @param oracle - the oracle's label, which decides a node on the rule's edge
 * @returns the label to judge, or null for none
 */
function labelAtScale(g: PNode, scale: number, oracle: PText | null): PText | null {
    const r = g.sizedLabel;
    if (r === undefined) {
        return g.label;
    }
    // the label graphty draws where it shows one, else the one its framing hides
    const label = g.label ?? r.label;
    const share = (r.acrossPx * scale) / r.min - 1;
    // on the rule's edge either is right (json-gephi-worldcup's grid labels ranked second in their cell)
    if (Math.abs(share) <= ORACLE_TOLERANCES.labelRuleShare) {
        return oracle === null ? null : label;
    }
    return share > 0 ? label : null;
}

/**
 * Judges a label: its words (unless the element's own property does), size, weight, style, family, color, opacity,
 * rotation, lines and their alignment, outline, background, and its place -- against its node's or group's box, or
 * along its edge's line.
 */
function judgeLabel(
    j: Judge,
    kind: string,
    id: string,
    oracle: PText | null,
    graphty: PText | null,
    scale: number,
    angleToOracle: (deg: number) => number,
    place: LabelPlace | null,
    geometry: boolean,
    words = true,
): void {
    const T = ORACLE_TOLERANCES;
    // A label under one render pixel is no label to a reader, on graphty's side (extract-scene.ts) and the oracle's.
    // A raster oracle (sigma) names the labels it drew but not their size (sizePx 0): those are shown.
    const legible = oracle !== null && (oracle.sizePx === 0 || oracle.sizePx / scale >= T.legibleFontPx);
    const o = legible ? oracle : null;
    // and graphty's by the same measure, for a text the scene keeps however small: a node's further texts
    // (`shape.texts`, Cytoscape's chart item labels at their default 1 px, xgmml-specimen-images-charts-p5)
    const g = graphty !== null && (graphty.sizePx === 0 || graphty.sizePx >= T.legibleFontPx) ? graphty : null;
    if (words) {
        j.add("label.present", kind, id, (o === null) === (g === null) ? 0 : 1, o?.content ?? null, g?.content ?? null);
    }
    if (o === null || g === null) {
        return;
    }
    if (words) {
        j.add("label.text", kind, id, norm(o.content) === norm(g.content) ? 0 : 1, o.content, g.content);
    }
    if (!geometry) {
        return;
    }
    j.add(
        "label.size",
        kind,
        id,
        ratioMiss((g.sizePx * scale) / Math.max(o.sizePx, 1e-9), T.fontSizeRatio),
        o.sizePx,
        g.sizePx * scale,
    );
    j.add("label.weight", kind, id, Math.max(0, Math.abs(o.weight - g.weight) - T.fontWeight), o.weight, g.weight);
    j.add("label.style", kind, id, o.style === g.style ? 0 : 1, o.style, g.style);
    // a pinned face the program names is judged as that face (DejaVu Sans against Liberation Sans is two faces of
    // one class); any other family by its class
    const oFace = programFace(o.family);
    const oFamily = programFontClass(o.family);
    if (oFace !== null) {
        const gFace = browserFace(g.family);
        j.add("label.family", kind, id, oFace === gFace ? 0 : 1, `${o.family} (${oFace})`, `${g.family} (${gFace})`);
    } else if (oFamily !== null) {
        const gFamily = browserFontClass(g.family);
        j.add(
            "label.family",
            kind,
            id,
            oFamily === gFamily ? 0 : 1,
            `${o.family} (${oFamily})`,
            `${g.family} (${gFamily})`,
        );
    }
    j.add("label.color", kind, id, Math.max(0, deltaE(o.color, g.color) - T.colorDeltaE), o.color, g.color);
    j.add("label.opacity", kind, id, opacityMiss(o.opacity, g.opacity), o.opacity, g.opacity);
    // Between unrelated layouts an edge's line runs another way on each side: its label's turn is judged against its
    // own line there (a label drawn along its line on both sides, or level on both), in the oracle's line's frame.
    // A label kept upright on its line turns half round with the line's way, so there a half turn is no turn.
    const middle = (t: PText): Pt => [(t.box.x0 + t.box.x1) / 2, (t.box.y0 + t.box.y1) / 2];
    const relative = place?.kind === "line" && place.relative && place.o.length >= 2 && place.g.length >= 2;
    const turned = relative
        ? g.rotation - lineAngleAt(place.g, place.gAt(g)) + lineAngleAt(place.o, middle(o))
        : angleToOracle(g.rotation);
    const turn = relative
        ? ((((turned - o.rotation) % 180) + 270) % 180) - 90
        : ((((turned - o.rotation) % 360) + 540) % 360) - 180;
    j.add("label.rotation", kind, id, Math.max(0, Math.abs(turn) - T.rotationDeg), o.rotation, turned);
    const [on, gn] = [lineCount(o), lineCount(g)];
    j.add("label.lines", kind, id, Math.abs(on - gn), on, gn);
    const oAlign = lineAlign(o);
    if (oAlign !== null && gn >= 2) {
        const gAlign = g.align ?? lineAlign(g);
        j.add("label.align", kind, id, oAlign === gAlign ? 0 : 1, oAlign, gAlign);
    }
    judgeLabelDress(j, kind, id, o, g, scale);
    if (place?.kind === "box") {
        const center = (b: PBox): Pt => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
        const [oc0, gc0] = [center(o.box), center(g.box)];
        const [ob, gb] = [center(place.o), center(place.g)];
        const oc: Pt = [oc0[0] - ob[0], oc0[1] - ob[1]];
        const gc = place.vec([gc0[0] - gb[0], gc0[1] - gb[1]]);
        const d = Math.hypot(oc[0] - gc[0], oc[1] - gc[1]);
        const near = Math.max(T.labelOffsetOfSize * o.sizePx, place.pixel);
        j.add("label.offset", kind, id, Math.max(0, d / near - 1), oc, gc);
        const [oa, ga] = [labelAnchor(o, place.o), labelAnchor(g, place.g)];
        j.add("label.anchor", kind, id, oa === ga ? 0 : 1, oa, ga);
    } else if (place?.kind === "line" && place.o.length >= 2 && place.g.length >= 2) {
        // the label's middle, not its anchor point (an SVG text's start or baseline)
        const op = placeOnLine(place.o, [(o.box.x0 + o.box.x1) / 2, (o.box.y0 + o.box.y1) / 2]);
        const gp = placeOnLine(place.g, place.gAt(g));
        const ot = op.length > 0 ? op.s / op.length : 0;
        const gt = gp.length > 0 ? gp.s / gp.length : 0;
        const along = Math.max(T.labelAlongOfLength * op.length, o.sizePx, place.pixel);
        j.add("label.alongLine", kind, id, Math.max(0, (Math.abs(ot - gt) * op.length) / along - 1), R(ot), R(gt));
        const off = Math.max(T.labelOffLineOfSize * o.sizePx, place.pixel);
        const gd = gp.d * place.scale;
        j.add("label.offLine", kind, id, Math.max(0, Math.abs(op.d - gd) / off - 1), R(op.d), R(gd));
    }
}

/**
 * Judges what a label is dressed in: an outline round its letters and a box behind its words, its fill, shape, size
 * and border. A see-through or hairline part shows nothing and counts as none.
 */
function judgeLabelDress(j: Judge, kind: string, id: string, o: PText, g: PText, scale: number): void {
    const T = ORACLE_TOLERANCES;
    const shown = (x: { opacity: number; width: number } | null | undefined, k: number): boolean =>
        x !== null && x !== undefined && x.opacity > 0.05 && x.width * k >= T.hairline;
    const [oo, go] = [shown(o.outline, 1) ? o.outline : null, shown(g.outline, scale) ? g.outline : null];
    if (oo === null || oo === undefined || go === null || go === undefined) {
        j.add("label.outline", kind, id, (oo ?? null) === (go ?? null) ? 0 : 1, oo?.color ?? null, go?.color ?? null);
    } else {
        const miss =
            Math.max(0, deltaE(oo.color, go.color) - T.colorDeltaE) +
            opacityMiss(oo.opacity, go.opacity) +
            ratioMiss((go.width * scale) / Math.max(oo.width, 1e-9), T.labelOutlineRatio);
        j.add(
            "label.outline",
            kind,
            id,
            miss,
            [oo.color, oo.opacity, oo.width],
            [go.color, go.opacity, R(go.width * scale)],
        );
    }
    const ob = o.background ?? null;
    const gb = g.background ?? null;
    const fillOf = (b: typeof ob): PFill | null =>
        b?.fill !== null && b?.fill !== undefined && b.fill.opacity > 0.05 ? b.fill : null;
    const [of, gf] = [fillOf(ob), fillOf(gb)];
    if (of === null || gf === null) {
        j.add(
            "label.background",
            kind,
            id,
            (of === null) === (gf === null) ? 0 : 1,
            of?.color ?? null,
            gf?.color ?? null,
        );
    } else {
        const miss = Math.max(0, deltaE(of.color, gf.color) - T.colorDeltaE) + opacityMiss(of.opacity, gf.opacity);
        j.add("label.background", kind, id, miss, [of.color, of.opacity], [gf.color, R(gf.opacity)]);
    }
    const strokeOf = (b: typeof ob, k: number): PStroke | null =>
        b?.stroke !== null && b?.stroke !== undefined && shown(b.stroke, k) ? b.stroke : null;
    const [os, gs] = [strokeOf(ob, 1), strokeOf(gb, scale)];
    if (os === null || gs === null) {
        j.add(
            "label.backgroundBorder",
            kind,
            id,
            (os === null) === (gs === null) ? 0 : 1,
            os?.color ?? null,
            gs?.color ?? null,
        );
    } else {
        const miss =
            Math.max(0, deltaE(os.color, gs.color) - T.colorDeltaE) +
            opacityMiss(os.opacity, gs.opacity) +
            ratioMiss((gs.width * scale) / Math.max(os.width, 1e-9), T.labelOutlineRatio);
        j.add(
            "label.backgroundBorder",
            kind,
            id,
            miss,
            [os.color, os.opacity, os.width],
            [gs.color, R(gs.opacity), R(gs.width * scale)],
        );
    }
    if ((of !== null || os !== null) && (gf !== null || gs !== null) && ob !== null && gb !== null) {
        const shapeMiss = ob.shape !== null && gb.shape !== null && ob.shape !== gb.shape ? 1 : 0;
        const [ow, oh] = [ob.box.x1 - ob.box.x0, ob.box.y1 - ob.box.y0];
        const [gw, gh] = [(gb.box.x1 - gb.box.x0) * scale, (gb.box.y1 - gb.box.y0) * scale];
        const miss =
            shapeMiss +
            Math.max(ratioMiss(gw / Math.max(ow, 1e-9), T.sizeRatio), ratioMiss(gh / Math.max(oh, 1e-9), T.sizeRatio));
        j.add("label.backgroundBox", kind, id, miss, [ob.shape, R(ow), R(oh)], [gb.shape, R(gw), R(gh)]);
    }
}
