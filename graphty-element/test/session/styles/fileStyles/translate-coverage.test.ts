/**
 * The corners of turning a file's rules into layers that whole files rarely reach: values a channel cannot take,
 * predicates no short selector can write, layers graphty wrote into a file that this load cannot rebuild, arrow rows
 * with pieces the element does not draw, and the table and run helpers given what is not a table or a run.
 */
import type { GraphSnapshot } from "@graphty/graph-format";
import { importGraph } from "@graphty/graph-io";
import type { ExtractedStyles, StyleNote, StyleRule } from "@graphty/graph-io/styles";
import { assert, beforeAll, describe, it } from "vitest";

import {
    capLengthOf,
    type FileStyleNote,
    type FileStyleOptions,
    labelRunsMarkup,
    labelTableForElement,
    LAYER_SPEC_EXT,
    pictureUrl,
    translateFileStyles,
    type Translation,
} from "../../../../src/session/styles/fileStyles/translate";

/** Three nodes and two edges, with a number, a word and a flag on each node. */
const FILE = JSON.stringify({
    elements: {
        nodes: [
            { data: { id: "a", w: 1, k: "x", f: true } },
            { data: { id: "b", w: 2, k: "y", f: false } },
            { data: { id: "c", w: 3, k: "x", f: true } },
        ],
        edges: [{ data: { id: "e1", source: "a", target: "b" } }, { data: { id: "e2", source: "b", target: "c" } }],
    },
});

let snapshot: GraphSnapshot;
let extracted: ExtractedStyles;

beforeAll(async () => {
    const read = await importGraph(FILE, { format: "json", styles: true });
    assert.isNotNull(read.styles);
    ({ snapshot } = read);
    extracted = read.styles as ExtractedStyles;
});

/** What a test changes about the load. */
interface Load {
    readonly options?: FileStyleOptions;
    readonly notes?: readonly StyleNote[];
    /** Where the reader put a data column; every column at `data.<name>` when absent. */
    readonly dataPath?: (kind: "node" | "edge", column: string) => string | null;
}

/**
 * The translation of rules given in place of the file's own, over the three-node graph.
 * @param rules - The rules, bottom first; a test may give values of the wrong type.
 * @param load - The load's options, the reading's notes and where data columns land.
 * @returns The translation.
 */
function translate(rules: readonly unknown[], load: Load = {}): Translation {
    return translateFileStyles({
        extracted: {
            ...extracted,
            styles: {
                ...extracted.styles,
                rules: rules as readonly StyleRule[],
                notes: load.notes ?? [],
            },
        },
        snapshot,
        columnPath: (_kind, key) => `data.${key.replaceAll(/[^A-Za-z0-9_]/g, "_")}`,
        options: load.options ?? { lengths: "file" },
        dataPath: load.dataPath ?? ((_kind, column) => `data.${column}`),
    });
}

/**
 * A rule of every element of a kind.
 * @param target - Nodes or edges.
 * @param set - Its constant values.
 * @param extra - Anything else the rule carries.
 * @returns The rule.
 */
function everyOne(target: "node" | "edge", set: Record<string, unknown>, extra: Record<string, unknown> = {}): unknown {
    return { id: `${target}.r`, target, role: "group", origin: "declared", where: { all: true }, set, ...extra };
}

/**
 * The notes of one code, by property.
 * @param out - The translation.
 * @param code - The code.
 * @returns The notes keyed by `<target>:<property>`.
 */
function notesOf(out: Translation, code: string): Map<string, FileStyleNote["params"]> {
    return new Map(
        out.notes
            .filter((note) => note.code === code)
            .map((note) => [`${String(note.params.target)}:${String(note.params.property)}`, note.params]),
    );
}

/**
 * Every channel the translation's layers set or bind.
 * @param out - The translation.
 * @returns The channels.
 */
function channelsOf(out: Translation): Set<string> {
    return new Set(
        out.layers.flatMap(({ spec }) => [...Object.keys(spec.set ?? {}), ...Object.keys(spec.encode ?? {})]),
    );
}

