/**
 * @file Version 2 save files end to end, through `project.save` and `project.open` with the
 * `save-files-v2` experiment on: the spec's card-fraud example opens and saves back unchanged,
 * every section file opens alone, each use-case preset of the design writes exactly its sections
 * and they validate, and the version 1 files the saved-format tests write migrate and open.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { schemaUrl } from "../../../src/session/document2/framing";
import { DOCUMENT_SECTIONS, type DocumentSection, type JsonObject } from "../../../src/session/document2/types";
import { FIXTURE_EDGES, FIXTURE_NODES, SELF_CONTAINED_KINDS } from "../../saved-format/kinds";

const SPEC = new URL("../../../spec/", import.meta.url);
const readText = (path: string): string => readFileSync(new URL(path, SPEC), "utf8");
const readJson = (path: string): JsonObject => JSON.parse(readText(path)) as JsonObject;
const ON = { features: ["save-files-v2"] };

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
for (const file of [
    "common/v2.json",
    ...["data", "style", "recipe", "results", "notes", "document"].map((kind) => `graphty-${kind}/v2.json`),
    "graphty-settings/v1.json",
    "graphty-view/v1.json",
]) {
    ajv.addSchema(readJson(`schemas/${file}`));
}

/**
 * The schema errors of a document, against the schema its kind and version name.
 * @param document - The document.
 * @returns The errors, empty when it validates.
 */
function invalid(document: JsonObject): string[] {
    const validate = ajv.getSchema(schemaUrl(String(document.kind), Number(document.version)));
    assert.isDefined(validate, `a schema for ${String(document.kind)}`);
    return validate(document)
        ? []
        : (validate.errors ?? []).map((error) => `${error.instancePath} ${String(error.message)}`);
}

/**
 * The codes of a report.
 * @param problems - The report.
 * @returns The codes.
 */
const codes = (problems: readonly { code: string }[]): string[] => problems.map((problem) => problem.code);

/**
 * A session with the example open, its saved results restored rather than rerun.
 * @returns The session and what the open reported.
 */
async function exampleSession(): Promise<{ session: GraphSession; problems: readonly { code: string }[] }> {
    const session = createGraphSession(ON);
    const report = await session.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
    assert.strictEqual(report.opened, "project");
    return { session, problems: report.problems };
}

/**
 * A file with the wrapper's and every section's `generator` set to one value.
 * @param file - The full file.
 * @param generator - The value.
 * @returns A copy.
 */
function withGenerator(file: JsonObject, generator: unknown): JsonObject {
    const sections = Object.fromEntries(
        Object.entries(file.sections as JsonObject).map(([key, section]) => [
            key,
            { ...(section as JsonObject), generator },
        ]),
    );
    return { ...file, generator, sections };
}

afterEach(() => {
    vi.useRealTimers();
});

