import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { assert, describe, it } from "vitest";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** The manifest, as published. */
interface Manifest {
    main?: string;
    module?: string;
    types?: string;
    customElements?: string;
    exports: Record<string, string | Record<string, string>>;
    sideEffects: string[];
    files: string[];
    dependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
    peerDependenciesMeta: Record<string, { optional?: boolean }>;
}

const manifest = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "package.json"), "utf8")) as Manifest;

/**
 * Every subpath that names a module, paired with the source file behind it.
 *
 * The root entry keeps the output name `graphty` it has had since 1.0, so its source file and
 * its output file are spelled differently; every other entry is named after its source.
 */
const MODULE_ENTRIES: readonly { subpath: string; source: string; output: string }[] = [
    { subpath: ".", source: "index.ts", output: "graphty" },
    ...["session", "schema", "catalog", "commands", "extend", "format", "logging", "react", "webgpu", "ai"].map((name) => ({
        subpath: `./${name}`,
        source: `${name}.ts`,
        output: name,
    })),
];

/**
 * The published files that do something on import, and are therefore never tree-shaken away.
 *
 * `graphty.bundle.js` is the `./bundle` entry: the same root module with every dependency
 * inlined, for a page that has a script tag and no installer. It defines the custom element for
 * the same reason the root entry does.
 */
const SIDE_EFFECTFUL = ["./dist/graphty.js", "./dist/graphty.bundle.js", "./dist/webgpu.js", "./dist/chunks/*.js"];

/**
 * The source modules that register the built-in layouts, data sources and algorithms, and the
 * accelerator entry point that registers the WebGPU factory.
 *
 * They are named here for this package's own build, not for a consumer's: a module the build is
 * told is pure can be dropped whole, and dropping one of these produces an element that renders
 * a graph and then knows no layout to arrange it with, no format to read it from and no
 * algorithm to run on it -- with nothing failing anywhere to say so.
 *
 * `./webgpu.ts` is here for the same reason and was found the same way: a story that imports it
 * by source path lost the whole module to the tree-shaker in the built Storybook, and the only
 * symptom was an element reporting that no accelerator was registered on a machine that has a
 * GPU. `./dist/webgpu.js` covers a consumer of the published package; this covers every build
 * made inside this repository -- the stories and the tests that import the entry by path.
 */
const REGISTRATION_MODULES = [
    "./webgpu.ts",
    "./src/algorithms/index.ts",
    "./src/data/index.ts",
    "./src/layout/index.ts",
];

/**
 * The source of the root entry and the module that defines `<graphty-element>`.
 *
 * A consumer that resolves this package to its source rather than to `dist` -- the graphty app
 * and its Storybook do -- and writes the documented `import "@graphty/graphty-element"` gets
 * nothing if these are declared pure: the bundler drops the import, the tag is never defined, and
 * the page shows an empty box where the graph should be. The dev server does not tree-shake, so
 * only a production build (a static Storybook, a Chromatic snapshot) shows it.
 */
const SOURCE_ENTRY_MODULES = ["./index.ts", "./src/graphty-element.ts"];

/**
 * Names that mean three incompatible things across this package and its siblings, so no barrel
 * may re-export one of them from a sibling package.
 */
const AMBIGUOUS_NAMES = ["Node", "Edge", "Graph", "Position", "NodeId"];

/**
 * Read one TypeScript file into a syntax tree.
 * @param file - The file, relative to the package root.
 * @returns The parsed source file.
 */
function parse(file: string): ts.SourceFile {
    const path = resolve(PACKAGE_ROOT, file);

    return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true);
}

/**
 * Every name an entry point re-exports from a `@graphty/*` sibling package.
 * @param file - The entry file, relative to the package root.
 * @returns The exported names, as the consumer would see them.
 */
function namesReExportedFromSiblings(file: string): string[] {
    const names: string[] = [];
    for (const statement of parse(file).statements) {
        if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier === undefined) {
            continue;
        }

        const from = (statement.moduleSpecifier as ts.StringLiteral).text;
        const clause = statement.exportClause;
        if (!from.startsWith("@graphty/") || clause === undefined || !ts.isNamedExports(clause)) {
            continue;
        }

        names.push(...clause.elements.map((element) => element.name.text));
    }

    return names;
}

