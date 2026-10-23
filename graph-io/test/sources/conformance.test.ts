/**
 * The conformance suite run on a custom paged source over recorded responses, so the suite itself
 * is exercised before the built-in sources call it.
 */

import { defineSource } from "../../src/index.js";
import { runSourceConformance } from "./harness.js";

const API = "https://people.example.com";

type PeoplePage = { people: { id: string; knows: string[] }[]; next: number | null };

const people = defineSource<{ team: string }>({
    id: "people-paged",
    descriptor: { plainName: "People", params: [{ name: "team", plainName: "Team", type: "string", required: true }] },
    async *records(params: { team: string }, ctx) {
        let page: number | null = Number(ctx.cursor?.page ?? 0);
        while (page !== null) {
            const body: PeoplePage = await ctx.fetchJson<PeoplePage>(
                `/api/people?team=${encodeURIComponent(params.team)}&page=${String(page)}`,
            );
            yield {
                nodes: body.people.map((p) => ({ id: p.id })),
                edges: body.people.flatMap((p) => p.knows.map((k) => ({ source: p.id, target: k }))),
                next: body.next === null ? null : { page: body.next },
            };
            page = body.next;
        }
    },
});

runSourceConformance(people, [
    {
        name: "two pages",
        params: { team: "core" },
        endpoint: API,
        cap: { maxNodes: 1 },
        recordings: [
            { url: `${API}/api/people?team=core&page=0`, body: { people: [{ id: "ana", knows: ["bo"] }], next: 1 } },
            {
                url: `${API}/api/people?team=core&page=1`,
                body: {
                    people: [
                        { id: "bo", knows: [] },
                        { id: "cy", knows: ["ana"] },
                    ],
                    next: null,
                },
            },
        ],
    },
    {
        name: "an auth failure",
        params: { team: "secret" },
        endpoint: API,
        recordings: [{ url: `${API}/api/people?team=secret&page=0`, status: 401 }],
    },
]);
