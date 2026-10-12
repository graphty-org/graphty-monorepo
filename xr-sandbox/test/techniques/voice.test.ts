import { describe, expect, it } from "vitest";

import {
    choices,
    choose,
    complete,
    intent,
    type Lexicon,
    parse,
    type SentenceChip,
} from "../../src/techniques/voice/grammar";
import { similarity } from "../../src/techniques/voice/matcher";

const NODES = [
    "Acciaiuoli",
    "Albizzi",
    "Barbadori",
    "Bischeri",
    "Castellani",
    "Ginori",
    "Guadagni",
    "Lamberteschi",
    "Medici",
    "Pazzi",
    "Peruzzi",
    "Pucci",
    "Ridolfi",
    "Salviati",
    "Strozzi",
    "Tornabuoni",
];
const LEX: Lexicon = {
    nodes: NODES,
    results: [
        { id: "pagerank", label: "PageRank" },
        { id: "degree", label: "degree" },
        { id: "betweenness", label: "betweenness" },
        { id: "community", label: "community" },
        { id: "component", label: "component" },
    ],
};
const MEDICI = NODES.indexOf("Medici");
const here = { selection: [MEDICI], hovered: -1 };
const texts = (chips: SentenceChip[]): string => chips.map((c) => c.text).join(" ");
const run = (said: string): unknown => intent(parse(said, LEX), LEX, here);

describe("voice grammar: what is heard becomes a command", () => {
    // [heard, chips shown, command]
    const cases: [string, string, unknown][] = [
        ["color these by PageRank", "color these by PageRank", { code: "colorBy", params: { result: "pagerank" } }],
        ["colour these by page rank", "color these by PageRank", { code: "colorBy", params: { result: "pagerank" } }],
        ["Color these by pagerank.", "color these by PageRank", { code: "colorBy", params: { result: "pagerank" } }],
        ["color by degree", "color all by Degree", { code: "colorBy", params: { result: "degree" } }],
        ["color these degree", "color these by Degree", { code: "colorBy", params: { result: "degree" } }],
        [
            "color this by between ness",
            "color these by Betweenness",
            { code: "colorBy", params: { result: "betweenness" } },
        ],
        ["color it by community", "color these by Community", { code: "colorBy", params: { result: "community" } }],
        [
            "color everything by component",
            "color all by Component",
            { code: "colorBy", params: { result: "component" } },
        ],
        [
            "please color these by pay drank",
            "color these by PageRank",
            { code: "colorBy", params: { result: "pagerank" } },
        ],
        ["size these by degree", "size these by Degree", { code: "sizeBy", params: { result: "degree" } }],
        ["scale by page rank", "size all by PageRank", { code: "sizeBy", params: { result: "pagerank" } }],
        ["run betweenness", "run Betweenness", { code: "run", params: { result: "betweenness" } }],
        ["compute page rank", "run PageRank", { code: "run", params: { result: "pagerank" } }],
        ["select strozzi", "select Strozzi", { code: "select", params: { ids: [NODES.indexOf("Strozzi")] } }],
        ["select strossi", "select Strozzi", { code: "select", params: { ids: [NODES.indexOf("Strozzi")] } }],
        ["select the medici", "select Medici", { code: "select", params: { ids: [MEDICI] } }],
        ["pick guadagni", "select Guadagni", { code: "select", params: { ids: [NODES.indexOf("Guadagni")] } }],
        ["select all", "select all", { code: "select", params: { ids: NODES.map((_, i) => i) } }],
        ["hide pazzi", "hide Pazzi", { code: "hide", params: { ids: [NODES.indexOf("Pazzi")] } }],
        ["show pazzi", "show Pazzi", { code: "show", params: { ids: [NODES.indexOf("Pazzi")] } }],
        ["grow medici two hops", "grow Medici 2 hops", { code: "neighbors", params: { id: MEDICI, hops: 2 } }],
        ["grow this 1 hop", "grow this 1 hops", { code: "neighbors", params: { id: MEDICI, hops: 1 } }],
        [
            "expand strozzi to hops",
            "grow Strozzi 2 hops",
            { code: "neighbors", params: { id: NODES.indexOf("Strozzi"), hops: 2 } },
        ],
        [
            "keep pagerank at least point one",
            "keep PageRank at least 0.1",
            { code: "filter", params: { result: "pagerank", op: ">=", value: 0.1 } },
        ],
        [
            "filter degree below 0.2",
            "keep Degree at most 0.2",
            { code: "filter", params: { result: "degree", op: "<=", value: 0.2 } },
        ],
        ["undo", "undo", { code: "undo" }],
        ["save", "save", { code: "save", params: {} }],
    ];
    for (const [heard, shown, command] of cases) {
        it(`"${heard}"`, () => {
            const chips = parse(heard, LEX);
            expect(texts(chips)).toBe(shown);
            expect(run(heard)).toEqual(command);
        });
    }

    it("shows a word it cannot place as an unparsed chip, and does not run", () => {
        const chips = parse("color these by banana", LEX);
        expect(chips.map((c) => c.state)).toEqual(["ok", "ok", "ok", "unparsed"]);
        expect(chips[3].text).toBe("banana?");
        expect(chips[3].kind).toBe("result");
        expect(complete(chips)).toBe(false);
    });

    it("shows words after a full sentence as unparsed, and an unknown verb too", () => {
        expect(parse("run degree now quickly", LEX).map((c) => c.text)).toEqual(["run", "Degree", "quickly?"]);
        expect(parse("frobnicate", LEX).map((c) => [c.kind, c.state])).toEqual([["verb", "unparsed"]]);
    });

    it("gives nothing for nothing heard but an empty verb chip", () => {
        expect(parse("", LEX).map((c) => [c.kind, c.state])).toEqual([["verb", "missing"]]);
    });

    it("tells select these with nothing selected or pointed at", () => {
        expect(intent(parse("select these", LEX), LEX, { selection: [], hovered: -1 })).toEqual({
            error: "nothing selected or pointed at",
        });
        expect(intent(parse("select these", LEX), LEX, { selection: [], hovered: 3 })).toEqual({
            code: "select",
            params: { ids: [3] },
        });
    });
});

