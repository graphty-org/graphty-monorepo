/**
 * @file What `algo.legacy` hands a plugin algorithm, beyond the plain reads and writes of
 * legacy-writes.test.ts: writes kept past the run refuse with a code naming the door to use, nested
 * deletes and reflection see the copy, scopes open and close per graph, the graph facade routes
 * every door it reaches into the running command, and a dispatcher with no runs API refuses the run
 * ops instead of failing somewhere deeper.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import {
    ALGO_DEFINITIONS,
    legacyFacade,
    legacyScopeOf,
    LegacyWrites,
    openLegacyScope,
} from "../../../src/session/commands/algo";
import { Dispatcher, type DispatchFunction } from "../../../src/session/project/Dispatcher";

/**
 * A frozen record, as the graph holds one.
 * @returns The record.
 */
function frozenRecord(): Record<string, unknown> {
    const inner = Object.freeze({ fixture: Object.freeze({ a: Object.freeze({ value: 1 }), b: 2 }) });
    return Object.freeze({ id: "n1", label: "one", algorithmResults: inner, tags: Object.freeze(["x", "y"]) });
}

/**
 * The code and details of what `fn` throws.
 * @param fn - The call.
 * @returns Them.
 */
function thrown(fn: () => unknown): { code: string; details: unknown; message: string } {
    try {
        fn();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        const coded = error as { code: string; details: unknown; message: string };
        return { code: coded.code, details: coded.details, message: coded.message };
    }

    return assert.fail("expected a throw");
}

describe("a record written after its run ended", () => {
    it("refuses a node write, naming updateNodes", () => {
        const writes = new LegacyWrites({}, () => true);
        const view = writes.view("node", "n1", frozenRecord()) as Record<string, unknown>;
        writes.close();

        const error = thrown(() => {
            view.label = "late";
        });

        assert.strictEqual(error.code, "E_READONLY");
        assert.deepEqual(error.details, { target: "node", id: "n1", key: "label" });
        assert.include(error.message, "session.data.updateNodes");
        assert.include(error.message, 'node "n1"');
    });

    it("refuses an edge delete, naming updateEdges", () => {
        const writes = new LegacyWrites({}, () => true);
        const view = writes.view("edge", 7, frozenRecord()) as Record<string, unknown>;
        writes.close();

        const error = thrown(() => delete view.label);

        assert.strictEqual(error.code, "E_READONLY");
        assert.deepEqual(error.details, { target: "edge", id: 7, key: "label" });
        assert.include(error.message, "session.data.updateEdges");
    });

    it("refuses a graph write, pointing at graphResults during the run", () => {
        const writes = new LegacyWrites({}, () => true);
        const view = writes.graph(new Map([["graphResults", {}]]));
        writes.close();

        const error = thrown(() => {
            view.graphResults = { late: true };
        });

        assert.include(error.message, "the graph's values");
        assert.include(error.message, "write graphResults while the algorithm runs");
    });

    it("refuses a write to a subtree copied during the run, and to one read only after", () => {
        const writes = new LegacyWrites({}, () => true);
        const view = writes.view("node", "n1", frozenRecord()) as {
            algorithmResults: { fixture: Record<string, unknown> };
        };
        view.algorithmResults.fixture.c = 3;
        const kept = view.algorithmResults.fixture;
        writes.close();

        // Handed out while the run went: frozen at the end, so the late write is a TypeError.
        assert.throws(() => {
            kept.d = 4;
        }, TypeError);
        // Read again after the end: a view, which names what to do instead.
        assert.strictEqual(
            thrown(() => {
                view.algorithmResults.fixture.d = 4;
            }).code,
            "E_READONLY",
        );
        assert.strictEqual(thrown(() => delete view.algorithmResults.fixture.c).code, "E_READONLY");
        assert.deepEqual(writes.writes().nodes, [
            { id: "n1", values: { algorithmResults: { fixture: { a: { value: 1 }, b: 2, c: 3 } } } },
        ]);
    });
});

