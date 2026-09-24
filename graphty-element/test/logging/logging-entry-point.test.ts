/**
 * @file What `@graphty/graphty-element/logging` promises, and the four lists that have to agree
 * before it can keep the promise.
 *
 * The element's logging vocabulary used to be published from two addresses at once: the root
 * barrel and `./extend` both carried `GraphtyLogger`, `LogLevel`, `LogRecord` and a dozen more,
 * with nothing anywhere to say they were the same objects. Reaching them through the root cost a
 * 3D engine, because importing the root barrel defines the custom element. The subpath fixes
 * both: one address, no renderer.
 *
 * Adding a subpath means adding the same file name to four lists nothing checks against each
 * other -- `vite.config.ts` builds the JavaScript, `tsconfig.build.json` emits the types,
 * `typedoc.json` documents it and the repository root's `knip.config.ts` treats it as a door
 * dead-code analysis must not walk through. Get three of the four right and the failure is a
 * `dist/logging.js` with no `.d.ts` beside it, which nothing here notices and a consumer's
 * editor reports as "cannot find a declaration file" long after the release. So the lists are
 * held to each other here.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { assert, describe, it } from "vitest";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

/**
 * Every name `@graphty/graphty-element/logging` publishes.
 *
 * Written out rather than derived, because the point of the list is that a consumer can rely on
 * it: a name silently leaving the subpath is a break, and a name silently arriving is a surface
 * nobody decided to support.
 */
const LOGGING_NAMES = [
    "clearLoggingConfig",
    "configureLogging",
    "createConsoleSink",
    "createRemoteSink",
    "formatLogRecord",
    "getLoggingConfig",
    "GraphtyLogger",
    "isModuleEnabled",
    "lazy",
    "loadLoggingConfig",
    "LOG_LEVEL_NAMES",
    "LOG_LEVEL_TO_NAME",
    "LogLevel",
    "parseLoggingURLParams",
    "parseLogLevel",
    "resetLoggingConfig",
    "saveLoggingConfig",
] as const;

/** The manifest, as published. */
interface Manifest {
    exports: Record<string, string | Record<string, string>>;
}

const manifest = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "package.json"), "utf8")) as Manifest;

/**
 * Read one file into a syntax tree.
 * @param file - The file, relative to the repository root.
 * @returns The parsed source file.
 */
function parse(file: string): ts.SourceFile {
    const path = resolve(REPO_ROOT, file);

    return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true);
}

/**
 * Every name one entry-point file re-exports by name.
 *
 * `export * from "..."` carries no names of its own, so a file that only forwards a barrel
 * answers with an empty list. That is what makes this usable as a "does NOT publish" check: the
 * root barrel names every one of its exports explicitly.
 * @param file - The entry file, relative to the package root.
 * @returns The names, as a consumer would see them.
 */
function namesExportedFrom(file: string): string[] {
    const names: string[] = [];
    for (const statement of parse(`graphty-element/${file}`).statements) {
        if (!ts.isExportDeclaration(statement)) {
            continue;
        }

        const clause = statement.exportClause;
        if (clause !== undefined && ts.isNamedExports(clause)) {
            names.push(...clause.elements.map((element) => element.name.text));
        }
    }

    return names;
}

/**
 * Every module one entry-point file re-exports from, by its specifier.
 *
 * A "does not publish this" check written as a list of names cannot see a type. `export type
 * { Sink } from "./src/logging/types"` publishes a name a consumer imports, and that name never
 * exists at run time to be compared against anything. Reading the specifiers instead catches the
 * type re-exports and the value re-exports in one pass, and says something more durable than a
 * name list does: that a whole directory is reached through exactly one door.
 * @param file - The entry file, relative to the package root.
 * @returns The module specifiers, in source order.
 */
function reExportedModulesOf(file: string): string[] {
    const specifiers: string[] = [];
    for (const statement of parse(`graphty-element/${file}`).statements) {
        if (!ts.isExportDeclaration(statement)) {
            continue;
        }

        const { moduleSpecifier } = statement;
        if (moduleSpecifier !== undefined && ts.isStringLiteral(moduleSpecifier)) {
            specifiers.push(moduleSpecifier.text);
        }
    }

    return specifiers;
}

