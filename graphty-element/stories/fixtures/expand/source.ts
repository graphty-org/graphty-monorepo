/**
 * @file A network source answered from recorded responses (`people.json`): a small co-appearance
 * network from Les Miserables behind a neighborhood API, `GET neighbors?id=<id>&page=<n>`, four
 * neighbors a page. The click-to-expand story, its real-input test and its unit tests share it, so
 * none of them reaches the network.
 */

import {
    defineSource,
    type GraphSource,
    listSources,
    type Recording,
    registerSource,
    replayFetch,
} from "@graphty/graph-io";

import type { SessionData } from "../../../src/session/data";
import type { GraphSession } from "../../../src/session/types";
import people from "./people.json";

/** The source's id. */
export const PEOPLE_SOURCE_ID = "recorded-people";

/** The address the recordings were made against. */
export const PEOPLE_ENDPOINT: string = people.endpoint;

/** The recorded responses. */
export const PEOPLE_RECORDINGS: readonly Recording[] = people.recordings;

/** The node a story starts from. */
export const PEOPLE_SEED: { readonly id: string; readonly name: string } = people.seed;

/** One recorded page. */
interface Page {
    readonly seed: { readonly id: string; readonly name: string; readonly degree: number };
    readonly neighbors: readonly { readonly id: string; readonly name: string; readonly degree: number }[];
    readonly next: number | null;
}

/**
 * The recorded source.
 * @param transport - "recorded" answers every request from the recordings itself, for a click
 *     that passes no fetch; "context" asks through `ctx.fetchJson`, so the caller's `fetch` option
 *     (a `replayFetch`) answers and the credential and endpoint rules apply
 * @returns the source
 */
export function recordedPeopleSource(transport: "recorded" | "context" = "recorded"): GraphSource {
    const replay = replayFetch(PEOPLE_RECORDINGS);
    return defineSource({
        id: transport === "context" ? `${PEOPLE_SOURCE_ID}-context` : PEOPLE_SOURCE_ID,
        descriptor: {
            plainName: "Recorded people",
            defaultEndpoint: PEOPLE_ENDPOINT,
            params: [],
            features: ["expand"],
        },
        records: () => Promise.resolve({ nodes: [PEOPLE_SEED] }),
        async expand(request, sink, ctx) {
            const page = Number(ctx.cursor?.page ?? 1);
            let next: number | null = null;
            for (const id of request.ids) {
                const url = new URL(
                    `neighbors?id=${encodeURIComponent(String(id))}&page=${String(page)}`,
                    ctx.endpoint ?? PEOPLE_ENDPOINT,
                );
                const body =
                    transport === "context"
                        ? await ctx.fetchJson<Page>(url)
                        : ((await (await replay(url)).json()) as Page);
                sink.addNodeRecord(body.seed.id, { name: body.seed.name, "_source.degree": body.seed.degree });
                for (const neighbor of body.neighbors) {
                    sink.addNodeRecord(neighbor.id, { name: neighbor.name, "_source.degree": neighbor.degree });
                    sink.addEdgeRecord(body.seed.id, neighbor.id, {});
                }

                next = body.next ?? next;
            }

            return ctx.finish({ next: next === null ? null : { page: next } });
        },
    });
}

/**
 * Stand in for a load from the recorded source: register it (once), record the load in the
 * session's ledger, and add the seed node carrying that load's key. Until
 * `session.data.import({ source })` records loads itself, this is how a story or a test gets a
 * node a source brought.
 * @param session - the session
 * @param transport - which variant of the source the load names
 * @param seed - more attributes for the seed node, such as its `position`
 * @returns the load's key
 */
export async function loadRecordedSeed(
    session: GraphSession,
    transport: "recorded" | "context" = "recorded",
    seed: Readonly<Record<string, unknown>> = {},
): Promise<string> {
    const source = recordedPeopleSource(transport);
    if (!listSources().some((info) => info.id === source.id)) {
        registerSource(source);
    }

    const load = (session.data as unknown as SessionData).ledger.addLoad({
        source: source.id,
        version: 1,
        config: {},
        endpoint: PEOPLE_ENDPOINT,
    });
    await session.data.addNodes([
        { ...PEOPLE_SEED, ...seed, "_source.loads": [load.key], "_source.expansion": "none" },
    ]);
    return load.key;
}
