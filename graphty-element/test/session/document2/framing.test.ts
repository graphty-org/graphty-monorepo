/**
 * @file Version 2 framing (spec/README.md sections 2, 3, 8.5 and 9), behind the `save-files-v2`
 * experiment: what form a file is, kind and key agreement, `$schema`, held and unknown sections
 * kept verbatim and written back, unknown members kept, `created` and `modified`, the byte-for-byte
 * rule between the two forms, and `project.save` and `project.open` unchanged with the experiment
 * off. Section content is the codecs'; these tests use stand-in codecs where one must run.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { isGraphtyError } from "../../../src/errors";
import { FEATURES } from "../../../src/features/registry";
import { openDocument2, saveDocument2 } from "../../../src/session/document2/document";
import { isVersion2, parseDocument, schemaUrl } from "../../../src/session/document2/framing";
import { SECTION_CODECS } from "../../../src/session/document2/registry";
import type { CodecRegistry, DocumentSection, JsonObject, SectionCodec } from "../../../src/session/document2/types";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;
const ON = { features: ["save-files-v2"] };
const OFF = { features: [] };

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
for (const file of readdirSchemas()) {
    ajv.addSchema(readJson(`schemas/${file}`));
}

/**
 * Every schema file under spec/schemas/.
 * @returns Their paths.
 */
function readdirSchemas(): string[] {
    return [
        "common/v2.json",
        ...["data", "style", "recipe", "results", "notes", "document"].map((kind) => `graphty-${kind}/v2.json`),
        "graphty-settings/v1.json",
        "graphty-view/v1.json",
    ];
}

/**
 * Whether a document validates against the schema its kind and version name.
 * @param document - The document.
 * @returns The validation errors, empty when it validates.
 */
function invalid(document: JsonObject): string[] {
    const validate = ajv.getSchema(schemaUrl(String(document.kind), Number(document.version)));
    assert.isDefined(validate);
    return validate(document)
        ? []
        : (validate.errors ?? []).map((error) => `${error.instancePath} ${String(error.message)}`);
}

/**
 * A stand-in codec that writes a fixed body and counts its reads.
 * @param section - The section.
 * @param body - What it writes.
 * @returns The codec and its read count.
 */
function standIn(section: DocumentSection, body: () => JsonObject): { codec: SectionCodec; reads: () => number } {
    const real = SECTION_CODECS[section];
    assert.isDefined(real);
    let reads = 0;
    const codec: SectionCodec = {
        ...real,
        write: () => Promise.resolve({ body: body() }),
        read: () => {
            reads++;
            return Promise.resolve();
        },
    };
    return { codec, reads: () => reads };
}

const minimalStyle = (): JsonObject => readJson("examples/minimal/minimal.graphty-style.json");

/**
 * A version 2 full file around sections.
 * @param sections - The sections.
 * @returns The file.
 */
function fullFile(sections: JsonObject): JsonObject {
    return { kind: "graphty-document", version: 2, generator: { name: "test", version: "0" }, sections };
}

/**
 * The code a rejection carries.
 * @param promise - What should reject.
 * @returns Its code.
 */
async function codeOf(promise: Promise<unknown>): Promise<string> {
    try {
        await promise;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        return (error as { code: string }).code;
    }

    throw new Error("expected a rejection");
}

const codes = (problems: readonly { code: string }[]): string[] => problems.map((problem) => problem.code);

describe("the save-files-v2 experiment", () => {
    it("is declared for issue 8029", () => {
        const feature = FEATURES.find((each) => each.id === "save-files-v2");
        assert.deepEqual(feature && { issue: feature.issue, since: feature.since }, {
            issue: 8029,
            since: "2026-11-14",
        });
    });

    it("off, refuses format 2 and saves and opens version 1 as before", async () => {
        const session: GraphSession = createGraphSession(OFF);
        assert.strictEqual(await codeOf(session.project.save({ format: 2 })), "E_FEATURE_OFF");

        const saved = await session.project.save();
        const document = JSON.parse(saved.text) as JsonObject;
        assert.strictEqual(document.version, 1);
        assert.strictEqual(
            await codeOf(session.project.open(JSON.stringify(readJson("examples/minimal/minimal.graphty.json")))),
            "E_UNSUPPORTED_VERSION",
        );
    });

    it("on, still saves version 1 unless asked for format 2", async () => {
        const session = createGraphSession(ON);
        const document = JSON.parse((await session.project.save()).text) as JsonObject;
        assert.strictEqual(document.version, 1);
    });
});

