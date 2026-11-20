import { assert, describe, it } from "vitest";

import { checkPeerExports, classifyPeerLoadError, isPeerMissing } from "../../src/acceleration/peerLoad";
import { isGraphtyError } from "../../src/errors";

const PEER = "@graphty/webgpu-graph-algorithms";

/**
 * An error with a `code`, the way webpack and Node build theirs.
 * @param message - The message.
 * @param code - The code.
 * @returns The error.
 */
function coded(message: string, code: string): Error {
    return Object.assign(new Error(message), { code });
}

/**
 * Every recorded way "the package is not installed" reaches the loader's `catch`. Captured from
 * a consumer app built with each toolchain against a packed graphty-element, 2026-10-22, except
 * Firefox and Safari, which are those browsers' documented wording for the same case. A bundler
 * that rewords its error fails here first, rather than turning a missing package into a loud
 * `E_ACCELERATOR_FAILED` on a consumer's page.
 */
const MISSING: readonly [string, unknown][] = [
    [
        "Vite 8 dev placeholder",
        new Error(`Could not resolve "${PEER}" imported by "@graphty/graphty-element". Is it installed?`),
    ],
    [
        "Vite 8 build placeholder",
        new Error(`Could not resolve "${PEER}/browser" imported by "@graphty/graphty-element"`),
    ],
    ["webpack 5", coded(`Cannot find module '${PEER}'`, "MODULE_NOT_FOUND")],
    [
        "Node ESM (esbuild, Rollup output)",
        coded(`Cannot find package '${PEER}' imported from /app/dist/main.js`, "ERR_MODULE_NOT_FOUND"),
    ],
    [
        "Chromium, no import map",
        new TypeError(
            `Failed to resolve module specifier "${PEER}". Relative references must start with either "/", "./", or "../".`,
        ),
    ],
    [
        "Firefox, no import map",
        new TypeError(
            `The specifier “${PEER}/browser” was a bare specifier, but was not remapped to anything. Relative module specifiers must start with “./”, “../” or “/”.`,
        ),
    ],
    ["Safari, no import map", new TypeError(`Module name, '${PEER}' does not resolve to a valid URL.`)],
];

/** Load errors that are NOT "not installed", and must be reported loudly. */
const BROKEN: readonly [string, unknown][] = [
    ["a throw while the module evaluates", new Error("boom from the GPU package")],
    ["a syntax error in the module", new SyntaxError("Unexpected token '<'")],
    [
        "an import-map URL that does not answer",
        new TypeError("Failed to fetch dynamically imported module: https://cdn/x.js"),
    ],
    ["some other package is missing", coded("Cannot find module 'some-other-package'", "MODULE_NOT_FOUND")],
    ["webpack's wording without webpack's code", new Error(`Cannot find module '${PEER}'`)],
    ["a package with a similar name", new Error(`Could not resolve "${PEER}-extra" imported by "x"`)],
    [
        "a subpath the package does not export",
        coded(`Package subpath './browser' is not defined by "exports" in ${PEER}`, "ERR_PACKAGE_PATH_NOT_EXPORTED"),
    ],
    ["a thrown string", "not an error"],
];

describe("classifyPeerLoadError", () => {
    it.each(MISSING)("%s is E_MISSING_PACKAGE naming the package", (_, error) => {
        assert.isTrue(isPeerMissing(error));
        const classified = classifyPeerLoadError(error);

        assert.strictEqual(classified.code, "E_MISSING_PACKAGE");
        assert.strictEqual(classified.details.package, PEER);
        assert.strictEqual(classified.cause, error);
    });

    it.each(BROKEN)("%s is E_ACCELERATOR_FAILED with the original as cause", (_, error) => {
        assert.isFalse(isPeerMissing(error));
        const classified = classifyPeerLoadError(error);

        assert.strictEqual(classified.code, "E_ACCELERATOR_FAILED");
        assert.strictEqual(classified.details.package, PEER);
        assert.strictEqual(classified.cause, error);
    });
});

describe("checkPeerExports", () => {
    const acquireAccelerator = (): null => null;

    it("reads the two exports the element calls", () => {
        const peer = checkPeerExports({ EXACT_MAX_NODES: 32768 }, { acquireAccelerator });

        assert.strictEqual(peer.root.EXACT_MAX_NODES, 32768);
        assert.strictEqual(peer.acquireAccelerator, acquireAccelerator);
    });

    it("also finds them under a nested default, which a Vite dev server has produced", () => {
        const peer = checkPeerExports({ default: { EXACT_MAX_NODES: 7 } }, { default: { acquireAccelerator } });

        assert.strictEqual(peer.root.EXACT_MAX_NODES, 7);
    });

    it("refuses an empty module (a bundler alias to false) as E_ACCELERATOR_INCOMPATIBLE, naming what is missing", () => {
        let failure: unknown;
        try {
            checkPeerExports({}, {});
        } catch (error) {
            failure = error;
        }

        assert.isTrue(isGraphtyError(failure));
        if (isGraphtyError(failure)) {
            assert.strictEqual(failure.code, "E_ACCELERATOR_INCOMPATIBLE");
            assert.deepEqual(failure.details.missing, ["EXACT_MAX_NODES", "acquireAccelerator"]);
            assert.strictEqual(failure.details.package, PEER);
        }
    });
});
