/**
 * @file Saving a load as a reference (the `source-references` experiment) at its corners: which
 * URL schemes can be a reference, and a saved reference entry that a hand edit left without its
 * name, format or the data member's list of loads still reopens, reporting what it can.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const URL_A = "https://data.example.com/graph.json";
const URL_HTTP = "http://data.example.com/plain.json";
const GRAPH = JSON.stringify({
    nodes: [
        { id: "a", label: "Ann" },
        { id: "b", label: "Bob" },
    ],
    edges: [{ source: "a", target: "b" }],
});

/**
 * Stub fetch with a site: each URL answers its text, any other a 404.
 * @param site - URL to text.
 */
function stubSite(site: Record<string, string>): void {
    vi.stubGlobal("fetch", (input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);
        const body = Object.hasOwn(site, url) ? site[url] : undefined;
        return Promise.resolve(
            body === undefined ? new Response("", { status: 404 }) : new Response(body, { status: 200 }),
        );
    });
}

/**
 * A session with the experiment on and one URL load.
 * @param url - The load's address.
 * @returns The session and the load's key.
 */
async function loaded(url: string): Promise<{ session: GraphSession; key: string }> {
    const session = createGraphSession({ features: ["source-references"] });
    session.network.setPolicy("allow");
    await session.data.import({ type: "json", config: { url } });
    return { session, key: session.data.sources()[0]?.key ?? "" };
}

/** A saved file, parsed, with its members. */
interface Saved {
    members: ({ kind: string } & Record<string, unknown>)[];
}

/**
 * Save a session with its one load as a reference, and hand the parsed file to `edit`.
 * @param edit - Changes the parsed file in place.
 * @returns The edited file's text.
 */
async function savedReference(edit: (saved: Saved, load: Record<string, unknown>) => void): Promise<string> {
    const { session, key } = await loaded(URL_A);
    session.data.setCopy(key, "reference");
    const saved = JSON.parse((await session.project.save()).text) as Saved;
    const sources = saved.members.find((member) => member.kind === "graphty-sources") as unknown as {
        loads: Record<string, unknown>[];
    };
    edit(saved, sources.loads[0]);
    session.dispose();
    return JSON.stringify(saved);
}

/**
 * Open a file in a new session that allows every host.
 * @param text - The file.
 * @returns The session and the open's problems.
 */
async function reopen(
    text: string,
): Promise<{ session: GraphSession; problems: readonly { code: string; params: unknown }[] }> {
    const session = createGraphSession({ features: ["source-references"] });
    session.network.setPolicy("allow");
    const report = await session.project.open(text);
    return { session, problems: report.problems };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("which URL loads can be a reference", () => {
    it("takes a plain http address as well as https", async () => {
        stubSite({ [URL_HTTP]: GRAPH });
        const { session, key } = await loaded(URL_HTTP);
        assert.isUndefined(session.data.copies()[0]?.refused);
        assert.strictEqual(session.data.setCopy(key, "reference").copy, "reference");
        session.dispose();
    });

    it("refuses an address that carries a user name, as one holding a secret", async () => {
        const secret = "https://user:pw@data.example.com/graph.json";
        stubSite({ [secret]: GRAPH, [URL_A]: GRAPH });
        const { session } = await loaded(secret);
        assert.strictEqual(session.data.copies()[0]?.refused?.params.reason, "secret-url");
        session.dispose();
    });
});

describe("a hand-edited reference entry", () => {
    it("reopens an entry with no name or format, reading the address as JSON by its contents", async () => {
        stubSite({ [URL_A]: GRAPH });
        const text = await savedReference((_saved, load) => {
            delete load.name;
            delete load.format;
            load.options = {};
        });
        const { session, problems } = await reopen(text);
        assert.deepEqual(problems, []);
        assert.sameMembers(
            session.data.nodes({ scope: "graph" }).map((node) => node.label),
            ["Ann", "Bob"],
        );
        session.dispose();
    });

    it("reports a missing reference with no name by its source and address alone", async () => {
        stubSite({ [URL_A]: GRAPH });
        const text = await savedReference((_saved, load) => {
            delete load.name;
        });
        stubSite({});
        const { session, problems } = await reopen(text);
        assert.lengthOf(problems, 1);
        assert.strictEqual(problems[0]?.code, "W_SOURCE_UNAVAILABLE");
        const params = problems[0]?.params as Record<string, unknown>;
        assert.notProperty(params, "name");
        assert.strictEqual(params.url, URL_A);
        assert.strictEqual(params.reason, "not-found");
        session.dispose();
    });

    it("reopens when the data member no longer lists its loads", async () => {
        stubSite({ [URL_A]: GRAPH });
        const text = await savedReference((saved) => {
            const data = saved.members.find((member) => member.kind === "graphty-data");
            if (data !== undefined) {
                delete data.sources;
            }
        });
        const { session, problems } = await reopen(text);
        assert.notInclude(
            problems.map((problem) => problem.code),
            "W_SOURCE_UNAVAILABLE",
        );
        assert.strictEqual(session.data.nodes({ scope: "graph" }).length, 2);
        session.dispose();
    });
});
