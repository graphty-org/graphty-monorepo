/**
 * Runs every documentation example (docs/examples/**.ts) as a reader would, so the code the guide shows cannot
 * rot. scripts/docs-reference.ts copies each file verbatim into the pages; this file runs them.
 *
 * Each example runs in a fresh directory holding only the published sample files (docs/samples/), so an example
 * cannot read a file a reader cannot download, with `fetch` answering any URL from those files by its last path
 * segment (a URL ending in `/export`, which has no file name, gets simple.graphml). The browser
 * examples get a small stand-in `document`: after the example's top level has run, every element it looked up
 * receives the event it listens for (a file input gets `got.gexf`, or both GoT CSV tables when it is
 * `multiple`, and a "change", anything else a
 * "click"), and every download it starts is recorded. What an example prints, the files it writes and the
 * downloads it starts are compared with a snapshot.
 */

import {
    copyFileSync,
    existsSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";

import { afterEach, describe, expect, it, vi } from "vitest";

const DOCS = fileURLToPath(new URL("../docs/", import.meta.url));
const EXAMPLES = join(DOCS, "examples");
const CORPUS = fileURLToPath(new URL("corpus/", import.meta.url));
const SAMPLES = join(DOCS, "samples");
const PICKED_FILE = "got.gexf";
/** What an `<input type="file" multiple>` gets: the two tables of a CSV graph. */
const PICKED_FILES = ["got-edges.csv", "got-nodes.csv"];
const EXPORT_FILE = "simple.graphml";

/**
 * Every file under a directory, recursively.
 * @param dir - the directory
 * @returns absolute paths
 */
function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
}

/** A listener as the stand-in elements keep it, so the test can await what it returns. */
type Listener = (event: Event) => unknown;

/** The stand-in for an element an example looks up or creates. */
class FakeElement {
    readonly listeners = new Map<string, Listener[]>();
    files: File[] = [];
    accept = "";
    multiple = false;
    href = "";
    download = "";
    textContent = "";
    value = "";
    constructor(
        readonly tag: string,
        private readonly onClick: (el: FakeElement) => void = () => undefined,
    ) {}
    addEventListener(type: string, fn: Listener): void {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
    }
    append(): void {}
    remove(): void {}
    click(): void {
        this.onClick(this);
    }
    /**
     * Run every listener of one event type and wait for what they return.
     * @param type - the event type
     */
    async fire(type: string): Promise<void> {
        for (const fn of this.listeners.get(type) ?? []) {
            await fn(new Event(type));
        }
    }
}

/** What one example run left behind. */
interface Run {
    /** What it printed, one entry per console call. */
    readonly printed: string[];
    /** The files it wrote, the downloads, uploads and dialogs. */
    readonly effects: string[];
}

/**
 * Install the stand-in browser globals and the fixture-serving fetch.
 * @param dir - the directory holding the fixtures
 * @param run - receives the printed lines and the effects
 * @returns the elements the example looks up, by selector
 */
function installGlobals(dir: string, run: Run): Map<string, FakeElement> {
    const output = run.effects;
    const elements = new Map<string, FakeElement>();
    const blobs = new Map<string, Blob>();
    const download = (a: FakeElement): void => {
        const blob = blobs.get(a.href);
        output.push(`[download] ${a.download} (${blob?.type ?? "?"}, ${String(blob?.size ?? 0)} bytes)`);
    };
    vi.stubGlobal("document", {
        querySelector: (selector: string): FakeElement => {
            const el = elements.get(selector) ?? new FakeElement(selector);
            elements.set(selector, el);
            return el;
        },
        createElement: (tag: string): FakeElement => new FakeElement(tag, download),
        body: { append: () => undefined },
    });
    let n = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
        const href = `blob:docs/${String(n++)}`;
        if (blob instanceof Blob) {
            blobs.set(href, blob);
        }
        return href;
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.stubGlobal("confirm", (message: string): boolean => {
        output.push(`[confirm] ${message}`);
        return true;
    });
    vi.stubGlobal("fetch", (url: string | URL, init?: RequestInit): Promise<Response> => {
        const last = basename(new URL(String(url), "https://example.com/").pathname);
        const name = last === "export" ? EXPORT_FILE : last;
        if (init?.method === "POST") {
            output.push(`[upload] ${String(url)}`);
            return Promise.resolve(new Response("ok"));
        }
        try {
            return Promise.resolve(new Response(readFileSync(join(dir, name))));
        } catch {
            return Promise.resolve(new Response("not here", { status: 404, statusText: "Not Found" }));
        }
    });
    const print = (...args: unknown[]): void => {
        run.printed.push(args.map((a) => (typeof a === "string" ? a : inspect(a, { depth: 4 }))).join(" "));
    };
    for (const method of ["log", "info", "warn", "error"] as const) {
        vi.spyOn(console, method).mockImplementation(print);
    }
    return elements;
}

/**
 * Run one example in a directory of fixtures.
 * @param file - the example's path
 * @returns what it printed, wrote and downloaded
 */
