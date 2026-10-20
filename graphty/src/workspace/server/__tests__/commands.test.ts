/**
 * The server form's rows as one `data.import` call: the params a source takes, the cap, the load's
 * own double-click expand, and only the servers a browser can reach.
 */

import { assert, describe, it } from "vitest";

import { freshForm, serverKinds, serverRequest } from "../commands";

/**
 * A source of the catalog, by id.
 * @param id - the source id.
 * @returns the entry.
 */
function kind(id: string): ReturnType<typeof serverKinds>[number] {
    const entry = serverKinds().find((each) => each.id === id);
    if (entry === undefined) {
        throw new Error(`no ${id} source`);
    }
    return entry;
}

describe("the server form's request", () => {
    it("lists the browser's servers, without Neptune or graph-samples", () => {
        const ids = serverKinds().map((each) => each.id);
        assert.includeMembers(ids, ["neo4j", "ndex", "openalex", "sparql", "rest"]);
        assert.notInclude(ids, "neptune");
        assert.notInclude(ids, "graph-samples");
    });

    it("pages Cypher, SPARQL and OpenAlex loads, and never NDEx's, which load whole", () => {
        assert.isTrue(kind("neo4j").features.more);
        assert.isTrue(kind("sparql").features.more);
        assert.isTrue(kind("openalex").features.more);
        assert.isFalse(kind("ndex").features.more);
    });

    it("sends a Cypher query start with its cap and a double-click expand", () => {
        const neo4j = kind("neo4j");
        const form = { ...freshForm(neo4j), endpoint: "https://demo.neo4jlabs.com:7473", limit: 100 };
        const { input, options } = serverRequest(neo4j, form);
        assert.equal(input.source, "neo4j");
        assert.equal(input.config.mode, "query");
        assert.isString(input.config.query);
        assert.equal(input.name, "Neo4j demo.neo4jlabs.com:7473");
        assert.deepEqual(options.limits, { maxNodes: 100, onLimit: "stop" });
        assert.deepEqual(options.expand, { trigger: "double-click", depth: 1, direction: "both", limit: 50 });
    });

    it("splits seeds and edge types, and leaves out blanks, the cap and the expand when unset", () => {
        const neo4j = kind("neo4j");
        const form = {
            ...freshForm(neo4j),
            params: { mode: "neighborhood", ids: "a, b ,", database: "" },
            limit: 0,
            expand: false,
        };
        const { input, options } = serverRequest(neo4j, form);
        assert.deepEqual(input.config.ids, ["a", "b"]);
        assert.notProperty(input.config, "database");
        assert.notProperty(options, "limits");
        assert.notProperty(options, "expand");
        assert.notProperty(options, "endpoint");
    });

    it("reads a REST mapping typed as JSON", () => {
        const rest = kind("rest");
        const form = { ...freshForm(rest), params: { mapping: '{ "endpoint": "https://x.example" }' } };
        assert.deepEqual(serverRequest(rest, form).input.config.mapping, { endpoint: "https://x.example" });
    });
});
