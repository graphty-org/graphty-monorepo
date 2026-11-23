/**
 * @file A version 2 source record's parse options (spec/README.md 4.1.2 rule 9, spec/builtins.md
 * "Parse options"): a save writes only the options builtins.md lists for the source's format and
 * reports every other load option it leaves out; an open reads only listed options, and one it
 * cannot read fails that source alone, never the data section.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { JsonObject } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2", "source-references"] };
const FRIENDS = "https://example.test/p/friends.csv";
const SEMI = "source;target;w\nAva;Ben;N/A\nBen;Cara;2\n";

/** A saved version 2 file, as far as these tests read it. */
interface Saved {
    sections: { data: { sources: JsonObject[] } };
}

/**
 * Stub fetch with a site: each URL answers its text, any other a 404.
 * @param site - URL to text.
 */
function stubSite(site: Record<string, string>): void {
    vi.stubGlobal("fetch", (input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);
        const body = Object.hasOwn(site, url) ? site[url] : undefined;
        return Promise.resolve(
            body === undefined ? new Response("", { status: 404 }) : new Response(body, { status: 200 }),
        );
    });
}

/**
 * The saved file's one source that is not the reader's.
 * @param text - The saved text.
 * @returns The record.
 */
function loadedRecord(text: string): JsonObject {
    return (JSON.parse(text) as Saved).sections.data.sources.find((each) => each.kind !== "reader") as JsonObject;
}

/**
 * The problems of one code a save or an open reported.
 * @param problems - The problems.
 * @param code - The code.
 * @returns Their params.
 */
function paramsOf(
    problems: readonly { readonly code: string; readonly params?: Readonly<Record<string, unknown>> }[],
    code: string,
): Readonly<Record<string, unknown>>[] {
    return problems.filter((problem) => problem.code === code).map((problem) => problem.params ?? {});
}

/**
 * A session holding the semicolon CSV loaded from its URL with the given config.
 * @param config - The load config besides the URL.
 * @returns The session.
 */
async function loaded(config: JsonObject): Promise<GraphSession> {
    stubSite({ [FRIENDS]: SEMI });
    const session = createGraphSession(ON);
    await session.data.import({ type: "csv", config: { url: FRIENDS, ...config } });
    return session;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("a version 2 save of a source's parse options", () => {
    const CONFIG = {
        delimiter: ";",
        missing: ["N/A"],
        edgeSource: "source",
        chunkSize: 10,
        importOptions: { x: 1 },
        variant: "generic",
    };

    it("writes only the listed options and reports each other load option it leaves out", async () => {
        const session = await loaded(CONFIG);
        const saved = await session.project.save({ format: 2, markSaved: false });
        const record = loadedRecord(saved.text);
        assert.deepEqual(record.options, { delimiter: ";", missing: ["N/A"] });
        assert.sameDeepMembers(paramsOf(saved.report.leftOut, "W_OPTION_NOT_SAVED"), [
            { source: record.id, option: "importOptions" },
            { source: record.id, option: "variant" },
        ]);
        session.dispose();
    });

    it("embeds a source asked to be referenced when an option was left out", async () => {
        const session = await loaded(CONFIG);
        const [{ key }] = session.data.sources();
        const saved = await session.project.save({ format: 2, markSaved: false, embed: { [key]: "referenced" } });
        const record = loadedRecord(saved.text);
        assert.property(record, "copy");
        assert.deepInclude(paramsOf(saved.report.leftOut, "W_SOURCE_EMBEDDED"), {
            source: record.id,
            reason: "options",
        });
        session.dispose();
    });

    it("writes only the members of styleOptions a file keeps", async () => {
        const doc = JSON.stringify({
            elements: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "ab", source: "a", target: "b" } }],
            style: [{ selector: "node", style: { width: 20, height: 20 } }],
        });
        const session = createGraphSession({ features: [...ON.features, "file-styles"] });
        await session.data.import(
            { type: "json", config: { data: doc } },
            { styles: "file", styleOptions: { lengths: "file", framing: "file", labelLayers: 2 } },
        );
        const saved = await session.project.save({ format: 2, markSaved: false });
        assert.deepEqual(loadedRecord(saved.text).options, { styles: "file", styleOptions: { lengths: "file" } });
        assert.deepEqual(paramsOf(saved.report.leftOut, "W_OPTION_NOT_SAVED"), []);
        session.dispose();
    });

    it("reads a referenced CSV saved with its delimiter again with the same rows", async () => {
        const session = await loaded({ delimiter: ";" });
        const [{ key }] = session.data.sources();
        const { text } = await session.project.save({ format: 2, embed: { [key]: "referenced" } });
        assert.notProperty(loadedRecord(text), "copy");
        const opened = createGraphSession(ON);
        const report = await opened.project.open(text, { fetchSources: true });
        assert.notInclude(
            report.problems.map((problem) => problem.code),
            "W_SOURCE_UNAVAILABLE",
        );
        assert.deepEqual(
            opened.data.edges().map((edge) => [edge.source, edge.target, edge.w]),
            session.data.edges().map((edge) => [edge.source, edge.target, edge.w]),
        );
        session.dispose();
        opened.dispose();
    });
});

