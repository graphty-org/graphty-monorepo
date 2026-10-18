/**
 * Planted defects for the oracle comparator's planted-defect test (mutants.test.ts): each takes graphty's drawn
 * primitives and returns them with one visual defect, the way a broken importer or renderer would draw them.
 */
import { browserFontClass, type OracleProperty, type OracleReport } from "./oracle/compare-oracle";
import {
    type DashClass,
    isPattern,
    type PEdge,
    type PGradient,
    type PNode,
    type PScene,
    type Pt,
    type PText,
} from "./oracle/primitives";

const invert = (hex: string): string => {
    const v = parseInt(hex.slice(1, 7), 16);
    const r = (v >> 16) & 255;
    const g = (v >> 8) & 255;
    const b = v & 255;
    // far from the original whatever it is: its complement, pushed off mid gray
    const f = (c: number): number => (c < 128 ? 230 : 25);
    return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};
const scaleBox = (t: PText, k: number): void => {
    const cx = (t.box.x0 + t.box.x1) / 2;
    const cy = (t.box.y0 + t.box.y1) / 2;
    const hw = ((t.box.x1 - t.box.x0) / 2) * k;
    const hh = ((t.box.y1 - t.box.y0) / 2) * k;
    t.box = { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
};
const moveText = (t: PText, dx: number, dy: number): void => {
    t.x += dx;
    t.y += dy;
    t.box = { x0: t.box.x0 + dx, y0: t.box.y0 + dy, x1: t.box.x1 + dx, y1: t.box.y1 + dy };
};
const allTexts = (s: PScene): PText[] =>
    [
        ...s.nodes.map((n) => n.label),
        ...s.edges.map((e) => e.label),
        ...s.groups.map((g) => g.label),
        ...s.texts,
    ].filter((t): t is PText => t !== null);
const curvature = (pts: readonly Pt[]): number => {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-9) {
        return 1;
    }
    return Math.max(...pts.map(([x, y]) => Math.abs((b[0] - a[0]) * (a[1] - y) - (a[0] - x) * (b[1] - a[1])) / L)) / L;
};
const bow = (pts: readonly Pt[]): Pt[] => {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const c: Pt = [(a[0] + b[0]) / 2 - dy * 0.5, (a[1] + b[1]) / 2 + dx * 0.5];
    return Array.from({ length: 17 }, (_, i): Pt => {
        const t = i / 16;
        return [
            (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
            (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
        ];
    });
};
/** The same max deviation from the chord as the route, as one full sine period across it (an arc turned wavy). */
const sine = (pts: readonly Pt[]): Pt[] => {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(dx, dy);
    const h = curvature(pts) * L;
    return Array.from({ length: 33 }, (_, i): Pt => {
        const t = i / 32;
        const off = h * Math.sin(2 * Math.PI * t);
        return [a[0] + dx * t - (dy / L) * off, a[1] + dy * t + (dx / L) * off];
    });
};
const RED_BLUE: PGradient = {
    kind: "linear",
    angle: 0,
    stops: [
        { offset: 0, color: "#ff0000", opacity: 1 },
        { offset: 1, color: "#0000ff", opacity: 1 },
    ],
};
const swapPattern: Partial<Record<DashClass, DashClass>> = { zigzag: "sinewave", sinewave: "zigzag" };
const firstEdge = (s: PScene): PEdge | undefined => s.edges.find((e) => e.stroke !== null);
const eachNode = (f: (n: PNode) => void) => (s: PScene) => {
    s.nodes.forEach(f);
    return s;
};
const eachEdge = (f: (e: PEdge) => void) => (s: PScene) => {
    s.edges.forEach(f);
    return s;
};

const DEFECTS = {
    none: (s) => s,
    "node size x1.4": eachNode((n) => {
        n.w *= 1.4;
        n.h *= 1.4;
    }),
    "node size x3": eachNode((n) => {
        n.w *= 3;
        n.h *= 3;
    }),
    "node size x0.5": eachNode((n) => {
        n.w *= 0.5;
        n.h *= 0.5;
    }),
    "node fills one color": (s) => {
        const c = s.nodes.find((n) => n.fill !== null)?.fill?.color ?? "#888888";
        s.nodes.forEach((n) => {
            if (n.fill !== null) {
                n.fill.color = c;
            }
        });
        return s;
    },
    "node fill removed (outline only)": eachNode((n) => {
        if (n.fill !== null && n.stroke === null) {
            n.stroke = { color: n.fill.color, opacity: 1, width: 1, dash: null, dashClass: "solid" };
        }
        n.fill = null;
    }),
    "node outline black": eachNode((n) => {
        if (n.stroke !== null) {
            n.stroke.color = "#000000";
        }
    }),
    "node outline width x2": eachNode((n) => {
        if (n.stroke !== null) {
            n.stroke.width *= 2;
        }
    }),
    "node outline removed": eachNode((n) => {
        n.stroke = null;
    }),
    "node shape ellipse<->rect": eachNode((n) => {
        const swapped: Partial<Record<string, PNode["shape"]>> = {
            ellipse: "rect",
            rect: "ellipse",
            roundrect: "ellipse",
        };
        n.shape = swapped[n.shape ?? ""] ?? n.shape;
    }),
    "node outline dashed->solid": eachNode((n) => {
        if (n.stroke !== null && n.stroke.dashClass !== "solid") {
            n.stroke.dashClass = "solid";
        }
    }),
    "edge width x1.4": eachEdge((e) => {
        if (e.stroke !== null) {
            e.stroke.width *= 1.4;
        }
    }),
    "edge width x3": eachEdge((e) => {
        if (e.stroke !== null) {
            e.stroke.width *= 3;
        }
    }),
    "edge color changed on one edge": (s) => {
        const e = firstEdge(s);
        if (e?.stroke) {
            e.stroke.color = invert(e.stroke.color);
        }
        return s;
    },
    "edge dashed->solid": eachEdge((e) => {
        if (e.stroke !== null && e.stroke.dashClass === "dashed") {
            e.stroke.dashClass = "solid";
        }
    }),
    "edge pattern (zigzag, sine wave, double, slashes, arrows) drawn solid": eachEdge((e) => {
        if (e.stroke !== null && isPattern(e.stroke.dashClass)) {
            e.stroke.dashClass = "solid";
            e.stroke.patterned = false;
        }
    }),
    "edge dotted->dashed": eachEdge((e) => {
        if (e.stroke !== null && e.stroke.dashClass === "dotted") {
            e.stroke.dashClass = "dashed";
        }
    }),
    "curved edges straightened": eachEdge((e) => {
        if (curvature(e.points) > 0.04) {
            e.points = [e.points[0], e.points[e.points.length - 1]];
        }
    }),
    "straight edges bowed": eachEdge((e) => {
        if (curvature(e.points) <= 0.04) {
            e.points = bow(e.points);
        }
    }),
    "arrowheads x2": eachEdge((e) => {
        e.arrows.forEach((a) => {
            a.length *= 2;
            a.width *= 2;
        });
    }),
    "arrowhead removed at target end": eachEdge((e) => {
        e.arrows = e.arrows.filter((a) => a.end !== "target");
    }),
    "arrowhead shape changed (same extent, filled flipped)": eachEdge((e) => {
        e.arrows.forEach((a) => {
            a.filled = !a.filled;
        });
    }),
    "arrowhead shape changed (triangle<->circle: length=width)": eachEdge((e) => {
        e.arrows.forEach((a) => {
            a.length = a.width;
            a.shape = a.shape === "circle" ? "triangle" : "circle";
        });
    }),
    "labels x1.5": (s) => {
        allTexts(s).forEach((t) => {
            t.sizePx *= 1.5;
            scaleBox(t, 1.5);
        });
        return s;
    },
    "labels bold (or bold->normal)": (s) => {
        allTexts(s).forEach((t) => {
            t.weight = t.weight < 550 ? 700 : 400;
        });
        return s;
    },
    "label color changed": (s) => {
        allTexts(s).forEach((t) => {
            t.color = invert(t.color);
        });
        return s;
    },
    "label rotated 30deg": (s) => {
        allTexts(s).forEach((t) => {
            t.rotation += 30;
        });
        return s;
    },
    "node labels moved above node": eachNode((n) => {
        if (n.label !== null) {
            moveText(n.label, 0, -(n.h / 2 + (n.label.box.y1 - n.label.box.y0) / 2 + 2));
        }
    }),
    "edge labels moved 40px off the line": eachEdge((e) => {
        if (e.label !== null) {
            moveText(e.label, 0, 40);
        }
    }),
    "node gradient added": eachNode((n) => {
        if (n.fill !== null && n.fill.gradient === null) {
            n.fill.gradient = structuredClone(RED_BLUE);
        }
    }),
    "node gradient removed": eachNode((n) => {
        if (n.fill?.gradient) {
            n.fill.gradient = null;
        }
    }),
    "edge gradient added": eachEdge((e) => {
        if (e.stroke !== null && !e.stroke.gradient) {
            e.stroke.gradient = structuredClone(RED_BLUE);
        }
    }),
    "edge pattern swapped (zigzag<->sine wave)": eachEdge((e) => {
        const to = e.stroke === null ? undefined : swapPattern[e.stroke.dashClass];
        if (e.stroke !== null && to !== undefined) {
            e.stroke.dashClass = to;
        }
    }),
    "edge dashed->dotted": eachEdge((e) => {
        if (e.stroke !== null && e.stroke.dashClass === "dashed") {
            e.stroke.dashClass = "dotted";
        }
    }),
    "curved edges drawn as sine waves (arc->sine)": eachEdge((e) => {
        if (curvature(e.points) > 0.04) {
            e.points = sine(e.points);
        }
    }),
    "label background added": (s) => {
        allTexts(s).forEach((t) => {
            if (!t.background) {
                const pad = t.sizePx * 0.3;
                t.background = {
                    box: { x0: t.box.x0 - pad, y0: t.box.y0 - pad, x1: t.box.x1 + pad, y1: t.box.y1 + pad },
                    fill: { color: "#ff00ff", opacity: 1, gradient: null },
                    stroke: null,
                    shape: "rect",
                };
            }
        });
        return s;
    },
    "label outline added": (s) => {
        allTexts(s).forEach((t) => {
            if (!t.outline) {
                t.outline = { color: "#ff00ff", opacity: 1, width: Math.max(2, t.sizePx * 0.15) };
            }
        });
        return s;
    },
    "label font family swapped (serif<->sans-serif)": (s) => {
        allTexts(s).forEach((t) => {
            t.family = browserFontClass(t.family) === "serif" ? "sans-serif" : "serif";
        });
        return s;
    },
    "edge labels slid 30% along the line": eachEdge((e) => {
        const [a, b] = [e.points[0], e.points[e.points.length - 1]];
        if (e.label !== null && Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-9) {
            moveText(e.label, (b[0] - a[0]) * 0.3, (b[1] - a[1]) * 0.3);
        }
    }),
    "label opacity 0.5": (s) => {
        allTexts(s).forEach((t) => {
            t.opacity *= 0.5;
        });
        return s;
    },
    "one node deleted": (s) => {
        s.nodes.splice(0, 1);
        return s;
    },
    "one extra node added": (s) => {
        const n = s.nodes[0];
        if (n !== undefined) {
            s.nodes.push({
                ...structuredClone(n),
                id: "zz-mutant-extra",
                cx: s.width * 0.05,
                cy: s.height * 0.05,
                label: null,
            });
        }
        return s;
    },
    "one edge deleted": (s) => {
        s.edges.splice(0, 1);
        return s;
    },
    "one extra edge added": (s) => {
        const [a, b] = [s.nodes[0], s.nodes[s.nodes.length - 1]];
        const e = firstEdge(s);
        if (a !== undefined && b !== undefined && e !== undefined) {
            s.edges.push({
                ...structuredClone(e),
                id: "zz-mutant-extra-edge",
                source: a.id,
                target: b.id,
                points: [
                    [a.cx, a.cy],
                    [b.cx, b.cy],
                ],
                label: null,
            });
        }
        return s;
    },
    "whole drawing mirrored": (s) => {
        const W = s.width;
        const fx = (x: number): number => W - x;
        const fb = (b: { x0: number; x1: number }): void => {
            [b.x0, b.x1] = [fx(b.x1), fx(b.x0)];
        };
        s.nodes.forEach((n) => {
            n.cx = fx(n.cx);
        });
        s.edges.forEach((e) => {
            e.points = e.points.map(([x, y]): Pt => [fx(x), y]);
        });
        s.groups.forEach((g) => fb(g.box));
        s.strays.forEach((g) => fb(g.box));
        allTexts(s).forEach((t) => {
            t.x = fx(t.x);
            fb(t.box);
            t.rotation = -t.rotation;
        });
        return s;
    },
    "node opacity 0.5": eachNode((n) => {
        if (n.fill !== null) {
            n.fill.opacity *= 0.5;
        }
        if (n.stroke !== null) {
            n.stroke.opacity *= 0.5;
        }
    }),
    "edge opacity 0.5": eachEdge((e) => {
        if (e.stroke !== null) {
            e.stroke.opacity *= 0.5;
        }
    }),
    "group box removed": (s) => {
        s.groups = [];
        return s;
    },
    "group box label removed": (s) => {
        s.groups.forEach((g) => {
            g.label = null;
        });
        return s;
    },
    "canvas background changed": (s) => {
        s.background = s.background === "#202040" ? "#ffffff" : "#202040";
        return s;
    },
} satisfies Record<string, (s: PScene) => PScene>;

/**
 * What each planted defect is for: the properties a reader would see it in. A defect landing only on elements that
 * already fail one of these tests nothing there (`absorbedByKnownFailures`).
 */
const TARGETS: Record<keyof typeof DEFECTS, readonly OracleProperty[]> = {
    none: [],
    "node size x1.4": ["node.width", "node.height", "node.sizeToSpacing", "node.sizeToExtent"],
    "node size x3": ["node.width", "node.height", "node.sizeToSpacing", "node.sizeToExtent"],
    "node size x0.5": ["node.width", "node.height", "node.sizeToSpacing", "node.sizeToExtent"],
    "node fills one color": ["node.fill", "node.gradient"],
    "node fill removed (outline only)": ["node.fill", "node.fillOpacity", "node.gradient", "node.stroke"],
    "node outline black": ["node.stroke"],
    "node outline width x2": ["node.strokeWidth", "node.width", "node.height"],
    "node outline removed": ["node.stroke", "node.strokeWidth", "node.strokeDash"],
    "node shape ellipse<->rect": ["node.shape"],
    "node outline dashed->solid": ["node.strokeDash"],
    "edge width x1.4": ["edge.width"],
    "edge width x3": ["edge.width"],
    "edge color changed on one edge": ["edge.color", "edge.gradient", "edge.extra"],
    "edge dashed->solid": ["edge.dash"],
    "edge pattern (zigzag, sine wave, double, slashes, arrows) drawn solid": ["edge.dash"],
    "edge dotted->dashed": ["edge.dash"],
    "curved edges straightened": ["edge.route", "edge.curve"],
    "straight edges bowed": ["edge.route", "edge.curve"],
    "arrowheads x2": ["edge.arrowLength", "edge.arrowWidth", "edge.arrowToSpacing"],
    "arrowhead removed at target end": ["edge.arrow"],
    "arrowhead shape changed (same extent, filled flipped)": ["edge.arrowFill", "edge.arrowShape"],
    "arrowhead shape changed (triangle<->circle: length=width)": ["edge.arrowShape", "edge.arrowLength"],
    "labels x1.5": ["label.size"],
    "labels bold (or bold->normal)": ["label.weight"],
    "label color changed": ["label.color"],
    "label rotated 30deg": ["label.rotation"],
    "node labels moved above node": ["label.offset", "label.anchor"],
    "edge labels moved 40px off the line": ["label.offLine", "label.alongLine"],
    "node gradient added": ["node.gradient"],
    "node gradient removed": ["node.gradient"],
    "edge gradient added": ["edge.gradient"],
    "edge pattern swapped (zigzag<->sine wave)": ["edge.dash"],
    "edge dashed->dotted": ["edge.dash"],
    "curved edges drawn as sine waves (arc->sine)": ["edge.route", "edge.curve"],
    "label background added": ["label.background", "label.backgroundBox", "label.backgroundBorder"],
    "label outline added": ["label.outline"],
    "label font family swapped (serif<->sans-serif)": ["label.family"],
    "edge labels slid 30% along the line": ["label.alongLine", "label.offLine"],
    "label opacity 0.5": ["label.opacity"],
    "one node deleted": ["node.present"],
    "one extra node added": ["node.extra"],
    "one edge deleted": ["edge.present", "edge.extra"],
    "one extra edge added": ["edge.extra"],
    "whole drawing mirrored": ["frame.mirror", "node.position"],
    "node opacity 0.5": ["node.fillOpacity"],
    "edge opacity 0.5": ["edge.opacity"],
    "group box removed": ["group.present"],
    "group box label removed": ["group.label"],
    "canvas background changed": ["background"],
};

/**
 * Where a defect can be planted at all. A mirror is told only between related layouts: where graphty lays the graph
 * out itself (a file with no positions), its drawing mirrored is another layout as unrelated as the first.
 */
const APPLIES: Partial<Record<keyof typeof DEFECTS, (base: OracleReport) => boolean>> = {
    "whole drawing mirrored": (base) => base.transform !== null && !base.transform.unrelatedLayout,
};

/** A planted defect: what it does to graphty's drawing, the properties it is for, and where it can be planted. */
interface Mutation {
    readonly mutate: (s: PScene) => PScene;
    readonly targets: readonly OracleProperty[];
    readonly applies: (base: OracleReport) => boolean;
}

/** The planted defects, by name. */
export const MUTATIONS: Readonly<Record<string, Mutation>> = Object.fromEntries(
    Object.entries(DEFECTS).map(([name, mutate]) => {
        const k = name as keyof typeof DEFECTS;
        return [name, { mutate, targets: TARGETS[k], applies: APPLIES[k] ?? (() => true) }];
    }),
);

/**
 * Whether a planted defect lands only on elements the unplanted comparison already fails in a property the defect is
 * for: the floors list each failing element once per property, so there is nothing new to catch there, and the
 * defect tests nothing on that sample. A change to the scene as a whole (its background, its free texts and shapes)
 * is never absorbed, nor is an element the defect adds.
 * @param before - graphty's drawn primitives
 * @param after - the same with the defect planted
 * @param base - the unplanted comparison
 * @param targets - the properties the defect is for
 * @returns true when every element the defect changed or removed already fails one of them
 */
export function absorbedByKnownFailures(
    before: PScene,
    after: PScene,
    base: OracleReport,
    targets: readonly OracleProperty[],
): boolean {
    const same = (k: "background" | "texts" | "strays" | "width" | "height"): boolean =>
        JSON.stringify(before[k]) === JSON.stringify(after[k]);
    if (!(["background", "texts", "strays", "width", "height"] as const).every(same)) {
        return false;
    }
    const KIND = { nodes: "node", edges: "edge", groups: "group" } as const;
    const failing = new Map(base.elements.map((e) => [`${e.kind}\u0000${e.id}`, e.failed]));
    const fails = (kind: "nodes" | "edges" | "groups", gid: string): boolean => {
        const k = KIND[kind];
        const oid = base.paired[kind][gid] as string | undefined;
        // an element graphty draws that the oracle has no counterpart for already fails as an extra one, and nothing
        // else of it is judged
        if (oid === undefined) {
            return failing.has(`${k}\u0000graphty:${gid}`);
        }
        return [oid, `${k}:${oid}`, `${oid}@source`, `${oid}@target`].some(
            (id) => failing.get(`${k}\u0000${id}`)?.some((p) => targets.includes(p)) === true,
        );
    };
    return (["nodes", "edges", "groups"] as const).every((kind) => {
        const was = new Map<string, string>(before[kind].map((x) => [x.id, JSON.stringify(x)]));
        const now = new Map<string, string>(after[kind].map((x) => [x.id, JSON.stringify(x)]));
        const changed = [...new Set([...was.keys(), ...now.keys()])].filter((id) => was.get(id) !== now.get(id));
        return changed.every((id) => was.has(id) && fails(kind, id));
    });
}
