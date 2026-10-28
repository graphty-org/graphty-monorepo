/**
 * Planted defects for the oracle comparator's planted-defect test (mutants.test.ts): each takes graphty's drawn
 * primitives and returns them with one visual defect, the way a broken importer or renderer would draw them.
 */
import {
    browserFace,
    browserFontClass,
    lineAlign,
    type OracleProperty,
    type OracleReport,
    programFace,
} from "./oracle/compare-oracle";
import {
    type DashClass,
    isPattern,
    type PEdge,
    type PGradient,
    type PNode,
    type PScene,
    type PStroke,
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
/**
 * A line drawn in another dash class: its class and the dash array it is drawn with, which the comparison reads again
 * at the oracle's scale (a class with no dash array to back it is not what a renderer would draw).
 * @param st - the stroke
 * @param to - the class to draw it in
 */
const redash = (st: PStroke, to: "solid" | "dashed" | "dotted"): void => {
    const w = st.width;
    st.dashClass = to;
    st.dash = { solid: null, dashed: [4 * w + 6, 3 * w + 4], dotted: [w, 2 * w + 2] }[to];
};
const firstEdge = (s: PScene): PEdge | undefined => s.edges.find((e) => e.stroke !== null);
const eachNode = (f: (n: PNode) => void) => (s: PScene) => {
    s.nodes.forEach(f);
    return s;
};
const eachEdge = (f: (e: PEdge) => void) => (s: PScene) => {
    s.edges.forEach(f);
    return s;
};

/**
 * The whole drawing turned and scaled about the canvas center: every point, box and size, as a renderer that framed
 * the drawing wrong would draw it.
 * @param s - graphty's drawn primitives
 * @param deg - the turn, clockwise on screen
 * @param k - the scale
 * @returns the same scene
 */
const reframe = (s: PScene, deg: number, k: number): PScene => {
    const [cx0, cy0] = [s.width / 2, s.height / 2];
    const [c, sn] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
    const at = ([x, y]: Pt): Pt => [
        cx0 + k * (c * (x - cx0) - sn * (y - cy0)),
        cy0 + k * (sn * (x - cx0) + c * (y - cy0)),
    ];
    const box = (b: { x0: number; y0: number; x1: number; y1: number }): void => {
        const [mx, my] = at([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]);
        const [hw, hh] = [((b.x1 - b.x0) / 2) * k, ((b.y1 - b.y0) / 2) * k];
        Object.assign(b, { x0: mx - hw, y0: my - hh, x1: mx + hw, y1: my + hh });
    };
    s.nodes.forEach((n) => {
        [n.cx, n.cy] = at([n.cx, n.cy]);
        n.w *= k;
        n.h *= k;
    });
    s.edges.forEach((e) => {
        e.points = e.points.map(at);
        e.arrows.forEach((a) => {
            a.length *= k;
            a.width *= k;
        });
    });
    s.groups.forEach((g) => box(g.box));
    s.strays.forEach((g) => box(g.box));
    allTexts(s).forEach((t) => {
        [t.x, t.y] = at([t.x, t.y]);
        box(t.box);
        t.lines?.forEach(box);
        t.sizePx *= k;
        t.rotation += deg;
    });
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
    "node outline opacity 0.3": eachNode((n) => {
        if (n.stroke !== null) {
            n.stroke.opacity *= 0.3;
        }
    }),
    "node outer ring removed": eachNode((n) => {
        n.ring = null;
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
            redash(e.stroke, "solid");
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
            redash(e.stroke, "dashed");
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
    "edge gradient removed": eachEdge((e) => {
        if (e.stroke?.gradient) {
            e.stroke.gradient = null;
        }
    }),
    "label background removed": (s) => {
        allTexts(s).forEach((t) => {
            t.background = null;
        });
        return s;
    },
    "label outline removed": (s) => {
        allTexts(s).forEach((t) => {
            t.outline = null;
        });
        return s;
    },
    "edge pattern swapped (zigzag<->sine wave)": eachEdge((e) => {
        const to = e.stroke === null ? undefined : swapPattern[e.stroke.dashClass];
        if (e.stroke !== null && to !== undefined) {
            e.stroke.dashClass = to;
        }
    }),
    "edge dashed->dotted": eachEdge((e) => {
        if (e.stroke !== null && e.stroke.dashClass === "dashed") {
            redash(e.stroke, "dotted");
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
    "labels x1.25": (s) => {
        // past the whole font size band (0.9 to 1.11), so a label already drawn at its edge still leaves it
        allTexts(s).forEach((t) => {
            t.sizePx *= 1.25;
            scaleBox(t, 1.25);
        });
        return s;
    },
    "label face swapped within its class (DejaVu<->Liberation)": (s) => {
        allTexts(s).forEach((t) => {
            const f = browserFace(t.family);
            const other: Partial<Record<string, string>> = {
                "sans-serif": f === "dejavu sans" ? "Liberation Sans" : "DejaVu Sans",
                serif: f === "dejavu serif" ? "Liberation Serif" : "DejaVu Serif",
                monospace: f === "dejavu sans mono" ? "Liberation Mono" : "DejaVu Sans Mono",
            };
            t.family = other[browserFontClass(t.family)] ?? t.family;
        });
        return s;
    },
    "label outline opacity 0.5": (s) => {
        allTexts(s).forEach((t) => {
            if (t.outline) {
                t.outline.opacity *= 0.5;
            }
        });
        return s;
    },
    "label background opacity 0.5": (s) => {
        allTexts(s).forEach((t) => {
            if (t.background?.fill) {
                t.background.fill.opacity *= 0.5;
            }
        });
        return s;
    },
    "label background border opacity 0.5": (s) => {
        allTexts(s).forEach((t) => {
            if (t.background?.stroke) {
                t.background.stroke.opacity *= 0.5;
            }
        });
        return s;
    },
    "edge outline removed": eachEdge((e) => {
        e.outline = null;
    }),
    "edge outline added": eachEdge((e) => {
        if (!e.outline && e.stroke !== null) {
            e.outline = { color: "#ff00ff", opacity: 1, width: e.stroke.width * 3 + 4 };
        }
    }),
    "edge outline width x2": eachEdge((e) => {
        if (e.outline) {
            e.outline.width *= 2;
        }
    }),
    "middle arrowheads removed": eachEdge((e) => {
        e.arrows = e.arrows.filter((a) => a.end !== "middle");
    }),
    "group outline opacity 0.5": (s) => {
        s.groups.forEach((g) => {
            if (g.stroke !== null) {
                g.stroke.opacity *= 0.5;
            }
        });
        return s;
    },
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
    "labels italic (or italic->normal)": (s) => {
        allTexts(s).forEach((t) => {
            t.style = t.style === "normal" ? "italic" : "normal";
        });
        return s;
    },
    "label words changed": (s) => {
        // not a specimen sheet's captions, whose words are what the comparison leaves out by
        const captions = new Set([
            ...s.nodes.filter((n) => n.id.startsWith("cap-")).map((n) => n.label),
            ...s.texts.filter((t) => t.owner?.startsWith("cap-") === true),
        ]);
        allTexts(s).forEach((t) => {
            if (!captions.has(t)) {
                t.content = `${t.content} zq`;
            }
        });
        return s;
    },
    "label lines aligned the other way": (s) => {
        // a label of two lines or more, unless its words break into lines of one length (alignment does not show
        // there): as graphty declares it, else as its lines show it
        allTexts(s).forEach((t) => {
            const lengths = t.content.split("\n").map((l) => l.trim().length);
            // ponytail: lines told apart by letter count (the comparison asks half a font size of width, about one
            // letter); a reading of graphty's own line widths would be exact, but its line boxes are all the label's
            const even = lengths.length >= 2 && Math.max(...lengths) - Math.min(...lengths) < 3;
            if ((t.lines?.length ?? 0) >= 2 && !even) {
                t.align = (t.align ?? lineAlign(t)) === "start" ? "end" : "start";
            }
        });
        return s;
    },
    "label background border added": (s) => {
        allTexts(s).forEach((t) => {
            if (t.background && t.background.stroke === null) {
                t.background.stroke = {
                    color: "#ff00ff",
                    opacity: 1,
                    width: Math.max(2, t.sizePx * 0.2),
                    dash: null,
                    dashClass: "solid",
                };
            }
        });
        return s;
    },
    "arrowhead color changed": eachEdge((e) => {
        e.arrows.forEach((a) => {
            if (a.color !== null) {
                a.color = invert(a.color);
            }
        });
    }),
    "group fill color changed": (s) => {
        s.groups.forEach((g) => {
            if (g.fill !== null) {
                g.fill.color = invert(g.fill.color);
            }
        });
        return s;
    },
    "label lines joined onto one": (s) => {
        allTexts(s).forEach((t) => {
            if ((t.lines?.length ?? 0) >= 2) {
                t.content = t.content.replace(/\s*\n\s*/g, " ");
                t.lines = [{ ...t.box }];
            }
        });
        return s;
    },
    "group box grown by half": (s) => {
        s.groups.forEach((g) => {
            const [hw, hh] = [(g.box.x1 - g.box.x0) / 4, (g.box.y1 - g.box.y0) / 4];
            g.box = { x0: g.box.x0 - hw, y0: g.box.y0 - hh, x1: g.box.x1 + hw, y1: g.box.y1 + hh };
        });
        return s;
    },
    "group outline removed": (s) => {
        s.groups.forEach((g) => {
            g.stroke = null;
        });
        return s;
    },
    "group outline width x3": (s) => {
        s.groups.forEach((g) => {
            if (g.stroke !== null) {
                g.stroke.width *= 3;
            }
        });
        return s;
    },
    "group outline dashed (or dashed->solid)": (s) => {
        s.groups.forEach((g) => {
            if (g.stroke !== null) {
                g.stroke.dashClass = g.stroke.dashClass === "solid" ? "dashed" : "solid";
            }
        });
        return s;
    },
    "group opacity 0.5": (s) => {
        s.groups.forEach((g) => {
            if (g.fill !== null) {
                g.fill.opacity *= 0.5;
            }
        });
        return s;
    },
    "one extra group box": (s) => {
        const g = s.groups[0];
        if (g !== undefined) {
            const [w, h] = [g.box.x1 - g.box.x0, g.box.y1 - g.box.y0];
            s.groups.push({
                ...structuredClone(g),
                id: "zz-mutant-extra-group",
                box: { x0: s.width * 0.02, y0: s.height * 0.02, x1: s.width * 0.02 + w, y1: s.height * 0.02 + h },
                label: null,
                members: [],
            });
        }
        return s;
    },
    "annotations removed": (s) => {
        s.strays = [];
        return s;
    },
    "one extra annotation added": (s) => {
        s.strays.push({
            index: s.strays.length,
            tag: "annotation-shape",
            kind: "shape",
            box: { x0: s.width * 0.45, y0: s.height * 0.01, x1: s.width * 0.55, y1: s.height * 0.05 },
            fill: null,
            stroke: null,
            text: null,
        });
        return s;
    },
    "whole drawing turned 20deg": (s) => reframe(s, 20, 1),
    "whole drawing zoomed x1.5": (s) => reframe(s, 0, 1.5),
    "one node moved twice its size": (s) => {
        // a node in the middle of the list, never a specimen sheet's corner anchor (which fixes its frame) or caption
        const specimens = s.nodes.filter((x) => !x.id.startsWith("anchor-") && !x.id.startsWith("cap-"));
        const n = specimens[Math.floor(specimens.length / 2)];
        if (n !== undefined) {
            const d = 2 * Math.max(n.w, n.h, 10);
            n.cx += d;
            if (n.label !== null) {
                moveText(n.label, d, 0);
            }
        }
        return s;
    },
} satisfies Record<string, (s: PScene) => PScene>;

/**
 * What each planted defect is for: the property a reader would see it in first, then any others it shows in, and
 * those it is judged only after (a gradient or an opacity once both sides fill the node, an arrowhead's size once both
 * sides draw it, a label's dress once both draw the label). A defect landing only on elements that already fail one
 * of these tests nothing there (`absorbedByKnownFailures`).
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
    "node outline dashed->solid": ["node.strokeDash", "node.stroke"],
    "node outline opacity 0.3": ["node.stroke"],
    "node outer ring removed": ["node.ring"],
    "edge width x1.4": ["edge.width"],
    "edge width x3": ["edge.width"],
    "edge color changed on one edge": ["edge.color", "edge.gradient", "edge.extra"],
    "edge dashed->solid": ["edge.dash"],
    "edge pattern (zigzag, sine wave, double, slashes, arrows) drawn solid": ["edge.dash"],
    "edge dotted->dashed": ["edge.dash"],
    "curved edges straightened": ["edge.route", "edge.curve"],
    "straight edges bowed": ["edge.route", "edge.curve"],
    "arrowheads x2": ["edge.arrow", "edge.arrowLength", "edge.arrowWidth", "edge.arrowToSpacing"],
    "arrowhead removed at target end": ["edge.arrow"],
    "arrowhead shape changed (same extent, filled flipped)": ["edge.arrow", "edge.arrowFill", "edge.arrowShape"],
    "arrowhead shape changed (triangle<->circle: length=width)": ["edge.arrow", "edge.arrowShape", "edge.arrowLength"],
    "labels x1.5": ["label.size", "label.present", "edge.label", "group.label"],
    "labels bold (or bold->normal)": ["label.weight", "label.present", "edge.label", "group.label"],
    "label color changed": ["label.color", "label.present", "edge.label", "group.label"],
    "label rotated 30deg": ["label.rotation", "label.present", "edge.label", "group.label"],
    "node labels moved above node": ["label.offset", "label.anchor", "label.present", "edge.label", "group.label"],
    "edge labels moved 40px off the line": ["label.offLine", "label.alongLine", "edge.label"],
    "node gradient added": ["node.gradient", "node.fill"],
    "node gradient removed": ["node.gradient", "node.fill"],
    "edge gradient added": ["edge.gradient", "edge.color"],
    "edge gradient removed": ["edge.gradient", "edge.color"],
    "label background removed": [
        "label.background",
        "label.backgroundBox",
        "label.backgroundBorder",
        "label.present",
        "edge.label",
        "group.label",
    ],
    "label outline removed": ["label.outline", "label.present", "edge.label", "group.label"],
    "edge pattern swapped (zigzag<->sine wave)": ["edge.dash"],
    "edge dashed->dotted": ["edge.dash"],
    "curved edges drawn as sine waves (arc->sine)": ["edge.route", "edge.curve"],
    "label background added": [
        "label.background",
        "label.backgroundBox",
        "label.backgroundBorder",
        "label.present",
        "edge.label",
        "group.label",
    ],
    "label outline added": ["label.outline", "label.present", "edge.label", "group.label"],
    "label font family swapped (serif<->sans-serif)": ["label.family", "label.present", "edge.label", "group.label"],
    "edge labels slid 30% along the line": ["label.alongLine", "label.offLine", "edge.label"],
    "labels x1.25": ["label.size", "label.present", "edge.label", "group.label"],
    "label face swapped within its class (DejaVu<->Liberation)": [
        "label.family",
        "label.present",
        "edge.label",
        "group.label",
    ],
    "label outline opacity 0.5": ["label.outline", "label.present", "edge.label", "group.label"],
    "label background opacity 0.5": ["label.background", "label.present", "edge.label", "group.label"],
    "label background border opacity 0.5": ["label.backgroundBorder", "label.present", "edge.label", "group.label"],
    "edge outline removed": ["edge.outline"],
    "edge outline added": ["edge.outline"],
    "edge outline width x2": ["edge.outline"],
    "middle arrowheads removed": ["edge.arrow"],
    "group outline opacity 0.5": ["group.stroke"],
    "label opacity 0.5": ["label.opacity", "label.present", "edge.label", "group.label"],
    "one node deleted": ["node.present"],
    "one extra node added": ["node.extra"],
    "one edge deleted": ["edge.present", "edge.extra"],
    "one extra edge added": ["edge.extra"],
    "whole drawing mirrored": ["frame.mirror", "node.position"],
    "node opacity 0.5": ["node.fillOpacity", "node.fill", "node.stroke"],
    "edge opacity 0.5": ["edge.opacity"],
    "group box removed": ["group.present"],
    "group box label removed": ["group.label"],
    "canvas background changed": ["background"],
    "labels italic (or italic->normal)": ["label.style", "label.present", "edge.label", "group.label"],
    "label words changed": ["label.text", "label.present", "edge.label", "group.label"],
    "label lines aligned the other way": ["label.align", "label.lines", "label.present", "edge.label", "group.label"],
    "label background border added": ["label.backgroundBorder", "label.present", "edge.label", "group.label"],
    "arrowhead color changed": ["edge.arrowColor", "edge.arrow"],
    "group fill color changed": ["group.fill"],
    "one node moved twice its size": ["node.position", "node.present", "node.extra"],
    "label lines joined onto one": ["label.lines", "label.align", "label.present", "edge.label", "group.label"],
    "group box grown by half": ["group.box", "group.present"],
    "group outline removed": ["group.stroke", "group.strokeWidth", "group.strokeDash"],
    "group outline width x3": ["group.strokeWidth", "group.stroke"],
    "group outline dashed (or dashed->solid)": ["group.strokeDash", "group.stroke"],
    "group opacity 0.5": ["group.fillOpacity", "group.fill"],
    "one extra group box": ["group.extra"],
    "annotations removed": ["stray.present"],
    "one extra annotation added": ["stray.extra"],
    "whole drawing turned 20deg": ["frame.rotation", "node.position"],
    "whole drawing zoomed x1.5": ["frame.zoom"],
};

/**
 * Where a defect can be planted at all. A mirror is told only between related layouts: where graphty lays the graph
 * out itself (a file with no positions), its drawing mirrored is another layout as unrelated as the first.
 */
const APPLIES: Partial<Record<keyof typeof DEFECTS, (base: OracleReport, oracle: PScene) => boolean>> = {
    "whole drawing mirrored": (base) => base.transform !== null && !base.transform.unrelatedLayout,
    "whole drawing turned 20deg": (base) => base.transform !== null && !base.transform.unrelatedLayout,
    // a face is told only where the program names one the pinned fonts carry; elsewhere only its class is
    "label face swapped within its class (DejaVu<->Liberation)": (_base, oracle) =>
        allTexts(oracle).some((t) => programFace(t.family) !== null),
};

/** A planted defect: what it does to graphty's drawing, the properties it is for, and where it can be planted. */
interface Mutation {
    readonly mutate: (s: PScene) => PScene;
    readonly targets: readonly OracleProperty[];
    readonly applies: (base: OracleReport, oracle: PScene) => boolean;
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
 * defect tests nothing on that sample. A change to the scene's free texts is never absorbed, nor is an element or an
 * annotation the defect adds or changes, nor one it removes that the oracle draws something under; one for the
 * drawing as a whole (its background, its zoom) is, where the comparison already fails the drawing in it.
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
    // a defect for the drawing as a whole (its background, its frame) lands on one element of its own, the graph
    const whole = (p: OracleProperty): boolean => p === "background" || p.startsWith("frame.");
    if (targets.length > 0 && targets.every(whole) && targets.some((p) => (base.failures[p]?.length ?? 0) > 0)) {
        return true;
    }
    const same = (k: "background" | "texts" | "width" | "height"): boolean =>
        JSON.stringify(before[k]) === JSON.stringify(after[k]);
    if (!(["background", "texts", "width", "height"] as const).every(same)) {
        return false;
    }
    const KIND = { nodes: "node", edges: "edge", groups: "group" } as const;
    const failing = new Map(base.elements.map((e) => [`${e.kind}\u0000${e.id}`, e.failed]));
    // an annotation of graphty's the oracle draws nothing under already fails as an extra one: removing only those
    // tests nothing; adding or changing one, or removing one the oracle draws, does
    const extraStrays = new Set(base.failures["stray.extra"] ?? []);
    const strayKey = (x: PScene["strays"][number]): string => JSON.stringify(x);
    const [had, kept] = [new Set(before.strays.map(strayKey)), new Set(after.strays.map(strayKey))];
    if (
        after.strays.some((x) => !had.has(strayKey(x))) ||
        before.strays.some((x) => !kept.has(strayKey(x)) && !extraStrays.has(`graphty:${x.tag}#${String(x.index)}`))
    ) {
        return false;
    }
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
