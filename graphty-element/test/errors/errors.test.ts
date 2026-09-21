import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import {
    ACCELERATION_ERROR_CODES,
    GRAPHTY_ERROR_CODES,
    type GraphtyErrorCode,
    isGraphtyErrorCode,
} from "../../src/errors/codes";
import { GraphtyError, isGraphtyError } from "../../src/errors/GraphtyError";
import * as errors from "../../src/errors/index";

// The codes named by the API design, section 4.13 plus the acceleration state code from 4.12.
// Duplicated here on purpose: the union and this list drifting apart is the thing the test is
// for.
const CODES_FROM_THE_DESIGN = [
    "E_BAD_COMMAND",
    "E_BAD_QUERY",
    "E_BAD_LAYER",
    "E_BAD_SELECTOR",
    "E_BAD_FORMULA",
    "E_SELECTOR_EMPTY",
    "E_UNSCOPED_RUN_ENCODING",
    "E_UNKNOWN_SCALE",
    "E_UNKNOWN_CHANNEL",
    "E_UNKNOWN_OPTION",
    "E_OPTION_RANGE",
    "E_UNKNOWN_ATTRIBUTE",
    "E_UNKNOWN_ALGORITHM",
    "E_UNKNOWN_LAYOUT",
    "E_UNKNOWN_FORMAT",
    "E_UNKNOWN_RUN",
    "E_UNSTABLE_RUN_ID",
    "E_DUPLICATE_ID",
    "E_DUPLICATE_PLUGIN",
    "E_PROTECTED",
    "E_FETCH_FAILED",
    "E_PARSE_FAILED",
    "E_EDGE_ENDPOINTS_UNRESOLVED",
    "E_ID_MISSING",
    "E_TOO_LARGE",
    "E_OUT_OF_MEMORY",
    "E_CAP_EXCEEDED",
    "E_SCOPE_EMPTY",
    "E_NO_ACCELERATOR",
    "E_NO_WEBGPU",
    "E_NO_ADAPTER",
    "E_SOFTWARE_ONLY",
    "E_DEVICE_LOST",
    "E_NO_WEBGL",
    "E_UNSUPPORTED",
    "E_READONLY",
    "E_DISPOSED",
    "E_INTERNAL",
];

/**
 * Buckets every code. The `never` in the default branch is the compile-time proof that the
 * union is exhaustively switchable: adding a code without adding it here fails to type-check.
 */
function bucketOf(code: GraphtyErrorCode): string {
    switch (code) {
        case "E_BAD_COMMAND":
        case "E_BAD_QUERY":
        case "E_BAD_LAYER":
        case "E_BAD_SELECTOR":
        case "E_BAD_FORMULA":
        case "E_SELECTOR_EMPTY":
        case "E_UNSCOPED_RUN_ENCODING":
        case "E_OPTION_RANGE":
            return "malformed";
        case "E_UNKNOWN_SCALE":
        case "E_UNKNOWN_CHANNEL":
        case "E_UNKNOWN_OPTION":
        case "E_UNKNOWN_ATTRIBUTE":
        case "E_UNKNOWN_ALGORITHM":
        case "E_UNKNOWN_LAYOUT":
        case "E_UNKNOWN_FORMAT":
        case "E_UNKNOWN_RUN":
            return "unknown-name";
        case "E_UNSTABLE_RUN_ID":
        case "E_DUPLICATE_ID":
        case "E_DUPLICATE_PLUGIN":
        case "E_PROTECTED":
        case "E_READONLY":
        case "E_DISPOSED":
            return "identity";
        case "E_FETCH_FAILED":
        case "E_PARSE_FAILED":
        case "E_EDGE_ENDPOINTS_UNRESOLVED":
        case "E_ID_MISSING":
            return "import";
        case "E_TOO_LARGE":
        case "E_OUT_OF_MEMORY":
        case "E_CAP_EXCEEDED":
        case "E_SCOPE_EMPTY":
            return "size";
        case "E_NO_ACCELERATOR":
        case "E_NO_WEBGPU":
        case "E_NO_ADAPTER":
        case "E_SOFTWARE_ONLY":
        case "E_DEVICE_LOST":
        case "E_NO_WEBGL":
            return "hardware";
        case "E_UNSUPPORTED":
        case "E_INTERNAL":
            return "refused";
        default: {
            const unreachable: never = code;
            return unreachable;
        }
    }
}

