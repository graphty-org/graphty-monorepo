/**
 * Mutation audit of the oracle comparator (scratch only, never committed): plants one visual defect in graphty's
 * drawn primitives just before the comparison, and records which pass rates move and whether the floors fail.
 *
 *     npx vitest run --project=fidelity test/fidelity/mutants.test.ts
 */
import { afterEach, describe, it } from "vitest";
import { commands } from "vitest/browser";

import { CORPUS_SAMPLES } from "../../../graph-io/test/fidelity/corpus-samples";
import { SAMPLES } from "../../../graph-io/test/fidelity/samples";
import { mountSample, unmount } from "./mount";
import { compareWithOracle, isStandIn, ORACLE_CANVAS, oracleGraphName, oracleMeta } from "./oracle/oracle-library";
import type { PEdge, PNode, PScene, Pt, PText } from "./oracle/primitives";
import { checkFloors, readOracleFloors } from "./oracle/run-oracle";

const IDS = (
    (import.meta.env.VITE_MUTANT_IDS as string | undefined) ??
    "cx-syn-mappings,cx2-syn-mappings,json-cyjs-synth-edges-saved,json-cyjs-synth-nodes,gexf-miserables,gexf-synth-nx-viz,graphml-synthetic-nodes,graphml-synthetic-edges,dot-synth-nodes,json-vis-synth,xgmml-syn-bypass,cys-syn-mappings,dot-synth-edges-clusters"
).split(",");

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
const firstEdge = (s: PScene): PEdge | undefined => s.edges.find((e) => e.stroke !== null);
const eachNode = (f: (n: PNode) => void) => (s: PScene) => {
    s.nodes.forEach(f);
    return s;
};
const eachEdge = (f: (e: PEdge) => void) => (s: PScene) => {
    s.edges.forEach(f);
    return s;
};

const MUTATIONS: Record<string, (s: PScene) => PScene> = {
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
    "edge patterned (zigzag/sine, dash class other) -> solid": eachEdge((e) => {
        if (e.stroke !== null && e.stroke.dashClass === "other") {
            e.stroke.dashClass = "solid";
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
    "arrowhead shape changed (triangle->circle: length=width)": eachEdge((e) => {
        e.arrows.forEach((a) => {
            a.length = a.width;
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
};

afterEach(() => {
    unmount();
});

const stored = await readOracleFloors();

describe("comparator mutants", () => {
    it.each(IDS)("%s", async (id) => {
        const sample = [...SAMPLES, ...CORPUS_SAMPLES].find((s) => s.id === id);
        if (sample === undefined) {
            throw new Error(`${id} is not a sample`);
        }
        const { element, sha256, command } = await mountSample(sample, ORACLE_CANVAS, oracleGraphName(oracleMeta(id)));
        const out: Record<string, unknown> = {};
        const only = (import.meta.env.VITE_MUTANT_ONLY as string | undefined)?.split("|");
        for (const [name, mutate] of Object.entries(MUTATIONS)) {
            if (only !== undefined && name !== "none" && !only.includes(name)) {
                continue;
            }
            let before = "";
            let after = "";
            const r = await compareWithOracle(id, element, sha256, command, (g) => {
                before = JSON.stringify(g);
                const m = mutate(g);
                after = JSON.stringify(m);
                return m;
            });
            const { dropped, unfloored, newlyFailing } = checkFloors(
                id,
                {
                    report: r.report,
                    scores: r.scores,
                    sha256,
                    oracleSha256: null,
                    standIn: isStandIn(oracleMeta(id)),
                    matched: null,
                },
                stored,
            );
            out[name] = {
                exercised: before !== after,
                scores: r.scores,
                n: Object.fromEntries(Object.entries(r.report.properties).map(([p, v]) => [p, v.n])),
                dropped,
                unfloored,
                newlyFailing,
                counts: r.report.counts,
                transform: r.report.transform,
                association: r.report.association,
            };
        }
        await commands.writeFile(
            `tmp/${(import.meta.env.VITE_MUTANT_OUT as string | undefined) ?? "comparator-mutants"}/${id}.json`,
            `${JSON.stringify(out, null, 1)}\n`,
        );
    });
});
