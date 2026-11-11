/**
 * @file The OpenAlex API key as a credential slot in a session (design/documents/sources.md,
 * "Credential slots"; conformance rows src-9, src-10 and src-11): a keyed load is recorded as
 * `credentialSlot: "api_key"` and the key reaches no saved text, event, journal entry or autosave
 * part; a reopened entry run again looks its key up by source, the origin about to be contacted
 * and the slot; an entry edited to another endpoint gets no key. A loopback HTTP server stands in
 * for api.openalex.org: the load's fetch sends each request there. Nothing reaches the internet.
 */

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import {
    createGraphSession,
    credentials,
    credentialSlots,
    defineSource,
    type GraphSession,
    type GraphtyError,
    listSources,
    registerSource,
} from "../../../session";
import { Autosaver } from "../../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../../src/autosave/memoryStore";
import { CredentialStore } from "../../../src/credentials/CredentialStore";
import { attachCredentials } from "../../../src/session/sources/credentialLookup";
import { FakeClock, FakeLocks } from "../../autosave/fakes";

const KEY = "sentinel-openalex-key-9c2b";
const DECOY = "sentinel-decoy-key-41aa";
const OPENALEX = "https://api.openalex.org";

/** What the stand-in server saw of one request. */
interface Seen {
    readonly apiKey: string | null;
    readonly authorization: string | null;
}

let server: Server;
let local = "";
const seen: Seen[] = [];
const sessions: GraphSession[] = [];

/**
 * A work record.
 * @param id - its bare id
 * @param refs - the bare ids it references
 * @returns the record
 */
function work(id: string, refs: readonly string[] = []): Record<string, unknown> {
    // OpenAlex's own snake_case field names
    return Object.fromEntries([
        ["id", `https://openalex.org/${id}`],
        ["display_name", `Work ${id}`],
        ["updated_date", "2026-10-01T00:00:00"],
        ["referenced_works", refs.map((r) => `https://openalex.org/${r}`)],
    ]);
}

/**
 * The stand-in's answer: `openalex:<ids>` returns each work, `cites:<id>` two pages of one work.
 * @param url - the request URL
 * @returns the body
 */
function answer(url: URL): unknown {
    const meta = (next: string | null): Record<string, unknown> => Object.fromEntries([["next_cursor", next]]);
    const filter = url.searchParams.get("filter") ?? "";
    if (filter.startsWith("cites:")) {
        const page = url.searchParams.get("cursor") === "p2" ? 2 : 1;
        return { meta: meta(page === 1 ? "p2" : null), results: [work(`W10${String(page)}`, ["W1"])] };
    }
    const ids = filter.startsWith("openalex:") ? filter.slice("openalex:".length).split("|") : [];
    return { meta: meta(null), results: ids.map((id) => work(id)) };
}