describe("GraphtyErrorCode", () => {
    it("names every code the API design names, and no others", () => {
        assert.deepStrictEqual([...GRAPHTY_ERROR_CODES].sort(), [...CODES_FROM_THE_DESIGN].sort());
    });

    it("has no duplicates", () => {
        assert.strictEqual(new Set(GRAPHTY_ERROR_CODES).size, GRAPHTY_ERROR_CODES.length);
    });

    it("uses the E_SCREAMING_SNAKE convention throughout", () => {
        for (const code of GRAPHTY_ERROR_CODES) {
            assert.match(code, /^E_[A-Z][A-Z_]*$/);
        }
    });

    it("does not define E_NOT_READY, which the design bans", () => {
        assert.notInclude(GRAPHTY_ERROR_CODES, "E_NOT_READY");
    });

    it("is exhaustively switchable", () => {
        for (const code of GRAPHTY_ERROR_CODES) {
            assert.notStrictEqual(bucketOf(code), "");
        }
    });

    it("is frozen", () => {
        assert.isTrue(Object.isFrozen(GRAPHTY_ERROR_CODES));
    });
});

describe("isGraphtyErrorCode", () => {
    it("accepts every published code", () => {
        for (const code of GRAPHTY_ERROR_CODES) {
            assert.isTrue(isGraphtyErrorCode(code));
        }
    });

    it("rejects a code the element does not define", () => {
        assert.isFalse(isGraphtyErrorCode("E_NOT_READY"));
        assert.isFalse(isGraphtyErrorCode("E_SOMETHING_INVENTED"));
    });

    it("rejects non-strings and inherited property names", () => {
        assert.isFalse(isGraphtyErrorCode(undefined));
        assert.isFalse(isGraphtyErrorCode(null));
        assert.isFalse(isGraphtyErrorCode(7));
        assert.isFalse(isGraphtyErrorCode({ code: "E_INTERNAL" }));
        assert.isFalse(isGraphtyErrorCode("toString"));
        assert.isFalse(isGraphtyErrorCode("constructor"));
    });
});

describe("ACCELERATION_ERROR_CODES", () => {
    it("is the five codes capabilities.acceleration can report", () => {
        assert.deepStrictEqual(
            [...ACCELERATION_ERROR_CODES],
            ["E_NO_WEBGPU", "E_NO_ADAPTER", "E_SOFTWARE_ONLY", "E_DEVICE_LOST", "E_TOO_LARGE"],
        );
    });

    it("is a subset of the whole code list", () => {
        for (const code of ACCELERATION_ERROR_CODES) {
            assert.include(GRAPHTY_ERROR_CODES, code);
        }
    });

    it("is frozen", () => {
        assert.isTrue(Object.isFrozen(ACCELERATION_ERROR_CODES));
    });
});

