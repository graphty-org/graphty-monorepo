/**
 * @file The kept-set store and its synchronous doors: minting, names, the listing, write groups,
 * `set:changed` plumbing, tombstones, and the rule that nothing outside `session/sets/` writes
 * set state (design/sets/sets-design.md sections 3, 12.4, 13, 14).
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import type { Scope } from "../../../src/catalog/types";
import { DataConfig } from "../../../src/config/DataConfig";
import { isGraphtyError } from "../../../src/errors";
import { setsOfSession } from "../../../src/session/GraphSession";
import { createScopeApi } from "../../../src/session/scope/ScopeApi";
import { loadRecord } from "../../../src/session/sets/prepare";
import { createSetsApi } from "../../../src/session/sets/SetsApi";
import { SetsStore } from "../../../src/session/sets/store";
import type { SetChange, SetsApi } from "../../../src/session/sets/types";
import { edgeBetween, makeSession } from "../helpers";

/** A store and its doors, with no graph behind them. */
function harness(): { store: SetsStore; sets: SetsApi; changes: SetChange[] } {
    const store = new SetsStore();
    const sets = createSetsApi({ edgeMember: () => undefined }, store);
    const changes: SetChange[] = [];
    store.onChange((change) => changes.push(change));

    return { store, sets, changes };
}

/** The code of what a call throws. */
function codeOf(call: () => unknown): string {
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        return (error as { code: string }).code;
    }

    return assert.fail("expected a refusal");
}

const NODES = { kind: "fixed", nodes: ["a"], reading: "induced" } as const;

describe("minting", () => {
    // Twenty names, including repeats and names that slug alike, so the suffix path is pinned too.
    const NAMES = [
        "Suspects",
        "  Suspects 2 ",
        "Hubs",
        "hubs!",
        "HUBS",
        "a.b",
        "a b",
        "a-b",
        "!!!",
        "***",
        "Caf\u00e9 people",
        "\u65e5\u672c",
        "123",
        "x_y",
        "Top 10%",
        "-edge-",
        "Set 1",
        "set",
        "Louvain (resolution 1.0): community 4",
        "trailing   ",
    ];

    it("gives the same id ScopeApi.save gives, for 20 names in a row", () => {
        const scope = createScopeApi({ snapshot: () => makeSession().store.getSnapshot() });
        const { sets } = harness();
        const expected = NAMES.map((name) => scope.save(name, "graph" satisfies Scope));
        assert.deepStrictEqual(
            NAMES.map((name) => sets.create(NODES, { name })),
            expected,
        );
        assert.includeMembers(expected, ["set_hubs_2", "set_a-b_3", "set_set_2"]);
    });

    it("never contains a dot after set_", () => {
        const { sets } = harness();
        for (const name of ["a.b", "v1.2.3", ".", "x..y"]) {
            assert.notInclude(sets.create(NODES, { name }), ".");
        }
    });

    it("skips the register, the live ids and the ids pending in the open group", () => {
        const { store, sets } = harness();
        const first = sets.create(NODES, { name: "Suspects" });
        sets.remove(first);
        assert.isTrue(store.register().has(first));

        const again = sets.create(NODES, { name: "Suspects" });
        assert.strictEqual(first, "set_suspects");
        assert.strictEqual(again, "set_suspects_2");

        store.transact(() => {
            const pending = store.mint("suspects");
            assert.strictEqual(pending, "set_suspects_3");
            assert.strictEqual(store.mint("Suspects"), "set_suspects_4");
        });
        assert.isTrue(store.register().has("set_suspects_4"));
    });

    it("create, remove and create one name inside one group gives two ids", () => {
        const { store, sets } = harness();
        const ids = store.transact(() => {
            const a = sets.create(NODES, { name: "Suspects" });
            sets.remove(a);
            const b = sets.create(NODES, { name: "Suspects" });

            return [a, b];
        });
        assert.notStrictEqual(ids[0], ids[1]);
        assert.deepStrictEqual([...store.register()].sort(), [...ids].sort());
    });

    it("a door refused inside a group leaves no id and no write, and the group goes on", () => {
        const { store, sets, changes } = harness();
        const kept = store.transact(() => {
            const a = sets.create(NODES, { name: "A" });
            assert.throws(() => sets.create(NODES, { name: "   " }));
            assert.throws(() =>
                store.transact(() => {
                    sets.rename(a, "Renamed");
                    sets.create(NODES, { name: "Renamed" });
                }),
            );

            return a;
        });
        assert.deepStrictEqual([...store.register()], [kept]);
        assert.strictEqual(sets.get(kept)?.name, "A");
        assert.deepStrictEqual(
            changes.map(({ change }) => change),
            ["created"],
        );
    });

    it("a rolled-back group registers nothing", () => {
        const { store, sets } = harness();
        assert.throws(() =>
            store.transact(() => {
                sets.create(NODES, { name: "Gone" });
                throw new Error("abort");
            }),
        );
        assert.strictEqual(store.register().size, 0);
        assert.isUndefined(sets.get("set_gone"));
        assert.strictEqual(sets.create(NODES, { name: "Gone" }), "set_gone");
    });
});

