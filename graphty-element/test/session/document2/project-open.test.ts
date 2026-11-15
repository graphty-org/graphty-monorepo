/**
 * @file Version 2 project opens and saves through `project.open` and `project.save`, behind the
 * `save-files-v2` experiment: a data section that cannot be built, or is held, still opens a
 * project and holds what is bound to it; the document state is forgotten at every project
 * boundary; a partial save is a copy; and the save options a version 1 file cannot hold, or a
 * reference no open can fetch, are refused.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { isGraphtyError } from "../../../src/errors";
import { dataCodec } from "../../../src/session/document2/codecs/data";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";
import type { SessionVisibilityApi } from "../../../src/session/visibility/VisibilityApi";
import { finishAtOnce } from "../runs/harness";

const SPEC = new URL("../../../spec/", import.meta.url);
const readText = (path: string): string => readFileSync(new URL(path, SPEC), "utf8");
const readJson = (path: string): JsonObject => JSON.parse(readText(path)) as JsonObject;
const ON = { features: ["save-files-v2"] };
const DATA_ID = "d1a7c0de-0001-4000-8000-000000000001";

const codes = (problems: readonly { code: string }[]): string[] => problems.map((problem) => problem.code);

/**
 * The error a rejection carries.
 * @param promise - What should reject.
 * @returns Its code and details.
 */
async function refusal(promise: Promise<unknown>): Promise<{ code: string; details?: Record<string, unknown> }> {
    try {
        await promise;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        return error as { code: string; details?: Record<string, unknown> };
    }

    throw new Error("expected a rejection");
}

/**
 * A session holding a small project of its own: two nodes and an edge.
 * @returns The session.
 */
async function ownProject(): Promise<GraphSession> {
    const session = createGraphSession(ON);
    await session.data.import({ type: "csv", config: { data: "source,target,w\nP,Q,1\n" }, name: "own.csv" });
    return session;
}

/**
 * The card-fraud example with its data section changed.
 * @param change - Changes the data section in place.
 * @returns The file's text.
 */
function exampleWith(change: (data: JsonObject) => void): string {
    const file = readJson("examples/card-fraud.graphty.json");
    change((file.sections as Record<string, JsonObject>).data);
    return JSON.stringify(file);
}

/**
 * The sections of a version 2 full file.
 * @param text - The file.
 * @returns Its sections.
 */
const sectionsOf = (text: string): Record<string, JsonObject> =>
    (JSON.parse(text) as JsonObject).sections as Record<string, JsonObject>;

describe("a project whose data section cannot be loaded", () => {
    for (const [what, change] of [
        [
            "a data section this reader cannot build",
            (data: JsonObject) => ((data.joins as JsonObject[])[0].op = "join.link"),
        ],
        ["a newer data section", (data: JsonObject) => (data.version = 3)],
    ] as const) {
        it(`opens ${what} as a project, clears the old data and holds the sections bound to it`, async () => {
            const session = await ownProject();
            const text = exampleWith(change);
            const report = await session.project.open(text, { discard: true, rerun: false });
            assert.strictEqual(report.opened, "project");
            // The old project's data does not stay under the new project's name.
            assert.lengthOf(session.data.nodes(), 0);
            const kept = report.problems.filter((problem) => problem.code === "W_SECTION_KEPT");
            assert.includeMembers(
                kept.map((problem) => problem.params.section),
                ["data", "results", "notes", "view"],
            );
            assert.notInclude(codes(report.problems), "W_DATA_MISMATCH");

            // Held sections are written back as read, never the session's own of their kind.
            const read = sectionsOf(text);
            const saved = sectionsOf((await session.project.save({ format: 2, results: true })).text);
            for (const name of ["data", "results", "notes", "view"]) {
                assert.deepEqual(saved[name], read[name], name);
            }

            session.dispose();
        });
    }
});

