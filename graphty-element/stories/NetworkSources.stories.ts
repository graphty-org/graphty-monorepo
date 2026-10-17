/**
 * @file Loading graphs from network sources: NDEx, the Neo4j demo server, OpenAlex, a third
 * party's 15-line source, a refused load and a reopened project whose loads wait.
 *
 * Every story replays responses recorded from the real public services
 * (`stories/fixtures/sources/`), so nothing here touches the network and every picture is the same
 * every time. The `live` control (off by default) sends the same requests to the real service
 * instead, to check a recording is still what the service answers.
 *
 * The line of text under the graph is the story's own, not the element's: the element hands back
 * coded facts (`data.loads()`, `pendingSourceLoads()`, an error's `code` and `details`), and the
 * story prints them, as an application would word them.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    credentials,
    defineSource,
    type GraphSource,
    type Graphty,
    type GraphtyError,
    listSources,
    registerSource,
    replayFetch,
    type SourceLoadOptions,
} from "../index.ts";
import ndexRecordings from "./fixtures/sources/ndex-wp5483.json";
import neo4jRecordings from "./fixtures/sources/neo4j-movies.json";
import openalexRecordings from "./fixtures/sources/openalex-citing.json";
import peopleRecordings from "./fixtures/sources/people.json";

/**
 * Register a source once, however often Storybook evaluates this file.
 * @param source - The source.
 */
function registerOnce<P>(source: GraphSource<P>): void {
    if (!listSources().some((info) => info.id === source.id)) {
        registerSource(source);
    }
}

// A third party's first source (design section 4.1): fifteen lines, no snapshot, no sink.
registerOnce(
    defineSource({
        id: "people",
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
                `/api/people?team=${encodeURIComponent(params.team)}`,
            );
            return {
                nodes: rows.map((r) => ({ id: r.id, name: r.name })),
                edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
            };
        },
    }),
);

// The same, behind a login, so a load with no credential is refused before any request.
registerOnce(
    defineSource({
        id: "people-private",
        descriptor: { plainName: "People (private)", authRequired: "required", auth: ["bearer"], params: [] },
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string }[]>(`/api/people?team=${encodeURIComponent(params.team)}`);
            return { nodes: rows.map((r) => ({ id: r.id })) };
        },
    }),
);

/** The people service's address: example.com, which only the recordings answer. */
const PEOPLE = "https://people.example.com";

/** The story's controls. */
interface SourceArgs {
    /** Ask the real service instead of replaying its recorded answers. */
    live: boolean;
}

/** One story: what it loads, from where, and what it prints under the graph. */
interface SourceStory {
    readonly recordings: Parameters<typeof replayFetch>[0];
    /**
     * Load into the element.
     * @param element - The element.
     * @param options - The fetch to use (absent when live).
     * @returns Settles once loaded.
     */
    readonly load: (element: Graphty, options: SourceLoadOptions) => Promise<void>;
    /**
     * What to print once it loaded; the load's record by default.
     * @param element - The element.
     * @returns The text.
     */
    readonly facts?: (element: Graphty) => string;
}

/**
 * The element and the line of facts under it.
 * @returns The story's root.
 */
function render(): HTMLElement {
    const root = document.createElement("div");
    root.style.cssText = "display: flex; flex-direction: column; width: 100%; height: 860px; font: 13px monospace;";
    const element = document.createElement("graphty-element");
    element.setAttribute("layout", "circular");
    element.style.cssText = "display: block; width: 100%; flex: 1;";
    const facts = document.createElement("pre");
    facts.dataset.role = "facts";
    facts.style.cssText = "margin: 0; padding: 8px; white-space: pre-wrap; min-height: 60px;";
    root.append(element, facts);
    return root;
}

/**
 * The record of the newest load, as plain facts.
 * @param element - The element.
 * @returns The text.
 */
function loadFacts(element: Graphty): string {
    const { data } = element.session;
    const record = data.loads().at(-1);
    return [
        `nodes ${String(data.nodes().length)}, edges ${String(data.edges().length)}`,
        record === undefined
            ? "no load"
            : `source ${record.source} v${String(record.version)} at ${record.endpoint ?? "(none)"}, ` +
              `credential ${record.credential === null ? "none" : `${record.credential.kind} for ${record.credential.origin}`}`,
    ].join("\n");
}

/**
 * Run a story's load in its play function, so the capture waits for it, and print the outcome.
 * @param story - The story.
 * @returns The Storybook story.
 */
function sourceStory(story: SourceStory): StoryObj<SourceArgs> {
    return {
        args: { live: false },
        play: async ({ canvasElement, args }) => {
            const element = canvasElement.querySelector<Graphty>("graphty-element");
            const facts = canvasElement.querySelector<HTMLElement>("[data-role=facts]");
            if (element === null || facts === null) {
                throw new Error("the story rendered no element");
            }

            await element.updateComplete;
            const options: SourceLoadOptions = args.live ? {} : { fetch: replayFetch(story.recordings) };
            try {
                await story.load(element, options);
                facts.textContent = (story.facts ?? loadFacts)(element);
            } catch (error) {
                const { code, details } = error as Partial<GraphtyError>;
                facts.textContent = code === undefined ? String(error) : `${code} ${JSON.stringify(details)}`;
            }

            await element.waitForStableFrame();
        },
    };
}

const meta: Meta<SourceArgs> = {
    title: "Network sources",
    component: "graphty-element",
    render,
    argTypes: { live: { control: "boolean", description: "Ask the real service instead of its recordings" } },
    parameters: { controls: { include: ["live"] } },
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

/** Tom Hanks's films from the Neo4j demo server's movies database, with its published login. */
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
            {
                ...options,
                endpoint: "https://demo.neo4jlabs.com:7473",
                credential: credentials.basic("movies", "movies"),
            },
        ),
});

/** The works citing Watts and Strogatz's small-world paper, from OpenAlex through the REST mapping. */
export const OpenAlexCiting = sourceStory({
    recordings: openalexRecordings,
    load: (element, options) =>
        element.session.data.import({ source: "openalex", config: { work: "W2112090702" } }, options),
});

/** A third party's 15-line source, registered on the page and loaded by its id. */
export const CustomSource = sourceStory({
    recordings: peopleRecordings,
    load: async (element, options) => {
        await element.loadFromSource("people", { team: "core" }, { ...options, endpoint: PEOPLE });
    },
});

/** A source that needs a login, given none and remembering none: refused before any request. */
export const MissingCredential: StoryObj<SourceArgs> = {
    ...sourceStory({
        recordings: peopleRecordings,
        load: (element, options) =>
            element.session.data.import(
                { source: "people-private", config: { team: "core" } },
                { ...options, endpoint: PEOPLE },
            ),
    }),
    parameters: { paintCheck: { exempt: "the load is refused before any request, so it draws no graph on purpose" } },
};

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
