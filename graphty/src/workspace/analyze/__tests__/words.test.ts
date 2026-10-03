import { BUILT_IN_ALGORITHMS, RESULT_SHAPES } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { costLine, groupAlgorithms, HEADINGS, isEssential, matches, wordsFor } from "../words";

describe("the Analyze popover's words", () => {
    it("puts every result shape the element declares under exactly one heading", () => {
        for (const shape of RESULT_SHAPES) {
            assert.lengthOf(
                HEADINGS.filter((heading) => heading.shapes.includes(shape)),
                1,
                shape,
            );
        }
    });

    it("has a name and a line for every algorithm the element ships", () => {
        for (const descriptor of BUILT_IN_ALGORITHMS) {
            const words = wordsFor(descriptor);
            assert.notEqual(words.answers, "", descriptor.key);
        }
    });

    it("names a registered algorithm the app has no words for by its technical name", () => {
        const words = wordsFor({ ...BUILT_IN_ALGORITHMS[0], key: "plugin-x", technicalName: "Plugin X" });
        assert.equal(words.name, "Plugin X");
    });

    it("marks at most one Start here per heading", () => {
        for (const { heading, entries } of groupAlgorithms(BUILT_IN_ALGORITHMS)) {
            assert.isAtMost(entries.filter((d) => wordsFor(d).startHere === true).length, 1, heading.title);
        }
    });

    it("hides a heading with no entries: Measure the graph, with the element's own algorithms", () => {
        const titles = groupAlgorithms(BUILT_IN_ALGORITHMS).map((group) => group.heading.title);
        assert.deepEqual(titles, ["Rank nodes and edges", "Find groups", "Find paths and edge sets"]);
    });

    it("finds Betweenness when the reader types brokers, and drops the headings left empty", () => {
        const betweenness = BUILT_IN_ALGORITHMS.find((d) => d.key === "betweenness");
        assert.isDefined(betweenness);
        if (betweenness !== undefined) {
            assert.isTrue(matches(betweenness, "Brokers"));
        }
        const groups = groupAlgorithms(BUILT_IN_ALGORITHMS, "brokers");
        assert.deepEqual(
            groups.map((g) => g.entries.map((d) => d.key)),
            [["betweenness"]],
        );
    });

    it("draws a control only for the options the element does not mark advanced or internal", () => {
        const pagerank = BUILT_IN_ALGORITHMS.find((d) => d.key === "pagerank");
        assert.deepEqual(pagerank?.options.filter(isEssential).map((o) => o.name), ["dampingFactor"]);
    });

    it("words the element's estimate as a cost line", () => {
        assert.equal(costLine(0.2), "Under a second");
        assert.equal(costLine(1), "About 1 second");
        assert.equal(costLine(12.4), "About 12 seconds");
        assert.equal(costLine(600), "About 10 minutes");
        assert.equal(costLine(7200), "About 2 hours");
        assert.equal(costLine(Number.POSITIVE_INFINITY), "Time cannot be estimated");
    });
});