describe("nested reads and deletes through a record view", () => {
    it("a nested delete copies its top-level key and leaves the record whole", () => {
        const writes = new LegacyWrites({}, () => true);
        const record = frozenRecord();
        const view = writes.view("node", "n1", record) as { algorithmResults: { fixture: Record<string, unknown> } };

        assert.isTrue(delete view.algorithmResults.fixture.b);

        assert.isFalse("b" in view.algorithmResults.fixture);
        assert.isTrue("a" in view.algorithmResults.fixture);
        assert.deepEqual(Object.keys(view.algorithmResults.fixture), ["a"]);
        assert.deepEqual(record.algorithmResults, { fixture: { a: { value: 1 }, b: 2 } });
        assert.deepEqual(writes.writes().nodes, [
            { id: "n1", values: { algorithmResults: { fixture: { a: { value: 1 } } } } },
        ]);
    });

    it("reflects a nested object's own keys before any write", () => {
        const writes = new LegacyWrites({}, () => true);
        const view = writes.view("node", "n1", frozenRecord()) as {
            algorithmResults: { fixture: Record<string, unknown>; missing?: Record<string, unknown> };
            tags: string[];
        };

        assert.deepEqual(Object.keys(view.algorithmResults.fixture), ["a", "b"]);
        assert.isUndefined(Object.getOwnPropertyDescriptor(view.algorithmResults.fixture, "zzz"));
        assert.isFalse("anything" in (view.algorithmResults.missing ?? {}));
        assert.strictEqual(view.tags.length, 2);
        assert.deepEqual(Object.getOwnPropertyDescriptor(view.tags, "length"), {
            value: 2,
            writable: true,
            enumerable: false,
            configurable: false,
        });
        assert.deepEqual(writes.writes(), { nodes: [], edges: [], graph: null });
    });

    it("a top-level key written but not on the record is its own", () => {
        const writes = new LegacyWrites({}, () => true);
        const view = writes.view("node", "n1", frozenRecord()) as Record<string, unknown>;

        view.score = 5;

        assert.isTrue("score" in view);
        assert.deepEqual(Object.getOwnPropertyDescriptor(view, "score"), {
            value: 5,
            writable: true,
            enumerable: true,
            configurable: true,
        });
    });
});

describe("copy-on-write scopes", () => {
    /** A render object whose `data` getter reads a frozen record. */
    class Row {
        readonly #record: Record<string, unknown>;

        constructor(
            readonly id: string,
            weight: number,
        ) {
            this.#record = Object.freeze({ weight });
        }

        get data(): Record<string, unknown> {
            return this.#record;
        }
    }

    /** A prototype whose `data` is a plain value, which has no getter to swap. */
    const plain = { data: { weight: 0 } };

    it("is found by its dispatcher only while it is open", () => {
        const owner = new Dispatcher({ definitions: [] });
        const writes = new LegacyWrites(owner, () => true);

        assert.isUndefined(legacyScopeOf(owner));
        const close = openLegacyScope(writes, []);
        assert.strictEqual(legacyScopeOf(owner), writes);
        assert.isUndefined(legacyScopeOf(new Dispatcher({ definitions: [] })));
        close();
        assert.isUndefined(legacyScopeOf(owner));
        assert.isTrue(writes.closed);
    });

    it("views only its own graph's rows, and keeps the getter swapped until the last scope closes", () => {
        const mine = new Row("m", 1);
        const theirs = new Row("t", 1);
        const first = new LegacyWrites({}, (element) => element === mine);
        const second = new LegacyWrites({}, (element) => element === theirs);
        const prototypes = [
            { prototype: Row.prototype, target: "node" as const },
            { prototype: plain, target: "edge" as const },
        ];

        const getter = Object.getOwnPropertyDescriptor(Row.prototype, "data")?.get;
        const closeFirst = openLegacyScope(first, prototypes);
        const closeSecond = openLegacyScope(second, prototypes);
        const stranger = new Row("s", 1);
        try {
            mine.data.weight = 2;
            theirs.data.weight = 3;
            assert.throws(() => {
                stranger.data.weight = 4;
            }, TypeError);

            closeFirst();
            // The second scope is still open, so its rows still read through views.
            theirs.data.weight = 5;
            assert.strictEqual(theirs.data.weight, 5);
            closeFirst();
        } finally {
            closeSecond();
        }

        assert.deepEqual(plain.data, { weight: 0 }, "a plain data value is left alone");
        assert.strictEqual(mine.data.weight, 1);
        assert.strictEqual(theirs.data.weight, 1);
        assert.deepEqual(first.writes().nodes, [{ id: "m", values: { weight: 2 } }]);
        assert.deepEqual(second.writes().nodes, [{ id: "t", values: { weight: 5 } }]);
        assert.strictEqual(
            Object.getOwnPropertyDescriptor(Row.prototype, "data")?.get,
            getter,
            "the getter is put back",
        );
    });
});

