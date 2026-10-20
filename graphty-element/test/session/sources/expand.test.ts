/**
 * session.data.expand and collapse against a recorded network source registered in the ledger:
 * the neighborhood arrives as one undoable step carrying its rows, the `_source` facts are written,
 * a partial node continues from its cursor, collapse takes back exactly what the expansions alone
 * brought, and a node loaded from a file is refused.
 */

import { credentials, listSources, registerSource, replayFetch } from "@graphty/graph-io";
import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { GraphtyError } from "../../../src/errors/GraphtyError";
import { dispatcherOf } from "../../../src/session/GraphSession";
import { sourceFactsOf } from "../../../src/session/sources/ids";
import type { GraphSession } from "../../../src/session/types";
import {
    loadRecordedSeed,
    PEOPLE_RECORDINGS,
    PEOPLE_SOURCE_ID,
    recordedPeopleSource,
} from "../../../stories/fixtures/expand/source";

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A session holding the recorded source's seed node.
 * @param transport - which variant of the source the seed's load names
 * @returns the session
 */
async function seeded(transport: "recorded" | "context" = "recorded"): Promise<GraphSession> {
    const session = createGraphSession();
    sessions.push(session);
    await loadRecordedSeed(session, transport);
    return session;
}

/**
 * The `_source` facts of a node.
 * @param session - the session
 * @param id - the node
 * @returns its facts
 */
function facts(session: GraphSession, id: string): Record<string, unknown> {
    return sourceFactsOf(session.data.node(id));
}

/**
 * What a promise rejects with.
 * @param promise - the promise
 * @returns the error, or null when it resolved
 */
async function rejection(promise: Promise<unknown>): Promise<GraphtyError | null> {
    return promise.then(
        () => null,
        (error: unknown) => error as GraphtyError,
    );
}