describe("names", () => {
    it("trims, refuses empty, refuses duplicates case-sensitively", () => {
        const { sets } = harness();
        const id = sets.create(NODES, { name: "  Hubs " });
        assert.strictEqual(sets.get(id)?.name, "Hubs");
        assert.strictEqual(codeOf(() => sets.create(NODES, { name: "   " })), "E_BAD_COMMAND");
        assert.strictEqual(codeOf(() => sets.create(NODES, { name: "Hubs" })), "E_DUPLICATE_ID");
        assert.strictEqual(codeOf(() => sets.create(NODES, { name: " Hubs" })), "E_DUPLICATE_ID");
        sets.create(NODES, { name: "hubs" });
        assert.strictEqual(codeOf(() => sets.rename(id, "hubs")), "E_DUPLICATE_ID");
        assert.strictEqual(codeOf(() => sets.rename(id, "")), "E_BAD_COMMAND");
    });

    it('picks "Set N", the smallest free N', () => {
        const { sets } = harness();
        const one = sets.create(NODES);
        const two = sets.create(NODES);
        assert.strictEqual(sets.get(one)?.name, "Set 1");
        assert.strictEqual(sets.get(two)?.name, "Set 2");
        sets.rename(one, "Renamed");
        assert.strictEqual(sets.get(sets.create(NODES))?.name, "Set 1");
        assert.strictEqual(sets.get(sets.create(NODES))?.name, "Set 3");
    });

    it("lists by order, ties by id, and tolerates a restored duplicate name", () => {
        const { store, sets } = harness();
        const record = (id: string): unknown => ({ id, name: "Same", order: 5, definition: NODES, createdFrom: { kind: "user" } });
        store.transact(() => {
            store.put(loadRecord(record("set_b")));
            store.put(loadRecord(record("set_a")));
        });
        const later = sets.create(NODES, { name: "Later" });
        assert.deepStrictEqual(
            sets.list().map((set) => set.id),
            ["set_a", "set_b", later],
        );
        assert.strictEqual(sets.get(later)?.order, 6);
        assert.strictEqual(codeOf(() => sets.rename(later, "Same")), "E_DUPLICATE_ID");
        sets.rename("set_a", "Unique");
        assert.strictEqual(sets.get("set_a")?.name, "Unique");
    });

    it("gives a new set an order past every order the store has held", () => {
        const { store, sets } = harness();
        const a = sets.create(NODES, { name: "A" });
        const b = sets.create(NODES, { name: "B" });
        const removed = sets.get(b);
        sets.remove(b);
        const c = sets.create(NODES, { name: "C" });
        store.transact(() => {
            store.put(removed as NonNullable<typeof removed>);
        });
        const orders = sets.list().map((set) => set.order);
        assert.strictEqual(new Set(orders).size, orders.length);
        assert.deepStrictEqual(
            sets.list().map((set) => set.id),
            [a, b, c],
        );
    });
});

