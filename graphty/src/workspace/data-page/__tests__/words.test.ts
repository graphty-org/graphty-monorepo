import { assert, describe, it } from "vitest";

import { graphName, roleWords } from "../words";

describe("the Data page's role words", () => {
    it("names the time role as a date, so a column of minutes is not taken for it", () => {
        assert.equal(roleWords("time"), "Date or time");
        assert.equal(roleWords("weight"), "Weight");
    });
});

describe("a new graph's name", () => {
    const load = (tables: string[], name?: string) => ({
        tables,
        added: { nodes: 1, edges: 1 },
        ...(name === undefined ? {} : { name }),
    });

    it("names every file the load read, not only the first", () => {
        assert.equal(graphName([load(["players.csv", "passes.csv"])]), "players and passes");
        assert.equal(graphName([load(["a.csv", "b.csv", "c.csv"])]), "a, b, and c");
        assert.equal(graphName([load(["karate.gml"], "karate.gml")]), "karate");
        assert.equal(graphName([load([], "les-miserables.json")]), "les-miserables");
        assert.isUndefined(graphName([]));
    });
});