async function runExample(file: string): Promise<Run> {
    const dir = mkdtempSync(join(tmpdir(), "graph-io-docs-"));
    // only the sample files the guide publishes, so every file an example reads is one a reader can download
    for (const f of readdirSync(SAMPLES)) {
        copyFileSync(join(SAMPLES, f), join(dir, f));
    }
    // what the example API at https://example.com/api/graphs/42/export answers
    copyFileSync(join(CORPUS, "graphml", EXPORT_FILE), join(dir, EXPORT_FILE));
    const before = new Set(readdirSync(dir));
    const run: Run = { printed: [], effects: [] };
    const cwd = process.cwd();
    process.chdir(dir);
    try {
        const elements = installGlobals(dir, run);
        // a fresh copy of the package per example, so a format one example registers never reaches another
        vi.resetModules();
        await import(file);
        for (const el of elements.values()) {
            if (el.listeners.has("change")) {
                el.files = (el.multiple ? PICKED_FILES : [PICKED_FILE]).map(
                    (name) => new File([readFileSync(join(dir, name))], name),
                );
                await el.fire("change");
            }
            await el.fire("click");
        }
        for (const f of readdirSync(dir)
            .filter((x) => !before.has(x))
            .sort()) {
            run.effects.push(`[wrote] ${f} (${String(statSync(join(dir, f)).size)} bytes)`);
        }
        return run;
    } finally {
        process.chdir(cwd);
        rmSync(dir, { recursive: true, force: true });
    }
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

/** The package's published entry points by the name a reader imports them with (package.json's exports). */
const PUBLISHED: ReadonlySet<string> = new Set(
    Object.keys(
        (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { exports: object }).exports,
    ).map((k) => (k === "." ? "@graphty/graph-io" : `@graphty/graph-io/${k.slice(2)}`)),
);

/** The examples that show a format plugin's simple path: they import nothing a reader would not have. */
const SIMPLE_PATHS = ["styles/importer.ts", "styles/exporter.ts", "styles/slots.ts"];

/**
 * The module specifiers an example imports.
 * @param text - the example's source
 * @returns the specifiers, static and dynamic
 */
function specifiers(text: string): string[] {
    return [...text.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|^import\s+)"([^"]+)"/gm)].map((m) => m[1]);
}

/**
 * Whether a reader who installed the package can import a specifier: a published entry point, graph-format, a
 * Node module, the CDN copy, React, or (for an example that builds on another the same page shows) a sibling example.
 * @param spec - the specifier
 * @param file - the example importing it
 * @param siblings - whether a sibling example counts
 * @returns true when it can
 */
function readerCanImport(spec: string, file: string, siblings: boolean): boolean {
    if (PUBLISHED.has(spec) || spec === "@graphty/graph-format" || spec.startsWith("node:") || spec === "react") {
        return true;
    }
    if (spec === "https://esm.sh/@graphty/graph-io") {
        return true;
    }
    const sibling = /^\.\/([\w-]+)\.js$/.exec(spec);
    return siblings && sibling !== null && existsSync(join(file, "..", `${sibling[1]}.ts`));
}

describe("documentation examples", () => {
    const files = walk(EXAMPLES)
        .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
        .sort();

    it("import only what a reader can import", () => {
        // a relative path into the package or a src/ import would run here and fail for every reader
        const wrong = files.flatMap((file) => {
            const name = relative(EXAMPLES, file);
            const siblings = !SIMPLE_PATHS.includes(name);
            return specifiers(readFileSync(file, "utf8"))
                .filter((spec) => !readerCanImport(spec, file, siblings))
                .map((spec) => `${name}: ${spec}`);
        });
        expect(wrong).toEqual([]);
        for (const name of SIMPLE_PATHS) {
            expect(existsSync(join(EXAMPLES, name)), name).toBe(true);
        }
    });

    it("rejects a relative or src/ import", () => {
        const file = join(EXAMPLES, "styles", "importer.ts");
        expect(readerCanImport("../../src/index.js", file, true)).toBe(false);
        expect(readerCanImport("@graphty/graph-io/src/styles/index.js", file, true)).toBe(false);
        expect(readerCanImport("./exporter.js", file, false)).toBe(false);
        expect(specifiers('import { a } from "../x.js";\nawait import("./y.js");')).toEqual(["../x.js", "./y.js"]);
    });

    it("exist", () => {
        expect(files.length).toBeGreaterThan(0);
    });

    for (const file of files) {
        const name = relative(EXAMPLES, file).replace(/\.[jt]s$/, "");
        it(`${name} runs`, async () => {
            const { printed, effects } = await runExample(file);
            if (!/^export /m.test(readFileSync(file, "utf8"))) {
                // a module other examples import may print nothing; every other example shows what it did
                expect(printed.length + effects.length, "an example shows what it did").toBeGreaterThan(0);
            }
            expect(effects).toMatchSnapshot();
            const expectedFile = file.replace(/\.[jt]s$/, ".txt");
            const text = printed.length === 0 ? "" : `${printed.join("\n")}\n`;
            if (process.env.UPDATE_EXAMPLES === "1") {
                if (text === "") {
                    rmSync(expectedFile, { force: true });
                } else {
                    writeFileSync(expectedFile, text);
                }
                return;
            }
            const expected = existsSync(expectedFile) ? readFileSync(expectedFile, "utf8") : "";
            expect(text, `${name}.txt is out of date: rerun with UPDATE_EXAMPLES=1`).toBe(expected);
        });
    }
});
