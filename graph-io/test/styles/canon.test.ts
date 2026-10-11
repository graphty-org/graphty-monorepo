import { describe, expect, it } from "vitest";

import {
    canonBoolean,
    canonColor,
    type CanonColorOptions,
    canonEnum,
    canonNumber,
    canonOpacity,
    type CanonSite,
    canonText,
    colorOpacity,
    DOT_POINTS_PER_INCH,
    dotLabelText,
    htmlLabelText,
    recordLabelText,
    StyleBudget,
    type StyleDialect,
    type StyleEnumKind,
    styleLengthUnit,
    type StyleNoteCode,
    StyleNotes,
} from "../../src/styles/index.js";

/** A fresh site for one value. */
function site(element?: number): CanonSite & { notes: StyleNotes; budget: StyleBudget } {
    return { notes: new StyleNotes(), target: "node", property: "fill", element, budget: new StyleBudget() };
}

/** The note codes a site collected. */
function codes(s: { notes: StyleNotes }): StyleNoteCode[] {
    return s.notes.list().map((n) => n.code);
}

type ColorRow = [raw: unknown, dialect: StyleDialect, color: string | null, alpha?: number, note?: StyleNoteCode];

/** Runs a table of color expectations. */
function colorTable(rows: ColorRow[], options: CanonColorOptions = {}): void {
    it.each(rows)("%j in %s is %s", (raw, dialect, color, alpha, note) => {
        const s = site();
        const got = canonColor(raw, dialect, s, options);
        expect(got?.color ?? null).toBe(color);
        if (color !== null) {
            expect(got?.alpha).toBe(alpha ?? 1);
        }
        if (note === undefined) {
            expect(codes(s)).toEqual([]);
        } else {
            expect(codes(s)).toContain(note);
        }
    });
}

describe("canonColor: CSS dialects, as graphty-element draws them", () => {
    colorTable([
        ["#ABC", "css", "#aabbcc"],
        ["#abcd", "css", "#aabbcc", 0.866667],
        ["#AABBCC", "css", "#aabbcc"],
        ["#11223380", "css", "#112233", 0.501961],
        ["  red  ", "css", "#ff0000"],
        ["RebeccaPurple", "css", "#663399"],
        ["gray", "css", "#808080"],
        ["transparent", "css", "#000000", 0],
        ["rgb(255, 0, 0)", "css", "#ff0000"],
        ["rgba(0,0,255,0.5)", "css", "#0000ff", 0.5],
        ["rgb(10% 20% 30% / 50%)", "css", "#1a334d", 0.5],
        ["hsl(120,100%,25%)", "css", "#008000"],
        ["hsla(10,20%,30%,0.4)", "css", "#5c423d", 0.4],
        ["hsl(0.5turn 100% 50%)", "css", "#00ffff"],
        // Out of sRGB: graphty-element gamut maps (CSS Color 4) rather than clamping the channels.
        ["hsl(400,200%,50%)", "css", "#ffffff"],
        ["rgb(300,0,0)", "css", "#ff604f"],
        ["hsl(200,50%,-10%)", "css", "#000000"],
        ["nosuch", "css", null, 1, "W_STYLE_BAD_VALUE"],
        ["#12345", "css", null, 1, "W_STYLE_BAD_VALUE"],
        ["rgb(1,2)", "css", null, 1, "W_STYLE_BAD_VALUE"],
        ["hsl(10%,20%,30%)", "css", null, 1, "W_STYLE_BAD_VALUE"],
        ["red", "vis", "#ff0000"],
        ["#00ff00", "graphology", "#00ff00"],
        ["rgba(1,2,3,0.25)", "cytoscape-js", "#010203", 0.25],
        ["#336699", "graphty", "#336699"],
        ["teal", "a-dialect-graph-io-does-not-know", "#008080"],
    ]);
});