describe("the graph facade a plugin is handed", () => {
    /** A part of a graph, with a private field a proxy receiver would break. */
    class Part {
        readonly #name: string;

        constructor(name: string) {
            this.#name = name;
        }

        name(): string {
            return this.#name;
        }
    }

    /** A stand-in graph: methods returning each kind of value the facade decides about. */
    class Graph {
        readonly part = new Part("p");
        readonly frozen = Object.freeze({ go: (): number => 1 });
        readonly data = { count: 2 };
        label = "g";
        readonly seenRouting: boolean[] = [];

        constructor(readonly dispatcher: Dispatcher) {}

        door(): Part {
            this.seenRouting.push(this.dispatcher.routing);
            return this.part;
        }

        isOwnPart(part: Part): boolean {
            return part === this.part;
        }

        api(): { readonly run: () => boolean } {
            return { run: () => this.dispatcher.routing };
        }

        values(): readonly unknown[] {
            return [
                [1, 2],
                new Uint8Array(2),
                Promise.resolve(1),
                new Map(),
                new Set(),
                new WeakMap(),
                new WeakSet(),
                new Date(0),
                /x/,
                new Error("e"),
                [1].values(),
                Object.create(null) as object,
                { plain: true },
            ];
        }
    }

    const inline: DispatchFunction = () => Promise.resolve(undefined);

    it("routes every call it makes, and every call on what it hands back", () => {
        const dispatcher = new Dispatcher({ definitions: [] });
        const graph = new Graph(dispatcher);
        const facade = legacyFacade(graph, dispatcher, inline);

        const part = facade.door();

        assert.deepEqual(graph.seenRouting, [true]);
        assert.isFalse(dispatcher.routing, "the routing lasts for the call only");
        assert.notStrictEqual(part, graph.part, "an object with methods comes back wrapped");
        assert.strictEqual(facade.door(), part, "one facade per object");
        assert.strictEqual(part.name(), "p", "calls reach the real object, private fields and all");
        assert.isTrue(facade.isOwnPart(part), "a facade passed back in is unwrapped");
        assert.isTrue(facade.api().run(), "an object literal with methods is wrapped too");
        assert.strictEqual(facade.part.name(), "p");
    });

    it("hands data, built-ins and frozen objects out as they are", () => {
        const dispatcher = new Dispatcher({ definitions: [] });
        const graph = new Graph(dispatcher);
        const facade = legacyFacade(graph, dispatcher, inline);

        assert.strictEqual(facade.data, graph.data);
        assert.strictEqual(facade.frozen, graph.frozen);
        assert.strictEqual(facade.label, "g");
        const values = facade.values();
        const real = graph.values();
        assert.strictEqual(values.length, real.length);
        for (const [at, value] of values.entries()) {
            assert.strictEqual(Object.getPrototypeOf(value), Object.getPrototypeOf(real[at]), `value ${at}`);
            assert.isFalse(value === real[at] && typeof value === "object", `value ${at} is a fresh object`);
        }
    });

    it("writes a property on the real object, unwrapping a facade written", () => {
        const dispatcher = new Dispatcher({ definitions: [] });
        const graph = new Graph(dispatcher);
        const facade = legacyFacade(graph, dispatcher, inline) as Graph & { extra?: Part };

        facade.label = "renamed";
        facade.extra = facade.door();

        assert.strictEqual(graph.label, "renamed");
        assert.strictEqual((graph as Graph & { extra?: Part }).extra, graph.part);
    });
});

describe("a dispatcher with no runs API", () => {
    it("refuses every run op with E_UNSUPPORTED", async () => {
        const dispatcher = new Dispatcher({ definitions: [...ALGO_DEFINITIONS] });
        const commands = [
            { op: "algo.remove", runId: "r1" },
            { op: "algo.move", runId: "r1", before: null },
            { op: "algo.rename", runId: "r1", name: "mine" },
        ] as const;

        for (const command of commands) {
            const error: unknown = await dispatcher.dispatch(command).then(
                () => null,
                (failure: unknown) => failure,
            );
            assert.isTrue(isGraphtyError(error), `${command.op}: ${String(error)}`);
            assert.strictEqual((error as { code: string }).code, "E_UNSUPPORTED", command.op);
        }

        assert.strictEqual(dispatcher.history.length, 0, "a refusal records no step");
    });
});
