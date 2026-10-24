/**
 * Per-setting judging: which reference judges each property of each setting of a specimen sheet, where no one program
 * draws every setting the sheet holds (`graph-io/test/fidelity/specimens/<format>/judges.json`). A sheet's own oracle
 * judges what it draws; a stand-in program (a drawing in `graph-io/test/fidelity/oracles/stand-ins/`) judges what the
 * oracle does not draw and it does; what no program draws is judged against the format's specification, as an
 * expectation recorded per setting with the section it comes from; and what nothing defines is judged by no one. So a
 * property is never scored against a drawing that cannot show it.
 *
 * Pure: no DOM.
 */
import { apply, fitSimilarity } from "../../../../graph-io/test/fidelity/compare";
import type { OracleJudges, OracleProperty } from "./compare-oracle";
import type { PEdge, PNode, PScene, Pt } from "./primitives";

/** Who judges a property of a setting: the sheet's oracle, a stand-in program by its route, the specification, or no one. */
export type Reference = "oracle" | "cytoscape-gml" | "gml2gv" | "specification" | "none";

/** What the specification says a setting's element looks like: fields of the element as the comparator reads it. */
export interface Expectation {
    node?: Partial<PNode>;
    /** `route: "tk-smooth"`: the element's route drawn as Tk draws a `-smooth 1` line through its points. */
    edge?: Partial<PEdge> & { route?: "tk-smooth" };
}

/** One rule: the reference for these properties of these settings. A later rule overrides an earlier one. */
export interface JudgeRule {
    judge: Reference;
    /** Setting ids (`*` matches any run of characters); `*` alone also matches elements no setting owns (strays). */
    settings: string[];
    /** Oracle properties (`node.*` matches every node property). */
    properties: string[];
    /** Why this reference, and not the one before it, judges these. */
    why: string;
    /** The specification's expectation: required for `judge: "specification"`, and only there. */
    expect?: Expectation;
    /** Where the specification says so: required for `judge: "specification"`. */
    source?: string;
}

/** One sheet's judging. */
export interface SheetJudges {
    /** The stand-in programs drawn for this sheet, by route, each in `oracles/stand-ins/<sample>.<route>.svg`. */
    standIns: Reference[];
    rules: JudgeRule[];
}

/** A judges.json file. */
export interface JudgesFile {
    about: string;
    references: Record<string, string>;
    /** Rules every sheet of the file starts with, before its own. */
    common?: JudgeRule[];
    sheets: Record<string, SheetJudges>;
}

const files = import.meta.glob<JudgesFile>("../../../../graph-io/test/fidelity/specimens/*/judges.json", {
    import: "default",
    eager: true,
});

/** Every sheet judged per setting, by sample id, its file's common rules first. */
export const SHEET_JUDGES: Readonly<Record<string, SheetJudges>> = Object.fromEntries(
    Object.values(files).flatMap((f) =>
        Object.entries(f.sheets).map(([id, s]) => [id, { ...s, rules: [...(f.common ?? []), ...s.rules] }]),
    ),
);

/**
 * The setting an element of a specimen sheet belongs to: a node's own id, an edge's specimen (its source node's id
 * without the `-s` or `-n` that names its end), an edge label's edge's, an arrow's edge's; null for an element no
 * setting owns (a stray primitive).
 * @param id - the judged element's id as the comparator names it
 * @returns the setting id, or null
 */
export function settingOf(id: string): string | null {
    // graphty's own extra node is named by its node id; a primitive no element owns by its tag and index
    const bare = id.replace(/^(graphty|edge|node|group):/, "").replace(/@(source|target|middle)$/, "");
    if (/^[a-z]+#\d+$/.test(bare)) {
        return null;
    }
    const arrow = bare.indexOf("->");
    if (arrow < 0) {
        return bare;
    }
    return bare.slice(0, arrow).replace(/-[sn]$/, "");
}

const globRe = (glob: string): RegExp =>
    new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);

const matches = (globs: readonly string[], value: string | null): boolean =>
    globs.some((g) => (value === null ? g === "*" : globRe(g).test(value)));

/**
 * The reference that judges a property of an element: the last rule naming both, else the sheet's oracle.
 * @param sheet - the sheet's judging
 * @param property - the property
 * @param id - the element's id
 * @returns the reference, and the rule that chose it (undefined for the default)
 */
export function referenceOf(
    sheet: SheetJudges,
    property: OracleProperty,
    id: string,
): { judge: Reference; rule?: JudgeRule } {
    const setting = settingOf(id);
    const { rules } = sheet;
    for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (matches(rule.properties, property) && matches(rule.settings, setting)) {
            return { judge: rule.judge, rule };
        }
    }
    return { judge: "oracle" };
}

/**
 * The comparator's filter for one reference: the judgments it keeps.
 * @param sheet - the sheet's judging
 * @param reference - the reference
 * @returns the filter
 */
export function judgesFor(sheet: SheetJudges, reference: Reference): OracleJudges {
    return (property, id, subject) => referenceOf(sheet, property, subject ?? id).judge === reference;
}