describe("GraphtyError", () => {
    it("is an Error with a name", () => {
        const err = new GraphtyError({ code: "E_INTERNAL", message: "boom", source: "run" });

        assert.instanceOf(err, Error);
        assert.instanceOf(err, GraphtyError);
        assert.strictEqual(err.name, "GraphtyError");
        assert.strictEqual(err.message, "boom");
        assert.strictEqual(typeof err.stack, "string");
    });

    it("carries the code, the source and the details", () => {
        const err = new GraphtyError({
            code: "E_UNKNOWN_LAYOUT",
            message: "No layout named 'frce'.",
            source: "layout",
            details: { requested: "frce", available: ["force", "circular"] },
        });

        assert.strictEqual(err.code, "E_UNKNOWN_LAYOUT");
        assert.strictEqual(err.source, "layout");
        assert.deepStrictEqual(err.details, { requested: "frce", available: ["force", "circular"] });
    });

    it("defaults recoverable to false and details to an empty frozen bag", () => {
        const err = new GraphtyError({ code: "E_BAD_COMMAND", message: "bad", source: "config" });

        assert.isFalse(err.recoverable);
        assert.deepStrictEqual(err.details, {});
        assert.isTrue(Object.isFrozen(err.details));
        assert.isUndefined(err.target);
        assert.isUndefined(err.cause);
    });

    it("copies and freezes the details it was handed", () => {
        const handed = { cap: 10 };
        const err = new GraphtyError({ code: "E_CAP_EXCEEDED", message: "too big", source: "run", details: handed });

        handed.cap = 99;

        assert.deepStrictEqual(err.details, { cap: 10 });
        assert.isTrue(Object.isFrozen(err.details));
    });

    it("records recoverable when the thrower says so", () => {
        const err = new GraphtyError({
            code: "E_FETCH_FAILED",
            message: "timed out",
            source: "data",
            recoverable: true,
        });

        assert.isTrue(err.recoverable);
    });

    it("lands on the run, layer or scope that caused it", () => {
        const onLayer = new GraphtyError({
            code: "E_PROTECTED",
            message: "locked",
            source: "style",
            target: { kind: "layer", id: "base" },
        });
        const onRun = new GraphtyError({
            code: "E_CAP_EXCEEDED",
            message: "too big",
            source: "run",
            target: { kind: "run", id: "betweenness_1" },
        });

        assert.deepStrictEqual(onLayer.target, { kind: "layer", id: "base" });
        assert.deepStrictEqual(onRun.target, { kind: "run", id: "betweenness_1" });
    });

    it("keeps the original failure as cause", () => {
        const original = new Error("socket hang up");
        const err = new GraphtyError({
            code: "E_FETCH_FAILED",
            message: "could not fetch graph.csv",
            source: "data",
            cause: original,
        });

        assert.strictEqual(err.cause, original);
    });

    it("does not install a cause property when none was given", () => {
        const err = new GraphtyError({ code: "E_INTERNAL", message: "boom", source: "run" });

        assert.isFalse("cause" in err);
    });

    it("survives a subclass without losing instanceof", () => {
        class SpecificError extends GraphtyError {}

        const err = new SpecificError({ code: "E_DISPOSED", message: "gone", source: "config" });

        assert.instanceOf(err, SpecificError);
        assert.instanceOf(err, GraphtyError);
        assert.instanceOf(err, Error);
        assert.isTrue(isGraphtyError(err));
    });
});

describe("GraphtyError across an async boundary", () => {
    it("keeps its code through a rejected promise", async () => {
        const failing = async (): Promise<never> => {
            await Promise.resolve();
            throw new GraphtyError({
                code: "E_SCOPE_EMPTY",
                message: "nothing selected",
                source: "run",
                details: { scope: "selection" },
            });
        };

        const rejection = await failing().catch((err: unknown) => err);
        assert.instanceOf(rejection, GraphtyError);

        try {
            await failing();
            assert.fail("should have thrown");
        } catch (err) {
            assert.isTrue(isGraphtyError(err));
            if (isGraphtyError(err)) {
                assert.strictEqual(err.code, "E_SCOPE_EMPTY");
                assert.strictEqual(err.details.scope, "selection");
                assert.strictEqual(err.name, "GraphtyError");
            }
        }
    });

    it("keeps its code through several awaits and a re-throw", async () => {
        const inner = async (): Promise<never> => {
            await Promise.resolve();
            throw new GraphtyError({ code: "E_DEVICE_LOST", message: "lost", source: "acceleration" });
        };
        const outer = async (): Promise<never> => {
            await Promise.resolve();
            return inner();
        };

        const caught: unknown = await outer().catch((err: unknown) => err);

        assert.isTrue(isGraphtyError(caught));
        assert.strictEqual(isGraphtyError(caught) ? caught.code : "", "E_DEVICE_LOST");
    });
});