/**
 * The build's entry list, read out of the Vite config's `entries` object.
 *
 * Parsed rather than imported: the config reads `__dirname` and the package's TypeScript
 * configuration declares browser globals only, so importing it here would make a Node-only
 * config part of a DOM-typed program.
 * @returns The output name to source file mapping the build uses.
 */
function viteEntries(): Record<string, string> {
    const entries: Record<string, string> = {};
    for (const statement of parse("vite.config.ts").statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }

        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "entries") {
                continue;
            }

            const {initializer} = declaration;
            if (initializer === undefined || !ts.isObjectLiteralExpression(initializer)) {
                continue;
            }

            for (const property of initializer.properties) {
                if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer)) {
                    entries[property.name.getText()] = property.initializer.text;
                }
            }
        }
    }

    return entries;
}

describe("the exports map", () => {
    it.each(MODULE_ENTRIES)("$subpath is a real entry point with a source file behind it", ({ subpath, source, output }) => {
        const conditions = manifest.exports[subpath];

        assert.deepEqual(
            conditions,
            { types: `./dist/${output === "graphty" ? "index" : output}.d.ts`, import: `./dist/${output}.js` },
        );
        assert.isTrue(existsSync(resolve(PACKAGE_ROOT, source)));
    });

    it("publishes ./bundle as one self-contained file, for a page with no installer", () => {
        // The UMD build is gone, and ./bundle is what replaced it. A consumer pasting a script
        // tag has nothing to resolve a bare specifier with, so this entry is a single plain
        // string rather than a conditions object, and the file it names carries its own copy of
        // every dependency. Losing it would silently break the first example in the docs.
        assert.strictEqual(manifest.exports["./bundle"], "./dist/graphty.bundle.js");
        assert.isTrue(existsSync(resolve(PACKAGE_ROOT, "vite.bundle.config.ts")));
    });

    it("publishes the custom elements manifest, and points the tooling field at it", () => {
        assert.strictEqual(manifest.exports["./custom-elements.json"], "./dist/custom-elements.json");
        assert.strictEqual(manifest.customElements, "./dist/custom-elements.json");
    });

    it("is ESM only: no CommonJS entry, in a package whose default import defines a custom element", () => {
        assert.isUndefined(manifest.main);
        for (const conditions of Object.values(manifest.exports)) {
            if (typeof conditions !== "string") {
                assert.notInclude(Object.keys(conditions), "require");
            }
        }
    });

    it("names every entry point the build produces, and no entry point it does not", () => {
        const built = viteEntries();

        assert.deepEqual(Object.keys(built).sort(), MODULE_ENTRIES.map((entry) => entry.output).sort());
        for (const { source, output } of MODULE_ENTRIES) {
            assert.strictEqual(built[output], `./${source}`);
        }
    });
});

describe("what the package promises about side effects and size", () => {
    it("declares a side effect for every published file that has one, and for nothing else", () => {
        assert.deepEqual(
            [...manifest.sideEffects].sort(),
            [...SIDE_EFFECTFUL, ...REGISTRATION_MODULES, ...SOURCE_ENTRY_MODULES].sort(),
        );
    });

    it("keeps a bare import of the root entry's source from being tree-shaken away", () => {
        for (const module of SOURCE_ENTRY_MODULES) {
            assert.include(manifest.sideEffects, module);
            assert.isTrue(existsSync(resolve(PACKAGE_ROOT, module)));
        }
    });

    it("keeps the built-in registrations out of reach of the tree-shaker", () => {
        for (const module of REGISTRATION_MODULES) {
            assert.include(manifest.sideEffects, module);
            assert.isTrue(existsSync(resolve(PACKAGE_ROOT, module)));
        }
    });

    it("declares no side effect for any entry point a bundler should be free to shake", () => {
        const shakeable = MODULE_ENTRIES.map((entry) => `./dist/${entry.output}.js`).filter(
            (path) => !SIDE_EFFECTFUL.includes(path),
        );

        for (const path of shakeable) {
            assert.notInclude(manifest.sideEffects, path);
        }
    });

    it("keeps sourcemaps out of the tarball", () => {
        assert.include(manifest.files, "dist/");
        assert.include(manifest.files, "!dist/**/*.map");
    });
});

