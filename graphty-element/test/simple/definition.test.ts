/**
 * @file What every simple-tier `define*` call shares: the definition checks, the names derived
 * from an id, and the errors a beginner reads (design/extensions/simple-tier.md sections 2.1 and
 * 2.4).
 *
 * The first line of an error is what a person searches for, so these tests pin whole messages:
 * each names the call and the id, the member at fault, what was expected and what was given.
 */

import { assert, describe, it } from "vitest";

import * as extend from "../../extend";
import { GraphtyError, isGraphtyError } from "../../src/errors";
import {
    badDefinition,
    callAuthor,
    callAuthorAsync,
    checkDefinition,
    describeValue,
    displayName,
    extensionFailed,
    optionalOneOf,
    requireFunction,
    sentenceCase,
} from "../../src/simple/definition";

/**
 * The error a call throws, asserted to be a GraphtyError.
 * @param call - The call.
 * @returns The error.
 */
function thrown(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `a GraphtyError, not ${String(error)}`);
        return error as GraphtyError;
    }

    return assert.fail("the call did not throw");
}

describe("the definition object", () => {
    it("must be an object", () => {
        const error = thrown(() => checkDefinition("defineLayout", "acme-tiers"));

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(
            error.message,
            'defineLayout(): the definition must be an object such as { id: "acme-example", ... }; got the string "acme-tiers".',
        );
        assert.strictEqual(error.details.field, "definition");
    });

    it("needs an id", () => {
        const error = thrown(() => checkDefinition("defineAlgorithm", { node: () => 1 }));

        assert.strictEqual(
            error.message,
            'defineAlgorithm(): "id" must be a non-empty string such as "acme-example"; got undefined.',
        );
        assert.strictEqual(error.details.field, "id");
    });

    it("refuses an id with capitals, spaces, dots or colons, and says why", () => {
        for (const id of ["Acme-Tiers", "acme tiers", "acme.tiers", "acme:tiers", "-acme", "acme--tiers", "1acme"]) {
            const error = thrown(() => checkDefinition("defineLayout", { id }));

            assert.strictEqual(error.code, "E_BAD_COMMAND", id);
            assert.isTrue(error.message.startsWith(`defineLayout(${JSON.stringify(id)}): "id" must be lower-case words`), id);
            assert.strictEqual(error.details.field, "id");
        }
    });

    it("accepts a lower-case hyphenated id and hands the definition back", () => {
        const definition = { id: "acme-hop-reach2", name: "Hop reach" };

        assert.strictEqual(checkDefinition("defineAlgorithm", definition), definition);
    });

    it("refuses a name that is not a string", () => {
        const error = thrown(() => checkDefinition("definePalette", { id: "acme-brand", name: 7 }));

        assert.strictEqual(error.message, 'definePalette("acme-brand"): "name" must be a string; got the number 7.');
        assert.strictEqual(error.details.field, "name");
        assert.strictEqual(error.details.extension, "acme-brand");
    });

    it("words a missing function the way the guide shows it", () => {
        const definition = checkDefinition("defineLayout", { id: "acme-tiers" });
        const error = thrown(() => requireFunction("defineLayout", definition, "place"));

        assert.strictEqual(error.message, 'defineLayout("acme-tiers"): "place" must be a function; got undefined.');
        assert.strictEqual(error.details.field, "place");
    });

    it("lists the allowed values of a closed member", () => {
        const definition = checkDefinition("defineLogDestination", { id: "acme-telemetry", level: "fatal" });
        const error = thrown(() =>
            optionalOneOf("defineLogDestination", definition, "level", ["error", "warn", "info", "debug", "trace"]),
        );

        assert.strictEqual(
            error.message,
            'defineLogDestination("acme-telemetry"): "level" must be one of "error", "warn", "info", "debug", "trace"; ' +
                'got the string "fatal".',
        );
    });

    it("describes what the author passed in a few words", () => {
        assert.strictEqual(describeValue(undefined), "undefined");
        assert.strictEqual(describeValue(null), "null");
        assert.strictEqual(describeValue([1]), "an array");
        assert.strictEqual(describeValue(() => 1), "a function");
        assert.strictEqual(describeValue({}), "an object");
        assert.strictEqual(describeValue(true), "the boolean true");
        assert.strictEqual(describeValue(0), "the number 0");
    });

    it("builds its refusal with the published code for a malformed definition", () => {
        const error = badDefinition("defineLayout", "acme-tiers", "dimensions", '"dimensions" must be 2 or 3; got 4.');

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.source, "registry");
    });
});

