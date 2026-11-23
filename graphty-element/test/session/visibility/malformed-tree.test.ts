/**
 * A malformed "all", "any" or "not" filter is refused with `E_BAD_COMMAND` at every entry point
 * that takes a filter, never with the `TypeError` a tree walk would throw first (#9811).
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type RuleTree } from "../../../session";
import { GraphtyError } from "../../../src/errors";

const MALFORMED: readonly (readonly [string, unknown])[] = [
    ["an all whose of is not a list", { kind: "all", of: { kind: "isolated" } }],
    ["an any holding null", { kind: "any", of: [null] }],
    ["an all holding a string", { kind: "all", of: ["isolated"] }],
    ["a not of null", { kind: "not", of: null }],
    ["a not of an all whose of is missing", { kind: "not", of: { kind: "all" } }],
];

/**
 * A session holding one node.
 * @returns The session.
 */
async function graph(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }]);
    return session;
}

/**
 * The code a call threw, failing when it threw something that is not a GraphtyError.
 * @param call - The call.
 * @returns The code.
 */
function codeOf(call: () => unknown): string {
    let thrown: unknown = null;
    try {
        call();
    } catch (error) {
        thrown = error;
    }

    assert.instanceOf(thrown, GraphtyError, String(thrown));
    return thrown.code;
}

describe("a malformed filter tree", () => {
    for (const [name, filter] of MALFORMED) {
        const rule = filter as RuleTree;

        it(`visibility.set refuses ${name}`, async () => {
            const session = await graph();
            assert.strictEqual(
                codeOf(() => session.visibility.set(rule)),
                "E_BAD_COMMAND",
            );
        });

        it(`visibility.setSteps refuses ${name}`, async () => {
            const session = await graph();
            assert.strictEqual(
                codeOf(() => session.visibility.setSteps([{ id: "s", on: true, rule }])),
                "E_BAD_COMMAND",
            );
        });

        it(`visibility.setConditions, addCondition and draft refuse ${name}`, async () => {
            const session = await graph();
            assert.strictEqual(
                codeOf(() => session.visibility.setConditions([{ effect: "keep", rule }])),
                "E_BAD_COMMAND",
            );
            assert.strictEqual(
                codeOf(() => session.visibility.addCondition({ effect: "keep", rule })),
                "E_BAD_COMMAND",
            );
            assert.strictEqual(
                codeOf(() => session.visibility.draft({ effect: "keep", rule })),
                "E_BAD_COMMAND",
            );
        });

        it(`a scope defining a rule set refuses ${name}`, async () => {
            const session = await graph();
            const define = { kind: "rule", where: rule, reading: "induced" } as const;
            const error: unknown = await Promise.resolve()
                .then(() => session.selection.apply({ scope: { define } }))
                .then(
                    () => null,
                    (failure: unknown) => failure,
                );
            assert.instanceOf(error, GraphtyError, String(error));
            assert.strictEqual(error.code, "E_BAD_COMMAND");
        });
    }
});
