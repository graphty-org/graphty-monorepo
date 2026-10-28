/**
 * Planted defects for the oracle comparator's planted-defect test (mutants.test.ts): each takes graphty's drawn
 * primitives and returns them with one visual defect, the way a broken importer or renderer would draw them.
 */
import {
    browserFace,
    browserFontClass,
    lineAlign,
    ORACLE_TOLERANCES,
    type OracleProperty,
    type OracleReport,
    programFace,
    withoutCaptions,
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
/** A route turned into a zigzag `amp` of its chord to each side, in `teeth` teeth. */
const zigzag = (pts: readonly Pt[], amp: number, teeth: number): Pt[] => {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(dx, dy);
    if (L < 1e-9) {
        return [...pts];
    }
    return Array.from({ length: 2 * teeth + 1 }, (_, i): Pt => {
        const t = i / (2 * teeth);
        const off = i === 0 || i === 2 * teeth ? 0 : (i % 2 === 1 ? 1 : -1) * amp * L;
        return [a[0] + dx * t - (dy / L) * off, a[1] + dy * t + (dx / L) * off];
    });
};
/** The middle one of a scene's nodes, never a specimen sheet's corner anchor (which fixes its frame) or caption. */
const middleNode = (s: PScene): PNode | undefined => {
    const specimens = s.nodes.filter((x) => !x.id.startsWith("anchor-") && !x.id.startsWith("cap-"));
    return specimens[Math.floor(specimens.length / 2)];
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
    // what only a comparison that knows which body is which node catches: the same fills, on the wrong nodes
    "two nodes' fills swapped": (s) => {
        const a = s.nodes.find((n) => n.fill !== null);
        const b = s.nodes.find((n) => n.fill !== null && n.fill.color !== a?.fill?.color);
        if (a?.fill && b?.fill) {
            [a.fill.color, b.fill.color] = [b.fill.color, a.fill.color];
        }
        return s;
    },
    // a disc drawn in a corner of a later, larger disc's box but outside the disc shows there (json-graphology-synth n66
    // by n77): the comparison must not read it as painted over by the later one
    "disc in a later disc's box corner removed": (s) => {
        const round = (n: PNode): boolean => n.shape === "ellipse";
        // under an opaque one, which would paint over a disc it held
        const inCorner = (n: PNode, m: PNode): boolean =>
            (m.fill?.opacity ?? 0) >= 0.99 &&
            Math.abs(n.cx - m.cx) + n.w / 2 <= m.w / 2 &&
            Math.abs(n.cy - m.cy) + n.h / 2 <= m.h / 2 &&
            Math.hypot(n.cx - m.cx, n.cy - m.cy) + n.w / 2 > m.w / 2 + 1;
        const gone = new Set(
            s.nodes
                .filter((n, i) => round(n) && s.nodes.slice(i + 1).some((m) => round(m) && inCorner(n, m)))
                .map((n) => n.id),
        );
        s.nodes = s.nodes.filter((n) => !gone.has(n.id));
        return s;
    },
    "node fill removed (outline only)": eachNode((n) => {
        if (n.fill !== null && n.stroke === null) {
            n.stroke = { color: n.fill.color, opacity: 1, width: 1, dash: null, dashClass: "solid" };
        }
        n.fill = null;
    }),
    // every label shown whatever its node's size on screen: the node-size rule (sigma's labelRenderedSizeThreshold,
    // its label grid) lost
    "node-size label rule ignored": eachNode((n) => {
        if (n.sizedLabel !== undefined) {
            n.sizedLabel.min = 0;
            n.label = n.sizedLabel.label;
        }
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
    // the edge from a node to one drawn after it over its whole box, which the program's drawing shows nothing of
    // (pajek-1crn: 27 under 28): the comparison pairs it by the end the association names after graphty's node
    "edge under the node it ends at recolored": (s) => {
        const under = (n: PNode, m: PNode): boolean =>
            s.nodes.indexOf(n) < s.nodes.indexOf(m) &&
            Math.abs(n.cx - m.cx) + n.w / 2 <= m.w / 2 &&
            Math.abs(n.cy - m.cy) + n.h / 2 <= m.h / 2;
        const byId = new Map(s.nodes.map((n) => [n.id, n]));
        for (const e of s.edges) {
            const [a, b] = [byId.get(e.source), byId.get(e.target)];
            if (e.stroke !== null && a !== undefined && b !== undefined && (under(a, b) || under(b, a))) {
                e.stroke.color = invert(e.stroke.color);
            }
        }
        return s;
    },
    "edge color changed on one edge": (s) => {
        const e = firstEdge(s);
        if (e?.stroke) {
            e.stroke.color = invert(e.stroke.color);
        }
        return s;
    },
    // the edges at a node graphty draws no body for (a WikiPathways anchor, a node in the canvas's own color): the
    // comparison pairs them by where graphty's lines end (cx2-wp1449-tlr, xgmml-wp4271-cy3-export)
    "edges ending at an undrawn node recolored": (s) => {
        const drawn = new Set([...s.nodes.map((n) => n.id), ...s.groups.map((g) => g.id)]);
        for (const e of s.edges) {
            if (e.stroke !== null && (!drawn.has(e.source) || !drawn.has(e.target))) {
                e.stroke.color = invert(e.stroke.color);
            }
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
    "arrowheads x1.25": eachEdge((e) => {
        e.arrows.forEach((a) => {
            a.length *= 1.25;
            a.width *= 1.25;
        });
    }),
    "arrowheads drawn off their line's end": eachEdge((e) => {
        e.arrows.forEach((a) => {
            if (a.end !== "middle") {
                a.misplaced = 15;
            }
        });
    }),
    "longest straight edge bent off its chord by a twenty-fifth of its length": (s) => {
        const straight = s.edges.filter((e) => curvature(e.points) <= 0.01 && e.points.length >= 2);
        const chord = (e: PEdge): number => {
            const [a, b] = [e.points[0], e.points[e.points.length - 1]];
            return Math.hypot(b[0] - a[0], b[1] - a[1]);
        };
        const e = [...straight].sort((x, y) => chord(y) - chord(x))[0];
        if (e !== undefined) {
            const [a, b] = [e.points[0], e.points[e.points.length - 1]];
            const off = 0.04;
            e.points = [a, [(a[0] + b[0]) / 2 - (b[1] - a[1]) * off, (a[1] + b[1]) / 2 + (b[0] - a[0]) * off], b];
        }
        return s;
    },
    // a second part drawn behind the first, a head's length back along the line (Graphviz's normalnormal)
    "a second arrowhead part at the target end": eachEdge((e) => {
        const head = e.arrows.find((a) => a.end === "target");
        const [a, b] = [e.points.at(-2), e.points.at(-1)];
        if (head !== undefined && a !== undefined && b !== undefined) {
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const at = head.at ?? b;
            const back: Pt = [at[0] - ((b[0] - a[0]) / len) * head.length, at[1] - ((b[1] - a[1]) / len) * head.length];
            e.arrows.push({ ...head, at: back });
        }
    }),
    "edge dashes and gaps x3": eachEdge((e) => {
        if (e.stroke !== null && e.stroke.dash !== null) {
            e.stroke.dash = e.stroke.dash.map((x) => 3 * x);
        }
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
    // a notched arrow drawn as the plain triangle and back (yEd's standard, a vee, against its delta)
    "arrowhead notch filled in (vee<->triangle)": eachEdge((e) => {
        e.arrows.forEach((a) => {
            if (a.shape === "vee" || a.shape === "triangle") {
                a.shape = a.shape === "vee" ? "triangle" : "vee";
            }
        });
    }),
    // a compound arrowhead drawn as its triangle alone (Cytoscape.js's circle-triangle with its disc dropped), where the
    // comparator once read the program's drawing in pieces as no shape: json-cyjs-synth-edges-saved catches it
    "compound arrowhead's disc dropped (circle-triangle->triangle)": eachEdge((e) => {
        e.arrows.forEach((a) => {
            if (a.shape === "circle-triangle") {
                a.shape = "triangle";
            }
        });
    }),
    // a full arrowhead cut to one side on a curved line, where the comparator once read the program's full one along
    // a chord from far back on the curve and called it half (dot-profile main->fclose), so a half one passed there:
    // dot-synth-edges-clusters' loops f2->f2 and f3->f3 catch it
    "arrowheads on curved lines cut to one side (triangle->half)": eachEdge((e) => {
        if (curvature(e.points) > 0.04) {
            e.arrows.forEach((a) => {
                if (a.shape === "triangle") {
                    a.shape = "half";
                }
            });
        }
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
    "edge overlay removed": eachEdge((e) => {
        e.overlay = null;
    }),
    "edge overlay added": eachEdge((e) => {
        if (!e.overlay && e.stroke !== null) {
            e.overlay = { color: "#ff00ff", opacity: 0.5, width: e.stroke.width * 3 + 4 };
        }
    }),
    // of edges drawn on one another between one pair (Cytoscape.js's haystack edges), the widest, which the program
    // draws under the others: not an outline of the edge over it (cyjs-genemania)
    "widest of coincident edges recolored": (s) => {
        const byPair = new Map<string, PEdge[]>();
        for (const e of s.edges) {
            const k = [e.source, e.target].sort().join("\u0000");
            byPair.set(k, [...(byPair.get(k) ?? []), e]);
        }
        for (const group of byPair.values()) {
            const lined = group.filter((e) => e.stroke !== null);
            const widest = lined.sort((a, b) => (b.stroke?.width ?? 0) - (a.stroke?.width ?? 0))[0];
            const narrowest = lined.at(-1);
            if (widest?.stroke && narrowest?.stroke && widest.stroke.width >= 1.2 * narrowest.stroke.width) {
                widest.stroke.color = invert(widest.stroke.color);
            }
        }
        return s;
    },
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
    // its line runs to a node across the drawing: never paired with the oracle's edge by where it is drawn
    "one edge drawn to another node": (s) => {
        const e = firstEdge(s);
        const from = s.nodes.find((n) => n.id === e?.source);
        const to = s.nodes.find((n) => n.id === e?.target);
        if (e === undefined || from === undefined || to === undefined) {
            return s;
        }
        const away = (n: PNode): number => Math.hypot(n.cx - to.cx, n.cy - to.cy);
        const far = s.nodes.filter((n) => n !== from && n !== to).sort((a, b) => away(b) - away(a))[0];
        if (far !== undefined) {
            e.target = far.id;
            e.points = [
                [from.cx, from.cy],
                [far.cx, far.cy],
            ];
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
    // the caps of a line drawn in pieces: a line the program stops a piece of its pattern short of its cap (Cytoscape
    // desktop's zigzag, sine wave, slashes), its cap judged only once the comparator pairs that line by its own cap
    "arrowhead color changed on lines drawn in pieces": eachEdge((e) => {
        if (e.stroke !== null && isPattern(e.stroke.dashClass)) {
            e.arrows.forEach((a) => {
                if (a.color !== null) {
                    a.color = invert(a.color);
                }
            });
        }
    }),
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
    // a group box as large as the program's outline is out to its border's middle, where graphty's border ring lies
    // outside its fill: too large by half the border all round (cx2-signor-aml's 8 px borders)
    "group box grown by half its outline width": (s) => {
        s.groups.forEach((g) => {
            const grow = (g.stroke?.width ?? 0) / 2;
            g.box = { x0: g.box.x0 - grow, y0: g.box.y0 - grow, x1: g.box.x1 + grow, y1: g.box.y1 + grow };
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
    "one extra free text": (s) => {
        const size = 14;
        const [x, y] = [s.width * 0.5, s.height * 0.97];
        s.texts.push({
            content: "planted words",
            x,
            y,
            box: { x0: x - 5 * size, y0: y - size / 2, x1: x + 5 * size, y1: y + size / 2 },
            sizePx: size,
            family: "Verdana",
            weight: 400,
            style: "normal",
            anchor: "middle",
            rotation: 0,
            color: "#000000",
            opacity: 1,
        });
        return s;
    },
    "whole drawing turned 20deg": (s) => reframe(s, 20, 1),
    "whole drawing zoomed x1.5": (s) => reframe(s, 0, 1.5),
    // a zigzag a few percent of a long chord high stays within the route's allowance and its bend's (cx-syn-bypass's
    // 884 px edge, 26 px high), and wherever each program lays the file out itself neither is judged
    "edges zigzag at 3% of their chord": eachEdge((e) => {
        if (e.points.length >= 2 && curvature(e.points) <= 0.04) {
            e.points = zigzag(e.points, 0.03, 8);
        }
    }),
    // every node and label at a fifth of its size, as one drawing at the wrong scale: between unrelated layouts the
    // size-fitted scale absorbs it (cx-radiation-bibliography's Cytoscape desktop boxes drawn as dots)
    "nodes and labels drawn at a fifth of their size": (s) => {
        s.nodes.forEach((n) => {
            n.w *= 0.2;
            n.h *= 0.2;
        });
        allTexts(s).forEach((t) => {
            t.sizePx *= 0.2;
            scaleBox(t, 0.2);
        });
        return s;
    },
    "one node x2": (s) => {
        const n = middleNode(s);
        if (n !== undefined) {
            n.w *= 2;
            n.h *= 2;
        }
        return s;
    },
    "one node label x0.7": (s) => {
        const t = middleNode(s)?.label ?? null;
        if (t !== null) {
            t.sizePx *= 0.7;
            scaleBox(t, 0.7);
        }
        return s;
    },
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
    "two nodes' fills swapped": ["node.fill", "node.gradient"],
    "node fill removed (outline only)": ["node.fill", "node.fillOpacity", "node.gradient", "node.stroke"],
    "node outline black": ["node.stroke"],
    "node outline width x2": ["node.strokeWidth", "node.width", "node.height"],
    "disc in a later disc's box corner removed": ["node.present"],
    "node-size label rule ignored": ["label.present"],
    "node outline removed": ["node.stroke", "node.strokeWidth", "node.strokeDash"],
    "node shape ellipse<->rect": ["node.shape"],
    "node outline dashed->solid": ["node.strokeDash", "node.stroke"],
    "node outline opacity 0.3": ["node.stroke"],
    "node outer ring removed": ["node.ring"],
    "edge width x1.4": ["edge.width"],
    "edge width x3": ["edge.width"],
    "edge under the node it ends at recolored": ["edge.color", "edge.gradient", "edge.extra"],
    "edge color changed on one edge": ["edge.color", "edge.gradient", "edge.extra"],
    "edges ending at an undrawn node recolored": ["edge.color", "edge.gradient", "edge.extra"],
    "edge dashed->solid": ["edge.dash"],
    "edge pattern (zigzag, sine wave, double, slashes, arrows) drawn solid": ["edge.dash"],
    "edge dotted->dashed": ["edge.dash"],
    "curved edges straightened": ["edge.route", "edge.curve"],
    "straight edges bowed": ["edge.route", "edge.curve"],
    "arrowheads x2": ["edge.arrow", "edge.arrowLength", "edge.arrowWidth", "edge.arrowToSpacing"],
    "arrowheads x1.25": ["edge.arrowLength", "edge.arrowWidth", "edge.arrowToSpacing"],
    "arrowheads drawn off their line's end": ["edge.arrowPlace"],
    "a second arrowhead part at the target end": ["edge.arrowParts"],
    "edge dashes and gaps x3": ["edge.dashPeriod"],
    "longest straight edge bent off its chord by a twenty-fifth of its length": ["edge.route"],
    "arrowhead removed at target end": ["edge.arrow"],
    "arrowhead shape changed (same extent, filled flipped)": ["edge.arrow", "edge.arrowFill", "edge.arrowShape"],
    "arrowhead shape changed (triangle<->circle: length=width)": ["edge.arrow", "edge.arrowShape", "edge.arrowLength"],
    "arrowhead notch filled in (vee<->triangle)": ["edge.arrowShape"],
    "arrowheads on curved lines cut to one side (triangle->half)": ["edge.arrowShape"],
    "compound arrowhead's disc dropped (circle-triangle->triangle)": ["edge.arrowShape"],
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
    "edge overlay removed": ["edge.overlay"],
    "edge overlay added": ["edge.overlay"],
    "widest of coincident edges recolored": ["edge.color", "edge.gradient", "edge.extra"],
    "middle arrowheads removed": ["edge.arrow"],
    "group outline opacity 0.5": ["group.stroke"],
    "label opacity 0.5": ["label.opacity", "label.present", "edge.label", "group.label"],
    "one node deleted": ["node.present"],
    "one extra node added": ["node.extra"],
    "one edge deleted": ["edge.present", "edge.extra"],
    "one extra edge added": ["edge.extra"],
    "one edge drawn to another node": ["edge.present", "edge.extra"],
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
    "arrowhead color changed on lines drawn in pieces": ["edge.arrowColor", "edge.arrow"],
    "arrowhead color changed": ["edge.arrowColor", "edge.arrow"],
    "group fill color changed": ["group.fill"],
    "one node moved twice its size": ["node.position", "node.present", "node.extra"],
    "edges zigzag at 3% of their chord": ["edge.wiggle", "edge.route", "edge.curve"],
    "nodes and labels drawn at a fifth of their size": [
        "node.sizeToSpacing",
        "node.width",
        "node.height",
        "label.size",
        "label.present",
        "edge.label",
    ],
    "one node x2": ["node.width", "node.height", "node.sizeToSpacing", "node.sizeToExtent"],
    "one node label x0.7": ["label.size", "label.present"],
    "label lines joined onto one": ["label.lines", "label.align", "label.present", "edge.label", "group.label"],
    "group box grown by half": ["group.box", "group.present"],
    "group outline removed": ["group.stroke", "group.strokeWidth", "group.strokeDash"],
    "group outline width x3": ["group.strokeWidth", "group.stroke"],
    "group outline dashed (or dashed->solid)": ["group.strokeDash", "group.stroke"],
    "group opacity 0.5": ["group.fillOpacity", "group.fill"],
    "group box grown by half its outline width": ["group.box"],
    "one extra group box": ["group.extra"],
    "annotations removed": ["stray.present"],
    "one extra annotation added": ["stray.extra"],
    "one extra free text": ["stray.extra"],
    "whole drawing turned 20deg": ["frame.rotation", "node.position"],
    "whole drawing zoomed x1.5": ["frame.zoom"],
};

/**
 * Where a defect can be planted at all. A mirror is told only between related layouts: where graphty lays the graph
 * out itself (a file with no positions), its drawing mirrored is another layout as unrelated as the first.
 */
const APPLIES: Partial<Record<keyof typeof DEFECTS, (base: OracleReport, oracle: PScene) => boolean>> = {
    // only where half a group's outline is more than a box's side may be off: wider than a tenth of its smaller side
    "group box grown by half its outline width": (base, oracle) =>
        oracle.groups.some(
            (g) =>
                g.stroke !== null &&
                Number.isFinite(g.stroke.width) &&
                g.stroke.width / 2 >
                    Math.max(
                        ORACLE_TOLERANCES.groupSideOfSize * Math.min(g.box.x1 - g.box.x0, g.box.y1 - g.box.y0),
                        ORACLE_TOLERANCES.pixel * (base.transform?.lengthScale ?? 1),
                    ),
        ),
    "whole drawing mirrored": (base) => base.transform !== null && !base.transform.unrelatedLayout,
    // a quarter more of a head is more than the render pixel a head's size is allowed only on a head five or more
    // pixels long (json-vis-siblings draws them under four)
    "arrowheads x1.25": (base, oracle) =>
        oracle.edges.some((e) =>
            e.arrows.some((a) => 0.25 * a.length > ORACLE_TOLERANCES.pixel * (base.transform?.lengthScale ?? 1)),
        ),
    // a bend is judged edge by edge only where the layouts are related or the file places its nodes; where each program
    // lays the file out itself, only the drawing's share of bent lines is (compare-oracle.ts), which straightening
    // every line moves out of its band only where the program bends enough of its own, and bowing every straight one
    // only where it leaves enough straight; an arc drawn as a wave keeps its share
    "curved edges straightened": (base, oracle) =>
        curveByEdge(base) || (curveJudged(base) && bentShare(oracle) > ORACLE_TOLERANCES.curvedShare),
    "straight edges bowed": (base, oracle) =>
        curveByEdge(base) || (curveJudged(base) && bentShare(oracle) < 1 - ORACLE_TOLERANCES.curvedShare),
    "curved edges drawn as sine waves (arc->sine)": (base) => curveByEdge(base),
    // where each program lays the file out itself, where a node sits is its layout's and is not judged
    "one node moved twice its size": (base) => base.properties["node.position"].passRate !== null,
    // a bend a twenty-fifth of the chord off is over the route's allowance only where that is more than its end
    // nodes' smaller side, and routes are judged only between related layouts
    "longest straight edge bent off its chord by a twenty-fifth of its length": (base, oracle) => {
        const byId = new Map(oracle.nodes.map((n) => [n.id, n]));
        return (
            base.transform !== null &&
            !base.transform.unrelatedLayout &&
            oracle.edges.some((e) => {
                const [a, b] = [e.points[0], e.points[e.points.length - 1]];
                const ends = [byId.get(e.source), byId.get(e.target)];
                return (
                    a !== undefined &&
                    b !== undefined &&
                    ends.every(
                        (n) =>
                            n !== undefined &&
                            0.04 * Math.hypot(b[0] - a[0], b[1] - a[1]) >
                                2 *
                                    Math.max(
                                        Math.min(n.w, n.h),
                                        10 * ORACLE_TOLERANCES.pixel * (base.transform?.lengthScale ?? 1),
                                    ),
                    )
                );
            })
        );
    },
    "whole drawing turned 20deg": (base) => base.transform !== null && !base.transform.unrelatedLayout,
    // a face is told only where the program names one the pinned fonts carry; elsewhere only its class is. A
    // caption's face is not judged: a DOT sheet's captions are DejaVu Sans, its `default` specimen Graphviz's Times
    "label face swapped within its class (DejaVu<->Liberation)": (_base, oracle) =>
        allTexts(withoutCaptions(oracle)).some((t) => programFace(t.family) !== null),
};

/** Whether bends are judged at all. */
const curveJudged = (base: OracleReport): boolean => base.properties["edge.curve"].passRate !== null;
/** Whether bends are judged edge by edge, not only as the drawing's share of bent lines (its element `edges`). */
const curveByEdge = (base: OracleReport): boolean => (base.judged["edge.curve"] ?? []).some((id) => id !== "edges");
/** The share of the program's lines bent over the comparison's bend. */
const bentShare = (oracle: PScene): number =>
    oracle.edges.length === 0
        ? 0
        : oracle.edges.filter((e) => curvature(e.points) > ORACLE_TOLERANCES.curvature).length / oracle.edges.length;

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
        // a property judged of the edges together (the share of bent lines where each program lays the file out
        // itself) that the drawing already fails
        if (k === "edge" && failing.get("graph\u0000edges")?.some((p) => targets.includes(p)) === true) {
            return true;
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
