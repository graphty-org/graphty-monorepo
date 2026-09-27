/**
 * @file Property: over random sequences of the five set operations and the store's own put and
 * delete (as an undo or a loader would call them), no id is ever issued twice, every live record
 * is a valid canonical definition, live orders are distinct, and the issued-id register only grows
 * (design/sets/sets-design.md sections 3.1, 12.4, 13).
 */

import fc from "fast-check";
import { assert, describe, it } from "vitest";

import { parseSetDefinition } from "../../../src/catalog/sets/parse";
import type { SetDefinitionInput, SetId } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createSetsApi } from "../../../src/session/sets/SetsApi";
import { SetsStore } from "../../../src/session/sets/store";
import { fcParams } from "../../helpers/fc-params";

const ID = fc.constantFrom<string | number>("a", "b", "c", 1, 2);
const EDGE = fc.oneof(
    fc.record({ source: ID, target: ID, id: fc.constantFrom("x", "y", 7) }),
    fc.record({ source: ID, target: ID, ordinal: fc.constantFrom(0, 1), among: fc.constant(2) }),
);
const NAME = fc.option(fc.constantFrom("Suspects", " suspects ", "Hubs", "Set 1", "a.b", "", "Z"), { nil: undefined });
const DEFINITION: fc.Arbitrary<SetDefinitionInput> = fc.oneof(
    fc.record({
        kind: fc.constant("fixed" as const),
        nodes: fc.array(ID, { maxLength: 4 }),
        edges: fc.array(EDGE, { maxLength: 3 }),
        reading: fc.constantFrom("induced" as const, "listed" as const, "clipped" as const),
    }),
    fc.record({ kind: fc.constant("rule" as const), where: fc.constantFrom("degree > `1`", "label == 'x'"), reading: fc.constant("induced" as const) }),
    fc.record({ kind: fc.constant("path" as const), nodes: fc.array(ID, { minLength: 1, maxLength: 3 }) }),
);

type Op =
    | { op: "create"; definition: SetDefinitionInput; name: string | undefined }
    | { op: "rename"; pick: number; name: string | undefined }
    | { op: "redefine"; pick: number; definition: SetDefinitionInput }
    | { op: "add" | "remove"; pick: number; nodes: (string | number)[]; edges: { source: string | number; target: string | number }[] }
    | { op: "delete-set"; pick: number }
    | { op: "store-delete"; pick: number }
    | { op: "store-restore"; pick: number }
    | { op: "group"; ops: Op[]; abort: boolean };

const PICK = fc.nat(20);
const LEAF: fc.Arbitrary<Op> = fc.oneof(
    fc.record({ op: fc.constant("create" as const), definition: DEFINITION, name: NAME }),
    fc.record({ op: fc.constant("rename" as const), pick: PICK, name: NAME }),
    fc.record({ op: fc.constant("redefine" as const), pick: PICK, definition: DEFINITION }),
    fc.record({ op: fc.constantFrom("add" as const, "remove" as const), pick: PICK, nodes: fc.array(ID, { maxLength: 3 }), edges: fc.array(EDGE, { maxLength: 2 }) }),
    fc.record({ op: fc.constant("delete-set" as const), pick: PICK }),
    fc.record({ op: fc.constant("store-delete" as const), pick: PICK }),
    fc.record({ op: fc.constant("store-restore" as const), pick: PICK }),
);
const OP: fc.Arbitrary<Op> = fc.oneof(
    { weight: 6, arbitrary: LEAF },
    { weight: 1, arbitrary: fc.record({ op: fc.constant("group" as const), ops: fc.array(LEAF, { maxLength: 4 }), abort: fc.boolean() }) },
);

describe("the sets store under random operations", () => {
    it("never reissues an id, keeps records valid and orders distinct, and only grows the register", () => {
        fc.assert(
            fc.property(fc.array(OP, { maxLength: 25 }), (ops) => {
                const store = new SetsStore();
                const sets = createSetsApi({ edgeMember: () => undefined }, store);
                // Every id a create returned, and the ones returned inside the open group.
                const returned = new Set<SetId>();
                let inGroup: SetId[] = [];
                const removed: SetId[] = [];

                const pickLive = (pick: number): SetId | undefined => {
                    const live = sets.list();
                    return live.length === 0 ? undefined : live[pick % live.length].id;
                };

                const run = (op: Op): void => {
                    const id = "pick" in op ? pickLive(op.pick) : undefined;
                    switch (op.op) {
                        case "create": {
                            const committed = new Set(store.register());
                            const minted = sets.create(op.definition, op.name === undefined ? {} : { name: op.name });
                            assert.isFalse(committed.has(minted), `reissued committed id ${minted}`);
                            assert.notInclude(inGroup, minted, `reissued ${minted} inside one group`);
                            inGroup.push(minted);
                            returned.add(minted);
                            break;
                        }
                        case "rename":
                            if (id !== undefined) {
                                sets.rename(id, op.name ?? "Renamed");
                            }
                            break;
                        case "redefine":
                            if (id !== undefined) {
                                sets.redefine(id, op.definition);
                            }
                            break;
                        case "add":
                        case "remove":
                            if (id !== undefined) {
                                const delta = { nodes: op.nodes, edges: op.edges as never };
                                if (op.op === "add") {
                                    sets.addMembers(id, delta);
                                } else {
                                    sets.removeMembers(id, delta);
                                }
                            }
                            break;
                        case "delete-set":
                            if (id !== undefined) {
                                sets.remove(id);
                                removed.push(id);
                            }
                            break;
                        case "store-delete":
                            if (id !== undefined) {
                                store.transact(() => {
                                    store.delete(id);
                                });
                                removed.push(id);
                            }
                            break;
                        case "store-restore": {
                            // What an undo of a removal does: put the last record back.
                            const candidate = removed.length === 0 ? undefined : removed[op.pick % removed.length];
                            const record = candidate === undefined ? undefined : store.tombstone(candidate)?.record;
                            if (record !== undefined) {
                                store.transact(() => {
                                    store.put(record);
                                });
                            }
                            break;
                        }
                        case "group":
                            inGroup = [];
                            store.transact(() => {
                                for (const inner of op.ops) {
                                    attempt(inner);
                                }

                                if (op.abort) {
                                    throw new Error("abort");
                                }
                            });
                            break;
                        default:
                            throw new Error("unknown operation");
                    }
                };

                const attempt = (op: Op): void => {
                    try {
                        run(op);
                    } catch (error) {
                        if (!isGraphtyError(error) && !(error instanceof Error && error.message === "abort")) {
                            throw error;
                        }
                    }
                };

                let register: SetId[] = [];
                for (const op of ops) {
                    inGroup = [];
                    attempt(op);

                    const now = [...store.register()];
                    assert.includeMembers(now, register, "the register only grows");
                    register = now;

                    const live = sets.list();
                    const orders = live.map((set) => set.order);
                    assert.strictEqual(new Set(orders).size, orders.length, "live orders are distinct");
                    for (const set of live) {
                        assert.isTrue(set.id.startsWith("set_"));
                        assert.isTrue(Object.isFrozen(set));
                        const plain = JSON.parse(JSON.stringify(set.definition)) as unknown;
                        assert.deepStrictEqual(parseSetDefinition(plain), plain, "every live record is canonical and valid");
                    }
                }

                // Only ids a create returned are registered: a refused create or an aborted group
                // leaves no id behind.
                for (const id of store.register()) {
                    assert.isTrue(returned.has(id));
                }
            }),
            fcParams(1_000),
        );
    });
});
