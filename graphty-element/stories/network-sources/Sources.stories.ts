/**
 * @file Loading graphs from network sources: NDEx, the Neo4j demo server over HTTP and over Bolt,
 * OpenAlex and STRING through the REST mapping, a third party's 15-line source, and a reopened
 * project whose load waits. Every story replays recorded responses unless `live` is on.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { sourceDescriptors } from "../../catalog.ts";
import { credentials } from "../../index.ts";
import ndexRecordings from "../fixtures/sources/ndex-wp5483.json";
import boltRecordings from "../fixtures/sources/neo4j-bolt.json";
import neo4jRecordings from "../fixtures/sources/neo4j-movies.json";
import openalexRecordings from "../fixtures/sources/openalex-citing.json";
import peopleRecordings from "../fixtures/sources/people.json";
import stringRecordings from "../fixtures/sources/string-tp53.json";
import { installBoltReplay } from "./bolt-replay";
import { NEO4J_DEMO, PEOPLE, render, type SourceArgs, sourceMeta, sourceStory } from "./shared";

const meta: Meta<SourceArgs> = {
    ...sourceMeta,
    title: "Network sources/Sources",
    render: () => render(),
};
export default meta;

/** NDEx's WikiPathways WP5483, a 57-node pathway: a CX2 file, read by graph-io's importer. */
export const NdexWp5483 = sourceStory({
    recordings: ndexRecordings,
    load: (element, options) =>
        element.session.data.import(
            { source: "ndex", config: { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" }, name: "WP5483" },
            options,
        ),
});

/** Tom Hanks's films from the Neo4j demo server's movies database, over its HTTP Query API. */
export const Neo4jMovies = sourceStory({
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
    recordings: openalexRecordings,
    load: (element, options) =>
        element.session.data.import({ source: "openalex", config: { work: "W2112090702" } }, options),
});

/**
 * STRING's functional partners of TP53: the `rest` source with the mapping its catalog sample
 * carries, so no code knows STRING's response shape.
 */
export const StringTp53 = sourceStory({
    recordings: stringRecordings,
    load: (element, options) => {
        const sample = sourceDescriptors()
            .find((info) => info.id === "rest")
            ?.descriptor.samples?.find((s) => s.id === "string-tp53");
        if (sample === undefined) {
            throw new Error("the rest source lists no string-tp53 sample");
        }
        return element.session.data.import(
            { source: "rest", config: sample.params, name: sample.plainName },
            { ...options, ...(sample.endpoint === undefined ? {} : { endpoint: sample.endpoint }) },
        );
    },
});

/** A third party's 15-line source, registered on the page and loaded by its id. */
export const CustomSource = sourceStory({
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
    recordings: peopleRecordings,
    load: async (element, options) => {
        const { session } = element;
        await session.data.import({ source: "people", config: { team: "core" } }, { ...options, endpoint: PEOPLE });
        const saved = await session.project.save();
        await session.project.open(saved.text, { discard: true });
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