describe("a value a channel cannot take", () => {
    it("is noted as having no counterpart and never drawn, for every kind of conversion", () => {
        const node = {
            image: 5,
            imageFallback: 5,
            shape: 7,
            shapePoints: 3,
            labelKeepBlankLines: "yes",
            labelPosition: "nowhere",
            borderWidth: "wide",
            cornerRadius: "round",
            glyphWeight: "heavy",
            xlabelOffsetX: "far",
            labelAvoidOverlap: false,
            labelSize: "big",
            labelOutlineWidth: "thick",
            labelTable: 5,
        };
        const edge = { supportModel: 5, targetArrowParts: 5, labelTable: 5 };
        const out = translate([everyOne("node", node), everyOne("edge", edge)]);
        const none = notesOf(out, "W_STYLE_NO_COUNTERPART");
        for (const property of Object.keys(node)) {
            assert.equal(none.get(`node:${property}`)?.count, 3, property);
        }
        for (const property of Object.keys(edge)) {
            assert.equal(none.get(`edge:${property}`)?.count, 2, property);
        }
        // a conversion that passes the value through leaves it to the layer; every other one draws nothing
        const drawn = channelsOf(out);
        for (const channel of [
            "node.shape",
            "node.labelTable",
            "node.labelLocation",
            "edge.supportModel",
            "edge.labelTable",
        ]) {
            assert.isFalse(drawn.has(channel), channel);
        }
    });

    it("draws a glyph weight given as a number in words, and notes a label fixed on screen given no number", () => {
        const out = translate([
            everyOne("node", { glyphWeight: "600" }),
            everyOne("edge", { labelScreenSize: "large" }, { id: "edge.s" }),
        ]);
        const set = Object.assign({}, ...out.layers.map(({ spec }) => spec.set ?? {})) as Record<string, unknown>;
        assert.equal(set["node.glyphWeight"], 600);
        assert.isFalse(channelsOf(out).has("edge.labelStyle"));
        assert.equal(notesOf(out, "W_STYLE_NO_COUNTERPART").get("edge:labelScreenSize")?.count, 2);
    });
});

describe("an arrow row", () => {
    it("keeps only the pieces the element draws, sized where the word gives a size", () => {
        const out = translate([
            everyOne("edge", { targetArrowParts: "triangle:left*12x8 nonsense kite*4x2 tee none" }),
            everyOne("edge", { sourceArrowParts: "   " }, { id: "edge.blank" }),
        ]);
        const set = Object.assign({}, ...out.layers.map(({ spec }) => spec.set ?? {})) as Record<string, unknown>;
        const stack = String(set["edge.arrowHeadStack"]);
        const words = stack.split(" ");
        assert.equal(words.length, 3, stack);
        assert.match(words[0], /^normal:left\*[\d.]+x[\d.]+$/);
        // a kite has no proportions of its own, so its width is its breadth over its length
        assert.match(words[1], /^kite\*[\d.]+x0\.5$/);
        assert.equal(words[2], "tee");
        assert.isFalse(channelsOf(out).has("edge.arrowTailStack"));
        assert.equal(notesOf(out, "W_STYLE_NO_COUNTERPART").get("edge:sourceArrowParts")?.count, 2);
    });

    it("gives back the length and width a stacked cap was read from", () => {
        const tee = capLengthOf("tee", 2, undefined);
        assert.isNull(tee.across);
        const kite = capLengthOf("kite", 2, 0.5);
        assert.equal(kite.along, tee.along * 2);
        assert.equal(kite.across, kite.along * 0.5);
    });
});

