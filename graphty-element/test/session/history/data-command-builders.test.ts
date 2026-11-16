/**
 * @file The data ops' builders and refusals, without a renderer: the steps a replace of the nodes
 * or edges is made of, which commands start the load-time algorithm list, the shape checks a data
 * door runs before writing, and what a session missing its data service, or one that cannot write
 * graph values, refuses.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import {
    addsRows,
    checkMutation,
    DATA_DEFINITIONS,
    type DataMutation,
    type DataService,
    replaceEdgesCommand,
    replaceNodesCommand,
} from "../../../src/session/commands/data";
import { Dispatcher } from "../../../src/session/project/Dispatcher";

/**
 * The code and details a call fails with, thrown or rejected.
 * @param fn - The call.
 * @returns Them.
 */
async function failure(fn: () => unknown): Promise<{ code: string; details: Record<string, unknown> }> {
    let error: unknown = null;
    try {
        await fn();
    } catch (caught) {
        error = caught;
    }

    assert.isTrue(isGraphtyError(error), String(error));
    const coded = error as { code: string; details?: Record<string, unknown> };
    return { code: coded.code, details: coded.details ?? {} };
}

describe("replacing the edges", () => {
    it("removes the held edges, then adds the new ones with their endpoint options", () => {
        const command = replaceEdgesCommand(
            ["e1", "e2"],
            [{ from: "a", to: "b" }],
            { source: "from", target: "to", repeated: "first" },
            true,
        );

        assert.strictEqual(command.op, "batch");
        assert.deepEqual(command.fact, { code: "data.replace-edges", params: {} });
        assert.isTrue(command.setup);
        assert.deepEqual(command.steps, [
            { op: "data.apply", mutation: { kind: "remove-edges", ids: ["e1", "e2"] } },
            {
                op: "data.apply",
                mutation: {
                    kind: "add-edges",
                    records: [{ from: "a", to: "b" }],
                    source: "from",
                    target: "to",
                    repeated: "first",
                },
            },
        ]);
    });

    it("on an empty graph is only the add, with no options it was not given", () => {
        const command = replaceEdgesCommand([], [{ source: "a", target: "b" }]);

        assert.isFalse("setup" in command);
        assert.deepEqual(command.steps, [
            { op: "data.apply", mutation: { kind: "add-edges", records: [{ source: "a", target: "b" }] } },
        ]);
    });
});

describe("replacing the nodes", () => {
    it("removes the nodes not named again, rewrites the changed ones and adds the rest", () => {
        const held = new Map<string | number, Readonly<Record<string, unknown>>>([
            ["kept", { id: "kept", label: "same" }],
            ["changed", { id: "changed", label: "old" }],
            ["gone", { id: "gone" }],
        ]);
        const records = [{ id: "kept", label: "same" }, { id: "changed", label: "new" }, { id: "fresh" }];

        const command = replaceNodesCommand(held, records, "id", true);

        assert.deepEqual(command.fact, { code: "data.replace-nodes", params: {} });
        assert.isTrue(command.setup);
        assert.deepEqual(command.steps, [
            { op: "data.apply", mutation: { kind: "remove-nodes", ids: ["gone"] } },
            {
                op: "data.apply",
                mutation: {
                    kind: "update-rows",
                    target: "node",
                    rows: [{ id: "changed", values: { id: "changed", label: "new" } }],
                    replace: true,
                },
            },
            { op: "data.apply", mutation: { kind: "add-nodes", records, idPath: "id" } },
        ]);
    });

    it("with the same nodes again is only the add, and reads ids at a nested path", () => {
        const held = new Map<string | number, Readonly<Record<string, unknown>>>([["a", { key: { id: "a" } }]]);
        const records = [{ key: { id: "a" } }];

        const command = replaceNodesCommand(held, records, "key.id");

        assert.isFalse("setup" in command);
        assert.deepEqual(command.steps, [
            { op: "data.apply", mutation: { kind: "add-nodes", records, idPath: "key.id" } },
        ]);
    });
});