describe("the sibling packages", () => {
    it("takes graph-format as a dependency and a peer, so one copy is installed", () => {
        assert.strictEqual(manifest.dependencies["@graphty/graph-format"], "workspace:^");
        assert.isDefined(manifest.peerDependencies["@graphty/graph-format"]);
    });

    it("takes the GPU package as an optional peer, so a consumer who never wants it never resolves it", () => {
        assert.isDefined(manifest.peerDependencies["@graphty/webgpu-graph-algorithms"]);
        assert.isTrue(manifest.peerDependenciesMeta["@graphty/webgpu-graph-algorithms"]?.optional);
        assert.isUndefined(manifest.dependencies["@graphty/webgpu-graph-algorithms"]);
        // A workspace reference, like the graph-format peer above: pnpm rewrites it on publish to a
        // caret range on whatever version the workspace holds. That is what now keeps 0.5.x out --
        // `webgpu.ts` calls `verifyDevice`, which 0.5.x does not export, so a consumer who satisfied
        // an older range would crash when the element attached an accelerator. The explicit
        // `>=0.6.0 <1.0.0` this line used to pin said the same thing by hand and had to be edited
        // every time the requirement moved.
        assert.strictEqual(manifest.peerDependencies["@graphty/webgpu-graph-algorithms"], "workspace:^");
    });

    it.each(MODULE_ENTRIES)("$subpath re-exports no name that means three different things", ({ source }) => {
        assert.deepEqual(namesReExportedFromSiblings(source).filter((name) => AMBIGUOUS_NAMES.includes(name)), []);
    });
});

describe("the ./format entry point", () => {
    it("carries the decode vocabulary", async () => {
        const format = await import("../../format");

        assert.strictEqual(typeof format.isGraphSnapshot, "function");
        assert.strictEqual(typeof format.maskToIndices, "function");
        assert.strictEqual(typeof format.expandEdges, "function");
        assert.typeOf(format.INVALID_INDEX, "number");
    });

    it("carries neither the brand nor the format version, so nothing can forge a snapshot", async () => {
        const format = await import("../../format");

        assert.notInclude(Object.keys(format), "SNAPSHOT_BRAND");
        assert.notInclude(Object.keys(format), "FORMAT_VERSION");
    });

    it("carries nothing of the construction or wire halves", async () => {
        const exported = Object.keys(await import("../../format"));

        for (const name of ["GraphBuilder", "AttributeTable", "NodeIdMap", "fromRecords", "fromWire", "fromBytes"]) {
            assert.notInclude(exported, name);
        }
    });
});

describe("the data entry points carry data, not objects", () => {
    it("publishes the catalogue tables, and every one of them survives JSON", async () => {
        const catalog = await import("../../catalog");
        const tables = [
            catalog.BUILT_IN_ALGORITHMS,
            catalog.LAYOUT_DESCRIPTORS,
            catalog.FORMAT_DESCRIPTORS,
            catalog.PALETTE_DESCRIPTORS,
            catalog.SCALE_DESCRIPTORS,
        ];

        for (const table of tables) {
            assert.isAbove(table.length, 0);
            assert.deepEqual(JSON.parse(JSON.stringify(table)), table);
        }
    });

    it("publishes the palettes, shapes and style defaults an application would otherwise copy", async () => {
        const schema = await import("../../schema");

        assert.isAbove(schema.VIRIDIS_COLORS.length, 0);
        assert.isAbove(Object.keys(schema.NodeShapes).length, 0);
        assert.include(schema.EdgeLineTypes.options, "dash-dot");
        assert.include(schema.EdgeArrowTypes.options, "open-diamond");
        assert.typeOf(schema.defaultNodeStyle, "object");
        assert.match(schema.MISSING_DATA_COLOR, /^#[0-9a-f]{6}$/i);
    });
});