describe("telling what a file is", () => {
    it("reads version 2 wrappers and section kinds at their version 2 versions only", () => {
        assert.isTrue(isVersion2(readJson("examples/minimal/minimal.graphty.json")));
        assert.isTrue(isVersion2(readJson("examples/minimal/minimal.graphty-view.json")));
        assert.isTrue(isVersion2(readJson("examples/minimal/minimal.graphty-settings.json")));
        assert.isTrue(isVersion2(minimalStyle()));
        assert.isFalse(isVersion2({ kind: "graphty-document", version: 1, members: [] }));
        assert.isFalse(isVersion2({ kind: "graphty-style", version: 1, layers: [] }));
        assert.isFalse(isVersion2({ nodes: [], links: [] }));
    });

    it("loads every section of the worked example with no report", () => {
        const parsed = parseDocument(readJson("examples/card-fraud.graphty.json"), SECTION_CODECS);
        assert.strictEqual(parsed.form, "full");
        assert.deepEqual([...parsed.sections.keys()].sort(), [
            "data",
            "notes",
            "recipe",
            "results",
            "settings",
            "style",
            "view",
        ]);
        assert.deepEqual(parsed.problems, []);
        assert.strictEqual(parsed.sections.get("style")?.pointer, "/sections/style");
    });

    it("reads a section file as its one section", () => {
        const parsed = parseDocument(readJson("examples/card-fraud.graphty-notes.json"), SECTION_CODECS);
        assert.strictEqual(parsed.form, "section");
        assert.deepEqual([...parsed.sections.keys()], ["notes"]);
        assert.strictEqual(parsed.sections.get("notes")?.pointer, "");
    });

    it("refuses a newer wrapper and a wrapper without sections", () => {
        assert.throws(() => parseDocument({ ...fullFile({}), version: 3 }, SECTION_CODECS), /version 3/);
        try {
            parseDocument({ kind: "graphty-document", version: 2, sections: [] }, SECTION_CODECS);
            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code: string }).code, "E_BAD_DOCUMENT");
        }
    });

    it("refuses a section whose kind disagrees with its key and loads the rest", () => {
        const parsed = parseDocument(fullFile({ notes: minimalStyle(), style: minimalStyle() }), SECTION_CODECS);
        assert.deepEqual([...parsed.sections.keys()], ["style"]);
        assert.deepEqual(parsed.problems, [{ code: "E_BAD_DOCUMENT", params: { section: "notes" } }]);
    });

    it("keeps an unknown section key verbatim", () => {
        const parsed = parseDocument(fullFile({ "lab-notebook": { kind: "x", version: 1 } }), SECTION_CODECS);
        assert.deepEqual(parsed.problems, [{ code: "W_UNKNOWN_KIND", params: { section: "lab-notebook" } }]);
        assert.deepEqual(parsed.held.get("lab-notebook"), { value: { kind: "x", version: 1 }, reason: "unknown" });
    });

    it("holds a newer section and one that needs an extension", () => {
        const newer = { ...minimalStyle(), version: 9 };
        const needs = {
            ...readJson("examples/minimal/minimal.graphty-recipe.json"),
            dependencies: { extensions: [{ name: "org.example.lab", version: 1 }] },
        };
        const parsed = parseDocument(fullFile({ style: newer, recipe: needs }), SECTION_CODECS);
        assert.strictEqual(parsed.sections.size, 0);
        assert.deepEqual(parsed.problems, [
            { code: "W_SECTION_KEPT", params: { section: "style", version: 9, reason: "version" } },
            { code: "W_EXTENSION_REQUIRED", params: { section: "recipe", extension: "org.example.lab" } },
            { code: "W_SECTION_KEPT", params: { section: "recipe", version: 2, reason: "extension" } },
        ]);
        assert.strictEqual(parsed.held.get("style")?.value, newer);
    });

    it("reports a $schema that disagrees and an unknown top-level member", () => {
        const style = { ...minimalStyle(), $schema: schemaUrl("graphty-style", 1), "x/y": 1 };
        const parsed = parseDocument(fullFile({ style }), SECTION_CODECS);
        assert.deepEqual(parsed.problems, [
            { code: "W_SCHEMA_MISMATCH", params: { section: "style", schema: schemaUrl("graphty-style", 1) } },
            { code: "W_UNKNOWN_MEMBER", params: { section: "style", pointer: "/sections/style/x~1y" } },
        ]);
        assert.strictEqual(parsed.sections.get("style")?.body["x/y"], 1);
    });
});