describe("session.data.expand from a network source", () => {
    it("adds the recorded neighbors as one step and writes the _source facts", async () => {
        const session = await seeded();
        const steps = session.history.steps.length;
        const seen: string[] = [];
        dispatcherOf(session).events.dispatched = (command) => {
            seen.push(command.op);
        };

        await session.data.expand(["valjean"]);

        assert.deepEqual(seen, ["data.source-expand"]);
        assert.lengthOf(session.history.steps, steps + 1);
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 5);
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 4);
        assert.deepInclude(facts(session, "valjean"), { expansion: "partial", degree: 6, hidden: 2 });
        assert.deepEqual(facts(session, "valjean").next, { page: 2, "~v": 1 });
        const javert = facts(session, "javert");
        assert.deepInclude(javert, { expansion: "none", degree: 2, hidden: 1 });
        assert.deepEqual(javert.loads, ["load-1/x1"]);
        assert.strictEqual(session.data.node("javert")?.name, "Javert");
        assert.lengthOf(session.data.loads()[0]?.expansions ?? [], 1);
    });

    it("returns what each expansion brought, and nodeSource says what a node can do", async () => {
        const session = await seeded();
        const fresh = session.data.nodeSource("valjean");
        assert.strictEqual(fresh?.loadKey, "load-1");
        assert.isFalse(fresh?.expanded, "nothing to collapse before an expansion");

        const first = await session.data.expand(["valjean"]);
        assert.deepEqual(first, {
            code: "I_SOURCE_EXPANDED",
            params: { seeds: ["valjean"], added: [4, 4], partial: true },
        });
        assert.deepInclude(session.data.nodeSource("valjean"), { expanded: true, hiddenNeighbors: 2 });
        assert.isNull(session.data.nodeSource("nobody"));

        await session.data.expand(["valjean"]);
        const again = await session.data.expand(["valjean"]);
        assert.strictEqual(again.code, "I_SOURCE_NOTHING_NEW");
        assert.deepEqual(again.params.added, [0, 0]);
        assert.isFalse(session.data.nodeSource("valjean")?.canExpand, "complete: nothing more to fetch");
    });

    it("expands a node that session.data.import loaded from the source", async () => {
        const session = createGraphSession();
        sessions.push(session);
        if (!listSources().some((info) => info.id === PEOPLE_SOURCE_ID)) {
            registerSource(recordedPeopleSource());
        }

        await session.data.import({ source: PEOPLE_SOURCE_ID, config: {} });
        const [key] = session.data.loads().map((load) => load.key);
        assert.deepEqual(facts(session, "valjean").loads, [key]);

        await session.data.expand(["valjean"]);
        assert.isAbove(session.data.nodes().length, 1);
        assert.include(facts(session, "valjean").loads as string[], `${key}/x1`);
    });

    it("continues a partial node from its cursor, then calls it complete", async () => {
        const session = await seeded();
        await session.data.expand(["valjean"]);
        await session.data.expand(["valjean"]);

        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 7);
        assert.deepInclude(facts(session, "valjean"), { expansion: "complete", next: null, hidden: 0 });
        assert.deepEqual(facts(session, "valjean").loads, ["load-1", "load-1/x1", "load-1/x2"]);
    });

    it("joins a second expansion of a node while the first runs", async () => {
        const session = await seeded();
        const steps = session.history.steps.length;

        await Promise.all([session.data.expand(["valjean"]), session.data.expand(["valjean"])]);

        assert.lengthOf(session.history.steps, steps + 1, "one expansion, not two");
        assert.strictEqual(facts(session, "valjean").expansion, "partial");
    });

    it("updates a node already held with the incoming attributes, without adding it twice", async () => {
        const session = await seeded();
        await session.data.expand(["valjean"]);
        await session.data.updateNodes([{ id: "cosette", values: { name: "renamed" } }]);

        await session.data.expand(["cosette"]);

        assert.strictEqual(session.data.node("cosette")?.name, "Cosette", "existing: update");
        assert.deepEqual(facts(session, "cosette").loads, ["load-1/x1", "load-1/x2"]);
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 6);
    });

    it("undo takes the expansion back and redo replays it without fetching", async () => {
        const session = await seeded("context");
        const fetch = replayFetch(PEOPLE_RECORDINGS);
        const before = facts(session, "valjean");
        await session.data.expand(["valjean"], { fetch: fetch as unknown as typeof globalThis.fetch });
        assert.lengthOf(fetch.calls, 1);

        await session.undo();
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 1);
        assert.deepEqual(facts(session, "valjean"), before, "the seed's facts are as they were");

        await session.redo();
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 5);
        assert.lengthOf(fetch.calls, 1, "redo replays the rows");
    });

    it("keeps data.loads() in step when an expansion is undone and redone", async () => {
        const session = await seeded();
        await session.data.expand(["valjean"]);
        const keys = (): string[] => (session.data.loads()[0]?.expansions ?? []).map((x) => x.key);
        assert.deepEqual(keys(), ["load-1/x1"]);

        await session.undo();
        assert.deepEqual(keys(), [], "the undone expansion is no longer listed");
        assert.lengthOf(session.data.loads(), 1, "the load that brought the seed still is");

        await session.redo();
        assert.deepEqual(keys(), ["load-1/x1"]);
    });

    it("sends the credential it is given through the source's guarded fetch, and records no secret", async () => {
        const session = await seeded("context");
        const fetch = replayFetch(PEOPLE_RECORDINGS.map((r) => ({ ...r, credential: true })));

        await session.data.expand(["valjean"], {
            fetch: fetch as unknown as typeof globalThis.fetch,
            credential: credentials.bearer("sentinel-secret"),
        });

        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 5);
        assert.notInclude(JSON.stringify(session.data.loads()), "sentinel-secret");
        assert.notInclude(JSON.stringify(session.history.steps), "sentinel-secret");
    });

    it("publishes start, then I_SOURCE_EXPANDED with the seeds, the counts and whether it was partial", async () => {
        const session = await seeded();
        const events: unknown[] = [];
        session.on("source:expand-start", (detail) => events.push(["start", detail]));
        session.on("source:expanded", (detail) => events.push(["expanded", detail]));

        await session.data.expand(["valjean"]);

        assert.deepEqual(events, [
            ["start", { seeds: ["valjean"] }],
            ["expanded", { code: "I_SOURCE_EXPANDED", params: { seeds: ["valjean"], added: [4, 4], partial: true } }],
        ]);
    });

    it("refuses a node loaded from a file with E_SOURCE_UNSUPPORTED and publishes the failure", async () => {
        const session = createGraphSession();
        sessions.push(session);
        await session.data.addNodes([{ id: "plain" }]);
        const failed: unknown[] = [];
        session.on("source:expand-failed", (detail) => failed.push(detail));
        const steps = session.history.steps.length;

        const error = await rejection(session.data.expand(["plain"]));

        assert.strictEqual(error?.code, "E_SOURCE_UNSUPPORTED");
        assert.strictEqual((error?.details as { feature?: string }).feature, "expand");
        assert.deepEqual(failed, [{ code: "E_SOURCE_UNSUPPORTED", params: { feature: "expand", ids: ["plain"] } }]);
        assert.lengthOf(session.history.steps, steps);
        assert.strictEqual((await rejection(session.data.expand(["absent"])))?.code, "E_UNKNOWN_ELEMENT");
    });

    it("reports a source failure as its code and changes nothing", async () => {
        const session = await seeded("context");
        const fetch = replayFetch([{ url: PEOPLE_RECORDINGS[0]?.url ?? "", status: 401, body: {} }]);
        const failed: { code: string }[] = [];
        session.on("source:expand-failed", (detail) => failed.push(detail));
        const steps = session.history.steps.length;

        const error = await rejection(
            session.data.expand(["valjean"], { fetch: fetch as unknown as typeof globalThis.fetch }),
        );

        assert.strictEqual(error?.code, "E_SOURCE_AUTH");
        assert.deepEqual(
            failed.map((f) => f.code),
            ["E_SOURCE_AUTH"],
        );
        assert.lengthOf(session.history.steps, steps);
    });
});