describe("canonColor: Graphviz, as dot 2.43 draws it", () => {
    // Every expectation below was measured with `dot -Txdot`.
    colorTable([
        ["red", "graphviz", "#ff0000"],
        ["RED", "graphviz", "#ff0000"],
        ["gray", "graphviz", "#c0c0c0"],
        ["bisque4", "graphviz", "#8b7d6b"],
        ["none", "graphviz", "#fffffe", 0],
        ["NONE", "graphviz", "#fffffe", 0],
        ["invis", "graphviz", "#fffffe", 0],
        ["transparent", "graphviz", "#fffffe", 0],
        ["  red", "graphviz", "#ff0000"],
        ["red  ", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["Light Grey", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["#ff000080", "graphviz", "#ff0000", 0.501961],
        [" #FF0000", "graphviz", "#ff0000"],
        ["#ff0000x", "graphviz", "#ff0000"],
        ["#f00", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["#ff00", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["0.5 2 0.5", "graphviz", "#007f7f"],
        ["1.5 0.5 0.5", "graphviz", "#7f3f3f"],
        ["0.5,0.5,0.5,0.5", "graphviz", "#3f7f7f"],
        [".5 .5 .5 extra", "graphviz", "#3f7f7f"],
        ["-0.5 0.5 0.5", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["0.5 0.5", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["1", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["/blues9/3", "graphviz", "#c6dbef"],
        ["/BLUES9/3", "graphviz", "#c6dbef"],
        ["//red", "graphviz", "#ff0000"],
        ["/x11/gray", "graphviz", "#c0c0c0"],
        ["/svg/gray", "graphviz", "#808080"],
        ["/nosuch/red", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["red;0.3", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        // A list as an outline or font color: the text before the first ":" is one color.
        ["red:blue", "graphviz", "#ff0000"],
        ["red:", "graphviz", "#ff0000"],
        [":red", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["red;0.3:blue", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
        ["nosuch:blue", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
    ]);

    describe("with a color scheme", () => {
        colorTable([["3", "graphviz", "#c6dbef"]], { scheme: "Blues9" });
        colorTable([["red", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"]], { scheme: "blues9" });
        colorTable([["//4", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"]], { scheme: "accent3" });
        colorTable([["1", "graphviz", "#7fc97f"]], { scheme: "accent3" });
        colorTable([["gray", "graphviz", "#808080"]], { scheme: "svg" });
        colorTable([["red", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"]], { scheme: "nosuch" });
        colorTable([["none", "graphviz", "#fffffe", 0]], { scheme: "blues9" });
    });

    describe("a list as a fill is a gradient, as an edge color parallel lines: the first color, noted", () => {
        colorTable(
            [
                ["red:blue", "graphviz", "#ff0000", 1, "W_STYLE_GRADIENT"],
                ["red;0.3:blue", "graphviz", "#ff0000", 1, "W_STYLE_GRADIENT"],
                ["red;0.3", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
            ],
            { use: "fill" },
        );
        colorTable(
            [
                ["red:blue", "graphviz", "#ff0000", 1, "W_STYLE_COLOR_LIST"],
                ["red;0.5:blue", "graphviz", "#ff0000", 1, "W_STYLE_COLOR_LIST"],
                ["red;0.5", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
                ["nosuch:blue", "graphviz", "#000000", 1, "W_STYLE_BAD_VALUE"],
                ["invis", "graphviz", "#fffffe", 0],
            ],
            { use: "edge" },
        );
    });
});

describe("canonColor: the other dialects", () => {
    colorTable([
        ["gray", "x11", "#c0c0c0"],
        ["nosuch", "x11", null, 1, "W_STYLE_BAD_VALUE"],
        ["lightGray", "java", "#c0c0c0"],
        ["DARK_GRAY", "java", "#404040"],
        ["orange", "java", "#ffc800"],
        ["teal", "java", "#008080"],
        [0xff8000, "java", "#ff8000"],
        [-1, "java", "#ffffff"],
        ["orange", "gephi", "#ffc800"],
        [{ r: 255, g: 0, b: 0, a: 0.5 }, "gephi", "#ff0000", 0.5],
        [{ r: "0", g: "128", b: "255" }, "gexf", "#0080ff"],
        [{ r: 300, g: 0, b: 0 }, "gexf", null, 1, "W_STYLE_BAD_VALUE"],
        [{ r: 1, g: 2 }, "gexf", null, 1, "W_STYLE_BAD_VALUE"],
        ["#f00", "gexf", "#ff0000"],
        ["#ff000080", "gexf", "#ff0000", 0.501961],
        [{ r: 1, g: 2, b: 3 }, "css", null, 1, "W_STYLE_BAD_VALUE"],
        ["#FF0000", "cytoscape", "#ff0000"],
        ["magenta", "cytoscape", "#ff00ff"],
        ["CadetBlue", "dvips", "#616ec4"],
        ["cadetblue", "dvips", null, 1, "W_STYLE_BAD_VALUE"],
        ["Gray25", "dvips", "#bfbfbf"],
        ["RGBFF8000", "dvips", "#ff8000"],
        ["#FF000080", "yed", "#ff0000", 0.501961],
        ["#80FF0000", "yfiles3", "#ff0000", 0.501961],
        ["#FF607D8B", "yfiles3", "#607d8b"],
        ["DARK_ORANGE", "yfiles3", "#ff8c00"],
        ["Black", "yfiles3", "#000000"],
        ["TRANSPARENT", "yfiles3", "#000000", 0],
    ]);
});

describe("colorOpacity moves a color's alpha into the property's opacity", () => {
    it("multiplies the alpha with a stated opacity when the property has an opacity", () => {
        const s = site(4);
        expect(colorOpacity({ color: "#ff0000", alpha: 0.5 }, 0.5, s, true)).toBe(0.25);
        expect(colorOpacity({ color: "#ff0000", alpha: 0.5 }, null, s, true)).toBe(0.5);
        expect(colorOpacity({ color: "#ff0000", alpha: 1 }, null, s, true)).toBeNull();
        expect(colorOpacity({ color: "#ff0000", alpha: 1 }, 0.3, s, true)).toBe(0.3);
        expect(codes(s)).toEqual([]);
    });

    it("drops the alpha and notes the element when the property has none", () => {
        const s = site(4);
        expect(colorOpacity({ color: "#ff0000", alpha: 0.5 }, null, s, false)).toBeNull();
        const [note] = s.notes.list();
        expect(note.code).toBe("W_STYLE_ALPHA_DROPPED");
        expect(note.elements).toEqual([4]);
    });
});

describe("numbers, opacities and booleans", () => {
    it.each([
        ["1.2345678", 1, 1.23457],
        [0.75, DOT_POINTS_PER_INCH, 54],
        ["0.5", DOT_POINTS_PER_INCH, 36],
        [" 12 ", 1, 12],
        ["1e3", 1, 1000],
        ["-0", 1, 0],
        [123456789, 1e-3, 123457],
    ] as const)("canonNumber(%j, factor %d) is %d", (raw, factor, want) => {
        const s = site();
        expect(canonNumber(raw, s, factor)).toBe(want);
        expect(codes(s)).toEqual([]);
    });

    it.each([
        [128, "cytoscape", 0.501961],
        ["255", "cytoscape", 1],
        [0.5, "cytoscape-js", 0.5],
        ["0", "css", 0],
    ] as const)("canonOpacity(%j) in %s is %d", (raw, dialect, want) => {
        expect(canonOpacity(raw, dialect, site())).toBe(want);
    });

    it.each([
        [300, "cytoscape"],
        [1.5, "cytoscape-js"],
        [-0.1, "css"],
    ] as const)("canonOpacity(%j) in %s is out of range", (raw, dialect) => {
        const s = site();
        expect(canonOpacity(raw, dialect, s)).toBeNull();
        expect(codes(s)).toEqual(["W_STYLE_BAD_VALUE"]);
    });

    it.each([
        [true, true],
        ["Yes", true],
        ["off", false],
        [1, true],
        [0, false],
        ["FALSE", false],
    ] as const)("canonBoolean(%j) is %s", (raw, want) => {
        expect(canonBoolean(raw, site())).toBe(want);
    });

    it("gives the unit of a dialect's lengths", () => {
        expect(styleLengthUnit("gexf")).toBe("relative");
        expect(styleLengthUnit("dvips")).toBe("relative");
        expect(styleLengthUnit("graphviz")).toBe("px");
        expect(styleLengthUnit("cytoscape")).toBe("px");
    });
});

describe("canonEnum", () => {
    it.each([
        ["shape", "box", "graphviz", "rectangle"],
        ["shape", "box", "vis", "round-rectangle"],
        ["shape", "dot", "vis", "ellipse"],
        ["shape", "ROUND_RECTANGLE", "cytoscape", "round-rectangle"],
        ["shape", "roundrectangle", "yed", "round-rectangle"],
        ["shape", "Mdiamond", "graphviz", "diamond"],
        ["shape", "Database", "vis", "other:Database"],
        ["arrow", "normal", "graphviz", "triangle"],
        ["arrow", "inv", "graphviz", "inverted"],
        ["arrow", "odot", "graphviz", "circle-open"],
        ["arrow", "white_delta", "yed", "triangle-open"],
        ["arrow", "cross", "yed", "other:cross"],
        ["arrow", "DELTA", "cytoscape", "triangle"],
        ["lineStyle", "LONG_DASH", "cytoscape", "long-dash"],
        ["lineStyle", "PARALLEL_LINES", "cytoscape", "double"],
        ["lineStyle", "dashed_dotted", "yed", "dash-dot"],
        ["lineStyle", "MARQUEE_DASH", "cytoscape", "other:MARQUEE_DASH"],
        ["borderStyle", "EQUAL_DASH", "cytoscape", "dashed"],
        ["weight", "700", "cytoscape-js", "bold"],
        ["weight", "normal", "css", "normal"],
        ["weight", 400, "css", "normal"],
        ["weight", "heavy", "css", null],
        ["position", "top left", "yed", "top-left"],
        ["position", "Center", "cytoscape", "center"],
        ["position", "nowhere", "css", null],
    ] as const)("%s %j in %s is %s", (kind, raw, dialect, want) => {
        const s = site();
        expect(canonEnum(kind, raw, dialect, s)).toBe(want);
        const unknown = want === null || want.startsWith("other:");
        expect(codes(s)).toEqual(unknown ? ["W_STYLE_UNKNOWN_VALUE"] : []);
    });
});

describe("text", () => {
    it("copies text of any length and turns numbers and booleans into text", () => {
        const long = "x".repeat(5000);
        expect(canonText(long, site())).toBe(long);
        expect(canonText(12, site())).toBe("12");
        expect(canonText(false, site())).toBe("false");
        const s = site();
        expect(canonText({ toString: "x" }, s)).toBeNull();
        expect(canonText(Number.NaN, s)).toBeNull();
        expect(codes(s)).toEqual(["W_STYLE_BAD_VALUE"]);
    });

    it("applies DOT escapes in Graphviz's two passes", () => {
        expect(dotLabelText("\\N", { node: "a" })).toBe("a");
        expect(dotLabelText("node \\N in \\G\\n", { node: "a", graph: "G" })).toBe("node a in G");
        expect(dotLabelText("\\E: \\T to \\H", { edge: "a->b", tail: "a", head: "b" })).toBe("a->b: a to b");
        expect(dotLabelText("left\\lright\\r", {})).toBe("left\nright");
        expect(dotLabelText('a\\"b\\x', {})).toBe('a"bx');
        // A name holding "\n" breaks the line, because substitution runs first.
        expect(dotLabelText("\\N", { node: "two\\nlines" })).toBe("two\nlines");
        expect(dotLabelText("\\N stays", {})).toBe("N stays");
    });

    it("keeps an HTML-like label's text and notes the lost markup", () => {
        const s = site(2);
        expect(htmlLabelText("<<b>bold</b><br/>x &amp; y &#65;&#x42; &bogus;>", s)).toBe("bold\nx & y AB &bogus;");
        expect(s.notes.list()[0].code).toBe("W_STYLE_HTML_LABEL");
        expect(s.notes.list()[0].elements).toEqual([2]);
    });

    it("joins a record label's fields with ' | ' and notes it", () => {
        const s = site();
        expect(recordLabelText("<f0> left|<f1> mid\\|dle|{a|b}| ", s)).toBe("left | mid|dle | a | b");
        expect(codes(s)).toEqual(["W_STYLE_RECORD_LABEL"]);
    });
});

describe("hostile values return null with a note and never throw", () => {
    const HOSTILE: readonly unknown[] = [
        "",
        Number.NaN,
        "NaN",
        Number.POSITIVE_INFINITY,
        "Infinity",
        -1,
        "-1",
        1e308,
        "1e308",
        "constructor",
        "__proto__",
        "toString",
        "x".repeat(5000),
        " ".repeat(5000),
        " ".repeat(100),
        "9".repeat(200),
        "1".repeat(5000),
        { r: "__proto__", g: 0, b: 0 },
        [],
        Symbol("s"),
        () => 1,
    ];
    const DIALECTS: readonly StyleDialect[] = [
        "css",
        "x11",
        "graphviz",
        "java",
        "dvips",
        "yed",
        "yfiles3",
        "gexf",
        "gephi",
        "cytoscape",
        "cytoscape-js",
        "vis",
        "graphology",
        "graphty",
    ];
    const KINDS: readonly StyleEnumKind[] = ["shape", "borderStyle", "lineStyle", "arrow", "weight", "position"];

    it.each(HOSTILE.map((v, i) => [i, v]))("hostile value %d", (_i, raw) => {
        for (const dialect of DIALECTS) {
            for (const use of ["line", "fill", "edge"] as const) {
                const s = site();
                const c = canonColor(raw, dialect, s, { use });
                // Graphviz draws an unknown color black; every other dialect gives no color.
                if (dialect === "graphviz" && c !== null) {
                    expect(c.color).toBe("#000000");
                } else if (!(dialect === "java" && raw === -1)) {
                    expect(c).toBeNull();
                }
                expect(s.notes.list().length > 0 || (dialect === "java" && raw === -1)).toBe(true);
            }
            const o = site();
            expect(canonOpacity(raw, dialect, o)).toBeNull();
            expect(o.notes.list().length).toBeGreaterThan(0);
            for (const kind of KINDS) {
                const e = site();
                const v = canonEnum(kind, raw, dialect, e);
                expect(v === null || v.startsWith("other:")).toBe(true);
                expect(e.notes.list().length).toBeGreaterThan(0);
            }
        }
        const n = site();
        expect(canonNumber(raw, n)).toBeNull();
        expect(canonNumber(raw, n, DOT_POINTS_PER_INCH)).toBeNull();
        expect(n.notes.list().length).toBeGreaterThan(0);
        const b = site();
        expect(canonBoolean(raw, b)).toBeNull();
        expect(b.notes.list().length).toBeGreaterThan(0);
    });

    it("never adds a property to Object.prototype", () => {
        for (const raw of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
            for (const kind of ["shape", "arrow", "weight"] as const) {
                canonEnum(kind, raw, "vis", site());
            }
            canonColor(raw, "dvips", site());
            canonColor(raw, "graphviz", site(), { scheme: raw });
        }
        expect(Object.keys(Object.prototype)).toEqual([]);
    });

    it("gives no value for an absent one, without a note", () => {
        const s = site();
        expect(canonColor(undefined, "css", s)).toBeNull();
        expect(canonNumber(null, s)).toBeNull();
        expect(canonEnum("shape", undefined, "css", s)).toBeNull();
        expect(canonText(null, s)).toBeNull();
        expect(codes(s)).toEqual([]);
    });

    it("notes a value over 256 characters as too long", () => {
        const s = site();
        expect(canonColor("#".repeat(257), "css", s)).toBeNull();
        expect(codes(s)).toEqual(["W_STYLE_VALUE_TOO_LONG"]);
    });
});

describe("work is counted, and a long value costs a bounded number of operations", () => {
    const TEN_K = "1".repeat(10_000);

    it("spends one operation, not one per character, on a value over the length limit", () => {
        for (const run of [
            (s: CanonSite): unknown => canonColor(TEN_K, "css", s),
            (s: CanonSite): unknown => canonColor(TEN_K, "graphviz", s),
            (s: CanonSite): unknown => canonNumber(TEN_K, s),
            (s: CanonSite): unknown => canonOpacity(TEN_K, "cytoscape", s),
            (s: CanonSite): unknown => canonBoolean(TEN_K, s),
            (s: CanonSite): unknown => canonEnum("shape", TEN_K, "css", s),
        ]) {
            const s = site();
            run(s);
            expect(s.budget.used("node")).toBe(1);
        }
    });

    it("spends one operation per character of a value it parses", () => {
        const s = site();
        canonColor("r".repeat(256), "css", s);
        expect(s.budget.used("node")).toBe(257);
    });

    it("spends one operation per character of a text, which is linear", () => {
        const s = site();
        canonText(TEN_K, s);
        expect(s.budget.used("node")).toBe(10_001);
        const h = site();
        expect(htmlLabelText(`<${"&".repeat(10_000)}${"<".repeat(10_000)}>`, h)).toBe("&".repeat(10_000));
        expect(h.budget.used("node")).toBe(20_002);
        const r = site();
        recordLabelText("|".repeat(10_000), r);
        expect(r.budget.used("node")).toBe(10_000);
    });

    it("counts graph values as node work", () => {
        const s = { ...site(), target: "graph" as const, property: "background" };
        canonColor("red", "css", s);
        expect(s.budget.used("node")).toBe(4);
        expect(s.budget.used("edge")).toBe(0);
    });
});