/**
 * The points Tk draws a `-smooth 1` (bezier) line through: each pair of segments as one parabolic arc from a segment's
 * middle to the next one's (the first from the first point, the last to the last), each written as a cubic Bezier
 * (tkTrig.c TkMakeBezierCurve, an open line), sampled evenly in its parameter.
 * @param pts - the line's points
 * @param steps - samples per arc
 * @returns the curve's points, first point first
 */
export function tkSmooth(pts: readonly Pt[], steps = 16): Pt[] {
    if (pts.length < 3) {
        return pts.map((p): Pt => [p[0], p[1]]);
    }
    const mix = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const out: Pt[] = [[pts[0][0], pts[0][1]]];
    const last = pts.length - 3;
    for (let i = 0; i <= last; i++) {
        const [a, b, c] = [pts[i], pts[i + 1], pts[i + 2]];
        const c0 = i === 0 ? a : mix(a, b, 0.5);
        const c1 = i === 0 ? mix(a, b, 2 / 3) : mix(a, b, 5 / 6);
        const c2 = i === last ? mix(c, b, 2 / 3) : mix(b, c, 1 / 6);
        const c3 = i === last ? c : mix(b, c, 0.5);
        for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const u = 1 - t;
            const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
            out.push([
                w[0] * c0[0] + w[1] * c1[0] + w[2] * c2[0] + w[3] * c3[0],
                w[0] * c0[1] + w[1] * c1[1] + w[2] * c2[1] + w[3] * c3[1],
            ]);
        }
    }
    return out;
}

/**
 * One drawing's elements carried into another's frame, fitted on the corner anchors both drew (a mirror allowed: gml2gv
 * draws the sheet y up).
 * @param from - the drawing the elements come from
 * @param to - the drawing whose frame they go into
 * @returns the mapping of a node and of an edge, or null where the two share under two anchors
 */
function frameMap(from: PScene, to: PScene): { node: (n: PNode) => PNode; edge: (e: PEdge) => PEdge } | null {
    const anchors = to.nodes.filter((n) => n.id.startsWith("anchor-"));
    const pairs = anchors.flatMap((a) => {
        const b = from.nodes.find((n) => n.id === a.id);
        return b === undefined ? [] : [[b, a] as const];
    });
    const fit = fitSimilarity(
        pairs.map(([b]): Pt => [b.cx, b.cy]),
        pairs.map(([, a]): Pt => [a.cx, a.cy]),
    );
    if (fit === null) {
        return null;
    }
    const k = fit.scale;
    return {
        node: (n) => {
            const [cx, cy] = apply(fit, [n.cx, n.cy]);
            return { ...structuredClone(n), cx, cy, w: n.w * k, h: n.h * k };
        },
        edge: (e) => ({
            ...structuredClone(e),
            points: e.points.map((p) => apply(fit, p)),
            stroke: e.stroke === null ? null : { ...e.stroke, width: e.stroke.width * k },
            arrows: e.arrows.map((a) => ({ ...a, length: a.length * k, width: a.width * k })),
        }),
    };
}

/**
 * The specification's drawing of a sheet: the oracle's drawing with each specification rule's expectation written over
 * the elements of its settings. An element of such a setting the oracle does not draw at all (OGDF draws a Tk-stippled
 * line as no line) is taken from the first stand-in that draws it, carried into the oracle's frame. Only the properties
 * the specification rules name are judged against it (`judgesFor`), so what else it holds is the programs' and never
 * scored.
 * @param base - the oracle's scene
 * @param sheet - the sheet's judging
 * @param others - the stand-ins' scenes
 * @returns the scene
 */
export function specificationScene(base: PScene, sheet: SheetJudges, others: readonly PScene[] = []): PScene {
    const scene = structuredClone(base);
    const rules = sheet.rules.filter((r) => r.judge === "specification" && r.expect !== undefined);
    const wanted = (id: string): boolean => rules.some((r) => matches(r.settings, settingOf(id)));
    const has = (list: readonly { id: string }[], id: string): boolean =>
        list.some((x) => settingOf(x.id) === settingOf(id));
    for (const other of others) {
        const map = frameMap(other, base);
        if (map === null) {
            continue;
        }
        for (const n of other.nodes.filter((x) => wanted(x.id) && !has(scene.nodes, x.id))) {
            scene.nodes.push(map.node(n));
        }
        for (const e of other.edges.filter((x) => wanted(x.id) && !has(scene.edges, x.id))) {
            scene.edges.push(map.edge(e));
        }
    }
    for (const rule of rules) {
        const { node, edge } = rule.expect ?? {};
        for (const n of scene.nodes) {
            if (node !== undefined && matches(rule.settings, settingOf(n.id))) {
                Object.assign(n, structuredClone(node));
            }
        }
        for (const e of scene.edges) {
            if (edge !== undefined && matches(rule.settings, settingOf(e.id))) {
                const { route, ...rest } = edge;
                Object.assign(e, structuredClone(rest));
                if (route === "tk-smooth") {
                    // a drawing repeats a point where one segment of its path ends and the next begins; Tk would
                    // read a repeated point as a corner, so the line's own points are smoothed
                    e.points = tkSmooth(
                        e.points.filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]),
                    );
                }
            }
        }
    }
    return scene;
}