describe("names the element derives", () => {
    it("reads a key or an id in sentence case", () => {
        assert.strictEqual(sentenceCase("tierAttribute"), "Tier attribute");
        assert.strictEqual(sentenceCase("secondsPerTurn"), "Seconds per turn");
        assert.strictEqual(sentenceCase("acme-hop-reach"), "Acme hop reach");
        assert.strictEqual(sentenceCase("maxIterations"), "Max iterations");
        assert.strictEqual(sentenceCase("x"), "X");
    });

    it("prefers the name the author wrote", () => {
        assert.strictEqual(displayName({ id: "acme-hop-reach" }), "Acme hop reach");
        assert.strictEqual(displayName({ id: "acme-hop-reach", name: "Hop reach" }), "Hop reach");
    });
});

describe("a throw from the author's own function", () => {
    const call = { id: "acme-confidence-share", member: "edge", subject: 'edge "17"', source: "run" as const };

    it("becomes E_EXTENSION_FAILED naming the extension, the function and the element", () => {
        const cause = new TypeError("Cannot read properties of undefined");
        const error = thrown(() =>
            callAuthor(call, () => {
                throw cause;
            }),
        );

        assert.strictEqual(error.code, "E_EXTENSION_FAILED");
        assert.strictEqual(
            error.message,
            'acme-confidence-share: edge() threw for edge "17" (TypeError: Cannot read properties of undefined).',
        );
        assert.strictEqual(error.cause, cause);
        assert.deepEqual(error.details, { extension: "acme-confidence-share", member: "edge", subject: 'edge "17"' });
    });

    it("keeps a GraphtyError unchanged, so the element's own refusals keep their code", () => {
        const own = new GraphtyError({ code: "E_OPTION_RANGE", message: "acme: no such attribute", source: "run" });
        const error = thrown(() =>
            callAuthor(call, () => {
                throw own;
            }),
        );

        assert.strictEqual(error, own);
    });

    it("returns what the function returned", () => {
        assert.strictEqual(
            callAuthor(call, () => 3),
            3,
        );
    });

    it("is wrapped the same way when the function is async", async () => {
        const error = await callAuthorAsync({ id: "acme-tiers", member: "place", source: "layout" }, () =>
            Promise.reject(new Error("no tiers")),
        ).catch((failure: unknown) => failure);

        assert.isTrue(isGraphtyError(error));
        assert.strictEqual((error as GraphtyError).code, "E_EXTENSION_FAILED");
        assert.strictEqual((error as GraphtyError).message, "acme-tiers: place() threw (Error: no tiers).");
        assert.strictEqual((error as GraphtyError).source, "layout");
        assert.strictEqual(await callAuthorAsync({ id: "acme-tiers", member: "place", source: "layout" }, () => 4), 4);
    });

    it("words a thrown non-Error too", () => {
        assert.strictEqual(
            extensionFailed({ id: "acme-x", member: "node", subject: "node 42", source: "run" }, "boom").message,
            "acme-x: node() threw for node 42 (boom).",
        );
    });
});

describe("the verbs on ./extend", () => {
    it("are published, with the order the view iterates in", () => {
        for (const name of ["defineAlgorithm", "defineLayout", "definePalette", "defineLogDestination"] as const) {
            assert.typeOf(extend[name], "function", name);
        }

        assert.typeOf(extend.compareNodeIds, "function");
    });
});
