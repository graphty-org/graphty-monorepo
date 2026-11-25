/**
 * The corners of turning a file's rules into layers that whole files rarely reach: values a channel cannot take,
 * predicates no short selector can write, layers graphty wrote into a file that this load cannot rebuild, arrow rows
 * with pieces the element does not draw, and the table and run helpers given what is not a table or a run.
 */
import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
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
    type TranslateInput,
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
    /** The graph, in place of the three-node one read from the file. */
    readonly snapshot?: GraphSnapshot;
    /** What the element paints by default, per kind. */
    readonly elementDefaults?: TranslateInput["elementDefaults"];
    /** Style columns the file holds for nodes, by key. */
    readonly held?: Readonly<Record<string, readonly unknown[]>>;
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
            columns: {
                ...extracted.columns,
                node: new Map([...extracted.columns.node, ...Object.entries(load.held ?? {})]),
            } as ExtractedStyles["columns"],
            styles: {
                ...extracted.styles,
                rules: rules as readonly StyleRule[],
                notes: load.notes ?? [],
            },
        },
        snapshot: load.snapshot ?? snapshot,
        columnPath: (_kind, key) => `data.${key.replaceAll(/[^A-Za-z0-9_]/g, "_")}`,
        options: load.options ?? { lengths: "file" },
        dataPath: load.dataPath ?? ((_kind, column) => `data.${column}`),
        ...(load.elementDefaults === undefined ? {} : { elementDefaults: load.elementDefaults }),
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

describe("a layer graphty wrote, rebuilt", () => {
    const written = (id: string, set: Record<string, unknown>, spec: unknown): unknown =>
        everyOne("node", set, { id, name: id, ext: { [LAYER_SPEC_EXT]: spec } });

    it("keeps the layers of a node's sizes as its fallback, and draws no combined size when every rule is rebuilt", () => {
        const out = translate([
            written("wide", { width: 4 }, { selector: { match: "everything" }, set: { "node.size": 4 } }),
            written("tall", { height: 6 }, { selector: { match: "everything" }, set: { "node.size": 6 } }),
        ]);
        assert.deepEqual(
            out.layers.map(({ spec }) => spec.set?.["node.size"]),
            [4, 6],
        );
        assert.isTrue(out.layers.every(({ fallback }) => fallback !== undefined && fallback.length > 0));
    });

    it("moves a path the file holds into this load, keeps a binding that reads no column, and refuses a path that is no text", () => {
        const out = translate(
            [
                written(
                    "moved",
                    { fill: "#ff0000" },
                    {
                        selector: { match: "expression", where: "graphty.style.s.node.held == `1`" },
                        encode: { "node.opacity": 0.5 },
                    },
                ),
                written(
                    "odd",
                    { fill: "#ff0000" },
                    {
                        selector: { match: "everything" },
                        encode: { "node.color": { by: 5 } },
                    },
                ),
                written(
                    "segments",
                    { fill: "#ff0000" },
                    {
                        selector: {
                            match: "expression",
                            where: 'graphty.style.s.node.a.b == `1` && graphty.style.s.node."q r" == `1`',
                        },
                    },
                ),
            ],
            { held: { held: [1, 2, 1] } },
        );
        const moved = out.layers.find(({ ruleId }) => ruleId === "moved");
        assert.isDefined(moved?.fallback);
        const { selector } = moved?.spec ?? {};
        assert.equal(selector?.match, "expression");
        assert.notInclude(selector?.match === "expression" ? selector.where : "", "graphty.style.s.");
        // a binding that is no object is carried as it was written
        const opacity: unknown = moved?.spec.encode?.["node.opacity"];
        assert.equal(opacity, 0.5);
        const ignored = notesOf(out, "W_STYLE_LAYER_SPEC_IGNORED");
        assert.equal(ignored.get("node:odd")?.reason, "PATH");
        assert.equal(ignored.get("node:segments")?.reason, "PATH");
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
                {
                    cells: [
                        5,
                        { image: "pic.png" },
                        { image: { src: "pic.png" } },
                        { lines: [3, { align: "left" }, { runs: "x" }] },
                    ],
                },
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
            { lines: [{ text: "" }, { text: "", align: "left" }, { text: "" }] },
        ]);
    });
});

