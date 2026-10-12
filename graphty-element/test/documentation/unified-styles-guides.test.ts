/**
 * @file The examples of each style-panel guide page, compiled against the published types, and
 * the first of each run.
 *
 * A reader copies a guide's first code block as it stands, so this compiles every block exactly
 * as printed -- `import "@graphty/graphty-element"` and all -- against the package's built
 * declaration files (`dist/`, what npm ships), not its source. A name the published types lack, or
 * a call whose shape they refuse, fails here. Each block is then run on a headless session in
 * place of the page's element, and what it prints is checked against what the page says it prints.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const ROOT = join(__dirname, "../..");
const GUIDES = join(ROOT, "docs/guide");
const PUBLISHED = join(ROOT, "dist/index.d.ts");

/** The two lines every example starts with; the run replaces them with a headless session. */
const SETUP = 'import "@graphty/graphty-element";\n\nconst { session } = document.querySelector("graphty-element")!;\n';

interface Page {
    /** The guide page, under `docs/guide/`. */
    readonly file: string;
    /** Checks the session and the printed lines after the example ran. */
    readonly check: (session: GraphSession, printed: readonly string[]) => void;
}

const PAGES: readonly Page[] = [
    {
        file: "style-tree.md",
        check: (session, printed) => {
            assert.deepEqual(printed, ["layer Big bottom 0", "folder Notes none 1"]);
            const red = session.styles.list().find((layer) => layer.name === "Red");
            assert.isDefined(red);
            assert.isTrue(session.styles.tree()[1]?.children[0]?.locked, "the reader's lock is on Red");
        },
    },
    {
        file: "style-rows-both-kinds.md",
        check: (session, printed) => {
            assert.deepEqual(printed, ["2 nodes", "2 edges"]);
            const edges = session.styles.list().find((layer) => layer.name === "Team A" && layer.target === "edge");
            assert.strictEqual(edges?.set?.["edge.width"], 2, "width reached the edges");
            const nodes = session.styles.list().find((layer) => layer.name === "Team A" && layer.target === "node");
            assert.isUndefined(nodes?.set?.["node.width" as never], "and not the nodes");
        },
    },
    {
        file: "starting-rows.md",
        check: (_session, printed) => {
            assert.deepEqual(printed, ["Everything bottom", "Selected top", "Hovered top", "1"]);
        },
    },
    {
        file: "style-rules.md",
        check: (_session, printed) => {
            assert.deepEqual(printed, ["2 2"]);
        },
    },
    {
        file: "binding-preview.md",
        check: (session, printed) => {
            assert.strictEqual(printed.at(-1), "1 nodes have no score");
            assert.lengthOf(JSON.parse(printed[0] ?? "[]") as number[], 2, "three steps have two cuts");
            const counts = JSON.parse(printed[1] ?? "[]") as number[];
            assert.strictEqual(
                counts.reduce((sum, count) => sum + count, 0),
                9,
                "every node with a score is in a step",
            );
            assert.isEmpty(
                session.styles.list().filter((layer) => !layer.locked),
                "a preview writes nothing",
            );
        },
    },
    {
        file: "value-entries.md",
        check: (_session, printed) => {
            assert.deepEqual(printed, ["red 2 palette ", "blue 1 #0072b2 ", "green 1 palette hidden"]);
        },
    },
    {
        file: "colors-across-rows.md",
        check: (session, printed) => {
            assert.lengthOf(printed, 1, "two spellings of one color are one entry");
            assert.match(printed[0] ?? "", /^#d55e00 .*,.*$/, "naming both layers");
            assert.deepEqual(
                session.styles.colors(session.styles.tree().map((row) => row.id)).map((entry) => entry.color),
                ["#009e73"],
            );
        },
    },
];

/**
 * A guide's first TypeScript block.
 * @param file - The page.
 * @returns The block's code.
 */
function firstBlock(file: string): string {
    const block = /```ts\n([\s\S]*?)```/.exec(readFileSync(join(GUIDES, file), "utf8"))?.[1];
    assert.isDefined(block, `${file} has a TypeScript block`);

    return block;
}

/**
 * Every TypeScript block of a guide, in order, as one file: later blocks build on the first.
 * @param file - The page.
 * @returns The code.
 */
function allBlocks(file: string): string {
    return [...readFileSync(join(GUIDES, file), "utf8").matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
}

/**
 * Compile every page's blocks against the published declaration files.
 * @returns One line per error, naming the page.
 */
function compileAgainstPublishedTypes(): string[] {
    const sources = new Map(PAGES.map(({ file }) => [join(ROOT, "tmp-guide", `${file}.ts`), allBlocks(file)]));
    const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        moduleDetection: ts.ModuleDetectionKind.Force,
        lib: ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
        paths: { "@graphty/graphty-element": [PUBLISHED] },
    };
    const host = ts.createCompilerHost(options);
    const readFile = host.readFile.bind(host);
    const getSourceFile = host.getSourceFile.bind(host);
    host.readFile = (name) => sources.get(name) ?? readFile(name);
    host.fileExists = (name) => sources.has(name) || ts.sys.fileExists(name);
    host.getSourceFile = (name, version, ...rest) => {
        const text = sources.get(name);

        return text === undefined ? getSourceFile(name, version, ...rest) : ts.createSourceFile(name, text, version);
    };
    const program = ts.createProgram([...sources.keys()], options, host);

    return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
        const where = diagnostic.file?.fileName.replace(/.*tmp-guide\//, "") ?? "";
        const line =
            diagnostic.file && diagnostic.start !== undefined
                ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1
                : 0;

        return `${where}:${String(line)} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
    });
}

/**
 * Run a page's example on a headless session, collecting what it prints.
 * @param file - The page.
 * @returns The session and the printed lines.
 */
async function run(file: string): Promise<{ session: GraphSession; printed: string[] }> {
    const block = firstBlock(file);
    assert.isTrue(block.startsWith(SETUP), `${file}'s example starts by reaching the element's session`);
    const javascript = ts.transpileModule(block.slice(SETUP.length), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText;
    const printed: string[] = [];
    const quiet = {
        log: (...values: unknown[]) =>
            printed.push(values.map((value) => (typeof value === "string" ? value : JSON.stringify(value))).join(" ")),
    };
    const session = createGraphSession();
    // The constructor of every async function, this one included: it builds one from source text.
    const AsyncFunction = Object.getPrototypeOf(run).constructor as new (
        ...args: string[]
    ) => (session: GraphSession, console: typeof quiet) => Promise<void>;
    await new AsyncFunction("session", "console", javascript)(session, quiet);
    await session.styles.settled();

    return { session, printed };
}

describe("the style panel guides", () => {
    it("print examples that compile against the published types", () => {
        assert.isTrue(existsSync(PUBLISHED), "build graphty-element first: the examples compile against dist/");
        assert.deepEqual(compileAgainstPublishedTypes(), []);
    });

    for (const { file, check } of PAGES) {
        it(`${file}: the example does what the page says`, async () => {
            const { session, printed } = await run(file);
            check(session, printed);
            session.dispose();
        });
    }
});