describe("the document state", () => {
    it("is forgotten at a project boundary, but for the data id a replacing import keeps", async () => {
        const session = createGraphSession(ON);
        const newer = { ...readJson("examples/card-fraud.graphty-style.json"), version: 9 };
        const file = readJson("examples/card-fraud.graphty.json");
        (file.sections as Record<string, JsonObject>).style = newer;
        await session.project.open(JSON.stringify(file), { rerun: false });
        const before = sectionsOf((await session.project.save({ format: 2 })).text);
        assert.strictEqual(before.style.version, 9);
        assert.strictEqual(before.data.id, DATA_ID);

        await session.data.import({ type: "csv", config: { data: "source,target\nP,Q\n" }, name: "next.csv" });
        const after = await session.project.save({ format: 2 });
        const sections = sectionsOf(after.text);
        assert.strictEqual(sections.style.version, 2);
        // A replace keeps the data id (spec 3.3).
        assert.strictEqual(sections.data.id, DATA_ID);
        assert.notInclude(codes(after.report.leftOut), "W_SECTION_KEPT");

        // So a notes section saved on the first data binds, by key, to what the new data holds.
        const notes = await session.project.open(readText("examples/card-fraud.graphty-notes.json"));
        assert.notInclude(codes(notes.problems), "W_DATA_MISMATCH");
        assert.include(codes(notes.problems), "W_REFERENCE_UNBOUND");
        session.dispose();
    });

    it("keeps the wrapper's extensions read on open under the caller's", async () => {
        const session = createGraphSession(ON);
        const file = { ...readJson("examples/card-fraud.graphty.json"), extensions: { "org.example.lab": { a: 1 } } };
        await session.project.open(JSON.stringify(file), { rerun: false });
        const saved = JSON.parse(
            (await session.project.save({ format: 2, extensions: { "com.example.app": { b: 2 } } })).text,
        ) as JsonObject;
        assert.deepEqual(saved.extensions, { "org.example.lab": { a: 1 }, "com.example.app": { b: 2 } });
        session.dispose();
    });
});

describe("record keys after a round trip", () => {
    it("writes each node's record key, so the notes bind after the data changed", async () => {
        const session = createGraphSession(ON);
        await session.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
        // A change, so the data section is written from the session rather than as read.
        await session.data.addNodes([{ id: "extra" }]);
        const saved = await session.project.save({ format: 2 });

        const reopened = createGraphSession(ON);
        const report = await reopened.project.open(saved.text, { rerun: false });
        assert.notInclude(codes(report.problems), "W_REFERENCE_UNBOUND");
        assert.isDefined(reopened.data.nodes().find((node) => node.id === "account:acct-1002"));
        session.dispose();
        reopened.dispose();
    });
});

describe("saving", () => {
    it("moves the save point only for a full file of every default section", async () => {
        const session = await ownProject();
        await session.project.save();
        await session.data.addNodes([{ id: "R" }]);
        assert.isTrue(session.project.dirty);

        await session.project.save({ format: 2, sections: ["style"], form: "section" });
        await session.project.save({ format: 2, sections: ["notes", "view"] });
        assert.isTrue(session.project.dirty, "a copy leaves the project dirty");

        await session.project.save({ format: 2 });
        assert.isFalse(session.project.dirty);
        session.dispose();
    });

    it("refuses a referenced source, which no open can fetch yet", async () => {
        const session = await ownProject();
        const [load] = session.data.sources();
        const error = await refusal(session.project.save({ format: 2, embed: { [load.key]: "referenced" } }));
        assert.strictEqual(error.code, "E_UNSUPPORTED");
        assert.deepEqual(error.details, { option: "embed", source: load.key });
        session.dispose();
    });

    it("refuses a file with a duplicate member name, which is not I-JSON, and changes nothing", async () => {
        const session = await ownProject();
        const text = readText("examples/card-fraud.graphty.json");
        const duplicated = text.replace(
            '"kind": "graphty-document"',
            '"kind": "graphty-document", "kind": "graphty-document"',
        );
        assert.notStrictEqual(duplicated, text);
        const error = await refusal(session.project.open(duplicated));
        assert.strictEqual(error.code, "E_BAD_DOCUMENT");
        assert.deepEqual(error.details, { duplicate: "kind" });
        assert.deepEqual(
            session.data.nodes().map((node) => node.id),
            ["P", "Q"],
            "the open changed nothing",
        );
        session.dispose();
    });

    it("refuses a version 2 option without format 2, and names the experiment a version 2 file needs", async () => {
        const session = createGraphSession(ON);
        for (const options of [{ sections: ["style" as const] }, { form: "section" as const }, { results: true }]) {
            assert.strictEqual((await refusal(session.project.save(options))).code, "E_BAD_COMMAND");
        }

        const off = createGraphSession({ features: [] });
        const error = await refusal(off.project.open(readText("examples/minimal/minimal.graphty.json")));
        assert.strictEqual(error.code, "E_UNSUPPORTED_VERSION");
        assert.strictEqual(error.details?.feature, "save-files-v2");
        session.dispose();
        off.dispose();
    });

    it("reports what version 1 keeps that version 2 does not write yet", async () => {
        const session = await ownProject();
        await session.data.renameColumn({ kind: "edge", name: "w" }, "weight");
        const saved = await session.project.save({ format: 2 });
        assert.deepInclude(saved.report.leftOut, {
            code: "W_MEMBER_LEFT_OUT",
            params: { kind: "graphty-session", field: "columns" },
        });

        session.dispose();
    });
});