describe("voice chips: poking fixes one word", () => {
    it("offers three alternatives first, then the slot's vocabulary, and takes a choice", () => {
        const chips = parse("color these by PageRank", LEX);
        const { top, all } = choices(chips, 3, LEX);
        expect(top).toHaveLength(3);
        expect([...top, ...all].sort()).toEqual(["betweenness", "community", "component", "degree"]);
        const fixed = choose(chips, 3, "degree", LEX);
        expect(texts(fixed)).toBe("color these by Degree");
        expect(intent(fixed, LEX, here)).toEqual({ code: "colorBy", params: { result: "degree" } });
    });

    it("offers the sound-alikes of an unparsed word first", () => {
        const chips = parse("select strozzo pizza", LEX);
        expect(chips[1].text).toBe("Strozzi");
        expect(choices(chips, 2, LEX)).toEqual({ top: ["remove"], all: ["remove"] });
        expect(texts(choose(chips, 2, "remove", LEX))).toBe("select Strozzi");
    });

    it("builds the same command by poking alone, verb first", () => {
        let chips = parse("", LEX);
        expect(choices(chips, 0, LEX).all).toContain("color");
        chips = choose(chips, 0, "color", LEX);
        expect(chips.map((c) => [c.text, c.state])).toEqual([
            ["color", "ok"],
            ["all", "ok"],
            ["by", "ok"],
            ["?", "missing"],
        ]);
        expect(complete(chips)).toBe(false);
        chips = choose(chips, 3, "degree", LEX);
        expect(intent(chips, LEX, here)).toEqual({ code: "colorBy", params: { result: "degree" } });
    });

    it("keeps slot values when the verb changes", () => {
        const chips = choose(parse("color these by degree", LEX), 0, "size", LEX);
        expect(texts(chips)).toBe("size these by Degree");
    });
});

describe("voice matcher", () => {
    it("ranks spelling, sound and nothing in that order", () => {
        expect(similarity("page rank", "pagerank")).toBe(1);
        expect(similarity("colour", "color")).toBeGreaterThan(0.8);
        expect(similarity("strossi", "strozzi")).toBeGreaterThanOrEqual(0.85);
        expect(similarity("banana", "betweenness")).toBeLessThan(0.6);
    });
});
