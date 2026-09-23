import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { assert, describe, it } from "vitest";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * The entry points that must resolve with no renderer anywhere in their import graph, per the
 * table in design/element-api/element-api-design.md section 6.1.
 */
const NODE_SAFE_ENTRIES = [
    "session.ts",
    "schema.ts",
    "catalog.ts",
    "commands.ts",
    "extend.ts",
    "format.ts",
    "logging.ts",
    "react.ts",
];

/** What must never appear in a Node-safe entry point's import graph. */
const FORBIDDEN = [/^@babylonjs($|\/)/, /^lit($|\/)/, /^@lit($|\/)/, /^@mlc-ai($|\/)/];

/** The emitted JavaScript of one source file, keyed by absolute path. */
const transpiled = new Map<string, string>();

/**
 * Transpile one TypeScript file to JavaScript, which is what erases the type-only imports.
 *
 * A file that writes `import { Graph } from "../Graph"` and then names `Graph` only in a type
 * annotation does not import anything at run time: the emitter drops the whole statement. Any
 * check that reads the TypeScript source instead of its output reports dependencies that do not
 * exist, which is how a Node-safe entry point gets accused of dragging in a 3D engine it never
 * touches.
 */
function emit(file: string): string {
    const cached = transpiled.get(file);
    if (cached !== undefined) {
        return cached;
    }

    const output = ts.transpileModule(readFileSync(file, "utf8"), {
        fileName: file,
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            isolatedModules: true,
        },
    }).outputText;
    transpiled.set(file, output);

    return output;
}

/**
 * Resolve one relative specifier the way the bundler does.
 * @param specifier - The specifier as written, which may carry a `.js` extension a TypeScript
 *   file wrote for a `.ts` sibling.
 * @param importer - The absolute path of the file the specifier was written in.
 * @returns The absolute path of the file it names, or null when nothing on disk answers.
 */
function resolveRelative(specifier: string, importer: string): string | null {
    const base = resolve(dirname(importer), specifier);
    const candidates = [
        `${base  }.ts`,
        `${base  }.tsx`,
        join(base, "index.ts"),
        base.replace(/\.js$/, ".ts"),
        join(base.replace(/\.js$/, ""), "index.ts"),
        base,
    ];

    return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

/** One package this entry point pulls in, and the shortest chain of files that reaches it. */
interface Reached {
    specifier: string;
    chain: readonly string[];
}

/**
 * Walk everything one entry point imports at run time.
 * @param entry - The entry file, relative to the package root.
 * @returns One entry per bare specifier PER IMPORTING FILE, each with the chain that reaches it.
 *   Every importer, not the first one found: "this package arrives here and nowhere else" is a
 *   thing a case wants to assert, and a walk that kept one importer per specifier could not tell
 *   the difference between one door and three.
 */
function importGraph(entry: string): Reached[] {
    const start = resolve(PACKAGE_ROOT, entry);
    const parent = new Map<string, string | null>([[start, null]]);
    const queue = [start];
    const reached = new Map<string, string[]>();

    while (queue.length > 0) {
        const file = queue.shift();
        if (file === undefined) {
            break;
        }

        for (const specifier of ts.preProcessFile(emit(file), true, true).importedFiles.map((found) => found.fileName)) {
            if (specifier.startsWith(".")) {
                const next = resolveRelative(specifier, file);
                if (next !== null && !parent.has(next)) {
                    parent.set(next, file);
                    queue.push(next);
                }
            } else {
                const importers = reached.get(specifier);

                if (importers === undefined) {
                    reached.set(specifier, [file]);
                } else if (!importers.includes(file)) {
                    importers.push(file);
                }
            }
        }
    }

    /**
     * The chain of files from the entry point to one importer, for a failure message that says
     * which file to look at rather than only which package arrived.
     * @param file - The file that imported the package.
     * @returns The chain, entry point first, as package-relative paths.
     */
    function chainTo(file: string): string[] {
        const chain: string[] = [];
        for (let step: string | null | undefined = file; step !== null && step !== undefined; step = parent.get(step)) {
            chain.push(step.replace(PACKAGE_ROOT, ""));
        }

        return chain.reverse();
    }

    return [...reached.entries()].flatMap(([specifier, importers]) =>
        importers.map((importer) => ({ specifier, chain: chainTo(importer) })),
    );
}

describe("the Node-safe entry points", () => {
    it.each(NODE_SAFE_ENTRIES)("%s reaches no renderer, no component framework and no LLM runtime", (entry) => {
        const offenders = importGraph(entry).filter((found) => FORBIDDEN.some((pattern) => pattern.test(found.specifier)));

        assert.deepEqual(offenders.map((found) => `${found.specifier} via ${found.chain.join(" -> ")}`), []);
    });

    it("sees what is really there: the root entry point does reach Babylon.js and Lit", () => {
        // Without this, a walker that silently resolved nothing would pass every case above.
        const reached = importGraph("index.ts").map((found) => found.specifier);

        assert.include(reached, "@babylonjs/core");
        assert.include(reached, "lit");
    });

    it("loads in a plain Node import, which is the whole point of the entry points existing", async () => {
        const loaded = await Promise.all([
            import("../../session"),
            import("../../schema"),
            import("../../catalog"),
            import("../../extend"),
            import("../../format"),
            import("../../logging"),
        ]);

        assert.isTrue(loaded.every((module) => typeof module === "object"));
    });
});

describe("the ./webgpu entry point", () => {
    // Not Node-safe by design (it touches `navigator.gpu`), so it is not in the list above. What
    // it must still be is loadable on its own: a consumer imports it as a second line beside the
    // element, and a renderer or a component framework arriving through it would be a second copy
    // of one the page already has.
    it("reaches no renderer and no component framework", () => {
        const forbidden = [/^@babylonjs($|\/)/, /^lit($|\/)/, /^@lit($|\/)/];
        const offenders = importGraph("webgpu.ts").filter((found) =>
            forbidden.some((pattern) => pattern.test(found.specifier)),
        );

        assert.deepEqual(
            offenders.map((found) => `${found.specifier} via ${found.chain.join(" -> ")}`),
            [],
        );
    });

    // Where the optional peer ENTERS the package. The walk lists every file inside `webgpu.ts`'s
    // graph that imports each bare specifier, so a peer import that had drifted down into, say,
    // the acceleration controller would appear here as a second line naming that file, and the
    // comparison below would fail. It is not a package-wide census -- an importer outside this
    // entry point's graph is not visible from here -- and `exports-map.test.ts` is what keeps the
    // peer optional in the manifest; this keeps the entry point the only door it comes through.
    it("reaches both entries of the optional peer from webgpu.ts, and from no other file", () => {
        const peers = importGraph("webgpu.ts").filter((found) =>
            /^@graphty\/webgpu-graph-algorithms($|\/)/.test(found.specifier),
        );

        assert.deepEqual(peers.map((found) => `${found.specifier} from ${found.chain.at(-1) ?? "nowhere"}`).sort(), [
            "@graphty/webgpu-graph-algorithms from webgpu.ts",
            "@graphty/webgpu-graph-algorithms/browser from webgpu.ts",
        ]);
    });
});
