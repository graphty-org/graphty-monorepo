/**
 * @file A received project's network entries fetch nothing until the application runs them
 * (design/documents/sources.md, "Reopening"): refresh, the next page, the change check and an
 * expansion of a load that is still pending each refuse with `E_SOURCE_PENDING` and send no
 * request; `runPendingSourceLoad` is the one way in, and after it every one of them works. A file
 * cannot switch click-to-expand on either. The source counts every call; nothing reaches a network.
 */

import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "../../../session";

/** What the counted source was asked, by method. */
const asked = { records: 0, validate: 0, expand: 0 };

registerSource(
    defineSource({
        id: "gate-counted",
        descriptor: {
            plainName: "Counted",
            params: [],
            features: ["page", "validate", "expand"],
            defaultEndpoint: "https://counted.example.test/",
        },
        async *records(_params: Record<string, unknown>, ctx) {
            for (let page = Number(ctx.cursor?.page ?? 0); page < 3; page++) {
                asked.records++;
                yield await Promise.resolve({
                    nodes: [{ id: `n${String(page)}` }],
                    next: page < 2 ? { page: page + 1 } : null,
                });
            }
        },
        validate: () => {
            asked.validate++;
            return Promise.resolve({ status: "current" as const, via: "hash" as const, validators: {} });
        },
        expand: (request, sink, ctx) => {
            asked.expand++;
            for (const id of request.ids) {
                sink.addNode(`${String(id)}-friend`);
            }

            return Promise.resolve(ctx.finish({}));
        },
    }),
);

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

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
 * A project file holding one capped load of the counted source.
 * @param change - changes the file's sources member entry before it is returned
 * @returns the file's text
 */
async function savedFile(change: (entry: Record<string, unknown>) => void = () => undefined): Promise<string> {
    const session = fresh();
    await session.data.import({ source: "gate-counted", config: {} }, { limits: { maxNodes: 1, onLimit: "stop" } });
    const { text } = await session.project.save();
    const doc = JSON.parse(text) as { members: { kind: string; loads?: Record<string, unknown>[] }[] };
    const member = doc.members.find((each) => each.kind === "graphty-sources");
    const entry = member?.loads?.[0];
    assert.isDefined(entry, "the file records the load");
    change(entry);
    return JSON.stringify(doc);
}

/**
 * Open a file into a fresh session, with the source's counters at zero.
 * @param text - the file
 * @returns the session
 */
async function opened(text: string): Promise<GraphSession> {
    const session = fresh();
    await session.project.open(text);
    asked.records = 0;
    asked.validate = 0;
    asked.expand = 0;
    return session;
}

/**
 * The code a call rejected with.
 * @param work - the call
 * @returns the code, or null when it resolved
 */
async function codeOf(work: Promise<unknown>): Promise<string | null> {
    return work.then(
        () => null,
        (error: unknown) => (error as { code?: string }).code ?? "no code",
    );
}

describe("a reopened project's network entries", () => {
    it("src-14: refresh, more, check and expand of a pending load fetch nothing", async () => {
        const session = await opened(await savedFile());
        assert.deepEqual(
            session.data.pendingSourceLoads().map((each) => each.id),
            ["s1"],
        );
        const failed: string[] = [];
        session.on("source:expand-failed", ({ code }) => failed.push(code));

        assert.strictEqual(await codeOf(session.data.refresh("s1")), "E_SOURCE_PENDING");
        assert.strictEqual(await codeOf(session.data.more({ load: "s1" })), "E_SOURCE_PENDING");
        assert.strictEqual(await codeOf(session.data.checkSource("s1")), "E_SOURCE_PENDING");
        assert.strictEqual(await codeOf(session.data.expand(["n0"])), "E_SOURCE_PENDING");
        // `more()` with no load picks the newest one that may fetch, and there is none
        assert.isNull(await codeOf(session.data.more()));

        assert.deepEqual(asked, { records: 0, validate: 0, expand: 0 }, "nothing was asked of the source");
        assert.deepEqual(failed, ["E_SOURCE_PENDING"]);
        assert.strictEqual(session.data.nodes().length, 1, "the graph is as the file holds it");
    });

    it("runs once the application runs it, and then every call fetches", async () => {
        const session = await opened(await savedFile());
        await session.data.runPendingSourceLoad("s1");
        assert.strictEqual(asked.records, 1);
        assert.deepEqual(session.data.pendingSourceLoads(), []);

        await session.data.more({ load: "s1" });
        assert.strictEqual(asked.records, 2);
        await session.data.checkSource("s1");
        assert.strictEqual(asked.validate, 1);
        await session.data.expand(["n0"]);
        assert.strictEqual(asked.expand, 1);
    });

    it("src-59: reads as many pages again as the load had read, so more continues after them", async () => {
        const session = fresh();
        await session.data.import({ source: "gate-counted", config: {} }, { limits: { maxNodes: 1, onLimit: "stop" } });
        await session.data.more();
        assert.strictEqual(session.data.nodes().length, 2);
        const { text } = await session.project.save();

        const reopened = await opened(text);
        await reopened.data.runPendingSourceLoad("s1");
        assert.strictEqual(asked.records, 2, "both pages the load had read");
        await reopened.data.more();
        assert.deepEqual(
            reopened.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["n0", "n1", "n2"],
        );
    });

    it("takes a load's sources() key wherever it takes its loads() key", async () => {
        const session = fresh();
        await session.data.import({ source: "gate-counted", config: {} }, { limits: { maxNodes: 1, onLimit: "stop" } });
        const [entry] = session.data.sources();
        assert.notStrictEqual(entry.key, entry.loadKey, "a live load's two keys differ");
        await session.data.more({ load: entry.key });
        await session.data.checkSource(entry.key);
        await session.data.refresh(entry.key);
        assert.strictEqual(session.data.nodes().length, 2);
        assert.strictEqual(await codeOf(session.data.refresh("s9")), "E_LOAD_UNKNOWN");
    });

    it("src-58: never takes a click-to-expand trigger from a file", async () => {
        const text = await savedFile((entry) => {
            (entry.source as Record<string, unknown>).expand = { trigger: "click", depth: 2 };
        });
        const session = await opened(text);
        assert.deepEqual(session.data.loads()[0]?.expand, { depth: 2 });
    });
});
