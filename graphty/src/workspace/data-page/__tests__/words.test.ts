import { assert, describe, it } from "vitest";

import { addWords, graphName, loadedWords, roleWords } from "../words";

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

describe("the words after a load", () => {
    it("says the graph's name, its size and the rows the load left out", () => {
        assert.equal(
            loadedWords("people and messages", { nodes: 12, edges: 22 }, 1),
            "people and messages: 12 nodes, 22 edges, 1 row left out",
        );
        assert.equal(loadedWords("karate", { nodes: 34, edges: 78 }, 0), "karate: 34 nodes, 78 edges");
    });

    it("gives an addition's graph and its file each their own counts", () => {
        assert.equal(
            addWords("friends", { nodes: 20, edges: 41 }, ["friends-v2"], { nodes: 0, edges: 41 }, true, "auto"),
            "friends: 20 nodes, 41 edges; friends-v2 adds 0 nodes, 41 edges",
        );
        assert.equal(
            addWords("friends", { nodes: 20, edges: 41 }, ["staff"], { nodes: 5, edges: 0 }, false, true),
            "friends: 20 nodes, 41 edges; staff adds 5 nodes",
        );
    });
});
