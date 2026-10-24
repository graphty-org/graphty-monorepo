/**
 * @file Reading a load again with changed choices (`data.reloadSource`): another source column,
 * the kinds of the ends, scoped ids; the choices kept with the load; one undo step; and the edge
 * weight meaning setting.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, defineSource, registerSource } from "../../session";
import type { GraphSession } from "../../src/session/types";

registerSource(
    defineSource({
        id: "reload-test-people",
        descriptor: { plainName: "People", params: [] },
        records: () =>
            Promise.resolve({ nodes: [{ id: "p1" }, { id: "p2" }], edges: [{ source: "p1", target: "p2" }] }),
    }),
);

/** An auth log: "admin" is both a user and a host. */
const AUTH_LOG = [
    "time,user,host,ip,result",
    "2026-01-01T08:00:00Z,alice,web1,10.0.0.1,ok",
    "2026-01-01T09:00:00Z,bob,db1,10.0.0.2,fail",
    "2026-01-02T08:00:00Z,admin,web1,10.0.0.3,ok",
    "2026-01-02T09:00:00Z,alice,admin,10.0.0.1,ok",
].join("\n");

/**
 * A session with the auth log loaded as edges from user to host.
 * @returns The session.
 */
async function loaded(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import(
        { config: { file: new File([AUTH_LOG], "auth-log.csv") } },
        { mapping: { rowsAre: "edges", source: "user", target: "host" } },
    );
    return session;
}

/**
 * The node ids, sorted.
 * @param session - The session.
 * @returns The ids.
 */
const ids = (session: GraphSession): string[] =>
    session.data
        .nodes()
        .map((node) => String(node.id))
        .sort();

describe("data.reloadSource", () => {
    it("marks a file load reloadable and keeps the choices it was read with", async () => {
        const session = await loaded();
        const [source] = session.data.sources();
        assert.strictEqual(source.reloadable, true);
        assert.deepEqual(source.choices?.mapping, { rowsAre: "edges", source: "user", target: "host" });
        assert.isUndefined(source.loadKey);
    });

    it("reads the load again with kinds, as one undo step", async () => {
        const session = await loaded();
        const [{ key }] = session.data.sources();
        const before = ids(session);
        const steps = session.history.steps.length;
        await session.data.reloadSource(key, {
            mapping: { sourceKind: "user", targetKind: "host" },
            kindIds: "scoped",
        });

        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.include(ids(session), "user:admin");
        assert.include(ids(session), "host:admin");
        const [after] = session.data.sources();
        assert.strictEqual(after.key, key);
        assert.deepEqual(after.choices?.mapping, {
            rowsAre: "edges",
            source: "user",
            target: "host",
            sourceKind: "user",
            targetKind: "host",
        });
        assert.strictEqual(after.choices?.kindIds, "scoped");

        await session.undo();
        assert.deepEqual(ids(session), before);
        assert.isUndefined(session.data.sources()[0].choices?.kindIds);
    });

    it("lays a bare mapping over the one table a load names by id", async () => {
        const session = createGraphSession();
        await session.data.import(
            { config: { file: new File([AUTH_LOG], "auth-log.csv") } },
            { mapping: { tables: { rows: { rowsAre: "edges", source: "user", target: "host" } } } },
        );
        const [{ key }] = session.data.sources();
        await session.data.reloadSource(key, { mapping: { sourceKind: "user" } });
        assert.include(ids(session), "alice");
        assert.deepEqual(session.data.sources()[0].choices?.mapping, {
            tables: { rows: { rowsAre: "edges", source: "user", target: "host", sourceKind: "user" } },
        });
    });

    it("moves the source role to another column", async () => {
        const session = await loaded();
        const [{ key }] = session.data.sources();
        await session.data.reloadSource(key, { mapping: { source: "ip" } });
        assert.include(ids(session), "10.0.0.1");
        assert.notInclude(ids(session), "alice");
    });

    it("reads the rows as nodes and back as edges", async () => {
        const session = await loaded();
        const [{ key }] = session.data.sources();
        await session.data.reloadSource(key, { mapping: { rowsAre: "nodes" } });
        assert.strictEqual(session.data.statistics().nodeCount, 4);
        assert.strictEqual(session.data.statistics().edgeCount, 0);
        assert.deepEqual(session.data.sources()[0].choices?.mapping, { rowsAre: "nodes" });

        await session.data.reloadSource(key, { mapping: { rowsAre: "edges", source: "user", target: "host" } });
        assert.strictEqual(session.data.statistics().edgeCount, 4);
        assert.include(ids(session), "alice");
    });

    it("refuses a key it does not list and a load it did not read", async () => {
        const session = await loaded();
        try {
            await session.data.reloadSource("nope", {});
            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_SOURCE_UNKNOWN");
        }

        const generated = createGraphSession();
        await generated.data.generate("complete", { n: 3 });
        const [{ key: sample, reloadable }] = generated.data.sources();
        assert.isUndefined(reloadable);
        try {
            await generated.data.reloadSource(sample, {});
            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_UNSUPPORTED");
            assert.strictEqual((error as { details?: { reason?: string } }).details?.reason, "not-reloadable");
        }
    });
});

describe("knownFields.edgeWeightMeaning", () => {
    it("is null by default and set in one undo step", async () => {
        const session = await loaded();
        assert.isNull(session.config.data.knownFields.edgeWeightMeaning);
        await session.config.set({ data: { knownFields: { edgeWeightMeaning: "distance" } } });
        assert.strictEqual(session.config.data.knownFields.edgeWeightMeaning, "distance");
        await session.undo();
        assert.isNull(session.config.data.knownFields.edgeWeightMeaning);
    });
});

describe("a load's network key and a rename by key", () => {
    it("names the network load a server source came from", async () => {
        const session = createGraphSession();
        await session.data.import({ source: "reload-test-people", config: {} });
        const [source] = session.data.sources();
        assert.strictEqual(source.kind, "server");
        assert.strictEqual(source.loadKey, session.data.loads()[0].key);
        assert.isUndefined(source.reloadable);
    });

    it("renames one load by its key, and the newest only when it is that one", async () => {
        const session = await loaded();
        await session.data.import({ config: { file: new File(["id\nzed\n"], "extra.csv") } }, { mode: "merge" });
        const [first, second] = session.data.sources();
        await session.data.renameSource("auth", first.key);
        assert.deepEqual(
            session.data.sources().map((each) => each.name),
            ["auth", second.name],
        );
        assert.strictEqual(session.data.source()?.name, second.name);
        try {
            await session.data.renameSource("x", "nope");
            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_SOURCE_UNKNOWN");
        }
    });
});
