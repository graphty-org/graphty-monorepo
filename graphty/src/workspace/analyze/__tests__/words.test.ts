import { BUILT_IN_ALGORITHMS, RESULT_SHAPES } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    costLine,
    groupAlgorithms,
    HEADINGS,
    highlightEntry,
    isSlow,
    matches,
    meaningGloss,
    optionWords,
    ranOptionWords,
    runName,
    weightName,
    weightRead,
    wordsFor,
} from "../words";

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

    it("never shows a raw option key or choice value as a label", () => {
        for (const descriptor of BUILT_IN_ALGORITHMS) {
            for (const option of descriptor.options.filter((o) => o.internal !== true)) {
                const words = optionWords(descriptor.key, option);
                const where = `${descriptor.key}.${option.name}`;
                assert.notEqual(words.label, option.name, where);
                for (const { value } of option.values ?? []) {
                    assert.notEqual(words.choice(value), value, `${where}=${value}`);
                }
            }
        }
    });

    it("reads an option it has no words for under the element's plain name and choice labels", () => {
        const words = optionWords("plugin-x", {
            name: "linkage",
            plainName: "Linkage",
            type: "enum",
            values: [{ value: "avg", label: "Average" }],
        });
        assert.equal(words.label, "Linkage");
        assert.equal(words.choice("avg"), "Average");
    });

    it("says a sample size left empty means every node, never a number the run would not use", () => {
        for (const key of ["closeness", "betweenness", "edge-betweenness"]) {
            const descriptor = BUILT_IN_ALGORITHMS.find((d) => d.key === key);
            const k = descriptor?.options.find((o) => o.name === "k");
            assert.isNull(k?.default, key);
            assert.equal(k === undefined ? undefined : optionWords(key, k).empty, "Every node", key);
        }
    });

    it("says which method a finished path used when the reader left it unset, spelled Bellman-Ford", () => {
        const method = BUILT_IN_ALGORITHMS.find((d) => d.key === "shortest-path")?.options.find(
            (o) => o.name === "method",
        );
        assert.isDefined(method);
        if (method === undefined) {
            return;
        }
        const ran = (used: string): string =>
            ranOptionWords({ algorithm: "shortest-path", status: "succeeded", caveats: { method: used } }, method)
                .empty;
        assert.equal(ran("dijkstra"), "Dijkstra, chosen automatically");
        assert.equal(ran("bellman-ford"), "Bellman-Ford, chosen automatically");
        assert.equal(optionWords("shortest-path", method).empty, "Chosen automatically");
        assert.equal(optionWords("shortest-path", method).choice("bellman-ford"), "Bellman-Ford");
    });

    it("calls an estimate slow at ten seconds or more, or when it cannot be bounded", () => {
        assert.isFalse(isSlow(9.9));
        assert.isTrue(isSlow(10));
        assert.isTrue(isSlow(Number.POSITIVE_INFINITY));
    });

    it("words the element's estimate as a cost line", () => {
        assert.equal(costLine(0.2), "Under a second");
        assert.equal(costLine(1), "About 1 second");
        assert.equal(costLine(12.4), "About 12 seconds");
        assert.equal(costLine(600), "About 10 minutes");
        assert.equal(costLine(7200), "About 2 hours");
        assert.equal(costLine(Number.POSITIVE_INFINITY), "Time cannot be estimated");
    });

    it("names a run by its method, keeping the qualifier that tells sibling runs apart", () => {
        const session = { catalog: { algorithms: () => BUILT_IN_ALGORITHMS } } as unknown as GraphSession;
        const pagerank = BUILT_IN_ALGORITHMS.find((descriptor) => descriptor.key === "pagerank");
        assert.isDefined(pagerank);
        const plain = pagerank?.plainName ?? "";
        assert.equal(runName(session, { algorithm: "pagerank", label: plain }), "PageRank");
        assert.equal(
            runName(session, { algorithm: "pagerank", label: `${plain} (selection)` }),
            "PageRank (selection)",
        );
        assert.equal(runName(session, { algorithm: "pagerank", label: "My ranking" }), "My ranking");
        assert.equal(runName(session, { algorithm: "plugin-x", label: "Plugin X run" }), "Plugin X run");
    });

    it("words the weight a run read, the one it skipped, and none, never as a strength", () => {
        // A short value for the row; any explanation is a sentence of its own for a line under it.
        assert.deepEqual(weightRead({ weight: { attribute: "km", meaning: "distance" } }), {
            value: "km (farther)",
            note: null,
        });
        assert.deepEqual(weightRead({ weight: null }), { value: "None", note: "Each edge counts as 1." });
        const skipped = weightRead({
            weight: null,
            weightSkipped: {
                code: "weight.meaning-mismatch",
                params: { attribute: "emails", meaning: "strength", reads: "distance" },
            },
        });
        assert.deepEqual(skipped, {
            value: "None",
            note: "Not read -- emails means closer, and a path needs a distance.",
        });
        const unset = weightRead({
            weight: null,
            weightSkipped: {
                code: "weight.meaning-mismatch",
                params: { attribute: "w", meaning: null, reads: "distance" },
            },
        });
        assert.equal(unset.note, "Not read -- w's meaning is not set, and a path needs a distance.");
        // A meaning nobody set: the value says how it was read, the note that it was assumed,
        // never "meaning not set" and "closer" in one value.
        const assumed = weightRead({ weight: { attribute: "w", meaning: "strength", assumed: true } });
        assert.equal(assumed.value, "w (read as closer)");
        assert.equal(assumed.note, "Its meaning was not set, so this run assumed a higher weight means closer.");
        for (const read of [assumed, unset, skipped]) {
            assert.notMatch(read.value, /not set|--|\)./, "the value is a short fact");
        }
        assert.equal(weightName("weight", "distance", "loaded"), "weight (farther, loaded)");
        // A whole sentence in every state, never a fragment such as "smaller = closer".
        for (const meaning of ["strength", "distance", "capacity", null] as const) {
            assert.match(meaningGloss(meaning), /^A higher weight .*\.$|^Choose what a higher weight means\..*\.$/);
        }
        for (const text of [skipped, unset, weightName("x", "capacity"), meaningGloss(null)]) {
            assert.notMatch(text, /strength|stronger/i);
        }
    });

    it("names what a highlight marks in its own words, never the element's layer name", () => {
        assert.equal(highlightEntry("path"), "On the path");
        for (const shape of RESULT_SHAPES) {
            assert.notMatch(highlightEntry(shape), /route|\(/i);
        }
    });
});