describe("saving version 2", () => {
    it("writes an empty full file that validates", async () => {
        const session = createGraphSession(ON);
        const saved = await session.project.save({ format: 2, sections: [] });
        const document = JSON.parse(saved.text) as JsonObject;
        assert.deepEqual(invalid(document), []);
        assert.strictEqual(document.id, session.project.id);
        assert.deepEqual(saved.report.written, []);
        assert.isFalse(session.project.dirty);
    });

    it("refuses a section file of other than one section", async () => {
        const session = createGraphSession(ON);
        assert.strictEqual(await codeOf(session.project.save({ format: 2, form: "section" })), "E_BAD_COMMAND");
    });

    it("writes a section through its codec", async () => {
        const session = createGraphSession(ON);
        const saved = JSON.parse(
            (await session.project.save({ format: 2, sections: ["settings"] })).text,
        ) as JsonObject;
        assert.deepEqual(Object.keys(saved.sections as JsonObject), ["settings"]);
        assert.deepEqual(invalid(saved), []);
    });

    it("writes the header in order, the same section in both forms, and keeps modified while nothing changes", async () => {
        const session = createGraphSession(ON);
        let layers: unknown[] = [];
        const { codec } = standIn("style", () => ({ layers }));
        const codecs: CodecRegistry = { style: codec };
        const full = await saveDocument2(session, codecs, { sections: ["style"] }, () => false);
        const style = (full.document.sections as JsonObject).style as JsonObject;
        assert.deepEqual(Object.keys(style), [
            "$schema",
            "kind",
            "version",
            "created",
            "modified",
            "generator",
            "layers",
        ]);
        assert.deepEqual(invalid(style), []);
        assert.deepEqual(invalid(full.document), []);

        const single = await saveDocument2(session, codecs, { sections: ["style"], form: "section" }, () => false);
        assert.deepEqual(single.written, ["style"]);
        assert.strictEqual(JSON.stringify(single.document), JSON.stringify(style));

        layers = [{ id: "a", target: "node", selector: { kind: "everything" }, set: {} }];
        const changed = await saveDocument2(session, codecs, { sections: ["style"], form: "section" }, () => false);
        assert.strictEqual(changed.document.created, style.created);
        assert.isAtLeast(Date.parse(String(changed.document.modified)), Date.parse(String(style.modified)));
        assert.notStrictEqual(JSON.stringify(changed.document), JSON.stringify(style));
    });
});

describe("opening version 2", () => {
    it("writes back held and unknown sections, and reports the held one on save", async () => {
        const session = createGraphSession(ON);
        const newer = { ...minimalStyle(), version: 9, future: true };
        const unknown = { kind: "org.example.lab", version: 1, cells: [1, 2] };
        const report = await session.project.open(JSON.stringify(fullFile({ style: newer, "lab-notebook": unknown })));
        assert.strictEqual(report.opened, "document");
        assert.deepEqual(codes(report.problems), ["W_SECTION_KEPT", "W_UNKNOWN_KIND"]);

        const saved = await session.project.save({ format: 2, sections: ["style"] });
        const sections = (JSON.parse(saved.text) as JsonObject).sections as JsonObject;
        assert.deepEqual(sections.style, newer);
        assert.deepEqual(sections["lab-notebook"], unknown);
        assert.deepEqual(saved.report.leftOut, [
            { code: "W_SECTION_KEPT", params: { section: "style", version: 9, reason: "version" } },
        ]);
    });

    it("applies through the codecs, writes unknown members back, and skips a section bound to other data", async () => {
        const session = createGraphSession(ON);
        const style = standIn("style", () => ({ layers: [] }));
        const notes = standIn("notes", () => ({ notes: [] }));
        const codecs: CodecRegistry = { style: style.codec, notes: notes.codec };
        const file = fullFile({
            style: { ...minimalStyle(), later: { kept: true } },
            notes: readJson("examples/minimal/minimal.graphty-notes.json"),
        });
        const opened = await openDocument2(
            session,
            codecs,
            parseDocument(file, codecs),
            {},
            {
                canned: new Map(),
                restoreDerived: () => undefined,
                beforeReplace: () => undefined,
                name: null,
            },
        );
        assert.deepEqual(codes(opened.problems), ["W_UNKNOWN_MEMBER", "W_DATA_MISMATCH"]);
        assert.strictEqual(style.reads(), 1);
        assert.strictEqual(notes.reads(), 0);

        const saved = await saveDocument2(session, codecs, { sections: ["style"], form: "section" }, () => false);
        assert.deepEqual(saved.document.later, { kept: true });
        assert.deepEqual(Object.keys(saved.document).slice(-2), ["layers", "later"]);
    });

    it("binds a section to other data when the caller agrees", async () => {
        const session = createGraphSession(ON);
        const notes = standIn("notes", () => ({ notes: [] }));
        const codecs: CodecRegistry = { notes: notes.codec };
        const file = readJson("examples/minimal/minimal.graphty-notes.json");
        await openDocument2(
            session,
            codecs,
            parseDocument(file, codecs),
            { bindOtherData: true },
            {
                canned: new Map(),
                restoreDerived: () => undefined,
                beforeReplace: () => undefined,
                name: null,
            },
        );
        assert.strictEqual(notes.reads(), 1);
    });

    it("refuses a deep file as version 1 does", async () => {
        const session = createGraphSession(ON);
        let deep: unknown = 0;
        for (let level = 0; level < 80; level++) {
            deep = [deep];
        }

        const file = fullFile({ "lab-notebook": { kind: "x", version: 1, deep } });
        assert.strictEqual(await codeOf(session.project.open(JSON.stringify(file))), "E_BAD_DOCUMENT");
    });
});