describe("GraphtyError.wrap", () => {
    it("returns an existing GraphtyError untouched, so the specific code survives", () => {
        const original = new GraphtyError({ code: "E_PARSE_FAILED", message: "line 4", source: "data" });
        const wrapped = GraphtyError.wrap(original, { code: "E_INTERNAL", source: "run" });

        assert.strictEqual(wrapped, original);
        assert.strictEqual(wrapped.code, "E_PARSE_FAILED");
    });

    it("adopts a sibling's code when the element publishes the same one", () => {
        const sibling = Object.assign(new Error("no adapter"), { code: "E_NO_ADAPTER" });
        const wrapped = GraphtyError.wrap(sibling, { code: "E_INTERNAL", source: "acceleration" });

        assert.strictEqual(wrapped.code, "E_NO_ADAPTER");
        assert.strictEqual(wrapped.source, "acceleration");
        assert.strictEqual(wrapped.cause, sibling);
        assert.strictEqual(wrapped.message, "no adapter");
    });

    it("keeps a foreign code in details and falls back to the caller's code", () => {
        const sibling = Object.assign(new Error("bad gexf"), { code: "E_SIBLING_ONLY" });
        const wrapped = GraphtyError.wrap(sibling, {
            code: "E_PARSE_FAILED",
            source: "data",
            details: { format: "gexf" },
        });

        assert.strictEqual(wrapped.code, "E_PARSE_FAILED");
        assert.deepStrictEqual(wrapped.details, { format: "gexf", sourceCode: "E_SIBLING_ONLY" });
    });

    it("uses the caller's message when one is given", () => {
        const wrapped = GraphtyError.wrap(new Error("ENOENT"), {
            code: "E_FETCH_FAILED",
            source: "data",
            message: "could not read graph.csv",
            recoverable: true,
        });

        assert.strictEqual(wrapped.message, "could not read graph.csv");
        assert.isTrue(wrapped.recoverable);
    });

    it("wraps a thrown non-Error", () => {
        const wrapped = GraphtyError.wrap("just a string", { code: "E_INTERNAL", source: "run" });

        assert.strictEqual(wrapped.code, "E_INTERNAL");
        assert.strictEqual(wrapped.message, "just a string");
        assert.strictEqual(wrapped.cause, "just a string");
    });

    it("wraps null without reading a code off it", () => {
        const wrapped = GraphtyError.wrap(null, { code: "E_INTERNAL", source: "run" });

        assert.strictEqual(wrapped.code, "E_INTERNAL");
        assert.strictEqual(wrapped.message, "null");
        assert.deepStrictEqual(wrapped.details, {});
    });

    it("ignores a non-string code on the wrapped value", () => {
        const sibling = Object.assign(new Error("odd"), { code: 42 });
        const wrapped = GraphtyError.wrap(sibling, { code: "E_INTERNAL", source: "run" });

        assert.strictEqual(wrapped.code, "E_INTERNAL");
        assert.deepStrictEqual(wrapped.details, {});
    });

    it("carries the target through", () => {
        const wrapped = GraphtyError.wrap(new Error("x"), {
            code: "E_INTERNAL",
            source: "style",
            target: { kind: "layer", id: "louvain" },
        });

        assert.deepStrictEqual(wrapped.target, { kind: "layer", id: "louvain" });
    });
});