beforeAll(async () => {
    server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", "http://stand-in");
        seen.push({ apiKey: url.searchParams.get("api_key"), authorization: req.headers.authorization ?? null });
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(answer(url)));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    local = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * Send what graph-io asks of api.openalex.org to the stand-in, query and headers kept.
 * @param input - the request
 * @param init - its init
 * @returns the answer
 */
function standIn(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = new Request(input, init);
    const url = new URL(request.url);
    return fetch(`${local}${url.pathname}${url.search}`, { headers: request.headers });
}

/**
 * A fresh session, disposed after the test.
 * @returns the session
 */
function fresh(): GraphSession {
    const session = createGraphSession();
    sessions.push(session);
    return session;
}

/**
 * The OpenAlex slot, as the registry describes it.
 * @returns the slot
 */
function openalexSlot(): ReturnType<typeof credentialSlots>[number] {
    return credentialSlots(listSources().find((s) => s.id === "openalex")?.descriptor)[0];
}

/**
 * A session that loaded the citations of W1 with the key, and the text its save wrote.
 * @returns the text
 */
async function keyedProject(): Promise<string> {
    const session = fresh();
    await session.data.import(
        { source: "openalex", config: { work: "W1" } },
        { fetch: standIn, credential: credentials.forSlot(openalexSlot(), KEY) },
    );
    return (await session.project.save()).text;
}

/**
 * A credential store holding the key for (openalex, api.openalex.org, api_key), with a decoy for
 * another slot of the same source and origin remembered first, attached to a session.
 * @param session - the session
 * @param asked - collects each lookup's source, origin and slot
 * @returns the store
 */
async function rememberedKey(session: GraphSession, asked: string[]): Promise<CredentialStore> {
    const store = new CredentialStore();
    await store.remember(
        { source: "openalex", endpoint: OPENALEX, slot: "another" },
        credentials.apiKey({ query: "api_key" }, DECOY),
    );
    await store.remember(
        { source: "openalex", endpoint: OPENALEX, slot: "api_key" },
        credentials.forSlot(openalexSlot(), KEY),
    );
    attachCredentials(session.data, (source, origin, slot) => {
        asked.push(`${source} ${origin} ${slot}`);
        return store.lookup(source, origin, slot);
    });
    return store;
}

describe("the OpenAlex key in a session", () => {
    it("src-9: a keyed load saves credentialSlot api_key, and the key is in no text, event, journal or autosave part", async () => {
        seen.length = 0;
        const session = fresh();
        const events: unknown[] = [];
        const offs = (["history:changed", "journal:appended", "project:changed", "project:status"] as const).map(
            (event) => session.on(event, (detail: unknown) => events.push(detail)),
        );
        const store = memoryAutosaveStore();
        const saver = new Autosaver({
            key: "test.openalex-key",
            session,
            store,
            clock: new FakeClock(),
            locks: new FakeLocks(),
        });
        await session.data.import(
            { source: "openalex", config: { work: "W1" } },
            { fetch: standIn, credential: credentials.forSlot(openalexSlot(), KEY), limits: { maxNodes: 2 } },
        );
        assert.isAbove(seen.length, 0);
        assert.isTrue(
            seen.every((s) => s.apiKey === KEY && s.authorization === null),
            "every request carried the key",
        );
        await saver.flush();
        const entry = await store.read(saver.status.entry ?? "");
        saver.stop();

        const { text } = await session.project.save();
        const member = (
            JSON.parse(text) as { members: { kind: string; loads?: { source?: Record<string, unknown> }[] }[] }
        ).members.find((m) => m.kind === "graphty-sources");
        const part = member?.loads?.[0]?.source;
        assert.strictEqual(part?.credentialSlot, "api_key");
        assert.isNotNull(part?.next, "the capped load has a cursor to check");
        const places: Record<string, unknown> = {
            project: text,
            endpoint: part?.endpoint,
            next: part?.next,
            validators: part?.validators,
            loads: session.data.loads(),
            journal: session.journal.entries,
            history: session.history.steps,
            events,
            autosave: entry,
        };
        for (const [where, value] of Object.entries(places)) {
            const written = typeof value === "string" ? value : JSON.stringify(value);
            assert.notInclude(written, KEY, `the key leaked into ${where}`);
        }
        assert.include(JSON.stringify(entry), "api_key", "the autosave holds the slot name");
        assert.strictEqual(session.data.loads()[0].credential?.slot, "api_key");
        for (const off of offs) {
            off();
        }
    });

    it("a load with no key runs without one and records no slot", async () => {
        seen.length = 0;
        const session = fresh();
        await session.data.import({ source: "openalex", config: { work: "W1" } }, { fetch: standIn });
        assert.isTrue(seen.every((s) => s.apiKey === null));
        const { text } = await session.project.save();
        assert.notInclude(text, "credentialSlot");
    });

    it("src-10: a reopened entry run again sends the key remembered for (openalex, its origin, api_key)", async () => {
        const text = await keyedProject();
        seen.length = 0;
        const session = fresh();
        const asked: string[] = [];
        await rememberedKey(session, asked);
        await session.project.open(text);
        const [pending] = session.data.pendingSourceLoads();
        assert.strictEqual(pending.credentialSlot, "api_key");
        assert.strictEqual(seen.length, 0, "opening fetched nothing");

        await session.data.runPendingSourceLoad(pending.id, { fetch: standIn });
        assert.deepEqual([...new Set(asked)], [`openalex ${OPENALEX} api_key`]);
        assert.isAbove(seen.length, 0);
        assert.isTrue(
            seen.every((s) => s.apiKey === KEY),
            "the api_key slot's key, never the decoy",
        );
        await session.data.refresh(session.data.loads()[0].key, { fetch: standIn });
        assert.isTrue(seen.every((s) => s.apiKey === KEY));
    });

    it("src-11: the entry edited to another endpoint gets no remembered key", async () => {
        const text = (await keyedProject()).replaceAll(
            /("endpoint":\s*")https:\/\/api\.openalex\.org/g,
            "$1https://evil.example",
        );
        assert.include(text, "https://evil.example");
        seen.length = 0;
        const session = fresh();
        const asked: string[] = [];
        await rememberedKey(session, asked);
        await session.project.open(text);
        const [pending] = session.data.pendingSourceLoads();
        // OpenAlex reads only its own origin, so the run is refused; what matters is no key went out
        await session.data.runPendingSourceLoad(pending.id, { fetch: standIn }).catch(() => undefined);
        assert.deepEqual([...new Set(asked)], ["openalex https://evil.example api_key"]);
        assert.isTrue(seen.every((s) => s.apiKey === null));
    });
});

// A source whose one slot is required, so a load with none remembered is refused naming it.
registerSource(
    defineSource({
        id: "slot-locked",
        descriptor: {
            plainName: "Locked",
            params: [],
            credentials: [{ name: "token", kind: "bearer", required: true }],
        },
        records: () => Promise.resolve({ nodes: [{ id: "a" }] }),
    }),
);

describe("a required credential slot", () => {
    it("with none remembered, E_SOURCE_AUTH names the slot", async () => {
        const session = fresh();
        let error: GraphtyError | undefined;
        try {
            await session.data.import({ source: "slot-locked", config: {} }, { endpoint: "https://locked.example" });
        } catch (thrown) {
            error = thrown as GraphtyError;
        }
        assert.strictEqual(error?.code, "E_SOURCE_AUTH");
        assert.deepInclude(error?.details, { origin: "https://locked.example", slot: "token", stored: false });
    });
});