describe("session.data.collapse", () => {
    it("removes only what the node's expansions brought, as one step that undo restores exactly", async () => {
        const session = await seeded();
        await session.data.expand(["valjean"]);
        await session.data.expand(["valjean"]);
        await session.data.expand(["cosette"]);
        const before = session.data.store.getSnapshot();
        const counts = [before.nodeCount, before.edgeCount];

        const result = await session.data.collapse("valjean");

        // Cosette's own expansion also brought valjean's neighbors marius and thenardier: they stay.
        assert.sameMembers([...result.removedNodes], ["javert", "fantine", "myriel"]);
        assert.deepEqual(result.kept, []);
        const after = session.data.store.getSnapshot();
        assert.strictEqual(after.nodeCount, counts[0] - 3);
        assert.strictEqual(facts(session, "valjean").expansion, "none");

        await session.undo();
        const restored = session.data.store.getSnapshot();
        assert.deepEqual([restored.nodeCount, restored.edgeCount], counts);
    });

    it("keeps pinned and edited nodes and reports them as W_COLLAPSE_KEPT", async () => {
        const session = await seeded();
        await session.data.expand(["valjean"]);
        await session.positions.pin(["javert"]);
        await session.data.updateNodes([{ id: "fantine", values: { note: "the reader wrote this" } }]);

        const result = await session.data.collapse("valjean");

        assert.sameMembers([...result.removedNodes], ["cosette", "marius"]);
        assert.deepEqual(result.kept, [
            { code: "W_COLLAPSE_KEPT", params: { ids: ["javert"], reason: "pinned" } },
            { code: "W_COLLAPSE_KEPT", params: { ids: ["fantine"], reason: "edited" } },
        ]);
        assert.isDefined(session.data.node("javert"));
        assert.isDefined(session.data.node("fantine"));
    });
});