describe("groups nested in a cycle", () => {
    it("count a cycle as no further level, reading each node's parents from a list cell", () => {
        // a and b each name the other as a parent; c names a: the cycle stops, and both groups sit behind c
        const builder = new GraphBuilder({ directed: true });
        builder.addNodes(["a", "b", "c"]);
        const parents = builder.declareNodeColumn({
            name: "parents",
            dtype: "list",
            itemDtype: "u32",
            role: "parents",
        });
        builder.setNodeValue(parents, 0, [1]);
        builder.setNodeValue(parents, 1, [0]);
        builder.setNodeValue(parents, 2, [0]);
        const out = translate([], { snapshot: builder.freeze() });
        const nested = out.layers.find(({ spec }) => spec.encode?.["node.zIndex"] !== undefined);
        assert.isDefined(nested);
        const kept = [...out.columns.node.values()].find((values) => values.length === 3 && values[2] === null);
        assert.deepEqual(kept, [-1, -1, null]);
    });
});

describe("a passthrough the channel cannot read", () => {
    it("binds numbers on a color as they are, since neither the file nor the element draws them", () => {
        const out = translate([
            everyOne("node", {}, { map: { "graphty:node.color": { kind: "passthrough", by: { data: "w" } } } }),
        ]);
        const bound = out.layers.find(({ spec }) => spec.encode?.["node.color"] !== undefined);
        assert.deepEqual(bound?.spec.encode?.["node.color"], { by: "data.w", scale: "passthrough" });
    });

    it("binds words that are no color as they are, since neither draws them", () => {
        const out = translate([
            everyOne("node", {}, { map: { "graphty:node.color": { kind: "passthrough", by: { data: "k" } } } }),
        ]);
        const bound = out.layers.find(({ spec }) => spec.encode?.["node.color"] !== undefined);
        assert.deepEqual(bound?.spec.encode?.["node.color"], { by: "data.k", scale: "passthrough" });
    });

    it("notes a channel of the other kind as not understood", () => {
        const out = translate([everyOne("node", { "graphty:edge.color": "#ff0000" })]);
        assert.equal(notesOf(out, "W_STYLE_NOT_UNDERSTOOD").get("node:graphty:edge.color")?.count, 1);
        assert.isFalse(channelsOf(out).has("edge.color"));
    });
});

describe("a data cell of several numbers", () => {
    it("is kept as no value where the reader left its column out, as graph-io compares it", () => {
        const builder = new GraphBuilder({ directed: true });
        builder.addNodes(["a", "b", "c"]);
        builder.setNodeColumn("v", new Float64Array([1, 2, 3, 4, 5, 6]), { components: 2 });
        const out = translate([everyOne("node", { fill: "#ff0000" }, { where: { not: { eq: [{ data: "v" }, 1] } } })], {
            snapshot: builder.freeze(),
            dataPath: () => null,
        });
        // a list is no value a layer reads, so each node keeps none, and no node's list equals the number
        assert.isTrue([...out.columns.node.values()].some((values) => values.join() === ",,"));
        assert.deepEqual(out.predicted.node?.get("node.color"), ["#ff0000", "#ff0000", "#ff0000"]);
    });
});

describe("a rule of defaults the element already paints", () => {
    const elementDefaults = { node: { "node.size": 1, "node.opacity": 1 }, edge: {} };
    const defaults = (set: Record<string, unknown>): unknown =>
        everyOne("node", set, { id: `node.d${Object.keys(set).join()}`, role: "defaults" });

    it("is left out when its opacity is the element's", () => {
        const out = translate([defaults({ opacity: 1 })], { elementDefaults });
        assert.deepEqual(out.layers, []);
    });

    it("is drawn when a size is no number or a property has no channel", () => {
        const out = translate([defaults({ width: "big" }), defaults({ bogus: 1 })], { elementDefaults });
        assert.equal(notesOf(out, "W_STYLE_NOT_UNDERSTOOD").get("node:bogus")?.count, 1);
    });
});