/**
 * The string literals inside one named array or object literal in a config file.
 *
 * Parsed rather than imported, because three of the four lists live in files that read
 * `__dirname` or declare Node-only types and would drag a Node-only program into a DOM-typed
 * one.
 * @param file - The config file, relative to the repository root.
 * @param name - The declaration to read: `entries` in the Vite config, and so on.
 * @returns Every string literal the declaration holds, in source order.
 */
function literalsIn(file: string, name: string): string[] {
    const found: string[] = [];
    /**
     * Walk one node, collecting string literals once the named declaration is entered.
     * @param node - The node to walk.
     * @param inside - Whether the walk is already inside the named declaration.
     */
    function walk(node: ts.Node, inside: boolean): void {
        let within = inside;
        if (!within) {
            const named =
                (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) ||
                (ts.isPropertyAssignment(node) && node.name.getText().replace(/"/g, "") === name);
            within = named;
        }

        if (within && ts.isStringLiteral(node)) {
            found.push(node.text);
        }

        ts.forEachChild(node, (child) => {
            walk(child, within);
        });
    }

    walk(parse(file), false);

    return found;
}

/**
 * Keep only the package-root entry files out of a list that also names directories and globs.
 * @param values - The raw strings a list holds.
 * @returns The entry file names, without a leading `./`, sorted.
 */
function entryFiles(values: readonly string[]): string[] {
    return [...new Set(values.map((value) => value.replace(/^\.\//, "")).filter((value) => /^[a-z-]+\.ts$/.test(value)))].sort();
}

/**
 * Every TypeScript file under one directory, recursively.
 * @param dir - The directory, absolute.
 * @returns The files, absolute.
 */
function sourceFilesUnder(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) {
            return sourceFilesUnder(path);
        }

        return entry.name.endsWith(".ts") ? [path] : [];
    });
}

/**
 * Every Markdown and MDX file the package ships or renders, recursively.
 *
 * Storybook's docs pages and the VitePress guide are both read by a consumer deciding how to
 * import something, so both count. `node_modules`, the build output and scratch directories do
 * not.
 * @param dir - The directory, absolute.
 * @returns The files, absolute.
 */
function proseFilesUnder(dir: string): string[] {
    const skip = new Set(["node_modules", "dist", "tmp", ".nx", "storybook-static", "coverage"]);

    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) {
            return skip.has(entry.name) || entry.name.startsWith(".") ? [] : proseFilesUnder(path);
        }

        return /\.mdx?$/.test(entry.name) ? [path] : [];
    });
}