describe("the sections a reader changed from the session", () => {
    it("restores the saved positions with rerun off, after the recipe sets the layout, and finds the data unchanged", async () => {
        const { session, problems } = await (async () => {
            const each = createGraphSession(ON);
            const report = await each.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
            return { session: each, problems: report.problems };
        })();
        // Results written on exactly the data the file holds match it.
        assert.notInclude(codes(problems), "W_DATA_CHANGED");
        const { order, xyz } = session.positions.snapshot();
        const at = order.indexOf("account:acct-1002");
        assert.deepEqual(
            [xyz[at * 3], xyz[at * 3 + 1], xyz[at * 3 + 2]].map((v) => Math.round(v * 10) / 10),
            [2, 2.4, -0.7],
        );
        session.dispose();
    });

    it("writes a view run's style the same in a section file as in a full file", async () => {
        const session = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        await session.data.addEdges([{ source: "P", target: "Q" }]);
        await session.runs.start("bfs", { source: "P" });
        assert.isNotEmpty(session.runs.bindings(session.runs.list()[0].id), "the run's suggested layer reads it");
        const full = sectionsOf((await session.project.save({ format: 2, markSaved: false })).text).view;
        const alone = JSON.parse(
            (await session.project.save({ format: 2, sections: ["view"], form: "section" })).text,
        ) as JsonObject;
        const styles = (view: JsonObject): unknown[] =>
            Object.values((view.runs ?? {}) as Record<string, JsonObject>).map((run) => run.style);
        assert.isNotEmpty(styles(full));
        assert.deepEqual(styles(alone), styles(full));
        session.dispose();
    });

    it("binds a saved run to the data's build, so reopening it is a match", async () => {
        const session = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        await session.data.addEdges([{ source: "P", target: "Q" }]);
        await session.runs.start("bfs", { source: "P" });
        const { text } = await session.project.save({ format: 2, results: true, markSaved: false });
        const { data, results } = sectionsOf(text);
        const [run] = Object.values(results.runs as Record<string, JsonObject>);
        assert.strictEqual((run.bindsTo as JsonObject).build, data.build);
        const opened = createGraphSession({ ...ON, runs: { execute: finishAtOnce } });
        const report = await opened.project.open(text, { rerun: false });
        assert.notInclude(codes(report.problems), "W_DATA_CHANGED");
        session.dispose();
        opened.dispose();
    });

    it("keeps a window whose bounds are values, set with the timeline off, as values", async () => {
        const session = createGraphSession(ON);
        await session.data.addNodes([
            { id: "a", year: 1995 },
            { id: "b", year: 2005 },
        ]);
        await session.visibility.setWindow({ attribute: "year", from: 1990, to: 2000 });
        const holds = (each: GraphSession): boolean =>
            (each.visibility as SessionVisibilityApi).holdsInstants(
                each.visibility.window ?? { attribute: "year", from: 0, to: 0 },
            );
        assert.isFalse(holds(session));
        const saved = await session.project.save({ format: 2 });
        // A raw bound is a JSON number; `windowRaw` is not written (spec 4.7 rule 4).
        const window = (sectionsOf(saved.text).view.visibility as JsonObject).window as JsonObject;
        assert.deepEqual([window.from, window.to, window.raw], [1990, 2000, undefined]);

        const reopened = createGraphSession(ON);
        await reopened.project.open(saved.text);
        assert.isFalse(holds(reopened));
        session.dispose();
        reopened.dispose();
    });
});