describe("GraphtyError.toJSON", () => {
    it("renders the parts a log or a worker message needs", () => {
        const err = new GraphtyError({
            code: "E_CAP_EXCEEDED",
            message: "too expensive",
            source: "run",
            recoverable: false,
            details: { estimate: 90, cap: 10 },
            target: { kind: "run", id: "betweenness_1" },
            cause: new Error("underlying"),
        });

        assert.deepStrictEqual(err.toJSON(), {
            name: "GraphtyError",
            code: "E_CAP_EXCEEDED",
            message: "too expensive",
            source: "run",
            recoverable: false,
            details: { estimate: 90, cap: 10 },
            target: { kind: "run", id: "betweenness_1" },
            causeMessage: "underlying",
        });
    });

    it("omits the target and the cause when there are none", () => {
        const err = new GraphtyError({ code: "E_DISPOSED", message: "gone", source: "config" });

        assert.deepStrictEqual(err.toJSON(), {
            name: "GraphtyError",
            code: "E_DISPOSED",
            message: "gone",
            source: "config",
            recoverable: false,
            details: {},
        });
    });

    it("round-trips through JSON.stringify", () => {
        const err = new GraphtyError({ code: "E_ID_MISSING", message: "row 3 has no id", source: "data" });
        const parsed: unknown = JSON.parse(JSON.stringify(err));

        assert.deepStrictEqual(parsed, {
            name: "GraphtyError",
            code: "E_ID_MISSING",
            message: "row 3 has no id",
            source: "data",
            recoverable: false,
            details: {},
        });
    });
});

describe("isGraphtyError", () => {
    it("accepts a GraphtyError", () => {
        assert.isTrue(isGraphtyError(new GraphtyError({ code: "E_INTERNAL", message: "x", source: "run" })));
    });

    it("rejects anything else", () => {
        assert.isFalse(isGraphtyError(new Error("x")));
        assert.isFalse(isGraphtyError(new TypeError("x")));
        assert.isFalse(isGraphtyError({ code: "E_INTERNAL", message: "x" }));
        assert.isFalse(isGraphtyError("E_INTERNAL"));
        assert.isFalse(isGraphtyError(null));
        assert.isFalse(isGraphtyError(undefined));
    });
});

describe("the errors barrel", () => {
    it("publishes the whole error model from one place", () => {
        assert.strictEqual(errors.GraphtyError, GraphtyError);
        assert.strictEqual(errors.isGraphtyError, isGraphtyError);
        assert.strictEqual(errors.isGraphtyErrorCode, isGraphtyErrorCode);
        assert.strictEqual(errors.GRAPHTY_ERROR_CODES, GRAPHTY_ERROR_CODES);
        assert.strictEqual(errors.ACCELERATION_ERROR_CODES, ACCELERATION_ERROR_CODES);
    });

    it("exports nothing else at runtime, so the surface is the documented one", () => {
        assert.deepStrictEqual(Object.keys(errors).sort(), [
            "ACCELERATION_ERROR_CODES",
            "GRAPHTY_ERROR_CODES",
            "GraphtyError",
            "isGraphtyError",
            "isGraphtyErrorCode",
        ]);
    });
});

describe("the error module stays Node-safe", () => {
    const here = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "errors");
    const sources = ["codes.ts", "GraphtyError.ts", "index.ts"];

    it("imports nothing but its own siblings", () => {
        for (const file of sources) {
            const text = readFileSync(path.join(here, file), "utf8");
            const specifiers = [...text.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);

            for (const specifier of specifiers) {
                assert.match(specifier, /^\.\/(codes|GraphtyError)$/);
            }
        }
    });

    it("names no renderer, component framework or DOM global", () => {
        const banned = [/babylon/i, /\blit\b/i, /\bdocument\b/, /\bwindow\b/, /\bnavigator\./, /HTMLElement/];

        for (const file of sources) {
            const text = readFileSync(path.join(here, file), "utf8");
            const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

            for (const pattern of banned) {
                assert.notMatch(code, pattern);
            }
        }
    });
});