describe("the ./logging entry point", () => {
    it("loads and answers, with nothing built and no element defined", async () => {
        const logging = await import("../../logging");

        assert.typeOf(logging.GraphtyLogger.getLogger, "function");
        assert.typeOf(logging.getLoggingConfig(), "object");
    });

    it("pulls in no renderer, no component framework and no LLM runtime", () => {
        // This is the subpath's headline claim: a log destination works in a worker, a build
        // step or a test with no page around it. The realistic way it breaks is somebody adding
        // an import to a file under src/logging/, so that is what is checked here, directly.
        // The deeper question -- what the modules those files import in turn reach -- is
        // answered for every entry point at once by test/packaging/node-safe-entries.test.ts.
        const forbidden = [/from "@babylonjs/, /from "lit/, /from "@lit\//, /from "@mlc-ai\//];
        const offenders: string[] = [];

        for (const file of sourceFilesUnder(resolve(PACKAGE_ROOT, "src/logging"))) {
            const source = readFileSync(file, "utf8");
            if (forbidden.some((pattern) => pattern.test(source))) {
                offenders.push(file.replace(PACKAGE_ROOT, ""));
            }
        }

        assert.deepEqual(offenders, []);
    });

    it("carries the whole logging vocabulary, lazy included", async () => {
        const logging = await import("../../logging");

        for (const name of LOGGING_NAMES) {
            assert.property(logging, name, `./logging should publish ${name}`);
        }
    });

    it("publishes each of those names from exactly one address, so the root barrel carries none", () => {
        const barrel = namesExportedFrom("index.ts");

        assert.deepEqual(
            LOGGING_NAMES.filter((name) => barrel.includes(name)),
            [],
            "these names are published from ./logging; the root barrel must not publish them too",
        );
    });

    it("is the only door onto the logging directory, so ./extend does not carry the vocabulary as well", () => {
        // The root barrel was one of the two addresses; `./extend` was the other, and checking
        // only the barrel leaves half the defect standing. `./extend` keeps the verb that
        // registers a destination under a name -- `registerLogSink`, `LogSinkDescriptor`,
        // `LogSinkId`, `KNOWN_LOG_SINK_IDS`, `registeredLogSinkDescriptors` -- and all of those
        // live in `src/catalog/`, not in `src/logging/`. So the rule is a clean one: the
        // registration surface may reach the catalogue, and the vocabulary a destination is
        // written against is published here and nowhere else.
        assert.deepEqual(
            reExportedModulesOf("extend.ts").filter((specifier) => specifier.startsWith("./src/logging/")),
            [],
            "./extend re-exports the logging vocabulary; ./logging is the one address for it",
        );
    });

    it("is the address the package's own prose tells a reader to use", () => {
        // A name leaving the root barrel breaks every documented import line that named it, and
        // the break is invisible from here: prose is not compiled, not linted and not resolved,
        // so a code block telling a reader `import { GraphtyLogger } from
        // "@graphty/graphty-element"` keeps rendering in Storybook long after that import stops
        // resolving. That is what happened to stories/Logging.mdx, which went on offering four
        // such lines after the move. Anyone who follows one gets "has no exported member".
        const offenders: string[] = [];

        for (const file of proseFilesUnder(PACKAGE_ROOT)) {
            readFileSync(file, "utf8")
                .split("\n")
                .forEach((line, index) => {
                    const match = /^\s*import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@graphty\/graphty-element"/.exec(line);
                    if (match === null) {
                        return;
                    }

                    const named = match[1]
                        .split(",")
                        .map((name) => name.replace(/\btype\b/, "").trim().split(/\s+as\s+/)[0].trim())
                        .filter((name) => name.length > 0);
                    const fromLogging = named.filter((name) => (LOGGING_NAMES as readonly string[]).includes(name));

                    if (fromLogging.length > 0) {
                        offenders.push(`${file.replace(PACKAGE_ROOT, "")}:${index + 1} imports ${fromLogging.join(", ")}`);
                    }
                });
        }

        assert.deepEqual(offenders, [], "these lines import a logging name from the root barrel, which no longer publishes any");
    });

    it("is in the exports map, with a types condition beside the import condition", () => {
        assert.deepEqual(manifest.exports["./logging"], {
            types: "./dist/logging.d.ts",
            import: "./dist/logging.js",
        });
    });
});

describe("the lists that decide what a subpath actually ships", () => {
    const build = entryFiles(literalsIn("graphty-element/vite.config.ts", "entries"));
    const types = entryFiles(literalsIn("graphty-element/tsconfig.build.json", "include"));
    const docs = entryFiles(literalsIn("graphty-element/typedoc.json", "entryPoints"));
    const knip = entryFiles(literalsIn("knip.config.ts", "graphty-element"));

    it("names the same entry files in the build, the type emit, the docs and the dead-code analysis", () => {
        assert.deepEqual(types, build, "tsconfig.build.json's include disagrees with vite.config.ts's entries");
        assert.deepEqual(docs, build, "typedoc.json's entryPoints disagrees with vite.config.ts's entries");
        assert.deepEqual(knip, build, "knip.config.ts's graphty-element entry list disagrees with vite.config.ts's entries");
    });

    it("names logging.ts in all four, because a subpath with no .d.ts fails in a consumer's editor", () => {
        for (const [what, list] of [["build", build], ["types", types], ["docs", docs], ["knip", knip]] as const) {
            assert.include(list, "logging.ts", `logging.ts is missing from the ${what} list`);
        }
    });
});
