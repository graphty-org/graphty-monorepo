import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, defineSource, registerSource } from "../../session";

/** The network source's reads held back, by size, until the test releases them. */
const heldTeams = new Map<string, Promise<void>>();
/** Called once a read of that size has finished. */
const readDone = new Map<string, () => void>();

// A network source whose read waits for the test, so the older load's read finishes last.
registerSource(
    defineSource({
        id: "held-load-order",
        descriptor: {
            plainName: "Held",
            params: [{ name: "size", plainName: "Size", type: "number", required: true }],
        },
        async records(params: { size: number }) {
            await heldTeams.get(String(params.size));
            readDone.get(String(params.size))?.();
            return { nodes: Array.from({ length: params.size }, (_, i) => ({ id: `n${String(i)}` })) };
        },
    }),
);

/** graph-samples' built dataset files, served the way graphty.app serves them. */
const DATA = resolve(__dirname, "../../../graph-samples/dist/data/v1");

/** A three-node graph as inline JSON. */
const TRIANGLE = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ],
});

/**
 * Overlapping loads land in the order they were asked for, not the order their downloads finish
 * (issue #3382). The server holds the older load's download until the newer load has been asked
 * for, and the newer one needs no read, so before the fix it always landed first and was replaced.
 */
describe("session.data loads that overlap", () => {
    let server: Server;
    let baseUrl = "";
    /** Downloads held back, by file name, until the test releases them. */
    const held = new Map<string, () => void>();
    /** Names the server should hold rather than answer at once. */
    const holding = new Set<string>();
    /** Settles once a held request for that name has arrived. */
    const arrived = new Map<string, () => void>();

    const answer = (name: string, response: ServerResponse): void => {
        if (!existsSync(resolve(DATA, name))) {
            response.statusCode = 404;
            response.end();
            return;
        }
        response.end(readFileSync(resolve(DATA, name)));
    };

    const hold = (dataset: string): Promise<void> => {
        const name = `${dataset}.gsnp.gz`;
        holding.add(name);
        return new Promise<void>((done) => arrived.set(name, done));
    };

    const release = (dataset: string): void => {
        const name = `${dataset}.gsnp.gz`;
        holding.delete(name);
        held.get(name)?.();
        held.delete(name);
    };

    beforeAll(async () => {
        server = createServer((request, response) => {
            const name = (request.url ?? "").replace(/^\//, "");
            if (holding.has(name)) {
                held.set(name, () => answer(name, response));
                arrived.get(name)?.();
                return;
            }
            answer(name, response);
        });
        await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
        baseUrl = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/`;
    });

    afterAll(async () => {
        await new Promise((done) => server.close(done));
    });

    it("keeps a file asked for after a download that is still running", async () => {
        const session = createGraphSession();
        const requested = hold("dolphins");
        const older = session.data.loadDataset("dolphins", { baseUrl });
        await requested;
        // Inline text of a named format needs no read, so it is ready to dispatch at once.
        const newer = session.data.import({ type: "json", config: { data: TRIANGLE } });
        release("dolphins");
        await Promise.all([older, newer]);
        assert.strictEqual(session.data.snapshot().nodeCount, 3, "the file, asked for last");
        await session.undo();
        assert.strictEqual(session.data.snapshot().nodeCount, 62, "dolphins landed first, under it");
        session.dispose();
    });

    it("keeps a generated graph asked for after a download that is still running", async () => {
        const session = createGraphSession();
        const requested = hold("karate");
        const older = session.data.loadDataset("karate", { baseUrl });
        await requested;
        const newer = session.data.generate("cycle", { n: 7 });
        release("karate");
        await Promise.all([older, newer]);
        assert.strictEqual(session.data.snapshot().nodeCount, 7, "the cycle, asked for last");
        session.dispose();
    });

    it("keeps a network source's load asked for after one whose read is still running", async () => {
        const session = createGraphSession();
        let release = (): void => undefined;
        heldTeams.set("5", new Promise<void>((done) => (release = done)));
        const newerRead = new Promise<void>((done) => readDone.set("2", done));
        const older = session.data.import({ source: "held-load-order", config: { size: 5 } });
        const newer = session.data.import({ source: "held-load-order", config: { size: 2 } });
        // The older read is released only once the newer one has finished, so it finishes last.
        await newerRead;
        release();
        await Promise.all([older, newer]);
        assert.strictEqual(session.data.snapshot().nodeCount, 2, "the load asked for last");
        assert.deepStrictEqual(
            session.data.loads().map((each) => each.config),
            [{ size: 2 }],
        );
        session.dispose();
    });

    it("keeps a prepared draft loaded after a download that is still running", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "json", config: { data: TRIANGLE } });
        const requested = hold("dolphins");
        const older = session.data.loadDataset("dolphins", { baseUrl });
        await requested;
        const newer = draft.load();
        release("dolphins");
        await Promise.all([older, newer]);
        assert.strictEqual(session.data.snapshot().nodeCount, 3, "the draft, loaded last");
        session.dispose();
    });

    it("stops a load aborted while it waits for its turn, and lets the next one through", async () => {
        const session = createGraphSession();
        let releaseOlder = (): void => undefined;
        heldTeams.set("5", new Promise<void>((done) => (releaseOlder = done)));
        const waitingRead = new Promise<void>((done) => readDone.set("2", done));
        const older = session.data.import({ source: "held-load-order", config: { size: 5 } });
        const abort = new AbortController();
        const waiting = session.data.import(
            { source: "held-load-order", config: { size: 2 } },
            { signal: abort.signal },
        );
        // Its read is done; it only waits for the older load's turn.
        await waitingRead;
        abort.abort();
        const [aborted] = await Promise.allSettled([waiting]);
        assert.strictEqual(aborted.status, "rejected");
        const last = session.data.generate("cycle", { n: 7 });
        releaseOlder();
        await Promise.all([older, last]);
        assert.strictEqual(session.data.snapshot().nodeCount, 7, "the load asked for last");
        await session.undo();
        assert.strictEqual(session.data.snapshot().nodeCount, 5, "the aborted load never landed");
        session.dispose();
    });

    it("lets a later load through once a download that never finishes is aborted", async () => {
        const session = createGraphSession();
        const requested = hold("karate");
        const abort = new AbortController();
        const stalled = session.data.loadDataset("karate", { baseUrl, signal: abort.signal });
        await requested;
        const newer = session.data.generate("cycle", { n: 7 });
        abort.abort();
        const [first] = await Promise.allSettled([stalled]);
        await newer;
        assert.strictEqual(first.status, "rejected");
        assert.strictEqual(session.data.snapshot().nodeCount, 7);
        release("karate");
        session.dispose();
    });

    it("lets a later load through when an earlier download fails", async () => {
        const session = createGraphSession();
        const requested = hold("nothing-here");
        const older = session.data.loadDataset("nothing-here", { baseUrl });
        await requested;
        const newer = session.data.loadDataset("karate", { baseUrl });
        release("nothing-here");
        const [first] = await Promise.allSettled([older, newer]);
        await newer;
        assert.strictEqual(first.status, "rejected");
        assert.strictEqual(session.data.snapshot().nodeCount, 34);
        session.dispose();
    });
});