describe("records", () => {
    it("get and list return the same frozen object until it changes", () => {
        const { sets } = harness();
        const a = sets.create(NODES, { name: "A" });
        const b = sets.create(NODES, { name: "B" });
        const before = sets.get(a);
        const listed = sets.list();
        assert.isTrue(Object.isFrozen(before));
        assert.strictEqual(listed, sets.list());
        assert.strictEqual(listed[0], before);

        sets.rename(b, "B2");
        assert.strictEqual(sets.get(a), before);
        assert.notStrictEqual(sets.list(), listed);
        assert.strictEqual(sets.list()[0], before);
    });

    it("stores { id, name, order, definition, createdFrom }; revision is derived, not stored", () => {
        const { sets } = harness();
        const id = sets.create(NODES, { name: "A" });
        const record = sets.get(id);
        assert.deepStrictEqual(Object.keys(record ?? {}), ["id", "name", "order", "definition", "createdFrom"]);
        assert.match(record?.revision ?? "", /^r1:[0-9a-f]{16}$/);
        assert.notInclude(JSON.stringify(record), "revision");
        assert.deepStrictEqual(record?.createdFrom, { kind: "user" });
    });
});

describe("set:changed plumbing", () => {
    it("tells one change per touched key after the write, with fields; nothing for a no-op", () => {
        const { store, sets, changes } = harness();
        const id = sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "A" });
        assert.deepStrictEqual(
            changes.map(({ change, fields }) => [change, fields]),
            [["created", []]],
        );
        assert.strictEqual(changes[0].set, sets.get(id));
        assert.strictEqual(changes[0].cause, "command");

        changes.length = 0;
        sets.rename(id, "A");
        sets.rename(id, " A ");
        sets.redefine(id, { kind: "fixed", nodes: ["b", "a", "a"], reading: "induced" });
        sets.addMembers(id, { nodes: ["a"] });
        sets.removeMembers(id, { nodes: ["zzz"] });
        assert.deepStrictEqual(changes, []);

        sets.rename(id, "B");
        store.transact(() => {
            sets.rename(id, "C");
            sets.redefine(id, { kind: "fixed", nodes: ["a"], reading: "listed" });
        });
        sets.remove(id);
        assert.deepStrictEqual(
            changes.map(({ change, fields, set }) => [change, fields, set?.name ?? null]),
            [
                ["updated", ["name"], "B"],
                ["updated", ["name", "definition"], "C"],
                ["removed", [], null],
            ],
        );
    });

    it("a group that renames a key and puts it back tells nothing", () => {
        const { store, sets, changes } = harness();
        const id = sets.create(NODES, { name: "A" });
        const record = sets.get(id);
        changes.length = 0;
        store.transact(() => {
            sets.rename(id, "B");
            store.put(record as NonNullable<typeof record>);
        });
        assert.deepStrictEqual(changes, []);
    });
});