describe("a label fixed on screen for some nodes", () => {
    it("draws the screen size only on the nodes its rule selects", () => {
        const out = translate([everyOne("node", { labelScreenSize: 12 }, { where: { eq: [{ data: "k" }, "x"] } })]);
        const set = Object.assign({}, ...out.layers.map(({ spec }) => spec.set ?? {})) as Record<string, unknown>;
        assert.equal(set["node.labelSize"], 12);
        assert.deepEqual(set["node.labelStyle"], { sizeMode: "screen" });
        assert.isTrue(out.layers.every(({ spec }) => spec.selector.match !== "everything"));
    });
});

describe("a tooltip on an edge", () => {
    it("is drawn, through the edge.tooltip channel", () => {
        const out = translate([everyOne("edge", { tooltip: "hi" })]);
        const set = Object.assign({}, ...out.layers.map(({ spec }) => spec.set ?? {})) as Record<string, unknown>;
        assert.equal(set["edge.tooltip"], "hi");
        assert.isFalse(notesOf(out, "W_STYLE_NOT_DRAWN").has("edge:tooltip"));
    });
});

describe("a continuous mapping", () => {
    const sizes = (points: unknown[], options: FileStyleOptions = { lengths: "file" }): Translation =>
        translate(
            [
                everyOne("node", { width: 10 }),
                everyOne(
                    "node",
                    {},
                    { id: "node.m", map: { labelSize: { kind: "continuous", by: { data: "w" }, points } } },
                ),
            ],
            { options },
        );

    it("is kept per element when a point lies at no finite place", () => {
        const out = sizes([
            { at: 1, below: 10, value: 10, above: 10 },
            { at: 3, below: 20, value: 20, above: 20 },
            { at: Number.POSITIVE_INFINITY, below: 30, value: 30, above: 30 },
        ]);
        const encoded = out.layers.find(({ spec }) => spec.encode?.["node.labelSize"] !== undefined);
        // each node's size, kept per node, rather than stops on the column
        assert.notProperty(encoded?.spec.encode?.["node.labelSize"] ?? {}, "stops");
        assert.notEqual((encoded?.spec.encode?.["node.labelSize"] as { by?: unknown } | undefined)?.by, "data.w");
    });

    it("scaled by the median, keeps a point it cannot convert as the file gives it", () => {
        const out = sizes(
            [
                { at: 1, below: "huge", value: 10, above: 10 },
                { at: 3, below: 20, value: 20, above: 20 },
            ],
            { lengths: "median" },
        );
        assert.isTrue(channelsOf(out).has("node.labelSize"));
    });
});

describe("a node's two sizes and two opacities", () => {
    it("combine where only one of each is given, and give nothing where neither is", () => {
        const out = translate([
            everyOne("node", { height: 4, fillOpacity: 0.5 }, { id: "node.one", where: { eq: [{ data: "w" }, 1] } }),
            everyOne("node", { width: 2, opacity: 0.5 }, { id: "node.two", where: { eq: [{ data: "w" }, 2] } }),
        ]);
        assert.deepEqual(out.predicted.node?.get("node.size"), [4, 2, null]);
        assert.deepEqual(out.predicted.node?.get("node.opacity"), [0.5, 0.5, null]);
    });

    it("draw no size given in words", () => {
        const out = translate([everyOne("node", { width: "big" })]);
        assert.isFalse(channelsOf(out).has("node.size"));
    });
});

describe("label sizes scaled by the median", () => {
    it("draw no size for a label size given in words", () => {
        const out = translate([everyOne("node", { width: 10, labelSize: "big" })], { options: { lengths: "median" } });
        assert.equal(notesOf(out, "W_STYLE_NO_COUNTERPART").get("node:labelSize")?.count, 3);
        assert.isFalse(channelsOf(out).has("node.labelSize"));
    });
});

describe("a computed value of an edge", () => {
    it("is never written, in an expression or in a comparison", () => {
        const out = translate([
            everyOne("edge", { color: "#ff0000" }, { where: { not: { has: { computed: "degree" } } } }),
            everyOne("edge", { color: "#00ff00" }, { id: "edge.eq", where: { eq: [{ computed: "degree" }, 1] } }),
        ]);
        // no edge has a degree: the negation selects every edge, the comparison none
        assert.deepEqual(out.predicted.edge?.get("edge.color"), ["#ff0000", "#ff0000"]);
    });
});
