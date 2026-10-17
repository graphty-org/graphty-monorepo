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
import { PEOPLE, render, type SourceArgs, sourceMeta, type SourceStory, sourceStory } from "./shared";

const meta: Meta<SourceArgs> = {
    ...sourceMeta,
    title: "Network sources/Errors",
    render: () => render(),
};
export default meta;

/**
 * A story that draws no graph on purpose.
 * @param story - The story.
 * @param why - Why it draws none.
 * @returns The Storybook story.
 */
function errorStory(story: SourceStory, why: string): StoryObj<SourceArgs> {
    return { ...sourceStory(story), parameters: { paintCheck: { exempt: why } } };
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
        recordings: peopleRecordings,
        load: (element, options) =>
            element.session.data.import(
                { source: "people-private", config: { team: "core" } },
                { ...options, endpoint: PEOPLE },
            ),
    },
    "the load is refused before any request, so it draws no graph on purpose",
);
