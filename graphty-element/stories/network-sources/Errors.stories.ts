/**
 * @file What a refused or stopped load looks like: a service the browser blocks, a plain http
 * endpoint a login is never sent to, a load cancelled by its signal, and a source that needs a
 * login given none. Each prints the error's `code` and `details` (or, for a cancel, the signal's
 * own AbortError), as an application would read them before choosing its words. None draws a
 * graph, on purpose.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { credentials, type SourceLoadOptions } from "../../index.ts";
import ndexRecordings from "../fixtures/sources/ndex-wp5483.json";
import peopleRecordings from "../fixtures/sources/people.json";
import { PEOPLE, renderWithCaption, type SourceArgs, sourceMeta, type SourceStory, sourceStory } from "./shared";

const meta: Meta<SourceArgs> = {
    ...sourceMeta,
    title: "Data/Network sources/Errors",
    id: "network-sources-errors",
    // Storybook reads tags from the meta itself, not from a spread
    tags: ["autodocs"],
    parameters: {
        ...sourceMeta.parameters,
        docs: {
            description: {
                component:
                    "What a load that is refused or stopped rejects with: a `GraphtyError` whose `code` and `details` an application reads to choose its own words (an `AbortError` for a cancel). None of these stories draws a graph, on purpose.",
            },
        },
    },
    render: renderWithCaption(),
};
export default meta;

/**
 * A story that draws no graph on purpose.
 * @param story - The story.
 * @param why - Why it draws none.
 * @returns The Storybook story.
 */
function errorStory(story: SourceStory, why: string): StoryObj<SourceArgs> {
    const base = sourceStory(story);
    return { ...base, parameters: { ...base.parameters, paintCheck: { exempt: why } } };
}

/**
 * What a browser does to a request a service sends no CORS headers for: the request fails with a
 * bare TypeError, while a bodyless no-cors request to the same origin goes through. That second
 * request is how graph-io tells "blocked" from "unreachable".
 * @param input - The request.
 * @param init - Its options.
 * @returns A refusal, or an opaque answer for a no-cors request.
 */
function corsRefusingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const mode = init?.mode ?? (input instanceof Request ? input.mode : "cors");
    return mode === "no-cors" ? Promise.resolve(new Response(null)) : Promise.reject(new TypeError("Failed to fetch"));
}

/**
 * A service the browser blocks: SNAP's data server sends no CORS headers, so a page cannot read
 * it. The load fails with `E_SOURCE_BLOCKED` and the cause graph-io diagnosed.
 */
export const Blocked = errorStory(
    {
        text: {
            caption:
                "A refused load: a server that sends no CORS headers (SNAP's data server), which a page may not " +
                "read. Below: the error code and details.",
            description:
                "Browsers only let a page read a response from another site when that site allows it with CORS " +
                "headers. SNAP's data server (snap.stanford.edu) sends none, so the load fails with " +
                '`E_SOURCE_BLOCKED`. graph-io tells "blocked" from "unreachable" with a second, bodyless ' +
                "no-cors request, and names the cause in the error's details. An application reads the code " +
                "and details and chooses its own words; this story prints them. No graph is drawn, on purpose.",
            use:
                "To learn which error a load from a service without CORS headers gives, so the application can " +
                "tell the reader the service must be reached through a proxy.",
            code: `const graph = document.querySelector("graphty-element");
try {
    await graph.loadFromSource("people", { team: "core" }, { endpoint: "https://snap.stanford.edu" });
} catch (error) {
    if (error.code === "E_SOURCE_BLOCKED") {
        console.log(error.details); // what graph-io found
    }
}`,
        },
        recordings: [],
        load: async (element, options) => {
            await element.loadFromSource(
                "people",
                { team: "core" },
                {
                    ...options,
                    ...(options.fetch === undefined ? {} : { fetch: corsRefusingFetch }),
                    endpoint: "https://snap.stanford.edu",
                },
            );
        },
    },
    "the browser refuses the load, so it draws no graph on purpose",
);

/**
 * A login given for a plain http endpoint: refused before any request, since a credential is never
 * sent without TLS (`E_SOURCE_PARAM`, reason `insecure-endpoint`; an https page refuses any plain
 * http endpoint first, as `E_SOURCE_RUNTIME`). The recordings are empty, so a request would fail.
 */
