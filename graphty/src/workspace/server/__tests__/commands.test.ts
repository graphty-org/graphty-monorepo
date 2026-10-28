/**
 * The server form's rows as one `data.import` call: the params a source takes, the cap, the load's
 * own double-click expand, and only the servers a browser can reach.
 */

import { assert, describe, it } from "vitest";

import { formReady, freshForm, serverKinds, serverRequest, withExample } from "../commands";

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

    it("is not ready without an endpoint the source has no default for, or the Start's query or seeds", () => {
        const neo4j = kind("neo4j");
        const fresh = freshForm(neo4j);
        assert.isFalse(formReady(neo4j, fresh), "Neo4j has no default endpoint");
        const filled = { ...fresh, endpoint: "https://demo.neo4jlabs.com:7473" };
        assert.isTrue(formReady(neo4j, filled));
        assert.isFalse(formReady(neo4j, { ...filled, params: { mode: "query", query: " " } }));
        assert.isFalse(formReady(neo4j, { ...filled, params: { mode: "neighborhood", ids: "" } }));
        assert.isTrue(formReady(neo4j, { ...filled, params: { mode: "neighborhood", ids: "a" } }));
        const ndex = kind("ndex");
        assert.isFalse(formReady(ndex, freshForm(ndex)), "NDEx needs its network UUID");
        assert.isTrue(formReady(ndex, { ...freshForm(ndex), params: { uuid: "x" } }));
    });

    it("fills from an example but keeps the reader's Start and takes the example's transport", () => {
        const neo4j = kind("neo4j");
        const hetionet = withExample(neo4j, freshForm(neo4j), "hetionet");
        assert.equal(hetionet.params.mode, "query", "the reader's Start stays");
        assert.equal(hetionet.params.transport, "bolt");
        const movies = withExample(neo4j, hetionet, "neo4j-movies");
        assert.equal(movies.params.mode, "query", "Everything is not forced");
        assert.notProperty(movies.params, "transport", "Bolt does not carry over");
        assert.notProperty(movies.params, "idProperty");
        assert.equal(movies.params.database, "movies");
        assert.equal(movies.endpoint, "https://demo.neo4jlabs.com:7473");
        assert.equal(movies.user, "movies");
    });
});