describe("a predicate no short selector writes", () => {
    it("selects by a membership value written onto the elements for an empty list, and nothing for what matches none", () => {
        const out = translate([
            everyOne("node", { fill: "#ff0000" }, { id: "node.xor", where: { xor: [] } }),
            everyOne("node", { fill: "#00ff00" }, { id: "node.empty", where: { in: [{ data: "k" }, []] } }),
            everyOne("node", { fill: "#0000ff" }, { id: "node.none", where: { and: [] } }),
        ]);
        assert.deepEqual(
            out.layers.map(({ spec }) => spec.name),
            ["node.none"],
        );
        const { selector } = out.layers[0].spec;
        assert.equal(selector.match, "expression");
        assert.include(selector.match === "expression" ? selector.where : "", "where");
        assert.deepEqual(out.predicted.node?.get("node.color"), ["#0000ff", "#0000ff", "#0000ff"]);
    });

    it("writes a short expression for a list holding the everything predicate", () => {
        const out = translate([
            everyOne("node", { fill: "#ff0000" }, { where: { and: [{ all: true }, { eq: [{ data: "k" }, "x"] }] } }),
        ]);
        const red = out.predicted.node?.get("node.color");
        assert.deepEqual(red, ["#ff0000", null, "#ff0000"]);
    });

    it("reads a data column the reader left out from the snapshot, kept per element", () => {
        const out = translate([everyOne("node", { fill: "#ff0000" }, { where: { eq: [{ data: "k" }, "y"] } })], {
            dataPath: () => null,
        });
        assert.deepEqual(out.predicted.node?.get("node.color"), [null, "#ff0000", null]);
        assert.isTrue([...out.columns.node.values()].some((values) => values.join() === "x,y,x"));
    });

    it("selects nothing for a column the snapshot does not hold, and a computed value of an edge", () => {
        const out = translate([
            everyOne("node", { fill: "#ff0000" }, { where: { eq: [{ data: "missing" }, "y"] } }),
            everyOne("edge", { color: "#ff0000" }, { where: { has: { computed: "degree" } } }),
        ]);
        assert.deepEqual(out.predicted.node?.get("node.color") ?? [null, null, null], [null, null, null]);
        assert.deepEqual(out.predicted.edge?.get("edge.color") ?? [null, null], [null, null]);
    });
});

describe("a layer graphty wrote into the file", () => {
    /**
     * A rule carrying a layer graphty wrote.
     * @param id - The rule's id.
     * @param spec - The layer as written.
     * @returns The rule.
     */
    const written = (id: string, spec: unknown): unknown =>
        everyOne("node", { fill: "#ff0000" }, { id, name: id, ext: { [LAYER_SPEC_EXT]: spec } });

    it("is set aside with the reason it cannot be rebuilt, and the neutral rule drawn instead", () => {
        const cases: [string, unknown, string][] = [
            ["array", [], "INVALID"],
            ["noSelector", { name: "x" }, "INVALID"],
            ["otherKind", { target: "edge", selector: { match: "everything" } }, "INVALID"],
            ["edgeIds", { kind: "highlight", selector: { match: "ids", edges: ["e1"] } }, "SELECTOR"],
            ["member", { selector: { match: "member", set: "s" } }, "SELECTOR"],
            ["unknown", { selector: { match: "nearest" } }, "SELECTOR"],
            [
                "wide",
                { selector: { match: "expression", where: "a==1||b==2||c==3||d==4||e==5||f==6||g==7||h==8||i==9" } },
                "SELECTOR_TERMS",
            ],
            ["missingPath", { selector: { match: "has", path: "graphty.style.s.node.gone" } }, "PATH"],
            ["badPath", { selector: { match: "has", path: "graphty.style.s" } }, "PATH"],
            [
                "missingExpression",
                { selector: { match: "expression", where: "graphty.style.s.node.gone == `1`" } },
                "PATH",
            ],
        ];
        const out = translate(cases.map(([id, spec]) => written(id, spec)));
        const ignored = notesOf(out, "W_STYLE_LAYER_SPEC_IGNORED");
        for (const [id, , reason] of cases) {
            assert.equal(ignored.get(`node:${id}`)?.reason, reason, id);
        }
        assert.isTrue(out.layers.every((layer) => layer.fallback === undefined));
        // the file's membership values select instead, as the kind the layer had
        assert.equal(out.layers.find(({ spec }) => spec.name === "edgeIds")?.spec.kind, "highlight");
        assert.deepEqual(out.predicted.node?.get("node.color"), ["#ff0000", "#ff0000", "#ff0000"]);
    });

    it("is rebuilt when it selects by a few node ids or by a data path, with the neutral layers as its fallback", () => {
        const out = translate([
            written("ids", { selector: { match: "ids", nodes: ["a"] }, set: { "node.color": "#00ff00" } }),
            written("top", {
                name: 7,
                selector: { match: "has", path: "data.w" },
                set: { "node.size": 2 },
                userData: { mine: 1 },
            }),
        ]);
        const ids = out.layers.find(({ spec }) => spec.name === "ids");
        assert.deepEqual(ids?.spec.selector, { match: "ids", nodes: ["a"] });
        assert.deepEqual(ids?.spec.set, { "node.color": "#00ff00" });
        assert.isAbove(ids?.fallback?.length ?? 0, 0);
        // a name that is no text is the rule's own
        const top = out.layers.find(({ ruleId }) => ruleId === "top");
        assert.equal(top?.spec.name, "top");
        assert.isDefined(top?.fallback);
        assert.deepEqual(top?.spec.userData, { mine: 1 });
        assert.isNull(out.predicted.node);
    });
});