describe("save files version 2, end to end", () => {
    it("opens the card-fraud example and saves it back unchanged", async () => {
        const example = readJson("examples/card-fraud.graphty.json");
        const { session, problems } = await exampleSession();
        // Every element reference binds to the data the file loaded, in the file's own spaces.
        assert.notInclude(codes(problems), "W_REFERENCE_UNBOUND");
        assert.isDefined(session.data.nodes().find((node) => node.id === "account:acct-1002"));
        // The wrapper's `modified` is the time of the save; every section keeps its own.
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(String(example.modified)));
        const saved = await session.project.save({ format: 2, results: true });
        // `generator` is the writing software, overwritten on every save (spec 3.1).
        const written = withGenerator(JSON.parse(saved.text) as JsonObject, example.generator);
        assert.deepEqual(written, example);
        assert.strictEqual(JSON.stringify(written), JSON.stringify(example));
    });

    it("writes a section the reader changed from the session, and the rest as read", async () => {
        const example = readJson("examples/card-fraud.graphty.json");
        const { session } = await exampleSession();
        await session.config.set({ runPlacement: "top" });
        const saved = JSON.parse((await session.project.save({ format: 2, results: true })).text) as JsonObject;
        const sections = saved.sections as Record<string, JsonObject>;
        const before = example.sections as Record<string, JsonObject>;
        assert.notDeepEqual(sections.settings.settings, before.settings.settings);
        assert.strictEqual((sections.settings.settings as JsonObject).runPlacement, "top");
        assert.deepEqual(sections.style.layers, before.style.layers);
        assert.deepEqual(sections.recipe.commands, before.recipe.commands);
    });

    it("opens every section file alone", async () => {
        for (const name of DOCUMENT_SECTIONS) {
            const session = createGraphSession(ON);
            const report = await session.project.open(readText(`examples/card-fraud.graphty-${name}.json`));
            assert.strictEqual(report.opened, name === "data" ? "project" : "document", name);
            // The example recipe's type scope and "accounts" source role have no session form
            // yet: at most those two commands are refused (E_BAD_DOCUMENT) and the rest replays.
            const refused = report.problems.filter((problem) => problem.code === "E_BAD_DOCUMENT");
            const pointers = refused.map((problem) => problem.params.pointer);
            const allowed = name === "recipe" ? ["/commands/2", "/commands/3"] : [];
            assert.isTrue(
                pointers.every((pointer) => allowed.includes(String(pointer))),
                `${name}: ${pointers.join()}`,
            );
        }
    });

    it("opens a bound section file over the data it was written on", async () => {
        for (const name of ["results", "notes", "view"] as const) {
            const session = createGraphSession(ON);
            await session.project.open(readText("examples/card-fraud.graphty-data.json"), { rerun: false });
            const report = await session.project.open(readText(`examples/card-fraud.graphty-${name}.json`), {
                rerun: false,
            });
            assert.notInclude(codes(report.problems), "W_DATA_MISMATCH", name);
        }
    });

    it("writes exactly the sections of each use case, and they validate", async () => {
        const { session } = await exampleSession();
        const presets: readonly [string, { sections?: DocumentSection[]; results?: boolean }][] = [
            ["share without notes", { sections: DOCUMENT_SECTIONS.filter((name) => name !== "notes") }],
            ["style only", { sections: ["style"] }],
            ["recipe only", { sections: ["recipe"] }],
            ["starting kit", { sections: ["style", "recipe", "settings"] }],
            ["journal", { sections: ["notes", "view"] }],
            ["record", { sections: ["data", "recipe", "view"], results: true }],
        ];
        for (const [preset, choice] of presets) {
            const saved = await session.project.save({ format: 2, markSaved: false, ...choice });
            const file = JSON.parse(saved.text) as JsonObject;
            const expected = DOCUMENT_SECTIONS.filter(
                (name) => choice.sections?.includes(name) === true || (name === "results" && choice.results === true),
            );
            assert.deepEqual(Object.keys(file.sections as JsonObject), expected, preset);
            assert.deepEqual(invalid(file), [], preset);
            for (const [name, section] of Object.entries(file.sections as JsonObject)) {
                assert.deepEqual(invalid(section as JsonObject), [], `${preset}: ${name}`);
            }
        }

        // One section alone, as a section file.
        for (const name of DOCUMENT_SECTIONS) {
            const saved = await session.project.save({
                format: 2,
                markSaved: false,
                sections: [name],
                form: "section",
            });
            const section = JSON.parse(saved.text) as JsonObject;
            assert.strictEqual(section.kind, `graphty-${name}`);
            assert.deepEqual(invalid(section), [], name);
        }
    });

    it("migrates and opens every version 1 file the saved-format tests write", async () => {
        for (const row of SELF_CONTAINED_KINDS) {
            const source = createGraphSession();
            await source.data.addNodes(FIXTURE_NODES);
            await source.data.addEdges(FIXTURE_EDGES);
            const { saves } = await row.useEvery(source);
            const files = [(await source.project.save()).text, ...saves];
            for (const [at, text] of files.entries()) {
                const session = createGraphSession(ON);
                const report = await session.project.open(text, { migrate: true });
                assert.strictEqual(report.opened, "project", `${row.kind} save ${at}`);
                assert.include(codes(report.problems), "W_SECTION_UPGRADED", `${row.kind} save ${at}`);
                assert.notInclude(codes(report.problems), "E_BAD_DOCUMENT", `${row.kind} save ${at}`);
                assert.strictEqual(session.status.counts.nodes, FIXTURE_NODES.length);
                assert.strictEqual(session.status.counts.edges, FIXTURE_EDGES.length);

                const again = JSON.parse(
                    (await session.project.save({ format: 2, markSaved: false })).text,
                ) as JsonObject;
                assert.deepEqual(invalid(again), [], `${row.kind} save ${at}`);
            }
        }
    });

    it("keeps writing version 1 by default with the experiment on", async () => {
        const session = createGraphSession(ON);
        await session.data.addNodes(FIXTURE_NODES);
        const saved = JSON.parse((await session.project.save()).text) as JsonObject;
        assert.strictEqual(saved.kind, "graphty-document");
        assert.strictEqual(saved.version, 1);
    });
});