describe("a data section too costly to build", () => {
    const section = (body: JsonObject): Parameters<NonNullable<typeof dataCodec.holds>>[0] => ({
        header: { kind: "graphty-data", version: 2 },
        body,
        pointer: "",
    });

    it("holds a graph copy wider than the column cap, and an unset row outside its column", () => {
        const holds = (body: JsonObject): boolean => dataCodec.holds?.(section(body), [] as DocumentProblem[]) ?? false;
        const wide = {
            sources: [{ id: "s", kind: "file", copy: "graph" }],
            types: [],
            joins: [{ op: "join.add", source: "s" }],
            graph: {
                nodes: Array.from({ length: 5000 }, (_, at) => ({ id: at, "graphty.key": String(at), [`c${at}`]: 1 })),
                links: [],
            },
        };
        assert.isTrue(holds(wide));

        const outside = {
            sources: [
                {
                    id: "s",
                    kind: "file",
                    copy: { nodes: { id: ["a"], x: [{ y: 1 }] } },
                    columns: { nodes: { x: { name: "x", dtype: "json", unset: [7] } } },
                },
            ],
            types: [],
            joins: [{ op: "join.add", source: "s" }],
        };
        assert.isTrue(holds(outside));
    });
});

describe("the worked example, edited and reopened", () => {
    it("keeps an edited type layer's id and type selector, and its new color", async () => {
        const session = createGraphSession(ON);
        await session.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
        const merchants = session.styles.list().find((layer) => layer.name === "Merchants");
        assert.isDefined(merchants);
        await session.styles.update(merchants.id, { set: { "node.color": "#123456" } });
        const saved = (await session.project.save({ format: 2, markSaved: false })).text;
        const written = (sectionsOf(saved).style.layers as JsonObject[]).find((layer) => layer.id === "merchants");
        assert.deepEqual(written?.selector, { match: "type", types: ["merchant"] });
        assert.strictEqual((written?.set as JsonObject)["node.color"], "#123456");
        assert.isFalse(
            ((sectionsOf(saved).view.layers ?? []) as JsonObject[]).some((layer) => layer.name === "Merchants"),
        );

        const reopened = createGraphSession(ON);
        await reopened.project.open(saved, { rerun: false });
        const again = (await reopened.project.save({ format: 2, markSaved: false })).text;
        const kept = (sectionsOf(again).style.layers as JsonObject[]).find((layer) => layer.id === "merchants");
        assert.deepEqual(kept?.selector, { match: "type", types: ["merchant"] });
        assert.strictEqual((kept?.set as JsonObject)["node.color"], "#123456");
    });

    it("opens, saves and reopens with no error and no refused set", async () => {
        const features = { features: ["save-files-v2", "timeline"] };
        const session = createGraphSession(features);
        const opened = await session.project.open(readText("examples/card-fraud.graphty.json"), { rerun: false });
        assert.deepEqual(
            codes(opened.problems).filter((code) => code.startsWith("E_")),
            [],
        );
        assert.strictEqual(session.sets.list().length, 2);
        const saved = (await session.project.save({ format: 2, markSaved: false })).text;
        const reopened = createGraphSession(features);
        const again = await reopened.project.open(saved, { rerun: false });
        assert.deepEqual(codes(again.problems), codes(opened.problems));
    });
});