export const RefusedHttp = errorStory(
    {
        text: {
            caption:
                "A refused load: a login offered to a plain http address, refused before any request is sent. " +
                "Below: the error code and details.",
            description:
                "A credential is never sent without TLS. Loading from `http://demo.neo4jlabs.com:7474` with the " +
                "demo login fails with `E_SOURCE_PARAM`, reason `insecure-endpoint`, before anything leaves the " +
                "page (on an https page, any plain http address is refused first, as `E_SOURCE_RUNTIME`). " +
                "No graph is drawn, on purpose.",
            use:
                "To learn what a load that would send a login without TLS gives, so the application can ask " +
                "for the https address instead.",
            code: `import { credentials } from "@graphty/graphty-element";

const graph = document.querySelector("graphty-element");
try {
    await graph.session.data.import(
        { source: "neo4j", config: { mode: "all", database: "movies" } },
        { endpoint: "http://demo.neo4jlabs.com:7474", credential: credentials.basic("movies", "movies") },
    );
} catch (error) {
    console.log(error.code, error.details); // E_SOURCE_PARAM, reason insecure-endpoint
}`,
        },
        recordings: [],
        load: (element, options) =>
            element.session.data.import(
                { source: "neo4j", config: { mode: "all", database: "movies" } },
                {
                    ...options,
                    endpoint: "http://demo.neo4jlabs.com:7474",
                    credential: credentials.basic("movies", "movies"),
                },
            ),
    },
    "the load is refused before any request, so it draws no graph on purpose",
);

/**
 * A load cancelled as its first request starts: it rejects at once with the signal's reason, an
 * AbortError, and leaves no load record and no rows behind.
 */
export const Cancelled = errorStory(
    {
        text: {
            caption:
                "A cancelled load: an NDEx download stopped by its AbortSignal as its first request starts. " +
                "Below: what the load rejected with.",
            description:
                "Every load takes a `signal`. Here the story aborts it the moment the first request to NDEx " +
                "starts: the load rejects at once with the signal's own AbortError, and leaves no rows and no " +
                "load record behind. No graph is drawn, on purpose.",
            use: "To let a reader stop a slow download: pass a `signal` and abort it.",
            code: `const graph = document.querySelector("graphty-element");
const controller = new AbortController();
cancelButton.onclick = () => controller.abort();
await graph.loadFromSource(
    "ndex",
    { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" },
    { signal: controller.signal },
);`,
        },
        recordings: ndexRecordings,
        load: async (element, options) => {
            const controller = new AbortController();
            const inner = options.fetch ?? globalThis.fetch;
            const cancelOnFirstRequest: typeof fetch = (input, init) => {
                controller.abort();
                return inner(input, { ...init, signal: controller.signal });
            };
            const cancelled: SourceLoadOptions = { ...options, fetch: cancelOnFirstRequest, signal: controller.signal };
            const outcome = await element.session.data
                .import({ source: "ndex", config: { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" } }, cancelled)
                .then(
                    () => null,
                    (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
                );
            const { data } = element.session;
            if (data.loads().length !== 0 || data.nodes().length !== 0) {
                throw new Error("the cancelled load left rows or a load record behind");
            }
            if (outcome !== null) {
                throw outcome;
            }
        },
    },
    "the load is cancelled, so it draws no graph on purpose",
);

/** A source that needs a login, given none and remembering none: refused before any request. */
export const MissingCredential = errorStory(
    {
        text: {
            caption:
                "A refused load: a source that needs a login, given none and with none remembered. Below: the " +
                "error code and details.",
            description:
                'The `people-private` source declares that it needs a login (`authRequired: "required"`). ' +
                "Loaded with no credential and none remembered for its address, it is refused before any " +
                "request is sent, with `E_SOURCE_AUTH`, so the application can ask the reader to sign in. No graph " +
                "is drawn, on purpose.",
            use:
                "To learn what a source that needs a login gives when none is passed or remembered, so the " +
                "application can ask the reader to sign in, then remember it with `graph.credentials.remember`.",
            code: `const graph = document.querySelector("graphty-element");
try {
    await graph.loadFromSource("people-private", { team: "core" }, { endpoint: "https://people.example.com" });
} catch (error) {
    if (error.code === "E_SOURCE_AUTH") {
        // ask the reader to sign in
    }
}`,
        },
        recordings: peopleRecordings,
        load: (element, options) =>
            element.session.data.import(
                { source: "people-private", config: { team: "core" } },
                { ...options, endpoint: PEOPLE },
            ),
    },
    "the load is refused before any request, so it draws no graph on purpose",
);