describe("tombstones", () => {
    it("keeps { id, name, record } for a removed id, authoritative only while the id is absent", () => {
        const { store, sets } = harness();
        const id = sets.create(NODES, { name: "Gone" });
        // A live rule names it, so its record is kept.
        sets.create({ kind: "rule", where: { kind: "member", of: { set: id } }, reading: "induced" }, { name: "Naming" });
        const record = sets.get(id);
        sets.remove(id);
        assert.deepStrictEqual(store.tombstone(id), { id, name: "Gone", record });

        // An undo of the removal puts the record back; the tombstone stops speaking.
        store.transact(() => {
            store.put(record as NonNullable<typeof record>);
        });
        assert.isUndefined(store.tombstone(id));

        sets.rename(id, "Gone again");
        sets.remove(id);
        assert.strictEqual(store.tombstone(id)?.name, "Gone again");
    });

    it("keeps a removed record while a set names it, and drops it, keeping id and name, once nothing does", () => {
        const { store, sets } = harness();
        const base = sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Base" });
        const over = sets.create({ kind: "rule", where: { kind: "member", of: { set: base } }, reading: "induced" }, { name: "Over" });
        const alone = sets.create({ kind: "fixed", nodes: ["c"], reading: "induced" }, { name: "Alone" });

        sets.remove(base);
        sets.remove(alone);
        assert.isDefined(store.tombstone(base)?.record, "a live rule names it");
        assert.deepStrictEqual(store.tombstone(alone), { id: alone, name: "Alone" }, "nothing names it");

        sets.remove(over);
        assert.deepStrictEqual(store.tombstone(base), { id: base, name: "Base" }, "its last user went");
    });

    it("restores a removed set from its kept record, telling created, and refuses when it cannot", () => {
        const { sets, changes } = harness();
        const base = sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Base" });
        const over = sets.create({ kind: "rule", where: { kind: "member", of: { set: base } }, reading: "induced" }, { name: "Over" });
        const record = sets.get(base);
        sets.remove(base);
        changes.length = 0;

        sets.restore(base);
        assert.strictEqual(sets.get(base), record, "the same record, recomputed from nothing");
        assert.deepStrictEqual(
            changes.map((change) => [change.id, change.change, change.cause]),
            [[base, "created", "command"]],
        );

        const reasonOf = (call: () => void): unknown => {
            try {
                call();
            } catch (error) {
                return isGraphtyError(error) ? [error.code, error.details?.reason] : error;
            }

            return null;
        };
        assert.deepStrictEqual(reasonOf(() => sets.restore(base)), ["E_BAD_COMMAND", "live"]);
        assert.deepStrictEqual(reasonOf(() => sets.restore("set_never")), ["E_BAD_COMMAND", "unknown-id"]);
        sets.remove(over);
        const alone = sets.create({ kind: "fixed", nodes: ["c"], reading: "induced" }, { name: "Alone" });
        sets.remove(alone);
        assert.deepStrictEqual(reasonOf(() => sets.restore(alone)), ["E_BAD_COMMAND", "record-dropped"]);
    });
});

describe("session edge ids at the doors", () => {
    it("stores a session edge id as its stable member; get() never returns a counter id", () => {
        const h = makeSession();
        h.add([{ id: "a" }, { id: "b" }], [{ src: "b", dst: "a" }]);
        const sets = setsOfSession(h.session);
        const edge = edgeBetween(h, "b", "a");
        const id = sets.create({ kind: "fixed", nodes: [], edges: [edge], reading: "listed" }, { name: "E" });
        const stored = sets.get(id)?.definition;
        assert.deepStrictEqual(stored, { edges: [{ id: `graphty:e${edge}`, source: "a", target: "b" }], kind: "fixed", nodes: [], reading: "listed" });
        assert.notInclude(JSON.stringify(stored), `"${edge}"`);

        sets.removeMembers(id, { edges: [edge] });
        assert.deepStrictEqual(sets.get(id)?.definition, { kind: "fixed", nodes: [], reading: "listed" });
        assert.strictEqual(codeOf(() => sets.addMembers(id, { edges: ["999"] })), "E_BAD_COMMAND");
    });

    it("uses the file id at the configured edgeIdPath", () => {
        const config = DataConfig.parse({ knownFields: { edgeIdPath: "key" } });
        const h = makeSession({ config });
        h.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", key: "k1" }]);
        const sets = setsOfSession(h.session);
        const id = sets.create({ kind: "path", nodes: ["a", "b"], edges: [edgeBetween(h, "a", "b")] }, { name: "P" });
        assert.deepStrictEqual(sets.get(id)?.definition, { edges: [{ id: "k1", source: "a", target: "b" }], kind: "path", nodes: ["a", "b"] });
    });
});

describe("the slice has one writer", () => {
    it("nothing outside src/session/sets/ imports the store", () => {
        const src = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
        const setsDir = join(src, "session", "sets");
        const store = join(setsDir, "store");
        const offenders: string[] = [];

        for (const entry of readdirSync(src, { recursive: true, encoding: "utf8" })) {
            const file = join(src, entry);
            if (!entry.endsWith(".ts") || file.startsWith(setsDir)) {
                continue;
            }

            for (const [, specifier] of readFileSync(file, "utf8").matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
                if (specifier.startsWith(".") && resolve(dirname(file), specifier).replace(/\.ts$/, "") === store) {
                    offenders.push(entry);
                }
            }
        }

        assert.deepStrictEqual(offenders, [], "only session/sets/ may reach the store's put and delete");
    });
});
