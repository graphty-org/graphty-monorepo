/**
 * @file Two loads of the same source and params at different endpoints are two loads, each
 * recorded with its own endpoint (issue #9705).
 */

import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "../../../session";

registerSource(
    defineSource({
        id: "merge-endpoint-held",
        descriptor: { plainName: "Held", params: [] },
        records: () => Promise.resolve({ nodes: [{ id: "a" }], edges: [] }),
    }),
);

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

describe("a merged load at another endpoint", () => {
    it("is its own load with its own endpoint", async () => {
        const session = createGraphSession();
        sessions.push(session);
        await session.data.import({ source: "merge-endpoint-held", config: {} });
        await session.data.import(
            { source: "merge-endpoint-held", config: {} },
            { endpoint: "https://held.example/graph", mode: "merge" },
        );

        const keys = session.data.sources().map((each) => each.key);
        assert.lengthOf(keys, 2);
        assert.deepEqual(
            keys.map((key) => session.data.sourceSettings(key)?.endpoint),
            [null, "https://held.example/graph"],
        );
        assert.deepEqual(
            session.data.loads().map((each) => each.endpoint),
            [null, "https://held.example/graph"],
        );
    });

    it("keeps each endpoint when two endpoints are loaded", async () => {
        const session = createGraphSession();
        sessions.push(session);
        await session.data.import(
            { source: "merge-endpoint-held", config: {} },
            { endpoint: "https://one.example/graph" },
        );
        await session.data.import(
            { source: "merge-endpoint-held", config: {} },
            { endpoint: "https://two.example/graph", mode: "merge" },
        );

        assert.deepEqual(
            session.data.sources().map((each) => session.data.sourceSettings(each.key)?.endpoint),
            ["https://one.example/graph", "https://two.example/graph"],
        );
    });

    it("keeps each load's endpoint through a saved project", async () => {
        const session = createGraphSession();
        sessions.push(session);
        await session.data.import(
            { source: "merge-endpoint-held", config: {} },
            { endpoint: "https://held.example/graph" },
        );
        await session.data.import({ source: "merge-endpoint-held", config: {} }, { mode: "merge" });
        assert.deepEqual(
            session.data.sources().map((each) => session.data.sourceSettings(each.key)?.endpoint),
            ["https://held.example/graph", null],
        );
        const { text } = await session.project.save();

        const opened = createGraphSession();
        sessions.push(opened);
        await opened.project.open(text);
        assert.sameMembers(
            opened.data.pendingSourceLoads().map((each) => each.endpoint),
            ["https://held.example/graph", null],
        );
        assert.deepEqual(
            opened.data.sources().map((each) => opened.data.sourceSettings(each.key)?.endpoint),
            ["https://held.example/graph", null],
        );
    });
});