describe("the reading's notes", () => {
    it("keep at most eight samples of the file's values", () => {
        const samples = Array.from({ length: 10 }, (_unused, i) => `v${String(i)}`);
        const out = translate([], {
            notes: [
                { code: "W_STYLE_NOT_DRAWN", params: { target: "node", property: "p", count: 10, samples } },
            ] as never,
        });
        const note = out.notes.find((n) => n.code === "W_STYLE_NOT_DRAWN");
        assert.deepEqual(note?.params.samples, samples.slice(0, 8));
        assert.equal(note?.params.count, 10);
    });
});

describe("the label helpers", () => {
    it("keep a picture's path as written when the base makes no URL with it", () => {
        assert.equal(pictureUrl("pic.png", "not a url"), "pic.png");
        assert.equal(pictureUrl("pic.png", "https://example.com/dir/"), "https://example.com/dir/pic.png");
    });

    it("read no runs from what is not a JSON list, and nothing from a run with no text", () => {
        assert.isNull(labelRunsMarkup("{not json"));
        assert.isNull(labelRunsMarkup('{"text":"a"}'));
        assert.isNull(labelRunsMarkup(5));
        assert.equal(labelRunsMarkup(JSON.stringify([null, { size: 3 }, { text: "a" }])), "a");
    });

    it("read no table from what is not one, and keep what a cell holds that is no table", () => {
        assert.isNull(labelTableForElement(5, 1));
        assert.isNull(labelTableForElement("{not json", 1));
        assert.isNull(labelTableForElement(JSON.stringify({ rows: "none" }), 1));
        let deep: unknown = { rows: [] };
        for (let i = 0; i < 10; i++) {
            deep = { rows: [{ cells: [{ table: deep }] }] };
        }
        const nested = labelTableForElement(JSON.stringify(deep), 1);
        assert.isNotNull(nested);
        assert.include(nested, '"table":null');
        const table = {
            rows: [
                7,
                { cells: [5, { image: "pic.png" }, { image: { src: "pic.png" } }, { lines: [3, { align: "left" }] }] },
            ],
        };
        const out = JSON.parse(labelTableForElement(JSON.stringify(table), 2, "https://example.com/") ?? "null") as {
            rows: { cells: unknown[] }[];
        };
        assert.deepEqual(out.rows[0], { cells: [] });
        assert.deepEqual(out.rows[1].cells, [
            {},
            {},
            { image: { src: "https://example.com/pic.png", pixelSize: 2 } },
            { lines: [{ text: "" }, { text: "", align: "left" }] },
        ]);
    });
});