describe("which commands add rows", () => {
    it("is an add of nodes or edges, or an import naming its type and options", () => {
        const apply = (kind: DataMutation["kind"]): { op: string; mutation: { kind: string } } => ({
            op: "data.apply",
            mutation: { kind },
        });

        assert.isTrue(addsRows(apply("add-nodes")));
        assert.isTrue(addsRows(apply("add-edges")));
        assert.isFalse(addsRows(apply("remove-nodes")));
        assert.isTrue(addsRows({ op: "data.import", source: { type: "json", config: {} } } as { op: string }));
        assert.isFalse(addsRows({ op: "data.import", source: { type: "json" } } as { op: string }));
        assert.isFalse(addsRows({ op: "data.import", source: { config: {} } } as { op: string }));
        assert.isFalse(addsRows({ op: "styles.add" }));
    });
});

describe("a data door's shape checks", () => {
    it("refuses attribute values that are not an object, naming the door", async () => {
        const refused = await failure(() => {
            checkMutation({ kind: "set-attributes", ids: ["a"], values: 3 } as unknown as DataMutation);
        });

        assert.strictEqual(refused.code, "E_BAD_COMMAND");
        assert.include(JSON.stringify(refused.details), "values is not an object");
    });

    it("refuses an id that is neither a string nor a number, naming the row", async () => {
        const refused = await failure(() => {
            checkMutation({ kind: "set-attributes", ids: ["a", {}], values: {} } as unknown as DataMutation);
        });

        assert.strictEqual(refused.code, "E_BAD_COMMAND");
        assert.include(JSON.stringify(refused.details), "an id is not a string or a number");
    });

    it("accepts well-formed attribute writes and kinds it has no check for", () => {
        checkMutation({ kind: "set-attributes", ids: ["a", 1], values: { x: 1 } } as unknown as DataMutation);
        checkMutation({ kind: "something-else" } as unknown as DataMutation);
    });
});

describe("a session without its data service", () => {
    it("refuses every op that needs it with E_UNSUPPORTED", async () => {
        const dispatcher = new Dispatcher({ definitions: [...DATA_DEFINITIONS] });

        const refused = await failure(() =>
            dispatcher.dispatch({ op: "data.setSource", source: { type: "json", name: "a.json" } }),
        );

        assert.strictEqual(refused.code, "E_UNSUPPORTED");
        assert.strictEqual(dispatcher.history.length, 0);
    });

    it("refuses what writes graph values when the service cannot write them", async () => {
        const dispatcher = new Dispatcher({ definitions: [...DATA_DEFINITIONS] });
        const service: DataService = {
            apply: () => undefined,
            import: () => Promise.resolve(null),
        };
        dispatcher.services.data = service;

        const commands = [
            { op: "data.setSource", source: { type: "json", name: "a.json" } },
            { op: "data.setFileStyles", loads: [] },
            { op: "data.columns", settings: { hidden: [], types: {}, renamed: {} } },
        ] as const;
        for (const command of commands) {
            assert.strictEqual((await failure(() => dispatcher.dispatch(command))).code, "E_UNSUPPORTED", command.op);
        }

        assert.strictEqual(dispatcher.history.length, 0);
    });

    it("refuses a source that is not an object, and column settings of the wrong shape", async () => {
        const dispatcher = new Dispatcher({ definitions: [...DATA_DEFINITIONS] });
        const written: Record<string, unknown>[] = [];
        dispatcher.services.data = {
            apply: () => undefined,
            import: () => Promise.resolve(null),
            values: (values) => {
                written.push(values);
            },
        };

        const notSource = await failure(() =>
            dispatcher.dispatch({ op: "data.setSource", source: ["a"] } as unknown as Parameters<
                typeof dispatcher.dispatch
            >[0]),
        );
        assert.strictEqual(notSource.code, "E_BAD_COMMAND");
        assert.strictEqual(notSource.details.reason, "not-a-source");

        for (const settings of [
            null,
            { hidden: "a", types: {}, renamed: {} },
            { hidden: [1], types: {}, renamed: {} },
            { hidden: [], types: [], renamed: {} },
            { hidden: [], types: { "node:a": "not-a-type" }, renamed: {} },
            { hidden: [], types: {}, renamed: { "node:a": 2 } },
        ]) {
            const refused = await failure(() =>
                dispatcher.dispatch({ op: "data.columns", settings } as unknown as Parameters<
                    typeof dispatcher.dispatch
                >[0]),
            );
            assert.strictEqual(refused.code, "E_BAD_COMMAND", JSON.stringify(settings));
        }

        assert.deepEqual(written, [], "nothing refused was written");
        assert.strictEqual(dispatcher.history.length, 0);
    });
});
