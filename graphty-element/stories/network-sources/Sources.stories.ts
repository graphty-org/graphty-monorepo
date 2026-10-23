/**
 * @file Loading graphs from network sources: NDEx, the Neo4j demo server over HTTP and over Bolt,
 * OpenAlex and STRING through the REST mapping, a third party's 15-line source, and a reopened
 * project whose load waits. Every story replays recorded responses unless `live` is on.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { credentials } from "../../index.ts";
import ndexRecordings from "../fixtures/sources/ndex-wp5483.json";
import boltRecordings from "../fixtures/sources/neo4j-bolt.json";
import neo4jRecordings from "../fixtures/sources/neo4j-movies.json";
import openalexRecordings from "../fixtures/sources/openalex-citing.json";
import peopleRecordings from "../fixtures/sources/people.json";
import stringRecordings from "../fixtures/sources/string-tp53.json";
import { installBoltReplay } from "./bolt-replay";
import {
    LABEL_STYLE,
    labelLayer,
    LAYOUT_SEED,
    MOVIE_LAYERS,
    NEO4J_DEMO,
    PEOPLE,
    PEOPLE_LAYERS,
    renderWithCaption,
    type SourceArgs,
    sourceMeta,
    sourceStory,
} from "./shared";

const meta: Meta<SourceArgs> = {
    ...sourceMeta,
    title: "Data/Network sources/Sources",
    id: "network-sources-sources",
    // Storybook reads tags from the meta itself, not from a spread
    tags: ["autodocs"],
    parameters: {
        ...sourceMeta.parameters,
        docs: {
            description: {
                component:
                    "Load a graph from a service on the network instead of a file: NDEx, a Neo4j database over HTTP or Bolt, OpenAlex, STRING, or a source you write yourself with `defineSource`. Call `graph.loadFromSource(id, params, options)` or `graph.session.data.import({ source, config }, options)`; the options carry the endpoint and the credential, which is never saved. Network sources are experimental. Every story here answers from recorded responses unless its `live` control is on.",
            },
        },
    },
    render: renderWithCaption(),
};
export default meta;

/** NDEx's WikiPathways WP5483, a 57-node pathway: a CX2 file, read by graph-io's importer. */
export const NdexWp5483 = sourceStory({
    text: {
        caption:
            'NDEx: WikiPathways WP5483, "Hallmark of cancer: non-mutational epigenetic reprogramming" (human). ' +
            "Blue = genes and molecules, gray = drawing boxes.",
        description:
            "A biological pathway published on NDEx (ndexbio.org), the network exchange of the Cytoscape " +
            "community: WikiPathways WP5483, how cancer cells change gene activity without mutations. The " +
            "`ndex` source downloads it by its NDEx id as a CX2 file and graph-io's CX2 importer reads it. " +
            "Each blue, labelled node is a gene, molecule or complex (its `name`); the small gray ones are " +
            "the boxes and notes of the pathway drawing, which NDEx stores as nodes too; the edges are the " +
            "pathway's arrows.",
        use: "To draw a network someone published on NDEx, by its id, without downloading the file yourself.",
        code: `const graph = document.querySelector("graphty-element");
await graph.loadFromSource("ndex", { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" });`,
    },
    // a pathway is many small separate pieces, which full-strength repulsion pushes far apart
    layoutConfig: { gravity: -0.4, springLength: 12, springCoefficient: 0.005 },
    layers: [
        {
            name: "Pathway boxes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#b8c2cc", "node.size": 0.7 },
        },
        {
            ...labelLayer("name"),
            set: { "node.color": "#3b6fd4", "node.labelStyle": LABEL_STYLE },
        },
    ],
    recordings: ndexRecordings,
    load: (element, options) =>
        element.session.data.import(
            { source: "ndex", config: { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" }, name: "WP5483" },
            options,
        ),
});

/** Tom Hanks's films from the Neo4j demo server's movies database, over its HTTP Query API. */
export const Neo4jMovies = sourceStory({
    text: {
        caption: "Neo4j demo movies database, over HTTP: Tom Hanks (blue) and the 12 films he acted in (orange).",
        description:
            "The movies database on Neo4j's public demo server (demo.neo4jlabs.com, login movies/movies), " +
            "asked with one Cypher query, `MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p`, " +
            "through Neo4j's HTTP Query API. Every path the query returns becomes nodes and edges: the " +
            "person, labelled by `name`, and each film, labelled by `title`.",
        use: "To draw the result of a Cypher query against a Neo4j database the page can reach over HTTPS.",
        code: `import { credentials } from "@graphty/graphty-element";

const graph = document.querySelector("graphty-element");
await graph.session.data.import(
    {
        source: "neo4j",
        config: {
            query: "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p",
            parameters: { name: "Tom Hanks" },
            database: "movies",
        },
    },
    { endpoint: "https://demo.neo4jlabs.com:7473", credential: credentials.basic("movies", "movies") },
);`,
    },
    layers: MOVIE_LAYERS,
    recordings: neo4jRecordings,
    load: (element, options) =>
        element.session.data.import(
            {
                source: "neo4j",
                config: {
                    query: "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p",
                    parameters: { name: "Tom Hanks" },
                    database: "movies",
                },
            },
            { ...options, endpoint: NEO4J_DEMO, credential: credentials.basic("movies", "movies") },
        ),
});

/**
 * Keanu Reeves's films from the same database over Bolt (`bolt+s://`, a secure WebSocket in a
 * browser), through the optional peer neo4j-driver. Recorded, the driver talks to a WebSocket that
 * replays the server's recorded frames.
 */
export const Neo4jOverBolt: StoryObj<SourceArgs> = sourceStory({
    text: {
        caption: "Neo4j demo movies database, over Bolt: Keanu Reeves (blue) and the 7 films he acted in (orange).",
        description:
            "The same demo database and the same kind of query, sent over Bolt, Neo4j's own binary protocol, " +
            "instead of HTTP. In a browser Bolt runs over a secure WebSocket (`bolt+s://`), through the " +
            "optional peer dependency neo4j-driver; the graph that comes back is the same shape as over HTTP. " +
            "Recorded, the driver talks to a WebSocket that replays the frames the real server sent.",
        use:
            "When the database is reachable over Bolt but not over the HTTP Query API. Install the optional " +
            "peer `neo4j-driver` first (`npm install neo4j-driver`); the element loads it on first use.",
        code: `import { credentials } from "@graphty/graphty-element";

const graph = document.querySelector("graphty-element");
await graph.session.data.import(
    {
        source: "neo4j",
        config: {
            transport: "bolt",
            query: "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p",
            parameters: { name: "Keanu Reeves" },
            database: "movies",
        },
    },
    { endpoint: "bolt+s://demo.neo4jlabs.com:7687", credential: credentials.basic("movies", "movies") },
);`,
    },
    layers: MOVIE_LAYERS,
    recordings: [],
    load: async (element, _options, live) => {
        const restore = live ? () => undefined : installBoltReplay(boltRecordings);
        try {
            await element.session.data.import(
                {
                    source: "neo4j",
                    config: {
                        transport: "bolt",
                        query: "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p",
                        parameters: { name: "Keanu Reeves" },
                        database: "movies",
                    },
                },
                { endpoint: "bolt+s://demo.neo4jlabs.com:7687", credential: credentials.basic("movies", "movies") },
            );
        } finally {
            restore();
        }
    },
});

/** The works citing Watts and Strogatz's small-world paper, from OpenAlex through the REST mapping. */
export const OpenAlexCiting = sourceStory({
    text: {
        caption:
            "OpenAlex: Watts and Strogatz's 1998 small-world paper (red) and 30 of the papers that cite it. " +
            "Label = year, node size = times cited.",
        description:
            "OpenAlex (openalex.org) is an open catalog of scholarly papers. The `openalex` source asks it " +
            "for one work, Watts and Strogatz's \"Collective dynamics of 'small-world' networks\" " +
            "(W2112090702), and works that cite it (30 of them, recorded), through graph-io's REST mapping. " +
            "Each paper is labelled by its year and sized by how often it is cited. The papers those works " +
            "cite in turn arrive as placeholders with no details (about 2,400 of them); this story removes " +
            "them after the load, so only the 31 papers with details are drawn.",
        use: "To draw the citation network around one paper from the OpenAlex catalog, by its work id.",
        code: `const graph = document.querySelector("graphty-element");
await graph.loadFromSource("openalex", { work: "W2112090702" });
// optional: drop the cited papers that arrived without details
const { data } = graph.session;
await data.removeNodes(data.nodes().filter((n) => n["_source.stub"] === true).map((n) => n.id));`,
    },
    layers: [
        {
            name: "Paper: year",
            target: "node",
            selector: { match: "has", path: "data.year" },
            encode: {
                "node.label": { by: "data.year", scale: "passthrough" },
                "node.size": { by: "data.citedBy", scale: "linear", domain: [0, 43000], range: [1, 3.5] },
            },
            set: { "node.labelStyle": LABEL_STYLE },
        },
        {
            name: "The cited paper",
            target: "node",
            selector: { match: "ids", nodes: ["W2112090702"] },
            set: { "node.color": "#d64545" },
        },
    ],
    recordings: openalexRecordings,
    load: async (element, options) => {
        const { data } = element.session;
        await data.import({ source: "openalex", config: { work: "W2112090702" } }, options);
        // the papers the loaded works cite arrive as placeholders with no details: the reader's choice here
        await data.removeNodes(
            data
                .nodes()
                .filter((node) => node["_source.stub"] === true)
                .map((node) => node.id),
        );
        // lay the 31 papers out again by themselves, rather than where the placeholders pushed them
        await element.setLayout("ngraph", { seed: LAYOUT_SEED, dim: 2 });
    },
});

/**
 * STRING's functional partners of TP53: the `rest` source's catalog sample, loaded by its id, with
 * the mapping the sample carries, so no code knows STRING's response shape.
 */
export const StringTp53 = sourceStory({
    text: {
        caption:
            "STRING: 20 human proteins that work with TP53 (red). Edge width = STRING's combined confidence " +
            "score, 0.4 to 1.",
        description:
            "STRING (string-db.org) collects known and predicted protein-protein interactions. This is its " +
            "network for TP53, the tumor suppressor p53, with its 20 closest functional partners in humans " +
            "(species 9606). It is the `rest` source's catalog sample, loaded by its id with " +
            '`session.data.loadSample("string-tp53")`: the sample carries the REST mapping, so no code ' +
            "here knows STRING's response shape. Each protein is labelled by its gene name, and each edge's " +
            "width is STRING's combined score, its confidence that the two proteins work together.",
        use:
            "To load one of the samples a source lists in the catalog, by its id, with its parameters, " +
            "address and published login filled in for you.",
        code: `const graph = document.querySelector("graphty-element");
await graph.session.data.loadSample("string-tp53");`,
    },
    layers: [
        labelLayer("name"),
        {
            name: "TP53",
            target: "node",
            selector: { match: "expression", where: "data.name == 'TP53'" },
            set: { "node.color": "#d64545", "node.size": 1.6 },
        },
        {
            name: "Confidence",
            target: "edge",
            selector: { match: "has", path: "data.score" },
            set: { "edge.arrowHead": "none" },
            encode: { "edge.width": { by: "data.score", scale: "linear", domain: [0.4, 1], range: [0.3, 8] } },
        },
    ],
    recordings: stringRecordings,
    load: (element, options) => element.session.data.loadSample("string-tp53", options),
});

/** A third party's 15-line source, registered on the page and loaded by its id. */
export const CustomSource = sourceStory({
    text: {
        caption:
            'A third party\'s own 15-line source: the 8 people of the "core" team, from an example people ' +
            "service. Arrows = who knows whom.",
        description:
            "A source any application can write: `defineSource` with one `records` function that fetches " +
            "`/api/people?team=core` and returns plain nodes and edges, registered on the page and then " +
            "loaded by its id, like a built-in one. The service (people.example.com) is made up, so its " +
            "answer is always the recording; each person is labelled by `name`.",
        use: "When your data sits behind your own HTTP API and no built-in source reads it.",
        code: `import { defineSource, registerSource } from "@graphty/graphty-element";

registerSource(
    defineSource({
        id: "people",
        async records(params, ctx) {
            const rows = await ctx.fetchJson("/api/people?team=" + encodeURIComponent(params.team));
            return {
                nodes: rows.map((r) => ({ id: r.id, name: r.name })),
                edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
            };
        },
    }),
);

const graph = document.querySelector("graphty-element");
await graph.loadFromSource("people", { team: "core" }, { endpoint: "https://people.example.com" });`,
    },
    layers: PEOPLE_LAYERS,
    recordings: peopleRecordings,
    load: async (element, options) => {
        await element.loadFromSource("people", { team: "core" }, { ...options, endpoint: PEOPLE });
    },
});

/**
 * A saved project reopened: its rows draw at once from the file, and its load waits, fetching
 * nothing, until the application runs it.
 */
export const PendingProject = sourceStory({
    text: {
        caption:
            'A saved project reopened: the 8 people of the "core" team drawn from the file, while the load ' +
            "that fetched them waits, unrun, until the application runs it.",
        description:
            "The custom people source's graph, saved with `session.project.save()` and opened again with " +
            "`session.project.open()`. The graph draws at once from the file's own rows, and the source load " +
            "is restored as a pending load: nothing is fetched until the application decides to run it, so " +
            "reopening a file never contacts a server by itself. The facts under the graph list the waiting " +
            "load from `session.data.pendingSourceLoads()`.",
        use:
            "When an application saves and reopens projects whose graphs came from a server, and must decide " +
            "itself whether and when to fetch again.",
        code: `const graph = document.querySelector("graphty-element");
const saved = await graph.session.project.save();
// later, in another visit
await graph.session.project.open(saved.text);
const waiting = graph.session.data.pendingSourceLoads(); // nothing fetched yet`,
    },
    layers: PEOPLE_LAYERS,
    recordings: peopleRecordings,
    load: async (element, options) => {
        const { session } = element;
        await session.data.import({ source: "people", config: { team: "core" } }, { ...options, endpoint: PEOPLE });
        const saved = await session.project.save();
        await session.project.open(saved.text, { discard: true });
        await element.setLayout("ngraph", { seed: LAYOUT_SEED, dim: 2 });
    },
    facts: (element) => {
        const { data } = element.session;
        const pending = data.pendingSourceLoads();
        return [
            `nodes ${String(data.nodes().length)}, edges ${String(data.edges().length)} (from the file)`,
            ...pending.map(
                (load) =>
                    `waiting: ${load.id} from ${load.source} at ${load.endpoint ?? "(none)"}, ` +
                    `query ${String(load.hasQuery)}, local ${String(load.isLocalNetwork)}, auth ${load.authRequired}`,
            ),
        ].join("\n");
    },
});