describe("a version 2 open of parse options it cannot read", () => {
    /**
     * A saved file of two sources: the semicolon CSV and a JSON source.
     * @returns The file and the CSV source's place in its sources.
     */
    async function twoSources(): Promise<{ file: Saved; at: number }> {
        const session = await loaded({ delimiter: ";" });
        await session.data.import(
            {
                type: "json",
                config: { data: JSON.stringify({ nodes: [{ id: "Zed" }], edges: [] }) },
                name: "more.json",
            },
            { mode: "merge" },
        );
        const file = JSON.parse((await session.project.save({ format: 2, markSaved: false })).text) as Saved;
        session.dispose();
        return { file, at: file.sections.data.sources.findIndex((each) => each.format === "csv") };
    }

    const BAD: readonly [string, JsonObject][] = [
        ["delimiter on a json record", { format: "json", options: { delimiter: ";" } }],
        ["a sheet that is not a string", { options: { sheet: 3 } }],
        ["an unknown option", { options: { delimiter: ";", foo: 1 } }],
    ];

    for (const [name, change] of BAD) {
        it(`builds an embedded source from its copy, not refreshable, for ${name}`, async () => {
            const { file, at } = await twoSources();
            const record = file.sections.data.sources[at];
            Object.assign(record, change);
            const opened = createGraphSession(ON);
            const report = await opened.project.open(JSON.stringify(file));
            const codes = report.problems.map((problem) => problem.code);
            assert.notInclude(codes, "W_SECTION_KEPT");
            const pointers = paramsOf(report.problems, "W_UNKNOWN_MEMBER").map((params) => params.pointer);
            const bad = Object.keys(change.options as JsonObject).filter(
                (option) => !(option === "delimiter" && change.format === undefined),
            );
            assert.sameMembers(
                pointers,
                bad.map((option) => `/sources/${String(at)}/options/${option}`),
            );
            assert.includeMembers(
                opened.data.nodes().map((node) => node.id),
                ["Ava", "Ben", "Cara", "Zed"],
                "every source still builds",
            );
            let refused = false;
            await opened.data.refresh(String(record.id)).catch(() => {
                refused = true;
            });
            assert.isTrue(refused, "a refresh is refused");
            opened.dispose();
        });

        it(`holds a referenced source, and builds the others, for ${name}`, async () => {
            const { file, at } = await twoSources();
            const record = file.sections.data.sources[at];
            Object.assign(record, change);
            delete record.copy;
            (record.origin as JsonObject).copy = `sha256:${"0".repeat(64)}`;
            const opened = createGraphSession(ON);
            const report = await opened.project.open(JSON.stringify(file));
            assert.notInclude(
                report.problems.map((problem) => problem.code),
                "W_SECTION_KEPT",
            );
            assert.deepInclude(paramsOf(report.problems, "W_SOURCE_UNAVAILABLE"), {
                source: record.id,
                reason: "options",
            });
            assert.include(
                opened.data.nodes().map((node) => node.id),
                "Zed",
            );
            opened.dispose();
        });
    }
});
